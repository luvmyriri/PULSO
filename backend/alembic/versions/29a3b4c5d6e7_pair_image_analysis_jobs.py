"""Durable bounded visual comparison jobs; no legacy/model-label backfill."""
from alembic import op
import sqlalchemy as sa

revision = '29a3b4c5d6e7'
down_revision = '28f2a3b4c5d6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('pair_image_analysis_jobs',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('left_observation_id',sa.Integer(),sa.ForeignKey('report_observations.id',ondelete='RESTRICT'),nullable=False),
        sa.Column('right_observation_id',sa.Integer(),sa.ForeignKey('report_observations.id',ondelete='RESTRICT'),nullable=False),
        sa.Column('requested_by_id',sa.Integer(),sa.ForeignKey('officials.id',ondelete='RESTRICT'),nullable=False),
        sa.Column('command_hash',sa.String(64),nullable=False,unique=True),
        sa.Column('payload_hash',sa.String(64),nullable=False),
        sa.Column('snapshot',sa.JSON(),nullable=False),
        sa.Column('image_hashes',sa.JSON(),nullable=False),
        sa.Column('categories',sa.JSON(),nullable=False),
        sa.Column('model',sa.String(200),nullable=False),
        sa.Column('prompt_version',sa.String(40),nullable=False),
        sa.Column('image_recipe',sa.String(80),nullable=False),
        sa.Column('status',sa.String(16),nullable=False),
        sa.Column('attempts',sa.Integer(),nullable=False),
        sa.Column('lease_token',sa.String(36)),
        sa.Column('lease_until',sa.DateTime(timezone=True)),
        sa.Column('dispatched_at',sa.DateTime(timezone=True)),
        sa.Column('result',sa.JSON()),
        sa.Column('failure_code',sa.String(64)),
        sa.Column('created_at',sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),
        sa.Column('finished_at',sa.DateTime(timezone=True)),
        sa.CheckConstraint('left_observation_id < right_observation_id',name='ck_pair_analysis_order'),
        sa.CheckConstraint("status IN ('queued','running','completed','failed','cancelled')",name='ck_pair_analysis_status'),
        sa.CheckConstraint('attempts >= 0 AND attempts <= 1',name='ck_pair_analysis_attempts'))
    op.create_index('ix_pair_image_analysis_jobs_dispatched_at','pair_image_analysis_jobs',['dispatched_at'])


def downgrade():
    op.drop_table('pair_image_analysis_jobs')
