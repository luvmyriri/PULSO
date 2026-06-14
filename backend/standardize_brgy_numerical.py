import sys
import os

# Add the current directory to sys.path so we can import database and models
sys.path.append(os.getcwd())

from database import SessionLocal
from models import Barangay, Report, Official
from gov_models import InfrastructureAsset

BRGY_MAP = {
    "Bagong Silang": "176",
    "Camarin": "175",
    "Tala": "188",
    "Deparo": "168",
    "Bagumbong": "171"
}

db = SessionLocal()
try:
    # 1. Update Barangay table
    print("Updating Barangay table names...")
    brgy_entries = db.query(Barangay).all()
    for b in brgy_entries:
        if b.name in BRGY_MAP:
            old_name = b.name
            b.name = BRGY_MAP[old_name]
            print(f"  Renamed Barangay ID {b.id}: {old_name} -> {b.name}")
        elif not b.name.isdigit():
            # If it's not in our map and not digit, we might need a fallback or just leave it
            # But usually it should be a number
            print(f"  Warning: Barangay ID {b.id} has non-numeric name '{b.name}' and not in map.")

    # 2. Update InfrastructureAsset table
    print("\nUpdating InfrastructureAsset table...")
    assets = db.query(InfrastructureAsset).all()
    for a in assets:
        if a.barangay in BRGY_MAP:
            old = a.barangay
            a.barangay = BRGY_MAP[old]
            print(f"  Updated Asset {a.asset_id}: {old} -> {a.barangay}")
        elif a.barangay and "Barangay" in a.barangay:
            # Handle "Barangay 176" -> "176"
            import re
            match = re.search(r'(\d+)', a.barangay)
            if match:
                old = a.barangay
                a.barangay = match.group(1)
                print(f"  Cleaned Asset {a.asset_id}: {old} -> {a.barangay}")

    # 3. Update Report table
    print("\nUpdating Report table...")
    reports = db.query(Report).all()
    for r in reports:
        if r.location_barangay in BRGY_MAP:
            old = r.location_barangay
            r.location_barangay = BRGY_MAP[old]
            print(f"  Updated Report {r.ticket_id}: {old} -> {r.location_barangay}")
        elif r.location_barangay and "Barangay" in r.location_barangay:
            import re
            match = re.search(r'(\d+)', r.location_barangay)
            if match:
                old = r.location_barangay
                r.location_barangay = match.group(1)
                print(f"  Cleaned Report {r.ticket_id}: {old} -> {r.location_barangay}")

    # 4. Update Official table
    print("\nUpdating Official table...")
    officials = db.query(Official).all()
    for o in officials:
        if o.barangay in BRGY_MAP:
            old = o.barangay
            o.barangay = BRGY_MAP[old]
            print(f"  Updated Official {o.full_name}: {old} -> {o.barangay}")

    db.commit()
    print("\nCommit successful.")
finally:
    db.close()
