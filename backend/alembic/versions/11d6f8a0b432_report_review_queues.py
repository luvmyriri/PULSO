"""Persist report review ownership and human priority decisions.
Revision ID: 11d6f8a0b432
Revises: 10c5e7f9a321
"""
from alembic import op
import sqlalchemy as sa
revision = '11d6f8a0b432'
down_revision = '10c5e7f9a321'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('reports', sa.Column('review_assigned_to_id', sa.Integer, sa.ForeignKey('officials.id')))
    op.add_column('reports', sa.Column('review_assigned_at', sa.DateTime(timezone=True)))
    op.add_column('reports', sa.Column('review_assignment_mode', sa.String(24)))
    op.add_column('reports', sa.Column('review_routing_reason', sa.String))
    op.add_column('reports', sa.Column('priority_grade', sa.String(2)))
    op.add_column('reports', sa.Column('priority_reason', sa.String))
    op.add_column('reports', sa.Column('priority_reviewed_by_id', sa.Integer, sa.ForeignKey('officials.id')))
    op.add_column('reports', sa.Column('priority_reviewed_at', sa.DateTime(timezone=True)))
    op.add_column('reports', sa.Column('next_review_at', sa.DateTime(timezone=True)))
    op.create_index('ix_reports_review_assigned_to_id','reports',['review_assigned_to_id'])
    op.create_index('ix_reports_priority_grade','reports',['priority_grade'])
    op.create_check_constraint('ck_report_priority_grade','reports',"priority_grade IS NULL OR priority_grade IN ('P1','P2','P3','P4','P5')")

def downgrade():
    op.drop_constraint('ck_report_priority_grade','reports',type_='check')
    op.drop_index('ix_reports_priority_grade','reports')
    op.drop_index('ix_reports_review_assigned_to_id','reports')
    for name in ('next_review_at','priority_reviewed_at','priority_reviewed_by_id','priority_reason','priority_grade','review_routing_reason','review_assignment_mode','review_assigned_at','review_assigned_to_id'):
        op.drop_column('reports',name)
