"""Review routing is ownership of intake, never automatic field deployment."""
from datetime import datetime, timezone
from collections import Counter
import json
import re
from fastapi import HTTPException
from sqlalchemy import text, func, or_
import models
import gov_models as gm
from government_access import jurisdiction_ids, require_report_scope
from operational_roles import canonical_role

INTAKE = {'pending','received','unverified','unvalidated','under_review','validated','needs_information'}
CLOSED = {'resolved','completed','rejected','cancelled','duplicate','spam'}
REVIEWERS = {'dispatcher','project_engineer'}
CLERK_ROLES = {'admin_clerk'}
ENGINEER_ROLES = {'city_engineer','asst_city_engineer'}
COORDINATORS = {'dispatcher','manager','city_engineer','asst_city_engineer','division_chief'}
ASSIGNERS = COORDINATORS | {'admin_officer'}
REJECTERS = {'dispatcher','manager'}
APPROVERS = {'dispatcher','manager','city_engineer','asst_city_engineer'}
GRADES = {'P0':'Monitoring','P1':'Preventive work','P2':'Standard repair','P3':'High priority','P4':'Severe hazard','P5':'Immediate response'}
PRIORITY_POLICY = 'p0-p5-ascending-v2'
POLICY = 'report-review-pilot-v1'
_routing_cursor = 0


def permitted(user, action):
    if not isinstance(user, models.Official) or not user.is_active or user.is_suspended: return False
    caps = user.role_ref.capabilities or {} if user.role_ref else {}
    role = canonical_role(user.role)
    # Intake ownership is narrower than an engineering decision. A clerk may
    # prepare and transfer a report, but cannot grade or publish its verification.
    if role in CLERK_ROLES:
        if action not in {'intake','peer_transfer'}: return False
        if 'report_review' in caps:
            grant = caps['report_review']
            return isinstance(grant,list) and (action in grant or '*' in grant)
        return True
    if 'report_review' in caps:
        grant = caps['report_review']
        return isinstance(grant,list) and (action in grant or '*' in grant)
    if action == 'assign': return role in ASSIGNERS
    if action == 'reject': return role in REJECTERS
    if action == 'approve': return role in APPROVERS
    if action == 'verify': return role in ENGINEER_ROLES
    return action == 'review' and role in REVIEWERS | COORDINATORS


def routing_area(db, report, persist=False):
    area = db.get(models.Barangay, report.barangay_id) if report.barangay_id else None
    if area: return area
    raw = (report.location_barangay or '').strip()
    if not raw: return None
    number = re.fullmatch(r'(?:barangay\s*|brgy\.?\s*)?(\d+)',raw,re.I)
    aliases = {raw.lower()}
    if number: aliases |= {number[1],f'barangay {number[1]}',f'brgy {number[1]}',f'brgy. {number[1]}'}
    query = db.query(models.Barangay).filter(or_(func.lower(models.Barangay.name).in_(aliases),models.Barangay.brgy_num == int(number[1]) if number else False))
    areas = query.all()
    if not areas or any(a.district_id is None for a in areas) or len({a.district_id for a in areas}) != 1: return None
    area = min(areas,key=lambda a:(a.name.lower()!=raw.lower(),a.id))
    if persist:
        report.barangay_id = area.id
        _history(db,report,'report_routing_location',dict(policy=POLICY,location_resolution=True,reason=f'Recorded barangay label {raw} matched the area catalog for routing.',barangay_id=area.id,district_id=area.district_id))
    return area


def eligible(db, report, manual=False):
    from gov_router import GOV_ROLES
    area = routing_area(db,report)
    if not area or not area.district_id: return []
    users = db.query(models.Official).filter(models.Official.is_active.is_(True),models.Official.is_suspended.is_not(True)).order_by(models.Official.id).all()
    result = []
    for user in users:
        # Leaders/admins coordinate by default; they are not an automatic employee pool.
        caps = user.role_ref.capabilities or {} if user.role_ref else {}
        role = canonical_role(user.role)
        if user.role not in GOV_ROLES: continue
        if manual:
            if role in CLERK_ROLES:
                if not permitted(user,'intake'): continue
            elif not permitted(user,'review'): continue
        elif not permitted(user,'review') or (role not in REVIEWERS and 'report_review' not in caps): continue
        try:
            ids = jurisdiction_ids(user)
        except HTTPException:
            continue
        if not ids or area.district_id in ids: result.append(user)
    return result


def _history(db, report, kind, detail, actor=None):
    db.add(gm.AuditLog(trigger_type=kind,report_id=report.id,actor_id=actor.id if actor else None,actor_role=actor.role if actor else 'system',action=f'{kind.replace("_"," ")}: {report.ticket_id}',details=json.dumps(detail)))


def assign(db, report, person, reason, actor=None, automatic=False, mode=None):
    previous = report.review_assigned_to_id
    report.review_assigned_to_id = person.id
    report.review_assigned_at = datetime.now(timezone.utc)
    report.review_assignment_mode = mode or ('automatic' if automatic else 'manual')
    report.review_routing_reason = reason
    db.flush()
    previous_owner = db.get(models.Official,previous) if previous else None
    _history(db,report,'report_assignment',dict(policy=POLICY,previous_owner_id=previous,previous_owner_name=previous_owner.full_name if previous_owner else None,owner_id=person.id,owner_name=person.full_name,reason=reason,automatic=automatic,mode=report.review_assignment_mode),actor)
    if previous != person.id:
        next_step = 'complete intake and submit to engineering' if person.role in CLERK_ROLES else 'assess the evidence and verify public details' if person.role in ENGINEER_ROLES else 'assign an eligible intake reviewer' if permitted(person,'assign') and not permitted(person,'review') else 'review the concern and route it for engineering verification'
        db.add(models.Notification(official_id=person.id,title='Report assigned for review',message=f'{report.ticket_id}: {next_step}.',target_url=f'/gov/my-work?selected=report:{report.id}'))


def auto_route(db, report):
    from system_settings import read_config
    if not read_config(db,'report_review_routing')['enabled']:
        if report.review_assigned_to_id is None and report.status in INTAKE:
            report.review_assignment_mode='needs_routing'
            report.review_routing_reason='Automatic review assignment is paused.'
        return False
    if report.status not in INTAKE or report.review_assigned_to_id: return False
    db.execute(text('SELECT pg_advisory_xact_lock(86173301)'))
    routing_area(db,report,persist=True)
    pool = eligible(db,report)
    if not pool:
        reason = 'Location needs routing review' if not report.barangay_id else 'No eligible reviewer in the recorded district'
        if report.review_routing_reason != reason:
            report.review_routing_reason = reason
            report.review_assignment_mode = 'needs_routing'
            _history(db,report,'report_assignment',dict(policy=POLICY,reason=reason,owner_id=None))
        return False
    counts = Counter(owner for (owner,) in db.query(models.Report.review_assigned_to_id).filter(models.Report.status.in_(INTAKE),models.Report.review_assigned_to_id.in_([p.id for p in pool])).all())
    person = min(pool,key=lambda p:(counts[p.id],p.id))
    assign(db,report,person,'Automatic routing by recorded district and lowest open review count.',automatic=True)
    return True


def route_waiting(db, limit=50):
    global _routing_cursor
    from system_settings import read_config
    if not read_config(db,'report_review_routing')['enabled']: return 0
    if not db.execute(text('SELECT pg_try_advisory_xact_lock(86173301)')).scalar(): return 0
    query = db.query(models.Report).filter(models.Report.status.in_(INTAKE),models.Report.review_assigned_to_id.is_(None))
    rows = query.filter(models.Report.id > _routing_cursor).order_by(models.Report.id).with_for_update(skip_locked=True).limit(limit).all()
    if not rows and _routing_cursor:
        _routing_cursor = 0
        rows = query.order_by(models.Report.id).with_for_update(skip_locked=True).limit(limit).all()
    count = sum(auto_route(db,r) for r in rows)
    db.commit()
    if rows: _routing_cursor = rows[-1].id
    return count


def projection(db, report):
    owner = db.get(models.Official,report.review_assigned_to_id) if report.review_assigned_to_id else None
    reviewer = db.get(models.Official,report.priority_reviewed_by_id) if report.priority_reviewed_by_id else None
    return dict(review_owner_id=report.review_assigned_to_id,review_owner_name=owner.full_name if owner else None,
        assigned_at=report.review_assigned_at,assignment_mode=report.review_assignment_mode,
        routing_reason=report.review_routing_reason,priority_grade=report.priority_grade,
        priority_label=GRADES.get(report.priority_grade),priority_reason=report.priority_reason,
        priority_reviewed_by=reviewer.full_name if reviewer else None,priority_reviewed_at=report.priority_reviewed_at,
        next_review_at=report.next_review_at,policy_version=POLICY,
        priority_policy_version=report.priority_policy_version,
        owner_available=bool(owner and owner.is_active and not owner.is_suspended))


def require_decision(db,user,report,action):
    require_report_scope(db,user,report)
    if not permitted(user,action): raise HTTPException(403,'Your account cannot make this report-review decision.')
    if action in {'review','verify','intake','peer_transfer'} and not permitted(user,'assign') and report.review_assigned_to_id != user.id:
        raise HTTPException(403,'This report is assigned to another reviewer. A coordinator can reassign it.')


def history(db,report):
    entries = db.query(gm.AuditLog).filter(gm.AuditLog.report_id == report.id,gm.AuditLog.trigger_type.in_(['report_assignment','report_priority','report_priority_scale_change','report_routing_location'])).order_by(gm.AuditLog.created_at.desc(),gm.AuditLog.id.desc()).all()
    result = []
    for event in entries:
        try:
            facts = json.loads(event.details or '{}')
        except ValueError:
            facts = {}
        if not isinstance(facts,dict): facts = {}
        actor = db.get(models.Official,event.actor_id) if event.actor_id else None
        label = f'Routing barangay confirmed: {facts["barangay_name"]}' if facts.get('location_confirmation') else 'Routing location matched to the area catalog' if facts.get('location_resolution') else f'Priority set to {facts["grade"]}' if facts.get('grade') else f'Review assigned to {facts["owner_name"]}' if facts.get('owner_name') else 'Review needs routing'
        if event.trigger_type == 'report_priority_scale_change': label = f'Scale updated: {facts.get("previous_grade")} to {facts.get("grade")}'
        elif facts.get('mode') == 'self_take': label = f'Review taken by {facts.get("owner_name")}'
        elif facts.get('mode') == 'engineering_handoff': label = f'Intake submitted to {facts.get("owner_name")}'
        elif facts.get('mode') == 'peer_transfer': label = f'Intake transferred to {facts.get("owner_name")}'
        elif event.trigger_type == 'report_priority' and facts.get('policy') != PRIORITY_POLICY: label += ' (previous scale)'
        result.append(dict(id=event.id,label=label,reason=facts.get('reason'),previous_owner=facts.get('previous_owner_name'),actor=actor.full_name if actor else 'System migration' if event.trigger_type == 'report_priority_scale_change' else 'Automatic routing',created_at=event.created_at))
    return result
