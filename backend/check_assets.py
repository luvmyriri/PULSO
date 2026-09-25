import sys
import os

# Add the current directory to sys.path so we can import database and models
sys.path.append(os.getcwd())

from database import SessionLocal
from gov_models import InfrastructureAsset

db = SessionLocal()
try:
    assets = db.query(InfrastructureAsset).limit(10).all()
    print(f"{'Asset ID':<15} | {'Barangay (Legacy)':<20} | {'Barangay ID':<15}")
    print("-" * 60)
    for a in assets:
        print(f"{a.asset_id:<15} | {str(a.barangay):<20} | {str(a.barangay_id):<15}")
finally:
    db.close()
