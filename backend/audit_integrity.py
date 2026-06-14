from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
from database import engine

def run_audit():
    print("--- PULSO INTEGRITY AUDIT (SEGREGATED IDENTITY) ---")
    
    checks = [
        ("OFFICIAL Role Orphans", 
         "SELECT COUNT(*) FROM officials o LEFT JOIN system_roles sr ON o.role_id = sr.id WHERE o.role_id IS NOT NULL AND sr.id IS NULL"),
        
        ("RESIDENT Barangay Orphans",
         "SELECT COUNT(*) FROM residents r LEFT JOIN barangays b ON r.barangay_id = b.id WHERE r.barangay_id IS NOT NULL AND b.id IS NULL"),
        
        ("RESIDENT District Orphans",
         "SELECT COUNT(*) FROM residents r LEFT JOIN districts d ON r.district_id = d.id WHERE r.district_id IS NOT NULL AND d.id IS NULL"),
        
        ("Report Reporter (Resident) Orphans", 
         "SELECT COUNT(*) FROM reports r LEFT JOIN residents res ON r.resident_id = res.id WHERE r.resident_id IS NOT NULL AND res.id IS NULL"),
        
        ("WorkOrder AssignedTo (Official) Orphans", 
         "SELECT COUNT(*) FROM work_orders w LEFT JOIN officials o ON w.assigned_to_id = o.id WHERE w.assigned_to_id IS NOT NULL AND o.id IS NULL"),
        
        ("WorkOrder AssignedBy (Official) Orphans", 
         "SELECT COUNT(*) FROM work_orders w LEFT JOIN officials o ON w.assigned_by_id = o.id WHERE w.assigned_by_id IS NOT NULL AND o.id IS NULL"),
        
        ("AuditLog Actor (Official) Orphans", 
         "SELECT COUNT(*) FROM audit_logs a LEFT JOIN officials o ON a.actor_id = o.id WHERE a.actor_id IS NOT NULL AND o.id IS NULL"),
        
        ("ProcessTimeline Actor (Official) Orphans", 
         "SELECT COUNT(*) FROM process_timelines p LEFT JOIN officials o ON p.actor_id = o.id WHERE p.actor_id IS NOT NULL AND o.id IS NULL")
    ]

    for label, sql in checks:
        # Use individual sessions to avoid cascading transaction failures
        with engine.connect() as conn:
            try:
                result = conn.execute(text(sql)).scalar()
                status = "PASS" if result == 0 else f"FAIL ({result} orphans)"
                print(f"{label:<40}: {status}")
            except Exception as e:
                print(f"{label:<40}: ERROR ({str(e)[:100]})")

if __name__ == "__main__":
    run_audit()
