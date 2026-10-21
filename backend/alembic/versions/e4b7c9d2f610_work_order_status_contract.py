"""Align the PostgreSQL work-order status constraint with governed transitions.

Revision ID: e4b7c9d2f610
Revises: a9c6e4b2d1f0
"""

from alembic import op


revision = "e4b7c9d2f610"
down_revision = "a9c6e4b2d1f0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Legacy user_id duplicates official_id but old DDL still requires it.
    # Current ORM writes official_id; keep historic user_id values readable.
    op.execute("ALTER TABLE public.work_order_updates ALTER COLUMN user_id DROP NOT NULL")
    op.execute("ALTER TABLE public.work_orders DROP CONSTRAINT ck_wo_status")
    op.execute("""
        ALTER TABLE public.work_orders ADD CONSTRAINT ck_wo_status
        CHECK (status IN (
            'open', 'assigned', 'in_progress', 'completed_pending_review',
            'completed', 'rework_required', 'blocked', 'cancelled'
        ))
    """)


def downgrade() -> None:
    op.execute("UPDATE public.work_order_updates SET user_id = official_id WHERE user_id IS NULL AND official_id IS NOT NULL")
    op.execute("ALTER TABLE public.work_order_updates ALTER COLUMN user_id SET NOT NULL")
    op.execute("ALTER TABLE public.work_orders DROP CONSTRAINT ck_wo_status")
    op.execute("""
        ALTER TABLE public.work_orders ADD CONSTRAINT ck_wo_status
        CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled'))
    """)
