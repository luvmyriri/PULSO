
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
load_dotenv('c:/Apache24/htdocs/PULSO/backend/.env')
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    print("--- RESIDENTS ---")
    res = conn.execute(text("SELECT id, full_name, email FROM residents")).fetchall()
    for row in res:
        print(row)
    print("\n--- REPORTS ---")
    res = conn.execute(text("SELECT id, category, status FROM reports")).fetchall()
    for row in res:
        print(row)
