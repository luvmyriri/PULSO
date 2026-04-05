import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import DATABASE_URL
import models

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_reports():
    db = SessionLocal()
    print("--- Detailed Report Audit ---")
    reports = db.query(models.Report).all()
    for r in reports:
        print(f"ID: {r.id}")
        print(f"  Ticket:   {r.ticket_id}")
        print(f"  Status:   {r.status}")
        print(f"  Category: {r.category}")
        print(f"  AI Cat:   {r.ai_category}")
        print("-" * 20)
    db.close()

if __name__ == "__main__":
    check_reports()
