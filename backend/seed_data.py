import models, auth
from database import SessionLocal, engine
from datetime import datetime, timedelta

def seed_data():
    # 1. Clear existing data to ensure consistency
    print("Dropping and recreating tables...")
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Users (Roles: manager, dispatcher, resident)
        print("Seeding users...")
        test_password = auth.get_password_hash("password123")
        
        db_users = [
            models.User(
                full_name="Admin Manager",
                email="admin@pulso.gov.ph",
                phone_number="09123456789",
                password_hash=test_password,
                role="manager",
                address="City Hall, Caloocan",
                barangay="Grace Park"
            ),
            models.User(
                full_name="Dispatcher One",
                email="dispatcher@pulso.gov.ph",
                phone_number="09223456789",
                password_hash=test_password,
                role="dispatcher",
                address="North Command Center",
                barangay="Bagong Silang"
            ),
            models.User(
                full_name="Juan Dela Cruz",
                email="resident@gmail.com",
                phone_number="09333456789",
                password_hash=test_password,
                role="resident",
                address="Phase 1, Block 2, Lot 3",
                barangay="Brgy 178"
            )
        ]
        
        for user in db_users:
            db.add(user)
        db.commit()
        for user in db_users:
            db.refresh(user)
            
        resident_user = db_users[2] # Juan

        # 2. Advisories
        print("Seeding advisories...")
        advisories = [
            models.Advisory(
                department="Meralco / City Engineering",
                title="Scheduled Power Interruption",
                description="Due to grid maintenance, power will be out in parts of Camarin and Bagong Silang tomorrow from 9 AM to 4 PM.",
                priority="high",
                category="Utilities",
                stats_affected="Zones 1-4"
            ),
            models.Advisory(
                department="DPWH",
                title="Road Repair Alert: Quirino Highway",
                description="Partial lane closure near Novaliches-Caloocan boundary. Expect delays.",
                priority="medium",
                category="Public Works",
                stats_affected="All Commuters"
            ),
            models.Advisory(
                department="DOH / City Health",
                title="Mobile Dental Mission",
                description="Join us at the Brgy 178 Covered Court this Friday for free check-ups and medical supplies distribution.",
                priority="low",
                category="Advisory",
                stats_affected="District residents"
            )
        ]
        
        for adv in advisories:
            db.add(adv)
        db.commit()

        # 3. Reports for Juan
        print("Seeding reports...")
        db_reports = [
            models.Report(
                user_id=resident_user.id,
                category="Infrastructure",
                description="Burst water pipe near the main intersection of Camarin Road. Water is flooding the street.",
                location_lat=14.7552,
                location_lng=121.0421,
                location_string="Caloocan North, 181",
                status="pending"
            ),
            models.Report(
                user_id=resident_user.id,
                category="Safety",
                description="Exposed high-voltage wires hanging low after a truck hit the post. Near Brgy 174 gym.",
                location_lat=14.7610,
                location_lng=121.0505,
                location_string="Caloocan North, 186",
                status="dispatched"
            ),
            models.Report(
                user_id=resident_user.id,
                category="Sanitation",
                description="Uncollected garbage piling up in front of the elementary school for over a week.",
                location_lat=14.7588,
                location_lng=121.0470,
                location_string="Caloocan North, 170",
                status="resolved"
            ),
            models.Report(
                user_id=resident_user.id,
                category="Safety",
                description="Pothole is getting too deep on the main road, motorcycles are slipping.",
                location_lat=14.7530,
                location_lng=121.0440,
                location_string="Caloocan North, 184",
                status="pending"
            )
        ]
        
        for report in db_reports:
            db.add(report)
        db.commit()

        # 4. Notifications for Juan
        print("Seeding notifications...")
        notifications = [
            models.Notification(
                user_id=resident_user.id,
                title="Report Resolved",
                message="Your sanitation report regarding garbage collection has been resolved. Thank you!"
            ),
            models.Notification(
                user_id=resident_user.id,
                title="Team Dispatched",
                message="A team has been dispatched to check the electrical hazard you reported.",
                is_read=True
            )
        ]
        
        for note in notifications:
            db.add(note)
        db.commit()

        print("Successfully seeded all data tables with hashed passwords.")
        
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
