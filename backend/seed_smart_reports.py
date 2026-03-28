import sys
import os
import random
import datetime

# Add the current directory to sys.path so we can import from backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
import gov_models

def seed_smart_reports():
    db = SessionLocal()

    # Find a test citizen user
    citizen = db.query(models.User).filter(models.User.role == "resident").first()
    if not citizen:
        citizen = db.query(models.User).first()
    
    citizen_id = citizen.id if citizen else 1

    # Find the dispatcher / system_admin for actor_id logging
    admin = db.query(models.User).filter(models.User.role == "system_admin").first()
    admin_id = admin.id if admin else 2

    # Provide realistic coordinates in Caloocan North bounds
    # Center: 14.7566, 121.0450
    base_lat = 14.7566
    base_lng = 121.0450

    issues = [
        {"cat": "Road Issue", "ai_cat": "Infrastructure", "desc": "Massive pothole on the main road", "urgency": "High", "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Pothole.jpg/800px-Pothole.jpg"},
        {"cat": "Flooding", "ai_cat": "Water Issue", "desc": "Street is completely flooded after the storm", "urgency": "Critical", "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Flooded_street.jpg/800px-Flooded_street.jpg"},
        {"cat": "Electrical", "ai_cat": "Power Outage", "desc": "Live wire hanging from the electricity pole", "urgency": "Critical", "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Downed_power_lines.jpg/800px-Downed_power_lines.jpg"},
        {"cat": "Waste", "ai_cat": "Sanitation", "desc": "Uncollected garbage piling up on the sidewalk", "urgency": "Medium", "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Garbage_on_the_street.jpg/800px-Garbage_on_the_street.jpg"},
        {"cat": "Water Leak", "ai_cat": "Water Issue", "desc": "Burst pipe leaking water everywhere", "urgency": "High", "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Water_leak.jpg/800px-Water_leak.jpg"}
    ]

    # Let's seed 15 reports across different statuses
    statuses = [
        "unverified", "unverified", "pending", "pending", 
        "approved_internal", "approved_internal", "approved_internal", 
        "dispatched", "dispatched", 
        "resolved", "resolved"
    ]

    print("Generating Smart Seed Reports for Command Center...")

    for i in range(15):
        issue = random.choice(issues)
        status = random.choice(statuses)

        lat = base_lat + random.uniform(-0.03, 0.03)
        lng = base_lng + random.uniform(-0.03, 0.03)

        report = models.Report(
            user_id=citizen_id,
            category=issue["cat"],
            description=f"Automated Issue: {issue['desc']}",
            location_lat=lat,
            location_lng=lng,
            location_string=f"Simulated Address {i}, Caloocan North",
            image_url=issue["url"],
            status=status,
            ai_summary=f"AI scanned image and detected {issue['urgency']} severity {issue['cat'].lower()} hazard.",
            ai_category=issue["ai_cat"],
            ai_urgency=issue["urgency"],
            created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=random.randint(1, 72))
        )
        db.add(report)
        db.flush() # flush to get the report.id immediately

        # If it's dispatched or resolved, let's automatically create a WorkOrder to make the "Fleet/Dispatch" tab pop
        if status in ["dispatched", "resolved"]:
            wo = gov_models.WorkOrder(
                title=f"Fix {issue['cat']}",
                description=f"Action required for ticket {report.id}",
                wo_type="standard",
                priority=issue["urgency"].lower() if issue["urgency"].lower() in ["low", "normal", "high", "critical"] else "normal",
                status="in_progress" if status == "dispatched" else "completed",
                assigned_to_id=3, # Mock field engineer
                assigned_by_id=admin_id,
                report_id=report.id
            )
            db.add(wo)

    db.commit()
    print("Database seeded with fresh dynamic reports and work orders successfully!")

if __name__ == "__main__":
    seed_smart_reports()
