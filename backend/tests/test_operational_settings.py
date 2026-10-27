"""Operational controls must change persisted, observable behavior."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timedelta,timezone
from unittest.mock import patch
import pytest
import models,staff_accounts,system_settings,report_review,gemini_service
import gov_models as gm
from tests.test_government_workspace import context


def save(client,tokens,key,value,version=0,reference=None):
    return client.put('/api/admin/settings/'+key,json={'value':value,'expected_version':version,'reason':'FAKE reviewed configuration change','source_reference':reference},headers=tokens['platform'])


def test_settings_get_is_read_only_and_does_not_seed_legal_or_sensor_claims(context):
    client,sessions,tokens=context
    for _ in range(2):
        result=client.get('/api/admin/settings',headers=tokens['platform'])
        assert result.status_code==200,result.text
    data={item['key']:item for item in result.json()['settings']}
    assert data['sla_response_time']['value'] is None
    assert data['ai_flood_drainage_risk']['operational_status']=='not_connected'
    assert data['activity_log_security']['operational_status']=='historical_integrity_not_verified'
    assert data['record_storage_duration']['can_edit'] is False
    with sessions() as db:
        assert db.query(models.SystemSetting).count()==0
        assert db.query(models.SystemSettingHistory).count()==0
        assert db.query(gm.AuditLog).count()==0


def test_settings_save_versions_history_and_audit_are_one_transaction(context):
    client,sessions,tokens=context
    result=save(client,tokens,'report_review_routing',{'enabled':False})
    assert result.status_code==200,result.text
    assert result.json()['version']==1 and result.json()['value']=={'enabled':False}
    with sessions() as db:
        row=db.query(models.SystemSetting).one()
        history=db.query(models.SystemSettingHistory).one()
        assert row.version==1 and row.updated_by_id==6
        assert history.old_value is None and history.version==0 and history.new_value['enabled'] is False
        assert db.query(gm.AuditLog).filter_by(action='Operational setting changed').count()==1
    assert save(client,tokens,'report_review_routing',{'enabled':True},version=0).status_code==409
    assert save(client,tokens,'report_review_routing',{'enabled':True},version=1).status_code==200
    history=client.get('/api/admin/settings/report_review_routing/history',headers=tokens['platform']).json()
    assert history['total']==2 and history['items'][0]['actor']=='FAKE platform'
    assert history['items'][0]['from_version']==1 and history['items'][0]['to_version']==2


def test_settings_audit_failure_rolls_back_the_configuration(context):
    client,sessions,tokens=context
    with patch('staff_accounts.audit',side_effect=RuntimeError('FAKE audit unavailable')):
        with pytest.raises(RuntimeError,match='FAKE audit unavailable'):
            save(client,tokens,'report_review_routing',{'enabled':False})
    with sessions() as db:
        assert db.query(models.SystemSetting).count()==0
        assert db.query(models.SystemSettingHistory).count()==0


def test_concurrent_initial_configuration_has_one_winner(context):
    client,sessions,tokens=context
    with ThreadPoolExecutor(max_workers=2) as workers:
        result=sorted(workers.map(lambda value:save(client,tokens,'report_review_routing',{'enabled':value}).status_code,[True,False]))
    assert result==[200,409]
    with sessions() as db:
        assert db.query(models.SystemSetting).count()==1
        assert db.query(models.SystemSettingHistory).count()==1


@pytest.mark.parametrize('key,value',[
    ('report_review_routing',{'enabled':'false'}),
    ('ai_report_category_suggestion',{'enabled':True,'suggest_urgency':True,'require_confirmation':False}),
    ('sla_response_time',{'urgent_hours':0,'standard_hours':48}),
    ('sla_response_time',{'urgent_hours':96,'standard_hours':24}),
])
def test_invalid_configuration_is_rejected_without_saving(context,key,value):
    client,sessions,tokens=context
    response=save(client,tokens,key,value,reference='FAKE approved review target')
    assert response.status_code==422,response.text
    with sessions() as db: assert db.query(models.SystemSetting).count()==0


def test_global_controls_require_citywide_scope_and_manage_permission(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.get(models.Official,6).primary_jurisdiction=[1];db.commit()
    assert save(client,tokens,'report_review_routing',{'enabled':False}).status_code==403
    with sessions() as db:
        db.get(models.Official,6).primary_jurisdiction=None
        role=models.SystemRole(name='fake_settings_reader',capabilities={'admin':['settings_view']})
        db.add(role);db.flush();db.get(models.Official,3).role_id=role.id;db.commit()
    assert client.get('/api/admin/settings',headers=tokens['inspector']).status_code==200
    denied=client.put('/api/admin/settings/report_review_routing',json={'value':{'enabled':False},'expected_version':0,'reason':'FAKE denied modification'},headers=tokens['inspector'])
    assert denied.status_code==403


def test_informational_controls_cannot_claim_sensor_or_crypto_operation(context):
    client,sessions,tokens=context
    for key in ['ai_flood_drainage_risk','activity_log_security','record_storage_duration','unknown_setting']:
        assert save(client,tokens,key,{'enabled':True}).status_code==409
    with sessions() as db: assert db.query(models.SystemSetting).count()==0


def test_routing_pause_preserves_manual_assignment_and_resumes_backlog(context):
    client,sessions,tokens=context
    assert save(client,tokens,'report_review_routing',{'enabled':False}).status_code==200
    with sessions() as db:
        assert report_review.route_waiting(db)==0
        report=db.get(models.Report,1)
        assert report_review.auto_route(db,report) is False
        assert report.review_assigned_to_id is None
        report_review.assign(db,report,db.get(models.Official,3),'FAKE manual assignment during pause',actor=db.get(models.Official,1))
        db.commit()
    assert save(client,tokens,'report_review_routing',{'enabled':True},version=1).status_code==200
    with sessions() as db:
        assert report_review.route_waiting(db)+report_review.route_waiting(db)==2
        assert db.get(models.Report,1).review_assigned_to_id==3
        assert db.get(models.Report,2).review_assigned_to_id==3


def test_legacy_seeded_targets_do_not_create_deadlines_until_reconfirmed(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(models.SystemSetting(key='sla_response_time',title='FAKE seeded default',value={'urgent_hours':24,'standard_hours':48},version=1,policy_source='FAKE unverified policy'))
        db.commit()
        assert system_settings.read_config(db,'sla_response_time') is None
    assert save(client,tokens,'sla_response_time',{'urgent_hours':4,'standard_hours':24},version=1).status_code==422
    saved=save(client,tokens,'sla_response_time',{'urgent_hours':4,'standard_hours':24},version=1,reference='FAKE approved review planning reference')
    assert saved.status_code==200,saved.text
    with sessions() as db:
        record=db.get(models.Report,1);record.priority_grade='P5';record.created_at=datetime.now(timezone.utc)-timedelta(hours=5)
        value=system_settings.read_config(db,'sla_response_time')
        result=system_settings.review_target(value,record,datetime.now(timezone.utc))
        assert result['hours']==4 and result['overdue'] is True
        record.priority_grade='P1'
        assert system_settings.review_target(value,record,datetime.now(timezone.utc))['hours']==24
        record.status='needs_information'
        assert system_settings.review_target(value,record,datetime.now(timezone.utc)) is None


def test_ai_off_stops_provider_requests_and_returns_no_invented_assessment(context):
    client,sessions,tokens=context
    assert save(client,tokens,'ai_report_category_suggestion',{'enabled':False,'suggest_urgency':False}).status_code==200
    with patch('gemini_service.analyze_report') as provider:
        response=client.post('/api/reports/analyze',data={'description':'FAKE damaged road for manual review'})
    assert response.status_code==200,response.text
    assert response.json()['analysis_status']=='disabled'
    assert response.json()['category'] is None and response.json()['urgency'] is None
    assert response.json()['severity_score'] is None and response.json()['is_infrastructure'] is None
    provider.assert_not_called()


def test_category_only_setting_suppresses_advisory_urgency_without_changing_human_grade(context,monkeypatch):
    client,sessions,tokens=context
    assert save(client,tokens,'ai_report_category_suggestion',{'enabled':True,'suggest_urgency':False}).status_code==200
    monkeypatch.setattr(gemini_service,'_SDK_READY',True);monkeypatch.setattr(gemini_service,'AI_DISABLED',False)
    with patch('gemini_service.analyze_report',return_value={'category':'Roads','urgency':'Critical','severity_score':9.5,'is_inappropriate':False}):
        response=client.post('/api/reports/analyze',data={'description':'FAKE damaged road'})
    assert response.status_code==200,response.text
    assert response.json()['category']=='Roads'
    assert response.json()['urgency'] is None and response.json()['severity_score'] is None
    with sessions() as db: assert db.get(models.Report,1).priority_grade is None


def test_provider_fallback_remains_manual_not_a_medium_severity_assessment(context,monkeypatch):
    client,sessions,tokens=context
    monkeypatch.setattr(gemini_service,'_SDK_READY',True);monkeypatch.setattr(gemini_service,'AI_DISABLED',False)
    with patch('gemini_service.analyze_report',return_value={'analysis_status':'manual_review','category':'General Infrastructure','urgency':'Medium','severity_score':5,'is_inappropriate':False}):
        result=client.post('/api/reports/analyze',data={'description':'FAKE manual fallback'}).json()
    assert result['analysis_status']=='unavailable' and result['severity_score'] is None and result['urgency'] is None


def test_invalid_saved_automation_value_fails_closed_without_rewriting_it(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(models.SystemSetting(key='report_review_routing',title='FAKE invalid old value',value={'enabled':'yes'},version=1))
        db.commit()
        assert system_settings.read_config(db,'report_review_routing')['enabled'] is False
    result=client.get('/api/admin/settings',headers=tokens['platform']).json()
    row=next(item for item in result['settings'] if item['key']=='report_review_routing')
    assert row['status']=='needs_review'
    with sessions() as db: assert db.query(models.SystemSetting).one().value=={'enabled':'yes'}


def test_configured_targets_and_routing_state_appear_in_the_actual_work_queue(context):
    client,sessions,tokens=context
    assert save(client,tokens,'sla_response_time',{'urgent_hours':4,'standard_hours':48},reference='FAKE approved initial review target').status_code==200
    assert save(client,tokens,'report_review_routing',{'enabled':False}).status_code==200
    with sessions() as db:
        report=db.get(models.Report,1)
        report.review_assigned_to_id=3
        report.priority_grade='P5'
        report.created_at=datetime.now(timezone.utc)-timedelta(hours=5)
        db.commit()
    inbox=client.get('/api/gov/operations/today',headers=tokens['inspector'])
    assert inbox.status_code==200,inbox.text
    row=next(item for item in inbox.json()['needs_attention'] if item['entity_type']=='report' and item['id']==1)
    assert row['review_target']['hours']==4 and row['review_target']['overdue'] is True
    assert inbox.json()['routing_enabled'] is False


def test_repeated_identical_save_does_not_create_an_extra_history_event(context):
    client,sessions,tokens=context
    first=save(client,tokens,'report_review_routing',{'enabled':False})
    again=save(client,tokens,'report_review_routing',{'enabled':False},version=1)
    assert first.status_code==200 and again.status_code==200
    assert again.json()['version']==1
    with sessions() as db:
        assert db.query(models.SystemSettingHistory).count()==1
        assert db.query(gm.AuditLog).filter_by(action='Operational setting changed').count()==1
