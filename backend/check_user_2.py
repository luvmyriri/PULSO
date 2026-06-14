
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import json

def check_user(user_id):
    db = SessionLocal()
    try:
        print(f"Checking ID {user_id}...")
        
        # Check Resident
        res = db.query(models.Resident).filter(models.Resident.id == user_id).first()
        if res:
            print(f"MATCH: Resident table")
            print(f"Name: {res.full_name}")
            print(f"Email: {res.email}")
            print(f"Is Active: {res.is_active}")
            print(f"Is Verified: {res.is_verified}")
            return
            
        # Check Official
        off = db.query(models.Official).filter(models.Official.id == user_id).first()
        if off:
            print(f"MATCH: Official table")
            print(f"Name: {off.full_name}")
            print(f"Email: {off.email}")
            print(f"Role: {off.role}")
            print(f"Is Active: {off.is_active}")
            print(f"Created At: {off.created_at}")
            print(f"Capabilities: {off.capabilities}")
            return
            
        print("NOT FOUND in either table")
    finally:
        db.close()

if __name__ == "__main__":
    check_user(2)
