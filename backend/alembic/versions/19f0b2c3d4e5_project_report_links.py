"""Add governed links from coordinated projects to related reports.

Revision ID: 19f0b2c3d4e5
Revises: 18efa117cb09
"""
from alembic import op
import sqlalchemy as sa

revision = '19f0b2c3d4e5'
down_revision = '18efa117cb09'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('work_orders', sa.Column('assignment_version', sa.Integer(), server_default='0', nullable=False))
    op.execute('UPDATE work_orders SET assignment_version = 1 WHERE assigned_to_id IS NOT NULL')
    op.create_table(
        'project_report_links',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('project_requests.id', ondelete='CASCADE'), nullable=False),
        sa.Column('report_id', sa.Integer(), sa.ForeignKey('reports.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('linked_by_id', sa.Integer(), sa.ForeignKey('officials.id'), nullable=False),
        sa.Column('linked_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.UniqueConstraint('project_id', 'report_id', name='uq_project_report_link'),
    )
    op.create_index('ix_project_report_links_project_id', 'project_report_links', ['project_id'])
    op.create_index('ix_project_report_links_report_id', 'project_report_links', ['report_id'])


def downgrade():
    op.drop_index('ix_project_report_links_report_id', table_name='project_report_links')
    op.drop_index('ix_project_report_links_project_id', table_name='project_report_links')
    op.drop_table('project_report_links')
    if 'assignment_version' in {column['name'] for column in sa.inspect(op.get_bind()).get_columns('work_orders')}:
        op.drop_column('work_orders', 'assignment_version')
