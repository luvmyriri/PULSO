"""Add normalized contact columns and uniqueness safeguard for residents.

Revision ID: 7a8e9f0c1b2d
Revises: f3a6d8c1b250
Create Date: 2026-10-24
"""

from alembic import op
import sqlalchemy as sa


revision = "7a8e9f0c1b2d"
down_revision = "f3a6d8c1b250"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add normalized columns to residents table
    op.execute("ALTER TABLE residents ADD COLUMN IF NOT EXISTS normalized_email VARCHAR NULL")
    op.execute("ALTER TABLE residents ADD COLUMN IF NOT EXISTS normalized_phone_number VARCHAR NULL")
    
    # 2. Backfill existing records with normalized values
    # For email: trim and lowercase
    op.execute("""
        UPDATE residents 
        SET normalized_email = LOWER(TRIM(email)) 
        WHERE email IS NOT NULL AND normalized_email IS NULL
    """)
    
    # For phone: clean digits and standard format
    op.execute("""
        UPDATE residents 
        SET normalized_phone_number = 
            CASE 
                WHEN REGEXP_REPLACE(phone_number, '\\D', '', 'g') LIKE '639%' AND LENGTH(REGEXP_REPLACE(phone_number, '\\D', '', 'g')) = 12 
                    THEN '+' || REGEXP_REPLACE(phone_number, '\\D', '', 'g')
                WHEN REGEXP_REPLACE(phone_number, '\\D', '', 'g') LIKE '09%' AND LENGTH(REGEXP_REPLACE(phone_number, '\\D', '', 'g')) = 11 
                    THEN '+63' || SUBSTRING(REGEXP_REPLACE(phone_number, '\\D', '', 'g') FROM 2)
                WHEN REGEXP_REPLACE(phone_number, '\\D', '', 'g') LIKE '9%' AND LENGTH(REGEXP_REPLACE(phone_number, '\\D', '', 'g')) = 10 
                    THEN '+63' || REGEXP_REPLACE(phone_number, '\\D', '', 'g')
                ELSE NULL
            END
        WHERE phone_number IS NOT NULL AND normalized_phone_number IS NULL
    """)
    
    # 3. Create partial unique indexes for confirmed accounts
    # This guarantees database-level uniqueness enforcement without failing on legacy unverified attempts
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_residents_confirmed_norm_email 
        ON residents (normalized_email) 
        WHERE is_verified = TRUE AND normalized_email IS NOT NULL
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_residents_confirmed_norm_phone 
        ON residents (normalized_phone_number) 
        WHERE is_verified = TRUE AND normalized_phone_number IS NOT NULL
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_residents_confirmed_norm_phone")
    op.execute("DROP INDEX IF EXISTS uq_residents_confirmed_norm_email")
    op.execute("ALTER TABLE residents DROP COLUMN IF EXISTS normalized_phone_number")
    op.execute("ALTER TABLE residents DROP COLUMN IF EXISTS normalized_email")
