"""Index report and field-agent points for metre-based ticket operations.

Revision ID: b72d4e_postgis_report_locations
Revises: da48716fc54d
"""

from alembic import op

revision = "b72d4e_postgis_report_locations"
down_revision = "da48716fc54d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    # Keep the legacy coordinate columns as the write contract. The generated
    # point follows every update and leaves incomplete or invalid locations NULL.
    op.execute("""
        ALTER TABLE reports ADD COLUMN location_geog geography(Point, 4326)
        GENERATED ALWAYS AS (
            CASE WHEN location_lat BETWEEN -90 AND 90
                   AND location_lng BETWEEN -180 AND 180
                 THEN ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)::geography
                 ELSE NULL
            END
        ) STORED
    """)
    op.execute("CREATE INDEX ix_reports_location_geog ON reports USING GIST (location_geog)")
    op.execute("""
        ALTER TABLE agent_locations ADD COLUMN location_geog geography(Point, 4326)
        GENERATED ALWAYS AS (
            CASE WHEN latitude BETWEEN -90 AND 90
                   AND longitude BETWEEN -180 AND 180
                 THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
                 ELSE NULL
            END
        ) STORED
    """)
    op.execute("CREATE INDEX ix_agent_locations_location_geog ON agent_locations USING GIST (location_geog)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_agent_locations_location_geog")
    op.execute("ALTER TABLE agent_locations DROP COLUMN IF EXISTS location_geog")
    op.execute("DROP INDEX IF EXISTS ix_reports_location_geog")
    op.execute("ALTER TABLE reports DROP COLUMN IF EXISTS location_geog")
    # Other spatial data may use the extension; leave it installed.
