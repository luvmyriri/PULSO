"""Synthetic experiments verify computation and isolation, never ETA accuracy."""
from copy import deepcopy
from datetime import timedelta
import json
import math
from pathlib import Path
import subprocess
import sys

import pytest

from checkpoint_candidate import Encoder,FEATURE_NAMES,experiment,periods,score
from learning_dataset_contract import canonical
from scripts import experiment_checkpoint_lightgbm as cli
from tests.test_checkpoint_baseline import CUTOFF,LATER,item,samples,snapshot


def run(training,later,**options):
    args=dict(grouping='shared_report',interval_ends=[2,4,10],min_train_groups=1,min_train_events=1,
        source_key='SAMPLE-candidate',trees=1,seed=17,as_of=LATER+timedelta(days=1))
    args.update(options)
    return experiment(training,later,**args)


def constant_sample():
    train=snapshot([item(1,1,CUTOFF-timedelta(days=3),event_days=2),
        item(2,2,CUTOFF-timedelta(days=1.5))],CUTOFF)
    later=snapshot([item(3,3,CUTOFF+timedelta(days=1),event_days=1,cutoff=LATER)],LATER)
    return train,later


def test_partial_censor_exposure_and_boundary_event_and_grid_cap_are_exact():
    rows=[item(1,1,CUTOFF-timedelta(days=3.5)),item(2,2,CUTOFF-timedelta(days=3),event_days=2),
        item(3,3,CUTOFF-timedelta(days=3),event_days=2.1),item(4,4,CUTOFF-timedelta(days=7),event_days=6)]
    data=periods(rows,[2,4],Encoder(rows))
    assert data['weights']==pytest.approx([2,1.5,2,2,.1,2,2])
    assert data['y']==pytest.approx([0,0,.5,0,10,0,0])
    assert data['interval_events']==[1,1]
    assert data['interval_exposure_days']==pytest.approx([8,3.6])
    assert data['administratively_capped_checkpoints']==1
    assert sum(w*y for w,y in zip(data['weights'],data['y']))==2


def test_zero_censor_contributes_no_exposure_and_zero_event_is_not_padded():
    zero=item(1,1,CUTOFF)
    data=periods([zero],[2],Encoder([]))
    assert data['x']==[] and data['zero_followup_censored_checkpoints']==1
    with pytest.raises(ValueError,match='Zero-time'):
        periods([item(2,2,CUTOFF,event_days=0)],[2],Encoder([]))


def test_feature_vector_contains_only_frozen_covariates_and_prespecified_interval():
    row=item(1,1,CUTOFF-timedelta(days=3),event_days=2);encoder=Encoder([row])
    changed=deepcopy(row)
    changed['outcome'].update(elapsed_days=99,state='right_censored')
    changed['checkpoint_id']='SECRET';changed['lineage']['report_ids']=[999]
    assert encoder.vector(row,0,0,2)==pytest.approx(encoder.vector(changed,0,0,2),nan_ok=True)
    assert len(encoder.vector(row,0,0,2))==len(FEATURE_NAMES)
    assert not {'event','exposure','duration','checkpoint_id','report_id','verified_at'} & set(FEATURE_NAMES)
    assert math.isnan(encoder.vector(row,0,0,2)[FEATURE_NAMES.index('original_issue_accuracy_max_m')])


def test_real_lightgbm_constant_rate_matches_weighted_poisson_hand_calculation():
    result=run(*constant_sample(),interval_ends=[2])
    assert result['model_status']=='fitted_offline_experiment'
    assert result['expansion']['total_exposure_days']==3.5
    assert result['expansion']['in_grid_event_count']==1
    # No splits with two periods: fitted rate = events / exposure, not mean(event/exposure).
    probability=result['predictions'][0]['horizons'][0]['completion_probability']
    assert probability==pytest.approx(-math.expm1(-2/3.5),rel=1e-6)
    assert len(result['model_text_sha256'])==64 and result['lightgbm_version']
    assert result['temporal_reference']['horizons'][0]['completion_fraction_reference']==1
    assert result['live_inference_allowed'] is result['training_release_eligible'] is result['reusable_model_emitted'] is False


def test_curves_are_monotone_and_abstain_after_context_followup():
    result=run(*samples())
    for prediction in result['predictions']:
        first,second,last=prediction['horizons']
        assert 0<=first['completion_probability']<=second['completion_probability']<=1
        assert last['completion_probability'] is None
        assert last['abstention_reason']=='beyond_context_training_followup'


def test_real_boosted_trees_can_use_frozen_category_without_outcome_covariates():
    from checkpoint_candidate import CATEGORIES
    other=next(c for c in CATEGORIES if c!='Roads & Bridges')
    rows=[]
    for key in range(1,41):
        row=item(key,key,CUTOFF-timedelta(days=3),event_days=1 if key<=20 else 2)
        if key>20:row['features']['concern_categories']=[other]
        rows.append(row)
    holdout=[item(101,101,CUTOFF+timedelta(days=1),event_days=1,cutoff=LATER),
        item(102,102,CUTOFF+timedelta(days=1),event_days=2,cutoff=LATER)]
    holdout[1]['features']['concern_categories']=[other]
    result=run(snapshot(rows,CUTOFF),snapshot(holdout,LATER),interval_ends=[1],trees=30)
    a,b=[p['horizons'][0]['completion_probability'] for p in result['predictions']]
    assert 0<b<a<1
    assert result['expansion']['administratively_capped_checkpoints']==20


def test_single_exposed_period_abstains_without_duplicating_a_record():
    training=snapshot([item(1,1,CUTOFF-timedelta(days=3),event_days=2)],CUTOFF)
    result=run(training,constant_sample()[1],interval_ends=[2])
    assert result['model_status']=='insufficient_exposed_periods_for_runtime'
    assert result['expansion']['person_period_count']==1 and result['model_text_sha256'] is None


def test_future_area_and_category_context_do_not_extend_encoder_or_get_predictions():
    training,later=samples();rows=deepcopy(later['rows'])
    rows[0]['features']['reported_barangay_ids']=[999];rows[0]['lineage']['recorded_barangay_ids']=[999]
    # Use an actual canonical category rather than silently accepting a novel label.
    from checkpoint_candidate import CATEGORIES
    rows[1]['features']['concern_categories']=[next(c for c in CATEGORIES if c!='Roads & Bridges')]
    result=run(training,snapshot(rows,LATER))
    assert result['encoder']['area_vocabulary_size']==1
    for prediction in result['predictions'][:2]:
        assert prediction['context_seen'] is False
        assert all(h['completion_probability'] is None and h['abstention_reason']=='unseen_training_category_area_context' for h in prediction['horizons'])
    assert result['comparisons'][0]['matched_checkpoint_count']==1
    assert result['comparisons'][0]['candidate_coverage']['prediction_count']==1


@pytest.mark.parametrize('kind,status',[
    ('censored','insufficient_exposed_groups_or_in_grid_events'),
    ('zero_event','zero_time_event_requires_clock_or_model_review'),
    ('beyond_grid','insufficient_exposed_groups_or_in_grid_events'),
    ('support','insufficient_training_support'),
])
def test_unsupported_fit_abstains_without_fake_model(kind,status):
    row=item(1,1,CUTOFF-timedelta(days=3),event_days=0 if kind=='zero_event' else 2 if kind!='censored' else None)
    training=snapshot([row],CUTOFF);_,later=constant_sample()
    result=run(training,later,interval_ends=[1 if kind=='beyond_grid' else 2],min_train_events=0,min_train_groups=2 if kind=='support' else 1)
    assert result['model_status']==status
    assert result['model_text_sha256'] is None
    assert all(h['completion_probability'] is None for p in result['predictions'] for h in p['horizons'])


def test_updated_old_labels_and_future_references_cannot_change_fit():
    training,later=samples();original=run(training,later)
    updated=item(2,2,CUTOFF-timedelta(days=2),event_days=4,cutoff=LATER)
    revised=run(training,snapshot(later['rows']+[updated],LATER))
    assert revised['model_text_sha256']==original['model_text_sha256']
    assert revised['predictions']==original['predictions']
    assert revised['temporal_reference']['counts']['historical_outcome_states_changed_later']==1
    rows=deepcopy(later['rows']);rows[0]['lineage']['trigger_report_id']=1;rows[0]['lineage']['grouping_report_ids']=[1,4]
    linked=run(training,snapshot(rows,LATER))
    assert linked['model_text_sha256']==original['model_text_sha256']
    assert len(linked['predictions'])==2
    assert linked['temporal_reference']['counts']['purged_related_future_checkpoints']==1


def test_unknown_horizon_truth_keeps_casewise_error_bounds_and_matched_coverage():
    rows=[item(1,1,CUTOFF,event_days=1),item(2,2,CUTOFF,cutoff=CUTOFF+timedelta(days=1)),item(3,3,CUTOFF,event_days=3)]
    diagnostic=score(rows,[.2,.7,None],2)
    assert diagnostic['prediction_count']==2 and diagnostic['unknown_status_count']==1
    assert diagnostic['known_status_squared_error']==pytest.approx(.64)
    assert diagnostic['squared_error_bounds']==pytest.approx(dict(lower=(.64+.09)/2,upper=(.64+.49)/2))
    result=run(*samples())
    compare=result['comparisons'][0]
    assert compare['candidate_on_matched']['prediction_count']==compare['reference_on_matched']['prediction_count']==3
    assert compare['candidate_on_matched']['unknown_status_count']==compare['reference_on_matched']['unknown_status_count']==1


@pytest.mark.parametrize('options',[
    dict(trees=0),dict(trees=201),dict(seed=-1),dict(seed=True),dict(interval_ends=[2,2]),dict(interval_ends=[float('nan')]),
])
def test_invalid_recipe_fails_before_fit(options):
    with pytest.raises(ValueError):run(*samples(),**options)


def test_cli_runs_real_fit_without_network_database_or_provider_and_refuses_overwrite(tmp_path):
    training,later=constant_sample();a,b,out=[tmp_path/name for name in ('early.json','later.json','result.json')]
    a.write_bytes(canonical(training));b.write_bytes(canonical(later))
    script=Path(__file__).resolve().parents[1]/'scripts'/'experiment_checkpoint_lightgbm.py'
    code="""
import runpy,socket,sys
def denied(*args,**kwargs):raise RuntimeError('Unexpected network call')
class NoNetwork(socket.socket):
    def __new__(cls,*args,**kwargs):return denied()
socket.socket=NoNetwork;socket.create_connection=socket.getaddrinfo=denied
sys.modules['database']=None;sys.modules['gemini_service']=None
sys.argv=sys.argv[1:];runpy.run_path(sys.argv[0],run_name='__main__')
"""
    args=[str(script),'--training',str(a),'--evaluation',str(b),'--source-key','SAMPLE','--grouping','shared_report',
        '--interval-end-days','2','--min-train-groups','1','--min-train-events','1','--trees','1','--seed','17','--output',str(out)]
    result=subprocess.run([sys.executable,'-c',code,*args],capture_output=True,text=True,timeout=45)
    assert result.returncode==0,result.stderr
    saved=out.read_bytes();doc=json.loads(saved)
    assert doc['model_status']=='fitted_offline_experiment' and doc['live_inference_allowed'] is False
    assert cli.main(args[1:])==1 and out.read_bytes()==saved
    assert sorted(p.name for p in tmp_path.iterdir())==['early.json','later.json','result.json']


def test_cli_invalid_private_input_does_not_echo_payload_or_save_result(tmp_path,capsys):
    a,b,out=[tmp_path/name for name in ('bad.json','later.json','result.json')]
    a.write_text('{"SECRET-PRIVATE-INPUT":');b.write_bytes(canonical(samples()[1]))
    assert cli.main(['--training',str(a),'--evaluation',str(b),'--source-key','SAMPLE','--grouping','shared_report',
        '--interval-end-days','2','--min-train-groups','1','--min-train-events','1','--trees','1','--seed','17','--output',str(out)])==2
    assert 'SECRET' not in capsys.readouterr().err and not out.exists()
