
from sqlalchemy.orm import Session
from database import SessionLocal
import models

def check_user_raw(user_id):
    db = SessionLocal()
    try:
        res = db.query(models.Resident).filter(models.Resident.id == user_id).first()
        if res:
            print(f"Created At: {res.created_at}")
            print(f"Type of Created At: {type(res.created_at)}")
            print(f"KYC Level: {res.kyc_level}")
            # print all attributes
            from sqlalchemy import inspect
            inst = inspect(res)
            for k, v in inst.attrs.items():
                print(f"{k}: {v.value}")
    finally:
        db.close()

if __name__ == "__main__":
    check_user_raw(2)
