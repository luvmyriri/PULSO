"""Prospective context capture in real transactions; all cases synthetic."""
from copy import deepcopy
from hashlib import sha256
import json
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

import models
from learning_dataset_contract import canonical
from tests.test_resident_government_integration import connected,submit
from tests.test_report_learning import link


def context(client,tokens,rid):
    response=client.get('/api/report-intelligence/reports/'+str(rid),headers=tokens['chief'])
    assert response.status_code==200,response.text
    return response.json()


def history(client,tokens,concern,actor='chief'):
    return client.get('/api/gov/report-learning/cases/'+concern+'/prediction-checkpoints',headers=tokens[actor])


def test_intake_checkpoint_is_atomic_private_and_not_duplicated_by_receipt_replay(connected):
    client,sessions,tokens,_=connected
    headers={**tokens['resident'],'Idempotency-Key':str(uuid4())}
    one=submit(client,headers);assert one.status_code==201,one.text
    assert submit(client,headers).json()['id']==one.json()['id']
    with sessions() as db:
        row=db.query(models.ConcernLearningCheckpoint).one()
        assert row.payload_sha256==sha256(canonical(row.payload)).hexdigest()
        assert row.captured_at>=db.get(models.ReportLearningSnapshot,one.json()['id']).available_at
        assert row.payload['features']['report_count']==1
        assert row.payload['features']['observation_count']==1
        assert row.payload['feature_status']=='complete'
        assert row.payload['sources'][0]['terminal_at_checkpoint'] is False
        assert row.payload['sources'][0]['successful_status_at_checkpoint'] is False
        assert row.payload['prediction_clock']=='server_capture_before_command_commit'
        public_id=row.payload['concern_public_id']
        assert 'guest@test.invalid' not in json.dumps(row.payload)
        assert 'FAKE test pothole' not in json.dumps(row.payload)
        assert 'latitude' not in json.dumps(row.payload)
    response=history(client,tokens,public_id)
    assert response.status_code==200 and response.headers['cache-control']=='no-store'
    assert response.json()['items'][0]['membership_current'] is True
    assert response.json()['training_release_eligible'] is False
    for actor in ('clerk','resident'):
        assert history(client,tokens,public_id,actor).status_code==403


def test_link_and_split_freeze_new_context_without_rewriting_older_membership(connected):
    client,sessions,tokens,_=connected
    one,two=submit(client).json(),submit(client).json()
    before=context(client,tokens,two['id'])['observations'][0]['concern_id']
    original=deepcopy(history(client,tokens,before).json()['items'][0])
    link(client,tokens,one['id'],two['id'])
    grouped=history(client,tokens,before).json()['items']
    assert [item['payload']['features']['report_count'] for item in grouped]==[2,1]
    assert grouped[1]['payload']==original['payload'] and grouped[1]['payload_sha256']==original['payload_sha256']
    assert grouped[1]['membership_current'] is False
    current=context(client,tokens,one['id']);item=current['observations'][0]
    split=client.post('/api/report-intelligence/reports/'+str(one['id'])+'/association',headers=tokens['chief'],json=dict(
        observation_id=item['id'],target_observation_id=None,expected_version=current['report_version'],
        expected_concern_version=item['concern_version'],reason='SAMPLE independently reviewed separate episode.'))
    assert split.status_code==200,split.text
    after=history(client,tokens,before).json()['items']
    assert [row['payload']['features']['report_count'] for row in after]==[1,2,1]
    assert after[1]['payload']==grouped[0]['payload']
    with sessions() as db:
        assert db.query(models.ConcernLearningCheckpoint).count()==5
        assert db.query(models.Report).count()==2


@pytest.mark.parametrize('statement',[
    "UPDATE concern_learning_checkpoints SET payload_sha256=repeat('a',64)",
    'DELETE FROM concern_learning_checkpoints',
])
def test_database_rejects_checkpoint_rewrites_and_deletion(connected,statement):
    client,sessions,_,_=connected
    assert submit(client).status_code==201
    with sessions() as db:
        with pytest.raises(DBAPIError,match='Concern learning checkpoints are immutable'):
            db.execute(text(statement))
        db.rollback()
        row=db.query(models.ConcernLearningCheckpoint).one()
        assert row.payload_sha256==sha256(canonical(row.payload)).hexdigest()


def test_failed_checkpoint_rolls_back_association_and_decision_together(connected,monkeypatch):
    client,sessions,tokens,_=connected
    one,two=submit(client).json(),submit(client).json()
    import concern_checkpoints
    original=concern_checkpoints.capture
    def fail(*args,**kwargs):
        original(*args,**kwargs)
        raise RuntimeError('SAMPLE checkpoint persistence unavailable')
    monkeypatch.setattr(concern_checkpoints,'capture',fail)
    with pytest.raises(RuntimeError,match='SAMPLE checkpoint'):
        link(client,tokens,one['id'],two['id'])
    with sessions() as db:
        assert db.query(models.ConcernDecision).count()==0
        assert db.query(models.ConcernLearningCheckpoint).count()==2
        assert len({row.concern_id for row in db.query(models.ReportObservation)})==2


def test_unsupported_categories_do_not_break_intake_or_escape_into_checkpoint_features(connected):
    client,sessions,_,_=connected
    result=submit(client,category='SAMPLE unsupported private text')
    assert result.status_code==201,result.text
    with sessions() as db:
        payload=db.query(models.ConcernLearningCheckpoint).one().payload
        assert payload['feature_status']=='incomplete'
        assert payload['features']['concern_categories'] is None
        assert payload['sources'][0]['intake_features'] is None
        assert 'SAMPLE unsupported private text' not in json.dumps(payload)


def test_explicit_observations_capture_their_own_case_context_on_one_ticket(connected):
    client,sessions,_,_=connected
    categories=['Roads & Bridges','Drainage & Flooding']
    items=[dict(item_key='road',categories=[categories[0]],description='SAMPLE road defect at the selected point.'),
        dict(item_key='drain',categories=[categories[1]],description='SAMPLE separate drain defect at the selected point.')]
    response=submit(client,categories=json.dumps(categories),observation_items=json.dumps(items))
    assert response.status_code==201,response.text
    with sessions() as db:
        checkpoints=db.query(models.ConcernLearningCheckpoint).all()
        assert len(checkpoints)==2 and db.query(models.Report).count()==1
        assert {tuple(row.payload['features']['concern_categories']) for row in checkpoints}=={(categories[0],),(categories[1],)}
        assert all(row.payload['features']['report_count']==row.payload['features']['observation_count']==1 for row in checkpoints)
        assert all(row.payload['sources'][0]['intake_features']['initial_observation_count']==2 for row in checkpoints)


def test_current_or_frozen_out_of_scope_membership_never_leaks_through_history(connected):
    client,sessions,tokens,_=connected
    one,two=submit(client).json(),submit(client).json()
    concern=link(client,tokens,one['id'],two['id'])
    current=context(client,tokens,one['id']);item=current['observations'][0]
    response=client.post('/api/report-intelligence/reports/'+str(one['id'])+'/association',headers=tokens['chief'],json=dict(
        observation_id=item['id'],target_observation_id=None,expected_version=current['report_version'],
        expected_concern_version=item['concern_version'],reason='SAMPLE split to test historical scope boundaries.'))
    assert response.status_code==200,response.text
    with sessions() as db:
        db.add(models.District(id=2,name='SAMPLE outside district',code='SAMPLE2'));db.flush()
        db.add(models.Barangay(id=202,name='SAMPLE outside barangay',district_id=2));db.flush()
        db.get(models.Report,one['id']).barangay_id=202
        db.get(models.Official,1).primary_jurisdiction=[3]
        db.commit()
    # Current remaining report is visible; frozen two-member and trigger-source
    # snapshots are omitted as wholes without exposing their membership/counts.
    result=history(client,tokens,concern)
    assert result.status_code==200,result.text
    visible=result.json()['items']
    assert len(visible)==1 and visible[0]['payload']['trigger_kind']=='intake'
    assert one['id'] not in [s['report_id'] for s in visible[0]['payload']['sources']]
    assert history(client,tokens,context(client,tokens,two['id'])['observations'][0]['concern_id']).status_code==200


def test_oversized_case_does_not_block_reporting_or_publish_a_truncated_roster(connected,monkeypatch):
    client,sessions,tokens,_=connected
    one,two=submit(client).json(),submit(client).json()
    import concern_checkpoints
    monkeypatch.setattr(concern_checkpoints,'MAX_OBSERVATIONS',1)
    concern=link(client,tokens,one['id'],two['id'])
    with sessions() as db:
        checkpoint=db.query(models.ConcernLearningCheckpoint).filter_by(trigger_kind='association').one()
        assert checkpoint.payload['lineage_complete'] is False
        assert checkpoint.payload['memberships']==checkpoint.payload['sources']==[]
        assert checkpoint.payload['features']['report_count']==2
        assert checkpoint.payload['feature_blockers']==['case_size_exceeds_checkpoint_bound']
        assert db.query(models.Report).count()==2
    assert history(client,tokens,concern).status_code==409
    monkeypatch.setattr(concern_checkpoints,'MAX_OBSERVATIONS',1000)
    assert len(history(client,tokens,concern).json()['items'])==1


def test_history_uses_one_snapshot_during_a_concurrent_association(connected,monkeypatch):
    client,_,tokens,_=connected
    one,two=submit(client).json(),submit(client).json()
    concern=context(client,tokens,two['id'])['observations'][0]['concern_id']
    import concern_checkpoints
    original=concern_checkpoints.history
    def link_during_read(db,user,record,limit):
        link(client,tokens,one['id'],two['id'])
        return original(db,user,record,limit)
    monkeypatch.setattr(concern_checkpoints,'history',link_during_read)
    before=history(client,tokens,concern)
    assert before.status_code==200,before.text
    assert len(before.json()['items'])==1
    assert before.json()['items'][0]['membership_current'] is True
    monkeypatch.setattr(concern_checkpoints,'history',original)
    after=history(client,tokens,concern)
    assert [row['payload']['features']['report_count'] for row in after.json()['items']]==[2,1]
