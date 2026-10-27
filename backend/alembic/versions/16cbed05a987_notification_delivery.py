"""Resident notification preferences and durable email delivery outcomes."""
from alembic import op
import sqlalchemy as sa

revision='16cbed05a987'
down_revision='15badcf4f876'
branch_labels=None
depends_on=None


def upgrade():
    op.add_column('residents',sa.Column('notification_preferences_version',sa.Integer(),nullable=False,server_default='0'))
    op.create_table('resident_notification_deliveries',
        sa.Column('id',sa.Integer(),primary_key=True),
        sa.Column('event_id',sa.Integer(),sa.ForeignKey('outbox_events.id'),nullable=False,unique=True,index=True),
        sa.Column('resident_id',sa.Integer(),sa.ForeignKey('residents.id'),nullable=False,index=True),
        sa.Column('status',sa.String(24),nullable=False,server_default='pending',index=True),
        sa.Column('attempts',sa.Integer(),nullable=False,server_default='0'),
        sa.Column('recipient_hash',sa.String(64),nullable=False),
        sa.Column('next_attempt_at',sa.DateTime(timezone=True)),sa.Column('lease_until',sa.DateTime(timezone=True)),
        sa.Column('error_code',sa.String(64)),sa.Column('accepted_at',sa.DateTime(timezone=True)),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False,server_default=sa.func.now()))


def downgrade():
    op.drop_table('resident_notification_deliveries')
    op.drop_column('residents','notification_preferences_version')
