"""Resident administration versions, review provenance and expiring email codes."""
from alembic import op
import sqlalchemy as sa

revision = '14a9cbe3e765'
down_revision = '13f8bac2d654'
branch_labels = None
depends_on = None


def upgrade():
    for name in ('administration_version', 'access_version', 'email_code_attempts'):
        op.add_column('residents', sa.Column(name, sa.Integer(), nullable=False, server_default='0'))
    for name in ('email_code_expires_at', 'email_code_sent_at', 'id_reviewed_at'):
        op.add_column('residents', sa.Column(name, sa.DateTime(timezone=True)))
    op.add_column('residents', sa.Column('id_review_reference', sa.String(255)))
    op.add_column('residents', sa.Column('id_reviewed_by_id', sa.Integer(), sa.ForeignKey('officials.id')))


def downgrade():
    for name in ('id_reviewed_by_id', 'id_review_reference', 'id_reviewed_at', 'email_code_sent_at', 'email_code_expires_at', 'email_code_attempts', 'access_version', 'administration_version'):
        op.drop_column('residents', name)
