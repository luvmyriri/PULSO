
import sys
import os
sys.path.append(os.getcwd())
from sqlalchemy.orm import Session
from database import SessionLocal
import models

def check_officials():
    db = SessionLocal()
    try:
        officials = db.query(models.Official).all()
        print(f"Total officials: {len(officials)}")
        for o in officials:
            print(f"ID: {o.id}, Name: {o.full_name}, Email: {o.email}, Role: {o.role}")
    finally:
        db.close()

if __name__ == "__main__":
    check_officials()
