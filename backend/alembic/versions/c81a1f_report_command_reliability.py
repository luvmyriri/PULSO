"""Add report command versions, receipts and in-app notification outbox.

Revision ID: c81a1f_report_reliability
Revises: b72d4e_postgis_report_locations
"""

from alembic import op
import sqlalchemy as sa

revision = "c81a1f_report_reliability"
down_revision = "b72d4e_postgis_report_locations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("reports", sa.Column("version", sa.Integer(), nullable=False, server_default="1"))
    op.create_table(
        "command_receipts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("officials.id"), nullable=False),
        sa.Column("operation", sa.String(64), nullable=False),
        sa.Column("report_id", sa.Integer(), sa.ForeignKey("reports.id"), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=False),
        sa.Column("result_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("actor_id", "operation", "report_id", "idempotency_key", name="uq_command_receipt_actor_operation_report_key"),
    )
    op.create_table(
        "outbox_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_key", sa.String(128), nullable=False, unique=True),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("delivered_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_outbox_events_status", "outbox_events", ["status"])
    op.add_column("notifications", sa.Column("outbox_event_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_notifications_outbox_event", "notifications", "outbox_events", ["outbox_event_id"], ["id"])
    op.create_unique_constraint("uq_notifications_outbox_event", "notifications", ["outbox_event_id"])


def downgrade() -> None:
    op.drop_constraint("uq_notifications_outbox_event", "notifications", type_="unique")
    op.drop_constraint("fk_notifications_outbox_event", "notifications", type_="foreignkey")
    op.drop_column("notifications", "outbox_event_id")
    op.drop_index("ix_outbox_events_status", table_name="outbox_events")
    op.drop_table("outbox_events")
    op.drop_table("command_receipts")
    op.drop_column("reports", "version")
