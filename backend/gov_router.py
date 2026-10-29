"""
gov_router.py — Government-Side API Endpoints
City Engineering Office, Caloocan City — PULSO System

Mounts under /api/gov/

Endpoints:
  Work Orders          : /api/gov/work-orders
  Process Timeline     : /api/gov/timeline
  Audit Logs           : /api/gov/audit-logs
  Procurement Requests : /api/gov/procurement
  Project Requests     : /api/gov/projects
  OBO Inspections      : /api/gov/obo
  Dashboard Stats      : /api/gov/dashboard/stats
  User Management      : /api/gov/users  (admin only)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Form, Header
from fastapi.responses import FileResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field, model_validator

from database import get_db
from auth import get_current_user
from datetime import datetime
import models
import gov_models
import gov_schemas
import gov_crud
import roles_service
import command_integrity
import report_review
import legacy_operations
import os
import io
import json
import uuid
import re

# [RA 9184 & RA 12009] Systems 
import notification_service
import fqa_engine

router = APIRouter(prefix="/api/gov", tags=["Government"])


@router.get('/account')
def government_account(db: Session = Depends(get_db),current_user=Depends(get_current_user)):
    if not isinstance(current_user,models.Official): raise HTTPException(403,'Staff access is required.')
    import staff_accounts
    return {**staff_accounts.project(db,current_user),'phone_number':current_user.phone_number,'address':current_user.address}


@router.get('/navigation')
def government_navigation(db: Session=Depends(get_db), current_user=Depends(get_current_user)):
    from government_access import can
    if not isinstance(current_user, models.Official):
        raise HTTPException(403, 'Staff access is required.')
    modules = ['my-work']
    if can(current_user, 'overview'): modules.append('overview')
    modules += ['reports', 'work-orders']
    if current_user.role in FIELD_ROLES or current_user.role in {'system_admin', 'admin'}:
        modules.append('field')
    import project_workspace
    if project_workspace.allowed(current_user): modules.append('projects')
    if can(current_user, 'maintenance'): modules += ['assets', 'analytics', 'predictive']
    if roles_service.has_permission(db, current_user, 'records', 'view'): modules.append('records')
    if can(current_user, 'announcements'): modules.append('announcements')
    import staff_accounts
    if any(staff_accounts.allowed(current_user,action) for action in ('staff_view','residents_view','settings_view','audit_view')): modules.append('settings')
    return {'modules': modules}


@router.get('/report-map')
def government_report_map(ids: Optional[str] = None, asset_id: Optional[str] = None, context_asset_id: Optional[str] = None, overview: Optional[str] = None, area: Optional[str] = None, priority: Optional[str] = None, radius_m: int = Query(500, ge=50, le=2000), skip: int = Query(0, ge=0), limit: int = Query(1000, ge=1, le=1000), as_of: Optional[datetime] = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from government_access import require, scoped_reports
    require(current_user, 'reports')
    from math import isfinite
    if overview is not None:
        from operations_workspace import overview_report_query
        query = overview_report_query(db, current_user, overview, area, priority)
    else:
        query = scoped_reports(db.query(models.Report), current_user)
        if current_user.role in FIELD_SELF_ROLES:
            query = query.filter(models.Report.id.in_(db.query(gov_models.WorkOrder.report_id).filter(gov_models.WorkOrder.assigned_to_id == current_user.id)))
    if ids is not None:
        parts = ids.split(',') if ids else []
        if len(parts) > 1000 or any(not p.isdigit() for p in parts): raise HTTPException(422, 'Select at most 1000 numeric report identifiers.')
        query = query.filter(models.Report.id.in_([int(p) for p in parts]))
    if asset_id is not None:
        query = query.filter(models.Report.id.in_(db.query(gov_models.WorkOrder.report_id).filter(gov_models.WorkOrder.asset_id == asset_id)))
    context = None
    if context_asset_id:
        from asset_map_context import asset_report_context
        context = asset_report_context(db, current_user, context_asset_id, radius_m)
        query = query.filter(models.Report.id.in_([r.id for r in context['reports']]))
    snapshot = as_of or datetime.now().astimezone()
    if snapshot.tzinfo is None: raise HTTPException(422, 'Report snapshot time must include a timezone.')
    query = query.filter(models.Report.created_at <= snapshot)
    total = query.count()
    rows = query.order_by(models.Report.created_at.desc(), models.Report.id.desc()).offset(skip).limit(limit).all()
    def point(report):
        lat, lng = report.location_lat, report.location_lng
        if lat is None or lng is None or not isfinite(lat) or not isfinite(lng) or not (-90 <= lat <= 90 and -180 <= lng <= 180) or (lat == 0 and lng == 0): return None
        return dict(lat=lat, lng=lng)
    return dict(as_of=snapshot, total=total, truncated=total > len(rows), next_skip=skip + len(rows) if skip + len(rows) < total else None,
        asset=context['asset'] if context else None, radius_m=radius_m if context else None,
        items=[dict(id=r.id, ticket_id=r.ticket_id, title=(r.description or 'Resident report')[:180], category=r.category or r.ai_category or 'Unclassified', status=r.status, barangay=r.location_barangay, address=r.location_string, position=point(r), image_url=r.image_url, created_at=r.created_at, updated_at=r.updated_at, review_operations=report_review.projection(db,r),
            relationship='linked' if context and r.id in context['linked_ids'] else 'nearby' if context else None,
            distance_m=context['distances'].get(r.id) if context else None) for r in rows])

# Role groups (FR-13 RBAC)
@router.get('/records-workspace/permissions')
def records_workspace_permissions(db: Session=Depends(get_db),current_user=Depends(get_current_user)):
    from records_workspace import record_permissions
    return record_permissions(db,current_user)


@router.get('/records-workspace')
def records_workspace_data(view: str='documents',page: int=Query(1,ge=1),search: str=Query('',max_length=160),db: Session=Depends(get_db),current_user=Depends(get_current_user)):
    from records_workspace import workspace_records
    return workspace_records(db,current_user,view,page,search)


GOV_ROLES = [
    "city_engineer", "asst_city_engineer", "admin_clerk", "manager",
    "project_engineer", "dispatcher", "estimator", "architect",
    "division_chief", "building_inspector", "finance_officer", "admin_officer",
    "records_officer", "design_engineer", "cad_operator", "foreman",
    "field_worker", "construction_foreman", "electrical_inspector", "mechanical_inspector", "system_admin", "admin",
    "division_chief_arch", "division_chief_structural", "division_chief_electrical"
]

FIELD_ROLES = [
    "project_engineer", "dispatcher", "building_inspector", 
    "asst_city_engineer", "city_engineer", "manager", "foreman", "construction_foreman", "field_worker"
]

DISPATCH_ROLES = ["dispatcher", "project_engineer", "asst_city_engineer", "city_engineer", "manager"]
FIELD_SELF_ROLES = {"field_worker", "foreman", "construction_foreman"}


def _require_work_order_view(wo, user):
    from government_access import require_scope
    require_scope(user, wo)
    if user.role in FIELD_SELF_ROLES and wo.assigned_to_id != user.id:
        raise HTTPException(status_code=403, detail="Work order is outside your assignment")


def _require_assigned_or_dispatcher(db: Session, wo_id: int, user):
    wo = gov_crud.get_work_order(db, wo_id)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    _require_work_order_view(wo, user)
    if user.role not in DISPATCH_ROLES and wo.assigned_to_id != user.id:
        raise HTTPException(status_code=403, detail="Work order is not assigned to you")
    return wo

PROCUREMENT_ROLES = [
    "admin_officer", "manager", "admin_clerk", "finance_officer", "bac_secretariat",
    "city_engineer", "estimator"
]

SENIOR_ROLES = [
    "city_engineer", "asst_city_engineer", "manager", "division_chief",
    "admin_officer", "dispatcher", "records_officer", "project_engineer", "design_engineer",
    "building_inspector", "finance_officer"
]

EXECUTIVE_ROLES = [
    "city_engineer", "asst_city_engineer", "manager"
]

ADMIN_ONLY = ["system_admin"]

# Role helpers replaced by dynamic /roles endpoint at the end of the file.

INSPECTOR_ROLES = [
    "building_inspector", "architect", "project_engineer", 
    "asst_city_engineer", "city_engineer", "manager",
    "electrical_inspector", "mechanical_inspector"
]


def _assert_role(user, *allowed_roles):
    """Reject non-officials and officials outside the explicitly allowed roles."""
    from operational_roles import canonical_role
    if not isinstance(user, models.Official) or canonical_role(user.role) not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Government capability required for this action."
        )


def _name(db: Session, user_id: Optional[int]) -> Optional[str]:
    """Return full_name for a user_id, or None. Probes both Official and Resident."""
    if user_id is None:
        return None
    # 1. Try Official first (most common for gov_router context)
    u = db.query(models.Official).filter(models.Official.id == user_id).first()
    if u: return u.full_name
    # 2. Try Resident next
    u = db.query(models.Resident).filter(models.Resident.id == user_id).first()
    return u.full_name if u else None






# ─────────────────────────────────────────────────────────────────────────────
# Dashboard Stats
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/dashboard/stats", response_model=gov_schemas.GovDashboardStats)
def gov_dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Aggregated KPI dashboard for the LGU Government Command Center.
    Accessible to all authenticated LGU staff.
    """
    _assert_role(current_user, *EXECUTIVE_ROLES)
    return gov_crud.get_gov_dashboard_stats(db)


# ─────────────────────────────────────────────────────────────────────────────
# Work Orders
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/dispatch/eligible-assignees")
def list_eligible_assignees(
    wo_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_role(current_user, *DISPATCH_ROLES)
    eligible_roles = ("field_worker", "foreman", "construction_foreman", "project_engineer", "building_inspector")
    officials = db.query(models.Official).filter(
        models.Official.is_active == True,
        models.Official.is_suspended == False,
        models.Official.role.in_(eligible_roles),
    ).order_by(models.Official.full_name).all()
    from government_access import require_scope, jurisdiction_ids
    wo = db.query(gov_models.WorkOrder).filter_by(id=wo_id).first() if wo_id else None
    if wo_id and not wo:
        raise HTTPException(404, 'Work order not found.')
    if wo: require_scope(current_user, wo)
    active_counts=dict(db.query(gov_models.WorkOrder.assigned_to_id,func.count(gov_models.WorkOrder.id)).filter(
        gov_models.WorkOrder.assigned_to_id.isnot(None),
        gov_models.WorkOrder.status.notin_({'completed','resolved','cancelled','rejected'}),
    ).group_by(gov_models.WorkOrder.assigned_to_id).all())
    eligible = []
    for person in officials:
        try:
            ids = jurisdiction_ids(person)
        except HTTPException:
            continue
        if wo and ids and wo.district_id not in ids:
            continue
        eligible.append({'id': person.id, 'full_name': person.full_name, 'role': person.role,'active_work_count':active_counts.get(person.id,0)})
    return sorted(eligible,key=lambda person:(person['active_work_count'],person['full_name'].casefold(),person['id']))


@router.post('/work-orders/{wo_id}/assignment', response_model=gov_schemas.WorkOrderResponse)
def assign_work_order_owner(wo_id: int, payload: gov_schemas.WorkOrderAssignment, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    _assert_role(current_user, *DISPATCH_ROLES)
    from government_access import require_scope, jurisdiction_ids
    wo = db.query(gov_models.WorkOrder).filter_by(id=wo_id).with_for_update().first()
    if not wo: raise HTTPException(404, 'Work order not found.')
    require_scope(current_user, wo)
    if wo.status == 'assigned' and wo.assigned_to_id == payload.assigned_to_id:
        return gov_crud.enrich_work_order(wo, db)
    if wo.status != 'open': raise HTTPException(409, 'Only an open work order can receive its first assignment. Reload the current record.')
    gov_crud._validate_assignee(db, payload.assigned_to_id)
    person = db.query(models.Official).filter_by(id=payload.assigned_to_id).first()
    ids = jurisdiction_ids(person)
    if ids and wo.district_id not in ids: raise HTTPException(403, 'This work is outside the selected official’s configured district scope.')
    wo.assigned_to_id, wo.assigned_by_id = person.id, current_user.id
    wo.assignment_version += 1
    gov_crud._append_audit(db,trigger_type='work_order_assignment',action='Work order owner assigned',actor_id=current_user.id,actor_role=current_user.role,work_order_id=wo.id,
        details=json.dumps(dict(previous_owner_id=None,owner_id=person.id,reason=payload.reason.strip(),assignment_version=wo.assignment_version)))
    wo = gov_crud.update_work_order_status(db, wo.id, 'assigned', current_user.id, current_user.role, note='A field work owner was assigned.')
    return gov_crud.enrich_work_order(wo, db)


@router.post('/work-orders/{wo_id}/reassignment',response_model=gov_schemas.WorkOrderResponse)
def reassign_work_order_owner(wo_id:int,payload:gov_schemas.WorkOrderReassignment,db:Session=Depends(get_db),current_user=Depends(get_current_user)):
    _assert_role(current_user,*DISPATCH_ROLES)
    from government_access import require_scope,jurisdiction_ids
    import staff_accounts
    staff_accounts.lock_accounts(db,current_user)
    wo=db.query(gov_models.WorkOrder).filter_by(id=wo_id).populate_existing().with_for_update().first()
    if not wo: raise HTTPException(404,'Work order not found.')
    require_scope(current_user,wo)
    if wo.assignment_version!=payload.expected_assignment_version: raise HTTPException(409,'The assignment changed. Reload the work order before reassigning.')
    if wo.status not in {'assigned','in_progress','blocked','rework_required'} or not wo.assigned_to_id:
        raise HTTPException(409,'This work order is not in a transferable stage. Review its current status.')
    if wo.assigned_to_id==payload.assigned_to_id: raise HTTPException(409,'This employee already owns the work order.')
    gov_crud._validate_assignee(db,payload.assigned_to_id)
    person=db.get(models.Official,payload.assigned_to_id)
    ids=jurisdiction_ids(person)
    if ids and wo.district_id not in ids: raise HTTPException(422,'The selected employee does not cover this work order district.')
    previous_owner_id=wo.assigned_to_id
    previous_owner=db.get(models.Official,previous_owner_id)
    wo.assigned_to_id=person.id
    wo.assigned_by_id=current_user.id
    wo.assignment_version+=1
    gov_crud._append_audit(db,trigger_type='work_order_assignment',action='Work order owner reassigned',actor_id=current_user.id,actor_role=current_user.role,work_order_id=wo.id,
        details=json.dumps(dict(previous_owner_id=previous_owner_id,owner_id=person.id,reason=payload.reason.strip(),status=wo.status,assignment_version=wo.assignment_version)))
    gov_crud._append_timeline(db,status=wo.status,previous_status=wo.status,actor_id=current_user.id,actor_role=current_user.role,
        note=f'Field work ownership transferred from {previous_owner.full_name if previous_owner else "previous owner"} to {person.full_name}. Reason: {payload.reason.strip()}. Existing progress and evidence remain on this work order.',work_order_id=wo.id,is_public=False)
    db.add(models.Notification(official_id=person.id,title='Work order assigned to you',message=f'{wo.wo_number}: {wo.title}',target_url=f'/gov/work-orders?wo={wo.id}'))
    db.commit()
    db.refresh(wo)
    return gov_crud.enrich_work_order(wo,db)

@router.post("/work-orders", response_model=gov_schemas.WorkOrderResponse)
def create_work_order(
    data: gov_schemas.WorkOrderCreate,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Create a new Work Order (standard or preemptive/early dispatch).
    Allowed: Dispatcher, City Engineer, Project Engineer, Senior roles.

    - wo_type = "standard"    : Created after a citizen report
    - wo_type = "preemptive"  : Created proactively (FR-11)
    """
    _assert_role(current_user, *DISPATCH_ROLES)
    from government_access import require_report_scope,jurisdiction_ids
    import project_workspace
    project=None
    if data.project_id:
        project_workspace.require(current_user,'manage')
        project=project_workspace.target(db,current_user,data.project_id,True)
        if not project.coordination_started_at or project.status in project_workspace.CLOSED:
            raise HTTPException(409,'Open project coordination before adding a work order.')
        if data.assigned_to_id:
            person=db.get(models.Official,data.assigned_to_id)
            if person:
                ids=jurisdiction_ids(person)
                if ids and project.district_id not in ids:
                    raise HTTPException(422,'The selected employee does not cover this project district.')
        if data.report_id and data.report_id!=project.source_report_id and not db.query(gov_models.ProjectReportLink.id).filter_by(project_id=project.id,report_id=data.report_id).first():
            raise HTTPException(422,'Link the report to this project before creating its work order.')
    if data.report_id:
        report = db.get(models.Report, data.report_id)
        if not report: raise HTTPException(404, 'Source report not found')
        require_report_scope(db, current_user, report)
    key = command_integrity.validate_key(idempotency_key)
    if project and not data.report_id:
        if if_match is not None and not re.fullmatch(r'0|[1-9][0-9]*',if_match.strip()):
            raise HTTPException(422,'If-Match must contain the current project version.')
        expected=int(if_match.strip()) if if_match is not None else None
    else:
        expected = command_integrity.parse_version(if_match)
    if project and not data.report_id:
        if key: raise HTTPException(422,'Use the project version for duplicate protection when opening a project work order.')
        if expected is None: raise HTTPException(428,'Provide the current project version in If-Match.')
        if expected!=project.coordination_version: raise HTTPException(409,'The project changed. Refresh it before creating a work order.')
        if not data.title or len(data.title.strip())<3 or not data.description or len(data.description.strip())<10 or not data.notes or len(data.notes.strip())<10:
            raise HTTPException(422,'Provide a task title, scope, and reason of at least 10 characters.')
        project.coordination_version+=1
    elif (key or expected is not None) and data.report_id is None:
        raise HTTPException(status_code=422, detail="Versioned retries require a source report")
    digest = command_integrity.request_hash(data.model_dump(mode="json")) if key else None
    wo = gov_crud.create_work_order(
        db, data, actor_id=current_user.id, actor_role=current_user.role,
        idempotency_key=key, request_digest=digest, expected_report_version=expected,
    )
    return gov_crud.enrich_work_order(wo, db)


@router.get("/dispatch/suggest-agent/{report_id}")
def suggest_agents_by_proximity(
    report_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns a ranked list of available/returning engineers closest to the report.
    Used for intelligent manual dispatch recommendations.
    """
    _assert_role(current_user, *DISPATCH_ROLES)
    from government_access import require, require_report_scope
    require(current_user, 'reports')
    report = db.get(models.Report, report_id)
    if not report: raise HTTPException(404, 'Report not found.')
    require_report_scope(db, current_user, report)
    visible = legacy_operations.location_rows(db, current_user)
    return gov_crud.find_smart_dispatch_suggestions(db, report_id, allowed_agent_ids=list(visible))

@router.get("/work-orders", response_model=List[gov_schemas.WorkOrderResponse])
def list_work_orders(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = Query(None),
    wo_type: Optional[str] = Query(None),
    assigned_to_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List work orders; field staff only see their assignments."""
    _assert_role(current_user, *GOV_ROLES)
    if current_user.role in FIELD_SELF_ROLES:
        assigned_to_id = current_user.id
    from government_access import jurisdiction_ids
    items = gov_crud.list_work_orders(db, skip, limit, status, wo_type, assigned_to_id, search, district_ids=jurisdiction_ids(current_user))
    return [gov_crud.enrich_work_order(w, db) for w in items]


@router.get('/work-order-workspace')
def work_order_workspace(page: int=Query(1,ge=1),view: str='all',search: str=Query('',max_length=160),assignee: Optional[str]=None,db: Session=Depends(get_db),current_user=Depends(get_current_user)):
    _assert_role(current_user,*GOV_ROLES)
    from work_order_workspace import queue
    return queue(db,current_user,page,view,search,assignee)


@router.get('/work-order-actions/{work_id}')
def work_order_available_actions(work_id: int,db: Session=Depends(get_db),current_user=Depends(get_current_user)):
    _assert_role(current_user,*GOV_ROLES)
    from work_order_workspace import actions
    return actions(db,current_user,work_id)


@router.get("/work-orders/{wo_id}", response_model=gov_schemas.WorkOrderResponse)
def get_work_order(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single work order by ID."""
    _assert_role(current_user, *GOV_ROLES)
    wo = gov_crud.get_work_order(db, wo_id)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    _require_work_order_view(wo, current_user)
    return gov_crud.enrich_work_order(wo, db)


@router.get("/work-orders/{wo_id}/evidence/{filename}")
def get_work_order_evidence(
    wo_id: int,
    filename: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_role(current_user, *GOV_ROLES)
    if not re.fullmatch(r"[a-f0-9]{32}\.jpg", filename):
        raise HTTPException(status_code=404, detail="Evidence not found")
    wo = gov_crud.get_work_order(db, wo_id)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    _require_work_order_view(wo, current_user)
    reference = f"/api/gov/work-orders/{wo_id}/evidence/{filename}"
    recorded = db.query(gov_models.WorkOrderUpdate).filter(
        gov_models.WorkOrderUpdate.work_order_id == wo_id,
        gov_models.WorkOrderUpdate.image_url == reference,
    ).first()
    if not recorded:
        raise HTTPException(status_code=404, detail="Evidence not found")
    path = os.path.join("uploads", "docs", "work_orders", str(wo_id), filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Evidence not found")
    return FileResponse(path, media_type="image/jpeg", headers={
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    })


@router.post("/work-orders/{wo_id}/completion-evidence", response_model=gov_schemas.WorkOrderUpdateResponse)
async def submit_completion_evidence(
    wo_id: int,
    image: UploadFile = File(...),
    notes: str = Form(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_role(current_user, *FIELD_ROLES)
    wo = gov_crud.get_work_order(db, wo_id)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    if wo.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the assigned field official can submit completion proof")
    if wo.status != "in_progress":
        raise HTTPException(status_code=409, detail="Work order must be in progress")
    if not notes.strip():
        raise HTTPException(status_code=422, detail="Completion notes are required")
    from PIL import Image, ImageOps, UnidentifiedImageError
    raw = await image.read(10 * 1024 * 1024 + 1)
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image exceeds the 10 MB limit")
    try:
        with Image.open(io.BytesIO(raw)) as source:
            if source.format not in ("JPEG", "PNG", "WEBP") or source.width * source.height > 24_000_000:
                raise ValueError("Unsupported image")
            photo = ImageOps.exif_transpose(source).convert("RGB")
            photo.load()
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=422, detail="A valid JPEG, PNG or WebP image is required")
    directory = os.path.join("uploads", "docs", "work_orders", str(wo_id))
    os.makedirs(directory, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.jpg"
    path = os.path.join(directory, filename)
    photo.save(path, format="JPEG", quality=85)
    evidence_url = f"/api/gov/work-orders/{wo_id}/evidence/{filename}"
    try:
        return gov_crud.create_work_order_update(
            db, wo_id,
            gov_schemas.WorkOrderUpdateCreate(
                comment=notes.strip(), new_status="completed_pending_review", image_url=evidence_url,
            ),
            user_id=current_user.id,
        )
    except Exception:
        db.rollback()
        os.remove(path)
        raise


@router.patch("/work-orders/{wo_id}", response_model=gov_schemas.WorkOrderResponse)
def update_work_order(
    wo_id: int,
    data: gov_schemas.WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update work order fields (status, assignee, notes, etc.)."""
    _assert_role(current_user, *DISPATCH_ROLES)
    _require_assigned_or_dispatcher(db,wo_id,current_user)
    wo = gov_crud.update_work_order(db, wo_id, data, actor_id=current_user.id, actor_role=current_user.role)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    return gov_crud.enrich_work_order(wo, db)


@router.post("/work-orders/{wo_id}/updates", response_model=gov_schemas.WorkOrderUpdateResponse)
def create_work_order_update_entry(
    wo_id: int,
    data: gov_schemas.WorkOrderUpdateCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Submit a progress update for a work order. 
    Field workers can check-in, add comments, and upload photo evidence URLs.
    """
    _assert_role(current_user, *FIELD_ROLES)
    _require_assigned_or_dispatcher(db, wo_id, current_user)
    if data.new_status or data.image_url:
        raise HTTPException(status_code=422, detail="Use the governed field status or completion proof endpoint")
    up = gov_crud.create_work_order_update(db, wo_id, data, user_id=current_user.id)
    if not up:
        raise HTTPException(status_code=404, detail="Work order not found")
    return up


@router.patch("/work-orders/{wo_id}/status", response_model=gov_schemas.WorkOrderResponse)
def update_work_order_status(
    wo_id: int,
    payload: gov_schemas.WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Advance a work order's status.
    Valid transitions: open→assigned→in_progress→completed | cancelled
    """
    _assert_role(current_user, *DISPATCH_ROLES)
    _require_assigned_or_dispatcher(db,wo_id,current_user)
    if not payload.status:
        raise HTTPException(status_code=422, detail="'status' field is required")
    wo = gov_crud.update_work_order_status(
        db, wo_id, payload.status,
        actor_id=current_user.id, actor_role=current_user.role,
        note=payload.notes,
    )
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    return gov_crud.enrich_work_order(wo, db)


@router.post("/work-orders/{wo_id}/approval", response_model=gov_schemas.WorkOrderApprovalResponse)
def approve_or_reject_work_order(
    wo_id: int,
    payload: gov_schemas.WorkOrderApprovalRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Approve or reject a work order.
    - action: "approve" → status changes to "assigned"
    - action: "reject" → status changes to "rejected"
    
    Accessible to: Dispatcher, City Engineer, Project Engineer, Admin
    """
    _assert_role(current_user, "dispatcher", "city_engineer", "project_engineer", "admin", "senior_dispatcher")
    _require_assigned_or_dispatcher(db,wo_id,current_user)
    
    if payload.action not in ("approve", "reject"):
        raise HTTPException(status_code=422, detail="Action must be 'approve' or 'reject'")
    
    if payload.action == "approve":
        approval = gov_crud.approve_work_order(
            db, wo_id,
            approver_id=current_user.id,
            notes=payload.notes,
        )
    else:
        approval = gov_crud.reject_work_order(
            db, wo_id,
            approver_id=current_user.id,
            notes=payload.notes,
        )
    
    if not approval:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    return gov_schemas.WorkOrderApprovalResponse(
        id=approval.id,
        work_order_id=approval.work_order_id,
        approver_id=approval.approver_id,
        approver_name=_name(db, approval.approver_id),
        action=approval.action,
        notes=approval.notes,
        created_at=approval.created_at,
    )


@router.get("/work-orders/{wo_id}/approvals", response_model=List[gov_schemas.WorkOrderApprovalResponse])
def get_work_order_approvals(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get approval history for a work order.
    """
    _assert_role(current_user, *GOV_ROLES)
    wo = gov_crud.get_work_order(db, wo_id)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    _require_work_order_view(wo, current_user)
    approvals = gov_crud.get_work_order_approvals(db, wo_id)
    return [
        gov_schemas.WorkOrderApprovalResponse(
            id=a.id,
            work_order_id=a.work_order_id,
            approver_id=a.approver_id,
            approver_name=_name(db, a.approver_id),
            action=a.action,
            notes=a.notes,
            created_at=a.created_at,
        )
        for a in approvals
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Process Timeline  (FR-14)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/timeline", response_model=List[gov_schemas.ProcessTimelineResponse])
def get_all_timelines(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Global process timeline across all modules (reports, work orders, projects).
    LGU staff only. Allows rendering of the 'Process Timeline' dashboard.
    """
    _assert_role(current_user, *DISPATCH_ROLES, *INSPECTOR_ROLES)
    from records_workspace import activity_query
    entries = activity_query(db,current_user,gov_models.ProcessTimeline).order_by(gov_models.ProcessTimeline.created_at.desc(),gov_models.ProcessTimeline.id.desc()).offset(skip).limit(limit).all()
    return gov_crud.enrich_timeline(entries, db)


@router.get("/timeline/report/{report_id}", response_model=List[gov_schemas.ProcessTimelineResponse])
def get_report_timeline(
    report_id: int,
    public_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Full lifecycle timeline for a citizen report.
    Citizens see public_only=True. LGU staff see all entries.
    """
    # Residents can only see their own reports' public timeline
    if isinstance(current_user, models.Resident):
        public_only = True
        report = db.query(models.Report).filter(models.Report.id == report_id).first()
        if not report or report.resident_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        _assert_role(current_user, *GOV_ROLES)
        from government_access import require_report_scope
        report=db.get(models.Report,report_id)
        if not report: raise HTTPException(404,'Report not found.')
        require_report_scope(db,current_user,report)
        if current_user.role in FIELD_SELF_ROLES:
            linked = db.query(gov_models.WorkOrder).filter(
                gov_models.WorkOrder.report_id == report_id,
                gov_models.WorkOrder.assigned_to_id == current_user.id,
            ).first()
            if not linked:
                raise HTTPException(status_code=403, detail="Report is outside your assignment")

    entries = gov_crud.get_timeline_for_report(db, report_id, public_only)
    return gov_crud.enrich_timeline(entries, db)


@router.get("/timeline/work-order/{wo_id}", response_model=List[gov_schemas.ProcessTimelineResponse])
def get_work_order_timeline(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Full process timeline for a work order. LGU staff only."""
    _assert_role(current_user, *GOV_ROLES)
    wo = gov_crud.get_work_order(db, wo_id)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    _require_work_order_view(wo, current_user)
    entries = gov_crud.get_timeline_for_work_order(db, wo_id)
    return gov_crud.enrich_timeline(entries, db)


@router.get("/timeline/project/{project_id}", response_model=List[gov_schemas.ProcessTimelineResponse])
def get_project_timeline(
    project_id: int,
    public_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Full process timeline for an LGU project."""
    _assert_role(current_user, *GOV_ROLES)
    from government_access import require_scope
    project=db.get(gov_models.ProjectRequest,project_id)
    if not project: raise HTTPException(404,'Project not found.')
    require_scope(current_user,project)
    entries = gov_crud.get_timeline_for_project(db, project_id, public_only)
    return gov_crud.enrich_timeline(entries, db)


# ─────────────────────────────────────────────────────────────────────────────

@router.get("/documents")
def get_system_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Centralized Electronic Records registry (RA 9470)."""
    _assert_role(current_user, *SENIOR_ROLES, 'system_admin')
    from records_workspace import documents_query,document_projection
    return [document_projection(doc) for doc in documents_query(db,current_user).order_by(gov_models.SystemDocument.uploaded_at.desc()).offset(skip).limit(limit).all()]


# ─────────────────────────────────────────────────────────────────────────────
# Procurement Requests  (FR-12 — RA 9184 Workflow)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/procurement", response_model=gov_schemas.ProcurementRequestResponse)
def create_procurement_request(
    data: gov_schemas.ProcurementRequestCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Raise a new Procurement Request Letter (draft state).
    Raised by: Project Engineer, Estimator, Admin Officer roles.
    """
    _assert_role(current_user, *GOV_ROLES)
    raise HTTPException(status_code=409, detail="PULSO records sourced disclosures only. Budget and procurement processing must be completed through the responsible city office and official systems.")


@router.get("/procurement", response_model=List[gov_schemas.ProcurementRequestResponse])
def list_procurement_requests(
    skip: int = Query(0, ge=0, le=10000),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Procurement list view. Filtered by status e.g. 'sent_to_procurement'."""
    _assert_role(current_user, *GOV_ROLES)
    query = legacy_operations.financial_query(db, current_user)
    items = gov_crud.list_procurement_requests(db, skip, limit, status, search, query=query)
    return [gov_crud.enrich_procurement(p, db) for p in items]


@router.get('/financial-history')
def financial_history(page: int = Query(1, ge=1), search: str = Query('', max_length=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = legacy_operations.financial_query(db, current_user)
    if search:
        query = query.filter(or_(gov_models.ProcurementRequest.title.ilike(f'%{search}%'),
            gov_models.ProcurementRequest.pr_number.ilike(f'%{search}%')))
    total = query.count()
    rows = query.order_by(gov_models.ProcurementRequest.created_at.desc(), gov_models.ProcurementRequest.id.desc()).offset((page-1)*15).limit(15).all()
    return dict(total=total, page=page, items=[gov_schemas.ProcurementRequestResponse.model_validate(gov_crud.enrich_procurement(row, db)).model_dump() for row in rows])


@router.get("/procurement/{pr_id}", response_model=gov_schemas.ProcurementRequestResponse)
def get_procurement_request(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single Procurement Request with all BoQ items."""
    _assert_role(current_user, *GOV_ROLES)
    pr = legacy_operations.financial_query(db, current_user).filter_by(id=pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Procurement request not found")
    return gov_crud.enrich_procurement(pr, db)


@router.patch("/procurement/{pr_id}/status", response_model=gov_schemas.ProcurementRequestResponse)
def update_procurement_status(
    pr_id: int,
    payload: gov_schemas.ProcurementStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Advance procurement request through the approval workflow:
      draft → submitted  (Estimator / Project Engineer)
      submitted → validated  (Administrative Officer V)
      validated → sent_to_procurement  (City Engineer)
      sent_to_procurement → procured  (Procurement Officer / Admin)
      any → rejected  (Admin Officer or City Engineer)
    """
    _assert_role(current_user, *GOV_ROLES)
    raise HTTPException(status_code=409, detail="PULSO records sourced disclosures only. Budget and procurement processing must be completed through the responsible city office and official systems.")


@router.patch("/procurement/{pr_id}/funding-certification", response_model=gov_schemas.ProcurementRequestResponse)
def update_procurement_funding(
    pr_id: int,
    payload: gov_schemas.ProcurementFundingUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Certify that funding is available for this procurement and assign an ObR Number."""
    _assert_role(current_user, *GOV_ROLES)
    raise HTTPException(status_code=409, detail="PULSO records sourced disclosures only. Budget and procurement processing must be completed through the responsible city office and official systems.")


@router.patch("/procurement/{pr_id}/cash-release", response_model=gov_schemas.ProcurementRequestResponse)
def update_procurement_cash_release(
    pr_id: int,
    payload: gov_schemas.ProcurementCashUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Record that cash has been released for this procurement."""
    _assert_role(current_user, *GOV_ROLES)
    raise HTTPException(status_code=409, detail="PULSO records sourced disclosures only. Budget and procurement processing must be completed through the responsible city office and official systems.")


@router.patch("/procurement/{pr_id}/bac-schedule", response_model=gov_schemas.ProcurementRequestResponse)
def update_procurement_bac_schedule(
    pr_id: int,
    payload: gov_schemas.ProcurementBACUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Schedule the BAC Pre-Procurement Conference for this request."""
    _assert_role(current_user, *GOV_ROLES)
    raise HTTPException(status_code=409, detail="PULSO records sourced disclosures only. Budget and procurement processing must be completed through the responsible city office and official systems.")


@router.patch("/procurement/{pr_id}/ntp-issuance", response_model=gov_schemas.ProcurementRequestResponse)
def update_procurement_ntp(
    pr_id: int,
    payload: gov_schemas.ProcurementNTPUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Issue a Notice to Proceed for this procurement, unlocking project execution."""
    _assert_role(current_user, *GOV_ROLES)
    raise HTTPException(status_code=409, detail="PULSO records sourced disclosures only. Budget and procurement processing must be completed through the responsible city office and official systems.")


@router.post("/procurement/{pr_id}/items", response_model=gov_schemas.BoQItemResponse)
def add_boq_item(
    pr_id: int,
    item: gov_schemas.BoQItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Add a Bill of Quantities line item to an existing Procurement Request."""
    _assert_role(current_user, *GOV_ROLES)
    raise HTTPException(status_code=409, detail="PULSO records sourced disclosures only. Budget and procurement processing must be completed through the responsible city office and official systems.")


@router.delete("/procurement/{pr_id}/items/{item_id}")
def delete_boq_item(
    pr_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Remove a BoQ line item. Only allowed while request is still draft/submitted."""
    _assert_role(current_user, *GOV_ROLES)
    raise HTTPException(status_code=409, detail="PULSO records sourced disclosures only. Budget and procurement processing must be completed through the responsible city office and official systems.")


# ─────────────────────────────────────────────────────────────────────────────
# Project Requests — LGU Infrastructure Phases 1–6
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/projects", response_model=gov_schemas.ProjectRequestResponse)
def create_project(
    data: gov_schemas.ProjectRequestCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create an LGU-initiated project through an authorized coordinator."""
    import project_workspace
    project_workspace.require(current_user,'manage')
    _assert_role(current_user, *project_workspace.MANAGERS)
    from government_access import resolve_record_area
    resolve_record_area(db,current_user,data)
    if {'estimated_cost','procurement_modality','is_emergency'} & data.model_fields_set:
        raise HTTPException(409,'Project coordination does not process budgets, procurement or emergency authorization.')
    proj = gov_crud.create_project_request(db, data, actor_id=current_user.id, actor_role=current_user.role)
    return gov_crud.enrich_project(proj, db)


@router.get("/projects", response_model=List[gov_schemas.ProjectRequestResponse])
def list_projects(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = Query(None),
    current_phase: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List LGU infrastructure projects. All gov staff can view."""
    _assert_role(current_user, *GOV_ROLES)
    import project_workspace
    project_workspace.require(current_user,'view')
    items = gov_crud.list_project_requests(db, skip, limit, status, current_phase, search,user=current_user)
    return [gov_crud.enrich_project(p, db) for p in items]


@router.get("/projects/{proj_id}", response_model=gov_schemas.ProjectRequestResponse)
def get_project(
    proj_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single LGU project by ID."""
    _assert_role(current_user, *GOV_ROLES)
    import project_workspace
    project_workspace.require(current_user,'view')
    proj = gov_crud.get_project_request(db, proj_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    from government_access import require_scope
    require_scope(current_user,proj)
    return gov_crud.enrich_project(proj, db)


@router.patch("/projects/{proj_id}", response_model=gov_schemas.ProjectRequestResponse)
def update_project(
    proj_id: int,
    data: gov_schemas.ProjectRequestUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update project metadata (personnel assignments, attachments, etc.)."""
    _assert_role(current_user, *SENIOR_ROLES)
    import project_workspace
    project_workspace.require(current_user,'manage')
    from government_access import require_entity_scope
    require_entity_scope(db,current_user,gov_models.ProjectRequest,proj_id)
    import project_workspace
    proj = project_workspace.update_metadata(db,current_user,proj_id,data)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return gov_crud.enrich_project(proj, db)


@router.patch("/projects/{proj_id}/advance", response_model=gov_schemas.ProjectRequestResponse)
def advance_project(
    proj_id: int,
    payload: gov_schemas.ProjectRequestUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Advance a project to the next phase/status.

    Phase transition rules:
    - Phase 1→2 (survey): Division Chief / City Engineer
    - Phase 3→4 (design):  Design Engineer / Architect
    - Phase 4→5 (BoQ):     Estimator
    - Phase 5→6 (budget check): Admin Officer V
    - Phase 6→7 (budget confirmed): Admin Officer V
    - Phase 7→8 (city engineer approval): City Engineer
    - Phase 8→9 (dispatched): Dispatcher / City Engineer
    - Phase 9→10 (in progress): Project Engineer
    - Phase 10→11 (milestone): Building Inspector
    - Phase 11→12 (resolved): Project Engineer
    - Phase 12→13 (certificate): Asst. City Engineer (done via /certificate endpoint)
    """
    _assert_role(current_user, *GOV_ROLES)
    import project_workspace
    project_workspace.require(current_user,'manage')
    from government_access import require_entity_scope
    require_entity_scope(db,current_user,gov_models.ProjectRequest,proj_id)
    if not payload.status:
        raise HTTPException(status_code=422, detail="'status' field required to advance the project")
    if payload.status in {'pending_budget_check', 'budget_confirmed'}:
        raise HTTPException(409, 'Budget processing is outside PULSO. Record sourced public information in an update disclosure.')
    import project_workspace
    project=project_workspace.target(db,current_user,proj_id)
    if payload.expected_version is None:
        raise HTTPException(428,'Open the project coordination record and provide its expected_version.')
    if project_workspace.NEXT.get(project.status)!=payload.status:
        raise HTTPException(409,'Use the available next action in the project coordination record.')
    if not payload.reason or len(payload.reason.strip())<10:
        raise HTTPException(422,'Record the reason for this project transition.')
    result=project_workspace.execute(db,current_user,proj_id,project_workspace.Command(action='advance',
        expected_version=payload.expected_version,reason=payload.reason,document_id=payload.document_id,next_review_at=payload.next_review_at))
    return gov_crud.enrich_project(result,db)



@router.post("/projects/{proj_id}/certificate", response_model=gov_schemas.ProjectRequestResponse)
def issue_certificate(
    proj_id: int,
    payload: gov_schemas.CertificateOfCompletionIssue,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Record an externally issued certificate after independent project review."""
    import project_workspace
    project_workspace.target(db,current_user,proj_id)
    if payload.expected_version is None:
        raise HTTPException(409,'Open the completed project and record its official certificate with evidence and a reference.')
    if not payload.notes or len(payload.notes.strip())<10:
        raise HTTPException(422,'Record the reason for adding this certificate.')
    project=project_workspace.execute(db,current_user,proj_id,project_workspace.Command(action='record_certificate',
        expected_version=payload.expected_version,reason=payload.notes,document_id=payload.document_id,reference=payload.reference,office=payload.office))
    return gov_crud.enrich_project(project,db)


@router.get("/reports/{report_id}/project-mapping")
def get_project_mapping_by_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Finds the ProjectRequest linked to a citizen report via a WorkOrder.
    Used by the DispatcherDashboard to trigger FQA audits.
    """
    _assert_role(current_user, *GOV_ROLES)
    from report_review_router import get_report
    from government_access import require_scope
    get_report(db,current_user,report_id)
    proj=db.query(gov_models.ProjectRequest).filter_by(source_report_id=report_id).order_by(gov_models.ProjectRequest.id.desc()).first()
    if proj is None:
        wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.report_id == report_id,gov_models.WorkOrder.project_id.isnot(None)).order_by(gov_models.WorkOrder.id.desc()).first()
        proj = gov_crud.get_project_request(db,wo.project_id) if wo else None
    if not proj:
        raise HTTPException(status_code=404, detail="Linked project not found.")
    require_scope(current_user,proj)
    return gov_crud.enrich_project(proj, db)


# ─────────────────────────────────────────────────────────────────────────────
# OBO Inspections  (Section 6.4 — Office of Building Official)
# ─────────────────────────────────────────────────────────────────────────────

def _obo_inspectors(db, record):
    from government_access import jurisdiction_ids
    people = db.query(models.Official).filter(
        models.Official.is_active == True, models.Official.is_suspended == False,
        models.Official.role.in_(INSPECTOR_ROLES),
    ).order_by(models.Official.full_name).all()
    eligible = []
    for person in people:
        try:
            ids = jurisdiction_ids(person)
        except HTTPException:
            continue
        if ids and record.district_id not in ids:
            continue
        eligible.append(person)
    return eligible


@router.get("/obo-workspace")
def obo_workspace(
    page: int = Query(1, ge=1), view: str = Query('all'), search: str = Query('', max_length=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    _assert_role(current_user, *GOV_ROLES)
    from government_access import scoped
    entity = gov_models.OBOInspection
    query = scoped(db.query(entity), entity.district_id, current_user)
    if search.strip():
        term = '%' + search.strip() + '%'
        query = query.filter(or_(entity.obo_number.ilike(term), entity.applicant_name.ilike(term), entity.property_address.ilike(term)))
    counts = dict(query.with_entities(entity.status, func.count(entity.id)).group_by(entity.status).all())
    if view != 'all':
        query = query.filter(entity.status == view)
    total = query.count()
    rows = query.order_by(entity.created_at.desc(), entity.id.desc()).offset((page-1)*15).limit(15).all()
    return dict(items=[gov_schemas.OBOInspectionResponse.model_validate(gov_crud.enrich_obo(row, db)) for row in rows], total=total, counts=counts)


@router.get("/obo/{obo_id}/history")
def obo_history(obo_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    _assert_role(current_user, *GOV_ROLES)
    from government_access import require_entity_scope
    record = require_entity_scope(db,current_user,gov_models.OBOInspection,obo_id)
    # Historical OBO audit entries have no OBO foreign key. Match the complete
    # generated record reference, never applicant text or a partial record ID.
    events = db.query(gov_models.AuditLog).filter(or_(
        gov_models.AuditLog.action.startswith(f'OBO {record.obo_number} ', autoescape=True),
        gov_models.AuditLog.action.startswith(f'OBO {record.obo_number}:', autoescape=True),
        gov_models.AuditLog.action.startswith(f'OBO inspection {record.obo_number} filed', autoescape=True),
    )).order_by(gov_models.AuditLog.created_at.desc(),gov_models.AuditLog.id.desc()).limit(100).all()
    return [dict(id=e.id,action=e.action,actor_name=e.actor.full_name if e.actor else None,actor_role=e.actor_role,created_at=e.created_at) for e in events]


@router.get("/obo-options")
def obo_options(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    _assert_role(current_user, *GOV_ROLES)
    from government_access import jurisdiction_ids
    ids = jurisdiction_ids(current_user)
    query = db.query(models.Barangay)
    if ids:
        query = query.filter(models.Barangay.district_id.in_(ids))
    role = current_user.role
    return dict(
        create=role in ["admin_clerk", "admin", *INSPECTOR_ROLES],
        inspect=role in ["admin", *INSPECTOR_ROLES],
        record_decision=role in ["admin", *EXECUTIVE_ROLES],
        barangays=[dict(id=b.id, name=b.name) for b in query.order_by(models.Barangay.name).all()],
    )


@router.get("/obo/{obo_id}/inspectors")
def obo_inspectors(obo_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    _assert_role(current_user, *INSPECTOR_ROLES)
    from government_access import require_entity_scope
    record = require_entity_scope(db, current_user, gov_models.OBOInspection, obo_id)
    return [dict(id=p.id, full_name=p.full_name, role=p.role) for p in _obo_inspectors(db, record)]


@router.post("/obo", response_model=gov_schemas.OBOInspectionResponse)
def create_obo_inspection(
    data: gov_schemas.OBOInspectionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    File a new OBO inspection application.
    Filed by: Admin Clerk, Building Inspector, or senior roles.
    """
    _assert_role(current_user, "admin_clerk", *INSPECTOR_ROLES)
    from government_access import resolve_record_area,require_report_scope
    resolve_record_area(db,current_user,data)
    if data.source_report_id:
        source=db.get(models.Report,data.source_report_id)
        if not source: raise HTTPException(404,'Source report not found.')
        require_report_scope(db,current_user,source)
    obo = gov_crud.create_obo_inspection(db, data, actor_id=current_user.id, actor_role=current_user.role)
    return gov_crud.enrich_obo(obo, db)


@router.get("/obo", response_model=List[gov_schemas.OBOInspectionResponse])
def list_obo_inspections(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = Query(None),
    inspection_type: Optional[str] = Query(None),
    barangay: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List OBO inspections. Filterable by status, type, or barangay."""
    _assert_role(current_user, *GOV_ROLES)
    items = gov_crud.list_obo_inspections(db, skip, limit, status, inspection_type, barangay, search,user=current_user)
    return [gov_crud.enrich_obo(o, db) for o in items]


@router.get("/obo/{obo_id}", response_model=gov_schemas.OBOInspectionResponse)
def get_obo_inspection(
    obo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single OBO inspection record."""
    _assert_role(current_user, *GOV_ROLES)
    obo = gov_crud.get_obo_inspection(db, obo_id)
    if not obo:
        raise HTTPException(status_code=404, detail="OBO inspection not found")
    from government_access import require_scope
    require_scope(current_user,obo)
    return gov_crud.enrich_obo(obo, db)


@router.patch("/obo/{obo_id}", response_model=gov_schemas.OBOInspectionResponse)
def update_obo_inspection(
    obo_id: int,
    data: gov_schemas.OBOInspectionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Update OBO inspection record (assign inspector, log findings, update status).

    Status flow:
      application_received → inspection_scheduled → inspection_complete →
      permit_issued | notice_issued → re_inspection_scheduled → cleared

    Clearance (permit_issued / cleared) requires: City Engineer or senior role.
    """
    if data.status in ("permit_issued", "cleared"):
        _assert_role(current_user, *EXECUTIVE_ROLES)
    else:
        _assert_role(current_user, *INSPECTOR_ROLES)

    from government_access import require_entity_scope
    record = require_entity_scope(db,current_user,gov_models.OBOInspection,obo_id)
    if data.assigned_inspector_id is not None and data.assigned_inspector_id not in {p.id for p in _obo_inspectors(db, record)}:
        raise HTTPException(422, 'Choose an active inspector who can work in this district.')
    obo = gov_crud.update_obo_inspection(
        db, obo_id, data,
        actor_id=current_user.id, actor_role=current_user.role,
    )
    if not obo:
        raise HTTPException(status_code=404, detail="OBO inspection not found")
    return gov_crud.enrich_obo(obo, db)


@router.patch("/obo/{obo_id}/technical-review", response_model=gov_schemas.OBOInspectionResponse)
def update_obo_technical_review(
    obo_id: int,
    payload: gov_schemas.OBOTechnicalReviewUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_role(current_user, *INSPECTOR_ROLES)
    from government_access import require_entity_scope
    require_entity_scope(db,current_user,gov_models.OBOInspection,obo_id)
    obo = gov_crud.update_obo_technical_review(db, obo_id, payload, current_user.id, current_user.role)
    if not obo:
        raise HTTPException(status_code=404, detail="OBO inspection not found")
    return gov_crud.enrich_obo(obo, db)


@router.patch("/obo/{obo_id}/appeal", response_model=gov_schemas.OBOInspectionResponse)
def update_obo_appeal(
    obo_id: int,
    payload: gov_schemas.OBOAppealUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_role(current_user, *INSPECTOR_ROLES)
    from government_access import require_entity_scope
    require_entity_scope(db,current_user,gov_models.OBOInspection,obo_id)
    obo = gov_crud.update_obo_appeal(db, obo_id, payload, current_user.id, current_user.role)
    if not obo:
        raise HTTPException(status_code=404, detail="OBO inspection not found")
    return gov_crud.enrich_obo(obo, db)


@router.patch("/obo/{obo_id}/order-of-payment", response_model=gov_schemas.OBOInspectionResponse)
def update_obo_order_of_payment(
    obo_id: int,
    payload: gov_schemas.OBOOrderOfPayment,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_role(current_user, *EXECUTIVE_ROLES, "admin_clerk")
    from government_access import require_entity_scope
    require_entity_scope(db,current_user,gov_models.OBOInspection,obo_id)
    obo = gov_crud.update_obo_order_of_payment(db, obo_id, payload, current_user.id, current_user.role)
    if not obo:
        raise HTTPException(status_code=404, detail="OBO inspection not found")
    return gov_crud.enrich_obo(obo, db)


# ─────────────────────────────────────────────────────────────────────────────
# Government User Management  (FR-13 — RBAC)
# ─────────────────────────────────────────────────────────────────────────────


class RoleUpdatePayload(BaseModel):
    role: str
    reason: str = Field(min_length=10,max_length=2000)
    expected_version: int = Field(ge=0)


# ─────────────────────────────────────────────────────────────────────────────
# User Management - Residents & Government Accounts
# ─────────────────────────────────────────────────────────────────────────────

class UserStatusPayload(BaseModel):
    action: str
    reason: Optional[str] = None
    expected_version: Optional[int] = Field(None,ge=0)



@router.get("/users/stats")
def get_user_management_stats(
    db: Session = Depends(get_db),
    current_user: models.Official = Depends(get_current_user)
):
    import staff_accounts
    from government_access import scoped_residents
    residents_allowed=staff_accounts.allowed(current_user,'residents_view')
    staff_allowed=staff_accounts.allowed(current_user,'staff_view')
    if not residents_allowed and not staff_allowed: raise HTTPException(403,'Account viewing permission is required.')
    residents=scoped_residents(db.query(models.Resident),current_user) if residents_allowed else None
    staff=staff_accounts.visible_query(db,current_user) if staff_allowed else None
    resident_active=residents.filter(models.Resident.is_active==True).count() if residents_allowed else None
    gov_active=staff.filter(models.Official.is_active==True,models.Official.is_suspended==False).count() if staff_allowed else None
    return {'resident':{'active':resident_active,'suspended':residents.filter(models.Resident.is_active==False).count() if residents_allowed else None},
        'government':{'active':gov_active,'suspended':staff.filter(models.Official.is_suspended==True).count() if staff_allowed else None},
        'total_active':resident_active+gov_active if residents_allowed and staff_allowed else None}


@router.get("/users")
def list_all_users(
    skip: int = 0,
    limit: int = 100,
    account_type: Optional[str] = Query(None, description="Filter by 'resident' or 'government'"),
    status: Optional[str] = Query(None, description="Filter by 'active' or 'suspended'"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    List all users with filtering. Admin only.
    Separates residents and government accounts.
    """
    import staff_accounts
    from government_access import scoped_residents
    staff_accounts.require_action(current_user,'residents_view' if account_type=='resident' else 'staff_view')
    
    # Select table based on account_type
    if account_type == "resident":
        q = scoped_residents(db.query(models.Resident),current_user)
        if status == "active":
            q = q.filter(models.Resident.is_active == True)
        elif status == "suspended":
            # Residents don't have suspended status, filter them out entirely if suspended is requested
            q = q.filter(False)
    else:
        q = staff_accounts.visible_query(db,current_user)
        if status == "active":
            q = q.filter(models.Official.is_active == True, models.Official.is_suspended == False)
        elif status == "suspended":
            q = q.filter(models.Official.is_suspended == True)
            
    if search:
        search_term = f"%{search}%"
        # Accessing the model class from the query object to filter safely
        model_class = q.column_descriptions[0]["type"]
        q = q.filter(
            (model_class.full_name.ilike(search_term)) |
            (model_class.email.ilike(search_term))
        )
    
    total = q.count()
    users = q.offset(skip).limit(limit).all()
    
    return {
        "users": [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "account_type": getattr(u, "account_type", "resident"),
                "barangay": getattr(u, "barangay", None) or (u.barangay_ref.name if hasattr(u, "barangay_ref") and u.barangay_ref else None),
                "phone_number": u.phone_number,
                "is_active": u.is_active,
                "is_suspended": getattr(u, "is_suspended", False),
                "suspension_reason": getattr(u, "suspension_reason", None),
                "suspended_at": getattr(u, "suspended_at", None),
                "trust_score": getattr(u, "trust_score", 100),
                "created_at": u.created_at,
            }
            for u in users
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }



VALID_ROLES = list(GOV_ROLES) + ["resident", "system_admin"]

class RoleUpdatePayload(BaseModel):
    role: str
    reason: str = Field(min_length=10,max_length=2000)
    expected_version: int = Field(ge=0)
@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    payload: UserStatusPayload,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Update user status: activate, suspend, deactivate, reactivate.
    """
    import staff_accounts
    if not (staff_accounts.allowed(current_user,'staff_manage') or staff_accounts.allowed(current_user,'residents_manage')):
        raise HTTPException(403,'Account management permission is required.')
    
    user = db.query(models.Official).filter(models.Official.id == user_id).first()
    if user:
        staff_accounts.require_action(current_user,'staff_manage')
        if payload.expected_version is None:
            raise HTTPException(428,'Refresh the staff record and provide its expected_version.')
        action=payload.action.lower()
        if action not in ('activate','reactivate','deactivate','suspend'):
            raise HTTPException(422,'Choose an account activation or restriction action.')
        from admin_router import StaffUpdateRequest
        return staff_accounts.update_staff(db,current_user,user_id,StaffUpdateRequest(
            is_active=action in ('activate','reactivate'),reason=payload.reason or '',expected_version=payload.expected_version))
    staff_accounts.require_action(current_user,'residents_manage')
    import resident_accounts
    from admin_router import ResidentStatusCommand
    resident_accounts.target(db,current_user,user_id)
    if payload.expected_version is None:
        raise HTTPException(428,'Refresh the resident record and provide its expected_version.')
    states={'activate':'active','reactivate':'active','suspend':'suspended','deactivate':'deactivated'}
    if payload.action.lower() not in states:
        raise HTTPException(422,'Choose an account activation or restriction action.')
    if len((payload.reason or '').strip())<10:
        raise HTTPException(422,'Provide a reason of at least 10 characters.')
    return resident_accounts.set_status(db,current_user,user_id,ResidentStatusCommand(
        status=states[payload.action.lower()],reason=payload.reason,expected_version=payload.expected_version))


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: RoleUpdatePayload,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    import staff_accounts
    from admin_router import StaffUpdateRequest
    return staff_accounts.update_staff(db,current_user,user_id,StaffUpdateRequest(
        role=payload.role,reason=payload.reason,expected_version=payload.expected_version))


# ─────────────────────────────────────────────────────────────────────────────
# Design Requests (Design & Planning Division)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/design-requests", response_model=List[dict])
def list_design_requests(
    skip: int = Query(0, ge=0, le=10000),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List design requests linked to LGU infrastructure projects."""
    _assert_role(current_user, *GOV_ROLES)
    q = legacy_operations.project_query(db, current_user)
    
    # Standard 3-part multi-status filter
    if status:
        if "," in status:
            statuses = [s.strip() for s in status.split(",")]
            q = q.filter(gov_models.ProjectRequest.status.in_(statuses))
        else:
            q = q.filter(gov_models.ProjectRequest.status == status)
    else:
        # Default design phases
        q = q.filter(
            gov_models.ProjectRequest.status.in_([
                "design_in_progress", "request_received", "survey_in_progress",
                "approved_by_city_engineer", "assessment", "planning", "ready_for_work"
            ])
        )

    items = q.order_by(gov_models.ProjectRequest.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": p.id,
            "project_number": p.proj_number,
            "title": p.title,
            "status": p.status,
            "barangay": p.barangay,
            "location": p.location_string,
            "current_phase": p.current_phase,
            "created_at": str(p.created_at),
        }
        for p in items
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Structure Analysis (Design Division)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/analysis", response_model=List[dict])
def list_structure_analysis(
    skip: int = Query(0, ge=0, le=10000),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns projects that are in the design or analysis phase with search support."""
    _assert_role(current_user, *GOV_ROLES)
    q = legacy_operations.project_query(db, current_user)
    
    if status:
        if "," in status:
            statuses = [s.strip() for s in status.split(",")]
            q = q.filter(gov_models.ProjectRequest.status.in_(statuses))
        else:
            q = q.filter(gov_models.ProjectRequest.status == status)
    else:
        q = q.filter(gov_models.ProjectRequest.status.in_([
            "design_in_progress", "approved_by_city_engineer", "survey_in_progress", "assessment", "planning"
        ]))

    if search:
        s = f"%{search}%"
        q = q.filter(or_(
            gov_models.ProjectRequest.title.ilike(s),
            gov_models.ProjectRequest.proj_number.ilike(s),
            gov_models.ProjectRequest.description.ilike(s)
        ))

    items = q.order_by(gov_models.ProjectRequest.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": p.id,
            "project_number": p.proj_number,
            "title": p.title,
            "status": p.status,
            "barangay": p.barangay,
            "location": p.location_string,
            "scope_of_work": p.description,
            "current_phase": p.current_phase,
            "created_at": str(p.created_at),
        }
        for p in items
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Field Surveys (Survey & Estimation Division)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/surveys", response_model=List[dict])
def list_field_surveys(
    skip: int = Query(0, ge=0, le=10000),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Field survey assignments derived from work orders and project requests with search support."""
    _assert_role(current_user, *GOV_ROLES)
    
    # Parse status if provided
    filter_statuses = []
    if status:
        filter_statuses = [s.strip() for s in status.split(",")]

    # Surveys = work orders in field/survey phase + project requests in survey_in_progress
    import project_workspace
    work_access = legacy_operations.work_view(current_user)
    project_access = project_workspace.allowed(current_user)
    if not work_access and not project_access: raise HTTPException(403, 'Survey record access is required.')
    wo_q = legacy_operations.work_query(db, current_user) if work_access else db.query(gov_models.WorkOrder).filter(False)
    if filter_statuses:
        # Filter work orders by statuses that apply to them
        wo_status_options = ["pending", "assigned", "in_progress", "completed"]
        wo_active_filters = [s for s in filter_statuses if s in wo_status_options]
        if wo_active_filters:
            wo_q = wo_q.filter(gov_models.WorkOrder.status.in_(wo_active_filters))
        else:
            # If explicit status is provided but none match WO, we hide WOs
            wo_q = wo_q.filter(gov_models.WorkOrder.id == -1)
    else:
        wo_q = wo_q.filter(gov_models.WorkOrder.status.in_(["assigned", "in_progress"]))

    if search:
        s = f"%{search}%"
        wo_q = wo_q.filter(or_(
            gov_models.WorkOrder.title.ilike(s),
            gov_models.WorkOrder.wo_number.ilike(s),
            gov_models.WorkOrder.description.ilike(s)
        ))

    wo_items = wo_q.order_by(gov_models.WorkOrder.created_at.desc(), gov_models.WorkOrder.id.desc()).limit(skip + limit).all()

    proj_q = legacy_operations.project_query(db, current_user) if project_access else db.query(gov_models.ProjectRequest).filter(False)
    if filter_statuses:
        proj_status_options = ["request_received", "survey_in_progress", "survey_complete", "assessment"]
        proj_active_filters = [s for s in filter_statuses if s in proj_status_options]
        if proj_active_filters:
            proj_q = proj_q.filter(gov_models.ProjectRequest.status.in_(proj_active_filters))
        else:
            proj_q = proj_q.filter(gov_models.ProjectRequest.id == -1)
    else:
        proj_q = proj_q.filter(gov_models.ProjectRequest.status.in_(["survey_in_progress", "assessment"]))

    if search:
        s = f"%{search}%"
        proj_q = proj_q.filter(or_(
            gov_models.ProjectRequest.title.ilike(s),
            gov_models.ProjectRequest.proj_number.ilike(s),
            gov_models.ProjectRequest.description.ilike(s)
        ))

    proj_items = proj_q.order_by(gov_models.ProjectRequest.created_at.desc(), gov_models.ProjectRequest.id.desc()).limit(skip + limit).all()

    results = []
    for w in wo_items:
        results.append({
            "id": w.id,
            "record_type": "work_order",
            "wo_number": w.wo_number,
            "title": w.title,
            "status": w.status,
            "priority": w.priority,
            "wo_type": w.wo_type,
            "created_at": str(w.created_at),
        })
    for p in proj_items:
        results.append({
            "id": p.id,
            "record_type": "project",
            "project_number": p.proj_number,
            "title": p.title,
            "status": p.status,
            "barangay": p.barangay,
            "location": p.location_string,
            "created_at": str(p.created_at),
        })
    results.sort(key=lambda item: (item['created_at'], item['record_type'], item['id']), reverse=True)
    return results[skip:skip + limit]


# ─────────────────────────────────────────────────────────────────────────────
# Bill of Quantities (Survey & Estimation)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/boq", response_model=List[dict])
def list_boq(
    skip: int = Query(0, ge=0, le=10000),
    limit: int = Query(100, ge=1, le=200),
    pr_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all Bill of Quantities items across procurement requests with multi-status and search support."""
    _assert_role(current_user, *GOV_ROLES)
    
    visible = legacy_operations.financial_query(db, current_user).with_entities(gov_models.ProcurementRequest.id)
    q = db.query(gov_models.BoQItem).join(gov_models.ProcurementRequest).filter(gov_models.BoQItem.procurement_request_id.in_(visible))
    
    if pr_id:
        q = q.filter(gov_models.BoQItem.procurement_request_id == pr_id)
    
    if status:
        if "," in status:
            statuses = [s.strip() for s in status.split(",")]
            q = q.filter(gov_models.ProcurementRequest.status.in_(statuses))
        else:
            q = q.filter(gov_models.ProcurementRequest.status == status)
            
    if search:
        s = f"%{search}%"
        q = q.filter(gov_models.BoQItem.item_name.ilike(s))
        
    items = q.order_by(gov_models.BoQItem.id).offset(skip).limit(limit).all()
    result = []
    for item in items:
        pr = item.procurement_request
        result.append({
            "id": item.id,
            "pr_number": pr.pr_number if pr else "—",
            "title": item.item_name,
            "description": f"Qty: {item.quantity} {item.unit} @ ₱{item.unit_cost:,.2f} = ₱{item.total_cost:,.2f}",
            "status": pr.status if pr else "unknown",
            "barangay": pr.barangay if pr and hasattr(pr, "barangay") else None,
            "created_at": str(pr.created_at) if pr else None,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Cost Estimation (Survey & Estimation Division)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/estimation", response_model=List[dict])
def list_cost_estimations(
    skip: int = Query(0, ge=0, le=10000),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Cost estimation view aggregating procurement requests with BoQ totals, status filtering, and search."""
    _assert_role(current_user, *GOV_ROLES)
    q = legacy_operations.financial_query(db, current_user)
    
    if status:
        if "," in status:
            statuses = [s.strip() for s in status.split(",")]
            q = q.filter(gov_models.ProcurementRequest.status.in_(statuses))
        else:
            q = q.filter(gov_models.ProcurementRequest.status == status)
            
    if search:
        s = f"%{search}%"
        q = q.filter(or_(
            gov_models.ProcurementRequest.title.ilike(s),
            gov_models.ProcurementRequest.pr_number.ilike(s),
            gov_models.ProcurementRequest.purpose.ilike(s)
        ))
        
    items = q.order_by(gov_models.ProcurementRequest.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for pr in items:
        boq_items = pr.items
        total = sum((i.total_cost or 0) for i in boq_items)
        result.append({
            "id": pr.id,
            "pr_number": pr.pr_number,
            "title": pr.title,
            "description": f"Total Estimate: ₱{total:,.2f} | {len(boq_items)} line items",
            "status": pr.status,
            "barangay": pr.barangay if hasattr(pr, "barangay") else "—",
            "created_at": str(pr.created_at),
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Reports Archive (Administrative Division)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/reports", response_model=List[dict])
def list_active_reports(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Active incoming citizen reports matching triage queue."""
    _assert_role(current_user, *DISPATCH_ROLES)
    from government_access import scoped_reports
    q = scoped_reports(db.query(models.Report),current_user)
    if status and status.strip().lower() != "all":
        if "," in status:
            q = q.filter(models.Report.status.in_([s.strip().lower() for s in status.split(",")]))
        else:
            st = status.strip().lower()
            if st == "unverified":
                q = q.filter(models.Report.status.in_(["unverified", "pending", "received", "unvalidated"]))
            else:
                q = q.filter(models.Report.status == st)
    elif not status:
        q = q.filter(models.Report.status.notin_(["resolved", "rejected", "closed"]))
    
    if category:
        q = q.filter(models.Report.category == category)
    items = q.order_by(models.Report.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": r.id,
            "version": r.version,
            "ticket_id": getattr(r, "ticket_id", f"PUL-{datetime.now().year}-{r.id:04d}"),
            "title": r.category or "Infrastructure Report",
            "category": r.category or "Infrastructure Report",
            "description": r.description or "",
            "status": r.status,
            "barangay": r.location_barangay or (r.barangay_ref.name if r.barangay_ref else None) or "Caloocan City",
            "location": r.location_string or r.location_barangay or "Caloocan City",
            "location_string": r.location_string or r.location_barangay or "Caloocan City",
            "location_lat": r.location_lat,
            "location_lng": r.location_lng,
            "image_url": r.image_url,
            "ai_category": r.ai_category,
            "ai_urgency": r.ai_urgency,
            "urgency": r.ai_urgency or "normal",
            "severity_score": r.severity_score or 0.0,
            "reporter_name": r.reporter_name,
            "reporter_type": r.reporter_type,
            "created_at": str(r.created_at),
            "updated_at": str(r.updated_at),
        }
        for r in items
    ]

@router.get("/reports-archive", response_model=List[dict])
def list_reports_archive(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Archived and resolved citizen infrastructure reports with search support. Senior LGU staff only."""
    _assert_role(current_user, *DISPATCH_ROLES)
    
    # Use standardized CRUD
    items = gov_crud.list_reports_archive(db, skip, limit, status, category, search,user=current_user)
    
    return [
        {
            "id": r.id,
            "ticket_id": getattr(r, "ticket_id", None) or f"PUL-{datetime.now().year}-{r.id:04d}",
            "title": r.category or "Infrastructure Report",
            "category": r.category or "Infrastructure Report",
            "description": r.description or "",
            "status": r.status,
            "barangay": r.location_barangay or (r.barangay_ref.name if r.barangay_ref else None) or "Caloocan City",
            "location": r.location_string or r.location_barangay or "Caloocan City",
            "location_string": r.location_string or r.location_barangay or "Caloocan City",
            "location_lat": r.location_lat,
            "location_lng": r.location_lng,
            "image_url": r.image_url,
            "ai_category": r.ai_category,
            "ai_urgency": r.ai_urgency,
            "urgency": r.ai_urgency or "normal",
            "severity_score": r.severity_score or 0.0,
            "reporter_name": r.reporter_name,
            "reporter_type": r.reporter_type,
            "created_at": str(r.created_at),
            "updated_at": str(r.updated_at),
        }
        for r in items
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Records & Registry (Administrative Division)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/records", response_model=List[dict])
def get_administrative_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Finalized administrative records registry."""
    _assert_role(current_user, *GOV_ROLES)
    from records_workspace import documents_query,document_projection
    return [document_projection(doc) for doc in documents_query(db,current_user).order_by(gov_models.SystemDocument.uploaded_at.desc()).offset(skip).limit(limit).all()]

@router.get("/document-registry", response_model=List[dict])
def get_document_archive(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Archived system documents and technical files."""
    _assert_role(current_user, *GOV_ROLES)
    from records_workspace import documents_query,document_projection
    items = documents_query(db,current_user).order_by(gov_models.SystemDocument.uploaded_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": d.id,
            **document_projection(d),
            "title": d.file_name,
            "description": f"Type: {d.document_type}",
            "status": "Archived",
            "barangay": "—",
            "created_at": str(d.uploaded_at),
            "file_url": f"/api/gov/documents/get/{d.id}"
        }
        for d in items
    ]
# ─────────────────────────────────────────────────────────────────────────────

class AgentLocationUpdate(BaseModel):
    latitude: Optional[float] = Field(default=None, ge=-90, le=90, allow_inf_nan=False)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180, allow_inf_nan=False)
    status: str = Field(default="available", pattern="^(offline|available|en_route|on_site|returning)$")
    accuracy: Optional[float] = Field(default=None, ge=0, allow_inf_nan=False)
    battery_level: Optional[int] = Field(default=None, ge=0, le=100)
    location_name: Optional[str] = Field(default=None, max_length=255)

    @model_validator(mode='after')
    def require_coordinates_when_sharing(self):
        if self.status != 'offline' and (self.latitude is None or self.longitude is None):
            raise ValueError('Latitude and longitude are required while sharing a work location.')
        if self.status == 'offline':
            self.latitude = self.longitude = self.accuracy = self.battery_level = self.location_name = None
        return self


@router.get("/agents/locations", response_model=List[dict])
def get_all_agent_locations(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get all field agent locations. Accessible to dispatchers and senior LGU staff.
    """
    _assert_role(current_user, "dispatcher", "manager", "city_engineer", "asst_city_engineer", 
                 "division_chief", "system_admin", "project_engineer", "construction_foreman")
    return list(legacy_operations.location_rows(db, current_user).values())


@router.get("/agents/{agent_id}/location")
def get_agent_location(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get location for a specific agent.
    """
    _assert_role(current_user, "dispatcher", "manager", "city_engineer", "asst_city_engineer",
                 "division_chief", "system_admin")
    loc = legacy_operations.location_rows(db, current_user).get(agent_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Agent location not found")
    return loc


@router.post("/agents/location")
def update_my_location(
    data: AgentLocationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Update current agent's location. Called from mobile app.
    Agents can only update their own location.
    """
    _assert_role(current_user, *FIELD_ROLES)
    import staff_accounts
    staff_accounts.lock_accounts(db, current_user)
    if not legacy_operations.granted(current_user, 'agents', 'location_share', set(FIELD_ROLES)):
        raise HTTPException(403, 'Your account cannot share a staff location.')
    loc = gov_crud.update_agent_location(
        db,
        agent_id=current_user.id,
        latitude=data.latitude,
        longitude=data.longitude,
        status=data.status,
        accuracy=data.accuracy,
        battery_level=data.battery_level,
        location_name=data.location_name,
    )
    db.commit()
    return {"success": True, "location_id": loc.id}


@router.get("/agents/work-orders")
def get_agents_with_work_orders(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get all field agents with their active work orders.
    Used by dispatchers to view agent status and assignments.
    """
    _assert_role(current_user, "dispatcher", "manager", "city_engineer", "asst_city_engineer",
                 "division_chief", "system_admin")
    return legacy_operations.agent_work(db, current_user)


# ─────────────────────────────────────────────────────────────────────────────
# Agent Self-Service Endpoints (called FROM the mobile agent app)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/agents/my-work-orders")
def get_my_work_orders(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get the current logged-in agent's own assigned work orders.
    Available to any authenticated field official (agents only see their own assignments).
    Supports optional status filtering ('all', 'assigned', 'in_progress', 'blocked', 'completed_pending_review').
    """
    _assert_role(current_user, *FIELD_ROLES)
    from sqlalchemy.orm import joinedload as jl
    query = legacy_operations.work_query(db, current_user).options(
        jl(gov_models.WorkOrder.assigned_by)
    ).filter(
        gov_models.WorkOrder.assigned_to_id == current_user.id,
    )
    if status == "all":
        pass
    elif status:
        query = query.filter(gov_models.WorkOrder.status == status)
    else:
        query = query.filter(gov_models.WorkOrder.status.in_(["assigned", "in_progress", "blocked", "rework_required"]))

    work_orders = query.order_by(gov_models.WorkOrder.created_at.desc()).all()

    result = []
    for wo in work_orders:
        loc_string = None
        loc_lat = None
        loc_lng = None
        report_image = None
        if wo.report_id:
            from government_access import can, scoped_reports
            report = scoped_reports(db.query(models.Report), current_user).filter(models.Report.id == wo.report_id).first() if can(current_user, 'reports') else None
            if report:
                loc_string = report.location_string
                loc_lat = report.location_lat
                loc_lng = report.location_lng
                report_image = report.image_url

        latest_update = db.query(gov_models.WorkOrderUpdate).filter(
            gov_models.WorkOrderUpdate.work_order_id == wo.id
        ).order_by(gov_models.WorkOrderUpdate.created_at.desc()).first()

        result.append({
            "wo_id": wo.id,
            "id": wo.id,
            "wo_number": wo.wo_number,
            "title": wo.title,
            "status": wo.status,
            "priority": wo.priority,
            "wo_type": wo.wo_type,
            "description": wo.description,
            "location_string": loc_string or wo.location_string,
            "location_lat": loc_lat if loc_lat is not None else wo.location_lat,
            "location_lng": loc_lng if loc_lng is not None else wo.location_lng,
            "report_id": wo.report_id,
            "report_image": report_image,
            "proof_image": latest_update.image_url if latest_update and latest_update.image_url else None,
            "notes": wo.notes,
            "assigned_by_name": wo.assigned_by.full_name if wo.assigned_by else None,
            "created_at": str(wo.created_at) if wo.created_at else None,
            "updated_at": str(wo.updated_at) if wo.updated_at else None,
        })
    return result


@router.post("/agents/work-orders/{wo_id}/acknowledge")
def acknowledge_work_order(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Field employee acknowledges receiving an assigned work order.
    Creates an immutable acknowledgement event on the timeline.
    """
    _assert_role(current_user, *FIELD_ROLES)
    wo = db.query(gov_models.WorkOrder).filter(
        gov_models.WorkOrder.id == wo_id,
        gov_models.WorkOrder.assigned_to_id == current_user.id,
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found or not assigned to you")
    gov_crud._append_timeline(
        db, status="acknowledged", previous_status=wo.status,
        actor_id=current_user.id, actor_role=current_user.role,
        note=f"Assignment acknowledged by {current_user.full_name}",
        work_order_id=wo_id,
    )
    gov_crud._append_audit(
        db, trigger_type="acknowledgement",
        action=f"Work order {wo.wo_number} acknowledged by official #{current_user.id}",
        actor_id=current_user.id, actor_role=current_user.role,
        work_order_id=wo_id,
    )
    db.commit()
    return {"success": True, "message": "Assignment acknowledged"}


class AgentFieldReport(BaseModel):
    category: str
    description: str
    latitude: float
    longitude: float
    location_string: Optional[str] = None
    work_order_id: Optional[int] = None
    severity: Optional[str] = "medium"


@router.post("/agents/field-report")
async def submit_field_report(
    category: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    location_string: Optional[str] = Form(None),
    work_order_id: Optional[int] = Form(None),
    severity: Optional[str] = Form("medium"),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Agent submits a field report from the mobile app.
    Supports optional image upload and links to GPS position.
    """
    _assert_role(current_user, *FIELD_ROLES)
    image_url = None
    if image:
        from PIL import Image, ImageOps, UnidentifiedImageError
        raw = await image.read(10 * 1024 * 1024 + 1)
        if len(raw) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Image exceeds the 10 MB limit")
        try:
            with Image.open(io.BytesIO(raw)) as source:
                if source.format not in ("JPEG", "PNG", "WEBP") or source.width * source.height > 24_000_000:
                    raise ValueError("Unsupported image")
                photo = ImageOps.exif_transpose(source).convert("RGB")
                photo.load()
        except (UnidentifiedImageError, OSError, ValueError):
            raise HTTPException(status_code=422, detail="A valid JPEG, PNG or WebP image is required")
        upload_dir = "uploads/reports"
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"agent_report_{uuid.uuid4().hex}.jpg"
        file_path = os.path.join(upload_dir, filename)
        photo.save(file_path, format="JPEG", quality=85)
        image_url = f"/api/uploads/reports/{filename}"

    report = models.Report(
        resident_id=None,
        reporter_type="official",
        submission_source="assisted",
        category=category,
        description=description,
        location_lat=latitude,
        location_lng=longitude,
        location_string=location_string or f"{latitude:.5f}, {longitude:.5f}",
        status="pending_approval",
        image_url=image_url,
    )
    db.add(report)
    db.flush()

    # Audit log
    gov_crud._append_audit(
        db, trigger_type="report",
        action=f"Field report submitted by official #{current_user.id}: {category}",
        actor_id=current_user.id, actor_role=current_user.role,
        report_id=report.id,
        details="Location and evidence are stored on the linked report",
    )

    # If linked to a work order, add a timeline note
    if work_order_id:
        gov_crud._append_timeline(
            db, status="field_report_submitted",
            actor_id=current_user.id, actor_role=current_user.role,
            note=f"Agent field report: {category} - {description[:100]}",
            work_order_id=work_order_id, is_public=True,
        )

    db.commit()
    return {
        "success": True,
        "report_id": report.id,
        "image_url": image_url,
        "message": "Field report submitted successfully",
    }


class AgentWOStatusUpdate(BaseModel):
    status: str  # in_progress | completed
    notes: Optional[str] = None


@router.patch("/agents/work-orders/{wo_id}/status")
def update_my_work_order_status(
    wo_id: int,
    payload: AgentWOStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Agent updates their own work order status.
    Only the assigned agent can update their own work orders.
    """
    _assert_role(current_user, *FIELD_ROLES)
    wo = db.query(gov_models.WorkOrder).filter(
        gov_models.WorkOrder.id == wo_id,
        gov_models.WorkOrder.assigned_to_id == current_user.id,
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found or not assigned to you")

    updated = gov_crud.update_work_order_status(
        db, wo_id, payload.status,
        actor_id=current_user.id, actor_role=current_user.role,
        note=payload.notes,
    )
    return {"success": True, "message": f"Work order updated to '{updated.status}'"}



# ─────────────────────────────────────────────────────────────────────────────
# Dispatcher Workflow Integration: FQA & Budgeting
# ─────────────────────────────────────────────────────────────────────────────

class ReportWorkApproval(BaseModel):
    reason: str


@router.post("/reports/{report_id}/approve-for-work")
def approve_report_for_work(
    report_id: int,
    payload: ReportWorkApproval,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    import report_review
    if not report_review.permitted(current_user,'approve'):
        raise HTTPException(403,'Your account cannot approve a report for field work.')
    reason = payload.reason.strip()
    if len(reason) < 10:
        raise HTTPException(status_code=422, detail="A decision reason of at least 10 characters is required")
    expected = command_integrity.parse_version(if_match)
    key = command_integrity.validate_key(idempotency_key)
    digest = command_integrity.request_hash({"reason": reason}) if key else None
    report = db.query(models.Report).filter(models.Report.id == report_id).with_for_update().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    from government_access import require_report_scope
    require_report_scope(db, current_user, report)
    receipt = command_integrity.find_receipt(
        db, actor_id=current_user.id, operation="report_approve_for_work",
        report_id=report_id, key=key, digest=digest,
    )
    if receipt:
        return receipt.result_json
    command_integrity.check_version(report.version, expected)
    if report.status != "pending_approval":
        raise HTTPException(status_code=409, detail="Report is not awaiting field-work approval")
    gov_crud._sync_report_status(
        db, report_id, "approved_internal", current_user.id, current_user.role,
        note="Report approved for field work",
    )
    gov_crud._append_audit(
        db, trigger_type="approval", action=f"Report {report.ticket_id} field-work approval reason recorded",
        actor_id=current_user.id, actor_role=current_user.role, report_id=report_id, details=reason,
    )
    db.flush()
    result = {"id": report.id, "ticket_id": report.ticket_id, "status": report.status, "version": report.version}
    command_integrity.record_receipt(
        db, actor_id=current_user.id, operation="report_approve_for_work",
        report_id=report_id, key=key, digest=digest, resource_id=report.id,
        result_json=result,
    )
    db.commit()
    return result



@router.post("/projects/{project_id}/issue-certificate")
def issue_fqa_certificate(
    project_id: int,
    payload: gov_schemas.ProjectStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Legacy alias for recording an external certificate; never issue one automatically."""
    return issue_certificate(project_id,gov_schemas.CertificateOfCompletionIssue(**payload.model_dump()),db,current_user)


@router.post("/reports/{report_id}/approve-with-budget")
def approve_report_with_budget(
    report_id: int,
    payload: gov_schemas.ApproveWithBudgetRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Require an approved monetary and emergency decision policy before this shortcut is used."""
    _assert_role(current_user, "dispatcher", "manager", "system_admin")
    raise HTTPException(status_code=409, detail="PULSO does not approve budgets. Add sourced public information through an update disclosure.")

class ProjectReferralRequest(BaseModel):
    reason: str = Field(min_length=10,max_length=2000)
    expected_updated_at: datetime


@router.post("/work-orders/{wo_id}/promote", response_model=gov_schemas.ProjectRequestResponse)
def promote_wo_to_project_endpoint(
    wo_id: int,
    payload: Optional[ProjectReferralRequest] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Escalate a Work Order to a full Infrastructure Project flow.
    Allowed: City Engineer, Dispatcher, Manager.
    """
    _assert_role(current_user, *DISPATCH_ROLES)
    import project_workspace
    project_workspace.require(current_user,'manage')
    _require_assigned_or_dispatcher(db,wo_id,current_user)
    import staff_accounts
    staff_accounts.lock_accounts(db,current_user)
    if not payload or len(payload.reason.strip())<10:
        raise HTTPException(428,'Refresh the work record and provide the referral reason and expected_updated_at.')
    
    proj = gov_crud.promote_work_order_to_project(
        db, wo_id, actor_id=current_user.id, actor_role=current_user.role,
        note=payload.reason.strip(),expected_updated_at=payload.expected_updated_at
    )
    if not proj:
        raise HTTPException(status_code=404, detail="Work order not found")
        
    return gov_crud.enrich_project(proj, db)

# ─────────────────────────────────────────────────────────────────────────────
# Dynamic Role Management (FR-10 / New)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/roles", response_model=List[gov_schemas.SystemRoleResponse])
def get_all_roles(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """List all available government roles."""
    import staff_accounts
    staff_accounts.require_action(current_user,'staff_view')
    return roles_service.get_all_roles(db)

@router.get("/roles/templates", response_model=List[gov_schemas.SystemRoleResponse])
def get_role_templates(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """List available role templates for creation."""
    import staff_accounts
    staff_accounts.require_action(current_user,'staff_view')
    return roles_service.get_templates(db)

@router.post("/roles", response_model=gov_schemas.SystemRoleResponse)
def create_role(
    data: gov_schemas.SystemRoleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    import staff_accounts
    if '*' not in staff_accounts.admin_grants(current_user):
        raise HTTPException(403,'System administrator authority is required to define roles.')
    staff_accounts.lock_accounts(db,current_user)
    if '*' not in staff_accounts.admin_grants(current_user): raise HTTPException(403,'System administrator authority is required.')
    if len(data.reason.strip())<10: raise HTTPException(422,'Provide an authority-change reason.')
    if db.query(models.SystemRole).filter_by(name=data.name).first(): raise HTTPException(409,'Role name already exists.')
    role=models.SystemRole(name=data.name,label=data.label,capabilities=data.capabilities,access_level=data.access_level,is_template=False)
    db.add(role);db.flush()
    staff_accounts.audit(db,current_user,'Staff role defined',{'role_id':role.id,'name':role.name,'capabilities':role.capabilities,'reason':data.reason.strip()})
    db.commit();db.refresh(role)
    return role

@router.put("/roles/{role_id}", response_model=gov_schemas.SystemRoleResponse)
def update_role(
    role_id: int,
    data: gov_schemas.SystemRoleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    import staff_accounts
    if '*' not in staff_accounts.admin_grants(current_user): raise HTTPException(403,'System administrator authority is required to edit roles.')
    staff_accounts.lock_accounts(db,current_user)
    if '*' not in staff_accounts.admin_grants(current_user): raise HTTPException(403,'System administrator authority is required.')
    role=db.query(models.SystemRole).filter_by(id=role_id).with_for_update().first()
    if not role: raise HTTPException(404,'Role not found.')
    if current_user.role_id==role.id: raise HTTPException(409,'Ask another system administrator to change your own role definition.')
    if data.name!=role.name: raise HTTPException(422,'Role identifiers cannot be renamed.')
    if data.expected_capabilities is None or data.expected_capabilities != role.capabilities:
        raise HTTPException(409,'Refresh the role definition before saving its expected_capabilities.')
    if len(data.reason.strip())<10: raise HTTPException(422,'Provide an authority-change reason.')
    before={'label':role.label,'capabilities':role.capabilities,'access_level':role.access_level}
    role.label=data.label;role.capabilities=data.capabilities;role.access_level=data.access_level
    for person in db.query(models.Official).filter_by(role_id=role.id).with_for_update().all():
        person.access_version+=1
        staff_accounts.revoke_tokens(db,person)
    staff_accounts.audit(db,current_user,'Staff role definition updated',{'role_id':role.id,'before':before,'after':{'label':role.label,'capabilities':role.capabilities,'access_level':role.access_level},'reason':data.reason.strip()})
    db.commit();db.refresh(role)
    return role


# ─────────────────────────────────────────────────────────────────────────────
# Tactical Advisories (Management)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/advisories", response_model=gov_schemas.AdvisoryResponse)
def post_advisory(
    data: gov_schemas.AdvisoryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Publish a city-wide advisory or tactical alert."""
    from government_access import require
    require(current_user,'announcements','create')
    raise HTTPException(410,'Create an advisory draft through /api/gov/announcements for review and publication.')

@router.get("/advisories", response_model=List[gov_schemas.AdvisoryResponse])
def get_advisories(
    skip: int = 0,
    limit: int = 50,
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Retrieve broadcasted advisories."""
    _assert_role(current_user, *GOV_ROLES)
    advisories = gov_crud.list_advisories(db, skip, limit, category)
    # Perform enrichment if needed (orm_mode handles nested author, we add author_name explicitly)
    for adv in advisories:
        if adv.author:
            adv.author_name = adv.author.full_name
    return advisories

@router.delete("/advisories/{advisory_id}")
def delete_advisory(
    advisory_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Remove an advisory from the system."""
    from government_access import require
    require(current_user,'announcements','withdraw')
    raise HTTPException(410,'Use governed publication withdrawal. Permanent advisory deletion is retired.')


# =============================================================================
# Milestone 1: Physical Infrastructure Asset Register Endpoints
# =============================================================================

@router.get("/assets", response_model=List[gov_schemas.AssetResponse])
def list_assets(
    skip: int = 0,
    limit: int = 50,
    category: Optional[str] = Query(None, description="Category filter (Roads, Drainage, Bridges, Public Buildings, Facilities)"),
    barangay: Optional[str] = Query(None, description="Barangay name or ID"),
    condition_score: Optional[str] = Query(None, description="critical, poor, fair, good, or float threshold"),
    search: Optional[str] = Query(None, description="Keyword search in ID, name, contractor, material"),
    sort_by: Optional[str] = Query("asset_id"),
    order: Optional[str] = Query("asc"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List and filter municipal infrastructure assets. All gov staff can access."""
    _assert_role(current_user, *GOV_ROLES)
    from government_access import jurisdiction_ids
    items = gov_crud.list_infrastructure_assets(db, skip, limit, category, barangay, condition_score, search, sort_by, order, district_ids=jurisdiction_ids(current_user))
    return [gov_crud.enrich_asset_response(a, db) for a in items]


@router.get("/assets/stats", response_model=gov_schemas.AssetStatsResponse)
def get_assets_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Aggregate statistics and condition tier breakdowns across all 5 categories."""
    _assert_role(current_user, *GOV_ROLES)
    from government_access import jurisdiction_ids
    return gov_crud.get_infrastructure_assets_stats(db,jurisdiction_ids(current_user))


@router.get('/asset-workspace')
def asset_workspace(page: int=Query(1,ge=1), category: Optional[str]=None, condition: Optional[str]=None, search: str=Query('',max_length=160),db: Session=Depends(get_db),current_user=Depends(get_current_user)):
    _assert_role(current_user,*GOV_ROLES)
    from government_access import jurisdiction_ids
    rows,total=gov_crud.list_infrastructure_assets(db,skip=(page-1)*15,limit=15,category=category,condition_score=condition,search=search,include_total=True,district_ids=jurisdiction_ids(current_user))
    return dict(items=[gov_crud.enrich_asset_response(a,db) for a in rows],total=total,page=page)


@router.get("/assets/{asset_id}", response_model=gov_schemas.AssetDetailResponse)
def get_asset_detail(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Single physical infrastructure asset docket with full history and linked orders."""
    _assert_role(current_user, *GOV_ROLES)
    asset = db.query(gov_models.InfrastructureAsset).filter(
        gov_models.InfrastructureAsset.asset_id == asset_id
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Infrastructure asset not found")
    from government_access import require_asset_scope
    require_asset_scope(db,current_user,asset)
    return gov_crud.enrich_asset_detail(asset, db)


@router.get('/asset-permissions')
def asset_workspace_permissions(db: Session=Depends(get_db),current_user=Depends(get_current_user)):
    _assert_role(current_user, *GOV_ROLES)
    from government_access import LEADERS, can, jurisdiction_ids
    from operational_roles import canonical_role
    ids=jurisdiction_ids(current_user)
    areas=db.query(models.Barangay)
    if ids: areas=areas.filter(models.Barangay.district_id.in_(ids))
    return dict(register=current_user.role in SENIOR_ROLES, verify_registry=canonical_role(current_user.role) in LEADERS,
                assess=current_user.role in INSPECTOR_ROLES,
                review_outcome=can(current_user,'maintenance','create_work_order') and can(current_user,'verification','view'),
                current_user_id=current_user.id, plan=can(current_user,'maintenance'),
                barangays=[dict(id=area.id,name=area.name) for area in areas.order_by(models.Barangay.name).all()])


@router.post('/assets/{asset_id}/inspections', response_model=gov_schemas.AssetResponse)
def record_asset_condition(asset_id: str, payload: gov_schemas.AssetConditionAssessment, db: Session=Depends(get_db), current_user=Depends(get_current_user)):
    _assert_role(current_user, *INSPECTOR_ROLES)
    from government_access import require_asset_scope
    import json
    asset=db.query(gov_models.InfrastructureAsset).filter_by(asset_id=asset_id).with_for_update().first()
    if not asset: raise HTTPException(404,'Infrastructure asset not found.')
    require_asset_scope(db,current_user,asset)
    if asset.condition_score != payload.expected_condition_score:
        raise HTTPException(409,'The recorded condition changed. Reload the asset before assessing it again.')
    previous=asset.condition_score
    asset.condition_score=payload.condition_score
    gov_crud._append_audit(db,trigger_type='asset_condition',action=f'Condition assessment recorded for {asset.asset_id}',actor_id=current_user.id,actor_role=current_user.role,details=json.dumps(dict(asset_id=asset.asset_id,previous_score=previous,condition_score=payload.condition_score,notes=payload.notes)))
    db.commit()
    db.refresh(asset)
    return gov_crud.enrich_asset_response(asset,db)


@router.post("/assets", response_model=gov_schemas.AssetResponse)
def create_asset(
    data: gov_schemas.AssetCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Register a new physical infrastructure asset."""
    _assert_role(current_user, *SENIOR_ROLES)
    from government_access import require_asset_scope
    from types import SimpleNamespace
    require_asset_scope(db,current_user,SimpleNamespace(barangay_id=data.barangay_id))
    asset = gov_crud.create_infrastructure_asset(db, data, actor_id=current_user.id, actor_role=current_user.role)
    return gov_crud.enrich_asset_response(asset, db)


# =============================================================================
# Milestone 1: Work Order Blockers & Separation of Duties Endpoints
# =============================================================================

@router.post("/work-orders/{wo_id}/block", response_model=gov_schemas.WorkOrderResponse)
def block_work_order_endpoint(
    wo_id: int,
    data: gov_schemas.WorkOrderBlockRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Report an operational blocker with structured reason codes and delay days."""
    _assert_role(current_user, *FIELD_ROLES)
    _require_assigned_or_dispatcher(db, wo_id, current_user)
    wo = gov_crud.block_work_order(db, wo_id, data, actor_id=current_user.id, actor_role=current_user.role)
    return gov_crud.enrich_work_order(wo, db)


@router.post("/work-orders/{wo_id}/unblock", response_model=gov_schemas.WorkOrderResponse)
def unblock_work_order_endpoint(
    wo_id: int,
    data: gov_schemas.WorkOrderUnblockRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Resolve an active blocker and resume the work order."""
    _assert_role(current_user, *FIELD_ROLES)
    _require_assigned_or_dispatcher(db, wo_id, current_user)
    wo = gov_crud.unblock_work_order(db, wo_id, data, actor_id=current_user.id, actor_role=current_user.role)
    return gov_crud.enrich_work_order(wo, db)


@router.post("/work-orders/{wo_id}/verify")
def verify_work_order_endpoint(
    wo_id: int,
    payload: gov_schemas.WorkOrderVerifyRequest,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Independent inspection verification of completed work.
    MANDATORY ENFORCEMENT:
      current_user.id != work_order.assigned_to_id (HTTP 403 on violation)
    Transitions:
      passed=True  → status = 'completed'
      passed=False → status = 'rework_required'
    """
    _assert_role(current_user, *INSPECTOR_ROLES)
    wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    _require_work_order_view(wo,current_user)
    if wo.assigned_to_id is not None and current_user.id == wo.assigned_to_id:
        raise HTTPException(
            status_code=403,
            detail="Separation of duties violation: Assigned field worker cannot inspect or verify their own work order."
        )

    key = command_integrity.validate_key(idempotency_key)
    expected = command_integrity.parse_version(if_match)
    digest = command_integrity.request_hash(payload.model_dump(mode="json")) if key else None

    return gov_crud.verify_work_order_inspection(
        db, wo_id, payload,
        inspector_id=current_user.id,
        inspector_role=current_user.role,
        idempotency_key=key,
        request_digest=digest,
        expected_report_version=expected,
    )


@router.get("/work-orders/{wo_id}/inspections", response_model=List[gov_schemas.WorkOrderInspectionResponse])
def get_work_order_inspections(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieve independent inspection logs for a work order."""
    _assert_role(current_user, *GOV_ROLES)
    wo=db.get(gov_models.WorkOrder,wo_id)
    if not wo: raise HTTPException(404,'Work order not found.')
    _require_work_order_view(wo,current_user)
    inspections = db.query(gov_models.WorkOrderInspection).filter(
        gov_models.WorkOrderInspection.work_order_id == wo_id
    ).order_by(gov_models.WorkOrderInspection.created_at.desc()).all()

    return [
        gov_schemas.WorkOrderInspectionResponse(
            id=ins.id,
            work_order_id=ins.work_order_id,
            inspector_id=ins.inspector_id,
            inspector_name=gov_crud._name(db, ins.inspector_id),
            inspection_date=ins.inspection_date,
            checklist_results=ins.checklist_results,
            passed=ins.passed,
            notes=ins.notes,
            evidence_photo_url=ins.evidence_photo_url,
            created_at=ins.created_at,
        )
        for ins in inspections
    ]


# =============================================================================
# Milestone 1: Citizen Report Request-Info & Docket Endpoints
# =============================================================================

@router.post("/reports/{report_id}/request-info", response_model=gov_schemas.ReportRequestInfoResponse)
def request_citizen_info(
    report_id: int,
    payload: gov_schemas.ReportRequestInfo,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Request clarification from citizen:
    - Sets Report.status = 'needs_information'
    - Logs public ProcessTimeline entry
    - Dispatches resident Notification
    - Appends AuditLog
    """
    key = command_integrity.validate_key(idempotency_key)
    expected = command_integrity.parse_version(if_match)
    digest = command_integrity.request_hash(payload.model_dump(mode="json")) if key else None
    from government_access import require_report_scope
    report = db.get(models.Report, report_id)
    if not report: raise HTTPException(404, 'Report not found')
    require_report_scope(db, current_user, report)
    import report_review
    report_review.require_decision(db,current_user,report,'intake' if current_user.role == 'admin_clerk' else 'review')
    return gov_crud.request_citizen_information(
        db, report_id, payload,
        actor_id=current_user.id,
        actor_role=current_user.role,
        idempotency_key=key,
        request_digest=digest,
        expected_report_version=expected,
    )


class PublicDetailsReview(BaseModel):
    public_content_reviewed: bool
    expected_version: int


@router.post("/reports/{report_id}/publish-details")
def publish_verified_report_details(
    report_id: int,
    decision: PublicDetailsReview,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Authorize legacy verified incident details after a fresh privacy review."""
    if not decision.public_content_reviewed:
        raise HTTPException(422, "Review the public incident address, pin, description, and photo first.")
    report = db.query(models.Report).filter(models.Report.id == report_id).with_for_update().first()
    if not report:
        raise HTTPException(404, "Citizen report not found")
    from report_review_router import require_report_access
    require_report_access(db, current_user, report)
    report_review.require_decision(db, current_user, report, 'verify')
    if report.version != decision.expected_version:
        raise HTTPException(409, "Report changed. Reload it before publishing.")
    if report.status not in {'pending_approval', 'validated', 'approved_internal', 'dispatched', 'in_progress', 'resolved'}:
        raise HTTPException(409, "Report requires government verification before public details can be released.")
    already_approved = db.query(gov_models.ProcessTimeline.id).filter(
        gov_models.ProcessTimeline.report_id == report_id,
        gov_models.ProcessTimeline.status == 'public_details_approved',
    ).first()
    if already_approved:
        return {"report_id": report_id, "public_details_approved": True}
    db.add(gov_models.ProcessTimeline(
        report_id=report_id,
        status='public_details_approved',
        actor_id=current_user.id,
        actor_role='reviewer',
        note='Incident address, coordinates, description, and photo reviewed for public release.',
        is_public=False,
    ))
    db.add(gov_models.AuditLog(
        trigger_type='public_details_approved',
        report_id=report_id,
        actor_id=current_user.id,
        action=f'Public incident details approved for {report.ticket_id}.',
    ))
    db.commit()
    return {"report_id": report_id, "public_details_approved": True}


@router.get("/reports/{report_id}/docket")
def get_report_docket(
    report_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Retrieve full engineering docket for a citizen report:
    - Report attributes and AI triage metadata
    - Process timeline entries
    - Linked work orders with inspections and blockers
    - Audit logs
    """
    from government_access import require, require_report_scope
    require(current_user, 'reports')
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Citizen report not found")

    require_report_scope(db, current_user, report)
    intake = {'pending', 'unverified', 'needs_information', 'received', 'unvalidated', 'under_review'}
    from report_review_router import require_report_access
    import report_review
    import external_referrals
    require_report_access(db, current_user, report)
    actions = []
    can_review = report_review.permitted(current_user,'review') and (report_review.permitted(current_user,'assign') or report.review_assigned_to_id == current_user.id)
    can_clerk_intake = current_user.role == 'admin_clerk' and report_review.permitted(current_user,'intake') and report.review_assigned_to_id == current_user.id and report.status in report_review.INTAKE
    can_handoff = report.review_assigned_to_id == current_user.id and report.status in report_review.INTAKE and not report_review.permitted(current_user,'verify') and report_review.permitted(current_user,'intake' if current_user.role in report_review.CLERK_ROLES else 'review')
    can_verify = report_review.permitted(current_user,'verify') and (report_review.permitted(current_user,'assign') or report.review_assigned_to_id == current_user.id)
    if can_verify and report.status in intake: actions.append('verify')
    public_details_approved = report.status in {'pending_approval', 'validated', 'approved_internal', 'dispatched', 'in_progress', 'resolved'}
    if report_review.permitted(current_user,'reject'):
        if report.status in intake | {'pending_approval'}: actions.append('reject')
    if (can_review or can_clerk_intake) and report.status in (intake - {'needs_information'}) | {'validated', 'pending_approval'}: actions.append('request_info')
    if can_clerk_intake:
        actions.append('peer_transfer')
    if can_handoff and report.status != 'needs_information': actions.append('submit_engineering')
    if current_user.role in DISPATCH_ROLES:
        if report.status == 'approved_internal': actions.append('assign')
    if report_review.permitted(current_user,'approve') and report.status == 'pending_approval': actions.append('approve')

    timeline = db.query(gov_models.ProcessTimeline).filter(
        gov_models.ProcessTimeline.report_id == report_id
    ).order_by(gov_models.ProcessTimeline.created_at.asc()).all()

    work_orders = db.query(gov_models.WorkOrder).filter(
        gov_models.WorkOrder.report_id == report_id
    ).order_by(gov_models.WorkOrder.created_at.desc()).all()
    routing_area = report_review.routing_area(db, report)
    if report_review.permitted(current_user,'assign') and report.status in report_review.INTAKE and not report.review_assigned_to_id and not work_orders and not routing_area:
        actions.append('routing_area')
    if report_review.permitted(current_user,'assign') and report.status in report_review.INTAKE | {'pending_approval','approved_internal'} and report.review_assigned_to_id != current_user.id and routing_area:
        actions.append('take')

    audit_logs = db.query(gov_models.AuditLog).filter(
        gov_models.AuditLog.report_id == report_id
    ).order_by(gov_models.AuditLog.created_at.desc()).all()

    import project_workspace
    from government_access import scoped
    projects=[]
    if project_workspace.allowed(current_user):
        linked=scoped(db.query(gov_models.ProjectRequest),gov_models.ProjectRequest.district_id,current_user).filter(or_(
            gov_models.ProjectRequest.source_report_id==report_id,
            gov_models.ProjectRequest.id.in_(db.query(gov_models.ProjectReportLink.project_id).filter_by(report_id=report_id)),
            gov_models.ProjectRequest.id.in_([work.project_id for work in work_orders if work.project_id])))
        projects=[dict(id=project.id,reference=project.proj_number,title=project.title,
            status=project.status if project.coordination_started_at else 'historical_record',open=project.status not in project_workspace.CLOSED) for project in linked]
    return {
        "projects": projects,
        "can_create_project": project_workspace.allowed(current_user,'manage') and bool(report.barangay_id) and report.status not in {'resolved','completed','rejected','cancelled','spam','duplicate'} and not any(project['open'] for project in projects),
        "allowed_actions": actions,
        "public_details_approved": public_details_approved,
        "review_operations": dict(report_review.projection(db, report),routing_area_id=routing_area.id if routing_area else None,routing_area_name=routing_area.name if routing_area else None),
        "review_history": report_review.history(db, report),
        "referral_permissions": external_referrals.permissions(current_user, report),
        "can_assign_review": report_review.permitted(current_user,'assign'),
        "can_grade_priority": report_review.permitted(current_user,'review') and (report_review.permitted(current_user,'assign') or report.review_assigned_to_id == current_user.id),
        "report": {
            "id": report.id,
            "version": report.version,
            "ticket_id": report.ticket_id,
            "category": report.category,
            "ai_category": report.ai_category,
            "description": report.description,
            "status": report.status,
            "priority": getattr(report, "priority", getattr(report, "ai_urgency", "medium")),
            "ai_urgency": report.ai_urgency,
            "submitted_urgency": report.submitted_urgency,
            "reporter_name": report.reporter_name,
            "location_barangay": report.location_barangay,
            "location_string": report.location_string,
            "location_lat": report.location_lat,
            "location_lng": report.location_lng,
            "photo_url": getattr(report, "photo_url", getattr(report, "image_url", None)),
            "created_at": report.created_at,
            "updated_at": report.updated_at,
            "resident_id": report.resident_id,
        },
        "timeline": [
            {
                "id": t.id,
                "status": t.status,
                "previous_status": t.previous_status,
                "note": t.note,
                "actor_id": t.actor_id,
                "actor_role": t.actor_role,
                "is_public": t.is_public,
                "created_at": t.created_at
            }
            for t in timeline
        ],
        "work_orders": [gov_crud.enrich_work_order(w, db) for w in work_orders],
        "audit_logs": [
            {
                "id": a.id,
                "trigger_type": a.trigger_type,
                "action": a.action,
                "actor_id": a.actor_id,
                "actor_role": a.actor_role,
                "details": a.details,
                "created_at": a.created_at
            }
            for a in audit_logs
        ]
    }


# =============================================================================
# Milestone 1: Today Operations Hub Endpoint
# =============================================================================

@router.get("/operations/today", response_model=gov_schemas.GovOperationsTodayResponse)
def get_today_operations(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Unified My Work & Operations Today inbox:
    - 5 Core Metrics (unassigned, overdue, awaiting_verification, open_high_priority, resolved_period)
    - Role-scoped task buckets (assigned_to_me, needs_my_review, waiting_on_others, recently_completed)
    - Dual-Sector Summary (North & South Caloocan)
    - Team Capacity and Blocker Breakdown
    """
    _assert_role(current_user, *GOV_ROLES)
    from operations_workspace import my_work
    return my_work(db, current_user)


@router.get("/service-insights")
def read_service_insights(
    days: int = Query(90, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from government_access import require
    from operations_workspace import service_insights
    require(current_user, 'insights')
    return service_insights(db, current_user, days)


@router.get('/overview')
def get_operations_overview(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from government_access import require
    from operations_workspace import operations_overview
    require(current_user, 'overview')
    return operations_overview(db, current_user)


# =============================================================================
# Sourced Budget Disclosures & Official Procurement References (Section 9)
# =============================================================================

def _ensure_disclosure_tables(db: Session):
    from announcements_router import _ensure_announcement_tables
    _ensure_announcement_tables(db)


@router.get("/disclosures", response_model=List[gov_schemas.BudgetDisclosureResponse])
def list_budget_disclosures(
    project_id: Optional[int] = Query(None),
    work_order_id: Optional[int] = Query(None),
    announcement_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    List sourced budget disclosure records.
    PULSO collects approved disclosures and links externally to official Caloocan procurement pages;
    it does not process budgeting, obligations, cash release, or procurement in-app.
    """
    _assert_role(current_user, *GOV_ROLES)
    _ensure_disclosure_tables(db)
    q = db.query(gov_models.BudgetDisclosure)
    if project_id is not None:
        q = q.filter(gov_models.BudgetDisclosure.project_id == project_id)
    if work_order_id is not None:
        q = q.filter(gov_models.BudgetDisclosure.work_order_id == work_order_id)
    if announcement_id is not None:
        q = q.filter(gov_models.BudgetDisclosure.announcement_id == announcement_id)
    rows = q.order_by(gov_models.BudgetDisclosure.created_at.desc()).limit(100).all()
    results = []
    for r in rows:
        results.append(gov_schemas.BudgetDisclosureResponse(
            id=r.id,
            disclosure_id=r.disclosure_id,
            announcement_id=r.announcement_id,
            project_id=r.project_id,
            work_order_id=r.work_order_id,
            version=r.version,
            publication_format=r.publication_format,
            amount=r.amount,
            currency=r.currency,
            amount_type=r.amount_type,
            source_label=r.source_label,
            source_url=r.source_url,
            official_bidding_url=r.official_bidding_url,
            source_date=r.source_date,
            fiscal_period=r.fiscal_period,
            issuing_office=r.issuing_office,
            scope_caveat=r.scope_caveat,
            review_state=r.review_state,
            entered_by_id=r.entered_by_id,
            entered_by_name=_name(db, r.entered_by_id),
            reviewed_by_id=r.reviewed_by_id,
            reviewed_by_name=_name(db, r.reviewed_by_id),
            reviewed_at=r.reviewed_at,
            created_at=r.created_at,
            updated_at=r.updated_at,
        ))
    return results


@router.post("/disclosures", response_model=gov_schemas.BudgetDisclosureResponse)
def create_budget_disclosure(
    payload: gov_schemas.BudgetDisclosureInput,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Record a sourced budget disclosure or external authorization reference for a project or work order.
    """
    _assert_role(current_user, *SENIOR_ROLES)
    _ensure_disclosure_tables(db)

    if payload.amount is not None and not payload.source_label:
        raise HTTPException(
            status_code=422,
            detail="A disclosed budget amount requires an official source label (e.g., BAC Resolution, AIP reference, or Contract ID)."
        )

    disc = gov_models.BudgetDisclosure(
        project_id=payload.project_id,
        work_order_id=payload.work_order_id,
        publication_format=payload.publication_format or "announcement",
        amount=payload.amount,
        currency=payload.currency or "PHP",
        amount_type=payload.amount_type or ("not_disclosed" if payload.amount is None else "allocated_project_budget"),
        source_label=payload.source_label,
        source_url=payload.source_url,
        official_bidding_url=payload.official_bidding_url or "https://caloocancity.gov.ph/invitation-to-bid/",
        source_date=payload.source_date,
        fiscal_period=payload.fiscal_period,
        issuing_office=payload.issuing_office or "City Engineering Department",
        scope_caveat=payload.scope_caveat,
        review_state=payload.review_state or "reviewed",
        entered_by_id=current_user.id,
        reviewed_by_id=current_user.id if payload.review_state in ("reviewed", "approved") else None,
    )
    db.add(disc)
    db.commit()
    db.refresh(disc)

    return gov_schemas.BudgetDisclosureResponse(
        id=disc.id,
        disclosure_id=disc.disclosure_id,
        announcement_id=disc.announcement_id,
        project_id=disc.project_id,
        work_order_id=disc.work_order_id,
        version=disc.version,
        publication_format=disc.publication_format,
        amount=disc.amount,
        currency=disc.currency,
        amount_type=disc.amount_type,
        source_label=disc.source_label,
        source_url=disc.source_url,
        official_bidding_url=disc.official_bidding_url,
        source_date=disc.source_date,
        fiscal_period=disc.fiscal_period,
        issuing_office=disc.issuing_office,
        scope_caveat=disc.scope_caveat,
        review_state=disc.review_state,
        entered_by_id=disc.entered_by_id,
        entered_by_name=_name(db, disc.entered_by_id),
        reviewed_by_id=disc.reviewed_by_id,
        reviewed_by_name=_name(db, disc.reviewed_by_id),
        reviewed_at=disc.reviewed_at,
        created_at=disc.created_at,
        updated_at=disc.updated_at,
    )

