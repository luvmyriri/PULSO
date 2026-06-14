
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    print("STARTING DATABASE MIGRATION: Territorial Dispatch Schema")
    
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found in .env")
        return

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Users Table
        print("Updating 'users' table...")
        cols_users = [
            ("display_name", "VARCHAR(255)"),
            ("district_id", "INTEGER"),
            ("primary_jurisdiction", "JSON")
        ]
        for col, dtype in cols_users:
            cur.execute(f"SELECT count(*) FROM information_schema.columns WHERE table_name='users' AND column_name='{col}';")
            if cur.fetchone()[0] == 0:
                print(f"Adding users.{col}")
                cur.execute(f"ALTER TABLE users ADD COLUMN {col} {dtype};")

        # Notifications Table
        print("Updating 'notifications' table...")
        cur.execute("SELECT count(*) FROM information_schema.columns WHERE table_name='notifications' AND column_name='priority';")
        if cur.fetchone()[0] == 0:
            print("Adding notifications.priority")
            cur.execute("ALTER TABLE notifications ADD COLUMN priority INTEGER DEFAULT 0;")

        # Reports Table
        print("Updating 'reports' table...")
        cur.execute("SELECT count(*) FROM information_schema.columns WHERE table_name='reports' AND column_name='location_barangay';")
        if cur.fetchone()[0] == 0:
            print("Adding reports.location_barangay")
            cur.execute("ALTER TABLE reports ADD COLUMN location_barangay INTEGER;")

        # Work Orders Table
        print("Updating 'work_orders' table...")
        cols_wo = [
            ("priority_score", "FLOAT DEFAULT 0.0"),
            ("is_emergency_assignment", "BOOLEAN DEFAULT FALSE"),
            ("assignment_type", "VARCHAR(50) DEFAULT 'territorial'")
        ]
        for col, dtype in cols_wo:
            cur.execute(f"SELECT count(*) FROM information_schema.columns WHERE table_name='work_orders' AND column_name='{col}';")
            if cur.fetchone()[0] == 0:
                print(f"Adding work_orders.{col}")
                cur.execute(f"ALTER TABLE work_orders ADD COLUMN {col} {dtype};")

        conn.commit()
        cur.close()
        conn.close()
        print("MIGRATION COMPLETED SUCCESSFULLY.")

    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
