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

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from auth import get_current_user
import models
import gov_models
import gov_schemas
import gov_crud
import roles_service
import os

# [RA 9184 & RA 12009] Systems 
import notification_service
import fqa_engine

router = APIRouter(prefix="/api/gov", tags=["Government"])

# Role groups (FR-13 RBAC)
GOV_ROLES = [
    "city_engineer", "asst_city_engineer", "admin_clerk", "manager",
    "project_engineer", "dispatcher", "estimator", "architect",
    "division_chief", "building_inspector", "finance_officer", "admin_officer"
]

FIELD_ROLES = [
    "project_engineer", "dispatcher", "building_inspector", 
    "asst_city_engineer", "city_engineer", "manager", "system_admin"
]

PROCUREMENT_ROLES = [
    "admin_officer", "manager", "admin_clerk", "finance_officer", "bac_secretariat",
    "city_engineer", "system_admin"
]

SENIOR_ROLES = [
    "city_engineer", "asst_city_engineer", "manager", "division_chief", "system_admin",
    "admin_officer", "dispatcher", "records_officer", "project_engineer", "design_engineer"
]

EXECUTIVE_ROLES = [
    "city_engineer", "asst_city_engineer", "manager", "system_admin"
]

ADMIN_ONLY = ["system_admin"]

# Role helpers replaced by dynamic /roles endpoint at the end of the file.

INSPECTOR_ROLES = [
    "building_inspector", "architect", "project_engineer", 
    "asst_city_engineer", "city_engineer", "manager", "system_admin"
]


def _assert_role(user, *allowed_roles):
    """Legacy helper for backward compatibility."""
    if user.role not in allowed_roles and user.role not in ADMIN_ONLY:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{user.role}' not authorized. Requires one of: {list(allowed_roles)}"
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
def gov_dashboard_stats(db: Session = Depends(get_db)):
    """
    Aggregated KPI dashboard for the LGU Government Command Center.
    Accessible to all authenticated LGU staff.
    """
    return gov_crud.get_gov_dashboard_stats(db)


# ─────────────────────────────────────────────────────────────────────────────
# Work Orders
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/work-orders", response_model=gov_schemas.WorkOrderResponse)
def create_work_order(
    data: gov_schemas.WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Create a new Work Order (standard or preemptive/early dispatch).
    Allowed: Dispatcher, City Engineer, Project Engineer, Senior roles.

    - wo_type = "standard"    : Created after a citizen report
    - wo_type = "preemptive"  : Created proactively (FR-11)
    """
    _assert_role(current_user, *FIELD_ROLES)
    wo = gov_crud.create_work_order(db, data, actor_id=current_user.id, actor_role=current_user.role)
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
    return gov_crud.find_smart_dispatch_suggestions(db, report_id)

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
    """List work orders with optional filters. All gov staff can list."""
    _assert_role(current_user, *GOV_ROLES)
    items = gov_crud.list_work_orders(db, skip, limit, status, wo_type, assigned_to_id, search)
    return [gov_crud.enrich_work_order(w, db) for w in items]


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
    return gov_crud.enrich_work_order(wo, db)


@router.patch("/work-orders/{wo_id}", response_model=gov_schemas.WorkOrderResponse)
def update_work_order(
    wo_id: int,
    data: gov_schemas.WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update work order fields (status, assignee, notes, etc.)."""
    _assert_role(current_user, *FIELD_ROLES)
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
    _assert_role(current_user, *FIELD_ROLES)
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
    _assert_role(current_user, *GOV_ROLES)
    entries = gov_crud.list_all_timelines(db, skip, limit)
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
    if current_user.role == "resident":
        public_only = True
        report = db.query(models.Report).filter(models.Report.id == report_id).first()
        if not report or report.resident_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

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
    _assert_role(current_user, *SENIOR_ROLES)
    return gov_crud.list_system_documents(db, skip, limit)


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
    _assert_role(current_user, *PROCUREMENT_ROLES)
    pr = gov_crud.create_procurement_request(db, data, actor_id=current_user.id, actor_role=current_user.role)
    return gov_crud.enrich_procurement(pr, db)


@router.get("/procurement", response_model=List[gov_schemas.ProcurementRequestResponse])
def list_procurement_requests(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Procurement list view. Filtered by status e.g. 'sent_to_procurement'."""
    _assert_role(current_user, *GOV_ROLES)
    items = gov_crud.list_procurement_requests(db, skip, limit, status, search)
    return [gov_crud.enrich_procurement(p, db) for p in items]


@router.get("/procurement/{pr_id}", response_model=gov_schemas.ProcurementRequestResponse)
def get_procurement_request(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single Procurement Request with all BoQ items."""
    _assert_role(current_user, *GOV_ROLES)
    pr = gov_crud.get_procurement_request(db, pr_id)
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
    status = payload.status

    # Role enforcement per workflow step
    if status == "submitted":
        _assert_role(current_user, *PROCUREMENT_ROLES)
    elif status == "validated":
        _assert_role(current_user, "admin_officer", "manager", "system_admin")
    elif status in ("sent_to_procurement", "rejected"):
        _assert_role(current_user, *EXECUTIVE_ROLES)
    elif status == "procured":
        _assert_role(current_user, "admin_officer", *EXECUTIVE_ROLES)
    else:
        raise HTTPException(status_code=422, detail=f"Invalid procurement status: {status}")

    pr = gov_crud.update_procurement_status(
        db, pr_id, status,
        actor_id=current_user.id, actor_role=current_user.role,
        rejection_reason=payload.rejection_reason,
    )
    if not pr:
        raise HTTPException(status_code=404, detail="Procurement request not found")
    return gov_crud.enrich_procurement(pr, db)


@router.patch("/procurement/{pr_id}/funding-certification", response_model=gov_schemas.ProcurementRequestResponse)
def update_procurement_funding(
    pr_id: int,
    payload: gov_schemas.ProcurementFundingUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Certify that funding is available for this procurement and assign an ObR Number."""
    _assert_role(current_user, "admin_officer", "manager", "system_admin", "budget_officer")
    pr = gov_crud.update_procurement_funding(
        db, pr_id, payload,
        actor_id=current_user.id, actor_role=current_user.role,
    )
    if not pr:
        raise HTTPException(status_code=404, detail="Procurement request not found")
    
    # [RA 9184 Digital Handshake] - Notify Engineering that funds are certified
    if pr.funding_certified and pr.obr_number:
        notification_service.notify_funds_certified(
            asset_id=pr.pr_number, 
            project_name=pr.title,
            amount=sum(item.total_cost for item in pr.items),
            obr_no=pr.obr_number,
            target_user_id=str(pr.raised_by_id)
        )
        
    return gov_crud.enrich_procurement(pr, db)


@router.patch("/procurement/{pr_id}/cash-release", response_model=gov_schemas.ProcurementRequestResponse)
def update_procurement_cash_release(
    pr_id: int,
    payload: gov_schemas.ProcurementCashUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Record that cash has been released for this procurement."""
    _assert_role(current_user, "admin_officer", "manager", "system_admin", "finance_officer")
    pr = gov_crud.update_procurement_cash_release(
        db, pr_id, payload,
        actor_id=current_user.id, actor_role=current_user.role,
    )
    if not pr:
        raise HTTPException(status_code=404, detail="Procurement request not found")

    # [RA 12009 Compliance] - Notify when project is Ready for Bidding (Budget + Cash cleared)
    if pr.funding_certified and pr.cash_released:
        # Fetch the raised_by user's email if possible, or send to city engineer
        engineer_email = os.getenv("CITY_ENGINEER_EMAIL", "engineer@caloocan.gov.ph")
        notification_service.send_ready_for_bidding_notice(
            email=engineer_email,
            data={
                "asset_id": pr.pr_number,
                "project_name": pr.title,
                "location": "North Caloocan District",
                "amount": sum(item.total_cost for item in pr.items),
                "funding_source": "General Fund / 20% Development Fund"
            }
        )

    return gov_crud.enrich_procurement(pr, db)


@router.patch("/procurement/{pr_id}/bac-schedule", response_model=gov_schemas.ProcurementRequestResponse)
def update_procurement_bac_schedule(
    pr_id: int,
    payload: gov_schemas.ProcurementBACUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Schedule the BAC Pre-Procurement Conference for this request."""
    _assert_role(current_user, "admin_officer", "manager", "system_admin", "bac_secretariat")
    pr = gov_crud.update_procurement_bac_schedule(
        db, pr_id, payload,
        actor_id=current_user.id, actor_role=current_user.role,
    )
    if not pr:
        raise HTTPException(status_code=404, detail="Procurement request not found")
    return gov_crud.enrich_procurement(pr, db)


@router.patch("/procurement/{pr_id}/ntp-issuance", response_model=gov_schemas.ProcurementRequestResponse)
def update_procurement_ntp(
    pr_id: int,
    payload: gov_schemas.ProcurementNTPUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Issue a Notice to Proceed for this procurement, unlocking project execution."""
    _assert_role(current_user, *EXECUTIVE_ROLES)
    pr = gov_crud.update_procurement_ntp(
        db, pr_id, payload,
        actor_id=current_user.id, actor_role=current_user.role,
    )
    if not pr:
        raise HTTPException(status_code=404, detail="Procurement request not found")
    return gov_crud.enrich_procurement(pr, db)


@router.post("/procurement/{pr_id}/items", response_model=gov_schemas.BoQItemResponse)
def add_boq_item(
    pr_id: int,
    item: gov_schemas.BoQItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Add a Bill of Quantities line item to an existing Procurement Request."""
    _assert_role(current_user, *PROCUREMENT_ROLES)
    pr = gov_crud.get_procurement_request(db, pr_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Procurement request not found")
    if pr.status not in ("draft", "submitted"):
        raise HTTPException(status_code=400, detail="Cannot add items to a request that is already validated or further.")
    return gov_crud.add_boq_item(db, pr_id, item)


@router.delete("/procurement/{pr_id}/items/{item_id}")
def delete_boq_item(
    pr_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Remove a BoQ line item. Only allowed while request is still draft/submitted."""
    _assert_role(current_user, *PROCUREMENT_ROLES)
    pr = gov_crud.get_procurement_request(db, pr_id)
    if not pr:
        raise HTTPException(status_code=404, detail="Procurement request not found")
    if pr.status not in ("draft", "submitted"):
        raise HTTPException(status_code=400, detail="Cannot modify items after validation.")
    success = gov_crud.delete_boq_item(db, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="BoQ item not found")
    return {"message": f"BoQ item {item_id} deleted"}


# ─────────────────────────────────────────────────────────────────────────────
# Project Requests — LGU Infrastructure Phases 1–6
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/projects", response_model=gov_schemas.ProjectRequestResponse)
def create_project(
    data: gov_schemas.ProjectRequestCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Create a new LGU-initiated infrastructure project (Phase 1 — Request).
    Raised by: City Engineer, Admin Clerk, or Manager.
    """
    _assert_role(current_user, "city_engineer", "admin_clerk", "manager", "system_admin")
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
    items = gov_crud.list_project_requests(db, skip, limit, status, current_phase, search)
    return [gov_crud.enrich_project(p, db) for p in items]


@router.get("/projects/{proj_id}", response_model=gov_schemas.ProjectRequestResponse)
def get_project(
    proj_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single LGU project by ID."""
    _assert_role(current_user, *GOV_ROLES)
    proj = gov_crud.get_project_request(db, proj_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
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
    proj = gov_crud.update_project(db, proj_id, data, actor_id=current_user.id, actor_role=current_user.role)
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
    if not payload.status:
        raise HTTPException(status_code=422, detail="'status' field required to advance the project")
    try:
        proj = gov_crud.advance_project_phase(
            db, proj_id, payload.status,
            actor_id=current_user.id, actor_role=current_user.role,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return gov_crud.enrich_project(proj, db)


@router.post("/projects/{proj_id}/certificate", response_model=gov_schemas.ProjectRequestResponse)
def issue_certificate(
    proj_id: int,
    payload: gov_schemas.CertificateOfCompletionIssue,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Issue a Certificate of Completion for a finished project.
    Restricted to: Assistant City Engineer and City Engineer.
    (Phase 6 — Completion Phase)
    """
    _assert_role(current_user, "asst_city_engineer", "city_engineer", "manager", "system_admin")
    proj = gov_crud.get_project_request(db, proj_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if proj.status not in ("resolved", "milestone_inspections"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot issue certificate for project with status '{proj.status}'. Must be 'resolved' or 'milestone_inspections'."
        )
    proj = gov_crud.issue_certificate_of_completion(
        db, proj_id,
        actor_id=current_user.id, actor_role=current_user.role,
        notes=payload.notes,
    )

    # ─────────────────────────────────────────────────────────────────────────
    # [Section 4.6 - Final Turnover & Audit Trigger]
    # ─────────────────────────────────────────────────────────────────────────
    # When a certificate is issued, we trigger the FQA engine to reconcile 
    # designs vs built, check citizen feedback, and migrate to Asset Registry.
    fqa_results = fqa_engine.execute_fqa(db, proj_id)
    
    # Enrich the response with FQA results for the frontend to show feedback
    enriched_proj = gov_crud.enrich_project(proj, db)
    setattr(enriched_proj, 'fqa_results', fqa_results)
    
    return enriched_proj

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
    
    # Link: Report -> WorkOrder -> ProjectRequest
    wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.report_id == report_id).first()
    if not wo or not wo.project_id:
        raise HTTPException(status_code=404, detail="No linked project found for this report.")
    
    proj = gov_crud.get_project_request(db, wo.project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Linked project not found.")
        
    return gov_crud.enrich_project(proj, db)


# ─────────────────────────────────────────────────────────────────────────────
# OBO Inspections  (Section 6.4 — Office of Building Official)
# ─────────────────────────────────────────────────────────────────────────────

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
    items = gov_crud.list_obo_inspections(db, skip, limit, status, inspection_type, barangay, search)
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
    obo = gov_crud.update_obo_order_of_payment(db, obo_id, payload, current_user.id, current_user.role)
    if not obo:
        raise HTTPException(status_code=404, detail="OBO inspection not found")
    return gov_crud.enrich_obo(obo, db)


# ─────────────────────────────────────────────────────────────────────────────
# Government User Management  (FR-13 — RBAC)
# ─────────────────────────────────────────────────────────────────────────────


class RoleUpdatePayload(BaseModel):
    role: str


# ─────────────────────────────────────────────────────────────────────────────
# User Management - Residents & Government Accounts
# ─────────────────────────────────────────────────────────────────────────────

class UserStatusPayload(BaseModel):
    action: str
    reason: Optional[str] = None



@router.get("/users/stats")
def get_user_management_stats(
    db: Session = Depends(get_db),
    current_user: models.Official = Depends(get_current_user)
):
    """Admin: Quick counts for user management dashboard."""
    _assert_role(current_user, *ADMIN_ONLY)
    
    resident_active = db.query(models.Resident).filter(models.Resident.is_active == True).count()
    gov_active = db.query(models.Official).filter(models.Official.is_active == True, models.Official.is_suspended == False).count()
    gov_suspended = db.query(models.Official).filter(models.Official.is_suspended == True).count()
    
    return {
        "resident": {"active": resident_active, "suspended": 0},  # Consolidated for UI
        "government": {"active": gov_active, "suspended": gov_suspended},
        "total_active": resident_active + gov_active
    }


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
    _assert_role(current_user, *ADMIN_ONLY, "city_engineer", "asst_city_engineer")
    
    # Select table based on account_type
    if account_type == "resident":
        q = db.query(models.Resident)
        if status == "active":
            q = q.filter(models.Resident.is_active == True)
        elif status == "suspended":
            # Residents don't have suspended status, filter them out entirely if suspended is requested
            q = q.filter(False)
    else:
        q = db.query(models.Official)
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
def update_user_status(
    user_id: int,
    payload: UserStatusPayload,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Update user status: activate, suspend, deactivate, reactivate.
    """
    _assert_role(current_user, *ADMIN_ONLY, "city_engineer", "asst_city_engineer")
    
    user = db.query(models.Official).filter(models.Official.id == user_id).first()
    if not user:
        user = db.query(models.Resident).filter(models.Resident.id == user_id).first()
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own account")
    
    action = payload.action.lower()
    if action == "suspend":
        if hasattr(user, "is_suspended"):
            user.is_suspended = True
            user.suspended_at = func.now()
            user.suspended_by = current_user.id
            user.suspension_reason = payload.reason
        user.is_active = False
        action_msg = "suspended"
    elif action == "activate":
        if hasattr(user, "is_suspended"):
            user.is_suspended = False
            user.suspended_at = None
            user.suspended_by = None
            user.suspension_reason = None
        user.is_active = True
        action_msg = "activated"
    elif action == "deactivate":
        user.is_active = False
        user.is_suspended = False
        action_msg = "deactivated"
    elif action == "reactivate":
        user.is_active = True
        user.is_suspended = False
        user.suspension_reason = None
        user.suspended_at = None
        user.suspended_by = None
        action_msg = "reactivated"
    else:
        raise HTTPException(status_code=400, detail=f"Invalid action: {action}")
    
    db.commit()
    
    gov_crud._append_audit(
        db, trigger_type="user_status_change",
        action=f"User {user.email} {action_msg}",
        actor_id=current_user.id, actor_role=current_user.role,
        details=payload.reason or f"Action: {action}",
    )
    db.commit()
    
    return {"message": f"User {user.full_name} has been {action_msg}."}


@router.patch("/users/{user_id}/status")

@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: RoleUpdatePayload,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update an official's role/position. Admin only."""
    _assert_role(current_user, *ADMIN_ONLY)
    
    user = db.query(models.Official).filter(models.Official.id == user_id).first()
    if not user:
        # Residents don't have roles in the same way (they are always 'resident')
        raise HTTPException(status_code=404, detail="Government official not found")
        
    old_role = user.role
    user.role = payload.role
    db.commit()
    
    gov_crud._append_audit(
        db, trigger_type="role_change",
        action=f"Changed {user.email} role from {old_role} to {payload.role}",
        actor_id=current_user.id, actor_role=current_user.role,
        details=f"Admin {current_user.email} modified role for {user.email}"
    )
    db.commit()
    
    return {"message": f"Role for {user.full_name} updated to {payload.role}."}


# ─────────────────────────────────────────────────────────────────────────────
# Design Requests (Design & Planning Division)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/design-requests", response_model=List[dict])
def list_design_requests(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List design requests linked to LGU infrastructure projects."""
    _assert_role(current_user, *GOV_ROLES)
    q = db.query(gov_models.ProjectRequest)
    
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
                "approved_by_city_engineer"
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
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns projects that are in the design or analysis phase with search support."""
    _assert_role(current_user, *GOV_ROLES)
    q = db.query(gov_models.ProjectRequest)
    
    if status:
        if "," in status:
            statuses = [s.strip() for s in status.split(",")]
            q = q.filter(gov_models.ProjectRequest.status.in_(statuses))
        else:
            q = q.filter(gov_models.ProjectRequest.status == status)
    else:
        q = q.filter(gov_models.ProjectRequest.status.in_([
            "design_in_progress", "approved_by_city_engineer", "survey_in_progress"
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
    skip: int = 0,
    limit: int = 50,
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
    wo_q = db.query(gov_models.WorkOrder)
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

    wo_items = wo_q.order_by(gov_models.WorkOrder.created_at.desc()).offset(skip).limit(limit // 2 + 1).all()

    proj_q = db.query(gov_models.ProjectRequest)
    if filter_statuses:
        proj_status_options = ["request_received", "survey_in_progress", "survey_complete"]
        proj_active_filters = [s for s in filter_statuses if s in proj_status_options]
        if proj_active_filters:
            proj_q = proj_q.filter(gov_models.ProjectRequest.status.in_(proj_active_filters))
        else:
            proj_q = proj_q.filter(gov_models.ProjectRequest.id == -1)
    else:
        proj_q = proj_q.filter(gov_models.ProjectRequest.status == "survey_in_progress")

    if search:
        s = f"%{search}%"
        proj_q = proj_q.filter(or_(
            gov_models.ProjectRequest.title.ilike(s),
            gov_models.ProjectRequest.proj_number.ilike(s),
            gov_models.ProjectRequest.description.ilike(s)
        ))

    proj_items = proj_q.order_by(gov_models.ProjectRequest.created_at.desc()).limit(limit // 2 + 1).all()

    results = []
    for w in wo_items:
        results.append({
            "id": w.id,
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
            "project_number": p.proj_number,
            "title": p.title,
            "status": p.status,
            "barangay": p.barangay,
            "location": p.location_string,
            "created_at": str(p.created_at),
        })
    return results[:limit]


# ─────────────────────────────────────────────────────────────────────────────
# Bill of Quantities (Survey & Estimation)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/boq", response_model=List[dict])
def list_boq(
    skip: int = 0,
    limit: int = 100,
    pr_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all Bill of Quantities items across procurement requests with multi-status and search support."""
    _assert_role(current_user, *GOV_ROLES)
    
    q = db.query(gov_models.BoQItem).join(gov_models.ProcurementRequest)
    
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
        
    items = q.offset(skip).limit(limit).all()
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
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Cost estimation view aggregating procurement requests with BoQ totals, status filtering, and search."""
    _assert_role(current_user, *GOV_ROLES)
    q = db.query(gov_models.ProcurementRequest)
    
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
    _assert_role(current_user, *GOV_ROLES)
    q = db.query(models.Report)
    if status:
        if "," in status:
            q = q.filter(models.Report.status.in_([s.strip() for s in status.split(",")]))
        else:
            q = q.filter(models.Report.status == status)
    else:
        q = q.filter(models.Report.status.notin_(["resolved", "rejected", "closed"]))
    
    if category:
        q = q.filter(models.Report.category == category)
    items = q.order_by(models.Report.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": r.id,
            "ticket_id": getattr(r, "ticket_id", f"RPT-{r.id:05d}"),
            "title": r.category or "Infrastructure Report",
            "description": r.description or "",
            "status": r.status,
            "barangay": getattr(r, "barangay", "?"),
            "location": getattr(r, "location_string", "?"),
            "created_at": str(r.created_at),
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
    _assert_role(current_user, *SENIOR_ROLES)
    
    # Use standardized CRUD
    items = gov_crud.list_reports_archive(db, skip, limit, status, category, search)
    
    return [
        {
            "id": r.id,
            "ticket_id": getattr(r, "ticket_id", f"RPT-{r.id:05d}"),
            "title": r.category or "Infrastructure Report",
            "description": r.description or "",
            "status": r.status,
            "barangay": getattr(r, "location_barangay", "—"),
            "location": getattr(r, "location_string", "—"),
            "created_at": str(r.created_at),
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
    return gov_crud.list_all_records(db, skip, limit)

@router.get("/document-registry", response_model=List[dict])
def get_document_archive(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Archived system documents and technical files."""
    _assert_role(current_user, *GOV_ROLES)
    items = gov_crud.list_system_documents(db, skip, limit)
    return [
        {
            "id": d.id,
            "title": d.filename,
            "description": d.description or f"Type: {d.doc_type}",
            "status": "Archived",
            "barangay": "—",
            "created_at": str(d.created_at),
            "file_url": f"/api/files/{d.id}"
        }
        for d in items
    ]
# ─────────────────────────────────────────────────────────────────────────────

class AgentLocationUpdate(BaseModel):
    latitude: float
    longitude: float
    status: Optional[str] = "available"
    accuracy: Optional[float] = None
    battery_level: Optional[int] = None
    location_name: Optional[str] = None


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
    return gov_crud.get_all_agent_locations(db)


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
    loc = gov_crud.get_agent_location(db, agent_id)
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
    # Allow field_worker, construction_foreman, project_engineer, or any authenticated user
    if current_user.role not in ["field_worker", "construction_foreman", "project_engineer", 
                                  "dispatcher", "manager", "engineer"]:
        # Allow any user to update location (for testing/flexibility)
        pass
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
    return gov_crud.get_agents_with_work_orders(db)


# ─────────────────────────────────────────────────────────────────────────────
# Agent Self-Service Endpoints (called FROM the mobile agent app)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/agents/my-work-orders")
def get_my_work_orders(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get the current logged-in agent's own assigned work orders.
    Available to any authenticated user (agents will only see their own).
    """
    from sqlalchemy.orm import joinedload as jl
    work_orders = db.query(gov_models.WorkOrder).options(
        jl(gov_models.WorkOrder.assigned_by)
    ).filter(
        gov_models.WorkOrder.assigned_to_id == current_user.id,
        gov_models.WorkOrder.status.in_(["assigned", "in_progress", "open"])
    ).order_by(gov_models.WorkOrder.created_at.desc()).all()

    result = []
    for wo in work_orders:
        # Try to get location from the linked report
        loc_string = None
        loc_lat = None
        loc_lng = None
        if wo.report_id:
            report = db.query(models.Report).filter(models.Report.id == wo.report_id).first()
            if report:
                loc_string = report.location_string
                loc_lat = report.location_lat
                loc_lng = report.location_lng

        result.append({
            "wo_id": wo.id,
            "wo_number": wo.wo_number,
            "title": wo.title,
            "status": wo.status,
            "priority": wo.priority,
            "wo_type": wo.wo_type,
            "description": wo.description,
            "location_string": loc_string,
            "location_lat": loc_lat,
            "location_lng": loc_lng,
            "created_at": str(wo.created_at) if wo.created_at else None,
        })
    return result


class AgentFieldReport(BaseModel):
    category: str
    description: str
    latitude: float
    longitude: float
    location_string: Optional[str] = None
    work_order_id: Optional[int] = None
    severity: Optional[str] = "medium"


import os
import shutil
from fastapi import File, UploadFile, Form

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
    image_url = None
    if image:
        # Ensure uploads/reports exists
        upload_dir = "uploads/reports"
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir, exist_ok=True)
        
        # Unique filename
        filename = f"agent_{current_user.id}_{int(os.path.getmtime('main.py'))}_{image.filename}"
        # Better: use timestamp
        import time
        filename = f"agent_report_{int(time.time())}_{image.filename}"
        file_path = os.path.join(upload_dir, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        
        image_url = f"/api/uploads/reports/{filename}"

    report = models.Report(
        user_id=current_user.id,
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
        action=f"Field report submitted by agent {current_user.full_name}: {category}",
        actor_id=current_user.id, actor_role=current_user.role,
        report_id=report.id,
        details=f"GPS: {latitude:.5f}, {longitude:.5f} | Image: {image_url}",
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
    wo = db.query(gov_models.WorkOrder).filter(
        gov_models.WorkOrder.id == wo_id,
        gov_models.WorkOrder.assigned_to_id == current_user.id,
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found or not assigned to you")

    allowed_transitions = {
        "assigned": ["in_progress"],
        "in_progress": ["completed"],
        "open": ["in_progress"],
    }
    if payload.status not in allowed_transitions.get(wo.status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{wo.status}' to '{payload.status}'"
        )

    previous = wo.status
    wo.status = payload.status
    if payload.status == "completed":
        from datetime import datetime, timezone
        wo.completed_date = datetime.now(timezone.utc)

    gov_crud._append_timeline(
        db, status=payload.status, previous_status=previous,
        actor_id=current_user.id, actor_role=current_user.role,
        note=payload.notes or f"Agent updated status to {payload.status}",
        work_order_id=wo.id, is_public=True,
    )
    gov_crud._append_audit(
        db, trigger_type="status_change",
        action=f"WO {wo.wo_number} → {payload.status} (by agent)",
        actor_id=current_user.id, actor_role=current_user.role,
        work_order_id=wo.id,
    )
    db.commit()
    return {"success": True, "message": f"Work order updated to '{payload.status}'"}



# ─────────────────────────────────────────────────────────────────────────────
# Dispatcher Workflow Integration: FQA & Budgeting
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/reports/{report_id}/project-mapping")
def get_report_project_mapping(
    report_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Finds the ProjectRequest associated with a citizen report.
    Used by Dispatchers to check if a project is ready for FQA.
    """
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    project = db.query(gov_models.ProjectRequest).filter(
        gov_models.ProjectRequest.linked_report_id == report_id
    ).first()
    
    return {
        "report_id": report_id,
        "report_status": report.status,
        "project_id": project.id if project else None,
        "project_status": project.status if project else "No project linked",
        "title": project.title if project else report.title
    }


@router.post("/projects/{project_id}/issue-certificate")
def issue_fqa_certificate(
    project_id: int,
    payload: gov_schemas.ProjectStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Dispatcher triggers the Final Quality Audit (FQA) by certificates issuance.
    This moves the project to 'closed_completion_certified' and triggers 
    the Smart Gate FQA engine.
    """
    if current_user.role not in ["dispatcher", "manager", "system_admin"]:
        raise HTTPException(status_code=403, detail="Only Dispatchers can finalize audits.")

    try:
        result = gov_crud.advance_project_phase(
            db=db,
            proj_id=project_id,
            new_status="closed_completion_certified",
            actor_id=current_user.id,
            actor_role=current_user.role,
            notes=payload.notes or "FQA triggered by Dispatcher dashboard."
        )
        return {
            "success": True,
            "message": "FQA Certificate issued. Project archived to Asset Registry.",
            "audit_results": result.get("fqa_results")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reports/{report_id}/approve-with-budget")
def approve_report_with_budget(
    report_id: int,
    payload: gov_schemas.ApproveWithBudgetRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Formal Approval flow: Report -> Internal -> Project Link -> BoQ Init.
    """
    if current_user.role not in ["dispatcher", "manager", "system_admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized action.")

    try:
        result = gov_crud.approve_with_budget(
            db=db,
            report_id=report_id,
            data=payload,
            actor_id=current_user.id,
            actor_role=current_user.role
        )
        return {
            "success": True,
            "message": "Report approved and formal project workflow initialized.",
            "project_id": result["project"].id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/work-orders/{wo_id}/promote", response_model=gov_schemas.ProjectRequestResponse)
def promote_wo_to_project_endpoint(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Escalate a Work Order to a full Infrastructure Project flow.
    Allowed: City Engineer, Dispatcher, Manager.
    """
    _assert_role(current_user, "city_engineer", "dispatcher", "manager", "system_admin")
    
    proj = gov_crud.promote_work_order_to_project(
        db, wo_id, actor_id=current_user.id, actor_role=current_user.role
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
    roles_service.assert_permission(db, current_user, "admin", "roles")
    return roles_service.get_all_roles(db)

@router.get("/roles/templates", response_model=List[gov_schemas.SystemRoleResponse])
def get_role_templates(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """List available role templates for creation."""
    roles_service.assert_permission(db, current_user, "admin", "roles")
    return roles_service.get_templates(db)

@router.post("/roles", response_model=gov_schemas.SystemRoleResponse)
def create_role(
    data: gov_schemas.SystemRoleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Create a new dynamic role from a template or scratch."""
    roles_service.assert_permission(db, current_user, "admin", "roles")
    
    existing = db.query(models.SystemRole).filter(models.SystemRole.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role name already exists.")
        
    new_role = models.SystemRole(
        name=data.name,
        label=data.label,
        capabilities=data.capabilities,
        access_level=data.access_level,
        is_template=False
    )
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    return new_role

@router.put("/roles/{role_id}", response_model=gov_schemas.SystemRoleResponse)
def update_role(
    role_id: int,
    data: gov_schemas.SystemRoleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Update role capabilities and label."""
    roles_service.assert_permission(db, current_user, "admin", "roles")
    
    role = db.query(models.SystemRole).filter(models.SystemRole.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")
    
    # Don't allow renaming system protected roles easily through UI if needed
    role.label = data.label
    role.capabilities = data.capabilities
    role.access_level = data.access_level
    
    db.commit()
    db.refresh(role)
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
    _assert_role(current_user, *SENIOR_ROLES)
    return gov_crud.create_advisory(db, data, current_user.id)

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
    _assert_role(current_user, *SENIOR_ROLES)
    success = gov_crud.delete_advisory(db, advisory_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Advisory not found")
    return {"success": True, "message": "Deleted successfully"}
