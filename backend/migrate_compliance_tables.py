
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    print("STARTING DATABASE MIGRATION: system_documents compliance patch")
    
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found in .env")
        return

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Define columns to add
        columns_to_add = [
            ("category", "VARCHAR(255)"),
            ("confidentiality", "VARCHAR(50) DEFAULT 'Restricted'"),
            ("retention_policy", "VARCHAR(50)"),
            ("expiry_date", "TIMESTAMP WITH TIME ZONE"),
            ("legal_hold", "BOOLEAN DEFAULT FALSE"),
            ("npki_signature", "BOOLEAN DEFAULT FALSE")
        ]

        for col_name, col_type in columns_to_add:
            try:
                # Check if column exists first
                cur.execute(f"""
                    SELECT count(*) 
                    FROM information_schema.columns 
                    WHERE table_name='system_documents' AND column_name='{col_name}';
                """)
                if cur.fetchone()[0] == 0:
                    print(f"Adding column: {col_name} ({col_type})")
                    cur.execute(f"ALTER TABLE system_documents ADD COLUMN {col_name} {col_type};")
                    conn.commit()
                else:
                    print(f"Column {col_name} already exists. Skipping.")
            except Exception as e:
                print(f"Error adding column {col_name}: {e}")
                conn.rollback()

        print("Patching existing records with default metadata...")
        cur.execute("""
            UPDATE system_documents 
            SET confidentiality = 'Restricted', 
                legal_hold = False 
            WHERE confidentiality IS NULL OR legal_hold IS NULL;
        """)
        conn.commit()

        cur.close()
        conn.close()
        print("COMPLIANCE MIGRATION SUCCESSFUL.")

    except Exception as e:
        print(f"CRITICAL MIGRATION ERROR: {e}")

if __name__ == "__main__":
    migrate()
