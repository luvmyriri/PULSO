"""Versioned private learning-export contract. Standard library only; no fitting."""
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
import json

from public_reports import PUBLIC_CATEGORIES

SCHEMA = 'pulso-concern-learning-audit-v1'
INTAKE_SCHEMA = 'report-intake-features-v1'
FEATURE_NAMES = (
    'submitted_categories', 'concern_categories', 'reported_barangay_id',
    'location_source', 'issue_accuracy_m', 'photo_source', 'initial_observation_count',
)
CATEGORY_LABELS = PUBLIC_CATEGORIES | {'Public Safety Hazards'}
BLOCKERS = (
    'current_membership_is_not_submission_time_membership',
    'point_in_time_physical_asset_linkage_not_established',
    'data_origin_and_outcome_quality_not_attested',
    'prospective_evaluation_and_release_policy_required',
)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False,
                     allow_nan=False).encode('utf-8')


def timestamp(value):
    if isinstance(value, datetime):
        result = value
    elif isinstance(value, str):
        result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    else:
        raise ValueError('Missing timestamp.')
    if result.tzinfo is None:
        raise ValueError('Timestamp needs a timezone.')
    return result.astimezone(timezone.utc)


def iso(value):
    return timestamp(value).isoformat().replace('+00:00', 'Z') if value is not None else None


def project_features(raw):
    """Allow-list predictors; neither arbitrary snapshot keys nor item keys escape."""
    if not isinstance(raw, dict):
        raise ValueError('Missing intake features.')
    submitted, observations = raw.get('submitted_categories'), raw.get('observation_categories')
    if (not isinstance(submitted, list) or not 1 <= len(submitted) <= 3
            or any(not isinstance(c, str) or c not in CATEGORY_LABELS for c in submitted)
            or not isinstance(observations, dict) or not 1 <= len(observations) <= 10):
        raise ValueError('Invalid category features.')
    labels = set()
    for values in observations.values():
        if (not isinstance(values, list) or not 1 <= len(values) <= 3
                or any(not isinstance(c, str) or c not in submitted for c in values)):
            raise ValueError('Invalid observation categories.')
        labels.update(values)
    area, count, accuracy = (raw.get(key) for key in ('reported_barangay_id', 'observation_count', 'issue_accuracy_m'))
    if area is not None and (type(area) is not int or area <= 0):
        raise ValueError('Invalid reported area.')
    if type(count) is not int or not 1 <= count <= 10:
        raise ValueError('Invalid initial count.')
    if accuracy is not None and (type(accuracy) not in (int, float) or not 0 < accuracy <= 100000):
        raise ValueError('Invalid uncertainty.')
    if raw.get('location_source') not in {'device', 'manual', 'search', 'uploaded_metadata', 'unknown'}:
        raise ValueError('Invalid location source.')
    if raw.get('photo_source') not in {'camera', 'upload', 'unknown'}:
        raise ValueError('Invalid photo source.')
    return dict(submitted_categories=submitted, concern_categories=sorted(labels), reported_barangay_id=area,
                location_source=raw['location_source'], issue_accuracy_m=accuracy,
                photo_source=raw['photo_source'], initial_observation_count=count)


def components(rows, *, include_assets=False, include_areas=False):
    """Group overlapping reports, reviewed field references and recorded areas."""
    parents = {row['concern_id']: row['concern_id'] for row in rows}

    def root(key):
        while parents[key] != key:
            parents[key] = parents[parents[key]]
            key = parents[key]
        return key

    owners = {}
    for row in rows:
        keys = [('report', rid) for rid in row['lineage']['report_ids']]
        if include_assets:
            keys += [('asset', asset) for asset in row['lineage']['reviewed_survey_asset_ids']]
        if include_areas:
            keys += [('area', area) for area in row['lineage']['recorded_barangay_ids']]
        for key in keys:
            if key in owners:
                a, b = sorted((root(row['concern_id']), root(owners[key])))
                parents[b] = a
            else:
                owners[key] = row['concern_id']
    members = {}
    for key in sorted(parents):
        members.setdefault(root(key), []).append(key)
    prefix = 'AREA-' if include_areas else 'ASSET-' if include_assets else 'REPORT-'
    names = {key: prefix + sha256(canonical(group)).hexdigest()[:24]
             for group in members.values() for key in group}
    return names


def seal(rows, as_of, *, include_asset_references):
    rows = sorted(rows, key=lambda row: row['concern_id'])
    reports = components(rows)
    assets = components(rows, include_assets=True)
    areas = components(rows, include_assets=True, include_areas=True)
    for row in rows:
        row['evaluation_groups'] = dict(shared_report=reports[row['concern_id']],
            shared_report_or_reviewed_survey_asset=assets[row['concern_id']],
            shared_report_asset_or_recorded_area=areas[row['concern_id']])
    manifest = dict(schema_version=SCHEMA, as_of=iso(as_of), model_status='not_a_prediction',
        purpose='private_current_membership_data_audit', training_release_eligible=False,
        training_release_blockers=list(BLOCKERS), data_origin='unattested',
        feature_names=list(FEATURE_NAMES),
        category_policy='Recognized PULSO category labels only; unsupported input is kept out of predictors.',
        feature_time_policy='Original snapshot availability is retained; concern membership availability is unknown.',
        outcome_target='all_linked_reports_verified_resolution',
        grouping_policy='Transitive shared report IDs, accessible reviewed survey asset references and all member frozen barangays. No physical defect identity is inferred.',
        asset_reference_coverage='scoped_reviewed_survey_references' if include_asset_references else 'no_maintenance_access',
        snapshot_policy='One read-only repeatable-read transaction; complete accessible concerns only.',
        privacy='Private operational data; incident IDs, category combinations, areas and times can identify incidents. Not anonymized.',
        row_count=len(rows), distinct_report_count=len({rid for row in rows for rid in row['lineage']['report_ids']}),
        report_component_count=len(set(reports.values())), asset_component_count=len(set(assets.values())),
        area_component_count=len(set(areas.values())),
        outcome_state_counts=dict(sorted(Counter(row['outcome']['state'] for row in rows).items())),
        duration_audit_eligible_count=sum(row['audit']['duration_label_eligible'] for row in rows),
        censoring_audit_eligible_count=sum(row['audit']['censoring_record_eligible'] for row in rows),
        rows_sha256=sha256(canonical(rows)).hexdigest())
    digest = sha256(canonical(dict(manifest=manifest, rows=rows))).hexdigest()
    manifest['export_sha256'] = digest
    return dict(manifest=manifest, rows=rows)


def verify(document):
    """Checksums detect alteration, not source authenticity or training fitness."""
    if not isinstance(document, dict) or set(document) != {'manifest', 'rows'}:
        raise ValueError('Invalid export envelope.')
    manifest, rows = document['manifest'], document['rows']
    if (not isinstance(manifest, dict) or not isinstance(rows, list)
            or manifest.get('schema_version') != SCHEMA
            or manifest.get('training_release_eligible') is not False
            or manifest.get('model_status') != 'not_a_prediction'
            or manifest.get('feature_names') != list(FEATURE_NAMES)
            or manifest.get('row_count') != len(rows)):
        raise ValueError('Unsupported export contract.')
    unsigned = {key: value for key, value in manifest.items() if key != 'export_sha256'}
    if (manifest.get('rows_sha256') != sha256(canonical(rows)).hexdigest()
            or manifest.get('export_sha256') != sha256(canonical(dict(manifest=unsigned, rows=rows))).hexdigest()):
        raise ValueError('Export checksum mismatch.')
    if any(not isinstance(row, dict) or (row.get('features') is not None
            and (not isinstance(row['features'], dict) or set(row['features']) != set(FEATURE_NAMES))) for row in rows):
        raise ValueError('Unexpected predictor fields.')
    return manifest
