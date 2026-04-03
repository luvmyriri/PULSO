
from database import SessionLocal
from models import User
from sqlalchemy import or_

def cleanup_legacy_data():
    db = SessionLocal()
    try:
        # Abolished roles in the recent "BIMDMS" deletion
        abolished_roles = ['engineer', 'field_agent']
        
        # Identity decommissioned users
        legacy_users = db.query(User).filter(User.role.in_(abolished_roles)).all()
        legacy_ids = [u.id for u in legacy_users]
        
        if not legacy_ids:
            print("No legacy users found.")
            return

        print(f"Identified {len(legacy_ids)} legacy users for removal.")

        # Handle dependencies (set to NULL or delete depending on criticality)
        # For simplicity, we'll try to delete them directly and catch the FK error
        # In a real scenario, we'd need to decide if we want to delete work_orders too.
        deleted_count = db.query(User).filter(User.id.in_(legacy_ids)).delete(synchronize_session=False)
        db.commit()
        print(f"Successfully purged {deleted_count} users.")
        
    except Exception as e:
        db.rollback()
        print(f"CRITICAL ERROR during cleanup: {e}")
        import traceback
        traceback.print_exc()
        
        # Check for any other test accounts that shouldn't be here
        # (Optional: the user might want to keep other accounts like 'dispatcher' and 'manager' for the Dispatcher HQ/HQ lite)
        
    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_legacy_data()
