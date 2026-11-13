"""First-party field collection. Coordinates and condition begin as claims."""
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Literal
from uuid import UUID

from fastapi import HTTPException
from geoalchemy2.elements import WKTElement
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func

import models
import gov_models as gm
from command_integrity import request_hash, validate_key
from government_access import can, require_scope
from report_intelligence import LocationEvidence, issue_accuracy


class FieldObservationInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True, allow_inf_nan=False)
    observed_at: datetime
    latitude: float = Field(ge=4, le=22)
    longitude: float = Field(ge=116, le=127)
    location_metadata: LocationEvidence
    visibility: Literal['visible', 'not_visible', 'unsafe', 'missing']
    condition: Literal['defect_observed', 'no_defect_observed', 'not_assessed']
    notes: str = Field(min_length=20, max_length=4000)
    evidence_reference: UUID | None = None
    source_report_id: int | None = Field(default=None, gt=0, strict=True)

    @model_validator(mode='after')
    def validate_observation(self):
        if self.observed_at.tzinfo is None or self.observed_at > datetime.now(timezone.utc) + timedelta(minutes=5):
            raise ValueError('Observation time must include a timezone and cannot be in the future.')
        if self.visibility != 'visible' and self.condition != 'not_assessed':
            raise ValueError('An unobserved site must be recorded as not_assessed, never a negative finding.')
        return self


class FieldCandidateInput(FieldObservationInput):
    asset_name: str = Field(min_length=3, max_length=160)
    category: Literal['Road', 'Bridge', 'Drainage', 'Building', 'Light']
    barangay_id: int = Field(gt=0, strict=True)


class FieldReviewInput(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    decision: Literal['accepted', 'rejected']
    identity_confirmed: bool = Field(default=False, strict=True)
    location_reviewed: bool = Field(default=False, strict=True)
    reason: str = Field(min_length=20, max_length=2000)

    @model_validator(mode='after')
    def rejection_cannot_verify(self):
        if self.decision == 'rejected' and (self.identity_confirmed or self.location_reviewed):
            raise ValueError('A rejected observation cannot establish identity or location review.')
        return self


def require_access(user, action='view'):
    if (not isinstance(user, models.Official) or not user.is_active or user.is_suspended or user.invitation_pending
            or not can(user, 'maintenance', 'view')):
        raise HTTPException(403, 'Active staff maintenance access is required.')
    if action in {'record', 'review'} and not can(user, 'verification', 'view'):
        raise HTTPException(403, 'Field verification capability is required.')
    if action == 'review' and not can(user, 'maintenance', 'create_work_order'):
        raise HTTPException(403, 'Independent engineering review capability is required.')


def area_for(db, user, area_id):
    area = db.get(models.Barangay, area_id)
    if not area or not area.district_id:
        raise HTTPException(422, 'Choose an existing barangay with a recorded district.')
    require_scope(user, area)
    return area


def checked_location(db, area, payload):
    point = WKTElement(f'POINT({payload.longitude} {payload.latitude})', srid=4326)
    if area.geom is None:
        return point, 'boundary_unavailable'
    if not db.query(func.ST_Covers(area.geom, point)).scalar():
        raise HTTPException(422, 'The proposed location falls outside the recorded barangay boundary. Check the pin and barangay.')
    return point, 'within_recorded_boundary'


def checked_sources(db, user, asset_id, payload, area_id):
    if payload.source_report_id:
        from report_review_router import require_report_access
        report = db.get(models.Report, payload.source_report_id)
        if not report:
            raise HTTPException(404, 'Source report not found.')
        require_report_access(db, user, report)
        if report.barangay_id != area_id:
            raise HTTPException(422, 'The source report must have the same recorded barangay as the candidate.')
    if payload.evidence_reference:
        evidence = db.query(gm.AssetInspectionEvidence).filter_by(id=str(payload.evidence_reference)).with_for_update().first()
        if not evidence or evidence.asset_id != asset_id:
            raise HTTPException(422, 'Choose stored private evidence for this asset.')
        if db.query(gm.AssetFieldObservation.id).filter_by(evidence_reference=evidence.id).first():
            raise HTTPException(409, 'This photo already supports a field observation. Capture fresh evidence for a revisit.')


def command_scope(user, operation, asset_id, key):
    if not validate_key(key):
        raise HTTPException(422, 'An Idempotency-Key is required for field collection.')
    scope = f'field-inventory:{user.id}:{operation}:{asset_id or "new"}:{key}'
    return sha256(scope.encode()).hexdigest()


def command(user, operation, asset_id, key, payload):
    return command_scope(user,operation,asset_id,key), request_hash(payload.model_dump(mode='json'))


def action_allowed(user, action):
    try:
        require_access(user,action)
        return True
    except HTTPException as exc:
        if exc.status_code != 403:
            raise
        return False


def prior(db, command_hash, payload_hash):
    row = db.query(gm.AssetFieldObservation).filter_by(command_hash=command_hash).first()
    if row and row.payload_hash != payload_hash:
        raise HTTPException(409, 'This field operation key was already used with different input.')
    return row


def make_observation(db, user, asset, payload, command_hash, payload_hash, row_id):
    area = area_for(db, user, asset.barangay_id)
    _, boundary = checked_location(db, area, payload)
    checked_sources(db, user, asset.asset_id, payload, area.id)
    row = gm.AssetFieldObservation(id=row_id, asset_id=asset.asset_id, command_hash=command_hash, payload_hash=payload_hash,
        observed_at=payload.observed_at, visibility=payload.visibility, condition=payload.condition,
        latitude=payload.latitude, longitude=payload.longitude,
        accuracy_m=issue_accuracy(payload.location_metadata, payload.latitude, payload.longitude),
        location_metadata=payload.location_metadata.model_dump(mode='json'), boundary_status=boundary,
        notes=payload.notes, evidence_reference=str(payload.evidence_reference) if payload.evidence_reference else None,
        source_report_id=payload.source_report_id, recorded_by_id=user.id,
        review_status='pending', identity_confirmed=False, location_reviewed=False)
    db.add(row)
    db.add(gm.AuditLog(trigger_type='field_inventory', actor_id=user.id, actor_role=user.role,
        action='First-party field observation recorded', details=f'asset_id={asset.asset_id}; observation_id={row.id}; pending review'))
    return row


def project_observation(row):
    result = {name: getattr(row, name) for name in (
        'id', 'asset_id', 'source_report_id', 'observed_at', 'visibility', 'condition', 'latitude', 'longitude',
        'accuracy_m', 'location_metadata', 'boundary_status', 'notes', 'evidence_reference', 'recorded_by_id',
        'recorded_at', 'review_status', 'identity_confirmed', 'location_reviewed', 'reviewed_by_id', 'reviewed_at', 'review_reason')}
    evidence = LocationEvidence.model_validate(row.location_metadata)
    fix = evidence.device_fix
    offset = None
    if fix and fix.measured_at:
        observed = row.observed_at.replace(tzinfo=timezone.utc) if row.observed_at.tzinfo is None else row.observed_at
        offset = abs((observed - fix.measured_at).total_seconds())
    result['location_quality'] = dict(
        fix_time_status='not_recorded' if not fix else 'time_unknown' if offset is None else 'near_observation_time' if offset <= 120 else 'time_mismatch',
        fix_time_offset_seconds=offset, issue_position_status='reviewed_proposal' if row.location_reviewed else 'unreviewed_proposal',
        limitation='Device accuracy is an estimate. A reviewed pin is not an independently measured exact object position.')
    return result


def project_asset(asset):
    return dict(asset_id=asset.asset_id, asset_name=asset.asset_name, category=asset.category,
        barangay_id=asset.barangay_id, registry_status=asset.registry_status, proposed_geometry=asset.gps_coordinates,
        maintenance_authority=asset.maintenance_authority, condition_score=asset.condition_score,
        source_reference=asset.source_reference, model_label_status='not_exported_from_field_observations')
