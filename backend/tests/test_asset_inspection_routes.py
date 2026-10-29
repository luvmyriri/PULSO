"""Disposable PostGIS checks for registry, inspection and independent review."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image
import pytest

import auth
import asset_inspection_router
import production_predictive
from database import get_db
from gov_models import AssetInspectionEvidence, HazardSourceSnapshot, InfrastructureAsset
from main import app
import models
from scripts.score_production_predictive import purge_unattached_evidence


@pytest.fixture
def inspection_context(clean_postgis):
    with clean_postgis() as db:
        db.add(models.District(id=1, name="FAKE district", code="FAKE1"))
        db.flush()
        db.add(models.Barangay(id=1, name="FAKE area", district_id=1))
        for uid, name, role in ((1, "chief", "city_engineer"), (2, "inspector", "building_inspector"),
                                (3, "clerk", "admin_clerk")):
            db.add(models.Official(id=uid, full_name=f"FAKE {name}", email=f"{name}@test.invalid",
                                   password_hash="test-not-login", role=role, is_active=True))
        db.add(InfrastructureAsset(asset_id="FAKE-DRAIN-01", asset_name="FAKE inlet", category="Drainage",
                                   barangay_id=1, condition_score=None))
        db.commit()
    def override_db():
        with clean_postgis() as db:
            yield db
    app.dependency_overrides[get_db] = override_db
    tokens = {name: {"Authorization": f'Bearer {auth.create_access_token({"sub": name + "@test.invalid"})}'}
              for name in ("chief", "inspector", "clerk")}
    yield TestClient(app), clean_postgis, tokens
    app.dependency_overrides.pop(get_db, None)


def test_registry_and_independent_inspection_flow(inspection_context, monkeypatch):
    client, sessions, tokens = inspection_context
    monkeypatch.setenv("PULSO_HAZARD_FEED_ENABLED", "true")
    monkeypatch.setenv("PULSO_OPEN_METEO_API_KEY", "FAKE-TEST-KEY")
    monkeypatch.setenv("PULSO_HAZARD_LICENSE_REFERENCE", "FAKE approval")
    verify = dict(maintenance_authority="FAKE City Engineering", source_reference="FAKE official register 2026-1",
                  reason="Verified against the field survey record.", latitude=14.72, longitude=121.04)
    assert client.post("/api/gov/predictive/assets/FAKE-DRAIN-01/verify-registry", json=verify,
                       headers=tokens["inspector"]).status_code == 403
    response = client.post("/api/gov/predictive/assets/FAKE-DRAIN-01/verify-registry", json=verify,
                           headers=tokens["chief"])
    assert response.status_code == 200, response.text
    assert response.json()["registry_status"] == "verified"
    with sessions() as db:
        asset = db.get(InfrastructureAsset, "FAKE-DRAIN-01")
        assert asset.geom is not None
        assert asset.condition_score is None

    payload = dict(observed_at=datetime.now(timezone.utc).isoformat(), defect_found=False,
                   condition_score=82, finding="FAKE inlet was clear and structurally intact at field inspection.")
    headers = {**tokens["inspector"], "Idempotency-Key": str(uuid4())}
    submitted = client.post("/api/gov/predictive/assets/FAKE-DRAIN-01/inspection-outcomes", json=payload, headers=headers)
    assert submitted.status_code == 201, submitted.text
    assert submitted.json()["review_status"] == "pending"
    repeated = client.post("/api/gov/predictive/assets/FAKE-DRAIN-01/inspection-outcomes", json=payload, headers=headers)
    assert repeated.status_code == 201
    assert repeated.json()["id"] == submitted.json()["id"]
    assert client.post(f'/api/gov/predictive/inspections/{submitted.json()["id"]}/review',
                       json={"decision": "verified", "reason": "Looks complete and matches the field evidence."},
                       headers=tokens["inspector"]).status_code == 403
    reviewed = client.post(f'/api/gov/predictive/inspections/{submitted.json()["id"]}/review',
                           json={"decision": "verified", "reason": "Looks complete and matches the field evidence."},
                           headers=tokens["chief"])
    assert reviewed.status_code == 200, reviewed.text
    with sessions() as db:
        assert db.get(InfrastructureAsset, "FAKE-DRAIN-01").condition_score == 82
    class Booster:
        def predict(self, matrix):
            assert matrix.shape == (1, len(production_predictive.FEATURE_NAMES))
            return [0.5]
    manifest = dict(category="Drainage", policy={"approved_barangay_ids": [1]},
                    calibration_coefficient=1.0, calibration_intercept=0.0,
                    model_sha256="f" * 64, horizon_days=90, trained_at="2026-01-01T00:00:00+00:00")
    release = (manifest, Booster())
    monkeypatch.setattr(production_predictive, "load_release", lambda: release)
    monkeypatch.setattr(asset_inspection_router, "load_release", lambda: release)
    with sessions() as db:
        now = datetime.now(timezone.utc)
        for signal, value, unit in (("rain_forecast_72h_mm", 12, "mm"),
                                    ("regional_river_discharge_7d_peak_m3s", 3, "m³/s")):
            db.add(HazardSourceSnapshot(barangay_id=1, provider="FAKE licensed feed", product="FAKE forecast",
                                        signal=signal, fetched_at=now - timedelta(hours=1),
                                        expires_at=now + timedelta(hours=5), valid_from=now,
                                        valid_to=now + timedelta(days=3), value=value, unit=unit,
                                        requested_latitude=14.72, requested_longitude=121.04,
                                        license_reference="FAKE approval", documentation_url="https://test.invalid",
                                        payload_sha256="f" * 64, series=[], limitation="FAKE context only"))
        db.commit()
    with sessions() as db:
        scored = production_predictive.score_batch(db)
    assert scored["status"] == "completed"
    assert scored["assets_scored"] == 1
    context = client.get("/api/gov/predictive/production/assets/FAKE-DRAIN-01/hazards", headers=tokens["chief"])
    assert context.status_code == 200, context.text
    assert len(context.json()["signals"]) == 2
    hazard_csv = client.get("/api/gov/predictive/production/assets/FAKE-DRAIN-01/hazards.csv", headers=tokens["chief"])
    assert hazard_csv.status_code == 200 and "rain_forecast_72h_mm" in hazard_csv.text
    flood = client.get("/api/gov/predictive/production/assets/FAKE-DRAIN-01/flood-exposure", headers=tokens["chief"])
    assert flood.status_code == 200 and flood.json()["status"] == "unavailable"
    assert client.get("/api/gov/predictive/production/assets/FAKE-DRAIN-01/flood-exposure",
                      headers=tokens["clerk"]).status_code == 403
    assert client.get("/api/gov/predictive/production/assets/FAKE-DRAIN-01/flood-exposure.csv",
                      headers=tokens["chief"]).status_code == 409
    status = client.get("/api/gov/predictive/production/status", headers=tokens["chief"])
    assert status.status_code == 200, status.text
    assert status.json()["status"] == "available"
    assessed = client.get("/api/gov/predictive/production/assets/FAKE-DRAIN-01", headers=tokens["chief"])
    assert assessed.status_code == 200, assessed.text
    assert assessed.json()["status"] == "available"
    assert 0 < assessed.json()["probability"] < 1
    queue = client.get("/api/gov/predictive/production/queue", headers=tokens["chief"])
    assert queue.status_code == 200, queue.text
    assert queue.json()["total"] == 1
    csv_export = client.get("/api/gov/predictive/production/queue.csv", headers=tokens["chief"])
    assert csv_export.status_code == 200, csv_export.text
    assert "FAKE-DRAIN-01" in csv_export.text and "Model SHA-256" in csv_export.text
    assert client.get("/api/gov/predictive/production/queue.csv", headers=tokens["clerk"]).status_code == 403
    assert client.post(f'/api/gov/predictive/inspections/{submitted.json()["id"]}/review',
                       json={"decision": "rejected", "reason": "Attempt a duplicate review action."},
                       headers=tokens["chief"]).status_code == 409


def test_defect_requires_details_and_staff_authority(inspection_context):
    client, _, tokens = inspection_context
    payload = dict(observed_at=datetime.now(timezone.utc).isoformat(), defect_found=True,
                   condition_score=35, finding="FAKE inlet has a visible fracture across the cover.")
    headers = {**tokens["inspector"], "Idempotency-Key": str(uuid4())}
    assert client.post("/api/gov/predictive/assets/FAKE-DRAIN-01/inspection-outcomes", json=payload,
                       headers=headers).status_code == 422
    assert client.post("/api/gov/predictive/assets/FAKE-DRAIN-01/inspection-outcomes",
                       json={**payload, "defect_type": "Fractured cover", "severity": "major", "evidence_reference": str(uuid4())},
                       headers={**tokens["clerk"], "Idempotency-Key": str(uuid4())}).status_code == 403


def test_private_evidence_required_and_scoped(inspection_context, monkeypatch, tmp_path):
    client, sessions, tokens = inspection_context
    monkeypatch.setattr(asset_inspection_router, "EVIDENCE_ROOT", tmp_path / "asset_inspections")
    monkeypatch.setenv("PUBLICATION_FILE_DIR", str(tmp_path))
    image = BytesIO()
    Image.new("RGB", (4, 4), color="red").save(image, format="PNG")
    path = "/api/gov/predictive/assets/FAKE-DRAIN-01/inspection-evidence"
    assert client.post(path, files={"file": ("field.png", image.getvalue(), "image/png")},
                       headers=tokens["clerk"]).status_code == 403
    uploaded = client.post(path, files={"file": ("field.png", image.getvalue(), "image/png")},
                           headers=tokens["inspector"])
    assert uploaded.status_code == 201, uploaded.text
    evidence_id = uploaded.json()["id"]
    assert client.get(f"/api/gov/predictive/inspection-evidence/{evidence_id}", headers=tokens["clerk"]).status_code == 403
    evidence = client.get(f"/api/gov/predictive/inspection-evidence/{evidence_id}", headers=tokens["inspector"])
    assert evidence.status_code == 200 and evidence.content == image.getvalue()
    payload = dict(observed_at=datetime.now(timezone.utc).isoformat(), defect_found=True,
                   defect_type="Fractured cover", severity="major", condition_score=35,
                   finding="FAKE inlet has a visible fracture across the cover.")
    endpoint = "/api/gov/predictive/assets/FAKE-DRAIN-01/inspection-outcomes"
    assert client.post(endpoint, json=payload,
                       headers={**tokens["inspector"], "Idempotency-Key": str(uuid4())}).status_code == 422
    created = client.post(endpoint, json={**payload, "evidence_reference": evidence_id},
                          headers={**tokens["inspector"], "Idempotency-Key": str(uuid4())})
    assert created.status_code == 201, created.text
    assert client.post(endpoint, json={**payload, "evidence_reference": evidence_id},
                       headers={**tokens["inspector"], "Idempotency-Key": str(uuid4())}).status_code == 409
    abandoned = client.post(path, files={"file": ("field.png", image.getvalue(), "image/png")},
                            headers=tokens["inspector"]).json()["id"]
    with sessions() as db:
        db.get(AssetInspectionEvidence, abandoned).uploaded_at = datetime.now(timezone.utc) - timedelta(days=2)
        db.commit()
        assert purge_unattached_evidence(db) == 1
        assert db.get(AssetInspectionEvidence, evidence_id) is not None
        assert db.get(AssetInspectionEvidence, abandoned) is None


def test_testing_scope_progress_and_unverified_asset_weather(inspection_context, monkeypatch):
    from geoalchemy2.elements import WKTElement
    client, sessions, tokens = inspection_context
    monkeypatch.setenv('PULSO_PREDICTIVE_TESTING', 'true')
    with sessions() as db:
        asset = db.get(InfrastructureAsset, 'FAKE-DRAIN-01')
        asset.geom = WKTElement('POINT(121.03 14.75)', srid=4326)
        db.commit()
    monkeypatch.setattr(asset_inspection_router, 'forecast_context', lambda lat, lon: dict(status='available', mode='testing', signals=[]))
    response = client.get('/api/gov/predictive/testing/progress', headers=tokens['chief'])
    assert response.status_code == 200, response.text
    assert response.json()['metrics']['Recorded assets'] == 1
    assert response.json()['metrics']['Verified registry assets'] == 0
    response = client.get('/api/gov/predictive/testing/assets/FAKE-DRAIN-01/weather', headers=tokens['chief'])
    assert response.status_code == 200, response.text
    assert response.json()['registry_status'] == 'candidate'
    assert response.json()['mode'] == 'testing'
    response = client.get('/api/gov/predictive/testing/progress?export=true', headers=tokens['chief'])
    assert response.status_code == 200 and 'Metric,Count' in response.text
    assert client.get('/api/gov/predictive/testing/progress', headers=tokens['clerk']).status_code == 403
    assert client.get('/api/gov/predictive/testing/assets/FAKE-DRAIN-01/weather', headers=tokens['clerk']).status_code == 403


def test_georisk_map_permissions_extent_alignment_and_source_allowlist(inspection_context, monkeypatch):
    import georisk_router as geo
    geo._render_cache.clear()
    client, sessions, tokens = inspection_context
    assert client.get('/api/gov/predictive/hazard-layers', headers=tokens['clerk']).status_code == 403
    catalog = client.get('/api/gov/predictive/hazard-layers', headers=tokens['chief'])
    assert catalog.status_code == 200
    assert {x['id'] for x in catalog.json()['items']} == {'flood','faults','landslide','liquefaction'}
    path = '/api/gov/predictive/hazard-layers/flood/map?west=121.01&south=14.72&east=121.09&north=14.8'
    assert client.get(path.replace('west=121.01', 'west=0'), headers=tokens['chief']).status_code == 422
    assert client.get(path.replace('/flood/', '/unknown/'), headers=tokens['chief']).status_code == 404
    calls = []
    png = BytesIO()
    Image.new('RGBA', (16, 16), (100, 0, 200, 255)).save(png, format='PNG')
    def fake_fetch(url, params, binary=False):
        calls.append(url)
        if binary: return png.getvalue()
        return dict(href='https://ulap-hazards.georisk.gov.ph/arcgis/rest/directories/arcgisoutput/MGBPublic/Flood_MapServer/_ags_mapfake.png',
                    extent=dict(xmin=121.0, ymin=14.72, xmax=121.1, ymax=14.8, spatialReference={'wkid':4326}))
    monkeypatch.setattr(geo, '_fetch', fake_fetch)
    result = client.get(path, headers=tokens['chief'])
    assert result.status_code == 200, result.text
    assert result.json()['bounds']['west'] == 121.0  # Source adjusts aspect ratio.
    assert result.json()['image_data'].startswith('iVBOR')
    assert result.json()['clipped_to_city'] is True
    assert len(calls) == 2
    assert client.get(path, headers=tokens['chief']).status_code == 200
    assert len(calls) == 2  # Reuse the clipped render without provider calls.
    geo._render_cache.clear()
    monkeypatch.setattr(geo, '_fetch', lambda *args, **kwargs: dict(href='https://example.invalid/untrusted.png', extent=dict(xmin=121,ymin=14.7,xmax=121.1,ymax=14.8,spatialReference={'wkid':4326})))
    assert client.get(path, headers=tokens['chief']).status_code == 502


def test_hazard_city_mask_preserves_alpha_holes_and_disjoint_sectors():
    from shapely.geometry import Polygon, MultiPolygon, box
    import georisk_router as geo
    png = BytesIO()
    Image.new('RGBA', (100, 100), (100, 0, 200, 128)).save(png, format='PNG')
    city = MultiPolygon([Polygon([(1,1),(4,1),(4,4),(1,4)], holes=[[(2,2),(3,2),(3,3),(2,3)]]), box(7,7,9,9)])
    clipped = Image.open(BytesIO(geo._clip_to_city(png.getvalue(), (0,0,10,10), city)))
    assert clipped.getpixel((15,85))[3] == 128
    assert clipped.getpixel((80,20))[3] == 128
    assert clipped.getpixel((25,75))[3] == 0
    assert clipped.getpixel((50,50))[3] == 0


def test_hazard_coverage_distinguishes_blank_source_from_south_only():
    from shapely.geometry import box
    from PIL import ImageDraw
    import georisk_router as geo
    sectors = [('North', box(5,5,10,10)), ('South', box(0,0,5,5))]
    source = Image.new('RGBA', (100,100), (0,0,0,0))
    blank = BytesIO()
    source.save(blank, format='PNG')
    coverage = geo._visible_coverage(blank.getvalue(), (0,0,10,10), sectors)
    assert coverage['has_visible_features'] is False
    assert coverage['bounds'] is None
    assert all(not sector['has_visible_features'] for sector in coverage['sectors'])
    ImageDraw.Draw(source).rectangle((10,60,40,90), fill=(255,0,0,255))
    shaded = BytesIO()
    source.save(shaded, format='PNG')
    coverage = geo._visible_coverage(shaded.getvalue(), (0,0,10,10), sectors)
    assert coverage['has_visible_features'] is True
    assert [sector['name'] for sector in coverage['sectors'] if sector['has_visible_features']] == ['South']
    assert 0 < coverage['bounds']['west'] < coverage['bounds']['east'] < 5
    assert 0 < coverage['bounds']['south'] < coverage['bounds']['north'] < 5


def test_predictive_health_exposes_scoped_registry_geometry(inspection_context):
    from geoalchemy2.elements import WKTElement
    client, sessions, tokens = inspection_context
    with sessions() as db:
        db.get(InfrastructureAsset, 'FAKE-DRAIN-01').geom = WKTElement('POINT(121.03 14.75)', srid=4326)
        db.commit()
    result = client.get('/api/gov/predictive/health', headers=tokens['chief'])
    assert result.status_code == 200, result.text
    asset = result.json()['health_scores'][0]
    assert asset['geometry'] == {'type':'Point','coordinates':[121.03,14.75]}
    assert asset['registry_status'] == 'candidate'
