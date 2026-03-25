import sqlite3
import psycopg2

try:
    conn = psycopg2.connect("postgresql://postgres:0428@localhost/pulso_db")
    cur = conn.cursor()
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR;")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR,
        message VARCHAR,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()
    print("Database updated successfully.")
except Exception as e:
    print(f"Error updating database: {e}")
finally:
    if 'conn' in locals() and conn:
        cur.close()
        conn.close()
