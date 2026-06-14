"""
seed_final.py — Final Seeding for Decoupled User Architecture
Caloocan City — PULSO System
"""

from database import SessionLocal, engine, init_db
import models
import auth
import random
import datetime
from sqlalchemy import text
import sys

def seed_final():
    print("=" * 60)
    print("  PULSO — Final System Seeding (Universal Edition)")
    print("=" * 60)

    # 1. Initialize Tables
    print("  [INIT] Initializing database tables...")
    init_db()

    db = SessionLocal()

    try:
        # 2. Clear existing data
        print("  [CLEAN] Clearing existing database records...")
        db.execute(text("DELETE FROM advisories"))
        db.execute(text("DELETE FROM notifications"))
        db.execute(text("DELETE FROM reports"))
        db.execute(text("DELETE FROM residents"))
        db.execute(text("DELETE FROM officials"))
        db.execute(text("DELETE FROM system_roles"))
        db.execute(text("DELETE FROM barangays"))
        db.execute(text("DELETE FROM districts"))
        db.commit()

        # 3. Seed Districts
        print("  [DISTRICTS] Seeding legislative districts...")
        districts = [
            models.District(id=1, name="District 1", code="D1"),
            models.District(id=2, name="District 2", code="D2"),
            models.District(id=3, name="District 3", code="D3"),
        ]
        db.add_all(districts)
        db.commit()

        # 4. Seed Barangays
        print("  [BARANGAYS] Seeding key barangays...")
        # Just a few for seeding
        barangays = [
            models.Barangay(id=1, name="Bagong Silang", district_id=1),
            models.Barangay(id=2, name="Camarin", district_id=1),
            models.Barangay(id=3, name="Tala", district_id=1),
            models.Barangay(id=168, name="Deparo", district_id=2),
            models.Barangay(id=171, name="Bagumbong", district_id=2),
        ]
        db.add_all(barangays)
        db.commit()

        # 5. Seed System Roles with Granular RBAC Capabilities
        print("  [ROLES] Seeding system roles with granular RBAC capabilities...")
        roles_data = [
            {
                "name": "system_admin", 
                "label": "PULSO System Administrator", 
                "capabilities": {"all": True, "pii_access": True, "analytics": ["view", "analyze"], "admin": ["manage"]}, 
                "access_level": "admin"
            },
            {
                "name": "manager", 
                "label": "Operations Manager", 
                "capabilities": {"all": True, "reports": ["view", "edit", "approve"], "analytics": ["view"], "dispatch": True}, 
                "access_level": "senior"
            },
            {
                "name": "dispatcher", 
                "label": "Dispatcher / Triage Officer", 
                "capabilities": {"reports": ["view", "edit"], "analytics": ["view"], "dispatch": True}, 
                "access_level": "staff"
            },
            # --- EXECUTIVE LEVEL ---
            {
                "name": "city_engineer", 
                "label": "City Engineer / Building Official", 
                "capabilities": {
                    "public_works": ["view", "edit", "approve"], 
                    "permits": ["view", "approve"], 
                    "reports": ["view", "archive"],
                    "analytics": ["view"],
                    "pii_access": True
                }, 
                "access_level": "executive"
            },
            {
                "name": "asst_city_engineer", 
                "label": "Assistant City Engineer", 
                "capabilities": {
                    "public_works": ["view", "edit"], 
                    "permits": ["view"], 
                    "reports": ["view"],
                    "analytics": ["view"],
                    "pii_access": False
                }, 
                "access_level": "executive"
            },
            # --- ADMINISTRATIVE DIVISION ---
            {
                "name": "admin_officer", 
                "label": "Administrative Officer", 
                "capabilities": {"records": ["view", "edit"], "reports": ["view"], "pii_access": False}, 
                "access_level": "senior"
            },
            {
                "name": "admin_clerk", 
                "label": "Administrative Clerk", 
                "capabilities": {"records": ["view"], "reports": ["view"], "pii_access": False}, 
                "access_level": "staff"
            },
            {
                "name": "records_officer", 
                "label": "Records Officer", 
                "capabilities": {"records": ["view", "archive", "perpetual_flag"], "pii_access": True}, 
                "access_level": "staff"
            },
            # --- OBO TECHNICAL REVIEW CHAMBERS (Specialized) ---
            {
                "name": "division_chief_arch", 
                "label": "Division Chief - Architectural", 
                "capabilities": {"permits": ["view", "technical_sign_off"], "analytics": ["view"], "specialization": "architectural"}, 
                "access_level": "senior"
            },
            {
                "name": "division_chief_structural", 
                "label": "Division Chief - Structural", 
                "capabilities": {"permits": ["view", "technical_sign_off"], "analytics": ["view"], "specialization": "structural"}, 
                "access_level": "senior"
            },
            {
                "name": "division_chief_electrical", 
                "label": "Division Chief - Electrical", 
                "capabilities": {"permits": ["view", "technical_sign_off"], "analytics": ["view"], "specialization": "electrical"}, 
                "access_level": "senior"
            },
            # --- DESIGN & PLANNING DIVISION ---
            {
                "name": "design_engineer", 
                "label": "Design Engineer", 
                "capabilities": {"public_works": ["view", "edit"], "reports": ["view"], "analytics": ["view"]}, 
                "access_level": "senior"
            },
            {
                "name": "cad_operator", 
                "label": "CAD Operator", 
                "capabilities": {"public_works": ["view", "edit"]}, 
                "access_level": "staff"
            },
            # --- SURVEY & ESTIMATION DIVISION ---
            {
                "name": "project_engineer", 
                "label": "Project Engineer", 
                "capabilities": {
                    "public_works": ["view", "edit", "update_progress"], 
                    "reports": ["view", "assign_field"],
                    "analytics": ["view"],
                    "jurisdiction_lock": True
                }, 
                "access_level": "senior"
            },
            {
                "name": "estimator", 
                "label": "Estimator", 
                "capabilities": {"public_works": ["view", "edit_boq"], "procurement": ["view"], "analytics": ["view"]}, 
                "access_level": "staff"
            },
            # --- CONSTRUCTION DIVISION ---
            {
                "name": "construction_foreman", 
                "label": "Construction Foreman", 
                "capabilities": {"public_works": ["view", "update_daily_log"], "reports": ["view"], "analytics": ["view"], "jurisdiction_lock": True}, 
                "access_level": "staff"
            },
            {
                "name": "field_worker", 
                "label": "Field Worker", 
                "capabilities": {"public_works": ["view"], "reports": ["view"]}, 
                "access_level": "staff"
            },
            # --- OBO INSPECTION TEAM ---
            {
                "name": "building_inspector", 
                "label": "Building Inspector", 
                "capabilities": {"permits": ["view", "field_verify", "issue_nov"], "reports": ["view", "edit"], "analytics": ["view"]}, 
                "access_level": "staff"
            },
            {
                "name": "electrical_inspector", 
                "label": "Electrical Inspector", 
                "capabilities": {"permits": ["view", "field_verify"], "reports": ["view", "edit"]}, 
                "access_level": "staff"
            },
            {
                "name": "mechanical_inspector", 
                "label": "Mechanical Inspector", 
                "capabilities": {"permits": ["view", "field_verify"], "reports": ["view", "edit"]}, 
                "access_level": "staff"
            }
        ]
        
        role_objects = []
        for r_data in roles_data:
            role = models.SystemRole(**r_data)
            db.add(role)
            role_objects.append(role)
        
        db.flush() # Get IDs
        role_map = {r.name: r.id for r in role_objects}
        print(f"  [SUCCESS] Seeded {len(role_objects)} roles.")

        # 6. Seed Government Officials (from seed_gov_users.py)
        CEO_USERS = [
            {"email": "manager@caloocan.gov.ph", "full_name": "Mr. Eduardo M. Santos", "role": "manager", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Operations Division, City Engineering Office", "phone_number": "09171234001"},
            {"email": "dispatcher@caloocan.gov.ph", "full_name": "Ms. Carla T. Reyes", "role": "dispatcher", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Triage Center, City Engineering Office", "phone_number": "09171234002"},
            {"email": "city.engineer@caloocan.gov.ph", "full_name": "Engr. Maria G. Santos", "role": "city_engineer", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Office of the City Engineer, Caloocan City Hall, EDSA, Caloocan City", "phone_number": "09171234501"},
            {"email": "asst.engineer@caloocan.gov.ph", "full_name": "Engr. Jose R. Reyes", "role": "asst_city_engineer", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Office of the City Engineer, Caloocan City Hall, EDSA, Caloocan City", "phone_number": "09171234502"},
            {"email": "admin.officer@caloocan.gov.ph", "full_name": "Mr. Ricardo P. Cruz", "role": "admin_officer", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Administrative Division, City Engineering Office", "phone_number": "09171234503"},
            {"email": "admin.clerk@caloocan.gov.ph", "full_name": "Ms. Ana M. Torres", "role": "admin_clerk", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Administrative Division, City Engineering Office", "phone_number": "09171234504"},
            {"email": "records.officer@caloocan.gov.ph", "full_name": "Ms. Luz B. Garcia", "role": "records_officer", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Records Section, City Engineering Office", "phone_number": "09171234505"},
            {"email": "design.chief@caloocan.gov.ph", "full_name": "Engr. Dante L. Flores", "role": "division_chief_arch", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Design & Planning Division, City Engineering Office", "phone_number": "09171234506"},
            {"email": "structural.chief@caloocan.gov.ph", "full_name": "Engr. Pedro S. Mendoza", "role": "division_chief_structural", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Design & Planning Division, City Engineering Office", "phone_number": "09171234561"},
            {"email": "electrical.chief@caloocan.gov.ph", "full_name": "Engr. Elena R. Cruz", "role": "division_chief_electrical", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Design & Planning Division, City Engineering Office", "phone_number": "09171234562"},
            {"email": "design.engineer@caloocan.gov.ph", "full_name": "Engr. Mark A. Villanueva", "role": "design_engineer", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Design & Planning Division, City Engineering Office", "phone_number": "09171234507"},
            {"email": "cad.operator@caloocan.gov.ph", "full_name": "Mr. Paolo S. Ramos", "role": "cad_operator", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Design & Planning Division, City Engineering Office", "phone_number": "09171234508"},
            {"email": "project.engineer@caloocan.gov.ph", "full_name": "Engr. Carlo D. Mendoza", "role": "project_engineer", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Survey & Estimation Division, City Engineering Office", "phone_number": "09171234509"},
            {"email": "estimator@caloocan.gov.ph", "full_name": "Engr. Roberto T. Bautista", "role": "estimator", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Survey & Estimation Division, City Engineering Office", "phone_number": "09171234510"},
            {"email": "construction.chief@caloocan.gov.ph", "full_name": "Engr. Benito C. Lim", "role": "division_chief_structural", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Construction Division, City Engineering Office", "phone_number": "09171234511"},
            {"email": "foreman@caloocan.gov.ph", "full_name": "Mr. Felix R. Santos", "role": "construction_foreman", "password": "CEO@pulso2025!", "barangay": "Deparo", "address": "Construction Division, City Engineering Office", "phone_number": "09171234512"},
            {"email": "field.worker@caloocan.gov.ph", "full_name": "Mr. Juan K. dela Cruz", "role": "field_worker", "password": "CEO@pulso2025!", "barangay": "Grace Park East", "address": "Construction Division, City Engineering Office", "phone_number": "09171234513"},
            {"email": "building.inspector@caloocan.gov.ph", "full_name": "Insp. Romeo C. Aquino", "role": "building_inspector", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Office of the Building Official, City Engineering Office", "phone_number": "09171234514"},
            {"email": "electrical.inspector@caloocan.gov.ph", "full_name": "Insp. Cynthia P. Gomez", "role": "electrical_inspector", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Office of the Building Official, City Engineering Office", "phone_number": "09171234515"},
            {"email": "mechanical.inspector@caloocan.gov.ph", "full_name": "Insp. Danny V. Navarro", "role": "mechanical_inspector", "password": "CEO@pulso2025!", "barangay": "City Hall", "address": "Office of the Building Official, City Engineering Office", "phone_number": "09171234516"},
            {"email": "admin@pulso.system", "full_name": "PULSO System Administrator", "role": "system_admin", "password": "SysAdmin@pulso2025!", "barangay": "City Hall", "address": "PULSO DICT Office, Caloocan City Hall", "phone_number": "09171234500"},
        ]
        
        print(f"  [OFFICIALS] Seeding {len(CEO_USERS)} government officials...")
        
        for u in CEO_USERS:
            pwd = u.get("password", "CEO@pulso2025!")
            hashed = auth.get_password_hash(pwd)
            role_id = role_map.get(u["role"])
            
            new_official = models.Official(
                email=u["email"],
                full_name=u["full_name"],
                role=u["role"],
                role_id=role_id,
                password_hash=hashed,
                address=u["address"],
                barangay=u["barangay"],
                phone_number=u.get("phone_number"),
                account_type="official",
                is_active=True
            )
            db.add(new_official)
        
        db.commit()
        print(f"  [SUCCESS] Seeded {len(CEO_USERS)} government officials.")

        # 6b. Seed Resident Accounts
        RESIDENT_ACCOUNTS = [
            {"email": "vjlamsenlamsen28@gmail.com", "full_name": "VJ Lamsen", "password": "Resident@pulso2025"},
            {"email": "alexismarc066@gmail.com", "full_name": "Alexis Marc", "password": "Resident@pulso2025"},
            {"email": "gene.tabios13@gmail.com", "full_name": "Gene Tabios", "password": "Resident@pulso2025"},
            {"email": "garciamarc1900@gmail.com", "full_name": "Garcia Marc", "password": "Resident@pulso2025"},
        ]
        
        print(f"  [RESIDENTS] Seeding {len(RESIDENT_ACCOUNTS)} resident accounts...")
        
        for r in RESIDENT_ACCOUNTS:
            hashed = auth.get_password_hash(r["password"])
            
            new_resident = models.Resident(
                email=r["email"],
                full_name=r["full_name"],
                password_hash=hashed,
                address="PULSO Verified User Address",
                barangay_id=1,
                district_id=1,
                trust_score=100,
                is_active=True,
                is_verified=True
            )
            db.add(new_resident)
        
        db.commit()
        print(f"  [SUCCESS] Seeded {len(RESIDENT_ACCOUNTS)} resident accounts.")

        # 7b. Seed Sample Reports
        print("  [REPORTS] Seeding sample hazard reports...")
        reports_data = [
            {"category": "Road Issue", "description": "Deep pothole on main road, needs immediate fill", "status": "pending", "ai_category": "Infrastructure", "ai_urgency": "High", "severity_score": 8.5, "location_string": "Bagong Silang, Caloocan", "location_lat": 14.7566, "location_lng": 121.0450},
            {"category": "Road Issue", "description": "Cracked asphalt causing accidents", "status": "in_progress", "ai_category": "Infrastructure", "ai_urgency": "Medium", "severity_score": 6.0, "location_string": "Camarin, Caloocan", "location_lat": 14.7520, "location_lng": 121.0520},
            {"category": "Flooding", "description": "Street flooding due to clogged drainage", "status": "pending", "ai_category": "Water/Drainage", "ai_urgency": "Critical", "severity_score": 9.2, "location_string": "Deparo, Caloocan", "location_lat": 14.7800, "location_lng": 121.0600},
            {"category": "Electrical", "description": "Exposed wiring near school zone", "status": "resolved", "ai_category": "Public Safety", "ai_urgency": "Critical", "severity_score": 10.0, "location_string": "Bagumbong, Caloocan", "location_lat": 14.7900, "location_lng": 121.0700},
            {"category": "Water Leak", "description": "Burst pipe causing water loss", "status": "in_progress", "ai_category": "Water Issue", "ai_urgency": "High", "severity_score": 7.8, "location_string": "Tala, Caloocan", "location_lat": 14.7400, "location_lng": 121.0300},
            {"category": "Waste Mgmt", "description": "Illegal dumping blocking pathway", "status": "pending", "ai_category": "Sanitation", "ai_urgency": "Medium", "severity_score": 5.5, "location_string": "Bagong Silang, Caloocan", "location_lat": 14.7550, "location_lng": 121.0440},
            {"category": "Street Light", "description": "Non-functional street lamp", "status": "pending", "ai_category": "Public Safety", "ai_urgency": "Low", "severity_score": 4.0, "location_string": "Camarin, Caloocan", "location_lat": 14.7510, "location_lng": 121.0510},
            {"category": "Road Issue", "description": "Missing street sign at intersection", "status": "resolved", "ai_category": "Infrastructure", "ai_urgency": "Medium", "severity_score": 5.0, "location_string": "Bagumbong, Caloocan", "location_lat": 14.7880, "location_lng": 121.0680},
        ]
        
        residents = db.query(models.Resident).all()
        if residents:
            for i, rdata in enumerate(reports_data):
                new_report = models.Report(
                    ticket_id=f"REP-2025-{str(i+1).zfill(4)}",
                    resident_id=residents[i % len(residents)].id,
                    category=rdata["category"],
                    description=rdata["description"],
                    status=rdata["status"],
                    ai_category=rdata["ai_category"],
                    ai_urgency=rdata["ai_urgency"],
                    severity_score=rdata["severity_score"],
                    location_string=rdata["location_string"],
                    location_lat=rdata["location_lat"],
                    location_lng=rdata["location_lng"],
                    created_at=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(1, 30))
                )
                db.add(new_report)
            db.commit()
            print(f"  [SUCCESS] Seeded {len(reports_data)} reports.")

        # 7c. Seed Advisories
        print("  [ADVISORIES] Seeding system advisories...")
        adv_data = [
            {"advisory_id": "PUB-2025-001", "category": "Public Works", "title": "System Migration Complete", "description": "The PULSO system has successfully migrated to a decoupled user architecture.", "priority": "high", "department": "DICT PULSO Team"},
            {"advisory_id": "PUB-2025-002", "category": "Maintenance", "title": "Scheduled Drainage Cleaning", "description": "Weekly drainage maintenance scheduled for all districts this week.", "priority": "medium", "department": "City Engineering Office"},
            {"advisory_id": "PUB-2025-003", "category": "Emergency", "title": " typhoon Warning", "description": "Heavy rainfall expected. Report any flooding immediately.", "priority": "critical", "department": "CDRRMO"},
        ]
        for adv in adv_data:
            new_adv = models.Advisory(**adv)
            db.add(new_adv)
        db.commit()
        print(f"  [SUCCESS] Seeded {len(adv_data)} advisories.")

        # 7d. Seed Notifications
        print("  [NOTIFICATIONS] Seeding sample notifications...")
        officials = db.query(models.Official).all()
        if officials and residents:
            notif_data = [
                {"official_id": officials[0].id, "resident_id": residents[0].id, "title": "New Report Filed", "message": "A new road issue has been reported in your area.", "priority": 50},
                {"official_id": officials[0].id, "resident_id": residents[0].id, "title": "Report Resolved", "message": "Your report has been marked as resolved.", "priority": 20},
                {"official_id": officials[0].id, "resident_id": residents[0].id, "title": "Advisory Posted", "message": "New advisory from City Engineering.", "priority": 30},
            ]
            for ndata in notif_data:
                new_notif = models.Notification(**ndata)
                db.add(new_notif)
            db.commit()
            print(f"  [SUCCESS] Seeded {len(notif_data)} notifications.")

        # 7e. Seed Infrastructure Assets (Predictive Maintenance)
        print("  [ASSETS] Seeding infrastructure assets for predictive engine...")
        import gov_models
        from datetime import date as dt
        
        brgys = db.query(models.Barangay).all()
        brgy_map = {b.name: b.id for b in brgys}
        
        asset_data = [
            {"asset_id": "CAL-RD-001", "asset_name": "EDSA Extension Road", "category": "Road", "barangay": "Bagong Silang", "barangay_id": brgy_map.get("Bagong Silang"), "material_type": "Asphalt", "design_life": 20, "date_completed": dt(2020, 5, 15)},
            {"asset_id": "CAL-RD-002", "asset_name": "Camarin Road", "category": "Road", "barangay": "Camarin", "barangay_id": brgy_map.get("Camarin"), "material_type": "Concrete", "design_life": 25, "date_completed": dt(2019, 3, 20)},
            {"asset_id": "CAL-RD-003", "asset_name": "Deparo Main Road", "category": "Road", "barangay": "Deparo", "barangay_id": brgy_map.get("Deparo"), "material_type": "Asphalt", "design_life": 20, "date_completed": dt(2021, 1, 10)},
            {"asset_id": "CAL-DR-001", "asset_name": "Bagong Silang Drainage", "category": "Drainage", "barangay": "Bagong Silang", "barangay_id": brgy_map.get("Bagong Silang"), "material_type": "Concrete", "design_life": 30, "date_completed": dt(2018, 8, 5)},
            {"asset_id": "CAL-DR-002", "asset_name": "Camarin Drainage", "category": "Drainage", "barangay": "Camarin", "barangay_id": brgy_map.get("Camarin"), "material_type": "Concrete", "design_life": 30, "date_completed": dt(2019, 11, 12)},
            {"asset_id": "CAL-BR-001", "asset_name": "Bagumbong Bridge", "category": "Bridge", "barangay": "Bagumbong", "barangay_id": brgy_map.get("Bagumbong"), "material_type": "Steel", "design_life": 40, "date_completed": dt(2015, 6, 22)},
            {"asset_id": "CAL-BR-002", "asset_name": "Tala Bridge", "category": "Bridge", "barangay": "Tala", "barangay_id": brgy_map.get("Tala"), "material_type": "Concrete", "design_life": 35, "date_completed": dt(2017, 9, 15)},
            {"asset_id": "CAL-LT-001", "asset_name": "City Hall Street Light", "category": "Light", "barangay": "Bagong Silang", "barangay_id": brgy_map.get("Bagong Silang"), "material_type": "LED", "design_life": 15, "date_completed": dt(2022, 1, 20)},
            {"asset_id": "CAL-LT-002", "asset_name": "Bagong Silang Street Light", "category": "Light", "barangay": "Bagong Silang", "barangay_id": brgy_map.get("Bagong Silang"), "material_type": "LED", "design_life": 15, "date_completed": dt(2021, 7, 8)},
            {"asset_id": "CAL-BLDG-001", "asset_name": "City Engineering Office", "category": "Building", "barangay": "Bagong Silang", "barangay_id": brgy_map.get("Bagong Silang"), "material_type": "Concrete", "design_life": 50, "date_completed": dt(2010, 3, 15)},
        ]
        
        for ad in asset_data:
            ad['barangay_id'] = ad.get('barangay_id') or brgy_map.get(ad.get('barangay'))
            new_asset = gov_models.InfrastructureAsset(**ad)
            db.add(new_asset)
        
        db.commit()
        print(f"  [SUCCESS] Seeded {len(asset_data)} infrastructure assets.")

        # 7f. Seed Environmental Context
        print("  [ENVC] Seeding environmental context...")
        
        brgys = db.query(models.Barangay).all()
        brgy_map = {b.name: b.id for b in brgys}
        
        env_data = [
            {"barangay_id": 1, "flood_risk_level": "HIGH"},
            {"barangay_id": 2, "flood_risk_level": "MEDIUM"},
            {"barangay_id": 3, "flood_risk_level": "HIGH"},
            {"barangay_id": 168, "flood_risk_level": "LOW"},
            {"barangay_id": 171, "flood_risk_level": "MEDIUM"},
        ]
        
        for ed in env_data:
            existing = db.query(gov_models.EnvironmentalContext).filter_by(barangay_id=ed['barangay_id']).first()
            if not existing:
                new_env = gov_models.EnvironmentalContext(**ed)
                db.add(new_env)
        
        db.commit()
        print(f"  [SUCCESS] Seeded environmental context.")

        print("  [SUCCESS] Seeding complete!")

    except Exception as e:
        print(f"  [ERROR] Seeding failed: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_final()
