
from database import SessionLocal
import gov_crud
import gov_models
from sqlalchemy import delete

def test_smart_gate():
    db = SessionLocal()
    try:
        # Cleanup
        db.execute(delete(gov_models.ProjectRequest).where(gov_models.ProjectRequest.title.like("VERIF%")))
        db.commit()

        # TEST 1: Fast Track (< 50k)
        print("\n[TEST 1] Fast Track (< 50k)")
        p1 = gov_models.ProjectRequest(
            title="VERIF FAST",
            description="Verification project for Fast Track logic",
            estimated_cost=45000,
            is_emergency=False,
            category="roads",
            status="pending_review",
            requesting_party="Test",
            barangay="Test",
            created_by_id=1
        )
        db.add(p1)
        db.commit()
        
        try:
            gov_crud.advance_project_phase(db, p1.id, "design_in_progress", 1, "city_engineer")
        except ValueError as e:
            print(f"Caught expected error: {e}")
            if "FAST TRACK" in str(e) and "3 QUOTATIONS" in str(e):
                print("SUCCESS: Identified Fast Track and missing docs.")
            else:
                print("FAILURE: Incorrect error message.")

        # TEST 2: Standard Track (>= 1M)
        print("\n[TEST 2] Standard Track (>= 1M)")
        p2 = gov_models.ProjectRequest(
            title="VERIF STANDARD",
            description="Verification project for Standard Track logic",
            estimated_cost=1500000,
            is_emergency=False,
            category="roads",
            status="pending_review",
            requesting_party="Test",
            barangay="Test",
            created_by_id=1
        )
        db.add(p2)
        db.commit()
        
        try:
            gov_crud.advance_project_phase(db, p2.id, "design_in_progress", 1, "city_engineer")
        except ValueError as e:
            print(f"Caught expected error: {e}")
            if "STANDARD TRACK" in str(e) and "PHILGEPS" in str(e):
                print("SUCCESS: Identified Standard Track and missing docs.")
            else:
                print("FAILURE: Incorrect error message.")

        # TEST 3: Emergency Track
        print("\n[TEST 3] Emergency Track")
        p3 = gov_models.ProjectRequest(
            title="VERIF EMERGENCY",
            description="Verification project for Emergency Track logic",
            estimated_cost=1500000,
            is_emergency=True,
            category="roads",
            status="pending_review",
            requesting_party="Test",
            barangay="Test",
            created_by_id=1
        )
        db.add(p3)
        db.commit()
        
        try:
            gov_crud.advance_project_phase(db, p3.id, "design_in_progress", 1, "city_engineer")
        except ValueError as e:
            print(f"Caught expected error: {e}")
            if "EMERGENCY TRACK" in str(e) and "NOTICE OF EMERGENCY" in str(e):
                print("SUCCESS: Identified Emergency Track and missing docs.")
            else:
                print("FAILURE: Incorrect error message.")

    finally:
        db.close()

if __name__ == "__main__":
    test_smart_gate()
