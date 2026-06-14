import psycopg2
from database import engine

def check_table(table_name):
    print(f"\nChecking table: {table_name}")
    try:
        conn = psycopg2.connect(
            dbname="pulso_db",
            user="postgres",
            password="0428",
            host="localhost"
        )
        cursor = conn.cursor()
        cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}'")
        columns = [row[0] for row in cursor.fetchall()]
        print(f"Columns in {table_name}:")
        for c in columns:
            print(f"  - {c}")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error checking {table_name}: {e}")

check_table("officials")
check_table("residents")
check_table("reports")
check_table("notifications")
