import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import gov_models, models

def purge_seed_records():
    db = SessionLocal()
    print("Purging seed registry records...")

    try:
        # 1. Purge Projects
        for proj in db.query(gov_models.ProjectRequest).filter(gov_models.ProjectRequest.proj_number == "PROJ-2025-0101-ABCD").all():
            proj_id = proj.id
            db.query(gov_models.AuditLog).filter(gov_models.AuditLog.project_id == proj_id).delete()
            db.query(gov_models.ProcessTimeline).filter(gov_models.ProcessTimeline.project_id == proj_id).delete()
            db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.project_id == proj_id).delete()
            db.delete(proj)
            print(f"Deleted Project: {proj.proj_number}")

        # 2. Purge OBO
        for obo in db.query(gov_models.OBOInspection).filter(gov_models.OBOInspection.obo_number.in_(["OBO-BP-2025-9999", "OBO-MP-2025-8888"])).all():
            db.delete(obo)
            print(f"Deleted OBO: {obo.obo_number}")

        # 3. Purge Procurement
        for pr in db.query(gov_models.ProcurementRequest).filter(gov_models.ProcurementRequest.pr_number == "PRQ-HE-2025-001X").all():
            pr_id = pr.id
            db.query(gov_models.AuditLog).filter(gov_models.AuditLog.procurement_id == pr_id).delete()
            db.query(gov_models.BoQItem).filter(gov_models.BoQItem.procurement_request_id == pr_id).delete()
            db.delete(pr)
            print(f"Deleted Procurement: {pr.pr_number}")

        db.commit()
        print("Seed registries purged successfully! ✅")
    except Exception as e:
        db.rollback()
        print(f"Error during purge: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    purge_seed_records()
