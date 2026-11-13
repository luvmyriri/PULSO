"""Real private cohort exports on disposable PostGIS; all data synthetic."""
from datetime import datetime,timedelta,timezone
import json
from uuid import uuid4

import pytest

import models
import gov_models as gm
import gov_crud
from checkpoint_dataset_contract import verify as verify_document
from tests.test_report_learning import learning_context,link,verify,add_field_claim
from tests.test_resident_government_integration import connected,submit

PATH='/api/gov/report-learning/checkpoint-dataset'


def export(client,tokens,**params):
    response=client.get(PATH,headers=tokens['chief'],params=params)
    assert response.status_code==200,response.text
    assert response.headers['cache-control']=='no-store'
    result=response.json();verify_document(result)
    return result


def test_open_case_is_right_censored_without_fake_completion(learning_context):
    client,_,tokens=learning_context
    assert submit(client).status_code==201
    doc=export(client,tokens)
    item,=doc['rows']
    assert item['outcome']['state']=='right_censored' and item['outcome']['elapsed_days']>=0
    assert item['outcome']['verified_at'] is None and item['audit']['censoring_record_eligible']
    assert item['features']['report_count']==1
    assert 'FAKE test pothole' not in json.dumps(doc) and 'guest@test.invalid' not in json.dumps(doc)
    assert doc['manifest']['training_release_eligible'] is False


def test_completed_label_uses_checkpoint_context_even_after_original_intake_changes(learning_context):
    client,sessions,tokens=learning_context
    report=submit(client).json()
    before=export(client,tokens)['rows'][0]
    with sessions() as db:
        snapshot=db.get(models.ReportLearningSnapshot,report['id'])
        snapshot.received_at=datetime.now(timezone.utc)+timedelta(days=50)
        snapshot.features=dict(snapshot.features,reported_barangay_id=999,submitted_categories=['SAMPLE unsupported future category'])
        db.commit()
    verify(client,sessions,tokens,report['id'])
    after=export(client,tokens)['rows'][0]
    assert after['features']==before['features']
    assert after['first_received_at']==before['first_received_at']
    assert after['outcome']['state']=='verified_resolution'
    assert len(after['outcome']['sources'])==1 and after['audit']['duration_label_eligible']
    at=datetime.fromisoformat(after['prediction_at'].replace('Z','+00:00'))
    end=datetime.fromisoformat(after['outcome']['verified_at'].replace('Z','+00:00'))
    assert after['outcome']['elapsed_days']==pytest.approx((end-at).total_seconds()/86400)


def test_linking_preserves_old_populations_as_changed_and_labels_only_current_checkpoint(learning_context):
    client,sessions,tokens=learning_context
    one,two=submit(client).json(),submit(client).json()
    concern=link(client,tokens,one['id'],two['id'])
    partial=export(client,tokens)
    assert partial['manifest']['outcome_state_counts']=={'membership_changed':2,'right_censored':1}
    assert len({row['evaluation_groups']['shared_report'] for row in partial['rows']})==1
    current=next(row for row in partial['rows'] if row['outcome']['state']=='right_censored')
    assert current['features']['report_count']==2 and current['lineage']['report_ids']==[one['id'],two['id']]
    verify(client,sessions,tokens,one['id'])
    current=next(row for row in export(client,tokens)['rows'] if row['concern_id']==concern and row['concern_version']==2)
    assert current['outcome']['state']=='right_censored' and len(current['outcome']['sources'])==1
    verify(client,sessions,tokens,two['id'])
    final=export(client,tokens)
    assert final['manifest']['outcome_state_counts']=={'membership_changed':2,'verified_resolution':1}
    assert final['manifest']['duration_audit_eligible_count']==1
    assert next(row for row in final['rows'] if row['outcome']['state']=='verified_resolution')['features']==current['features']


def test_competing_terminal_member_is_not_censoring_even_when_other_report_is_open(learning_context):
    client,sessions,tokens=learning_context
    one,two=submit(client).json(),submit(client).json();link(client,tokens,one['id'],two['id'])
    with sessions() as db:db.get(models.Report,one['id']).status='cancelled';db.commit()
    current=next(row for row in export(client,tokens)['rows'] if row['concern_version']==2)
    assert current['outcome']['state']=='non_resolution_terminal'
    assert current['outcome']['elapsed_days'] is None and current['outcome']['censored'] is False


def test_invalidated_and_invalid_sources_are_not_completed_training_labels(learning_context):
    client,sessions,tokens=learning_context
    report=submit(client).json();work=verify(client,sessions,tokens,report['id'])
    with sessions() as db:db.get(gm.WorkOrder,work).status='in_progress';db.commit()
    invalid=export(client,tokens)['rows'][0]
    assert invalid['outcome']['state']=='invalid_resolution_evidence'
    assert invalid['outcome']['elapsed_days'] is None
    with sessions() as db:
        gov_crud._sync_report_status(db,report['id'],'in_progress',1,'city_engineer',note='SAMPLE rework changed resolution history.')
        db.commit()
    reopened=export(client,tokens)['rows'][0]
    assert reopened['outcome']['state']=='resolution_invalidated'
    assert reopened['outcome']['censored'] is False
    verify(client,sessions,tokens,report['id'])
    assert export(client,tokens)['rows'][0]['outcome']['state']=='resolution_invalidated'


def test_authorization_and_cross_scope_checkpoint_are_whole_record_only(learning_context):
    client,sessions,tokens=learning_context
    for actor in ('resident','clerk','worker'):assert client.get(PATH,headers=tokens[actor]).status_code==403
    one,two=submit(client).json(),submit(client).json();link(client,tokens,one['id'],two['id'])
    with sessions() as db:
        db.add(models.District(id=4,name='SAMPLE outside district',code='SAMPLE4'));db.flush()
        db.add(models.Barangay(id=202,name='SAMPLE outside barangay',district_id=4));db.flush()
        db.get(models.Report,two['id']).barangay_id=202;db.get(models.Official,1).primary_jurisdiction=[3];db.commit()
    rows=export(client,tokens)['rows']
    # The emptied original concern is a wholly authorized historical population;
    # it remains exportable, without revealing the later mixed-scope concern.
    assert len(rows)==1 and rows[0]['lineage']['report_ids']==[one['id']]
    assert rows[0]['outcome']['state']=='membership_changed'
    assert rows[0]['lineage']['grouping_report_ids']==[one['id']]


def test_bounds_never_return_partial_dataset_and_legacy_intake_is_not_backfilled(learning_context,monkeypatch):
    client,sessions,tokens=learning_context
    one,two=submit(client).json(),submit(client).json()
    response=client.get(PATH,headers=tokens['chief'],params={'max_checkpoints':1})
    assert response.status_code==413 and 'rows' not in response.json()
    with sessions() as db:
        db.add(models.Report(ticket_id='SAMPLE-LEGACY',category='Roads & Bridges',description='SAMPLE legacy record without a checkpoint.',status='pending',barangay_id=171))
        db.commit()
    assert export(client,tokens)['manifest']['row_count']==2
    import checkpoint_dataset_export as module
    monkeypatch.setattr(module,'MAX_BYTES',10)
    assert client.get(PATH,headers=tokens['chief']).status_code==413


def test_export_does_not_mix_labels_from_concurrent_completion(learning_context,monkeypatch):
    client,sessions,tokens=learning_context
    report=submit(client).json()
    import checkpoint_dataset_export as module
    original=module.Reader.row;changed=False
    def complete_during_read(reader,checkpoint):
        nonlocal changed
        if not changed:changed=True;verify(client,sessions,tokens,report['id'])
        return original(reader,checkpoint)
    monkeypatch.setattr(module.Reader,'row',complete_during_read)
    before=export(client,tokens)
    assert before['rows'][0]['outcome']['state']=='right_censored'
    monkeypatch.setattr(module.Reader,'row',original)
    assert export(client,tokens)['rows'][0]['outcome']['state']=='verified_resolution'


def test_unknown_status_and_incomplete_features_never_become_training_ready_defaults(learning_context):
    client,sessions,tokens=learning_context
    one=submit(client,category='SAMPLE unsupported category').json()
    item=export(client,tokens)['rows'][0]
    assert item['features'] is None and item['outcome']['state']=='right_censored'
    assert item['audit']['censoring_record_eligible'] is False
    with sessions() as db:db.get(models.Report,one['id']).status='SAMPLE-unknown-state';db.commit()
    item=export(client,tokens)['rows'][0]
    assert item['outcome']['state']=='data_quality_error' and item['outcome']['elapsed_days'] is None
    assert 'SAMPLE-unknown-state' not in json.dumps(item)


def test_reviewed_asset_references_group_cases_without_becoming_predictors(learning_context):
    client,sessions,tokens=learning_context
    one,two=submit(client).json(),submit(client).json()
    asset='SAMPLE-review-site';photos=[str(uuid4()),str(uuid4())]
    with sessions() as db:
        db.add(gm.InfrastructureAsset(asset_id=asset,asset_name='SAMPLE first-party site',category='Roads',barangay_id=171));db.flush()
        db.add_all([gm.AssetInspectionEvidence(id=eid,asset_id=asset,uploaded_by_id=2,stored_path='SAMPLE-private',content_type='image/png',byte_size=12,sha256='f'*64) for eid in photos]);db.commit()
    now=datetime.now(timezone.utc)
    for report,photo in zip((one,two),photos):add_field_claim(sessions,asset,now-timedelta(days=1),'defect_observed',photo,source_report_id=report['id'])
    rows=export(client,tokens)['rows']
    assert rows[0]['evaluation_groups']['shared_report']!=rows[1]['evaluation_groups']['shared_report']
    assert rows[0]['evaluation_groups']['shared_report_or_reviewed_survey_asset']==rows[1]['evaluation_groups']['shared_report_or_reviewed_survey_asset']
    assert all(row['lineage']['reviewed_survey_asset_ids']==[asset] for row in rows)
    assert all(asset not in json.dumps(row['features']) for row in rows)
    with sessions() as db:
        role=models.SystemRole(name='SAMPLE no maintenance scope',capabilities={'maintenance':[]});db.add(role);db.flush()
        db.get(models.Official,1).role_id=role.id;db.commit()
    limited=export(client,tokens)
    assert limited['manifest']['asset_reference_coverage']=='no_maintenance_access'
    assert asset not in json.dumps(limited)


def test_export_omits_incomplete_rosters_and_fails_instead_of_truncating_scan(learning_context,monkeypatch):
    client,_,tokens=learning_context
    one,two=submit(client).json(),submit(client).json()
    import concern_checkpoints
    import checkpoint_dataset_export as module
    monkeypatch.setattr(concern_checkpoints,'MAX_OBSERVATIONS',1)
    link(client,tokens,one['id'],two['id'])
    result=export(client,tokens)
    assert result['manifest']['row_count']==2
    assert all(row['outcome']['state']=='membership_changed' for row in result['rows'])
    monkeypatch.setattr(module,'MAX_SCAN',1)
    response=client.get(PATH,headers=tokens['chief'])
    assert response.status_code==413 and 'rows' not in response.json()
