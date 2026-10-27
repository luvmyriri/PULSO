"""Transactional staff provisioning and single-use credential links."""
import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
import auth
import models
import gov_models
from government_access import jurisdiction_ids, require_scope
from types import SimpleNamespace

LEGACY_ROLES = {
    'system_admin','admin','city_engineer','asst_city_engineer','division_chief','senior_engineer',
    'project_engineer','design_engineer','engineer_ii','field_worker','construction_foreman',
    'building_inspector','electrical_inspector','mechanical_inspector','admin_officer','admin_clerk',
    'records_officer','estimator','cad_operator','dispatcher','manager',
}


def admin_grants(user):
    if not isinstance(user, models.Official):
        return []
    explicit = user.role_ref.capabilities if user.role_ref else {}
    if 'admin' in (explicit or {}):
        value = explicit['admin']
        if not isinstance(value,list): return []
        if 'manage' in value: return ['*']
        if 'view' in value: return list(set(value)|{'staff_view','residents_view','settings_view','audit_view'})
        return value
    return ['*'] if user.role in ('system_admin','admin') else []


def allowed(user, action):
    grants = admin_grants(user)
    return '*' in grants or action in grants or (action.endswith('_view') and action.replace('_view','_manage') in grants) or (action == 'audit_view' and 'audit' in grants)


def require_action(user, action):
    if not allowed(user, action):
        raise HTTPException(403, 'Your account does not have permission for this administrative action.')


def audit(db, actor, action, details):
    db.add(gov_models.AuditLog(trigger_type='admin_action',actor_id=actor.id,actor_role=actor.role,
        action=action,details=json.dumps(details)))


def lock_accounts(db, actor=None):
    # Serialize account authority changes before counting active administrators.
    db.execute(text('SELECT pg_advisory_xact_lock(86173334)'))
    if actor is not None:
        version=actor.access_version
        db.refresh(actor)
        if not actor.is_active or actor.is_suspended or actor.access_version != version:
            raise HTTPException(401,'Your administrative session changed. Sign in again.')


def target_in_scope(db, actor, staff_id, manage=True):
    person = db.query(models.Official).filter_by(id=staff_id).with_for_update().first()
    if not person:
        raise HTTPException(404, 'Staff account not found.')
    actor_ids = jurisdiction_ids(actor)
    if actor_ids:
        target_ids = jurisdiction_ids(person)
        if not target_ids or not set(target_ids).issubset(actor_ids):
            raise HTTPException(403, 'This staff account is outside your configured district scope.')
    if manage and '*' not in admin_grants(actor) and admin_grants(person):
        raise HTTPException(403, 'Only a system administrator can manage administrative accounts.')
    return person


def resolve_role(db, actor, name):
    slug = name.strip().lower().replace(' ','_')
    role = db.query(models.SystemRole).filter_by(name=slug,is_template=False).first()
    if not role and slug not in LEGACY_ROLES:
        raise HTTPException(422, 'Choose an existing staff role.')
    privileged = slug in ('system_admin','admin') or bool(role and (role.capabilities or {}).get('admin'))
    if privileged and '*' not in admin_grants(actor):
        raise HTTPException(403, 'Only a system administrator can grant administrative access.')
    return slug, role.id if role else None


def resolve_scope(db, actor, district_ids, citywide):
    ids = sorted(set(district_ids or []))
    if citywide:
        if ids:
            raise HTTPException(422, 'Choose citywide access or specific districts.')
        if jurisdiction_ids(actor) or '*' not in admin_grants(actor):
            raise HTTPException(403, 'Citywide access requires a citywide system administrator.')
        return {'district_ids': []}
    if not ids:
        raise HTTPException(422, 'Choose at least one district or explicitly select citywide access.')
    existing = {row.id for row in db.query(models.District).filter(models.District.id.in_(ids))}
    if existing != set(ids):
        raise HTTPException(422, 'Choose valid district records.')
    for district_id in ids:
        require_scope(actor, SimpleNamespace(district_id=district_id))
    return {'district_ids': ids}


def project(db, person):
    try:
        ids = jurisdiction_ids(person)
        names = [row.name for row in db.query(models.District).filter(models.District.id.in_(ids)).order_by(models.District.id)] if ids else []
        scope = ', '.join(names) if ids else 'Citywide'
        scope_review = len(names) != len(ids)
    except HTTPException:
        ids = []; scope = 'Needs scope review'; scope_review = True
    if scope_review:
        scope = 'Needs scope review'
    state = 'Invited' if person.invitation_pending and not person.is_suspended else 'Active' if person.is_active and not person.is_suspended else 'Deactivated'
    return dict(id=person.id,official_id=f'ENG-{person.id:05d}',name=person.full_name,email=person.email,
        role=person.role,friendly_role=person.role_ref.label if person.role_ref and person.role_ref.label else person.role.replace('_',' ').title(),
        role_id=person.role_id,account_type=person.account_type,office=person.display_name,
        scope=scope,district_ids=ids,citywide=not ids and not scope_review,scope_needs_review=scope_review,
        status=state,is_active=bool(person.is_active and not person.is_suspended),is_suspended=person.is_suspended,
        invitation_pending=person.invitation_pending,version=person.access_version,
        last_active=None,last_active_raw=None,date_added=person.created_at.isoformat() if person.created_at else None,mfa_enabled=None)


def revoke_tokens(db, person):
    db.query(models.StaffCredentialToken).filter_by(official_id=person.id,consumed_at=None,revoked_at=None).update(
        {'revoked_at':datetime.now(timezone.utc)},synchronize_session=False)


def issue_link(db, person, actor, purpose):
    revoke_tokens(db, person)
    secret = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + (timedelta(hours=48) if purpose == 'invite' else timedelta(hours=1))
    db.add(models.StaffCredentialToken(official_id=person.id,token_hash=hashlib.sha256(secret.encode()).hexdigest(),
        purpose=purpose,expires_at=expires,created_by_id=actor.id))
    return dict(invite_link=f'/gov/activate#token={secret}' if purpose == 'invite' else None,
        reset_link=f'/gov/activate#token={secret}' if purpose == 'reset' else None,
        expires_at=expires.isoformat(),delivery_status='manual_required',
        message='Secure link created. Share it with this staff member through an approved private channel. No email has been sent.')


def create_staff(db, actor, payload):
    require_action(actor,'staff_manage'); lock_accounts(db,actor); require_action(actor,'staff_manage')
    email = str(payload.email).strip().lower()
    for model in (models.Official,models.Resident):
        if db.query(model).filter(func.lower(model.email)==email).first():
            raise HTTPException(409,'This email is already registered.')
    slug,role_id = resolve_role(db,actor,payload.role)
    scope = resolve_scope(db,actor,payload.district_ids,payload.citywide)
    person = models.Official(full_name=payload.full_name.strip(),email=email,role=slug,role_id=role_id,
        display_name=(payload.office or '').strip() or None,primary_jurisdiction=scope,
        account_type='admin' if slug in ('system_admin','admin') else 'staff',
        password_hash=auth.get_password_hash(secrets.token_urlsafe(40)),is_active=False,is_suspended=False,invitation_pending=True)
    db.add(person)
    try: db.flush()
    except IntegrityError:
        db.rollback(); raise HTTPException(409,'This email is already registered.')
    link = issue_link(db,person,actor,'invite')
    audit(db,actor,'Staff member invited',dict(target_id=person.id,role=slug,jurisdiction=scope,reason=payload.reason))
    try:
        db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(409,'This email is already registered.')
    db.refresh(person)
    return {**project(db,person),**link}


def update_staff(db, actor, staff_id, payload):
    require_action(actor,'staff_manage'); lock_accounts(db,actor); require_action(actor,'staff_manage')
    person = target_in_scope(db,actor,staff_id)
    if payload.expected_version != person.access_version:
        raise HTTPException(409,'This staff account changed. Refresh it before saving.')
    before = project(db,person)
    slug,role_id = resolve_role(db,actor,payload.role) if payload.role is not None else (person.role,person.role_id)
    if actor.id == person.id and (slug != person.role or role_id != person.role_id or payload.is_active is False or payload.district_ids is not None or payload.citywide is not None):
        raise HTTPException(409,'Ask another administrator to change your own access or account status.')
    if person.invitation_pending and payload.is_active is True:
        raise HTTPException(409,'This staff member must accept an invitation before activation.')
    next_role=db.get(models.SystemRole,role_id) if role_id else None
    next_caps=(next_role.capabilities or {}) if next_role else {}
    next_full = isinstance(next_caps['admin'],list) and bool({'*','manage'} & set(next_caps['admin'])) if 'admin' in next_caps else slug in ('system_admin','admin')
    if '*' in admin_grants(person) and (not next_full or payload.is_active is False):
        active=db.query(models.Official).filter(models.Official.is_active==True,models.Official.is_suspended==False).all()
        if sum('*' in admin_grants(candidate) for candidate in active)<=1:
            raise HTTPException(409,'Keep at least one active system administrator.')
    person.role=slug; person.role_id=role_id
    person.account_type='admin' if slug in ('system_admin','admin') else 'staff'
    if payload.office is not None:
        person.display_name=payload.office.strip() or None
    if payload.district_ids is not None or payload.citywide is not None:
        person.primary_jurisdiction=resolve_scope(db,actor,payload.district_ids,payload.citywide)
    if payload.is_active is not None:
        person.is_active=payload.is_active
        person.is_suspended=not payload.is_active
        person.suspension_reason=None if payload.is_active else payload.reason
        person.suspended_at=None if payload.is_active else datetime.now(timezone.utc)
        person.suspended_by=None if payload.is_active else actor.id
    person.access_version += 1
    revoke_tokens(db,person)
    # Expire the relationship after changing its FK; subsequent capability reads
    # must not reuse the old role object from this transaction's identity map.
    db.flush(); db.expire(person,['role_ref'])
    audit(db,actor,'Staff member updated',dict(target_id=person.id,before=before,after=project(db,person),reason=payload.reason))
    db.commit(); db.refresh(person)
    return project(db,person)


def reissue(db, actor, staff_id, purpose, reason):
    require_action(actor,'staff_manage'); lock_accounts(db,actor); require_action(actor,'staff_manage')
    person = target_in_scope(db,actor,staff_id)
    if person.is_suspended or (purpose == 'invite' and not person.invitation_pending) or (purpose == 'reset' and (person.invitation_pending or not person.is_active)):
        raise HTTPException(409,'This account is not eligible for this credential link.')
    link=issue_link(db,person,actor,purpose)
    audit(db,actor,'Staff invitation renewed' if purpose=='invite' else 'Staff password reset link generated',dict(target_id=person.id,reason=reason))
    db.commit()
    return link


def redeem(db, secret, password):
    digest = hashlib.sha256(secret.encode()).hexdigest()
    candidate=db.query(models.StaffCredentialToken).filter_by(token_hash=digest).first()
    invalid='This link is invalid, expired or already used. Request a new link from your administrator.'
    if not candidate:
        raise HTTPException(400,invalid)
    # Match the issue/revoke lock order: official first, credential token second.
    person=db.query(models.Official).filter_by(id=candidate.official_id).with_for_update().first()
    token=db.query(models.StaffCredentialToken).filter_by(id=candidate.id).populate_existing().with_for_update().first()
    now=datetime.now(timezone.utc)
    if token.purpose not in ('invite','reset') or token.revoked_at or token.consumed_at or token.expires_at <= now or person.is_suspended:
        raise HTTPException(400,invalid)
    if token.purpose == 'invite' and not person.invitation_pending or token.purpose == 'reset' and (person.invitation_pending or not person.is_active):
        raise HTTPException(400,invalid)
    person.password_hash=auth.get_password_hash(password)
    person.invitation_pending=False; person.is_active=True; person.access_version += 1
    token.consumed_at=now
    revoke_tokens(db,person)
    audit(db,person,'Staff invitation accepted' if token.purpose=='invite' else 'Staff password changed',dict(target_id=person.id,purpose=token.purpose))
    db.commit()
    return dict(message='Your staff account is ready. Sign in with your email and new password.')


def request_recovery(db, email):
    # Public requests do not reveal whether an address belongs to staff.
    response={'message':'If this is an eligible staff account, a recovery request is recorded for administrator review. No recovery email has been sent.'}
    person=db.query(models.Official).filter(func.lower(models.Official.email)==str(email).lower()).first()
    if not person or not person.is_active or person.is_suspended or person.invitation_pending:
        return response
    db.execute(text('SELECT pg_advisory_xact_lock(:key)'),{'key':int.from_bytes(hashlib.sha256(('staff-recovery:'+str(person.id)).encode()).digest()[:8],'big',signed=True)})
    target=f'/gov/administration?view=staff&tab=staff&user={person.id}'
    details=json.dumps({'target_id':person.id,'source':'staff_sign_in'})
    recent=db.query(gov_models.AuditLog).filter(gov_models.AuditLog.action=='Staff password recovery requested',
        gov_models.AuditLog.details==details,
        gov_models.AuditLog.created_at>=datetime.now(timezone.utc)-timedelta(minutes=15)).first()
    if recent: return response
    people=db.query(models.Official).filter(models.Official.is_active==True,models.Official.is_suspended==False).all()
    for admin in people:
        if not allowed(admin,'staff_manage') or (admin.id==person.id): continue
        if admin_grants(person) and '*' not in admin_grants(admin): continue
        try:
            scope=jurisdiction_ids(admin); target_scope=jurisdiction_ids(person)
        except HTTPException: continue
        if scope and (not target_scope or not set(target_scope).issubset(scope)): continue
        db.add(models.Notification(official_id=admin.id,title='Staff password recovery requested',
            message=f'A recovery request was submitted for {person.full_name}. Confirm their identity before creating a recovery link.',target_url=target))
    db.add(gov_models.AuditLog(trigger_type='admin_action',actor_role='unauthenticated_request',action='Staff password recovery requested',details=json.dumps({'target_id':person.id,'source':'staff_sign_in'})))
    db.commit()
    return response


def visible_query(db, actor):
    query=db.query(models.Official)
    ids=jurisdiction_ids(actor)
    if ids:
        visible=[]
        for person in query.all():
            try: target_ids=jurisdiction_ids(person)
            except HTTPException: continue
            if target_ids and set(target_ids).issubset(ids): visible.append(person.id)
        query=query.filter(models.Official.id.in_(visible))
    return query
