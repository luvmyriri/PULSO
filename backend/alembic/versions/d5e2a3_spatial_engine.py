"""PostGIS spatial schema: city boundaries, barangay geometries, report point geometry, asset geometries.

Revision ID: d5e2a3_spatial_engine
Revises: c81a1f_report_reliability
"""

from alembic import op
import sqlalchemy as sa

revision = "d5e2a3_spatial_engine"
down_revision = "c81a1f_report_reliability"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. City Boundaries Table (Two separate non-contiguous MultiPolygons for North & South Caloocan)
    op.execute("""
        CREATE TABLE IF NOT EXISTS city_boundaries (
            id SERIAL PRIMARY KEY,
            name VARCHAR(64) UNIQUE NOT NULL,
            sector VARCHAR(32) NOT NULL,
            geom geometry(MultiPolygon, 4326) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_city_boundaries_geom ON city_boundaries USING GIST (geom);")

    # 2. Add spatial columns to barangays
    op.execute("""
        ALTER TABLE barangays
        ADD COLUMN IF NOT EXISTS sector VARCHAR(32),
        ADD COLUMN IF NOT EXISTS brgy_num INTEGER,
        ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
        ADD COLUMN IF NOT EXISTS geom geometry(MultiPolygon, 4326);
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_barangays_geom ON barangays USING GIST (geom);")

    # 3. Add spatial columns to reports (keeping location_lat, location_lng intact)
    op.execute("""
        ALTER TABLE reports
        ADD COLUMN IF NOT EXISTS location geometry(Point, 4326),
        ADD COLUMN IF NOT EXISTS accuracy_m FLOAT DEFAULT 0.0,
        ADD COLUMN IF NOT EXISTS plus_code VARCHAR(32),
        ADD COLUMN IF NOT EXISTS sector VARCHAR(32);
    """)
    # Backfill location from existing coordinates
    op.execute("""
        UPDATE reports
        SET location = ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)
        WHERE location IS NULL
          AND location_lat BETWEEN -90 AND 90
          AND location_lng BETWEEN -180 AND 180;
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_reports_location ON reports USING GIST (location);")

    # 4. Add spatial geometry to infrastructure_assets
    op.execute("""
        ALTER TABLE infrastructure_assets
        ADD COLUMN IF NOT EXISTS geom geometry(Geometry, 4326);
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_infrastructure_assets_geom ON infrastructure_assets USING GIST (geom);")

    # 5. Add location geometry to agent_locations
    op.execute("""
        ALTER TABLE agent_locations
        ADD COLUMN IF NOT EXISTS location geometry(Point, 4326);
    """)
    op.execute("""
        UPDATE agent_locations
        SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
        WHERE location IS NULL
          AND latitude BETWEEN -90 AND 90
          AND longitude BETWEEN -180 AND 180;
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_agent_locations_location ON agent_locations USING GIST (location);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_agent_locations_location;")
    op.execute("ALTER TABLE agent_locations DROP COLUMN IF EXISTS location;")

    op.execute("DROP INDEX IF EXISTS ix_infrastructure_assets_geom;")
    op.execute("ALTER TABLE infrastructure_assets DROP COLUMN IF EXISTS geom;")

    op.execute("DROP INDEX IF EXISTS ix_reports_location;")
    op.execute("""
        ALTER TABLE reports
        DROP COLUMN IF EXISTS sector,
        DROP COLUMN IF EXISTS plus_code,
        DROP COLUMN IF EXISTS accuracy_m,
        DROP COLUMN IF EXISTS location;
    """)

    op.execute("DROP INDEX IF EXISTS ix_barangays_geom;")
    op.execute("""
        ALTER TABLE barangays
        DROP COLUMN IF EXISTS geom,
        DROP COLUMN IF EXISTS display_name,
        DROP COLUMN IF EXISTS brgy_num,
        DROP COLUMN IF EXISTS sector;
    """)

    op.execute("DROP TABLE IF EXISTS city_boundaries CASCADE;")
