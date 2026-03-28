"""
seed_gov_users.py — Seeds all City Engineering Office Plantilla positions
City Engineering Office, Caloocan City — PULSO System

Run: python seed_gov_users.py
"""

from database import SessionLocal
import models
import auth

db = SessionLocal()

CEO_USERS = [
    # ── EXECUTIVE LEADERSHIP ────────────────────────────────────────────────
    {
        "email": "city.engineer@caloocan.gov.ph",
        "full_name": "Engr. Maria G. Santos",
        "role": "city_engineer",
        "password": "CEO@pulso2025!",
        "barangay": "City Hall",
        "address": "Office of the City Engineer, Caloocan City Hall, EDSA, Caloocan City",
        "phone_number": "09171234501",
    },
    {
        "email": "asst.engineer@caloocan.gov.ph",
        "full_name": "Engr. Jose R. Reyes",
        "role": "asst_city_engineer",
        "password": "CEO@pulso2025!",
        "barangay": "City Hall",
        "address": "Office of the City Engineer, Caloocan City Hall, EDSA, Caloocan City",
        "phone_number": "09171234502",
    },

    # ── ADMINISTRATIVE DIVISION ─────────────────────────────────────────────
    {
        "email": "admin.officer@caloocan.gov.ph",
        "full_name": "Mr. Ricardo P. Cruz",
        "role": "admin_officer",
        "password": "CEO@pulso2025!",
        "barangay": "City Hall",
        "address": "Administrative Division, City Engineering Office",
        "phone_number": "09171234503",
    },
    {
        "email": "admin.clerk@caloocan.gov.ph",
        "full_name": "Ms. Ana M. Torres",
        "role": "admin_clerk",
        "password": "CEO@pulso2025!",
        "barangay": "City Hall",
        "address": "Administrative Division, City Engineering Office",
        "phone_number": "09171234504",
    },
    {
        "email": "records.officer@caloocan.gov.ph",
        "full_name": "Ms. Luz B. Garcia",
        "role": "records_officer",
        "password": "CEO@pulso2025!",
        "barangay": "City Hall",
        "address": "Records Section, City Engineering Office",
        "phone_number": "09171234505",
    },

    # ── DESIGN & PLANNING DIVISION ──────────────────────────────────────────
    {
        "email": "design.chief@caloocan.gov.ph",
        "full_name": "Engr. Dante L. Flores",
        "role": "division_chief",
        "password": "CEO@pulso2025!",
        "barangay": "City Hall",
        "address": "Design & Planning Division, City Engineering Office",
        "phone_number": "09171234506",
    },
    {
        "email": "design.engineer@caloocan.gov.ph",
        "full_name": "Engr. Mark A. Villanueva",
        "role": "design_engineer",
        "password": "CEO@pulso2025!",
        "barangay": "City Hall",
        "address": "Design & Planning Division, City Engineering Office",
        "phone_number": "09171234507",
    },
    {
        "email": "cad.operator@caloocan.gov.ph",
        "full_name": "Mr. Paolo S. Ramos",
        "role": "cad_operator",
        "password": "CEO@pulso2025!",
        "barangay": "City Hall",
        "address": "Design & Planning Division, City Engineering Office",
        "phone_number": "09171234508",
    },

    # ── SURVEY & ESTIMATION DIVISION ────────────────────────────────────────
    {
        "email": "project.engineer@caloocan.gov.ph",
        "full_name": "Engr. Carlo D. Mendoza",
        "role": "project_engineer",
        "password": "CEO@pulso2025!",
        "barangay": "City Hall",
        "address": "Survey & Estimation Division, City Engineering Office",
        "phone_number": "09171234509",
    },
    {
        "email": "estimator@caloocan.gov.ph",
        "full_name": "Engr. Roberto T. Bautista",
        "role": "estimator",
        "password": "CEO@pulso2025!",
        "barangay": "City Hall",
        "address": "Survey & Estimation Division, City Engineering Office",
        "phone_number": "09171234510",
    },

    # ── CONSTRUCTION AND MAINTENANCE DIVISION ───────────────────────────────
    {
        "email": "construction.chief@caloocan.gov.ph",
        "full_name": "Engr. Benito C. Lim",
        "role": "division_chief",
        "password": "CEO@pulso2025!",
        "barangay": "City Hall",
        "address": "Construction Division, City Engineering Office",
        "phone_number": "09171234511",
    },
    {
        "email": "foreman@caloocan.gov.ph",
        "full_name": "Mr. Felix R. Santos",
        "role": "construction_foreman",
        "password": "CEO@pulso2025!",
        "barangay": "Deparo",
        "address": "Construction Division, City Engineering Office",
        "phone_number": "09171234512",
    },
    {
        "email": "field.worker@caloocan.gov.ph",
        "full_name": "Mr. Juan K. dela Cruz",
        "role": "field_worker",
        "password": "CEO@pulso2025!",
        "barangay": "Grace Park East",
        "address": "Construction Division, City Engineering Office",
        "phone_number": "09171234513",
    },

    # ── OBO — OFFICE OF THE BUILDING OFFICIAL ───────────────────────────────
    {
        "email": "building.inspector@caloocan.gov.ph",
        "full_name": "Insp. Romeo C. Aquino",
        "role": "building_inspector",
        "password": "CEO@pulso2025!",
        "barangay": "City Hall",
        "address": "Office of the Building Official, City Engineering Office",
        "phone_number": "09171234514",
    },
    {
        "email": "electrical.inspector@caloocan.gov.ph",
        "full_name": "Insp. Cynthia P. Gomez",
        "role": "electrical_inspector",
        "password": "CEO@pulso2025!",
        "barangay": "City Hall",
        "address": "Office of the Building Official, City Engineering Office",
        "phone_number": "09171234515",
    },
    {
        "email": "mechanical.inspector@caloocan.gov.ph",
        "full_name": "Insp. Danny V. Navarro",
        "role": "mechanical_inspector",
        "password": "CEO@pulso2025!",
        "barangay": "City Hall",
        "address": "Office of the Building Official, City Engineering Office",
        "phone_number": "09171234516",
    },

    # ── SYSTEM ADMIN ────────────────────────────────────────────────────────
    {
        "email": "admin@pulso.system",
        "full_name": "PULSO System Administrator",
        "role": "system_admin",
        "password": "SysAdmin@pulso2025!",
        "barangay": "City Hall",
        "address": "PULSO DICT Office, Caloocan City Hall",
        "phone_number": "09171234500",
    },
]

print("=" * 60)
print("  PULSO — Seeding City Engineering Office Users")
print("=" * 60)

created = 0
updated = 0

for u in CEO_USERS:
    existing = db.query(models.User).filter(models.User.email == u["email"]).first()
    hashed = auth.get_password_hash(u["password"])
    if not existing:
        new_user = models.User(
            email=u["email"],
            full_name=u["full_name"],
            role=u["role"],
            password_hash=hashed,
            address=u["address"],
            barangay=u["barangay"],
            phone_number=u.get("phone_number"),
            trust_score=100,
        )
        db.add(new_user)
        print(f"  [CREATE] {u['role']:30s} {u['email']}")
        created += 1
    else:
        existing.role = u["role"]
        existing.full_name = u["full_name"]
        existing.password_hash = hashed
        existing.phone_number = u.get("phone_number")
        print(f"  [UPDATE] {u['role']:30s} {u['email']}")
        updated += 1

db.commit()
db.close()

print()
print(f"  Done! Created: {created} | Updated: {updated}")
print()
print("  LOGIN CREDENTIALS (all positions):")
print("  ─────────────────────────────────────────────────────────")
print("  City Engineer  :  city.engineer@caloocan.gov.ph  /  CEO@pulso2025!")
print("  Asst. CE       :  asst.engineer@caloocan.gov.ph  /  CEO@pulso2025!")
print("  Admin Officer  :  admin.officer@caloocan.gov.ph  /  CEO@pulso2025!")
print("  Admin Clerk    :  admin.clerk@caloocan.gov.ph    /  CEO@pulso2025!")
print("  Records Offr.  :  records.officer@caloocan.gov.ph /  CEO@pulso2025!")
print("  Design Engineer:  design.engineer@caloocan.gov.ph /  CEO@pulso2025!")
print("  CAD Operator   :  cad.operator@caloocan.gov.ph   /  CEO@pulso2025!")
print("  Project Engr.  :  project.engineer@caloocan.gov.ph / CEO@pulso2025!")
print("  Estimator      :  estimator@caloocan.gov.ph      /  CEO@pulso2025!")
print("  Foreman        :  foreman@caloocan.gov.ph        /  CEO@pulso2025!")
print("  Field Worker   :  field.worker@caloocan.gov.ph   /  CEO@pulso2025!")
print("  Bldg Inspector :  building.inspector@caloocan.gov.ph / CEO@pulso2025!")
print("  Elec Inspector :  electrical.inspector@caloocan.gov.ph / CEO@pulso2025!")
print("  Mech Inspector :  mechanical.inspector@caloocan.gov.ph / CEO@pulso2025!")
print("  Sys Admin      :  admin@pulso.system             /  SysAdmin@pulso2025!")
print("  ─────────────────────────────────────────────────────────")
