"""Frozen intake features and sourced verification history, without backfill."""
from alembic import op
import sqlalchemy as sa

revision = '27e1f2a3b4c5'
down_revision = '26d0e1f2a3b4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('report_learning_snapshots',
        sa.Column('report_id', sa.Integer(), sa.ForeignKey('reports.id', ondelete='RESTRICT'), primary_key=True),
        sa.Column('schema_version', sa.String(40), nullable=False),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('available_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('features', sa.JSON(), nullable=False))
    op.create_table('report_resolution_events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('report_id', sa.Integer(), sa.ForeignKey('reports.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('timeline_id', sa.Integer(), sa.ForeignKey('process_timelines.id', ondelete='RESTRICT'), nullable=False, unique=True),
        sa.Column('kind', sa.String(16), nullable=False),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('officials.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('inspection_id', sa.Integer(), sa.ForeignKey('work_order_inspections.id', ondelete='RESTRICT')),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('project_requests.id', ondelete='RESTRICT')),
        sa.CheckConstraint("kind IN ('verified','invalidated')", name='ck_resolution_event_kind'),
        sa.CheckConstraint("(kind = 'invalidated' AND inspection_id IS NULL AND project_id IS NULL) OR (kind = 'verified' AND ((inspection_id IS NOT NULL AND project_id IS NULL) OR (inspection_id IS NULL AND project_id IS NOT NULL)))", name='ck_resolution_event_source'))
    op.create_index('ix_report_resolution_events_report_id', 'report_resolution_events', ['report_id'])
    # A legacy resolved status does not establish its verification date or source.


def downgrade():
    op.drop_table('report_resolution_events')
    op.drop_table('report_learning_snapshots')
