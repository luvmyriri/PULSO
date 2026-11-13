"""Intake and concern contracts against guarded disposable PostGIS only."""
import json
from datetime import datetime, timezone
from uuid import uuid4
import pytest
import models
from tests.test_resident_government_integration import connected, submit


def test_one_ticket_for_multiple_categories_and_explicit_observations(connected):
    client, sessions, headers, _ = connected
    categories = ['Roads & Bridges', 'Water & Drainage']
    items = [dict(item_key='road', categories=[categories[0]], description='FAKE pothole on the test road.'),
             dict(item_key='drain', categories=[categories[1]], description='FAKE blocked drain beside the road.')]
    response = submit(client, categories=json.dumps(categories), observation_items=json.dumps(items))
    assert response.status_code == 201, response.text
    assert response.json()['categories'] == categories
    with sessions() as db:
        assert db.query(models.Report).count() == 1
        assert db.query(models.ReportObservation).count() == 2
        assert db.query(models.ReportConcern).count() == 2


def test_intake_retry_returns_same_ticket_token_and_evidence(connected):
    client, sessions, _, uploads = connected
    key = {'Idempotency-Key': str(uuid4())}
    first, again = submit(client, key), submit(client, key)
    assert first.status_code == again.status_code == 201, again.text
    assert first.json()['ticket_id'] == again.json()['ticket_id']
    assert first.json()['tracking_token'] == again.json()['tracking_token']
    receipt = client.get('/api/report-intelligence/intake-receipt', headers=key)
    assert receipt.status_code == 200, receipt.text
    assert receipt.json()['ticket_id'] == first.json()['ticket_id']
    assert receipt.json()['tracking_token'] == first.json()['tracking_token']
    assert len(list(uploads.iterdir())) == 1
    assert submit(client, key, description='FAKE changed payload must conflict.').status_code == 409
    with sessions() as db:
        assert db.query(models.Report).count() == db.query(models.ReportObservation).count() == 1


def test_manual_issue_pin_keeps_original_device_fix_without_inheriting_accuracy(connected):
    client, _, _, _ = connected
    metadata = dict(source='manual', device_fix=dict(latitude=14.756, longitude=121.045, accuracy_m=12,
        measured_at=datetime.now(timezone.utc).isoformat()), issue_pin_confirmed=True)
    result = submit(client, location_metadata=json.dumps(metadata))
    assert result.status_code == 201, result.text
    assert result.json()['accuracy_m'] is None
    assert result.json()['location_metadata']['device_fix']['accuracy_m'] == 12


@pytest.mark.parametrize('values', [dict(lat='nan'), dict(lng='inf'), dict(categories='["Roads & Bridges", 3]'),
    dict(location_metadata='{"source":"device"}'), dict(categories='["Different primary"]'),
    dict(location_metadata='{"device_fix":{"latitude":14,"longitude":121,"accuracy_m":0}}')])
def test_invalid_coordinates_or_provenance_cannot_be_submitted(connected, values):
    client, sessions, _, uploads = connected
    assert submit(client, **values).status_code == 422
    with sessions() as db:
        assert db.query(models.Report).count() == 0
    assert not list(uploads.iterdir())


def test_ai_failure_keeps_manual_intake_available(connected, monkeypatch):
    client, _, _, _ = connected
    def unavailable(*args, **kwargs):
        raise RuntimeError('FAKE provider outage')
    monkeypatch.setattr('system_settings.report_analysis', unavailable)
    result = submit(client)
    assert result.status_code == 201, result.text
    assert result.json()['ai_category'] is None


def test_confirmed_pin_without_coordinates_is_rejected_before_upload_or_write(connected):
    client,sessions,_,uploads=connected
    result=client.post('/api/reports',data=dict(category='Roads & Bridges',description='FAKE report with no submitted issue coordinates.',
        location_metadata=json.dumps(dict(source='manual',issue_pin_confirmed=True))),
        files={'image':('FAKE.png',b'\x89PNG\r\n\x1a\nFAKE fixture','image/png')})
    assert result.status_code==422,result.text
    assert 'confirmed issue pin' in result.json()['detail']
    with sessions() as db:
        assert db.query(models.Report).count()==0
        assert db.query(models.ReportObservation).count()==0
    assert not list(uploads.iterdir())


def test_unknown_issue_location_stays_unconfirmed_and_has_no_accuracy(connected):
    client,_,_,_=connected
    result=client.post('/api/reports',data=dict(category='Roads & Bridges',description='FAKE report with an unknown issue location.'),
        files={'image':('FAKE.png',b'\x89PNG\r\n\x1a\nFAKE fixture','image/png')})
    assert result.status_code==201,result.text
    value=result.json()
    assert value['location_lat'] is None and value['location_lng'] is None
    assert value['accuracy_m'] is None
    assert value['location_metadata']['issue_pin_confirmed'] is False


def test_matching_preserves_reports_requires_review_and_can_be_corrected(connected):
    client, sessions, headers, _ = connected
    one, two = submit(client).json(), submit(client).json()
    path = '/api/report-intelligence/reports/'
    source = client.get(path + str(one['id']), headers=headers['chief']).json()
    target = client.get(path + str(two['id']), headers=headers['chief']).json()
    assert len(source['candidates']) == 1
    assert source['candidates'][0]['decision'] == 'review_required'
    assert source['resolution_estimate']['predicted_days'] is None
    payload = dict(observation_id=source['observations'][0]['id'],
        target_observation_id=target['observations'][0]['id'], expected_version=one['version'],
        expected_concern_version=source['observations'][0]['concern_version'], reason='FAKE same pothole confirmed from field evidence.')
    payload.update(expected_target_version=two['version'], expected_target_concern_version=target['observations'][0]['concern_version'])
    assert client.post(path + str(one['id']) + '/association', json=payload, headers=headers['resident']).status_code == 403
    merged = client.post(path + str(one['id']) + '/association', json=payload, headers=headers['chief'])
    assert merged.status_code == 200, merged.text
    observation = merged.json()['observations'][0]
    assert observation['contributing_report_count'] == 2
    assert observation['concern_id'] == target['observations'][0]['concern_id']
    assert client.post(path + str(one['id']) + '/association', json=payload, headers=headers['chief']).status_code == 409
    payload.update(target_observation_id=None, expected_version=merged.json()['version'], expected_concern_version=observation['concern_version'])
    split = client.post(path + str(one['id']) + '/association', json=payload, headers=headers['chief'])
    assert split.status_code == 200, split.text
    assert split.json()['observations'][0]['contributing_report_count'] == 1
    with sessions() as db:
        assert db.query(models.Report).count() == 2
        assert db.query(models.ConcernDecision).count() == 2
        assert {r.status for r in db.query(models.Report)} == {'pending'}


def test_other_resident_cannot_read_private_intelligence(connected):
    client, _, headers, _ = connected
    guest = submit(client).json()
    assert client.get(f"/api/report-intelligence/reports/{guest['id']}", headers=headers['resident']).status_code == 403
    owned = submit(client, headers['resident'], contact_email='resident@test.invalid').json()
    response = client.get(f"/api/report-intelligence/reports/{owned['id']}", headers=headers['resident'])
    assert response.status_code == 200, response.text
    assert 'candidates' not in response.json()


def test_concurrent_retry_commits_one_ticket_and_one_evidence_file(connected, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    client, sessions, _, uploads = connected
    barrier = Barrier(2)
    def delayed_analysis(*args, **kwargs):
        barrier.wait(timeout=10)
        return None
    monkeypatch.setattr('system_settings.report_analysis', delayed_analysis)
    headers = {'Idempotency-Key': str(uuid4())}
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: submit(client, headers), range(2)))
    assert all(r.status_code == 201 for r in results), [r.text for r in results]
    assert results[0].json()['ticket_id'] == results[1].json()['ticket_id']
    with sessions() as db:
        assert db.query(models.Report).count() == db.query(models.ReportConcern).count() == 1
    assert len(list(uploads.iterdir())) == 1
