import sys
import os
sys.path.append(os.getcwd())
from database import SessionLocal
import models
import schemas
from typing import List

def debug_fetch_reports():
    db = SessionLocal()
    try:
        reports = db.query(models.Report).order_by(models.Report.created_at.desc()).limit(50).all()
        print(f"Successfully fetched {len(reports)} reports from DB.")
        
        # Try to serialize them using schemas.ReportResponse
        for r in reports:
            try:
                # We need to add reporter_name to the dict if from_attributes is used
                # Actually Pydantic v2 from_attributes handles properties automatically
                resp = schemas.ReportResponse.model_validate(r)
                # print(f"Ticket {resp.ticket_id} valid.")
            except Exception as e:
                print(f"FAILED to serialize report ID {r.id}: {e}")
                import traceback
                traceback.print_exc()
                
    except Exception as e:
        print(f"FAILED to fetch reports: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_fetch_reports()
