from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = "postgresql://postgres:0428@localhost/pulso_db"
engine = create_engine(DB_URL)
Session = sessionmaker(bind=engine)
db = Session()

commands = [
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS barangay_id INTEGER REFERENCES barangays(id)",
    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS barangay_id INTEGER REFERENCES barangays(id)",
    "ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)",
    "ALTER TABLE obo_inspections ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)",
]

print("--- Fixing Database Schema ---")
for cmd in commands:
    try:
        db.execute(text(cmd))
        print(f"Success: {cmd}")
    except Exception as e:
        print(f"Error: {cmd} -> {e}")

db.commit()
db.close()
print("Done.")
