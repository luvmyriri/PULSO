import os
import sys
from datetime import datetime, timedelta
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

def verify_spike():
    print("--- 48-HOUR SPIKE VERIFICATION ---")
    
    now = datetime.now()
    cutoff = now - timedelta(hours=48)
    
    # 1. Total Reports
    total_reports = db.query(models.Report).count()
    spike_reports = db.query(models.Report).filter(models.Report.created_at >= cutoff).count()
    print(f"Reports: {total_reports} total. {spike_reports} created in last 48h.")

    # 2. District 3 Bias
    d3_reports = db.query(models.Report).filter(models.Report.location_lat >= 14.69).count()
    d3_percentage = (d3_reports / total_reports) * 100 if total_reports > 0 else 0
    print(f"District 3 Share: {d3_reports} reports ({d3_percentage:.1f}%).")

    # 3. OBO NOV States
    nov_cases = db.query(gov_models.OBOInspection).filter(gov_models.OBOInspection.status == "notice_issued").count()
    total_obo = db.query(gov_models.OBOInspection).count()
    print(f"OBO: {total_obo} total. {nov_cases} Notice of Violation (NOV) cases detected.")

    # 4. Work Order Emergency Linkage
    emergency_wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.priority == "critical").count()
    print(f"Work Orders: {emergency_wo} Critical assignments in queue.")

    print("--- VERIFICATION COMPLETE ---")

if __name__ == "__main__":
    verify_spike()
