"""First-party survey observations, distinct from official registry approval."""
from alembic import op
import sqlalchemy as sa

revision = '26d0e1f2a3b4'
down_revision = '25c9d0e1f2a3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('asset_field_observations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('command_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('payload_hash', sa.String(64), nullable=False),
        sa.Column('asset_id', sa.String(), sa.ForeignKey('infrastructure_assets.asset_id', ondelete='RESTRICT'), nullable=False),
        sa.Column('source_report_id', sa.Integer(), sa.ForeignKey('reports.id', ondelete='RESTRICT')),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('visibility', sa.String(20), nullable=False),
        sa.Column('condition', sa.String(24), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('accuracy_m', sa.Float()),
        sa.Column('location_metadata', sa.JSON(), nullable=False),
        sa.Column('boundary_status', sa.String(32), nullable=False),
        sa.Column('notes', sa.Text(), nullable=False),
        sa.Column('evidence_reference', sa.String(36), sa.ForeignKey('asset_inspection_evidence.id', ondelete='RESTRICT')),
        sa.Column('recorded_by_id', sa.Integer(), sa.ForeignKey('officials.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('review_status', sa.String(16), nullable=False),
        sa.Column('identity_confirmed', sa.Boolean(), nullable=False),
        sa.Column('location_reviewed', sa.Boolean(), nullable=False),
        sa.Column('reviewed_by_id', sa.Integer(), sa.ForeignKey('officials.id', ondelete='RESTRICT')),
        sa.Column('reviewed_at', sa.DateTime(timezone=True)),
        sa.Column('review_reason', sa.Text()),
        sa.UniqueConstraint('evidence_reference', name='uq_field_observation_evidence_reference'),
        sa.CheckConstraint("visibility IN ('visible','not_visible','unsafe','missing')", name='ck_field_visibility'),
        sa.CheckConstraint("condition IN ('defect_observed','no_defect_observed','not_assessed')", name='ck_field_condition'),
        sa.CheckConstraint("visibility = 'visible' OR condition = 'not_assessed'", name='ck_field_unknown_condition'),
        sa.CheckConstraint("review_status IN ('pending','accepted','rejected')", name='ck_field_review_status'))
    op.create_index('ix_asset_field_observations_asset_id', 'asset_field_observations', ['asset_id'])


def downgrade():
    op.drop_table('asset_field_observations')
