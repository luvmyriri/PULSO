from database import engine
from sqlalchemy import text
import logging

def check_columns():
    try:
        with engine.connect() as conn:
            # PostgreSQL query to get columns of project_requests
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'project_requests'"))
            columns = [row[0] for row in res]
            print("Columns in project_requests:")
            for col in sorted(columns):
                print(f"  - {col}")
            
            if 'estimated_cost' not in columns:
                print("\nCRITICAL: 'estimated_cost' is MISSING!")
            else:
                print("\nSUCCESS: 'estimated_cost' is present.")
    except Exception as e:
        print(f"Error checking column: {e}")

if __name__ == "__main__":
    check_columns()
