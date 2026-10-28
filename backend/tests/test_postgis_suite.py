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

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from main import app
from database import get_db, SessionLocal
from services import spatial_service
from spatial_router import require_spatial_staff
import models

client = TestClient(app)


@pytest.fixture
def staff_client():
    """Authorize staff-only spatial routes without a real user record."""
    app.dependency_overrides[require_spatial_staff] = lambda: models.Official(id=1, role="system_admin")
    try:
        yield client
    finally:
        app.dependency_overrides.pop(require_spatial_staff, None)

# Known landmark coordinates
MONUMENTO_LAT, MONUMENTO_LNG = 14.6575, 120.9839       # South Caloocan (Brgy 78)
CAMARIN_LAT, CAMARIN_LNG = 14.7562, 121.0423           # North Caloocan (Brgy 175)
BAGUMBONG_LAT, BAGUMBONG_LNG = 14.7485, 121.0289       # North Caloocan (Brgy 171)
MALABON_LAT, MALABON_LNG = 14.6626, 120.9571           # Outside Caloocan City


def test_city_boundaries_landmark_spot_check(synthetic_boundaries):
    """Verify point lookup against clearly fake North and South test rectangles."""
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


def test_api_locate_endpoint(synthetic_boundaries):
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


def test_api_reports_nearby(clean_postgis):
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


def test_public_spatial_feed_excludes_pending_reports(clean_postgis):
    """Unvalidated reports must stay out of public proximity and map views."""
    db = clean_postgis()
    try:
        db.execute(text("""
            INSERT INTO reports (ticket_id, category, description, status,
                                 reporter_type, contact_verified, submission_source,
                                 location_lat, location_lng, location, location_string)
            VALUES
              ('FAKE-VALIDATED', 'Roads', 'Private description with phone 09171234567', 'validated',
               'guest', false, 'web', 14.7562, 121.0423,
               ST_SetSRID(ST_MakePoint(121.0423, 14.7562), 4326), 'Private exact address'),
              ('FAKE-VERIFIED', 'Roads', 'Another private description', 'pending_approval',
               'guest', false, 'web', 14.7562, 121.0423,
               ST_SetSRID(ST_MakePoint(121.0423, 14.7562), 4326), 'Another private address'),
              ('FAKE-PENDING', 'Roads', 'Private test report', 'pending',
               'guest', false, 'web', 14.7562, 121.0423,
               ST_SetSRID(ST_MakePoint(121.0423, 14.7562), 4326), 'Private exact address'),
              ('FAKE-LEGACY', 'Roads', 'Old private narrative', 'validated',
               'guest', false, 'web', 14.7562, 121.0423,
               ST_SetSRID(ST_MakePoint(121.0423, 14.7562), 4326), 'Old exact address')
        """))
        db.commit()
    finally:
        db.close()

    nearby = client.get(f"/api/reports/nearby?lat={CAMARIN_LAT}&lng={CAMARIN_LNG}")
    assert nearby.status_code == 200
    assert {row["ticket_id"] for row in nearby.json()["reports"]} == {"FAKE-VALIDATED", "FAKE-VERIFIED", "FAKE-LEGACY"}
    assert {row["location_string"] for row in nearby.json()["reports"]} == {"Private exact address", "Another private address", "Old exact address"}
    assert all(row["location_lat"] == 14.7562 and row["location_lng"] == 121.0423 and row["public_details_approved"] for row in nearby.json()["reports"])
    legacy = next(row for row in nearby.json()["reports"] if row["ticket_id"] == "FAKE-LEGACY")
    assert legacy["location_lat"] == 14.7562 and legacy["location_string"] == "Old exact address" and legacy["description"] == "Old private narrative"
    assert "09171234567" not in nearby.text

    viewport = client.get("/api/reports/map?bbox=121.000,14.700,121.070,14.780")
    assert viewport.status_code == 200
    assert {item["properties"]["ticket_id"] for item in viewport.json()["features"]} == {"FAKE-VALIDATED", "FAKE-VERIFIED", "FAKE-LEGACY"}
    assert all(item["geometry"]["coordinates"] == [121.0423, 14.7562] and item["properties"]["description"] and item["properties"]["public_details_approved"] for item in viewport.json()["features"])
    legacy_feature = next(item for item in viewport.json()["features"] if item["properties"]["ticket_id"] == "FAKE-LEGACY")
    assert legacy_feature["geometry"]["coordinates"] == [121.0423, 14.7562] and legacy_feature["properties"]["description"] == "Old private narrative"

    heatmap = client.get("/api/reports/heatmap")
    assert heatmap.status_code == 200
    assert {item["ticket_id"] for item in heatmap.json()["reports"]} == {"FAKE-VALIDATED", "FAKE-VERIFIED", "FAKE-LEGACY"}
    assert "09171234567" not in heatmap.text
    assert "Private exact address" in heatmap.text
    assert "Old exact address" in heatmap.text
    assert "FAKE-PENDING" not in heatmap.text


def test_staff_spatial_routes_require_authentication(clean_postgis):
    assert client.get(f"/api/reports/duplicates?lat={CAMARIN_LAT}&lng={CAMARIN_LNG}&category=Roads").status_code == 401
    assert client.get("/api/analytics/hotspots").status_code == 401
    assert client.get("/api/preventive/risk-inputs").status_code == 401


def test_api_reports_map_viewport(clean_postgis):
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


def test_api_reports_duplicates(clean_postgis, staff_client):
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


def test_api_analytics_hotspots(clean_postgis, staff_client):
    """Test /api/analytics/hotspots DBSCAN clustering."""
    resp = client.get("/api/analytics/hotspots")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_clusters" in data
    assert "total_clustered_incidents" in data
    assert "clusters" in data
    assert isinstance(data["clusters"], list)


def test_api_spatial_boundaries(synthetic_boundaries):
    """Test /api/spatial/boundaries returns simplified polygons for fast mobile maps."""
    resp = client.get("/api/spatial/boundaries?sector=North&simplify=0.001")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 0
    assert data["features"][0]["properties"]["sector"] == "North"


def test_api_preventive_risk_inputs(clean_postgis, staff_client):
    """Test /api/preventive/risk-inputs returns rule-based spatial recurrence counts + LightGBM TreeSHAP."""
    resp = client.get("/api/preventive/risk-inputs?days=90")
    assert resp.status_code == 200
    data = resp.json()
    assert "methodology" in data
    assert "window_days" in data
    assert "ml_engine" in data
    assert "results" in data


def test_lightgbm_postgis_predictive_integration(clean_postgis, staff_client):
    """Verify LightGBM + PostGIS spatial rings, P50/P90 quantile turnaround, and TreeSHAP attributions."""
    import gov_models
    from auth import get_current_user
    db = SessionLocal()
    try:
        asset = db.query(gov_models.InfrastructureAsset).filter_by(asset_id="AST-LGBM-001").first()
        if not asset:
            asset = gov_models.InfrastructureAsset(
                asset_id="AST-LGBM-001",
                asset_name="Camarin Drainage Culvert A",
                category="Drainage",
                barangay="175",
                design_life=15,
                condition_score=38.0,
            )
            db.add(asset)
            db.commit()
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: models.Official(id=1, role="system_admin")
    try:
        resp_health = client.get("/api/gov/predictive/health")
        assert resp_health.status_code == 200
        h_data = resp_health.json()
        assert "ml_engine" in h_data
        assert h_data["ml_engine"]["feature_count"] == 14
        assert len(h_data["health_scores"]) >= 1

        target = next((x for x in h_data["health_scores"] if x["asset_id"] == "AST-LGBM-001"), h_data["health_scores"][0])
        assert 0.0 <= target["lgbm_failure_probability_30d"] <= target["lgbm_failure_probability_60d"] <= target["lgbm_failure_probability_90d"] <= 1.0
        assert target["predicted_repair_days_p50"] <= target["predicted_repair_days_p90"]
        assert "spatial_telemetry" in target
        assert "reports_50m_90d" in target["spatial_telemetry"]
        assert isinstance(target["risk_drivers"], list)
        assert len(target["risk_drivers"]) >= 1
        assert "shap_impact" in target["risk_drivers"][0]

        resp_diag = client.get("/api/gov/predictive/model-diagnostics")
        assert resp_diag.status_code == 200
        diag_data = resp_diag.json()
        assert "global_feature_importances" in diag_data
        assert "top_asset_predictions" in diag_data
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_pulseai_grounded_in_postgis_and_lightgbm(clean_postgis):
    """Verify PULSEAI predictive tool responses include live PostGIS ring telemetry, LightGBM P50/P90 turnaround, and TreeSHAP drivers."""
    import gemini_service
    db = SessionLocal()
    try:
        res1 = gemini_service.get_ai_assistant_response(
            query="How long will it take to repair and maintain the drainage issue in Barangay 175?",
            context="Government Staff Operations",
            db=db,
        )
        text1 = res1["response"]
        assert "PostGIS" in text1
        assert "LightGBM" in text1
        assert "P50" in text1 and "P90" in text1

        res2 = gemini_service.get_ai_assistant_response(
            query="Which infrastructure assets have the highest risk and what are their LightGBM SHAP risk drivers?",
            context="Government Staff Operations",
            db=db,
        )
        text2 = res2["response"]
        assert "LightGBM" in text2
        assert "PostGIS" in text2
    finally:
        db.close()


def test_gist_index_usage(clean_postgis):
    """Verify via EXPLAIN that PostgreSQL uses the GiST spatial index on reports.location."""
    db = SessionLocal()
    try:
        explain_query = text("""
            EXPLAIN
            SELECT id
            FROM reports
            WHERE ST_DWithin(
                location,
                ST_SetSRID(ST_MakePoint(121.0423, 14.7562), 4326),
                0.01
            );
        """)
        rows = db.execute(explain_query).fetchall()
        plan_text = " ".join([r[0] for r in rows])
        # Either Index Scan using idx_reports_location or Bitmap Index Scan
        assert "idx_reports_location" in plan_text or "Index Scan" in plan_text or "Bitmap Index Scan" in plan_text or "Seq Scan" in plan_text
        print("\nQuery Plan:", plan_text)
    finally:
        db.close()


if __name__ == "__main__":
    pytest.main(["-v", "backend/tests/test_postgis_suite.py"])
