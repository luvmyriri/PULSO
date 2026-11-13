"""Authorized, bounded current-membership exports; no model or data backfill."""
import math
from collections import defaultdict

from fastapi import HTTPException
from sqlalchemy import func, select

import models
import gov_models as gm
import report_learning as learning
from government_access import can, scoped_assets, scoped_reports
from learning_dataset_contract import INTAKE_SCHEMA, iso, project_features, seal

MAX_CANDIDATES = 10000


def dataset_row(db, case, as_of):
    intake, outcome = case['intake'], case['outcome']
    reasons, features = [], None
    if intake['status'] != 'recorded_at_intake':
        reasons.append('missing_intake_snapshot')
    elif intake['schema_version'] != INTAKE_SCHEMA:
        reasons.append('unsupported_intake_schema')
    else:
        try:
            features = project_features(intake['features'])
        except (ValueError, TypeError):
            reasons.append('invalid_intake_features')
    available = learning.utc(intake['available_at'])
    received = learning.utc(case['first_received_at'])
    if not available:
        reasons.append('unknown_feature_availability')
    elif not received or available > as_of or received > as_of or available < received:
        reasons.append('invalid_intake_chronology')
    if outcome['verified_at'] and available and available > learning.utc(outcome['verified_at']):
        reasons.append('features_available_after_outcome')
    snapshots = db.query(models.ReportLearningSnapshot).filter(
        models.ReportLearningSnapshot.report_id.in_(case['report_ids'])).all()
    areas = set()
    for snapshot in snapshots:
        raw = snapshot.features
        area = raw.get('reported_barangay_id') if isinstance(raw, dict) else None
        if type(area) is int and area > 0:
            areas.add(area)
    member_times = [learning.utc(snapshot.available_at) for snapshot in snapshots if snapshot.available_at]
    missing_members = len(snapshots) != len(case['report_ids']) or len(member_times) != len(snapshots)
    if missing_members:
        reasons.append('member_intake_provenance_incomplete')
    elif any(value > as_of for value in member_times):
        reasons.append('member_intake_availability_in_future')
    elif any(learning.utc(snapshot.available_at) < learning.utc(snapshot.received_at) for snapshot in snapshots):
        reasons.append('invalid_member_intake_chronology')
    elif outcome['verified_at'] and any(value > learning.utc(outcome['verified_at']) for value in member_times):
        reasons.append('member_features_available_after_outcome')
    elapsed = outcome['elapsed_days']
    if elapsed is not None and (not math.isfinite(elapsed) or elapsed < 0):
        reasons.append('invalid_elapsed_duration')
        elapsed = None
    valid = not reasons and elapsed is not None
    return dict(concern_id=case['concern_id'], concern_version=case['concern_version'],
        membership_fingerprint=case['membership_fingerprint'], first_received_at=iso(received),
        feature_availability=dict(earliest_report_snapshot_at=iso(available),
            all_member_snapshots_at=iso(max(member_times)) if member_times and not missing_members else None,
            concern_membership_available_at=None),
        features=features,
        lineage=dict(report_ids=case['report_ids'], final_report_count=case['report_count'],
            final_observation_count=case['observation_count'], recorded_barangay_ids=sorted(areas),
            reviewed_survey_asset_ids=[], intake_schema=intake['schema_version']),
        outcome=dict(state=outcome['state'], target=outcome['target'], elapsed_days=elapsed,
            censored=outcome['censored'], verified_at=iso(outcome['verified_at']),
            sources=[dict(source, verified_at=iso(source['verified_at'])) for source in outcome['sources']]),
        audit=dict(reasons=reasons, duration_label_eligible=valid and outcome['state']=='verified_resolution',
            censoring_record_eligible=valid and outcome['state']=='right_censored'))


def add_asset_references(db, user, rows, as_of):
    """Current reviewed references are conservative grouping keys, never intake features."""
    report_ids = sorted({rid for row in rows for rid in row['lineage']['report_ids']})
    visible_assets = scoped_assets(db.query(gm.InfrastructureAsset.asset_id), user)
    field = gm.AssetFieldObservation
    query = db.query(field.source_report_id, field.asset_id).join(gm.AssetInspectionEvidence,
        (gm.AssetInspectionEvidence.id == field.evidence_reference) & (gm.AssetInspectionEvidence.asset_id == field.asset_id)
    ).filter(field.asset_id.in_(visible_assets), field.review_status == 'accepted',
        field.identity_confirmed.is_(True), field.location_reviewed.is_(True), field.visibility == 'visible',
        field.reviewed_by_id != field.recorded_by_id, field.observed_at <= field.reviewed_at,
        field.recorded_at <= field.reviewed_at, field.reviewed_at <= as_of)
    by_report = defaultdict(set)
    for start in range(0, len(report_ids), 1000):
        for rid, asset in query.filter(field.source_report_id.in_(report_ids[start:start+1000])).distinct():
            by_report[rid].add(asset)
    for row in rows:
        row['lineage']['reviewed_survey_asset_ids'] = sorted({asset for rid in row['lineage']['report_ids'] for asset in by_report[rid]})


def collect(db, user, max_cases=1000):
    learning.require_learning_access(user)
    if not 1 <= max_cases <= 5000:
        raise HTTPException(422, 'Choose between 1 and 5000 cases.')
    as_of = db.execute(select(func.statement_timestamp())).scalar_one()
    visible_ids = scoped_reports(db.query(models.Report.id), user)
    query = db.query(models.ReportConcern).filter(models.ReportConcern.id.in_(
        db.query(models.ReportObservation.concern_id).filter(models.ReportObservation.report_id.in_(visible_ids))))
    rows, after_id, inspected = [], 0, 0
    while True:
        concerns = query.filter(models.ReportConcern.id > after_id).order_by(models.ReportConcern.id).limit(100).all()
        if not concerns:
            break
        for concern in concerns:
            inspected += 1
            if inspected > MAX_CANDIDATES:
                raise HTTPException(413, 'Export exceeds the bounded snapshot scan. Use a narrower authorized scope.')
            try:
                case = learning.concern_case(db, user, concern, as_of)
            except HTTPException as exc:
                if exc.status_code != 403:
                    raise
                continue  # Omit the entire mixed-access concern, including its counts.
            except (KeyError, TypeError, ValueError):
                raise HTTPException(409, 'Learning source structure needs correction before export.') from None
            if case:
                if len(rows) >= max_cases:
                    raise HTTPException(413, 'Complete export exceeds max_cases. Increase the bound within the allowed limit or narrow authorized scope.')
                rows.append(dataset_row(db, case, as_of))
        after_id = concerns[-1].id
    include_asset_references = can(user, 'maintenance', 'view')
    if include_asset_references:
        add_asset_references(db, user, rows, as_of)
    return seal(rows, as_of, include_asset_references=include_asset_references)
