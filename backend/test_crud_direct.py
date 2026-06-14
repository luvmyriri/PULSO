import sys
import os

# Add the current directory to sys.path to import backend modules
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import crud
import schemas

def test_create_report():
    db = SessionLocal()
    try:
        # Get a test resident
        resident = db.query(models.Resident).first()
        if not resident:
            print("No resident found in DB. Cannot test.")
            return

        print(f"Testing create_report for resident: {resident.email}")
        
        report_in = schemas.ReportCreate(
            category="Roads & Bridges",
            description="TEST REPORT - PLEASE IGNORE",
            location_lat=14.7566,
            location_lng=121.0450,
            location_string="Test Location String",
            location_barangay="Barangay 171"
        )
        
        ai_analysis = {
            "category": "Roads & Bridges",
            "urgency": "Low",
            "severity_score": 2.0,
            "smart_summary": "Test summary",
            "reasoning": "Test reasoning",
            "image_analysis": "No image analysed",
            "is_inappropriate": False,
            "rejection_reason": "",
            "auto_description": "Auto desc"
        }
        
        new_report = crud.create_report(
            db=db,
            report=report_in,
            resident_id=resident.id,
            ai_analysis=ai_analysis,
            image_url=None
        )
        
        print("SUCCESS! Created report with ticket ID:", new_report.ticket_id)
        
    except Exception as e:
        print("FAILED with error:")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_create_report()
