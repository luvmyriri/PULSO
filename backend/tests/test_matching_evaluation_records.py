"""Evaluate actual authorized exports on disposable PostGIS; synthetic records."""
from datetime import datetime,timezone

import pytest

from matching_evaluation import evaluate,prepare
from tests.test_resident_government_integration import connected
from tests.test_observation_matching import pair,post


def test_scoped_export_evaluation_counts_wrong_episode_without_changing_membership(connected):
    client,sessions,headers,_=connected
    _,_,_,_,path,body=pair(client,headers)
    assert post(client,headers,path,body).status_code==200
    response=client.get('/api/gov/report-learning/matching-dataset',headers=headers['chief'])
    assert response.status_code==200,response.text
    document=response.json()
    predictions=prepare(document,run_id='SAMPLE-export-run',artifact_key='SAMPLE-adapter-v1')
    predictions['data_origin']='synthetic'
    predictions['generated_at']=datetime.now(timezone.utc).isoformat()
    predictions['predictions'][0].update(partition='test',retrieved=True,decision='same_problem')
    result=evaluate(document,predictions)
    assert result['summary']['false_episode_link_same_asset_count']==1
    assert result['summary']['supported_direct_link_count']==0
    assert result['automatic_matching_release_allowed'] is False
    import models
    with sessions() as db:
        assert db.query(models.Report).count()==2
        assert db.query(models.ConcernDecision).count()==0

    correction=post(client,headers,path,{**body,'expected_pair_revision':1,'relation':'uncertain','evidence_basis':['location']})
    assert correction.status_code==200,correction.text
    corrected=client.get('/api/gov/report-learning/matching-dataset',headers=headers['chief']).json()
    with pytest.raises(ValueError,match='another evidence snapshot'):evaluate(corrected,predictions)
    current=prepare(corrected,run_id='SAMPLE-correction-run',artifact_key='SAMPLE-adapter-v1')
    current['predictions'][0].update(partition='test',retrieved=False,decision='not_evaluated')
    current['data_origin']='synthetic'
    current['generated_at']=datetime.now(timezone.utc).isoformat()
    after=evaluate(corrected,current)
    assert after['history_row_count']==2 and after['latest_pair_count']==1
    assert after['summary']['current_decisive_reference_count']==0
    assert after['summary']['direct_link_precision_against_operational_references'] is None
