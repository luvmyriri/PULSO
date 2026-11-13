"""Resolution learning history uses real endpoints on disposable PostGIS only."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi import HTTPException

import auth
import models
import gov_models as gm
import gov_crud
import report_learning as learning
from tests.test_resident_government_integration import connected, submit
from tests.test_field_inventory import field_context, candidate, create, evidence
from tests.test_asset_inspection_routes import inspection_context

PATH = '/api/gov/report-learning'


@pytest.fixture
def learning_context(connected):
    client, sessions, tokens, uploads = connected
    with sessions() as db:
        db.add(models.Official(id=3,full_name='FAKE worker',email='worker@test.invalid',role='field_worker',
            password_hash='not-for-login',is_active=True))
        db.commit()
    tokens['worker'] = {'Authorization':'Bearer '+auth.create_access_token({'sub':'worker@test.invalid'})}
    return client, sessions, tokens


def link(client,tokens,one,two):
    path = '/api/report-intelligence/reports/'
    a = client.get(path+str(one),headers=tokens['chief']).json()
    b = client.get(path+str(two),headers=tokens['chief']).json()
    payload = dict(observation_id=a['observations'][0]['id'],target_observation_id=b['observations'][0]['id'],
        expected_version=a['report_version'],expected_concern_version=a['observations'][0]['concern_version'],
        expected_target_version=b['report_version'],expected_target_concern_version=b['observations'][0]['concern_version'],
        reason='FAKE independently confirmed the same physical defect and episode.')
    response = client.post(path+str(one)+'/association',json=payload,headers=tokens['chief'])
    assert response.status_code == 200, response.text
    return response.json()['observations'][0]['concern_id']


def verify(client,sessions,tokens,report_id,passed=True):
    with sessions() as db:
        report = db.get(models.Report,report_id)
        report.status = 'in_progress'
        work = gm.WorkOrder(wo_number='FAKE-LRN-'+uuid4().hex,title='FAKE completion evidence for learning',
            report_id=report_id,assigned_to_id=3,assigned_by_id=1,district_id=3,barangay_id=171,status='completed_pending_review')
        db.add(work);db.commit();work_id=work.id
    response = client.post(f'/api/gov/work-orders/{work_id}/verify',headers=tokens['chief'],json=dict(
        passed=passed,notes='FAKE independent inspection confirmed the reported issue was addressed.',
        checklist_results=dict(specifications=True,siteCleared=True,qualityTested=True,photoVerified=True)))
    assert response.status_code == 200, response.text
    return work_id


def cases(client,tokens):
    response = client.get(PATH+'/cases',headers=tokens['chief'])
    assert response.status_code == 200, response.text
    return response.json()


def test_intake_freezes_features_and_read_only_case_history_does_not_backfill(learning_context):
    client,sessions,tokens = learning_context
    result = submit(client,tokens['resident']).json()
    with sessions() as db:
        snapshot = db.get(models.ReportLearningSnapshot,result['id'])
        frozen = dict(snapshot.features)
        received = snapshot.received_at
        report = db.get(models.Report,result['id'])
        report.category='FAKE future category';report.priority_grade='P5';report.accuracy_m=1
        report.created_at = datetime.now(timezone.utc)+timedelta(days=20)
        db.commit()
    page = cases(client,tokens)
    assert len(page['items']) == 1
    item = page['items'][0]
    assert item['intake']['features'] == frozen
    assert datetime.fromisoformat(item['first_received_at'].replace('Z','+00:00')) == received
    assert item['outcome']['state'] == 'right_censored' and item['outcome']['elapsed_days'] >= 0
    assert page['page_summary']['completed_duration_median_days'] is None
    assert not {'report_count','priority_grade','resolution_image_url','description','resident_id'} & set(frozen)
    with sessions() as db:
        assert db.query(models.ReportResolutionEvent).count() == 0
        assert db.query(models.ReportLearningSnapshot).count() == 1


def test_many_reports_make_one_case_and_only_full_verified_resolution_completes_it(learning_context):
    client,sessions,tokens = learning_context
    one,two = submit(client).json(),submit(client).json()
    concern_id = link(client,tokens,one['id'],two['id'])
    with sessions() as db:
        for rid in (one['id'],two['id']):
            frozen = db.get(models.ReportLearningSnapshot,rid)
            frozen.received_at = datetime.now(timezone.utc)-timedelta(days=4)
            frozen.available_at = frozen.received_at
        db.commit()
    verify(client,sessions,tokens,one['id'])
    partial = cases(client,tokens)['items'][0]
    assert partial['report_count'] == 2 and partial['outcome']['state'] == 'right_censored'
    verify(client,sessions,tokens,two['id'])
    page = cases(client,tokens)
    assert page['page_summary']['concern_count'] == page['page_summary']['completed_count'] == 1
    item = page['items'][0]
    assert item['concern_id'] == concern_id and item['report_count'] == 2
    assert item['outcome']['state'] == 'verified_resolution' and 4 <= item['outcome']['elapsed_days'] < 5
    assert len(item['outcome']['sources']) == 2
    detail = client.get(PATH+'/cases/'+concern_id,headers=tokens['chief']).json()
    assert detail['outcome'] == item['outcome'] and detail['membership_fingerprint'] == item['membership_fingerprint']
    assert client.get('/api/report-intelligence/reports/'+str(one['id']),headers=tokens['chief']).json()['resolution_estimate']['predicted_days'] is None


def test_reopen_invalidates_old_outcome_and_new_verification_does_not_add_another_case(learning_context):
    client,sessions,tokens = learning_context
    report = submit(client).json()
    verify(client,sessions,tokens,report['id'])
    before = cases(client,tokens)['items'][0]
    assert before['outcome']['state'] == 'verified_resolution'
    with sessions() as db:
        gov_crud._sync_report_status(db,report['id'],'in_progress',1,'city_engineer',note='FAKE independent evidence required rework.')
        db.commit()
    reopened = cases(client,tokens)['items'][0]
    assert reopened['outcome']['state'] == 'right_censored' and reopened['outcome']['verified_at'] is None
    assert reopened['outcome']['recorded_event_count'] == 2
    assert reopened['membership_fingerprint'] != before['membership_fingerprint']
    verify(client,sessions,tokens,report['id'])
    final = cases(client,tokens)
    assert len(final['items']) == 1 and final['items'][0]['outcome']['recorded_event_count'] == 3
    assert final['items'][0]['outcome']['state'] == 'verified_resolution'


def test_resident_confirmation_preserves_official_verification_timestamp(learning_context):
    client,sessions,tokens = learning_context
    report = submit(client,tokens['resident']).json()
    verify(client,sessions,tokens,report['id'])
    before = cases(client,tokens)['items'][0]['outcome']['verified_at']
    assert before is not None
    result = client.post(f"/api/reports/{report['id']}/confirm",json={'rating':5},headers=tokens['resident'])
    assert result.status_code == 200, result.text
    assert cases(client,tokens)['items'][0]['outcome']['verified_at'] == before


@pytest.mark.parametrize('status,state', [('resolved','unverified_terminal'),('completed','unverified_terminal'),
    ('cancelled','non_resolution_terminal'),('rejected','non_resolution_terminal'),('pending','right_censored')])
def test_status_alone_cannot_manufacture_completion_history(learning_context,status,state):
    client,sessions,tokens = learning_context
    report = submit(client).json()
    with sessions() as db:
        db.get(models.Report,report['id']).status=status
        db.delete(db.get(models.ReportLearningSnapshot,report['id']))
        db.commit()
    item = cases(client,tokens)['items'][0]
    assert item['intake']['status'] == 'not_recorded_at_intake' and item['intake']['features'] is None
    assert item['outcome']['state'] == state and item['outcome']['verified_at'] is None
    assert cases(client,tokens)['page_summary']['completed_count'] == 0


def test_failure_and_transaction_rollback_do_not_create_verified_labels(learning_context):
    client,sessions,tokens = learning_context
    report = submit(client).json()
    verify(client,sessions,tokens,report['id'],passed=False)
    assert cases(client,tokens)['items'][0]['outcome']['recorded_event_count'] == 0
    with sessions() as db:
        with pytest.raises(HTTPException):
            gov_crud._sync_report_status(db,report['id'],'resolved',1,'city_engineer',resolution_evidence=('work_order_inspection',999))
        db.rollback()
        assert db.query(models.ReportResolutionEvent).count() == 0
        assert db.get(models.Report,report['id']).status == 'in_progress'


def test_cross_district_membership_is_omitted_wholly_without_hidden_report_counts(learning_context):
    client,sessions,tokens = learning_context
    one,two = submit(client).json(),submit(client).json()
    concern_id = link(client,tokens,one['id'],two['id'])
    with sessions() as db:
        db.add(models.District(id=4,name='FAKE outside district',code='TEST4'));db.flush()
        db.add(models.Barangay(id=202,name='FAKE outside barangay',district_id=4));db.flush()
        db.get(models.Report,two['id']).barangay_id=202
        db.get(models.Official,1).primary_jurisdiction=[3]
        db.commit()
    page = cases(client,tokens)
    assert page['items'] == [] and page['page_summary']['concern_count'] == 0
    assert client.get(PATH+'/cases/'+concern_id,headers=tokens['chief']).status_code == 403


@pytest.mark.parametrize('actor',['resident','clerk','worker'])
def test_private_learning_routes_require_insights_and_report_authority(learning_context,actor):
    client,_,tokens=learning_context
    assert client.get(PATH+'/cases',headers=tokens[actor]).status_code == 403


def test_revoked_source_and_explicit_access_denial_are_respected(learning_context):
    client,sessions,tokens=learning_context
    report=submit(client).json()
    work_id=verify(client,sessions,tokens,report['id'])
    previous=cases(client,tokens)['items'][0]['membership_fingerprint']
    with sessions() as db:
        db.get(gm.WorkOrder,work_id).status='rework_required';db.commit()
    item=cases(client,tokens)['items'][0]
    assert item['outcome']['state'] == 'unverified_terminal' and item['membership_fingerprint'] != previous
    with sessions() as db:
        role=models.SystemRole(name='FAKE no learning',capabilities={'insights':[]})
        db.add(role);db.flush();db.get(models.Official,1).role_id=role.id;db.commit()
    assert client.get(PATH+'/cases',headers=tokens['chief']).status_code == 403


def test_an_unsourced_resolution_after_another_recorded_transition_cannot_revive_old_verification(learning_context):
    client,sessions,tokens=learning_context
    report=submit(client).json()
    verify(client,sessions,tokens,report['id'])
    with sessions() as db:
        # Simulate a legacy command that writes a governed timeline but no new learning event.
        db.add(gm.ProcessTimeline(report_id=report['id'],status='in_progress',previous_status='resolved',actor_id=1,actor_role='city_engineer',note='FAKE legacy rework transition.'))
        db.commit()
        db.get(models.Report,report['id']).status='resolved';db.commit()
    assert cases(client,tokens)['items'][0]['outcome']['state'] == 'unverified_terminal'


def test_case_pagination_and_multi_observation_grouping_keep_individual_reports(learning_context):
    import json
    client,sessions,tokens=learning_context
    labels=['Roads & Bridges','Water & Drainage']
    result=submit(client,categories=json.dumps(labels),observation_items=json.dumps([
        dict(item_key='road',categories=[labels[0]],description='FAKE first defect on the test road.'),
        dict(item_key='drain',categories=[labels[1]],description='FAKE second defect beside that road.')])).json()
    page=client.get(PATH+'/cases?limit=1',headers=tokens['chief']).json()
    assert len(page['items']) == 1 and page['next_after_id'] is not None
    second=client.get(PATH+f"/cases?after_id={page['next_after_id']}&limit=1",headers=tokens['chief']).json()
    assert len(second['items']) == 1 and second['next_after_id'] is None
    assert page['items'][0]['report_ids'] == second['items'][0]['report_ids'] == [result['id']]
    assert page['items'][0]['intake']['features']['observation_categories'] != second['items'][0]['intake']['features']['observation_categories']
    with sessions() as db:
        assert db.query(models.Report).count() == 1 and db.query(models.ReportLearningSnapshot).count() == 1


def test_history_queries_use_read_only_repeatable_snapshots(learning_context):
    _,sessions,_=learning_context
    from sqlalchemy import text
    with sessions() as db:
        with learning.read_snapshot(db) as reader:
            assert reader.execute(text('SHOW transaction_isolation')).scalar_one() == 'repeatable read'
            assert reader.execute(text('SHOW transaction_read_only')).scalar_one() == 'on'


def add_field_claim(sessions,asset_id,at,condition,photo_id,**changes):
    now=datetime.now(timezone.utc)
    data=dict(id=str(uuid4()),asset_id=asset_id,command_hash=uuid4().hex+uuid4().hex,payload_hash='f'*64,
        observed_at=at,visibility='visible',condition=condition,latitude=14.72,longitude=121.04,accuracy_m=12,
        location_metadata={'source':'unknown'},boundary_status='within_recorded_boundary',notes='FAKE reviewed field history fixture.',
        evidence_reference=photo_id,recorded_by_id=2,recorded_at=now,review_status='accepted',identity_confirmed=True,
        location_reviewed=True,reviewed_by_id=1,reviewed_at=now,review_reason='FAKE independent review for fixture history.')
    data.update(changes)
    with sessions() as db:
        row=gm.AssetFieldObservation(**data);db.add(row);db.commit()
    return data['id']


def test_reviewed_field_intervals_remain_separate_from_official_service_duration(field_context):
    client,sessions,tokens=field_context
    result=create(client,tokens,candidate()).json();asset_id=result['asset']['asset_id']
    now=datetime.now(timezone.utc)
    first=add_field_claim(sessions,asset_id,now-timedelta(days=8),'defect_observed',evidence(client,tokens,asset_id))
    last=add_field_claim(sessions,asset_id,now-timedelta(days=5),'defect_observed',evidence(client,tokens,asset_id))
    after=add_field_claim(sessions,asset_id,now-timedelta(days=2),'no_defect_observed',evidence(client,tokens,asset_id))
    response=client.get(PATH+'/observed-repair-intervals',params={'asset_id':asset_id},headers=tokens['chief'])
    assert response.status_code == 200,response.text
    data=response.json();assert len(data['intervals']) == 1
    interval=data['intervals'][0]
    assert interval['last_defect_observation_id'] == last and interval['first_no_defect_observation_id'] == after
    assert interval['interval_days'] == 3 and interval['exact_repair_time'] is None and data['predicted_days'] is None
    assert data['open_defect_observation_id'] is None
    assert client.get(PATH+'/cases',headers=tokens['chief']).json()['items'] == []


def test_unreviewed_ambiguous_and_incomplete_field_claims_cannot_be_repair_outcomes(field_context):
    client,sessions,tokens=field_context
    asset_id=create(client,tokens).json()['asset']['asset_id'];now=datetime.now(timezone.utc)
    before=add_field_claim(sessions,asset_id,now-timedelta(days=9),'defect_observed',evidence(client,tokens,asset_id))
    add_field_claim(sessions,asset_id,now-timedelta(days=8),'no_defect_observed',evidence(client,tokens,asset_id),review_status='pending')
    add_field_claim(sessions,asset_id,now-timedelta(days=7),'no_defect_observed',evidence(client,tokens,asset_id),identity_confirmed=False)
    add_field_claim(sessions,asset_id,now-timedelta(days=6),'no_defect_observed',None)
    path=PATH+'/observed-repair-intervals?asset_id='+asset_id
    data=client.get(path,headers=tokens['chief']).json()
    assert data['intervals'] == [] and data['open_defect_observation_id'] == before
    at=now-timedelta(days=3)
    for condition in ('defect_observed','no_defect_observed'):
        add_field_claim(sessions,asset_id,at,condition,evidence(client,tokens,asset_id))
    add_field_claim(sessions,asset_id,now-timedelta(days=1),'no_defect_observed',evidence(client,tokens,asset_id))
    data=client.get(path,headers=tokens['chief']).json()
    assert data['intervals'] == [] and data['ambiguous_time_groups'] == 1


def test_field_interval_access_respects_record_scope(field_context):
    client,sessions,tokens=field_context
    with sessions() as db:
        db.add(gm.InfrastructureAsset(asset_id='FAKE-OUTSIDE-LEARNING',asset_name='FAKE outside site',barangay_id=2,category='Drainage'))
        db.commit()
    path=PATH+'/observed-repair-intervals?asset_id=FAKE-OUTSIDE-LEARNING'
    assert client.get(path,headers=tokens['chief']).status_code == 403
    assert client.get(path,headers=tokens['resident']).status_code == 403
