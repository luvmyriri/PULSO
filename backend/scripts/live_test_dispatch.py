import os
import sys
from sqlalchemy import create_engine, func, desc
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Ensure parent directory is in path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import models, gov_models

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def live_dispatch_test():
    print("--- LIVE DISPATCH INTELLIGENCE TEST ---")
    
    # 1. AI Triage Simulation: Ranking the Queue
    # Formula: (Severity * 0.7) + (TrustScore * 0.3)
    print("Simulating AI Triage Sorting (Top 5 Unvalidated Issues)...")
    
    queue = db.query(models.Report).filter(models.Report.status == "unvalidated").all()
    
    # Custom sort logic
    ranked_queue = sorted(
        queue, 
        key=lambda r: (r.severity_score * 0.7) + (r.citizen_trust_score * 0.3), 
        reverse=True
    )
    
    for i, r in enumerate(ranked_queue[:5]):
        print(f"{i+1}. [{r.kyc_tier_at_report}] {r.category} in District {r.location_lat > 14.69 and '3' or '1/2'}")
        print(f"   Score: {(r.severity_score * 0.7) + (r.citizen_trust_score * 0.3):.1f} | Severity: {r.severity_score} | Trust: {r.citizen_trust_score}")
        print(f"   Summary: {r.ai_summary}")
        print("-" * 30)

    # 2. Engineer Capacity Audit (District 3 Overload)
    print("\nAuditing Engineer Workload Capacity (District 3 Focus)...")
    
    # Find d3 officials
    d3_officers = db.query(models.User).filter(models.User.role != "resident", models.User.district_id == 3).all()
    
    for officer in d3_officers:
        assigned_count = db.query(gov_models.WorkOrder).filter(
            gov_models.WorkOrder.assigned_to_id == officer.id,
            gov_models.WorkOrder.status != "completed"
        ).count()
        
        status = "!!! OVERLOADED" if assigned_count > 3 else "OK AVAILABLE"
        print(f"{officer.full_name} ({officer.role}): {assigned_count} Active Orders [{status}]")

    # 3. NOV Audit (Legal Gating)
    print("\nChecking Notice of Violation (NOV) Legal Lock state...")
    nov_permit = db.query(gov_models.OBOInspection).filter(gov_models.OBOInspection.status == "notice_issued").first()
    if nov_permit:
        print(f"Permit {nov_permit.obo_number} for '{nov_permit.applicant_name}' is LOCKED.")
        print(f"Reason: {nov_permit.findings}")

    print("\n--- TEST COMPLETE: SYSTEM STABLE ---")

if __name__ == "__main__":
    live_dispatch_test()
