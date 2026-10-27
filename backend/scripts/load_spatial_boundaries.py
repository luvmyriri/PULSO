#!/usr/bin/env python3
"""
load_spatial_boundaries.py
─────────────────────────────────────────────────────────────────────────────
Loads authoritative boundaries for Caloocan City into PostGIS:
1. Two non-contiguous city boundaries: 'North Caloocan' and 'South Caloocan'
   stored as separate MultiPolygon geometries in `city_boundaries`.
2. All 188 Caloocan Barangay boundary polygons loaded into `barangays`.
3. Validates geometries with ST_IsValid and repairs with ST_MakeValid.
4. Verifies landmarks (Monumento in South, Camarin & Bagumbong in North,
   Malabon outside).
5. Runs ANALYZE on spatial tables.
6. Backfills sector and barangay_id for existing reports.
─────────────────────────────────────────────────────────────────────────────
"""

import os
import sys
import json
from pathlib import Path
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Path resolutions
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
ROOT_DIR = BACKEND_DIR.parent

# Load environment
load_dotenv(BACKEND_DIR / ".env.local")
load_dotenv(BACKEND_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    raise SystemExit("Set DATABASE_URL before loading spatial boundaries.")
# Normalize scheme for SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


def parse_js_coords_array(js_file_path, var_name):
    """Extract coordinate array from JS file."""
    with open(js_file_path, "r", encoding="utf-8") as f:
        content = f.read()

    start_marker = f"export const {var_name} = ["
    if start_marker not in content:
        raise ValueError(f"Could not find {start_marker} in {js_file_path}")

    start_idx = content.find(start_marker) + len(start_marker) - 1
    bracket_depth = 0
    end_idx = start_idx
    for i in range(start_idx, len(content)):
        if content[i] == "[":
            bracket_depth += 1
        elif content[i] == "]":
            bracket_depth -= 1
            if bracket_depth == 0:
                end_idx = i + 1
                break

    json_str = content[start_idx:end_idx]
    pts = json.loads(json_str)
    # GeoJSON ring is [[lng, lat], [lng, lat], ...] and must be closed
    ring = [[p["lng"], p["lat"]] for p in pts]
    if ring and (ring[0] != ring[-1]):
        ring.append(ring[0])
    return ring


def main():
    print(f"Connecting to database: {DATABASE_URL.split('@')[-1]}")
    engine = create_engine(DATABASE_URL)

    with engine.begin() as conn:
        # Check PostGIS extension
        postgis_ver = conn.execute(text("SELECT PostGIS_Version();")).scalar()
        print(f"PostGIS version confirmed: {postgis_ver}")

        # ── 1. LOAD CITY BOUNDARIES ──────────────────────────────────────────
        boundaries_js = ROOT_DIR / "frontend" / "src" / "data" / "caloocanBoundaries.js"
        print(f"Loading North & South Caloocan city boundaries from {boundaries_js.name}...")

        north_ring = parse_js_coords_array(boundaries_js, "NORTH_CALOOCAN_PATH")
        south_ring = parse_js_coords_array(boundaries_js, "SOUTH_CALOOCAN_PATH")

        north_geojson = json.dumps({"type": "MultiPolygon", "coordinates": [[north_ring]]})
        south_geojson = json.dumps({"type": "MultiPolygon", "coordinates": [[south_ring]]})

        # Insert or update North Caloocan
        conn.execute(text("""
            INSERT INTO city_boundaries (name, sector, geom)
            VALUES (
                'North Caloocan',
                'North',
                ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326)))
            )
            ON CONFLICT (name) DO UPDATE
            SET sector = EXCLUDED.sector,
                geom = EXCLUDED.geom;
        """), {"geom_json": north_geojson})

        # Insert or update South Caloocan
        conn.execute(text("""
            INSERT INTO city_boundaries (name, sector, geom)
            VALUES (
                'South Caloocan',
                'South',
                ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326)))
            )
            ON CONFLICT (name) DO UPDATE
            SET sector = EXCLUDED.sector,
                geom = EXCLUDED.geom;
        """), {"geom_json": south_geojson})

        print("City boundaries loaded successfully (2 non-contiguous polygons).")

        # ── 2. LOAD BARANGAYS FROM GEOJSON ───────────────────────────────────
        border_json_path = ROOT_DIR / "frontend" / "src" / "data" / "caloocan_border.json"
        print(f"Loading 188 Caloocan barangay polygons from {border_json_path.name}...")

        with open(border_json_path, "r", encoding="utf-8") as f:
            border_data = json.load(f)

        features = border_data.get("features", [])
        print(f"Found {len(features)} features in GeoJSON.")

        # Ensure districts exist
        d1 = conn.execute(text("SELECT id FROM districts WHERE code = 'D1'")).scalar()
        if not d1:
            conn.execute(text("INSERT INTO districts (name, code) VALUES ('District 1 - South Caloocan', 'D1') ON CONFLICT DO NOTHING;"))
            d1 = conn.execute(text("SELECT id FROM districts WHERE code = 'D1'")).scalar()
        d2 = conn.execute(text("SELECT id FROM districts WHERE code = 'D2'")).scalar()
        if not d2:
            conn.execute(text("INSERT INTO districts (name, code) VALUES ('District 2 - North Caloocan', 'D2') ON CONFLICT DO NOTHING;"))
            d2 = conn.execute(text("SELECT id FROM districts WHERE code = 'D2'")).scalar()

        loaded_count = 0
        for feat in features:
            props = feat.get("properties", {})
            geom = feat.get("geometry", {})
            if not geom or not geom.get("coordinates"):
                continue

            name = props.get("ADM4_EN") or f"Barangay {props.get('brgy_num', 0)}"
            sector = props.get("sector") or ("North" if props.get("brgy_num", 0) >= 165 else "South")
            brgy_num = props.get("brgy_num")
            display_name = props.get("display_name") or f"Brgy. {brgy_num}"
            district_id = d2 if sector == "North" else d1

            # Convert to MultiPolygon GeoJSON if it's a Polygon
            if geom.get("type") == "Polygon":
                multi_geom = {"type": "MultiPolygon", "coordinates": [geom["coordinates"]]}
            else:
                multi_geom = geom

            geom_json = json.dumps(multi_geom)

            # Insert or update
            conn.execute(text("""
                INSERT INTO barangays (name, district_id, sector, brgy_num, display_name, geom)
                VALUES (
                    :name,
                    :district_id,
                    :sector,
                    :brgy_num,
                    :display_name,
                    ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326)))
                )
                ON CONFLICT (name) DO UPDATE
                SET district_id = EXCLUDED.district_id,
                    sector = EXCLUDED.sector,
                    brgy_num = EXCLUDED.brgy_num,
                    display_name = EXCLUDED.display_name,
                    geom = EXCLUDED.geom;
            """), {
                "name": name,
                "district_id": district_id,
                "sector": sector,
                "brgy_num": brgy_num,
                "display_name": display_name,
                "geom_json": geom_json
            })
            loaded_count += 1

        print(f"Loaded/updated {loaded_count} barangays into 'barangays' table.")

        # ── 3. RUN ANALYZE FOR QUERY PLANNER ─────────────────────────────────
        print("Running ANALYZE on spatial tables...")
        conn.execute(text("ANALYZE city_boundaries;"))
        conn.execute(text("ANALYZE barangays;"))
        conn.execute(text("ANALYZE reports;"))
        conn.execute(text("ANALYZE infrastructure_assets;"))
        conn.execute(text("ANALYZE agent_locations;"))

        # ── 4. BACKFILL REPORTS SPATIAL DATA ─────────────────────────────────
        print("Backfilling reports.sector and reports.barangay_id from PostGIS boundaries...")
        updated_reports = conn.execute(text("""
            WITH report_loc AS (
                SELECT r.id AS report_id,
                       b.id AS matched_barangay_id,
                       cb.sector AS matched_sector
                FROM reports r
                LEFT JOIN LATERAL (
                    SELECT id FROM barangays b
                    WHERE ST_Covers(b.geom, r.location)
                    LIMIT 1
                ) b ON true
                LEFT JOIN LATERAL (
                    SELECT sector FROM city_boundaries cb
                    WHERE ST_Covers(cb.geom, r.location)
                    LIMIT 1
                ) cb ON true
                WHERE r.location IS NOT NULL
            )
            UPDATE reports r
            SET barangay_id = COALESCE(r.barangay_id, rl.matched_barangay_id),
                sector = COALESCE(r.sector, rl.matched_sector)
            FROM report_loc rl
            WHERE r.id = rl.report_id;
        """))
        print(f"Reports backfilled: {updated_reports.rowcount} rows updated.")

        # ── 5. VALIDATION & SPOT-CHECKS ──
        print("\n=== SPOT-CHECKING KNOWN LANDMARKS ===")
        landmarks = [
            ("Monumento", 14.6574, 120.9834, "South Caloocan"),
            ("Camarin", 14.7570, 121.0390, "North Caloocan"),
            ("Bagumbong", 14.7470, 121.0180, "North Caloocan"),
            ("Malabon (Outside)", 14.6600, 120.9500, "Outside Caloocan"),
        ]

        for name, lat, lng, expected in landmarks:
            row = conn.execute(text("""
                SELECT
                    cb.name AS city_boundary,
                    cb.sector,
                    b.name AS barangay_name,
                    b.display_name AS brgy_display
                FROM (SELECT ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) AS pt) p
                LEFT JOIN city_boundaries cb ON ST_Covers(cb.geom, p.pt)
                LEFT JOIN barangays b ON ST_Covers(b.geom, p.pt)
                LIMIT 1;
            """), {"lat": lat, "lng": lng}).fetchone()

            if row and row.city_boundary:
                actual = f"{row.city_boundary} ({row.brgy_display or row.barangay_name})"
                status = "PASS" if row.sector in expected else "FAIL"
            else:
                actual = "Outside Caloocan"
                status = "PASS" if "Outside" in expected else "FAIL"

            print(f"[{status}] {name} ({lat}, {lng}): {actual} | Expected: {expected}")

        # Check geometry validity
        invalid_cb = conn.execute(text("SELECT count(*) FROM city_boundaries WHERE NOT ST_IsValid(geom);")).scalar()
        invalid_brgy = conn.execute(text("SELECT count(*) FROM barangays WHERE geom IS NOT NULL AND NOT ST_IsValid(geom);")).scalar()
        print(f"\nGeometry Validity: city_boundaries invalid={invalid_cb}, barangays invalid={invalid_brgy}")
        assert invalid_cb == 0, "Invalid city boundary geometry detected!"
        assert invalid_brgy == 0, "Invalid barangay geometry detected!"

        print("\nSpatial boundary data successfully loaded, verified, and indexed!\n")


if __name__ == "__main__":
    main()
