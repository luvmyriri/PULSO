"""Reviewed object/problem pair labels, without inferred historical labels."""
from alembic import op
import sqlalchemy as sa

revision = '28f2a3b4c5d6'
down_revision = '27e1f2a3b4c5'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('observation_pair_reviews',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('left_observation_id', sa.Integer(), sa.ForeignKey('report_observations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('right_observation_id', sa.Integer(), sa.ForeignKey('report_observations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('relation', sa.String(32), nullable=False),
        sa.Column('evidence_basis', sa.JSON(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('snapshot', sa.JSON(), nullable=False),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('officials.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('left_observation_id', 'right_observation_id', 'revision', name='uq_observation_pair_revision'),
        sa.CheckConstraint('left_observation_id < right_observation_id', name='ck_observation_pair_order'),
        sa.CheckConstraint('revision > 0', name='ck_observation_pair_revision'),
        sa.CheckConstraint("relation IN ('same_problem','same_asset_different_problem','different_asset','uncertain')", name='ck_observation_pair_relation'))


def downgrade():
    op.drop_table('observation_pair_reviews')
