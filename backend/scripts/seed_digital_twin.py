import sys
import os
import random
import uuid
import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database import SessionLocal
from gov_models import InfrastructureAsset, MaintenanceHistory, EnvironmentalContext

def seed_data():
    db = SessionLocal()
    try:
        print("Seeding Environmental Context (Barangays 170-188 - North Caloocan)...")
        for brgy in range(170, 189):
            exists = db.query(EnvironmentalContext).filter_by(barangay_id=brgy).first()
            if not exists:
                env = EnvironmentalContext(
                    barangay_id=brgy,
                    flood_risk_level=random.choice(["Low", "Medium", "High"]),
                    soil_subsidence=round(random.uniform(0.1, 5.0), 2)
                )
                db.add(env)
        db.commit()

        print("Seeding 1,000 Infrastructure Assets for North Caloocan...")
        materials = ["Concrete", "Asphalt", "Steel", "PVC", "Mixed"]
        categories = ["Road", "Bridge", "Drainage", "Building", "Light"]
        contractors = ["BuildSmart Inc.", "MetroPave Corp.", "Northern Builders", "QuickFix Const.", "Caloocan Constructors"]
        streets = ["Zapote St.", "Camarin Road", "Langit Road", "Deparo Road", "Congress Congressional", "Susano Road", "Tala Road"]

        assets_created = 0
        current_date = datetime.date.today()

        for i in range(1000):
            asset_id = f"CAL-D3-{str(uuid.uuid4())[:8].upper()}"
            category = random.choice(categories)
            street = random.choice(streets)
            brgy = str(random.randint(170, 188))
            
            # Weighted dates to create more maintenance needed items
            days_ago = random.randint(30, 7300) # up to 20 years
            date_completed = current_date - datetime.timedelta(days=days_ago)
            
            asset = InfrastructureAsset(
                asset_id=asset_id,
                asset_name=f"{street} Segment {random.randint(1, 100)}",
                category=category,
                gps_coordinates={"lat": round(14.75 + random.uniform(-0.05, 0.05), 5), "lng": round(121.03 + random.uniform(-0.05, 0.05), 5)},
                material_type=random.choice(materials),
                date_completed=date_completed,
                design_life=random.choice([10, 15, 20, 25, 50]), # Years
                original_contractor=random.choice(contractors),
                barangay=brgy
            )
            db.add(asset)
            assets_created += 1

            # Optionally add some historical maintenance
            if random.random() > 0.5: # 50% chance of having a record
                num_records = random.randint(1, 5)
                for _ in range(num_records):
                    log_date = date_completed + datetime.timedelta(days=random.randint(30, max(31, days_ago)))
                    if log_date > current_date:
                        log_date = current_date

                    log = MaintenanceHistory(
                        asset_id=asset_id,
                        work_type=random.choice(["Patching", "Declogging", "Retrofitting", "Repainting", "General Overhaul"]),
                        cost=round(random.uniform(5000, 500000), 2),
                        completion_date=log_date
                    )
                    db.add(log)
                    
            if i % 100 == 0:
                db.commit() # batch commit

        db.commit()
        print(f"Successfully seeded {assets_created} assets and their corresponding histories.")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
