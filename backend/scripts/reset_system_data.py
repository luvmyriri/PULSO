import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def reset_operational_data():
    """
    Safely truncates operational tables to clear inconsistent data.
    Preserves users, districts, and core configuration.
    """
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found in environment.")
        return

    # Tables to wipe in order of dependency (leaf to root)
    tables = [
        "boq_items",
        "procurement_requests",
        "work_order_updates",
        "work_order_approvals",
        "work_orders",
        "system_documents",
        "process_timelines",
        "audit_logs",
        "notifications",
        "advisories",
        "reports",
        "project_requests",
        "agent_locations"
    ]

    engine = create_engine(DATABASE_URL)
    
    print("--- Starting System Data Reset ---")
    with engine.connect() as conn:
        for table in tables:
            try:
                print(f"Truncating {table}...")
                conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;"))
                conn.commit()
            except Exception as e:
                print(f"Warning: Could not truncate {table}: {e}")
                # Reset transaction for next table
                conn.rollback()
        
    print("--- Reset Complete: Operational data cleared ---")

if __name__ == "__main__":
    reset_operational_data()
