"""Real scoped commands and native PostGIS retrieval; all records synthetic."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

import models
from tests.test_resident_government_integration import connected, submit


def pair(client, headers, one=None, two=None):
    one, two = one or submit(client).json(), two or submit(client).json()
    base = '/api/report-intelligence/reports/'
    a = client.get(base+str(one['id']), headers=headers['chief']).json()
    b = client.get(base+str(two['id']), headers=headers['chief']).json()
    source, target = a['observations'][0], b['observations'][0]
    path = f"{base}{one['id']}/observations/{source['id']}/pairs/{target['id']}"
    body = dict(expected_version=one['version'], expected_target_version=two['version'],
        expected_concern_version=source['concern_version'], expected_target_concern_version=target['concern_version'],
        expected_pair_revision=0, relation='same_asset_different_problem', evidence_basis=['photos','report_details'],
        reason='SAMPLE same pole with two independently observed defects.')
    return one, two, source, target, path, body


def post(client, headers, path, body, key=None, role='chief'):
    return client.post(path, json=body, headers={**headers[role], 'Idempotency-Key':key or str(uuid4())})


def test_pair_review_preserves_individual_reports_and_canonical_correction_history(connected):
    client, sessions, headers, _ = connected
    one, two, source, target, path, body = pair(client, headers)
    first = post(client, headers, path, body)
    assert first.status_code == 200, first.text
    assert first.json()['membership_changed'] is False
    assert first.json()['review']['training_release_eligible'] is False
    reverse = f"/api/report-intelligence/reports/{two['id']}/observations/{target['id']}/pairs/{source['id']}"
    history = client.get(reverse, headers=headers['chief']).json()
    assert history['pair_revision'] == 1
    assert history['reviews'][0]['current_evidence'] is True
    correction = dict(body, expected_pair_revision=1, relation='uncertain', evidence_basis=['location'],
        reason='SAMPLE second angle does not establish whether this is the same pole.')
    corrected = post(client, headers, reverse, correction)
    assert corrected.status_code == 200, corrected.text
    history = client.get(path, headers=headers['chief']).json()
    assert [r['relation'] for r in history['reviews']] == ['uncertain','same_asset_different_problem']
    with sessions() as db:
        assert db.query(models.Report).count() == db.query(models.ReportConcern).count() == 2
        assert {r.status for r in db.query(models.Report)} == {'pending'}
        assert db.query(models.ConcernDecision).count() == 0


def test_pair_command_replay_and_changed_input_or_stale_revision(connected):
    client, sessions, headers, _ = connected
    _, _, _, _, path, body = pair(client, headers)
    key = str(uuid4())
    first = post(client, headers, path, body, key)
    assert first.status_code == 200, first.text
    assert post(client, headers, path, body, key).json() == first.json()
    assert post(client, headers, path, dict(body, relation='different_asset'), key).status_code == 409
    assert post(client, headers, path, body).status_code == 409
    with sessions() as db:
        assert db.query(models.ObservationPairReview).count() == 1


@pytest.mark.parametrize('relation', ['same_problem','same_asset_different_problem','different_asset'])
def test_location_only_cannot_establish_identity(connected, relation):
    client, _, headers, _ = connected
    _, _, _, _, path, body = pair(client, headers)
    assert post(client, headers, path, dict(body, relation=relation, evidence_basis=['location','report_details'])).status_code == 422


def test_pair_permission_scope_ownership_and_missing_photo(connected):
    client, sessions, headers, _ = connected
    one, two, _, _, path, body = pair(client, headers)
    for role in ('resident','clerk'):
        assert client.get(path, headers=headers[role]).status_code == 403
        assert post(client, headers, path, body, role=role).status_code == 403
    with sessions() as db:
        db.get(models.Report, two['id']).image_url = None
        db.commit()
    fresh = client.get(path, headers=headers['chief']).json()['evidence']
    missing_photo_body = dict(body, expected_target_version=fresh['right']['report_version'])
    assert post(client, headers, path, missing_photo_body).status_code == 422
    with sessions() as db:
        # Remove the second report from this official's jurisdiction.
        db.add(models.District(id=4, name='SAMPLE other district', code='SAMPLE4'))
        db.flush()
        db.add(models.Barangay(id=172, name='SAMPLE outside scope', district_id=4))
        db.get(models.Report, two['id']).barangay_id = 172
        official = db.get(models.Official,1)
        official.role = 'dispatcher'
        official.primary_jurisdiction = [3]
        db.commit()
    assert client.get(path, headers=headers['chief']).status_code == 403
    assert post(client, headers, path, body).status_code == 403


def test_pair_evidence_changes_are_detected_and_history_is_not_rewritten(connected):
    client, sessions, headers, _ = connected
    one, _, _, _, path, body = pair(client, headers)
    assert post(client, headers, path, body).status_code == 200
    with sessions() as db:
        source = db.get(models.Report, one['id'])
        source.version += 1
        db.commit()
    history = client.get(path, headers=headers['chief']).json()
    assert history['reviews'][0]['current_evidence'] is False
    assert post(client, headers, path, dict(body, expected_pair_revision=1)).status_code == 409
    assert post(client, headers, path, dict(body, expected_version=body['expected_version']+1,
        expected_pair_revision=1, relation='uncertain', evidence_basis=['location'])).status_code == 200
    with sessions() as db:
        assert db.query(models.ObservationPairReview).order_by(models.ObservationPairReview.id).first().snapshot['left']['report_version'] == body['expected_version']


def test_observation_text_change_invalidates_evidence_and_replayed_receipt_is_truthful(connected):
    client, sessions, headers, _ = connected
    _, _, source, _, path, body = pair(client, headers)
    key = str(uuid4())
    assert post(client, headers,path,body,key).status_code == 200
    with sessions() as db:
        db.get(models.ReportObservation,source['id']).description = 'SAMPLE corrected observation describes a different visible defect.'
        db.commit()
    history = client.get(path, headers=headers['chief']).json()
    assert history['reviews'][0]['current_evidence'] is False
    replay = post(client,headers,path,body,key)
    assert replay.status_code == 200, replay.text
    assert replay.json()['review']['current_evidence'] is False
    with sessions() as db:
        assert db.query(models.ObservationPairReview).count() == 1


def test_pending_staff_invitation_cannot_read_or_record_a_pair_review(connected):
    client, sessions, headers, _ = connected
    _, _, _, _, path, body = pair(client, headers)
    with sessions() as db:
        db.get(models.Official,1).invitation_pending = True
        db.commit()
    assert client.get(path, headers=headers['chief']).status_code == 403
    assert post(client,headers,path,body).status_code == 403


def test_opposite_direction_concurrent_reviews_serialize_one_revision(connected):
    client, sessions, headers, _ = connected
    one, two, source, target, path, body = pair(client, headers)
    reverse = f"/api/report-intelligence/reports/{two['id']}/observations/{target['id']}/pairs/{source['id']}"
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda p:post(client, headers, p, body), [path, reverse]))
    assert sorted(r.status_code for r in responses) == [200,409], [r.text for r in responses]
    with sessions() as db:
        assert db.query(models.ObservationPairReview).count() == 1


def test_same_problem_review_does_not_silently_group_and_conflicting_label_needs_split(connected):
    client, _, headers, _ = connected
    one, two, source, target, path, body = pair(client, headers)
    assert post(client, headers, path, dict(body, relation='same_problem')).json()['membership_changed'] is False
    association = dict(observation_id=source['id'], target_observation_id=target['id'],
        expected_version=one['version'], expected_target_version=two['version'],
        expected_concern_version=source['concern_version'], expected_target_concern_version=target['concern_version'],
        reason='SAMPLE both photos show the same pole defect episode.')
    linked = client.post(f"/api/report-intelligence/reports/{one['id']}/association", headers=headers['chief'], json=association)
    assert linked.status_code == 200, linked.text
    context = client.get(path, headers=headers['chief']).json()
    assert context['reviews'][0]['current_evidence'] is False
    frozen = context['evidence']
    versions = dict(expected_version=linked.json()['version'], expected_target_version=two['version'],
        expected_concern_version=frozen['left']['concern_version'], expected_target_concern_version=frozen['right']['concern_version'])
    assert post(client, headers, path, dict(body, **versions, expected_pair_revision=1)).status_code == 409


def test_completed_source_concern_cannot_be_moved_into_an_open_episode(connected):
    client, sessions, headers, _ = connected
    one, two, source, target, _, _ = pair(client, headers)
    with sessions() as db:
        item = db.get(models.ReportObservation, source['id'])
        concern = db.get(models.ReportConcern, item.concern_id)
        concern.completed_at = datetime.now(timezone.utc)
        db.commit()
        version = concern.version
    body = dict(observation_id=source['id'], target_observation_id=target['id'],
        expected_version=one['version'], expected_target_version=two['version'],
        expected_concern_version=version, expected_target_concern_version=target['concern_version'],
        reason='SAMPLE must not relabel a completed episode as a fresh incident.')
    result = client.post(f"/api/report-intelligence/reports/{one['id']}/association", headers=headers['chief'], json=body)
    assert result.status_code == 409, result.text


def test_candidate_retrieval_does_not_lose_old_nearby_or_secondary_category_reports(connected):
    client, sessions, headers, _ = connected
    source = submit(client).json()
    near = submit(client, lng='121.04501').json()
    secondary = submit(client, category='Water & Drainage', categories='["Water & Drainage","Roads & Bridges"]', lng='121.04502').json()
    with sessions() as db:
        db.get(models.Report, near['id']).created_at = datetime.now(timezone.utc)-timedelta(days=100)
        for i in range(210):
            db.add(models.Report(ticket_id=f'SAMPLE-far-{i}', category='Roads & Bridges', categories=['Roads & Bridges'],
                description='SAMPLE further away recent report', location_lat=14.7565, location_lng=121.0455,
                barangay_id=171, status='pending'))
        db.commit()
    results = client.get(f"/api/report-intelligence/reports/{source['id']}", headers=headers['chief']).json()['candidates']
    assert [r['report_id'] for r in results[:2]] == [near['id'], secondary['id']]
    assert len(results) == 50


def test_target_uncertainty_expands_retrieval_and_completed_status_is_excluded(connected):
    client, sessions, headers, _ = connected
    source = submit(client).json()
    target = submit(client, lng='121.047').json()  # ~215m; outside default 100m.
    completed = submit(client).json()
    with sessions() as db:
        db.get(models.Report, target['id']).accuracy_m = 120
        db.get(models.Report, completed['id']).status = 'completed'
        db.commit()
    candidates = client.get(f"/api/report-intelligence/reports/{source['id']}", headers=headers['chief']).json()['candidates']
    assert [r['report_id'] for r in candidates] == [target['id']]
    assert candidates[0]['target_issue_accuracy_m'] == 120
    assert candidates[0]['decision'] == 'review_required'


def test_matching_export_keeps_revisions_and_uncertain_labels_without_private_text(connected):
    from matching_dataset_contract import verify
    client, _, headers, _ = connected
    _, _, _, _, path, body = pair(client, headers)
    assert post(client, headers, path, body).status_code == 200
    assert post(client, headers, path, dict(body, expected_pair_revision=1, relation='uncertain', evidence_basis=['location'])).status_code == 200
    url = '/api/gov/report-learning/matching-dataset'
    response = client.get(url, headers=headers['chief'])
    assert response.status_code == 200, response.text
    document = response.json()
    assert verify(document)['row_count'] == 2
    assert response.headers['cache-control'] == 'no-store'
    a, b = document['rows']
    assert a['evaluation_group'] == b['evaluation_group']
    assert a['latest_review'] is False and b['latest_review'] is True
    assert b['relation'] == 'uncertain'
    assert document['manifest']['current_decisive_review_count'] == 0
    for private in ('SAMPLE same pole','guest@test.invalid','photo_url','latitude','"actor_id":','"reason":'):
        assert private not in response.text
    assert client.get(url+'?max_reviews=1', headers=headers['chief']).status_code == 413
    assert client.get(url, headers=headers['resident']).status_code == 403
    assert client.get(url, headers=headers['clerk']).status_code == 403


def test_matching_export_omits_whole_cross_scope_pairs(connected):
    client, sessions, headers, _ = connected
    _, two, _, _, path, body = pair(client, headers)
    assert post(client, headers, path, body).status_code == 200
    with sessions() as db:
        db.add(models.District(id=4, name='SAMPLE other district', code='SAMPLE4'))
        db.flush()
        db.add(models.Barangay(id=172, name='SAMPLE other area', district_id=4))
        db.flush()
        db.get(models.Report, two['id']).barangay_id = 172
        db.get(models.Official,1).primary_jurisdiction = [3]
        db.commit()
    result = client.get('/api/gov/report-learning/matching-dataset',headers=headers['chief'])
    assert result.status_code == 200, result.text
    assert result.json()['manifest']['row_count'] == 0 and result.json()['rows'] == []


def test_pair_review_requires_ownership_of_both_reports_and_concern_versions(connected):
    client, sessions, headers, _ = connected
    one, two, source, target, path, body = pair(client, headers)
    with sessions() as db:
        worker = models.Official(id=3, full_name='SAMPLE validator', email='validator@test.invalid',
            password_hash='not-for-login', role='project_engineer', is_active=True)
        db.add(worker)
        db.flush()
        db.get(models.Report,one['id']).review_assigned_to_id = worker.id
        db.commit()
    import auth
    validator = {'Authorization':'Bearer '+auth.create_access_token({'sub':'validator@test.invalid'})}
    read = client.get(path,headers=validator)
    assert read.status_code == 200, read.text
    assert read.json()['can_record_review'] is False
    assert client.post(path, json=body, headers={**validator,'Idempotency-Key':str(uuid4())}).status_code == 403
    with sessions() as db:
        concern = db.get(models.ReportConcern, db.get(models.ReportObservation,target['id']).concern_id)
        concern.version += 1
        db.commit()
    fresh = client.get(path, headers=headers['chief']).json()['evidence']
    assert post(client, headers,path,dict(body, expected_version=fresh['left']['report_version'])).status_code == 409


def test_staff_evidence_projection_is_private_and_pair_eligibility_is_server_supplied(connected):
    client, _, headers, _ = connected
    one = submit(client,headers['resident'],contact_email='resident@test.invalid').json()
    _, _, _, _, path, _ = pair(client,headers,one=one)
    staff = client.get(f"/api/report-intelligence/reports/{one['id']}",headers=headers['chief']).json()
    assert staff['can_review_pairs'] is True
    assert staff['staff_evidence']['photo_url'] == one['image_url']
    own = client.get(f"/api/report-intelligence/reports/{one['id']}",headers=headers['resident']).json()
    assert 'staff_evidence' not in own and 'can_review_pairs' not in own
    assert client.get(path,headers=headers['chief']).json()['can_record_review'] is True


def test_pair_export_holds_a_consistent_snapshot_during_concurrent_correction(connected, monkeypatch):
    import matching_dataset_export as export
    client, _, headers, _ = connected
    _, _, _, _, path, body = pair(client, headers)
    assert post(client, headers,path,body).status_code == 200
    original = export.pair_snapshot
    def correction_during_read(*args):
        snapshot = original(*args)
        result = post(client,headers,path,dict(body,expected_pair_revision=1,relation='uncertain',evidence_basis=['location']))
        assert result.status_code == 200, result.text
        return snapshot
    monkeypatch.setattr(export,'pair_snapshot',correction_during_read)
    result = client.get('/api/gov/report-learning/matching-dataset',headers=headers['chief'])
    assert result.status_code == 200, result.text
    assert result.json()['manifest']['row_count'] == 1
    monkeypatch.setattr(export,'pair_snapshot',original)
    after = client.get('/api/gov/report-learning/matching-dataset',headers=headers['chief'])
    assert after.json()['manifest']['row_count'] == 2
