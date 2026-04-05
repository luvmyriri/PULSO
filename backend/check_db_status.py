import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import DATABASE_URL
from gov_models import OBOInspection, ProjectRequest, ProcurementRequest

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_db():
    db = SessionLocal()
    print("Checking database status...")
    obos = db.query(OBOInspection).count()
    projs = db.query(ProjectRequest).count()
    prqs = db.query(ProcurementRequest).count()
    print(f"OBO Inspections: {obos}")
    print(f"Project Requests: {projs}")
    print(f"Procurement Requests: {prqs}")
    db.close()

if __name__ == "__main__":
    check_db()
