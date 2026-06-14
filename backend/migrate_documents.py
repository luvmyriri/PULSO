from sqlalchemy import text
from database import engine, Base
import gov_models
import models

def run_migration():
    print("Creating new tables (SystemDocument)...")
    Base.metadata.create_all(bind=engine)
    
    print("Altering ProjectRequest to add FQA columns...")
    
    with engine.connect() as conn:
        with conn.begin():
            try:
                conn.execute(text("ALTER TABLE project_requests ADD COLUMN qa_rejection_count INTEGER DEFAULT 0"))
                print(" - Added qa_rejection_count")
            except Exception as e:
                print(f"Skipping qa_rejection_count: {e}")

            try:
                conn.execute(text("ALTER TABLE project_requests ADD COLUMN fqa_savings DOUBLE PRECISION DEFAULT 0.0"))
                print(" - Added fqa_savings")
            except Exception as e:
                print(f"Skipping fqa_savings: {e}")
                
            try:
                conn.execute(text("ALTER TABLE project_requests ADD COLUMN dlp_expiry TIMESTAMP WITH TIME ZONE"))
                print(" - Added dlp_expiry")
            except Exception as e:
                print(f"Skipping dlp_expiry: {e}")

    print("Migration complete!")

if __name__ == "__main__":
    run_migration()
