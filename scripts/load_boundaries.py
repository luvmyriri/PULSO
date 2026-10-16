#!/usr/bin/env python3
"""Validate and insert the reviewed Caloocan city geometry into an empty table.

Input is the pinned, attributed geoBoundaries ADM3 feature in backend/reference_data.
This script never changes districts, barangays, reports, or existing boundary rows.
Set DATABASE_URL explicitly; run --dry-run before --apply.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

import db_schema


ROOT = Path(__file__).resolve().parents[1]
FEATURE = ROOT / "backend/reference_data/caloocan-city-geoboundaries-adm3-simplified.geojson"
EXPECTED_SHA256 = "58ab1b6fc0f1fb756fddd647caad4271476662c43440a6e5327d803fef4d57e8"


def polygons() -> list[str]:
    raw = FEATURE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != EXPECTED_SHA256:
        raise ValueError("The governed city feature checksum has changed")
    feature = json.loads(raw)
    if feature.get("properties", {}).get("shapeID") != "30758251B52612034306412":
        raise ValueError("Unexpected geoBoundaries feature identifier")
    if feature["properties"].get("shapeName") != "Caloocan City":
        raise ValueError("Unexpected city name")
    if feature.get("crs") not in (None, {"type": "name", "properties": {"name": "EPSG:4326"}}):
        raise ValueError("Source CRS is not EPSG:4326")
    geometry = feature["geometry"]
    if geometry.get("type") != "MultiPolygon" or len(geometry.get("coordinates", [])) != 2:
        raise ValueError("Expected two separate Caloocan polygon components")
    return [json.dumps({"type": "Polygon", "coordinates": item})
            for item in geometry["coordinates"]]


def main() -> int:
    parser = argparse.ArgumentParser()
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--dry-run", action="store_true")
    action.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if not os.environ.get("DATABASE_URL"):
        raise ValueError("DATABASE_URL must be explicitly set")
    components = polygons()
    with db_schema.connect() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version_num FROM alembic_version")
            if cursor.fetchone()[0] != db_schema.HEAD_REVISION:
                raise ValueError("Database must be at the expected Alembic head")
            cursor.execute("SELECT PostGIS_Version()")
            if not cursor.fetchone()[0]:
                raise ValueError("PostGIS is unavailable")
            reviewed = []
            for index, geojson in enumerate(components):
                cursor.execute("""
                    WITH raw AS (SELECT ST_GeomFromGeoJSON(%s) AS geom),
                    fixed AS (
                      SELECT CASE WHEN ST_IsValid(geom) THEN geom
                                  ELSE ST_CollectionExtract(ST_MakeValid(geom), 3) END AS geom,
                             ST_IsValid(geom) AS originally_valid
                      FROM raw
                    )
                    SELECT ST_SRID(geom), ST_IsValid(geom), ST_IsEmpty(geom),
                           ST_Y(ST_Centroid(geom)), ST_XMin(geom), ST_XMax(geom),
                           ST_YMin(geom), ST_YMax(geom), originally_valid,
                           ST_Covers(geom, ST_SetSRID(ST_MakePoint(121.0423, 14.7562), 4326)),
                           ST_Covers(geom, ST_SetSRID(ST_MakePoint(120.9839, 14.6575), 4326)),
                           ST_Covers(geom, ST_SetSRID(ST_MakePoint(120.9571, 14.6626), 4326))
                    FROM fixed
                """, (geojson,))
                srid, valid, empty, centroid_lat, xmin, xmax, ymin, ymax, original_valid, camarin, monumento, malabon = cursor.fetchone()
                if srid != 4326 or not valid or empty or not (120 < xmin < xmax < 122 and 14 < ymin < ymax < 15):
                    raise ValueError(f"Invalid CRS, extent, or geometry in component {index}")
                if malabon:
                    raise ValueError("Source polygon incorrectly covers the Malabon check point")
                reviewed.append((centroid_lat, geojson, original_valid, camarin, monumento))
            reviewed.sort(key=lambda item: item[0])
            south, north = reviewed
            if not (south[4] and not south[3] and north[3] and not north[4]):
                raise ValueError("The source components do not match the independent landmark checks")
            rows = [("South Caloocan", "South", south[1]), ("North Caloocan", "North", north[1])]
            cursor.execute("SELECT count(*) FROM city_boundaries")
            before = cursor.fetchone()[0]
            if before:
                cursor.execute("SELECT name, sector, ST_AsGeoJSON(geom) FROM city_boundaries ORDER BY name")
                existing = cursor.fetchall()
                if len(existing) != 2 or {(item[0], item[1]) for item in existing} != {(r[0], r[1]) for r in rows}:
                    raise ValueError("city_boundaries is not empty and does not contain this source; refusing to change it")
                for name, sector, geojson in rows:
                    cursor.execute("""
                        SELECT ST_Equals(geom, ST_Multi(ST_CollectionExtract(
                            CASE WHEN ST_IsValid(ST_GeomFromGeoJSON(%s))
                                 THEN ST_GeomFromGeoJSON(%s)
                                 ELSE ST_MakeValid(ST_GeomFromGeoJSON(%s)) END, 3)))
                        FROM city_boundaries WHERE name=%s AND sector=%s
                    """, (geojson, geojson, geojson, name, sector))
                    if not cursor.fetchone()[0]:
                        raise ValueError("Existing city boundary differs from the pinned source")
                print("Boundary rows already match the pinned source; no changes.")
                return 0
            print(f"Validated two EPSG:4326 city components; source repaired: {sum(not item[2] for item in reviewed)}; before: {before}")
            if args.dry_run:
                print("Dry run: no rows inserted.")
                return 0
            for name, sector, geojson in rows:
                cursor.execute("""
                    INSERT INTO city_boundaries (name, sector, geom)
                    VALUES (%s, %s, ST_Multi(ST_CollectionExtract(
                        CASE WHEN ST_IsValid(ST_GeomFromGeoJSON(%s))
                             THEN ST_GeomFromGeoJSON(%s)
                             ELSE ST_MakeValid(ST_GeomFromGeoJSON(%s)) END, 3)))
                """, (name, sector, geojson, geojson, geojson))
            cursor.execute("SELECT count(*) FROM city_boundaries")
            after = cursor.fetchone()[0]
            if after != 2:
                raise ValueError("Unexpected boundary row count after insert")
        connection.commit()
    print("Inserted two city boundaries; after: 2. Districts and barangays were untouched.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
