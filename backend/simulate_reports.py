import os
import sys
import requests
from dotenv import load_dotenv

# Add backend to path
sys.path.append(r'c:\Apache24\htdocs\PULSO\backend')
load_dotenv(r'c:\Apache24\htdocs\PULSO\backend\.env')

API_URL = "http://localhost:8000/api"

def simulate_report_submissions():
    # 1. Login or get a token for a resident (Barangay 171)
    # We'll try to find an existing resident or just use one of the test accounts if they exist.
    # Actually, I'll just use the backend CRUD directly to create reports to avoid auth setup.
    
    from sqlalchemy.orm import Session
    from database import SessionLocal
    import models, schemas, crud
    
    db = SessionLocal()
    try:
        # Get a resident (any will do, but let's find one)
        resident = db.query(models.Resident).first()
        if not resident:
            print("No resident found in DB. Please create one or seed.")
            return

        # Coordinates for Barangay 171
        coords = [
            (14.75252, 121.02629, "Pothole in middle of the road near the market"),
            (14.75260, 121.02640, "Broken drainage causing minor flooding"),
            (14.75240, 121.02610, "Clogged canal needs declogging")
        ]
        
        for lat, lng, desc in coords:
            # We'll simulate the geocoding resolving to Barangay 171
            # In a real scenario, the frontend does this.
            address = "Barangay 171, Caloocan" 
            
            report_in = schemas.ReportCreate(
                category="infrastructure",
                description=desc,
                location_lat=lat,
                location_lng=lng,
                location_string=address,
                location_barangay="171"
            )
            
            new_report = crud.create_report(db, report_in, resident.id)
            print(f"Created report {new_report.ticket_id} at {address}")
            
        print("Success: Simulated 3 reports in Barangay 171.")
        
    finally:
        db.close()

if __name__ == "__main__":
    simulate_report_submissions()
