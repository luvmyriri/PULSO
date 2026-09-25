
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
tables = [
    "reports", "residents", "officials", "work_orders", 
    "project_requests", "procurement_requests", "obo_inspections",
    "infrastructure_assets", "maintenance_history", "audit_logs",
    "advisories", "notifications"
]

with engine.connect() as conn:
    print(f"{'Table':<25} | {'Count':<10}")
    print("-" * 40)
    for table in tables:
        try:
            res = conn.execute(text(f"SELECT count(*) FROM {table}"))
            count = res.fetchone()[0]
            print(f"{table:<25} | {count:<10}")
        except Exception as e:
            print(f"{table:<25} | Error: {str(e).splitlines()[0]}")
