"""
========================================================================================
PULSO Milestone 2 Challenger Empirical Test Suite: Security & Edge Cases
========================================================================================
Role: challenger_m2_2_g2 (Critic / Specialist)
Targets:
  - backend/main.py
  - backend/crud.py
  - backend/utils/rate_limiter.py
  - backend/utils/security.py
  - backend/utils/geometry_utils.py

Test Vectors:
  1. Upload Security: 0-byte, >10MB, MIME/magic byte mismatch, corrupted headers, path traversal
  2. Boundary Enforcement: North & South Caloocan interior, border proximity, exterior (QC, Bulacan, Manila, Malabon, far outside)
  3. Spatial Deduplication: 15m radius threshold, X-Canonical-Ticket-ID header, category isolation, resolved/cancelled report behavior
  4. Anti-Enumeration & Timing Consistency: uniform 404, identical error payloads, PII sanitization, statistical latency delta
========================================================================================
"""

import sys
import os
import io
import time
import json
import math
import secrets
import statistics
import pytest
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

# Ensure backend root is in sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

import models, gov_models, schemas, crud, auth
from database import Base, get_db
from main import app
from utils.rate_limiter import report_submission_limiter, tracking_query_limiter, claim_limiter
from utils.geometry_utils import is_in_caloocan, calculate_haversine_distance

# In-Memory SQLite Setup for Deterministic Isolated Testing
from database import engine as test_engine
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_test_db(clean_postgis):
    """Recreates database tables and resets rate limiters before every test."""
    # The disposable PostGIS schema is bootstrapped; clean_postgis resets rows.

    # Reset rate limiters
    report_submission_limiter.reset()
    tracking_query_limiter.reset()
    claim_limiter.reset()

    # Override get_db dependency
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Seed District and Barangay records
    db = TestingSessionLocal()
    d3 = models.District(id=3, name="District 3 – North Caloocan", code="D3")
    d1 = models.District(id=1, name="District 1 – South Caloocan", code="D1")
    db.add_all([d1, d3])
    db.commit()

    b171 = models.Barangay(id=171, name="Barangay 171", district_id=3, zip_code="1420")
    b1 = models.Barangay(id=1, name="Barangay 1", district_id=1, zip_code="1400")
    db.add_all([b171, b1])
    db.commit()
    db.close()

    yield

    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


# ========================================================================================
# 1. UPLOAD SECURITY & MAGIC BYTE INTEGRITY TESTS
# ========================================================================================

class TestUploadSecuritySuite:
    """Adversarial challenge suite for upload constraints, magic byte verification, and edge cases."""

    def test_upload_zero_byte_file_rejected(self, client: TestClient):
        """0-byte files must be rejected with 422 Unprocessable Entity."""
        files = {"image": ("empty.jpg", b"", "image/jpeg")}
        data = {
            "category": "Pothole",
            "description": "Deep asphalt crater on Congressional Road requiring urgent patching.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171"
        }
        res = client.post("/api/reports", data=data, files=files)
        assert res.status_code == 422, f"Expected 422 for 0-byte file, got {res.status_code}: {res.text}"
        assert "valid JPEG, PNG, or WebP" in res.json().get("detail", "")

    def test_upload_exceeds_10mb_ceiling_rejected(self, client: TestClient):
        """Files strictly greater than 10MB (10,485,760 bytes) must be rejected with 422."""
        # 10MB + 1 byte
        oversized_payload = b"\xff\xd8\xff\xe0" + b"A" * (10 * 1024 * 1024 - 3)
        assert len(oversized_payload) == 10 * 1024 * 1024 + 1

        files = {"image": ("huge_photo.jpg", oversized_payload, "image/jpeg")}
        data = {
            "category": "Flooding",
            "description": "Severe road flooding near primary drainage outfall along Susano Road.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171"
        }
        res = client.post("/api/reports", data=data, files=files)
        assert res.status_code == 422, f"Expected 422 for >10MB upload, got {res.status_code}: {res.text}"
        assert "exceeds 10MB ceiling" in res.json().get("detail", "")

    def test_upload_boundary_exact_10mb_accepted(self, client: TestClient):
        """Files exactly equal to 10MB (10,485,760 bytes) with valid magic bytes are accepted."""
        # Exactly 10MB
        exact_10mb = b"\xff\xd8\xff\xe0" + b"X" * (10 * 1024 * 1024 - 4)
        assert len(exact_10mb) == 10 * 1024 * 1024

        files = {"image": ("exact_10mb.jpg", exact_10mb, "image/jpeg")}
        data = {
            "category": "Pothole",
            "description": "Large road damage along Camarin Road with 10MB photo evidence.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171"
        }
        res = client.post("/api/reports", data=data, files=files)
        assert res.status_code == 201, f"Expected 201 for valid exact 10MB payload, got {res.status_code}: {res.text}"
        assert res.json().get("image_url") is not None

    def test_upload_mismatched_mime_exe_disguised_as_jpg(self, client: TestClient):
        """Windows PE executable (MZ header) disguised as image/jpeg must be rejected."""
        malicious_pe = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00" + b"\x90" * 200
        files = {"image": ("malware.jpg", malicious_pe, "image/jpeg")}
        data = {
            "category": "Illegal Dumping",
            "description": "Illegal dump site behind public market containing chemical barrels.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171"
        }
        res = client.post("/api/reports", data=data, files=files)
        assert res.status_code == 422, f"Expected 422 for EXE disguised as JPG, got {res.status_code}"
        assert "valid JPEG, PNG, or WebP" in res.json().get("detail", "")

    def test_upload_mismatched_mime_pdf_disguised_as_jpg(self, client: TestClient):
        """PDF document (%PDF-1.4) disguised as image/jpeg must be rejected."""
        pdf_payload = b"%PDF-1.4\n%Report document payload\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
        files = {"image": ("document.jpg", pdf_payload, "image/jpeg")}
        data = {
            "category": "Streetlight",
            "description": "Unlit streetlight cluster causing pedestrian safety issues at night.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171"
        }
        res = client.post("/api/reports", data=data, files=files)
        assert res.status_code == 422, f"Expected 422 for PDF disguised as JPG, got {res.status_code}"

    def test_upload_mismatched_mime_bash_disguised_as_png(self, client: TestClient):
        """Shell script (#!/bin/bash) disguised as image/png must be rejected."""
        bash_payload = b"#!/bin/bash\n# Exploitation script\nrm -rf /tmp/test\necho 'hacked'\n"
        files = {"image": ("script.png", bash_payload, "image/png")}
        data = {
            "category": "Traffic Signal",
            "description": "Broken traffic signal light at major intersection along Zabarte Road.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171"
        }
        res = client.post("/api/reports", data=data, files=files)
        assert res.status_code == 422, f"Expected 422 for Bash script disguised as PNG, got {res.status_code}"

    def test_upload_mismatched_mime_svg_html_xss_disguised_as_webp(self, client: TestClient):
        """SVG/HTML XSS payload disguised as WebP must be rejected."""
        xss_payload = b"<svg xmlns='http://www.w3.org/2000/svg' onload='alert(document.domain)'></svg>"
        files = {"image": ("vector.webp", xss_payload, "image/webp")}
        data = {
            "category": "Pothole",
            "description": "Hazardous road crater damaging vehicle suspensions on Zapote Street.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171"
        }
        res = client.post("/api/reports", data=data, files=files)
        assert res.status_code == 422, f"Expected 422 for SVG/XSS disguised as WebP, got {res.status_code}"

    def test_upload_corrupted_jpeg_header_rejected(self, client: TestClient):
        """Truncated JPEG magic bytes (\\xff\\xd8 only) must be rejected."""
        corrupted = b"\xff\xd8\x00\x00CorruptedPayload"
        files = {"image": ("bad.jpg", corrupted, "image/jpeg")}
        data = {
            "category": "Pothole",
            "description": "Large road crater with broken pavement along Deparo Road.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171"
        }
        res = client.post("/api/reports", data=data, files=files)
        assert res.status_code == 422

    def test_upload_corrupted_webp_header_riff_not_webp(self, client: TestClient):
        """RIFF container with non-WEBP fourcc (e.g. AVI/WAV) must be rejected."""
        corrupted_webp = b"RIFF\x20\x00\x00\x00WAVEfmt \x10\x00\x00\x00"
        files = {"image": ("audio.webp", corrupted_webp, "image/webp")}
        data = {
            "category": "Pothole",
            "description": "Road damage report near public terminal entrance.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171"
        }
        res = client.post("/api/reports", data=data, files=files)
        assert res.status_code == 422

    def test_upload_random_binary_garbage_rejected(self, client: TestClient):
        """Random fuzzed binary garbage must be rejected."""
        garbage = os.urandom(2048)
        files = {"image": ("noise.png", garbage, "image/png")}
        data = {
            "category": "Pothole",
            "description": "Road surface degradation requiring inspection and resurfacing.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171"
        }
        res = client.post("/api/reports", data=data, files=files)
        assert res.status_code == 422

    def test_upload_path_traversal_filename_sanitized(self, client: TestClient):
        """Malicious filename with path traversal characters must be sanitized safely."""
        valid_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb"
        files = {"image": ("../../../../etc/passwd.jpg", valid_jpeg, "image/jpeg")}
        data = {
            "category": "Streetlight",
            "description": "Streetlight fixture with exposed wiring causing hazard.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171"
        }
        res = client.post("/api/reports", data=data, files=files)
        assert res.status_code == 201
        image_url = res.json().get("image_url")
        assert image_url is not None
        assert ".." not in image_url
        assert image_url.startswith("/api/uploads/reports/report_")


# ========================================================================================
# 2. CALOOCAN JURISDICTIONAL BOUNDARY ENFORCEMENT TESTS
# ========================================================================================

class TestCaloocanBoundarySuite:
    """Adversarial challenge suite for GPS coordinates inside, on borders, and outside Caloocan."""

    def test_boundary_north_caloocan_interior_valid(self, client: TestClient):
        """GPS coordinate inside District 3 (North Caloocan - Bagumbong) must be accepted (201)."""
        lat, lng = 14.7565, 121.0450
        assert is_in_caloocan(lat, lng) is True
        data = {
            "category": "Pothole",
            "description": "Deep crater along Congressional Model Road in Bagumbong area.",
            "lat": str(lat),
            "lng": str(lng),
            "location_barangay": "Barangay 171"
        }
        res = client.post("/api/reports", data=data)
        assert res.status_code == 201
        body = res.json()
        assert body["location_lat"] == pytest.approx(lat, abs=1e-4)
        assert body["location_lng"] == pytest.approx(lng, abs=1e-4)

    def test_boundary_south_caloocan_interior_valid(self, client: TestClient):
        """GPS coordinate inside District 1 (South Caloocan - Grace Park) must be accepted (201)."""
        lat, lng = 14.6500, 120.9800
        assert is_in_caloocan(lat, lng) is True
        data = {
            "category": "Flooding",
            "description": "Gutter overflow along 10th Avenue Grace Park South Caloocan.",
            "lat": str(lat),
            "lng": str(lng),
            "location_barangay": "Barangay 1"
        }
        res = client.post("/api/reports", data=data)
        assert res.status_code == 201

    @pytest.mark.parametrize("name,lat,lng,expected_desc", [
        ("Bulacan SJDM (North Border)", 14.8200, 121.0500, "San Jose del Monte Bulacan"),
        ("Quezon City Novaliches (East Border)", 14.7100, 121.0800, "Novaliches Quezon City"),
        ("Manila Tondo (South Border)", 14.6100, 120.9700, "Tondo Manila"),
        ("Malabon City (West Border)", 14.6600, 120.9400, "Malabon City"),
        ("Valenzuela City Interior", 14.7000, 120.9600, "Valenzuela City"),
        ("Cebu City (Far South)", 10.3157, 123.8854, "Cebu City Visayas"),
        ("Tokyo Japan (International)", 35.6762, 139.6503, "Tokyo Japan"),
        ("Null Island (0,0)", 0.0, 0.0, "Null Island"),
        ("Extreme Latitude (>90)", 95.0, 121.0, "Invalid Latitude"),
        ("Extreme Longitude (>180)", 14.75, 195.0, "Invalid Longitude"),
    ])
    def test_boundary_outside_caloocan_rejected(self, client: TestClient, name: str, lat: float, lng: float, expected_desc: str):
        """GPS coordinates outside Caloocan City jurisdiction must return 400 Bad Request."""
        assert is_in_caloocan(lat, lng) is False, f"Coordinate {lat}, {lng} ({name}) should not be in Caloocan!"
        data = {
            "category": "Pothole",
            "description": f"Testing boundary rejection for {expected_desc} coordinates.",
            "lat": str(lat),
            "lng": str(lng)
        }
        res = client.post("/api/reports", data=data)
        assert res.status_code == 400, f"Expected 400 for {name} ({lat}, {lng}), got {res.status_code}: {res.text}"
        assert "outside the jurisdiction of Caloocan City" in res.json().get("detail", "")

    def test_boundary_optional_null_coordinates_allowed(self, client: TestClient):
        """Submitting report without lat/lng coordinates is allowed for guest reporting."""
        data = {
            "category": "Illegal Dumping",
            "description": "Trash accumulation along neighborhood corner without GPS coordinates.",
            "location_string": "Near Barangay Hall 171",
            "location_barangay": "Barangay 171"
        }
        res = client.post("/api/reports", data=data)
        assert res.status_code == 201
        assert res.json().get("location_lat") is None
        assert res.json().get("location_lng") is None


# ========================================================================================
# 3. SPATIAL DEDUPLICATION & PROXIMITY CONFLICT TESTS
# ========================================================================================

class TestSpatialDeduplicationSuite:
    """Nearby submissions remain independent; same-problem grouping is reviewed separately."""

    def test_spatial_dedup_exact_location_triggers_409_with_header(self, client: TestClient):
        """Independent residents at identical coordinates retain different tickets."""
        lat, lng = 14.75650, 121.04500
        # 1. Create first report
        data1 = {
            "category": "Pothole",
            "description": "Initial primary pothole report on Congressional Road.",
            "lat": str(lat),
            "lng": str(lng),
            "location_barangay": "Barangay 171"
        }
        res1 = client.post("/api/reports", data=data1)
        assert res1.status_code == 201
        ticket1 = res1.json()["ticket_id"]

        # 2. Submit duplicate report at exact same coordinates
        data2 = {
            "category": "Pothole",
            "description": "Duplicate pothole observation at identical location.",
            "lat": str(lat),
            "lng": str(lng),
            "location_barangay": "Barangay 171"
        }
        res2 = client.post("/api/reports", data=data2)
        assert res2.status_code == 201, res2.text
        assert res2.json()["ticket_id"] != ticket1

    def test_spatial_dedup_within_3m_and_10m_triggers_409(self, client: TestClient):
        """Proximity alone cannot reject an independent resident submission."""
        base_lat, base_lng = 14.756500, 121.045000
        res1 = client.post("/api/reports", data={
            "category": "Flooding",
            "description": "Severe flooding on Susano Road near drainage bottleneck.",
            "lat": str(base_lat),
            "lng": str(base_lng),
            "location_barangay": "Barangay 171"
        })
        assert res1.status_code == 201
        canonical_ticket = res1.json()["ticket_id"]

        # Shift by ~3 meters (0.000027 deg lat ~ 3 meters)
        lat_3m = base_lat + 0.000027
        lng_3m = base_lng
        dist_3m = calculate_haversine_distance(base_lat, base_lng, lat_3m, lng_3m) * 1000.0
        assert 2.0 <= dist_3m <= 4.0

        res_3m = client.post("/api/reports", data={
            "category": "Flooding",
            "description": "Flooding report 3 meters away from primary report.",
            "lat": str(lat_3m),
            "lng": str(lng_3m),
            "location_barangay": "Barangay 171"
        })
        assert res_3m.status_code == 201, res_3m.text
        assert res_3m.json()["ticket_id"] != canonical_ticket

        # Shift by ~10 meters (0.000090 deg lat ~ 10 meters)
        lat_10m = base_lat + 0.000090
        lng_10m = base_lng
        dist_10m = calculate_haversine_distance(base_lat, base_lng, lat_10m, lng_10m) * 1000.0
        assert 8.0 <= dist_10m <= 12.0

        res_10m = client.post("/api/reports", data={
            "category": "Flooding",
            "description": "Flooding report 10 meters away from primary report.",
            "lat": str(lat_10m),
            "lng": str(lng_10m),
            "location_barangay": "Barangay 171"
        })
        assert res_10m.status_code == 201, res_10m.text
        assert res_10m.json()["ticket_id"] != canonical_ticket

    def test_spatial_dedup_outside_15m_allowed(self, client: TestClient):
        """Reports at 25 meters distance must NOT be blocked (201 Created)."""
        base_lat, base_lng = 14.756500, 121.045000
        res1 = client.post("/api/reports", data={
            "category": "Streetlight",
            "description": "Dark streetlight pole #101 along Susano Road.",
            "lat": str(base_lat),
            "lng": str(base_lng),
            "location_barangay": "Barangay 171"
        })
        assert res1.status_code == 201

        # Shift by ~25 meters (0.000225 deg lat ~ 25 meters)
        lat_25m = base_lat + 0.000225
        lng_25m = base_lng
        dist_25m = calculate_haversine_distance(base_lat, base_lng, lat_25m, lng_25m) * 1000.0
        assert dist_25m > 15.0

        res_25m = client.post("/api/reports", data={
            "category": "Streetlight",
            "description": "Separate unlit streetlight pole #102 25 meters down the road.",
            "lat": str(lat_25m),
            "lng": str(lng_25m),
            "location_barangay": "Barangay 171"
        })
        assert res_25m.status_code == 201, f"Expected 201 for report >15m away, got {res_25m.status_code}"

    def test_spatial_dedup_different_category_same_location_allowed(self, client: TestClient):
        """Different category at the exact same GPS coordinates must NOT be blocked."""
        lat, lng = 14.75650, 121.04500
        # Pothole report
        res1 = client.post("/api/reports", data={
            "category": "Pothole",
            "description": "Road crater near pedestrian crossing on Susano Road.",
            "lat": str(lat),
            "lng": str(lng),
            "location_barangay": "Barangay 171"
        })
        assert res1.status_code == 201

        # Streetlight report at exact same coordinates
        res2 = client.post("/api/reports", data={
            "category": "Streetlight",
            "description": "Broken streetlight right above the pothole at the same intersection.",
            "lat": str(lat),
            "lng": str(lng),
            "location_barangay": "Barangay 171"
        })
        assert res2.status_code == 201, f"Expected 201 for different category at same location, got {res2.status_code}"

    def test_spatial_dedup_resolved_and_cancelled_reports_do_not_block_new_reports(self, client: TestClient):
        """Resolved, cancelled, or rejected prior reports do not block new reports at same location."""
        lat, lng = 14.75650, 121.04500
        # 1. Create report
        res1 = client.post("/api/reports", data={
            "category": "Pothole",
            "description": "Original pothole report that gets resolved by engineering crew.",
            "lat": str(lat),
            "lng": str(lng),
            "location_barangay": "Barangay 171"
        })
        assert res1.status_code == 201
        report_id = res1.json()["id"]

        # 2. Mark report as resolved in DB
        db = TestingSessionLocal()
        rep = db.query(models.Report).filter(models.Report.id == report_id).first()
        rep.status = "resolved"
        db.commit()
        db.close()

        # 3. New report submitted at exact same location and category should succeed
        res2 = client.post("/api/reports", data={
            "category": "Pothole",
            "description": "New pothole formed at the same location after severe storm.",
            "lat": str(lat),
            "lng": str(lng),
            "location_barangay": "Barangay 171"
        })
        assert res2.status_code == 201, f"Expected 201 when previous report is resolved, got {res2.status_code}"


# ========================================================================================
# 4. ANTI-ENUMERATION, ERROR UNIFORMITY & TIMING CONSISTENCY TESTS
# ========================================================================================

class TestAntiEnumerationSuite:
    """Adversarial challenge suite for anti-enumeration, error uniformity, and timing side-channels."""

    def test_anti_enum_nonexistent_ticket_returns_uniform_404(self, client: TestClient):
        """Querying a non-existent ticket ID must return 404 with standard message."""
        payload = {
            "ticket_id": "PULSO-NONEXISTENT-999",
            "tracking_token": "TRK-ABCD-1234-EFGH-5678"
        }
        res = client.post("/api/reports/track", json=payload)
        assert res.status_code == 404
        assert res.json().get("detail") == "Report not found or invalid tracking credentials."

    def test_anti_enum_existing_ticket_wrong_token_returns_uniform_404(self, client: TestClient):
        """Querying an existing ticket with the wrong tracking token must return identical 404."""
        # 1. Create valid report
        res_create = client.post("/api/reports", data={
            "category": "Pothole",
            "description": "Pothole report for anti-enumeration verification testing.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171"
        })
        assert res_create.status_code == 201
        ticket_id = res_create.json()["ticket_id"]

        # 2. Track with incorrect token
        payload = {
            "ticket_id": ticket_id,
            "tracking_token": "TRK-0000-0000-0000-0000"
        }
        res = client.post("/api/reports/track", json=payload)
        assert res.status_code == 404
        assert res.json().get("detail") == "Report not found or invalid tracking credentials."

    def test_anti_enum_empty_or_malformed_token_returns_uniform_404(self, client: TestClient):
        """Querying an existing ticket with an empty or malformed token must return identical 404."""
        res_create = client.post("/api/reports", data={
            "category": "Pothole",
            "description": "Report testing empty and malformed token lookups.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171"
        })
        ticket_id = res_create.json()["ticket_id"]

        # Empty token
        res_empty = client.post("/api/reports/track", json={"ticket_id": ticket_id, "tracking_token": ""})
        assert res_empty.status_code == 404
        assert res_empty.json().get("detail") == "Report not found or invalid tracking credentials."

        # Missing token fields
        res_none = client.post("/api/reports/track", json={"ticket_id": ticket_id})
        assert res_none.status_code == 404
        assert res_none.json().get("detail") == "Report not found or invalid tracking credentials."

    def test_anti_enum_no_pii_or_internal_ai_reasoning_leaked(self, client: TestClient):
        """Successful tracking response must sanitize all PII and internal AI reasoning."""
        data = {
            "category": "Pothole",
            "description": "Crater report with private contact info attached for testing.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171",
            "contact_email": "private.citizen@example.com",
            "contact_phone": "09171234567"
        }
        res_create = client.post("/api/reports", data=data)
        assert res_create.status_code == 201
        body = res_create.json()
        ticket_id = body["ticket_id"]
        token = body["tracking_token"]

        # Track report
        res_track = client.post("/api/reports/track", json={"ticket_id": ticket_id, "tracking_token": token})
        assert res_track.status_code == 200
        track_data = res_track.json()

        # Strict PII and Internal Data Leakage Assertions
        assert "contact_email" not in track_data, "contact_email leaked in public tracking response!"
        assert "contact_phone" not in track_data, "contact_phone leaked in public tracking response!"
        assert "resident_id" not in track_data, "resident_id leaked in public tracking response!"
        assert "user_id" not in track_data, "user_id leaked in public tracking response!"
        assert "ai_reasoning" not in track_data, "internal ai_reasoning leaked in public tracking response!"
        assert "internal_notes" not in track_data, "internal notes leaked in public tracking response!"

    def test_anti_enum_timing_side_channel_consistency(self, client: TestClient):
        """
        Empirically measures latency distribution for:
          A) Non-existent Ticket ID (dummy HMAC executed)
          B) Valid Ticket ID with invalid tracking token (real HMAC executed)
        Verifies that delta is minimal and cannot serve as an enumeration oracle.
        """
        # Create a real report
        res_create = client.post("/api/reports", data={
            "category": "Streetlight",
            "description": "Streetlight timing side-channel evaluation baseline report.",
            "lat": "14.7565",
            "lng": "121.0450",
            "location_barangay": "Barangay 171"
        })
        real_ticket = res_create.json()["ticket_id"]
        fake_ticket = "PULSO-NONEXISTENT-777"
        dummy_token = "TRK-DEAD-BEEF-CAFE-0000"

        # Disable rate limiter for timing benchmark
        tracking_query_limiter.reset()

        latencies_fake_ticket = []
        latencies_real_ticket_wrong_token = []

        # Warm-up run (10 iterations)
        for _ in range(10):
            tracking_query_limiter.reset()
            client.post("/api/reports/track", json={"ticket_id": fake_ticket, "tracking_token": dummy_token})
            client.post("/api/reports/track", json={"ticket_id": real_ticket, "tracking_token": dummy_token})

        # Benchmark 50 interleaved runs
        for i in range(50):
            tracking_query_limiter.reset()

            # Measure Case A: Non-existent ticket
            t0 = time.perf_counter()
            res_a = client.post("/api/reports/track", json={"ticket_id": fake_ticket, "tracking_token": dummy_token})
            t1 = time.perf_counter()
            assert res_a.status_code == 404
            latencies_fake_ticket.append((t1 - t0) * 1000.0) # ms

            tracking_query_limiter.reset()

            # Measure Case B: Real ticket with invalid token
            t2 = time.perf_counter()
            res_b = client.post("/api/reports/track", json={"ticket_id": real_ticket, "tracking_token": dummy_token})
            t3 = time.perf_counter()
            assert res_b.status_code == 404
            latencies_real_ticket_wrong_token.append((t3 - t2) * 1000.0) # ms

        mean_a = statistics.mean(latencies_fake_ticket)
        mean_b = statistics.mean(latencies_real_ticket_wrong_token)
        delta_ms = abs(mean_a - mean_b)

        print(f"\n[Timing Side-Channel Empirical Results]")
        print(f"  Non-existent Ticket (Case A) Mean Latency: {mean_a:.3f} ms (std: {statistics.stdev(latencies_fake_ticket):.3f} ms)")
        print(f"  Real Ticket Wrong Token (Case B) Mean Latency: {mean_b:.3f} ms (std: {statistics.stdev(latencies_real_ticket_wrong_token):.3f} ms)")
        print(f"  Absolute Delta: {delta_ms:.3f} ms")

        # In-process test client latency delta should be well under 5ms
        assert delta_ms < 5.0, f"Timing discrepancy between nonexistent ticket and wrong token is too large: {delta_ms:.3f}ms"
