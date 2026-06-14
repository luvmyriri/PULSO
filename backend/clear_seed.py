from database import SessionLocal
import models, gov_models

def clear_seeded_data():
    db = SessionLocal()
    
    print("Clearing all seeded data (dependency-aware order)...")
    
    try:
        # 1. Clear leaf/dependent gov tables
        db.query(gov_models.BoQItem).delete()
        db.query(gov_models.AuditLog).delete()
        db.query(gov_models.ProcessTimeline).delete()
        db.query(gov_models.WorkOrderUpdate).delete()
        db.query(gov_models.WorkOrderApproval).delete()
        db.query(gov_models.ProcurementRequest).delete()
        
        # 2. Clear major gov operational entities
        db.query(gov_models.OBOInspection).delete()
        db.query(gov_models.WorkOrder).delete()
        db.query(gov_models.ProjectRequest).delete()
        
        # 3. Clear infrastructure and environmental context
        db.query(gov_models.MaintenanceHistory).delete()
        db.query(gov_models.InfrastructureAsset).delete()
        db.query(gov_models.EnvironmentalContext).delete()
        db.query(gov_models.AgentLocation).delete()
        db.query(gov_models.SystemDocument).delete()

        # 4. Clear citizen-facing dependent data
        db.query(models.Notification).delete()
        db.query(models.Advisory).delete()
        
        # 5. Clear main entities
        db.query(models.Report).delete()
        db.query(models.Resident).delete()

        db.commit()
        print("Done! Database is now clean of seed data.")
    except Exception as e:
        db.rollback()
        print(f"Error clearing data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_seeded_data()