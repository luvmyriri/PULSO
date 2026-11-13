"""Private operational pair-label audit; no model fitting or accuracy claim."""
from collections import Counter
from hashlib import sha256
import math

from learning_dataset_contract import canonical, iso, timestamp, CATEGORY_LABELS

SCHEMA = 'pulso-observation-matching-audit-v1'
RELATIONS = {'same_problem', 'same_asset_different_problem', 'different_asset', 'uncertain'}
ROW_FIELDS = {'review_id', 'revision', 'left_observation_id', 'right_observation_id', 'left_report_id',
    'right_report_id', 'relation', 'evidence_basis', 'recorded_at', 'features', 'current_evidence',
    'label_status', 'training_release_eligible', 'latest_review', 'evaluation_group'}
FEATURE_FIELDS = {'distance_m', 'shared_categories', 'left_issue_accuracy_m', 'right_issue_accuracy_m',
    'left_location_source', 'right_location_source', 'left_photo_present', 'right_photo_present'}


def group_rows(rows):
    """Corrections, reversed pairs and shared report observations stay together."""
    parents = {}

    def root(key):
        parents.setdefault(key, key)
        while parents[key] != key:
            parents[key] = parents[parents[key]]
            key = parents[key]
        return key

    for row in rows:
        a, b = sorted((root(row['left_report_id']), root(row['right_report_id'])))
        parents[b] = a
    members = {}
    for key in sorted(parents):
        members.setdefault(root(key), []).append(key)
    names = {key:'PAIR-GROUP-'+sha256(canonical(group)).hexdigest()[:24]
             for group in members.values() for key in group}
    return [names[row['left_report_id']] for row in rows]


def seal(rows, as_of):
    rows = sorted(rows, key=lambda row: row['review_id'])
    for row, group in zip(rows, group_rows(rows)):
        row['evaluation_group'] = group
    manifest = dict(schema_version=SCHEMA, as_of=iso(as_of), row_count=len(rows),
        purpose='private_operational_pair_label_audit', model_status='not_a_prediction',
        training_release_eligible=False, data_origin='unattested',
        training_release_blockers=['reviewer_labels_not_independently_attested',
            'representative_same_object_and_adjacent_lookalike_trials_required',
            'physical_asset_and_episode_leakage_audit_required', 'prospective_evaluation_required'],
        grouping_policy='All revisions and transitive shared reports stay together; physical asset identity is not inferred.',
        privacy='Private incident references and times; not anonymized. Raw coordinates, photos, contact data and reasons are omitted.',
        snapshot_policy='One read-only repeatable-read snapshot; only pairs with both reports accessible.',
        relation_counts=dict(sorted(Counter(row['relation'] for row in rows).items())),
        current_decisive_review_count=sum(row['latest_review'] and row['current_evidence'] and row['relation']!='uncertain' for row in rows),
        rows_sha256=sha256(canonical(rows)).hexdigest())
    manifest['export_sha256'] = sha256(canonical(dict(manifest=manifest, rows=rows))).hexdigest()
    return dict(manifest=manifest, rows=rows)


def verify(document):
    if not isinstance(document, dict) or set(document) != {'manifest', 'rows'}:
        raise ValueError('Invalid matching envelope.')
    manifest, rows = document['manifest'], document['rows']
    if (not isinstance(manifest, dict) or not isinstance(rows, list) or manifest.get('schema_version') != SCHEMA or
            manifest.get('training_release_eligible') is not False or manifest.get('row_count') != len(rows) or
            manifest.get('model_status') != 'not_a_prediction'):
        raise ValueError('Unsupported matching contract.')
    unsigned = {key:value for key,value in manifest.items() if key != 'export_sha256'}
    if (manifest.get('rows_sha256') != sha256(canonical(rows)).hexdigest() or
            manifest.get('export_sha256') != sha256(canonical(dict(manifest=unsigned, rows=rows))).hexdigest()):
        raise ValueError('Matching checksum mismatch.')
    seen = set()
    for row in rows:
        if (not isinstance(row, dict) or set(row) != ROW_FIELDS or
                any(type(row[key]) is not int or row[key]<=0 for key in
                    ('review_id','revision','left_observation_id','right_observation_id','left_report_id','right_report_id')) or
                row['left_observation_id'] >= row['right_observation_id'] or row['review_id'] in seen or
                row['relation'] not in RELATIONS or row['training_release_eligible'] is not False or
                any(type(row[key]) is not bool for key in ('current_evidence','latest_review')) or
                row['label_status'] != 'operational_reviewer_judgment'):
            raise ValueError('Invalid matching review row.')
        seen.add(row['review_id'])
        timestamp(row['recorded_at'])
        features, basis = row['features'], row['evidence_basis']
        if (not isinstance(features,dict) or set(features)!=FEATURE_FIELDS or not isinstance(basis,list) or
                not basis or len(set(basis)) != len(basis) or
                any(item not in {'photos','field_visit','location','report_details'} for item in basis)):
            raise ValueError('Invalid matching evidence fields.')
        labels = features['shared_categories']
        if not isinstance(labels,list) or any(c not in CATEGORY_LABELS for c in labels):
            raise ValueError('Unexpected category predictor.')
        for key in ('distance_m','left_issue_accuracy_m','right_issue_accuracy_m'):
            number = features[key]
            if number is not None and (type(number) not in (int,float) or not math.isfinite(number) or
                    number < 0 or (key!='distance_m' and not 0 < number <= 100000)):
                raise ValueError('Invalid spatial estimate.')
        for side in ('left','right'):
            if (type(features[side+'_photo_present']) is not bool or features[side+'_location_source'] not in
                    {'device','manual','search','uploaded_metadata','unknown'}):
                raise ValueError('Invalid evidence source.')
    for row, group in zip(rows, group_rows(rows)):
        if row['evaluation_group'] != group:
            raise ValueError('Invalid matching labels or grouping.')
    return manifest
