
from sqlalchemy import text, inspect
from database import engine, SessionLocal
from models import Official

def deep_purge_legacy_data():
    db = SessionLocal()
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    try:
        # 1. Drop BIMDMS Tables (if they still exist)
        tables_to_drop = ["dispatch_notifications", "dispatch_tasks", "dispatch_teams"]
        for table in tables_to_drop:
            if table in existing_tables:
                print(f"Dropping obsolete table: {table}")
                try:
                    db.execute(text(f'DROP TABLE "{table}" CASCADE'))
                except Exception:
                    print(f"Failed to drop {table}, moving on.")
            else:
                print(f"Table {table} already absent/dropped.")

        # 2. Identify Abolished Users
        abolished_roles = ['engineer', 'field_agent']
        legacy_users = db.query(Official).filter(Official.role.in_(abolished_roles)).all()
        legacy_ids = [u.id for u in legacy_users]
        
        if legacy_ids:
            print(f"Scrubbing references for {len(legacy_ids)} legacy users: {legacy_ids}")
            
            # id_list_str MUST be defined here
            id_list_str = ",".join(map(str, legacy_ids))
            
            # Map of tables and columns that may have FKs to User
            scrub_targets = {
                "audit_logs": ["actor_id"],
                "work_orders": ["assigned_to_id", "assigned_by_id"],
                "process_timelines": ["actor_id"],
                "procurement_requests": ["raised_by_id", "validated_by_id", "approved_by_id"],
                "project_requests": ["created_by_id", "survey_engineer_id", "design_lead_id", "project_engineer_id", "certificate_issued_by_id"],
                "obo_inspections": ["assigned_inspector_id", "filed_by_id", "cleared_by_id"],
                "reports": ["user_id"]
            }
            
            for table, columns in scrub_targets.items():
                if table in existing_tables:
                    for col in columns:
                        sql = f'UPDATE "{table}" SET "{col}" = NULL WHERE "{col}" IN ({id_list_str})'
                        try:
                            db.execute(text(sql))
                            print(f"Scrubbed {table}.{col}")
                        except Exception as e:
                            print(f"Skipped {table}.{col}: {e}")
                            
            # 3. Final Deletion
            deleted_count = db.query(Official).filter(Official.id.in_(legacy_ids)).delete(synchronize_session=False)
            print(f"Successfully deleted {deleted_count} legacy users.")
        else:
            print("No legacy users found.")
        
        db.commit()
        print("Final Deep Purge & Data Harmonization Complete.")

    except Exception as e:
        db.rollback()
        print(f"CRITICAL ERROR during deep purge: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    deep_purge_legacy_data()
