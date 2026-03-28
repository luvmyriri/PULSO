from sqlalchemy.orm import Session
from sqlalchemy import func
import models, gov_models, schemas

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(
        full_name=user.full_name,
        email=user.email,
        phone_number=user.phone_number,
        password_hash=user.password,
        role=user.role,
        address=user.address,
        barangay=user.barangay
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        update_data = user_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_user, key, value)
        db.commit()
        db.refresh(db_user)
    return db_user

def get_report(db: Session, report_id: int):
    return db.query(models.Report).filter(models.Report.id == report_id).first()

def get_reports(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Report).order_by(models.Report.created_at.desc()).offset(skip).limit(limit).all()

def get_reports_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Report).filter(models.Report.user_id == user_id).order_by(models.Report.created_at.desc()).offset(skip).limit(limit).all()

def create_report(db: Session, report: schemas.ReportCreate, user_id: int, ai_analysis: dict = None):
    report_data = report.model_dump()
    if ai_analysis:
        report_data["ai_category"] = ai_analysis.get("category")
        report_data["ai_urgency"] = ai_analysis.get("urgency")
        report_data["ai_summary"] = ai_analysis.get("smart_summary")
        report_data["ai_reasoning"] = ai_analysis.get("reasoning")
        report_data["severity_score"] = ai_analysis.get("severity_score", 0.0)
        
    db_report = models.Report(**report_data, user_id=user_id)
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

def _create_notification(db: Session, user_id: int, title: str, message: str):
    """Helper to create a notification record."""
    db_notification = models.Notification(
        user_id=user_id,
        title=title,
        message=message
    )
    db.add(db_notification)
    db.commit()

def update_report_status(db: Session, report_id: int, status: str, actor_id: int = None):
    db_report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if db_report:
        previous_status = db_report.status
        db_report.status = status
        db.commit()
        db.refresh(db_report)
        
        # 1. Process Timeline Log
        timeline_entry = gov_models.ProcessTimeline(
            report_id=db_report.id,
            status=status,
            previous_status=previous_status,
            actor_id=actor_id,
            actor_role="dispatcher" if actor_id else "system"
        )
        db.add(timeline_entry)
        
        # 2. Immutable Audit Log
        audit_entry = gov_models.AuditLog(
            trigger_type="status_change",
            report_id=db_report.id,
            actor_id=actor_id,
            action=f"Report {db_report.ticket_id} status changed from {previous_status} to {status}"
        )
        db.add(audit_entry)
        db.commit()
        
        # Notification messages for each status transition
        ticket = db_report.ticket_id or f"RPT-{db_report.id}"
        status_messages = {
            "pending_approval": (
                "Report Verified",
                f"Your report {ticket} has been verified by the Command Center and is pending engineering approval."
            ),
            "approved_internal": (
                "Report Approved",
                f"Good news! Your report {ticket} has been approved and is ready for dispatch."
            ),
            "dispatched": (
                "Team Dispatched",
                f"A field team has been dispatched for your report {ticket}. They are on the way."
            ),
            "resolved": (
                "Report Resolved",
                f"Your report {ticket} has been resolved. Thank you for making North Caloocan better!"
            ),
            "rejected": (
                "Report Rejected",
                f"Your report {ticket} could not be verified and has been rejected. If this was an error, please re-submit with clearer details."
            ),
        }
        
        if status in status_messages:
            title, message = status_messages[status]
            _create_notification(db, db_report.user_id, title, message)
            
    return db_report

def reject_report(db: Session, report_id: int, actor_id: int = None):
    return update_report_status(db, report_id, "rejected", actor_id=actor_id)

def delete_report(db: Session, report_id: int) -> bool:
    db_report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not db_report:
        return False
    db.delete(db_report)
    db.commit()
    return True

def get_report_stats(db: Session) -> dict:
    """Get aggregated report counts by status for KPI dashboard."""
    statuses = ["pending", "pending_approval", "approved_internal", "dispatched", "resolved", "rejected"]
    stats = {"total": db.query(models.Report).count()}
    for s in statuses:
        stats[s] = db.query(models.Report).filter(models.Report.status == s).count()
    return stats

def get_notifications_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 20):
    return db.query(models.Notification).filter(models.Notification.user_id == user_id).order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()

def mark_notifications_read(db: Session, user_id: int):
    db.query(models.Notification).filter(
        models.Notification.user_id == user_id, 
        models.Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return True

def mark_notification_read(db: Session, notification_id: int, user_id: int) -> bool:
    """Mark a single notification as read, returning False if not found or not owned."""
    db_notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == user_id
    ).first()
    if not db_notif:
        return False
    db_notif.is_read = True
    db.commit()
    return True

def get_advisories(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Advisory).order_by(models.Advisory.created_at.desc()).offset(skip).limit(limit).all()

def create_advisory(db: Session, advisory: schemas.AdvisoryCreate):
    db_advisory = models.Advisory(**advisory.model_dump())
    db.add(db_advisory)
    db.commit()
    db.refresh(db_advisory)
    return db_advisory

def delete_advisory(db: Session, advisory_id: int) -> bool:
    db_advisory = db.query(models.Advisory).filter(models.Advisory.id == advisory_id).first()
    if not db_advisory:
        return False
    db.delete(db_advisory)
    db.commit()
    return True

# ---------------------------------------------------------------------------
# Government Workflow CRUD (FR-11 Work Orders, FR-10 Audit Logs)
# ---------------------------------------------------------------------------

def get_work_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(gov_models.WorkOrder).order_by(gov_models.WorkOrder.created_at.desc()).offset(skip).limit(limit).all()

def create_work_order(db: Session, wo: schemas.WorkOrderCreate, assigned_by_id: int) -> gov_models.WorkOrder:
    db_wo = gov_models.WorkOrder(
        title=wo.title,
        description=wo.description,
        wo_type=wo.wo_type,
        status=wo.status,
        priority=wo.priority,
        assigned_to_id=wo.assigned_to_id,
        report_id=wo.report_id,
        project_id=wo.project_id,
        assigned_by_id=assigned_by_id
    )
    db.add(db_wo)
    
    # If this is linked to a citizen report, automatically update its status and audit log
    if wo.report_id:
        # Pass actor_id up the chain to audit everything
        update_report_status(db, report_id=wo.report_id, status="dispatched", actor_id=assigned_by_id)

    # FR-10 Immutable Audit Log for Work Order generation
    db.commit()
    db.refresh(db_wo)

    db.add(gov_models.AuditLog(
        trigger_type="maintenance",
        work_order_id=db_wo.id,
        actor_id=assigned_by_id,
        action=f"Created Work Order ({db_wo.wo_number}) assigned to User {wo.assigned_to_id}"
    ))
    db.commit()
    
    return db_wo
