import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Ensure parent directory is in path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import engine, Base
import models
import gov_models

def force_recreate():
    print("--- FORCED SCHEMA RECREATION STARTING ---")
    
    with engine.connect() as conn:
        print("Executing hard reset of 'public' schema...")
        conn.execute(text("DROP SCHEMA public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        conn.commit()
    
    print("Creating tables from updated models...")
    Base.metadata.create_all(bind=engine)
    
    print("--- SCHEMA RECREATION COMPLETE ---")

if __name__ == "__main__":
    force_recreate()
