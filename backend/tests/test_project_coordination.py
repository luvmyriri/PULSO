from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timedelta,timezone
from unittest.mock import patch
import json
import pytest
from sqlalchemy import text
import auth
import models
import gov_models as gm
from tests.test_government_workspace import context as core_context


@pytest.fixture
def context(core_context,tmp_path,monkeypatch):
    monkeypatch.setattr('document_router.UPLOAD_DIR',str(tmp_path))
    client,sessions,tokens=core_context
    with sessions() as db:
        role=models.SystemRole(name='FAKE project evidence access',capabilities={'records':['view','manage']})
        db.add(role);db.flush();db.get(models.Official,1).role_id=role.id
        inspector=db.get(models.Official,3).role_ref;inspector.capabilities={**inspector.capabilities,'records':['view']}
        db.commit()
    return core_context


def future(): return (datetime.now(timezone.utc)+timedelta(days=2)).isoformat()


def opening(client,tokens,**values):
    body=dict(title='FAKE drainage coordination',description='FAKE inspection and drainage scope',requesting_party='FAKE requesting office',barangay_id=1,reason='FAKE recorded project intake')
    body.update(values)
    if body.get('source_report_id') and 'expected_source_version' not in body:
        body['expected_source_version']=client.get(f'/api/gov/reports/{body["source_report_id"]}/docket',headers=tokens['chief']).json()['report']['version']
    result=client.post('/api/gov/project-workspace',json=body,headers=tokens['chief'])
    assert result.status_code==201,result.text
    return result.json()


def command(client,tokens,project,action,actor='chief',**values):
    return client.post(f'/api/gov/project-workspace/{project["id"]}/commands',json=dict(action=action,expected_version=project['version'],reason='FAKE documented engineering decision',**values),headers=tokens[actor])


def upload(client,tokens,project,kind):
    result=client.post('/api/gov/documents/upload',data=dict(target_model='ProjectRequest',target_id=str(project['id']),document_type=kind),files={'file':(f'FAKE-{kind}.txt',f'FAKE evidence {kind}'.encode(),'text/plain')},headers=tokens['chief'])
    assert result.status_code==200,result.text
    return result.json()['document']['id']


def assigned(client,tokens,**values):
    return opening(client,tokens,owner_id=1,next_review_at=future(),**values)


def advance(client,tokens,project):
    kind={'planning':'planning_record','ready_for_work':'work_authorization','in_progress':'completion_report'}.get(project['status'])
    extra={'document_id':upload(client,tokens,project,kind)} if kind else {}
    result=command(client,tokens,project,'advance',next_review_at=future(),**extra)
    assert result.status_code==200,result.text
    return result.json()


def test_related_reports_keep_independent_records_and_reject_duplicate_or_unauthorized_links(context):
    client,sessions,tokens=context
    project=opening(client,tokens,source_report_id=1)
    with sessions() as db:
        source_before=db.get(models.Report,1).status
        related_before=db.get(models.Report,2).status
        related_version=db.get(models.Report,2).version
    payload=dict(expected_version=project['version'],expected_report_version=related_version,reason='FAKE related drainage investigation')
    forbidden=client.post(f'/api/gov/project-workspace/{project["id"]}/related-reports/2',json=payload,headers=tokens['field'])
    assert forbidden.status_code==403
    linked=client.post(f'/api/gov/project-workspace/{project["id"]}/related-reports/2',json=payload,headers=tokens['chief'])
    assert linked.status_code==201,linked.text
    detail=client.get(f'/api/gov/project-workspace/{project["id"]}',headers=tokens['chief']).json()
    assert [item['id'] for item in detail['related_reports']]==[2]
    assert client.post(f'/api/gov/project-workspace/{project["id"]}/related-reports/2',json={**payload,'expected_version':linked.json()['version']},headers=tokens['chief']).status_code==409
    other=client.get('/api/gov/project-workspace/report/2/context',headers=tokens['chief']).json()
    assert other['can_create'] is False
    with sessions() as db:
        assert db.get(models.Report,1).status==source_before
        assert db.get(models.Report,2).status==related_before
        assert db.query(gm.ProjectReportLink).filter_by(project_id=project['id'],report_id=2).count()==1
    removed=client.request('DELETE',f'/api/gov/project-workspace/{project["id"]}/related-reports/2',json={**payload,'expected_version':linked.json()['version'],'reason':'FAKE report belongs to a separate case'},headers=tokens['chief'])
    assert removed.status_code==200,removed.text
    with sessions() as db:
        assert db.query(gm.ProjectReportLink).filter_by(project_id=project['id'],report_id=2).count()==0
        assert db.query(gm.AuditLog).filter_by(project_id=project['id'],action='Related report unlinked').count()==1


def test_project_detail_uses_linked_work_orders_as_tasks_without_copying_them(context):
    client,sessions,tokens=context
    project=opening(client,tokens)
    with sessions() as db:
        db.add(gm.WorkOrder(id=402,wo_number='FAKE-PROJECT-WORK',title='FAKE drainage field task',project_id=project['id'],district_id=1,assigned_to_id=4,assigned_by_id=1,assignment_version=1,status='assigned',priority='normal'))
        db.commit()
    detail=client.get(f'/api/gov/project-workspace/{project["id"]}',headers=tokens['chief'])
    assert detail.status_code==200,detail.text
    assert [item['id'] for item in detail.json()['work_orders']]==[402]
    assert detail.json()['work_orders'][0]['owner']=='FAKE field'
    assert client.get('/api/gov/work-orders/402',headers=tokens['chief']).json()['status']=='assigned'


def test_project_task_creation_requires_scope_reason_and_current_project_version(context):
    client,sessions,tokens=context
    project=opening(client,tokens)
    body=dict(project_id=project['id'],title='FAKE drainage survey',description='FAKE inspect the drainage channel',notes='FAKE scoped engineering task',priority='normal')
    path='/api/gov/work-orders'
    assert client.post(path,json=body,headers=tokens['field']).status_code==403
    assert client.post(path,json=body,headers=tokens['chief']).status_code==428
    headers={**tokens['chief'],'If-Match':str(project['version'])}
    assert client.post(path,json={**body,'notes':'short'},headers=headers).status_code==422
    opened=client.post(path,json=body,headers=headers)
    assert opened.status_code==200,opened.text
    assert opened.json()['status']=='open' and opened.json()['project_id']==project['id']
    assert client.post(path,json=body,headers=headers).status_code==409
    detail=client.get(f'/api/gov/project-workspace/{project["id"]}',headers=tokens['chief']).json()
    assert [item['id'] for item in detail['work_orders']]==[opened.json()['id']]
    with sessions() as db:
        work=db.get(gm.WorkOrder,opened.json()['id'])
        assert work.district_id==1 and work.barangay_id==1
        assert db.get(gm.ProjectRequest,project['id']).coordination_version==project['version']+1


def test_project_owner_reassignment_is_audited_and_duplicate_is_rejected(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(models.Official(id=7,full_name='FAKE project engineer',email='engineer@test.invalid',password_hash='test-not-login',role='project_engineer',is_active=True))
        db.commit()
    project=assigned(client,tokens)
    reassigned=command(client,tokens,project,'assign',owner_id=7,next_review_at=future())
    assert reassigned.status_code==200,reassigned.text
    assert reassigned.json()['owner_id']==7
    engineer_token={'Authorization':f'Bearer {auth.create_access_token({"sub":"engineer@test.invalid"})}'}
    chief_items=client.get('/api/gov/operations/today',headers=tokens['chief']).json()['needs_attention']
    engineer_items=client.get('/api/gov/operations/today',headers=engineer_token).json()['needs_attention']
    assert not any(item['entity_type']=='project' and item['id']==project['id'] for item in chief_items)
    assert any(item['entity_type']=='project' and item['id']==project['id'] for item in engineer_items)
    repeated=command(client,tokens,reassigned.json(),'assign',owner_id=7,next_review_at=future())
    assert repeated.status_code==409
    with sessions() as db:
        event=db.query(gm.AuditLog).filter_by(project_id=project['id'],action='Assign').one()
        details=json.loads(event.details)
        assert details['previous_owner_id']==1 and details['owner_id']==7
        assert details['previous_owner']=='FAKE chief' and details['owner']=='FAKE project engineer'
        assert db.query(models.Notification).filter_by(official_id=7).count()==1


def test_project_has_real_assignment_personal_queue_and_no_financial_controls(context):
    client,sessions,tokens=context
    project=assigned(client,tokens)
    assert project['status']=='intake' and project['owner_name']=='FAKE chief'
    queue=client.get('/api/gov/operations/today',headers=tokens['chief'])
    assert queue.status_code==200,queue.text
    item=next(row for row in queue.json()['needs_attention'] if row['entity_type']=='project')
    assert item['action_url']==f'/gov/projects?project={project["id"]}'
    with sessions() as db:
        assert db.query(models.Notification).filter_by(official_id=1).count()==1
        assert db.query(gm.ProcurementRequest).count()==0


def test_project_report_resolution_requires_explicit_verified_coverage(context):
    client,sessions,tokens=context
    project=assigned(client,tokens,source_report_id=1)
    for _ in range(5): project=advance(client,tokens,project)
    inspection=upload(client,tokens,project,'inspection_report')
    project=command(client,tokens,project,'accept_completion',actor='inspector',document_id=inspection).json()
    with sessions() as db:
        report=db.get(models.Report,1);report.status='in_progress';db.commit()
    project=client.get(f'/api/gov/project-workspace/{project["id"]}',headers=tokens['inspector']).json()
    inbox=client.get('/api/gov/operations/today',headers=tokens['inspector']).json()
    assert any(item['entity_type']=='project' and item['recommended_action']=='Verify report resolution' for item in inbox['needs_attention'])
    docket=client.get('/api/gov/reports/1/docket',headers=tokens['inspector']).json()
    assert docket['projects'][0]['id']==project['id']
    rejected=command(client,tokens,project,'verify_report_resolution',actor='inspector',expected_report_version=project['source_report_version'])
    assert rejected.status_code==422,rejected.text
    resolved=command(client,tokens,project,'verify_report_resolution',actor='inspector',expected_report_version=project['source_report_version'],report_issue_addressed=True)
    assert resolved.status_code==200,resolved.text
    with sessions() as db: assert db.get(models.Report,1).status=='resolved'


def test_verified_work_does_not_close_report_with_pending_project(context):
    client,sessions,tokens=context
    project=assigned(client,tokens,source_report_id=1)
    with sessions() as db:
        db.get(models.Report,1).status='in_progress'
        db.add(gm.WorkOrder(id=90,wo_number='FAKE-WO-90',title='FAKE assessment job',project_id=project['id'],district_id=1,barangay_id=1,assigned_to_id=4,assigned_by_id=1,report_id=1,status='completed_pending_review'))
        db.commit()
    result=client.post('/api/gov/work-orders/90/verify',json=dict(passed=True,notes='FAKE completed site assessment, larger project pending',checklist_results={key:True for key in ['specifications','siteCleared','qualityTested','photoVerified']}),headers=tokens['inspector'])
    assert result.status_code==200,result.text
    with sessions() as db:
        assert db.get(gm.WorkOrder,90).status=='completed'
        assert db.get(models.Report,1).status=='in_progress'
        assert db.get(gm.ProjectRequest,project['id']).status=='intake'
        stored=db.get(gm.ProjectRequest,project['id'])
        assert stored.estimated_cost is None and stored.procurement_modality=='not_recorded'


def test_project_commands_require_reason_scope_permission_and_current_version(context):
    client,sessions,tokens=context
    project=assigned(client,tokens)
    assert command(client,tokens,project,'advance',next_review_at=future()).status_code==200
    assert command(client,tokens,project,'advance',next_review_at=future()).status_code==409
    assert command(client,tokens,project,'cancel',actor='field').status_code==403
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=[2];db.commit()
    assert client.get(f'/api/gov/project-workspace/{project["id"]}',headers=tokens['chief']).status_code==403
    assert command(client,tokens,project,'cancel').status_code==403


def test_explicit_project_denial_applies_to_navigation_and_legacy_paths(context):
    client,sessions,tokens=context
    project=opening(client,tokens)
    with sessions() as db:
        role=db.get(models.Official,1).role_ref;role.capabilities={**role.capabilities,'projects':[]};db.commit()
    assert 'projects' not in client.get('/api/gov/navigation',headers=tokens['chief']).json()['modules']
    for path in ['/api/gov/project-workspace','/api/gov/projects',f'/api/gov/projects/{project["id"]}']:
        assert client.get(path,headers=tokens['chief']).status_code==403


def test_pending_external_dependency_blocks_progress_and_has_saved_resolution(context):
    client,sessions,tokens=context
    project=assigned(client,tokens)
    added=command(client,tokens,project,'add_dependency',description='FAKE external utility clearance',office='FAKE external office',owner_id=1,next_review_at=future(),reference='FAKE REF 001')
    assert added.status_code==200,added.text
    project=added.json()
    assert project['pending_dependencies']==1
    assert command(client,tokens,project,'advance',next_review_at=future()).status_code==409
    detail=client.get(f'/api/gov/project-workspace/{project["id"]}',headers=tokens['chief']).json()
    dependency=detail['dependencies'][0]
    resolved=command(client,tokens,project,'resolve_dependency',dependency_id=dependency['id'],reference='FAKE response 002')
    assert resolved.status_code==200,resolved.text
    assert resolved.json()['pending_dependencies']==0
    history=client.get(f'/api/gov/project-workspace/{project["id"]}/history',headers=tokens['chief']).json()
    assert any('FAKE response 002' in (row['details'] or '') for row in history['items'])


def test_complete_project_path_requires_evidence_independent_inspection_and_external_certificate(context):
    client,sessions,tokens=context
    project=assigned(client,tokens,source_report_id=1)
    for _ in range(5): project=advance(client,tokens,project)
    assert project['status']=='awaiting_verification'
    inspection=upload(client,tokens,project,'inspection_report')
    assert command(client,tokens,project,'accept_completion',document_id=inspection).status_code==403
    accepted=command(client,tokens,project,'accept_completion',actor='inspector',document_id=inspection)
    assert accepted.status_code==200,accepted.text
    project=accepted.json()
    assert project['status']=='completed'
    assert command(client,tokens,project,'record_certificate',actor='platform',reference='FAKE cert 1',office='FAKE issuing office',document_id=inspection).status_code==403
    certificate=upload(client,tokens,project,'completion_certificate')
    saved=command(client,tokens,project,'record_certificate',reference='FAKE cert 1',office='FAKE issuing office',document_id=certificate)
    assert saved.status_code==200,saved.text
    with sessions() as db:
        stored=db.get(gm.ProjectRequest,project['id'])
        assert stored.certificate_reference=='FAKE cert 1' and not stored.certificate_issued
        assert db.get(models.Report,1).status=='pending'
        assert db.query(gm.OutboxEvent).count()>0
        assert db.query(gm.SystemDocument).filter_by(legal_hold=True).count()==0
        assert db.query(gm.ProcurementRequest).count()==0


def test_proof_must_exist_and_belong_to_project_with_required_type(context):
    client,sessions,tokens=context
    project=assigned(client,tokens)
    project=advance(client,tokens,project);project=advance(client,tokens,project)
    other=opening(client,tokens)
    wrong=upload(client,tokens,other,'planning_record')
    assert command(client,tokens,project,'advance',document_id=wrong,next_review_at=future()).status_code==422
    own=upload(client,tokens,project,'planning_record')
    with patch('project_workspace.os.path.isfile',return_value=False):
        assert command(client,tokens,project,'advance',document_id=own,next_review_at=future()).status_code==409


def test_project_review_can_return_to_work_without_accepting_completion(context):
    client,sessions,tokens=context
    project=assigned(client,tokens)
    for _ in range(5): project=advance(client,tokens,project)
    returned=command(client,tokens,project,'return_for_work',actor='inspector',next_review_at=future())
    assert returned.status_code==200,returned.text
    assert returned.json()['status']=='in_progress' and returned.json()['completion_document_id'] is None


def test_assignment_rejects_inactive_unqualified_and_wrong_district_owners(context):
    client,sessions,tokens=context
    project=opening(client,tokens)
    assert command(client,tokens,project,'assign',owner_id=4,next_review_at=future()).status_code==422
    with sessions() as db:
        person=db.get(models.Official,1);person.primary_jurisdiction=[2];db.commit()
    assert command(client,tokens,project,'assign',actor='platform',owner_id=1,next_review_at=future()).status_code==403


def test_historical_projects_keep_stage_until_explicit_adoption(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(gm.ProjectRequest(id=50,proj_number='FAKE-HIST-50',title='FAKE old project',status='pending_budget_check',district_id=1,barangay_id=1));db.commit()
    record=client.get('/api/gov/project-workspace/50',headers=tokens['chief']).json()
    assert record['historical_status']=='pending_budget_check' and record['allowed_actions']==['adopt']
    adopted=command(client,tokens,record,'adopt')
    assert adopted.status_code==200,adopted.text
    assert adopted.json()['status']=='intake' and adopted.json()['historical_status']=='pending_budget_check'
    with sessions() as db:
        assert db.query(gm.ProcurementRequest).count()==0


def test_concurrent_project_commands_commit_once_and_audit_failure_rolls_back(context):
    client,sessions,tokens=context
    project=assigned(client,tokens)
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(lambda _:command(client,tokens,project,'advance',next_review_at=future()).status_code,range(2)))==[200,409]
    project=client.get(f'/api/gov/project-workspace/{project["id"]}',headers=tokens['chief']).json()
    with patch('project_workspace.event',side_effect=RuntimeError('FAKE audit failure')):
        with pytest.raises(RuntimeError): command(client,tokens,project,'cancel')
    with sessions() as db:
        assert db.get(gm.ProjectRequest,project['id']).status=='assessment'


def test_legacy_metadata_cannot_bypass_state_version_or_owner_validation(context):
    client,sessions,tokens=context
    project=assigned(client,tokens)
    base=f'/api/gov/projects/{project["id"]}'
    assert client.patch(base,json={'title':'FAKE edit'},headers=tokens['chief']).status_code==428
    assert client.patch(base,json={'status':'resolved','expected_version':0,'reason':'FAKE invalid bypass'},headers=tokens['chief']).status_code==422
    updated=client.patch(base,json={'title':'FAKE saved edit','expected_version':0,'reason':'FAKE corrected project title'},headers=tokens['chief'])
    assert updated.status_code==200,updated.text
    assert updated.json()['coordination_version']==1


def test_legacy_transition_delegates_to_the_same_evidence_command(context):
    client,sessions,tokens=context
    project=assigned(client,tokens)
    response=client.patch(f'/api/gov/projects/{project["id"]}/advance',json=dict(status='assessment',expected_version=0,reason='FAKE completed intake review',next_review_at=future()),headers=tokens['chief'])
    assert response.status_code==200,response.text
    assert response.json()['status']=='assessment' and response.json()['coordination_version']==1
    assert response.json()['estimated_cost'] is None


def test_new_project_rejects_financial_fields_instead_of_processing_them(context):
    client,_,tokens=context
    body=dict(title='FAKE project',description='FAKE engineering work',requesting_party='FAKE office',barangay_id=1)
    assert client.post('/api/gov/project-workspace',json={**body,'reason':'FAKE budget field rejection','estimated_cost':100},headers=tokens['chief']).status_code==422
    assert client.post('/api/gov/projects',json={**body,'estimated_cost':100},headers=tokens['chief']).status_code==409


def test_work_handoff_is_atomic_idempotent_and_does_not_cancel_work(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add(gm.WorkOrder(id=90,wo_number='FAKE-WO-90',title='FAKE large repair',description='FAKE work scope',district_id=1,barangay_id=1,assigned_by_id=1,assigned_to_id=4,status='in_progress',report_id=1));db.commit()
    with sessions() as db:
        stamp=db.get(gm.WorkOrder,90).updated_at.isoformat()
    referral=dict(reason='FAKE work requires project coordination',expected_updated_at=stamp)
    one=client.post('/api/gov/work-orders/90/promote',json=referral,headers=tokens['chief'])
    assert one.status_code==200,one.text
    two=client.post('/api/gov/work-orders/90/promote',json=referral,headers=tokens['chief'])
    assert two.status_code==200 and one.json()['id']==two.json()['id']
    with sessions() as db:
        assert db.get(gm.WorkOrder,90).status=='in_progress'
        assert db.query(gm.ProjectRequest).count()==1


def test_project_scope_applies_before_aggregates_history_documents_and_creation(context):
    client,sessions,tokens=context
    project=opening(client,tokens)
    upload(client,tokens,project,'planning_record')
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=[2];db.commit()
    assert client.get('/api/gov/project-workspace',headers=tokens['chief']).json()['total']==0
    for suffix in ['', '/history']:
        assert client.get(f'/api/gov/project-workspace/{project["id"]}{suffix}',headers=tokens['chief']).status_code==403
    assert client.post('/api/gov/project-workspace',json=dict(title='FAKE denied',description='FAKE denied creation',requesting_party='FAKE office',barangay_id=1,reason='FAKE denied scope'),headers=tokens['chief']).status_code==403


def test_project_evidence_access_is_bounded_without_global_records_access(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.get(models.Official,1).role_id=None;db.commit()
    project=assigned(client,tokens)
    saved=client.post('/api/gov/documents/upload',data=dict(target_model='ProjectRequest',target_id=str(project['id']),document_type='planning_record'),files={'file':('FAKE-plan.txt',b'FAKE private project plan','text/plain')},headers=tokens['chief'])
    assert saved.status_code==200,saved.text
    path=f'/api/gov/documents/get/{saved.json()["document"]["id"]}'
    assert client.get(path,headers=tokens['chief']).status_code==200
    assert client.get(path,headers=tokens['field']).status_code==403
    assert client.get(path,headers=tokens['owner']).status_code==403
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=[2];db.commit()
    assert client.get(path,headers=tokens['chief']).status_code==403


def test_area_options_normalize_aliases_without_rewriting_report_records(context):
    client,sessions,tokens=context
    with sessions() as db:
        db.add_all([models.Barangay(id=3,name='175',district_id=1),models.Barangay(id=175,name='Barangay 175',district_id=1)])
        db.flush();db.get(models.Report,1).barangay_id=3;db.commit()
    options=client.get('/api/gov/project-workspace/options',headers=tokens['chief']).json()
    assert [area['id'] for area in options['areas'] if area['name']=='Barangay 175']==[175]
    project=opening(client,tokens,barangay_id=175,source_report_id=1)
    assert project['barangay_id']==175
    with sessions() as db: assert db.get(models.Report,1).barangay_id==3


def test_report_referral_context_and_duplicate_guard(context):
    client,sessions,tokens=context
    context_result=client.get('/api/gov/project-workspace/report/1/context',headers=tokens['chief'])
    assert context_result.status_code==200,context_result.text
    source=context_result.json()
    assert source['can_create'] and source['ticket']=='FAKE-REPORT-1' and source['barangay_id']==1
    docket=client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()
    assert docket['can_create_project']
    project=opening(client,tokens,source_report_id=1,expected_source_version=source['version'])
    again=client.get('/api/gov/project-workspace/report/1/context',headers=tokens['chief']).json()
    assert not again['can_create'] and again['projects'][0]['id']==project['id']
    assert not client.get('/api/gov/reports/1/docket',headers=tokens['chief']).json()['can_create_project']
    body=dict(title='FAKE duplicate',description='FAKE duplicated project',requesting_party='FAKE office',barangay_id=1,reason='FAKE duplicate submission',source_report_id=1,expected_source_version=source['version'])
    assert client.post('/api/gov/project-workspace',json=body,headers=tokens['chief']).status_code==409
    with sessions() as db:
        assert db.query(gm.ProjectRequest).count()==1
        assert db.get(models.Report,1).status=='pending'


def test_report_referral_rejects_stale_closed_and_unauthorized_sources(context):
    client,sessions,tokens=context
    body=dict(title='FAKE new project',description='FAKE engineering referral',requesting_party='FAKE office',barangay_id=1,reason='FAKE source review',source_report_id=1,expected_source_version=1)
    with sessions() as db:
        db.get(models.Report,1).description='FAKE report changed since review';db.commit()
    assert client.post('/api/gov/project-workspace',json=body,headers=tokens['chief']).status_code==409
    with sessions() as db:
        db.get(models.Report,1).status='resolved';db.commit()
        body['expected_source_version']=db.get(models.Report,1).version
    assert client.post('/api/gov/project-workspace',json=body,headers=tokens['chief']).status_code==409
    assert client.get('/api/gov/project-workspace/report/1/context',headers=tokens['field']).status_code==403
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=[2];db.commit()
    assert client.get('/api/gov/project-workspace/report/1/context',headers=tokens['chief']).status_code==403


def test_concurrent_report_referrals_create_one_project(context):
    client,sessions,tokens=context
    body=dict(title='FAKE new project',description='FAKE engineering referral',requesting_party='FAKE office',barangay_id=1,reason='FAKE source review',source_report_id=1,expected_source_version=1)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=sorted(pool.map(lambda _:client.post('/api/gov/project-workspace',json=body,headers=tokens['chief']).status_code,range(2)))
    assert results==[201,409]


def test_work_referral_reuses_open_report_project(context):
    client,sessions,tokens=context
    project=opening(client,tokens,source_report_id=1)
    with sessions() as db:
        db.add(gm.WorkOrder(id=90,wo_number='FAKE-WO-90',title='FAKE related work',description='FAKE work scope',district_id=1,barangay_id=1,assigned_by_id=1,assigned_to_id=4,status='in_progress',report_id=1));db.commit()
        stamp=db.get(gm.WorkOrder,90).updated_at.isoformat()
    result=client.post('/api/gov/work-orders/90/promote',json=dict(reason='FAKE requires existing project coordination',expected_updated_at=stamp),headers=tokens['chief'])
    assert result.status_code==200,result.text
    assert result.json()['id']==project['id']
    with sessions() as db:
        assert db.query(gm.ProjectRequest).count()==1
        assert db.get(gm.WorkOrder,90).status=='in_progress'
