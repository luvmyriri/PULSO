import os
import sys
from sqlalchemy import create_engine, func
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

def verify_rework():
    print("--- STRATEGIC REWORK VERIFICATION ---")
    
    # 1. User Tiers
    gold_count = db.query(models.User).filter(models.User.kyc_level == "Gold (Verified)").count()
    bronze_count = db.query(models.User).filter(models.User.kyc_level == "Bronze (Self-Signed)").count()
    print(f"Users: {gold_count} Gold, {bronze_count} Bronze.")

    # 2. Asset Alerts (Tala Hospital Bridge should be 'Old')
    tala = db.query(gov_models.InfrastructureAsset).filter(gov_models.InfrastructureAsset.asset_id == "CAL-BR-TALA-HOSP").first()
    if tala:
        age = 2026 - tala.date_completed.year
        print(f"Asset Check: {tala.asset_name} is {age} years old (Life: {tala.design_life}).")
        if age >= tala.design_life:
            print("ALERT: Structural Retrofitting Due detected.")

    # 3. OBO Connectivity
    obo = db.query(gov_models.OBOInspection).first()
    if obo and obo.engineering_clearance_id:
        print(f"OBO Check: Permit {obo.obo_number} successfully linked to Engineering Clearance {obo.engineering_clearance_id}.")
        print(f"Signatures: {obo.review_signatures}")

    # 4. Report Priorities (Triage Sort)
    top_report = db.query(models.Report).order_by(models.Report.citizen_trust_score.desc()).first()
    if top_report:
        print(f"Triage Check: Top report trust score is {top_report.citizen_trust_score} (Tier: {top_report.kyc_tier_at_report}).")

    print("--- VERIFICATION COMPLETE ---")

if __name__ == "__main__":
    verify_rework()
