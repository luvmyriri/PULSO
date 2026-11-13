"""First-party pair adjudication. Location is retrieval evidence, not identity."""
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

import models
import report_review as review
from command_integrity import validate_key, request_hash, find_receipt, record_receipt
from report_intelligence import distance_m
from report_review_router import require_report_access

METHOD = 'observation-pair-evidence-v1'


def require_reviewer(user):
    if not review.permitted(user, 'review') or user.invitation_pending:
        raise HTTPException(403, 'Active staff report review access is required.')


class PairDecision(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    expected_version: int = Field(ge=1, strict=True)
    expected_target_version: int = Field(ge=1, strict=True)
    expected_concern_version: int = Field(ge=1, strict=True)
    expected_target_concern_version: int = Field(ge=1, strict=True)
    expected_pair_revision: int = Field(ge=0, strict=True)
    relation: Literal['same_problem', 'same_asset_different_problem', 'different_asset', 'uncertain']
    evidence_basis: list[Literal['photos', 'field_visit', 'location', 'report_details']] = Field(min_length=1, max_length=4)
    reason: str = Field(min_length=20, max_length=2000)

    @model_validator(mode='after')
    def identity_needs_observation(self):
        if len(set(self.evidence_basis)) != len(self.evidence_basis):
            raise ValueError('Evidence basis must not repeat.')
        if self.relation != 'uncertain' and not {'photos', 'field_visit'} & set(self.evidence_basis):
            raise ValueError('A location or description alone cannot establish object/problem identity.')
        return self


def pair_rows(db, user, report_id, observation_id, target_id, *, lock=False):
    ids = sorted({observation_id, target_id})
    if len(ids) != 2:
        raise HTTPException(422, 'Compare two distinct observations.')
    items = db.query(models.ReportObservation).filter(models.ReportObservation.id.in_(ids)).all()
    by_id = {item.id: item for item in items}
    if observation_id not in by_id or by_id[observation_id].report_id != report_id or target_id not in by_id:
        raise HTTPException(404, 'Observation pair not found.')
    query = db.query(models.Report).filter(models.Report.id.in_({item.report_id for item in items})).order_by(models.Report.id)
    if lock:
        query = query.with_for_update()
    reports = {row.id: row for row in query.populate_existing().all()}
    for report in reports.values():
        require_report_access(db, user, report)
        if lock:
            review.require_decision(db, user, report, 'review')
    # Ordered report locks serialize membership changes and pair decisions.
    if lock:
        for item in items:
            db.refresh(item)
    concerns = db.query(models.ReportConcern).filter(models.ReportConcern.id.in_({i.concern_id for i in items})).order_by(models.ReportConcern.id)
    if lock:
        concerns = concerns.with_for_update()
    concerns = {row.id: row for row in concerns.populate_existing().all()}
    return by_id[observation_id], by_id[target_id], reports, concerns


def pair_snapshot(source, target, reports, concerns):
    def item_snapshot(item):
        report, concern = reports[item.report_id], concerns[item.concern_id]
        return dict(observation_id=item.id, report_id=report.id, report_version=report.version,
            concern_id=concern.public_id, concern_version=concern.version,
            categories=list(item.categories), status=report.status,
            observation_evidence_sha256=request_hash(dict(categories=item.categories, description=item.description)),
            issue_accuracy_m=report.accuracy_m, location_source=(report.location_metadata or {}).get('source', 'unknown'),
            photo_present=bool(report.image_url))
    a, b = reports[source.report_id], reports[target.report_id]
    points = [a.location_lat, a.location_lng, b.location_lat, b.location_lng]
    distance = distance_m(*points) if all(p is not None for p in points) else None
    left, right = sorted((source, target), key=lambda item: item.id)
    return dict(schema_version=METHOD, left=item_snapshot(left), right=item_snapshot(right),
        distance_m=round(distance, 3) if distance is not None else None,
        shared_categories=sorted(set(source.categories) & set(target.categories)),
        identity_status='not_inferred_from_location', training_release_eligible=False)


def reviews_query(db, source, target):
    left, right = sorted((source.id, target.id))
    return db.query(models.ObservationPairReview).filter_by(left_observation_id=left, right_observation_id=right)


def project_review(row, snapshot):
    return dict(id=row.id, revision=row.revision, relation=row.relation, evidence_basis=row.evidence_basis,
        reason=row.reason, actor_id=row.actor_id, created_at=row.created_at,
        snapshot=row.snapshot, current_evidence=row.snapshot == snapshot,
        label_status='operational_reviewer_judgment', training_release_eligible=False)


def pair_context(db, user, report_id, observation_id, target_id):
    require_reviewer(user)
    source, target, reports, concerns = pair_rows(db, user, report_id, observation_id, target_id)
    snapshot = pair_snapshot(source, target, reports, concerns)
    rows = reviews_query(db, source, target).order_by(models.ObservationPairReview.revision.desc()).limit(20).all()
    can_record = True
    for report in reports.values():
        try:
            review.require_decision(db, user, report, 'review')
        except HTTPException as exc:
            if exc.status_code != 403:
                raise
            can_record = False
    return dict(evidence=snapshot, pair_revision=rows[0].revision if rows else 0,
        can_record_review=can_record, current_user_id=user.id,
        record_block_reason=None if can_record else 'Review ownership of both reports is required. Ask a coordinator to review assignment.',
        source_observation_id=source.id, target_observation_id=target.id,
        reviews=[project_review(row, snapshot) for row in rows], maximum_history_results=20,
        membership_action='none; use the separately authorized association command to group or separate reports')


def record_pair_review(db, user, report_id, observation_id, target_id, payload, key):
    require_reviewer(user)
    if not validate_key(key):
        raise HTTPException(422, 'An Idempotency-Key is required for a pair review.')
    source, target, reports, concerns = pair_rows(db, user, report_id, observation_id, target_id, lock=True)
    operation = 'observation_pair_review'
    digest = request_hash(dict(observation_id=observation_id, target_id=target_id, **payload.model_dump()))
    previous = find_receipt(db, actor_id=user.id, operation=operation, report_id=report_id, key=key, digest=digest)
    if previous:
        result = previous.result_json
        current = pair_snapshot(source, target, reports, concerns)
        return {**result, 'review':{**result['review'], 'current_evidence':result['review']['snapshot'] == current}}
    snapshot = pair_snapshot(source, target, reports, concerns)
    a, b = reports[source.report_id], reports[target.report_id]
    if (a.version != payload.expected_version or b.version != payload.expected_target_version or
            concerns[source.concern_id].version != payload.expected_concern_version or
            concerns[target.concern_id].version != payload.expected_target_concern_version):
        raise HTTPException(409, 'Report or concern evidence changed; refresh both observations before reviewing.')
    latest = reviews_query(db, source, target).order_by(models.ObservationPairReview.revision.desc()).first()
    revision = latest.revision if latest else 0
    if revision != payload.expected_pair_revision:
        raise HTTPException(409, 'Another pair review was recorded; refresh its history before correcting it.')
    if source.concern_id == target.concern_id and payload.relation in {'same_asset_different_problem', 'different_asset'}:
        raise HTTPException(409, 'These observations are grouped together. Review and separate their membership before recording a distinct-problem label.')
    if 'photos' in payload.evidence_basis and not (a.image_url and b.image_url):
        raise HTTPException(422, 'Photo-based review requires recorded photos on both reports.')
    left, right = sorted((source.id, target.id))
    row = models.ObservationPairReview(left_observation_id=left, right_observation_id=right,
        revision=revision+1, relation=payload.relation, evidence_basis=sorted(payload.evidence_basis),
        reason=payload.reason, snapshot=snapshot, actor_id=user.id)
    db.add(row)
    db.flush()
    result = dict(review=project_review(row, snapshot), membership_changed=False)
    # Command receipts are JSON, so use the same explicit timestamp representation as HTTP.
    result['review']['created_at'] = row.created_at.isoformat()
    record_receipt(db, actor_id=user.id, operation=operation, report_id=report_id, key=key,
        digest=digest, resource_id=row.id, result_json=result)
    review._history(db, a, 'observation_pair_review', dict(pair_review_id=row.id,
        observation_ids=[left, right], revision=row.revision, relation=row.relation), user)
    db.commit()
    return result
