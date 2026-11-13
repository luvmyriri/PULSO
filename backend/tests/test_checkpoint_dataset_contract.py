"""Synthetic cohort-contract checks; no real ETA or performance claim."""
from copy import deepcopy
from datetime import datetime,timedelta,timezone
from uuid import UUID
from io import BytesIO

import pytest

from checkpoint_dataset_contract import seal,verify,TARGET
from learning_dataset_contract import canonical
from scripts import export_report_learning as cli

AT=datetime(2026,11,1,tzinfo=timezone.utc)


def row(key=1,report=1,state='right_censored'):
    done=state=='verified_resolution';qualified=state in {'right_censored','verified_resolution'}
    return dict(checkpoint_id=str(UUID(int=key)),checkpoint_sha256='a'*64,concern_id='CON-'+f'{key:032x}',concern_version=1,
        prediction_at=AT.isoformat(),first_received_at=(AT-timedelta(days=3)).isoformat(),
        features=dict(concern_categories=['Roads & Bridges'],report_count=1,observation_count=1,unreviewed_observation_count=1,
            reviewer_confirmed_observation_count=0,reviewer_separated_observation_count=0,elapsed_before_checkpoint_days=3,
            reported_barangay_ids=[171],original_location_source_counts=dict(device=0,manual=1,search=0,uploaded_metadata=0,unknown=0),
            original_photo_source_counts=dict(camera=0,upload=1,unknown=0),original_issue_accuracy_known_count=0,original_issue_accuracy_max_m=None),
        lineage=dict(report_ids=[report],observation_ids=[report*10],trigger_report_id=report,grouping_report_ids=[report],
            recorded_barangay_ids=[171],reviewed_survey_asset_ids=[]),
        outcome=dict(state=state,target=TARGET,elapsed_days=1 if done else 2 if qualified else None,
            total_since_first_received_days=4 if done else 5 if qualified else None,censored=state=='right_censored',
            verified_at=(AT+timedelta(days=1)).isoformat() if done else None,
            sources=[dict(report_id=report,event_id=key,timeline_id=key,inspection_id=key,project_id=None,verified_at=(AT+timedelta(days=1)).isoformat())] if done else []),
        audit=dict(duration_label_eligible=done,censoring_record_eligible=state=='right_censored',reasons=[] if qualified else [state]))


def document(rows=None):
    return seal(rows if rows is not None else [row()],AT+timedelta(days=2),include_assets=True)


def test_valid_censored_and_verified_labels_keep_different_clocks():
    doc=document([row(),row(2,2,'verified_resolution')])
    assert verify(doc)['duration_audit_eligible_count']==1
    assert doc['rows'][1]['outcome']['elapsed_days']==1
    assert doc['rows'][1]['outcome']['total_since_first_received_days']==4
    assert doc['manifest']['training_release_eligible'] is False


def test_grouping_keeps_related_checkpoints_trigger_reports_assets_and_areas_together():
    rows=[row(1,1),row(2,1),row(3,3),row(4,4)]
    rows[1]['lineage']['trigger_report_id']=3;rows[1]['lineage']['grouping_report_ids']=[1,3]
    rows[2]['lineage']['reviewed_survey_asset_ids']=['SAMPLE-site']
    rows[3]['lineage']['reviewed_survey_asset_ids']=['SAMPLE-site']
    doc=document(rows);verify(doc)
    a,b,c,d=doc['rows']
    assert a['evaluation_groups']['shared_report']==b['evaluation_groups']['shared_report']==c['evaluation_groups']['shared_report']
    assert c['evaluation_groups']['shared_report']!=d['evaluation_groups']['shared_report']
    assert c['evaluation_groups']['shared_report_or_reviewed_survey_asset']==d['evaluation_groups']['shared_report_or_reviewed_survey_asset']


@pytest.mark.parametrize('change',[
    lambda r:r['features'].update(latitude=14.7),
    lambda r:r['features'].update(report_count=2),
    lambda r:r['features'].update(elapsed_before_checkpoint_days=0),
    lambda r:r['features']['original_photo_source_counts'].update(upload=True),
    lambda r:r['outcome'].update(elapsed_days=0),
    lambda r:r['outcome'].update(censored=False),
    lambda r:r['audit'].update(duration_label_eligible=True),
    lambda r:r.update(prediction_at=(AT+timedelta(days=3)).isoformat()),
    lambda r:r['lineage'].update(grouping_report_ids=[2]),
    lambda r:r['lineage'].update(report_ids=[True]),
])
def test_resealed_wrong_features_clock_counts_and_labels_are_rejected(change):
    item=row();change(item)
    with pytest.raises(ValueError):verify(document([item]))


def test_excluded_or_competing_outcomes_cannot_be_zero_day_repairs_or_censored():
    for state in ('membership_changed','non_resolution_terminal','resolution_invalidated','already_terminal_at_checkpoint'):
        item=row(state=state);verify(document([item]))
        item['outcome']['elapsed_days']=0
        with pytest.raises(ValueError):verify(document([item]))


def test_verified_labels_require_all_frozen_report_sources_after_checkpoint():
    for change in (lambda r:r['outcome']['sources'].clear(),
        lambda r:r['outcome']['sources'][0].update(report_id=2),
        lambda r:r['outcome']['sources'][0].update(project_id=1),
        lambda r:r['outcome']['sources'][0].update(verified_at=(AT-timedelta(days=1)).isoformat())):
        item=row(state='verified_resolution');change(item)
        with pytest.raises(ValueError):verify(document([item]))


def test_tampering_and_duplicate_versions_do_not_verify():
    doc=document();doc['rows'][0]['features']['report_count']=2
    with pytest.raises(ValueError,match='checksum'):verify(doc)
    item=row();other=deepcopy(item);other['checkpoint_id']=str(UUID(int=2))
    with pytest.raises(ValueError):verify(document([item,other]))


def test_collector_recognizes_checkpoint_schema_offline_and_fetches_correct_endpoint(tmp_path,monkeypatch,capsys):
    doc=document();src=tmp_path/'source.json';src.write_bytes(canonical(doc))
    assert cli.main(['verify','--input',str(src)])==0
    assert 'checkpoint rows' in capsys.readouterr().out
    calls=[]
    def response(request):
        calls.append(request.full_url);return BytesIO(canonical(doc))
    monkeypatch.setattr(cli,'open_request',response);monkeypatch.setenv('PULSO_LEARNING_TOKEN','SAMPLE-token')
    out=tmp_path/'download.json'
    assert cli.main(['fetch','--dataset','checkpoints','--base-url','http://127.0.0.1:33161','--max-cases','8','--output',str(out)])==0
    assert calls==['http://127.0.0.1:33161/api/gov/report-learning/checkpoint-dataset?max_checkpoints=8']
    assert out.read_bytes()==canonical(doc)+b'\n'


def test_fetch_refuses_another_valid_dataset_without_creating_the_requested_file(tmp_path,monkeypatch):
    from matching_dataset_contract import seal as matching
    wrong=matching([],AT)
    monkeypatch.setattr(cli,'open_request',lambda *_:BytesIO(canonical(wrong)))
    monkeypatch.setenv('PULSO_LEARNING_TOKEN','SAMPLE-token')
    output=tmp_path/'wrong.json'
    assert cli.main(['fetch','--dataset','checkpoints','--output',str(output)])==1
    assert not output.exists()


def test_synthetic_origin_is_explicit_and_self_attestation_cannot_approve_training():
    doc=seal([row()],AT+timedelta(days=2),include_assets=False,data_origin='synthetic')
    assert verify(doc)['training_release_eligible'] is False
    promoted=seal([row()],AT+timedelta(days=2),include_assets=False,data_origin='field_collected')
    with pytest.raises(ValueError):verify(promoted)
