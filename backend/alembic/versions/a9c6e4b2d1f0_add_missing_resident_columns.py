"""Add resident columns present in the ORM but absent from the c455 schema.

Revision ID: a9c6e4b2d1f0
Revises: c455ca49f6d5

All types and nullability match ``models.Resident`` at this revision. The
columns have no server defaults and this migration does not modify row data.
"""

from alembic import op


revision = "a9c6e4b2d1f0"
down_revision = "c455ca49f6d5"
branch_labels = None
depends_on = None


_COLUMNS = (
    ("id_tier", "VARCHAR"),
    ("id_type", "VARCHAR"),
    ("secondary_id_type", "VARCHAR"),
    ("verification_mode", "VARCHAR"),
    ("google_id", "VARCHAR"),
    ("auth_provider", "VARCHAR"),
    ("status", "VARCHAR"),
    ("status_reason", "VARCHAR"),
    ("status_changed_by", "VARCHAR"),
    ("status_changed_at", "TIMESTAMP WITH TIME ZONE"),
    ("id_verification_status", "VARCHAR"),
    ("id_rejection_reason", "VARCHAR"),
    ("id_verified_at", "TIMESTAMP WITH TIME ZONE"),
    ("preferences", "JSON"),
)


def upgrade() -> None:
    for name, sql_type in _COLUMNS:
        op.execute(f"ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS {name} {sql_type} NULL")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_residents_google_id "
        "ON public.residents (google_id)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS public.ix_residents_google_id")
    for name, _ in reversed(_COLUMNS):
        op.execute(f"ALTER TABLE public.residents DROP COLUMN IF EXISTS {name}")
