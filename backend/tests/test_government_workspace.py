"""Acceptance checks for record-backed government work and governed updates.

All persisted data is confined to the guarded disposable PostGIS fixture.
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import inspect
from unittest.mock import patch
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
import auth
from database import get_db
import gov_models as gm
import models
import gov_router
from main import app
from outbox_worker import deliver_pending
from maintenance_planning import maintenance_projection
from types import SimpleNamespace
from geoalchemy2.elements import WKTElement


@pytest.fixture
def context(clean_postgis):
    with clean_postgis() as db:
        db.add_all([models.District(id=1, name='FAKE Test district one', code='TEST1'), models.District(id=2, name='FAKE Test district two', code='TEST2')])
        db.flush()
        db.add_all([models.Barangay(id=1, name='FAKE Area one', district_id=1), models.Barangay(id=2, name='FAKE Area two', district_id=2)])
        roles = {'chief': 'city_engineer', 'clerk': 'admin_clerk', 'inspector': 'building_inspector', 'field': 'field_worker', 'other': 'field_worker', 'platform': 'system_admin'}
        for id, (name, role) in enumerate(roles.items(), 1):
            db.add(models.Official(id=id, full_name=f'FAKE {name}', email=f'{name}@test.invalid', password_hash='test-not-login', role=role, is_active=True))
        db.flush()
        # The test inspector has an explicit intake-review delegation; this is
        # separate from an inspector's default completion-verification duties.
        delegated = models.SystemRole(name='FAKE delegated review', capabilities={'report_review':['review','verify']})
        db.add(delegated)
        db.flush()
        db.get(models.Official,3).role_id = delegated.id
        db.add_all([models.Resident(id=100, full_name='FAKE Owner', email='owner@test.invalid', password_hash='test-not-login', is_active=True, is_verified=True), models.Resident(id=101, full_name='FAKE Other resident', email='resident2@test.invalid', password_hash='test-not-login', is_active=True, is_verified=True)])
        db.flush()
        for id, owner in ((1,100),(2,100),(3,101)):
            db.add(models.Report(ticket_id=f'FAKE-REPORT-{id}', resident_id=owner, category='Roads', description='FAKE road concern for integration test', status='pending', barangay_id=1, location_barangay='FAKE Area one'))
        db.commit()
    def override_db():
        with clean_postgis() as db:
            yield db
    app.dependency_overrides[get_db] = override_db
    tokens = {name: {'Authorization': f'Bearer {auth.create_access_token({"sub": name + "@test.invalid"})}'} for name in [*roles, 'owner', 'resident2']}
    yield TestClient(app), clean_postgis, tokens
    app.dependency_overrides.pop(get_db, None)


def draft(client, tokens, **values):
    body = dict(title_en='FAKE Road maintenance notice', title_fil='FAKE Abiso sa kalsada', content_en='FAKE description of an engineering inspection.', content_fil='FAKE paglalarawan ng pagsusuri sa kalsada.', category='planned_works', publication_format='advisory', channels=['web'], target_barangays=['FAKE Area one'], district_id=1)
    body.update(values)
    response = client.post('/api/gov/announcements', json=body, headers=tokens['chief'])
    assert response.status_code == 201, response.text
    return response.json()


def attach_document(client, tokens, item, **values):
    data = {'expected_version': str(item['content_version']), 'caption': 'FAKE official advisory document', 'public_safe': 'true'}
    data.update(values)
    return client.post(f'/api/gov/announcements/{item["id"]}/attachments', data=data, files={'file': ('FAKE-advisory.pdf', b'%PDF-1.4\nFAKE test document\n%%EOF', 'application/pdf')}, headers=tokens['chief'])


def test_overview_drillthrough_matches_scoped_report_and_work_queues(context):
    client, sessions, tokens = context
    with sessions() as db:
        db.get(models.Official, 1).primary_jurisdiction = [1]
        first = db.get(models.Report, 1)
        first.priority_grade = 'P5'
        second = db.get(models.Report, 2)
        second.status = 'under_review'
        second.review_assigned_to_id = 3
        second.location_barangay = None
        db.get(models.Report, 3).status = 'resolved'
        db.add(models.Report(id=4, ticket_id='FAKE-REPORT-4', resident_id=101, category='Roads', description='FAKE outside district', status='pending', barangay_id=2, location_barangay='FAKE Area two', priority_grade='P5'))
        db.add(models.Report(id=5, ticket_id='FAKE-REPORT-5', resident_id=101, category='Roads', description='FAKE closed report', status='closed', barangay_id=1, location_barangay='FAKE Area one', priority_grade='P5'))
        db.add_all([
            gm.WorkOrder(id=201, wo_number='FAKE-WO-IN', title='FAKE scoped blocker', status='blocked', district_id=1, assigned_to_id=2, report_id=1),
            gm.WorkOrder(id=202, wo_number='FAKE-WO-OUT', title='FAKE outside blocker', status='blocked', district_id=2, assigned_to_id=3, report_id=4),
            gm.WorkOrder(id=203, wo_number='FAKE-WO-DONE', title='FAKE completed work', status='completed', district_id=1, assigned_to_id=2, report_id=1),
            gm.InfrastructureAsset(asset_id='FAKE-ASSET-IN', asset_name='FAKE scoped asset', category='Road', barangay_id=1, condition_score=20),
            gm.InfrastructureAsset(asset_id='FAKE-ASSET-OUT', asset_name='FAKE outside asset', category='Road', barangay_id=2, condition_score=20),
            gm.Announcement(id=201, title_en='FAKE scoped update', content_en='FAKE scoped publication', author_id=1, status='in_review', district_id=1),
            gm.Announcement(id=202, title_en='FAKE outside update', content_en='FAKE outside publication', author_id=1, status='in_review', district_id=2),
        ])
        db.commit()

    overview_response = client.get('/api/gov/overview', headers=tokens['chief'])
    assert overview_response.status_code == 200, overview_response.text
    overview = overview_response.json()
    assert overview['totals']['open_reports'] == 2
    assert overview['totals']['urgent_reports'] == 1
    assert overview['totals']['blocked_work_orders'] == 1
    assert overview['report_intake']['period_days'] == 14
    assert overview['report_intake']['timezone'] == 'Asia/Manila'
    assert len(overview['report_intake']['series']) == 14
    assert overview['report_intake']['total'] == sum(day['count'] for day in overview['report_intake']['series']) == 4
    assert sum(stage['count'] for stage in overview['work_stages']) == overview['totals']['open_work_orders']
    assert next(stage['count'] for stage in overview['work_stages'] if stage['key'] == 'blocked') == 1
    assert overview['relationships'] == {
        'open_reports': 2, 'reports_with_current_work': 1, 'reports_without_current_work': 1,
        'current_work_orders': 1, 'current_orders_linked_to_open_reports': 1,
        'other_current_orders': 0, 'blocked_orders': 1, 'awaiting_verification': 0,
    }
    assert overview['priority_work']['P5'] == {'with_work': 1, 'without_work': 0}
    assert overview['priority_work']['unassessed'] == {'with_work': 0, 'without_work': 1}
    assert next(area for area in overview['areas'] if area['barangay'] == 'FAKE Area one')['with_work_count'] == 1
    assert [item['id'] for item in overview['asset_exceptions']] == ['FAKE-ASSET-IN']
    assert [item['id'] for item in overview['update_exceptions']] == [201]
    assert overview['review_queues'][0]['action_url'] == '/gov/reports?overview=unowned'

    selections = {'open': {1, 2}, 'unowned': {1}, 'triage': {1, 2}, 'urgent': {1}, 'unlocated': {2}, 'with_work': {1}, 'without_work': {2}, 'with_work&priority=P5': {1}, 'without_work&priority=unassessed': {2}, 'with_work&priority=unassessed': set(), 'area&area=FAKE+Area+one': {1}, 'with_work&area=FAKE+Area+one': {1}, 'without_work&area=FAKE+Area+one': set(), 'priority&priority=P5': {1}, 'priority&priority=unassessed': {2}}
    for selection, expected_ids in selections.items():
        for path, item_key in (('/api/reports', None), ('/api/gov/report-map', 'items')):
            response = client.get(f'{path}?overview={selection}', headers=tokens['chief'])
            assert response.status_code == 200, response.text
            rows = response.json() if item_key is None else response.json()[item_key]
            assert {item['id'] for item in rows} == expected_ids
    assert client.get('/api/reports?overview=unknown', headers=tokens['chief']).status_code == 422
    assert client.get('/api/reports?overview=priority&priority=invalid', headers=tokens['chief']).status_code == 422
    assert client.get('/api/reports?overview=open', headers=tokens['field']).status_code == 403

    current = client.get('/api/gov/work-order-workspace?view=current', headers=tokens['chief'])
    assert current.status_code == 200 and current.json()['total'] == 1
    assert [item['id'] for item in current.json()['items']] == [201]
    owned = client.get('/api/gov/work-order-workspace?view=current&assignee=2', headers=tokens['chief'])
    assert owned.status_code == 200 and owned.json()['total'] == 1
    outside_owner = client.get('/api/gov/work-order-workspace?view=current&assignee=3', headers=tokens['chief'])
    assert outside_owner.status_code == 200
    assert outside_owner.json()['total'] == 0
    assert outside_owner.json()['owner_filter'] is None


def test_review_routing_balances_eligible_staff_and_does_not_duplicate_or_dispatch(context):
    import report_review
    client,sessions,tokens=context
    with sessions() as db:
        db.get(models.Official,3).primary_jurisdiction=[1]
        db.add(models.Official(id=7,full_name='FAKE Second reviewer',email='reviewer2@test.invalid',password_hash='test-only',role='project_engineer',primary_jurisdiction=[1],is_active=True))
        db.add(models.Official(id=8,full_name='FAKE Suspended reviewer',email='suspended@test.invalid',password_hash='test-only',role='project_engineer',primary_jurisdiction=[1],is_active=True,is_suspended=True))
        db.add(models.Official(id=9,full_name='FAKE Other district',email='otherdistrict@test.invalid',password_hash='test-only',role='project_engineer',primary_jurisdiction=[2],is_active=True))
        db.commit()
        assert report_review.route_waiting(db)==3
        assert [r.review_assigned_to_id for r in db.query(models.Report).order_by(models.Report.id)] == [3,7,3]
        assert report_review.route_waiting(db)==0
        assert db.query(models.Notification).filter(models.Notification.official_id.isnot(None)).count()==3
        assert db.query(gm.AuditLog).filter_by(trigger_type='report_assignment').count()==3
        assert db.query(gm.WorkOrder).count()==0
        assert {r.status for r in db.query(models.Report)}=={'pending'}
        assert {r.priority_grade for r in db.query(models.Report)}=={None}


def test_review_routing_has_truthful_no_staff_and_unknown_location_states(context):
    import report_review
    client,sessions,tokens=context
    with sessions() as db:
        db.get(models.Official,3).is_active=False
        db.get(models.Report,2).barangay_id=None
        db.get(models.Report,2).location_barangay=None
        db.commit()
        assert report_review.route_waiting(db)==0
        assert db.get(models.Report,1).review_assignment_mode=='needs_routing'
        assert db.get(models.Report,2).review_routing_reason=='Location needs routing review'
        assert db.query(models.Notification).count()==0
        count=db.query(gm.AuditLog).count()
        assert report_review.route_waiting(db)==0
        assert db.query(gm.AuditLog).count()==count


def test_unroutable_old_reports_do_not_starve_later_review_tasks(context):
    import report_review
    client,sessions,tokens=context
    report_review._routing_cursor=0
    with sessions() as db:
        db.get(models.Report,1).barangay_id=None
        db.get(models.Report,1).location_barangay=None
        db.commit()
        assert report_review.route_waiting(db,limit=1)==0
        assert report_review.route_waiting(db,limit=1)==1
        assert db.get(models.Report,2).review_assigned_to_id==3


def test_legacy_barangay_labels_resolve_only_when_catalog_district_is_unambiguous(context):
    import report_review
    client,sessions,tokens=context
    with sessions() as db:
        report=db.get(models.Report,1)
        report.barangay_id=None
        assert report_review.auto_route(db,report)
        db.commit()
        assert report.barangay_id==1 and report.review_assigned_to_id==3
        assert db.query(gm.AuditLog).filter_by(trigger_type='report_routing_location').count()==1
        db.add_all([models.Barangay(id=3,name='171',district_id=1),models.Barangay(id=4,name='Barangay 171',district_id=2)])
        report2=db.get(models.Report,2)
        report2.barangay_id=None
        report2.location_barangay='171'
        db.commit()
        assert not report_review.auto_route(db,report2)
        db.commit()
        assert report2.barangay_id is None and report2.review_assigned_to_id is None


def test_new_report_is_queued_at_creation_without_approval_or_work_order(context):
    import crud,schemas
    from sqlalchemy import text
    client,sessions,tokens=context
    with sessions() as db:
        db.execute(text("SELECT setval(pg_get_serial_sequence('reports','id'),1000,true)"))
        created=crud.create_report(db,schemas.ReportCreate(category='Roads',description='FAKE new reviewable concern',barangay_id=1,location_barangay='FAKE Area one'),resident_id=100)
        assert created.review_assigned_to_id==3
        assert created.review_assignment_mode=='automatic'
        assert created.status=='pending'
        assert db.query(gm.WorkOrder).count()==0


def test_routing_changes_rollback_with_the_report_transaction(context):
    import report_review
    client,sessions,tokens=context
    with sessions() as db:
        assert report_review.auto_route(db,db.get(models.Report,1))
        db.rollback()
        assert db.get(models.Report,1).review_assigned_to_id is None
        assert db.query(gm.AuditLog).count()==0
        assert db.query(models.Notification).count()==0


def test_manual_review_assignment_is_authorized_scoped_versioned_and_tracked(context):
    client,sessions,tokens=context
    body={'expected_version':1,'assigned_to_id':3,'reason':'FAKE assign for technical review'}
    assert client.post('/api/gov/report-review/1/assignment',json=body,headers=tokens['field']).status_code==403
    assigned=client.post('/api/gov/report-review/1/assignment',json=body,headers=tokens['chief'])
    assert assigned.status_code==200,assigned.text
    assert assigned.json()['review_owner_name']=='FAKE inspector'
    assert client.post('/api/gov/report-review/1/assignment',json=body,headers=tokens['chief']).status_code==409
    docket=client.get('/api/gov/reports/1/docket',headers=tokens['inspector']).json()
    assert docket['can_grade_priority'] and 'verify' in docket['allowed_actions']
    assert docket['review_history'][0]['label']=='Review assigned to FAKE inspector'
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=[2]
        db.commit()
    assert client.post('/api/gov/report-review/1/assignment',json={**body,'expected_version':assigned.json()['version']},headers=tokens['chief']).status_code==403


def test_authorized_coordinator_can_take_unassigned_report_into_my_work(context):
    client,sessions,tokens=context
    path='/api/gov/report-review/1/take'
    body={'expected_version':1}
    docket=client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()
    assert 'take' in docket['allowed_actions']
    assert 'take' not in client.get('/api/gov/reports/1/docket',headers=tokens['clerk']).json()['allowed_actions']
    assert client.post(path,json=body,headers=tokens['clerk']).status_code==403
    assert client.post(path,json=body,headers=tokens['platform']).status_code==403
    taken=client.post(path,json=body,headers=tokens['chief'])
    assert taken.status_code==200,taken.text
    assert taken.json()['review_owner_id']==1 and taken.json()['assignment_mode']=='self_take'
    assert client.post(path,json=body,headers=tokens['chief']).status_code==409
    assert client.post(path,json={'expected_version':taken.json()['version']},headers=tokens['chief']).status_code==409
    inbox=client.get('/api/gov/operations/today',headers=tokens['chief']).json()['needs_attention']
    assert any(item['entity_type']=='report' and item['id']==1 and item['assigned_to_id']==1 for item in inbox)
    assert 'take' not in client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()['allowed_actions']
    with sessions() as db:
        audit=db.query(gm.AuditLog).filter_by(report_id=1,trigger_type='report_assignment').one()
        assert audit.actor_id==1
        assert '"mode": "self_take"' in audit.details
        assert '"previous_owner_id": null' in audit.details


def test_take_from_colleague_requires_reason_and_transfers_my_work(context):
    client,sessions,tokens=context
    assigned=client.post('/api/gov/report-review/1/assignment',json={'expected_version':1,'assigned_to_id':3,'reason':'FAKE assign delegated reviewer'},headers=tokens['chief'])
    assert assigned.status_code==200,assigned.text
    version=assigned.json()['version']
    path='/api/gov/report-review/1/take'
    assert 'take' in client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()['allowed_actions']
    missing=client.post(path,json={'expected_version':version},headers=tokens['chief'])
    assert missing.status_code==422
    assert any(item['entity_type']=='report' and item['id']==1 for item in client.get('/api/gov/operations/today',headers=tokens['inspector']).json()['needs_attention'])
    taken=client.post(path,json={'expected_version':version,'reason':'FAKE chief taking urgent technical assessment'},headers=tokens['chief'])
    assert taken.status_code==200,taken.text
    assert taken.json()['review_owner_id']==1
    assert not any(item['entity_type']=='report' and item['id']==1 for item in client.get('/api/gov/operations/today',headers=tokens['inspector']).json()['needs_attention'])
    assert any(item['entity_type']=='report' and item['id']==1 for item in client.get('/api/gov/operations/today',headers=tokens['chief']).json()['needs_attention'])
    assert client.post(path,json={'expected_version':version,'reason':'FAKE duplicate takeover'},headers=tokens['chief']).status_code==409
    history=client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()['review_history']
    assert history[0]['label']=='Review taken by FAKE chief'
    assert history[0]['previous_owner']=='FAKE inspector'
    assert history[0]['reason']=='FAKE chief taking urgent technical assessment'
    with sessions() as db:
        assert db.query(models.Notification).filter_by(official_id=3,title='Report review reassigned').count()==1


def test_take_respects_routing_area_scope_and_review_lifecycle(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.get(models.Report,1).barangay_id=None
        db.get(models.Report,1).location_barangay='FAKE unknown location'
        db.commit()
        version=db.get(models.Report,1).version
    assert client.post('/api/gov/report-review/1/take',json={'expected_version':version},headers=tokens['chief']).status_code==422
    with sessions() as db:
        report=db.get(models.Report,1)
        assert report.review_assigned_to_id is None and report.barangay_id is None
        report.barangay_id=1
        db.get(models.Official,1).primary_jurisdiction=[2]
        db.commit()
        version=db.get(models.Report,1).version
    assert client.post('/api/gov/report-review/1/take',json={'expected_version':version},headers=tokens['chief']).status_code==403
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=[1]
        db.get(models.Report,1).status='resolved'
        db.commit()
        version=db.get(models.Report,1).version
    assert 'take' not in client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()['allowed_actions']
    assert client.post('/api/gov/report-review/1/take',json={'expected_version':version},headers=tokens['chief']).status_code==409


def test_assign_only_administrative_officer_can_take_then_route_without_engineering_decisions(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(models.Official(id=7,full_name='FAKE administrative officer',email='officer@test.invalid',password_hash='test-only',role='admin_officer',is_active=True))
        db.commit()
    officer={'Authorization':f'Bearer {auth.create_access_token({"sub":"officer@test.invalid"})}'}
    docket=client.get('/api/gov/reports/2/docket',headers=officer).json()
    assert 'take' in docket['allowed_actions'] and 'verify' not in docket['allowed_actions']
    taken=client.post('/api/gov/report-review/2/take',json={'expected_version':docket['report']['version']},headers=officer)
    assert taken.status_code==200,taken.text
    inbox=client.get('/api/gov/operations/today',headers=officer).json()['needs_attention']
    task=next(item for item in inbox if item['entity_type']=='report' and item['id']==2)
    assert task['recommended_action']=='Assign an intake reviewer'
    after=client.get('/api/gov/reports/2/docket',headers=officer).json()
    assert 'verify' not in after['allowed_actions'] and after['review_operations']['review_owner_id']==7
    assert client.post('/api/gov/report-review/2/assignment',json={'expected_version':after['report']['version'],'assigned_to_id':2,'reason':'FAKE route intake to an eligible clerk'},headers=officer).status_code==200


def test_review_queue_and_priority_are_visible_in_my_work_and_bulk_operations(context):
    client,sessions,tokens=context
    unassigned=client.get('/api/gov/operations/today',headers=tokens['chief']).json()['needs_attention']
    assert not any(t['entity_type']=='report' for t in unassigned)
    assert client.get('/api/gov/reports/1/docket',headers=tokens['chief']).status_code==200
    assigned=client.post('/api/gov/report-review/1/assignment',json={'expected_version':1,'assigned_to_id':3,'reason':'FAKE allocate intake assessment'},headers=tokens['chief']).json()
    graded=client.post('/api/gov/report-review/1/priority',json={'expected_version':assigned['version'],'priority_grade':'P2','reason':'FAKE observed significant local risk'},headers=tokens['inspector'])
    assert graded.status_code==200,graded.text
    inbox=client.get('/api/gov/operations/today',headers=tokens['inspector']).json()
    tasks=[t for t in inbox['needs_attention'] if t['entity_type']=='report' and t['id']==1]
    assert len(tasks)==1 and tasks[0]['task_bucket']=='assigned_to_me'
    assert tasks[0]['assigned_to_id']==3 and tasks[0]['priority']=='P2'
    bulk=client.get('/api/gov/report-review?ids=1',headers=tokens['chief']).json()
    assert bulk['1']['priority_grade']=='P2' and bulk['1']['review_owner_id']==3
    assert client.get('/api/gov/report-review?ids=1',headers=tokens['owner']).status_code==403
    assert client.get('/api/gov/report-review?ids=1',headers=tokens['field']).json()=={}


def test_unlocated_report_requires_audited_routing_area_before_assignment(context):
    client,sessions,tokens=context
    with sessions() as db:
        report=db.get(models.Report,1)
        report.barangay_id=None
        report.location_barangay=None
        report.location_string='FAKE address requiring location review'
        db.get(models.Official,1).primary_jurisdiction=[1]
        db.commit()
    assert client.get('/api/gov/reports/1/docket',headers=tokens['chief']).status_code==403
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=None
        db.commit()
    docket=client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()
    version=docket['report']['version']
    assert 'routing_area' in docket['allowed_actions']
    assert docket['review_operations']['routing_area_id'] is None
    assert client.get('/api/gov/report-review/1/reviewers',headers=tokens['chief']).json()==[]
    assert {area['id'] for area in client.get('/api/gov/report-review/1/routing-areas',headers=tokens['chief']).json()}=={1,2}
    assert client.get('/api/gov/report-review/1/routing-areas',headers=tokens['clerk']).status_code==403
    body={'expected_version':version,'barangay_id':1,'reason':'FAKE evidence supports this routing barangay'}
    assert client.post('/api/gov/report-review/1/routing-area',json={**body,'barangay_id':999},headers=tokens['chief']).status_code==422
    assert client.post('/api/gov/report-review/1/routing-area',json={**body,'expected_version':version-1},headers=tokens['chief']).status_code==409
    confirmed=client.post('/api/gov/report-review/1/routing-area',json=body,headers=tokens['chief'])
    assert confirmed.status_code==200,confirmed.text
    assert confirmed.json()['version']>version
    with sessions() as db:
        report=db.get(models.Report,1)
        assert report.barangay_id==1 and report.review_assigned_to_id is None
        event=db.query(gm.AuditLog).filter_by(report_id=1,trigger_type='report_routing_location').one()
        assert event.actor_id==1 and 'FAKE' in event.details
    assert client.post('/api/gov/report-review/1/routing-area',json={**body,'expected_version':confirmed.json()['version']},headers=tokens['chief']).status_code==409
    assert any(person['id']==2 for person in client.get('/api/gov/report-review/1/reviewers',headers=tokens['chief']).json())
    assigned=client.post('/api/gov/report-review/1/assignment',json={'expected_version':confirmed.json()['version'],'assigned_to_id':2,'reason':'FAKE assign clerk for intake after location review'},headers=tokens['chief'])
    assert assigned.status_code==200,assigned.text
    work=client.get('/api/gov/operations/today',headers=tokens['clerk']).json()['needs_attention']
    assert any(item['entity_type']=='report' and item['id']==1 for item in work)


def test_clerk_intake_peer_transfer_and_engineering_handoff(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(models.Official(id=7,full_name='FAKE peer clerk',email='peerclerk@test.invalid',password_hash='test-only',role='admin_clerk',primary_jurisdiction=[1],is_active=True))
        db.add(models.Official(id=8,full_name='FAKE outside clerk',email='outsideclerk@test.invalid',password_hash='test-only',role='admin_clerk',primary_jurisdiction=[2],is_active=True))
        db.commit()
    peer_token={'Authorization':f'Bearer {auth.create_access_token({"sub":"peerclerk@test.invalid"})}'}
    assigned=client.post('/api/gov/report-review/1/assignment',json={'expected_version':1,'assigned_to_id':2,'reason':'FAKE assign clerk intake ownership'},headers=tokens['chief'])
    assert assigned.status_code==200,assigned.text
    with sessions() as db:
        notice=db.query(models.Notification).filter_by(official_id=2).order_by(models.Notification.id.desc()).first()
        assert notice.target_url=='/gov/my-work?selected=report:1'
        assert 'complete intake' in notice.message
    version=assigned.json()['version']
    clerk_work=client.get('/api/gov/operations/today',headers=tokens['clerk']).json()['needs_attention']
    assert any(t['id']==1 and t['entity_type']=='report' and t['task_bucket']=='assigned_to_me' for t in clerk_work)
    docket=client.get('/api/gov/reports/1/docket',headers=tokens['clerk']).json()
    assert {'peer_transfer','submit_engineering','request_info'} <= set(docket['allowed_actions'])
    assert 'verify' not in docket['allowed_actions'] and not docket['can_grade_priority']
    assert client.post('/api/gov/report-review/1/priority',json={'expected_version':version,'priority_grade':'P2','reason':'FAKE clerk cannot grade'},headers=tokens['clerk']).status_code==403
    assert client.patch('/api/reports/1/status',json={'status':'pending_approval','public_content_reviewed':True},headers={**tokens['clerk'],'If-Match':str(version)}).status_code==403
    assert {p['id'] for p in client.get('/api/gov/report-review/1/peer-clerks',headers=tokens['clerk']).json()}=={7}
    body={'expected_version':version,'assigned_to_id':8,'reason':'FAKE district mismatch transfer'}
    assert client.post('/api/gov/report-review/1/peer-transfer',json=body,headers=tokens['clerk']).status_code==422
    body['assigned_to_id']=7
    moved=client.post('/api/gov/report-review/1/peer-transfer',json=body,headers=tokens['clerk'])
    assert moved.status_code==200,moved.text
    assert client.post('/api/gov/report-review/1/peer-transfer',json=body,headers=tokens['clerk']).status_code in {403,409}
    assert not any(t['id']==1 and t['entity_type']=='report' for t in client.get('/api/gov/operations/today',headers=tokens['clerk']).json()['needs_attention'])
    assert any(t['id']==1 and t['entity_type']=='report' for t in client.get('/api/gov/operations/today',headers=peer_token).json()['needs_attention'])
    handoff=client.post('/api/gov/report-review/1/submit-engineering',json={'expected_version':moved.json()['version'],'reason':'FAKE intake reviewed; road defect needs engineering assessment'},headers=peer_token)
    assert handoff.status_code==200,handoff.text
    assert handoff.json()['review_owner_id']==1 and handoff.json()['assignment_mode']=='engineering_handoff'
    with sessions() as db:
        notice=db.query(models.Notification).filter_by(official_id=1).order_by(models.Notification.id.desc()).first()
        assert notice.target_url=='/gov/my-work?selected=report:1'
        assert 'verify public details' in notice.message
    engineer_work=client.get('/api/gov/operations/today',headers=tokens['chief']).json()['needs_attention']
    assert any(t['id']==1 and t['entity_type']=='report' and t['assigned_to_id']==1 for t in engineer_work)
    assert not any(t['id']==1 and t['entity_type']=='report' for t in client.get('/api/gov/operations/today',headers=peer_token).json()['needs_attention'])
    history=client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()['review_history']
    assert history[0]['label']=='Intake submitted to FAKE chief' and history[0]['previous_owner']=='FAKE peer clerk'


def test_assigned_rejected_report_remains_in_recent_my_work_without_new_permissions(context):
    client,sessions,tokens=context
    with sessions() as db:
        report=db.get(models.Report,1)
        report.status='rejected'
        report.review_assigned_to_id=2
        db.commit()
    inbox=client.get('/api/gov/operations/today',headers=tokens['clerk'])
    assert inbox.status_code==200,inbox.text
    record=next(row for row in inbox.json()['needs_attention'] if row['entity_type']=='report' and row['id']==1)
    assert record['task_bucket']=='recently_completed' and record['recommended_action']=='Open report history'
    docket=client.get('/api/gov/reports/1/docket',headers=tokens['clerk']).json()
    assert not {'verify','peer_transfer','submit_engineering'} & set(docket['allowed_actions'])


def test_role_families_and_process_boundaries_match_server_actions(context):
    import project_workspace
    import report_review
    import roles_service
    from government_access import can
    client,sessions,tokens=context
    with sessions() as db:
        db.add_all([
            models.Official(id=7,full_name='FAKE structural chief',email='structural@test.invalid',password_hash='test-only',role='division_chief_structural',is_active=True),
            models.Official(id=8,full_name='FAKE admin officer',email='adminofficer@test.invalid',password_hash='test-only',role='admin_officer',is_active=True),
        ])
        db.commit()
        chief=db.get(models.Official,7)
        admin_officer=db.get(models.Official,8)
        assert project_workspace.allowed(chief,'manage')
        assert report_review.permitted(chief,'assign')
        assert report_review.permitted(admin_officer,'assign')
        assert not report_review.permitted(admin_officer,'review')
        assert project_workspace.allowed(db.get(models.Official,2),'view')
        assert not project_workspace.allowed(db.get(models.Official,2),'manage')
        assert project_workspace.allowed(db.get(models.Official,6),'view')
        assert not project_workspace.allowed(db.get(models.Official,6),'manage')
        assert not report_review.permitted(db.get(models.Official,6),'assign')
        assert not report_review.permitted(db.get(models.Official,6),'review')
        assert not report_review.permitted(db.get(models.Official,6),'verify')
        platform=db.get(models.Official,6)
        assert can(platform,'announcements','view')
        assert can(platform,'announcements','create')
        assert not can(platform,'announcements','approve')
        assert roles_service.has_permission(db,platform,'records','view')
        assert not roles_service.has_permission(db,platform,'reports','detail')
        assert not roles_service.has_permission(db,platform,'analytics','export')
        assert not roles_service.has_permission(db,platform,'procurement','manage')
        platform_role=models.SystemRole(name='FAKE platform domain boundary',capabilities={'admin':['manage'],'analytics':['view']})
        db.add(platform_role);db.flush();platform.role_id=platform_role.id;db.flush();db.expire(platform,['role_ref'])
        assert roles_service.has_permission(db,platform,'analytics','view')
        assert not roles_service.has_permission(db,platform,'analytics','export')
        assert not roles_service.has_permission(db,platform,'reports','detail')
    chief_token={'Authorization':f'Bearer {auth.create_access_token({"sub":"structural@test.invalid"})}'}
    officer_token={'Authorization':f'Bearer {auth.create_access_token({"sub":"adminofficer@test.invalid"})}'}
    assert client.get('/api/reports',headers=chief_token).status_code==200
    assert client.get('/api/gov/navigation',headers=chief_token).json()['modules'].count('projects')==1
    assert client.get('/api/gov/report-review/1/reviewers',headers=tokens['platform']).status_code==403
    assigned=client.post('/api/gov/report-review/1/assignment',json={'expected_version':1,'assigned_to_id':2,'reason':'FAKE administrative intake ownership'},headers=officer_token)
    assert assigned.status_code==200,assigned.text
    assert client.post('/api/gov/report-review/1/priority',json={'expected_version':assigned.json()['version'],'priority_grade':'P2','reason':'FAKE unauthorized technical grade'},headers=officer_token).status_code==403
    assert client.post('/api/gov/project-workspace',json={'title':'FAKE clerk project','description':'FAKE clerk must not coordinate project','requesting_party':'FAKE office','barangay_id':1,'reason':'FAKE unauthorized project creation'},headers=tokens['clerk']).status_code==403


def test_project_engineer_reviews_then_hands_off_for_city_verification(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(models.Official(id=7,full_name='FAKE project engineer',email='projectengineer@test.invalid',password_hash='test-only',role='project_engineer',is_active=True))
        db.commit()
    engineer_token={'Authorization':f'Bearer {auth.create_access_token({"sub":"projectengineer@test.invalid"})}'}
    assigned=client.post('/api/gov/report-review/1/assignment',json={'expected_version':1,'assigned_to_id':7,'reason':'FAKE assign preliminary engineering review'},headers=tokens['chief'])
    assert assigned.status_code==200,assigned.text
    docket=client.get('/api/gov/reports/1/docket',headers=engineer_token).json()
    assert 'submit_engineering' in docket['allowed_actions'] and 'verify' not in docket['allowed_actions']
    assert client.patch('/api/reports/1/status',json={'status':'pending_approval','public_content_reviewed':True},headers={**engineer_token,'If-Match':str(assigned.json()['version'])}).status_code==403
    handoff=client.post('/api/gov/report-review/1/submit-engineering',json={'expected_version':assigned.json()['version'],'reason':'FAKE evidence reviewed; City Engineer should verify public details'},headers=engineer_token)
    assert handoff.status_code==200,handoff.text
    assert handoff.json()['review_owner_id']==1
    assert 'verify' in client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()['allowed_actions']


def test_priority_grade_is_human_reviewed_and_p0_needs_owner_and_review_date(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.get(models.Report,1).ai_urgency='critical'
        db.commit()
    base={'expected_version':2,'priority_grade':'P0','reason':'FAKE uncertain defect needs monitoring'}
    # Unowned review cannot be parked in P0, regardless of AI urgency.
    before=client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()['report']['version']
    assert client.post('/api/gov/report-review/1/priority',json={**base,'expected_version':before,'next_review_at':(datetime.now(timezone.utc)+timedelta(days=5)).isoformat()},headers=tokens['chief']).status_code==422
    assigned=client.post('/api/gov/report-review/1/assignment',json={'expected_version':before,'assigned_to_id':3,'reason':'FAKE monitoring owner required'},headers=tokens['chief']).json()
    assert client.post('/api/gov/report-review/1/priority',json={**base,'expected_version':assigned['version']},headers=tokens['inspector']).status_code==422
    assert client.post('/api/gov/report-review/1/priority',json={**base,'expected_version':assigned['version'],'next_review_at':(datetime.now(timezone.utc)-timedelta(days=1)).isoformat()},headers=tokens['inspector']).status_code==422
    saved=client.post('/api/gov/report-review/1/priority',json={**base,'expected_version':assigned['version'],'next_review_at':(datetime.now(timezone.utc)+timedelta(days=5)).isoformat()},headers=tokens['inspector'])
    assert saved.status_code==200,saved.text
    assert saved.json()['priority_reviewed_by']=='FAKE inspector'
    with sessions() as db:
        report=db.get(models.Report,1)
        assert report.status=='pending' and report.ai_urgency=='critical'
        assert db.query(gm.AuditLog).filter_by(trigger_type='report_priority').count()==1
        report.status='resolved'
        db.commit()
        closed_version=report.version
    closed=client.post('/api/gov/report-review/1/priority',json={**base,'expected_version':closed_version,'next_review_at':(datetime.now(timezone.utc)+timedelta(days=5)).isoformat()},headers=tokens['inspector'])
    assert closed.status_code==409


def test_other_reviewers_cannot_grade_or_verify_someone_elses_report(context):
    client,sessions,tokens=context
    body={'expected_version':1,'priority_grade':'P4','reason':'FAKE severe hazard assessment'}
    assert client.post('/api/gov/report-review/1/priority',json=body,headers=tokens['inspector']).status_code==403
    assert client.patch('/api/reports/1/status',json={'status':'pending_approval','public_content_reviewed':True},headers=tokens['inspector']).status_code==403


def test_immediate_response_grade_is_highest_without_automatic_dispatch(context):
    client,sessions,tokens=context
    for report_id,grade in ((1,'P1'),(2,'P5')):
        assigned=client.post(f'/api/gov/report-review/{report_id}/assignment',json={'expected_version':1,'assigned_to_id':3,'reason':'FAKE route evidence assessment'},headers=tokens['chief']).json()
        response=client.post(f'/api/gov/report-review/{report_id}/priority',json={'expected_version':assigned['version'],'priority_grade':grade,'reason':'FAKE documented impact assessment'},headers=tokens['inspector'])
        assert response.status_code==200,response.text
        assert response.json()['priority_policy_version']=='p0-p5-ascending-v2'
    tasks=client.get('/api/gov/operations/today',headers=tokens['inspector']).json()['needs_attention']
    assert [t['id'] for t in tasks if t['entity_type']=='report']==[2,1]
    with sessions() as db:
        assert db.query(gm.WorkOrder).count()==0
        assert db.get(models.Report,2).status=='pending'
    invalid=client.post('/api/gov/report-review/2/priority',json={'expected_version':3,'priority_grade':'P6','reason':'FAKE invalid severity'},headers=tokens['inspector'])
    assert invalid.status_code==422


def test_map_reference_is_detailed_valid_clipped_and_separate_from_jurisdiction(context):
    from sqlalchemy import text
    from map_reference import sync_reference_layers
    client,sessions,tokens=context
    assert client.get('/api/geo/map-reference').status_code==503
    with sessions() as db:
        jurisdiction_before=db.execute(text('SELECT count(*) FROM city_boundaries')).scalar()
        sync_reference_layers(db)
        assert db.execute(text("SELECT count(*) FROM map_reference_features WHERE layer='city'")).scalar()==2
        assert db.execute(text("SELECT sum(ST_NPoints(geom)) FROM map_reference_features WHERE layer='city'")).scalar()==1245
        assert db.execute(text('SELECT bool_and(ST_IsValid(geom) AND NOT ST_IsEmpty(geom)) FROM map_reference_features')).scalar()
        # Clipping removes the old barangay overhangs without changing geofencing.
        assert db.execute(text("WITH city AS (SELECT ST_UnaryUnion(ST_Collect(geom)) g FROM map_reference_features WHERE layer='city') SELECT max(ST_Area(ST_Difference(geom,city.g))) FROM map_reference_features CROSS JOIN city WHERE layer='barangay'")).scalar()<1e-12
        before=db.execute(text('SELECT feature_id,updated_at FROM map_reference_features ORDER BY feature_id')).all()
        sync_reference_layers(db)
        assert db.execute(text('SELECT feature_id,updated_at FROM map_reference_features ORDER BY feature_id')).all()==before
        assert db.execute(text('SELECT count(*) FROM city_boundaries')).scalar()==jurisdiction_before
        assert db.query(models.Report).count()==3
    response=client.get('/api/geo/map-reference')
    assert response.status_code==200,response.text
    payload=response.json()
    assert payload['type']=='FeatureCollection'
    assert len(payload['features'])>=180
    assert {f['properties']['sector'] for f in payload['features'] if f['properties']['layer']=='city'}=={'North','South'}


def test_scale_migration_preserves_old_meanings_and_audits_conversion(context):
    from sqlalchemy import text
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from pathlib import Path
    import importlib.util
    client,sessions,tokens=context
    path=Path(__file__).parents[1]/'alembic/versions/12e7a9b1c543_ascending_severity_and_map_reference.py'
    spec=importlib.util.spec_from_file_location('severity_migration_test',path)
    migration=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    with sessions() as db:
        # A transaction-local isolated schema exercises the actual migration SQL.
        # The surrounding guarded fixture only connects to the disposable database.
        db.execute(text('CREATE SCHEMA severity_migration_check'))
        db.execute(text('SET LOCAL search_path TO severity_migration_check,public'))
        db.execute(text("CREATE TABLE reports(id integer PRIMARY KEY,priority_grade text,version integer,CONSTRAINT ck_report_priority_grade CHECK(priority_grade IN ('P1','P2','P3','P4','P5')))"))
        db.execute(text('CREATE TABLE audit_logs(trigger_type text,report_id integer,actor_role text,action text,details text,created_at timestamptz)'))
        db.execute(text("INSERT INTO reports VALUES (1,'P1',1),(2,'P2',1),(3,'P3',1),(4,'P4',1),(5,'P5',1),(6,NULL,1)"))
        with Operations.context(MigrationContext.configure(db.connection())):
            migration.upgrade()
        assert db.execute(text('SELECT priority_grade FROM reports ORDER BY id')).scalars().all()==['P4','P3','P2','P1','P0',None]
        assert db.execute(text("SELECT count(*) FROM audit_logs WHERE trigger_type='report_priority_scale_change'")).scalar()==5
        assert db.execute(text('SELECT version FROM reports ORDER BY id')).scalars().all()==[2,2,2,2,2,1]
        db.rollback()


def test_asset_registration_preserves_missing_and_zero_condition(context):
    client,sessions,tokens=context
    for code,score,tier in [('FAKE-UNKNOWN',None,'unknown'),('FAKE-ZERO',0,'critical')]:
        response=client.post('/api/gov/assets',json={'asset_id':code,'asset_name':'FAKE test drainage','category':'Drainage','barangay_id':1,'condition_score':score},headers=tokens['chief'])
        assert response.status_code==200,response.text
        assert response.json()['condition_score']==score
        assert response.json()['condition_tier']==tier
        assert response.json()['design_life'] is None
    stats=client.get('/api/gov/assets/stats',headers=tokens['chief']).json()
    assert stats['categories']['Drainage']['condition_breakdown']['unknown']==1
    assert stats['overall_avg_condition']==0
    assert client.get('/api/gov/asset-workspace?condition=unknown',headers=tokens['chief']).json()['total']==1
    assert client.post('/api/gov/assets',json={'asset_id':'FAKE-INVALID','asset_name':'FAKE invalid','category':'Roads','condition_score':101},headers=tokens['chief']).status_code==422


def test_condition_assessment_is_scoped_authorized_audited_and_conflict_safe(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(gm.InfrastructureAsset(asset_id='FAKE-ASSESS',asset_name='FAKE assessment asset',category='Roads',barangay_id=1,condition_score=60))
        db.commit()
    payload={'condition_score':0,'expected_condition_score':60,'notes':'FAKE inspected severe deterioration'}
    url='/api/gov/assets/FAKE-ASSESS/inspections'
    assert client.post(url,json=payload,headers=tokens['clerk']).status_code==403
    assert client.post(url,json=payload,headers=tokens['owner']).status_code==403
    saved=client.post(url,json=payload,headers=tokens['inspector'])
    assert saved.status_code==200,saved.text
    assert saved.json()['condition_score']==0
    assert client.post(url,json=payload,headers=tokens['inspector']).status_code==409
    detail=client.get('/api/gov/assets/FAKE-ASSESS',headers=tokens['chief']).json()
    assert len(detail['condition_assessments'])==1
    assert detail['condition_assessments'][0]['actor']=='FAKE inspector'
    assert detail['condition_assessments'][0]['previous_score']==60
    with sessions() as db:
        db.get(models.Official,3).primary_jurisdiction=[2]
        db.commit()
        assert db.query(gm.AuditLog).filter_by(trigger_type='asset_condition').count()==1
    assert client.post(url,json={**payload,'expected_condition_score':0},headers=tokens['inspector']).status_code==403
    assert client.get('/api/gov/assets/FAKE-ASSESS',headers=tokens['inspector']).status_code==403
    assert client.get('/api/gov/asset-workspace',headers=tokens['inspector']).json()['total']==0
    assert client.get('/api/gov/asset-permissions',headers=tokens['inspector']).json()['barangays']==[{'id':2,'name':'FAKE Area two'}]


def test_work_order_workspace_paginates_prioritizes_open_work_and_preserves_scope(context):
    client,sessions,tokens=context
    with sessions() as db:
        for index in range(36):
            db.add(gm.WorkOrder(wo_number=f'FAKE-PAGED-{index}',title=f'FAKE queue work {index}',status='open' if index==0 else 'completed',priority='normal',district_id=1,assigned_to_id=4))
        db.add(gm.WorkOrder(wo_number='FAKE-OTHER-SCOPE',title='FAKE unrelated district',status='open',priority='normal',district_id=2,assigned_to_id=5))
        db.get(models.Official,4).primary_jurisdiction=[1]
        db.commit()
    first=client.get('/api/gov/work-order-workspace',headers=tokens['chief'])
    assert first.status_code==200,first.text
    data=first.json()
    assert data['total']==37 and len(data['items'])==15 and data['counts']['open']==2
    assert data['items'][0]['status']=='open' and data['items'][1]['status']=='open'
    second=client.get('/api/gov/work-order-workspace?page=2',headers=tokens['chief']).json()
    assert not {row['id'] for row in data['items']} & {row['id'] for row in second['items']}
    assert client.get('/api/gov/work-order-workspace?view=open',headers=tokens['chief']).json()['total']==2
    assert client.get('/api/gov/work-order-workspace?view=invalid',headers=tokens['chief']).status_code==422
    own=client.get('/api/gov/work-order-workspace',headers=tokens['field']).json()
    assert own['total']==36 and own['counts']['open']==1 and not own['can_create']
    assert client.get('/api/gov/work-order-workspace',headers=tokens['owner']).status_code==403


def test_work_order_action_projection_agrees_with_ownership_and_independent_review(context):
    client,sessions,tokens=context
    with sessions() as db:
        work=gm.WorkOrder(wo_number='FAKE-ACTIONS',title='FAKE assigned work',status='assigned',priority='normal',assigned_to_id=4,district_id=1)
        db.add(work);db.commit();id=work.id
    url=f'/api/gov/work-order-actions/{id}'
    assert set(client.get(url,headers=tokens['field']).json()['allowed_actions'])=={'start','block'}
    assert client.get(url,headers=tokens['other']).status_code==403
    with sessions() as db:
        db.get(gm.WorkOrder,id).status='completed_pending_review';db.commit()
    assert 'verify' not in client.get(url,headers=tokens['field']).json()['allowed_actions']
    assert client.get(url,headers=tokens['inspector']).json()['allowed_actions']==['verify']
    with sessions() as db:
        db.get(models.Official,3).primary_jurisdiction=[2];db.commit()
    assert client.get(url,headers=tokens['inspector']).status_code==403
    assert client.get(f'/api/gov/work-orders/{id}/inspections',headers=tokens['inspector']).status_code==403
    assert client.post(f'/api/gov/work-orders/{id}/verify',json={'passed':False,'notes':'FAKE out-of-scope inspection must not be accepted'},headers=tokens['inspector']).status_code==403


def test_editorial_details_are_validated_and_released_as_a_snapshot(context):
    client, sessions, tokens = context
    details = dict(summary_en='FAKE brief introduction', summary_fil='FAKE maikling buod', issuing_office='FAKE test office', effective_from='2026-10-25T01:00:00Z', effective_until='2026-10-25T03:00:00Z', action_en='FAKE use the alternative route')
    item = draft(client, tokens, publication_details=details)
    for status in ('in_review', 'approved', 'published'): item = transition(client, tokens, item, status)
    public = client.get(f'/api/announcements/{item["id"]}').json()
    assert public['publication_details']['summary_en'] == details['summary_en']
    assert public['publication_details']['action_en'] == details['action_en']
    invalid = client.post('/api/gov/announcements', json=dict(title_en='FAKE notice', content_en='FAKE notice text.', publication_details={**details, 'effective_until':'2026-10-24T01:00:00Z'}), headers=tokens['chief'])
    assert invalid.status_code == 422


def test_registered_government_api_has_no_duplicate_method_paths():
    from fastapi.routing import APIRoute
    seen=set()
    for route in app.routes:
        if not isinstance(route,APIRoute) or not route.path.startswith(('/api/gov','/api/admin')): continue
        for method in route.methods:
            key=(method,route.path)
            assert key not in seen,f'Duplicate government route: {key}'
            seen.add(key)


@pytest.mark.parametrize('method,path,payload,multipart',[
    ('POST','/api/news',{'category':'Advisories','headline':'FAKE unsafe legacy publication','excerpt':'FAKE unpublished content'},True),
    ('PUT','/api/news/1',{'headline':'FAKE unreviewed overwrite'},True),
    ('DELETE','/api/news/1',None,False),
    ('POST','/api/advisories',{'department':'FAKE office','title':'FAKE notice','description':'FAKE unpublished advisory','priority':'normal','category':'Infrastructure'},False),
    ('DELETE','/api/advisories/1',None,False),
    ('POST','/api/gov/advisories',{'title':'FAKE notice','description':'FAKE unpublished advisory'},False),
    ('DELETE','/api/gov/advisories/1',None,False),
])
def test_legacy_publication_writes_cannot_skip_review_or_delete_history(context,method,path,payload,multipart):
    client,sessions,tokens=context
    kwargs=({'data':payload} if multipart else {'json':payload}) if payload else {}
    assert client.request(method,path,**kwargs).status_code==401
    assert client.request(method,path,headers=tokens['owner'],**kwargs).status_code==403
    response=client.request(method,path,headers=tokens['chief'],**kwargs)
    assert response.status_code==410,response.text
    with sessions() as db:
        assert db.query(models.Advisory).count()==0
        assert db.query(gm.Announcement).count()==0
        assert db.query(models.Notification).count()==0


def test_legacy_document_routes_share_scope_and_hide_storage_paths(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.get(models.Official,6).primary_jurisdiction=[1]
        db.add_all([gm.WorkOrder(id=81,wo_number='FAKE-DOC-IN',title='FAKE permitted work',district_id=1),gm.WorkOrder(id=82,wo_number='FAKE-DOC-OUT',title='FAKE other district',district_id=2)])
        db.flush()
        for id,work_id in [(1,81),(2,82)]:
            db.add(gm.SystemDocument(id=id,file_name=f'FAKE-{id}.pdf',file_path=f'C:/private-storage/FAKE-{id}.pdf',file_size_bytes=100,sha256_hash=f'FAKE-{id}',document_type='survey_report',target_model='WorkOrder',target_id=work_id,uploader_id=6,confidentiality='Restricted'))
        db.commit()
    headers=tokens['platform']
    for path in ['/api/gov/documents/target/WorkOrder/81','/api/gov/documents','/api/gov/records','/api/gov/document-registry']:
        response=client.get(path,headers=headers)
        assert response.status_code==200,response.text
        data=response.json()
        assert len(data)==1 and data[0]['id']==1
        assert 'file_path' not in data[0] and 'metadata_json' not in data[0]
        assert data[0]['download_url']=='/api/gov/documents/get/1'
    registry=client.get('/api/gov/documents/registry',headers=headers).json()
    assert registry['total']==1 and 'file_path' not in registry['documents'][0]
    assert client.get('/api/gov/documents/target/WorkOrder/82',headers=headers).json()==[]
    counts=client.get('/api/gov/documents/registry/counts',headers=headers).json()
    assert counts['by_target_model']['WorkOrder']==1 and counts['by_document_type']['survey_report']==1
    response=client.patch('/api/gov/documents/2/legal-hold',json={'legal_hold':True,'reason':'FAKE protected record hold'},headers=headers)
    assert response.status_code==403,response.text
    with sessions() as db:
        assert not db.get(gm.SystemDocument,2).legal_hold
        assert db.query(gm.AuditLog).filter_by(trigger_type='document_legal_hold').count()==0


def test_legacy_report_and_timeline_queries_respect_district_scope(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=[1]
        db.get(models.Report,2).barangay_id=2
        db.get(models.Report,3).status='resolved'
        db.add_all([gm.ProcessTimeline(report_id=1,status='pending',actor_id=1,is_public=False,note='FAKE permitted history'),gm.ProcessTimeline(report_id=2,status='pending',actor_id=1,is_public=False,note='FAKE other district history')])
        db.commit()
    assert {r['id'] for r in client.get('/api/gov/reports?status=all',headers=tokens['chief']).json()}=={1,3}
    assert {r['id'] for r in client.get('/api/gov/reports-archive',headers=tokens['chief']).json()}=={3}
    timeline=client.get('/api/gov/timeline',headers=tokens['chief'])
    assert timeline.status_code==200,timeline.text
    assert {row['report_id'] for row in timeline.json()}=={1}
    assert client.get('/api/gov/timeline/report/2',headers=tokens['chief']).status_code==403
    assert client.get('/api/gov/timeline/report/1',headers=tokens['chief']).status_code==200


def test_project_and_inspection_endpoints_preserve_scope_on_read_and_write(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=[1]
        for id in (1,2):
            db.add(gm.ProjectRequest(id=id,proj_number=f'FAKE-PROJECT-{id}',title=f'FAKE project {id}',description='FAKE scoped planning record',requesting_party='FAKE office',district_id=id,barangay_id=id,source_report_id=1 if id==1 else None))
            db.add(gm.OBOInspection(id=id,obo_number=f'FAKE-OBO-{id}',applicant_name=f'FAKE applicant {id}',property_address='FAKE test address',district_id=id,barangay_id=id))
        db.add(gm.WorkOrder(id=90,wo_number='FAKE-OUTSIDE-EDIT',title='FAKE protected work',status='open',district_id=2,assigned_to_id=4))
        db.commit()
    headers=tokens['chief']
    for path in ['/api/gov/projects','/api/gov/obo']:
        response=client.get(path,headers=headers)
        assert response.status_code==200,response.text
        assert {row['id'] for row in response.json()}=={1}
    assert client.get('/api/gov/reports/1/project-mapping',headers=headers).json()['id']==1
    for path in ['/api/gov/projects/2','/api/gov/obo/2','/api/gov/timeline/project/2']:
        assert client.get(path,headers=headers).status_code==403
    mutations=[
        ('PATCH','/api/gov/projects/2',{'title':'FAKE unauthorized edit'}),
        ('PATCH','/api/gov/projects/2/advance',{'status':'survey_in_progress'}),
        ('PATCH','/api/gov/obo/2',{'findings':'FAKE unauthorized findings'}),
        ('PATCH','/api/gov/obo/2/technical-review',{'department':'civil','status':'approved','remarks':'FAKE engineering review notes'}),
        ('PATCH','/api/gov/obo/2/appeal',{'appeal_evidence_url':'/FAKE/evidence.pdf'}),
        ('PATCH','/api/gov/obo/2/order-of-payment',{'fee':1}),
        ('PATCH','/api/gov/work-orders/90',{'title':'FAKE unauthorized work edit'}),
        ('PATCH','/api/gov/work-orders/90/status',{'status':'assigned'}),
        ('POST','/api/gov/work-orders/90/approval',{'action':'approve'}),
        ('POST','/api/gov/work-orders/90/promote',None),
    ]
    for method,path,body in mutations:
        response=client.request(method,path,headers=headers,**({'json':body} if body else {}))
        assert response.status_code==403,(path,response.text)
    with sessions() as db:
        assert db.get(gm.WorkOrder,90).status=='open'
        assert db.get(gm.ProjectRequest,2).title=='FAKE project 2'
        assert db.get(gm.OBOInspection,2).findings is None
        assert db.query(gm.AuditLog).count()==0


def test_new_operational_records_reconcile_lookup_ids_before_scope_check(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=[1];db.commit()
    headers=tokens['chief']
    body={'title':'FAKE scoped project','description':'FAKE planning scope','requesting_party':'FAKE requester','barangay_id':1}
    created=client.post('/api/gov/projects',json=body,headers=headers)
    assert created.status_code==200,created.text
    assert created.json()['district_id']==1
    assert client.post('/api/gov/projects',json={**body,'district_id':2},headers=headers).status_code==422
    assert client.post('/api/gov/projects',json={**body,'barangay_id':2},headers=headers).status_code==403
    assert client.post('/api/gov/obo',json={'applicant_name':'FAKE applicant','property_address':'FAKE location','barangay_id':2},headers=headers).status_code==403


def test_advisory_drafting_is_scoped_and_never_publishes(context,monkeypatch):
    import main
    client,sessions,tokens=context
    monkeypatch.setattr(main.gemini_service,'generate_advisory_content',lambda facts:{'title':'FAKE draft','body':'FAKE generated text'})
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=[2];db.commit()
    assert client.post('/api/advisories/generate/1',headers=tokens['chief']).status_code==403
    response=client.post('/api/advisories/generate/1',headers=tokens['platform'])
    assert response.status_code==200,response.text
    assert response.json()['review_required'] and not response.json()['published']
    with sessions() as db:
        assert db.query(models.Advisory).count()==0 and db.query(gm.Announcement).count()==0


def test_publication_documents_are_private_versioned_and_scope_checked(context, tmp_path, monkeypatch):
    import publication_files
    monkeypatch.setattr(publication_files, 'ROOT', tmp_path)
    client, sessions, tokens = context
    item = draft(client, tokens)
    assert attach_document(client, tokens, item, public_safe='false').status_code == 422
    response = attach_document(client, tokens, item)
    assert response.status_code == 200, response.text
    saved = response.json()
    file = saved['attachments'][0]
    assert saved['content_version'] == 2
    assert 'private_publications' not in str(file)
    assert client.get(file['url']).status_code == 404
    private_url = f'/api/gov/announcements/{item["id"]}/attachments/{file["id"]}'
    assert client.get(private_url, headers=tokens['chief']).status_code == 200
    assert client.get(private_url, headers=tokens['owner']).status_code == 403
    assert attach_document(client, tokens, item).status_code == 409
    with sessions() as db:
        db.get(models.Official, 1).primary_jurisdiction = [2]
        db.commit()
    assert client.get(private_url, headers=tokens['chief']).status_code == 403


def test_release_documents_remain_immutable_through_correction_then_revoke(context, tmp_path, monkeypatch):
    import publication_files
    monkeypatch.setattr(publication_files, 'ROOT', tmp_path)
    client, sessions, tokens = context
    item = attach_document(client, tokens, draft(client, tokens)).json()
    for status in ('in_review','approved','published'): item = transition(client, tokens, item, status)
    file = item['attachments'][0]
    response = client.get(file['url'])
    assert response.status_code == 200
    assert response.headers['content-type'] == 'application/pdf'
    assert response.headers['content-disposition'].startswith('inline')
    assert response.headers['x-content-type-options'] == 'nosniff'
    assert attach_document(client, tokens, item).status_code == 409
    correction = client.post(f'/api/gov/announcements/{item["id"]}/corrections', json={'expected_version':item['content_version'],'correction_summary':'FAKE document withdrawn from next release','reason':'FAKE replace the old supporting notice'}, headers=tokens['chief']).json()
    removed = client.delete(f'/api/gov/announcements/{item["id"]}/attachments/{file["id"]}?expected_version={correction["content_version"]}', headers=tokens['chief'])
    assert removed.status_code == 200, removed.text
    assert client.get(file['url']).status_code == 200
    correction = removed.json()
    for status in ('in_review','approved','published'): correction = transition(client,tokens,correction,status)
    assert client.get(file['url']).status_code == 404


def test_withdrawal_blocks_public_document_bytes(context, tmp_path, monkeypatch):
    import publication_files
    monkeypatch.setattr(publication_files, 'ROOT', tmp_path)
    client, sessions, tokens = context
    item = attach_document(client, tokens, draft(client,tokens)).json()
    for status in ('in_review','approved','published'): item = transition(client,tokens,item,status)
    url = item['attachments'][0]['url']
    assert client.get(url).status_code == 200
    response = client.patch(f'/api/gov/announcements/{item["id"]}/status', json={'expected_version':item['content_version'],'status':'withdrawn','withdrawal_reason':'FAKE this advisory is superseded'}, headers=tokens['chief'])
    assert response.status_code == 200
    assert client.get(url).status_code == 404


def test_document_upload_rejects_active_web_files_and_mismatched_types(context, tmp_path, monkeypatch):
    import publication_files
    monkeypatch.setattr(publication_files, 'ROOT', tmp_path)
    client, sessions, tokens = context
    item = draft(client,tokens)
    for name, body in [('active.html',b'<script>alert(1)</script>'),('fake.pdf',b'<html>not a PDF</html>'),('fake.png',b'%PDF-1.4')]:
        response = client.post(f'/api/gov/announcements/{item["id"]}/attachments', data={'expected_version':1,'caption':'FAKE uploaded file','public_safe':'true'}, files={'file':(name,body,'application/octet-stream')}, headers=tokens['chief'])
        assert response.status_code == 422, response.text
    assert list(tmp_path.iterdir()) == []


def test_visible_report_changes_notify_claimed_owner_once_but_private_notes_do_not(context):
    import gov_crud
    client, sessions, tokens = context
    with sessions() as db:
        db.get(models.Report, 1).claimed_by_user_id = 101
        gov_crud._append_timeline(db, status='reviewed', report_id=1, is_public=False, note='FAKE private internal note')
        db.commit()
        assert db.query(gm.OutboxEvent).count() == 0
        gov_crud._sync_report_status(db, 1, 'pending_approval', 1, 'city_engineer')
        gov_crud._append_timeline(db, status='reviewed', report_id=1, note='FAKE additional same-command public entry')
        db.commit()
        assert db.query(gm.OutboxEvent).count() == 1
        assert deliver_pending(db) == 1
        assert deliver_pending(db) == 0
        notice = db.query(models.Notification).one()
        assert notice.resident_id == 101
        assert notice.target_url == '/dashboard?tab=reports&reportId=1'


def test_reviewed_related_report_changes_notify_privately_without_other_report_details(context):
    import gov_crud
    client, sessions, tokens = context
    item = released(context)
    with sessions() as db:
        gov_crud._sync_report_status(db, 1, 'pending_approval', 1, 'city_engineer')
        db.commit()
        own = db.query(gm.OutboxEvent).filter_by(event_type='resident_in_app_notification').one()
        related = db.query(gm.OutboxEvent).filter_by(event_type='publication_related_report_notification').one()
        assert own.payload['resident_id'] == 100 and related.payload['resident_id'] == 101
        assert related.payload['target_url'] == f'/updates/{item["id"]}'
        assert 'FAKE-REPORT-1' not in related.payload['message']
        assert 'road concern' not in related.payload['message']
        assert deliver_pending(db) == 2
        assert deliver_pending(db) == 0


def test_unreviewed_candidates_never_receive_related_report_change_notices(context):
    import gov_crud
    client, sessions, tokens = context
    item = draft(client,tokens,report_associations_input=[dict(report_id=1,association_type='confirmed_coverage',basis_reason='FAKE reviewed coverage'),dict(report_id=3,association_type='candidate')])
    for status in ('in_review','approved','published'): item = transition(client,tokens,item,status)
    with sessions() as db:
        gov_crud._sync_report_status(db,1,'pending_approval',1,'city_engineer')
        db.commit()
        assert db.query(gm.OutboxEvent).filter_by(event_type='publication_related_report_notification').count() == 0


def test_map_docket_actions_use_authoritative_status_versions_and_scope(context):
    client, sessions, tokens = context
    platform = client.get('/api/gov/reports/1/docket',headers=tokens['platform'])
    assert platform.status_code == 200 and platform.json()['allowed_actions'] == []
    response = client.get('/api/gov/reports/1/docket',headers=tokens['chief'])
    assert response.status_code == 200, response.text
    data = response.json()
    assert set(data['allowed_actions']) == {'verify','request_info','take'}
    assert client.patch('/api/reports/1/status',json={'status':'pending_approval','public_content_reviewed':True},headers={**tokens['platform'],'If-Match':str(data['report']['version'])}).status_code == 403
    command = {**tokens['chief'],'If-Match':str(data['report']['version']),'Idempotency-Key':'fake-map-verify-123'}
    verified = client.patch('/api/reports/1/status',json={'status':'pending_approval','public_content_reviewed':True},headers=command)
    assert verified.status_code == 200, verified.text
    assert client.patch('/api/reports/1/status',json={'status':'pending_approval','public_content_reviewed':True},headers=command).status_code == 200
    next_data = client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()
    assert 'approve' in next_data['allowed_actions'] and 'verify' not in next_data['allowed_actions']
    with sessions() as db:
        # Status transition and public-detail review are separate recorded actions;
        # replaying the same command must not add another copy of either.
        timeline = db.query(gm.ProcessTimeline).filter_by(report_id=1).all()
        assert len([entry for entry in timeline if entry.status == 'pending_approval']) == 1
        assert len([entry for entry in timeline if entry.status == 'public_details_approved']) == 1
        assert db.query(gm.OutboxEvent).filter_by(event_type='resident_in_app_notification').count() == 1
        db.get(models.Official,1).primary_jurisdiction=[2]
        db.commit()
    assert client.get('/api/gov/reports/1/docket',headers=tokens['chief']).status_code == 403
    assert client.post('/api/gov/reports/1/approve-for-work',json={'reason':'FAKE reviewed evidence'},headers=tokens['chief']).status_code == 403
    assert client.get('/api/gov/reports/1/docket',headers=tokens['owner']).status_code == 403


def test_active_work_reassignment_moves_personal_queue_and_keeps_history(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(gm.WorkOrder(id=401,wo_number='FAKE-WO-TRANSFER',title='FAKE field repair',status='in_progress',district_id=1,assigned_by_id=1,assigned_to_id=4,assignment_version=1,priority='normal'))
        db.commit()
    payload={'assigned_to_id':5,'reason':'FAKE field capacity transfer','expected_assignment_version':1}
    assert client.post('/api/gov/work-orders/401/reassignment',json=payload,headers=tokens['field']).status_code==403
    transferred=client.post('/api/gov/work-orders/401/reassignment',json=payload,headers=tokens['chief'])
    assert transferred.status_code==200,transferred.text
    assert transferred.json()['assigned_to_id']==5 and transferred.json()['assignment_version']==2
    assert transferred.json()['status']=='in_progress'
    assert client.post('/api/gov/work-orders/401/reassignment',json=payload,headers=tokens['chief']).status_code==409
    old_work=client.get('/api/gov/operations/today',headers=tokens['field']).json()['needs_attention']
    new_work=client.get('/api/gov/operations/today',headers=tokens['other']).json()['needs_attention']
    assert not any(item['entity_type']=='work_order' and item['id']==401 for item in old_work)
    assert any(item['entity_type']=='work_order' and item['id']==401 for item in new_work)
    with sessions() as db:
        event=db.query(gm.AuditLog).filter_by(work_order_id=401,action='Work order owner reassigned').one()
        assert '"previous_owner_id": 4' in event.details and '"owner_id": 5' in event.details
        assert db.query(gm.ProcessTimeline).filter_by(work_order_id=401,is_public=False).count()==1


def transition(client, tokens, item, status, role='chief'):
    response = client.patch(f'/api/gov/announcements/{item["id"]}/status', json={'status': status, 'expected_version': item['content_version']}, headers=tokens[role])
    assert response.status_code == 200, response.text
    return response.json()


def released(context, links=True):
    client, sessions, tokens = context
    associations = [dict(report_id=id, association_type='confirmed_coverage', basis_reason='FAKE reviewed work scope covers this report') for id in (1,2,3)] if links else []
    item = draft(client, tokens, report_associations_input=associations)
    item = transition(client, tokens, item, 'in_review')
    item = transition(client, tokens, item, 'approved')
    item = transition(client, tokens, item, 'published')
    return item


def test_personal_inbox_never_falls_back_to_someone_elses_assignment(context):
    client, sessions, tokens = context
    with sessions() as db:
        db.add(gm.WorkOrder(id=1, wo_number='FAKE-WO-1', title='FAKE field job', status='assigned', assigned_to_id=5, district_id=1, barangay_id=1))
        db.commit()
    own = client.get('/api/gov/operations/today', headers=tokens['field'])
    assert own.status_code == 200, own.text
    assert own.json()['needs_attention'] == []
    assigned = client.get('/api/gov/operations/today', headers=tokens['other'])
    assert assigned.status_code == 200, assigned.text
    assert [r['ticket_id'] for r in assigned.json()['needs_attention']] == ['FAKE-WO-1']
    assert assigned.json()['needs_attention'][0]['barangay'] == 'FAKE Area one'
    assert assigned.json()['team_capacity'] == []


def test_update_save_preserves_scope_links_and_changed_content(context):
    client, sessions, tokens = context
    item = draft(client, tokens, report_associations_input=[dict(report_id=1, association_type='candidate')])
    assert item['target_barangays'] == ['FAKE Area one']
    assert item['report_associations'][0]['report_id'] == 1
    response = client.patch(f'/api/gov/announcements/{item["id"]}', json={'expected_version': item['content_version'], 'title_en': 'FAKE Changed title', 'content_en': 'FAKE Updated body text saved in the database.'}, headers=tokens['chief'])
    assert response.status_code == 200, response.text
    persisted = client.get(f'/api/gov/announcements/{item["id"]}', headers=tokens['chief']).json()
    assert persisted['title_en'] == 'FAKE Changed title'
    assert persisted['content_version'] == item['content_version'] + 1
    conflict = client.patch(f'/api/gov/announcements/{item["id"]}', json={'expected_version': item['content_version'], 'title_en': 'Stale edit must not win'}, headers=tokens['chief'])
    assert conflict.status_code == 409


def test_old_editor_keys_are_rejected_instead_of_silently_lost(context):
    client, sessions, tokens = context
    response = client.post('/api/gov/announcements', json={'title_en':'FAKE notice', 'content_en':'FAKE description', 'affected_barangays':['one']}, headers=tokens['chief'])
    assert response.status_code == 422


def test_approval_publish_and_edit_are_authorized_and_state_bound(context):
    client, sessions, tokens = context
    item = draft(client, tokens)
    direct = client.patch(f'/api/gov/announcements/{item["id"]}/status', json={'status':'published','expected_version':1}, headers=tokens['chief'])
    assert direct.status_code == 409
    item = transition(client, tokens, item, 'in_review')
    for role in ('clerk','inspector','platform'):
        denied = client.patch(f'/api/gov/announcements/{item["id"]}/status', json={'status':'approved','expected_version':1}, headers=tokens[role])
        assert denied.status_code == 403
    item = transition(client, tokens, item, 'approved')
    denied = client.patch(f'/api/gov/announcements/{item["id"]}/status', json={'status':'published','expected_version':1}, headers=tokens['inspector'])
    assert denied.status_code == 403
    edit = client.patch(f'/api/gov/announcements/{item["id"]}', json={'expected_version':1,'content_en':'FAKE cannot silently change an approved notice'}, headers=tokens['chief'])
    assert edit.status_code == 409


def test_public_projection_and_private_owner_context_are_separate(context):
    client, sessions, tokens = context
    item = released(context)
    public = client.get(f'/api/announcements/{item["id"]}')
    assert public.status_code == 200, public.text
    for field in ('source_report_id','report_associations','author_id','deliveries','reviewer_id','candidate_reports_count'):
        assert field not in public.json()
    own = client.get(f'/api/announcements/{item["id"]}/my-report-context', headers=tokens['owner'])
    assert {r['report_id'] for r in own.json()['associated_reports']} == {1,2}
    other = client.get(f'/api/announcements/{item["id"]}/my-report-context', headers=tokens['resident2'])
    assert [r['report_id'] for r in other.json()['associated_reports']] == [3]


def test_notification_release_is_grouped_durable_and_retry_safe(context):
    client, sessions, tokens = context
    item = released(context)
    with sessions() as db:
        events = db.query(gm.OutboxEvent).filter(gm.OutboxEvent.event_type == 'publication_in_app_notification').all()
        assert len(events) == 2
        assert db.query(models.Notification).filter_by(resident_id=100).count() == 1
        assert deliver_pending(db) == 0
        notice = db.query(models.Notification).filter_by(resident_id=100).one()
        assert notice.target_url == f'/updates/{item["id"]}'
        assert notice.outbox_event_id is not None
    response = client.get('/api/notifications/user/100', headers=tokens['owner'])
    assert response.status_code == 200, response.text
    assert response.json()[0]['target_url'] == f'/updates/{item["id"]}'


def test_candidates_do_not_notify_and_suggestions_do_not_write(context):
    client, sessions, tokens = context
    item = draft(client, tokens, report_associations_input=[dict(report_id=1, association_type='candidate')])
    for _ in range(2):
        response = client.get(f'/api/gov/announcements/{item["id"]}/suggest-reports', headers=tokens['chief'])
        assert response.status_code == 200, response.text
    with sessions() as db:
        assert db.query(gm.AnnouncementReportAssociation).count() == 1
    for status in ('in_review','approved','published'): item = transition(client, tokens, item, status)
    with sessions() as db:
        assert db.query(models.Notification).count() == 0


def test_correction_keeps_old_public_release_until_reapproved(context):
    client, sessions, tokens = context
    item = released(context, links=False)
    response = client.post(f'/api/gov/announcements/{item["id"]}/corrections', json={'expected_version':1,'correction_summary':'FAKE correct the inspection details','reason':'FAKE original notice needs amended scope','updated_content_en':'FAKE corrected inspection content.'}, headers=tokens['chief'])
    assert response.status_code == 200, response.text
    correction = response.json()
    assert correction['content_version'] == 2 and correction['status'] == 'draft'
    assert client.get(f'/api/announcements/{item["id"]}').json()['content_en'] == item['content_en']
    for status in ('in_review','approved','published'): correction = transition(client, tokens, correction, status)
    assert client.get(f'/api/announcements/{item["id"]}').json()['content_en'] == 'FAKE corrected inspection content.'
    with sessions() as db: assert db.query(gm.AnnouncementRevision).count() == 2


def test_withdrawal_cancels_pending_dispatch_and_private_context(context):
    client, sessions, tokens = context
    with patch('announcements_router._run_outbox'):
        item = released(context)
    response = client.patch(f'/api/gov/announcements/{item["id"]}/status', json={'expected_version':1, 'status':'withdrawn','withdrawal_reason':'FAKE work plan has changed and needs review'}, headers=tokens['chief'])
    assert response.status_code == 200, response.text
    with sessions() as db:
        assert deliver_pending(db) == 0
        assert db.query(models.Notification).count() == 0
        assert {e.status for e in db.query(gm.OutboxEvent).all()} == {'cancelled'}
    assert client.get(f'/api/announcements/{item["id"]}').status_code == 404
    assert client.get(f'/api/announcements/{item["id"]}/my-report-context', headers=tokens['owner']).status_code == 404


def test_disclosure_requires_provenance_and_preserves_exact_prior_value(context):
    client, sessions, tokens = context
    disclosure = dict(amount='123.45', amount_type='approved_budget_for_contract', source_label='FAKE official source', source_url='https://caloocancity.gov.ph/test-document', source_date='2026-10-01')
    item = draft(client, tokens, budget_disclosure=disclosure)
    with sessions() as db: assert db.query(gm.BudgetDisclosure).one().amount == Decimal('123.45')
    updated = client.put(f'/api/gov/announcements/{item["id"]}/budget-disclosure', json={**disclosure,'expected_version':1,'amount':'200.01'}, headers=tokens['chief'])
    assert updated.status_code == 200, updated.text
    with sessions() as db: assert [r.amount for r in db.query(gm.BudgetDisclosure).order_by(gm.BudgetDisclosure.id).all()] == [Decimal('123.45'),Decimal('200.01')]
    invalid = client.put(f'/api/gov/announcements/{item["id"]}/budget-disclosure', json={**disclosure,'expected_version':2,'source_url':None}, headers=tokens['chief'])
    assert invalid.status_code == 422
    denied = client.put(f'/api/gov/announcements/{item["id"]}/budget-disclosure', json={**disclosure,'expected_version':2}, headers=tokens['inspector'])
    assert denied.status_code == 403


def test_insight_period_and_exact_report_drillthrough(context):
    client, sessions, tokens = context
    with sessions() as db:
        db.query(models.Report).filter_by(id=3).update({'created_at':datetime.now(timezone.utc)-timedelta(days=120)})
        db.commit()
    response = client.get('/api/gov/service-insights?days=30', headers=tokens['chief'])
    assert response.status_code == 200, response.text
    assert response.json()['received_report_count'] == 2
    assert {id for row in response.json()['stages'] for id in row['report_ids']} == {1,2}
    selected = client.get('/api/reports?ids=2', headers=tokens['chief'])
    assert selected.status_code == 200, selected.text
    assert [r['id'] for r in selected.json()] == [2]
    assert client.get('/api/reports?ids=', headers=tokens['chief']).json() == []
    assert client.get('/api/gov/service-insights', headers=tokens['field']).status_code == 403


def test_maintenance_does_not_invent_maintenance_from_construction_date(context):
    client, sessions, tokens = context
    with sessions() as db:
        db.add(gm.InfrastructureAsset(asset_id='FAKE-ASSET', asset_name='FAKE Inspection asset', category='Roads', condition_score=60, barangay='FAKE Area one', barangay_id=1, date_completed=datetime.now(timezone.utc).date()-timedelta(days=50)))
        db.commit()
    response = client.get('/api/gov/predictive/health', headers=tokens['chief'])
    assert response.status_code == 200, response.text
    row = response.json()['health_scores'][0]
    assert row['last_maintenance_date'] is None
    assert row['review_status'] == 'suggested_review'
    assert row['existing_work_order'] is None
    assert response.json()['can_create_work_order'] is True
    support = client.get('/api/gov/predictive/health', headers=tokens['platform'])
    assert support.status_code == 200, support.text
    assert support.json()['can_create_work_order'] is False


def test_manual_maintenance_creates_assignable_work_without_ai_and_retry_is_safe(context):
    client, sessions, tokens = context
    with sessions() as db:
        db.add(gm.InfrastructureAsset(asset_id='FAKE-ASSET', asset_name='FAKE Drainage', category='Drainage', condition_score=48, barangay='FAKE Area one', barangay_id=1))
        db.commit()
    response = client.post('/api/gov/predictive/convert-to-work-order', json={'asset_id':'FAKE-ASSET','plan_summary':'FAKE inspect drainage access and record visible defects','priority':'moderate','review_reason':'FAKE condition record requires an engineering inspection'}, headers=tokens['chief'])
    assert response.status_code == 200, response.text
    wo_id = response.json()['id']
    with sessions() as db:
        work = db.query(gm.WorkOrder).filter_by(id=wo_id).one()
        assert work.priority == 'normal' and work.ai_plan_summary is None
    eligible = client.get(f'/api/gov/dispatch/eligible-assignees?wo_id={wo_id}', headers=tokens['chief'])
    assert eligible.status_code == 200, eligible.text
    assert 4 in {p['id'] for p in eligible.json()}
    assert all('active_work_count' in person for person in eligible.json())
    assert [person['active_work_count'] for person in eligible.json()] == sorted(person['active_work_count'] for person in eligible.json())
    path = f'/api/gov/work-orders/{wo_id}/assignment'
    body = {'assigned_to_id':4,'reason':'FAKE assign the inspection to the eligible field worker'}
    assert client.post(path, json=body, headers=tokens['field']).status_code == 403
    first = client.post(path, json=body, headers=tokens['chief'])
    assert first.status_code == 200, first.text
    assert first.json()['assigned_to_id'] == 4 and first.json()['status'] == 'assigned' and first.json()['assignment_version'] == 1
    with sessions() as db: events = db.query(gm.AuditLog).count()
    assert client.post(path, json=body, headers=tokens['chief']).status_code == 200
    with sessions() as db: assert db.query(gm.AuditLog).count() == events
    inbox = client.get('/api/gov/operations/today', headers=tokens['field']).json()
    assert first.json()['wo_number'] in {r['ticket_id'] for r in inbox['needs_attention']}


def test_work_scope_applies_before_pagination_and_record_access(context):
    client, sessions, tokens = context
    with sessions() as db:
        db.query(models.Official).filter_by(id=1).update({'primary_jurisdiction':{'district_ids':[1]}})
        db.add_all([gm.WorkOrder(wo_number='FAKE-LOCAL', title='FAKE local', district_id=1, status='open'), gm.WorkOrder(wo_number='FAKE-OUTSIDE', title='FAKE outside', district_id=2, status='open')])
        db.commit()
        outside = db.query(gm.WorkOrder).filter_by(wo_number='FAKE-OUTSIDE').one().id
    rows = client.get('/api/gov/work-orders?limit=1', headers=tokens['chief'])
    assert rows.status_code == 200, rows.text
    assert [r['wo_number'] for r in rows.json()] == ['FAKE-LOCAL']
    assert client.get(f'/api/gov/work-orders/{outside}', headers=tokens['chief']).status_code == 403
    assert client.post(f'/api/gov/work-orders/{outside}/assignment', json={'assigned_to_id':4,'reason':'FAKE outside assignment must fail'}, headers=tokens['chief']).status_code == 403


def test_malformed_scope_fails_closed(context):
    client, sessions, tokens = context
    with sessions() as db:
        db.query(models.Official).filter_by(id=1).update({'primary_jurisdiction':{'district_ids':['unsupported']}})
        db.commit()
    assert client.get('/api/gov/service-insights', headers=tokens['chief']).status_code == 403
    assert client.get('/api/gov/announcements', headers=tokens['chief']).status_code == 403


def test_primary_source_report_does_not_revoke_other_explicit_links(context):
    client, sessions, tokens = context
    item = draft(client, tokens, source_report_id=1, report_associations_input=[{'report_id':2,'association_type':'candidate'}])
    assert {a['report_id']:a['association_type'] for a in item['report_associations']} == {1:'candidate',2:'candidate'}


def test_correction_draft_expiry_cannot_hide_the_released_version(context):
    client, sessions, tokens = context
    item = released(context, links=False)
    correction = client.post(f'/api/gov/announcements/{item["id"]}/corrections', json={'expected_version':1,'correction_summary':'FAKE amend scope of published notice','reason':'FAKE prepare a revised inspection notice'}, headers=tokens['chief']).json()
    saved = client.patch(f'/api/gov/announcements/{item["id"]}', json={'expected_version':correction['content_version'],'expires_at':(datetime.now(timezone.utc)-timedelta(days=1)).isoformat()}, headers=tokens['chief'])
    assert saved.status_code == 200, saved.text
    assert client.get(f'/api/announcements/{item["id"]}').status_code == 200
    assert [a['id'] for a in client.get('/api/announcements').json()] == [item['id']]


def test_update_search_status_and_pagination_are_server_backed(context):
    client, sessions, tokens = context
    first = draft(client, tokens, title_en='FAKE Alpha drainage')
    second = draft(client, tokens, title_en='FAKE Beta roadway')
    transition(client, tokens, second, 'in_review')
    result = client.get('/api/gov/announcements?status=draft&q=Alpha&limit=1&page=1', headers=tokens['chief'])
    assert result.status_code == 200, result.text
    assert result.json()['total'] == 1 and [a['id'] for a in result.json()['items']] == [first['id']]
    assert client.get('/api/gov/announcements?limit=1&page=2', headers=tokens['chief']).json()['items'][0]['id'] == first['id']


def test_map_returns_scoped_reports_including_missing_coordinates_and_exact_selection(context):
    client, sessions, tokens = context
    with sessions() as db:
        db.query(models.Report).filter_by(id=1).update({'location_lat':14.75,'location_lng':121.02})
        db.query(models.Report).filter_by(id=3).update({'barangay_id':2})
        db.query(models.Official).filter_by(id=1).update({'primary_jurisdiction':{'district_ids':[1]}})
        db.commit()
    response = client.get('/api/gov/report-map', headers=tokens['chief'])
    assert response.status_code == 200, response.text
    result = response.json()
    assert result['total'] == 2 and {r['id'] for r in result['items']} == {1,2}
    assert result['items'][0]['position'] is not None or result['items'][1]['position'] is not None
    assert len([r for r in result['items'] if r['position'] is None]) == 1
    assert all('resident_id' not in r for r in result['items'])
    assert [r['id'] for r in client.get('/api/gov/report-map?ids=2,3', headers=tokens['chief']).json()['items']] == [2]
    assert client.get('/api/gov/report-map?ids=invalid', headers=tokens['chief']).status_code == 422
    assert client.get('/api/gov/report-map', headers=tokens['owner']).status_code == 403
    assert client.get('/api/gov/report-map', headers=tokens['field']).json()['items'] == []


def test_predictive_projection_uses_same_work_history_and_excludes_future_or_duplicate_dates():
    today = datetime(2026,10,24).date()
    def log(days, work='Declogging'):
        return SimpleNamespace(work_type=work, completion_date=today-timedelta(days=days))
    projection = maintenance_projection([log(90),log(60),log(30),log(30),log(-5),log(10,'Repair')],today)
    assert projection['completed_count'] == 3
    assert projection['typical_interval_days'] == 30
    assert projection['projected_review_date'] == today.isoformat()
    assert projection['days_until_review'] == 0
    assert maintenance_projection([log(30),log(60,'Repair')],today) is None


def test_forecast_detail_reads_history_and_model_is_optional(context):
    client, sessions, tokens = context
    today = datetime.now().date()
    with sessions() as db:
        db.add(gm.InfrastructureAsset(asset_id='FAKE-HISTORY',asset_name='FAKE Drainage site',barangay_id=1,category='Drainage',condition_score=80))
        db.flush()
        db.add_all([gm.MaintenanceHistory(asset_id='FAKE-HISTORY',work_type='Declogging',completion_date=today-timedelta(days=n)) for n in (90,60,30)])
        db.commit()
    response = client.get('/api/gov/predictive/assets/FAKE-HISTORY/forecast',headers=tokens['chief'])
    assert response.status_code == 200, response.text
    data = response.json()
    assert data['projection']['typical_interval_days'] == 30
    assert len(data['history']) == 3 and data['experimental_model'] is None
    health = client.get('/api/gov/predictive/health',headers=tokens['chief']).json()['health_scores'][0]
    assert health['review_needed'] is True  # approaching interval despite a condition score above 75
    with patch('services.lightgbm_service.predict_for_asset',return_value={'engine':'FAKE LightGBM','training_mode':'synthetic_test_only','lgbm_failure_probability_30d':.42}):
        experimental = client.get('/api/gov/predictive/assets/FAKE-HISTORY/forecast?include_model=true',headers=tokens['chief'])
    assert experimental.status_code == 200, experimental.text
    assert experimental.json()['experimental_model']['review_index'] == 42
    assert 'synthetic' in experimental.json()['experimental_model']['limitation']
    with sessions() as db:
        db.query(models.Official).filter_by(id=1).update({'primary_jurisdiction':{'district_ids':[2]}})
        db.commit()
    assert client.get('/api/gov/predictive/assets/FAKE-HISTORY/forecast',headers=tokens['chief']).status_code == 403


def test_admin_can_draft_updates_but_cannot_approve_or_publish(context):
    client,sessions,tokens=context
    permission=client.get('/api/gov/announcements/permissions',headers=tokens['platform']).json()
    assert permission['create'] and permission['edit']
    assert not permission['approve'] and not permission['publish']
    response=client.post('/api/gov/announcements',json={'title_en':'FAKE administrator draft','content_en':'FAKE draft for authorized review','category':'general_notice','publication_format':'advisory','district_id':1,'channels':['web']},headers=tokens['platform'])
    assert response.status_code==201,response.text
    item=transition(client,tokens,response.json(),'in_review',role='platform')
    denied=client.patch(f'/api/gov/announcements/{item["id"]}/status',json={'status':'approved','expected_version':item['content_version']},headers=tokens['platform'])
    assert denied.status_code==403


def test_asset_map_separates_nearby_from_linked_reports_and_honors_scope(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(gm.InfrastructureAsset(asset_id='FAKE-MAP',asset_name='FAKE map asset',barangay_id=1,geom=WKTElement('POINT(121.02 14.75)',srid=4326)))
        db.flush()
        db.query(models.Report).filter_by(id=1).update({'location_lat':14.7501,'location_lng':121.0201})
        db.query(models.Report).filter_by(id=2).update({'location_lat':14.85,'location_lng':121.12})
        db.query(models.Report).filter_by(id=3).update({'location_lat':14.7502,'location_lng':121.0202,'barangay_id':2})
        db.query(models.Official).filter_by(id=1).update({'primary_jurisdiction':{'district_ids':[1]}})
        db.add(gm.WorkOrder(asset_id='FAKE-MAP',wo_number='FAKE-LINKED',report_id=2,district_id=1,assigned_by_id=1))
        db.commit()
    response=client.get('/api/gov/report-map?context_asset_id=FAKE-MAP&radius_m=500',headers=tokens['chief'])
    assert response.status_code==200,response.text
    data=response.json()
    assert data['asset']['geometry']['type']=='Point'
    assert {r['id']:r['relationship'] for r in data['items']}=={1:'nearby',2:'linked'}
    assert next(r for r in data['items'] if r['id']==1)['distance_m']<50
    assert client.get('/api/gov/report-map?context_asset_id=FAKE-MAP&radius_m=3000',headers=tokens['chief']).status_code==422
    assert client.get('/api/gov/report-map?context_asset_id=FAKE-MAP',headers=tokens['field']).status_code==403


def test_asset_without_geometry_does_not_invent_nearby_matches(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(gm.InfrastructureAsset(asset_id='FAKE-NO-POINT',asset_name='FAKE no location',barangay_id=1))
        db.commit()
    response=client.get('/api/gov/report-map?context_asset_id=FAKE-NO-POINT',headers=tokens['chief'])
    assert response.status_code==200,response.text
    assert response.json()['asset']['geometry'] is None and response.json()['items']==[]


def test_records_workspace_contains_only_persisted_documents_and_activity(context):
    client,sessions,tokens=context
    response=client.get('/api/gov/records-workspace?view=documents',headers=tokens['platform'])
    assert response.status_code==200,response.text
    assert response.json()['items']==[] and response.json()['total']==0
    with sessions() as db:
        db.add(gm.AuditLog(action='FAKE persisted activity',actor_id=6,actor_role='system_admin'))
        db.commit()
    activity=client.get('/api/gov/records-workspace?view=audit',headers=tokens['platform'])
    assert activity.status_code==200,activity.text
    assert [r['title'] for r in activity.json()['items']]==['FAKE persisted activity']
    assert client.get('/api/gov/records-workspace',headers=tokens['owner']).status_code==403


def test_records_upload_saves_a_real_file_and_download_applies_scope(context,tmp_path,monkeypatch):
    client,sessions,tokens=context
    import document_router
    monkeypatch.setattr(document_router,'UPLOAD_DIR',str(tmp_path))
    with sessions() as db:
        db.add(gm.WorkOrder(wo_number='FAKE-DOC-WORK',title='FAKE document target',district_id=1,assigned_by_id=6))
        db.commit()
        work_id=db.query(gm.WorkOrder).filter_by(wo_number='FAKE-DOC-WORK').one().id
    response=client.post('/api/gov/documents/upload',data={'target_model':'WorkOrder','target_id':work_id,'document_type':'survey_report'},files={'file':('FAKE-test.txt',b'FAKE test evidence','text/plain')},headers=tokens['platform'])
    assert response.status_code==200,response.text
    document_id=response.json()['document']['id']
    listing=client.get('/api/gov/records-workspace?view=documents',headers=tokens['platform']).json()
    assert listing['total']==1 and listing['items'][0]['title']=='FAKE-test.txt'
    downloaded=client.get(f'/api/gov/documents/get/{document_id}',headers=tokens['platform'])
    assert downloaded.status_code==200 and downloaded.content==b'FAKE test evidence'
    with sessions() as db:
        db.query(models.Official).filter_by(id=6).update({'primary_jurisdiction':{'district_ids':[2]}})
        db.commit()
    assert client.get('/api/gov/records-workspace?view=documents',headers=tokens['platform']).json()['items']==[]
    assert client.get(f'/api/gov/documents/get/{document_id}',headers=tokens['platform']).status_code==403


@pytest.mark.parametrize('status', ['pending_budget_check','budget_confirmed'])
def test_project_budget_processing_is_outside_scope(context, status):
    client, sessions, tokens = context
    with sessions() as db:
        db.add(gm.ProjectRequest(id=1,proj_number='FAKE-PROJECT-1',title='FAKE project',district_id=1))
        db.commit()
    response = client.patch('/api/gov/projects/1/advance', json={'status':status}, headers=tokens['chief'])
    assert response.status_code == 409, response.text


@pytest.mark.parametrize('name', ['create_procurement_request','update_procurement_status','update_procurement_funding','update_procurement_cash_release','update_procurement_bac_schedule','update_procurement_ntp','add_boq_item','delete_boq_item'])
def test_legacy_finance_commands_are_disabled_before_any_crud(name):
    fn = getattr(gov_router, name)
    actor = models.Official(id=1, role='city_engineer')
    kwargs = {key: actor if key == 'current_user' else object() if key == 'db' else 1 if key.endswith('_id') else None for key in inspect.signature(fn).parameters}
    with pytest.raises(HTTPException) as caught:
        fn(**kwargs)
    assert caught.value.status_code == 409


def test_inspection_workspace_and_assignment_use_real_scoped_staff(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=[1]
        db.get(models.Official,3).primary_jurisdiction=[2]
        db.add(gm.OBOInspection(id=1,obo_number='FAKE-OBO-1',applicant_name='FAKE applicant',property_address='FAKE address',district_id=1,barangay_id=1))
        db.add(gm.OBOInspection(id=2,obo_number='FAKE-OBO-2',applicant_name='FAKE outside',property_address='FAKE address',district_id=2,barangay_id=2))
        db.commit()
    data=client.get('/api/gov/obo-workspace',headers=tokens['chief']).json()
    assert data['total']==1
    assert [row['id'] for row in data['items']]==[1]
    options=client.get('/api/gov/obo-options',headers=tokens['chief']).json()
    assert [b['id'] for b in options['barangays']]==[1]
    staff=client.get('/api/gov/obo/1/inspectors',headers=tokens['chief']).json()
    assert 3 not in {p['id'] for p in staff}
    payload=dict(assigned_inspector_id=3,inspection_date='2026-11-01T08:00:00+08:00',status='inspection_scheduled')
    rejected=client.patch('/api/gov/obo/1',json=payload,headers=tokens['chief'])
    assert rejected.status_code==422,rejected.text
    payload['assigned_inspector_id']=1
    saved=client.patch('/api/gov/obo/1',json=payload,headers=tokens['chief'])
    assert saved.status_code==200,saved.text
    assert saved.json()['assigned_inspector_name']=='FAKE chief'
    assert client.get('/api/gov/obo/2/history',headers=tokens['chief']).status_code==403
    with sessions() as db:
        assert db.get(gm.OBOInspection,1).assigned_inspector_id==1
        assert db.get(gm.OBOInspection,2).status=='application_received'


def test_inspection_decisions_require_evidence_and_do_not_resolve_report(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(gm.OBOInspection(id=1,obo_number='FAKE-OBO-1',applicant_name='FAKE applicant',property_address='FAKE address',district_id=1,barangay_id=1,source_report_id=1))
        db.commit()
    url='/api/gov/obo/1'
    assert client.patch(url,json={'status':'permit_issued'},headers=tokens['chief']).status_code==409
    scheduled=client.patch(url,json={'status':'inspection_scheduled','assigned_inspector_id':1,'inspection_date':'2026-11-01T08:00:00+08:00','notes':'FAKE check structure'},headers=tokens['chief'])
    assert scheduled.status_code==200,scheduled.text
    assert client.patch(url,json={'status':'inspection_complete'},headers=tokens['chief']).status_code==422
    inspected=client.patch(url,json={'status':'inspection_complete','findings':'FAKE inspected structure','is_compliant':True},headers=tokens['chief'])
    assert inspected.status_code==200,inspected.text
    assert client.patch(url,json={'status':'permit_issued'},headers=tokens['chief']).status_code==422
    assert client.patch(url,json={'payment_verified':True},headers=tokens['chief']).status_code==409
    decision=client.patch(url,json={'status':'permit_issued','decision_reference':'FAKE-OFFICIAL-2026-001','notes':'FAKE recorded external decision'},headers=tokens['chief'])
    assert decision.status_code==200,decision.text
    history=client.get(url+'/history',headers=tokens['chief']).json()
    assert any('FAKE-OFFICIAL-2026-001' in item['action'] for item in history)
    with sessions() as db:
        assert db.get(models.Report,1).status=='pending'
        assert db.get(gm.OBOInspection,1).payment_verified is False
    assert client.patch(url+'/technical-review',json={'department':'civil','status':'approved','remarks':'FAKE later review'},headers=tokens['chief']).status_code==409


def test_inspection_technical_review_validates_discipline_and_saves_reason(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(gm.OBOInspection(id=1,obo_number='FAKE-OBO-1',applicant_name='FAKE applicant',property_address='FAKE address',district_id=1,barangay_id=1))
        db.commit()
    url='/api/gov/obo/1/technical-review'
    assert client.patch(url,json={'department':'status','status':'approved','remarks':'FAKE invalid discipline'},headers=tokens['chief']).status_code==422
    assert client.patch(url,json={'department':'civil','status':'approved','remarks':''},headers=tokens['chief']).status_code==422
    saved=client.patch(url,json={'department':'civil','status':'approved','remarks':'FAKE reviewed drawing A-101'},headers=tokens['chief'])
    assert saved.status_code==200,saved.text
    assert saved.json()['civil_review']=='approved'
    with sessions() as db:
        assert any('FAKE reviewed drawing A-101' in e.action for e in db.query(gm.AuditLog))


def test_admin_log_count_does_not_claim_cryptographic_integrity(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(gm.AuditLog(action='FAKE recorded event',actor_id=1))
        db.commit()
    result=client.get('/api/admin/audit-integrity',headers=tokens['platform'])
    assert result.status_code==200,result.text
    data=result.json()
    assert data['total_audit_events']==1
    assert data['verified_audit_events']==0
    assert data['tamper_evident'] is False
    assert data['integrity_score'] is None
    assert data['verification_status']=='not_configured'
    assert data['last_verified'] is None
