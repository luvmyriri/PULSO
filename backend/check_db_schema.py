from database import engine
from sqlalchemy import inspect
import models

def check_schema():
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('officials')]
    print(f"Columns in 'officials': {columns}")
    
    if 'role' not in columns:
        print("Column 'role' is missing in 'officials' table!")
    else:
        print("Column 'role' exists.")

if __name__ == "__main__":
    check_schema()
