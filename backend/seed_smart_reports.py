import sys
import os
import random
import datetime
import json

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
import gov_models

def seed_smart_reports():
    db = SessionLocal()

    print("\n" + "="*60)
    print("  PULSO — Seeding High-Quality AI Training & Test Data")
    print("="*60)

    # 1. ACQUIRE ACTORS
    resident = db.query(models.User).filter(models.User.role == "resident").first()
    if not resident:
        # Fallback to ANY user if no resident
        resident = db.query(models.User).first()
        if not resident:
            print("  [ERR] No users found in database.")
            return

    admin = db.query(models.User).filter(models.User.role == "system_admin").first()
    admin_id = admin.id if admin else 1
    
    field_worker = db.query(models.User).filter(models.User.role == "field_worker").first()
    field_worker_id = field_worker.id if field_worker else admin_id

    # 2. DEFINITIONS
    base_lat = 14.7566
    base_lng = 121.0450

    issues = [
        {
            "cat": "Road Issue", 
            "ai_cat": "Infrastructure", 
            "desc": "Severe asphalt degradation and deep potholes causing traffic hazards.", 
            "urgency": "High", 
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Pothole.jpg/800px-Pothole.jpg",
            "score": 8.5
        },
        {
            "cat": "Flooding", 
            "ai_cat": "Water/Drainage", 
            "desc": "Massive gutter overflow and street flooding reaching curb height.", 
            "urgency": "Critical", 
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Flooded_street.jpg/800px-Flooded_street.jpg",
            "score": 9.2
        },
        {
            "cat": "Electrical", 
            "ai_cat": "Public Safety", 
            "desc": "Exposed high-voltage wiring and sagging utility lines near a school zone.", 
            "urgency": "Critical", 
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Downed_power_lines.jpg/800px-Downed_power_lines.jpg",
            "score": 10.0
        },
        {
            "cat": "Waste Mgmt", 
            "ai_cat": "Sanitation", 
            "desc": "Illegal dumping site causing foul odors and blocking pedestrian pathways.", 
            "urgency": "Medium", 
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Garbage_on_the_street.jpg/800px-Garbage_on_the_street.jpg",
            "score": 5.5
        },
        {
            "cat": "Water Leak", 
            "ai_cat": "Water Issue", 
            "desc": "Major main pipe rupture resulting in significant water loss and low pressure.", 
            "urgency": "High", 
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Water_leak.jpg/800px-Water_leak.jpg",
            "score": 7.8
        }
    ]

    statuses = ["unverified", "pending", "approved_internal", "dispatched", "resolved"]

    print(f"  [START] Generating 150 clustered scenarios for Resident: {resident.email}")

    # Create 3 "hotspots" to trick DBSCAN into finding dense critical zones at 200m radius
    hotspots = [
        {"center_lat": 14.7520, "center_lng": 121.0400, "barangay": 176, "cat": "Road Issue", "desc_prefix": "Deep cratering over a 50m stretch.", "urgency": "High", "score": 8.5},
        {"center_lat": 14.7610, "center_lng": 121.0510, "barangay": 178, "cat": "Flooding", "desc_prefix": "Severe drainage blockage causing thigh-deep floods.", "urgency": "Critical", "score": 9.5},
        {"center_lat": 14.7485, "center_lng": 121.0350, "barangay": 171, "cat": "Electrical", "desc_prefix": "Multiple blown transformers and downed lines.", "urgency": "Critical", "score": 9.8}
    ]

    for i in range(150):
        # 70% of points hit a hotspot, 30% are random noise
        is_hotspot = random.random() < 0.70
        
        if is_hotspot:
            spot = random.choice(hotspots)
            issue_cat = spot["cat"]
            issue = next(item for item in issues if item["cat"] == issue_cat)
            
            # Very tight grouping: ~50-100 meters offset
            lat = spot["center_lat"] + random.uniform(-0.0005, 0.0005)
            lng = spot["center_lng"] + random.uniform(-0.0005, 0.0005)
            brgy_str = f"Phase {random.randint(1,4)}, Brgy {spot['barangay']}, Caloocan North"
            base_desc = spot["desc_prefix"] + " " + issue["desc"]
        else:
            issue = random.choice(issues)
            # Wide random spread
            lat = base_lat + random.uniform(-0.04, 0.04)
            lng = base_lng + random.uniform(-0.04, 0.04)
            brgy_str = f"Phase {random.randint(1,9)}, Brgy {random.randint(170,188)}, Caloocan North"
            base_desc = issue["desc"]
            
        status = random.choice(statuses)

        # Create Report
        meta = {
            "vision_confidence": round(random.uniform(0.85, 0.98), 2),
            "structural_impact": "high" if issue["urgency"] in ["High", "Critical"] else "moderate",
            "environment_check": "passed",
            "calification_id": f"AI-{random.randint(100,999)}"
        }

        # Backdate reports logically over the last 60 days to trigger Weekly Forecast trends
        days_back = random.randint(1, 60)
        simulated_date = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=days_back)

        report = models.Report(
            user_id=resident.id,
            category=issue["cat"],
            description=base_desc,
            location_lat=lat,
            location_lng=lng,
            location_string=brgy_str,
            image_url=issue["url"],
            status=status,
            ai_summary=f"PULSO AI verified: {issue['urgency']} severity {issue['cat'].lower()} detected via vision analysis.",
            ai_category=issue["ai_cat"],
            ai_urgency=issue["urgency"],
            severity_score=issue["score"],
            ai_metadata=json.dumps(meta),
            created_at=simulated_date,
            updated_at=simulated_date + datetime.timedelta(hours=random.randint(1, 48))
        )
        
        db.add(report)
        db.flush()

        # Create linked WorkOrder for actionable statuses
        if status in ["dispatched", "resolved"]:
            wo = gov_models.WorkOrder(
                report_id=report.id,
                title=f"Repair: {issue['cat']} Alert",
                description=f"Field assignment triggered by AI Triage for ticket #{report.id}. {base_desc}",
                wo_type="standard" if random.random() > 0.3 else "preemptive",
                status="in_progress" if status == "dispatched" else "completed",
                priority=issue["urgency"].lower(),
                assigned_by_id=admin_id,
                assigned_to_id=field_worker_id,
                scheduled_date=simulated_date + datetime.timedelta(days=1),
                created_at=simulated_date,
                updated_at=simulated_date + datetime.timedelta(days=3)
            )
            db.add(wo)
            
        if (i+1) % 25 == 0:
            print(f"  [PROGRESS] {i+1}/150 data points generated...")

    try:
        db.commit()
        print("="*60)
        print(f"  SUCCESS: 150 High-Fidelity Clustered AI Datasets Seeded Successfully.")
        print("="*60 + "\n")
    except Exception as e:
        db.rollback()
        print(f"  [ERR] Commit failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_smart_reports()
