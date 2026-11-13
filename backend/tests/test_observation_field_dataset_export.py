"""Real authorized coverage exports; all cases and private photos are synthetic."""
from datetime import datetime,timezone

import pytest

import models
import gov_models as gm
import observation_field_dataset_export as exporter
import asset_inspection_router
from observation_field_dataset_contract import verify as verify_document
from tests.test_resident_government_integration import connected,submit
from tests.test_observation_field_assessments import assessment_context,setup_case,payload,send,capture,accept,path,CATEGORIES
from tests.test_report_learning import verify as verify_report

PATH='/api/gov/report-learning/observation-field-dataset'


def export(client,tokens,**params):
    response=client.get(PATH,headers=tokens['chief'],params=params)
    assert response.status_code==200,response.text
    assert response.headers['cache-control']=='no-store' and response.headers['x-content-type-options']=='nosniff'
    result=response.json();verify_document(result);return result


def test_no_assessments_are_exported_as_gaps_not_removed_cases(assessment_context):
    client,sessions,tokens=assessment_context
    report=submit(client).json()['id'];doc=export(client,tokens)
    assert doc['manifest']['row_count']==1 and doc['manifest']['assessment_count']==0
    assert doc['rows'][0]['problem']['report_id']==report
    assert doc['rows'][0]['category_coverage']==[dict(category='Roads & Bridges',state='not_recorded',finding=None)]
    assert doc['manifest']['training_release_eligible'] is False
    with sessions() as db:assert db.query(models.ObservationFieldAssessment).count()==0


def test_per_category_findings_and_report_verification_remain_separate(assessment_context):
    client,sessions,tokens=assessment_context;report,item,source,_=setup_case(assessment_context)
    assert send(client,tokens,report,item,payload(client,tokens,report,item,source)).status_code==200
    before=export(client,tokens)
    assert before['manifest']['category_coverage_state_counts']=={'reviewed_condition':2}
    assert before['manifest']['sourced_verified_report_count']==0
    verify_report(client,sessions,tokens,report)
    after=export(client,tokens)
    assert after['manifest']['sourced_verified_report_count']==1
    assert after['rows'][0]['report_completion']['source_kind']=='work_order_inspection'
    assert after['rows'][0]['report_completion']['event_id']
    # Resolution changes the frozen report context, requiring another explicit assessment.
    assert after['manifest']['category_coverage_state_counts']=={'historical_or_changed_context':2}
    assert after['manifest']['current_known_finding_counts']=={}
    assert 'guest@test.invalid' not in str(after) and 'SAMPLE reviewer identified' not in str(after)
    assert 'location_metadata' not in str(after) and 'stored_path' not in str(after)


def test_complete_history_survives_correction_with_uncertainty_preserved(assessment_context):
    client,_,tokens=assessment_context;report,item,source,_=setup_case(assessment_context)
    assert send(client,tokens,report,item,payload(client,tokens,report,item,source)).status_code==200
    correction=payload(client,tokens,report,item,source)
    for part in correction['category_findings']:part['finding']='not_assessed'
    assert send(client,tokens,report,item,correction).status_code==200
    doc=export(client,tokens);row,=doc['rows']
    assert [a['revision'] for a in row['assessments']]==[1,2]
    assert row['assessments'][0]['context_blockers']==['superseded_by_later_assessment']
    assert doc['manifest']['category_coverage_state_counts']=={'not_assessed':2}


def test_asset_and_historical_scope_omit_whole_observation_without_hidden_counts(assessment_context):
    client,sessions,tokens=assessment_context;report,item,source,asset=setup_case(assessment_context)
    assert send(client,tokens,report,item,payload(client,tokens,report,item,source)).status_code==200
    unassessed=submit(client).json()['id']
    with sessions() as db:
        db.add(models.District(id=4,name='SAMPLE outside district',code='SAMPLE4'));db.flush()
        db.add(models.Barangay(id=202,name='SAMPLE outside area',district_id=4));db.flush()
        db.get(gm.InfrastructureAsset,asset).barangay_id=202
        db.get(models.Official,1).primary_jurisdiction=[3];db.commit()
    doc=export(client,tokens)
    assert [r['problem']['report_id'] for r in doc['rows']]==[unassessed]
    assert doc['manifest']['assessment_count']==0 and doc['manifest']['legacy_report_ids_without_observations']==[]
    assert 'omitted_count' not in doc['manifest']


def test_bounds_fail_whole_and_explicit_report_selection_recovers_a_bounded_slice(assessment_context,monkeypatch):
    client,_,tokens=assessment_context;first=submit(client).json()['id'];submit(client)
    assert client.get(PATH,params={'max_observations':1},headers=tokens['chief']).status_code==413
    doc=export(client,tokens,max_observations=1,report_id=first)
    assert doc['manifest']['selection_report_id']==first and doc['manifest']['row_count']==1
    assert client.get(PATH,params={'report_id':99999},headers=tokens['chief']).status_code==404
    report,item,source,_=setup_case(assessment_context)
    assert send(client,tokens,report,item,payload(client,tokens,report,item,source)).status_code==200
    monkeypatch.setattr(exporter,'MAX_EVIDENCE_SCAN_BYTES',1)
    response=client.get(PATH,headers=tokens['chief'],params={'report_id':report})
    assert response.status_code==413 and 'rows' not in response.json()


def test_missing_or_corrupt_bytes_leave_explicit_noncurrent_findings(assessment_context):
    client,sessions,tokens=assessment_context;report,item,source,_=setup_case(assessment_context)
    assert send(client,tokens,report,item,payload(client,tokens,report,item,source)).status_code==200
    with sessions() as db:
        field=db.get(gm.AssetFieldObservation,source);evidence=db.get(gm.AssetInspectionEvidence,field.evidence_reference)
        location=asset_inspection_router.EVIDENCE_ROOT/evidence.stored_path
    location.unlink()
    doc=export(client,tokens)
    assert doc['manifest']['category_coverage_state_counts']=={'historical_or_changed_context':2}
    assert 'private_evidence_missing_or_changed' in doc['rows'][0]['assessments'][0]['context_blockers']


def test_repeated_photo_checks_are_cached_under_the_actual_read_budget(assessment_context,monkeypatch):
    import observation_field_assessments as service
    client,sessions,tokens=assessment_context;report,item,source,_=setup_case(assessment_context)
    assert send(client,tokens,report,item,payload(client,tokens,report,item,source)).status_code==200
    correction=payload(client,tokens,report,item,source)
    for part in correction['category_findings']:part['finding']='not_assessed'
    assert send(client,tokens,report,item,correction).status_code==200
    with sessions() as db:
        f=db.get(gm.AssetFieldObservation,source);size=db.get(gm.AssetInspectionEvidence,f.evidence_reference).byte_size
    monkeypatch.setattr(exporter,'MAX_EVIDENCE_SCAN_BYTES',size+1)
    original=service.file_available;calls=[]
    def checked(evidence,root):calls.append(evidence.id);return original(evidence,root)
    monkeypatch.setattr(service,'file_available',checked)
    doc=export(client,tokens)
    assert doc['manifest']['assessment_count']==2 and len(calls)==1


def test_legacy_reports_without_items_are_explicit_gaps_not_backfilled(assessment_context):
    client,sessions,tokens=assessment_context
    with sessions() as db:
        report=models.Report(ticket_id='SAMPLE-LEGACY',category='Roads',status='pending',barangay_id=171,
            created_at=datetime.now(timezone.utc),description='SAMPLE legacy report without structured observations.')
        db.add(report);db.commit();rid=report.id
    doc=export(client,tokens)
    assert doc['manifest']['row_count']==0 and doc['manifest']['legacy_report_ids_without_observations']==[rid]
    with sessions() as db:assert db.query(models.ReportObservation).count()==0


@pytest.mark.parametrize('actor',['resident','clerk','inspector'])
def test_access_requires_existing_insights_report_and_maintenance_authority(assessment_context,actor):
    client,sessions,tokens=assessment_context
    # An inspector default has insights and maintenance but no reports module in this test's explicit role grant.
    if actor=='inspector':
        role=models.SystemRole(name='SAMPLE constrained inspector',capabilities={'reports':[]})
        with sessions() as db:
            db.add(role);db.flush();db.get(models.Official,3).role_id=role.id;db.commit()
    response=client.get(PATH,headers=tokens[actor])
    assert response.status_code==403,response.text
