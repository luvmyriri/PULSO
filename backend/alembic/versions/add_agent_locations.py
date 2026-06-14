"""Add agent_locations table for field agent tracking

Revision ID: add_agent_locations
Revises: 676539ba1680
Create Date: 2026-04-07

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'add_agent_locations'
down_revision: Union[str, Sequence[str], None] = '676539ba1680'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add agent_locations table for real-time GPS tracking."""
    op.create_table(
        'agent_locations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('accuracy', sa.Float(), nullable=True),
        sa.Column('battery_level', sa.Integer(), nullable=True),
        sa.Column('location_name', sa.String(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_agent_locations_agent_id', 'agent_locations', ['agent_id'])
    op.create_foreign_key('fk_agent_locations_users', 'agent_locations', 'users', ['agent_id'], ['id'])


def downgrade() -> None:
    """Drop agent_locations table."""
    op.drop_constraint('fk_agent_locations_users', 'agent_locations', type_='foreignkey')
    op.drop_index('ix_agent_locations_agent_id', table_name='agent_locations')
    op.drop_table('agent_locations')