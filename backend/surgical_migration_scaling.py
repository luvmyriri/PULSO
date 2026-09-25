import logging
from sqlalchemy import text
from database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    columns_to_add = [
        ("project_requests", "estimated_cost", "FLOAT DEFAULT 0.0"),
        ("project_requests", "is_emergency", "BOOLEAN DEFAULT FALSE"),
        ("project_requests", "procurement_modality", "VARCHAR DEFAULT 'competitive_bidding'"),
        ("project_requests", "category", "VARCHAR DEFAULT 'new_construction'"),
    ]

    with engine.connect() as conn:
        for table, col, defn in columns_to_add:
            try:
                logger.info(f"Adding {col} to {table}...")
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {defn}"))
                conn.commit()
                logger.info(f"Successfully added {col}.")
            except Exception as e:
                logger.warning(f"Error adding {col} (might already exist): {e}")
                conn.rollback()

    logger.info("Surgical migration complete!")

if __name__ == "__main__":
    migrate()
