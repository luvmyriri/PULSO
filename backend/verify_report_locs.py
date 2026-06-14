import os
import sys
import json
# Add backend to path
sys.path.append(r'c:\Apache24\htdocs\PULSO\backend')
from database import SessionLocal
import models

# We won't call the actual router because it requires auth
# but we can simulate the logic of the endpoint

def check_analytics_reports():
    db = SessionLocal()
    try:
        reports = db.query(models.Report).order_by(models.Report.created_at.desc()).limit(10).all()
        
        print(f"{'ID':<5} | {'Lat':<10} | {'Lng':<10} | {'Location String':<30} | {'Barangay':<10}")
        print("-" * 80)
        for r in reports:
            print(f"{r.id:<5} | {str(r.location_lat):<10} | {str(r.location_lng):<10} | {str(r.location_string):<30} | {str(r.location_barangay):<10}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_analytics_reports()
