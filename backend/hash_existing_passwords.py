import os
import psycopg2
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:0428@localhost/pulso_db")

def hash_passwords():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        target_tables = ["residents", "officials"]
        
        for table in target_tables:
            print(f"--- Processing {table} ---")
            # Fetch all rows from current table
            cur.execute(f"SELECT id, password_hash FROM {table};")
            users = cur.fetchall()

            for user_id, password_hash in users:
                if not password_hash:
                    continue
                    
                # Check if it's already a bcrypt hash
                if not password_hash.startswith("$2b$"):
                    # Truncate to 71 chars for bcrypt safety
                    safe_password = password_hash[:71]
                    new_hash = pwd_context.hash(safe_password)
                    cur.execute(f"UPDATE {table} SET password_hash = %s WHERE id = %s", (new_hash, user_id))
                    print(f"Updated password for {table} ID {user_id}")

        conn.commit()
        print("Database passwords hashed successfully.")
    except Exception as e:
        print(f"Error updating database: {e}")
    finally:
        if 'conn' in locals() and conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    hash_passwords()
