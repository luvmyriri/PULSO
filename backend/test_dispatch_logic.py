
import os
import sys
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import gov_models
import gov_crud
import gov_schemas
from datetime import datetime

# Setup MOCK context for testing
def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        db.close()

def test_territorial_routing():
    db = get_db()
    print("\nTEST 1: Territorial Routing (Caloocan District Logic)")
    
    # Barangay 1 is District 1
    lead_d1 = gov_crud.get_territorial_lead(db, 1)
    print(f"Lead for Brgy 1: {lead_d1.full_name if lead_d1 else 'None'}")
    assert lead_d1 and lead_d1.district_id == 1

    # Barangay 176 (Bagong Silang) is District 3
    lead_d3 = gov_crud.get_territorial_lead(db, 176)
    print(f"Lead for Brgy 176: {lead_d3.full_name if lead_d3 else 'None'}")
    assert lead_d3 and lead_d3.district_id == 3

def test_emergency_sms_trigger():
    db = get_db()
    print("\nTEST 2: Level 100 Emergency SMS Activation")
    
    # Create an emergency work order
    data = gov_schemas.WorkOrderCreate(
        title="FIRE HYDRANT BURST - LEVEL 100",
        description="Major flooding threat",
        priority="critical",
        wo_type="repair",
        report_id=1, # Mock report id
        assigned_to_id=12
    )
    
    print("Executing create_work_order with critical priority...")
    # This should trigger _notify_engineering_dept with priority 100
    try:
        wo = gov_crud.create_work_order(db, data, actor_id=6, actor_role="city_engineer")
        print(f"Success: Work Order #{wo.wo_number} created with assignment_type={wo.assignment_type}")
        assert wo.is_emergency_assignment == True
    except Exception as e:
        print(f"FAILED: {e}")
        raise e

def test_jurisdictional_waiver_logging():
    db = get_db()
    print("\nTEST 3: Jurisdictional Waiver / Global Override Logging")
    
    # Brgy 5 is D1. Assign to Engr Juan (D3 lead, ID 5)
    report = models.Report(
        user_id=1,
        category="Cross Boundary Test",
        description="Testing jurisdictional override",
        location_barangay=5,
        status="pending"
    )
    db.add(report)
    db.flush()
    
    data = gov_schemas.WorkOrderCreate(
        title="Cross District Assignment",
        description="Emergency requires D3 lead in D1 area",
        priority="high",
        wo_type="repair",
        report_id=report.id,
        assigned_to_id=5 # Juan is D3
    )
    
    wo = gov_crud.create_work_order(db, data, actor_id=6, actor_role="city_engineer")
    print(f"Work Order Type: {wo.assignment_type}")
    assert wo.assignment_type == "global_override"
    
    # Check Audit Log
    audit = db.query(gov_models.AuditLog).filter(gov_models.AuditLog.trigger_type == "emergency_override").first()
    print(f"Audit Log Detail: {audit.details if audit else 'NONE'}")
    assert audit is not None

def test_signoff_gating():
    db = get_db()
    print("\nTEST 4: Senior Sign-off Gating (Accountability Lock)")
    
    # Create simple project
    proj = gov_models.ProjectRequest(title="Gating Test", status="survey_in_progress")
    db.add(proj)
    db.flush()
    
    print("Attempting to advance to 'survey_complete' as assistant_engineer (should fail)...")
    try:
        gov_crud.advance_project_phase(db, proj.id, "survey_complete", actor_id=7, actor_role="assistant_engineer")
        print("FAILED: Vault was breached by junior role.")
        assert False
    except ValueError as e:
        print(f"SUCCESS: System blocked advance. Error: {e}")
        assert "Accountability Lock" in str(e)

if __name__ == "__main__":
    # Run tests
    test_territorial_routing()
    test_emergency_sms_trigger()
    test_jurisdictional_waiver_logging()
    test_signoff_gating()
    print("\nALL VERIFICATION TESTS PASSED.")
