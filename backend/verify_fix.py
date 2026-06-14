from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models, database, schemas
import os
import json

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/pulso_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

user = db.query(models.Resident).filter(models.Resident.email == 'johnemmanuelnalang1@gmail.com').first()
if user:
    # Simulate Pydantic serialization
    response = schemas.UserResponse.from_orm(user)
    print(json.dumps(response.dict(), indent=2, default=str))
else:
    print("User not found")
db.close()
