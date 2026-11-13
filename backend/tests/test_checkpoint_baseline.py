"""Synthetic hand-checkable censoring/temporal diagnostics; no ETA validation."""
from copy import deepcopy
from datetime import datetime,timedelta,timezone
from io import BytesIO
import json
from pathlib import Path
import subprocess
import sys

import pytest

from checkpoint_baseline import evaluate
from checkpoint_dataset_contract import seal,verify
from learning_dataset_contract import canonical
from scripts import evaluate_checkpoint_baseline as cli
from tests.test_checkpoint_dataset_contract import row as template

BASE=datetime(2026,10,1,tzinfo=timezone.utc)
CUTOFF=BASE+timedelta(days=10)
LATER=CUTOFF+timedelta(days=10)


def item(key,report,prediction,*,event_days=None,cutoff=CUTOFF,state=None):
    result=template(key,report,'verified_resolution' if event_days is not None else 'right_censored')
    result['prediction_at']=prediction.isoformat();result['first_received_at']=(prediction-timedelta(days=3)).isoformat()
    duration=event_days if event_days is not None else (cutoff-prediction).total_seconds()/86400
    outcome=result['outcome'];outcome['elapsed_days']=duration;outcome['total_since_first_received_days']=duration+3
    if event_days is not None:
        outcome['verified_at']=(prediction+timedelta(days=event_days)).isoformat()
        outcome['sources'][0]['verified_at']=outcome['verified_at']
    if state:
        outcome.update(state=state,censored=False,elapsed_days=None,total_since_first_received_days=None,verified_at=None,sources=[])
        result['audit']=dict(duration_label_eligible=False,censoring_record_eligible=False,reasons=[state])
    return result


def snapshot(rows,at,*,assets=True):
    doc=seal(rows,at,include_assets=assets,data_origin='synthetic');verify(doc);return doc


def samples():
    training=snapshot([item(1,1,CUTOFF-timedelta(days=8),event_days=2),item(2,2,CUTOFF-timedelta(days=2)),
        item(3,3,CUTOFF-timedelta(days=7),event_days=4)],CUTOFF)
    later=snapshot([item(4,4,CUTOFF+timedelta(days=1),event_days=1,cutoff=LATER),
        item(5,5,LATER-timedelta(days=1),cutoff=LATER),item(6,6,CUTOFF+timedelta(days=2),event_days=6,cutoff=LATER)],LATER)
    return training,later


def check(training,later,**options):
    args=dict(grouping='shared_report',horizons_days=[2,4,10],min_train_groups=1,min_train_events=1,source_key='SAMPLE-instance',
        as_of=LATER+timedelta(days=1));args.update(options)
    return evaluate(training,later,**args)


def test_kaplan_meier_uses_censoring_and_ties_and_does_not_extrapolate_the_tail():
    result=check(*samples())
    assert result['reference']['median_days']==4
    assert result['counts']['training_completion_events']==2
    assert result['counts']['training_censored_checkpoints']==1
    assert result['horizons'][0]['completion_fraction_reference']==pytest.approx(1/3)
    assert result['horizons'][1]['completion_fraction_reference']==1
    assert result['horizons'][2]['completion_fraction_reference'] is None
    assert result['horizons'][2]['reference_status']=='beyond_observed_training_followup'
    assert result['live_inference_allowed'] is False and result['training_release_eligible'] is False


def test_censored_holdout_truth_is_unknown_not_a_fabricated_negative():
    result=check(*samples());row=result['horizons'][0]
    assert row['known_status_count']==2 and row['unknown_status_count']==1
    assert row['known_status_squared_error']==pytest.approx(5/18)
    assert row['full_holdout_squared_error_bounds']['lower']==pytest.approx(2/9)
    assert row['full_holdout_squared_error_bounds']['upper']==pytest.approx(1/3)
    assert row['known_status_fraction']==pytest.approx(2/3)


def test_later_completion_of_an_old_training_checkpoint_cannot_enter_training_labels():
    training,later=samples()
    updated=item(2,2,CUTOFF-timedelta(days=2),event_days=4,cutoff=LATER)
    later=snapshot(later['rows']+[updated],LATER)
    result=check(training,later)
    assert result['counts']['training_completion_events']==2
    assert result['reference']['median_days']==4
    assert result['counts']['future_checkpoints']==3
    assert result['counts']['historical_outcome_states_changed_later']==1


def test_later_invalidation_cannot_remove_an_event_known_at_training_cutoff():
    training,later=samples();changed=deepcopy(training['rows'][0])
    changed['outcome'].update(state='resolution_invalidated',censored=False,verified_at=None,elapsed_days=None,total_since_first_received_days=None)
    changed['audit']=dict(duration_label_eligible=False,censoring_record_eligible=False,reasons=['resolution_invalidated'])
    later=snapshot(later['rows']+[changed],LATER)
    result=check(training,later)
    assert result['counts']['training_completion_events']==2
    assert result['reference']['median_days']==4
    assert result['counts']['historical_eligibility_changed_later']==1


def test_joint_future_asset_reference_purges_related_holdout_without_changing_predictors():
    training,later=samples()
    training['rows'][0]['lineage']['reviewed_survey_asset_ids']=['SAMPLE-asset']
    later['rows'][0]['lineage']['reviewed_survey_asset_ids']=['SAMPLE-asset']
    training=snapshot(training['rows'],CUTOFF);later=snapshot(later['rows'],LATER)
    report_only=check(training,later)
    grouped=check(training,later,grouping='shared_report_or_reviewed_survey_asset')
    assert report_only['counts']['holdout_eligible_checkpoints']==3
    assert grouped['counts']['purged_related_future_checkpoints']==1
    assert grouped['counts']['holdout_eligible_checkpoints']==2
    assert grouped['reference']==report_only['reference']


def test_later_merging_of_historical_groups_cannot_change_training_support():
    training,later=samples()
    old_event=deepcopy(training['rows'][0]);old_censored=item(2,2,CUTOFF-timedelta(days=2),cutoff=LATER)
    for record in (old_event,old_censored):record['lineage']['reviewed_survey_asset_ids']=['SAMPLE-later-link']
    later=snapshot(later['rows']+[old_event,old_censored],LATER)
    result=check(training,later,grouping='shared_report_or_reviewed_survey_asset',min_train_groups=3)
    assert result['reference_status']=='available_descriptive_only'
    assert result['counts']['training_eligible_groups']==3
    assert result['counts']['joint_training_eligible_groups_after_later_references']==2
    assert result['reference']['median_days']==4


def test_excluded_historical_footprints_also_purge_later_related_cases():
    training,later=samples()
    training=snapshot(training['rows']+[item(7,4,CUTOFF-timedelta(days=1),state='membership_changed')],CUTOFF)
    result=check(training,later)
    assert result['counts']['training_excluded_states']=={'membership_changed':1}
    assert result['counts']['purged_related_future_checkpoints']==1
    assert result['counts']['holdout_eligible_checkpoints']==2


def test_all_censored_and_empty_training_leave_median_unknown():
    _,later=samples()
    training=snapshot([item(1,1,CUTOFF-timedelta(days=2))],CUTOFF)
    result=check(training,later,min_train_events=0)
    assert result['reference']['median_days'] is None
    assert result['horizons'][0]['completion_fraction_reference']==0
    insufficient=check(training,later,min_train_events=1)
    assert insufficient['reference_status']=='insufficient_training_support'
    assert all(row['completion_fraction_reference'] is None for row in insufficient['horizons'])
    empty=check(snapshot([],CUTOFF),later)
    assert empty['reference']['median_days'] is None and empty['reference']['curve']==[]


def test_no_independent_future_holdout_never_becomes_a_perfect_score():
    training,_=samples()
    later=snapshot([item(4,1,CUTOFF+timedelta(days=1),event_days=1,cutoff=LATER)],LATER)
    result=check(training,later)
    assert result['holdout_status']=='none_after_temporal_group_and_eligibility_filters'
    assert result['horizons'][0]['known_status_squared_error'] is None


def test_future_exclusions_and_late_visible_old_points_are_accounted_without_training():
    training,later=samples()
    later=snapshot(later['rows']+[item(7,7,CUTOFF+timedelta(days=1),cutoff=LATER,state='membership_changed'),
        item(8,8,CUTOFF-timedelta(days=2),event_days=1,cutoff=LATER)],LATER)
    result=check(training,later)
    assert result['counts']['future_checkpoints']==4
    assert result['counts']['holdout_excluded_states']=={'membership_changed':1}
    assert result['counts']['newly_visible_pre_cutoff_checkpoints']==1
    assert result['counts']['training_eligible_checkpoints']==3
    assert {'excluded_future','newly_visible_nonfuture'}<={row['role'] for row in result['assignments']}


@pytest.mark.parametrize('options',[
    {'horizons_days':[float('nan')]},{'horizons_days':[2,2]},{'horizons_days':[]},
    {'min_train_groups':True},{'min_train_events':-1},{'grouping':'random_split'},
    {'source_key':'PRIVATE@example.invalid'},
])
def test_invalid_working_policy_is_rejected(options):
    with pytest.raises(ValueError):check(*samples(),**options)


def test_same_or_future_cutoffs_and_changed_frozen_context_are_rejected():
    training,later=samples()
    with pytest.raises(ValueError):check(training,training)
    with pytest.raises(ValueError):check(training,later,as_of=CUTOFF)
    changed=deepcopy(training['rows'][0]);changed['features']['concern_categories']=['Drainage & Flooding']
    later=snapshot(later['rows']+[changed],LATER)
    with pytest.raises(ValueError,match='Frozen'):check(training,later)


def test_requested_asset_grouping_requires_both_snapshots_to_have_coverage():
    training,later=samples();training=snapshot(training['rows'],CUTOFF,assets=False)
    with pytest.raises(ValueError,match='unavailable'):check(training,later,grouping='shared_report_or_reviewed_survey_asset')


def test_known_horizon_status_includes_censoring_exactly_at_the_horizon():
    training,_=samples()
    later=snapshot([item(4,4,LATER-timedelta(days=2),cutoff=LATER)],LATER)
    result=check(training,later)
    assert result['horizons'][0]['known_status_count']==1
    assert result['horizons'][0]['unknown_status_count']==0


def test_cli_is_exclusive_and_private_errors_do_not_echo_input(tmp_path,capsys):
    training,later=samples();a=tmp_path/'train.json';b=tmp_path/'later.json';out=tmp_path/'result.json'
    a.write_bytes(canonical(training));b.write_bytes(canonical(later))
    args=['--training',str(a),'--evaluation',str(b),'--source-key','SAMPLE','--grouping','shared_report',
        '--horizon-days','2','--min-train-groups','1','--min-train-events','1','--output',str(out)]
    assert cli.main(args)==0
    original=out.read_bytes()
    assert cli.main(args)==1 and out.read_bytes()==original
    training['rows'][0]['features']['PRIVATE_contact']='SAMPLE-PRIVATE@example.invalid';a.write_bytes(canonical(training))
    assert cli.main(args[:-1]+[str(tmp_path/'invalid.json')])==2
    assert not (tmp_path/'invalid.json').exists()
    assert 'SAMPLE-PRIVATE' not in str(capsys.readouterr())


def test_standalone_cli_needs_no_network_database_or_provider(tmp_path):
    training,later=samples();a=tmp_path/'train.json';b=tmp_path/'later.json';out=tmp_path/'result.json'
    a.write_bytes(canonical(training));b.write_bytes(canonical(later))
    script=Path(__file__).resolve().parents[1]/'scripts'/'evaluate_checkpoint_baseline.py'
    code="""
import runpy,socket,sys
def denied(*args,**kwargs):raise RuntimeError('Unexpected network call')
class NoNetwork(socket.socket):
    def __new__(cls,*args,**kwargs):return denied()
socket.socket=NoNetwork;socket.create_connection=socket.getaddrinfo=denied
sys.modules['database']=None;sys.modules['gemini_service']=None
sys.argv=sys.argv[1:];runpy.run_path(sys.argv[0],run_name='__main__')
"""
    result=subprocess.run([sys.executable,'-c',code,str(script),'--training',str(a),'--evaluation',str(b),
        '--source-key','SAMPLE','--grouping','shared_report','--horizon-days','2','--min-train-groups','1','--min-train-events','1',
        '--output',str(out)],capture_output=True,text=True,timeout=30)
    assert result.returncode==0,result.stderr
    assert json.loads(out.read_bytes())['live_inference_allowed'] is False
