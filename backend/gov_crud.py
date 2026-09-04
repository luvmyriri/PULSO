"""
gov_crud.py — CRUD functions for all Government-Side Modules
City Engineering Office, Caloocan City — PULSO System
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
from typing import Optional, List

import gov_models
import gov_schemas
import models  # for User lookups
import re


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _name(db: Session, user_id: Optional[int]) -> Optional[str]:
    """Return full_name for a user_id, or None."""
    if user_id is None:
        return None
    u = db.query(models.User).filter(models.User.id == user_id).first()
    return u.full_name if u else None

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _append_timeline(
    db: Session,
    status: str,
    previous_status: Optional[str] = None,
    actor_id: Optional[int] = None,
    actor_role: Optional[str] = None,
    note: Optional[str] = None,
    is_public: bool = True,
    report_id: Optional[int] = None,
    work_order_id: Optional[int] = None,
    project_id: Optional[int] = None,
):
    """Append an immutable record to process_timelines."""
    entry = gov_models.ProcessTimeline(
        status=status,
        previous_status=previous_status,
        actor_id=actor_id,
        actor_role=actor_role,
        note=note,
        is_public=is_public,
        report_id=report_id,
        work_order_id=work_order_id,
        project_id=project_id,
    )
    db.add(entry)
    db.flush()  # gets an id without full commit
    return entry


def _append_audit(
    db: Session,
    trigger_type: str,
    action: str,
    actor_id: Optional[int] = None,
    actor_role: Optional[str] = None,
    details: Optional[str] = None,
    report_id: Optional[int] = None,
    work_order_id: Optional[int] = None,
    project_id: Optional[int] = None,
    procurement_id: Optional[int] = None,
):
    """Insert an immutable audit log row."""
    entry = gov_models.AuditLog(
        trigger_type=trigger_type,
        action=action,
        actor_id=actor_id,
        actor_role=actor_role,
        details=details,
        report_id=report_id,
        work_order_id=work_order_id,
        project_id=project_id,
        procurement_id=procurement_id,
    )
    db.add(entry)
    db.flush()
    return entry


# ─────────────────────────────────────────────────────────────────────────────
# Work Orders
# ─────────────────────────────────────────────────────────────────────────────

def _sync_report_status(db: Session, report_id: int, new_status: str, actor_id: int, actor_role: str):
    """Update the citizen report status + notify the citizen. Called by gov CRUD functions."""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        return
    previous = report.status
    report.status = new_status

    # Timeline entry (citizen-visible)
    _append_timeline(
        db, status=new_status, previous_status=previous,
        actor_id=actor_id, actor_role=actor_role,
        report_id=report_id, is_public=True,
        note=f"Report status updated to {new_status}",
    )
    _append_audit(
        db, trigger_type="status_change",
        action=f"Report {report.ticket_id} status → {new_status}",
        actor_id=actor_id, actor_role=actor_role,
        report_id=report_id,
    )

    # Citizen notification
    ticket = report.ticket_id or f"PUL-{datetime.now().year}-{report.id:04d}"
    notif_map = {
        "pending_approval": ("Report Verified", f"Your report {ticket} has been verified and is pending engineering approval."),
        "approved_internal": ("Report Approved", f"Good news! Your report {ticket} has been approved and is ready for dispatch."),
        "dispatched": ("Team Dispatched", f"A field team has been dispatched for your report {ticket}. They are on the way."),
        "in_progress": ("Work In Progress", f"Repair work is actively underway for your report {ticket}."),
        "resolved": ("Report Resolved", f"Your report {ticket} has been resolved. Thank you for making North Caloocan better!"),
        "rejected": ("Report Rejected", f"Your report {ticket} could not be verified. Please re-submit with clearer details if this was an error."),
    }
    if new_status in notif_map:
        title, msg = notif_map[new_status]
        notif = models.Notification(user_id=report.user_id, title=title, message=msg)
        db.add(notif)


def create_work_order(
    db: Session,
    data: gov_schemas.WorkOrderCreate,
    actor_id: int,
    actor_role: str,
) -> gov_models.WorkOrder:
    wo = gov_models.WorkOrder(
        title=data.title,
        description=data.description,
        report_id=data.report_id,
        project_id=data.project_id,
        assigned_by_id=actor_id,
        assigned_to_id=data.assigned_to_id,
        wo_type=data.wo_type,
        priority=data.priority,
        scheduled_date=data.scheduled_date,
        notes=data.notes,
        status="open",
    )
    db.add(wo)
    db.flush()

    _append_timeline(
        db, status="open", actor_id=actor_id, actor_role=actor_role,
        note=f"Work order created ({data.wo_type})", work_order_id=wo.id,
        report_id=data.report_id, project_id=data.project_id,
    )
    _append_audit(
        db, trigger_type="maintenance",
        action=f"Work order {wo.wo_number} created",
        actor_id=actor_id, actor_role=actor_role,
        work_order_id=wo.id, report_id=data.report_id, project_id=data.project_id,
    )

    # ── Lifecycle Link: auto-dispatch the linked citizen report ──
    if data.report_id:
        _sync_report_status(db, data.report_id, "dispatched", actor_id, actor_role)

    db.commit()
    db.refresh(wo)
    return wo


def get_work_order(db: Session, wo_id: int) -> Optional[gov_models.WorkOrder]:
    return db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()


def list_work_orders(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    wo_type: Optional[str] = None,
    assigned_to_id: Optional[int] = None,
) -> List[gov_models.WorkOrder]:
    q = db.query(gov_models.WorkOrder)
    if status:
        q = q.filter(gov_models.WorkOrder.status == status)
    if wo_type:
        q = q.filter(gov_models.WorkOrder.wo_type == wo_type)
    if assigned_to_id:
        q = q.filter(gov_models.WorkOrder.assigned_to_id == assigned_to_id)
    return q.order_by(gov_models.WorkOrder.created_at.desc()).offset(skip).limit(limit).all()


def update_work_order_status(
    db: Session,
    wo_id: int,
    new_status: str,
    actor_id: int,
    actor_role: str,
    note: Optional[str] = None,
) -> Optional[gov_models.WorkOrder]:
    wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()
    if not wo:
        return None
    previous = wo.status
    wo.status = new_status
    if new_status == "completed":
        wo.completed_date = _now()

    _append_timeline(
        db, status=new_status, previous_status=previous,
        actor_id=actor_id, actor_role=actor_role,
        note=note, work_order_id=wo_id,
    )
    _append_audit(
        db, trigger_type="status_change",
        action=f"Work order {wo.wo_number} status → {new_status}",
        actor_id=actor_id, actor_role=actor_role,
        work_order_id=wo_id,
    )

    # ── Lifecycle Link: propagate WO status back to citizen report ──
    if wo.report_id:
        report_status_map = {
            "in_progress": "dispatched",   # Crew is actively working
            "completed":   "resolved",     # Work done → report resolved
            "cancelled":   "approved_internal",  # Cancelled → revert to pre-dispatch
        }
        if new_status in report_status_map:
            _sync_report_status(db, wo.report_id, report_status_map[new_status], actor_id, actor_role)

    db.commit()
    db.refresh(wo)
    return wo


def update_work_order(
    db: Session,
    wo_id: int,
    data: gov_schemas.WorkOrderUpdate,
    actor_id: int,
    actor_role: str,
) -> Optional[gov_models.WorkOrder]:
    wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()
    if not wo:
        return None
    update_data = data.dict(exclude_unset=True)
    previous_status = wo.status
    for k, v in update_data.items():
        setattr(wo, k, v)
    if "status" in update_data and update_data["status"] != previous_status:
        _append_timeline(
            db, status=update_data["status"], previous_status=previous_status,
            actor_id=actor_id, actor_role=actor_role, work_order_id=wo_id,
        )
        _append_audit(
            db, trigger_type="status_change",
            action=f"Work order {wo.wo_number} updated → status {update_data['status']}",
            actor_id=actor_id, actor_role=actor_role, work_order_id=wo_id,
        )
        # ── Lifecycle Link: propagate WO status back to citizen report ──
        if wo.report_id:
            report_status_map = {
                "in_progress": "dispatched",
                "completed":   "resolved",
                "cancelled":   "approved_internal",
            }
            new_st = update_data["status"]
            if new_st in report_status_map:
                _sync_report_status(db, wo.report_id, report_status_map[new_st], actor_id, actor_role)
    db.commit()
    db.refresh(wo)
    return wo


def enrich_work_order(wo: gov_models.WorkOrder, db: Session) -> gov_models.WorkOrder:
    wo.assigned_by_name = _name(db, wo.assigned_by_id)
    wo.assigned_to_name = _name(db, wo.assigned_to_id)
    return wo


# ─────────────────────────────────────────────────────────────────────────────
# Process Timeline
# ─────────────────────────────────────────────────────────────────────────────

def get_timeline_for_report(db: Session, report_id: int, public_only: bool = False):
    q = db.query(gov_models.ProcessTimeline).filter(
        gov_models.ProcessTimeline.report_id == report_id
    )
    if public_only:
        q = q.filter(gov_models.ProcessTimeline.is_public == True)
    return q.order_by(gov_models.ProcessTimeline.created_at.asc()).all()


def get_timeline_for_work_order(db: Session, wo_id: int, public_only: bool = False):
    q = db.query(gov_models.ProcessTimeline).filter(
        gov_models.ProcessTimeline.work_order_id == wo_id
    )
    if public_only:
        q = q.filter(gov_models.ProcessTimeline.is_public == True)
    return q.order_by(gov_models.ProcessTimeline.created_at.asc()).all()


def get_timeline_for_project(db: Session, project_id: int, public_only: bool = False):
    q = db.query(gov_models.ProcessTimeline).filter(
        gov_models.ProcessTimeline.project_id == project_id
    )
    if public_only:
        q = q.filter(gov_models.ProcessTimeline.is_public == True)
    return q.order_by(gov_models.ProcessTimeline.created_at.asc()).all()


def list_all_timelines(db: Session, skip: int = 0, limit: int = 100):
    """Fetch recent process timeline entries across all modules."""
    return db.query(gov_models.ProcessTimeline)\
             .order_by(gov_models.ProcessTimeline.created_at.desc())\
             .offset(skip).limit(limit).all()


def enrich_timeline(entries: list, db: Session) -> list:
    for e in entries:
        e.actor_name = _name(db, e.actor_id)
    return entries


# ─────────────────────────────────────────────────────────────────────────────
# Audit Logs & Records Registry (FR-10 & Records)
# ─────────────────────────────────────────────────────────────────────────────

def list_all_records(db: Session, skip: int = 0, limit: int = 200) -> list:
    """
    Registry of all official finalized documents across the system branches:
    - Projects: closed_completion_certified -> Certificate of Completion
    - OBO Inspections: permit_issued / cleared -> Building/Occupancy Permit
    - Procurements: procured -> Notice of Award / Contract
    """
    records = []
    
    # 1. Project Certificates of Completion
    projects = db.query(gov_models.ProjectRequest).filter(
        gov_models.ProjectRequest.status == "closed_completion_certified"
    ).all()
    for p in projects:
        records.append({
            "record_id": f"REC-PROJ-{p.id}",
            "record_type": "Certificate of Completion",
            "reference_no": p.proj_number,
            "title_or_applicant": p.title,
            "date_issued": p.completed_at or p.updated_at,
            "issued_by_name": _name(db, p.certificate_issued_by_id) or "City Engineer"
        })

    # 2. OBO Permits
    obos = db.query(gov_models.OBOInspection).filter(
        gov_models.OBOInspection.status.in_(["permit_issued", "cleared"])
    ).all()
    for o in obos:
        records.append({
            "record_id": f"REC-OBO-{o.id}",
            "record_type": f"{str(o.inspection_type).capitalize()} Permit",
            "reference_no": o.obo_number,
            "title_or_applicant": o.applicant_name,
            "date_issued": o.updated_at,
            "issued_by_name": _name(db, o.cleared_by_id) or "Building Official"
        })

    # 3. Procurements (Awards)
    prs = db.query(gov_models.ProcurementRequest).filter(
        gov_models.ProcurementRequest.status == "procured"
    ).all()
    for p in prs:
        records.append({
            "record_id": f"REC-PRQ-{p.id}",
            "record_type": "Notice of Award / Contract",
            "reference_no": p.pr_number,
            "title_or_applicant": p.title,
            "date_issued": p.approved_at or p.updated_at,
            "issued_by_name": _name(db, p.approved_by_id) or "City Engineer"
        })

    # 4. Resolved Citizen Reports  (FR-14 Integrated)
    reports = db.query(models.Report).filter(
        models.Report.status == "resolved"
    ).all()
    for r in reports:
        records.append({
            "record_id": f"REC-RES-{r.id}",
            "record_type": "Technical Completion Report",
            "reference_no": r.ticket_id,
            "title_or_applicant": r.category or "Maintenance Action",
            "date_issued": r.updated_at or r.created_at,
            "issued_by_name": "PULSO System" # In a real app, this would be the Dispatcher / Admin clerk who closed it
        })

    # Sort descending by date_issued (handle None dates)
    records.sort(key=lambda x: x["date_issued"].timestamp() if hasattr(x["date_issued"], "timestamp") else 0, reverse=True)
    return records[skip : skip + limit]


def list_audit_logs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    trigger_type: Optional[str] = None,
    report_id: Optional[int] = None,
    work_order_id: Optional[int] = None,
    project_id: Optional[int] = None,
) -> List[gov_models.AuditLog]:
    q = db.query(gov_models.AuditLog)
    if trigger_type:
        q = q.filter(gov_models.AuditLog.trigger_type == trigger_type)
    if report_id:
        q = q.filter(gov_models.AuditLog.report_id == report_id)
    if work_order_id:
        q = q.filter(gov_models.AuditLog.work_order_id == work_order_id)
    if project_id:
        q = q.filter(gov_models.AuditLog.project_id == project_id)
    return q.order_by(gov_models.AuditLog.created_at.desc()).offset(skip).limit(limit).all()


def enrich_audit_log(entries: list, db: Session) -> list:
    for e in entries:
        e.actor_name = _name(db, e.actor_id)
    return entries


# ─────────────────────────────────────────────────────────────────────────────
# Procurement Requests  (FR-12)
# ─────────────────────────────────────────────────────────────────────────────

def create_procurement_request(
    db: Session,
    data: gov_schemas.ProcurementRequestCreate,
    actor_id: int,
    actor_role: str,
) -> gov_models.ProcurementRequest:
    pr = gov_models.ProcurementRequest(
        title=data.title,
        purpose=data.purpose,
        work_order_id=data.work_order_id,
        project_id=data.project_id,
        raised_by_id=actor_id,
        status="draft",
    )
    db.add(pr)
    db.flush()

    total = 0.0
    for item_data in data.items:
        total_cost = round(item_data.quantity * item_data.unit_cost, 2)
        total += total_cost
        item = gov_models.BoQItem(
            procurement_request_id=pr.id,
            item_name=item_data.item_name,
            unit=item_data.unit,
            quantity=item_data.quantity,
            unit_cost=item_data.unit_cost,
            total_cost=total_cost,
            specifications=item_data.specifications,
        )
        db.add(item)

    _append_audit(
        db, trigger_type="procurement",
        action=f"Procurement request {pr.pr_number} created (draft)",
        actor_id=actor_id, actor_role=actor_role,
        procurement_id=pr.id,
        work_order_id=data.work_order_id, project_id=data.project_id,
    )
    db.commit()
    db.refresh(pr)
    return pr


def get_procurement_request(db: Session, pr_id: int) -> Optional[gov_models.ProcurementRequest]:
    return db.query(gov_models.ProcurementRequest).filter(
        gov_models.ProcurementRequest.id == pr_id
    ).first()


def list_procurement_requests(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
) -> List[gov_models.ProcurementRequest]:
    q = db.query(gov_models.ProcurementRequest)
    if status:
        q = q.filter(gov_models.ProcurementRequest.status == status)
    return q.order_by(gov_models.ProcurementRequest.created_at.desc()).offset(skip).limit(limit).all()


def update_procurement_status(
    db: Session,
    pr_id: int,
    new_status: str,
    actor_id: int,
    actor_role: str,
    rejection_reason: Optional[str] = None,
) -> Optional[gov_models.ProcurementRequest]:
    pr = db.query(gov_models.ProcurementRequest).filter(
        gov_models.ProcurementRequest.id == pr_id
    ).first()
    if not pr:
        return None

    pr.status = new_status
    if rejection_reason:
        pr.rejection_reason = rejection_reason

    # Set appropriate timestamps
    if new_status == "validated":
        pr.validated_by_id = actor_id
        pr.validated_at = _now()
    elif new_status in ("sent_to_procurement", "procured"):
        pr.approved_by_id = actor_id
        pr.approved_at = _now()

    _append_audit(
        db, trigger_type="procurement",
        action=f"Procurement {pr.pr_number} → {new_status}",
        actor_id=actor_id, actor_role=actor_role,
        procurement_id=pr_id,
        details=rejection_reason,
    )
    db.commit()
    db.refresh(pr)
    return pr


def add_boq_item(
    db: Session,
    pr_id: int,
    item_data: gov_schemas.BoQItemCreate,
) -> gov_models.BoQItem:
    total_cost = round(item_data.quantity * item_data.unit_cost, 2)
    item = gov_models.BoQItem(
        procurement_request_id=pr_id,
        item_name=item_data.item_name,
        unit=item_data.unit,
        quantity=item_data.quantity,
        unit_cost=item_data.unit_cost,
        total_cost=total_cost,
        specifications=item_data.specifications,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def delete_boq_item(db: Session, item_id: int) -> bool:
    item = db.query(gov_models.BoQItem).filter(gov_models.BoQItem.id == item_id).first()
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True


def enrich_procurement(pr: gov_models.ProcurementRequest, db: Session):
    pr.raised_by_name    = _name(db, pr.raised_by_id)
    pr.validated_by_name = _name(db, pr.validated_by_id)
    pr.approved_by_name  = _name(db, pr.approved_by_id)
    pr.total_estimated_cost = sum(i.total_cost for i in pr.items)
    return pr


# ─────────────────────────────────────────────────────────────────────────────
# Project Requests  (Phases 1–6)
# ─────────────────────────────────────────────────────────────────────────────

def create_project_request(
    db: Session,
    data: gov_schemas.ProjectRequestCreate,
    actor_id: int,
    actor_role: str,
) -> gov_models.ProjectRequest:
    proj = gov_models.ProjectRequest(
        title=data.title,
        description=data.description,
        requesting_party=data.requesting_party,
        barangay=data.barangay,
        location_string=data.location_string,
        location_lat=data.location_lat,
        location_lng=data.location_lng,
        created_by_id=actor_id,
        status="request_received",
        current_phase=1,
    )
    db.add(proj)
    db.flush()

    _append_timeline(
        db, status="request_received",
        actor_id=actor_id, actor_role=actor_role,
        note=f"Project request received from {data.requesting_party}",
        project_id=proj.id, is_public=True,
    )
    _append_audit(
        db, trigger_type="maintenance",
        action=f"Project {proj.proj_number} created",
        actor_id=actor_id, actor_role=actor_role, project_id=proj.id,
    )
    db.commit()
    db.refresh(proj)
    return proj


def get_project_request(db: Session, proj_id: int) -> Optional[gov_models.ProjectRequest]:
    return db.query(gov_models.ProjectRequest).filter(
        gov_models.ProjectRequest.id == proj_id
    ).first()


def list_project_requests(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    current_phase: Optional[int] = None,
) -> List[gov_models.ProjectRequest]:
    q = db.query(gov_models.ProjectRequest)
    if status:
        q = q.filter(gov_models.ProjectRequest.status == status)
    if current_phase is not None:
        q = q.filter(gov_models.ProjectRequest.current_phase == current_phase)
    return q.order_by(gov_models.ProjectRequest.created_at.desc()).offset(skip).limit(limit).all()


# Phase transition statuses (ordered)
PROJECT_PHASE_STATUSES = {
    1: "request_received",
    2: "survey_in_progress",
    3: "survey_complete",
    4: "design_in_progress",
    5: "boq_submitted",
    6: "pending_budget_check",
    7: "budget_confirmed",
    8: "approved_by_city_engineer",
    9: "dispatched",
    10: "in_progress",
    11: "milestone_inspections",
    12: "resolved",
    13: "closed_completion_certified",
}

def advance_project_phase(
    db: Session,
    proj_id: int,
    new_status: str,
    actor_id: int,
    actor_role: str,
    note: Optional[str] = None,
) -> Optional[gov_models.ProjectRequest]:
    proj = db.query(gov_models.ProjectRequest).filter(
        gov_models.ProjectRequest.id == proj_id
    ).first()
    if not proj:
        return None
    previous = proj.status
    proj.status = new_status

    # Timestamp tracking
    now = _now()
    if new_status == "survey_complete":
        proj.survey_completed_at = now
    elif new_status == "boq_submitted":
        proj.design_completed_at = now
    elif new_status == "approved_by_city_engineer":
        proj.approved_at = now
    elif new_status == "in_progress":
        proj.construction_started_at = now

    # Update phase number
    for phase_num, phase_status in PROJECT_PHASE_STATUSES.items():
        if phase_status == new_status:
            proj.current_phase = phase_num
            break

    _append_timeline(
        db, status=new_status, previous_status=previous,
        actor_id=actor_id, actor_role=actor_role,
        note=note, project_id=proj_id, is_public=True,
    )
    _append_audit(
        db, trigger_type="status_change",
        action=f"Project {proj.proj_number} → {new_status}",
        actor_id=actor_id, actor_role=actor_role, project_id=proj_id,
    )
    db.commit()
    db.refresh(proj)
    return proj


def update_project(
    db: Session,
    proj_id: int,
    data: gov_schemas.ProjectRequestUpdate,
    actor_id: int,
    actor_role: str,
) -> Optional[gov_models.ProjectRequest]:
    proj = db.query(gov_models.ProjectRequest).filter(
        gov_models.ProjectRequest.id == proj_id
    ).first()
    if not proj:
        return None
    update_data = data.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(proj, k, v)
    db.commit()
    db.refresh(proj)
    return proj


def issue_certificate_of_completion(
    db: Session,
    proj_id: int,
    actor_id: int,
    actor_role: str,
    notes: Optional[str] = None,
) -> Optional[gov_models.ProjectRequest]:
    proj = db.query(gov_models.ProjectRequest).filter(
        gov_models.ProjectRequest.id == proj_id
    ).first()
    if not proj:
        return None
    now = _now()
    proj.certificate_issued = True
    proj.certificate_issued_by_id = actor_id
    proj.completed_at = now
    proj.status = "closed_completion_certified"
    proj.current_phase = 13

    _append_timeline(
        db, status="closed_completion_certified", previous_status=proj.status,
        actor_id=actor_id, actor_role=actor_role,
        note=notes or "Certificate of Completion issued.",
        project_id=proj_id, is_public=True,
    )
    _append_audit(
        db, trigger_type="maintenance",
        action=f"Certificate of Completion issued for {proj.proj_number}",
        actor_id=actor_id, actor_role=actor_role, project_id=proj_id,
        details=notes,
    )
    db.commit()
    db.refresh(proj)
    return proj


def enrich_project(proj: gov_models.ProjectRequest, db: Session):
    proj.created_by_name      = _name(db, proj.created_by_id)
    proj.survey_engineer_name = _name(db, proj.survey_engineer_id)
    proj.design_lead_name     = _name(db, proj.design_lead_id)
    proj.project_engineer_name = _name(db, proj.project_engineer_id)
    return proj


# ─────────────────────────────────────────────────────────────────────────────
# OBO Inspections  (Section 6.4)
# ─────────────────────────────────────────────────────────────────────────────

def create_obo_inspection(
    db: Session,
    data: gov_schemas.OBOInspectionCreate,
    actor_id: int,
    actor_role: str,
) -> gov_models.OBOInspection:
    obo = gov_models.OBOInspection(
        applicant_name=data.applicant_name,
        applicant_contact=data.applicant_contact,
        property_address=data.property_address,
        barangay=data.barangay,
        location_lat=data.location_lat,
        location_lng=data.location_lng,
        inspection_type=data.inspection_type,
        source_report_id=data.source_report_id,
        filed_by_id=actor_id,
        status="application_received",
    )
    db.add(obo)
    db.flush()
    _append_audit(
        db, trigger_type="maintenance",
        action=f"OBO inspection {obo.obo_number} filed ({data.inspection_type})",
        actor_id=actor_id, actor_role=actor_role,
    )
    db.commit()
    db.refresh(obo)
    return obo


def get_obo_inspection(db: Session, obo_id: int) -> Optional[gov_models.OBOInspection]:
    return db.query(gov_models.OBOInspection).filter(
        gov_models.OBOInspection.id == obo_id
    ).first()


def list_obo_inspections(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    inspection_type: Optional[str] = None,
    barangay: Optional[str] = None,
) -> List[gov_models.OBOInspection]:
    q = db.query(gov_models.OBOInspection)
    if status:
        q = q.filter(gov_models.OBOInspection.status == status)
    if inspection_type:
        q = q.filter(gov_models.OBOInspection.inspection_type == inspection_type)
    if barangay:
        q = q.filter(gov_models.OBOInspection.barangay == barangay)
    return q.order_by(gov_models.OBOInspection.created_at.desc()).offset(skip).limit(limit).all()


def update_obo_inspection(
    db: Session,
    obo_id: int,
    data: gov_schemas.OBOInspectionUpdate,
    actor_id: int,
    actor_role: str,
) -> Optional[gov_models.OBOInspection]:
    obo = db.query(gov_models.OBOInspection).filter(
        gov_models.OBOInspection.id == obo_id
    ).first()
    if not obo:
        return None
    update_data = data.dict(exclude_unset=True)
    previous_status = obo.status
    for k, v in update_data.items():
        setattr(obo, k, v)

    if "status" in update_data and update_data["status"] != previous_status:
        # If issuing clearance, record who cleared it
        if update_data["status"] in ("permit_issued", "cleared"):
            obo.cleared_by_id = actor_id
        _append_audit(
            db, trigger_type="maintenance",
            action=f"OBO {obo.obo_number} → {update_data['status']}",
            actor_id=actor_id, actor_role=actor_role,
        )

    db.commit()
    db.refresh(obo)
    return obo


def enrich_obo(obo: gov_models.OBOInspection, db: Session):
    obo.assigned_inspector_name = _name(db, obo.assigned_inspector_id)
    return obo


# ─────────────────────────────────────────────────────────────────────────────
# Government Dashboard Stats  (KPI Aggregation)
# ─────────────────────────────────────────────────────────────────────────────

def get_gov_dashboard_stats(db: Session) -> dict:
    from datetime import datetime, timedelta, timezone
    from collections import defaultdict

    wo   = gov_models.WorkOrder
    pr   = gov_models.ProcurementRequest
    proj = gov_models.ProjectRequest
    obo  = gov_models.OBOInspection
    audit = gov_models.AuditLog
    Report = models.Report

    now = datetime.now(timezone.utc)

    # ── Citizen Report KPIs ──────────────────────────────────────────────────
    total_reports    = db.query(Report).filter(Report.status != "cancelled").count()
    resolved_reports = db.query(Report).filter(Report.status == "resolved").count()
    pending_approval = db.query(Report).filter(Report.status == "pending_approval").count()
    dispatched_count = db.query(Report).filter(Report.status == "dispatched").count()

    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

    this_month_total    = db.query(Report).filter(Report.created_at >= this_month_start, Report.status != "cancelled").count()
    last_month_total    = db.query(Report).filter(
        Report.created_at >= last_month_start, Report.created_at < this_month_start,
        Report.status != "cancelled"
    ).count()
    this_month_resolved = db.query(Report).filter(
        Report.status == "resolved", Report.updated_at >= this_month_start
    ).count()
    last_month_resolved = db.query(Report).filter(
        Report.status == "resolved",
        Report.updated_at >= last_month_start, Report.updated_at < this_month_start
    ).count()

    def pct_change(current, prev):
        if prev == 0:
            return f"+{current * 100}%" if current > 0 else "—"
        change = round(((current - prev) / prev) * 100)
        return f"+{change}%" if change >= 0 else f"{change}%"

    # ── 5 Utility Classifications ─────────────────────────────────────────────
    CLASSIFICATIONS = [
        {"label": "Roads & Bridges",              "exact": "Roads & Bridges",              "keywords": ["road", "roads", "pothole", "bridge", "pavement", "asphalt", "sidewalk", "infrastructure", "bridges"], "icon": "HardHat",    "color": "orange"},
        {"label": "Water & Drainage",             "exact": "Water & Drainage",             "keywords": ["water", "drain", "drainage", "flood", "flooding", "leak", "pipe", "sewage", "canal", "clog"],             "icon": "Droplets",   "color": "blue"},
        {"label": "Street Lighting",              "exact": "Street Lighting",              "keywords": ["street lighting", "electric", "electrical", "light", "lighting", "lamp", "wire", "post", "power", "dark", "bulb", "pole"],     "icon": "Zap",        "color": "yellow"},
        {"label": "Public Safety & Regulatory",   "exact": "Public Safety & Regulatory",   "keywords": ["public safety", "safety", "hazard", "hazardous", "collapse", "tree", "trees", "danger", "dangerous", "obstacle", "risk", "garbage"],  "icon": "ShieldAlert","color": "red"},
        {"label": "Public Facilities",            "exact": "Public Facilities",            "keywords": ["public facilities", "facility", "facilities", "building", "park", "playground", "library", "school", "structural"],  "icon": "Building2",  "color": "purple"},
    ]

    all_reports_raw = db.query(Report.category, Report.status, Report.ai_category).all()
    classification_stats = []
    
    for cls in CLASSIFICATIONS:
        total_cls = 0
        resolved_cls = 0
        keywords = cls["keywords"]
        label = cls["label"]
        
        for category, status, ai_cat in all_reports_raw:
            if status == "cancelled": 
                continue
                
            is_match = False
            # 1. Exact Name Match (Highest Fidelity)
            if category and str(category).strip():
                cat_lower = str(category).strip().lower()
                if cat_lower == cls["exact"].lower():
                    is_match = True
                # 2. Legacy Fuzzy Match (If user categorized differently but it belongs here)
                elif any(re.search(rf"\b{re.escape(kw)}\b", cat_lower) for kw in keywords):
                    is_match = True
                    
            # 3. AI Insights Fallback (If manual categorization is totally missing)
            if not is_match and ai_cat:
                ai_lower = str(ai_cat).lower()
                if any(re.search(rf"\b{re.escape(kw)}\b", ai_lower) for kw in keywords):
                    is_match = True
            
            if is_match:
                total_cls += 1
                if status == "resolved":
                    resolved_cls += 1
                    
        classification_stats.append({
            "label": label,
            "icon": cls["icon"],
            "color": cls["color"],
            "total": total_cls,
            "resolved": resolved_cls,
            "resolution_rate": round((resolved_cls / total_cls * 100) if total_cls > 0 else 0, 1),
        })

    # ── 30-Day Daily Resolution Velocity ─────────────────────────────────────
    thirty_days_ago = now - timedelta(days=30)
    resolved_30d = db.query(Report).filter(
        Report.status == "resolved",
        Report.updated_at >= thirty_days_ago,
    ).all()

    daily_velocity: dict = defaultdict(int)
    for r in resolved_30d:
        if r.updated_at:
            day_key = r.updated_at.strftime("%Y-%m-%d")
            daily_velocity[day_key] += 1

    velocity_series = []
    for i in range(29, -1, -1):
        day = now - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        velocity_series.append({
            "date": day_str,
            "label": day.strftime("%b %d"),
            "count": daily_velocity.get(day_str, 0),
        })

    velocity_label = f"{(now - timedelta(days=30)).strftime('%b %d')} – {now.strftime('%b %d, %Y')}"

    # ── Predictive Maintenance (Chronic Recurrence) ──────────────────────────
    from analytics_service import get_recurrence_events
    recurrence_events = get_recurrence_events(db, days_window=90)
    predictive_alerts = []
    for e in recurrence_events[:5]: # Top 5 alerts
        predictive_alerts.append({
            "title": f"Chronic {e['category'].replace('_',' ').title()} Failure",
            "location": f"Brgy {e['barangay']} • {e['location_string'] or 'Multiple points'}",
            "risk_score": 90 if e['severity'] == 'HIGH' else 65,
            "risk_label": "Critical Risk" if e['severity'] == 'HIGH' else "Medium Risk",
            "description": f"Recurrence detected within {e['distance_meters']}m of a prior repair ({e['days_since_resolved']} days ago). Systemic structural failure likely.",
            "category": e['category']
        })

    # ── Staff Stats ────────────────────────────────────────────────────────
    User = models.User
    staff_counts = db.query(User.role, func.count(User.id)).filter(User.role != 'resident').group_by(User.role).all()
    staff_stats = {role: count for role, count in staff_counts}

    return {
        # Report KPIs
        "total_reports":      total_reports,
        "resolved":           resolved_reports,
        "pending_approval":   pending_approval,
        "dispatched":         dispatched_count,
        "total_trend":        pct_change(this_month_total, last_month_total),
        "resolved_trend":     pct_change(this_month_resolved, last_month_resolved),
        # 5 Classifications
        "classifications":    classification_stats,
        # Velocity chart
        "velocity_series":    velocity_series,
        "velocity_label":     velocity_label,
        # Predictive
        "predictive_alerts":  predictive_alerts,
        # Staff
        "staff_stats":        staff_stats,
        # Work Orders
        "total_work_orders":       db.query(wo).count(),
        "open_work_orders":        db.query(wo).filter(wo.status == "open").count(),
        "in_progress_work_orders": db.query(wo).filter(wo.status == "in_progress").count(),
        "completed_work_orders":   db.query(wo).filter(wo.status == "completed").count(),
        "preemptive_work_orders":  db.query(wo).filter(wo.wo_type == "preemptive").count(),
        # Projects
        "total_projects":     db.query(proj).count(),
        "active_projects":    db.query(proj).filter(proj.status.notin_(["closed_completion_certified", "request_received"])).count(),
        "completed_projects": db.query(proj).filter(proj.status == "closed_completion_certified").count(),
        # Procurement
        "total_procurement_requests": db.query(pr).count(),
        "pending_procurement":        db.query(pr).filter(pr.status.in_(["draft", "submitted"])).count(),
        "sent_to_procurement":        db.query(pr).filter(pr.status == "sent_to_procurement").count(),
        # OBO
        "total_obo_inspections": db.query(obo).count(),
        "pending_obo":           db.query(obo).filter(obo.status.in_(["application_received", "inspection_scheduled"])).count(),
        "non_compliant_obo":     db.query(obo).filter(obo.status == "notice_issued").count(),
        # Audit
        "total_audit_entries": db.query(audit).count(),
    }

