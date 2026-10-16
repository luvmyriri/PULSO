import os
import sys
import uuid
import random
import json
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Ensure parent directory is in path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import models
import models, gov_models

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found in environment.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# --- CONSTANTS ---
CALOOCAN_NORTH_BOX = {"lat_min": 14.69, "lat_max": 14.81, "lng_min": 121.00, "lng_max": 121.13}
CALOOCAN_SOUTH_BOX = {"lat_min": 14.63, "lat_max": 14.67, "lng_min": 120.95, "lng_max": 121.00}

def get_random_coord(box):
    return random.uniform(box["lat_min"], box["lat_max"]), random.uniform(box["lng_min"], box["lng_max"])

# --- DIVISION CHIEFS (Authentic Personnel) ---
OFFICIALS = {
    "architectural": {"name": "Ar. Ricardo Santos", "title": "Ar. Ricardo 'Ricky' Santos, UAP – Chief, Architectural Division"},
    "structural": {"name": "Engr. Maria Clara Reyes", "title": "Engr. Maria Clara Reyes, PICE – Lead Structural Engineer"},
    "electrical": {"name": "Engr. Antonio Luna", "title": "Engr. Antonio Luna, REE – Supervising Electrical Engineer"}
}

def clear_all_data():
    print("--- Clearing All System Data (Cascading) ---")
    tables = [
        "boq_items", "procurement_requests", "work_order_updates", 
        "work_order_approvals", "work_orders", "system_documents", 
        "process_timelines", "audit_logs", "notifications", "advisories", 
        "reports", "project_requests", "agent_locations", "infrastructure_assets",
        "maintenance_history", "obo_inspections", "residents", "officials"
    ]
    with engine.connect() as conn:
        for table in tables:
            try:
                conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;"))
            except:
                pass
        conn.commit()

def seed_users():
    print("--- Seeding Authentic Users & KYC Tiers ---")
    
    # 1. Government Officials
    gov_users = []
    # City Engineer
    city_eng = models.Official(
        full_name="Engr. Teodora P. San Juan",
        email="city.engineer@caloocan.gov.ph",
        password_hash="plain_password", # Should be hashed in real app
        role="city_engineer",
        display_name="City Engineer / Department Head",
        account_type="staff",
        is_active=True
    )
    gov_users.append(city_eng)

    # Division Chiefs (as requested)
    for key, data in OFFICIALS.items():
        user = models.Official(
            full_name=data["name"],
            email=f"{key}.chief@caloocan.gov.ph",
            password_hash="plain_password",
            role="lead_engineer",
            display_name=data["title"],
            account_type="staff",
            is_active=True
        )
        gov_users.append(user)

    # Field Agents (D1, D2, D3)
    for d in [1, 2, 3]:
        agent = models.Official(
            full_name=f"Engr. Field Agent District {d}",
            email=f"agent.d{d}@caloocan.gov.ph",
            password_hash="plain_password",
            role="assistant_engineer",
            display_name=f"Engineer I / District {d} Field Team",
            is_active=True
        )
        gov_users.append(agent)

    db.add_all(gov_users)
    db.flush()

    # 2. Power Reporters (Gold KYC - 15 users)
    power_reporters = []
    for i in range(15):
        pr = models.Resident(
            full_name=f"Power User {i+1}",
            email=f"power_user{i+1}@gmail.com",
            password_hash="plain_password",
            is_verified=True,
            kyc_level="Gold (Verified)",
            trust_score=95 + random.randint(0, 5)
        )
        power_reporters.append(pr)
    
    # 3. Synthetic Noise (Bronze KYC - 40 users)
    noise_users = []
    for i in range(40):
        nu = models.Resident(
            full_name=f"Resident {i+100}",
            email=f"noise_user{i+100}@yahoo.com",
            password_hash="plain_password",
            is_verified=False,
            kyc_level="Bronze (Self-Signed)",
            trust_score=50 + random.randint(0, 20)
        )
        noise_users.append(nu)

    db.add_all(power_reporters + noise_users)
    db.commit()
    print(f"Created {len(gov_users)} Officials, 15 Power Reporters, 40 Noise Users.")
    return city_eng, gov_users, power_reporters, noise_users

def seed_assets():
    print("--- Seeding Historical Infrastructure (North Caloocan) ---")
    assets = [
        {
            "id": "CAL-RD-DEPARO-004",
            "name": "Deparo-Camarin Road (Segment 4)",
            "cat": "Road",
            "year": 2014,
            "material": "Asphalt",
            "desc": "High-traffic arterial segment.",
            "life": 10,
            "lat": 14.7432, "lng": 121.0342
        },
        {
            "id": "CAL-BR-TALA-HOSP",
            "name": "Tala Leprosarium Hospital Bridge",
            "cat": "Bridge",
            "year": 2012,
            "material": "Steel",
            "desc": "Critical access bridge for regional hospital.",
            "life": 15,
            "lat": 14.7765, "lng": 121.0567
        },
        {
            "id": "CAL-PU-BSPS-001",
            "name": "Bagong Silang Main Pumping Station",
            "cat": "Pumping Station",
            "year": 2016,
            "material": "Mechanical/Steel",
            "desc": "Primary flood control asset for District 3.",
            "life": 20,
            "lat": 14.7891, "lng": 121.0654
        },
        {
            "id": "CAL-RD-AMPARO-NP",
            "name": "Amparo Nature Park Access Road",
            "cat": "Road",
            "year": 2018,
            "material": "Concrete",
            "desc": "Residential growth zone feeder road.",
            "life": 25,
            "lat": 14.7654, "lng": 121.0432
        },
        {
            "id": "CAL-RD-CONG-EXT",
            "name": "Congressional Road Extension (North)",
            "cat": "Road",
            "year": 2015,
            "material": "Asphalt/Concrete",
            "desc": "Main expansion artery from 2015 era.",
            "life": 10,
            "lat": 14.7321, "lng": 121.0212
        }
    ]

    infra_assets = []
    for a in assets:
        asset = gov_models.InfrastructureAsset(
            asset_id=a["id"],
            asset_name=a["name"],
            category=a["cat"],
            date_completed=datetime(a["year"], 1, 1).date(),
            design_life=a["life"],
            material_type=a["material"],
            gps_coordinates={"lat": a["lat"], "lng": a["lng"]},
            barangay="Barangay 176" if "Bagong" in a["name"] else "Barangay 180"
        )
        infra_assets.append(asset)
        db.add(asset)
        db.flush()

        # Seed 10-Year Maintenance History (Simulating Deterioration Velocity)
        for y in range(a["year"] + 4, 2026, 3):
            cost = 50000 * (y - a["year"]) # Increasing cost over time
            log = gov_models.MaintenanceHistory(
                asset_id=a["id"],
                work_type="Routine Patching" if a["cat"] == "Road" else "Structural Inspection",
                cost=float(cost),
                completion_date=datetime(y, 6, 15).date()
            )
            db.add(log)

    db.commit()
    print(f"Seeded 5 Major Assets with 10-year maintenance velocity.")

def seed_narrative_obo(city_eng, officials):
    print("--- Seeding OBO Narrative (Private-to-Public Gate) ---")
    architect = next(u for u in officials if "Santos" in u.full_name)
    structural = next(u for u in officials if "Reyes" in u.full_name)
    electrical = next(u for u in officials if "Luna" in u.full_name)

    # 1. Drainage Capacity Clearance (Engineering Side)
    drainage_proj = gov_models.ProjectRequest(
        title="OBO Verification: Brgy 171 Commercial Drainage Load",
        description="Hydrodynamic assessment for proposed 5-story building.",
        category="drainage",
        status="active",
        location_lat=14.7321, location_lng=121.0212,
        created_by_id=city_eng.id
    )
    db.add(drainage_proj)
    db.flush()

    # 2. OBO Permit Flow
    obo = gov_models.OBOInspection(
        obo_number="CAL-BP-2026-001",
        applicant_name="SM Development Corp",
        property_address="Quirino Highway, Brgy 171",
        location_lat=14.7320, location_lng=121.0210,
        inspection_type="building",
        status="permit_issued",
        arch_review="cleared",
        civil_review="cleared",
        elec_review="cleared",
        engineering_clearance_id=drainage_proj.id, # The "Public-to-Private" Link
        review_signatures={
            "architectural": architect.display_name,
            "structural": structural.display_name,
            "electrical": electrical.display_name
        },
        findings="Drainage capacity verified by Engineering Dept (Ref: PRJ-1). All architectural clearances met."
    )
    db.add(obo)
    
    # Audit trail for the sign-off
    db.add(gov_models.AuditLog(
        actor_id=architect.id,
        action="OBO_SIGN_OFF",
        trigger_type="maintenance",
        details=f"Architectural Plan approved for OBO {obo.obo_number}"
    ))

    db.commit()
    print("OBO Narrative seeded: Linked permit to drainage capacity check.")

def seed_noise_reports(power_users, noise_users):
    print("--- Seeding Triage Noise (55 Reports) ---")
    
    # 1. Authentic "Power" Reports (Narrated)
    for i, user in enumerate(power_users):
        is_critical = (i == 0) # Make the first report critical (Tala Bridge)
        report = models.Report(
            resident_id=user.id,
            category="Bridge Damage" if is_critical else "Road Pothole",
            description="URGENT: Structural fatigue visible on main hospital bridge." if is_critical else "Deep pothole causing accidents.",
            location_lat=14.7765 if is_critical else random.uniform(14.63, 14.81),
            location_lng=121.0567 if is_critical else random.uniform(120.95, 121.13),
            status="unvalidated",
            severity_score=95.0 if is_critical else random.uniform(30, 70),
            citizen_trust_score=user.trust_score, # Gold trust
            kyc_tier_at_report=user.kyc_level,
            ai_summary="Potentially critical structural failure." if is_critical else "Routine road maintenance required."
        )
        db.add(report)

    # 2. Synthetic Noise (Bronze)
    for user in noise_users:
        report = models.Report(
            resident_id=user.id,
            category=random.choice(["Street Light", "Garbage Collection", "Illegal Parking", "Graffiti"]),
            description="Please fix this immediately, it has been days.",
            location_lat=random.uniform(14.63, 14.81),
            location_lng=random.uniform(120.95, 121.13),
            status="unvalidated",
            severity_score=random.uniform(10, 40),
            citizen_trust_score=user.trust_score, # Bronze trust
            kyc_tier_at_report=user.kyc_level
        )
        db.add(report)

    db.commit()
    print("Seeded 55 mixed-tier reports for triage pressure testing.")

if __name__ == "__main__":
    if os.getenv("PULSO_ALLOW_DESTRUCTIVE_SEED") != "true":
        raise SystemExit("Refusing broad seed. Set PULSO_ALLOW_DESTRUCTIVE_SEED=true explicitly.")
    clear_all_data()
    city_eng, officials, power, noise = seed_users()
    seed_assets()
    seed_narrative_obo(city_eng, officials)
    seed_noise_reports(power, noise)
    print("\n--- STRATEGIC DATA REWORK COMPLETE ---")
