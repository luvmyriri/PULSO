"""Temporal analysis consumes actual authorized exports; all reports synthetic."""
from checkpoint_baseline import evaluate
from tests.test_report_learning import learning_context,link
from tests.test_resident_government_integration import connected,submit
from tests.test_checkpoint_dataset_export import export


def test_two_saved_api_snapshots_keep_new_case_separate_until_later_grouping_is_known(learning_context):
    client,_,tokens=learning_context
    first=submit(client).json();training=export(client,tokens)
    second=submit(client).json();later=export(client,tokens)
    policy=dict(grouping='shared_report',horizons_days=[1],min_train_groups=1,min_train_events=0,source_key='SAMPLE-api-instance')
    independent=evaluate(training,later,**policy)
    assert independent['counts']['training_eligible_checkpoints']==1
    assert independent['counts']['future_checkpoints']==independent['counts']['holdout_eligible_checkpoints']==1
    assert independent['reference']['median_days'] is None
    assert independent['live_inference_allowed'] is False
    link(client,tokens,first['id'],second['id'])
    grouped=export(client,tokens)
    result=evaluate(training,grouped,**policy)
    assert result['counts']['purged_related_future_checkpoints']==2
    assert result['counts']['holdout_eligible_checkpoints']==0
    assert result['counts']['training_eligible_checkpoints']==1
    assert result['counts']['historical_outcome_states_changed_later']==1
    assert result['holdout_status']=='none_after_temporal_group_and_eligibility_filters'
