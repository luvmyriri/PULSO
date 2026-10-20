"""Give PulseAI conversations explicit resident or official ownership.

Revision ID: f3a6d8c1b250
Revises: e4b7c9d2f610
"""

from alembic import op
import sqlalchemy as sa


revision = "f3a6d8c1b250"
down_revision = "e4b7c9d2f610"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "chat_conversations",
        sa.Column("owner_type", sa.String(16), nullable=False, server_default="resident"),
    )
    op.create_check_constraint(
        "ck_chat_conversations_owner_type",
        "chat_conversations",
        "owner_type IN ('resident', 'official')",
    )
    op.execute("ALTER TABLE chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_user_id_fkey")
    op.create_index(
        "ix_chat_conversations_owner", "chat_conversations", ["owner_type", "user_id"]
    )


def downgrade() -> None:
    connection = op.get_bind()
    official_count = connection.execute(sa.text(
        "SELECT count(*) FROM chat_conversations WHERE owner_type = 'official'"
    )).scalar_one()
    if official_count:
        raise RuntimeError("Cannot downgrade while official chat conversations exist")
    op.drop_index("ix_chat_conversations_owner", table_name="chat_conversations")
    op.create_foreign_key(
        "chat_conversations_user_id_fkey", "chat_conversations", "residents",
        ["user_id"], ["id"],
    )
    op.drop_constraint(
        "ck_chat_conversations_owner_type", "chat_conversations", type_="check"
    )
    op.drop_column("chat_conversations", "owner_type")
