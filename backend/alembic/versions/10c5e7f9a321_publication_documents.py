"""Editorial details and versioned publication attachments.

Revision ID: 10c5e7f9a321
Revises: 09b4d6e8f210
"""
from alembic import op
import sqlalchemy as sa

revision = '10c5e7f9a321'
down_revision = '09b4d6e8f210'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('announcements', sa.Column('publication_details', sa.JSON, nullable=False, server_default='{}'))
    op.add_column('announcements', sa.Column('attachments', sa.JSON, nullable=False, server_default='[]'))


def downgrade():
    op.drop_column('announcements', 'attachments')
    op.drop_column('announcements', 'publication_details')
