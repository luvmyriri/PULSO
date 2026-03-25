import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from database import engine, Base
import models

try:
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="0428",
        host="localhost"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'pulso_db'")
    exists = cursor.fetchone()
    if not exists:
        cursor.execute("CREATE DATABASE pulso_db")
        print("Created database pulso_db")
    else:
        print("Database pulso_db already exists")
    cursor.close()
    conn.close()
except psycopg2.OperationalError as e:
    print(f"Could not connect to PostgreSQL server: {e}")
    exit(1)
except Exception as e:
    print(f"Error creating db: {e}")
    exit(1)

# Create tables
Base.metadata.create_all(bind=engine)
print("Tables created successfully")
