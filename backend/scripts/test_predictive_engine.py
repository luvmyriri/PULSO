import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database import SessionLocal
from predictive_engine import calculate_ahs, calculate_dv, calculate_ci, calculate_fvf
from gov_models import InfrastructureAsset

def test_engine():
    db = SessionLocal()
    try:
        asset = db.query(InfrastructureAsset).first()
        if not asset:
            print("No assets found in db.")
            return

        print(f"Testing Predictive Logic for Asset: {asset.asset_id} ({asset.asset_name})")
        print(f"Category: {asset.category}, Barangay: {asset.barangay}")
        
        ahs = calculate_ahs(db, asset.asset_id)
        dv = calculate_dv(db, asset.asset_id)
        ci = calculate_ci(db, asset.asset_id)
        
        brgy = int(asset.barangay) if asset.barangay and asset.barangay.isdigit() else 170
        fvf = calculate_fvf(db, brgy)

        print("-" * 30)
        print(f"Asset Health Score (AHS): {ahs}")
        print(f"Deterioration Velocity (DV): {dv}")
        print(f"Criticality Index (CI): {ci}")
        print(f"Flood Vulnerability Forecast (FVF): {fvf}")
        print("-" * 30)
        print("Success.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_engine()
