from sqlalchemy import text, inspect
import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(__file__))

from database import engine

def migrate():
    print("--- Starting Database Migration (PostgreSQL): FQA & Asset Registry ---")
    
    with engine.connect() as conn:
        inspector = inspect(engine)
        
        # 1. Check if 'project_requests' table exists
        if 'project_requests' in inspector.get_table_names():
            print("Table 'project_requests' found. Checking for new columns...")
            columns = [c['name'] for c in inspector.get_columns('project_requests')]
            
            # Fields to add
            new_fields = [
                ("qa_rejection_count", "INTEGER DEFAULT 0"),
                ("fqa_savings", "DOUBLE PRECISION DEFAULT 0.0"),
                ("dlp_expiry", "TIMESTAMP WITH TIME ZONE"),
                ("asset_id", "VARCHAR")
            ]
            
            for field_name, field_type in new_fields:
                if field_name not in columns:
                    try:
                        conn.execute(text(f"ALTER TABLE project_requests ADD COLUMN {field_name} {field_type}"))
                        print(f"Added column '{field_name}' to 'project_requests'.")
                    except Exception as e:
                        print(f"Error adding {field_name}: {e}")
                else:
                    print(f"Column '{field_name}' already exists.")
        else:
            print("Table 'project_requests' not found. Ensure models are initialized first.")

        # 2. Ensure infrastructure_assets table exists (metadata.create_all handles this usually, but let's be explicit)
        if 'infrastructure_assets' not in inspector.get_table_names():
            print("Creating 'infrastructure_assets' table...")
            # Note: gov_models.Base.metadata.create_all(bind=engine) in main.py usually does this.
            # But let's run a raw create to be sure if create_all failed.
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS infrastructure_assets (
                    asset_id VARCHAR PRIMARY KEY,
                    asset_name VARCHAR NOT NULL,
                    category VARCHAR,
                    gps_coordinates JSONB,
                    material_type VARCHAR,
                    date_completed DATE,
                    design_life INTEGER DEFAULT 20,
                    original_contractor VARCHAR,
                    barangay VARCHAR
                )
            """))
            print("Table 'infrastructure_assets' created.")
        else:
            print("Table 'infrastructure_assets' already exists.")

        # 3. Ensure maintenance_history exists
        if 'maintenance_history' not in inspector.get_table_names():
            print("Creating 'maintenance_history' table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS maintenance_history (
                    log_id VARCHAR PRIMARY KEY,
                    asset_id VARCHAR REFERENCES infrastructure_assets(asset_id),
                    work_type VARCHAR,
                    cost DOUBLE PRECISION,
                    completion_date DATE
                )
            """))
            print("Table 'maintenance_history' created.")

        conn.commit()
    
    print("--- Migration Successful ---")

if __name__ == "__main__":
    migrate()
