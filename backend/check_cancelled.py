import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import DATABASE_URL
import models

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_cancelled():
    db = SessionLocal()
    print("Checking cancelled reports...")
    reports = db.query(models.Report).filter(models.Report.status == "cancelled").all()
    for r in reports:
        print(f"ID: {r.id}, Category: {r.category}, AI Category: {r.ai_category}, Status: {r.status}")
    
    total = db.query(models.Report).count()
    active = db.query(models.Report).filter(models.Report.status != "cancelled").count()
    print(f"Total Unique: {total}")
    print(f"Active (Non-cancelled): {active}")
    db.close()

if __name__ == "__main__":
    check_cancelled()
