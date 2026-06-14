import os
import sys
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Ensure parent directory is in path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import models, gov_models

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def generate_random_coord(district):
    if district == 3: # North Caloocan Box
        lat = random.uniform(14.69, 14.81)
        lng = random.uniform(121.00, 121.13)
    else: # South/Central Caloocan Box
        lat = random.uniform(14.63, 14.67)
        lng = random.uniform(120.95, 121.00)
    return lat, lng

def seed_mass_spike():
    print("--- STARTING 48-HOUR SPIKE SIMULATION ---")
    
    # 1. Fetch some users to act as reporters and officials
    power_reporters = db.query(models.User).filter(models.User.kyc_level == "Gold (Verified)").all()
    noise_users = db.query(models.User).filter(models.User.kyc_level == "Bronze (Self-Signed)").all()
    officials = db.query(models.User).filter(models.User.role != "resident").all()
    
    if not power_reporters or not noise_users:
        print("Error: Base users not found. Run seed_master_strategic.py first.")
        return

    now = datetime.now()
    
    # 2. Generate 100+ Reports with District 3 Bias (65%)
    print(f"Generating 100 reports (Spike Period: {now - timedelta(hours=48)} to {now})...")
    
    categories = ["Drainage/Flooding", "Road/Pothole", "Streetlight/Electrical", "Waste Management", "Public Building"]
    reports = []
    
    for i in range(100):
        # District Selection (65% D3)
        district = 3 if random.random() < 0.65 else random.randint(1, 2)
        lat, lng = generate_random_coord(district)
        
        # Reporter Selection (Mix of Gold and Bronze)
        is_gold = random.random() < 0.2
        user = random.choice(power_reporters if is_gold else noise_users)
        
        # Spike Timing
        created_at = now - timedelta(hours=random.randint(0, 48), minutes=random.randint(0, 59))
        
        category = random.choice(categories)
        is_critical = "Flooding" in category or random.random() < 0.1
        
        report = models.Report(
            user_id=user.id,
            category=category,
            description=f"Automated Spike Report #{i}: {category} issue in District {district}.",
            location_lat=lat,
            location_lng=lng,
            location_barangay=f"Brgy {random.randint(176, 188)}" if district == 3 else f"Brgy {random.randint(1, 100)}",
            status="unvalidated",
            citizen_trust_score=user.trust_score,
            kyc_tier_at_report=user.kyc_level,
            severity_score=random.uniform(70, 95) if is_critical else random.uniform(20, 60),
            ai_summary="URGENT SPIKE: Severe infrastructure failure detected." if is_critical else "Routine concern observed.",
            created_at=created_at,
            updated_at=created_at
        )
        db.add(report)
        reports.append(report)
    
    db.commit()
    print("Reports seeded. Linking Work Orders and OBO Permits...")

    # 3. Generate 30 Work Orders (Emergency Response)
    for i in range(30):
        parent_report = random.choice(reports)
        official = random.choice(officials)
        
        # Temporal consistency: Work order created shortly after report
        wo_created = parent_report.created_at + timedelta(hours=random.randint(1, 6))
        
        work_order = gov_models.WorkOrder(
            report_id=parent_report.id,
            assigned_by_id=random.choice(officials).id,
            assigned_to_id=official.id,
            title=f"Spike Resolution: {parent_report.category}",
            description=f"Rapid response dispatch for {parent_report.ticket_id}",
            priority="critical" if parent_report.severity_score > 80 else "normal",
            status=random.choice(["assigned", "in_progress", "completed"]),
            created_at=wo_created
        )
        db.add(work_order)
    
    # 4. OBO Diversity (15-20% Notice of Violation)
    print("Seeding 15 OBO Permits with NOV failure cases...")
    
    signatures = {
        "architectural": "Ar. Ricardo 'Ricky' Santos, UAP - Chief, Architectural Division",
        "structural": "Engr. Maria Clara Reyes, PICE - Lead Structural Engineer",
        "electrical": "Engr. Antonio Luna, REE - Supervising Electrical Engineer"
    }

    for i in range(15):
        district = 3 if random.random() < 0.7 else random.randint(1, 2)
        lat, lng = generate_random_coord(district)
        
        is_nov = random.random() < 0.20 # 20% NOV
        
        obo = gov_models.OBOInspection(
            applicant_name=f"Developer Group {i}",
            property_address=f"Phase {random.randint(1, 9)}, Bagong Silang, Caloocan",
            location_lat=lat,
            location_lng=lng,
            barangay=f"Brgy {random.randint(176, 188)}" if district == 3 else "Brgy 12",
            inspection_type="building",
            status="notice_issued" if is_nov else "permit_issued",
            is_compliant=not is_nov,
            findings="FAILED INSPECTION: Unauthorized structural deviation from approved FLS plans." if is_nov else "COMPLIANT: All structural elements match the submitted blue-print.",
            violation_details="NOTICE OF VIOLATION (NOV): Immediate suspension of construction. Remediation required for Setback violation." if is_nov else None,
            review_signatures=signatures,
            created_at=now - timedelta(hours=random.randint(1, 48))
        )
        db.add(obo)

    db.commit()
    print("--- SPIKE SIMULATION COMPLETE ---")

if __name__ == "__main__":
    seed_mass_spike()
