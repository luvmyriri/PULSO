"""Actual resident intake to government reads on a disposable PostGIS database."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

import auth
import main
import models
from database import get_db
from utils.rate_limiter import report_submission_limiter, tracking_query_limiter


@pytest.fixture
def connected(clean_postgis, synthetic_boundaries, monkeypatch, tmp_path):
    with clean_postgis() as db:
        db.add(models.District(id=3, name='FAKE North test district', code='TEST3'))
        db.flush()
        db.add(models.Barangay(id=171, name='Barangay 171', district_id=3))
        db.add(models.Official(id=1, full_name='FAKE City engineer', email='chief@test.invalid', password_hash='not-for-login', role='city_engineer', is_active=True))
        db.add(models.Official(id=2, full_name='FAKE Clerk', email='clerk@test.invalid', password_hash='not-for-login', role='admin_clerk', is_active=True))
        db.add(models.Resident(id=101, full_name='FAKE Registered resident', email='resident@test.invalid', password_hash='not-for-login', is_active=True, is_verified=True, barangay_id=171, district_id=3))
        db.commit()

    def database():
        with clean_postgis() as db:
            yield db

    main.app.dependency_overrides[get_db] = database
    monkeypatch.setattr(main, 'UPLOAD_DIR', str(tmp_path))
    monkeypatch.setattr('system_settings.report_analysis', lambda *a, **k: None)
    monkeypatch.setattr('report_receipts.send_report_gmail_notification', lambda *a, **k: None)
    monkeypatch.setenv('PULSO_PUBLIC_BASE_URL', 'http://127.0.0.1:5173')
    report_submission_limiter.reset()
    tracking_query_limiter.reset()
    headers = {name: {'Authorization': 'Bearer ' + auth.create_access_token({'sub': f'{name}@test.invalid'})} for name in ('chief', 'clerk', 'resident')}
    yield TestClient(main.app), clean_postgis, headers, tmp_path
    main.app.dependency_overrides.pop(get_db, None)


def submit(client, headers=None, **values):
    payload = dict(category='Roads & Bridges', description='FAKE test pothole with submitted evidence.', lat='14.7565', lng='121.045', location_barangay='Barangay 171', location_string='FAKE Plus Code and test road, Caloocan City', reporter_name='FAKE Guest name', urgency='high', contact_email='guest@test.invalid', contact_phone='09171234567')
    payload.update(values)
    return client.post('/api/reports', data=payload, headers=headers or {}, files={'image': ('FAKE-evidence.png', b'\x89PNG\r\n\x1a\nFAKE test fixture', 'image/png')})


def test_guest_and_registered_intake_reach_government_and_my_work(connected):
    client, sessions, headers, uploads = connected
    guest_response = submit(client)
    assert guest_response.status_code == 201, guest_response.text
    guest = guest_response.json()
    registered_response = submit(client, headers['resident'], lat='14.7575', reporter_name='Spoofed name', contact_email='resident@test.invalid')
    assert registered_response.status_code == 201, registered_response.text
    registered = registered_response.json()
    assert guest['reporter_name'] == 'FAKE Guest name'
    assert registered['reporter_name'] == 'FAKE Registered resident'
    assert guest['submitted_urgency'] == 'high'
    assert guest['tracking_url'].startswith('http://127.0.0.1:5173/track?')
    assert (uploads / guest['image_url'].split('/')[-1]).read_bytes().startswith(b'\x89PNG')

    response = client.get('/api/reports', headers=headers['chief'])
    assert response.status_code == 200, response.text
    rows = {row['id']: row for row in response.json()}
    assert set(rows) == {guest['id'], registered['id']}
    for source in (guest, registered):
        for field in ('reporter_name', 'submitted_urgency', 'category', 'description', 'image_url', 'location_string', 'location_lat', 'location_lng', 'contact_email', 'contact_phone'):
            assert rows[source['id']][field] == source[field]
    docket_response = client.get(f'/api/gov/reports/{guest["id"]}/docket', headers=headers['chief'])
    assert docket_response.status_code == 200, docket_response.text
    docket = docket_response.json()
    assert docket['report']['photo_url'] == guest['image_url']
    assert docket['report']['reporter_name'] == guest['reporter_name']
    assert docket['report']['submitted_urgency'] == 'high'
    mapped = client.get('/api/gov/report-map', headers=headers['chief'])
    assert mapped.status_code == 200, mapped.text
    assert {row['id'] for row in mapped.json()['items']} == set(rows)
    overview = client.get('/api/gov/overview', headers=headers['chief'])
    assert overview.status_code == 200, overview.text
    assert overview.json()['totals']['open_reports'] == 2

    assignment = client.post(f'/api/gov/report-review/{guest["id"]}/assignment', headers=headers['chief'], json={'expected_version': docket['report']['version'], 'assigned_to_id': 2, 'reason': 'FAKE integration assignment to intake clerk.'})
    assert assignment.status_code == 200, assignment.text
    work = client.get('/api/gov/operations/today', headers=headers['clerk'])
    assert work.status_code == 200, work.text
    # My Work refers to the same source record, not a copied report.
    assert any(item["entity_type"] == "report" and item["id"] == guest["id"] and item["task_bucket"] == "assigned_to_me" for item in work.json()["needs_attention"])
    tracked = client.post('/api/reports/track', json={'ticket_id': guest['ticket_id'], 'tracking_token': guest['tracking_token']})
    assert tracked.status_code == 200, tracked.text
    assert client.get('/api/reports', headers=headers['resident']).status_code == 403
    assert client.get('/api/reports').status_code in (401, 403)


def test_duplicate_protection_survives_the_merge(connected, monkeypatch):
    client, sessions, headers, uploads = connected
    monkeypatch.delenv('PYTEST_CURRENT_TEST', raising=False)
    first = submit(client)
    assert first.status_code == 201, first.text
    second = submit(client)
    assert second.status_code == 409, second.text
    with sessions() as db:
        assert db.query(models.Report).count() == 1


def test_snapshot_paging_does_not_omit_older_reports(connected):
    client, sessions, headers, uploads = connected
    before = datetime.now(timezone.utc) - timedelta(days=1)
    with sessions() as db:
        db.add_all([models.Report(ticket_id=f'FAKE-PAGED-{i}', category='Roads', description='FAKE paging record', status='pending', barangay_id=171, created_at=before) for i in range(1001)])
        db.commit()
    first = client.get('/api/reports?limit=1000', headers=headers['chief'])
    assert first.status_code == 200, first.text
    assert first.headers['X-Total-Count'] == '1001'
    assert len(first.json()) == 1000
    with sessions() as db:
        db.add(models.Report(ticket_id='FAKE-NEW-AFTER-SNAPSHOT', category='Roads', description='FAKE new arrival', status='pending', barangay_id=171, created_at=datetime.now(timezone.utc) + timedelta(seconds=1)))
        db.commit()
    second = client.get('/api/reports', params={'limit': 1000, 'skip': 1000, 'as_of': first.headers['X-Reports-As-Of']}, headers=headers['chief'])
    assert second.status_code == 200, second.text
    assert second.headers['X-Total-Count'] == '1001'
    assert len(second.json()) == 1
    assert len({row['id'] for row in first.json() + second.json()}) == 1001
    assert client.get('/api/reports?skip=-1', headers=headers['chief']).status_code == 422
    mapped = client.get('/api/gov/report-map', params={'as_of': first.headers['X-Reports-As-Of']}, headers=headers['chief'])
    assert mapped.status_code == 200, mapped.text
    assert mapped.json()['next_skip'] == 1000
    tail = client.get('/api/gov/report-map', params={'skip': mapped.json()['next_skip'], 'as_of': mapped.json()['as_of']}, headers=headers['chief'])
    assert tail.status_code == 200, tail.text
    assert tail.json()['next_skip'] is None
    assert len({row['id'] for row in mapped.json()['items'] + tail.json()['items']}) == 1001


def test_updated_intake_remains_scoped_and_validated(connected):
    client, sessions, headers, uploads = connected
    rejected = submit(client, urgency='invented-priority')
    assert rejected.status_code == 422
    created = submit(client)
    assert created.status_code == 201, created.text
    with sessions() as db:
        db.add(models.District(id=1, name='FAKE Other district', code='TEST1'))
        db.add(models.Official(id=3, full_name='FAKE Other district engineer', email='outside@test.invalid', password_hash='not-for-login', role='city_engineer', primary_jurisdiction=[1], is_active=True))
        db.commit()
        assert db.query(models.Report).count() == 1
    outside = {'Authorization': 'Bearer ' + auth.create_access_token({'sub': 'outside@test.invalid'})}
    response = client.get('/api/reports', headers=outside)
    assert response.status_code == 200 and response.json() == []
    assert client.get(f'/api/gov/reports/{created.json()["id"]}/docket', headers=outside).status_code == 403
