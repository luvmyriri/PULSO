"""Durable real-HTTP/worker behavior on disposable PostGIS, fake provider only."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timedelta,timezone
from threading import Event
from uuid import uuid4
from pathlib import Path

import pytest

import gemini_service
import models
import pair_analysis_jobs as jobs
from tests.test_resident_government_integration import connected,submit
from tests.test_observation_matching import pair
from tests.test_pair_image_analysis import image_bytes,hints


@pytest.fixture
def prepared(connected,monkeypatch):
    client,sessions,headers,root=connected
    one,two,source,target,path,body=pair(client,headers)
    for report,color in ((one,'red'),(two,'blue')):
        (root/Path(report['image_url']).name).write_bytes(image_bytes(color,exif=True))
    payload={key:value for key,value in body.items() if key in {'expected_version','expected_target_version','expected_concern_version','expected_target_concern_version'}}
    payload['photos_reviewed_for_provider']=True
    monkeypatch.setenv('PULSO_PAIR_ANALYSIS_ENABLED','true')
    monkeypatch.setattr(gemini_service,'AI_DISABLED',False)
    monkeypatch.setattr(gemini_service,'_client',None)  # An accidental real adapter call cannot send.
    return client,sessions,headers,root,path+'/analysis',payload,one


def enqueue(env,body=None,key=None,role='chief'):
    client,_,headers,_,path,payload,_=env
    return client.post(path,json=body or payload,headers={**headers[role],'Idempotency-Key':key or str(uuid4())})


def fake_provider(*args,**kwargs):
    return dict(hints=hints(),model_version='SAMPLE',review_required=True,
        episode_identity='not_established_from_images',location_verified=False,training_release_eligible=False)


def row(env,job_id):
    with env[1]() as db:
        value=db.get(models.PairImageAnalysisJob,job_id)
        return dict(status=value.status,attempts=value.attempts,result=value.result,failure_code=value.failure_code,dispatched_at=value.dispatched_at)


def test_enqueue_receipt_replay_and_no_intake_or_membership_side_effect(prepared):
    before=prepared[0].get(prepared[4],headers=prepared[2]['chief']).json()
    assert before['can_request'] is True
    key=str(uuid4());first=enqueue(prepared,key=key)
    assert first.status_code==202,first.text
    job=first.json();assert job['status']=='queued' and job['provider_call_may_have_started'] is False
    assert enqueue(prepared,key=key).json()['id']==job['id']
    assert enqueue(prepared,dict(prepared[5],expected_version=99),key).status_code==409
    assert enqueue(prepared).status_code==409
    pending=prepared[0].get(prepared[4],headers=prepared[2]['chief']).json()
    assert pending['can_request'] is False
    assert 'queued or running' in pending['request_block_reason']
    with prepared[1]() as db:
        assert db.query(models.PairImageAnalysisJob).count()==1
        assert db.query(models.ObservationPairReview).count()==db.query(models.ConcernDecision).count()==0
        assert db.query(models.Report).count()==db.query(models.ReportConcern).count()==2
        assert {r.status for r in db.query(models.Report)}=={'pending'}


def test_opt_in_and_staff_access_are_checked_before_queueing(prepared,monkeypatch):
    for role in ('resident','clerk'):
        assert enqueue(prepared,role=role).status_code==403
    assert enqueue(prepared,dict(prepared[5],photos_reviewed_for_provider=False)).status_code==422
    monkeypatch.setenv('PULSO_PAIR_ANALYSIS_ENABLED','false')
    assert enqueue(prepared).status_code==503
    with prepared[1]() as db:assert db.query(models.PairImageAnalysisJob).count()==0


def test_history_exposes_recording_ownership_without_granting_it(prepared):
    import auth
    with prepared[1]() as db:
        reviewer=models.Official(id=3,full_name='SAMPLE validator',email='validator@test.invalid',
            password_hash='not-for-login',role='project_engineer',is_active=True)
        db.add(reviewer);db.flush()
        db.get(models.Report,prepared[6]['id']).review_assigned_to_id=3
        db.commit()
    headers={'Authorization':'Bearer '+auth.create_access_token({'sub':'validator@test.invalid'})}
    response=prepared[0].get(prepared[4],headers=headers)
    assert response.status_code==200,response.text
    assert response.json()['can_request'] is False
    assert 'ownership' in response.json()['request_block_reason']
    refused=prepared[0].post(prepared[4],json=prepared[5],headers={**headers,'Idempotency-Key':str(uuid4())})
    assert refused.status_code==403


def test_worker_completes_visual_hints_without_creating_training_labels(prepared):
    job=enqueue(prepared).json()
    assert jobs.run_one(prepared[1],prepared[3],provider=fake_provider)==job['id']
    result=row(prepared,job['id'])
    assert result['status']=='completed' and result['attempts']==1
    assert result['result']['training_release_eligible'] is False
    client,_,headers,_,path,_,_=prepared
    response=client.get(path,headers=headers['chief'])
    assert response.status_code==200,response.text
    assert response.json()['jobs'][0]['context_current'] is True
    assert client.get(path,headers=headers['resident']).status_code==403
    with prepared[1]() as db:assert db.query(models.ObservationPairReview).count()==0


@pytest.mark.parametrize('change',['report','bytes','access'])
def test_stale_or_revoked_jobs_never_send(prepared,change):
    job=enqueue(prepared).json()
    with prepared[1]() as db:
        if change=='report':db.get(models.Report,prepared[6]['id']).description='SAMPLE changed description'
        if change=='access':db.get(models.Official,1).is_suspended=True
        db.commit()
    if change=='bytes':(prepared[3]/Path(prepared[6]['image_url']).name).write_bytes(image_bytes('green'))
    jobs.run_one(prepared[1],prepared[3],provider=lambda *a,**k:pytest.fail('Stale evidence sent.'))
    assert row(prepared,job['id'])['status'] in {'failed','cancelled'}
    assert row(prepared,job['id'])['attempts']==0


def test_changes_during_generation_discard_current_advice(prepared):
    job=enqueue(prepared).json()
    def provider(*args,**kwargs):
        with prepared[1]() as db:
            db.get(models.Report,prepared[6]['id']).description='SAMPLE changed while the provider was running.'
            db.commit()
        return fake_provider()
    jobs.run_one(prepared[1],prepared[3],provider=provider)
    result=row(prepared,job['id'])
    assert result['failure_code']=='evidence_context_changed' and result['result'] is None


def test_database_budget_zero_prevents_any_call(prepared,monkeypatch):
    job=enqueue(prepared).json();monkeypatch.setenv('PULSO_PAIR_ANALYSIS_DAILY_CAP','0')
    jobs.run_one(prepared[1],prepared[3],provider=lambda *a,**k:pytest.fail('Budget bypassed.'))
    result=row(prepared,job['id'])
    assert result['failure_code']=='daily_pair_budget_exhausted' and result['dispatched_at'] is None


def test_two_workers_share_one_database_call_reservation(prepared,monkeypatch):
    first_job=enqueue(prepared).json()
    third=submit(prepared[0]).json()
    (prepared[3]/Path(third['image_url']).name).write_bytes(image_bytes('green'))
    _,_,_,_,path,body=pair(prepared[0],prepared[2],one=prepared[6],two=third)
    body={key:value for key,value in body.items() if key.startswith('expected_') and key!='expected_pair_revision'}
    body['photos_reviewed_for_provider']=True
    second=prepared[0].post(path+'/analysis',json=body,headers={**prepared[2]['chief'],'Idempotency-Key':str(uuid4())})
    assert second.status_code==202,second.text
    monkeypatch.setenv('PULSO_PAIR_ANALYSIS_DAILY_CAP','1')
    entered,release=Event(),Event()
    def provider(*args,**kwargs):
        entered.set();assert release.wait(10);return fake_provider()
    with ThreadPoolExecutor(max_workers=2) as pool:
        running=pool.submit(jobs.run_one,prepared[1],prepared[3],provider=provider)
        try:
            assert entered.wait(10)
            jobs.run_one(prepared[1],prepared[3],provider=lambda *a,**k:pytest.fail('Second reservation bypassed the shared cap.'))
        finally:release.set()
        running.result()
    values=[row(prepared,key) for key in (first_job['id'],second.json()['id'])]
    assert sorted(value['status'] for value in values)==['completed','failed']
    assert sum(value['attempts'] for value in values)==1
    assert any(value['failure_code']=='daily_pair_budget_exhausted' for value in values)


def test_unconfigured_provider_fails_before_a_call_is_reserved(prepared):
    job=enqueue(prepared).json()
    jobs.run_one(prepared[1],prepared[3])
    result=row(prepared,job['id'])
    assert result['failure_code']=='provider_not_configured' and result['attempts']==0


def test_same_key_concurrent_enqueues_return_one_durable_job(prepared):
    key=str(uuid4())
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:enqueue(prepared,key=key),range(2)))
    assert [result.status_code for result in results]==[202,202]
    assert results[0].json()['id']==results[1].json()['id']


def test_workers_claim_a_job_once_and_release_database_locks_during_provider_work(prepared):
    job=enqueue(prepared).json();entered=Event();release=Event()
    def provider(*args,**kwargs):
        entered.set();assert release.wait(10);return fake_provider()
    with ThreadPoolExecutor(max_workers=2) as pool:
        first=pool.submit(jobs.run_one,prepared[1],prepared[3],provider=provider)
        try:
            assert entered.wait(10)
            assert jobs.run_one(prepared[1],prepared[3],provider=lambda *a,**k:pytest.fail('Claimed twice.')) is None
        finally:release.set()
        assert first.result()==job['id']
    assert row(prepared,job['id'])['attempts']==1


def test_expired_worker_is_not_automatically_retried_and_late_completion_is_ignored(prepared):
    job=enqueue(prepared).json();job_id,lease=jobs.claim(prepared[1])
    with prepared[1]() as db:
        db.get(models.PairImageAnalysisJob,job_id).lease_until=datetime.now(timezone.utc)-timedelta(seconds=1)
        db.commit()
    history=prepared[0].get(prepared[4],headers=prepared[2]['chief']).json()
    assert history['jobs'][0]['lease_expired'] is True
    assert jobs.run_one(prepared[1],prepared[3],provider=lambda *a,**k:pytest.fail('Interrupted job retried.')) is None
    assert jobs.finish(prepared[1],job_id,lease,'completed',result=fake_provider()) is False
    assert row(prepared,job['id'])['failure_code']=='worker_interrupted_outcome_unknown'


def test_provider_error_does_not_escape_in_job_result(prepared):
    job=enqueue(prepared).json()
    def provider(*args,**kwargs):raise RuntimeError('SAMPLE secret endpoint and private photo text')
    jobs.run_one(prepared[1],prepared[3],provider=provider)
    result=row(prepared,job['id'])
    assert result['failure_code']=='worker_failed_outcome_unknown' and result['result'] is None
