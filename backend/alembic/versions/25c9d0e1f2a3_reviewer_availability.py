"""Explicit reviewer availability, short-lived presence and bounded capacity."""
from alembic import op
import sqlalchemy as sa

revision = '25c9d0e1f2a3'
down_revision = '24b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('report_reviewer_availability',
        sa.Column('official_id', sa.Integer(), sa.ForeignKey('officials.id'), primary_key=True),
        sa.Column('state', sa.String(16), nullable=False, server_default='offline'),
        sa.Column('capacity', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('access_version', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_seen_at', sa.DateTime(timezone=True)),
        sa.Column('session_expires_at', sa.DateTime(timezone=True)),
        sa.Column('last_assigned_at', sa.DateTime(timezone=True)),
        sa.CheckConstraint("state IN ('available','away','offline')", name='ck_review_availability_state'),
        sa.CheckConstraint('capacity BETWEEN 1 AND 50', name='ck_review_availability_capacity'))
    # No inferred availability is backfilled from account activation or roles.


def downgrade():
    op.drop_table('report_reviewer_availability')
