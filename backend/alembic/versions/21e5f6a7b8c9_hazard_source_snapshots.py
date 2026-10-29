"""Persist licensed, time-stamped hazard source snapshots.

Revision ID: 21e5f6a7b8c9
Revises: 20d4e5f6a7b8
"""
from alembic import op
import sqlalchemy as sa

revision = "21e5f6a7b8c9"
down_revision = "20d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "hazard_source_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("barangay_id", sa.Integer(), sa.ForeignKey("barangays.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("provider", sa.String(length=80), nullable=False),
        sa.Column("product", sa.String(length=100), nullable=False),
        sa.Column("signal", sa.String(length=64), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_to", sa.DateTime(timezone=True), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=24), nullable=False),
        sa.Column("requested_latitude", sa.Float(), nullable=False),
        sa.Column("requested_longitude", sa.Float(), nullable=False),
        sa.Column("grid_latitude", sa.Float()),
        sa.Column("grid_longitude", sa.Float()),
        sa.Column("source_resolution_km", sa.Float()),
        sa.Column("license_reference", sa.String(length=200), nullable=False),
        sa.Column("documentation_url", sa.String(length=500), nullable=False),
        sa.Column("payload_sha256", sa.String(length=64), nullable=False),
        sa.Column("series", sa.JSON(), nullable=False),
        sa.Column("limitation", sa.Text(), nullable=False),
        sa.CheckConstraint("value >= 0", name="ck_hazard_snapshot_nonnegative"),
        sa.CheckConstraint("valid_to > valid_from AND expires_at > fetched_at", name="ck_hazard_snapshot_time"),
    )
    op.create_index("ix_hazard_source_snapshots_barangay_id", "hazard_source_snapshots", ["barangay_id"])
    op.create_index("ix_hazard_source_snapshots_signal", "hazard_source_snapshots", ["signal"])
    op.create_index("ix_hazard_source_snapshots_fetched_at", "hazard_source_snapshots", ["fetched_at"])
    op.create_index("ix_hazard_barangay_signal_fetched", "hazard_source_snapshots", ["barangay_id", "signal", "fetched_at"])
    op.create_table(
        "hazard_ingestion_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("barangays_seen", sa.Integer(), server_default="0", nullable=False),
        sa.Column("snapshots_written", sa.Integer(), server_default="0", nullable=False),
        sa.Column("error_summary", sa.Text()),
        sa.CheckConstraint("status IN ('completed','partial','failed')", name="ck_hazard_ingestion_status"),
    )
    op.add_column("asset_model_assessments", sa.Column("weather_snapshot_id", sa.Integer(), sa.ForeignKey("hazard_source_snapshots.id", ondelete="RESTRICT")))
    op.add_column("asset_model_assessments", sa.Column("flood_snapshot_id", sa.Integer(), sa.ForeignKey("hazard_source_snapshots.id", ondelete="RESTRICT")))


def downgrade():
    op.drop_column("asset_model_assessments", "flood_snapshot_id")
    op.drop_column("asset_model_assessments", "weather_snapshot_id")
    op.drop_table("hazard_ingestion_runs")
    op.drop_index("ix_hazard_barangay_signal_fetched", table_name="hazard_source_snapshots")
    op.drop_index("ix_hazard_source_snapshots_fetched_at", table_name="hazard_source_snapshots")
    op.drop_index("ix_hazard_source_snapshots_signal", table_name="hazard_source_snapshots")
    op.drop_index("ix_hazard_source_snapshots_barangay_id", table_name="hazard_source_snapshots")
    op.drop_table("hazard_source_snapshots")
