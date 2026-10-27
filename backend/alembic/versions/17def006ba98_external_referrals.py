"""Private external referrals and immutable dispatch packets.

Revision ID: 17def006ba98
Revises: 16cbed05a987
"""
from alembic import op
import sqlalchemy as sa

revision = '17def006ba98'
down_revision = '16cbed05a987'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('referral_recipients',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(180), nullable=False),
        sa.Column('email', sa.String(254)),
        sa.Column('phone', sa.String(80)),
        sa.Column('verification_reference', sa.Text(), nullable=False),
        sa.Column('verified_by_id', sa.Integer(), sa.ForeignKey('officials.id')),
        sa.Column('verified_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False))
    op.create_table('external_referrals',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('reference', sa.String(60), nullable=False, unique=True),
        sa.Column('report_id', sa.Integer(), sa.ForeignKey('reports.id'), nullable=False, index=True),
        sa.Column('recipient_id', sa.Integer(), sa.ForeignKey('referral_recipients.id'), nullable=False),
        sa.Column('previous_referral_id', sa.Integer(), sa.ForeignKey('external_referrals.id')),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('officials.id'), nullable=False, index=True),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('officials.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('status', sa.String(40), nullable=False, index=True),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('requested_action', sa.Text(), nullable=False),
        sa.Column('next_follow_up_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('recipient_reference', sa.String(255)),
        sa.Column('approved_by_id', sa.Integer(), sa.ForeignKey('officials.id')),
        sa.Column('approved_at', sa.DateTime(timezone=True)),
        sa.Column('packet', sa.JSON()),
        sa.Column('packet_hash', sa.String(64)),
        sa.Column('letter_pdf', sa.LargeBinary()))
    op.create_table('referral_packets',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('referral_id', sa.Integer(), sa.ForeignKey('external_referrals.id'), nullable=False, index=True),
        sa.Column('approved_by_id', sa.Integer(), sa.ForeignKey('officials.id'), nullable=False),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('packet', sa.JSON(), nullable=False),
        sa.Column('packet_hash', sa.String(64), nullable=False),
        sa.Column('letter_pdf', sa.LargeBinary(), nullable=False))
    op.create_table('referral_events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('referral_id', sa.Integer(), sa.ForeignKey('external_referrals.id'), nullable=False, index=True),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('officials.id')),
        sa.Column('action', sa.String(60), nullable=False),
        sa.Column('note', sa.Text(), nullable=False),
        sa.Column('facts', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_table('referral_deliveries',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('referral_id', sa.Integer(), sa.ForeignKey('external_referrals.id'), nullable=False, index=True),
        sa.Column('status', sa.String(40), nullable=False, index=True),
        sa.Column('message_id', sa.String(180), nullable=False, unique=True),
        sa.Column('packet_hash', sa.String(64), nullable=False),
        sa.Column('queued_by_id', sa.Integer(), sa.ForeignKey('officials.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True)),
        sa.Column('finished_at', sa.DateTime(timezone=True)),
        sa.Column('error_code', sa.String(60)))


def downgrade():
    op.drop_table('referral_deliveries')
    op.drop_table('referral_events')
    op.drop_table('referral_packets')
    op.drop_table('external_referrals')
    op.drop_table('referral_recipients')
