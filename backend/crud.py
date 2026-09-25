from sqlalchemy.orm import Session
from sqlalchemy import func, text, or_, case
from sqlalchemy.exc import IntegrityError
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import models, gov_models, schemas
import json
import re

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _append_timeline(
    db: Session,
    status: str,
    previous_status: str = None,
    actor_id: int = None,
    actor_role: str = None,
    note: str = None,
    is_public: bool = True,
    report_id: int = None,
    work_order_id: int = None,
    project_id: int = None,
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
    # commit deferred to caller

# ─────────────────────────────────────────────────────────────────────────────
# Resident CRUD
# ─────────────────────────────────────────────────────────────────────────────

def get_resident(db: Session, resident_id: int):
    return db.query(models.Resident).filter(models.Resident.id == resident_id).first()

def get_resident_by_email(db: Session, email: str):
    return db.query(models.Resident).filter(func.lower(models.Resident.email) == email.lower()).first()

def create_resident(db: Session, resident: schemas.ResidentCreate):
    # Resolve barangay_id and district_id
    barangay_id = resident.barangay_id
    district_id = resident.district_id
    if not barangay_id and hasattr(resident, 'barangay') and resident.barangay:
        brgy_record = db.query(models.Barangay).filter(func.lower(models.Barangay.name) == resident.barangay.lower()).first()
        if brgy_record:
            barangay_id = brgy_record.id
            if not district_id:
                district_id = brgy_record.district_id

    db_resident = models.Resident(
        full_name=resident.full_name,
        email=resident.email,
        phone_number=resident.phone_number,
        password_hash=resident.password,
        address=resident.address,
        barangay_id=barangay_id,
        district_id=district_id
    )
    db.add(db_resident)
    db.commit()
    db.refresh(db_resident)
    return db_resident

# ─────────────────────────────────────────────────────────────────────────────
# Official CRUD
# ─────────────────────────────────────────────────────────────────────────────

def get_official(db: Session, official_id: int):
    return db.query(models.Official).filter(models.Official.id == official_id).first()

def get_official_by_email(db: Session, email: str):
    return db.query(models.Official).filter(func.lower(models.Official.email) == email.lower()).first()

def create_official(db: Session, official: schemas.OfficialCreate):
    db_official = models.Official(
        full_name=official.full_name,
        email=official.email,
        password_hash=official.password,
        display_name=official.display_name,
        role_id=official.role_id,
        account_type=official.account_type,
        primary_jurisdiction=official.primary_jurisdiction
    )
    db.add(db_official)
    db.commit()
    db.refresh(db_official)
    return db_official

# ─────────────────────────────────────────────────────────────────────────────
# Shared / Legacy Auth CRUD (Probes both tables)
# ─────────────────────────────────────────────────────────────────────────────

def get_user(db: Session, user_id: int):
    # Probing both for shared dependencies
    from sqlalchemy.orm import joinedload
    res = db.query(models.Resident).options(joinedload(models.Resident.barangay_ref)).filter(models.Resident.id == user_id).first()
    if res: return res
    off = db.query(models.Official).filter(models.Official.id == user_id).first()
    if off: return off
    return None

def get_user_by_email(db: Session, email: str):
    res = db.query(models.Resident).filter(func.lower(models.Resident.email) == email.lower()).first()
    if res: return res
    off = db.query(models.Official).filter(func.lower(models.Official.email) == email.lower()).first()
    if off: return off
    return None

def update_resident(db: Session, resident_id: int, resident_update: schemas.ResidentUpdate):
    db_resident = db.query(models.Resident).filter(models.Resident.id == resident_id).first()
    if db_resident:
        update_data = resident_update.dict(exclude_unset=True)
        # Handle specialized location logic if needed
        for key, value in update_data.items():
            setattr(db_resident, key, value)
        db.commit()
        db.refresh(db_resident)
    return db_resident

def update_official(db: Session, official_id: int, official_update: schemas.OfficialUpdate):
    db_official = db.query(models.Official).filter(models.Official.id == official_id).first()
    if db_official:
        update_data = official_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_official, key, value)
        db.commit()
        db.refresh(db_official)
    return db_official

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    """Legacy polymorphic update - probes tables and applies shared fields."""
    # Try official first
    db_official = db.query(models.Official).filter(models.Official.id == user_id).first()
    if db_official:
        # Filter fields valid for Official
        update_dict = user_update.dict(exclude_unset=True)
        official_data = {k: v for k, v in update_dict.items() 
                        if hasattr(db_official, k) and k != "barangay"}
        
        # Handle barangay property separately
        if "barangay" in update_dict and str(update_dict["barangay"]).isdigit():
            official_data["barangay_id"] = int(update_dict["barangay"])
            
        for key, value in official_data.items():
            setattr(db_official, key, value)
        db.commit()
        db.refresh(db_official)
        return db_official

    # Fallback to resident
    db_resident = db.query(models.Resident).filter(models.Resident.id == user_id).first()
    if db_resident:
        # Filter fields valid for Resident
        update_dict = user_update.dict(exclude_unset=True)
        resident_data = {k: v for k, v in update_dict.items() 
                        if hasattr(db_resident, k) and k != "barangay"}
        
        # Handle barangay property separately
        if "barangay" in update_dict and str(update_dict["barangay"]).isdigit():
            resident_data["barangay_id"] = int(update_dict["barangay"])
            
        for key, value in resident_data.items():
            setattr(db_resident, key, value)
        db.commit()
        db.refresh(db_resident)
        return db_resident
    
    return None


def get_report(db: Session, report_id: int):
    return db.query(models.Report).filter(models.Report.id == report_id).first()

def get_reports(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Report).order_by(models.Report.created_at.desc()).offset(skip).limit(limit).all()

def get_reports_by_user(db: Session, resident_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Report).filter(
        or_(
            models.Report.resident_id == resident_id,
            models.Report.claimed_by_user_id == resident_id
        )
    ).order_by(models.Report.created_at.desc()).offset(skip).limit(limit).all()

def create_report(
    db: Session,
    report: schemas.ReportCreate,
    resident_id: Optional[int] = None,
    ai_analysis: Optional[dict] = None,
    tracking_token_hash: Optional[str] = None
) -> models.Report:
    from sqlalchemy.exc import IntegrityError
    import logging
    from typing import Optional
    
    attempts = 0
    max_attempts = 5
    
    while attempts < max_attempts:
        try:
            report_data = report.model_dump()
            if tracking_token_hash:
                report_data["tracking_token_hash"] = tracking_token_hash
                
            if ai_analysis:
                report_data["ai_category"] = ai_analysis.get("category")
                report_data["ai_urgency"] = ai_analysis.get("urgency")
                report_data["ai_summary"] = ai_analysis.get("smart_summary")
                report_data["ai_reasoning"] = ai_analysis.get("reasoning")
                report_data["severity_score"] = ai_analysis.get("severity_score", 0.0)
                report_data["ai_metadata"] = json.dumps(ai_analysis) if ai_analysis else None
                
            if not report_data.get("location_barangay"):
                # 1. Try to extract from location_string first (e.g., "Plus Code | Address | Barangay Name")
                loc_str = report_data.get("location_string", "")
                if loc_str and "Barangay" in loc_str:
                    match = re.search(r"(Barangay\s+[^|,]+)", loc_str, re.IGNORECASE)
                    if match:
                        report_data["location_barangay"] = match.group(1).strip()
                
                # 2. Fallback to reporter's home barangay if still missing
                if not report_data.get("location_barangay") and resident_id:
                    res = db.query(models.Resident).filter(models.Resident.id == resident_id).first()
                    if res:
                        if res.barangay_ref:
                            report_data["location_barangay"] = res.barangay_ref.name
                        
                        # Set metadata trust info
                        report_data["kyc_tier_at_report"] = res.kyc_level
                        report_data["citizen_trust_score"] = res.trust_score

            # 3. AUTO-DETECT BARANGAY_ID
            # If we have a location_barangay string, try to find the canonical ID
            if report_data.get("location_barangay"):
                brgy_name = report_data["location_barangay"].lower().replace("barangay", "").strip()
                # Try exact name match or number match
                brgy = db.query(models.Barangay).filter(
                    (func.lower(models.Barangay.name) == brgy_name) | 
                    (models.Barangay.name == report_data["location_barangay"])
                ).first()
                if brgy:
                    report_data["barangay_id"] = brgy.id
            
            # If still missing barangay_id, check if resident has one
            if not report_data.get("barangay_id") and resident_id:
                res = db.query(models.Resident).filter(models.Resident.id == resident_id).first()
                if res and res.barangay_id:
                    report_data["barangay_id"] = res.barangay_id

            if not report_data.get("reporter_type"):
                report_data["reporter_type"] = "registered" if resident_id else "guest"

            new_ticket_id = models.generate_ticket_id()
            db_report = models.Report(**report_data, resident_id=resident_id, ticket_id=new_ticket_id)
            db.add(db_report)
            db.commit()
            db.refresh(db_report)
            
            # Initial Timeline Entry
            _append_timeline(db, report_id=db_report.id, status="pending", note="Report logged and queued for engineering assessment.", is_public=True)
            db.commit()
            
            return db_report
        except IntegrityError as e:
            db.rollback()
            error_msg = str(e).lower()
            # Stricter check: only retry if the TICKET_ID constraint is specifically mentioned
            if "ix_reports_ticket_id" in error_msg or "unique constraint \"reports_ticket_id_key\"" in error_msg or "reports_ticket_id_key" in error_msg:
                attempts += 1
                logging.getLogger(__name__).warning(f"Ticket ID collision detected (msg: {error_msg}). ID: {new_ticket_id}. Retry {attempts}/{max_attempts}")
                continue
            raise e
    
    raise Exception("Critical: Failed to generate a unique ticket_id after 5 attempts. This may indicate a sequence or generator flaw.")

def _create_notification(db: Session, title: str, message: str, resident_id: int = None, official_id: int = None):
    """Helper to create a notification record."""
    db_notification = models.Notification(
        resident_id=resident_id,
        official_id=official_id,
        title=title,
        message=message
    )
    db.add(db_notification)
    db.commit()

def update_report_status(db: Session, report_id: int, status: str, actor_id: int = None, budget: float = None, deployment_date: datetime = None):
    db_report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if db_report:
        previous_status = db_report.status
        db_report.status = status
        if budget is not None:
            db_report.budget = budget
        if deployment_date is not None:
            db_report.deployment_date = deployment_date
        db.commit()
        db.refresh(db_report)
        
        # 1. Process Timeline Log
        timeline_entry = gov_models.ProcessTimeline(
            report_id=db_report.id,
            status=status,
            previous_status=previous_status,
            actor_id=actor_id,
            actor_role="dispatcher" if actor_id else "system",
            created_at=datetime.now(timezone.utc)
        )
        db.add(timeline_entry)
        
        # 2. Immutable Audit Log
        audit_msg = f"Report {db_report.ticket_id} status changed from {previous_status} to {status}."
        if budget is not None:
            audit_msg += f" Budget Allocated: PHP {budget:,.2f}."
        if deployment_date is not None:
            audit_msg += f" Scheduled Deployment: {deployment_date.strftime('%Y-%m-%d')}."

        audit_entry = gov_models.AuditLog(
            trigger_type="status_change",
            report_id=db_report.id,
            actor_id=actor_id,
            action=audit_msg,
            created_at=datetime.now(timezone.utc)
        )
        db.add(audit_entry)
        
        # 3. Automated Trust Score Computation
        # Valid reports build trust, fake or withdrawn reports reduce it.
        user = db.query(models.Resident).filter(models.Resident.id == db_report.resident_id).first()
        if user:
            if user.trust_score is None:
                user.trust_score = 100
                
            # Only apply penalty/reward if status is actually DIFFERENT from before
            if status != previous_status:
                if status == "approved_internal" and previous_status in ["pending", "unverified"]:
                    user.trust_score += 2
                elif status == "resolved" and previous_status != "resolved":
                    user.trust_score += 3
                elif status == "rejected" and previous_status != "rejected":
                    user.trust_score -= 10
                elif status == "cancelled" and previous_status != "cancelled":
                    user.trust_score -= 1
                
                # Clamp between 0 and 100
                user.trust_score = max(0, min(100, user.trust_score))
                db.add(user)
        
        db.commit()
        
        # Notification messages for each status transition
        ticket = db_report.ticket_id or f"PUL-{datetime.now().year}-{db_report.id:04d}"
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
            _create_notification(db, title, message, resident_id=db_report.resident_id)

        # 4. Integration Hook: Automated Asset Resolution & Archival
        if status == "resolved":
            # Find linked work orders to identify the asset
            work_orders = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.report_id == report_id).all()
            for wo in work_orders:
                if wo.asset_id:
                    # a) Add Maintenance History Log (Triggers AHS recovery in predictive engine)
                    maintenance_log = gov_models.MaintenanceHistory(
                        asset_id=wo.asset_id,
                        work_type=wo.category or "Repair",
                        cost=wo.actual_cost or wo.estimated_cost or db_report.budget or 0.0,
                        completion_date=datetime.now(timezone.utc).date()
                    )
                    db.add(maintenance_log)
                    
                    # b) Archive to System Document Registry (Evidence Fingerprinting)
                    # We treat the resolution proof as a 'Survey Report' or 'Final Audit' context
                    resolution_doc = gov_models.SystemDocument(
                        document_type="survey_report",
                        file_name=f"RESOLUTION_PROOF_{db_report.ticket_id}.jpg",
                        file_path=db_report.resolution_image_url or "system_link",
                        category="Infrastructure",
                        target_model="WorkOrder",
                        target_id=wo.id,
                        uploader_id=actor_id,
                        uploaded_at=datetime.now(timezone.utc),
                        metadata_json={
                            "report_ticket": db_report.ticket_id,
                            "asset_id": wo.asset_id,
                            "category": db_report.category,
                            "resolution_status": "Finalized"
                        }
                    )
                    db.add(resolution_doc)
                    
                    # c) Log Asset-Specific Maintenance Audit
                    asset_audit = gov_models.AuditLog(
                        trigger_type="maintenance",
                        report_id=db_report.id,
                        work_order_id=wo.id,
                        actor_id=actor_id,
                        action=f"Maintenance Cycle Finalized: Asset {wo.asset_id} repaired via Report {db_report.ticket_id}. Health Score updated.",
                        created_at=datetime.now(timezone.utc)
                    )
                    db.add(asset_audit)

            db.commit() # Commit all side effects

    return db_report

def confirm_report_resolution(
    db: Session, 
    report_id: int, 
    resident_id: int, 
    rating: int, 
    note: str = None
) -> Optional[models.Report]:
    """
    Allow a resident to confirm a report as resolved and provide feedback.
    Closes the loop for the 'Digital Handshake'.
    """
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.resident_id == resident_id
    ).first()
    
    if not report:
        return None
        
    previous_status = report.status
    report.status = "closed_by_citizen"
    report.citizen_confirmed_at = func.now()
    report.satisfaction_rating = rating
    report.citizen_feedback_note = note
    
    # Reward participation
    res = db.query(models.Resident).filter(models.Resident.id == resident_id).first()
    if res:
        if rating >= 4:
            res.trust_score = min(100, (res.trust_score or 100) + 5)
        elif rating <= 2:
            # Low rating doesn't penalize trust, but we might want to flag for follow-up
            pass
            
    _append_timeline(
        db, 
        status="closed_by_citizen", 
        previous_status=previous_status, 
        report_id=report.id,
        note=f"Citizen confirmed resolution. Rating: {rating}/5. Note: {note[:50] if note else 'None'}"
    )
    
    _append_audit(
        db, 
        trigger_type="citizen_action", 
        action=f"Report {report.ticket_id} confirmed resolved by resident. Rating: {rating}",
        report_id=report.id,
        actor_id=resident_id
    )
    
    db.commit()
    db.refresh(report)
    return report

def upgrade_resident_kyc(
    db: Session, 
    resident_id: int, 
    id_type: str, 
    ocr_data: dict
) -> Optional[models.Resident]:
    """
    Upgrades a resident's KYC tier based on OCR verification results.
    PhilSys IDs grant the highest tier (Gold).
    """
    res = db.query(models.Resident).filter(models.Resident.id == resident_id).first()
    if not res:
        return None
        
    old_tier = res.kyc_level
    
    if id_type == 'philid':
        res.kyc_level = "Gold (PhilSys Verified)"
        # PhilSys verification maximizes trust score
        res.trust_score = 100 
    else:
        res.kyc_level = "Silver (ID Verified)"
        # Standard ID verification boosts trust
        res.trust_score = min(100, (res.trust_score or 100) + 15)
        
    res.last_kyc_verification = func.now()
    res.is_verified = True # Mark as verified once an ID is accepted
    
    # Optional: Update missing fields from OCR
    if not res.address and ocr_data.get('address'):
        res.address = ocr_data.get('address')
    
    db.commit()
    db.refresh(res)
    
    # Log the security-sensitive event
    _append_audit(
        db, 
        trigger_type="security_event", 
        action=f"Resident {res.email} upgraded KYC from {old_tier} to {res.kyc_level}.",
        actor_id=resident_id
    )
    
    return res

def _append_audit(db: Session, trigger_type: str, action: str, actor_id: int, report_id: int = None, work_order_id: int = None, project_id: int = None):
    """Internal helper to log to AuditLog."""
    audit = gov_models.AuditLog(
        trigger_type=trigger_type,
        action=action,
        actor_id=actor_id,
        report_id=report_id,
        work_order_id=work_order_id,
        project_id=project_id
    )
    db.add(audit)
    # commit deferred

def reject_report(db: Session, report_id: int, actor_id: int = None):
    return update_report_status(db, report_id, "rejected", actor_id=actor_id)

def delete_report(db: Session, report_id: int) -> bool:
    """
    Surgically purges a report using raw SQL in strict bottom-up FK order.
    Bypasses the ORM entirely to avoid attribute resolution issues.
    """
    from sqlalchemy import text

    # First confirm the report exists
    exists = db.execute(text("SELECT id FROM reports WHERE id = :rid"), {"rid": report_id}).fetchone()
    if not exists:
        return False

    try:
        # Step 1: Find all work_order IDs linked to this report
        wo_rows = db.execute(text("SELECT id FROM work_orders WHERE report_id = :rid"), {"rid": report_id}).fetchall()
        wo_ids = [row[0] for row in wo_rows]

        # Step 2: Find all procurement_request IDs linked to those work orders
        prq_ids = []
        if wo_ids:
            placeholders = ", ".join(str(i) for i in wo_ids)
            prq_rows = db.execute(text(f"SELECT id FROM procurement_requests WHERE work_order_id IN ({placeholders})")).fetchall()
            prq_ids = [row[0] for row in prq_rows]

        # Step 3: Delete BoQ Items (deepest level, depends on procurement_requests)
        if prq_ids:
            placeholders = ", ".join(str(i) for i in prq_ids)
            db.execute(text(f"DELETE FROM boq_items WHERE procurement_request_id IN ({placeholders})"))

        # Step 4: Delete Procurement Requests
        if prq_ids:
            placeholders = ", ".join(str(i) for i in prq_ids)
            db.execute(text(f"DELETE FROM procurement_requests WHERE id IN ({placeholders})"))

        # Step 5: Delete Audit Logs tied to the report or its work orders
        db.execute(text("DELETE FROM audit_logs WHERE report_id = :rid"), {"rid": report_id})
        if wo_ids:
            placeholders = ", ".join(str(i) for i in wo_ids)
            db.execute(text(f"DELETE FROM audit_logs WHERE work_order_id IN ({placeholders})"))

        # Step 6: Delete Process Timelines tied to the report or its work orders
        db.execute(text("DELETE FROM process_timelines WHERE report_id = :rid"), {"rid": report_id})
        if wo_ids:
            placeholders = ", ".join(str(i) for i in wo_ids)
            db.execute(text(f"DELETE FROM process_timelines WHERE work_order_id IN ({placeholders})"))

        # Step 7: Delete Work Orders
        if wo_ids:
            placeholders = ", ".join(str(i) for i in wo_ids)
            db.execute(text(f"DELETE FROM work_orders WHERE id IN ({placeholders})"))

        # Step 8: Delete OBO Inspections — use SAVEPOINT so a failure doesn't abort the transaction
        try:
            db.execute(text("SAVEPOINT obo_cleanup"))
            db.execute(text("DELETE FROM obo_inspections WHERE source_report_id = :rid"), {"rid": report_id})
            db.execute(text("RELEASE SAVEPOINT obo_cleanup"))
        except Exception as e:
            db.execute(text("ROLLBACK TO SAVEPOINT obo_cleanup"))
            db.execute(text("RELEASE SAVEPOINT obo_cleanup"))
            import logging
            logging.getLogger(__name__).debug(f"obo_inspections skipped (safe): {e}")

        # Step 9: Silently clean up optional/external tables using SAVEPOINTs
        optional_cleanups = [
            "DELETE FROM dispatch_incidents WHERE report_id = :rid",
        ]
        for sql in optional_cleanups:
            try:
                db.execute(text("SAVEPOINT opt_cleanup"))
                db.execute(text(sql), {"rid": report_id})
                db.execute(text("RELEASE SAVEPOINT opt_cleanup"))
            except Exception as e:
                db.execute(text("ROLLBACK TO SAVEPOINT opt_cleanup"))
                db.execute(text("RELEASE SAVEPOINT opt_cleanup"))
                import logging
                logging.getLogger(__name__).debug(f"Optional cleanup skipped: {e}")

        # Step 10: Finally, delete the report itself
        db.execute(text("DELETE FROM reports WHERE id = :rid"), {"rid": report_id})

        db.commit()
        print(f"[SUCCESS] Report {report_id} purged via raw SQL.")
        return True

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Raw SQL Purge Failed for Report {report_id}: {e}")
        return False

def get_report_stats(db: Session) -> dict:
    """Get aggregated report counts by status for KPI dashboard."""
    result = db.execute(text("""
        SELECT status, COUNT(*) as count 
        FROM reports 
        WHERE status != 'cancelled' 
        GROUP BY status
    """)).fetchall()
    
    stats = {row.status: row.count for row in result}
    total = db.execute(text("""
        SELECT COUNT(*) as total FROM reports WHERE status != 'cancelled'
    """)).fetchone()
    stats["total"] = total.total if total else 0
    return stats

def get_notifications(db: Session, resident_id: int = None, official_id: int = None, skip: int = 0, limit: int = 100):
    """
    Retrieves notifications for a specific user, sorted by priority (Level 100 first) 
    and then by recency.
    """
    query = db.query(models.Notification)
    if resident_id:
        query = query.filter(models.Notification.resident_id == resident_id)
    if official_id:
        query = query.filter(models.Notification.official_id == official_id)
        
    return query.order_by(models.Notification.priority.desc(), models.Notification.created_at.desc())\
              .offset(skip).limit(limit).all()

def mark_notifications_read(db: Session, resident_id: int = None, official_id: int = None):
    query = db.query(models.Notification).filter(models.Notification.is_read == False)
    if resident_id:
        query = query.filter(models.Notification.resident_id == resident_id)
    if official_id:
        query = query.filter(models.Notification.official_id == official_id)
    
    query.update({"is_read": True}, synchronize_session=False)
    db.commit()
    return True

def mark_notification_read(db: Session, notification_id: int, resident_id: int = None, official_id: int = None) -> bool:
    """Mark a single notification as read, returning False if not found or not owned."""
    query = db.query(models.Notification).filter(models.Notification.id == notification_id)
    if resident_id:
        query = query.filter(models.Notification.resident_id == resident_id)
    if official_id:
        query = query.filter(models.Notification.official_id == official_id)
        
    db_notif = query.first()
    if not db_notif:
        return False
    db_notif.is_read = True
    db.commit()
    return True

def delete_notification(db: Session, notification_id: int, resident_id: int = None, official_id: int = None) -> bool:
    """Soft delete a single notification."""
    query = db.query(models.Notification).filter(models.Notification.id == notification_id)
    if resident_id:
        query = query.filter(models.Notification.resident_id == resident_id)
    if official_id:
        query = query.filter(models.Notification.official_id == official_id)
        
    db_notif = query.first()
    if not db_notif:
        return False
    db_notif.is_hidden = True
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

# ---------------------------------------------------------------------------
# City News & Announcements CRUD
# ---------------------------------------------------------------------------

def get_news(db: Session, category: Optional[str] = None, page: int = 1, limit: int = 10):
    query = db.query(models.NewsItem)
    
    if category and category.lower() != 'all':
        query = query.filter(models.NewsItem.category.ilike(f"%{category}%"))
    
    # Priority sorting: urgent items pinned first (0), then normal (1), followed by published_at desc
    priority_order = case(
        (models.NewsItem.priority == 'urgent', 0),
        else_=1
    )
    
    total = query.count()
    offset = (page - 1) * limit
    items = query.order_by(priority_order, models.NewsItem.published_at.desc()).offset(offset).limit(limit).all()
    
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

def create_news(db: Session, news_data: schemas.NewsItemCreate, image_url: Optional[str] = None, posted_by: Optional[str] = None):
    data = news_data.model_dump()
    if image_url:
        data["image_url"] = image_url
    if posted_by:
        data["posted_by"] = posted_by
    if not data.get("published_at"):
        from datetime import datetime, timezone
        data["published_at"] = datetime.now(timezone.utc)
        
    db_item = models.NewsItem(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_news(db: Session, news_id: int, update_data: schemas.NewsItemUpdate, image_url: Optional[str] = None):
    db_item = db.query(models.NewsItem).filter(models.NewsItem.id == news_id).first()
    if not db_item:
        return None
    data = update_data.model_dump(exclude_unset=True)
    if image_url:
        data["image_url"] = image_url
    for k, v in data.items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_news(db: Session, news_id: int) -> bool:
    db_item = db.query(models.NewsItem).filter(models.NewsItem.id == news_id).first()
    if not db_item:
        return False
    db.delete(db_item)
    db.commit()
    return True

