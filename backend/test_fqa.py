import os
from database import SessionLocal
import gov_models
import models
import fqa_engine
import gov_crud
from fastapi import UploadFile
import uuid

def run_tests():
    db = SessionLocal()

    # 1. Ensure we have a City Engineer official or create a mock
    actor = db.query(models.Official).filter(models.Official.role == "city_engineer").first()
    if not actor:
        actor = models.Official(full_name="Test Engineer", email="eng@test.com", password_hash="hash", role="city_engineer")
        db.add(actor)
        db.commit()
        db.refresh(actor)

    # 2. Create a mock ProjectRequest
    project = gov_models.ProjectRequest(title="Test FQA Failure", description="Test", created_by_id=actor.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    print(f"Created Mock Project ID: {project.id}")

    # 3. Test attempting to advance WITHOUT documents (should raise ValueError)
    print("\n--- Testing Document Gates ---")
    try:
        gov_crud.advance_project_phase(db, project.id, "design_in_progress", actor.id, actor.role)
        print("FAIL: Advance succeeded without documents!")
    except ValueError as e:
        print(f"PASS: Caught expected error: {e}")

    # 4. Upload mock documents
    print("\n--- Uploading Mock Documents ---")
    
    docs_to_create = ["survey_report", "topo_map", "design_plans", "pow", "abc", "job_order", "quotations_3", "ntp", "contract", "as_built_plan", "materials_test", "final_photo"]
    for doc_type in docs_to_create:
        doc = gov_models.SystemDocument(
            document_type=doc_type,
            file_path=f"/fake/path/{doc_type}.pdf",
            file_name=f"{doc_type}.pdf",
            sha256_hash=uuid.uuid4().hex,
            target_model="ProjectRequest",
            target_id=project.id,
            uploader_id=actor.id,
            npki_signature=True,
            metadata_json={"compression_strength_pass": False} if doc_type == "materials_test" else {}
        )
        db.add(doc)
    db.commit()
    print("Mock documents created.")

    # 5. Advance all the way to resolved
    print("\n--- Advancing Project Statuses ---")
    statuses = ["survey_in_progress", "design_in_progress", "approved_by_city_engineer", "in_progress", "resolved"]
    for s in statuses:
        gov_crud.advance_project_phase(db, project.id, s, actor.id, actor.role)
        print(f"Advanced to {s}")

    # 6. Test FQA Execution during closed_completion_certified
    print("\n--- Testing Final Quality Audit (FQA) Transition ---")
    try:
        gov_crud.advance_project_phase(db, project.id, "closed_completion_certified", actor.id, actor.role)
        print(f"FAIL: Advanced to closed_completion_certified via FQA despite failed materials test!")
    except ValueError as e:
        print(f"PASS: FQA correctly threw error: {e}")

    # Display Project Metadata
    db.refresh(project)
    print(f"\nFinal Project State:")
    print(f"qa_rejection_count: {project.qa_rejection_count}")
    print(f"fqa_savings: {project.fqa_savings}")
    print(f"dlp_expiry: {project.dlp_expiry}")

if __name__ == "__main__":
    run_tests()