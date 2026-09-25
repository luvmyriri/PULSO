import sys
import os
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import bcrypt

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
import models
import gov_models

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def repair_database():
    print("Starting system repair and database seeding...")
    db = SessionLocal()
    try:
        # 1. Recreate tables if necessary
        print("Ensuring tables exist...")
        Base.metadata.create_all(bind=engine)

        # 2. Clear existing data (to avoid duplicates/conflicts)
        print("Clearing legacy data...")
        db.query(models.Advisory).delete()
        db.query(models.Notification).delete()
        db.query(models.Report).delete()
        db.query(models.Resident).delete()
        db.query(models.Official).delete()
        db.query(models.SystemRole).delete()
        db.query(models.Barangay).delete()
        db.query(models.District).delete()
        db.commit()

        # 3. Seed Districts
        print("Seeding Districts...")
        districts_data = [
            {"id": 1, "name": "District 1", "code": "D1"},
            {"id": 2, "name": "District 2", "code": "D2"}
        ]
        for d in districts_data:
            db.add(models.District(**d))
        db.commit()

        # 4. Seed Barangays
        print("Seeding Barangays...")
        barangays_data = [
            {"id": 1, "name": "Barangay Alpha", "district_id": 1},
            {"id": 2, "name": "Barangay Beta", "district_id": 1},
            {"id": 3, "name": "Barangay Gamma", "district_id": 2},
            {"id": 4, "name": "Barangay Delta", "district_id": 2}
        ]
        for b in barangays_data:
            db.add(models.Barangay(**b))
        db.commit()

        # 5. Seed System Roles
        print("Seeding System Roles...")
        roles_data = [
            {"name": "system_admin", "label": "Full Administrator", "capabilities": {"all": True}, "access_level": "admin"},
            {"name": "engineer", "label": "Infrastructure Engineer", "capabilities": {"infrastructure": ["view", "edit"]}, "access_level": "staff"},
            {"name": "official", "label": "City Official", "capabilities": {"reports": ["view"]}, "access_level": "staff"}
        ]
        roles_obj = {}
        for r_data in roles_data:
            role = models.SystemRole(**r_data)
            db.add(role)
            roles_obj[r_data["name"]] = role
        db.flush() # Get IDs

        # 6. Seed Officials
        print("Seeding Officials...")
        hashed_pass = get_password_hash("password123")
        officials_data = [
            {
                "full_name": "Admin User",
                "email": "admin@pulso.ph",
                "password_hash": hashed_pass,
                "role_id": roles_obj["system_admin"].id,
                "role": "system_admin",
                "account_type": "official",
                "is_active": True
            },
            {
                "full_name": "Chief Engineer",
                "email": "engineer@pulso.ph",
                "password_hash": hashed_pass,
                "role_id": roles_obj["engineer"].id,
                "role": "engineer",
                "account_type": "official",
                "is_active": True
            }
        ]
        for off in officials_data:
            db.add(models.Official(**off))
        db.commit()

        # 7. Seed Residents
        print("Seeding Residents...")
        residents_data = [
            {
                "full_name": "Juan Dela Cruz",
                "email": "juan@example.com",
                "phone_number": "09123456789",
                "password_hash": hashed_pass,
                "barangay_id": 1,
                "district_id": 1,
                "is_verified": True,
                "is_active": True
            },
            {
                "full_name": "Maria Clara",
                "email": "maria@example.com",
                "phone_number": "09123456788",
                "password_hash": hashed_pass,
                "barangay_id": 3,
                "district_id": 2,
                "is_verified": True,
                "is_active": True
            }
        ]
        for res in residents_data:
            db.add(models.Resident(**res))
        db.commit()

        # 8. Seed some Reports
        print("Seeding Reports...")
        juan = db.query(models.Resident).filter_by(email="juan@example.com").first()
        reports_data = [
            {
                "description": "Large pothole causing traffic",
                "category": "Infrastructure",
                "status": "pending",
                "resident_id": juan.id,
                "location_lat": 14.5995,
                "location_lng": 120.9842
            }
        ]
        for rep in reports_data:
            db.add(models.Report(**rep))
        db.commit()

        print("System repair completed successfully!")
        
    except Exception as e:
        print(f"Error during repair: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    repair_database()
