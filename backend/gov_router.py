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
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from auth import get_current_user
import models
import gov_models
import gov_schemas
import gov_crud

router = APIRouter(prefix="/api/gov", tags=["Government"])

# ─────────────────────────────────────────────────────────────────────────────
# Role groups
# ─────────────────────────────────────────────────────────────────────────────
GOV_ROLES = (
    "city_engineer", "asst_city_engineer", "admin_officer",
    "admin_clerk", "records_officer", "division_chief",
    "design_engineer", "estimator", "cad_operator",
    "project_engineer", "construction_foreman", "field_worker",
    "building_inspector", "electrical_inspector", "mechanical_inspector",
    "dispatcher", "manager", "system_admin",
)

SENIOR_ROLES = (
    "city_engineer", "asst_city_engineer", "admin_officer",
    "division_chief", "manager", "system_admin",
)

EXECUTIVE_ROLES = ("city_engineer", "asst_city_engineer", "manager", "system_admin")
INSPECTOR_ROLES = ("building_inspector", "electrical_inspector", "mechanical_inspector") + EXECUTIVE_ROLES
FIELD_ROLES     = ("project_engineer", "construction_foreman", "field_worker") + SENIOR_ROLES
PROCUREMENT_ROLES = ("project_engineer", "admin_officer", "estimator") + EXECUTIVE_ROLES
ADMIN_ONLY = ("system_admin", "manager")


def _assert_role(user, *allowed_roles):
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{user.role}' not authorized for this action. Requires: {list(allowed_roles)}"
        )


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


@router.get("/work-orders", response_model=List[gov_schemas.WorkOrderResponse])
def list_work_orders(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = Query(None),
    wo_type: Optional[str] = Query(None),
    assigned_to_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List work orders with optional filters. All gov staff can list."""
    _assert_role(current_user, *GOV_ROLES)
    items = gov_crud.list_work_orders(db, skip, limit, status, wo_type, assigned_to_id)
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
        if not report or report.user_id != current_user.id:
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
# Audit Logs & Records  (FR-10 & Records)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/records")
def list_records_registry(
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns the unified Records & Registry:
    Certificates of Completion, OBO Permits, and Procurement Awards.
    """
    _assert_role(current_user, *GOV_ROLES)
    return gov_crud.list_all_records(db, skip, limit)


@router.get("/audit-logs", response_model=List[gov_schemas.AuditLogResponse])
def list_audit_logs(
    skip: int = 0,
    limit: int = 100,
    trigger_type: Optional[str] = Query(None),
    report_id: Optional[int] = Query(None),
    work_order_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Query audit logs by filter. Accessible to senior LGU roles.
    Exportable from the frontend as CSV/PDF.
    """
    _assert_role(current_user, *SENIOR_ROLES)
    entries = gov_crud.list_audit_logs(db, skip, limit, trigger_type, report_id, work_order_id, project_id)
    return gov_crud.enrich_audit_log(entries, db)


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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Procurement list view. Filtered by status e.g. 'sent_to_procurement'."""
    _assert_role(current_user, *GOV_ROLES)
    items = gov_crud.list_procurement_requests(db, skip, limit, status)
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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List LGU infrastructure projects. All gov staff can view."""
    _assert_role(current_user, *GOV_ROLES)
    items = gov_crud.list_project_requests(db, skip, limit, status, current_phase)
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
    proj = gov_crud.advance_project_phase(
        db, proj_id, payload.status,
        actor_id=current_user.id, actor_role=current_user.role,
    )
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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List OBO inspections. Filterable by status, type, or barangay."""
    _assert_role(current_user, *GOV_ROLES)
    items = gov_crud.list_obo_inspections(db, skip, limit, status, inspection_type, barangay)
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


# ─────────────────────────────────────────────────────────────────────────────
# Government User Management  (FR-13 — RBAC)
# ─────────────────────────────────────────────────────────────────────────────


class RoleUpdatePayload(BaseModel):
    role: str

VALID_ROLES = list(GOV_ROLES) + ["resident", "system_admin"]


@router.get("/users", response_model=List[dict])
def list_gov_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    List all system users. System Admin and City Engineer only.
    Optionally filter by role.
    """
    _assert_role(current_user, *ADMIN_ONLY, "city_engineer", "asst_city_engineer")
    q = db.query(models.User)
    if role:
        q = q.filter(models.User.role == role)
    users = q.offset(skip).limit(limit).all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "barangay": u.barangay,
            "phone_number": u.phone_number,
            "trust_score": u.trust_score,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: RoleUpdatePayload,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Assign or change a user's system role. System Admin only.
    All role changes are audit-logged (FR-13).
    """
    _assert_role(current_user, *ADMIN_ONLY)

    if payload.role not in VALID_ROLES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid role '{payload.role}'. Valid roles: {VALID_ROLES}"
        )

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    previous_role = user.role
    user.role = payload.role
    db.commit()

    # Audit log the role change
    gov_crud._append_audit(
        db, trigger_type="role_change",
        action=f"User {user.email} role changed: {previous_role} → {payload.role}",
        actor_id=current_user.id, actor_role=current_user.role,
        details=f"Changed by {current_user.email}",
    )
    db.commit()

    return {
        "message": f"User {user.full_name} role updated to '{payload.role}'",
        "previous_role": previous_role,
        "new_role": payload.role,
    }


@router.patch("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Set user role to 'deactivated' to revoke all access.
    System Admin only.
    """
    _assert_role(current_user, *ADMIN_ONLY)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    previous_role = user.role
    user.role = "deactivated"
    db.commit()
    gov_crud._append_audit(
        db, trigger_type="role_change",
        action=f"User {user.email} deactivated (was: {previous_role})",
        actor_id=current_user.id, actor_role=current_user.role,
    )
    db.commit()
    return {"message": f"User {user.full_name} has been deactivated."}


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
    if status:
        q = q.filter(gov_models.ProjectRequest.status == status)
    items = q.filter(
        gov_models.ProjectRequest.status.in_([
            "design_in_progress", "request_received", "survey_in_progress",
            "approved_by_city_engineer"
        ])
    ).order_by(gov_models.ProjectRequest.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": p.id,
            "project_number": p.project_number,
            "title": p.title,
            "status": p.status,
            "barangay": p.barangay,
            "location": p.location_description,
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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Returns projects that are in the design or analysis phase."""
    _assert_role(current_user, *GOV_ROLES)
    items = (
        db.query(gov_models.ProjectRequest)
        .filter(gov_models.ProjectRequest.status.in_([
            "design_in_progress", "approved_by_city_engineer", "survey_in_progress"
        ]))
        .order_by(gov_models.ProjectRequest.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    return [
        {
            "id": p.id,
            "project_number": p.project_number,
            "title": p.title,
            "status": p.status,
            "barangay": p.barangay,
            "location": p.location_description,
            "scope_of_work": p.scope_of_work,
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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Field survey assignments derived from work orders and project requests."""
    _assert_role(current_user, *GOV_ROLES)
    # Surveys = work orders in field/survey phase + project requests in survey_in_progress
    wo_items = (
        db.query(gov_models.WorkOrder)
        .filter(gov_models.WorkOrder.status.in_(["assigned", "in_progress"]))
        .order_by(gov_models.WorkOrder.created_at.desc())
        .offset(skip).limit(limit // 2 + 1).all()
    )
    proj_items = (
        db.query(gov_models.ProjectRequest)
        .filter(gov_models.ProjectRequest.status == "survey_in_progress")
        .order_by(gov_models.ProjectRequest.created_at.desc())
        .limit(limit // 2 + 1).all()
    )
    results = []
    for w in wo_items:
        results.append({
            "id": w.id,
            "wo_number": w.wo_number,
            "title": w.title,
            "status": w.status,
            "barangay": w.barangay,
            "location": w.location_description,
            "created_at": str(w.created_at),
        })
    for p in proj_items:
        results.append({
            "id": p.id,
            "project_number": p.project_number,
            "title": p.title,
            "status": p.status,
            "barangay": p.barangay,
            "location": p.location_description,
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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all Bill of Quantities items across procurement requests."""
    _assert_role(current_user, *GOV_ROLES)
    q = db.query(gov_models.BoQItem)
    if pr_id:
        q = q.filter(gov_models.BoQItem.procurement_request_id == pr_id)
    items = q.offset(skip).limit(limit).all()
    result = []
    for item in items:
        pr = db.query(gov_models.ProcurementRequest).filter(
            gov_models.ProcurementRequest.id == item.procurement_request_id
        ).first()
        result.append({
            "id": item.id,
            "pr_number": pr.pr_number if pr else "—",
            "title": item.description,
            "description": f"Qty: {item.quantity} {item.unit} @ ₱{item.unit_cost:,.2f} = ₱{item.total_cost:,.2f}",
            "status": pr.status if pr else "unknown",
            "barangay": pr.title if pr else "—",
            "created_at": str(item.created_at) if hasattr(item, "created_at") else "—",
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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Cost estimation view aggregating procurement requests with BoQ totals."""
    _assert_role(current_user, *GOV_ROLES)
    q = db.query(gov_models.ProcurementRequest)
    if status:
        q = q.filter(gov_models.ProcurementRequest.status == status)
    items = q.order_by(gov_models.ProcurementRequest.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for pr in items:
        boq_items = db.query(gov_models.BoQItem).filter(
            gov_models.BoQItem.procurement_request_id == pr.id
        ).all()
        total = sum(getattr(i, "total_cost", 0) or 0 for i in boq_items)
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

@router.get("/reports-archive", response_model=List[dict])
def list_reports_archive(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Archived and resolved citizen infrastructure reports. Senior LGU staff only."""
    _assert_role(current_user, *SENIOR_ROLES)
    q = db.query(models.Report)
    if status:
        q = q.filter(models.Report.status == status)
    else:
        q = q.filter(models.Report.status.in_(["resolved", "rejected", "closed"]))
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
            "barangay": getattr(r, "barangay", "—"),
            "location": getattr(r, "location_string", "—"),
            "created_at": str(r.created_at),
        }
        for r in items
    ]

