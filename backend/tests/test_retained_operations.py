"""Retained lists must obey the same scope and privacy boundaries as work records."""
from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import text
import models
import gov_models as gm
from tests.test_government_workspace import context


def seed(sessions):
    with sessions() as db:
        db.get(models.Official, 1).primary_jurisdiction = [1]
        db.get(models.Official, 4).primary_jurisdiction = [1]
        db.get(models.Official, 5).primary_jurisdiction = [2]
        stamp = datetime.now(timezone.utc)
        for id, district in ((1, 1), (2, 2), (3, 1), (4, 2)):
            db.add(gm.ProjectRequest(id=id, proj_number=f'FAKE-P-{id}', title=f'FAKE project {id}',
                description='FAKE engineering scope', requesting_party='FAKE office', created_by_id=1,
                district_id=district, barangay_id=district, status='assessment' if id < 3 else 'planning',
                coordination_started_at=stamp, created_at=stamp + timedelta(minutes=id)))
            db.add(gm.WorkOrder(id=id, wo_number=f'FAKE-W-{id}', title=f'FAKE work {id}',
                description='FAKE field survey', assigned_by_id=1, assigned_to_id=4 if district == 1 else 5,
                district_id=district, barangay_id=district, status='assigned',
                created_at=stamp + timedelta(minutes=id, seconds=30)))
        db.flush()
        for id, work, project in ((1,1,None),(2,None,2),(3,None,None),(4,1,2),(5,None,1)):
            db.add(gm.ProcurementRequest(id=id, pr_number=f'FAKE-PR-{id}', title=f'FAKE retained record {id}',
                purpose='FAKE historical source only', raised_by_id=1, work_order_id=work, project_id=project))
        db.flush()
        for id in range(1, 6):
            db.add(gm.BoQItem(id=id, procurement_request_id=id, item_name=f'FAKE item {id}', quantity=1,
                unit='piece', unit_cost=10, total_cost=10))
        db.add_all([gm.AgentLocation(agent_id=4, latitude=14.7, longitude=121.0, status='on_site',
            battery_level=33, location_name='FAKE private place'),
            gm.AgentLocation(agent_id=5, latitude=14.8, longitude=121.1, status='available')])
        db.commit()


def deny(sessions, **caps):
    with sessions() as db:
        role = models.SystemRole(name='FAKE retained read delegation', capabilities=caps)
        db.add(role); db.flush(); db.get(models.Official,1).role_id = role.id; db.commit()


@pytest.mark.parametrize('path', ['design-requests', 'analysis'])
def test_planning_lists_scope_and_include_current_coordination_states(context, path):
    client,sessions,tokens = context
    seed(sessions)
    result = client.get(f'/api/gov/{path}', headers=tokens['chief'])
    assert result.status_code == 200, result.text
    assert {row['id'] for row in result.json()} == {1,3}
    deny(sessions, projects=[])
    assert client.get(f'/api/gov/{path}', headers=tokens['chief']).status_code == 403
    assert client.get(f'/api/gov/{path}', headers=tokens['owner']).status_code == 403


def test_surveys_merge_then_paginate_without_duplicates_or_field_peer_records(context):
    client,sessions,tokens = context
    seed(sessions)
    headers = tokens['chief']
    entire = client.get('/api/gov/surveys', headers=headers).json()
    assert {(row['record_type'],row['id']) for row in entire} == {('project',1),('work_order',1),('work_order',3)}
    pages = [client.get(f'/api/gov/surveys?skip={i}&limit=1', headers=headers).json()[0] for i in range(3)]
    assert pages == entire
    assert client.get('/api/gov/surveys?skip=3&limit=1', headers=headers).json() == []
    result = client.get('/api/gov/surveys', headers=tokens['field'])
    assert result.status_code == 200
    assert all(row['record_type'] == 'work_order' and row['id'] in {1,3} for row in result.json())
    with sessions() as db:
        db.get(gm.WorkOrder,3).assigned_to_id = 3; db.commit()
    assert [row['id'] for row in client.get('/api/gov/surveys',headers=tokens['field']).json()] == [1]


def test_survey_capabilities_control_each_source_independently(context):
    client,sessions,tokens=context
    seed(sessions)
    deny(sessions, projects=[], work_orders=['view'])
    assert {row['record_type'] for row in client.get('/api/gov/surveys', headers=tokens['chief']).json()} == {'work_order'}
    with sessions() as db:
        db.get(models.Official,1).role_ref.capabilities = {'projects':['view'], 'work_orders':[]}; db.commit()
    assert {row['record_type'] for row in client.get('/api/gov/surveys', headers=tokens['chief']).json()} == {'project'}
    with sessions() as db:
        db.get(models.Official,1).role_ref.capabilities = {'projects':[], 'work_orders':[]}; db.commit()
    assert client.get('/api/gov/surveys', headers=tokens['chief']).status_code == 403


@pytest.mark.parametrize('path', ['procurement','boq','estimation'])
def test_financial_history_checks_all_sources_and_explicit_delegation(context, path):
    client,sessions,tokens=context
    seed(sessions)
    result=client.get(f'/api/gov/{path}',headers=tokens['chief'])
    assert result.status_code==200,result.text
    assert {row['id'] for row in result.json()} == {1,5}
    assert client.get(f'/api/gov/{path}',headers=tokens['field']).status_code==403
    assert client.get(f'/api/gov/{path}?skip=-1',headers=tokens['chief']).status_code==422
    assert client.get(f'/api/gov/{path}?limit=201',headers=tokens['chief']).status_code==422
    deny(sessions, procurement=[])
    assert client.get(f'/api/gov/{path}',headers=tokens['chief']).status_code==403


def test_financial_detail_does_not_bypass_scope_or_reenable_processing(context):
    client,sessions,tokens=context
    seed(sessions)
    for id in (2,3,4):
        assert client.get(f'/api/gov/procurement/{id}',headers=tokens['chief']).status_code==404
    assert client.get('/api/gov/procurement/1',headers=tokens['chief']).status_code==200
    assert client.patch('/api/gov/procurement/1/status',json={'status':'submitted'},headers=tokens['chief']).status_code==409
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction=[];db.commit()
    assert len(client.get('/api/gov/procurement',headers=tokens['chief']).json())==5


def test_locations_and_roster_expose_only_active_in_scope_work_context(context):
    client,sessions,tokens=context
    seed(sessions)
    result=client.get('/api/gov/agents/locations',headers=tokens['chief'])
    assert result.status_code==200,result.text
    assert [row['agent_id'] for row in result.json()]==[4]
    assert not {'location_name','battery_level','email'}.intersection(result.json()[0])
    assert client.get('/api/gov/agents/5/location',headers=tokens['chief']).status_code==404
    roster=client.get('/api/gov/agents/work-orders',headers=tokens['chief'])
    assert roster.status_code==200,roster.text
    assert [row['agent_id'] for row in roster.json()]==[4]
    assert {row['wo_id'] for row in roster.json()[0]['active_work_orders']}=={1,3}
    with sessions() as db:
        for work in db.query(gm.WorkOrder).filter_by(assigned_to_id=4): work.status='completed'
        db.commit()
    assert client.get('/api/gov/agents/locations',headers=tokens['chief']).json()==[]
    assert client.get('/api/gov/agents/4/location',headers=tokens['chief']).status_code==404
    assert client.get('/api/gov/agents/work-orders',headers=tokens['chief']).json()[0]['location'] is None


@pytest.mark.parametrize('caps',[{'coordination':[]},{'agents':[]},{'work_orders':[]}])
def test_location_delegation_denial_applies_to_all_aliases_and_dispatch(context,caps):
    client,sessions,tokens=context
    seed(sessions);deny(sessions,**caps)
    for path in ('agents/locations','agents/4/location','agents/work-orders','dispatch/suggest-agent/1'):
        assert client.get(f'/api/gov/{path}',headers=tokens['chief']).status_code==403


def test_staff_can_stop_location_sharing_without_sending_another_position(context):
    client,sessions,tokens=context
    seed(sessions)
    with sessions() as db:
        db.add(gm.AgentLocation(agent_id=4,latitude=14.71,longitude=121.02,status='available'))
        db.execute(text("UPDATE agent_locations SET location=ST_SetSRID(ST_MakePoint(longitude,latitude),4326) WHERE agent_id=4"))
        db.commit()
    assert client.post('/api/gov/agents/location',json={'status':'available'},headers=tokens['field']).status_code==422
    result=client.post('/api/gov/agents/location',json={'status':'offline'},headers=tokens['field'])
    assert result.status_code==200,result.text
    with sessions() as db:
        for location in db.query(gm.AgentLocation).filter_by(agent_id=4):
            assert location.latitude is None and location.longitude is None
            assert location.battery_level is None and location.location_name is None
        assert db.execute(text("SELECT count(*) FROM agent_locations WHERE agent_id=4 AND (location IS NOT NULL OR location_geog IS NOT NULL)")).scalar()==0
        assert db.query(gm.AgentLocation).filter_by(agent_id=5).one().latitude==14.8
    assert client.get('/api/gov/agents/locations',headers=tokens['chief']).json()==[]
    assert client.post('/api/gov/agents/location',json={'status':'offline'},headers=tokens['owner']).status_code==403


def test_disabled_staff_and_malformed_scopes_never_expose_locations(context):
    client,sessions,tokens=context
    seed(sessions)
    with sessions() as db:
        db.get(models.Official,4).is_suspended=True;db.commit()
    assert client.get('/api/gov/agents/locations',headers=tokens['chief']).json()==[]
    with sessions() as db:
        db.get(models.Official,4).is_suspended=False
        db.get(models.Official,4).primary_jurisdiction={'district_ids':['invalid']};db.commit()
    assert client.get('/api/gov/agents/locations',headers=tokens['chief']).json()==[]
    with sessions() as db:
        db.get(models.Official,1).primary_jurisdiction={'district_ids':['invalid']};db.commit()
    for path in ('design-requests','analysis','surveys','procurement','boq','estimation','agents/locations'):
        assert client.get(f'/api/gov/{path}',headers=tokens['chief']).status_code==403


def test_stale_location_is_hidden_and_dispatch_filters_before_ranking(context):
    client,sessions,tokens=context
    seed(sessions)
    with sessions() as db:
        report=db.get(models.Report,1);report.location_lat=14.8;report.location_lng=121.1
        visible=db.query(gm.AgentLocation).filter_by(agent_id=4).one()
        visible.status='available';db.commit()
    result=client.get('/api/gov/dispatch/suggest-agent/1',headers=tokens['chief'])
    assert result.status_code==200,result.text
    assert [row['agent_id'] for row in result.json()]==[4]
    with sessions() as db:
        db.query(gm.AgentLocation).filter_by(agent_id=4).one().updated_at=datetime.now(timezone.utc)-timedelta(minutes=16)
        db.get(models.Report,2).barangay_id=2;db.commit()
    assert client.get('/api/gov/agents/locations',headers=tokens['chief']).json()==[]
    assert client.get('/api/gov/dispatch/suggest-agent/1',headers=tokens['chief']).json()==[]
    assert client.get('/api/gov/dispatch/suggest-agent/2',headers=tokens['chief']).status_code==403


def test_mobile_assignments_recheck_scope_and_include_blocked_work(context):
    client,sessions,tokens=context
    seed(sessions)
    with sessions() as db:
        db.get(gm.WorkOrder,1).status='blocked'
        db.get(gm.WorkOrder,2).assigned_to_id=4
        db.get(gm.WorkOrder,3).status='rework_required'
        db.commit()
    result=client.get('/api/gov/agents/my-work-orders',headers=tokens['field'])
    assert result.status_code==200,result.text
    assert {row['wo_id'] for row in result.json()}=={1,3}
    with sessions() as db:
        role=models.SystemRole(name='FAKE no field work view',capabilities={'work_orders':[]})
        db.add(role);db.flush();db.get(models.Official,4).role_id=role.id;db.commit()
    assert client.get('/api/gov/agents/my-work-orders',headers=tokens['field']).status_code==403


def test_history_workspace_pagination_search_scope_and_missing_estimate(context):
    client,sessions,tokens=context
    seed(sessions)
    with sessions() as db:
        db.query(gm.BoQItem).filter_by(procurement_request_id=5).delete();db.commit()
    result=client.get('/api/gov/financial-history',headers=tokens['chief'])
    assert result.status_code==200,result.text
    assert result.json()['total']==2
    rows={row['id']:row for row in result.json()['items']}
    assert set(rows)=={1,5}
    assert rows[1]['total_estimated_cost']==10
    assert rows[5]['total_estimated_cost'] is None
    assert client.get('/api/gov/financial-history?page=2',headers=tokens['chief']).json()['items']==[]
    assert client.get('/api/gov/financial-history?search=FAKE-PR-1',headers=tokens['chief']).json()['total']==1
    assert client.get('/api/gov/financial-history',headers=tokens['field']).status_code==403
    assert client.get('/api/gov/financial-history',headers=tokens['owner']).status_code==403
    assert client.get('/api/gov/financial-history?page=0',headers=tokens['chief']).status_code==422
    deny(sessions,procurement=[])
    assert client.get('/api/gov/financial-history',headers=tokens['chief']).status_code==403
    with sessions() as db:
        assert db.query(gm.AuditLog).count()==0  # Reads did not create/alter financial records.
        assert db.query(gm.ProcurementRequest).count()==5


def test_project_assessment_and_planning_bookmarks_keep_scoped_jobs(context):
    client,sessions,tokens=context
    seed(sessions)
    for view,expected in (('assessment',{1}),('planning',{3})):
        result=client.get(f'/api/gov/project-workspace?view={view}',headers=tokens['chief'])
        assert result.status_code==200,result.text
        assert {row['id'] for row in result.json()['items']}==expected
    deny(sessions,projects=[])
    assert client.get('/api/gov/project-workspace?view=planning',headers=tokens['chief']).status_code==403
