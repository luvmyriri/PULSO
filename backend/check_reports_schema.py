import sys
import os
sys.path.append(os.getcwd())
from database import engine
from sqlalchemy import inspect

def check_reports_schema():
    inspector = inspect(engine)
    columns = inspector.get_columns('reports')
    print("Columns in 'reports' table:")
    for column in columns:
        print(f" - {column['name']} ({column['type']})")

if __name__ == "__main__":
    check_reports_schema()
