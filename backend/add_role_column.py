from database import engine
from sqlalchemy import text

def update_schema():
    with engine.connect() as conn:
        print("Adding 'role' column to 'officials' table...")
        try:
            conn.execute(text("ALTER TABLE officials ADD COLUMN role VARCHAR;"))
            conn.commit()
            print("Successfully added 'role' column.")
        except Exception as e:
            print(f"Error adding column: {e}")
            
    # Also ensure SystemRoles are present if needed, but Official needs 'role' string for compatibility
    
if __name__ == "__main__":
    update_schema()
