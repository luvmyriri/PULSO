from database import SessionLocal, engine
import models
import gov_models
from sqlalchemy import text

def check_db():
    db = SessionLocal()
    try:
        # Citizen tables
        residents = db.query(models.Resident).count()
        officials = db.query(models.Official).count()
        reports = db.query(models.Report).count()
        advisories = db.query(models.Advisory).count()
        notifications = db.query(models.Notification).count()
        
        # Gov tables
        work_orders = db.query(gov_models.WorkOrder).count()
        projects = db.query(gov_models.ProjectRequest).count()
        obo = db.query(gov_models.OBOInspection).count()
        
        # Geographic
        districts = db.query(models.District).count()
        barangays = db.query(models.Barangay).count()
        
        print("=== CITIZEN TABLES ===")
        print(f"Residents: {residents}")
        print(f"Reports: {reports}")
        print(f"Advisories: {advisories}")
        print(f"Notifications: {notifications}")
        
        print("\n=== GOVERNMENT TABLES ===")
        print(f"Officials: {officials}")
        print(f"Work Orders: {work_orders}")
        print(f"Projects: {projects}")
        print(f"OBO Inspections: {obo}")
        
        print("\n=== GEOGRAPHIC ===")
        print(f"Districts: {districts}")
        print(f"Barangays: {barangays}")
        
        # Check agent_locations table
        try:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agent_locations'"))
                tables = list(result)
                print(f"agent_locations table exists: {len(tables) > 0}")
                
            # Check for agent users (Only officials can be agents)
            agent_users = db.query(models.Official).filter(models.Official.role.in_(['field_worker', 'construction_foreman', 'project_engineer'])).count()
            print(f"Agent users (field_worker/foreman/engineer): {agent_users}")
        except Exception as e:
            print(f"Error checking agent tables: {e}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
