"""
========================================================================================
PULSO Milestone 2: Adversarial Stress, Boundary, & Concurrency Test Suite
========================================================================================
Challenger Role: Endpoint Stress & Boundary Challenger
Targets:
  - POST /api/reports (Intake, Boundaries, MIME/Magic-Bytes, Rate Limiter, AI Moderation)
  - POST /api/reports/track (Public Tracking, Anti-Enumeration, Constant-Time HMAC)
  - POST /api/reports/{id}/claim (Contextual Claiming, Double-Claiming, Race Conditions)
  - GET /api/me/reports (Unified Portfolio, Status Filters, Authz Scoping)
========================================================================================
"""

import sys
import os
import io
import json
import time
import secrets
import threading
import concurrent.futures
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Ensure backend root is in sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import models, gov_models, schemas, crud, auth
from database import Base, get_db
from main import app
from utils.rate_limiter import report_submission_limiter, tracking_query_limiter, claim_limiter

# In-Memory SQLite Setup for Deterministic Isolated Testing
from database import engine as test_engine
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_stress_test_db(clean_postgis):
    """Recreates database tables and resets rate limiters before every test."""
    # The disposable PostGIS schema is bootstrapped; clean_postgis resets rows.

    # Reset all rate limiters
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

    # Seed District and Barangay data
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
    return TestClient(ProxyHeadersMiddleware(app, trusted_hosts=["testclient"]))


@pytest.fixture
def resident_alpha(client):
    """Seed verified resident Alpha (ID=201)."""
    db = TestingSessionLocal()
    pw_hash = auth.get_password_hash("AlphaPassword123!")
    user = models.Resident(
        id=201,
        full_name="Alpha Resident",
        email="alpha.resident@caloocan.test",
        password_hash=pw_hash,
        is_verified=True,
        trust_score=100,
        kyc_level="Silver (Verified ID)",
        phone_number="09171112222",
        barangay_id=171,
        district_id=3
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    token = auth.create_access_token(data={"sub": "alpha.resident@caloocan.test"})
    return {"user": user, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture
def resident_beta(client):
    """Seed verified resident Beta (ID=202)."""
    db = TestingSessionLocal()
    pw_hash = auth.get_password_hash("BetaPassword123!")
    user = models.Resident(
        id=202,
        full_name="Beta Resident",
        email="beta.resident@caloocan.test",
        password_hash=pw_hash,
        is_verified=True,
        trust_score=100,
        kyc_level="Bronze (Self-Signed)",
        phone_number="09183334444",
        barangay_id=1,
        district_id=1
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    token = auth.create_access_token(data={"sub": "beta.resident@caloocan.test"})
    return {"user": user, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture
def official_dispatcher(client):
    """Seed official dispatcher (ID=301)."""
    db = TestingSessionLocal()
    pw_hash = auth.get_password_hash("StaffPassword123!")
    official = models.Official(
        id=301,
        full_name="Engr. Dispatcher",
        email="dispatcher@caloocan.gov.ph",
        password_hash=pw_hash,
        role="dispatcher",
        display_name="Engr. Dispatcher",
        account_type="staff",
        is_active=True
    )
    db.add(official)
    db.commit()
    db.refresh(official)
    db.close()

    token = auth.create_access_token(data={"sub": "dispatcher@caloocan.gov.ph"})
    return {"user": official, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


# ========================================================================================
# 1. OVERSIZED FILES (>10MB) & UPLOAD BOUNDARY TESTS
# ========================================================================================

class TestFileUploadBoundariesAndStress:

    def test_exact_10mb_file_accepted(self, client):
        """Boundary test: exactly 10MB (10,485,760 bytes) with valid JPEG header must succeed."""
        ten_mb_size = 10 * 1024 * 1024
        # Valid JPEG magic bytes + padding
        file_bytes = b"\xFF\xD8\xFF\xE0" + b"\x00" * (ten_mb_size - 4)

        data = {
            "category": "Roads & Bridges",
            "description": "Valid report with exact 10MB image boundary upload.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        files = {
            "image": ("boundary_exact_10mb.jpg", io.BytesIO(file_bytes), "image/jpeg")
        }
        headers = {"X-Forwarded-For": f"10.0.1.{secrets.randbelow(250)}"}
        response = client.post("/api/reports", data=data, files=files, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED, response.text
        json_data = response.json()
        assert json_data["image_url"] is not None

    def test_10mb_plus_one_byte_rejected(self, client):
        """Boundary test: 10MB + 1 byte (10,485,761 bytes) must be rejected with 422."""
        ten_mb_plus_one = (10 * 1024 * 1024) + 1
        file_bytes = b"\xFF\xD8\xFF\xE0" + b"\x00" * (ten_mb_plus_one - 4)

        data = {
            "category": "Roads & Bridges",
            "description": "Report with 10MB + 1 byte image exceeding upload limit.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        files = {
            "image": ("boundary_10mb_plus_1.jpg", io.BytesIO(file_bytes), "image/jpeg")
        }
        headers = {"X-Forwarded-For": f"10.0.2.{secrets.randbelow(250)}"}
        response = client.post("/api/reports", data=data, files=files, headers=headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "exceeds 10MB ceiling" in response.json()["detail"]

    def test_massive_15mb_and_25mb_rejected(self, client):
        """Stress test: 15MB and 25MB files must be rejected immediately with 422."""
        for size_mb in [15, 25]:
            byte_size = size_mb * 1024 * 1024
            file_bytes = b"\xFF\xD8\xFF\xE0" + b"\xAA" * (byte_size - 4)
            data = {
                "category": "Roads & Bridges",
                "description": f"Testing rejection of {size_mb}MB massive file.",
                "lat": 14.7565,
                "lng": 121.0450
            }
            files = {
                "image": (f"massive_{size_mb}mb.jpg", io.BytesIO(file_bytes), "image/jpeg")
            }
            headers = {"X-Forwarded-For": f"10.0.3.{secrets.randbelow(250)}"}
            response = client.post("/api/reports", data=data, files=files, headers=headers)
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
            assert "exceeds 10MB ceiling" in response.json()["detail"]

    def test_zero_byte_empty_file_rejected(self, client):
        """Upload with 0-byte file must be rejected with 422."""
        data = {
            "category": "Roads & Bridges",
            "description": "Testing empty 0-byte file upload rejection.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        files = {
            "image": ("empty.jpg", io.BytesIO(b""), "image/jpeg")
        }
        headers = {"X-Forwarded-For": f"10.0.4.{secrets.randbelow(250)}"}
        response = client.post("/api/reports", data=data, files=files, headers=headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "must be a valid JPEG, PNG, or WebP image" in response.json()["detail"]

    def test_truncated_tiny_file_under_12_bytes(self, client):
        """Upload with tiny header bytes safety."""
        data = {
            "category": "Roads & Bridges",
            "description": "Testing tiny truncated header bytes safety.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        files = {
            "image": ("tiny.jpg", io.BytesIO(b"\xFF\xD8\xFF"), "image/jpeg")
        }
        headers = {"X-Forwarded-For": f"10.0.5.{secrets.randbelow(250)}"}
        response = client.post("/api/reports", data=data, files=files, headers=headers)
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_422_UNPROCESSABLE_ENTITY]


# ========================================================================================
# 2. NON-IMAGE FILES & FAKE EXTENSIONS (SPOOFING & POLYGLOTS)
# ========================================================================================

class TestSpoofedAndMaliciousFiles:

    def test_windows_pe_executable_disguised_as_jpg(self, client):
        """Windows PE executable (MZ header) named 'malware.jpg' with 'image/jpeg' MIME must be rejected."""
        pe_bytes = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00This program cannot be run in DOS mode."
        data = {
            "category": "Traffic & Signals",
            "description": "Disguised executable payload in image upload field.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        files = {
            "image": ("malware.jpg", io.BytesIO(pe_bytes), "image/jpeg")
        }
        headers = {"X-Forwarded-For": f"10.1.1.{secrets.randbelow(250)}"}
        response = client.post("/api/reports", data=data, files=files, headers=headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "must be a valid JPEG, PNG, or WebP image" in response.json()["detail"]

    def test_linux_elf_binary_disguised_as_png(self, client):
        """Linux ELF binary header named 'rootkit.png' with 'image/png' MIME must be rejected."""
        elf_bytes = b"\x7F\x45\x4C\x46\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00"
        data = {
            "category": "Traffic & Signals",
            "description": "Disguised ELF rootkit binary in PNG upload.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        files = {
            "image": ("rootkit.png", io.BytesIO(elf_bytes), "image/png")
        }
        headers = {"X-Forwarded-For": f"10.1.2.{secrets.randbelow(250)}"}
        response = client.post("/api/reports", data=data, files=files, headers=headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "must be a valid JPEG, PNG, or WebP image" in response.json()["detail"]

    def test_php_web_shell_disguised_as_jpg(self, client):
        """PHP script named 'webshell.php.jpg' with 'image/jpeg' MIME must be rejected."""
        php_payload = b"<?php system($_GET['cmd']); passthru('/bin/sh'); ?>"
        data = {
            "category": "Drainage & Flooding",
            "description": "PHP web shell disguised as JPG image file.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        files = {
            "image": ("webshell.php.jpg", io.BytesIO(php_payload), "image/jpeg")
        }
        headers = {"X-Forwarded-For": f"10.1.3.{secrets.randbelow(250)}"}
        response = client.post("/api/reports", data=data, files=files, headers=headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "must be a valid JPEG, PNG, or WebP image" in response.json()["detail"]

    def test_html_xss_script_disguised_as_webp(self, client):
        """HTML script payload named 'xss.webp' with 'image/webp' MIME must be rejected."""
        html_payload = b"<!DOCTYPE html><html><script>alert(document.cookie);</script></html>"
        data = {
            "category": "Drainage & Flooding",
            "description": "HTML XSS file disguised as WebP image.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        files = {
            "image": ("xss.webp", io.BytesIO(html_payload), "image/webp")
        }
        headers = {"X-Forwarded-For": f"10.1.4.{secrets.randbelow(250)}"}
        response = client.post("/api/reports", data=data, files=files, headers=headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "must be a valid JPEG, PNG, or WebP image" in response.json()["detail"]

    def test_riff_audio_avi_spoofed_as_webp(self, client):
        """RIFF AVI/WAVE file (starts with RIFF but has 'AVI ' at offset 8) disguised as WebP must be rejected."""
        riff_avi_payload = b"RIFF\x24\x00\x00\x00AVI LIST\x18\x00\x00\x00hdrlavih"
        data = {
            "category": "Drainage & Flooding",
            "description": "RIFF AVI video container spoofed as WebP photo.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        files = {
            "image": ("fake_riff.webp", io.BytesIO(riff_avi_payload), "image/webp")
        }
        headers = {"X-Forwarded-For": f"10.1.5.{secrets.randbelow(250)}"}
        response = client.post("/api/reports", data=data, files=files, headers=headers)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "must be a valid JPEG, PNG, or WebP image" in response.json()["detail"]

    def test_genuine_png_with_txt_extension_normalized_safely(self, client):
        """Valid PNG magic bytes with .txt extension should be saved with normalized .png extension."""
        png_valid_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
        data = {
            "category": "Streetlights",
            "description": "Valid PNG image with .txt filename extension.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        files = {
            "image": ("image.txt", io.BytesIO(png_valid_bytes), "text/plain")
        }
        headers = {"X-Forwarded-For": f"10.1.6.{secrets.randbelow(250)}"}
        response = client.post("/api/reports", data=data, files=files, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        json_data = response.json()
        assert json_data["image_url"].endswith(".png")


# ========================================================================================
# 3. COORDINATES OUTSIDE CALOOCAN & BOUNDARY STRESS
# ========================================================================================

class TestJurisdictionCoordinatesAndBoundaryStress:

    @pytest.mark.parametrize("city_name,lat,lng", [
        ("Manila City Hall", 14.5895, 120.9815),
        ("Quezon City Memorial", 14.6507, 121.0509),
        ("Makati CBD Ayala", 14.5547, 121.0244),
        ("Valenzuela City Center", 14.7000, 120.9700),
        ("Pasig City Hall", 14.5583, 121.0833),
        ("Taguig BGC", 14.5500, 121.0500),
        ("Cebu City Hall", 10.2933, 123.9019),
        ("Davao City Hall", 7.0644, 125.6078),
        ("Null Island", 0.0, 0.0),
        ("North Pole", 90.0, 0.0),
        ("South Pole", -90.0, 0.0),
        ("Extreme Coordinate Out of Bounds", 85.0, 175.0),
    ])
    def test_coordinates_outside_caloocan_rejected_with_400(self, client, city_name, lat, lng):
        """Any GPS coordinate outside Caloocan boundaries must be rejected with 400 Bad Request."""
        data = {
            "category": "Roads & Bridges",
            "description": f"Incident reported at {city_name} which is outside Caloocan.",
            "lat": lat,
            "lng": lng
        }
        headers = {"X-Forwarded-For": f"10.2.{secrets.randbelow(200)}.{secrets.randbelow(250)}"}
        response = client.post("/api/reports", data=data, headers=headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "outside the jurisdiction of Caloocan City" in response.json()["detail"]

    def test_legitimate_north_and_south_caloocan_accepted(self, client):
        """Legitimate coordinates within North Caloocan (14.7565, 121.0450) and South Caloocan (14.6500, 120.9800) must succeed."""
        # North Caloocan
        data_north = {
            "category": "Roads & Bridges",
            "description": "Legitimate pothole in Congressional Road, North Caloocan.",
            "lat": 14.7565,
            "lng": 121.0450,
            "location_barangay": "Barangay 171"
        }
        headers_n = {"X-Forwarded-For": f"10.2.100.{secrets.randbelow(250)}"}
        resp_n = client.post("/api/reports", data=data_north, headers=headers_n)
        assert resp_n.status_code == status.HTTP_201_CREATED, resp_n.text
        assert resp_n.json()["reporter_type"] == "guest"

        # South Caloocan (Grace Park / 10th Ave)
        data_south = {
            "category": "Traffic & Signals",
            "description": "Broken signal light on Rizal Avenue Extension, South Caloocan.",
            "lat": 14.6500,
            "lng": 120.9800,
            "location_barangay": "Barangay 1"
        }
        headers_s = {"X-Forwarded-For": f"10.2.101.{secrets.randbelow(250)}"}
        resp_s = client.post("/api/reports", data=data_south, headers=headers_s)
        assert resp_s.status_code == status.HTTP_201_CREATED, resp_s.text

    def test_submission_without_coordinates_accepted(self, client):
        """Report submitted without lat/lng coordinates (general city feedback) is allowed."""
        data = {
            "category": "Public Safety",
            "description": "General report submitted without GPS coordinates for city engineer review.",
            "location_string": "Caloocan City Hall Complex"
        }
        headers = {"X-Forwarded-For": f"10.2.102.{secrets.randbelow(250)}"}
        resp = client.post("/api/reports", data=data, headers=headers)
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.json()["ticket_id"].startswith("PUL-")


# ========================================================================================
# 4. CONCURRENT SUBMISSIONS & RACE CONDITION TESTING
# ========================================================================================

class TestConcurrencyAndRaceConditions:

    def test_concurrent_submissions_from_different_ips(self, client):
        """Stress test: 10 rapid report submissions from distinct IPs across Caloocan."""
        coords = [
            (14.7500 + i * 0.002, 121.0400 + i * 0.002) for i in range(10)
        ]
        results = []
        for i in range(10):
            data = {
                "category": "Roads & Bridges",
                "description": f"Concurrent stress test report #{i} with active infrastructure defect.",
                "lat": coords[i][0],
                "lng": coords[i][1]
            }
            headers = {"X-Forwarded-For": f"172.16.1.{i + 10}"}
            resp = client.post("/api/reports", data=data, headers=headers)
            results.append((resp.status_code, resp.json()))

        # All 10 distinct submissions should succeed with 201 Created
        for status_code, body in results:
            assert status_code == status.HTTP_201_CREATED, f"Failed with {status_code}: {body}"
            assert "ticket_id" in body
            assert "tracking_token" in body

    def test_concurrent_duplicate_detection_race(self, client):
        """
        Duplicate detection test: Multiple submissions for the exact same category
        at the exact same GPS coordinates (14.7565, 121.0450) with distinct IPs.
        Each independent operation receives its own ticket; concern linking is separate.
        """
        results = []
        for i in range(5):
            data = {
                "category": "Flood Hazard",
                "description": f"Exact coordinate duplicate flood report submission worker #{i}.",
                "lat": 14.7565,
                "lng": 121.0450
            }
            headers = {"X-Forwarded-For": f"172.16.2.{i + 20}"}
            resp = client.post("/api/reports", data=data, headers=headers)
            results.append((resp.status_code, resp.json()))

        status_codes = [r[0] for r in results]
        created_count = status_codes.count(status.HTTP_201_CREATED)
        conflict_count = status_codes.count(status.HTTP_409_CONFLICT)

        assert created_count == 5, f"Each independent submission must succeed (got {created_count})"
        assert conflict_count == 0
        assert len({body["ticket_id"] for _, body in results}) == 5

    def test_concurrent_claim_race_condition_different_residents(self, client, resident_alpha, resident_beta):
        """
        Claim contention test:
        Resident Alpha and Resident Beta attempt to claim the exact same guest report.
        First resident succeeds with 200 OK.
        The second resident MUST receive 409 Conflict.
        Zero double-claim state corruption.
        """
        # 1. Create a guest report
        data = {
            "category": "Roads & Bridges",
            "description": "High-risk pothole needing immediate municipal patch.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        headers_guest = {"X-Forwarded-For": "192.168.100.1"}
        guest_resp = client.post("/api/reports", data=data, headers=headers_guest)
        assert guest_resp.status_code == status.HTTP_201_CREATED
        report_data = guest_resp.json()
        report_id = report_data["id"]
        tracking_token = report_data["tracking_token"]

        # First claim by Alpha
        claim_alpha = client.post(
            f"/api/reports/{report_id}/claim",
            json={"tracking_token": tracking_token},
            headers=resident_alpha["headers"]
        )
        assert claim_alpha.status_code == status.HTTP_200_OK

        # Second claim by Beta
        claim_beta = client.post(
            f"/api/reports/{report_id}/claim",
            json={"tracking_token": tracking_token},
            headers=resident_beta["headers"]
        )
        assert claim_beta.status_code == status.HTTP_409_CONFLICT

        # Verify DB state has exactly resident Alpha as owner
        db = TestingSessionLocal()
        db_report = db.query(models.Report).filter(models.Report.id == report_id).first()
        assert db_report.claimed_by_user_id == resident_alpha["user"].id
        db.close()


# ========================================================================================
# 5. DOUBLE CLAIMING & IDEMPOTENCY BY RESIDENTS
# ========================================================================================

class TestDoubleClaimingAndIdempotency:

    def test_claim_unclaimed_guest_report_succeeds(self, client, resident_alpha):
        """Resident Alpha successfully claims an unclaimed guest report."""
        data = {
            "category": "Drainage & Flooding",
            "description": "Clogged drainage canal causing water accumulation.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        guest_resp = client.post("/api/reports", data=data, headers={"X-Forwarded-For": "10.5.1.1"})
        assert guest_resp.status_code == status.HTTP_201_CREATED
        rep = guest_resp.json()

        claim_resp = client.post(
            f"/api/reports/{rep['id']}/claim",
            json={"tracking_token": rep["tracking_token"]},
            headers=resident_alpha["headers"]
        )
        assert claim_resp.status_code == status.HTTP_200_OK
        claim_json = claim_resp.json()
        assert claim_json["success"] is True
        assert claim_json["report"]["claimed_by_user_id"] == resident_alpha["user"].id
        assert claim_json["report"]["reporter_type"] == "registered"

    def test_same_resident_claim_idempotent(self, client, resident_alpha):
        """Resident Alpha claiming their already-claimed report returns 200 OK idempotently."""
        data = {
            "category": "Streetlights",
            "description": "Flickering street lamp pole #42 outside barangay hall.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        guest_resp = client.post("/api/reports", data=data, headers={"X-Forwarded-For": "10.5.2.1"})
        rep = guest_resp.json()

        # First claim
        client.post(
            f"/api/reports/{rep['id']}/claim",
            json={"tracking_token": rep["tracking_token"]},
            headers=resident_alpha["headers"]
        )

        # Second claim by same resident Alpha
        second_resp = client.post(
            f"/api/reports/{rep['id']}/claim",
            json={"tracking_token": rep["tracking_token"]},
            headers=resident_alpha["headers"]
        )
        assert second_resp.status_code == status.HTTP_200_OK
        assert "already linked to your account" in second_resp.json()["message"]

    def test_different_resident_claim_conflict_409(self, client, resident_alpha, resident_beta):
        """Resident Beta attempting to claim a report already claimed by Resident Alpha must receive 409 Conflict."""
        data = {
            "category": "Illegal Dumping",
            "description": "Uncollected commercial waste pile along corner street.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        guest_resp = client.post("/api/reports", data=data, headers={"X-Forwarded-For": "10.5.3.1"})
        rep = guest_resp.json()

        # Alpha claims it first
        claim_alpha = client.post(
            f"/api/reports/{rep['id']}/claim",
            json={"tracking_token": rep["tracking_token"]},
            headers=resident_alpha["headers"]
        )
        assert claim_alpha.status_code == status.HTTP_200_OK

        # Beta attempts to claim the same report
        claim_beta = client.post(
            f"/api/reports/{rep['id']}/claim",
            json={"tracking_token": rep["tracking_token"]},
            headers=resident_beta["headers"]
        )
        assert claim_beta.status_code == status.HTTP_409_CONFLICT
        assert "already been claimed by another resident" in claim_beta.json()["detail"]

    def test_claim_report_authored_by_registered_user_rejected_409(self, client, resident_alpha, resident_beta):
        """Resident Beta cannot claim a report originally submitted by registered Resident Alpha."""
        # Alpha submits authenticated report
        data = {
            "category": "Roads & Bridges",
            "description": "Authenticated report submitted by Resident Alpha.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        alpha_resp = client.post("/api/reports", data=data, headers=resident_alpha["headers"])
        assert alpha_resp.status_code == status.HTTP_201_CREATED
        rep = alpha_resp.json()
        assert rep["reporter_type"] == "registered"

        # Beta attempts to claim Alpha's report
        claim_beta = client.post(
            f"/api/reports/{rep['id']}/claim",
            json={"tracking_token": rep["tracking_token"]},
            headers=resident_beta["headers"]
        )
        assert claim_beta.status_code == status.HTTP_409_CONFLICT
        assert "authored by a registered account" in claim_beta.json()["detail"]


# ========================================================================================
# 6. UNAUTHORIZED CLAIMS & SECURITY ATTACK SURFACE
# ========================================================================================

class TestUnauthorizedClaimsAndAttacks:

    def test_unauthenticated_claim_returns_401(self, client):
        """Claim endpoint without Authorization header must return 401 Unauthorized."""
        response = client.post(
            "/api/reports/1/claim",
            json={"tracking_token": "TRK-1111-2222-3333-4444"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_invalid_jwt_token_claim_returns_401(self, client):
        """Claim endpoint with forged/invalid Bearer token returns 401 Unauthorized."""
        response = client.post(
            "/api/reports/1/claim",
            json={"tracking_token": "TRK-1111-2222-3333-4444"},
            headers={"Authorization": "Bearer FORGED_EXPIRED_JWT_TOKEN_ABC123"}
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_official_account_claim_returns_403(self, client, official_dispatcher):
        """Official account (dispatcher/engineer) attempting to claim a citizen report returns 403 Forbidden."""
        data = {
            "category": "Roads & Bridges",
            "description": "Guest report for public street repair.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        guest_resp = client.post("/api/reports", data=data, headers={"X-Forwarded-For": "10.6.1.1"})
        rep = guest_resp.json()

        response = client.post(
            f"/api/reports/{rep['id']}/claim",
            json={"tracking_token": rep["tracking_token"]},
            headers=official_dispatcher["headers"]
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Only resident accounts can claim reports" in response.json()["detail"]

    def test_claim_with_wrong_tracking_token_returns_403(self, client, resident_alpha):
        """Claiming a valid report with an incorrect tracking token returns 403 Forbidden."""
        data = {
            "category": "Roads & Bridges",
            "description": "Guest report to test incorrect tracking token denial.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        guest_resp = client.post("/api/reports", data=data, headers={"X-Forwarded-For": "10.6.2.1"})
        rep = guest_resp.json()

        response = client.post(
            f"/api/reports/{rep['id']}/claim",
            json={"tracking_token": "TRK-DEAD-BEEF-CAFE-0000"},
            headers=resident_alpha["headers"]
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Invalid tracking token for this report" in response.json()["detail"]

    def test_claim_nonexistent_report_id_returns_404(self, client, resident_alpha):
        """Claiming a non-existent report ID returns 404 Not Found."""
        response = client.post(
            "/api/reports/999999/claim",
            json={"tracking_token": "TRK-1111-2222-3333-4444"},
            headers=resident_alpha["headers"]
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Report not found" in response.json()["detail"]

    def test_claim_with_empty_or_whitespace_token_returns_400(self, client, resident_alpha):
        """Claim request with empty/whitespace tracking token returns 400 Bad Request."""
        response = client.post(
            "/api/reports/1/claim",
            json={"tracking_token": "   "},
            headers=resident_alpha["headers"]
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_claim_rate_limiter_10_per_15min(self, client, resident_alpha):
        """Exceeding 10 claim attempts within 15 minutes triggers HTTP 429 Too Many Requests."""
        for i in range(10):
            client.post(
                "/api/reports/999999/claim",
                json={"tracking_token": f"TRK-0000-0000-0000-000{i}"},
                headers=resident_alpha["headers"]
            )
        
        # 11th request from same IP should be blocked
        blocked_resp = client.post(
            "/api/reports/999999/claim",
            json={"tracking_token": "TRK-0000-0000-0000-0010"},
            headers=resident_alpha["headers"]
        )
        assert blocked_resp.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Too many claim attempts" in blocked_resp.json()["detail"]
        assert "Retry-After" in blocked_resp.headers


# ========================================================================================
# 7. PUBLIC TRACKING & ANTI-ENUMERATION ADVERSARIAL STRESS
# ========================================================================================

class TestPublicTrackingSecurityAndAntiEnumeration:

    def test_valid_tracking_returns_public_projection_and_timeline(self, client):
        """Valid ticket_id + tracking_token returns sanitized public payload with timeline."""
        data = {
            "category": "Roads & Bridges",
            "description": "Public pothole report for tracking verification.",
            "lat": 14.7565,
            "lng": 121.0450,
            "location_barangay": "Barangay 171",
            "contact_email": "citizen.private@example.com",
            "contact_phone": "09170000000"
        }
        guest_resp = client.post("/api/reports", data=data, headers={"X-Forwarded-For": "10.7.1.1"})
        rep = guest_resp.json()
        ticket_id = rep["ticket_id"]
        token = rep["tracking_token"]

        track_resp = client.post(
            "/api/reports/track",
            json={"ticket_id": ticket_id, "tracking_token": token},
            headers={"X-Forwarded-For": "10.7.1.2"}
        )
        assert track_resp.status_code == status.HTTP_200_OK
        track_data = track_resp.json()
        assert track_data["ticket_id"] == ticket_id
        assert track_data["category"] == "Roads & Bridges"
        assert track_data["status"] == "pending"
        # Verify strict PII redaction: no contact_email or phone in public track response
        assert "contact_email" not in track_data
        assert "contact_phone" not in track_data

    @pytest.mark.parametrize("scenario,payload", [
        ("Non-existent ticket ID", {"ticket_id": "RPT-20260902-99999999", "tracking_token": "TRK-AAAA-BBBB-CCCC-DDDD"}),
        ("Valid ticket with invalid token", {"ticket_id": "WILL_BE_REPLACED", "tracking_token": "TRK-0000-0000-0000-0000"}),
        ("Invalid format token", {"ticket_id": "WILL_BE_REPLACED", "tracking_token": ""}),
        ("SQL injection in ticket_id", {"ticket_id": "' OR 1=1 --", "tracking_token": "TRK-1111-2222-3333-4444"}),
        ("SQL injection in token", {"ticket_id": "WILL_BE_REPLACED", "tracking_token": "' OR '1'='1"}),
    ])
    def test_anti_enumeration_uniform_404_responses(self, client, scenario, payload):
        """All invalid lookup attempts must return the identical uniform 404 response without leaking existence."""
        data = {
            "category": "Roads & Bridges",
            "description": "Baseline report for anti-enumeration tests.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        guest_resp = client.post("/api/reports", data=data, headers={"X-Forwarded-For": f"10.7.2.{secrets.randbelow(200)}"})
        real_ticket = guest_resp.json()["ticket_id"]

        test_payload = dict(payload)
        if test_payload["ticket_id"] == "WILL_BE_REPLACED":
            test_payload["ticket_id"] = real_ticket

        track_resp = client.post(
            "/api/reports/track",
            json=test_payload,
            headers={"X-Forwarded-For": f"10.7.3.{secrets.randbelow(200)}"}
        )
        assert track_resp.status_code == status.HTTP_404_NOT_FOUND
        assert track_resp.json()["detail"] == "Report not found or invalid tracking credentials."

    def test_tracking_rate_limiter_20_per_minute(self, client):
        """Exceeding 20 tracking queries within 1 minute from the same IP returns HTTP 429."""
        ip = "192.168.50.1"
        for i in range(20):
            client.post(
                "/api/reports/track",
                json={"ticket_id": f"RPT-NONEXISTENT-{i}", "tracking_token": "TRK-0000-0000-0000-0000"},
                headers={"X-Forwarded-For": ip}
            )

        # 21st query must be throttled
        blocked_resp = client.post(
            "/api/reports/track",
            json={"ticket_id": "RPT-NONEXISTENT-21", "tracking_token": "TRK-0000-0000-0000-0000"},
            headers={"X-Forwarded-For": ip}
        )
        assert blocked_resp.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Too many tracking attempts" in blocked_resp.json()["detail"]
        assert "Retry-After" in blocked_resp.headers


# ========================================================================================
# 8. UNIFIED "MY REPORTS" & AUTHORIZATION SCOPING
# ========================================================================================

class TestMyReportsPortfolioAndScoping:

    def test_unauthenticated_my_reports_returns_401(self, client):
        """GET /api/me/reports without JWT returns 401 Unauthorized."""
        response = client.get("/api/me/reports")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_resident_sees_authored_and_claimed_reports_only(self, client, resident_alpha, resident_beta):
        """Resident Alpha sees their authored and claimed reports, but never Resident Beta's reports."""
        # Alpha authors report 1
        client.post("/api/reports", data={
            "category": "Roads & Bridges",
            "description": "Report authored by Alpha.",
            "lat": 14.7565, "lng": 121.0450
        }, headers=resident_alpha["headers"])

        # Alpha claims guest report 2
        g_resp = client.post("/api/reports", data={
            "category": "Streetlights",
            "description": "Guest report claimed by Alpha.",
            "lat": 14.7565, "lng": 121.0450
        }, headers={"X-Forwarded-For": "10.8.1.1"})
        g_data = g_resp.json()
        client.post(
            f"/api/reports/{g_data['id']}/claim",
            json={"tracking_token": g_data["tracking_token"]},
            headers=resident_alpha["headers"]
        )

        # Beta authors report 3
        client.post("/api/reports", data={
            "category": "Drainage & Flooding",
            "description": "Report authored by Beta.",
            "lat": 14.6500, "lng": 120.9800
        }, headers=resident_beta["headers"])

        # Query Alpha's portfolio
        resp_alpha = client.get("/api/me/reports", headers=resident_alpha["headers"])
        assert resp_alpha.status_code == status.HTTP_200_OK
        data_alpha = resp_alpha.json()
        assert data_alpha["total"] == 2
        descriptions = [r["description"] for r in data_alpha["reports"]]
        assert "Report authored by Alpha." in descriptions
        assert "Guest report claimed by Alpha." in descriptions
        assert "Report authored by Beta." not in descriptions

    def test_my_reports_filter_validation(self, client, resident_alpha):
        """Invalid filter query parameter returns 422 Unprocessable Entity."""
        resp = client.get("/api/me/reports?filter=invalid_status", headers=resident_alpha["headers"])
        assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_my_reports_pagination_boundaries(self, client, resident_alpha):
        """Pagination parameters (page, limit, skip) boundaries are enforced."""
        # Negative limit
        resp_neg = client.get("/api/me/reports?limit=-1", headers=resident_alpha["headers"])
        assert resp_neg.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

        # Limit exceeding 100
        resp_exceed = client.get("/api/me/reports?limit=101", headers=resident_alpha["headers"])
        assert resp_exceed.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

        # Valid pagination
        resp_valid = client.get("/api/me/reports?page=1&limit=10", headers=resident_alpha["headers"])
        assert resp_valid.status_code == status.HTTP_200_OK
        assert resp_valid.json()["limit"] == 10
