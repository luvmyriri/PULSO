import psycopg2
import os

try:
    # URL: postgresql://postgres:0428@localhost/pulso_db
    conn = psycopg2.connect("dbname='pulso_db' user='postgres' password='0428' host='localhost'")
    cursor = conn.cursor()

    # 1. Add 'is_verified' column if not exists
    print("Checking for 'is_verified' column...")
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='is_verified'")
    if not cursor.fetchone():
        print("Adding 'is_verified' (Boolean, DEFAULT False)...")
        cursor.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT False")
    else:
        print("'is_verified' column already exists.")

    # 2. Add 'verification_code' column if not exists
    print("Checking for 'verification_code' column...")
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='verification_code'")
    if not cursor.fetchone():
        print("Adding 'verification_code' (String)...")
        cursor.execute("ALTER TABLE users ADD COLUMN verification_code VARCHAR")
    else:
        print("'verification_code' column already exists.")

    # 3. Clear the problematic email to allow fresh registration
    email_to_clear = 'tabios.gcncbssis2023@gmail.com'
    print(f"Clearing record for: {email_to_clear}...")
    cursor.execute("DELETE FROM users WHERE email = %s", (email_to_clear,))
    rows_deleted = cursor.rowcount
    print(f"Deleted {rows_deleted} record(s).")

    conn.commit()
    print("Migration and account reset complete.")
    conn.close()
except Exception as e:
    print(f"Error during migration: {e}")
