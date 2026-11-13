"""Actual API exports reach real LightGBM; every case is synthetic/disposable."""
from checkpoint_candidate import experiment
from tests.test_report_learning import learning_context,verify,link
from tests.test_resident_government_integration import connected,submit
from tests.test_checkpoint_dataset_export import export


def test_verified_source_to_two_snapshots_to_fit_then_related_case_purge(learning_context):
    client,sessions,tokens=learning_context
    first=submit(client).json();verify(client,sessions,tokens,first['id'])
    another=submit(client).json();verify(client,sessions,tokens,another['id'])
    earlier_open=submit(client).json()
    training=export(client,tokens)
    duration=max(r['outcome']['elapsed_days'] for r in training['rows'])
    assert duration>0
    second=submit(client).json();later=export(client,tokens)
    policy=dict(grouping='shared_report',interval_ends=[duration],min_train_groups=1,min_train_events=1,
        source_key='SAMPLE-disposable-api',trees=1,seed=17)
    result=experiment(training,later,**policy)
    assert result['model_status']=='fitted_offline_experiment'
    assert result['expansion']['in_grid_event_count']==2 and result['expansion']['person_period_count']==3
    assert result['temporal_reference']['counts']['holdout_eligible_checkpoints']==1
    assert 0<=result['predictions'][0]['horizons'][0]['completion_probability']<=1
    assert result['live_inference_allowed'] is result['training_release_eligible'] is False
    link(client,tokens,earlier_open['id'],second['id'])
    grouped=experiment(training,export(client,tokens),**policy)
    assert grouped['predictions']==[]
    assert grouped['temporal_reference']['counts']['purged_related_future_checkpoints']==2
    assert grouped['model_text_sha256']==result['model_text_sha256']
