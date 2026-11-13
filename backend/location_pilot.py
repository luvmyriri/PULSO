"""Offline ordinary-phone location audit. Input claims never verify a location."""
from collections import Counter, defaultdict
from datetime import datetime, timezone
from hashlib import sha256
import json
from math import ceil
from statistics import median
from typing import Annotated, Literal

from geographiclib.geodesic import Geodesic
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints, model_validator
from capture_request_contract import CameraLocationRequest

SCHEMA = 'pulso-location-pilot-v1'
Identifier = Annotated[str, StringConstraints(pattern=r'^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$')]


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False, str_strip_whitespace=True)


class Point(Input):
    latitude: float = Field(ge=-90, le=90, strict=True)
    longitude: float = Field(ge=-180, le=180, strict=True)


class Fix(Point):
    accuracy_m: float | None = Field(default=None, gt=0, le=100000, strict=True)
    measured_at: AwareDatetime | None = None


class Evidence(Input):
    # Matches the persisted PULSO provenance fields, without loading the app/DB.
    source: Literal['device', 'manual', 'search', 'uploaded_metadata', 'unknown'] = 'unknown'
    device_fix: Fix | None = None
    issue_pin_confirmed: bool = Field(default=False, strict=True)
    confirmed_at: AwareDatetime | None = None
    photo_captured_at: AwareDatetime | None = None
    photo_source: Literal['camera', 'upload', 'unknown'] = 'unknown'
    photo_device_fix: Fix | None = None
    photo_location_request: CameraLocationRequest | None = None
    # The report API persists this advisory label; the audit recomputes timing.
    quality: Literal['manual_or_unknown', 'fix_time_unknown', 'stale_device_estimate', 'device_estimate'] | None = None

    @model_validator(mode='after')
    def request_source(self):
        if self.photo_location_request and self.photo_source!='camera':
            raise ValueError('Camera request provenance requires a camera source.')
        return self


class Reference(Point):
    reference_id: Identifier
    role: Literal['device_station', 'issue_target']
    method: Literal['surveyed_control', 'independent_measurement', 'map_pin', 'same_phone', 'unknown']
    measured_at: AwareDatetime
    uncertainty_m: float | None = Field(default=None, gt=0, strict=True)
    uncertainty_basis: Literal['documented_bound', 'estimate', 'unknown'] = 'unknown'
    independent: bool = Field(default=False, strict=True)
    evidence_key: Identifier | None = None
    reviewed_by: Identifier | None = None
    object_id: Identifier | None = None


class Policy(Input):
    # Working pilot thresholds, explicitly supplied; never product defaults.
    horizontal_tolerance_m: float = Field(gt=0, strict=True)
    maximum_reference_uncertainty_m: float = Field(gt=0, strict=True)
    maximum_fix_age_s: float = Field(ge=0, strict=True)


class Trial(Input):
    trial_id: Identifier
    session_id: Identifier
    device_id: Identifier
    environment: Literal['open_sky', 'beside_buildings', 'across_road', 'indoors', 'other']
    observed_at: AwareDatetime
    source_record_key: Identifier | None = None
    acquisition_status: Literal['success', 'denied', 'timeout', 'unavailable', 'unsupported', 'cancelled', 'not_requested', 'unknown']
    request_started_at: AwareDatetime | None = None
    request_finished_at: AwareDatetime | None = None
    request_first_fix_received_at: AwareDatetime | None = None
    stationary_since: AwareDatetime | None = None
    station_reference_id: Identifier | None = None
    target_reference_id: Identifier | None = None
    issue_point: Point | None = None
    location_metadata: Evidence = Field(default_factory=Evidence)
    selected_object_id: Identifier | None = None
    identity_reviewed_by: Identifier | None = None

    @model_validator(mode='after')
    def chronology(self):
        if self.request_started_at and self.request_finished_at and self.request_finished_at < self.request_started_at:
            raise ValueError('Request completion precedes its start.')
        if self.request_first_fix_received_at and (not self.request_started_at or not self.request_finished_at or
                not self.request_started_at<=self.request_first_fix_received_at<=self.request_finished_at):
            raise ValueError('First delivery needs an ordered request interval.')
        if self.stationary_since and self.stationary_since > self.observed_at:
            raise ValueError('Stationary interval ends before it begins.')
        return self


class Pilot(Input):
    schema_version: Literal['pulso-location-pilot-v1'] = SCHEMA
    pilot_id: Identifier
    data_origin: Literal['field_collected', 'synthetic', 'unattested'] = 'unattested'
    policy: Policy | None = None
    references: list[Reference] = Field(default_factory=list, max_length=2000)
    trials: list[Trial] = Field(default_factory=list, max_length=10000)

    @model_validator(mode='after')
    def identities(self):
        references = {row.reference_id: row for row in self.references}
        if len(references) != len(self.references) or len({row.trial_id for row in self.trials}) != len(self.trials):
            raise ValueError('Reference and trial identifiers must be unique.')
        source_keys = [row.source_record_key for row in self.trials if row.source_record_key]
        if len(source_keys) != len(set(source_keys)):
            raise ValueError('A saved record cannot count as more than one trial.')
        for row in self.trials:
            for key, role in ((row.station_reference_id, 'device_station'), (row.target_reference_id, 'issue_target')):
                if key and (key not in references or references[key].role != role):
                    raise ValueError('Reference is missing or has the wrong role.')
        return self


def trial_from_record(record, *, kind, trial_id, session_id, device_id, environment, observed_at):
    """Copy recorded coordinates/provenance only; no inference from a map or image."""
    if kind not in {'report', 'field_observation'} or not isinstance(record, dict):
        raise ValueError('Unsupported record.')
    key = 'report' if kind == 'report' else 'observation'
    record = record.get(key, record)
    if not isinstance(record, dict) or 'location_metadata' not in record:
        raise ValueError('Missing persisted provenance.')
    record_id = record.get('id')
    if type(record_id) not in (str, int) or not str(record_id) or (type(record_id) is int and record_id <= 0):
        raise ValueError('Missing stable record ID.')
    lat_key, lng_key = ('location_lat', 'location_lng') if kind == 'report' else ('latitude', 'longitude')
    if lat_key not in record or lng_key not in record:
        raise ValueError('Unsupported location fields.')
    lat, lng = record[lat_key], record[lng_key]
    if (lat is None) != (lng is None):
        raise ValueError('Incomplete point.')
    point = Point(latitude=lat, longitude=lng) if lat is not None else None
    evidence=Evidence.model_validate(record['location_metadata'] or {})
    request=evidence.photo_location_request
    return Trial(trial_id=trial_id, session_id=session_id, device_id=device_id, environment=environment,
        observed_at=observed_at, source_record_key=f'{kind}:{record_id}', acquisition_status=request.outcome if request else 'unknown',
        request_started_at=request.started_at if request else None,request_finished_at=request.finished_at if request else None,
        request_first_fix_received_at=request.first_fix_received_at if request else None,
        issue_point=point, location_metadata=evidence)


def distance_m(a, b):
    return Geodesic.WGS84.Inverse(a.latitude, a.longitude, b.latitude, b.longitude)['s12']


def reference_reasons(reference, policy, as_of):
    if reference is None:
        return ['reference_missing']
    reasons = []
    if not reference.independent or reference.method not in {'surveyed_control', 'independent_measurement'}:
        reasons.append('reference_not_independent')
    if not reference.evidence_key or not reference.reviewed_by:
        reasons.append('reference_evidence_or_review_missing')
    if reference.uncertainty_m is None or reference.uncertainty_basis != 'documented_bound':
        reasons.append('reference_bound_not_documented')
    if reference.measured_at > as_of:
        reasons.append('reference_time_in_future')
    if policy and reference.uncertainty_m and reference.uncertainty_m > policy.maximum_reference_uncertainty_m:
        reasons.append('reference_bound_exceeds_working_policy')
    return reasons


def measure(point, reference, policy, as_of, *, exclusions=(), radius=None):
    reasons = reference_reasons(reference, policy, as_of) + list(exclusions)
    if point is None:
        reasons.append('point_missing')
    distance = distance_m(point, reference) if point is not None and reference is not None else None
    qualified = not reasons
    lower = max(0.0, distance-reference.uncertainty_m) if qualified else None
    upper = distance+reference.uncertainty_m if qualified else None
    threshold = 'unqualified'
    if qualified:
        threshold = 'policy_unset' if policy is None else ('within' if upper <= policy.horizontal_tolerance_m
            else 'outside' if lower > policy.horizontal_tolerance_m else 'indeterminate')
    coverage = 'unavailable'
    if qualified and radius is not None:
        coverage = 'inside' if upper <= radius else 'outside' if lower > radius else 'indeterminate'
    return dict(distance_to_reference_m=distance, qualified=qualified, reasons=reasons,
        error_lower_m=lower, error_upper_m=upper, working_tolerance=threshold,
        reported_radius_coverage=coverage)


def fix_key(fix):
    return (fix.latitude, fix.longitude, fix.measured_at) if fix and fix.measured_at else None


def fix_exclusions(fix, trial, policy, reused, *, check_age=True):
    if not fix:
        return ['fix_missing']
    reasons = []
    if not fix.measured_at:
        reasons.append('fix_time_missing')
    elif not trial.stationary_since or not trial.stationary_since <= fix.measured_at <= trial.observed_at:
        reasons.append('fix_outside_documented_stationary_interval')
    elif check_age and policy and (trial.observed_at-fix.measured_at).total_seconds() > policy.maximum_fix_age_s:
        reasons.append('fix_stale_at_observation')
    if reused:
        reasons.append('reused_fix')
    return reasons


def photo_timing(evidence, policy):
    fix = evidence.photo_device_fix
    if evidence.photo_source != 'camera':
        return dict(state='not_camera_capture', fix_offset_s=None)
    if not evidence.photo_captured_at or not fix or not fix.measured_at:
        return dict(state='capture_or_fix_time_missing', fix_offset_s=None)
    offset = (fix.measured_at-evidence.photo_captured_at).total_seconds()
    state = ('post_capture_fix' if offset > 0 else 'policy_unset' if policy is None else
             'stale_at_capture' if -offset > policy.maximum_fix_age_s else 'fresh_pre_capture_fix')
    return dict(state=state, fix_offset_s=offset)


def distribution(values):
    values = sorted(value for value in values if value is not None)
    return dict(count=len(values), median=median(values) if values else None,
        p95_nearest_rank=values[ceil(.95*len(values))-1] if values else None,
        maximum=max(values) if values else None)


def summary(rows):
    errors = [row['issue']['distance_to_reference_m'] for row in rows if row['issue']['qualified']]
    sessions = defaultdict(list)
    for row in rows:
        if row['issue']['qualified']:
            sessions[row['session_id']].append(row['issue']['distance_to_reference_m'])
    identity = Counter(row['object_identity'] for row in rows)
    assessed = identity['correct'] + identity['wrong']
    return dict(trial_count=len(rows), device_count=len({row['device_id'] for row in rows}),
        session_count=len({row['session_id'] for row in rows}),
        acquisition_counts=dict(sorted(Counter(row['acquisition_status'] for row in rows).items())),
        acquisition_latency_s=distribution(row['acquisition_latency_s'] for row in rows),
        successful_request_latency_s=distribution(row['acquisition_latency_s'] for row in rows if row['acquisition_status']=='success'),
        first_fix_delivery_latency_s=distribution(row['first_fix_delivery_latency_s'] for row in rows),
        qualified_issue_error_m=distribution(errors),
        session_median_issue_error_m=distribution(median(values) for values in sessions.values()),
        qualified_device_error_m=distribution(row['device']['distance_to_reference_m'] for row in rows if row['device']['qualified']),
        qualified_photo_device_error_m=distribution(row['photo_device']['distance_to_reference_m'] for row in rows if row['photo_device']['qualified']),
        photo_fix_timing_counts=dict(sorted(Counter(row['photo_timing']['state'] for row in rows).items())),
        issue_working_tolerance_counts=dict(sorted(Counter(row['issue']['working_tolerance'] for row in rows).items())),
        device_reported_radius_counts=dict(sorted(Counter(row['device']['reported_radius_coverage'] for row in rows).items())),
        device_exclusion_counts=dict(sorted(Counter(reason for row in rows for reason in row['device']['reasons']).items())),
        issue_exclusion_counts=dict(sorted(Counter(reason for row in rows for reason in row['issue']['reasons']).items())),
        identity_counts=dict(correct=identity['correct'], wrong=identity['wrong'], unknown=identity['unknown']),
        wrong_object_rate_among_reviewed=identity['wrong']/assessed if assessed else None,
        manual_issue_point_count=sum(row['issue_source']=='manual' for row in rows),
        reused_device_fix_count=sum('reused_fix' in row['device']['reasons'] for row in rows),
        reused_photo_fix_count=sum('reused_fix' in row['photo_device']['reasons'] for row in rows),
        interpretation='Submitted trial summaries only. Repeated sessions/fixes are not independent validation samples; no population confidence or release claim.')


def audit(pilot, as_of=None):
    as_of = as_of or datetime.now(timezone.utc)
    references = {row.reference_id: row for row in pilot.references}
    seen_fixes, seen_photo_fixes, rows = set(), set(), []
    for trial in sorted(pilot.trials, key=lambda row: (row.observed_at, row.trial_id)):
        evidence = trial.location_metadata
        times = [trial.observed_at, trial.request_started_at, trial.request_finished_at, trial.request_first_fix_received_at,evidence.confirmed_at,
            evidence.photo_captured_at, evidence.device_fix.measured_at if evidence.device_fix else None,
            evidence.photo_device_fix.measured_at if evidence.photo_device_fix else None]
        if evidence.photo_location_request:
            request=evidence.photo_location_request
            times.extend((request.started_at,request.finished_at,request.first_fix_received_at))
        clock_reasons = ['future_timestamp'] if any(value and value > as_of for value in times) else []
        device_key = fix_key(evidence.device_fix)
        # Include device ID: two distinct phones may legitimately return identical fixes.
        key = (trial.device_id, device_key) if device_key else None
        device = measure(evidence.device_fix, references.get(trial.station_reference_id), pilot.policy, as_of,
            exclusions=clock_reasons + fix_exclusions(evidence.device_fix, trial, pilot.policy, key in seen_fixes),
            radius=evidence.device_fix.accuracy_m if evidence.device_fix else None)
        if key:
            seen_fixes.add(key)
        timing = photo_timing(evidence, pilot.policy)
        photo_key = fix_key(evidence.photo_device_fix)
        photo_key = (trial.device_id, photo_key) if photo_key else None
        photo = measure(evidence.photo_device_fix, references.get(trial.station_reference_id), pilot.policy, as_of,
            exclusions=clock_reasons + fix_exclusions(evidence.photo_device_fix, trial, pilot.policy,
                photo_key in seen_photo_fixes, check_age=False) +
                ([] if timing['state']=='fresh_pre_capture_fix' else ['photo_fix_not_fresh_at_capture']),
            radius=evidence.photo_device_fix.accuracy_m if evidence.photo_device_fix else None)
        if photo_key:
            seen_photo_fixes.add(photo_key)
        target = references.get(trial.target_reference_id)
        issue = measure(trial.issue_point, target, pilot.policy, as_of, exclusions=clock_reasons)
        identity = ('unknown' if not trial.identity_reviewed_by or not target or not target.object_id or not trial.selected_object_id
            else 'correct' if target.object_id == trial.selected_object_id else 'wrong')
        latency = ((trial.request_finished_at-trial.request_started_at).total_seconds()
            if trial.request_started_at and trial.request_finished_at and not clock_reasons else None)
        first_latency = ((trial.request_first_fix_received_at-trial.request_started_at).total_seconds()
            if trial.request_started_at and trial.request_first_fix_received_at and not clock_reasons else None)
        unchanged_device_point = (evidence.source == 'device' and evidence.device_fix and trial.issue_point
            and trial.issue_point.latitude == evidence.device_fix.latitude and trial.issue_point.longitude == evidence.device_fix.longitude)
        rows.append(dict(trial_id=trial.trial_id, device_id=trial.device_id, session_id=trial.session_id,
            environment=trial.environment, source_record_key=trial.source_record_key,
            acquisition_status=trial.acquisition_status, acquisition_latency_s=latency,first_fix_delivery_latency_s=first_latency,
            issue_source=evidence.source, issue_pin_confirmed=evidence.issue_pin_confirmed,
            issue_accuracy_m=evidence.device_fix.accuracy_m if unchanged_device_point else None,
            device_reported_accuracy_m=evidence.device_fix.accuracy_m if evidence.device_fix else None,
            object_identity=identity, clock_reasons=clock_reasons, device=device, photo_device=photo,
            photo_timing=timing, issue=issue))
    report = dict(schema_version=SCHEMA+'-audit', pilot_id=pilot.pilot_id, data_origin=pilot.data_origin,
        as_of=as_of.isoformat(), input_sha256=sha256(pilot.model_dump_json().encode()).hexdigest(),
        distance_method='GeographicLib WGS84 inverse geodesic; horizontal surface distance in meters.',
        working_policy=pilot.policy.model_dump() if pilot.policy else None,
        automatic_location_verification_allowed=False, automatic_matching_release_allowed=False,
        limitations=['Reference independence, uncertainty bounds and identity reviews are supplied claims, not verified by this script.',
            'Bounds are conditional on the supplied reference bound being valid; they are not confidence intervals.',
            'No phone coordinates are averaged or corrected. A phone fix does not locate the photographed object.',
            'No numeric location tolerance is approved by this audit. Field provenance and thresholds need review.'],
        summary=summary(rows), by_device={}, by_environment={}, rows=rows)
    for field, output in (('device_id','by_device'), ('environment','by_environment')):
        groups = defaultdict(list)
        for row in rows:
            groups[row[field]].append(row)
        report[output] = {key: summary(groups[key]) for key in sorted(groups)}
    report['audit_sha256'] = sha256(json.dumps(report, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()).hexdigest()
    return report
