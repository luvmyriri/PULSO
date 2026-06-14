import sys
import os
import random
import datetime
import uuid

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database import SessionLocal
from gov_models import InfrastructureAsset, MaintenanceHistory, EnvironmentalContext
from models import Barangay
from utils.geometry_utils import is_in_caloocan

def seed_assets():
    db = SessionLocal()
    try:
        # 1. Ensure some barangays exist
        brgys = db.query(Barangay).all()
        if not brgys:
            print("No barangays found. Creating mock barangays for Caloocan.")
            for i in range(1, 11):
                b = Barangay(name=f"Barangay {i + 170}") # Using typical Caloocan high numbers
                db.add(b)
            db.commit()
            brgys = db.query(Barangay).all()
        
        # 2. Seed EnvironmentalContext for these barangays
        for b in brgys:
            env = db.query(EnvironmentalContext).filter_by(barangay_id=b.id).first()
            if not env:
                env = EnvironmentalContext(
                    barangay_id=b.id,
                    flood_risk_level=random.choice(["Low", "Medium", "High"]),
                    soil_subsidence=random.uniform(0.1, 5.0)
                )
                db.add(env)
        db.commit()
        print(f"Seeded EnvironmentalContext for {len(brgys)} barangays.")

        # 3. Seed InfrastructureAssets
        categories = ["Road", "Bridge", "Drainage", "Public Building", "Street Light"]
        materials = ["Asphalt", "Concrete", "Steel", "Composite"]
        
        assets_created = 0
        attempts = 0
        while assets_created < 50 and attempts < 1000:
            attempts += 1
            # Pick a sector
            if random.random() > 0.4: # 60% North
                lat = random.uniform(14.73, 14.79)
                lng = random.uniform(121.01, 121.08)
            else: # 40% South
                lat = random.uniform(14.63, 14.67) # Adjusted slightly
                lng = random.uniform(120.96, 121.00)
            
            if is_in_caloocan(lat, lng):
                cat = random.choice(categories)
                brgy = random.choice(brgys)
                
                asset_suffix = f"{random.randint(100, 999)}"
                asset_id = f"CAL-{cat[:2].upper()}-{asset_suffix}"
                
                # Check if asset_id exists
                if db.query(InfrastructureAsset).filter_by(asset_id=asset_id).first():
                    continue

                asset = InfrastructureAsset(
                    asset_id=asset_id,
                    asset_name=f"{cat} {asset_suffix}",
                    category=cat,
                    gps_coordinates={"lat": lat, "lng": lng},
                    material_type=random.choice(materials),
                    date_completed=datetime.date.today() - datetime.timedelta(days=random.randint(365, 365*20)),
                    design_life=random.choice([10, 20, 30, 50]),
                    original_contractor="LGU Engineering" if random.random() > 0.5 else "Private Corp",
                    barangay=str(brgy.id),
                    barangay_id=brgy.id
                )
                db.add(asset)
                
                # 4. Seed MaintenanceHistory for this asset
                num_logs = random.randint(0, 5)
                for _ in range(num_logs):
                    log = MaintenanceHistory(
                        log_id=str(uuid.uuid4()),
                        asset_id=asset_id,
                        work_type=random.choice(["Patching", "Declogging", "Retrofitting", "Repainting"]),
                        cost=random.uniform(5000, 150000),
                        completion_date=datetime.date.today() - datetime.timedelta(days=random.randint(1, 250))
                    )
                    db.add(log)
                
                assets_created += 1
                if assets_created % 10 == 0:
                    print(f"Created {assets_created} assets...")
        
        db.commit()
        print(f"Successfully seeded {assets_created} assets and their maintenance history.")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding assets: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_assets()
