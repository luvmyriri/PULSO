"""Available-validator assignment against guarded disposable PostGIS."""
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import pytest
from sqlalchemy import text
import auth
import models
import gov_models as gm
import report_review as review
import reviewer_availability as availability
from tests.test_government_workspace import context

PATH = '/api/gov/report-review/availability/me'


@pytest.fixture
def queue(context):
    client, sessions, tokens = context
    review._routing_cursor = 0
    with sessions() as db:
        db.query(models.ReportReviewerAvailability).delete()
        db.commit()
    return client, sessions, tokens


def change(client, headers, *, state='available', capacity=5):
    before = client.get(PATH, headers=headers)
    assert before.status_code == 200, before.text
    return client.patch(PATH, headers=headers, json=dict(state=state, capacity=capacity, expected_version=before.json()['version']))


def test_active_account_is_not_availability_and_reads_do_not_assign(queue):
    client, sessions, tokens = queue
    before = client.get(PATH, headers=tokens['inspector'])
    assert before.status_code == 200 and before.json()['state'] == 'offline'
    with sessions() as db:
        assert review.route_waiting(db) == 0
        assert db.query(models.ReportReviewerAvailability).count() == 0
        assert db.query(models.Report).filter(models.Report.review_assigned_to_id.isnot(None)).count() == 0
        assert 'No available' in db.get(models.Report,1).review_routing_reason


def test_available_automatically_fills_backlog_up_to_capacity(queue):
    client, sessions, tokens = queue
    response = change(client,tokens['inspector'],capacity=1)
    assert response.status_code == 200, response.text
    assert response.json()['open_reviews'] == 1 and response.json()['effective_state'] == 'at_capacity'
    with sessions() as db:
        assert db.get(models.Report,1).review_assigned_to_id == 3
        assert db.get(models.Report,2).review_assigned_to_id is None
        assert review.route_waiting(db) == 0
        db.get(models.Report,1).status = 'pending_approval'
        db.commit()
        assert review.route_waiting(db) == 1
        assert db.get(models.Report,2).review_assigned_to_id == 3
        assert db.query(gm.WorkOrder).count() == 0
        assert db.get(models.Report,2).status == 'pending'
        assert db.query(models.Notification).filter(models.Notification.official_id == 3).count() == 2


def test_away_offline_and_stale_tabs_do_not_receive_or_steal_assigned_work(queue):
    client, sessions, tokens = queue
    first = change(client,tokens['inspector'],capacity=1).json()
    away = change(client,tokens['inspector'],state='away',capacity=1)
    assert away.status_code == 200
    assert client.post(PATH+'/heartbeat',headers=tokens['inspector']).json()['state'] == 'away'
    assert client.patch(PATH,headers=tokens['inspector'],json=dict(state='available',capacity=1,expected_version=first['version'])).status_code == 409
    assert client.post(PATH+'/offline',headers=tokens['inspector']).json()['state'] == 'offline'
    with sessions() as db:
        assert review.route_waiting(db) == 0
        assert db.get(models.Report,1).review_assigned_to_id == 3
        assert db.get(models.Report,2).review_assigned_to_id is None


@pytest.mark.parametrize('expired_field', ['last_seen_at','session_expires_at'])
def test_expired_presence_is_excluded_until_fresh_authenticated_heartbeat(queue, expired_field):
    client, sessions, tokens = queue
    assert change(client,tokens['inspector'],capacity=1).status_code == 200
    with sessions() as db:
        db.get(models.Report,1).status = 'pending_approval'
        setattr(db.get(models.ReportReviewerAvailability,3),expired_field,datetime.now(timezone.utc)-timedelta(seconds=121))
        db.commit()
        assert review.route_waiting(db) == 0
    assert client.get(PATH,headers=tokens['inspector']).json()['effective_state'] == 'offline'
    renewed = client.post(PATH+'/heartbeat',headers=tokens['inspector'])
    assert renewed.status_code == 200, renewed.text
    assert renewed.json()['open_reviews'] == 1
    with sessions() as db:
        assert db.get(models.Report,2).review_assigned_to_id == 3


@pytest.mark.parametrize('role', ['owner','field','clerk'])
def test_availability_does_not_grant_validation_permissions(queue, role):
    client, _, tokens = queue
    assert client.patch(PATH,headers=tokens[role],json=dict(state='available',capacity=5,expected_version=0)).status_code == 403


def test_custom_validation_role_and_district_are_authoritative(queue):
    client, sessions, tokens = queue
    with sessions() as db:
        role = models.SystemRole(name='FAKE custom validator',capabilities={'reports':['view'],'report_review':['review']})
        db.add(role); db.flush()
        db.add(models.Official(id=20,email='validator@test.invalid',full_name='FAKE Validator',role='custom_validator',role_id=role.id,
            password_hash='test-only',is_active=True,primary_jurisdiction=[2]))
        db.commit()
    headers = {'Authorization':'Bearer '+auth.create_access_token({'sub':'validator@test.invalid'})}
    assert change(client,headers,capacity=1).json()['open_reviews'] == 0
    with sessions() as db:
        db.get(models.Report,2).barangay_id = 2; db.commit()
        assert review.route_waiting(db) == 1
        assert db.get(models.Report,2).review_assigned_to_id == 20
        assert db.get(models.Report,1).review_assigned_to_id is None


def test_access_revocation_invalidates_presence_and_needs_explicit_new_opt_in(queue):
    client, sessions, tokens = queue
    assert change(client,tokens['inspector'],capacity=1).status_code == 200
    with sessions() as db:
        db.get(models.Report,1).status = 'pending_approval'
        db.get(models.Official,3).access_version = 1; db.commit()
        assert review.route_waiting(db) == 0
    assert client.post(PATH+'/heartbeat',headers=tokens['inspector']).status_code == 401
    refreshed = {'Authorization':'Bearer '+auth.create_access_token({'sub':'inspector@test.invalid','sv':1})}
    assert client.post(PATH+'/heartbeat',headers=refreshed).json()['effective_state'] == 'offline'
    assert change(client,refreshed,capacity=1).json()['open_reviews'] == 1


def test_manual_take_and_assignment_remain_available_without_online_presence(queue):
    client, sessions, tokens = queue
    with sessions() as db:
        one, two = db.get(models.Report,1).version, db.get(models.Report,2).version
    assigned = client.post('/api/gov/report-review/1/assignment',headers=tokens['chief'],json=dict(expected_version=one,assigned_to_id=3,reason='FAKE explicit coordinator assignment.'))
    assert assigned.status_code == 200, assigned.text
    taken = client.post('/api/gov/report-review/2/take',headers=tokens['chief'],json=dict(expected_version=two))
    assert taken.status_code == 200, taken.text
    with sessions() as db:
        assert review.route_waiting(db) == 0
        assert db.get(models.Report,1).review_assignment_mode == 'manual'
        assert db.get(models.Report,2).review_assignment_mode == 'self_take'


def test_equal_load_rotates_to_longest_waiting_reviewer(queue):
    client, sessions, tokens = queue
    assert change(client,tokens['inspector'],capacity=1).status_code == 200
    with sessions() as db:
        db.get(models.Report,1).status = 'pending_approval'
        db.add(models.Official(id=7,email='second@test.invalid',full_name='FAKE Second',role='project_engineer',password_hash='test-only',is_active=True))
        db.add(models.ReportReviewerAvailability(official_id=7,state='available',capacity=1,last_seen_at=datetime.now(timezone.utc),session_expires_at=datetime.now(timezone.utc)+timedelta(hours=1)))
        db.commit()
        assert review.route_waiting(db) == 2
        assert db.get(models.Report,2).review_assigned_to_id == 7
        assert db.get(models.Report,3).review_assigned_to_id == 3


def test_concurrent_intake_cannot_overfill_one_automatic_slot(queue):
    import crud, schemas
    client, sessions, tokens = queue
    with sessions() as db:
        db.query(models.Report).update({'status':'rejected'}); db.commit()
        db.execute(text("SELECT setval(pg_get_serial_sequence('reports','id'),1000,true)")); db.commit()
    assert change(client,tokens['inspector'],capacity=1).status_code == 200
    barrier = Barrier(2)
    def create(index):
        with sessions() as db:
            barrier.wait(timeout=10)
            result = crud.create_report(db,schemas.ReportCreate(category='Roads',description=f'FAKE concurrent validation case {index}',barangay_id=1),resident_id=100)
            return result.review_assigned_to_id
    with ThreadPoolExecutor(max_workers=2) as pool:
        owners = list(pool.map(create,range(2)))
    assert owners.count(3) == 1 and owners.count(None) == 1
    with sessions() as db:
        assert availability.open_count(db,3) == 1


def test_routing_pause_retains_available_preference_without_accepting_work(queue):
    client, sessions, tokens = queue
    with sessions() as db:
        db.add(models.SystemSetting(key='report_review_routing', title='FAKE paused routing', value={'enabled':False}))
        db.commit()
    paused = change(client,tokens['inspector'])
    assert paused.status_code == 200, paused.text
    assert paused.json()['state'] == 'available'
    assert paused.json()['effective_state'] == 'routing_paused'
    assert not paused.json()['accepting_new_reviews']
    with sessions() as db:
        assert review.route_waiting(db) == 0
        db.query(models.SystemSetting).filter_by(key='report_review_routing').one().value = {'enabled':True}
        db.commit()
        assert review.route_waiting(db) == 3
