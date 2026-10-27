"""Staff invitation lifecycle and revocable access sessions.

Revision ID: 13f8bac2d654
Revises: 12e7a9b1c543
"""
from alembic import op
import sqlalchemy as sa

revision = '13f8bac2d654'
down_revision = '12e7a9b1c543'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('officials', sa.Column('invitation_pending', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('officials', sa.Column('access_version', sa.Integer(), nullable=False, server_default='0'))
    op.create_table('staff_credential_tokens',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('official_id', sa.Integer(), sa.ForeignKey('officials.id'), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('purpose', sa.String(16), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('consumed_at', sa.DateTime(timezone=True)),
        sa.Column('revoked_at', sa.DateTime(timezone=True)),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('officials.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_staff_credential_tokens_official_id', 'staff_credential_tokens', ['official_id'])


def downgrade():
    op.drop_table('staff_credential_tokens')
    op.drop_column('officials', 'access_version')
    op.drop_column('officials', 'invitation_pending')
