"""Scoped resident administration. Identity review is separate from sign-in confirmation."""
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy import func, or_, JSON
import auth
import models
import gov_models as gm
import staff_accounts
from government_access import require_resident_scope, scoped_residents, scoped_reports


def now():
    return datetime.now(timezone.utc)


def masked_email(value):
    if not value or '@' not in value: return 'Not recorded'
    local, domain = value.rsplit('@', 1)
    return (local[:1] + '***' + ('@' + domain))


def masked_phone(value):
    return '***' + value[-4:] if value else 'Not recorded'


def target(db, actor, resident_id, lock=False):
    query = db.query(models.Resident).filter_by(id=resident_id)
    if lock: query = query.populate_existing().with_for_update()
    resident = query.first()
    if not resident: raise HTTPException(404, 'Resident account not found.')
    require_resident_scope(db, actor, resident)
    return resident


def project(db, actor, resident):
    reports = scoped_reports(db.query(models.Report), actor).filter(or_(models.Report.resident_id == resident.id, models.Report.claimed_by_user_id == resident.id))
    status = resident.status or ('active' if resident.is_active else 'inactive')
    return dict(id=resident.id, resident_id=f'RES-{resident.id:04d}', name=resident.full_name or 'Name not recorded',
        barangay=resident.barangay or 'Not recorded', masked_email=masked_email(resident.email), masked_phone=masked_phone(resident.phone_number),
        status=status, is_active=bool(resident.is_active), sign_in_confirmed=bool(resident.is_verified),
        id_verification_status=resident.id_verification_status or 'N/A', id_type=resident.id_type,
        id_rejection_reason=resident.id_rejection_reason, id_verified_at=resident.id_verified_at,
        id_review_reference=resident.id_review_reference, id_reviewed_at=resident.id_reviewed_at,
        registered_at=resident.created_at, updated_at=resident.updated_at,
        status_reason=resident.status_reason, status_changed_at=resident.status_changed_at, status_changed_by=resident.status_changed_by,
        version=resident.administration_version, reports_count=reports.count(),
        active_reports=reports.filter(models.Report.status.notin_(['resolved','cancelled','rejected'])).count(),
        allowed_actions=(['status','review_identity'] + (['resend_confirmation'] if not resident.is_verified and resident.is_active else [])) if staff_accounts.allowed(actor, 'residents_manage') else [])


def list_accounts(db, actor, search, status, identity, page, limit):
    query = scoped_residents(db.query(models.Resident), actor)
    if search:
        term = '%' + search.strip() + '%'
        conditions = [models.Resident.full_name.ilike(term), models.Resident.email.ilike(term)]
        number = search.strip().upper().removeprefix('RES-')
        if number.isdigit(): conditions.append(models.Resident.id == int(number))
        query = query.filter(or_(*conditions))
    if status and status != 'all':
        if status not in {'active','inactive','pending','suspended','deactivated'}: raise HTTPException(422, 'Choose a supported account status.')
        query = query.filter(func.lower(models.Resident.status) == status)
    if identity and identity != 'all':
        if identity not in {'Verified','Pending review','Rejected','N/A'}: raise HTTPException(422, 'Choose a supported identity review status.')
        query = query.filter(or_(models.Resident.id_verification_status == identity, models.Resident.id_verification_status.is_(None))) if identity == 'N/A' else query.filter(models.Resident.id_verification_status == identity)
    total = query.count()
    return dict(items=[project(db, actor, row) for row in query.order_by(models.Resident.id).offset((page-1)*limit).limit(limit)], total=total, page=page, page_size=limit)


def history(db, actor, resident_id, page, limit=15):
    target(db, actor, resident_id)
    query = db.query(gm.AuditLog).filter(gm.AuditLog.trigger_type == 'resident_administration', gm.AuditLog.details.cast(JSON)['resident_id'].as_integer() == resident_id)
    total = query.count()
    items = []
    for event in query.order_by(gm.AuditLog.id.desc()).offset((page-1)*limit).limit(limit):
        details = json.loads(event.details)
        actor_record = db.get(models.Official, event.actor_id) if event.actor_id else None
        items.append(dict(id=event.id, action=event.action, timestamp=event.created_at, actor=actor_record.full_name if actor_record else 'Staff record unavailable', reason=details.get('reason'), reference=details.get('reference'), before=details.get('before'), after=details.get('after'), delivery_status=details.get('delivery_status')))
    return dict(items=items,total=total,page=page,page_size=limit)


def audit(db, actor, resident, action, **details):
    db.add(gm.AuditLog(trigger_type='resident_administration',actor_id=actor.id,actor_role=actor.role,action=action,details=json.dumps(dict(resident_id=resident.id, **details))))


def checked(db, actor, resident_id, version):
    staff_accounts.lock_accounts(db, actor)
    staff_accounts.require_action(actor, 'residents_manage')
    resident = target(db, actor, resident_id, lock=True)
    if resident.administration_version != version: raise HTTPException(409, 'This account changed. Refresh its record before trying again.')
    return resident


def set_status(db, actor, resident_id, payload):
    resident = checked(db, actor, resident_id, payload.expected_version)
    before = resident.status
    if payload.status == before and resident.is_active == (payload.status == 'active'):
        return project(db, actor, resident)
    resident.status = payload.status
    resident.is_active = payload.status == 'active'
    resident.status_reason = payload.reason.strip()
    resident.status_changed_at = now()
    resident.status_changed_by = actor.full_name or 'Staff member'
    resident.administration_version += 1
    resident.access_version += 1
    audit(db, actor, resident, 'Resident account access changed', reason=payload.reason.strip(), before=before, after=payload.status)
    db.add(models.Notification(resident_id=resident.id,title='Your account access changed / Nagbago ang access ng account',message=f'Account status: {payload.status}. Contact PULSO administration for assistance. / Makipag-ugnayan sa PULSO administration para sa tulong.',target_url='/dashboard?tab=account'))
    db.commit()
    return project(db, actor, resident)


def inspect_identity(db, actor, resident_id):
    resident = target(db, actor, resident_id)
    # No ID image or ID number is stored in this schema. Never manufacture one.
    audit(db, actor, resident, 'Resident identity metadata inspected')
    db.commit()
    return dict(resident_id=resident.id, id_type=resident.id_type, id_tier=resident.id_tier,
        verification_mode=resident.verification_mode, id_verification_status=resident.id_verification_status or 'N/A',
        has_id_photo=False, masked_id_number=None, evidence_status='external_reference_required',
        id_review_reference=resident.id_review_reference, id_reviewed_at=resident.id_reviewed_at,
        sign_in_confirmed=bool(resident.is_verified))


def review_identity(db, actor, resident_id, payload):
    resident = checked(db, actor, resident_id, payload.expected_version)
    before = resident.id_verification_status or 'N/A'
    resident.id_verification_status = 'Verified' if payload.decision == 'approve' else 'Rejected'
    resident.id_verified_at = now() if payload.decision == 'approve' else None
    resident.id_rejection_reason = payload.reason.strip() if payload.decision == 'reject' else None
    resident.id_review_reference = payload.reference.strip()
    resident.id_reviewed_at = now()
    resident.id_reviewed_by_id = actor.id
    resident.administration_version += 1
    # ID review never confirms email/phone ownership or grants login access.
    audit(db, actor, resident, 'Resident identity review recorded', reason=payload.reason.strip(), reference=payload.reference.strip(), before=before, after=resident.id_verification_status)
    db.add(models.Notification(resident_id=resident.id,title='Identity review updated / Na-update ang pagsusuri ng pagkakakilanlan',message='Your identity review has a new decision. Contact PULSO administration for details. / Makipag-ugnayan sa PULSO administration para sa detalye.',target_url='/dashboard?tab=account'))
    db.commit()
    return project(db, actor, resident)


def code_hash(resident, code):
    return hmac.new(auth.SECRET_KEY.encode(), f'registration:{resident.id}:{code}'.encode(), hashlib.sha256).hexdigest()


def prepare_code(resident):
    code = f'{secrets.randbelow(1000000):06d}'
    resident.verification_code = 'hmac:' + code_hash(resident, code)
    resident.email_code_expires_at = now() + timedelta(minutes=10)
    resident.email_code_sent_at = now()
    resident.email_code_attempts = 0
    return code


def send_confirmation(db, resident, sender, actor=None, payload=None):
    if actor:
        resident = checked(db, actor, resident.id, payload.expected_version)
    else:
        resident = db.query(models.Resident).filter_by(id=resident.id).populate_existing().with_for_update().one()
    if resident.is_verified: raise HTTPException(409, 'Sign-in confirmation is already recorded.')
    if not resident.is_active: raise HTTPException(409, 'This account is restricted. Review access before sending a code.')
    if resident.email_code_sent_at and resident.email_code_sent_at > now() - timedelta(seconds=60):
        raise HTTPException(429, 'A code was recently requested. Wait one minute before retrying.')
    code = prepare_code(resident)
    # Persist before delivery: a received code must be redeemable even if the HTTP response is lost.
    # Provider acceptance does not prove mailbox or handset arrival.
    resident.administration_version += 1
    if actor: audit(db, actor, resident, 'Resident confirmation requested', reason=payload.reason.strip(), delivery_status='pending')
    db.commit()
    try:
        result = sender(resident.email, code, 'Verification')
        channels = [channel for channel in ('email', 'sms') if result.get(channel)] if isinstance(result, dict) else (['email'] if result else [])
    except Exception:
        channels = []
    accepted = bool(channels)
    delivery_status = 'smtp_accepted' if 'email' in channels else ('sms_accepted' if 'sms' in channels else 'failed')
    if actor:
        audit(db, actor, resident, 'Resident confirmation delivery result', reason=payload.reason.strip(), delivery_status=delivery_status)
        db.commit()
    if not accepted: raise HTTPException(503, 'The confirmation code could not be sent. Try again later.')
    return dict(status='success', delivery_status=delivery_status, confirmation_channels=channels,
        message='Code requested through ' + ' and '.join(channels) + '. Inbox or handset delivery is not confirmed.')


def accept_code(db, resident, code):
    resident = db.query(models.Resident).filter_by(id=resident.id).populate_existing().with_for_update().one()
    valid = (not resident.is_verified and resident.email_code_expires_at and resident.email_code_expires_at > now()
        and resident.email_code_attempts < 5 and resident.verification_code
        and hmac.compare_digest(resident.verification_code, 'hmac:' + code_hash(resident, code.replace(' ', ''))))
    if not valid:
        resident.email_code_attempts = min(resident.email_code_attempts + 1, 5)
        db.commit()
        raise HTTPException(400, 'Invalid or expired confirmation code. Request a new code if needed.')
    from resident_contacts import ensure_available, normalize_resident
    ensure_available(db, resident.email, resident.phone_number, exclude_id=resident.id)
    normalize_resident(resident)
    resident.is_verified = True
    resident.verification_code = None
    resident.email_code_expires_at = None
    resident.email_code_attempts = 0
    resident.administration_version += 1
    from sqlalchemy.exc import IntegrityError
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'These contact details were just confirmed by another account. Use sign-in or contact PULSO administration.')
    return dict(status='success',message='Account confirmed')
