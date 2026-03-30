import psycopg2

try:
    conn = psycopg2.connect("postgresql://postgres:0428@localhost/pulso_db")
    cur = conn.cursor()
    print("Connecting to pulso_db...")
    
    # Check current columns in 'users' table
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users';")
    columns = [row[0] for row in cur.fetchall()]
    print(f"Current columns in 'users': {columns}")
    
    # Add missing columns
    if 'is_verified' not in columns:
        print("Adding is_verified column...")
        cur.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;")
    
    if 'verification_code' not in columns:
        print("Adding verification_code column...")
        cur.execute("ALTER TABLE users ADD COLUMN verification_code VARCHAR;")
        
    if 'address' not in columns:
        print("Adding address column...")
        cur.execute("ALTER TABLE users ADD COLUMN address VARCHAR;")

    if 'barangay' not in columns:
        print("Adding barangay column...")
        cur.execute("ALTER TABLE users ADD COLUMN barangay VARCHAR;")

    if 'trust_score' not in columns:
        print("Adding trust_score column...")
        cur.execute("ALTER TABLE users ADD COLUMN trust_score INTEGER DEFAULT 100;")

    # Ensure admin user is verified
    print("Ensuring admin@pulso.system is verified...")
    cur.execute("UPDATE users SET is_verified = TRUE WHERE email = 'admin@pulso.system';")
    
    conn.commit()
    print("Database schema synchronization complete.")
    
except Exception as e:
    print(f"Error updating database: {e}")
finally:
    if 'conn' in locals() and conn:
        cur.close()
        conn.close()
