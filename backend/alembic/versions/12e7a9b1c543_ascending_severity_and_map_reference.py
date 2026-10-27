"""Ascending P0 monitoring to P5 immediate response; presentation GIS layers.
Revision ID: 12e7a9b1c543
Revises: 11d6f8a0b432
"""
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

revision = '12e7a9b1c543'
down_revision = '11d6f8a0b432'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint('ck_report_priority_grade','reports',type_='check')
    op.add_column('reports',sa.Column('priority_policy_version',sa.String(48)))
    op.execute("""INSERT INTO audit_logs (trigger_type,report_id,actor_role,action,details,created_at)
        SELECT 'report_priority_scale_change',id,'system','Severity scale updated',
        json_build_object('previous_grade',priority_grade,'grade',CASE priority_grade WHEN 'P5' THEN 'P0' WHEN 'P4' THEN 'P1' WHEN 'P3' THEN 'P2' WHEN 'P2' THEN 'P3' WHEN 'P1' THEN 'P4' END,
        'policy','p0-p5-ascending-v2','reason','Previous scale converted by meaning; original review history retained.')::text,now()
        FROM reports WHERE priority_grade IS NOT NULL""")
    op.execute("""UPDATE reports SET priority_grade=CASE priority_grade WHEN 'P5' THEN 'P0' WHEN 'P4' THEN 'P1' WHEN 'P3' THEN 'P2' WHEN 'P2' THEN 'P3' WHEN 'P1' THEN 'P4' END,
        priority_policy_version='p0-p5-ascending-v2',version=version+1 WHERE priority_grade IS NOT NULL""")
    op.create_check_constraint('ck_report_priority_grade','reports',"priority_grade IS NULL OR priority_grade IN ('P0','P1','P2','P3','P4','P5')")
    op.create_table('map_reference_features',
        sa.Column('feature_id',sa.String(64),primary_key=True),sa.Column('layer',sa.String(16),nullable=False),
        sa.Column('properties',sa.JSON,nullable=False),sa.Column('source_digest',sa.String(64),nullable=False),
        sa.Column('geom',Geometry('MULTIPOLYGON',srid=4326,spatial_index=False),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False))
    op.create_index('ix_map_reference_features_geom','map_reference_features',['geom'],postgresql_using='gist')


def downgrade():
    # Immediate-response P5 cannot be represented by the old five-level scale.
    bind=op.get_bind()
    if bind.execute(sa.text("SELECT count(*) FROM reports WHERE priority_grade='P5'")).scalar():
        raise RuntimeError('Resolve P5 immediate-response records before reverting the old scale.')
    op.drop_table('map_reference_features')
    op.drop_constraint('ck_report_priority_grade','reports',type_='check')
    op.execute("""UPDATE reports SET priority_grade=CASE priority_grade WHEN 'P0' THEN 'P5' WHEN 'P1' THEN 'P4' WHEN 'P2' THEN 'P3' WHEN 'P3' THEN 'P2' WHEN 'P4' THEN 'P1' END,
        version=version+1 WHERE priority_grade IS NOT NULL""")
    op.create_check_constraint('ck_report_priority_grade','reports',"priority_grade IS NULL OR priority_grade IN ('P1','P2','P3','P4','P5')")
    op.drop_column('reports','priority_policy_version')
