"""Synthetic diagnostic fixtures, never a matching accuracy benchmark."""
from copy import deepcopy
from datetime import datetime,timedelta,timezone
import json

import pytest

from learning_dataset_contract import canonical
from matching_dataset_contract import seal
from matching_evaluation import evaluate,prepare
from scripts import evaluate_matching as cli
from tests.test_matching_dataset_contract import row

AT=datetime(2026,11,1,tzinfo=timezone.utc)


def source(*pairs):
    records=[]
    for number,(a,b,relation) in enumerate(pairs,1):
        item=row(number,a,b)
        item.update(relation=relation,evidence_basis=['photos'],recorded_at=(AT-timedelta(seconds=1)).isoformat())
        records.append(item)
    return seal(records,AT)


def run(document,decisions=None):
    value=prepare(document,run_id='SAMPLE-run',artifact_key='SAMPLE-model-v1',at=AT+timedelta(seconds=1))
    value['data_origin']='synthetic'
    for prediction,decision in zip(value['predictions'],decisions or ['uncertain']*len(value['predictions'])):
        prediction.update(partition='test',retrieved=decision!='not_evaluated',decision=decision)
    return value


def check(document,predictions):
    return evaluate(document,predictions,as_of=AT+timedelta(seconds=2))


def test_blank_work_file_has_no_answers_or_automatic_partition_and_cannot_be_scored():
    document=source((1,2,'same_problem'))
    template=prepare(document,run_id='SAMPLE',artifact_key='SAMPLE',at=AT+timedelta(seconds=1))
    assert template['predictions']==[dict(left_observation_id=10,right_observation_id=20,partition=None,retrieved=None,decision=None)]
    assert 'same_problem' not in json.dumps(template)
    with pytest.raises(ValueError,match='blank template'):check(document,template)


def test_direct_link_diagnostics_distinguish_asset_identity_episode_and_abstention():
    document=source((1,2,'same_problem'),(3,4,'same_asset_different_problem'),(5,6,'different_asset'),
        (7,8,'same_problem'),(9,10,'same_problem'),(11,12,'uncertain'))
    result=check(document,run(document,['same_problem','same_problem','same_problem','uncertain','not_evaluated','same_problem']))
    stats=result['by_partition']['test']
    assert stats['current_decisive_reference_count']==5
    assert stats['provided_positive_retrieval_fraction']==pytest.approx(2/3)
    assert stats['direct_link_precision_against_operational_references']==pytest.approx(1/3)
    assert stats['false_episode_link_same_asset_count']==stats['false_link_different_asset_count']==1
    assert stats['abstention_count']==stats['not_retrieved_count']==1
    assert stats['decisive_prediction_coverage']==pytest.approx(3/5)
    assert stats['selective_relation_agreement']==pytest.approx(1/3)
    assert stats['proposed_link_without_current_decisive_reference_count']==1
    assert stats['provided_positive_not_directly_linked_count']==2
    assert result['automatic_matching_release_allowed'] is False and result['data_origin']=='synthetic'


def test_transitive_bridge_can_contradict_reference_even_when_its_direct_pair_abstains():
    document=source((1,2,'same_problem'),(2,3,'uncertain'),(1,3,'same_asset_different_problem'))
    # Canonical scoring order is (1,2), (1,3), (2,3), independent of review order.
    result=check(document,run(document,['same_problem','uncertain','same_problem']))
    assert result['summary']['contradicted_direct_link_count']==0
    assert result['summary']['transitive_contradiction_count']==1
    assert result['summary']['transitive_same_asset_different_problem_count']==1
    assert result['rows'][1]['predicted_co_clustered'] is True
    assert result['rows'][1]['decision']=='uncertain'


def test_latest_correction_wins_and_stale_or_uncertain_judgments_never_become_negatives():
    document=source((1,2,'same_problem'),(3,4,'different_asset'))
    old=document['rows'][0];old['latest_review']=False
    correction=deepcopy(old);correction.update(review_id=3,revision=2,relation='uncertain',latest_review=True)
    document['rows'][1]['current_evidence']=False
    document=seal([old,document['rows'][1],correction],AT)
    result=check(document,run(document,['same_problem','same_problem']))
    assert result['history_row_count']==3 and result['latest_pair_count']==2
    assert result['rows'][0]['latest_review_id']==3
    assert result['summary']['current_decisive_reference_count']==0
    assert result['summary']['direct_link_precision_against_operational_references'] is None
    assert result['summary']['current_uncertain_reference_count']==result['summary']['stale_reference_count']==1


def test_shared_report_groups_cannot_cross_partitions_and_metrics_are_partitioned():
    document=source((1,2,'same_problem'),(2,3,'different_asset'),(4,5,'different_asset'))
    predictions=run(document,['same_problem','different_asset','same_problem'])
    predictions['predictions'][0]['partition']='train'
    with pytest.raises(ValueError,match='one partition'):check(document,predictions)
    predictions['predictions'][1]['partition']='train'
    result=check(document,predictions)
    assert result['by_partition']['train']['selective_relation_agreement']==1
    assert result['by_partition']['test']['selective_relation_agreement']==0
    assert result['by_partition']['validation']['selective_relation_agreement'] is None


@pytest.mark.parametrize('change',[
    lambda p:p.update(source_export_sha256='a'*64),
    lambda p:p['predictions'].clear(),
    lambda p:p['predictions'].append(deepcopy(p['predictions'][0])),
    lambda p:p['predictions'][0].update(right_observation_id=30),
    lambda p:p['predictions'][0].update(left_observation_id=True),
    lambda p:p['predictions'][0].update(retrieved=False,decision='same_problem'),
    lambda p:p['predictions'][0].update(retrieved=True,decision='not_evaluated'),
    lambda p:p['predictions'][0].update(confidence=.99),
    lambda p:p.update(generated_at=(AT+timedelta(days=1)).isoformat()),
    lambda p:p.update(generated_at=(AT-timedelta(days=1)).isoformat()),
    lambda p:p.update(generated_at=None),
])
def test_incomplete_cross_snapshot_or_malformed_runs_are_rejected(change):
    document=source((1,2,'same_problem'));predictions=run(document)
    change(predictions)
    with pytest.raises(ValueError):check(document,predictions)


@pytest.mark.parametrize('change',[
    lambda rows:rows[0].update(latest_review=False),
    lambda rows:rows[0].update(evidence_basis=['location']),
    lambda rows:rows[0]['features'].update(left_photo_present=False),
    lambda rows:rows[0].update(recorded_at=(AT+timedelta(days=1)).isoformat()),
    lambda rows:rows.append({**deepcopy(rows[0]),'review_id':2}),
])
def test_resealed_inconsistent_label_history_is_rejected(change):
    document=source((1,2,'same_problem'));records=deepcopy(document['rows'])
    change(records);document=seal(records,AT)
    with pytest.raises(ValueError):prepare(document,run_id='SAMPLE',artifact_key='SAMPLE')


def test_empty_dataset_has_no_perfect_metrics_and_self_attestation_cannot_enable_release():
    document=source();predictions=run(document)
    predictions['data_origin']='field_collected'
    document['manifest'].pop('training_release_blockers')
    # Re-sign the intentionally weaker manifest; local gates must remain fixed.
    from hashlib import sha256
    manifest={k:v for k,v in document['manifest'].items() if k!='export_sha256'}
    document['manifest']['export_sha256']=sha256(canonical(dict(manifest=manifest,rows=[]))).hexdigest()
    predictions['source_export_sha256']=document['manifest']['export_sha256']
    result=check(document,predictions)
    assert result['summary']['direct_link_precision_against_operational_references'] is None
    assert result['summary']['provided_positive_retrieval_fraction'] is None
    assert result['training_release_eligible'] is False
    assert result['data_origin']=='unattested' and 'prospective_evaluation_required' in result['release_blockers']


def test_cli_offline_output_is_exclusive_and_errors_do_not_echo_private_input(tmp_path,capsys):
    document=source((1,2,'same_problem'))
    src=tmp_path/'source.json';src.write_bytes(canonical(document))
    pred=tmp_path/'predictions.json';pred.write_bytes(canonical(run(document,['same_problem'])))
    dest=tmp_path/'evaluation.json'
    assert cli.main(['audit','--input',str(src),'--predictions',str(pred),'--output',str(dest)])==0
    result=json.loads(dest.read_bytes());assert result['summary']['supported_direct_link_count']==1
    original=dest.read_bytes()
    assert cli.main(['audit','--input',str(src),'--predictions',str(pred),'--output',str(dest)])==1
    assert dest.read_bytes()==original
    bad=run(document);bad['private_contact']='SAMPLE-PRIVATE@test.invalid';pred.write_bytes(canonical(bad))
    assert cli.main(['audit','--input',str(src),'--predictions',str(pred),'--output',str(tmp_path/'bad.json')])==2
    assert not (tmp_path/'bad.json').exists()
    assert 'SAMPLE-PRIVATE' not in str(capsys.readouterr())


def test_cli_prepares_unfilled_work_file_and_bounds_input(tmp_path,monkeypatch):
    src=tmp_path/'source.json';src.write_bytes(canonical(source((1,2,'same_problem'))))
    dest=tmp_path/'work.json'
    assert cli.main(['prepare','--input',str(src),'--output',str(dest),'--run-id','SAMPLE','--artifact-key','SAMPLE'])==0
    assert json.loads(dest.read_bytes())['predictions'][0]['decision'] is None
    assert json.loads(dest.read_bytes())['generated_at'] is None
    monkeypatch.setattr(cli,'MAX_BYTES',10)
    assert cli.main(['prepare','--input',str(src),'--output',str(tmp_path/'large.json'),'--run-id','SAMPLE','--artifact-key','SAMPLE'])==2


def test_correct_negatives_without_links_do_not_manufacture_perfect_link_precision():
    document=source((1,2,'different_asset'))
    stats=check(document,run(document,['different_asset']))['summary']
    assert stats['selective_relation_agreement']==1
    assert stats['decisive_prediction_coverage']==1
    assert stats['direct_link_precision_against_operational_references'] is None
    assert stats['provided_positive_retrieval_fraction'] is None


def test_conflicting_observation_lineage_is_rejected_even_after_resealing():
    document=source((1,2,'same_problem'),(1,3,'different_asset'))
    document['rows'][1]['left_report_id']=99
    document=seal(document['rows'],AT)
    with pytest.raises(ValueError,match='lineage'):prepare(document,run_id='SAMPLE',artifact_key='SAMPLE')


def test_command_line_runs_with_network_database_and_provider_access_blocked(tmp_path):
    import subprocess,sys
    from pathlib import Path
    document=source((1,2,'same_problem'))
    src=tmp_path/'source.json';src.write_bytes(canonical(document))
    pred=tmp_path/'run.json';pred.write_bytes(canonical(run(document,['same_problem'])))
    out=tmp_path/'out.json'
    script=Path(__file__).resolve().parents[1]/'scripts'/'evaluate_matching.py'
    code="""
import runpy,socket,sys
def denied(*args,**kwargs):raise RuntimeError('Unexpected network call')
class NoNetworkSocket(socket.socket):
    def __new__(cls,*args,**kwargs):return denied()
socket.socket=NoNetworkSocket
socket.create_connection=socket.getaddrinfo=denied
sys.modules['database']=None
sys.modules['gemini_service']=None
sys.argv=sys.argv[1:]
runpy.run_path(sys.argv[0],run_name='__main__')
"""
    result=subprocess.run([sys.executable,'-c',code,str(script),'audit','--input',str(src),'--predictions',str(pred),'--output',str(out)],
        capture_output=True,text=True,timeout=20)
    assert result.returncode==0,result.stderr
    assert json.loads(out.read_bytes())['automatic_matching_release_allowed'] is False
