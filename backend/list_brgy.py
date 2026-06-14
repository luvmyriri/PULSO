from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models, database
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/pulso_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

brgy = db.query(models.Barangay).all()
for b in brgy:
    print(f"{b.id}: {b.name}")
db.close()
