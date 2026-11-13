"""PULSO evidence and concern primitives. No synthetic predictions or GPS claims."""
from datetime import datetime, timezone
import hashlib
import json
import math
import hmac
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator,model_serializer

import models
from capture_request_contract import CameraLocationRequest


class DeviceFix(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_m: float | None = Field(default=None, gt=0, le=100000)
    measured_at: datetime | None = None


class LocationEvidence(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    source: Literal['device', 'manual', 'search', 'uploaded_metadata', 'unknown'] = 'unknown'
    device_fix: DeviceFix | None = None
    issue_pin_confirmed: bool = False
    confirmed_at: datetime | None = None
    photo_captured_at: datetime | None = None
    photo_source: Literal['camera', 'upload', 'unknown'] = 'unknown'
    photo_device_fix: DeviceFix | None = None
    photo_location_request: CameraLocationRequest | None = None

    @model_serializer(mode='wrap')
    def serialize_request(self,handler):
        result=handler(self)
        # Preserve pre-extension command hashes and receipts when no trace exists.
        if self.photo_location_request is None:
            result.pop('photo_location_request',None)
        return result

    @model_validator(mode='after')
    def check_times(self):
        times = [self.confirmed_at, self.photo_captured_at]
        if self.device_fix:
            times.append(self.device_fix.measured_at)
        if self.photo_device_fix:
            times.append(self.photo_device_fix.measured_at)
        if self.photo_location_request:
            if self.photo_source!='camera':
                raise ValueError('Camera request provenance requires a camera source.')
            times.extend((self.photo_location_request.started_at,self.photo_location_request.finished_at,
                self.photo_location_request.first_fix_received_at))
        now = datetime.now(timezone.utc).timestamp()
        for value in times:
            if value and (value.tzinfo is None or value.timestamp() > now + 300):
                raise ValueError('Location/capture times must include a timezone and cannot be in the future.')
        if self.source == 'device' and not self.device_fix:
            raise ValueError('Device location requires the original device fix.')
        return self


class ObservationInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    item_key: str = Field(min_length=1, max_length=64, pattern=r'^[A-Za-z0-9_-]+$')
    categories: list[str] = Field(min_length=1, max_length=3)
    description: str = Field(min_length=10, max_length=5000)


def decode_input(category, categories, location_metadata, observation_items, description):
    try:
        labels = json.loads(categories) if categories else [category] if category else []
        if not isinstance(labels, list) or not 1 <= len(labels) <= 3:
            raise ValueError('Choose between one and three categories.')
        if any(not isinstance(c, str) or not 1 <= len(c.strip()) <= 80 or '\x00' in c for c in labels):
            raise ValueError('Categories must be nonempty text up to 80 characters.')
        labels = list(dict.fromkeys(c.strip() for c in labels))
        if category and category.strip() != labels[0]:
            raise ValueError('The primary category must be the first selected category.')
        evidence = LocationEvidence.model_validate(json.loads(location_metadata) if location_metadata else {})
        raw_items = json.loads(observation_items) if observation_items else [dict(item_key='issue-1', categories=labels, description=description)]
        if not isinstance(raw_items, list) or not 1 <= len(raw_items) <= 10:
            raise ValueError('Supply between one and ten observation items.')
        items = [ObservationInput.model_validate(item) for item in raw_items]
        if len({i.item_key for i in items}) != len(items) or any(not set(i.categories) <= set(labels) for i in items):
            raise ValueError('Observation keys must be unique and categories must belong to this report.')
        if set().union(*(set(i.categories) for i in items)) != set(labels):
            raise ValueError('Every selected category must be represented by an observation.')
        return labels, evidence, items
    except (ValueError, TypeError, ValidationError) as exc:
        raise HTTPException(422, 'Invalid report intelligence input: ' + str(exc)) from exc


def validate_point(latitude, longitude, *, evidence=None):
    if (latitude is None) != (longitude is None):
        raise HTTPException(422, 'Provide both latitude and longitude, or neither.')
    if latitude is not None and (not math.isfinite(latitude) or not math.isfinite(longitude) or not -90 <= latitude <= 90 or not -180 <= longitude <= 180):
        raise HTTPException(422, 'Coordinates must be finite and within latitude/longitude bounds.')
    if latitude is None and evidence and evidence.issue_pin_confirmed:
        raise HTTPException(422, 'A confirmed issue pin requires both latitude and longitude. Select its location or leave the pin unconfirmed.')


def issue_accuracy(evidence, latitude, longitude):
    """A corrected issue pin never inherits the device's sensor accuracy."""
    fix = evidence.device_fix
    if evidence.source == 'device' and fix and fix.latitude == latitude and fix.longitude == longitude:
        return fix.accuracy_m
    return None


def location_quality(evidence):
    fix = evidence.device_fix
    if not fix:
        return 'manual_or_unknown'
    if not fix.measured_at:
        return 'fix_time_unknown'
    age = datetime.now(timezone.utc).timestamp() - fix.measured_at.timestamp()
    return 'stale_device_estimate' if age > 120 else 'device_estimate'


def request_digest(payload, image_bytes):
    payload = {**payload, 'image_sha256': hashlib.sha256(image_bytes).hexdigest() if image_bytes else None}
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(',', ':'), default=str).encode()).hexdigest()


def intake_scope_key(user, key):
    import command_integrity
    key = command_integrity.validate_key(key)
    if not key or len(key) < 32:
        raise HTTPException(422, 'Use a random Idempotency-Key of at least 32 characters.')
    principal = f'{type(user).__name__}:{user.id}' if user else 'guest'
    return hashlib.sha256(f'{principal}:{key}'.encode()).hexdigest()


def tracking_receipt(report):
    import auth
    import os
    token = hmac.new(auth.SECRET_KEY.encode(), f'intake-receipt:{report.intake_key_hash}'.encode(), hashlib.sha256).hexdigest()
    report.tracking_token = token
    origin = os.getenv('PULSO_PUBLIC_BASE_URL', 'https://srv1857115.hstgr.cloud').rstrip('/')
    report.tracking_url = f'{origin}/track?id={report.ticket_id}&code={token}'
    return report


def initialize_observations(db, report, items):
    from report_learning import freeze_intake
    freeze_intake(db, report, items)
    concerns=[]
    for item in items:
        concern = models.ReportConcern(anchor_report_id=report.id)
        db.add(concern)
        db.flush()
        db.add(models.ReportObservation(report_id=report.id, concern_id=concern.id, **item.model_dump()))
        concerns.append(concern)
    from concern_checkpoints import capture
    for concern in concerns:
        capture(db,concern,trigger_kind='intake',trigger_report_id=report.id)


def distance_m(lat1, lng1, lat2, lng2):
    a, b = math.radians(lat1), math.radians(lat2)
    h = math.sin((b-a)/2)**2 + math.cos(a)*math.cos(b)*math.sin(math.radians(lng2-lng1)/2)**2
    return 6371008.8 * 2 * math.asin(min(1, math.sqrt(h)))


def candidate_reports(db, report, user, radius=100):
    """Bounded scoped retrieval. Scores here are evidence, never match probabilities."""
    from government_access import scoped_reports, can
    from gov_router import FIELD_SELF_ROLES
    from gov_models import WorkOrder
    from sqlalchemy import func, or_, cast
    from sqlalchemy.dialects.postgresql import JSONB
    import report_review
    if report.location_lat is None or report.location_lng is None:
        return []
    # Include uncertainty in retrieval, never in an automatic identity decision.
    radius = min(500, max(radius, 2 * (report.accuracy_m or 0)))
    # Look across the full bounded region so a less precise *target* is not lost.
    delta_lat = 500 / 110000
    delta_lng = 500 / (110000 * max(math.cos(math.radians(report.location_lat)), .01))
    labels = report.categories or [report.category]
    category_filter = or_(models.Report.category.in_(labels),
        *(cast(models.Report.categories, JSONB).contains([label]) for label in labels))
    spatial_distance = func.ST_DistanceSphere(
        func.ST_SetSRID(func.ST_MakePoint(report.location_lng, report.location_lat), 4326),
        func.ST_SetSRID(func.ST_MakePoint(models.Report.location_lng, models.Report.location_lat), 4326))
    query = scoped_reports(db.query(models.Report), user).filter(
        models.Report.id != report.id,
        models.Report.status.notin_(report_review.CLOSED), category_filter,
        models.Report.location_lat.between(report.location_lat-delta_lat, report.location_lat+delta_lat),
        models.Report.location_lng.between(report.location_lng-delta_lng, report.location_lng+delta_lng),
        spatial_distance <= func.least(500, func.greatest(radius,
            2 * (func.coalesce(models.Report.accuracy_m, 0) + (report.accuracy_m or 0)))),
    )
    owned_work = db.query(WorkOrder.report_id).filter_by(assigned_to_id=user.id)
    if not can(user, 'reports'):
        query = query.filter(or_(models.Report.review_assigned_to_id == user.id, models.Report.id.in_(owned_work)))
    if user.role in FIELD_SELF_ROLES:
        query = query.filter(models.Report.id.in_(owned_work))
    query = query.order_by(spatial_distance, models.Report.id).limit(201)
    results = []
    for other in query.all():
        from report_review_router import require_report_access
        try:
            require_report_access(db, user, other)
        except HTTPException as exc:
            if exc.status_code != 403:
                raise
            continue
        distance = distance_m(report.location_lat, report.location_lng, other.location_lat, other.location_lng)
        shared = sorted(set(report.categories or [report.category]) & set(other.categories or [other.category]))
        candidate_radius = min(500, max(radius, 2 * ((report.accuracy_m or 0) + (other.accuracy_m or 0))))
        if distance <= candidate_radius and shared:
            results.append(dict(report_id=other.id, ticket_id=other.ticket_id, distance_m=round(distance, 1),
                                shared_categories=shared, retrieval_radius_m=candidate_radius,
                                source_issue_accuracy_m=report.accuracy_m, target_issue_accuracy_m=other.accuracy_m,
                                decision='review_required', reason='Nearby evidence with overlapping categories; object identity is not established.'))
    return sorted(results, key=lambda r: (r['distance_m'], r['report_id']))[:50]


def resolution_estimate(db, report):
    """No manufactured dates. Until an evaluated model is released, abstain."""
    return dict(status='insufficient_validated_history', predicted_days=None,
                target='verified_concern_resolution',
                reason='Completed concern outcomes and a validated estimation model are required.',
                as_of=datetime.now(timezone.utc).isoformat())


def report_context(db, report):
    items = db.query(models.ReportObservation).filter_by(report_id=report.id).order_by(models.ReportObservation.id).all()
    return dict(categories=report.categories or [report.category], location_metadata=report.location_metadata or {},
                observations=[dict(id=i.id, item_key=i.item_key, categories=i.categories, description=i.description,
                                   concern_id=i.concern.public_id, concern_version=i.concern.version,
                                   association_status=i.association_status,
                                   contributing_report_count=db.query(models.ReportObservation.report_id).filter_by(concern_id=i.concern_id).distinct().count()) for i in items],
                resolution_estimate=resolution_estimate(db, report))
