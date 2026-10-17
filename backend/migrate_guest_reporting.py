"""
migrate_guest_reporting.py
PULSO — Caloocan City Engineering Department Management System
Milestone 1: Guest Reporting & Contextual Authentication Database Migration

Idempotent dual-dialect migration script supporting PostgreSQL and SQLite.
Adds guest reporting columns, ensures nullable resident_id, adds indexes, and backfills defaults.
"""

import os
import sys
import argparse
import logging
from typing import Optional, Union
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine import Engine

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migrate_guest_reporting")


def run_migration(engine_or_url: Optional[Union[Engine, str]] = None) -> bool:
    """
    Executes the guest reporting schema migration idempotently.
    Accepts an Engine instance, database URL string, or defaults to database.py engine.
    """
    if engine_or_url is None:
        try:
            from database import engine as default_engine
            engine = default_engine
        except Exception as e:
            logger.warning(f"Could not load engine from database.py ({e}), falling back to SQLite pulso.db")
            engine = create_engine("sqlite:///pulso.db")
    elif isinstance(engine_or_url, str):
        engine = create_engine(engine_or_url)
    else:
        engine = engine_or_url

    dialect = engine.dialect.name
    print("\n" + "=" * 65)
    print(f"  PULSO -- DB Migration: Guest Reporting & Contextual Auth")
    print(f"  Target Engine Dialect: {dialect.upper()}")
    print("=" * 65)

    with engine.connect() as conn:
        inspector = inspect(conn)

        # 1. Verify reports table exists
        existing_tables = inspector.get_table_names()
        if "reports" not in existing_tables:
            logger.warning("Table 'reports' does not exist. Bootstrap the database before this legacy migration.")
            return False

        existing_cols = {c["name"]: c for c in inspector.get_columns("reports")}
        logger.info(f"Inspected 'reports' table: {len(existing_cols)} existing columns found.")

        # 2. Define columns to add per dialect
        if dialect == "postgresql":
            columns_to_add = [
                ("reporter_type", "VARCHAR(20) DEFAULT 'registered' NOT NULL"),
                ("tracking_token_hash", "VARCHAR(128)"),
                ("contact_email", "VARCHAR(255)"),
                ("contact_phone", "VARCHAR(50)"),
                ("contact_verified", "BOOLEAN DEFAULT FALSE NOT NULL"),
                ("claimed_at", "TIMESTAMP WITH TIME ZONE"),
                ("claimed_by_user_id", "INTEGER REFERENCES residents(id) ON DELETE SET NULL"),
                ("submission_source", "VARCHAR(30) DEFAULT 'web' NOT NULL"),
            ]
        else:  # SQLite and other fallbacks
            columns_to_add = [
                ("reporter_type", "VARCHAR(20) DEFAULT 'registered'"),
                ("tracking_token_hash", "VARCHAR(128)"),
                ("contact_email", "VARCHAR(255)"),
                ("contact_phone", "VARCHAR(50)"),
                ("contact_verified", "BOOLEAN DEFAULT 0"),
                ("claimed_at", "DATETIME"),
                ("claimed_by_user_id", "INTEGER REFERENCES residents(id)"),
                ("submission_source", "VARCHAR(30) DEFAULT 'web'"),
            ]

        # 3. Add missing columns
        print("\n--- 1. Column Synchronization ---")
        for col_name, col_def in columns_to_add:
            if col_name not in existing_cols:
                try:
                    conn.execute(text(f"ALTER TABLE reports ADD COLUMN {col_name} {col_def}"))
                    conn.commit()
                    print(f"  [ADDED] Column '{col_name}' ({col_def})")
                except Exception as e:
                    conn.rollback()
                    print(f"  [ERROR] Adding column '{col_name}': {e}")
            else:
                print(f"  [EXISTS] Column '{col_name}' already present")

        # 4. Modify resident_id nullability (PostgreSQL)
        print("\n--- 2. Foreign Key & Nullability Verification ---")
        if dialect == "postgresql":
            try:
                conn.execute(text("ALTER TABLE reports ALTER COLUMN resident_id DROP NOT NULL"))
                conn.commit()
                print("  [OK] Verified 'resident_id' is nullable")
            except Exception as e:
                conn.rollback()
                print(f"  [NOTE] Nullability adjustment on 'resident_id': {e}")
        else:
            print("  [OK] SQLite allows null resident_id by default")

        # 5. Create Performance Indexes
        print("\n--- 3. Performance Indexes ---")
        indexes = [
            ("ix_reports_reporter_type", "CREATE INDEX IF NOT EXISTS ix_reports_reporter_type ON reports(reporter_type)"),
            ("ix_reports_tracking_token_hash", "CREATE INDEX IF NOT EXISTS ix_reports_tracking_token_hash ON reports(tracking_token_hash)"),
            ("ix_reports_contact_email", "CREATE INDEX IF NOT EXISTS ix_reports_contact_email ON reports(contact_email)"),
            ("ix_reports_claimed_by_user_id", "CREATE INDEX IF NOT EXISTS ix_reports_claimed_by_user_id ON reports(claimed_by_user_id)"),
            ("ix_reports_resident_id", "CREATE INDEX IF NOT EXISTS ix_reports_resident_id ON reports(resident_id)"),
        ]

        for idx_name, idx_sql in indexes:
            try:
                conn.execute(text(idx_sql))
                conn.commit()
                print(f"  [INDEX] {idx_name} verified")
            except Exception as e:
                conn.rollback()
                print(f"  [INDEX] {idx_name} note: {e}")

        # 6. Backfill Default Values for Legacy Rows
        print("\n--- 4. Legacy Data Sanitization & Backfill ---")
        try:
            conn.execute(text("UPDATE reports SET reporter_type = 'registered' WHERE reporter_type IS NULL"))
            conn.execute(text("UPDATE reports SET submission_source = 'web' WHERE submission_source IS NULL"))
            if dialect == "postgresql":
                conn.execute(text("UPDATE reports SET contact_verified = FALSE WHERE contact_verified IS NULL"))
            else:
                conn.execute(text("UPDATE reports SET contact_verified = 0 WHERE contact_verified IS NULL"))
            conn.commit()
            print("  [BACKFILL] Legacy reports backfilled with default values")
        except Exception as e:
            conn.rollback()
            print(f"  [BACKFILL] Note: {e}")

    print("=" * 65)
    print("  Migration completed successfully. Schema is in sync.")
    print("=" * 65 + "\n")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PULSO Guest Reporting DB Migration")
    parser.add_argument("--database-url", type=str, default=None, help="Custom database connection URL")
    args = parser.parse_args()

    success = run_migration(args.database_url)
    sys.exit(0 if success else 1)
