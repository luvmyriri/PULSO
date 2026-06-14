
from database import engine
from sqlalchemy import inspect

def inspect_db():
    inspector = inspect(engine)
    for table_name in inspector.get_table_names():
        print(f"Table: {table_name}")
        for column in inspector.get_columns(table_name):
            print(f"  - {column['name']} ({column['type']})")
        for fk in inspector.get_foreign_keys(table_name):
            print(f"  FK: {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
        print("-" * 20)

if __name__ == "__main__":
    inspect_db()
