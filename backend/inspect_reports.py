import os
from dotenv import load_dotenv
load_dotenv()
from database import SessionLocal, DATABASE_URL
import models
print(f"Connecting to: {DATABASE_URL}")
db = SessionLocal()
count = db.query(models.Report).count()
print(f"Total reports: {count}")
reports = db.query(models.Report).limit(10).all()
for r in reports:
    print(f"ID: {r.id}, Ticket: {r.ticket_id}, Status: {r.status}, Resident: {r.resident_id}, Brgy: {r.location_barangay}")
db.close()
