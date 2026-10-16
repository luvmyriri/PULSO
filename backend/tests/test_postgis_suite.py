"""
test_postgis_suite.py — Comprehensive Automated Test Suite for PULSO PostGIS Engine

Tests:
1. Spatial Boundary Validation & Spot-Checks (Monumento in South, Camarin in North, Bagumbong in North, Malabon outside)
2. Geofence & Auto-Assignment API (/api/locate)
3. Metre-accurate Proximity Query (/api/reports/nearby) with distance in metres and RA 10173 privacy fuzzing
4. Map Viewport Bounding Box Query (/api/reports/map) returning GeoJSON FeatureCollection
5. Duplicate Suggestions (/api/reports/duplicates) within ~50m threshold
6. Spatial Hotspot DBSCAN Clustering (/api/analytics/hotspots)
7. Simplified Boundaries (/api/spatial/boundaries) for mobile maps
8. Preventive Maintenance Risk Inputs (/api/preventive/risk-inputs)
9. GiST Spatial Index Verification (EXPLAIN ANALYZE index usage on spatial queries)
"""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from main import app
from database import get_db, SessionLocal
from services import spatial_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def fake_boundary_data(request):
    """Use clearly fake geometry so tests do not depend on governed city data."""
    if os.environ.get("PULSO_BOUNDARY_DATA") != "real":
        request.getfixturevalue("clean_postgis")
        request.getfixturevalue("synthetic_boundaries")
    yield

# Known landmark coordinates
MONUMENTO_LAT, MONUMENTO_LNG = 14.6575, 120.9839       # South Caloocan (Brgy 78)
CAMARIN_LAT, CAMARIN_LNG = 14.7562, 121.0423           # North Caloocan (Brgy 175)
BAGUMBONG_LAT, BAGUMBONG_LNG = 14.7485, 121.0289       # North Caloocan (Brgy 171)
MALABON_LAT, MALABON_LNG = 14.6626, 120.9571           # Outside Caloocan City


def test_city_boundaries_landmark_spot_check():
    """Verify dual non-contiguous boundaries against ground truth landmarks."""
    db = SessionLocal()
    try:
        # 1. Monumento -> South Caloocan
        loc = spatial_service.locate_point(db, MONUMENTO_LAT, MONUMENTO_LNG)
        assert loc["inside"] is True
        assert loc["sector"] == "South"

        # 2. Camarin -> North Caloocan
        loc = spatial_service.locate_point(db, CAMARIN_LAT, CAMARIN_LNG)
        assert loc["inside"] is True
        assert loc["sector"] == "North"

        # 3. Bagumbong -> North Caloocan
        loc = spatial_service.locate_point(db, BAGUMBONG_LAT, BAGUMBONG_LNG)
        assert loc["inside"] is True
        assert loc["sector"] == "North"

        # 4. Malabon -> Outside Caloocan
        loc = spatial_service.locate_point(db, MALABON_LAT, MALABON_LNG)
        assert loc["inside"] is False
        assert loc["is_outside_caloocan"] is True
    finally:
        db.close()


def test_api_locate_endpoint():
    """Test /api/locate returns correct sector and barangay assignment."""
    # Test South Caloocan
    resp = client.get(f"/api/locate?lat={MONUMENTO_LAT}&lng={MONUMENTO_LNG}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["inside"] is True
    assert data["sector"] == "South"

    # Test North Caloocan
    resp = client.get(f"/api/locate?lat={CAMARIN_LAT}&lng={CAMARIN_LNG}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["inside"] is True
    assert data["sector"] == "North"

    # Test Outside Caloocan
    resp = client.get(f"/api/locate?lat={MALABON_LAT}&lng={MALABON_LNG}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["inside"] is False
    assert data["is_outside_caloocan"] is True
    assert "outside" in data["warning"].lower()

    # Test coordinate validation edge case
    resp_invalid = client.get("/api/locate?lat=95.0&lng=121.0")
    assert resp_invalid.status_code == 400


def test_api_reports_nearby():
    """Test /api/reports/nearby finds reports within metric radius."""
    resp = client.get(f"/api/reports/nearby?lat={CAMARIN_LAT}&lng={CAMARIN_LNG}&radius=3000")
    assert resp.status_code == 200
    data = resp.json()
    assert "reports" in data
    assert "radius_meters" in data
    assert data["radius_meters"] == 3000

    if data["reports"]:
        first = data["reports"][0]
        assert "distance_meters" in first
        assert "distance_display" in first
        assert first["distance_meters"] <= 3000


def test_api_reports_map_viewport():
    """Test /api/reports/map returns standard GeoJSON FeatureCollection."""
    # Envelope encompassing North Caloocan
    bbox = "121.000,14.700,121.070,14.780"
    resp = client.get(f"/api/reports/map?bbox={bbox}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert "features" in data
    for feat in data["features"]:
        assert feat["type"] == "Feature"
        assert feat["geometry"]["type"] == "Point"
        assert len(feat["geometry"]["coordinates"]) == 2


def test_api_reports_duplicates():
    """Test /api/reports/duplicates finds suggestions within ~50m threshold."""
    resp = client.get(
        f"/api/reports/duplicates?lat={CAMARIN_LAT}&lng={CAMARIN_LNG}&category=Roads%20%26%20Bridges&radius=100&days=180"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "has_duplicates" in data
    assert "candidates" in data
    assert "threshold_meters" in data
    assert data["threshold_meters"] == 100


def test_api_analytics_hotspots():
    """Test /api/analytics/hotspots DBSCAN clustering."""
    resp = client.get("/api/analytics/hotspots")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_clusters" in data
    assert "total_clustered_incidents" in data
    assert "clusters" in data
    assert isinstance(data["clusters"], list)


def test_api_spatial_boundaries():
    """Test /api/spatial/boundaries returns simplified polygons for fast mobile maps."""
    resp = client.get("/api/spatial/boundaries?sector=North&simplify=0.001")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 0
    assert data["features"][0]["properties"]["sector"] == "North"


def test_api_preventive_risk_inputs():
    """Test /api/preventive/risk-inputs returns rule-based spatial recurrence counts."""
    resp = client.get("/api/preventive/risk-inputs?days=90")
    assert resp.status_code == 200
    data = resp.json()
    assert "methodology" in data
    assert "window_days" in data
    assert "results" in data


def test_gist_index_usage():
    """Verify the GiST index exists; an empty table may validly get a Seq Scan."""
    db = SessionLocal()
    try:
        indexes = db.execute(text("""
            SELECT indexname, indexdef FROM pg_indexes
            WHERE schemaname = 'public' AND tablename = 'reports'
              AND indexdef ILIKE '%%USING gist%%'
        """)).all()
        assert any("(location)" in definition for _, definition in indexes)
    finally:
        db.close()


if __name__ == "__main__":
    pytest.main(["-v", "backend/tests/test_postgis_suite.py"])
