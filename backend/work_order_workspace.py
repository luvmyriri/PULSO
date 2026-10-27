"""Scoped queue pagination and action availability; mutation endpoints remain authoritative."""
from sqlalchemy import case, func, or_
from fastapi import HTTPException
import models
import gov_models as gm
from government_access import jurisdiction_ids

GROUPS={'open':['open'],'assigned':['assigned'],'active':['in_progress','rework_required'],'blocked':['blocked'],'completed_pending_review':['completed_pending_review','awaiting_verification'],'completed':['completed','resolved'],'cancelled':['cancelled']}

def queue(db,user,page,view,search,assignee=None):
    import gov_crud
    from gov_router import FIELD_SELF_ROLES, DISPATCH_ROLES
    query=db.query(gm.WorkOrder)
    ids=jurisdiction_ids(user)
    if ids: query=query.filter(gm.WorkOrder.district_id.in_(ids))
    if user.role in FIELD_SELF_ROLES: query=query.filter(gm.WorkOrder.assigned_to_id==user.id)
    if assignee is not None:
        if assignee == 'unassigned': query=query.filter(gm.WorkOrder.assigned_to_id.is_(None))
        elif assignee.isdigit(): query=query.filter(gm.WorkOrder.assigned_to_id==int(assignee))
        else: raise HTTPException(422,'Choose a recorded work-order owner.')
    by_status=dict(query.with_entities(gm.WorkOrder.status,func.count(gm.WorkOrder.id)).group_by(gm.WorkOrder.status).all())
    counts={key:sum(by_status.get(status,0) for status in statuses) for key,statuses in GROUPS.items()}
    counts['all']=sum(by_status.values())
    counts['current']=sum(count for status,count in by_status.items() if status not in {'completed','resolved','cancelled'})
    if view!='all':
        if view == 'current': query=query.filter(gm.WorkOrder.status.notin_(['completed','resolved','cancelled']))
        elif view in GROUPS: query=query.filter(gm.WorkOrder.status.in_(GROUPS[view]))
        else: raise HTTPException(422,'Choose an available work queue.')
    if search:
        term=f'%{search}%'
        query=query.filter(or_(gm.WorkOrder.wo_number.ilike(term),gm.WorkOrder.title.ilike(term),gm.WorkOrder.location_string.ilike(term),gm.WorkOrder.assigned_to.has(models.Official.full_name.ilike(term))))
    total=query.count()
    query=query.order_by(case((gm.WorkOrder.status.in_(['completed','resolved','cancelled']),1),else_=0),gm.WorkOrder.updated_at.desc().nullslast(),gm.WorkOrder.id.desc())
    owner = db.get(models.Official, int(assignee)) if total and assignee and assignee != 'unassigned' else None
    return dict(items=[gov_crud.enrich_work_order(work,db) for work in query.offset((page-1)*15).limit(15).all()],total=total,page=page,counts=counts,can_create=user.role in DISPATCH_ROLES,
                owner_filter='Unassigned' if assignee=='unassigned' else owner.full_name if owner else None)

def actions(db,user,work_id):
    from gov_router import _require_work_order_view, DISPATCH_ROLES, FIELD_ROLES, INSPECTOR_ROLES
    work=db.get(gm.WorkOrder,work_id)
    if not work: raise HTTPException(404,'Work order not found.')
    _require_work_order_view(work,user)
    allowed=[]
    owner=work.assigned_to_id==user.id
    dispatch=user.role in DISPATCH_ROLES
    if dispatch and work.status=='open': allowed.append('assign')
    if owner and user.role in FIELD_ROLES and work.status in ['assigned','rework_required']: allowed.append('start')
    if owner and user.role in FIELD_ROLES and work.status=='in_progress': allowed.append('submit_completion')
    if user.role in FIELD_ROLES and (owner or dispatch) and work.status in ['assigned','in_progress']: allowed.append('block')
    if user.role in FIELD_ROLES and (owner or dispatch) and work.status=='blocked': allowed.append('unblock')
    if user.role in INSPECTOR_ROLES and not owner and work.status in ['completed_pending_review','awaiting_verification']: allowed.append('verify')
    import project_workspace
    if dispatch and project_workspace.allowed(user,'manage') and not work.project_id and work.status not in {'completed','cancelled','resolved'}:
        allowed.append('refer_project')
    return dict(allowed_actions=allowed)
