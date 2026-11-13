"""Private learning export checks using synthetic records on disposable PostGIS."""
from datetime import datetime, timedelta, timezone
import json
from uuid import uuid4

import gov_models as gm
import models
import report_learning as learning
from learning_dataset_contract import FEATURE_NAMES, verify as verify_document
from tests.test_report_learning import add_field_claim, learning_context, link, verify
from tests.test_resident_government_integration import connected, submit

PATH = '/api/gov/report-learning/dataset'


def get_export(client, tokens, **params):
    response = client.get(PATH, headers=tokens['chief'], params=params)
    assert response.status_code == 200, response.text
    assert response.headers['cache-control'] == 'no-store'
    assert response.headers['content-disposition'].startswith('attachment;')
    document = response.json()
    verify_document(document)
    return document


def test_export_keeps_distinct_tickets_one_case_and_only_allow_listed_predictors(learning_context):
    client, sessions, tokens = learning_context
    one, two = (submit(client, tokens['resident']).json() for _ in range(2))
    concern = link(client, tokens, one['id'], two['id'])
    with sessions() as db:
        snapshot = db.get(models.ReportLearningSnapshot, one['id'])
        snapshot.features = dict(snapshot.features, contact_email='PRIVATE@example.invalid',
                                 report_count=999, latitude=14.7565, outcome_days=20)
        db.commit()
    verify(client, sessions, tokens, one['id'])
    partial = get_export(client, tokens)
    assert len(partial['rows']) == 1
    assert partial['rows'][0]['audit']['censoring_record_eligible']
    assert not partial['rows'][0]['audit']['duration_label_eligible']
    verify(client, sessions, tokens, two['id'])
    document = get_export(client, tokens)
    row, = document['rows']
    assert row['concern_id'] == concern
    assert row['lineage']['report_ids'] == sorted([one['id'], two['id']])
    assert row['lineage']['final_report_count'] == 2
    assert row['audit']['duration_label_eligible'] and not row['audit']['censoring_record_eligible']
    assert row['outcome']['elapsed_days'] >= 0 and len(row['outcome']['sources']) == 2
    assert set(row['features']) == set(FEATURE_NAMES)
    assert row['feature_availability']['concern_membership_available_at'] is None
    assert row['feature_availability']['earliest_report_snapshot_at'] is not None
    assert row['feature_availability']['all_member_snapshots_at'] >= row['feature_availability']['earliest_report_snapshot_at']
    serialized = json.dumps(document)
    assert all(secret not in serialized for secret in ('PRIVATE@example.invalid', 'guest@test.invalid',
        'FAKE test pothole', '121.045', 'outcome_days', 'tracking_token', 'contact_email', 'stored_path'))
    assert document['manifest']['training_release_eligible'] is False
    assert document['manifest']['duration_audit_eligible_count'] == 1


def test_multicategory_report_components_and_capacity_are_complete(learning_context):
    client, _, tokens = learning_context
    categories = ['Roads & Bridges', 'Water & Drainage']
    result = submit(client, categories=json.dumps(categories), observation_items=json.dumps([
        dict(item_key='road', categories=categories[:1], description='FAKE road issue near the test site.'),
        dict(item_key='drain', categories=categories[1:], description='FAKE drain issue near the test site.'),
    ])).json()
    response = client.get(PATH, params={'max_cases':1}, headers=tokens['chief'])
    assert response.status_code == 413 and 'rows' not in response.json()
    assert client.get(PATH, params={'max_cases':5001}, headers=tokens['chief']).status_code == 422
    doc = get_export(client, tokens, max_cases=2)
    assert doc['manifest']['row_count'] == 2 and doc['manifest']['distinct_report_count'] == 1
    assert doc['manifest']['report_component_count'] == 1
    assert all(row['lineage']['report_ids'] == [result['id']] for row in doc['rows'])
    assert len({row['evaluation_groups']['shared_report'] for row in doc['rows']}) == 1
    assert {tuple(row['features']['concern_categories']) for row in doc['rows']} == {(category,) for category in categories}


def test_cross_scope_concerns_and_non_authorized_users_cannot_export(learning_context):
    client, sessions, tokens = learning_context
    for role in ('resident', 'clerk', 'worker'):
        assert client.get(PATH, headers=tokens[role]).status_code == 403
    assert client.get(PATH).status_code in {401, 403}
    one, two = (submit(client).json() for _ in range(2))
    link(client, tokens, one['id'], two['id'])
    with sessions() as db:
        db.add(models.District(id=4, name='FAKE outside district', code='TEST4'))
        db.flush()
        db.add(models.Barangay(id=202, name='FAKE outside barangay', district_id=4))
        db.flush()
        db.get(models.Report, two['id']).barangay_id = 202
        db.get(models.Official, 1).primary_jurisdiction = [3]
        db.commit()
    doc = get_export(client, tokens, max_cases=1)
    assert doc['rows'] == [] and doc['manifest']['distinct_report_count'] == 0
    assert doc['manifest']['outcome_state_counts'] == {}


def test_snapshot_does_not_mix_a_concurrent_lifecycle_change(learning_context, monkeypatch):
    client, sessions, tokens = learning_context
    one, two = (submit(client).json() for _ in range(2))
    original = learning.concern_case

    def concurrent_change(reader, actor, concern, as_of):
        result = original(reader, actor, concern, as_of)
        if result['report_ids'] == [one['id']]:
            with sessions() as writer:
                writer.get(models.Report, two['id']).status = 'cancelled'
                writer.commit()
        return result

    monkeypatch.setattr(learning, 'concern_case', concurrent_change)
    before = get_export(client, tokens)
    assert before['manifest']['outcome_state_counts'] == {'right_censored':2}
    monkeypatch.setattr(learning, 'concern_case', original)
    after = get_export(client, tokens)
    assert after['manifest']['outcome_state_counts'] == {'non_resolution_terminal':1, 'right_censored':1}
    assert before['manifest']['rows_sha256'] != after['manifest']['rows_sha256']


def test_missing_and_late_features_remain_visible_but_not_audit_labels(learning_context):
    client, sessions, tokens = learning_context
    one, two = (submit(client).json() for _ in range(2))
    verify(client, sessions, tokens, two['id'])
    with sessions() as db:
        db.delete(db.get(models.ReportLearningSnapshot, one['id']))
        db.get(models.ReportLearningSnapshot, two['id']).available_at = datetime.now(timezone.utc) + timedelta(days=1)
        db.commit()
    document = get_export(client, tokens)
    by_report = {row['lineage']['report_ids'][0]: row for row in document['rows']}
    assert by_report[one['id']]['features'] is None
    assert 'missing_intake_snapshot' in by_report[one['id']]['audit']['reasons']
    assert 'features_available_after_outcome' in by_report[two['id']]['audit']['reasons']
    assert document['manifest']['duration_audit_eligible_count'] == document['manifest']['censoring_audit_eligible_count'] == 0


def test_reviewed_survey_references_link_groups_without_becoming_features(learning_context):
    client, sessions, tokens = learning_context
    one, two = (submit(client).json() for _ in range(2))
    asset_id = 'FAKE-SURVEY-REFERENCE'
    evidence_ids = [str(uuid4()) for _ in range(2)]
    with sessions() as db:
        db.add(gm.InfrastructureAsset(asset_id=asset_id, asset_name='FAKE test asset', category='Roads', barangay_id=171))
        db.flush()
        db.add_all([gm.AssetInspectionEvidence(id=eid, asset_id=asset_id, uploaded_by_id=2, stored_path='FAKE-private-file',
            content_type='image/png', byte_size=25, sha256='f'*64) for eid in evidence_ids])
        db.commit()
    now = datetime.now(timezone.utc)
    for report, photo_id in zip((one, two), evidence_ids):
        add_field_claim(sessions, asset_id, now-timedelta(days=1), 'defect_observed', photo_id, source_report_id=report['id'])
    document = get_export(client, tokens)
    assert document['manifest']['report_component_count'] == 2 and document['manifest']['asset_component_count'] == 1
    assert all(row['lineage']['reviewed_survey_asset_ids'] == [asset_id] for row in document['rows'])
    assert all(asset_id not in json.dumps(row['features']) for row in document['rows'])
    with sessions() as db:
        role = models.SystemRole(name='FAKE limited maintenance', capabilities={'maintenance': []})
        db.add(role)
        db.flush()
        db.get(models.Official, 1).role_id = role.id
        db.commit()
    limited = get_export(client, tokens)
    assert limited['manifest']['asset_reference_coverage'] == 'no_maintenance_access'
    assert asset_id not in json.dumps(limited) and limited['manifest']['asset_component_count'] == 2
