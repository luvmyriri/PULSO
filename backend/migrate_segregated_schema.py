import psycopg2
from database import DATABASE_URL

def run_migration():
    print("--- Running Segregated Schema Migration ---")
    
    commands = [
        # Officials table updates
        "ALTER TABLE officials ADD COLUMN IF NOT EXISTS barangay VARCHAR",
        "ALTER TABLE officials ADD COLUMN IF NOT EXISTS address VARCHAR",
        "ALTER TABLE officials ADD COLUMN IF NOT EXISTS phone_number VARCHAR",
        
        # Reports table updates (Segregation)
        # First check if resident_id exists, if not add it
        "ALTER TABLE reports ADD COLUMN IF NOT EXISTS resident_id INTEGER REFERENCES residents(id) ON DELETE CASCADE",
        # We'll keep user_id for now to avoid breaking existing queries, but it should be null for new reports
        
        # Notifications table updates
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS resident_id INTEGER REFERENCES residents(id) ON DELETE CASCADE",
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS official_id INTEGER REFERENCES officials(id) ON DELETE CASCADE",
    ]
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        for cmd in commands:
            try:
                cursor.execute(cmd)
                print(f"Executed: {cmd[:50]}...")
            except Exception as e:
                print(f"Error executing {cmd[:50]}... : {e}")
                
        cursor.close()
        conn.close()
        print("--- Migration Finished ---")
    except Exception as e:
        print(f"Fatal error connecting to DB: {e}")

if __name__ == "__main__":
    run_migration()
