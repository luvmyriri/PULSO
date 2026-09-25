
from sqlalchemy import create_engine, text

# Get DB URL
import os
from dotenv import load_dotenv
load_dotenv('c:/Apache24/htdocs/PULSO/backend/.env')
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("--- REPORTS ---")
    res = conn.execute(text("SELECT id, title, category, status, reporting_user_id FROM reports")).fetchall()
    for row in res:
        print(row)
    
    print("\n--- RESIDENTS ---")
    res = conn.execute(text("SELECT id, name, email, google_id FROM residents")).fetchall()
    for row in res:
        print(row)

    print("\n--- OFFICIALS ---")
    res = conn.execute(text("SELECT id, name, email, role FROM officials")).fetchall()
    for row in res:
        print(row)
