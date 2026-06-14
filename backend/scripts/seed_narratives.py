import os
import sys

# Ensure parent directory is in path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Import models
import models, gov_models

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def seed_narratives():
    print("--- Seeding Connected Narratives ---")
    
    # User IDs (Calculated from previous step)
    RESIDENT_ID = 3
    DISPATCHER_ID = 1
    D1_ENGINEER_ID = 12
    D2_ENGINEER_ID = 14
    D3_ENGINEER_ID = 5
    CITY_ENGINEER_ID = 6

    # ---------------------------------------------------------
    # NARRATIVE A: Small-Value Maintenance (Brgy 2, D1)
    # ---------------------------------------------------------
    print("Seeding Narrative A: Brgy 2 Pothole...")
    report_a = models.Report(
        user_id=RESIDENT_ID,
        category="Road Pothole",
        description="Hazardous pothole appearing at the intersection of A. Mabini and C3.",
        location_lat=14.6521,
        location_lng=120.9754,
        location_string="A. Mabini St, Brgy 2, Caloocan South",
        location_barangay="Barangay 2",
        status="verified",
        severity_score=68.5,
        ai_summary="Medium severity road structural damage. Verified via hazard scan.",
        created_at=datetime.now() - timedelta(days=5)
    )
    db.add(report_a)
    db.flush()

    # Create Work Order
    wo_a = gov_models.WorkOrder(
        report_id=report_a.id,
        title="Immediate Pothole Repair - D1-A",
        description="Cold-mix asphalt patch required for safety.",
        priority_score=75.0,
        status="in_progress",
        assigned_to_id=D1_ENGINEER_ID,
        assigned_by_id=DISPATCHER_ID,
        district_id=1,
        assignment_type="territorial",
        created_at=datetime.now() - timedelta(days=4)
    )
    db.add(wo_a)
    db.flush()

    # Update
    update_a = gov_models.WorkOrderUpdate(
        work_order_id=wo_a.id,
        user_id=D1_ENGINEER_ID,
        previous_status="pending",
        new_status="on_site",
        comment="Materials arrived. Starting patch work.",
        created_at=datetime.now() - timedelta(days=2)
    )
    db.add(update_a)

    # ---------------------------------------------------------
    # NARRATIVE B: Large Infra Project (Brgy 180, D3)
    # ---------------------------------------------------------
    print("Seeding Narrative B: Brgy 180 Drainage Modernization...")
    proj_b = gov_models.ProjectRequest(
        title="District 3 Drainage Modernization",
        description="Replacement of aged concrete pipes to mitigate flooding in Camarin.",
        category="drainage",
        is_emergency=False,
        status="active",
        location_lat=14.7562,
        location_lng=121.0543,
        barangay="Barangay 180",
        current_phase=5, # Phase 5: Construction/Dispatched
        created_by_id=CITY_ENGINEER_ID,
        created_at=datetime.now() - timedelta(days=15)
    )
    db.add(proj_b)
    db.flush()

    # Procurement Request (RA 9184 Standard)
    # Note: Link this first to have ID for BoQ
    proc_b = gov_models.ProcurementRequest(
        project_id=proj_b.id,
        title="Procurement of Civil Works - Camarin Drainage",
        status="validated",
        purpose="Replacement of drainage pipes",
        raised_by_id=CITY_ENGINEER_ID,
        created_at=datetime.now() - timedelta(days=5)
    )
    db.add(proc_b)
    db.flush()

    # Create BoQ Items (Casing: BoQItem)
    boq1 = gov_models.BoQItem(
        procurement_request_id=proc_b.id,
        item_name="600mm Reinforced Concrete Pipes",
        quantity=50.0,
        unit="meter",
        unit_cost=4500.0,
        total_cost=225000.0
    )
    boq2 = gov_models.BoQItem(
        procurement_request_id=proc_b.id,
        item_name="Manual Excavation Labor",
        quantity=1.0,
        unit="lot",
        unit_cost=75000.0,
        total_cost=75000.0
    )
    db.add_all([boq1, boq2])
    db.flush()

    # ---------------------------------------------------------
    # NARRATIVE C: Emergency Infrastructure Failure (Brgy 75, D2)
    # ---------------------------------------------------------
    print("Seeding Narrative C: Brgy 75 Sewer Failure (EMERGENCY)...")
    report_c = models.Report(
        user_id=RESIDENT_ID,
        category="Burst Sewer Pipe",
        description="CRITICAL: Main sewer line burst near neighborhood. Foul smell and flooding.",
        location_lat=14.6432,
        location_lng=120.9654,
        location_string="C3 Road Corner, Brgy 75",
        location_barangay="Barangay 75",
        status="verified",
        severity_score=98.0,
        ai_summary="CRITICAL HAZARD: Public health risk. Immediate structural intervention required.",
        created_at=datetime.now() - timedelta(hours=6)
    )
    db.add(report_c)
    db.flush()

    # Audit Log for Level 100 SMS (actor_id instead of user_id)
    audit_c = gov_models.AuditLog(
        actor_id=DISPATCHER_ID,
        action="TRIGGER_SMS_ALERT",
        trigger_type="anomaly",
        report_id=report_c.id,
        details="Level 100 Emergency Protocol Activated. SMS Sent to D2 Response Team.",
        created_at=datetime.now() - timedelta(hours=5)
    )
    db.add(audit_c)
    
    # Jurisdiction Waiver (actor_id instead of user_id)
    waiver_c = gov_models.AuditLog(
        actor_id=CITY_ENGINEER_ID,
        action="LOG_JURISDICTION_WAIVER",
        trigger_type="maintenance",
        report_id=report_c.id,
        details="Emergency Override: Engineer Juan (D3) assigned to D2 sewer failure due to proximity.",
        created_at=datetime.now() - timedelta(hours=4)
    )
    db.add(waiver_c)

    # Emergency Work Order
    wo_c = gov_models.WorkOrder(
        report_id=report_c.id,
        title="EMERGENCY SEWER REPAIR - BRGY 75",
        description="Immediate isolation and excavation.",
        priority_score=100.0,
        status="open",
        assigned_to_id=D3_ENGINEER_ID, # Cross-boundary assignment
        assigned_by_id=CITY_ENGINEER_ID,
        district_id=2, # Target district
        assignment_type="global_override",
        is_emergency_assignment=True,
        created_at=datetime.now() - timedelta(hours=4)
    )
    db.add(wo_c)
    db.flush()
    waiver_c.work_order_id = wo_c.id

    db.commit()
    print("--- Narrative Seeding Complete ---")

if __name__ == "__main__":
    seed_narratives()
