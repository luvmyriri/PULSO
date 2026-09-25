"""
gov_crud.py — CRUD functions for all Government-Side Modules
City Engineering Office, Caloocan City — PULSO System
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
import secrets

import gov_models
import gov_schemas
import models  # for User lookups
import re
import notification_service
from utils import geometry_utils


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _name(db: Session, user_id: Optional[int], is_official: bool = True) -> Optional[str]:
    """Return full_name for a user_id, or None."""
    if user_id is None:
        return None
    if is_official:
        u = db.query(models.Official).filter(models.Official.id == user_id).first()
    else:
        u = db.query(models.Resident).filter(models.Resident.id == user_id).first()
        
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


def _notify_role(db: Session, roles: List[str], title: str, message: str, priority: int = 0):
    """
    Broadcast notification to all users with specific government roles.
    Utilized for departmental 'Digital Handshakes'.
    """
    # 1. Resolve role IDs from names
    role_ids = []
    role_records = db.query(models.SystemRole).filter(models.SystemRole.name.in_(roles)).all()
    role_ids = [r.id for r in role_records]

    # 2. Filter officials primarily by the denormalized 'role' string for stability
    # Fallback to role_id if string matches fail (for fully migrated systems)
    officials = db.query(models.Official).filter(
        or_(
            models.Official.role.in_(roles),
            models.Official.role_id.in_(role_ids)
        )
    ).all()
    for o in officials:
        notif = models.Notification(
            official_id=o.id,
            title=title,
            message=message,
            priority=priority
        )
        db.add(notif)
    db.flush()

    # Trigger SMS for Level 100 emergencies
    if priority >= 100:
        try:
            from sms_utils import send_emergency_sms
            for o in officials:
                if o.phone_number:
                    send_emergency_sms(o.phone_number, title, message)
        except ImportError:
            pass # sms_utils not yet created or failed

def _notify_engineering_dept(db: Session, title: str, message: str, priority: int = 0):
    """Notify all engineering department technical staff."""
    eng_roles = ["assistant_engineer", "lead_engineer", "city_engineer", "estimator", "division_chief"]
    _notify_role(db, eng_roles, title, message, priority=priority)

def get_territorial_lead(db: Session, barangay_id: int) -> Optional[models.Official]:
    """
    Find the Lead Engineer assigned to a specific Barangay.
    """
    lead_role = db.query(models.SystemRole).filter(models.SystemRole.name == "lead_engineer").first()
    
    q = db.query(models.Official)
    if lead_role:
        q = q.filter(or_(models.Official.role == "lead_engineer", models.Official.role_id == lead_role.id))
    else:
        q = q.filter(models.Official.role == "lead_engineer")
        
    engineers = q.all()
    
    for eng in engineers:
        if eng.primary_jurisdiction and barangay_id in eng.primary_jurisdiction:
            return eng
    return None

def log_jurisdictional_waiver(db: Session, actor_id: int, assigned_id: int, report_id: int, reason: str = "proximity/emergency logic"):
    """Logs a Temporary Jurisdiction Waiver when a chief overrides territorial boundaries."""
    actor = db.query(models.Official).filter(models.Official.id == actor_id).first()
    assigned = db.query(models.Official).filter(models.Official.id == assigned_id).first()
    
    details = f"Temporary Jurisdiction Waiver issued via {reason}. "
    details += f"{actor.full_name if actor else 'Chief'} authorized cross-boundary assignment to {assigned.full_name if assigned else 'Engineer'}."
    
    _append_audit(
        db,
        trigger_type="emergency_override",
        action="Jurisdictional Waiver",
        actor_id=actor_id,
        actor_role=actor.role if actor else "chief",
        details=details,
        report_id=report_id
    )


def find_smart_dispatch_suggestions(db: Session, report_id: int, limit: int = 3) -> List[dict]:
    """
    Find the nearest available or returning engineers for a specific report.
    Returns: List of dicts with {agent_id, full_name, distance_km, status}
    """
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report or report.location_lat is None or report.location_lng is None:
        return []

    # Get agents who are 'available' or 'returning'
    active_locations = db.query(gov_models.AgentLocation).filter(
        gov_models.AgentLocation.status.in_(["available", "returning"])
    ).all()

    suggestions = []
    for loc in active_locations:
        dist = geometry_utils.calculate_haversine_distance(
            report.location_lat, report.location_lng,
            loc.latitude, loc.longitude
        )
        
        # Fetch official info
        user = db.query(models.Official).filter(models.Official.id == loc.agent_id).first()
        if user:
            suggestions.append({
                "agent_id": user.id,
                "full_name": user.full_name,
                "distance_km": round(dist, 2),
                "status": loc.status
            })

    # Sort by distance (asc)
    suggestions.sort(key=lambda x: x["distance_km"])
    return suggestions[:limit]

# ─────────────────────────────────────────────────────────────────────────────
# Work Orders
# ─────────────────────────────────────────────────────────────────────────────

def _sync_report_status(db: Session, report_id: int, new_status: str, actor_id: int, actor_role: str):
    """Update the citizen report status + notify the citizen. Called by gov CRUD functions."""
    from datetime import datetime, timezone
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        return
    previous = report.status
    report.status = new_status
    report.updated_at = datetime.now(timezone.utc)

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

    # ────── Integration Hook: Automated Asset Resolution & Archival ──────
    if new_status == "resolved":
        # Find linked work orders to identify the asset
        work_orders = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.report_id == report_id).all()
        for wo in work_orders:
            if wo.asset_id:
                # a) Add Maintenance History Log (Triggers AHS recovery/prediction)
                maintenance_log = gov_models.MaintenanceHistory(
                    asset_id=wo.asset_id,
                    work_type=wo.category or "Repair",
                    cost=wo.actual_cost or wo.estimated_cost or report.budget or 0.0,
                    completion_date=datetime.now(timezone.utc).date()
                )
                db.add(maintenance_log)
                
                # b) Archive to System Document Registry (Records & Registry Connection)
                resolution_doc = gov_models.SystemDocument(
                    document_type="survey_report",
                    file_name=f"RESOLUTION_PROOF_{report.ticket_id}.jpg",
                    file_path=report.resolution_image_url or "system_link",
                    category="Infrastructure",
                    target_model="WorkOrder",
                    target_id=wo.id,
                    uploader_id=actor_id,
                    uploaded_at=datetime.now(timezone.utc),
                    metadata_json={
                        "report_ticket": report.ticket_id,
                        "asset_id": wo.asset_id,
                        "category": report.category,
                        "resolution_status": "Finalized",
                        "synced_from": "gov_command_center"
                    }
                )
                db.add(resolution_doc)
                
                # c) Log Asset-Specific Maintenance Audit
                db.add(gov_models.AuditLog(
                    trigger_type="maintenance",
                    action=f"Asset {wo.asset_id} resolution confirmed via Work Order {wo.wo_number}",
                    actor_id=actor_id,
                    actor_role=actor_role,
                    work_order_id=wo.id,
                    details=f"Status: {report.status} | Cost: {maintenance_log.cost}"
                ))

    # Trigger notification logic (if applicable, though usually handled by notify_citizen)
    # For now, relying on timeline as the single source of truth for the resident app.

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
        notif = models.Notification(resident_id=report.resident_id, title=title, message=msg)
        db.add(notif)


def create_work_order(
    db: Session,
    data: gov_schemas.WorkOrderCreate,
    actor_id: int,
    actor_role: str,
) -> gov_models.WorkOrder:
    # 1. Territorial & Emergency Logic
    assignment_type = "territorial"
    is_emergency = (data.priority == "critical")
    priority_score = 100.0 if is_emergency else 0.0
    
    assigned_to_id = data.assigned_to_id

    # Handle Jurisdictional Handover & Smart Dispatch
    if data.report_id:
        report = db.query(models.Report).filter(models.Report.id == data.report_id).first()
        if report:
            # A. AUTO-ASSIGN for Critical / Emergencies
            if is_emergency and not assigned_to_id:
                suggestions = find_smart_dispatch_suggestions(db, data.report_id, limit=1)
                if suggestions:
                    assigned_to_id = suggestions[0]["agent_id"]
                    assignment_type = "proximity_auto"
            
            # B. Territorial Validation
            if report.location_barangay:
                territorial_lead = get_territorial_lead(db, report.location_barangay)
                if territorial_lead and assigned_to_id and assigned_to_id != territorial_lead.id:
                    # If assigned to someone else, it's a Waiver
                    if assignment_type != "proximity_auto":
                        assignment_type = "global_override"
                    
                    log_jurisdictional_waiver(db, actor_id, assigned_to_id, data.report_id, reason=assignment_type)

    # 2. Create Object
    wo = gov_models.WorkOrder(
        title=data.title,
        description=data.description,
        report_id=data.report_id,
        project_id=data.project_id,
        assigned_by_id=actor_id,
        assigned_to_id=assigned_to_id,
        wo_type=data.wo_type,
        priority=data.priority,
        priority_score=priority_score,
        is_emergency_assignment=is_emergency,
        assignment_type=assignment_type,
        scheduled_date=data.scheduled_date,
        category=data.category,
        estimated_cost=data.estimated_cost,
        ai_plan_summary=data.ai_plan_summary,
        notes=data.notes,
        status="open" if not assigned_to_id else "assigned",
    )
    
    # 2a. Resolve ID-based geography if possible
    if data.report_id:
        report = db.query(models.Report).filter(models.Report.id == data.report_id).first()
        if report:
            wo.barangay_id = report.barangay_id
            brgy = db.query(models.Barangay).filter(models.Barangay.id == report.barangay_id).first()
            if brgy:
                wo.district_id = brgy.district_id
    db.add(wo)
    db.flush()

    # 3. Timeline & Audit
    _append_timeline(
        db, status="open", actor_id=actor_id, actor_role=actor_role,
        note=f"Work order created ({data.wo_type}) | Type: {assignment_type}", work_order_id=wo.id,
        report_id=data.report_id, project_id=data.project_id,
    )
    _append_audit(
        db, trigger_type="maintenance",
        action=f"Work order {wo.wo_number} created",
        actor_id=actor_id, actor_role=actor_role,
        work_order_id=wo.id, report_id=data.report_id, project_id=data.project_id,
    )

    # 4. Emergency Escalation (SMS & Priority Notification)
    if is_emergency:
        msg = f"LEVEL 100 EMERGENCY: {data.title} at Report #{data.report_id}. Immediate response required."
        _notify_engineering_dept(db, title="Level 100 Alert", message=msg, priority=100)
        # SMS is handled within _notify_role called by _notify_engineering_dept

    # 5. Lifecycle Link: auto-dispatch the linked citizen report
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
    search: Optional[str] = None,
) -> List[gov_models.WorkOrder]:
    q = db.query(gov_models.WorkOrder).options(
        joinedload(gov_models.WorkOrder.assigned_by),
        joinedload(gov_models.WorkOrder.assigned_to)
    )
    if status:
        if "," in status:
            statuses = [s.strip() for s in status.split(",")]
            q = q.filter(gov_models.WorkOrder.status.in_(statuses))
        else:
            q = q.filter(gov_models.WorkOrder.status == status)
    if wo_type:
        q = q.filter(gov_models.WorkOrder.wo_type == wo_type)
    if assigned_to_id:
        q = q.filter(gov_models.WorkOrder.assigned_to_id == assigned_to_id)
    if search:
        s = f"%{search}%"
        q = q.filter(or_(
            gov_models.WorkOrder.title.ilike(s),
            gov_models.WorkOrder.wo_number.ilike(s),
            gov_models.WorkOrder.description.ilike(s)
        ))
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

    # ── Digital Handshake: Advance linked ProjectRequest to Phase 11 (Inspections) ──
    if wo.project_id and new_status == "completed":
        # Check if all other work orders for this project are also completed
        remaining_wos = db.query(gov_models.WorkOrder).filter(
            gov_models.WorkOrder.project_id == wo.project_id,
            gov_models.WorkOrder.status != "completed",
            gov_models.WorkOrder.id != wo_id
        ).count()
        
        if remaining_wos == 0:
            proj = db.query(gov_models.ProjectRequest).filter(gov_models.ProjectRequest.id == wo.project_id).first()
            if proj and proj.current_phase == 10: # "in_progress"
                advance_project_phase(
                    db, proj.id, "milestone_inspections", actor_id, actor_role,
                    note="Automated: All linked work orders completed. Transitioning to inspection phase."
                )

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


def create_work_order_update(
    db: Session,
    wo_id: int,
    data: gov_schemas.WorkOrderUpdateCreate,
    user_id: int,
) -> Optional[gov_models.WorkOrderUpdate]:
    wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()
    if not wo:
        return None

    previous_status = wo.status
    new_status = data.new_status or previous_status

    # Update WO status if provided
    if data.new_status and data.new_status != previous_status:
        wo.status = data.new_status
        if data.new_status == "completed":
            wo.completed_date = _now()
        
        # Timeline and Audit for status change
        _append_timeline(
            db, status=data.new_status, previous_status=previous_status,
            actor_id=user_id, work_order_id=wo_id, note=data.comment
        )
        _append_audit(
            db, trigger_type="status_change",
            action=f"Work order {wo.wo_number} status → {data.new_status} (via field update)",
            actor_id=user_id, work_order_id=wo_id
        )

        # Sync back to report if exists
        if wo.report_id:
            report_status_map = {
                "in_progress": "dispatched",
                "completed":   "resolved",
                "cancelled":   "approved_internal",
            }
            if data.new_status in report_status_map:
                _sync_report_status(db, wo.report_id, report_status_map[data.new_status], user_id, "field_update")

    # Create the update record
    update_entry = gov_models.WorkOrderUpdate(
        work_order_id=wo_id,
        user_id=user_id,
        previous_status=previous_status,
        new_status=new_status,
        comment=data.comment,
        image_url=data.image_url
    )
    db.add(update_entry)
    db.commit()
    db.refresh(update_entry)
    return update_entry


def enrich_work_order(wo: gov_models.WorkOrder, db: Session) -> gov_models.WorkOrder:
    wo.assigned_by_name = wo.assigned_by.full_name if getattr(wo, 'assigned_by', None) else None
    wo.assigned_to_name = wo.assigned_to.full_name if getattr(wo, 'assigned_to', None) else None
    
    # Enrich updates
    if getattr(wo, 'updates', None):
        for up in wo.updates:
            up.user_name = up.user.full_name if getattr(up, 'user', None) else None
            
    return wo


# ─────────────────────────────────────────────────────────────────────────────
# Work Order Approval  (FR-11)
# ─────────────────────────────────────────────────────────────────────────────

def approve_work_order(
    db: Session,
    wo_id: int,
    approver_id: int,
    notes: Optional[str] = None,
) -> Optional[gov_models.WorkOrderApproval]:
    wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()
    if not wo:
        return None
    
    approval = gov_models.WorkOrderApproval(
        work_order_id=wo_id,
        approver_id=approver_id,
        action="approved",
        notes=notes,
    )
    db.add(approval)
    
    wo.status = "assigned"
    _append_timeline(
        db, status="assigned", previous_status=wo.status,
        actor_id=approver_id, actor_role="approver",
        note=notes, work_order_id=wo_id,
    )
    _append_audit(
        db, trigger_type="status_change",
        action=f"Work order {wo.wo_number} approved by user {approver_id}",
        actor_id=approver_id, actor_role="approver",
        work_order_id=wo_id,
    )
    
    db.commit()
    db.refresh(approval)
    return approval


def reject_work_order(
    db: Session,
    wo_id: int,
    approver_id: int,
    notes: Optional[str] = None,
) -> Optional[gov_models.WorkOrderApproval]:
    wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()
    if not wo:
        return None
    
    approval = gov_models.WorkOrderApproval(
        work_order_id=wo_id,
        approver_id=approver_id,
        action="rejected",
        notes=notes,
    )
    db.add(approval)
    
    wo.status = "rejected"
    _append_timeline(
        db, status="rejected", previous_status=wo.status,
        actor_id=approver_id, actor_role="approver",
        note=notes, work_order_id=wo_id,
    )
    _append_audit(
        db, trigger_type="status_change",
        action=f"Work order {wo.wo_number} rejected by user {approver_id}",
        actor_id=approver_id, actor_role="approver",
        work_order_id=wo_id,
    )
    
    db.commit()
    db.refresh(approval)
    return approval


def get_work_order_approvals(db: Session, wo_id: int) -> List[gov_models.WorkOrderApproval]:
    return db.query(gov_models.WorkOrderApproval).filter(
        gov_models.WorkOrderApproval.work_order_id == wo_id
    ).order_by(gov_models.WorkOrderApproval.created_at.desc()).all()


# ─────────────────────────────────────────────────────────────────────────────
# Process Timeline
# ─────────────────────────────────────────────────────────────────────────────

def get_timeline_for_report(db: Session, report_id: int, public_only: bool = False):
    q = db.query(gov_models.ProcessTimeline).options(joinedload(gov_models.ProcessTimeline.actor)).filter(
        gov_models.ProcessTimeline.report_id == report_id
    )
    if public_only:
        q = q.filter(gov_models.ProcessTimeline.is_public == True)
    
    results = q.order_by(gov_models.ProcessTimeline.created_at.desc()).all()
    
    status_map = {
        "pending": "Report Filed",
        "pending_approval": "Under Verification",
        "approved_internal": "Approved for Dispatch",
        "dispatched": "Field Crew Dispatched",
        "resolved": "Issue Resolved",
        "rejected": "Report Rejected",
        "cancelled": "Operation Cancelled",
        "escalated": "Escalated for Intelligence",
        "quoted": "Procurement Required"
    }

    for r in results:
        # Map actor name
        if r.actor:
            r.actor_name = r.actor.full_name
        elif r.actor_role == "system":
            r.actor_name = "Digital Governance Bot"
        else:
            r.actor_name = "LGU Official"
            
        # Map status display
        r.status_display = status_map.get(r.status, r.status.replace("_", " ").title())
        # Map official notes
        r.official_notes = r.note
        
    return results


def get_timeline_for_work_order(db: Session, wo_id: int, public_only: bool = False):
    q = db.query(gov_models.ProcessTimeline).options(joinedload(gov_models.ProcessTimeline.actor)).filter(
        gov_models.ProcessTimeline.work_order_id == wo_id
    )
    if public_only:
        q = q.filter(gov_models.ProcessTimeline.is_public == True)
    return q.order_by(gov_models.ProcessTimeline.created_at.asc()).all()


def get_timeline_for_project(db: Session, project_id: int, public_only: bool = False):
    q = db.query(gov_models.ProcessTimeline).options(joinedload(gov_models.ProcessTimeline.actor)).filter(
        gov_models.ProcessTimeline.project_id == project_id
    )
    if public_only:
        q = q.filter(gov_models.ProcessTimeline.is_public == True)
    return q.order_by(gov_models.ProcessTimeline.created_at.asc()).all()


def list_all_timelines(db: Session, skip: int = 0, limit: int = 100):
    """Fetch recent process timeline entries across all modules."""
    return db.query(gov_models.ProcessTimeline).options(joinedload(gov_models.ProcessTimeline.actor))\
             .order_by(gov_models.ProcessTimeline.created_at.desc())\
             .offset(skip).limit(limit).all()


def enrich_timeline(entries: list, db: Session) -> list:
    for e in entries:
        e.actor_name = e.actor.full_name if getattr(e, 'actor', None) else None
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
    q = db.query(gov_models.AuditLog).options(joinedload(gov_models.AuditLog.actor))
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
        e.actor_name = e.actor.full_name if getattr(e, 'actor', None) else None
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
    search: Optional[str] = None,
) -> List[gov_models.ProcurementRequest]:
    q = db.query(gov_models.ProcurementRequest).options(
        joinedload(gov_models.ProcurementRequest.raised_by),
        joinedload(gov_models.ProcurementRequest.validated_by),
        joinedload(gov_models.ProcurementRequest.approved_by),
        joinedload(gov_models.ProcurementRequest.items)
    )
    if status:
        if ',' in status:
            q = q.filter(gov_models.ProcurementRequest.status.in_([s.strip() for s in status.split(',')]))
        else:
            q = q.filter(gov_models.ProcurementRequest.status == status)
    if search:
        s = f"%{search}%"
        q = q.filter(or_(
            gov_models.ProcurementRequest.title.ilike(s),
            gov_models.ProcurementRequest.pr_number.ilike(s),
            gov_models.ProcurementRequest.purpose.ilike(s)
        ))
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
    
    # ── Digital Handshake: Advance linked ProjectRequest ──
    if pr.project_id:
        proj = db.query(gov_models.ProjectRequest).filter(gov_models.ProjectRequest.id == pr.project_id).first()
        if proj:
            # Phase 8: approved_by_city_engineer (Procurement Complete)
            if new_status == "procured" and proj.current_phase < 8:
                advance_project_phase(db, proj.id, "approved_by_city_engineer", actor_id, actor_role, note="Automated: Procurement complete. Awaiting NTP.")
            elif new_status == "rejected":
                _append_timeline(db, status=proj.status, actor_id=actor_id, note="Linked Procurement was REJECTED.", project_id=proj.id)

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
    pr.raised_by_name    = pr.raised_by.full_name if getattr(pr, 'raised_by', None) else None
    pr.validated_by_name = pr.validated_by.full_name if getattr(pr, 'validated_by', None) else None
    pr.approved_by_name  = pr.approved_by.full_name if getattr(pr, 'approved_by', None) else None
    pr.total_estimated_cost = sum(i.total_cost for i in getattr(pr, 'items', []))
    return pr


def update_procurement_funding(
    db: Session,
    pr_id: int,
    data: gov_schemas.ProcurementFundingUpdate,
    actor_id: int,
    actor_role: str,
) -> Optional[gov_models.ProcurementRequest]:
    pr = db.query(gov_models.ProcurementRequest).filter(gov_models.ProcurementRequest.id == pr_id).first()
    if not pr:
        return None
    
    was_certified = pr.funding_certified
    pr.funding_certified = data.funding_certified
    pr.obr_number = data.obr_number

    # Trigger notification on new certification
    if not was_certified and data.funding_certified:
        _notify_engineering_dept(
            db,
            title=f"Budget Certified: {pr.title}",
            message=f"ObR Number: {data.obr_number or 'PENDING'}. Posting Completed. Legal reference active. Proceed to pre-procurement validation. Ref: {pr.pr_number}"
        )

    _append_audit(
        db, trigger_type="procurement",
        action=f"Procurement {pr.pr_number} Funding Certified: {data.funding_certified} (ObR: {data.obr_number})",
        actor_id=actor_id, actor_role=actor_role,
        procurement_id=pr.id
    )

    # ── Digital Handshake: Advance linked ProjectRequest ──
    if data.funding_certified and pr.project_id:
        proj = db.query(gov_models.ProjectRequest).filter(gov_models.ProjectRequest.id == pr.project_id).first()
        if proj and proj.current_phase < 7:
            advance_project_phase(db, proj.id, "budget_confirmed", actor_id, actor_role, note=f"Automated: Budget certified (ObR: {data.obr_number}).")

    db.commit()
    db.refresh(pr)
    return pr

def update_procurement_cash_release(
    db: Session,
    pr_id: int,
    data: gov_schemas.ProcurementCashUpdate,
    actor_id: int,
    actor_role: str,
) -> Optional[gov_models.ProcurementRequest]:
    pr = db.query(gov_models.ProcurementRequest).filter(gov_models.ProcurementRequest.id == pr_id).first()
    if not pr:
        return None
    
    pr.cash_released = data.cash_released
    
    if data.cash_released:
        _notify_engineering_dept(
            db,
            title=f"Funds Available: {pr.title}",
            message=f"Cash allocation released for ObR {pr.obr_number or 'N/A'}. Physical bidding may now commence. Ref: {pr.pr_number}"
        )

    _append_audit(
        db, trigger_type="procurement",
        action=f"Procurement {pr.pr_number} Cash Released: {data.cash_released}",
        actor_id=actor_id, actor_role=actor_role,
        procurement_id=pr.id
    )
    db.commit()
    db.refresh(pr)
    return pr

def update_procurement_bac_schedule(
    db: Session,
    pr_id: int,
    data: gov_schemas.ProcurementBACUpdate,
    actor_id: int,
    actor_role: str,
) -> Optional[gov_models.ProcurementRequest]:
    pr = db.query(gov_models.ProcurementRequest).filter(gov_models.ProcurementRequest.id == pr_id).first()
    if not pr:
        return None
    
    pr.bac_meeting_date = data.bac_meeting_date
    
    date_str = data.bac_meeting_date.strftime("%Y-%m-%d %H:%M")
    _notify_engineering_dept(
        db,
        title=f"BAC Schedule: {pr.title}",
        message=f"Pre-Procurement Conference set for {date_str} at BAC Conference Room. Requirement: POW/BoQ final handshake. Ref: {pr.pr_number}"
    )

    _append_audit(
        db, trigger_type="procurement",
        action=f"Procurement {pr.pr_number} BAC Meeting Scheduled: {date_str}",
        actor_id=actor_id, actor_role=actor_role,
        procurement_id=pr.id
    )
    db.commit()
    db.refresh(pr)
    return pr

def update_procurement_ntp(
    db: Session,
    pr_id: int,
    data: gov_schemas.ProcurementNTPUpdate,
    actor_id: int,
    actor_role: str,
) -> Optional[gov_models.ProcurementRequest]:
    pr = db.query(gov_models.ProcurementRequest).filter(gov_models.ProcurementRequest.id == pr_id).first()
    if not pr:
        return None
    pr.ntp_issued = data.ntp_issued
    _append_audit(
        db, trigger_type="procurement",
        action=f"Procurement {pr.pr_number} NTP Issued: {data.ntp_issued}",
        actor_id=actor_id, actor_role=actor_role,
    )

    # ── Digital Handshake: Trigger Mobilization ──
    if pr.project_id:
        proj = db.query(gov_models.ProjectRequest).filter(gov_models.ProjectRequest.id == pr.project_id).first()
        if proj and proj.current_phase < 9:
            # Advance to Phase 9 (Dispatched / NTP Issued)
            advance_project_phase(db, proj.id, "dispatched", actor_id, actor_role, note="Notice to Proceed (NTP) issued. Project dispatched to field.")

    db.commit()
    db.refresh(pr)
    return pr


# ─────────────────────────────────────────────────────────────────────────────
# Project Requests  (Phases 1–6)
# ─────────────────────────────────────────────────────────────────────────────

def create_project_request(
    db: Session,
    data: gov_schemas.ProjectRequestCreate,
    actor_id: int,
    actor_role: str,
    source_report_id: Optional[int] = None,
) -> gov_models.ProjectRequest:
    # Resolve IDs from name/schema
    barangay_id = data.barangay_id
    district_id = data.district_id
    if not barangay_id and data.barangay:
        brgy = db.query(models.Barangay).filter(func.lower(models.Barangay.name) == data.barangay.lower()).first()
        if brgy:
            barangay_id = brgy.id
            district_id = brgy.district_id

    proj = gov_models.ProjectRequest(
        title=data.title,
        description=data.description,
        requesting_party=data.requesting_party,
        barangay=data.barangay,
        barangay_id=barangay_id,
        district_id=district_id,
        location_string=data.location_string,
        location_lat=data.location_lat,
        location_lng=data.location_lng,
        created_by_id=actor_id,
        status="request_received",
        current_phase=1,
        source_report_id=source_report_id,
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
    search: Optional[str] = None,
) -> List[gov_models.ProjectRequest]:
    q = db.query(gov_models.ProjectRequest).options(
        joinedload(gov_models.ProjectRequest.created_by),
        joinedload(gov_models.ProjectRequest.survey_engineer),
        joinedload(gov_models.ProjectRequest.design_lead),
        joinedload(gov_models.ProjectRequest.project_engineer)
    )
    if status:
        if ',' in status:
            q = q.filter(gov_models.ProjectRequest.status.in_([s.strip() for s in status.split(',')]))
        else:
            q = q.filter(gov_models.ProjectRequest.status == status)
    if current_phase is not None:
        q = q.filter(gov_models.ProjectRequest.current_phase == current_phase)
    if search:
        s = f"%{search}%"
        q = q.filter(or_(
            gov_models.ProjectRequest.title.ilike(s),
            gov_models.ProjectRequest.proj_number.ilike(s),
            gov_models.ProjectRequest.description.ilike(s),
            gov_models.ProjectRequest.location_string.ilike(s)
        ))
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

    # ── Role-Based Sign-off Gating ──
    # Milestones requiring Lead/Chief sign-off for accountability
    senior_milestones = ["survey_complete", "boq_submitted", "budget_confirmed", "closed_completion_certified"]
    if new_status in senior_milestones:
        allowed_roles = ["lead_engineer", "city_engineer", "division_chief"]
        if actor_role not in allowed_roles:
            raise ValueError(f"Accountability Lock: Status '{new_status}' requires sign-off from a Lead Engineer or Chief. Your current role is '{actor_role}'.")
    
    if new_status == "approved_by_city_engineer" and actor_role != "city_engineer":
        raise ValueError("Role Restriction: Final engineering approval must be signed only by the City Engineer.")

    # RA 9184 Lock Enforcement
    if new_status == "in_progress":
        pr = db.query(gov_models.ProcurementRequest).filter(
            gov_models.ProcurementRequest.project_id == proj.id
        ).order_by(gov_models.ProcurementRequest.created_at.desc()).first()
        if pr and not pr.ntp_issued:
            raise ValueError("RA 9184 Lock: Cannot advance project to 'in_progress' because Notice to Proceed (NTP) has not been issued.")

    # ─── Scaled Compliance Gate (Smart Gates) ───
    # Requirements scale based on estimated cost and emergency status.
    # Track A: Fast Track (< ₱50k or Emergency)
    # Track B: Standard Track (> ₱1M)
    # Track C: Intermediate Track (Everything else)

    def get_required_docs(status, is_emergency, cost):
        # Emergency Override Core (RA 12009 / Negotiated Procurement)
        if is_emergency:
            emergency_core = ["emergency_memo", "fund_certification", "direct_negotiation_record"]
            if status == "design_in_progress": return emergency_core + ["prelim_survey"]
            if status == "approved_by_city_engineer": return emergency_core + ["emergency_pow"]
            if status == "in_progress": return emergency_core + ["ntp"]
            if status == "resolved": return emergency_core + ["completion_report"]
            return []

        # Track A: Fast Track (Small Value Procurement)
        if cost < 50000:
            if status == "design_in_progress": return ["topo_map"]
            if status == "approved_by_city_engineer": return ["pow"]
            if status == "in_progress": return ["quotations_3", "job_order"]
            if status == "closed_completion_certified": return ["final_photo"]
            return []

        # Track B: Standard Track (Competitive Bidding / SVP)
        # Unified threshold to catch all projects >= 50,000 (RA 9184)
        if cost >= 50000:
            if status in ["design_in_progress", "survey_report"]: 
                return ["survey_report", "topo_map", "geotechnical_test"]
            if status in ["approved_by_city_engineer", "boq_submitted"]: 
                return ["design_plans", "detailed_estimate", "s_curve"]
            if status in ["bidding", "procurement", "in_progress"]: 
                return ["abc", "pow", "itb", "bac_resolution"]
            if status == "resolved": 
                return ["contract", "ntp", "perf_bond", "car_insurance"]
            if status == "closed_completion_certified": 
                return ["as_built_plan", "materials_test", "coa_inspection"]
            return []

        return []

    req_types = get_required_docs(new_status, proj.is_emergency, proj.estimated_cost)
    if req_types:
        docs = db.query(gov_models.SystemDocument.document_type).filter(
            gov_models.SystemDocument.target_model == "ProjectRequest",
            gov_models.SystemDocument.target_id == proj_id,
            gov_models.SystemDocument.document_type.in_(req_types)
        ).all()
        found_types = set([d[0] for d in docs])
        missing = set(req_types) - found_types
        if missing:
            track_label = "EMERGENCY" if proj.is_emergency else ("FAST TRACK" if proj.estimated_cost < 50000 else "STANDARD")
            raise ValueError(
                f"Smart Gate Enforcement ({track_label}): Missing required documents for {new_status.replace('_',' ')}. "
                f"Required: {', '.join([m.replace('_',' ').upper() for m in missing])}. "
                "Compliance with RA 9184 is mandatory."
            )

    if new_status == "closed_completion_certified":
        # Execute Final Quality Audit
        import fqa_engine
        fqa_result = fqa_engine.execute_fqa(db, proj_id)
        if fqa_result["status"] == "MAJOR_FAIL":
             raise ValueError(f"Final Quality Audit (FQA) FAILED. Critical issues: {fqa_result['issues']}")
        elif fqa_result["status"] == "MINOR_FAIL":
             note = (note or "") + f" [FQA WARNINGS]: {fqa_result['issues']}"

        # --- RA 9470 Archival Seal ---
        # Automatically set 'legal_hold' = True on all documents for this project
        # to prevent deletion and ensure permanent audit durability.
        db.query(gov_models.SystemDocument).filter(
            gov_models.SystemDocument.target_model == "ProjectRequest",
            gov_models.SystemDocument.target_id == proj_id
        ).update({"legal_hold": True}, synchronize_session=False)
        
        _append_audit(
            db, trigger_type="status_change",
            action=f"PROJECT SEALED (Archival Lock) - Phase: {new_status}",
            actor_id=actor_id, actor_role=actor_role, project_id=proj_id,
            details="All associated electronic records are now under Legal Hold (RA 9470 Compliance)."
        )

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
        action=f"Project {proj.proj_number} transition to {new_status}",
        actor_id=actor_id, actor_role=actor_role, project_id=proj_id,
    )
    # ── Lifecycle Link: propagate Project status back to citizen report ──
    if proj.source_report_id:
        report_status_map = {
            "resolved": "resolved",
            "closed_completion_certified": "resolved"
        }
        if new_status in report_status_map:
            _sync_report_status(db, proj.source_report_id, report_status_map[new_status], actor_id, actor_role)

    db.commit()
    db.refresh(proj)
    return {
        "project": proj,
        "fqa_results": fqa_result if new_status == "closed_completion_certified" else None
    }


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
    proj.created_by_name      = proj.created_by.full_name if getattr(proj, 'created_by', None) else None
    proj.survey_engineer_name = proj.survey_engineer.full_name if getattr(proj, 'survey_engineer', None) else None
    proj.design_lead_name     = proj.design_lead.full_name if getattr(proj, 'design_lead', None) else None
    proj.project_engineer_name = proj.project_engineer.full_name if getattr(proj, 'project_engineer', None) else None
    return proj


def approve_with_budget(
    db: Session,
    report_id: int,
    data: gov_schemas.ApproveWithBudgetRequest,
    actor_id: int,
    actor_role: str,
):
    """
    Transitions a citizen report to 'approved_internal' and creates a linked ProjectRequest
    with initial Bill of Quantities (BoQ) items.
    """
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise ValueError(f"Report {report_id} not found.")

    # 1. Update Report Status
    previous_status = report.status
    report.status = "approved_internal"
    
    # 2. Create Project Request
    new_project = gov_models.ProjectRequest(
        title=data.project_title,
        description=data.description or report.description,
        requesting_party="Citizen Report via PULSO",
        barangay=report.reporter_resident.barangay if report.reporter_resident else None,
        location_string=report.location_string,
        location_lat=report.location_lat,
        location_lng=report.location_lng,
        estimated_cost=data.estimated_cost,
        is_emergency=data.is_emergency,
        procurement_modality=data.procurement_modality,
        status="request_received",
        current_phase=1,
        created_by_id=actor_id,
        source_report_id=report_id
    )
    db.add(new_project)
    db.flush() # Get project ID

    # 3. Create Procurement Request (Initial Draft)
    new_pr = gov_models.ProcurementRequest(
        project_id=new_project.id,
        raised_by_id=actor_id,
        title=f"Initial Procurement for {data.project_title}",
        purpose=f"Infrastructure repair based on Report {report.ticket_id}",
        status="draft"
    )
    db.add(new_pr)
    db.flush()

    # 4. Add BoQ Items
    for item in data.items:
        boq = gov_models.BoQItem(
            procurement_request_id=new_pr.id,
            item_name=item.item_name,
            unit=item.unit,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            total_cost=item.quantity * item.unit_cost,
            specifications=item.specifications
        )
        db.add(boq)

    # 5. Audit & Timeline
    _append_timeline(
        db, status="approved_internal", previous_status=previous_status,
        actor_id=actor_id, actor_role=actor_role,
        note=f"Report approved with initial budget of ₱{data.estimated_cost:,.2f}",
        report_id=report_id, is_public=True
    )
    
    _append_audit(
        db, trigger_type="status_change",
        action=f"Report {report.ticket_id} → approved_internal (Project Created)",
        actor_id=actor_id, actor_role=actor_role, report_id=report_id,
        details=f"Linked to new project {new_project.proj_number}"
    )

    db.commit()
    db.refresh(new_project)
    db.refresh(report)
    
    return {
        "report": report,
        "project": new_project,
        "procurement_request": new_pr
    }


# ─────────────────────────────────────────────────────────────────────────────
# OBO Inspections  (Section 6.4)
# ─────────────────────────────────────────────────────────────────────────────

def create_obo_inspection(
    db: Session,
    data: gov_schemas.OBOInspectionCreate,
    actor_id: int,
    actor_role: str,
) -> gov_models.OBOInspection:
    # Resolve IDs
    barangay_id = data.barangay_id
    district_id = data.district_id
    if not barangay_id and data.barangay:
        brgy = db.query(models.Barangay).filter(func.lower(models.Barangay.name) == data.barangay.lower()).first()
        if brgy:
            barangay_id = brgy.id
            district_id = brgy.district_id

    obo = gov_models.OBOInspection(
        applicant_name=data.applicant_name,
        applicant_contact=data.applicant_contact,
        property_address=data.property_address,
        barangay=data.barangay,
        barangay_id=barangay_id,
        district_id=district_id,
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
    search: Optional[str] = None,
) -> List[gov_models.OBOInspection]:
    q = db.query(gov_models.OBOInspection).options(
        joinedload(gov_models.OBOInspection.assigned_inspector)
    )
    if status:
        if ',' in status:
            q = q.filter(gov_models.OBOInspection.status.in_([s.strip() for s in status.split(',')]))
        else:
            q = q.filter(gov_models.OBOInspection.status == status)
    if inspection_type:
        q = q.filter(gov_models.OBOInspection.inspection_type == inspection_type)
    if barangay:
        q = q.filter(gov_models.OBOInspection.barangay == barangay)
    if search:
        s = f"%{search}%"
        q = q.filter(or_(
            gov_models.OBOInspection.applicant_name.ilike(s),
            gov_models.OBOInspection.obo_number.ilike(s),
            gov_models.OBOInspection.property_address.ilike(s)
        ))
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
            
            # ── Digital Handshake: Resolve source Report if applicable ──
            if obo.source_report_id:
                _sync_report_status(db, obo.source_report_id, "resolved", actor_id, actor_role)
                
        _append_audit(
            db, trigger_type="maintenance",
            action=f"OBO {obo.obo_number} → {update_data['status']}",
            actor_id=actor_id, actor_role=actor_role,
        )

    db.commit()
    db.refresh(obo)
    return obo


def enrich_obo(obo: gov_models.OBOInspection, db: Session):
    obo.assigned_inspector_name = obo.assigned_inspector.full_name if getattr(obo, 'assigned_inspector', None) else None
    return obo


def update_obo_technical_review(
    db: Session,
    obo_id: int,
    data: gov_schemas.OBOTechnicalReviewUpdate,
    actor_id: int,
    actor_role: str,
) -> Optional[gov_models.OBOInspection]:
    obo = db.query(gov_models.OBOInspection).filter(gov_models.OBOInspection.id == obo_id).first()
    if not obo:
        return None
    
    setattr(obo, f"{data.department}_review", data.status)
    _append_audit(
        db, trigger_type="maintenance",
        action=f"OBO {obo.obo_number} {data.department.upper()} Review → {data.status}",
        actor_id=actor_id, actor_role=actor_role,
    )

    # Auto-check if all 5 are approved to set technical_review_cleared or similar logic if needed
    db.commit()
    db.refresh(obo)
    return obo


def update_obo_appeal(
    db: Session,
    obo_id: int,
    data: gov_schemas.OBOAppealUpdate,
    actor_id: int,
    actor_role: str,
) -> Optional[gov_models.OBOInspection]:
    obo = db.query(gov_models.OBOInspection).filter(gov_models.OBOInspection.id == obo_id).first()
    if not obo:
        return None
    
    obo.appeal_status = "filed"
    obo.appeal_evidence_url = data.appeal_evidence_url
    _append_audit(
        db, trigger_type="maintenance",
        action=f"OBO {obo.obo_number} Appeal Filed",
        actor_id=actor_id, actor_role=actor_role,
    )
    db.commit()
    db.refresh(obo)
    return obo


def update_obo_order_of_payment(
    db: Session,
    obo_id: int,
    data: gov_schemas.OBOOrderOfPayment,
    actor_id: int,
    actor_role: str,
) -> Optional[gov_models.OBOInspection]:
    obo = db.query(gov_models.OBOInspection).filter(gov_models.OBOInspection.id == obo_id).first()
    if not obo:
        return None
    
    obo.order_of_payment_fee = data.fee
    _append_audit(
        db, trigger_type="maintenance",
        action=f"OBO {obo.obo_number} Order of Payment Issued: PHP {data.fee}",
        actor_id=actor_id, actor_role=actor_role,
    )
    db.commit()
    db.refresh(obo)
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
    total_reports    = db.query(Report).filter(Report.status.notin_(["cancelled", "rejected", "spam"])).count()
    resolved_reports = db.query(Report).filter(Report.status == "resolved").count()
    pending_approval = db.query(Report).filter(Report.status.in_(["pending_approval", "unvalidated", "unverified"])).count()
    dispatched_count = db.query(Report).filter(Report.status == "dispatched").count()

    this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

    this_month_total    = db.query(Report).filter(Report.created_at >= this_month_start, Report.status.notin_(["cancelled", "rejected", "spam"])).count()
    last_month_total    = db.query(Report).filter(
        Report.created_at >= last_month_start, Report.created_at < this_month_start,
        Report.status.notin_(["cancelled", "rejected", "spam"])
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
        {"label": "Roads & Bridges",              "exact": "Roads & Bridges",              "keywords": ["road", "roads", "pothole", "potholes", "crack", "cracks", "bridge", "bridges", "pavement", "asphalt", "sidewalk", "sidewalks", "infrastructure", "street repair"], "icon": "HardHat",    "color": "orange"},
        {"label": "Water & Drainage",             "exact": "Water & Drainage",             "keywords": ["water", "drain", "drainage", "flood", "flooding", "leak", "leaks", "pipe", "pipes", "sewage", "canal", "clog", "clogged", "sewer"],             "icon": "Droplets",   "color": "blue"},
        {"label": "Street Lighting",              "exact": "Street Lighting",              "keywords": ["street lighting", "electric", "electrical", "light", "lights", "lighting", "lamp", "lamps", "wire", "wires", "post", "posts", "power", "dark", "bulb", "bulbs", "pole", "poles", "streetlight"],     "icon": "Zap",        "color": "yellow"},
        {"label": "Public Safety & Regulatory",   "exact": "Public Safety & Regulatory",   "keywords": ["public safety", "safety", "hazard", "hazards", "hazardous", "collapse", "tree", "trees", "danger", "dangerous", "obstacle", "obstacles", "risk", "risks"],  "icon": "ShieldAlert","color": "red"},
        {"label": "Public Facilities",            "exact": "Public Facilities",            "keywords": ["public facilities", "facility", "facilities", "building", "buildings", "park", "parks", "playground", "playgrounds", "library", "school", "schools", "structural", "hall"],  "icon": "Building2",  "color": "purple"},
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
    Official = models.Official
    staff_counts = db.query(Official.role, func.count(Official.id)).group_by(Official.role).all()
    staff_stats = {role: count for role, count in staff_counts}
    
    # Total users (officials + residents)
    Resident = models.Resident
    total_officials = db.query(Official).count()
    total_residents = db.query(Resident).count()

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
        "total_users":        total_officials + total_residents,
        "total_officials":    total_officials,
        "total_residents":    total_residents,
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


# ─────────────────────────────────────────────────────────────────────────────
# Agent Location Tracking
# ─────────────────────────────────────────────────────────────────────────────

def get_all_agent_locations(db: Session):
    """Get all agent locations with user details."""
    locations = db.query(gov_models.AgentLocation).options(joinedload(gov_models.AgentLocation.agent)).all()
    result = []
    for loc in locations:
        result.append({
            "id": loc.id,
            "agent_id": loc.agent_id,
            "agent_name": loc.agent.full_name if getattr(loc, 'agent', None) else "Unknown",
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "status": loc.status,
            "accuracy": loc.accuracy,
            "battery_level": loc.battery_level,
            "location_name": loc.location_name,
            "updated_at": loc.updated_at.isoformat() if loc.updated_at else None,
        })
    return result


def get_agent_location(db: Session, agent_id: int):
    """Get location for a specific agent."""
    loc = db.query(gov_models.AgentLocation).options(joinedload(gov_models.AgentLocation.agent)).filter(gov_models.AgentLocation.agent_id == agent_id).first()
    if not loc:
        return None
    return {
        "id": loc.id,
        "agent_id": loc.agent_id,
        "agent_name": loc.agent.full_name if getattr(loc, 'agent', None) else "Unknown",
        "latitude": loc.latitude,
        "longitude": loc.longitude,
        "status": loc.status,
        "accuracy": loc.accuracy,
        "battery_level": loc.battery_level,
        "location_name": loc.location_name,
        "updated_at": loc.updated_at.isoformat() if loc.updated_at else None,
    }


def update_agent_location(
    db: Session,
    agent_id: int,
    latitude: float,
    longitude: float,
    status: str = "available",
    accuracy: float = None,
    battery_level: int = None,
    location_name: str = None,
):
    """Update or create agent location."""
    loc = db.query(gov_models.AgentLocation).filter(gov_models.AgentLocation.agent_id == agent_id).first()
    if loc:
        loc.latitude = latitude
        loc.longitude = longitude
        loc.status = status
        loc.accuracy = accuracy
        loc.battery_level = battery_level
        loc.location_name = location_name
    else:
        loc = gov_models.AgentLocation(
            agent_id=agent_id,
            latitude=latitude,
            longitude=longitude,
            status=status,
            accuracy=accuracy,
            battery_level=battery_level,
            location_name=location_name,
        )
        db.add(loc)
    db.flush()
    return loc


def get_agents_with_work_orders(db: Session):
    """Get all field agents (users with field_worker role) and their work orders."""
    from sqlalchemy import or_
    field_agents = db.query(models.Official).filter(
        models.Official.role.in_(["field_worker", "construction_foreman", "project_engineer"])
    ).all()
    
    result = []
    for agent in field_agents:
        work_orders = db.query(gov_models.WorkOrder).filter(
            gov_models.WorkOrder.assigned_to_id == agent.id,
            gov_models.WorkOrder.status.in_(["assigned", "in_progress"])
        ).all()
        
        loc = db.query(gov_models.AgentLocation).filter(gov_models.AgentLocation.agent_id == agent.id).first()
        
        result.append({
            "agent_id": agent.id,
            "agent_name": agent.full_name,
            "role": agent.role,
            "location": {
                "latitude": loc.latitude if loc else None,
                "longitude": loc.longitude if loc else None,
                "status": loc.status if loc else "offline",
                "updated_at": loc.updated_at.isoformat() if loc and loc.updated_at else None,
            } if loc else None,
            "active_work_orders": [
                {
                    "wo_id": wo.id,
                    "wo_number": wo.wo_number,
                    "title": wo.title,
                    "status": wo.status,
                    "priority": wo.priority,
                }
                for wo in work_orders
            ],
        })
    return result


def promote_work_order_to_project(
    db: Session,
    wo_id: int,
    actor_id: int,
    actor_role: str,
    note: Optional[str] = None
) -> Optional[gov_models.ProjectRequest]:
    """
    Promote a simple Work Order to a full ProjectRequest.
    Often triggered when an assessment shows a 'repair' is actually a full reconstruction.
    """
    wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()
    if not wo:
        return None
    
    # 1. Create the Project
    proj_data = gov_schemas.ProjectRequestCreate(
        title=f"PROMOTED: {wo.title}",
        description=f"Escalated from Work Order {wo.wo_number}. Original: {wo.description}",
        requesting_party="Engineering Dept Escalation",
        barangay=db.query(models.Barangay).filter(models.Barangay.id == wo.barangay_id).first().name if wo.barangay_id else None,
        location_string="Same as source WO",
        estimated_cost=wo.estimated_cost or 0
    )
    
    # Using the existing creator to maintain consistency
    new_proj = create_project_request(db, proj_data, actor_id, actor_role, source_report_id=wo.report_id)
    new_proj.location_lat = wo.location_lat if hasattr(wo, 'location_lat') else None
    new_proj.location_lng = wo.location_lng if hasattr(wo, 'location_lng') else None
    
    # 2. Link WO to Project
    wo.project_id = new_proj.id
    wo.status = "cancelled" # CANCELLED in favor of full project flow
    
    _append_timeline(db, status="cancelled", actor_id=actor_id, note=f"Escalated to Project {new_proj.proj_number}", work_order_id=wo.id)
    _append_audit(db, trigger_type="status_change", action=f"WO {wo.wo_number} Escalated to Project", actor_id=actor_id, work_order_id=wo.id, project_id=new_proj.id)
    
    db.commit()
    db.refresh(new_proj)
    return new_proj

# ─────────────────────────────────────────────────────────────────────────────
# Management Dashboard Support (Archival & Documents)
# ─────────────────────────────────────────────────────────────────────────────

def list_reports_archive(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
):
    """Returns archived citizen reports (resolved, rejected, closed) with search support."""
    from models import Report
    from sqlalchemy import or_
    q = db.query(Report)
    
    if status:
        if "," in status:
            statuses = [s.strip() for s in status.split(",")]
            q = q.filter(Report.status.in_(statuses))
        else:
            q = q.filter(Report.status == status)
    else:
        q = q.filter(Report.status.in_(["resolved", "rejected", "closed"]))
    
    if category:
        q = q.filter(Report.category == category)
        
    if search:
        s = f"%{search}%"
        q = q.filter(or_(
            Report.category.ilike(s),
            Report.description.ilike(s),
            Report.location_string.ilike(s),
            Report.ticket_id.ilike(s)
        ))
        
    return q.order_by(Report.updated_at.desc()).offset(skip).limit(limit).all()

def list_system_documents(db: Session, skip: int = 0, limit: int = 100):
    """Returns all electronic records under the LGU registry."""
    return db.query(gov_models.SystemDocument).order_by(
        gov_models.SystemDocument.uploaded_at.desc()
    ).offset(skip).limit(limit).all()


# ─────────────────────────────────────────────────────────────────────────────
# Tactical Advisories (Management)
# ─────────────────────────────────────────────────────────────────────────────

def create_advisory(
    db: Session,
    data: gov_schemas.AdvisoryCreate,
    author_id: int
) -> models.Advisory:
    """Creates a new public advisory / tactical broadcast."""
    advisory = models.Advisory(
        title=data.title,
        description=data.description,
        category=data.category,
        priority=data.priority,
        department=data.department,
        has_image=data.has_image,
        image_url=data.image_url,
        stats_affected=data.stats_affected,
        author_id=author_id
    )
    db.add(advisory)
    db.commit()
    db.refresh(advisory)

    # Log it
    _append_audit(
        db,
        trigger_type="management",
        action=f"Advisory {advisory.advisory_id} published by manager {author_id}",
        details=f"Title: {advisory.title} | Priority: {advisory.priority}",
        actor_id=author_id,
        actor_role="manager"
    )

    return advisory

def list_advisories(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    category: Optional[str] = None
) -> List[models.Advisory]:
    """Lists published advisories with optional category filter."""
    query = db.query(models.Advisory).options(joinedload(models.Advisory.author))
    
    if category:
        query = query.filter(models.Advisory.category == category)
        
    return query.order_by(models.Advisory.created_at.desc()).offset(skip).limit(limit).all()

def get_advisory_by_id(db: Session, advisory_id: str) -> Optional[models.Advisory]:
    """Retrieves a single advisory by its string UID."""
    return db.query(models.Advisory).filter(models.Advisory.advisory_id == advisory_id).first()

def delete_advisory(db: Session, advisory_id: str, actor_id: int):
    """Deletes an advisory and logs the removal."""
    advisory = get_advisory_by_id(db, advisory_id)
    if advisory:
        db.delete(advisory)
        _append_audit(
            db,
            trigger_type="management",
            action=f"Advisory {advisory_id} deleted",
            actor_id=actor_id,
            actor_role="manager"
        )
        db.commit()
        return True
    return False


# =============================================================================
# Milestone 1: Physical Infrastructure Assets CRUD
# =============================================================================

def normalize_asset_category(category_input: str) -> str:
    """Map singular/plural variations to the 5 standard categories."""
    cat = (category_input or "").strip().lower()
    if cat in ["road", "roads", "pavement", "highway"]:
        return "Roads"
    elif cat in ["drainage", "drain", "culvert", "canal", "sewer"]:
        return "Drainage"
    elif cat in ["bridge", "bridges", "overpass", "flyover"]:
        return "Bridges"
    elif cat in ["public building", "public buildings", "building", "buildings", "hall"]:
        return "Public Buildings"
    elif cat in ["facility", "facilities", "street light", "light", "lights", "park", "plaza"]:
        return "Facilities"
    return (category_input or "Facilities").title()


def get_condition_tier(score: float) -> str:
    if score >= 80.0: return "good"
    elif score >= 60.0: return "fair"
    elif score >= 40.0: return "poor"
    return "critical"


def enrich_asset_response(asset: gov_models.InfrastructureAsset, db: Session) -> gov_schemas.AssetResponse:
    from predictive_engine import calculate_ahs
    score = asset.condition_score if asset.condition_score is not None else calculate_ahs(db, asset.asset_id)
    tier = get_condition_tier(score)
    
    active_wo_count = db.query(func.count(gov_models.WorkOrder.id)).filter(
        gov_models.WorkOrder.asset_id == asset.asset_id,
        gov_models.WorkOrder.status.notin_(["completed", "cancelled"])
    ).scalar() or 0

    last_maint = db.query(func.max(gov_models.MaintenanceHistory.completion_date)).filter(
        gov_models.MaintenanceHistory.asset_id == asset.asset_id
    ).scalar()

    barangay_name = asset.barangay
    district_code = None
    if asset.barangay_ref:
        barangay_name = asset.barangay_ref.name
        if asset.barangay_ref.district:
            district_code = asset.barangay_ref.district.code

    return gov_schemas.AssetResponse(
        asset_id=asset.asset_id,
        asset_name=asset.asset_name,
        category=normalize_asset_category(asset.category),
        gps_coordinates=asset.gps_coordinates,
        material_type=asset.material_type,
        date_completed=asset.date_completed,
        design_life=asset.design_life or 20,
        original_contractor=asset.original_contractor,
        barangay=barangay_name,
        barangay_id=asset.barangay_id,
        barangay_name=barangay_name,
        district_code=district_code,
        condition_score=score,
        condition_tier=tier,
        status=asset.status or "operational",
        active_work_orders_count=active_wo_count,
        last_maintenance_date=last_maint,
        created_at=asset.created_at,
    )


def enrich_asset_detail(asset: gov_models.InfrastructureAsset, db: Session) -> gov_schemas.AssetDetailResponse:
    from predictive_engine import calculate_dv
    base_resp = enrich_asset_response(asset, db)
    dv = calculate_dv(db, asset.asset_id)

    env = None
    if asset.barangay_id:
        env = db.query(gov_models.EnvironmentalContext).filter(
            gov_models.EnvironmentalContext.barangay_id == asset.barangay_id
        ).first()

    maint_logs = db.query(gov_models.MaintenanceHistory).filter(
        gov_models.MaintenanceHistory.asset_id == asset.asset_id
    ).order_by(gov_models.MaintenanceHistory.completion_date.desc()).all()

    maint_resp = [
        gov_schemas.AssetMaintenanceLogResponse(
            log_id=m.log_id,
            asset_id=m.asset_id,
            work_type=m.work_type or "Maintenance",
            cost=m.cost,
            completion_date=m.completion_date
        )
        for m in maint_logs
    ]

    wos = db.query(gov_models.WorkOrder).filter(
        gov_models.WorkOrder.asset_id == asset.asset_id
    ).order_by(gov_models.WorkOrder.created_at.desc()).limit(20).all()

    active_wos_data = [
        {
            "id": w.id,
            "wo_number": w.wo_number,
            "title": w.title,
            "status": w.status,
            "priority": w.priority,
            "scheduled_date": w.scheduled_date.isoformat() if w.scheduled_date else None,
            "assigned_to_name": _name(db, w.assigned_to_id),
            "estimated_cost": w.estimated_cost
        }
        for w in wos
    ]

    projects = [
        {
            "id": p.id,
            "title": p.title,
            "status": p.status,
            "budget": p.budget
        }
        for p in (asset.projects or [])
    ]

    return gov_schemas.AssetDetailResponse(
        **base_resp.model_dump(),
        deterioration_velocity=dv,
        flood_risk_level=env.flood_risk_level if env else "Low",
        soil_subsidence=env.soil_subsidence if env else 0.0,
        maintenance_history=maint_resp,
        active_work_orders=active_wos_data,
        linked_projects=projects
    )


def create_infrastructure_asset(
    db: Session,
    data: gov_schemas.AssetCreate,
    actor_id: int,
    actor_role: str,
) -> gov_models.InfrastructureAsset:
    cat_normalized = normalize_asset_category(data.category)
    
    asset_id = data.asset_id
    if not asset_id:
        prefix = cat_normalized[:2].upper()
        asset_id = f"CAL-{prefix}-{secrets.token_hex(2).upper()}"

    existing = db.query(gov_models.InfrastructureAsset).filter(
        gov_models.InfrastructureAsset.asset_id == asset_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Asset ID '{asset_id}' already exists.")

    barangay_name = data.barangay
    if data.barangay_id:
        brgy = db.query(models.Barangay).filter(models.Barangay.id == data.barangay_id).first()
        if brgy:
            barangay_name = brgy.name

    asset = gov_models.InfrastructureAsset(
        asset_id=asset_id,
        asset_name=data.asset_name,
        category=cat_normalized,
        gps_coordinates=data.gps_coordinates,
        material_type=data.material_type,
        date_completed=data.date_completed,
        design_life=data.design_life,
        original_contractor=data.original_contractor,
        barangay=barangay_name,
        barangay_id=data.barangay_id,
        condition_score=data.condition_score or 100.0,
        status=data.status or "operational",
    )
    db.add(asset)
    db.flush()

    _append_audit(
        db,
        trigger_type="maintenance",
        action=f"Created physical infrastructure asset {asset.asset_id} ({cat_normalized})",
        actor_id=actor_id,
        actor_role=actor_role,
        details=f"Name: {asset.asset_name} | Barangay: {barangay_name}"
    )
    db.commit()
    db.refresh(asset)
    return asset


def list_infrastructure_assets(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    category: Optional[str] = None,
    barangay: Optional[str] = None,
    condition_score: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "asset_id",
    order: Optional[str] = "asc",
) -> List[gov_models.InfrastructureAsset]:
    q = db.query(gov_models.InfrastructureAsset).options(
        joinedload(gov_models.InfrastructureAsset.barangay_ref)
    )

    if category:
        cat_norm = normalize_asset_category(category)
        q = q.filter(or_(
            gov_models.InfrastructureAsset.category.ilike(f"%{cat_norm}%"),
            gov_models.InfrastructureAsset.category.ilike(f"%{category}%")
        ))

    if barangay:
        if barangay.isdigit():
            q = q.filter(or_(
                gov_models.InfrastructureAsset.barangay_id == int(barangay),
                gov_models.InfrastructureAsset.barangay == barangay
            ))
        else:
            q = q.filter(gov_models.InfrastructureAsset.barangay.ilike(f"%{barangay}%"))

    if condition_score:
        cs = condition_score.strip().lower()
        if cs == "critical":
            q = q.filter(gov_models.InfrastructureAsset.condition_score < 40.0)
        elif cs == "poor":
            q = q.filter(gov_models.InfrastructureAsset.condition_score >= 40.0,
                         gov_models.InfrastructureAsset.condition_score < 60.0)
        elif cs == "fair":
            q = q.filter(gov_models.InfrastructureAsset.condition_score >= 60.0,
                         gov_models.InfrastructureAsset.condition_score < 80.0)
        elif cs == "good":
            q = q.filter(gov_models.InfrastructureAsset.condition_score >= 80.0)
        else:
            try:
                score_num = float(cs)
                q = q.filter(gov_models.InfrastructureAsset.condition_score <= score_num)
            except ValueError:
                pass

    if search:
        s = f"%{search}%"
        q = q.filter(or_(
            gov_models.InfrastructureAsset.asset_id.ilike(s),
            gov_models.InfrastructureAsset.asset_name.ilike(s),
            gov_models.InfrastructureAsset.material_type.ilike(s),
            gov_models.InfrastructureAsset.original_contractor.ilike(s)
        ))

    sort_col = getattr(gov_models.InfrastructureAsset, sort_by, gov_models.InfrastructureAsset.asset_id)
    if order == "desc":
        q = q.order_by(sort_col.desc())
    else:
        q = q.order_by(sort_col.asc())

    return q.offset(skip).limit(limit).all()


def get_infrastructure_assets_stats(db: Session) -> gov_schemas.AssetStatsResponse:
    from predictive_engine import calculate_ahs
    all_assets = db.query(gov_models.InfrastructureAsset).all()

    standard_categories = ["Roads", "Drainage", "Bridges", "Public Buildings", "Facilities"]
    category_data = {
        cat: {
            "category_name": cat,
            "total_count": 0,
            "scores": [],
            "condition_breakdown": {"good": 0, "fair": 0, "poor": 0, "critical": 0},
            "active_work_orders": 0,
        }
        for cat in standard_categories
    }

    active_wo_counts = dict(
        db.query(
            gov_models.WorkOrder.asset_id,
            func.count(gov_models.WorkOrder.id)
        ).filter(
            gov_models.WorkOrder.asset_id.isnot(None),
            gov_models.WorkOrder.status.notin_(["completed", "cancelled"])
        ).group_by(gov_models.WorkOrder.asset_id).all()
    )

    total_critical = 0
    all_scores = []

    for asset in all_assets:
        cat = normalize_asset_category(asset.category)
        if cat not in category_data:
            cat = "Facilities"

        score = asset.condition_score
        if score is None:
            score = calculate_ahs(db, asset.asset_id)

        all_scores.append(score)
        category_data[cat]["total_count"] += 1
        category_data[cat]["scores"].append(score)

        tier = get_condition_tier(score)
        category_data[cat]["condition_breakdown"][tier] += 1
        if tier == "critical":
            total_critical += 1

        category_data[cat]["active_work_orders"] += active_wo_counts.get(asset.asset_id, 0)

    cat_stats_dict = {}
    for cat_name, val in category_data.items():
        avg_score = round(sum(val["scores"]) / max(len(val["scores"]), 1), 1)
        cat_stats_dict[cat_name] = gov_schemas.CategoryStats(
            category_name=cat_name,
            total_count=val["total_count"],
            avg_condition_score=avg_score,
            condition_breakdown=gov_schemas.CategoryConditionBreakdown(**val["condition_breakdown"]),
            active_work_orders=val["active_work_orders"],
        )

    overall_avg = round(sum(all_scores) / max(len(all_scores), 1), 1) if all_scores else 100.0
    total_active_wos = sum(active_wo_counts.values())

    return gov_schemas.AssetStatsResponse(
        total_assets=len(all_assets),
        overall_avg_condition=overall_avg,
        total_critical_assets=total_critical,
        total_active_work_orders=total_active_wos,
        categories=cat_stats_dict,
    )


# =============================================================================
# Milestone 1: Work Order Blockers & Separation of Duties Inspections
# =============================================================================

def block_work_order(
    db: Session,
    wo_id: int,
    data: gov_schemas.WorkOrderBlockRequest,
    actor_id: int,
    actor_role: str,
) -> gov_models.WorkOrder:
    wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    if wo.status in ("completed", "cancelled"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot block work order that is already '{wo.status}'."
        )

    prev_status = wo.status
    wo.status = "blocked"

    blocker = gov_models.WorkOrderBlocker(
        work_order_id=wo.id,
        reason_code=data.reason_code,
        delay_days=data.delay_days,
        notes=data.notes,
        blocked_by_id=actor_id,
        is_resolved=False,
    )
    db.add(blocker)

    _append_timeline(
        db,
        status="blocked",
        previous_status=prev_status,
        actor_id=actor_id,
        actor_role=actor_role,
        note=f"Work blocked ({data.reason_code}): +{data.delay_days}d estimated delay. {data.notes or ''}".strip(),
        work_order_id=wo.id,
        report_id=wo.report_id,
        project_id=wo.project_id,
    )

    _append_audit(
        db,
        trigger_type="status_change",
        action=f"Work order {wo.wo_number} marked BLOCKED ({data.reason_code})",
        actor_id=actor_id,
        actor_role=actor_role,
        work_order_id=wo.id,
        details=f"Delay: {data.delay_days} days | Notes: {data.notes}"
    )

    db.commit()
    db.refresh(wo)
    return wo


def unblock_work_order(
    db: Session,
    wo_id: int,
    data: gov_schemas.WorkOrderUnblockRequest,
    actor_id: int,
    actor_role: str,
) -> gov_models.WorkOrder:
    wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    open_blockers = db.query(gov_models.WorkOrderBlocker).filter(
        gov_models.WorkOrderBlocker.work_order_id == wo_id,
        gov_models.WorkOrderBlocker.is_resolved == False
    ).all()

    now_utc = datetime.now(timezone.utc)
    for b in open_blockers:
        b.is_resolved = True
        b.resolved_at = now_utc
        b.resolved_by_id = actor_id
        b.resolution_notes = data.resolution_notes

    next_status = data.next_status or "in_progress"
    prev_status = wo.status
    wo.status = next_status

    _append_timeline(
        db,
        status=next_status,
        previous_status=prev_status,
        actor_id=actor_id,
        actor_role=actor_role,
        note=f"Blocker resolved. Resumed work order ({next_status}). Notes: {data.resolution_notes or 'None'}",
        work_order_id=wo.id,
        report_id=wo.report_id,
        project_id=wo.project_id,
    )

    _append_audit(
        db,
        trigger_type="status_change",
        action=f"Work order {wo.wo_number} UNBLOCKED -> {next_status}",
        actor_id=actor_id,
        actor_role=actor_role,
        work_order_id=wo.id,
        details=data.resolution_notes
    )

    db.commit()
    db.refresh(wo)
    return wo


def verify_work_order_inspection(
    db: Session,
    wo_id: int,
    data: gov_schemas.WorkOrderVerifyRequest,
    inspector_id: int,
    inspector_role: str,
) -> Dict[str, Any]:
    wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    # MANDATORY SEPARATION OF DUTIES ENFORCEMENT
    if wo.assigned_to_id is not None and inspector_id == wo.assigned_to_id:
        raise HTTPException(
            status_code=403,
            detail="Separation of duties violation: Assigned field worker cannot inspect or verify their own work order."
        )

    inspection = gov_models.WorkOrderInspection(
        work_order_id=wo.id,
        inspector_id=inspector_id,
        inspection_date=data.inspection_date or datetime.now(timezone.utc),
        checklist_results=data.checklist_results,
        passed=data.passed,
        notes=data.notes,
        evidence_photo_url=data.evidence_photo_url,
    )
    db.add(inspection)
    db.flush()

    prev_status = wo.status
    if data.passed:
        wo.status = "completed"
        wo.completed_date = datetime.now(timezone.utc)
        timeline_note = f"Independent inspection PASSED (Inspector #{inspector_id}). Work order verified."
        if wo.report_id:
            _sync_report_status(db, wo.report_id, "resolved", inspector_id, inspector_role)
    else:
        wo.status = "rework_required"
        timeline_note = f"Independent inspection FAILED: Rework required. Notes: {data.notes or 'None'}"
        if wo.report_id:
            _sync_report_status(db, wo.report_id, "in_progress", inspector_id, inspector_role)

    _append_timeline(
        db,
        status=wo.status,
        previous_status=prev_status,
        actor_id=inspector_id,
        actor_role=inspector_role,
        note=timeline_note,
        work_order_id=wo.id,
        report_id=wo.report_id,
        project_id=wo.project_id,
    )

    _append_audit(
        db,
        trigger_type="status_change",
        action=f"Work order {wo.wo_number} inspection verification: {'PASSED' if data.passed else 'FAILED'}",
        actor_id=inspector_id,
        actor_role=inspector_role,
        work_order_id=wo.id,
        details=f"Passed: {data.passed} | Notes: {data.notes}"
    )

    db.commit()
    db.refresh(wo)
    db.refresh(inspection)

    return {
        "work_order": enrich_work_order(wo, db),
        "inspection": {
            "id": inspection.id,
            "work_order_id": inspection.work_order_id,
            "inspector_id": inspection.inspector_id,
            "inspector_name": _name(db, inspection.inspector_id),
            "passed": inspection.passed,
            "inspection_date": inspection.inspection_date,
            "notes": inspection.notes,
            "checklist_results": inspection.checklist_results,
        }
    }


# =============================================================================
# Milestone 1: Citizen Report Request-Info Logic
# =============================================================================

def request_citizen_information(
    db: Session,
    report_id: int,
    data: gov_schemas.ReportRequestInfo,
    actor_id: int,
    actor_role: str,
) -> Dict[str, Any]:
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Citizen report not found")

    if report.status in ("resolved", "cancelled", "rejected"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot request information for report in '{report.status}' status."
        )

    prev_status = report.status
    report.status = "needs_information"
    report.updated_at = datetime.now(timezone.utc)

    # 1. Public Process Timeline Entry
    timeline_entry = _append_timeline(
        db,
        status="needs_information",
        previous_status=prev_status,
        actor_id=actor_id,
        actor_role=actor_role,
        note=f"Action Required: [{data.reason}] {data.message}",
        is_public=True,
        report_id=report.id,
    )

    # 2. Resident Notification Dispatch
    ticket = report.ticket_id or f"PUL-{report.id}"
    notif_msg = f"City Engineering requested more information for report {ticket}: {data.message}"
    if report.resident_id:
        notif = models.Notification(
            resident_id=report.resident_id,
            title="Information Needed on Your Report",
            message=notif_msg,
            priority=10
        )
        db.add(notif)
    elif report.contact_email:
        notification_service.log_notification("guest_email", report.contact_email, notif_msg, "request_info")

    # 3. Audit Log Entry
    _append_audit(
        db,
        trigger_type="status_change",
        action=f"Requested citizen information for report {ticket}: {data.reason}",
        actor_id=actor_id,
        actor_role=actor_role,
        details=data.message,
        report_id=report.id,
    )

    db.commit()
    db.refresh(report)

    return {
        "status": "success",
        "report_id": report.id,
        "ticket_id": report.ticket_id,
        "new_status": report.status,
        "timeline_id": timeline_entry.id,
        "message": "Information request sent to citizen successfully."
    }


# =============================================================================
# Milestone 1: Today Operations Hub Logic
# =============================================================================

def format_time_diff(dt, now_utc):
    if not dt:
        return "recently"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now_utc - dt
    total_seconds = int(diff.total_seconds())
    if total_seconds < 3600:
        return f"{max(1, total_seconds // 60)}m ago"
    elif total_seconds < 86400:
        return f"{total_seconds // 3600}h ago"
    else:
        return f"{total_seconds // 86400}d ago"


def get_operations_today_hub(db: Session) -> gov_schemas.GovOperationsTodayResponse:
    now_utc = datetime.now(timezone.utc)
    seven_days_ago = now_utc - timedelta(days=7)

    # 1. Leadership Metrics
    assigned_rows = db.query(gov_models.WorkOrder.report_id).filter(
        gov_models.WorkOrder.report_id.isnot(None),
        gov_models.WorkOrder.assigned_to_id.isnot(None)
    ).all()
    assigned_report_ids = [r[0] for r in assigned_rows if r[0] is not None]

    unassigned_query = db.query(func.count(models.Report.id)).filter(
        models.Report.status.in_(["received", "pending", "under_review", "validated"])
    )
    if assigned_report_ids:
        unassigned_query = unassigned_query.filter(models.Report.id.notin_(assigned_report_ids))
    unassigned_count = unassigned_query.scalar() or 0

    overdue_count = db.query(func.count(gov_models.WorkOrder.id)).filter(
        gov_models.WorkOrder.status.notin_(["completed", "cancelled"]),
        gov_models.WorkOrder.scheduled_date.isnot(None),
        gov_models.WorkOrder.scheduled_date < now_utc
    ).scalar() or 0

    awaiting_count = db.query(func.count(gov_models.WorkOrder.id)).filter(
        gov_models.WorkOrder.status == "awaiting_verification"
    ).scalar() or 0

    open_reports_hp = db.query(func.count(models.Report.id)).filter(
        models.Report.status.notin_(["resolved", "cancelled", "rejected"]),
        or_(models.Report.ai_urgency.in_(["critical", "high"]), models.Report.severity_score >= 7.0)
    ).scalar() or 0
    open_wo_hp = db.query(func.count(gov_models.WorkOrder.id)).filter(
        gov_models.WorkOrder.status.notin_(["completed", "cancelled"]),
        gov_models.WorkOrder.priority.in_(["critical", "high"])
    ).scalar() or 0
    open_hp = open_reports_hp + open_wo_hp

    resolved_7d = db.query(func.count(models.Report.id)).filter(
        models.Report.status == "resolved",
        models.Report.updated_at >= seven_days_ago
    ).scalar() or 0

    metrics = gov_schemas.OperationsLeadershipMetrics(
        unassigned_concerns=unassigned_count,
        overdue_actions=overdue_count,
        awaiting_verification=awaiting_count,
        open_high_priority=open_hp,
        resolved_in_period=resolved_7d,
    )

    # 2. Triage items
    triage_items: List[gov_schemas.OperationsTriageItem] = []

    urgent_reports = db.query(models.Report).filter(
        models.Report.status.in_(["received", "pending", "under_review", "validated"]),
        or_(models.Report.ai_urgency == "critical", models.Report.severity_score >= 8.5)
    ).order_by(models.Report.created_at.asc()).limit(5).all()

    for r in urgent_reports:
        time_ago = format_time_diff(r.created_at, now_utc)
        triage_items.append(gov_schemas.OperationsTriageItem(
            id=r.id,
            entity_type="report",
            ticket_id=r.ticket_id or f"PUL-{r.id}",
            title=r.description[:50] if r.description else "Critical Citizen Report",
            category=r.category or "Civic Concern",
            priority="critical",
            status=r.status,
            barangay=r.location_barangay,
            time_in_state=time_ago,
            action_url=f"/gov/reports/{r.id}",
            recommended_action="Dispatch Emergency Work Order",
        ))

    blocked_wos = db.query(gov_models.WorkOrder).filter(
        gov_models.WorkOrder.status == "blocked"
    ).order_by(gov_models.WorkOrder.updated_at.desc()).limit(5).all()

    for wo in blocked_wos:
        time_ago = format_time_diff(wo.updated_at or wo.created_at, now_utc)
        triage_items.append(gov_schemas.OperationsTriageItem(
            id=wo.id,
            entity_type="work_order",
            ticket_id=wo.wo_number,
            title=wo.title,
            category=wo.category or "Field Repair",
            priority=wo.priority or "normal",
            status="blocked",
            barangay=f"District {wo.district_id}" if wo.district_id else None,
            time_in_state=time_ago,
            action_url=f"/gov/work/{wo.id}",
            recommended_action="Resolve Site Blocker",
        ))

    verify_wos = db.query(gov_models.WorkOrder).filter(
        gov_models.WorkOrder.status == "awaiting_verification"
    ).order_by(gov_models.WorkOrder.updated_at.asc()).limit(5).all()

    for wo in verify_wos:
        time_ago = format_time_diff(wo.updated_at or wo.created_at, now_utc)
        triage_items.append(gov_schemas.OperationsTriageItem(
            id=wo.id,
            entity_type="work_order",
            ticket_id=wo.wo_number,
            title=wo.title,
            category=wo.category or "Field Repair",
            priority=wo.priority or "normal",
            status="awaiting_verification",
            barangay=f"District {wo.district_id}" if wo.district_id else None,
            time_in_state=time_ago,
            action_url=f"/gov/work/{wo.id}",
            recommended_action="Dispatch Independent Inspector",
        ))

    # 3. Sector summary
    all_active_reports = db.query(models.Report).filter(
        models.Report.status.notin_(["resolved", "cancelled", "rejected"])
    ).all()

    def _is_report_north(rep) -> bool:
        if rep.barangay_id:
            b = db.query(models.Barangay).filter(models.Barangay.id == rep.barangay_id).first()
            if b and b.district_id in (2, 3):
                return True
        if rep.location_lat and rep.location_lat >= 14.69:
            return True
        if rep.location_barangay:
            digits = "".join(filter(str.isdigit, str(rep.location_barangay)))
            if digits and int(digits) >= 165:
                return True
        return False

    north_open, south_open = 0, 0
    north_crit, south_crit = 0, 0
    for r in all_active_reports:
        is_north = _is_report_north(r)
        is_crit = (r.ai_urgency == "critical" or (r.severity_score is not None and r.severity_score >= 8.5))
        if is_north:
            north_open += 1
            if is_crit: north_crit += 1
        else:
            south_open += 1
            if is_crit: south_crit += 1

    all_resolved_7d = db.query(models.Report).filter(
        models.Report.status == "resolved",
        models.Report.updated_at >= seven_days_ago
    ).all()
    north_res, south_res = 0, 0
    for r in all_resolved_7d:
        if _is_report_north(r):
            north_res += 1
        else:
            south_res += 1

    all_active_wos = db.query(gov_models.WorkOrder).filter(
        gov_models.WorkOrder.status.notin_(["completed", "cancelled"])
    ).all()
    north_wo, south_wo = 0, 0
    for w in all_active_wos:
        if w.district_id in (2, 3):
            north_wo += 1
        else:
            south_wo += 1

    sector_summary = gov_schemas.SectorSummary(
        north_caloocan=gov_schemas.SectorMetric(
            open_tickets=north_open,
            critical_count=north_crit,
            resolved_7d=north_res,
            active_work_orders=north_wo,
        ),
        south_caloocan=gov_schemas.SectorMetric(
            open_tickets=south_open,
            critical_count=south_crit,
            resolved_7d=south_res,
            active_work_orders=south_wo,
        )
    )

    # 4. Team capacity
    taskforces = [
        {"team_id": "roads_div", "team_name": "Road & Pavement Taskforce", "category": "Road", "base_capacity": 10},
        {"team_id": "drainage_div", "team_name": "North Drainage Maintenance Unit", "category": "Drainage", "base_capacity": 8},
        {"team_id": "lights_div", "team_name": "Streetlight & Electrical Section", "category": "Light", "base_capacity": 8},
        {"team_id": "bldg_div", "team_name": "Public Buildings & Structures", "category": "Building", "base_capacity": 6},
        {"team_id": "bridges_div", "team_name": "Bridge & Overpass Engineering", "category": "Bridge", "base_capacity": 4},
    ]

    team_capacity_list = []
    for tf in taskforces:
        cat_filter = tf["category"]
        active_cnt = db.query(func.count(gov_models.WorkOrder.id)).filter(
            gov_models.WorkOrder.category.ilike(f"%{cat_filter}%"),
            gov_models.WorkOrder.status.in_(["assigned", "in_progress", "awaiting_verification"])
        ).scalar() or 0

        blocked_cnt = db.query(func.count(gov_models.WorkOrder.id)).filter(
            gov_models.WorkOrder.category.ilike(f"%{cat_filter}%"),
            gov_models.WorkOrder.status == "blocked"
        ).scalar() or 0

        personnel_cnt = db.query(func.count(models.Official.id)).filter(
            models.Official.is_active == True,
            models.Official.account_type == "staff"
        ).scalar() or 5

        cap_max = tf["base_capacity"]
        cap_pct = round(min((active_cnt / max(cap_max, 1)) * 100.0, 100.0), 1)

        team_capacity_list.append(gov_schemas.TeamCapacityItem(
            team_id=tf["team_id"],
            team_name=tf["team_name"],
            category=tf["category"],
            active_orders=active_cnt,
            blocked_orders=blocked_cnt,
            personnel_count=personnel_cnt,
            capacity_pct=cap_pct,
        ))

    return gov_schemas.GovOperationsTodayResponse(
        timestamp=now_utc,
        metrics=metrics,
        needs_attention=triage_items,
        sector_summary=sector_summary,
        team_capacity=team_capacity_list,
    )

