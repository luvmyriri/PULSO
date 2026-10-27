"""Reviewed public updates, immutable releases, and private report relationships."""
from collections import defaultdict
from datetime import datetime, timezone
from hashlib import sha256
import json
from math import ceil
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, File, Form
from pathlib import Path
from uuid import uuid4
from sqlalchemy import inspect, or_
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from government_access import can, require, require_scope, require_report_scope, scoped, scoped_reports, jurisdiction_ids
import models
import gov_models as gm
import gov_schemas as gs


def require_announcement_staff(current_user=Depends(get_current_user)):
    require(current_user, 'announcements')
    return current_user


router = APIRouter(prefix='/api/gov/announcements', tags=['Government Announcements'], dependencies=[Depends(require_announcement_staff)])
public_router = APIRouter(prefix='/api/announcements', tags=['Public Announcements'])
VALID_CATEGORIES = ['planned_works', 'service_interruption', 'progress_update', 'work_completed', 'general_notice', 'advisory', 'news_release']
VALID_PRIORITIES = ['normal', 'urgent', 'emergency']
VALID_ASSOCIATION_TYPES = ['candidate', 'contextual_relevance', 'confirmed_coverage', 'rejected', 'revoked']
REVIEWED_LINKS = {'contextual_relevance', 'confirmed_coverage'}
EDITABLE = {'draft', 'in_review'}


def _ensure_announcement_tables(db):
    """Readiness check only. Schema changes belong to Alembic, never to a request."""
    inspector = inspect(db.get_bind())
    if not all(inspector.has_table(t) for t in ('budget_disclosures', 'announcement_report_associations', 'announcement_revisions')):
        raise HTTPException(503, 'Updates need the latest database migration. No changes have been saved.')


def _get(db, announcement_id, user=None, lock=False):
    _ensure_announcement_tables(db)
    query = db.query(gm.Announcement).filter(gm.Announcement.id == announcement_id)
    item = (query.with_for_update() if lock else query).first()
    if not item:
        raise HTTPException(404, 'Public update not found.')
    if user:
        require_scope(user, item)
    return item


def _expect(item, expected):
    if expected is None or expected != item.content_version:
        raise HTTPException(409, 'This update has changed. Reload it and review the latest version before saving.')


def _editable(item):
    if item.status not in EDITABLE:
        raise HTTPException(409, 'This version is locked. Return a review to draft, or prepare a correction to a published update.')


def _changed(item):
    item.content_version += 1
    item.status = 'draft'
    item.approved_version = None
    item.approved_by_id = None
    item.approved_at = None
    item.reviewer_id = None


def _audit(db, item, actor, action, reason=''):
    db.add(gm.AuditLog(trigger_type='announcement', actor_id=actor.id, actor_role=actor.role,
        action=f'{action}: {item.announcement_id} v{item.content_version}', details=reason))


def _name(db, actor_id):
    actor = db.query(models.Official).filter(models.Official.id == actor_id).first() if actor_id else None
    return actor.full_name if actor else None


def _format_association(db, assoc):
    report = assoc.report
    return gs.AnnouncementReportAssociationResponse(
        id=assoc.id, announcement_id=assoc.announcement_id, report_id=assoc.report_id,
        ticket_id=report.ticket_id if report else None, report_title=(report.description or '')[:140] if report else None,
        report_category=report.category if report else None, report_barangay=report.location_barangay if report else None,
        report_status=report.status if report else None, association_type=assoc.association_type,
        basis_reason=assoc.basis_reason, created_by_id=assoc.created_by_id,
        reviewed_by_id=assoc.reviewed_by_id, reviewed_by_name=_name(db, assoc.reviewed_by_id), reviewed_at=assoc.reviewed_at,
        revoked_by_id=assoc.revoked_by_id, revoked_by_name=_name(db, assoc.revoked_by_id), revoked_at=assoc.revoked_at,
        revoked_reason=assoc.revoked_reason, notified_at=assoc.notified_at, created_at=assoc.created_at)


def _format_budget_disclosure(db, disc):
    if not disc:
        return None
    return gs.BudgetDisclosureResponse.model_validate(disc).model_copy(update={
        'entered_by_name': _name(db, disc.entered_by_id), 'reviewed_by_name': _name(db, disc.reviewed_by_id)})


def _disclosure(db, item):
    return db.query(gm.BudgetDisclosure).filter(gm.BudgetDisclosure.id == item.disclosure_ref_id).first() if item.disclosure_ref_id else None


def _actions(item, user):
    actions = []
    if item.status in EDITABLE and can(user, 'announcements', 'edit'): actions.append('edit')
    if item.status == 'draft' and can(user, 'announcements', 'edit'): actions.append('submit')
    if item.status == 'in_review' and can(user, 'announcements', 'approve'): actions += ['approve', 'return_to_draft']
    if item.status == 'approved' and item.approved_version == item.content_version and can(user, 'announcements', 'publish'): actions.append('publish')
    if item.status == 'published' and can(user, 'announcements', 'correct'): actions.append('correct')
    if item.status not in {'withdrawn', 'expired'} and can(user, 'announcements', 'withdraw'): actions.append('withdraw')
    return actions


def _format_announcement_response(db, item, include_staff_associations=True, user=None):
    if not include_staff_associations:
        return _public(db, item)
    assocs = db.query(gm.AnnouncementReportAssociation).filter_by(announcement_id=item.id).order_by(gm.AnnouncementReportAssociation.id).all()
    return gs.AnnouncementResponse(
        id=item.id, announcement_id=item.announcement_id, title_en=item.title_en, title_fil=item.title_fil,
        content_en=item.content_en, content_fil=item.content_fil, category=item.category, publication_format=item.publication_format,
        publication_details=item.publication_details or {}, attachments=item.attachments or [],
        priority=item.priority, status=item.status, target_audience=item.target_audience,
        target_districts=item.target_districts or [], target_barangays=item.target_barangays or [],
        district_id=item.district_id, barangay_id=item.barangay_id, channels=item.channels or ['web'],
        scheduled_at=item.scheduled_at, published_at=item.published_at, expires_at=item.expires_at,
        author_id=item.author_id, author_name=_name(db, item.author_id), reviewer_id=item.reviewer_id,
        approved_by_id=item.approved_by_id, approved_at=item.approved_at,
        withdrawal_reason=item.withdrawal_reason, withdrawn_at=item.withdrawn_at,
        source_report_id=item.source_report_id, source_work_order_id=item.source_work_order_id,
        source_project_id=item.source_project_id, source_asset_id=item.source_asset_id, image_url=item.image_url,
        created_at=item.created_at, updated_at=item.updated_at, content_version=item.content_version,
        approved_version=item.approved_version, published_version=item.published_version,
        allowed_actions=_actions(item, user) if user else [], budget_disclosure=_format_budget_disclosure(db, _disclosure(db, item)),
        report_associations=[_format_association(db, a) for a in assocs],
        confirmed_reports_count=sum(a.association_type == 'confirmed_coverage' for a in assocs),
        contextual_reports_count=sum(a.association_type == 'contextual_relevance' for a in assocs),
        candidate_reports_count=sum(a.association_type == 'candidate' for a in assocs),
        has_corrections=bool(item.corrections), corrections_count=len(item.corrections))


def _validate_content(payload, db=None):
    details = getattr(payload, 'publication_details', None)
    if details is None:
        raise HTTPException(422, 'Publication details cannot be empty. Use an object instead.')
    details = details if isinstance(details, dict) else details.model_dump(mode='json')
    start, end = details.get('effective_from'), details.get('effective_until')
    def date_value(value):
        parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    if start and end and date_value(end) <= date_value(start):
        raise HTTPException(422, 'The end of the advisory must be after its start.')
    if payload.category not in VALID_CATEGORIES or payload.priority not in VALID_PRIORITIES:
        raise HTTPException(422, 'Choose a supported update category and priority.')
    if payload.publication_format not in {'announcement', 'advisory', 'news'}:
        raise HTTPException(422, 'Choose Announcement, Advisory, or News.')
    if payload.channels != ['web']:
        raise HTTPException(422, 'Only web publication is configured. Related report owners receive a separate in-app notification.')
    if payload.target_audience not in {'public', 'district', 'barangay'}:
        raise HTTPException(422, 'Public updates must have a public, district, or barangay audience.')
    if db is not None:
        if payload.district_id and not db.query(models.District.id).filter_by(id=payload.district_id).first():
            raise HTTPException(422, 'Choose a recorded district.')
        names = payload.target_barangays or []
        areas = db.query(models.Barangay).filter(models.Barangay.name.in_(names)).all() if names else []
        if set(names) != {a.name for a in areas} or (payload.district_id and any(a.district_id != payload.district_id for a in areas)):
            raise HTTPException(422, 'Choose recorded barangays within the selected district.')


def _save_disclosure(db, item, payload, actor):
    if payload is None or payload.amount is None:
        item.disclosure_ref_id = None
        return
    for model, identifier in ((gm.ProjectRequest, payload.project_id), (gm.WorkOrder, payload.work_order_id)):
        if identifier:
            record = db.query(model).filter_by(id=identifier).first()
            if not record:
                raise HTTPException(404, 'The disclosure source record was not found.')
            require_scope(actor, record)
    fields = payload.model_dump(exclude={'expected_version', 'review_state', 'publication_format'})
    fields['amount'] = str(payload.amount)
    fields['source_date'] = payload.source_date.isoformat() if payload.source_date else None
    canonical = {k: fields[k] for k in ('project_id', 'work_order_id', 'amount_type', 'source_url', 'fiscal_period', 'scope_caveat')}
    if not payload.project_id and not payload.work_order_id:
        canonical['update_id'] = item.id
    source_key = sha256(json.dumps(canonical, sort_keys=True).encode()).hexdigest()
    rows = db.query(gm.BudgetDisclosure).filter_by(source_key=source_key).order_by(gm.BudgetDisclosure.version.desc()).all()
    for disc in rows:
        if all(str(getattr(disc, k) or '') == str(v or '') for k, v in fields.items()):
            item.disclosure_ref_id = disc.id
            return
    disc = gm.BudgetDisclosure(**payload.model_dump(exclude={'expected_version', 'review_state'}),
        source_key=source_key, version=(rows[0].version + 1 if rows else 1), announcement_id=item.id,
        entered_by_id=actor.id, review_state='draft')
    db.add(disc)
    db.flush()
    item.disclosure_ref_id = disc.id


def _save_associations(db, item, inputs, actor):
    if inputs is None:
        return
    existing = {a.report_id: a for a in db.query(gm.AnnouncementReportAssociation).filter_by(announcement_id=item.id).all()}
    seen = set()
    for value in inputs:
        if value.report_id in seen:
            raise HTTPException(422, 'A report can be linked only once to this update.')
        seen.add(value.report_id)
        report = db.query(models.Report).filter_by(id=value.report_id).first()
        if not report:
            raise HTTPException(404, f'Report {value.report_id} was not found.')
        require_report_scope(db, actor, report)
        old = existing.get(value.report_id)
        unchanged = old and old.association_type == value.association_type and old.basis_reason == value.basis_reason
        if value.association_type != 'candidate' and not unchanged:
            require(actor, 'announcements', 'review')
        assoc = old or gm.AnnouncementReportAssociation(announcement_id=item.id, report_id=report.id, created_by_id=actor.id)
        assoc.association_type = value.association_type
        assoc.basis_reason = value.basis_reason
        if not unchanged:
            assoc.notified_at = None
            assoc.reviewed_by_id = actor.id if value.association_type in REVIEWED_LINKS | {'rejected'} else None
            assoc.reviewed_at = datetime.now(timezone.utc) if assoc.reviewed_by_id else None
        if value.association_type == 'revoked':
            assoc.revoked_by_id, assoc.revoked_at, assoc.revoked_reason = actor.id, datetime.now(timezone.utc), value.basis_reason
        db.add(assoc)
    for report_id, assoc in existing.items():
        if report_id not in seen and assoc.association_type != 'revoked':
            require(actor, 'announcements', 'review')
            assoc.association_type = 'revoked'
            assoc.revoked_by_id, assoc.revoked_at, assoc.revoked_reason = actor.id, datetime.now(timezone.utc), 'Removed from the revised update.'


def _snapshot(db, item):
    result = _format_announcement_response(db, item).model_dump(mode='json')
    # The release stores the review decision; public projection below is a strict allowlist.
    result['corrections'] = [dict(summary=c.correction_summary, created_at=c.created_at.isoformat()) for c in item.corrections]
    return result


PUBLIC_KEYS = {'id', 'announcement_id', 'title_en', 'title_fil', 'content_en', 'content_fil', 'category', 'publication_format',
    'priority', 'target_barangays', 'published_at', 'expires_at', 'image_url', 'content_version', 'publication_details', 'attachments'}
PUBLIC_DISCLOSURE_KEYS = {'disclosure_id', 'version', 'amount', 'currency', 'amount_type', 'source_label', 'source_url', 'source_date', 'fiscal_period', 'issuing_office', 'scope_caveat', 'official_bidding_url'}


def _public(db, item):
    revision = db.query(gm.AnnouncementRevision).filter_by(announcement_id=item.id, version=item.published_version).first()
    if not revision:
        raise HTTPException(404, 'This update is not publicly available.')
    snapshot = revision.snapshot
    result = {k: snapshot.get(k) for k in PUBLIC_KEYS}
    disc = snapshot.get('budget_disclosure')
    result['budget_disclosure'] = {k: disc.get(k) for k in PUBLIC_DISCLOSURE_KEYS} if disc else None
    result['status'] = 'published'
    result['corrections'] = snapshot.get('corrections', [])
    return result


def _available(db, item):
    if item.published_version is None or item.status in {'expired', 'withdrawn'}:
        return False
    revision = db.query(gm.AnnouncementRevision).filter_by(announcement_id=item.id, version=item.published_version).first()
    if not revision:
        return False
    now = datetime.now(timezone.utc)
    expires = revision.snapshot.get('expires_at')
    if isinstance(expires, str): expires = datetime.fromisoformat(expires.replace('Z', '+00:00'))
    if expires and not expires.tzinfo: expires = expires.replace(tzinfo=timezone.utc)
    return revision.snapshot.get('target_audience', 'public') != 'staff' and (not expires or expires > now)


def _execute_channel_deliveries(db, item):
    recipients = defaultdict(list)
    links = db.query(gm.AnnouncementReportAssociation).filter_by(announcement_id=item.id).all()
    for assoc in links:
        if assoc.association_type not in REVIEWED_LINKS or not assoc.reviewed_by_id or not assoc.reviewed_at:
            continue
        report = assoc.report
        owner = (report.claimed_by_user_id or report.resident_id) if report else None
        if owner:
            recipients[owner].append(assoc.report_id)
    for recipient, report_ids in recipients.items():
        key = f'publication:{item.id}:v{item.content_version}:resident:{recipient}:release'
        if not db.query(gm.OutboxEvent.id).filter_by(event_key=key).first():
            db.add(gm.OutboxEvent(event_key=key, event_type='publication_in_app_notification', payload={
                'announcement_id': item.id, 'version': item.content_version, 'resident_id': recipient, 'report_ids': report_ids,
                'title': 'A city update may be relevant to your report',
                'message': f'{item.title_en}. Open the update to see how it relates to your own report. / Buksan ang update upang makita ang kaugnayan nito sa iyong ulat.',
                'target_url': f'/updates/{item.id}',
            }))
    delivery = db.query(gm.AnnouncementDelivery).filter_by(announcement_id=item.id, channel='web').first()
    if not delivery:
        delivery = gm.AnnouncementDelivery(announcement_id=item.id, channel='web')
        db.add(delivery)
    delivery.status, delivery.recipient_count, delivery.delivered_count, delivery.failed_count = 'published', 0, 0, 0
    delivery.last_attempted_at = delivery.delivered_at = datetime.now(timezone.utc)


def _run_outbox():
    from database import SessionLocal
    from outbox_worker import deliver_pending
    with SessionLocal() as db:
        deliver_pending(db)


@router.get('/permissions')
def publication_permissions(current_user=Depends(get_current_user)):
    from notification_delivery import operational_access
    return {**{action: can(current_user, 'announcements', action) for action in ('view', 'create', 'edit', 'review', 'approve', 'publish', 'withdraw', 'correct')},'notification_delivery':operational_access(current_user)}


@router.get('/scope-options')
def publication_scope_options(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ids = jurisdiction_ids(current_user)
    districts = db.query(models.District)
    barangays = db.query(models.Barangay)
    if ids:
        districts = districts.filter(models.District.id.in_(ids))
        barangays = barangays.filter(models.Barangay.district_id.in_(ids))
    return dict(citywide_allowed=not ids, districts=[dict(id=d.id, name=d.name) for d in districts.all()],
        barangays=[dict(id=b.id, name=b.name, district_id=b.district_id) for b in barangays.order_by(models.Barangay.name).all()])


@router.get('/report-options')
def publication_report_options(q: str = Query(..., min_length=2, max_length=120), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    require(current_user, 'announcements', 'edit')
    query = scoped_reports(db.query(models.Report), current_user)
    term = f'%{q}%'
    query = query.filter(or_(models.Report.ticket_id.ilike(term), models.Report.description.ilike(term), models.Report.location_barangay.ilike(term)))
    return [dict(report_id=r.id, ticket_id=r.ticket_id, report_title=(r.description or '')[:140], report_barangay=r.location_barangay) for r in query.order_by(models.Report.created_at.desc()).limit(20).all()]


@router.get('', response_model=gs.AnnouncementListResponse)
def list_announcements(page: int = Query(1, ge=1), limit: int = Query(100, ge=1, le=200), status: str = None, q: str = Query('', max_length=200), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    _ensure_announcement_tables(db)
    query = scoped(db.query(gm.Announcement), gm.Announcement.district_id, current_user)
    if status: query = query.filter(gm.Announcement.status == status)
    if q.strip(): query = query.filter(or_(gm.Announcement.title_en.ilike(f'%{q.strip()}%'), gm.Announcement.announcement_id.ilike(f'%{q.strip()}%')))
    total = query.count()
    items = query.order_by(gm.Announcement.updated_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return dict(items=[_format_announcement_response(db, item, user=current_user) for item in items], total=total, page=page, limit=limit, pages=ceil(total / limit))


@router.post('', response_model=gs.AnnouncementResponse, status_code=201)
def create_announcement_draft(payload: gs.AnnouncementCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    require(current_user, 'announcements', 'create')
    _validate_content(payload, db)
    _ensure_announcement_tables(db)
    values = payload.model_dump(exclude={'budget_disclosure', 'report_associations_input'})
    values['publication_details'] = payload.publication_details.model_dump(mode='json')
    item = gm.Announcement(**values, status='draft', author_id=current_user.id, content_version=1)
    require_scope(current_user, item)
    db.add(item)
    db.flush()
    _save_disclosure(db, item, payload.budget_disclosure, current_user)
    links = list(payload.report_associations_input or [])
    if item.source_report_id and not any(v.report_id == item.source_report_id for v in links):
        links.append(gs.AnnouncementReportAssociationCreate(report_id=item.source_report_id))
    _save_associations(db, item, links, current_user)
    _audit(db, item, current_user, 'Draft created')
    db.commit()
    db.refresh(item)
    return _format_announcement_response(db, item, user=current_user)


@router.get('/{announcement_id}', response_model=gs.AnnouncementResponse)
def get_announcement_detail(announcement_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return _format_announcement_response(db, _get(db, announcement_id, current_user), user=current_user)


@router.patch('/{announcement_id}', response_model=gs.AnnouncementResponse)
def update_announcement(announcement_id: int, payload: gs.AnnouncementUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    require(current_user, 'announcements', 'edit')
    item = _get(db, announcement_id, current_user, lock=True)
    _expect(item, payload.expected_version)
    _editable(item)
    values = payload.model_dump(exclude_unset=True, exclude={'expected_version', 'budget_disclosure', 'report_associations_input'})
    if payload.publication_details is not None:
        values['publication_details'] = payload.publication_details.model_dump(mode='json')
    for name, value in values.items(): setattr(item, name, value)
    _validate_content(item, db)
    require_scope(current_user, item)
    if 'budget_disclosure' in payload.model_fields_set: _save_disclosure(db, item, payload.budget_disclosure, current_user)
    _save_associations(db, item, payload.report_associations_input, current_user)
    _changed(item)
    _audit(db, item, current_user, 'Draft revised')
    db.commit()
    return _format_announcement_response(db, item, user=current_user)


@router.patch('/{announcement_id}/status', response_model=gs.AnnouncementResponse)
def update_announcement_status(announcement_id: int, payload: gs.AnnouncementStatusUpdate, background_tasks: BackgroundTasks = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    item = _get(db, announcement_id, current_user, lock=True)
    _expect(item, payload.expected_version)
    target = payload.status
    transitions = {('draft', 'in_review'): 'edit', ('in_review', 'draft'): 'approve', ('in_review', 'approved'): 'approve', ('approved', 'published'): 'publish'}
    if target == 'withdrawn':
        require(current_user, 'announcements', 'withdraw')
        if item.status in {'withdrawn', 'expired'}: raise HTTPException(409, 'This update is already withdrawn or expired.')
        if len((payload.withdrawal_reason or '').strip()) < 10: raise HTTPException(422, 'Explain the withdrawal in at least 10 characters.')
        item.withdrawal_reason, item.withdrawn_by_id, item.withdrawn_at = payload.withdrawal_reason.strip(), current_user.id, datetime.now(timezone.utc)
    else:
        action = transitions.get((item.status, target))
        if not action: raise HTTPException(409, f'Cannot change {item.status} to {target}. Follow the available review actions.')
        require(current_user, 'announcements', action)
    if target in {'in_review', 'approved', 'published'}:
        if not (item.title_en or '').strip() or not (item.content_en or '').strip(): raise HTTPException(422, 'Add an English title and body before review.')
    if target == 'approved':
        item.approved_by_id, item.approved_at, item.approved_version = current_user.id, datetime.now(timezone.utc), item.content_version
        disc = _disclosure(db, item)
        if disc:
            disc.review_state, disc.reviewed_by_id, disc.reviewed_at = 'approved', current_user.id, datetime.now(timezone.utc)
    if target == 'draft':
        item.approved_by_id = item.approved_at = item.approved_version = None
    if target == 'in_review': item.reviewer_id = None
    if target == 'published':
        if item.approved_version != item.content_version: raise HTTPException(409, 'This version needs approval before publication.')
        if item.expires_at and (item.expires_at.replace(tzinfo=timezone.utc) if not item.expires_at.tzinfo else item.expires_at) <= datetime.now(timezone.utc): raise HTTPException(422, 'The update expiry is in the past.')
        item.published_at, item.published_version = datetime.now(timezone.utc), item.content_version
    item.status = target
    if target == 'published':
        db.flush()
        db.add(gm.AnnouncementRevision(announcement_id=item.id, version=item.content_version, snapshot=_snapshot(db, item), released_by_id=current_user.id))
        _execute_channel_deliveries(db, item)
    _audit(db, item, current_user, f'Status changed to {target}', payload.withdrawal_reason or '')
    db.commit()
    if target == 'published' and background_tasks: background_tasks.add_task(_run_outbox)
    return _format_announcement_response(db, item, user=current_user)


@router.post('/{announcement_id}/corrections', response_model=gs.AnnouncementResponse)
def add_announcement_correction(announcement_id: int, payload: gs.AnnouncementCorrectionCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    require(current_user, 'announcements', 'correct')
    item = _get(db, announcement_id, current_user, lock=True)
    _expect(item, payload.expected_version)
    if item.status != 'published': raise HTTPException(409, 'Only a published update can start a correction.')
    db.add(gm.AnnouncementCorrection(announcement_id=item.id, editor_id=current_user.id, correction_summary=payload.correction_summary, reason=payload.reason,
        previous_content={k: getattr(item, k) for k in ('title_en', 'title_fil', 'content_en', 'content_fil')}))
    for field in ('title_en', 'title_fil', 'content_en', 'content_fil'):
        value = getattr(payload, f'updated_{field}')
        if value is not None: setattr(item, field, value)
    _changed(item)
    _audit(db, item, current_user, 'Correction draft prepared', payload.reason)
    db.commit()
    return _format_announcement_response(db, item, user=current_user)


@router.get('/{announcement_id}/suggest-reports', response_model=list[gs.AnnouncementReportAssociationResponse])
def suggest_candidate_reports(announcement_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    item = _get(db, announcement_id, current_user)
    query = scoped_reports(db.query(models.Report), current_user)
    if not item.target_barangays:
        return []  # A citywide update is not evidence of an individual relationship.
    query = query.filter(models.Report.location_barangay.in_(item.target_barangays))
    existing = {a.report_id for a in item.report_associations}
    return [gs.AnnouncementReportAssociationResponse(id=0, announcement_id=item.id, report_id=r.id, ticket_id=r.ticket_id,
        report_title=(r.description or '')[:140], report_category=r.category, report_barangay=r.location_barangay,
        report_status=r.status, association_type='candidate', basis_reason='Same recorded barangay; review the actual work scope before linking.')
        for r in query.order_by(models.Report.created_at.desc()).limit(30).all() if r.id not in existing]


@router.get('/{announcement_id}/report-links', response_model=list[gs.AnnouncementReportAssociationResponse])
def list_announcement_report_links(announcement_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    item = _get(db, announcement_id, current_user)
    return [_format_association(db, a) for a in item.report_associations]


@router.post('/{announcement_id}/report-links', response_model=gs.AnnouncementResponse)
def upsert_announcement_report_link(announcement_id: int, payload: gs.AnnouncementReportAssociationCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    require(current_user, 'announcements', 'edit')
    item = _get(db, announcement_id, current_user, lock=True)
    _expect(item, payload.expected_version)
    _editable(item)
    values = [gs.AnnouncementReportAssociationCreate(report_id=a.report_id, association_type=a.association_type, basis_reason=a.basis_reason) for a in item.report_associations if a.report_id != payload.report_id]
    _save_associations(db, item, values + [payload], current_user)
    _changed(item)
    _audit(db, item, current_user, 'Report link changed', payload.basis_reason or '')
    db.commit()
    return _format_announcement_response(db, item, user=current_user)


@router.patch('/{announcement_id}/report-links/{assoc_id}', response_model=gs.AnnouncementResponse)
def review_announcement_report_link(announcement_id: int, assoc_id: int, payload: gs.AnnouncementReportAssociationUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    item = _get(db, announcement_id, current_user)
    assoc = next((a for a in item.report_associations if a.id == assoc_id), None)
    if not assoc: raise HTTPException(404, 'Report link not found.')
    value = gs.AnnouncementReportAssociationCreate(report_id=assoc.report_id, association_type=payload.association_type,
        basis_reason=payload.basis_reason or payload.revoked_reason, expected_version=payload.expected_version)
    return upsert_announcement_report_link(announcement_id, value, db, current_user)


@router.put('/{announcement_id}/budget-disclosure', response_model=gs.AnnouncementResponse)
def update_announcement_budget_disclosure(announcement_id: int, payload: gs.BudgetDisclosureInput, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    require(current_user, 'announcements', 'edit')
    item = _get(db, announcement_id, current_user, lock=True)
    _expect(item, payload.expected_version)
    _editable(item)
    _save_disclosure(db, item, payload, current_user)
    _changed(item)
    _audit(db, item, current_user, 'Disclosure revised')
    db.commit()
    return _format_announcement_response(db, item, user=current_user)


@router.get('/{announcement_id}/deliveries')
def get_announcement_deliveries(announcement_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    item = _get(db, announcement_id, current_user)
    events = db.query(gm.OutboxEvent).filter(gm.OutboxEvent.event_type.in_(['publication_in_app_notification','publication_related_report_notification']),
        gm.OutboxEvent.payload['announcement_id'].as_integer()==item.id,
        gm.OutboxEvent.payload['version'].as_integer()==item.published_version).all() if item.published_version else []
    from notification_delivery import config
    deliveries=db.query(gm.ResidentNotificationDelivery).filter(gm.ResidentNotificationDelivery.event_id.in_([event.id for event in events])).all() if events else []
    return {'publication_status': item.status, 'in_app': {s: sum(e.status == s for e in events) for s in ('pending', 'delivered', 'failed', 'cancelled','skipped')},
        'email_service':config()['status'],'email':{state:sum(delivery.status==state for delivery in deliveries) for state in ('pending','waiting_configuration','sending','retry','smtp_accepted','failed','uncertain','cancelled')},'phone_push': 'not_configured'}


@router.post('/{announcement_id}/attachments', response_model=gs.AnnouncementResponse)
async def upload_publication_file(announcement_id: int, expected_version: int = Form(...), caption: str = Form(..., min_length=3, max_length=500), public_safe: bool = Form(False), file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    import publication_files as files
    require(current_user, 'announcements', 'edit')
    item = _get(db, announcement_id, current_user, lock=True)
    _expect(item, expected_version)
    _editable(item)
    if not public_safe: raise HTTPException(422, 'Confirm that this document is cleared for public release.')
    if len(caption.strip()) < 3: raise HTTPException(422, 'Add a meaningful document title or description.')
    if len(item.attachments or []) >= 12: raise HTTPException(422, 'An update can contain up to 12 documents.')
    data = await file.read(files.MAX_BYTES + 1)
    name = Path((file.filename or 'document').replace('\\', '/')).name[:180]
    media_type = files.validate(data, name)
    file_id = str(uuid4())
    location = files.path(item.id, file_id)
    location.parent.mkdir(parents=True, exist_ok=True)
    location.write_bytes(data)
    metadata = dict(id=file_id, name=name, caption=caption.strip(), size=len(data), media_type=media_type, url=f'/api/announcements/{item.id}/attachments/{file_id}')
    try:
        item.attachments = [*(item.attachments or []), metadata]
        _changed(item)
        _audit(db, item, current_user, 'Public document attached', name)
        db.commit()
    except Exception:
        location.unlink(missing_ok=True)
        raise
    return _format_announcement_response(db, item, user=current_user)


@router.delete('/{announcement_id}/attachments/{file_id}', response_model=gs.AnnouncementResponse)
def remove_publication_file(announcement_id: int, file_id: str, expected_version: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    require(current_user, 'announcements', 'edit')
    item = _get(db, announcement_id, current_user, lock=True)
    _expect(item, expected_version)
    _editable(item)
    if not any(f['id'] == file_id for f in item.attachments or []): raise HTTPException(404, 'Document not found.')
    # Retain bytes required by a previously released version during correction.
    item.attachments = [f for f in item.attachments if f['id'] != file_id]
    _changed(item)
    _audit(db, item, current_user, 'Public document removed from draft', file_id)
    db.commit()
    return _format_announcement_response(db, item, user=current_user)


@router.get('/{announcement_id}/attachments/{file_id}')
def preview_publication_file(announcement_id: int, file_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    import publication_files as files
    item = _get(db, announcement_id, current_user)
    metadata = next((f for f in item.attachments or [] if f['id'] == file_id), None)
    if not metadata: raise HTTPException(404, 'Document not found.')
    return files.response(item.id, metadata)


@public_router.get('/{announcement_id}/attachments/{file_id}')
def read_publication_file(announcement_id: int, file_id: str, db: Session = Depends(get_db)):
    import publication_files as files
    item = _get(db, announcement_id)
    if not _available(db, item): raise HTTPException(404, 'Document not publicly available.')
    metadata = next((f for f in _public(db, item).get('attachments') or [] if f['id'] == file_id), None)
    if not metadata: raise HTTPException(404, 'Document not publicly available.')
    return files.response(item.id, metadata)


@public_router.get('')
def get_public_announcements(category: str = None, limit: int = Query(20, ge=1, le=50), db: Session = Depends(get_db)):
    _ensure_announcement_tables(db)
    query = db.query(gm.Announcement).filter(gm.Announcement.published_version.isnot(None), gm.Announcement.status.notin_(['withdrawn', 'expired']))
    result = []
    for item in query.order_by(gm.Announcement.published_at.desc()).yield_per(100):
        if not _available(db, item): continue
        public = _public(db, item)
        if not category or public['category'] == category: result.append(public)
        if len(result) >= limit: break
    return result


@public_router.get('/{announcement_id}')
def get_public_announcement(announcement_id: int, db: Session = Depends(get_db)):
    item = _get(db, announcement_id)
    if not _available(db, item): raise HTTPException(404, 'This update is not currently available.')
    return _public(db, item)


@public_router.get('/{announcement_id}/my-report-context')
def get_resident_private_report_context(announcement_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if not isinstance(current_user, models.Resident): raise HTTPException(403, 'Sign in with a resident account to view your report context.')
    item = _get(db, announcement_id)
    if not _available(db, item): raise HTTPException(404, 'This update is not currently available.')
    release = db.query(gm.AnnouncementRevision).filter_by(announcement_id=item.id, version=item.published_version).first()
    released_links = {a['report_id']: a['association_type'] for a in release.snapshot.get('report_associations', []) if a['association_type'] in REVIEWED_LINKS}
    assocs = db.query(gm.AnnouncementReportAssociation).filter_by(announcement_id=item.id).all()
    result = []
    for assoc in assocs:
        report = assoc.report
        if assoc.report_id not in released_links or assoc.association_type not in REVIEWED_LINKS or not report: continue
        if (report.claimed_by_user_id or report.resident_id) != current_user.id: continue
        relation = released_links[assoc.report_id]
        result.append(dict(report_id=report.id, ticket_id=report.ticket_id, status=report.status, association_type=relation,
            label_en='This update describes work linked to your report.' if relation == 'confirmed_coverage' else 'This update may be relevant to your report; coverage has not been confirmed.',
            label_fil='Inilalarawan ng update ang gawaing nakaugnay sa iyong ulat.' if relation == 'confirmed_coverage' else 'Maaaring may kaugnayan ang update sa iyong ulat; hindi pa kumpirmado ang saklaw.'))
    return {'associated_reports': result, 'status_note_en': 'Publication does not change your report status.', 'status_note_fil': 'Hindi binabago ng paglalathala ang status ng iyong ulat.'}
