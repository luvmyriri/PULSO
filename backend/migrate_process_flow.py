import logging
from sqlalchemy import text
from database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    columns_to_add = [
        # OBOInspections Technical Review & Appeal columns
        ("obo_inspections", "arch_review", "VARCHAR DEFAULT 'pending'"),
        ("obo_inspections", "civil_review", "VARCHAR DEFAULT 'pending'"),
        ("obo_inspections", "elec_review", "VARCHAR DEFAULT 'pending'"),
        ("obo_inspections", "sani_review", "VARCHAR DEFAULT 'pending'"),
        ("obo_inspections", "mech_review", "VARCHAR DEFAULT 'pending'"),
        ("obo_inspections", "appeal_status", "VARCHAR DEFAULT 'none'"),
        ("obo_inspections", "appeal_evidence_url", "TEXT NULL"),
        ("obo_inspections", "order_of_payment_fee", "FLOAT NULL"),
        ("obo_inspections", "payment_verified", "BOOLEAN DEFAULT FALSE"),

        # ProcurementRequests
        ("procurement_requests", "funding_certified", "BOOLEAN DEFAULT FALSE"),
        ("procurement_requests", "ntp_issued", "BOOLEAN DEFAULT FALSE"),

        # WorkOrders
        ("work_orders", "citizen_feedback", "VARCHAR DEFAULT 'pending'"),
    ]

    with engine.connect() as conn:
        for table, col, defn in columns_to_add:
            try:
                logger.info(f"Adding {col} to {table}...")
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {defn}"))
                conn.commit()
                logger.info(f"Successfully added {col}.")
            except Exception as e:
                # In robust applications, we might look for specific psycopg2 DuplicateColumn exceptions
                logger.warning(f"Error or duplicate adding {col}: {e}")
                conn.rollback()

        # Set legacy OBO inspections that were already approved conceptually to 'approved'
        try:
            conn.execute(text("""
                UPDATE obo_inspections 
                SET arch_review = 'approved', civil_review = 'approved', elec_review = 'approved', 
                    sani_review = 'approved', mech_review = 'approved'
                WHERE status IN ('permit_issued', 'cleared', 'payment_verified', 'technical_review_cleared')
            """))
            conn.commit()
            logger.info("Updated legacy OBO rows.")
        except Exception as e:
            logger.error(f"Error updating legacy statuses: {e}")
            conn.rollback()

    logger.info("Migration complete!")

if __name__ == "__main__":
    migrate()
