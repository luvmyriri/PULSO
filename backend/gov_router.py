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

from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field

from database import get_db
from auth import get_current_user
from datetime import datetime
import models
import gov_models
import gov_schemas
import gov_crud
import roles_service
import os
import io
import uuid
import re

# [RA 9184 & RA 12009] Systems 
import notification_service
import fqa_engine

router = APIRouter(prefix="/api/gov", tags=["Government"])

# Role groups (FR-13 RBAC)
GOV_ROLES = [
    "city_engineer", "asst_city_engineer", "admin_clerk", "manager",
    "project_engineer", "dispatcher", "estimator", "architect",
    "division_chief", "building_inspector", "finance_officer", "admin_officer",
    "records_officer", "design_engineer", "cad_operator", "foreman",
    "field_worker", "construction_foreman", "electrical_inspector", "mechanical_inspector", "system_admin"
]

FIELD_ROLES = [
    "project_engineer", "dispatcher", "building_inspector", 
    "asst_city_engineer", "city_engineer", "manager", "system_admin", "foreman", "construction_foreman", "field_worker"
]

DISPATCH_ROLES = ["dispatcher", "project_engineer", "asst_city_engineer", "city_engineer", "manager", "system_admin"]
FIELD_SELF_ROLES = {"field_worker", "foreman", "construction_foreman"}


def _require_work_order_view(wo, user):
    if user.role in FIELD_SELF_ROLES and wo.assigned_to_id != user.id:
        raise HTTPException(status_code=403, detail="Work order is outside your assignment")


def _require_assigned_or_dispatcher(db: Session, wo_id: int, user):
    wo = gov_crud.get_work_order(db, wo_id)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    if user.role not in DISPATCH_ROLES and wo.assigned_to_id != user.id:
        raise HTTPException(status_code=403, detail="Work order is not assigned to you")
    return wo

PROCUREMENT_ROLES = [
    "admin_officer", "manager", "admin_clerk", "finance_officer", "bac_secretariat",
    "city_engineer", "system_admin", "estimator"
]

SENIOR_ROLES = [
    "city_engineer", "asst_city_engineer", "manager", "division_chief", "system_admin",
    "admin_officer", "dispatcher", "records_officer", "project_engineer", "design_engineer",
    "building_inspector", "finance_officer"
]

EXECUTIVE_ROLES = [
    "city_engineer", "asst_city_engineer", "manager", "system_admin"
]

ADMIN_ONLY = ["system_admin"]

# Role helpers replaced by dynamic /roles endpoint at the end of the file.

INSPECTOR_ROLES = [
    "building_inspector", "architect", "project_engineer", 
    "asst_city_engineer", "city_engineer", "manager", "system_admin",
    "electrical_inspector", "mechanical_inspector"
]


def _assert_role(user, *allowed_roles):
    """Reject non-officials and officials outside the explicitly allowed roles."""
    if not isinstance(user, models.Official) or user.role not in allowed_roles:
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
    return [{"id": person.id, "full_name": person.full_name, "role": person.role} for person in officials]

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
    _assert_role(current_user, *DISPATCH_ROLES)
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
    _assert_role(current_user, *DISPATCH_ROLES)
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
    """List work orders; field staff only see their assignments."""
    _assert_role(current_user, *GOV_ROLES)
    if current_user.role in FIELD_SELF_ROLES:
        assigned_to_id = current_user.id
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
    if isinstance(current_user, models.Resident):
        public_only = True
        report = db.query(models.Report).filter(models.Report.id == report_id).first()
        if not report or report.resident_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        _assert_role(current_user, *GOV_ROLES)
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
        result = gov_crud.advance_project_phase(
            db, proj_id, payload.status,
            actor_id=current_user.id, actor_role=current_user.role,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    return gov_crud.enrich_project(result["project"], db)


@router.post("/projects/{proj_id}/certificate", response_model=gov_schemas.ProjectRequestResponse)
def issue_certificate(
    proj_id: int,
    payload: gov_schemas.CertificateOfCompletionIssue,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Certificate issuance awaits the governed project evidence and records contract."""
    _assert_role(current_user, "asst_city_engineer", "city_engineer", "manager", "system_admin")
    raise HTTPException(status_code=409, detail="Project certificate issuance requires governed evidence review")

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
    _assert_role(current_user, *ADMIN_ONLY, "city_engineer", "asst_city_engineer")
    
    user = db.query(models.Official).filter(models.Official.id == user_id).first()
    if not user:
        user = db.query(models.Resident).filter(models.Resident.id == user_id).first()
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if type(user) is type(current_user) and user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own account")
    
    action = payload.action.lower()
    if action in {"suspend", "deactivate"} and not (payload.reason or "").strip():
        raise HTTPException(status_code=400, detail="A reason is required to restrict an account.")
    if action == "suspend":
        if isinstance(user, models.Official):
            user.is_suspended = True
            user.suspended_at = func.now()
            user.suspended_by = current_user.id
            user.suspension_reason = payload.reason
        user.is_active = False
        action_msg = "suspended"
    elif action == "activate":
        if isinstance(user, models.Official):
            user.is_suspended = False
            user.suspended_at = None
            user.suspended_by = None
            user.suspension_reason = None
        user.is_active = True
        action_msg = "activated"
    elif action == "deactivate":
        user.is_active = False
        if isinstance(user, models.Official):
            user.is_suspended = False
        action_msg = "deactivated"
    elif action == "reactivate":
        user.is_active = True
        if isinstance(user, models.Official):
            user.is_suspended = False
            user.suspension_reason = None
            user.suspended_at = None
            user.suspended_by = None
        action_msg = "reactivated"
    else:
        raise HTTPException(status_code=400, detail=f"Invalid action: {action}")
    
    gov_crud._append_audit(
        db, trigger_type="user_status_change",
        action=f"User {user.email} {action_msg}",
        actor_id=current_user.id, actor_role=current_user.role,
        details=f"Target type: {type(user).__name__}; target ID: {user.id}; reason: {payload.reason or 'none'}",
    )
    db.commit()
    
    return {"message": f"User {user.full_name} has been {action_msg}."}


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
        
    if payload.role not in GOV_ROLES:
        raise HTTPException(status_code=400, detail="Unknown government role.")
    old_role = user.role
    user.role = payload.role
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
    _assert_role(current_user, *DISPATCH_ROLES)
    q = db.query(models.Report)
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
    items = gov_crud.list_reports_archive(db, skip, limit, status, category, search)
    
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
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    status: str = Field(default="available", pattern="^(offline|available|en_route|on_site|returning)$")
    accuracy: Optional[float] = Field(default=None, ge=0, allow_inf_nan=False)
    battery_level: Optional[int] = Field(default=None, ge=0, le=100)
    location_name: Optional[str] = Field(default=None, max_length=255)


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
    _assert_role(current_user, *FIELD_ROLES)
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
    _assert_role(current_user, *FIELD_ROLES)
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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_role(current_user, "dispatcher", "asst_city_engineer", "city_engineer", "manager", "system_admin")
    reason = payload.reason.strip()
    if len(reason) < 10:
        raise HTTPException(status_code=422, detail="A decision reason of at least 10 characters is required")
    report = db.query(models.Report).filter(models.Report.id == report_id).with_for_update().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
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
    db.commit()
    return {"id": report.id, "ticket_id": report.ticket_id, "status": report.status}

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
    _assert_role(current_user, *DISPATCH_ROLES)
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
    """Legacy certificate shortcut is closed pending a governed proof review."""
    _assert_role(current_user, "dispatcher", "manager", "system_admin")
    raise HTTPException(status_code=409, detail="Project certificate issuance requires governed evidence review")


@router.post("/reports/{report_id}/approve-with-budget")
def approve_report_with_budget(
    report_id: int,
    payload: gov_schemas.ApproveWithBudgetRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Require an approved monetary and emergency decision policy before this shortcut is used."""
    _assert_role(current_user, "dispatcher", "manager", "system_admin")
    raise HTTPException(status_code=409, detail="Budget approval requires the governed project decision workflow")

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
    _assert_role(current_user, *GOV_ROLES)
    roles_service.assert_permission(db, current_user, "admin", "roles")
    return roles_service.get_all_roles(db)

@router.get("/roles/templates", response_model=List[gov_schemas.SystemRoleResponse])
def get_role_templates(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """List available role templates for creation."""
    _assert_role(current_user, *GOV_ROLES)
    roles_service.assert_permission(db, current_user, "admin", "roles")
    return roles_service.get_templates(db)

@router.post("/roles", response_model=gov_schemas.SystemRoleResponse)
def create_role(
    data: gov_schemas.SystemRoleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Create a new dynamic role from a template or scratch."""
    _assert_role(current_user, *GOV_ROLES)
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
    _assert_role(current_user, *GOV_ROLES)
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
    items = gov_crud.list_infrastructure_assets(db, skip, limit, category, barangay, condition_score, search, sort_by, order)
    return [gov_crud.enrich_asset_response(a, db) for a in items]


@router.get("/assets/stats", response_model=gov_schemas.AssetStatsResponse)
def get_assets_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Aggregate statistics and condition tier breakdowns across all 5 categories."""
    _assert_role(current_user, *GOV_ROLES)
    return gov_crud.get_infrastructure_assets_stats(db)


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
    return gov_crud.enrich_asset_detail(asset, db)


@router.post("/assets", response_model=gov_schemas.AssetResponse)
def create_asset(
    data: gov_schemas.AssetCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Register a new physical infrastructure asset."""
    _assert_role(current_user, *SENIOR_ROLES)
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

    if wo.assigned_to_id is not None and current_user.id == wo.assigned_to_id:
        raise HTTPException(
            status_code=403,
            detail="Separation of duties violation: Assigned field worker cannot inspect or verify their own work order."
        )

    return gov_crud.verify_work_order_inspection(
        db, wo_id, payload,
        inspector_id=current_user.id,
        inspector_role=current_user.role
    )


@router.get("/work-orders/{wo_id}/inspections", response_model=List[gov_schemas.WorkOrderInspectionResponse])
def get_work_order_inspections(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieve independent inspection logs for a work order."""
    _assert_role(current_user, *GOV_ROLES)
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
    _assert_role(current_user, *DISPATCH_ROLES)
    return gov_crud.request_citizen_information(
        db, report_id, payload,
        actor_id=current_user.id,
        actor_role=current_user.role
    )


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
    _assert_role(current_user, *DISPATCH_ROLES)
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Citizen report not found")

    timeline = db.query(gov_models.ProcessTimeline).filter(
        gov_models.ProcessTimeline.report_id == report_id
    ).order_by(gov_models.ProcessTimeline.created_at.asc()).all()

    work_orders = db.query(gov_models.WorkOrder).filter(
        gov_models.WorkOrder.report_id == report_id
    ).order_by(gov_models.WorkOrder.created_at.desc()).all()

    audit_logs = db.query(gov_models.AuditLog).filter(
        gov_models.AuditLog.report_id == report_id
    ).order_by(gov_models.AuditLog.created_at.desc()).all()

    return {
        "report": {
            "id": report.id,
            "ticket_id": report.ticket_id,
            "category": report.category,
            "ai_category": report.ai_category,
            "description": report.description,
            "status": report.status,
            "priority": getattr(report, "priority", getattr(report, "ai_urgency", "medium")),
            "ai_urgency": report.ai_urgency,
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
    Centralized leadership dashboard:
    - 5 Core Metrics (unassigned, overdue, awaiting_verification, open_high_priority, resolved_period)
    - Actionable Needs Attention Triage Feed
    - Dual-Sector Summary (North & South Caloocan)
    - Team Capacity and Blocker Breakdown
    """
    _assert_role(current_user, *DISPATCH_ROLES)
    return gov_crud.get_operations_today_hub(db)

