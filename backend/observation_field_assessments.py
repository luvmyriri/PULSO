"""Private reviewed condition evidence for each reported item/category, not closure."""
from datetime import datetime, timezone
from hashlib import sha256
from typing import Literal
from uuid import UUID

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy import or_

import models
import gov_models as gm
import field_inventory as field
import report_review as review
from asset_evidence_store import MAX_EVIDENCE_BYTES
from command_integrity import validate_key, request_hash, find_receipt, record_receipt
from government_access import require_asset_scope
from government_access import scoped_assets
from learning_dataset_contract import CATEGORY_LABELS
from report_learning import utc
from report_review_router import require_report_access

SCHEMA = 'pulso-observation-field-assessment-v1'
MAX_HISTORY = 1000


class CategoryFinding(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    category: str = Field(min_length=1, max_length=120)
    finding: Literal['defect_observed', 'no_defect_observed', 'not_assessed']


class AssessmentInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    field_observation_id: UUID
    expected_report_version: int = Field(ge=1, strict=True)
    expected_concern_version: int = Field(ge=1, strict=True)
    expected_revision: int = Field(ge=0, strict=True)
    expected_field_sha256: str = Field(pattern=r'^[0-9a-f]{64}$')
    identity_confirmed: bool = Field(strict=True)
    category_findings: list[CategoryFinding] = Field(min_length=1, max_length=len(CATEGORY_LABELS))
    reason: str = Field(min_length=20, max_length=2000)

    @model_validator(mode='after')
    def complete_identity_decision(self):
        if not self.identity_confirmed:
            raise ValueError('Explicit review of the same reported object/problem is required.')
        categories = [item.category for item in self.category_findings]
        if len(set(categories)) != len(categories) or set(categories) - set(CATEGORY_LABELS):
            raise ValueError('Use distinct supported categories.')
        return self


def require_access(user, *, record=False):
    field.require_access(user, 'review' if record else 'view')
    if record and not review.permitted(user, 'review'):
        raise HTTPException(403, 'Report review capability is required.')


def can_view(user):
    try:
        require_access(user)
        return True
    except HTTPException as error:
        if error.status_code != 403:
            raise
        return False


def sources(db, user, report_id, observation_id, before_id=None):
    require_access(user)
    report, item, _ = rows(db, user, report_id, observation_id)
    # A retrieval list is not an asset/problem identity decision.
    visible = scoped_assets(db.query(gm.InfrastructureAsset.asset_id), user)
    source = gm.AssetFieldObservation
    query = db.query(source).join(gm.InfrastructureAsset, gm.InfrastructureAsset.asset_id == source.asset_id).filter(
        source.asset_id.in_(visible), source.observed_at >= report.created_at,
        or_(source.source_report_id == report.id,
            (source.source_report_id.is_(None)) & (gm.InfrastructureAsset.barangay_id == report.barangay_id) & (report.barangay_id is not None)))
    if before_id is not None:
        query = query.filter(source.id < before_id)
    records = query.order_by(source.id.desc()).limit(11).all()
    return dict(items=[dict(id=row.id, asset_id=row.asset_id,
        asset_name=db.get(gm.InfrastructureAsset, row.asset_id).asset_name,
        observed_at=utc(row.observed_at).isoformat(), condition=row.condition,
        review_status=row.review_status, source_relation='recorded_report_reference' if row.source_report_id else 'same_recorded_area_only')
        for row in records[:10]], next_before_id=records[9].id if len(records)>10 else None,
        maximum_results=10, not_exhaustive=True,
        retrieval_policy='Post-report visits linked to this report or unbound visits in its recorded area; identity is not inferred.')


def rows(db, user, report_id, observation_id, *, lock=False):
    query = db.query(models.Report).filter_by(id=report_id)
    report = (query.with_for_update() if lock else query).populate_existing().first()
    if not report:
        raise HTTPException(404, 'Report not found.')
    require_report_access(db, user, report)
    if lock:
        review.require_decision(db, user, report, 'review')
    item = db.query(models.ReportObservation).filter_by(id=observation_id, report_id=report_id).populate_existing().first()
    if not item:
        raise HTTPException(404, 'Observation not found on this report.')
    query = db.query(models.ReportConcern).filter_by(id=item.concern_id)
    concern = (query.with_for_update() if lock else query).populate_existing().one()
    return report, item, concern


def field_rows(db, user, field_id, *, lock=False):
    # Freeze both asset routing context and the independently reviewed source row.
    row = db.get(gm.AssetFieldObservation, field_id)
    if not row:
        raise HTTPException(404, 'Field observation not found.')
    query = db.query(gm.InfrastructureAsset).filter_by(asset_id=row.asset_id)
    asset = (query.with_for_update() if lock else query).populate_existing().one()
    require_asset_scope(db, user, asset)
    if lock:
        row = db.query(gm.AssetFieldObservation).filter_by(id=field_id).with_for_update().populate_existing().one()
    if row.asset_id != asset.asset_id:
        raise HTTPException(409, 'Field context changed; refresh the evidence.')
    if row.source_report_id is not None:
        require_report_access(db, user, db.get(models.Report, row.source_report_id))
    evidence = db.get(gm.AssetInspectionEvidence, row.evidence_reference) if row.evidence_reference else None
    return row, asset, evidence


def field_snapshot(row, asset, evidence):
    return dict(field_observation_id=row.id, asset_id=asset.asset_id, asset_barangay_id=asset.barangay_id,
        source_report_id=row.source_report_id, observed_at=utc(row.observed_at).isoformat(),
        visibility=row.visibility, condition=row.condition, review_status=row.review_status,
        identity_confirmed=row.identity_confirmed, location_reviewed=row.location_reviewed,
        recorded_by_id=row.recorded_by_id, reviewed_by_id=row.reviewed_by_id,
        reviewed_at=utc(row.reviewed_at).isoformat() if row.reviewed_at else None,
        evidence_reference=row.evidence_reference, evidence_asset_id=evidence.asset_id if evidence else None,
        evidence_sha256=evidence.sha256 if evidence else None,
        context_sha256=request_hash(dict(latitude=row.latitude, longitude=row.longitude, accuracy_m=row.accuracy_m,
            location_metadata=row.location_metadata, boundary_status=row.boundary_status,
            notes=row.notes, review_reason=row.review_reason)))


def source_problem(report, item, concern):
    return dict(observation_id=item.id, report_id=report.id, report_version=report.version,
        report_status=report.status, barangay_id=report.barangay_id,
        concern_id=concern.public_id, concern_version=concern.version, categories=sorted(item.categories),
        evidence_sha256=request_hash(dict(categories=item.categories, description=item.description,
            report_photo=report.image_url, location_lat=report.location_lat, location_lng=report.location_lng,
            issue_accuracy_m=report.accuracy_m, location_string=report.location_string,
            location_metadata=report.location_metadata)))


def file_available(evidence, root):
    if not evidence or type(evidence.byte_size) is not int or not 0 < evidence.byte_size <= MAX_EVIDENCE_BYTES:
        return False
    try:
        location = (root / evidence.stored_path).resolve()
        if not location.is_relative_to(root.resolve()):
            return False
        with location.open('rb') as source:
            data = source.read(evidence.byte_size + 1)
        return 0 < len(data) == evidence.byte_size <= MAX_EVIDENCE_BYTES and sha256(data).hexdigest() == evidence.sha256
    except (OSError, ValueError):
        return False


def source_blockers(report, row, asset, evidence, now):
    reasons = []
    if (row.review_status != 'accepted' or not row.identity_confirmed or not row.location_reviewed or row.reviewed_by_id is None
            or not row.reviewed_at or row.reviewed_by_id == row.recorded_by_id):
        reasons.append('independent_accepted_field_review_required')
    if row.visibility != 'visible':
        reasons.append('visible_field_evidence_required')
    if not evidence or evidence.asset_id != asset.asset_id:
        reasons.append('private_evidence_required')
    if report.barangay_id != asset.barangay_id or report.barangay_id is None:
        reasons.append('same_recorded_area_required')
    if row.source_report_id is not None and row.source_report_id != report.id:
        reasons.append('field_source_belongs_to_another_report')
    if (utc(row.observed_at) < utc(report.created_at) or utc(row.observed_at) > now
            or (row.reviewed_at and not utc(row.observed_at) <= utc(row.reviewed_at) <= now)):
        reasons.append('post_report_consistent_field_clock_required')
    return reasons


def scoped_history(db, user, item):
    history = db.query(models.ObservationFieldAssessment).filter_by(observation_id=item.id).order_by(
        models.ObservationFieldAssessment.revision.desc()).limit(MAX_HISTORY + 1).all()
    if len(history) > MAX_HISTORY:
        raise HTTPException(409, 'Assessment history exceeds the bounded review workflow; no partial history returned.')
    for row in history:
        field_rows(db, user, row.field_observation_id)
        for area_id in {row.snapshot['problem']['barangay_id'], row.snapshot['field']['asset_barangay_id']}:
            field.area_for(db, user, area_id)
    return history


def assessment_snapshot(report, item, concern, field_context):
    return dict(schema_version=SCHEMA, identity_confirmed=True,
        problem=source_problem(report, item, concern), field=field_context)


def projection(db, user, row, report, item, concern, root, now, *, evidence_check=file_available):
    source, asset, evidence = field_rows(db, user, row.field_observation_id)
    current = assessment_snapshot(report, item, concern, field_snapshot(source, asset, evidence))
    reasons = source_blockers(report, source, asset, evidence, now)
    if row.snapshot != current:
        reasons.append('recorded_context_changed')
    if not evidence_check(evidence, root):
        reasons.append('private_evidence_missing_or_changed')
    if db.query(models.ObservationFieldAssessment.id).filter(
            models.ObservationFieldAssessment.observation_id == item.id,
            models.ObservationFieldAssessment.revision > row.revision).first():
        reasons.append('superseded_by_later_assessment')
    newer = db.query(gm.AssetFieldObservation.id).filter(gm.AssetFieldObservation.asset_id == source.asset_id,
        gm.AssetFieldObservation.id != source.id, gm.AssetFieldObservation.observed_at >= source.observed_at,
        gm.AssetFieldObservation.observed_at <= now, gm.AssetFieldObservation.review_status == 'accepted').first()
    if newer:
        reasons.append('later_or_same_time_accepted_field_context_requires_review')
    return dict(id=row.id, revision=row.revision, actor_id=row.actor_id, created_at=row.created_at.isoformat(),
        field_observation_id=row.field_observation_id, category_findings=row.category_findings, reason=row.reason,
        snapshot=row.snapshot, current_context=not reasons, current_context_blockers=sorted(set(reasons)),
        interpretation='Reviewer condition findings at the recorded survey time; not repair causation, exact repair time or official report closure.',
        training_release_eligible=False)


def evidence_context(db, user, report_id, observation_id, field_id, root):
    require_access(user)
    report, item, concern = rows(db, user, report_id, observation_id)
    source, asset, evidence = field_rows(db, user, field_id)
    history = scoped_history(db, user, item)
    now = db.execute(select(func.statement_timestamp())).scalar_one()
    snapshot = field_snapshot(source, asset, evidence)
    blockers = source_blockers(report, source, asset, evidence, now)
    if not file_available(evidence, root):
        blockers.append('private_evidence_missing_or_changed')
    try:
        require_access(user, record=True)
        review.require_decision(db, user, report, 'review')
        if user.id == source.recorded_by_id:
            blockers.append('field_recorder_cannot_adjudicate_own_evidence')
    except HTTPException as exc:
        if exc.status_code != 403:
            raise
        blockers.append('record_permission_or_report_ownership_required')
    return dict(schema_version=SCHEMA, as_of=now.isoformat(), problem=source_problem(report, item, concern), field=snapshot,
        expected_field_sha256=request_hash(snapshot), expected_revision=history[0].revision if history else 0,
        can_record=not blockers, record_blockers=sorted(set(blockers)),
        private_evidence_url=f'/api/gov/predictive/inspection-evidence/{evidence.id}' if evidence else None,
        identity_policy='Explicit human comparison of the same object/problem; location/area agreement alone never establishes identity.',
        lifecycle_action='none', training_release_eligible=False)


def history(db, user, report_id, observation_id, root):
    require_access(user)
    report, item, concern = rows(db, user, report_id, observation_id)
    records = scoped_history(db, user, item)
    now = db.execute(select(func.statement_timestamp())).scalar_one()
    can_record = True
    try:
        require_access(user, record=True)
        review.require_decision(db, user, report, 'review')
    except HTTPException as error:
        if error.status_code != 403:
            raise
        can_record = False
    return dict(schema_version=SCHEMA, as_of=now.isoformat(), observation_id=item.id, categories=sorted(item.categories),
        assessment_revision=records[0].revision if records else 0,
        can_record_review=can_record,
        assessments=[projection(db, user, row, report, item, concern, root, now) for row in records[:20]],
        maximum_history_results=20, history_not_exhaustive=len(records)>20,
        lifecycle_action='none', training_release_eligible=False)


def record(db, user, report_id, observation_id, payload, key, root):
    require_access(user, record=True)
    if not validate_key(key):
        raise HTTPException(422, 'An Idempotency-Key is required for a field assessment.')
    report, item, concern = rows(db, user, report_id, observation_id, lock=True)
    source, asset, evidence = field_rows(db, user, str(payload.field_observation_id), lock=True)
    records = scoped_history(db, user, item)
    operation = 'observation_field_assessment'
    digest = request_hash(dict(observation_id=observation_id, **payload.model_dump(mode='json')))
    receipt = find_receipt(db, actor_id=user.id, operation=operation, report_id=report_id, key=key, digest=digest)
    now = db.execute(select(func.statement_timestamp())).scalar_one()
    if receipt:
        saved = db.get(models.ObservationFieldAssessment, receipt.resource_id)
        return dict(assessment=projection(db, user, saved, report, item, concern, root, now), lifecycle_changed=False)
    if len(records) >= MAX_HISTORY:
        raise HTTPException(409, 'Assessment history reached the bounded workflow; no additional record was written.')
    current = field_snapshot(source, asset, evidence)
    if (report.version != payload.expected_report_version or concern.version != payload.expected_concern_version
            or payload.expected_revision != (records[0].revision if records else 0)
            or request_hash(current) != payload.expected_field_sha256):
        raise HTTPException(409, 'Report, concern, field evidence or assessment changed; refresh before deciding.')
    blockers = source_blockers(report, source, asset, evidence, now)
    if blockers or not file_available(evidence, root):
        raise HTTPException(409, 'Use valid independently reviewed post-report field evidence with its private photo and recorded area.')
    if source.recorded_by_id == user.id:
        raise HTTPException(403, 'The field recorder cannot adjudicate their own evidence.')
    findings = sorted((part.model_dump() for part in payload.category_findings), key=lambda part: part['category'])
    if {part['category'] for part in findings} != set(item.categories):
        raise HTTPException(422, 'Assess every category of this reported observation exactly once.')
    known = {part['finding'] for part in findings} - {'not_assessed'}
    if known and (('defect_observed' in known and source.condition != 'defect_observed')
            or ('defect_observed' not in known and source.condition != 'no_defect_observed')):
        raise HTTPException(422, 'Category findings must agree with the reviewed visible field condition; uncertainty stays not_assessed.')
    row = models.ObservationFieldAssessment(observation_id=item.id, field_observation_id=source.id,
        revision=payload.expected_revision+1, category_findings=findings, reason=payload.reason,
        snapshot=assessment_snapshot(report, item, concern, current), actor_id=user.id)
    db.add(row)
    db.flush()
    record_receipt(db, actor_id=user.id, operation=operation, report_id=report_id, key=key, digest=digest,
        resource_id=row.id, result_json=dict(assessment_id=row.id))
    review._history(db, report, 'observation_field_assessment', dict(assessment_id=row.id,
        observation_id=item.id, revision=row.revision, field_observation_id=source.id), user)
    result = dict(assessment=projection(db, user, row, report, item, concern, root, now), lifecycle_changed=False)
    db.commit()
    return result
