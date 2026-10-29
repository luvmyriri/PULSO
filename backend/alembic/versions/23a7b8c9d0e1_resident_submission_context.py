"""Persist the updated resident wizard's self-reported contact name and urgency."""
from alembic import op
import sqlalchemy as sa

revision = '23a7b8c9d0e1'
down_revision = '22f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('reports', sa.Column('guest_reporter_name', sa.String(160), nullable=True))
    op.add_column('reports', sa.Column('submitted_urgency', sa.String(20), nullable=True))
    op.create_check_constraint('ck_reports_submitted_urgency', 'reports', "submitted_urgency IS NULL OR submitted_urgency IN ('low','medium','high','critical','normal','moderate')")


def downgrade():
    op.drop_constraint('ck_reports_submitted_urgency', 'reports', type_='check')
    op.drop_column('reports', 'submitted_urgency')
    op.drop_column('reports', 'guest_reporter_name')
