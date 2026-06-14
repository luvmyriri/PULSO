from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models, database
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/pulso_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

user = db.query(models.Resident).filter(models.Resident.email == 'johnemmanuelnalang1@gmail.com').first()
if user:
    print(f"ID: {user.id}")
    print(f"Full Name: {user.full_name}")
    print(f"Address: {user.address}")
    print(f"Barangay ID: {user.barangay_id}")
    if user.barangay_ref:
        print(f"Barangay Name: {user.barangay_ref.name}")
    else:
        print("Barangay Ref: None")
else:
    print("User not found")
db.close()
