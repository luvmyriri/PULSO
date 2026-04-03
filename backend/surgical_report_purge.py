import os
import psycopg2
from dotenv import load_dotenv

# Absolute Path to project root
PROJECT_ROOT = r"C:\Apache24\htdocs\PULSO"

# Load environment
load_dotenv(os.path.join(PROJECT_ROOT, "backend", ".env"))
DATABASE_URL = os.getenv("DATABASE_URL")

def surgical_purge():
    """
    Surgically removes reports from PostgreSQL that have NO image.
    Handles all discovered foreign key dependencies (Standard, OBO, Projects, Dispatches).
    """
    if not DATABASE_URL:
        print("[ERROR] DATABASE_URL not found.")
        return

    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True 
        cur = conn.cursor()

        print("--- PULSO Final Surgical Database Purge ---")
        
        # 1. Fetch IDs of reports with no image
        cur.execute("SELECT id, ticket_id FROM reports WHERE image_url IS NULL OR image_url = '';")
        targets = cur.fetchall()
        
        if len(targets) == 0:
            print("[INFO] No reports found without images.")
            conn.close()
            return

        print(f"[PROCESS] Found {len(targets)} reports to purge.")

        # Mapping of tables to their report foreign key column name
        dependency_map = [
            ("dispatch_status_updates", "report_id"),
            ("dispatch_incidents", "report_id"),
            ("audit_logs", "report_id"),
            ("process_timeline", "report_id"),
            ("work_orders", "report_id"),
            ("obo_inspections", "source_report_id"),
            ("project_requests", "source_report_id"),
            ("project_timelines", "report_id") # Based on previous error log encounter
        ]

        for r_id, t_id in targets:
            print(f"[PURGING] Report ID: {r_id} ({t_id})...")
            
            # Delete from each dependency table
            for table, col in dependency_map:
                try:
                    cur.execute(f"DELETE FROM {table} WHERE {col} = %s", (r_id,))
                    if cur.rowcount > 0:
                        print(f"  - Cleared {cur.rowcount} rows from {table}")
                except psycopg2.Error as e:
                    # If table/column doesn't exist, we skip gracefully
                    # (Some tables might only exist in certain db versions)
                    conn.rollback() # Reset transaction after error
                    # print(f"  - Skip {table} (skipping: {e.pgerror.splitlines()[0]})")
                    pass

            # Final delete of the report
            try:
                cur.execute("DELETE FROM reports WHERE id = %s", (r_id,))
                print(f"  [SUCCESS] Deleted Report {r_id}.")
            except Exception as e:
                print(f"  [ERROR] Could not delete Report {r_id}: {e}")

        print("[FINISH] Purge complete. The map should now be clear of seeded mock data.")
        conn.close()

    except Exception as e:
        print(f"[FATAL] Purge failed: {e}")

if __name__ == "__main__":
    surgical_purge()
