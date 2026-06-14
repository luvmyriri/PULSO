from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = "postgresql://postgres:0428@localhost/pulso_db"
engine = create_engine(DB_URL)
Session = sessionmaker(bind=engine)
db = Session()

print("--- Backfilling IDs ---")

# 1. Backfill User Roles
print("Backfilling User Role IDs...")
db.execute(text("""
    UPDATE users u
    SET role_id = r.id
    FROM system_roles r
    WHERE LOWER(u.role) = LOWER(r.name) AND u.role_id IS NULL
"""))

# 2. Backfill User Barangays
print("Backfilling User Barangay IDs...")
db.execute(text("""
    UPDATE users u
    SET barangay_id = b.id
    FROM barangays b
    WHERE LOWER(u.barangay) = LOWER(b.name) AND u.barangay_id IS NULL
"""))

# 3. Backfill Report Barangays
print("Backfilling Report Barangay IDs...")
db.execute(text("""
    UPDATE reports r
    SET barangay_id = b.id
    FROM barangays b
    WHERE LOWER(r.location_barangay) = LOWER(b.name) AND r.barangay_id IS NULL
"""))

# 4. Sync Districts for Project Requests and OBO
print("Backfilling Project Request / OBO District IDs...")
db.execute(text("""
    UPDATE project_requests pr
    SET district_id = b.district_id
    FROM barangays b
    WHERE pr.barangay_id = b.id AND pr.district_id IS NULL
"""))
db.execute(text("""
    UPDATE obo_inspections obo
    SET district_id = b.district_id
    FROM barangays b
    WHERE obo.barangay_id = b.id AND obo.district_id IS NULL
"""))

db.commit()
db.close()
print("Backfill Complete.")
