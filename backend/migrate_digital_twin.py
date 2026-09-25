import os
import sys
import sqlite3

db_path = os.path.join(os.path.dirname(__file__), "pulso.db")

def migrate():
    print(f"Migrating Digital Twin to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Create new tables
    cur.execute("""
    CREATE TABLE IF NOT EXISTS infrastructure_assets (
        asset_id VARCHAR PRIMARY KEY,
        asset_name VARCHAR,
        category VARCHAR,
        gps_coordinates JSON,
        material_type VARCHAR,
        date_completed DATE,
        design_life INTEGER DEFAULT 20,
        original_contractor VARCHAR,
        barangay VARCHAR
    );
    """)

    cur.execute("""
    CREATE INDEX IF NOT EXISTS ix_infrastructure_assets_asset_id ON infrastructure_assets (asset_id);
    """)

    cur.execute("""
    CREATE INDEX IF NOT EXISTS ix_infrastructure_assets_asset_name ON infrastructure_assets (asset_name);
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS maintenance_history (
        log_id VARCHAR PRIMARY KEY,
        asset_id VARCHAR NOT NULL REFERENCES infrastructure_assets(asset_id),
        work_type VARCHAR,
        cost FLOAT,
        completion_date DATE
    );
    """)

    cur.execute("""
    CREATE INDEX IF NOT EXISTS ix_maintenance_history_log_id ON maintenance_history (log_id);
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS environmental_context (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barangay_id INTEGER UNIQUE,
        flood_risk_level VARCHAR,
        soil_subsidence FLOAT
    );
    """)

    cur.execute("""
    CREATE INDEX IF NOT EXISTS ix_environmental_context_id ON environmental_context (id);
    """)

    cur.execute("""
    CREATE INDEX IF NOT EXISTS ix_environmental_context_barangay_id ON environmental_context (barangay_id);
    """)

    # Try modifying existing tables, ignore error if column exists
    try:
        cur.execute("ALTER TABLE work_orders ADD COLUMN asset_id VARCHAR REFERENCES infrastructure_assets(asset_id);")
        print("Added asset_id to work_orders.")
    except sqlite3.OperationalError as e:
        print(f"work_orders.asset_id info: {e}")

    try:
        cur.execute("ALTER TABLE project_requests ADD COLUMN asset_id VARCHAR REFERENCES infrastructure_assets(asset_id);")
        print("Added asset_id to project_requests.")
    except sqlite3.OperationalError as e:
        print(f"project_requests.asset_id info: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
