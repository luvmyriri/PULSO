"""
Seed Analytics-Ready Data
Creates properly clustered reports for analytics to detect stress zones
"""
import sys
import os

# Add backend to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from database import SessionLocal
from models import Report, User
import auth
import random
from datetime import datetime, timedelta

# Key barangays for clustering - will create dense clusters here
CLUSTER_BARANGAYS = {
    "Bagong Silang": {"lat": 14.7685, "lng": 121.0720},
    "Camarin": {"lat": 14.7750, "lng": 121.0580},
    "Deparo": {"lat": 14.7500, "lng": 121.0250},
    "Grace Park": {"lat": 14.7850, "lng": 121.0450},
    "Novaliches": {"lat": 14.7950, "lng": 121.0650},
}

CATEGORIES = [
    "Road Pothole", "Drainage/Flooding", "Street Light", 
    "Public Building", "Illegal Parking", "Garbage Collection"
]

URGENCIES = ["Critical", "High", "Medium", "Low"]

db = SessionLocal()

# Get or create users
users = db.query(User).filter(User.role.in_(["city_engineer", "resident"])).all()
if not users:
    # Create a test user
    user = User(
        email="seed@pulso.com",
        full_name="Seed User",
        role="resident",
        password_hash=auth.get_password_hash("test123"),
        barangay="Bagong Silang",
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.flush()
    users = [user]

print("Creating clustered reports...")

total_created = 0

# Create 15-25 reports per barangay with tight clustering (within 50-100m)
for barangay, coords in CLUSTER_BARANGAYS.items():
    count = random.randint(15, 25)
    for i in range(count):
        # Add small random offset (50-100 meters = ~0.001 lat/lng)
        offset_lat = random.uniform(-0.0008, 0.0008)
        offset_lng = random.uniform(-0.0008, 0.0008)
        
        report = Report(
            ticket_id=f"RPT-CLUSTER-{total_created+1:04d}",
            user_id=random.choice(users).id,
            category=random.choice(CATEGORIES),
            description=f"Issue in {barangay} - Cluster test report #{i+1}",
            location_lat=coords["lat"] + offset_lat,
            location_lng=coords["lng"] + offset_lng,
            location_string=f"{barangay}, Caloocan City",
            location_barangay=barangay,
            status=random.choice(["pending", "approved", "dispatched", "resolved"]),
            ai_category=random.choice(CATEGORIES).lower(),
            ai_urgency=random.choice(URGENCIES),
            ai_summary=f"AI analysis for {barangay} issue",
            severity_score=random.uniform(20, 90),
            created_at=datetime.now() - timedelta(days=random.randint(0, 30))
        )
        db.add(report)
        total_created += 1

db.commit()
print(f"Created {total_created} clustered reports!")

# Verify clusters
from sklearn.cluster import DBSCAN
import numpy as np
from models import Report

reports = db.query(Report).filter(
    Report.location_lat.isnot(None),
    Report.location_lng.isnot(None)
).all()

coords = np.array([[r.location_lat, r.location_lng] for r in reports])
eps_rad = 200 / 6_371_000
db_model = DBSCAN(eps=eps_rad, min_samples=3, algorithm='ball_tree', metric='haversine')
labels = db_model.fit_predict(np.radians(coords))

unique_clusters = set(l for l in labels if l >= 0)
print(f"Detected {len(unique_clusters)} clusters from {len(reports)} reports")

db.close()
print("Done!")