"""Immutable prospective concern checkpoints; no historical backfill."""
from alembic import op
import sqlalchemy as sa

revision='30b4c5d6e7f8'
down_revision='29a3b4c5d6e7'
branch_labels=None
depends_on=None


def upgrade():
    op.create_table('concern_learning_checkpoints',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('concern_id',sa.Integer(),sa.ForeignKey('report_concerns.id',ondelete='RESTRICT'),nullable=False),
        sa.Column('concern_version',sa.Integer(),nullable=False),
        sa.Column('trigger_kind',sa.String(16),nullable=False),
        sa.Column('trigger_report_id',sa.Integer(),sa.ForeignKey('reports.id',ondelete='RESTRICT'),nullable=False),
        sa.Column('decision_id',sa.Integer(),sa.ForeignKey('concern_decisions.id',ondelete='RESTRICT')),
        sa.Column('captured_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('payload',sa.JSON(),nullable=False),
        sa.Column('payload_sha256',sa.String(64),nullable=False),
        sa.UniqueConstraint('concern_id','concern_version',name='uq_concern_checkpoint_version'),
        sa.CheckConstraint('concern_version > 0',name='ck_concern_checkpoint_version'),
        sa.CheckConstraint("(trigger_kind = 'intake' AND decision_id IS NULL) OR (trigger_kind = 'association' AND decision_id IS NOT NULL)",name='ck_concern_checkpoint_source'))
    op.create_index('ix_concern_learning_checkpoints_concern_id','concern_learning_checkpoints',['concern_id'])
    op.execute("""CREATE FUNCTION pulso_immutable_concern_checkpoint() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'Concern learning checkpoints are immutable'; END; $$""")
    op.execute("""CREATE TRIGGER immutable_concern_checkpoint BEFORE UPDATE OR DELETE
        ON concern_learning_checkpoints FOR EACH ROW EXECUTE FUNCTION pulso_immutable_concern_checkpoint()""")


def downgrade():
    op.drop_table('concern_learning_checkpoints')
    op.execute('DROP FUNCTION pulso_immutable_concern_checkpoint()')
