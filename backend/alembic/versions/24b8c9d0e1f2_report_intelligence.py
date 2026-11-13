"""Single-ticket categories, location provenance and durable concern membership."""
from alembic import op
import sqlalchemy as sa

revision = '24b8c9d0e1f2'
down_revision = '23a7b8c9d0e1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('reports', sa.Column('categories', sa.JSON(), nullable=False, server_default='[]'))
    op.add_column('reports', sa.Column('location_metadata', sa.JSON(), nullable=False, server_default='{}'))
    op.add_column('reports', sa.Column('intake_key_hash', sa.String(64), nullable=True))
    op.add_column('reports', sa.Column('intake_request_hash', sa.String(64), nullable=True))
    op.create_unique_constraint('uq_reports_intake_key_hash', 'reports', ['intake_key_hash'])
    op.alter_column('reports', 'accuracy_m', existing_type=sa.Float(), nullable=True, server_default=None)
    op.execute("UPDATE reports SET categories = json_build_array(category) WHERE category IS NOT NULL")
    op.execute('UPDATE reports SET accuracy_m = NULL WHERE accuracy_m <= 0')
    op.create_table('report_concerns',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('public_id', sa.String(40), nullable=False, unique=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('anchor_report_id', sa.Integer(), sa.ForeignKey('reports.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('completion_report_id', sa.Integer(), sa.ForeignKey('reports.id')))
    op.create_table('report_observations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('report_id', sa.Integer(), sa.ForeignKey('reports.id'), nullable=False),
        sa.Column('item_key', sa.String(64), nullable=False),
        sa.Column('categories', sa.JSON(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('concern_id', sa.Integer(), sa.ForeignKey('report_concerns.id'), nullable=False),
        sa.Column('association_status', sa.String(24), nullable=False),
        sa.UniqueConstraint('report_id', 'item_key', name='uq_report_observation_item'))
    op.create_index('ix_report_observations_report_id', 'report_observations', ['report_id'])
    op.create_index('ix_report_observations_concern_id', 'report_observations', ['concern_id'])
    op.create_table('concern_decisions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('observation_id', sa.Integer(), sa.ForeignKey('report_observations.id'), nullable=False),
        sa.Column('previous_concern_id', sa.Integer(), sa.ForeignKey('report_concerns.id'), nullable=False),
        sa.Column('concern_id', sa.Integer(), sa.ForeignKey('report_concerns.id'), nullable=False),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('officials.id'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index('ix_concern_decisions_observation_id', 'concern_decisions', ['observation_id'])
    # Retain historical ticket identities and timestamps; do not turn legacy
    # spatial cluster numbers into authoritative same-problem associations.
    op.execute("""INSERT INTO report_concerns(public_id, anchor_report_id, created_at)
        SELECT 'CON-legacy-' || id::text, id, COALESCE(created_at, now()) FROM reports""")
    op.execute("""INSERT INTO report_observations(report_id,item_key,categories,description,concern_id,association_status)
        SELECT r.id, 'issue-1', r.categories, COALESCE(r.description,''), c.id, 'unreviewed'
        FROM reports r JOIN report_concerns c ON c.public_id = 'CON-legacy-' || r.id::text""")


def downgrade():
    op.drop_table('concern_decisions')
    op.drop_table('report_observations')
    op.drop_table('report_concerns')
    op.drop_constraint('uq_reports_intake_key_hash', 'reports', type_='unique')
    for column in ('intake_request_hash', 'intake_key_hash', 'location_metadata', 'categories'):
        op.drop_column('reports', column)
