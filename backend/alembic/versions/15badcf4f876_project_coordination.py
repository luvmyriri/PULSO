"""Evidence-based project coordination without financial processing."""
from alembic import op
import sqlalchemy as sa

revision = '15badcf4f876'
down_revision = '14a9cbe3e765'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('project_requests',sa.Column('coordination_version',sa.Integer(),nullable=False,server_default='0'))
    for name in ('coordination_started_at','next_review_at','certificate_recorded_at'):
        op.add_column('project_requests',sa.Column(name,sa.DateTime(timezone=True)))
    op.add_column('project_requests',sa.Column('legacy_status',sa.String()))
    op.add_column('project_requests',sa.Column('certificate_reference',sa.String(255)))
    for name in ('completion_document_id','certificate_document_id'):
        op.add_column('project_requests',sa.Column(name,sa.Integer(),sa.ForeignKey('system_documents.id')))
    for name in ('completion_submitted_by_id','completion_reviewed_by_id'):
        op.add_column('project_requests',sa.Column(name,sa.Integer(),sa.ForeignKey('officials.id')))
    op.create_table('project_dependencies',
        sa.Column('id',sa.Integer(),primary_key=True),
        sa.Column('project_id',sa.Integer(),sa.ForeignKey('project_requests.id'),nullable=False,index=True),
        sa.Column('description',sa.Text(),nullable=False),sa.Column('office',sa.String(255),nullable=False),
        sa.Column('reference',sa.String(255)),sa.Column('owner_id',sa.Integer(),sa.ForeignKey('officials.id'),nullable=False),
        sa.Column('next_review_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('status',sa.String(20),nullable=False,server_default='pending'),
        sa.Column('resolved_at',sa.DateTime(timezone=True)),sa.Column('resolution_reference',sa.String(255)),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False,server_default=sa.func.now()))


def downgrade():
    op.drop_table('project_dependencies')
    for name in ('completion_reviewed_by_id','completion_submitted_by_id','certificate_document_id','completion_document_id','certificate_reference','legacy_status','certificate_recorded_at','next_review_at','coordination_started_at','coordination_version'):
        op.drop_column('project_requests',name)
