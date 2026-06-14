import os
import sys
import random
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Ensure parent directory is in path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import models
import models
from utils.geometry_utils import is_in_caloocan

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found in environment.")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# --- GEOGRAPHIC BOUNDS (NORTH & SOUTH CALOOCAN) ---
NORTH_BOUNDS = {"lat_min": 14.70, "lat_max": 14.80, "lng_min": 121.01, "lng_max": 121.10}
SOUTH_BOUNDS = {"lat_min": 14.64, "lat_max": 14.66, "lng_min": 120.96, "lng_max": 120.99}

def get_valid_caloocan_coord():
    """Generates a random coordinate and ensures it passes the is_in_caloocan check."""
    max_tries = 50
    for _ in range(max_tries):
        # Pick North or South
        if random.random() > 0.3: # 70% North
            bounds = NORTH_BOUNDS
        else: # 30% South
            bounds = SOUTH_BOUNDS
            
        lat = random.uniform(bounds["lat_min"], bounds["lat_max"])
        lng = random.uniform(bounds["lng_min"], bounds["lng_max"])
        
        if is_in_caloocan(lat, lng):
            return lat, lng
            
    # Fallback to absolute safe points if randomized tries fail
    return (14.7566, 121.0450) # Caloocan North Center fallback

# --- CONFIGURATION ---
CATEGORIES = [
    {"name": "Road Pothole", "keywords": ["hole", "asphalt", "cracked", "bumpy"], "avg_severity": 40},
    {"name": "Bridge Damage", "keywords": ["structural", "crack", "rust", "vibration", "fatigue"], "avg_severity": 85},
    {"name": "Flooding", "keywords": ["water", "stagnant", "drainage", "clogged", "overflow"], "avg_severity": 70},
    {"name": "Street Light", "keywords": ["dark", "dim", "flicker", "broken", "wire"], "avg_severity": 30},
    {"name": "Water Pipe Leak", "keywords": ["leak", "burst", "pressure", "water main"], "avg_severity": 65},
    {"name": "Landslide Risk", "keywords": ["soil", "erosion", "slope", "retaining wall"], "avg_severity": 90},
    {"name": "Canal Blockage", "keywords": ["garbage", "stink", "clogged", "debris"], "avg_severity": 50}
]

STATUSES = ["pending", "unvalidated", "investigating", "dispatched", "resolved"]
URGENCIES = ["low", "medium", "high", "critical"]

def seed_predictive_reports():
    print(f"--- Seeding 100 Varying Reports for Predictive Analytics ---")
    
    # 1. Ensure we have at least one Test Resident
    resident = db.query(models.Resident).first()
    if not resident:
        print("Creating mock resident for reports...")
        resident = models.Resident(
            full_name="Predictive Test Resident",
            email="predictive@caloocan.test",
            password_hash="plain_password",
            is_verified=True,
            kyc_level="Gold (Verified)",
            trust_score=90
        )
        db.add(resident)
        db.commit()
        db.refresh(resident)

    reports = []
    now = datetime.now(timezone.utc)
    
    for i in range(100):
        lat, lng = get_valid_caloocan_coord()
        cat_info = random.choice(CATEGORIES)
        
        # Randomize priority based on category avg_severity
        severity = min(100, max(0, cat_info["avg_severity"] + random.uniform(-20, 20)))
        
        if severity > 80:
            urgency = "critical"
        elif severity > 60:
            urgency = "high"
        elif severity > 30:
            urgency = "medium"
        else:
            urgency = "low"

        # Create realistic description
        keyword = random.choice(cat_info["keywords"])
        desc = f"Observed recurring {keyword} issue at this location. Needs technical inspection."
        if i % 10 == 0:
            desc = f"URGENT: Major {keyword} problem detected. Possible structural risk to surrounding infrastructure."

        # Spreading timestamps over 90 days for trends
        created_at = now - timedelta(days=random.randint(0, 90), hours=random.randint(0, 23))
        
        status = random.choice(STATUSES)
        
        # Mock AI metadata
        ai_meta = {
            "tags": cat_info["keywords"],
            "detected_objects": [random.choice(cat_info["keywords"])],
            "confidence": random.uniform(0.85, 0.99)
        }

        report = models.Report(
            resident_id=resident.id,
            category=cat_info["name"],
            description=desc,
            location_lat=lat,
            location_lng=lng,
            location_string=f"Generated Segment Area {i+1}",
            status=status,
            ai_category=cat_info["name"],
            ai_urgency=urgency,
            severity_score=severity,
            ai_summary=f"Detected {cat_info['name']} with {urgency} urgency.",
            ai_reasoning=f"Automatic classification based on {keyword} sighting.",
            ai_metadata=ai_meta,
            citizen_trust_score=resident.trust_score,
            kyc_tier_at_report=resident.kyc_level,
            created_at=created_at,
            updated_at=created_at + timedelta(hours=random.randint(1, 48))
        )
        reports.append(report)

    db.add_all(reports)
    db.commit()
    print(f"Successfully seeded {len(reports)} reports across North and South Caloocan.")

if __name__ == "__main__":
    seed_predictive_reports()
