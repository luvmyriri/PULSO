import sys
import os
import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import gov_models, gov_crud, gov_schemas, models

def run_records_seed():
    db = SessionLocal()

    import auth
    
    # Ensure users exist (like CE and Resident)
    ce = db.query(models.User).filter(models.User.role == "city_engineer").first()
    if not ce:
        ce = models.User(full_name="Mock CE", email="ce@mock.com", password_hash=auth.get_password_hash("123"), role="city_engineer")
        db.add(ce)
        db.commit()
        db.refresh(ce)

    resident = db.query(models.User).filter(models.User.role == "resident").first()
    if not resident:
        resident = models.User(full_name="Mock Resident", email="resident@mock.com", password_hash=auth.get_password_hash("123"), role="resident")
        db.add(resident)
        db.commit()
        db.refresh(resident)

    print("Seeding localized finalized records...")

    # 1. Provide a finalized Certificate of Completion (Project)
    p = gov_models.ProjectRequest(
        title="Barangay 188 Road Widening Phase 3",
        description="Widening of main arterial road. Officially turned over.",
        requesting_party="Office of the Mayor",
        barangay="Brgy. 188",
        status="closed_completion_certified",
        proj_number="PROJ-2025-0101-ABCD",
        certificate_issued_by_id=ce.id,
        completed_at=datetime.datetime.utcnow(),
    )
    db.add(p)

    # 2. Provide a finalized Building Permit (OBO)
    o = gov_models.OBOInspection(
        applicant_name="SM Prime Holdings Inc.",
        property_address="EDSA Cor. Samson Road",
        inspection_type="building",
        status="permit_issued",
        obo_number="OBO-BP-2025-9999",
        cleared_by_id=ce.id,
        updated_at=datetime.datetime.utcnow(),
    )
    db.add(o)

    # 3. Provide a finalized Mechanical Permit (OBO)
    o2 = gov_models.OBOInspection(
        applicant_name="Caloocan Medical Center",
        property_address="A. Mabini St.",
        inspection_type="mechanical",
        status="cleared",
        obo_number="OBO-MP-2025-8888",
        cleared_by_id=ce.id,
        updated_at=datetime.datetime.utcnow(),
    )
    db.add(o2)

    pr = gov_models.ProcurementRequest(
        title="Procurement of Heavy Equipment (Backhoe & Dump Truck) 2025",
        pr_number="PRQ-HE-2025-001X",
        purpose="Required for fast deployment across northern barangays.",
        status="procured",
        raised_by_id=ce.id,
        approved_by_id=ce.id,
        approved_at=datetime.datetime.utcnow(),
    )
    db.add(pr)

    db.commit()
    print("Seed records successfully generated! ✅")
    db.close()

if __name__ == "__main__":
    run_records_seed()
