"""Bounded field-source retrieval does not decide object/problem identity."""
from datetime import timedelta

import models
import gov_models as gm
from tests.test_resident_government_integration import connected,submit
from tests.test_observation_field_assessments import assessment_context,setup_case,path,capture


def test_source_picker_is_scoped_and_can_record_flags_are_server_authoritative(assessment_context):
    client,_,tokens=assessment_context;report,item,source,_=setup_case(assessment_context)
    context=client.get('/api/report-intelligence/reports/'+str(report),headers=tokens['chief']).json()
    assert context['can_view_field_assessments'] is True
    assert client.get('/api/report-intelligence/reports/'+str(report),headers=tokens['clerk']).json()['can_view_field_assessments'] is False
    result=client.get(path(report,item)+'/sources',headers=tokens['chief'])
    assert result.status_code==200 and result.headers['cache-control']=='no-store'
    row,=result.json()['items'];assert row['id']==source and row['source_relation']=='recorded_report_reference'
    assert result.json()['not_exhaustive'] is True
    assert client.get(path(report,item),headers=tokens['chief']).json()['can_record_review'] is True
    assert client.get(path(report,item)+'/sources',headers=tokens['resident']).status_code==403


def test_unbound_same_area_visits_are_suggestions_and_other_report_or_older_visits_are_not(assessment_context):
    client,sessions,tokens=assessment_context;report,item,source,_=setup_case(assessment_context)
    other=submit(client).json()['id'];another=capture(client,tokens,other)['observation']['id']
    assert [r['id'] for r in client.get(path(report,item)+'/sources',headers=tokens['chief']).json()['items']]==[source]
    with sessions() as db:
        db.get(gm.AssetFieldObservation,another).source_report_id=None;db.commit()
    rows=client.get(path(report,item)+'/sources',headers=tokens['chief']).json()['items']
    assert next(r for r in rows if r['id']==another)['source_relation']=='same_recorded_area_only'
    with sessions() as db:
        db.get(gm.AssetFieldObservation,another).observed_at=db.get(models.Report,report).created_at-timedelta(days=1);db.commit()
    assert [r['id'] for r in client.get(path(report,item)+'/sources',headers=tokens['chief']).json()['items']]==[source]
