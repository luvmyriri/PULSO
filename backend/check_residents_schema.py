import sys
import os
sys.path.append(os.getcwd())
from database import engine
from sqlalchemy import inspect

def check_residents_schema():
    inspector = inspect(engine)
    columns = inspector.get_columns('residents')
    print("Columns in 'residents' table:")
    for column in columns:
        print(f" - {column['name']} ({column['type']})")

if __name__ == "__main__":
    check_residents_schema()
