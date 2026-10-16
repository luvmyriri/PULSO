"""add_avatar_url_and_updated_at_to_users

Revision ID: c455ca49f6d5
Revises: d5e2a3_spatial_engine
Create Date: 2026-10-12 15:29:50.093504

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c455ca49f6d5'
down_revision: Union[str, Sequence[str], None] = 'd5e2a3_spatial_engine'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('residents', sa.Column('avatar_url', sa.String(), nullable=True))
    op.add_column('residents', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))
    op.add_column('officials', sa.Column('avatar_url', sa.String(), nullable=True))
    op.add_column('officials', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('officials', 'updated_at')
    op.drop_column('officials', 'avatar_url')
    op.drop_column('residents', 'updated_at')
    op.drop_column('residents', 'avatar_url')
