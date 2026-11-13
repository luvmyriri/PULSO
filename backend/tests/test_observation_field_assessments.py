"""Synthetic intake -> private field capture -> independent per-category review."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime,timedelta,timezone
from io import BytesIO
import json
from threading import Barrier
from uuid import uuid4

from PIL import Image
import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

import auth
import asset_inspection_router
import models
import gov_models as gm
from tests.test_resident_government_integration import connected,submit

ROOT='/api/report-intelligence/reports/'
FIELD='/api/gov/field-inventory'
CATEGORIES=['Roads & Bridges','Water & Drainage']


@pytest.fixture
def assessment_context(connected,monkeypatch,tmp_path):
    client,sessions,tokens,_=connected
    with sessions() as db:
        db.add(models.Official(id=3,full_name='SAMPLE field engineer',email='inspector@test.invalid',
            role='project_engineer',password_hash='not-for-login',is_active=True,primary_jurisdiction=[3]))
        db.commit()
    tokens['inspector']={'Authorization':'Bearer '+auth.create_access_token({'sub':'inspector@test.invalid'})}
    monkeypatch.setattr(asset_inspection_router,'EVIDENCE_ROOT',tmp_path/'private_inspections')
    yield client,sessions,tokens


def path(report,observation):
    return ROOT+f'{report}/observations/{observation}/field-assessments'


def capture(client,tokens,report_id,*,actor='inspector',asset_id=None,condition='defect_observed'):
    now=datetime.now(timezone.utc).isoformat()
    payload=dict(observed_at=now,latitude=14.7565,longitude=121.045,
        location_metadata=dict(source='manual',issue_pin_confirmed=True),visibility='visible',
        condition=condition,notes='SAMPLE photo and visible condition of the reported object.',source_report_id=report_id)
    if not asset_id:payload.update(asset_name='SAMPLE first-party surveyed road site',category='Road',barangay_id=171)
    stream=BytesIO();Image.new('RGB',(8,8),'#604020').save(stream,format='PNG')
    response=client.post(FIELD+('/assets/'+asset_id+'/capture' if asset_id else '/assets/capture'),
        data={'payload':json.dumps(payload)},files={'image':('SAMPLE.png',stream.getvalue(),'image/png')},
        headers={**tokens[actor],'Idempotency-Key':str(uuid4())})
    assert response.status_code==201,response.text
    return response.json()


def accept(client,tokens,field_id,*,actor='chief'):
    response=client.post(FIELD+f'/observations/{field_id}/review',headers=tokens[actor],json=dict(
        decision='accepted',identity_confirmed=True,location_reviewed=True,
        reason='SAMPLE independently compared the private field photo and surveyed context.'))
    assert response.status_code==200,response.text


def setup_case(context,*,collector='inspector'):
    client,_,tokens=context
    report=submit(client,categories=json.dumps(CATEGORIES)).json()
    context=client.get(ROOT+str(report['id']),headers=tokens['chief']).json()
    item,=context['observations']
    source=capture(client,tokens,report['id'],actor=collector)
    field_id=source['observation']['id']
    accept(client,tokens,field_id,actor='chief' if collector=='inspector' else 'inspector')
    return report['id'],item['id'],field_id,source['asset']['asset_id']


def payload(client,tokens,report,observation,field_id):
    response=client.get(path(report,observation)+'/evidence/'+field_id,headers=tokens['chief'])
    assert response.status_code==200,response.text
    context=response.json()
    return dict(field_observation_id=field_id,expected_report_version=context['problem']['report_version'],
        expected_concern_version=context['problem']['concern_version'],expected_revision=context['expected_revision'],
        expected_field_sha256=context['expected_field_sha256'],identity_confirmed=True,
        category_findings=[dict(category=CATEGORIES[0],finding='no_defect_observed'),
            dict(category=CATEGORIES[1],finding='defect_observed')],
        reason='SAMPLE reviewer identified this reported object and assessed both visible problem categories.')


def send(client,tokens,report,item,body,key=None,actor='chief'):
    return client.post(path(report,item),json=body,headers={**tokens[actor],'Idempotency-Key':key or str(uuid4())})


def history(client,tokens,report,item):
    response=client.get(path(report,item),headers=tokens['chief'])
    assert response.status_code==200,response.text
    assert response.headers['cache-control']=='no-store'
    return response.json()


def test_one_ticket_keeps_each_category_finding_and_private_evidence_without_closing_it(assessment_context):
    client,sessions,tokens=assessment_context
    report,item,field_id,asset_id=setup_case(assessment_context)
    before=history(client,tokens,report,item)
    assert before['assessment_revision']==0 and before['assessments']==[]
    body=payload(client,tokens,report,item,field_id)
    response=send(client,tokens,report,item,body)
    assert response.status_code==200,response.text
    assert response.headers['cache-control']=='no-store'
    result=response.json();entry=result['assessment']
    assert entry['current_context'] and entry['revision']==1
    assert entry['category_findings']==body['category_findings']
    assert entry['training_release_eligible'] is result['lifecycle_changed'] is False
    with sessions() as db:
        assert db.query(models.Report).count()==db.query(models.ReportObservation).count()==1
        assert db.get(models.Report,report).status=='pending'
        assert db.get(models.Report,report).version==body['expected_report_version']
        assert db.query(models.ReportResolutionEvent).count()==db.query(gm.AssetInspectionOutcome).count()==0
        assert db.query(models.ConcernLearningCheckpoint).count()==1
        assert db.get(gm.InfrastructureAsset,asset_id).registry_status=='candidate'
        assert db.query(gm.AuditLog).filter_by(trigger_type='observation_field_assessment').count()==1
    rendered=json.dumps(history(client,tokens,report,item))
    assert 'guest@test.invalid' not in rendered and 'stored_path' not in rendered and 'latitude' not in rendered


@pytest.mark.parametrize('change',[
    lambda b:b['category_findings'].pop(),
    lambda b:b['category_findings'].append(b['category_findings'][0]),
    lambda b:b['category_findings'][0].update(category='UNKNOWN category'),
    lambda b:b['category_findings'][1].update(finding='no_defect_observed'),
    lambda b:b.update(identity_confirmed=False),
    lambda b:b.update(identity_confirmed='true'),
])
def test_each_category_and_human_identity_and_condition_must_agree(assessment_context,change):
    client,sessions,tokens=assessment_context;report,item,field_id,_=setup_case(assessment_context)
    body=payload(client,tokens,report,item,field_id);change(body)
    assert send(client,tokens,report,item,body).status_code==422
    with sessions() as db:assert db.query(models.ObservationFieldAssessment).count()==0


def test_corrections_are_append_only_and_replay_reflects_superseded_context(assessment_context):
    client,sessions,tokens=assessment_context;report,item,field_id,_=setup_case(assessment_context)
    body=payload(client,tokens,report,item,field_id);key=str(uuid4())
    one=send(client,tokens,report,item,body,key);assert one.status_code==200,one.text
    assert send(client,tokens,report,item,body,key).json()==one.json()
    conflict=deepcopy(body);conflict['reason']='SAMPLE changed command with different reasoning.'
    assert send(client,tokens,report,item,conflict,key).status_code==409
    correction=payload(client,tokens,report,item,field_id)
    for part in correction['category_findings']:part['finding']='not_assessed'
    assert send(client,tokens,report,item,correction).status_code==200
    rows=history(client,tokens,report,item)['assessments']
    assert [r['revision'] for r in rows]==[2,1] and rows[0]['current_context']
    assert rows[1]['category_findings']==body['category_findings']
    replay=send(client,tokens,report,item,body,key).json()['assessment']
    assert replay['current_context'] is False and 'superseded_by_later_assessment' in replay['current_context_blockers']
    with sessions() as db:assert db.query(models.ObservationFieldAssessment).count()==2


@pytest.mark.parametrize('resource',['report','concern','field'])
def test_stale_context_conflicts_then_existing_review_becomes_historical(assessment_context,resource):
    client,sessions,tokens=assessment_context;report,item,field_id,_=setup_case(assessment_context)
    body=payload(client,tokens,report,item,field_id)
    assert send(client,tokens,report,item,body).status_code==200
    body=payload(client,tokens,report,item,field_id)
    with sessions() as db:
        if resource=='report':db.get(models.Report,report).description='SAMPLE edited report context needing another comparison.'
        elif resource=='concern':db.get(models.ReportConcern,db.get(models.ReportObservation,item).concern_id).version+=1
        else:db.get(gm.AssetFieldObservation,field_id).notes='SAMPLE changed field context detected by its digest.'
        db.commit()
    assert send(client,tokens,report,item,body).status_code==409
    assert history(client,tokens,report,item)['assessments'][0]['current_context'] is False


@pytest.mark.parametrize('change',[
    lambda row,asset:setattr(row,'review_status','pending'),
    lambda row,asset:setattr(row,'identity_confirmed',False),
    lambda row,asset:setattr(row,'location_reviewed',False),
    lambda row,asset:setattr(row,'reviewed_by_id',row.recorded_by_id),
    lambda row,asset:setattr(row,'reviewed_by_id',None),
    lambda row,asset:setattr(row,'evidence_reference',None),
    lambda row,asset:setattr(row,'observed_at',datetime.now(timezone.utc)-timedelta(days=1)),
    lambda row,asset:setattr(row,'observed_at',datetime.now(timezone.utc)+timedelta(minutes=1)),
])
def test_incomplete_or_inconsistent_field_sources_cannot_support_assessment(assessment_context,change):
    client,sessions,tokens=assessment_context;report,item,field_id,asset_id=setup_case(assessment_context)
    with sessions() as db:
        change(db.get(gm.AssetFieldObservation,field_id),db.get(gm.InfrastructureAsset,asset_id));db.commit()
    body=payload(client,tokens,report,item,field_id)
    assert send(client,tokens,report,item,body).status_code==409


def test_private_bytes_are_verified_and_later_corruption_does_not_rewrite_judgment(assessment_context):
    client,sessions,tokens=assessment_context;report,item,field_id,_=setup_case(assessment_context)
    body=payload(client,tokens,report,item,field_id);key=str(uuid4())
    assert send(client,tokens,report,item,body,key).status_code==200
    with sessions() as db:
        source=db.get(gm.AssetFieldObservation,field_id);evidence=db.get(gm.AssetInspectionEvidence,source.evidence_reference)
        location=asset_inspection_router.EVIDENCE_ROOT/evidence.stored_path
    location.write_bytes(b'SAMPLE corrupted private bytes')
    replay=send(client,tokens,report,item,body,key).json()['assessment']
    assert 'private_evidence_missing_or_changed' in replay['current_context_blockers']
    assert replay['category_findings']==body['category_findings']
    assert send(client,tokens,report,item,payload(client,tokens,report,item,field_id)).status_code==409


def test_later_accepted_survey_requires_review_without_inventing_a_new_category_finding(assessment_context):
    client,_,tokens=assessment_context;report,item,field_id,asset_id=setup_case(assessment_context)
    assert send(client,tokens,report,item,payload(client,tokens,report,item,field_id)).status_code==200
    later=capture(client,tokens,report,asset_id=asset_id)['observation']['id']
    assert history(client,tokens,report,item)['assessments'][0]['current_context']
    accept(client,tokens,later)
    old=history(client,tokens,report,item)['assessments'][0]
    assert 'later_or_same_time_accepted_field_context_requires_review' in old['current_context_blockers']
    assert send(client,tokens,report,item,payload(client,tokens,report,item,later)).json()['assessment']['current_context']


def test_field_recorder_cannot_adjudicate_own_evidence(assessment_context):
    client,_,tokens=assessment_context;report,item,field_id,_=setup_case(assessment_context,collector='chief')
    body=payload(client,tokens,report,item,field_id)
    assert send(client,tokens,report,item,body).status_code==403


def test_report_and_asset_and_historical_scope_are_all_required(assessment_context):
    client,sessions,tokens=assessment_context;report,item,field_id,asset_id=setup_case(assessment_context)
    body=payload(client,tokens,report,item,field_id)
    assert send(client,tokens,report,item,body).status_code==200
    for actor in ('clerk','resident'):
        assert client.get(path(report,item),headers=tokens[actor]).status_code==403
        assert send(client,tokens,report,item,body,actor=actor).status_code==403
    with sessions() as db:
        db.add(models.District(id=4,name='SAMPLE outside district',code='SAMPLE4'));db.flush()
        db.add(models.Barangay(id=202,name='SAMPLE outside area',district_id=4));db.flush()
        db.get(gm.InfrastructureAsset,asset_id).barangay_id=202
        db.get(models.Official,1).primary_jurisdiction=[3];db.commit()
    assert client.get(path(report,item),headers=tokens['chief']).status_code==403
    assert client.get(path(report,item)+'/evidence/'+field_id,headers=tokens['chief']).status_code==403
    assert send(client,tokens,report,item,body).status_code==403


@pytest.mark.parametrize('sql',[
    "UPDATE observation_field_assessments SET reason='SAMPLE forbidden rewrite'",
    'DELETE FROM observation_field_assessments',
])
def test_database_rejects_history_update_and_delete(assessment_context,sql):
    client,sessions,tokens=assessment_context;report,item,field_id,_=setup_case(assessment_context)
    assert send(client,tokens,report,item,payload(client,tokens,report,item,field_id)).status_code==200
    with sessions() as db:
        with pytest.raises(DBAPIError,match='Observation field assessments are immutable'):
            db.execute(text(sql));db.commit()
        db.rollback()
        assert db.query(models.ObservationFieldAssessment).count()==1


@pytest.mark.parametrize('same_key',[True,False])
def test_concurrent_replays_or_competing_revisions_are_serialized(assessment_context,same_key):
    client,sessions,tokens=assessment_context;report,item,field_id,_=setup_case(assessment_context)
    body=payload(client,tokens,report,item,field_id);key=str(uuid4());barrier=Barrier(2)
    def execute(index):
        barrier.wait(timeout=10)
        return send(client,tokens,report,item,body,key if same_key or index==0 else str(uuid4())).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:statuses=sorted(pool.map(execute,range(2)))
    assert statuses==([200,200] if same_key else [200,409])
    with sessions() as db:
        assert db.query(models.ObservationFieldAssessment).count()==1
        assert db.query(gm.CommandReceipt).filter_by(operation='observation_field_assessment').count()==1


def test_lost_commit_acknowledgment_recovers_from_the_same_command(assessment_context,monkeypatch):
    client,sessions,tokens=assessment_context;report,item,field_id,_=setup_case(assessment_context)
    body=payload(client,tokens,report,item,field_id);key=str(uuid4());original=Session.commit
    def lost(db):
        original(db)
        raise RuntimeError('SAMPLE lost acknowledgement after commit')
    with monkeypatch.context() as scoped:
        scoped.setattr(Session,'commit',lost)
        with pytest.raises(RuntimeError,match='lost acknowledgement'):send(client,tokens,report,item,body,key)
    replay=send(client,tokens,report,item,body,key)
    assert replay.status_code==200 and replay.json()['assessment']['revision']==1
    with sessions() as db:assert db.query(models.ObservationFieldAssessment).count()==1


def test_sibling_items_do_not_inherit_each_others_findings(assessment_context):
    client,_,tokens=assessment_context
    items=[dict(item_key='road',categories=[CATEGORIES[0]],description='SAMPLE road surface defect.'),
        dict(item_key='drain',categories=[CATEGORIES[1]],description='SAMPLE blocked nearby drain.')]
    report=submit(client,categories=json.dumps(CATEGORIES),observation_items=json.dumps(items)).json()['id']
    context=client.get(ROOT+str(report),headers=tokens['chief']).json()
    one,two=context['observations']
    source=capture(client,tokens,report)['observation']['id'];accept(client,tokens,source)
    body=payload(client,tokens,report,one['id'],source)
    body['category_findings']=[dict(category=one['categories'][0],finding='defect_observed')]
    response=send(client,tokens,report,one['id'],body)
    assert response.status_code==200,response.text
    assert history(client,tokens,report,one['id'])['assessment_revision']==1
    assert history(client,tokens,report,two['id'])['assessment_revision']==0


def test_photo_from_another_report_does_not_establish_identity(assessment_context):
    client,_,tokens=assessment_context;report,item,field_id,_=setup_case(assessment_context)
    other=submit(client).json()['id']
    other_item=client.get(ROOT+str(other),headers=tokens['chief']).json()['observations'][0]['id']
    body=payload(client,tokens,other,other_item,field_id)
    body['category_findings']=[dict(category=CATEGORIES[0],finding='defect_observed')]
    assert send(client,tokens,other,other_item,body).status_code==409


def test_unobserved_site_is_never_a_negative_category_finding(assessment_context):
    client,sessions,tokens=assessment_context;report,item,field_id,_=setup_case(assessment_context)
    with sessions() as db:
        source=db.get(gm.AssetFieldObservation,field_id);source.visibility='unsafe';source.condition='not_assessed';db.commit()
    body=payload(client,tokens,report,item,field_id)
    for part in body['category_findings']:part['finding']='not_assessed'
    assert send(client,tokens,report,item,body).status_code==409


def test_frozen_area_scope_remains_required_after_current_records_move(assessment_context):
    client,sessions,tokens=assessment_context;report,item,field_id,asset_id=setup_case(assessment_context)
    assert send(client,tokens,report,item,payload(client,tokens,report,item,field_id)).status_code==200
    with sessions() as db:
        db.add(models.District(id=4,name='SAMPLE new scope',code='SAMPLE4'));db.flush()
        db.add(models.Barangay(id=202,name='SAMPLE new area',district_id=4));db.flush()
        db.get(models.Report,report).barangay_id=202;db.get(gm.InfrastructureAsset,asset_id).barangay_id=202
        db.get(models.Official,1).primary_jurisdiction=[4];db.commit()
    assert client.get(path(report,item),headers=tokens['chief']).status_code==403


def test_precommit_audit_failure_leaves_no_partial_assessment_or_receipt(assessment_context,monkeypatch):
    client,sessions,tokens=assessment_context;report,item,field_id,_=setup_case(assessment_context)
    body=payload(client,tokens,report,item,field_id)
    def fail(*args,**kwargs):raise RuntimeError('SAMPLE audit failure')
    with monkeypatch.context() as scoped:
        scoped.setattr('report_review._history',fail)
        with pytest.raises(RuntimeError,match='audit failure'):send(client,tokens,report,item,body)
    with sessions() as db:
        assert db.query(models.ObservationFieldAssessment).count()==0
        assert db.query(gm.CommandReceipt).filter_by(operation='observation_field_assessment').count()==0


def test_history_bound_refuses_growth_but_keeps_existing_reads_and_receipt_recovery(assessment_context,monkeypatch):
    client,sessions,tokens=assessment_context;report,item,field_id,_=setup_case(assessment_context)
    monkeypatch.setattr('observation_field_assessments.MAX_HISTORY',1)
    body=payload(client,tokens,report,item,field_id);key=str(uuid4())
    assert send(client,tokens,report,item,body,key).status_code==200
    assert send(client,tokens,report,item,body,key).status_code==200
    newer=payload(client,tokens,report,item,field_id)
    assert send(client,tokens,report,item,newer).status_code==409
    assert history(client,tokens,report,item)['assessment_revision']==1
    with sessions() as db:assert db.query(models.ObservationFieldAssessment).count()==1


def test_reviewed_no_defect_revisit_records_absence_without_claiming_official_repair(assessment_context):
    client,sessions,tokens=assessment_context;report,item,_,asset=setup_case(assessment_context)
    source=capture(client,tokens,report,asset_id=asset,condition='no_defect_observed')['observation']['id']
    accept(client,tokens,source)
    body=payload(client,tokens,report,item,source)
    for part in body['category_findings']:part['finding']='no_defect_observed'
    response=send(client,tokens,report,item,body)
    assert response.status_code==200,response.text
    assert response.json()['assessment']['current_context']
    assert response.json()['lifecycle_changed'] is False
    with sessions() as db:
        assert db.get(models.Report,report).status=='pending'
        assert db.query(models.ReportResolutionEvent).count()==0
