import sqlite3
import psycopg2
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

try:
    conn = psycopg2.connect("postgresql://postgres:0428@localhost/pulso_db")
    cur = conn.cursor()
    # Fetch all users
    cur.execute("SELECT id, password_hash FROM users;")
    users = cur.fetchall()

    for user_id, password_hash in users:
        # Check if it's already a bcrypt hash
        if not password_hash.startswith("$2b$"):
            # Truncate to 71 chars just to be safe
            safe_password = password_hash[:71]
            new_hash = pwd_context.hash(safe_password)
            cur.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
            print(f"Updated password for user {user_id}")

    conn.commit()
    print("Database passwords hashed successfully.")
except Exception as e:
    print(f"Error updating database: {e}")
finally:
    if 'conn' in locals() and conn:
        cur.close()
        conn.close()
