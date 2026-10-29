"""Version approved NOAH flood exposure classifications for verified assets.

Revision ID: 22f6a7b8c9d0
Revises: 21e5f6a7b8c9
"""
from alembic import op
import sqlalchemy as sa

revision = "22f6a7b8c9d0"
down_revision = "21e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "noah_flood_releases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_revision", sa.String(64), nullable=False, unique=True),
        sa.Column("source_url", sa.String(500), nullable=False),
        sa.Column("license_reference", sa.String(500), nullable=False),
        sa.Column("archive_manifest", sa.JSON(), nullable=False),
        sa.Column("approved_by", sa.String(200), nullable=False),
        sa.Column("approval_reference", sa.String(300), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("asset_count", sa.Integer(), nullable=False),
        sa.CheckConstraint("status IN ('active','retired')", name="ck_noah_release_status"),
        sa.CheckConstraint("asset_count > 0", name="ck_noah_release_asset_count"),
    )
    op.create_index("uq_noah_one_active_release", "noah_flood_releases", ["status"],
                    unique=True, postgresql_where=sa.text("status = 'active'"))
    op.create_table(
        "noah_flood_asset_exposures",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("release_id", sa.Integer(), sa.ForeignKey("noah_flood_releases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("asset_id", sa.String(), sa.ForeignKey("infrastructure_assets.asset_id", ondelete="RESTRICT"), nullable=False),
        sa.Column("return_period_years", sa.Integer(), nullable=False),
        sa.Column("hazard_class", sa.Integer()),
        sa.Column("asset_geometry_sha256", sa.String(64), nullable=False),
        sa.UniqueConstraint("release_id", "asset_id", "return_period_years", name="uq_noah_exposure_asset_scenario"),
        sa.CheckConstraint("return_period_years IN (5,25,100)", name="ck_noah_return_period"),
        sa.CheckConstraint("hazard_class IN (1,2,3) OR hazard_class IS NULL", name="ck_noah_hazard_class"),
    )
    op.create_index("ix_noah_exposure_asset", "noah_flood_asset_exposures", ["asset_id"])


def downgrade():
    op.drop_index("ix_noah_exposure_asset", table_name="noah_flood_asset_exposures")
    op.drop_table("noah_flood_asset_exposures")
    op.drop_index("uq_noah_one_active_release", table_name="noah_flood_releases")
    op.drop_table("noah_flood_releases")
