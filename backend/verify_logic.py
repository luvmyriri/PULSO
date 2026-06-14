import sys
import os
from sqlalchemy.orm import Session

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
import auth
import crud

def verify_system_logic():
    print("Testing system logic...")
    db = SessionLocal()
    try:
        # Test 1: User Retrieval
        admin_email = "admin@pulso.ph"
        user = crud.get_user_by_email(db, admin_email)
        if not user:
            print(f"FAILED: Could not find user {admin_email}")
            return
        print(f"SUCCESS: Found user {user.full_name} ({user.role})")
        
        # Test 2: Password Verification
        # Our repair script hashed 'password123'
        is_valid = auth.verify_password("password123", user.password_hash)
        if not is_valid:
            print("FAILED: Password verification failed")
        else:
            print("SUCCESS: Password verification works")
            
        # Test 3: Capabilities Access
        caps = user.capabilities
        print(f"SUCCESS: Capabilities retrieved: {caps}")
        
        # Test 4: Resident Retrieval
        resident_email = "juan@example.com"
        resident = crud.get_user_by_email(db, resident_email)
        if not resident:
             print(f"FAILED: Could not find resident {resident_email}")
        else:
             print(f"SUCCESS: Found resident {resident.full_name} ({resident.role})")
             print(f"SUCCESS: Resident capabilities: {resident.capabilities}")

        print("System logic verification completed.")
        
    except Exception as e:
        print(f"Error during verification: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_system_logic()
