import os
from dotenv import load_dotenv

# Ensure .env is loaded from backend directory
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

from database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        print("Migrating infrastructure_assets...")
        conn.execute(text("ALTER TABLE infrastructure_assets ADD COLUMN IF NOT EXISTS condition_score FLOAT DEFAULT 80.0;"))
        conn.execute(text("ALTER TABLE infrastructure_assets ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'operational';"))
        conn.execute(text("ALTER TABLE infrastructure_assets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();"))
        conn.execute(text("ALTER TABLE infrastructure_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();"))
        
        # Ensure existing rows have condition_score and status populated
        conn.execute(text("UPDATE infrastructure_assets SET condition_score = 82.5 WHERE condition_score IS NULL;"))
        conn.execute(text("UPDATE infrastructure_assets SET status = 'operational' WHERE status IS NULL;"))
        
        print("Migrating work_order_updates...")
        conn.execute(text("ALTER TABLE work_order_updates ADD COLUMN IF NOT EXISTS official_id INTEGER;"))
        conn.execute(text("UPDATE work_order_updates SET official_id = user_id WHERE official_id IS NULL AND user_id IS NOT NULL;"))

        # Also verify work_order_blockers table exists
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS work_order_blockers (
                id SERIAL PRIMARY KEY,
                work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
                reason_code VARCHAR NOT NULL,
                description TEXT NOT NULL,
                estimated_delay_hours INTEGER DEFAULT 24,
                is_resolved BOOLEAN DEFAULT FALSE,
                resolution_notes TEXT,
                reported_by_id INTEGER NOT NULL REFERENCES officials(id),
                resolved_by_id INTEGER REFERENCES officials(id),
                reported_at TIMESTAMPTZ DEFAULT NOW(),
                resolved_at TIMESTAMPTZ
            );
        """))
        
        conn.commit()
        print("Database schema migration successfully completed!")

if __name__ == "__main__":
    run_migration()
