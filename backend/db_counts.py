import os
import sys
# Add backend to path
sys.path.append(r'c:\Apache24\htdocs\PULSO\backend')
from database import SessionLocal
from models import Resident, Report

db = SessionLocal()
try:
    res_count = db.query(Resident).count()
    rpt_count = db.query(Report).count()
    print(f"Residents: {res_count}")
    print(f"Reports: {rpt_count}")
finally:
    db.close()
