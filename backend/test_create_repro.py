import sys
from database import SessionLocal
import crud
import schemas
import traceback

def test_create():
    db = SessionLocal()
    try:
        report_dto = schemas.ReportCreate(
            category="Pot Hole",
            description="Large pot hole",
            location_lat=14.75,
            location_lng=121.04
        )
        resident_id = 1 # Assuming resident 1 exists
        report = crud.create_report(db, report_dto, resident_id)
        print("Success created!", report.ticket_id)
        
        # Test serialization
        schema_report = schemas.ReportResponse.model_validate(report, from_attributes=True)
        print("Serialization success:", schema_report.reporter_name)
    except Exception as e:
        print("Failed!")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_create()
