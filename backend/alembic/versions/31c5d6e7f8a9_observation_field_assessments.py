"""Immutable per-category field assessments; no resolution or model backfill."""
from alembic import op
import sqlalchemy as sa

revision = '31c5d6e7f8a9'
down_revision = '30b4c5d6e7f8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('observation_field_assessments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('observation_id', sa.Integer(), sa.ForeignKey('report_observations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('field_observation_id', sa.String(36), sa.ForeignKey('asset_field_observations.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('category_findings', sa.JSON(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('snapshot', sa.JSON(), nullable=False),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('officials.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.statement_timestamp(), nullable=False),
        sa.UniqueConstraint('observation_id', 'revision', name='uq_observation_field_assessment_revision'),
        sa.CheckConstraint('revision > 0', name='ck_observation_field_assessment_revision'))
    op.execute("""CREATE FUNCTION pulso_immutable_observation_field_assessment() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'Observation field assessments are immutable'; END; $$""")
    op.execute("""CREATE TRIGGER immutable_observation_field_assessment BEFORE UPDATE OR DELETE
        ON observation_field_assessments FOR EACH ROW EXECUTE FUNCTION pulso_immutable_observation_field_assessment()""")


def downgrade():
    op.drop_table('observation_field_assessments')
    op.execute('DROP FUNCTION pulso_immutable_observation_field_assessment()')
