from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/pulso_db")
engine = create_engine(DATABASE_URL)

alter_statements = [
    # Reports
    "CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);",
    "CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);",
    "CREATE INDEX IF NOT EXISTS idx_reports_ai_category ON reports(ai_category);",
    "CREATE INDEX IF NOT EXISTS idx_reports_ai_urgency ON reports(ai_urgency);",
    # JSON alteration (assuming it is Text, changing it to JSON. Note: Using JSON format)
    # Using USING ai_metadata::json as a safety cast
    "ALTER TABLE reports ALTER COLUMN ai_metadata TYPE JSON USING ai_metadata::json;",

    # Work Orders
    "CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);",
    "CREATE INDEX IF NOT EXISTS idx_work_orders_wo_type ON work_orders(wo_type);",
    "CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);",

    # Process Timelines
    "CREATE INDEX IF NOT EXISTS idx_process_timelines_status ON process_timelines(status);",
    "CREATE INDEX IF NOT EXISTS idx_process_timelines_is_public ON process_timelines(is_public);",

    # Procurement
    "CREATE INDEX IF NOT EXISTS idx_procurement_status ON procurement_requests(status);",

    # Project
    "CREATE INDEX IF NOT EXISTS idx_project_status ON project_requests(status);",
    "CREATE INDEX IF NOT EXISTS idx_project_phase ON project_requests(current_phase);",

    # OBO
    "CREATE INDEX IF NOT EXISTS idx_obo_status ON obo_inspections(status);",
    "CREATE INDEX IF NOT EXISTS idx_obo_type ON obo_inspections(inspection_type);",
    "CREATE INDEX IF NOT EXISTS idx_obo_barangay ON obo_inspections(barangay);"
]

try:
    with engine.connect() as conn:
        for stmt in alter_statements:
            print(f"Executing: {stmt}")
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print(f"Skipping or failed: {e}")
        conn.commit()
        print("Indexes and Types successfully applied to the database!")
except Exception as e:
    print(f"Connection failed: {e}")
