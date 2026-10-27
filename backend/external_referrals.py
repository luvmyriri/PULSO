"""Governed external referrals: private packets, explicit authority, separate transport."""
import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal
from email.utils import parseaddr
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field, EmailStr
from sqlalchemy.orm import Session
import models
import gov_models as gm
from database import get_db
from auth import get_current_user
from government_access import require_report_scope, jurisdiction_ids, scoped_reports
from report_review_router import require_report_access
from referral_models import ReferralRecipient, ExternalReferral, ReferralEvent, ReferralDelivery, ReferralPacket
from referral_letters import letter_pdf
import staff_accounts

router = APIRouter(prefix='/api/gov/referrals', tags=['External referrals'])
CLOSED = {'coordinated_closed', 'cancelled', 'superseded'}
PREPARERS = {'dispatcher', 'city_engineer', 'asst_city_engineer', 'manager', 'project_engineer', 'admin_officer', 'admin_clerk', 'records_officer'}
PH_TIME = timezone(timedelta(hours=8), 'Asia/Manila')


def now():
    return datetime.now(timezone.utc)


def grant(user, action):
    if not isinstance(user, models.Official) or not user.is_active or user.is_suspended:
        return False
    caps = user.role_ref.capabilities or {} if user.role_ref else {}
    if 'referrals' in caps:
        values = caps['referrals']
        return isinstance(values, list) and (action in values or '*' in values)
    if action == 'view':
        return user.role in PREPARERS or staff_accounts.allowed(user, 'settings_manage')
    if action == 'approve':
        roles = {v.strip() for v in os.getenv('PULSO_REFERRAL_APPROVER_ROLES', '').split(',') if v.strip()}
        return user.role in roles
    return user.role in PREPARERS


def authority(user, action='view'):
    if not grant(user, action):
        raise HTTPException(403, 'Your account does not have this referral permission. Outgoing approval requires an explicit delegation.')


def future(value):
    if not value.tzinfo or value <= now():
        raise HTTPException(422, 'Choose a future follow-up time with a time zone.')
    return value


def owner(db, actor, owner_id, report):
    person = db.get(models.Official, owner_id)
    if not person or not grant(person, 'create'):
        raise HTTPException(422, 'Choose an active employee authorized to coordinate referrals.')
    require_report_scope(db, person, report)
    return person


def get_item(db, actor, referral_id, lock=False):
    authority(actor)
    query = db.query(ExternalReferral).filter_by(id=referral_id)
    item = query.with_for_update().first() if lock else query.first()
    if not item:
        raise HTTPException(404, 'Referral not found.')
    report = db.get(models.Report, item.report_id)
    require_report_access(db, actor, report)
    return item, report


def event(db, item, actor, action, note, **facts):
    db.add(ReferralEvent(referral_id=item.id, actor_id=actor.id if actor else None, action=action, note=note, facts=facts))
    db.add(gm.AuditLog(trigger_type='external_referral', actor_id=actor.id if actor else None,
        actor_role=actor.role if actor else 'system', report_id=item.report_id,
        action=f'{item.reference}: {action}', details=json.dumps(dict(reason=note, **facts))))


def recipient_projection(person):
    return {key: getattr(person, key) for key in ('id', 'name', 'email', 'phone', 'active', 'version', 'verification_reference', 'verified_at')}


def snapshot(db, item, report, approver=None):
    recipient = db.get(ReferralRecipient, item.recipient_id)
    if not recipient:
        raise HTTPException(409, 'The receiving office needs an administrator review.')
    prepared = db.get(models.Official, item.created_by_id)
    coordinator = db.get(models.Official, item.owner_id)
    return dict(template_version='referral-letter-v1', reference=item.reference, ticket_id=report.ticket_id,
        report_version=report.version, prepared_date=now().astimezone(PH_TIME).strftime('%d %B %Y'),
        recipient_id=recipient.id, recipient_version=recipient.version, recipient_name=recipient.name,
        recipient_email=recipient.email, recipient_phone=recipient.phone, verification_reference=recipient.verification_reference,
        location=report.location_string or report.location_barangay or 'Location not recorded — clarify before dispatch',
        summary=item.summary, reason=item.reason, requested_action=item.requested_action,
        owner_name=coordinator.full_name if coordinator else 'Unavailable employee', prepared_by=prepared.full_name,
        follow_up_label=item.next_follow_up_at.astimezone(PH_TIME).strftime('%d %B %Y, %I:%M %p (Philippine time)'),
        reply_to=os.getenv('PULSO_REFERRAL_REPLY_TO', '').strip(), approver_name=approver.full_name if approver else None)


def latest_delivery(db, item):
    return db.query(ReferralDelivery).filter_by(referral_id=item.id).order_by(ReferralDelivery.id.desc()).first()


def current_recipient(db, item):
    person = db.get(ReferralRecipient, item.recipient_id)
    return bool(person and person.active and item.packet and person.version == item.packet.get('recipient_version'))


def actions(db, item, actor):
    result = []
    delivery = latest_delivery(db, item)
    transport = delivery.status if delivery else None
    if grant(actor, 'create'):
        if item.status == 'draft':
            result += ['edit']
        if item.status not in CLOSED:
            result += ['assign_owner', 'follow_up']
            if transport not in {'queued', 'sending'}:
                result += ['cancel']
        if item.status == 'approved' and transport not in {'queued', 'sending', 'provider_accepted', 'delivery_unknown'}:
            result += ['return_to_draft']
            if current_recipient(db, item):
                result += ['send' if item.packet.get('recipient_email') else 'record_manual_handoff']
        if item.status == 'awaiting_acknowledgment':
            result += ['acknowledge', 'decline', 'record_response']
        if item.status == 'acknowledged':
            result += ['record_response', 'decline']
        if item.status == 'response_received':
            result += ['close_coordination']
        if item.status in {'declined', 'cancelled'}:
            result += ['reroute']
        if transport == 'delivery_unknown':
            result += ['confirm_sent', 'confirm_not_sent']
    recipient = db.get(ReferralRecipient, item.recipient_id)
    if item.status == 'draft' and recipient.active and grant(actor, 'approve') and item.created_by_id != actor.id:
        result += ['approve']
    if item.status == 'coordinated_closed' and item.owner_id != actor.id and grant(actor,'verify'):
        from government_access import can
        if can(actor, 'verification') and db.get(models.Report, item.report_id).status not in {'resolved', 'completed', 'rejected', 'cancelled'}:
            result += ['verify_report_resolution']
    return result


def permissions(user, report):
    visible = grant(user, 'view')
    return dict(view=visible, create=visible and grant(user,'create') and report.status not in {'resolved','completed','cancelled','rejected'},
                approve=visible and grant(user,'approve'), manage_directory=visible and staff_accounts.allowed(user,'settings_manage'))


def projection(db, item, actor, detail=False):
    report = db.get(models.Report, item.report_id)
    person = db.get(ReferralRecipient, item.recipient_id)
    coordinator = db.get(models.Official, item.owner_id)
    delivery = latest_delivery(db, item)
    result = {key: getattr(item, key) for key in ('id', 'reference', 'report_id', 'status', 'version', 'recipient_id', 'owner_id', 'previous_referral_id', 'reason', 'summary', 'requested_action', 'next_follow_up_at', 'recipient_reference', 'created_at', 'approved_at', 'packet_hash')}
    result.update(ticket_id=report.ticket_id, report_version=report.version, report_status=report.status, recipient_name=person.name,
        recipient_email=(item.packet or {}).get('recipient_email', person.email), recipient_phone=person.phone,
        owner_name=coordinator.full_name, overdue=item.status not in CLOSED and item.next_follow_up_at < now(),
        allowed_actions=actions(db, item, actor), transport=delivery.status if delivery else 'not_sent',
        transport_error=delivery.error_code if delivery else None, recipient_current=current_recipient(db, item))
    if detail:
        result['packet'] = item.packet or snapshot(db, item, report)
        result['preview_hash'] = hashlib.sha256(json.dumps(snapshot(db, item, report), sort_keys=True).encode()).hexdigest() if item.status == 'draft' else None
        result['events'] = [dict(id=row.id, action=row.action, note=row.note, facts=row.facts, created_at=row.created_at,
                                actor_name=db.get(models.Official, row.actor_id).full_name if row.actor_id else 'System')
            for row in db.query(ReferralEvent).filter_by(referral_id=item.id).order_by(ReferralEvent.id.desc()).all()]
        result['deliveries'] = [dict(id=row.id, status=row.status, message_id=row.message_id, created_at=row.created_at, finished_at=row.finished_at, error_code=row.error_code)
            for row in db.query(ReferralDelivery).filter_by(referral_id=item.id).order_by(ReferralDelivery.id.desc()).all()]
        result['approved_packets'] = [dict(id=row.id, approved_at=row.approved_at, packet_hash=row.packet_hash)
            for row in db.query(ReferralPacket).filter_by(referral_id=item.id).order_by(ReferralPacket.id.desc()).all()]
    return result


class DirectoryEntry(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    name: str = Field(min_length=3, max_length=180)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=80)
    verification_reference: str = Field(min_length=10, max_length=2000)
    active: bool = True
    expected_version: int | None = None


class Draft(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    report_id: int
    expected_report_version: int = Field(ge=1)
    recipient_id: int
    owner_id: int
    reason: str = Field(min_length=10, max_length=2000)
    summary: str = Field(min_length=10, max_length=5000)
    requested_action: str = Field(min_length=10, max_length=3000)
    next_follow_up_at: datetime
    previous_referral_id: int | None = None
    disclosure_reviewed: Literal[True]


class Command(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    action: Literal['approve', 'return_to_draft', 'send', 'record_manual_handoff', 'acknowledge', 'decline', 'record_response', 'close_coordination', 'cancel', 'assign_owner', 'follow_up', 'confirm_sent', 'confirm_not_sent', 'verify_report_resolution']
    expected_version: int = Field(ge=1)
    reason: str = Field(min_length=10, max_length=3000)
    reference: str | None = Field(default=None, min_length=3, max_length=255)
    owner_id: int | None = None
    next_follow_up_at: datetime | None = None
    expected_packet_hash: str | None = None
    expected_report_version: int | None = None
    report_issue_addressed: bool = False


@router.get('/options')
def options(report_id: int | None = None, db: Session = Depends(get_db), actor=Depends(get_current_user)):
    authority(actor)
    report = db.get(models.Report, report_id) if report_id else None
    if report_id:
        if not report: raise HTTPException(404, 'Report not found.')
        require_report_access(db, actor, report)
    people = []
    if grant(actor, 'create'):
        for person in db.query(models.Official).order_by(models.Official.full_name).all():
            if not grant(person, 'create'): continue
            try:
                if report: require_report_scope(db, person, report)
                elif jurisdiction_ids(actor) and (not jurisdiction_ids(person) or not set(jurisdiction_ids(person)).issubset(jurisdiction_ids(actor))): continue
            except HTTPException: continue
            people.append(dict(id=person.id, name=person.full_name))
    from referral_transport import configuration
    return dict(recipients=[recipient_projection(p) for p in db.query(ReferralRecipient).order_by(ReferralRecipient.name).all()],
        owners=people, can_create=grant(actor, 'create') and (not report or report.status not in {'resolved','completed','cancelled','rejected'}), can_manage_directory=staff_accounts.allowed(actor, 'settings_manage'),
        can_approve=grant(actor, 'approve'), approval_configured=bool(os.getenv('PULSO_REFERRAL_APPROVER_ROLES') or (actor.role_ref and 'referrals' in (actor.role_ref.capabilities or {}))),
        transport_ready=configuration()['ready'], report=dict(id=report.id, ticket_id=report.ticket_id, version=report.version, category=report.category, location=report.location_string or report.location_barangay) if report else None)


@router.post('/recipients', status_code=201)
def add_recipient(payload: DirectoryEntry, db: Session = Depends(get_db), actor=Depends(get_current_user)):
    authority(actor)
    staff_accounts.require_action(actor, 'settings_manage')
    if not payload.email and not payload.phone: raise HTTPException(422, 'Record a verified email or manual contact number.')
    person = ReferralRecipient(name=payload.name, email=str(payload.email) if payload.email else None, phone=payload.phone,
        verification_reference=payload.verification_reference, active=payload.active, version=1, verified_by_id=actor.id, verified_at=now())
    db.add(person)
    db.flush()
    db.add(gm.AuditLog(trigger_type='referral_directory', actor_id=actor.id, actor_role=actor.role, action='Verified referral recipient added', details=json.dumps(dict(recipient_id=person.id, source=payload.verification_reference))))
    db.commit()
    return recipient_projection(person)


@router.put('/recipients/{recipient_id}')
def update_recipient(recipient_id: int, payload: DirectoryEntry, db: Session = Depends(get_db), actor=Depends(get_current_user)):
    authority(actor)
    staff_accounts.require_action(actor, 'settings_manage')
    person = db.query(ReferralRecipient).filter_by(id=recipient_id).with_for_update().first()
    if not person: raise HTTPException(404, 'Recipient not found.')
    if payload.expected_version != person.version: raise HTTPException(409, 'The directory entry changed. Refresh it.')
    if not payload.email and not payload.phone: raise HTTPException(422, 'Record a verified email or manual contact number.')
    for key in ('name', 'email', 'phone', 'verification_reference', 'active'):
        setattr(person, key, str(payload.email) if key == 'email' and payload.email else getattr(payload, key))
    person.version += 1
    person.verified_by_id, person.verified_at = actor.id, now()
    db.add(gm.AuditLog(trigger_type='referral_directory', actor_id=actor.id, actor_role=actor.role, action='Referral recipient updated; unsent approvals require review', details=json.dumps(dict(recipient_id=person.id, version=person.version, source=payload.verification_reference))))
    db.commit()
    return recipient_projection(person)


@router.get('')
def listing(report_id: int | None = None, view: Literal['all', 'mine', 'overdue'] = 'all', page: int = Query(1, ge=1), db: Session = Depends(get_db), actor=Depends(get_current_user)):
    authority(actor)
    query = db.query(ExternalReferral).filter(ExternalReferral.report_id.in_(scoped_reports(db.query(models.Report.id), actor)))
    from gov_router import FIELD_SELF_ROLES
    if actor.role in FIELD_SELF_ROLES:
        query = query.filter(ExternalReferral.report_id.in_(db.query(gm.WorkOrder.report_id).filter_by(assigned_to_id=actor.id)))
    if report_id:
        report = db.get(models.Report, report_id)
        if not report: raise HTTPException(404, 'Report not found.')
        require_report_access(db, actor, report)
        query = query.filter_by(report_id=report_id)
    if view == 'mine': query = query.filter_by(owner_id=actor.id)
    if view == 'overdue': query = query.filter(ExternalReferral.next_follow_up_at < now(), ExternalReferral.status.notin_(CLOSED))
    total = query.count()
    rows = query.order_by(ExternalReferral.updated_at.desc(), ExternalReferral.id.desc()).offset((page-1)*15).limit(15).all()
    return dict(items=[projection(db, row, actor) for row in rows], total=total, page=page, can_create=grant(actor, 'create'))


def set_draft(db, item, report, payload, actor):
    person = db.get(ReferralRecipient, payload.recipient_id)
    if not person or not person.active: raise HTTPException(422, 'Choose an active verified receiving office.')
    owner(db, actor, payload.owner_id, report)
    future(payload.next_follow_up_at)
    for key in ('recipient_id', 'owner_id', 'reason', 'summary', 'requested_action', 'next_follow_up_at'):
        setattr(item, key, getattr(payload, key))


@router.post('', status_code=201)
def create(payload: Draft, db: Session = Depends(get_db), actor=Depends(get_current_user)):
    authority(actor, 'create')
    report = db.query(models.Report).filter_by(id=payload.report_id).with_for_update().first()
    if not report: raise HTTPException(404, 'Report not found.')
    require_report_access(db, actor, report)
    if report.version != payload.expected_report_version: raise HTTPException(409, 'The source report changed. Refresh and review it.')
    if report.status in {'resolved', 'completed', 'cancelled', 'rejected'}: raise HTTPException(409, 'This report is closed. A coordinator must review its disposition before a new referral.')
    if payload.previous_referral_id:
        previous, _ = get_item(db, actor, payload.previous_referral_id, True)
        if previous.report_id != report.id or previous.status not in {'declined', 'cancelled'}:
            raise HTTPException(409, 'Rerouting requires a declined or cancelled referral for this report.')
    item = ExternalReferral(reference=f'REF-{now():%Y%m%d}-{secrets.token_hex(5).upper()}', report_id=report.id,
        created_by_id=actor.id, previous_referral_id=payload.previous_referral_id, status='draft', version=1)
    set_draft(db, item, report, payload, actor)
    db.add(item)
    db.flush()
    if payload.previous_referral_id:
        previous.status = 'superseded'
        previous.version += 1
        event(db, previous, actor, 'rerouted', payload.reason, next_referral_id=item.id, next_reference=item.reference)
    event(db, item, actor, 'draft_created', payload.reason, previous_referral_id=payload.previous_referral_id)
    db.add(models.Notification(official_id=item.owner_id, title='External referral assigned', message=f'{item.reference}: prepare and follow up this referral.', target_url=f'/gov/reports/{item.report_id}?reportTab=routing&referral={item.id}'))
    db.commit()
    return projection(db, item, actor, True)


@router.get('/{referral_id}')
def detail(referral_id: int, report_id: int | None = None, db: Session = Depends(get_db), actor=Depends(get_current_user)):
    item, _ = get_item(db, actor, referral_id)
    if report_id is not None and item.report_id != report_id: raise HTTPException(404,'This handoff does not belong to the selected report.')
    return projection(db, item, actor, True)


@router.put('/{referral_id}')
def edit(referral_id: int, payload: Draft, expected_version: int = Query(ge=1), db: Session = Depends(get_db), actor=Depends(get_current_user)):
    authority(actor, 'create')
    item, report = get_item(db, actor, referral_id, True)
    if item.version != expected_version or item.status != 'draft': raise HTTPException(409, 'Only the current draft can be edited. Refresh this referral.')
    if payload.report_id != report.id or payload.expected_report_version != report.version or payload.previous_referral_id != item.previous_referral_id: raise HTTPException(409, 'The linked report or referral chain changed. Refresh the draft.')
    set_draft(db, item, report, payload, actor)
    item.version += 1
    event(db, item, actor, 'draft_updated', payload.reason)
    db.commit()
    return projection(db, item, actor, True)


@router.get('/{referral_id}/letter')
def download_letter(referral_id: int, db: Session = Depends(get_db), actor=Depends(get_current_user)):
    item, report = get_item(db, actor, referral_id)
    content = bytes(item.letter_pdf) if item.letter_pdf else letter_pdf(snapshot(db, item, report))
    return Response(content, media_type='application/pdf', headers={'Content-Disposition': f'attachment; filename="{item.reference}.pdf"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'})


@router.get('/{referral_id}/packets/{packet_id}/letter')
def historical_letter(referral_id: int, packet_id: int, db: Session = Depends(get_db), actor=Depends(get_current_user)):
    item, _ = get_item(db, actor, referral_id)
    packet = db.query(ReferralPacket).filter_by(id=packet_id, referral_id=item.id).first()
    if not packet: raise HTTPException(404, 'Approved packet not found.')
    return Response(bytes(packet.letter_pdf), media_type='application/pdf', headers={'Content-Disposition': f'attachment; filename="{item.reference}-approved-{packet.id}.pdf"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'})


@router.post('/{referral_id}/commands')
def command(referral_id: int, payload: Command, db: Session = Depends(get_db), actor=Depends(get_current_user)):
    item, report = get_item(db, actor, referral_id, True)
    if item.version != payload.expected_version: raise HTTPException(409, 'This referral changed. Refresh before recording a decision.')
    if payload.action not in actions(db, item, actor): raise HTTPException(403, 'This action is not permitted in the current referral state.')
    action = payload.action
    if action == 'approve':
        # Deliberate preview of the exact current data, followed by immutable PDF bytes.
        owner(db, actor, item.owner_id, report)
        future(item.next_follow_up_at)
        packet = snapshot(db, item, report, actor)
        current_draft = snapshot(db, item, report)
        digest = hashlib.sha256(json.dumps(current_draft, sort_keys=True).encode()).hexdigest()
        if payload.expected_packet_hash != digest: raise HTTPException(409, 'The letter preview changed. Refresh and review its exact content before approving.')
        item.packet = packet
        item.letter_pdf = letter_pdf(packet, approved=True)
        item.packet_hash = hashlib.sha256(item.letter_pdf).hexdigest()
        item.approved_by_id, item.approved_at, item.status = actor.id, now(), 'approved'
        db.add(ReferralPacket(referral_id=item.id, approved_by_id=actor.id, approved_at=item.approved_at,
                              packet=packet, packet_hash=item.packet_hash, letter_pdf=item.letter_pdf))
    elif action == 'return_to_draft':
        # The previous approved packet is retained in the immutable audit event.
        event(db, item, actor, 'approval_superseded', payload.reason, packet=item.packet, packet_hash=item.packet_hash)
        item.packet, item.packet_hash, item.letter_pdf = None, None, None
        item.approved_by_id, item.approved_at, item.status = None, None, 'draft'
    elif action == 'send':
        from referral_transport import configuration
        if not configuration()['ready']: raise HTTPException(503, 'Referral email is disabled or the approved sending mailbox is not configured.')
        approver = db.get(models.Official, item.approved_by_id)
        if not approver or not grant(approver, 'approve') or report.version != item.packet.get('report_version'):
            raise HTTPException(409, 'The source report or approval authority changed. Return to draft and review it again.')
        if payload.expected_packet_hash != item.packet_hash: raise HTTPException(409, 'Review the approved packet again before sending.')
        if item.packet.get('reply_to') != configuration()['reply_to']: raise HTTPException(409, 'The reply mailbox changed. Return to draft and approve the updated letter.')
        delivery = ReferralDelivery(referral_id=item.id, status='queued', queued_by_id=actor.id,
            message_id=f'<pulso-referral-{secrets.token_hex(16)}@{configuration()["sender"].split("@")[1]}>', packet_hash=item.packet_hash)
        db.add(delivery)
    elif action == 'record_manual_handoff':
        if not payload.reference: raise HTTPException(422, 'Record the receiving stamp, telephone log or handoff reference.')
        approver = db.get(models.Official, item.approved_by_id)
        if not approver or not grant(approver, 'approve') or report.version != item.packet.get('report_version'):
            raise HTTPException(409, 'The source report or approval authority changed. Return to draft and review it again.')
        item.status = 'awaiting_acknowledgment'
    elif action == 'verify_report_resolution':
        report = db.query(models.Report).filter_by(id=item.report_id).with_for_update().one()
        if not payload.reference or not payload.report_issue_addressed:
            raise HTTPException(422, 'Record verification evidence and confirm the response addressed the concern.')
        if payload.expected_report_version != report.version: raise HTTPException(409, 'The source report changed. Refresh before verifying resolution.')
        if db.query(ExternalReferral.id).filter(ExternalReferral.report_id == report.id, ExternalReferral.status.notin_(CLOSED)).first():
            raise HTTPException(409, 'Other external referrals still require follow-up.')
        if db.query(gm.WorkOrder.id).filter(gm.WorkOrder.report_id == report.id, gm.WorkOrder.status.notin_({'completed', 'cancelled', 'rejected', 'resolved'})).first():
            raise HTTPException(409, 'Linked engineering work still requires completion.')
        if db.query(gm.ProjectRequest.id).filter(gm.ProjectRequest.source_report_id == report.id, gm.ProjectRequest.status.notin_({'completed', 'closed_completion_certified', 'resolved', 'cancelled'})).first():
            raise HTTPException(409, 'A linked project still requires follow-up.')
        import gov_crud
        gov_crud._sync_report_status(db, report.id, 'resolved', actor.id, actor.role, note=f'{item.reference}: external outcome independently verified. Reference: {payload.reference}. {payload.reason}')
    elif action in {'acknowledge', 'decline', 'record_response', 'close_coordination', 'confirm_sent', 'confirm_not_sent'}:
        if not payload.reference: raise HTTPException(422, 'Record the acknowledgment, response or reconciliation reference.')
        if action in {'acknowledge', 'decline', 'record_response'}: item.recipient_reference = payload.reference
        if action == 'acknowledge': item.status = 'acknowledged'
        elif action == 'decline': item.status = 'declined'
        elif action == 'record_response': item.status = 'response_received'
        elif action == 'close_coordination': item.status = 'coordinated_closed'
        else:
            delivery = latest_delivery(db, item)
            delivery.status = 'provider_accepted' if action == 'confirm_sent' else 'failed'
            delivery.error_code = 'manually_reconciled'
            delivery.finished_at = now()
            if action == 'confirm_sent': item.status = 'awaiting_acknowledgment'
    elif action == 'cancel': item.status = 'cancelled'
    if action == 'assign_owner':
        if not payload.owner_id: raise HTTPException(422, 'Choose the accountable CED follow-up employee.')
        owner(db, actor, payload.owner_id, report)
        item.owner_id = payload.owner_id
        db.add(models.Notification(official_id=item.owner_id, title='Referral follow-up assigned', message=item.reference, target_url=f'/gov/reports/{item.report_id}?reportTab=routing&referral={item.id}'))
    if item.status not in CLOSED and action not in {'approve', 'return_to_draft', 'send', 'confirm_not_sent'}:
        if not payload.next_follow_up_at: raise HTTPException(422, 'Record the next follow-up time.')
        item.next_follow_up_at = future(payload.next_follow_up_at)
    item.version += 1
    item.updated_at = now()
    event(db, item, actor, action, payload.reason, reference=payload.reference, packet_hash=item.packet_hash, owner_id=item.owner_id)
    db.commit()
    return projection(db, item, actor, True)
