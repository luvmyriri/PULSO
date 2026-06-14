import sys
import os

# Add the current directory to sys.path so we can import database and models
sys.path.append(os.getcwd())

from database import SessionLocal
from models import Barangay

db = SessionLocal()
try:
    barangays = db.query(Barangay).all()
    print(f"{'ID':<10} | {'Name':<30} | {'District':<10}")
    print("-" * 60)
    for b in barangays:
        print(f"{b.id:<10} | {b.name:<30} | {b.district_id:<10}")
finally:
    db.close()
