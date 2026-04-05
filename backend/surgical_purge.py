
from sqlalchemy import text, inspect
from database import engine, SessionLocal
from models import User

def surgical_user_purge():
    # 1. Identify Target IDs (Only 'engineer' and 'field_agent' roles)
    db = SessionLocal()
    try:
        abolished_roles = ['engineer', 'field_agent']
        legacy_users = db.query(User).filter(User.role.in_(abolished_roles)).all()
        legacy_ids = [u.id for u in legacy_users]
    finally:
        db.close()
        
    if not legacy_ids:
        print("No targeted legacy users found.")
        return

    print(f"Surgically purging {len(legacy_ids)} accounts: {legacy_ids}")
    id_list_str = ",".join(map(str, legacy_ids))

    # 2. Identify all tables that could have foreign keys to 'users'
    inspector = inspect(engine)
    all_tables = inspector.get_table_names()
    
    # 3. Create a single robust script with multiple attempts
    # We'll use a connection directly to be more surgical and avoid transaction poisoning in SQLAlchemy ORM
    with engine.connect() as connection:
        # Start a transaction
        trans = connection.begin()
        try:
            # 3.1. Drop any table that is strictly part of the deleted dispatch system
            # if the user was okay with it, but they said "only delete accounts"
            # So I will just delete the rows in those tables.
            for table in all_tables:
                columns = [c['name'] for c in inspector.get_columns(table)]
                # Target columns that likely hold user IDs
                user_ref_cols = ["user_id", "lead_id", "created_by_id", "assigned_to_id", "actor_id", "assigned_by_id", "raised_by_id", "validated_by_id", "approved_by_id", "survey_engineer_id", "design_lead_id", "project_engineer_id", "certificate_issued_by_id", "assigned_inspector_id", "filed_by_id", "cleared_by_id"]
                
                for col in columns:
                    if col in user_ref_cols:
                        if table.startswith("dispatch_"):
                            # Delete the record entirely from the deleted system's tables
                            sql = text(f'DELETE FROM "{table}" WHERE "{col}" IN ({id_list_str})')
                            connection.execute(sql)
                            print(f"Deleted rows from {table}.{col}")
                        else:
                            # Update to NULL for the main government tables (preserve history)
                            sql = text(f'UPDATE "{table}" SET "{col}" = NULL WHERE "{col}" IN ({id_list_str})')
                            connection.execute(sql)
                            print(f"Nullified {table}.{col}")
            
            # 4. Finally, delete the users
            sql = text(f'DELETE FROM users WHERE id IN ({id_list_str})')
            result = connection.execute(sql)
            print(f"Successfully deleted {result.rowcount} legacy accounts.")
            
            trans.commit()
            print("Purge committed successfully.")
        except Exception as e:
            trans.rollback()
            print(f"FAILED to purge: {e}")

if __name__ == "__main__":
    surgical_user_purge()
