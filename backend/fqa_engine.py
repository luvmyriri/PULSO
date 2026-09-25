from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import uuid
import logging
import gov_models
import citizen_verify_service

def execute_fqa(db: Session, project_id: int) -> dict:
    """
    Executes the Final Quality Audit (FQA).
    Returns a dictionary with the results of the 3 layers:
    - Technical Reconciliation
    - Social Audit
    - Regulatory Completeness
    
    Overall status can be: "PASS", "MINOR_FAIL", "MAJOR_FAIL"
    """
    project = db.query(gov_models.ProjectRequest).filter(gov_models.ProjectRequest.id == project_id).first()
    if not project:
        return {"status": "MAJOR_FAIL", "message": f"ProjectRequest {project_id} not found."}

    # Fetch all documents tied to this Project
    docs = db.query(gov_models.SystemDocument).filter(
        gov_models.SystemDocument.target_model == "ProjectRequest",
        gov_models.SystemDocument.target_id == project_id
    ).all()

    doc_map = {d.document_type: d for d in docs}
    
    issues = []
    major_fail = False

    # ---------------------------------------------------------
    # Layer 1: Technical Reconciliation
    # ---------------------------------------------------------
    as_built = doc_map.get("as_built_plan")
    if not as_built:
        major_fail = True
        issues.append("Missing As-Built Plan. Cannot reconcile design vs actual.")
    
    materials_test = doc_map.get("materials_test")
    if not materials_test:
        major_fail = True
        issues.append("Missing Materials Test Results. Cannot verify structural integrity.")
    else:
        # Simulate an OCR/AI validation from metadata_json
        meta = materials_test.metadata_json or {}
        if meta.get("compression_strength_pass") is False:
            major_fail = True
            issues.append("Materials Test failed required compression/strength thresholds.")

    # ---------------------------------------------------------
    # Layer 2: Social Audit (Resident Satisfaction)
    # ---------------------------------------------------------
    # Since we don't have a full resident voting module yet, we look at any citizen_feedback linked
    # to this work order/project, or just check the ProjectRequest itself.
    # We will simulate the check: if feedback says "dispute", we trigger a minor fail (re-inspection needed).
    # Wait, ProjectRequest doesn't have citizen_feedback, WorkOrders do. Let's find related WorkOrders.
    related_wos = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.project_id == project_id).all()
    disputes = [wo for wo in related_wos if wo.citizen_feedback == "dispute"]
    
    if len(disputes) > 0:
        major_fail = True # Treating social dispute as a Major Fail for LGU transparency
        issues.append(f"Social Audit Failed: {len(disputes)} associated Work Orders have unresolved citizen disputes.")

    # ---------------------------------------------------------
    # Layer 3: Regulatory Completeness
    # ---------------------------------------------------------
    # Check if critical documents have PNPKI digital signatures
    critical_npki_docs = ["contract", "pow", "abc"]
    for doc_type in critical_npki_docs:
        doc = doc_map.get(doc_type)
        if doc and not doc.npki_signature:
            issues.append(f"Regulatory Warning: {doc_type.upper()} requires a valid PNPKI digital signature. Currently unsigned.")
            # In a strict environment, this might be a MAJOR fail. For now, MINOR.
            
    # Calculate DLP (Defects Liability Period) - typically 1 year from Completion
    dlp_end = datetime.now(timezone.utc) + timedelta(days=365)
    
    # ---------------------------------------------------------
    # Final Result Compilation
    # ---------------------------------------------------------
    status = "PASS"
    if major_fail:
        status = "MAJOR_FAIL"
        project.qa_rejection_count += 1
        # Simulate savings: If a $1,000,000 project was caught failing concrete tests,
        # we "saved" the city from liability or rebuild costs. Let's pretend 10% of WO costs.
        total_costs = sum(wo.actual_cost or 0 for wo in related_wos)
        project.fqa_savings += (total_costs * 0.10)
    elif len(issues) > 0: # Minor issues exist but no major flags
        status = "MINOR_FAIL"
        project.qa_rejection_count += 1
    
    if status == "PASS":
        # Automatically set the DLP expiry since we passed
        project.dlp_expiry = dlp_end
        
        # ─────────────────────────────────────────────────────────────────────
        # [Asset Registry Migration] - Final Turnover
        # ─────────────────────────────────────────────────────────────────────
        # If we reach this point, the project is legally and technically sound.
        # We migrate it from a 'Request' to a permanent 'InfrastructureAsset'.
        
        # Check if asset already exists to prevent duplicates
        existing_asset = db.query(gov_models.InfrastructureAsset).filter(
            gov_models.InfrastructureAsset.asset_name == project.title,
            gov_models.InfrastructureAsset.barangay == project.barangay
        ).first()

        if not existing_asset:
            new_asset_id = f"CAL-{project.category[:2].upper()}-{str(uuid.uuid4().int)[:6]}"
            new_asset = gov_models.InfrastructureAsset(
                asset_id=new_asset_id,
                asset_name=project.title,
                category=project.category,
                gps_coordinates={"lat": project.location_lat, "lng": project.location_lng},
                date_completed=datetime.now(timezone.utc).date(),
                barangay=project.barangay,
                original_contractor="LGU Engineering Direct Labor" # Default for now
            )
            db.add(new_asset)
            project.asset_id = new_asset_id
            
            # Create Audit Log entry
            audit = gov_models.AuditLog(
                trigger_type="procurement",
                project_id=project.id,
                action="Handover to Asset Registry",
                details=f"Project {project.proj_number} successfully migrated to Asset Registry as {new_asset_id}."
            )
            db.add(audit)

        # ─────────────────────────────────────────────────────────────────────
        # [Citizen Verification Loop] - Notify original reporters
        # ─────────────────────────────────────────────────────────────────────
        citizen_verify_service.ping_residents_for_completion(db, project_id)

    db.commit()

    return {
        "status": status,
        "issues": issues,
        "dlp_expiry": dlp_end if status == "PASS" else None,
        "fqa_savings": project.fqa_savings
    }
