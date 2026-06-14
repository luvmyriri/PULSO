from sqlalchemy.orm import Session
import gov_models
import models
import notification_service

def ping_residents_for_completion(db: Session, project_id: int):
    """
    Identifies all citizens who reported issues that were aggregated into this project.
    Sends them an official notification to verify the quality of work.
    """
    # 1. Find all Work Orders associated with this project
    work_orders = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.project_id == project_id).all()
    
    # 2. Extract unique report IDs
    report_ids = set([wo.report_id for wo in work_orders if wo.report_id is not None])
    
    if not report_ids:
        print(f"[VERIFY] No associated citizen reports found for project {project_id}.")
        return
    
    # 3. Notify each original reporter
    # We fetch the reports to get the user_id
    notified_users = set()
    for rid in report_ids:
        report = db.query(models.Report).filter(models.Report.id == rid).first()
        if report and report.user_id:
            # Probing identity across Official and Resident tables
            user = db.query(models.Official).filter(models.Official.id == report.user_id).first()
            if not user:
                user = db.query(models.Resident).filter(models.Resident.id == report.user_id).first()

            if user and user.id not in notified_users:
                msg = (
                    f"Hi {user.full_name}! The infrastructure repair you reported in {user.barangay} is now 100% COMPLETE. "
                    "Please open the PULSO app to verify the quality of the finish and rate our field engineers. "
                    "Thank you for helping us build a better North Caloocan!"
                )
                # Dispatch Push Notification / Log to audit
                notification_service.log_notification("citizen", str(user.id), msg, "citizen_verification")
                notified_users.add(user.id)
                
    print(f"[VERIFY] Notified {len(notified_users)} unique residents for project {project_id}.")
