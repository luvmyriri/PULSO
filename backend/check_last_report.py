import sys
import os

# Add the current directory to sys.path to import backend modules
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def check_last_report():
    db = SessionLocal()
    try:
        last_report = db.query(models.Report).order_by(models.Report.id.desc()).first()
        if last_report:
            print(f"Last report ID: {last_report.id}")
            print(f"Ticket ID: {last_report.ticket_id}")
            print(f"Created At: {last_report.created_at}")
            print(f"Status: {last_report.status}")
            print(f"Category: {last_report.category}")
        else:
            print("No reports found.")
    finally:
        db.close()

if __name__ == "__main__":
    check_last_report()
