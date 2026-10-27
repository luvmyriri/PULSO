"""Access adapters for retained engineering lists and historical financial records.

These are read adapters, not procurement commands or engineering approvals.
Staff coordinates are restricted to work context and never used to route reports.
"""
from fastapi import HTTPException
from datetime import datetime, timedelta, timezone
from math import isfinite
from sqlalchemy import or_, select
import models
import gov_models as gm
from government_access import can, jurisdiction_ids, scoped

FIELD_SELF = {'field_worker', 'foreman', 'construction_foreman'}
ACTIVE_WORK = {'assigned', 'in_progress', 'blocked', 'rework_required'}
FINANCIAL_READERS = {'city_engineer', 'asst_city_engineer', 'division_chief', 'manager',
    'admin_officer', 'admin_clerk', 'finance_officer', 'bac_secretariat', 'system_admin',
    'estimator', 'project_engineer', 'records_officer'}
LOCATION_READERS = {'dispatcher', 'manager', 'city_engineer', 'asst_city_engineer',
    'division_chief', 'system_admin', 'project_engineer'}


def granted(user, module, action, defaults):
    if not isinstance(user, models.Official): return False
    caps = user.role_ref.capabilities or {} if user.role_ref else {}
    if module in caps:
        values = caps[module]
        return isinstance(values, list) and (action in values or '*' in values)
    return user.role in defaults


def work_view(user):
    return granted(user, 'work_orders', 'view', {
        'city_engineer', 'asst_city_engineer', 'division_chief', 'manager', 'dispatcher',
        'project_engineer', 'building_inspector', 'electrical_inspector', 'mechanical_inspector',
        'system_admin', 'admin_clerk', 'admin_officer', 'records_officer', 'design_engineer',
        'cad_operator', 'estimator', 'architect', 'finance_officer', *FIELD_SELF})


def work_query(db, user):
    if not work_view(user): raise HTTPException(403, 'Work order access is required.')
    query = scoped(db.query(gm.WorkOrder), gm.WorkOrder.district_id, user)
    if user.role in FIELD_SELF: query = query.filter(gm.WorkOrder.assigned_to_id == user.id)
    return query


def project_query(db, user):
    import project_workspace
    project_workspace.require(user)
    return scoped(db.query(gm.ProjectRequest), gm.ProjectRequest.district_id, user)


def financial_query(db, user):
    if not granted(user, 'procurement', 'view', FINANCIAL_READERS):
        raise HTTPException(403, 'Historical procurement record access is required.')
    query = db.query(gm.ProcurementRequest)
    ids = jurisdiction_ids(user)
    if ids:
        # Every recorded source must be in scope. An inconsistent dual-source
        # reference cannot use its in-scope half to expose the other district.
        work = select(gm.WorkOrder.id).where(gm.WorkOrder.district_id.in_(ids))
        projects = select(gm.ProjectRequest.id).where(gm.ProjectRequest.district_id.in_(ids))
        query = query.filter(or_(gm.ProcurementRequest.work_order_id.isnot(None), gm.ProcurementRequest.project_id.isnot(None)),
            or_(gm.ProcurementRequest.work_order_id.is_(None), gm.ProcurementRequest.work_order_id.in_(work)),
            or_(gm.ProcurementRequest.project_id.is_(None), gm.ProcurementRequest.project_id.in_(projects)))
    return query


def require_locations(user):
    if not granted(user, 'agents', 'location_view', LOCATION_READERS) or not can(user, 'coordination') or not work_view(user):
        raise HTTPException(403, 'Staff location access requires an operational coordination delegation.')


def visible_agents(db, user):
    require_locations(user)
    ids = set(jurisdiction_ids(user))
    agents = db.query(models.Official).filter(models.Official.role.in_(FIELD_SELF | {'project_engineer'}),
        models.Official.is_active.is_(True), models.Official.is_suspended.isnot(True)).order_by(models.Official.id).all()
    result = []
    for agent in agents:
        try: agent_ids = set(jurisdiction_ids(agent))
        except HTTPException: continue  # Invalid staff scope needs administrator review.
        if ids and agent_ids and not ids.intersection(agent_ids): continue
        # An unscoped employee is available citywide; their coordinates still
        # need an active in-scope assignment in location_rows().
        result.append(agent)
    return result


def location_rows(db, user):
    agents = {agent.id: agent for agent in visible_agents(db, user)}
    assigned = work_query(db, user).filter(gm.WorkOrder.status.in_(ACTIVE_WORK), gm.WorkOrder.assigned_to_id.in_(agents)).all()
    allowed = {work.assigned_to_id for work in assigned}
    locations = db.query(gm.AgentLocation).filter(gm.AgentLocation.agent_id.in_(allowed), gm.AgentLocation.status != 'offline',
        gm.AgentLocation.updated_at >= datetime.now(timezone.utc) - timedelta(minutes=15)).order_by(gm.AgentLocation.agent_id, gm.AgentLocation.updated_at.desc(), gm.AgentLocation.id.desc()).all()
    result = {}
    for loc in locations:
        if loc.agent_id in result: continue
        if loc.latitude is None or loc.longitude is None: continue
        if not isfinite(loc.latitude) or not isfinite(loc.longitude) or not -90 <= loc.latitude <= 90 or not -180 <= loc.longitude <= 180: continue
        result[loc.agent_id] = dict(id=loc.id, agent_id=loc.agent_id, agent_name=agents[loc.agent_id].full_name,
            latitude=loc.latitude, longitude=loc.longitude, status=loc.status,
            accuracy=loc.accuracy, updated_at=loc.updated_at.isoformat() if loc.updated_at else None)
    return result


def agent_work(db, user):
    agents = visible_agents(db, user)
    locations = location_rows(db, user)
    work = work_query(db, user).filter(gm.WorkOrder.status.in_(ACTIVE_WORK)).order_by(gm.WorkOrder.id).all()
    return [dict(agent_id=agent.id, agent_name=agent.full_name, role=agent.role,
        location=locations.get(agent.id), active_work_orders=[dict(wo_id=w.id, wo_number=w.wo_number,
            title=w.title, status=w.status, priority=w.priority) for w in work if w.assigned_to_id == agent.id]) for agent in agents]
