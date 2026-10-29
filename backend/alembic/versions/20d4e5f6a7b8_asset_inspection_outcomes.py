"""Persist independently reviewed asset inspection outcomes.

Revision ID: 20d4e5f6a7b8
Revises: 19f0b2c3d4e5
"""
from alembic import op
import sqlalchemy as sa

revision = "20d4e5f6a7b8"
down_revision = "19f0b2c3d4e5"
branch_labels = None
depends_on = None


def upgrade():
    # New assets must not inherit the legacy fabricated condition of 80/100.
    op.alter_column("infrastructure_assets", "condition_score", existing_type=sa.Float(), server_default=None)
    op.add_column("infrastructure_assets", sa.Column("registry_status", sa.String(length=16), server_default="candidate", nullable=False))
    op.add_column("infrastructure_assets", sa.Column("maintenance_authority", sa.String(length=160)))
    op.add_column("infrastructure_assets", sa.Column("source_reference", sa.String(length=500)))
    op.add_column("infrastructure_assets", sa.Column("verified_by_id", sa.Integer(), sa.ForeignKey("officials.id")))
    op.add_column("infrastructure_assets", sa.Column("verified_at", sa.DateTime(timezone=True)))
    op.create_check_constraint("ck_asset_registry_status", "infrastructure_assets", "registry_status IN ('candidate','verified','disputed','retired')")
    op.create_table(
        "asset_inspection_evidence",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("asset_id", sa.String(), sa.ForeignKey("infrastructure_assets.asset_id", ondelete="RESTRICT"), nullable=False),
        sa.Column("uploaded_by_id", sa.Integer(), sa.ForeignKey("officials.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("stored_path", sa.String(length=500), nullable=False),
        sa.Column("content_type", sa.String(length=40), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("byte_size BETWEEN 1 AND 5242880", name="ck_asset_evidence_size"),
    )
    op.create_index("ix_asset_inspection_evidence_asset_id", "asset_inspection_evidence", ["asset_id"])
    op.create_table(
        "asset_inspection_outcomes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("command_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("payload_hash", sa.String(length=64), nullable=False),
        sa.Column("asset_id", sa.String(), sa.ForeignKey("infrastructure_assets.asset_id", ondelete="RESTRICT"), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("defect_found", sa.Boolean(), nullable=False),
        sa.Column("defect_type", sa.String(length=120)),
        sa.Column("severity", sa.String(length=32)),
        sa.Column("condition_score", sa.Float()),
        sa.Column("finding", sa.Text(), nullable=False),
        sa.Column("evidence_reference", sa.String(length=36), sa.ForeignKey("asset_inspection_evidence.id", ondelete="RESTRICT")),
        sa.Column("recorded_by_id", sa.Integer(), sa.ForeignKey("officials.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("review_status", sa.String(length=16), server_default="pending", nullable=False),
        sa.Column("reviewed_by_id", sa.Integer(), sa.ForeignKey("officials.id", ondelete="RESTRICT")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("review_reason", sa.Text()),
        sa.CheckConstraint("condition_score IS NULL OR condition_score BETWEEN 0 AND 100", name="ck_asset_inspection_condition"),
        sa.CheckConstraint("review_status IN ('pending','verified','rejected')", name="ck_asset_inspection_review_status"),
        sa.CheckConstraint("NOT defect_found OR defect_type IS NOT NULL", name="ck_asset_inspection_defect_type"),
        sa.CheckConstraint("NOT defect_found OR evidence_reference IS NOT NULL", name="ck_asset_inspection_defect_evidence"),
        sa.UniqueConstraint("evidence_reference", name="uq_asset_inspection_evidence_reference"),
        sa.CheckConstraint("(review_status = 'pending' AND reviewed_by_id IS NULL AND reviewed_at IS NULL) OR (review_status <> 'pending' AND reviewed_by_id IS NOT NULL AND reviewed_at IS NOT NULL)", name="ck_asset_inspection_review_actor"),
    )
    op.create_index("ix_asset_inspection_outcomes_asset_id", "asset_inspection_outcomes", ["asset_id"])
    op.create_index("ix_asset_inspection_outcomes_review_status", "asset_inspection_outcomes", ["review_status"])
    op.create_index("ix_asset_inspection_asset_observed", "asset_inspection_outcomes", ["asset_id", "observed_at"])
    op.create_table(
        "asset_model_assessments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("asset_id", sa.String(), sa.ForeignKey("infrastructure_assets.asset_id", ondelete="RESTRICT"), nullable=False),
        sa.Column("model_sha256", sa.String(length=64), nullable=False),
        sa.Column("inspection_id", sa.Integer(), sa.ForeignKey("asset_inspection_outcomes.id", ondelete="RESTRICT")),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("reason", sa.Text()),
        sa.Column("probability", sa.Float()),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_until", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("asset_id", "model_sha256", name="uq_asset_model_version"),
        sa.CheckConstraint("probability IS NULL OR probability BETWEEN 0 AND 1", name="ck_asset_model_probability"),
    )
    op.create_index("ix_asset_model_assessments_asset_id", "asset_model_assessments", ["asset_id"])
    op.create_index("ix_asset_model_assessments_model_sha256", "asset_model_assessments", ["model_sha256"])
    op.create_table(
        "asset_model_runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("model_sha256", sa.String(length=64), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("assets_seen", sa.Integer(), server_default="0", nullable=False),
        sa.Column("assets_scored", sa.Integer(), server_default="0", nullable=False),
        sa.Column("error_summary", sa.Text()),
    )
    op.create_index("ix_asset_model_runs_model_sha256", "asset_model_runs", ["model_sha256"])


def downgrade():
    op.drop_index("ix_asset_model_runs_model_sha256", table_name="asset_model_runs")
    op.drop_table("asset_model_runs")
    op.drop_index("ix_asset_model_assessments_model_sha256", table_name="asset_model_assessments")
    op.drop_index("ix_asset_model_assessments_asset_id", table_name="asset_model_assessments")
    op.drop_table("asset_model_assessments")
    op.drop_index("ix_asset_inspection_asset_observed", table_name="asset_inspection_outcomes")
    op.drop_index("ix_asset_inspection_outcomes_review_status", table_name="asset_inspection_outcomes")
    op.drop_index("ix_asset_inspection_outcomes_asset_id", table_name="asset_inspection_outcomes")
    op.drop_table("asset_inspection_outcomes")
    op.drop_index("ix_asset_inspection_evidence_asset_id", table_name="asset_inspection_evidence")
    op.drop_table("asset_inspection_evidence")
    op.drop_constraint("ck_asset_registry_status", "infrastructure_assets", type_="check")
    op.drop_column("infrastructure_assets", "verified_at")
    op.drop_column("infrastructure_assets", "verified_by_id")
    op.drop_column("infrastructure_assets", "source_reference")
    op.drop_column("infrastructure_assets", "maintenance_authority")
    op.drop_column("infrastructure_assets", "registry_status")
    op.alter_column("infrastructure_assets", "condition_score", existing_type=sa.Float(), server_default="80.0")
