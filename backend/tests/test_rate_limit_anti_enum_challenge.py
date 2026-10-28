"""
========================================================================================
PULSO Milestone 2 Empirical Challenge Suite: Rate Limiting, Anti-Enumeration, & PII Redaction
========================================================================================
Adversarial test harness testing:
  1. Rate Limiting: burst saturation, 429 response structure, Retry-After header, multi-IP isolation,
     sliding window expiration/replenishment, thread-safe concurrent racing.
  2. Anti-Enumeration & Side-Channel Defense: uniform safe 404 for tracking lookup,
     statistical timing comparison (dummy hash execution), token normalization, brute-force simulation.
  3. Public Payload PII Scrubbing: redaction of phone, email, resident_id, internal AI reasoning,
     and private timeline notes from public endpoints and tracking payloads.
========================================================================================
"""

import sys
import os
import io
import time
import math
import statistics
import concurrent.futures
import pytest
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

# Ensure backend directory is in sys.path
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
from utils.rate_limiter import (
    SlidingWindowRateLimiter,
    report_submission_limiter,
    tracking_query_limiter,
    claim_limiter
)
from utils.security import (
    generate_tracking_token,
    normalize_tracking_token,
    hash_tracking_token,
    verify_tracking_token
)

# In-Memory SQLite Setup for Deterministic Isolated Testing
from database import engine as test_engine
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_challenge_db(clean_postgis):
    """Recreates database tables and resets rate limiters before every test."""
    # The disposable PostGIS schema is bootstrapped; clean_postgis resets rows.

    # Reset all rate limiter singletons
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

    # Seed District and Barangay
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
def resident_maria(client):
    """Seed verified resident Maria Santos (ID=101)."""
    db = TestingSessionLocal()
    pw_hash = auth.get_password_hash("SecretPassword123!")
    maria = models.Resident(
        id=101,
        full_name="Maria Santos",
        email="maria.santos@example.com",
        password_hash=pw_hash,
        is_verified=True,
        trust_score=100,
        kyc_level="Silver (Verified ID)",
        phone_number="09171234567",
        barangay_id=171,
        district_id=3
    )
    db.add(maria)
    db.commit()
    db.refresh(maria)
    db.close()

    token = auth.create_access_token(data={"sub": "maria.santos@example.com"})
    return {"user": maria, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture
def resident_pedro(client):
    """Seed verified resident Pedro Reyes (ID=102)."""
    db = TestingSessionLocal()
    pw_hash = auth.get_password_hash("SecretPassword123!")
    pedro = models.Resident(
        id=102,
        full_name="Pedro Reyes",
        email="pedro.reyes@example.com",
        password_hash=pw_hash,
        is_verified=True,
        trust_score=100,
        kyc_level="Bronze (Self-Signed)",
        phone_number="09187654321",
        barangay_id=1,
        district_id=1
    )
    db.add(pedro)
    db.commit()
    db.refresh(pedro)
    db.close()

    token = auth.create_access_token(data={"sub": "pedro.reyes@example.com"})
    return {"user": pedro, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


# ========================================================================================
# 1. EMPIRICAL CHALLENGE: RATE LIMITING & SLIDING WINDOW BEHAVIOR
# ========================================================================================

class TestRateLimiterEmpiricalChallenge:
    def test_submission_burst_and_retry_after_header(self, client):
        """
        Verify that 5 rapid requests are accepted (201), and the 6th is rejected with:
          - HTTP 429 Too Many Requests
          - Presence of 'Retry-After' header with an integer value in [1, 600]
          - Accurate error detail message
        """
        for i in range(5):
            res = client.post(
                "/api/reports",
                data={
                    "category": "Roads & Bridges",
                    "description": f"Rate limit test unique road defect report #{i}",
                    "lat": 14.7565 + (i * 0.001),
                    "lng": 121.0450 + (i * 0.001),
                },
                headers={"X-Forwarded-For": "203.0.113.10"}
            )
            assert res.status_code == 201, f"Request {i+1} failed unexpectedly with {res.status_code}"

        # 6th Burst Request -> Must be 429
        res_blocked = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "6th submission that breaches sliding window limit.",
                "lat": 14.7600,
                "lng": 121.0500,
            },
            headers={"X-Forwarded-For": "203.0.113.10"}
        )
        assert res_blocked.status_code == 429
        assert "Retry-After" in res_blocked.headers
        retry_after = int(res_blocked.headers["Retry-After"])
        assert 1 <= retry_after <= 600
        assert "Too many submissions" in res_blocked.json()["detail"]

    def test_tracking_rate_limiter_burst(self, client):
        """
        Verify tracking query limiter permits 20 queries/min, and the 21st triggers 429 + Retry-After.
        """
        for i in range(20):
            res = client.post(
                "/api/reports/track",
                json={"ticket_id": f"RPT-NONEXIST-{i:04d}", "tracking_token": "TRK-0000-0000-0000-0000"},
                headers={"X-Forwarded-For": "203.0.113.20"}
            )
            # Uniform 404 expected
            assert res.status_code == 404

        # 21st request triggers 429
        res_blocked = client.post(
            "/api/reports/track",
            json={"ticket_id": "RPT-NONEXIST-0099", "tracking_token": "TRK-0000-0000-0000-0000"},
            headers={"X-Forwarded-For": "203.0.113.20"}
        )
        assert res_blocked.status_code == 429
        assert "Retry-After" in res_blocked.headers
        retry_after = int(res_blocked.headers["Retry-After"])
        assert 1 <= retry_after <= 60
        assert "Too many tracking attempts" in res_blocked.json()["detail"]

    def test_claim_rate_limiter_burst(self, client, resident_maria):
        """
        Verify claim endpoint permits 10 claim requests/15min per IP, 11th triggers 429.
        """
        for i in range(10):
            res = client.post(
                f"/api/reports/{9990 + i}/claim",
                headers={**resident_maria["headers"], "X-Forwarded-For": "203.0.113.30"},
                json={"tracking_token": "TRK-0000-0000-0000-0000"}
            )
            assert res.status_code in [404, 403, 400]

        # 11th request triggers 429
        res_blocked = client.post(
            "/api/reports/9999/claim",
            headers={**resident_maria["headers"], "X-Forwarded-For": "203.0.113.30"},
            json={"tracking_token": "TRK-0000-0000-0000-0000"}
        )
        assert res_blocked.status_code == 429
        assert "Retry-After" in res_blocked.headers
        assert int(res_blocked.headers["Retry-After"]) >= 1
        assert "Too many claim attempts" in res_blocked.json()["detail"]

    def test_multi_ip_isolation_and_header_parsing(self, client):
        """
        Ensure distinct client IPs do not consume each other's quota:
          - Client 1 exhausts 5 submissions
          - Client 2 with different IP can still submit immediately
          - Multi-hop X-Forwarded-For parsing correctly extracts the leftmost client IP
        """
        # Client 1 uses IP 198.51.100.1
        for i in range(5):
            r = client.post(
                "/api/reports",
                data={
                    "category": "Roads & Bridges",
                    "description": f"Client 1 valid report description #{i}",
                    "lat": 14.7565 + (i * 0.001),
                    "lng": 121.0450 + (i * 0.001),
                },
                headers={"X-Forwarded-For": "198.51.100.1, 10.0.0.1"}
            )
            assert r.status_code == 201

        # Client 1 is now rate-limited
        r1_blocked = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Client 1 6th attempt description.",
                "lat": 14.7600,
                "lng": 121.0500,
            },
            headers={"X-Forwarded-For": "198.51.100.1, 10.0.0.1"}
        )
        assert r1_blocked.status_code == 429

        # Client 2 uses IP 198.51.100.2 -> Must NOT be blocked!
        r2_allowed = client.post(
            "/api/reports",
            data={
                "category": "Street Lighting",
                "description": "Client 2 independent submission description.",
                "lat": 14.7610,
                "lng": 121.0510,
            },
            headers={"X-Forwarded-For": "198.51.100.2"}
        )
        assert r2_allowed.status_code == 201, "Client 2 was improperly throttled by Client 1 traffic!"

        # Client 3 uses X-Real-IP
        r3_allowed = client.post(
            "/api/reports",
            data={
                "category": "Public Facilities",
                "description": "Client 3 using X-Real-IP header.",
                "lat": 14.7620,
                "lng": 121.0520,
            },
            headers={"X-Real-IP": "198.51.100.3"}
        )
        assert r3_allowed.status_code == 201

    def test_sliding_window_expiration_and_replenishment(self):
        """
        Directly challenge the SlidingWindowRateLimiter time-sliding replenishment algorithm.
        """
        limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=10, error_detail="Rate exceeded")
        
        class MockRequest:
            headers = {}
            client = None

        req = MockRequest()
        req.headers = {"X-Forwarded-For": "10.10.10.10"}

        # Consume 3 slots
        limiter.check(req)
        limiter.check(req)
        limiter.check(req)

        # 4th immediately raises 429
        with pytest.raises(Exception) as exc_info:
            limiter.check(req)
        assert exc_info.value.status_code == 429
        assert "Retry-After" in exc_info.value.headers

        # Manually age all timestamps in the deque by 20 seconds (well past the 10s window)
        timestamps = limiter.requests["10.10.10.10"]
        old_time = time.time() - 20
        for i in range(len(timestamps)):
            timestamps[i] = old_time + i

        # Now check() should purge all expired timestamps and record only the new request
        limiter.check(req)
        assert len(limiter.requests["10.10.10.10"]) == 1

    def test_concurrent_multithreaded_race_conditions(self):
        """
        Stress test rate limiter under 40 concurrent threads requesting simultaneously from same IP.
        Only exactly max_requests=5 must pass without race condition leaks.
        """
        limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=60, error_detail="Rate limit")
        
        class MockRequest:
            def __init__(self, ip):
                self.headers = {"X-Forwarded-For": ip}
                self.client = None

        target_ip = "192.168.1.100"
        results = {"success": 0, "blocked": 0}
        lock = concurrent.futures.thread.threading.Lock()

        def make_call():
            req = MockRequest(target_ip)
            try:
                limiter.check(req)
                with lock:
                    results["success"] += 1
            except Exception as e:
                if getattr(e, "status_code", None) == 429:
                    with lock:
                        results["blocked"] += 1

        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(make_call) for _ in range(40)]
            concurrent.futures.wait(futures)

        assert results["success"] == 5, f"Expected exactly 5 successes under race, got {results['success']}"
        assert results["blocked"] == 35, f"Expected 35 blocks under race, got {results['blocked']}"


# ========================================================================================
# 2. EMPIRICAL CHALLENGE: TRACKING TOKEN ANTI-ENUMERATION & TIMING CHANNELS
# ========================================================================================

class TestAntiEnumerationAndTimingChallenge:
    def test_uniform_404_on_all_invalid_tracking_permutations(self, client):
        """
        Challenge anti-enumeration by testing 7 different failure permutations:
          1. Non-existent ticket + Valid-looking token
          2. Existing ticket + Wrong token
          3. Existing ticket + Malformed token
          4. Non-existent ticket + Malformed token
          5. Existing ticket + Empty token
          6. SQL injection / XSS payloads in ticket_id and tracking_token
        Every permutation MUST return uniform HTTP 404 with exact message:
        'Report not found or invalid tracking credentials.'
        """
        # Create a real report to test against
        r_create = client.post(
            "/api/reports",
            data={
                "category": "Drainage & Flooding",
                "description": "Clogged drainage canal causing water accumulation.",
                "lat": 14.7565,
                "lng": 121.0450
            }
        )
        assert r_create.status_code == 201
        real_ticket_id = r_create.json()["ticket_id"]
        real_token = r_create.json()["tracking_token"]

        expected_detail = "Report not found or invalid tracking credentials."

        scenarios = [
            # 1. Non-existent ticket
            {"ticket_id": "RPT-20260902-DEADBEEF", "tracking_token": "TRK-9F83-A8B2-C4E6-10D7"},
            # 2. Real ticket + Wrong token
            {"ticket_id": real_ticket_id, "tracking_token": "TRK-0000-0000-0000-0000"},
            # 3. Real ticket + Malformed token string
            {"ticket_id": real_ticket_id, "tracking_token": "NOT_A_VALID_TOKEN"},
            # 4. Non-existent ticket + Empty code
            {"ticket_id": "RPT-20260902-VOID0000", "tracking_token": ""},
            # 5. SQL Injection in ticket_id
            {"ticket_id": "' UNION SELECT * FROM reports --", "tracking_token": real_token},
            # 6. SQL Injection in tracking_token
            {"ticket_id": real_ticket_id, "tracking_token": "' OR '1'='1"},
            # 7. XSS attempt
            {"ticket_id": f"<script>{real_ticket_id}</script>", "tracking_token": real_token}
        ]

        for idx, payload in enumerate(scenarios):
            # Reset rate limiter before each probe to isolate anti-enumeration behavior
            tracking_query_limiter.reset()
            res = client.post("/api/reports/track", json=payload)
            assert res.status_code == 404, f"Scenario {idx+1} returned status {res.status_code} instead of 404!"
            assert res.json().get("detail") == expected_detail, (
                f"Scenario {idx+1} leaked error detail: {res.json().get('detail')}"
            )

    def test_token_normalization_resilience(self, client):
        """
        Verify that legitimate tracking requests are accepted regardless of capitalization,
        hyphenation, whitespace, or 'tracking_code' vs 'tracking_token' field names.
        """
        r_create = client.post(
            "/api/reports",
            data={
                "category": "Traffic & Transport",
                "description": "Traffic signal timing malfunction at junction.",
                "lat": 14.7565,
                "lng": 121.0450
            }
        )
        ticket_id = r_create.json()["ticket_id"]
        raw_token = r_create.json()["tracking_token"]  # e.g. TRK-XXXX-XXXX-XXXX-XXXX
        clean_hex = raw_token.replace("TRK-", "").replace("-", "")

        token_variants = [
            # Standard
            {"ticket_id": ticket_id, "tracking_token": raw_token},
            # Lowercase
            {"ticket_id": ticket_id, "tracking_token": raw_token.lower()},
            # Without hyphens
            {"ticket_id": ticket_id, "tracking_token": f"TRK{clean_hex}"},
            # Raw hex without prefix
            {"ticket_id": ticket_id, "tracking_token": clean_hex.lower()},
            # With surrounding whitespace
            {"ticket_id": ticket_id, "tracking_token": f"   {raw_token}  "},
            # Using tracking_code field instead of tracking_token
            {"ticket_id": ticket_id, "tracking_code": raw_token},
        ]

        for idx, body in enumerate(token_variants):
            tracking_query_limiter.reset()
            res = client.post("/api/reports/track", json=body)
            assert res.status_code == 200, f"Token normalization variant {idx+1} failed: {body}"
            assert res.json()["ticket_id"] == ticket_id

    def test_timing_channel_dummy_hash_execution(self, client):
        """
        Empirically measure response latency across:
          Group A: Non-Existent Ticket ID (triggers dummy HMAC verification)
          Group B: Existing Ticket ID with Invalid Token (triggers real HMAC verification)
        Verify that dummy HMAC calculation prevents severe timing side-channels.
        """
        r_create = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Baseline road damage report for timing comparison.",
                "lat": 14.7565,
                "lng": 121.0450
            }
        )
        ticket_id = r_create.json()["ticket_id"]
        dummy_token = "TRK-AAAA-BBBB-CCCC-DDDD"

        latencies_nonexistent = []
        latencies_existing_bad_token = []

        # Warm up
        tracking_query_limiter.reset()
        client.post("/api/reports/track", json={"ticket_id": "RPT-WARMUP-0001", "tracking_token": dummy_token})

        iterations = 30

        # Measure Group A (Nonexistent)
        for i in range(iterations):
            tracking_query_limiter.reset()
            t0 = time.perf_counter()
            res = client.post(
                "/api/reports/track",
                json={"ticket_id": f"RPT-NONEXIST-{i:04d}", "tracking_token": dummy_token}
            )
            t1 = time.perf_counter()
            assert res.status_code == 404
            latencies_nonexistent.append((t1 - t0) * 1000.0) # in ms

        # Measure Group B (Existing + Bad Token)
        for i in range(iterations):
            tracking_query_limiter.reset()
            t0 = time.perf_counter()
            res = client.post(
                "/api/reports/track",
                json={"ticket_id": ticket_id, "tracking_token": f"TRK-FAIL-{i:04d}-0000"}
            )
            t1 = time.perf_counter()
            assert res.status_code == 404
            latencies_existing_bad_token.append((t1 - t0) * 1000.0)

        mean_a = statistics.mean(latencies_nonexistent)
        mean_b = statistics.mean(latencies_existing_bad_token)
        diff_ms = abs(mean_a - mean_b)

        # Both groups should be well within typical in-process variance (< 15ms delta)
        assert diff_ms < 15.0, (
            f"Possible timing leak detected! Nonexistent mean: {mean_a:.2f}ms, "
            f"Existing+BadToken mean: {mean_b:.2f}ms, Diff: {diff_ms:.2f}ms"
        )


# ========================================================================================
# 3. EMPIRICAL CHALLENGE: PUBLIC PAYLOAD PII SCRUBBING & DATA REDACTION
# ========================================================================================

class TestPublicPayloadPIIRedaction:
    def test_tracking_endpoint_strict_pii_redaction(self, client):
        """
        Verify that POST /api/reports/track returns ONLY public projections and completely
        strips citizen PII, internal AI triage reasoning, and database secret hashes.
        """
        # Create guest report with full sensitive metadata
        r_create = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Massive pothole near gate causing vehicle damage.",
                "lat": 14.7565,
                "lng": 121.0450,
                "location_string": "Congressional Rd, Bagumbong",
                "location_barangay": "Barangay 171",
                "contact_email": "citizen.confidential@example.com",
                "contact_phone": "0917-999-8877",
                "submission_source": "web_guest"
            }
        )
        assert r_create.status_code == 201
        ticket_id = r_create.json()["ticket_id"]
        token = r_create.json()["tracking_token"]

        # Track via public tracking endpoint
        tracking_query_limiter.reset()
        res = client.post(
            "/api/reports/track",
            json={"ticket_id": ticket_id, "tracking_token": token}
        )
        assert res.status_code == 200
        data = res.json()

        # 1. Citizen PII must NOT appear in raw json keys or values
        raw_json_str = res.text
        assert "citizen.confidential@example.com" not in raw_json_str
        assert "0917-999-8877" not in raw_json_str
        assert "09179998877" not in raw_json_str

        # 2. Sensitive database / internal operational fields must be absent
        forbidden_fields = [
            "resident_id",
            "contact_email",
            "contact_phone",
            "tracking_token_hash",
            "ai_reasoning",
            "ai_metadata",
            "budget",
            "claimed_by_user_id"
        ]
        for field in forbidden_fields:
            assert field not in data or data[field] is None, f"Leaked sensitive field '{field}' in tracking payload!"

        # 3. Public fields must be properly populated
        assert data["ticket_id"] == ticket_id
        assert data["category"] == "Roads & Bridges"
        assert data["status"] == "pending"
        assert data["public_status_label"] == "Pending"
        assert data["location_barangay"] == "Barangay 171"
        assert "location_summary" in data

    def test_timeline_internal_notes_redacted(self, client):
        """
        Verify that internal staff notes and unapproved timeline stages (is_public=False)
        are never included in the public tracking timeline.
        """
        # Create report
        r_create = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Road surface cracking.",
                "lat": 14.7565,
                "lng": 121.0450
            }
        )
        report_id = r_create.json()["id"]
        ticket_id = r_create.json()["ticket_id"]
        token = r_create.json()["tracking_token"]

        # Add 1 Public timeline event and 1 Internal Confidential event directly in DB
        db = TestingSessionLocal()
        public_event = gov_models.ProcessTimeline(
            report_id=report_id,
            status="under_review",
            note="Case forwarded to District 3 Engineering Team.",
            is_public=True
        )
        secret_internal_event = gov_models.ProcessTimeline(
            report_id=report_id,
            status="internal_audit",
            note="CONFIDENTIAL: Estimated repair cost is PHP 150,000. Priority contractor assigned.",
            is_public=False
        )
        db.add_all([public_event, secret_internal_event])
        db.commit()
        db.close()

        # Query public tracking
        tracking_query_limiter.reset()
        res = client.post(
            "/api/reports/track",
            json={"ticket_id": ticket_id, "tracking_token": token}
        )
        assert res.status_code == 200
        data = res.json()
        timeline = data["public_timeline"]

        notes = [item["note"] for item in timeline if item.get("note")]
        assert any("District 3 Engineering Team" in n for n in notes), "Public note was missing!"
        assert not any("CONFIDENTIAL" in n for n in notes), "Internal private timeline note leaked to public!"
        assert not any("PHP 150,000" in n for n in notes), "Budget detail leaked in public timeline!"

    def test_public_reports_feed_anonymization(self, client, resident_maria):
        """
        Every viewer gets the same verified incident projection.
        Pending reports and reporter identity and contacts stay private.
        """
        db = TestingSessionLocal()
        r_validated = models.Report(
            ticket_id="RPT-20260902-VAL0001",
            category="Roads & Bridges",
            description="Pothole beside Maria Santos at 09171234567.",
            status="pending_approval",
            reporter_name="Maria Santos",
            location_lat=14.7565,
            location_lng=121.0450,
            location_string="Blk 4 Lot 16, private home address",
            location_barangay="Barangay 171 (Brgy. 171)",
            image_url="/api/uploads/reports/report_abcdef0123456789.jpg",
            resident_id=101,
            contact_email="maria.santos@example.com",
            contact_phone="09171234567",
        )
        r_pending = models.Report(
            ticket_id="RPT-20260902-PEND0001",
            category="Street Lighting",
            description="Unverified pending report.",
            status="pending",
            reporter_name="Secret Citizen",
            location_lat=14.7565,
            location_lng=121.0450
        )
        r_legacy = models.Report(
            ticket_id="RPT-20260902-LEGACY1", category="Roads",
            description="Old private report narrative", status="validated",
            location_lat=14.7565, location_lng=121.0450,
            location_string="Old full incident address", location_barangay="Barangay 171",
            image_url="/api/uploads/reports/report_abcdef0123456789.jpg",
        )
        db.add_all([r_validated, r_pending, r_legacy])
        db.flush()
        db.commit()
        db.close()

        res = client.get("/api/reports/public")
        assert res.status_code == 200
        items = res.json()
        
        ticket_ids = [item["ticket_id"] for item in items]
        assert "RPT-20260902-VAL0001" in ticket_ids
        assert "RPT-20260902-PEND0001" not in ticket_ids, "Pending unvalidated report leaked to public feed!"
        legacy_item = next(i for i in items if i["ticket_id"] == "RPT-20260902-LEGACY1")
        assert legacy_item["public_details_approved"] is True
        assert legacy_item["location_lat"] == 14.7565
        assert legacy_item["location_string"] == "Old full incident address"
        assert legacy_item["description"] == "Old private report narrative"
        assert legacy_item["image_url"].startswith("/api/thumbnails?src=")

        val_item = next(i for i in items if i["ticket_id"] == "RPT-20260902-VAL0001")
        assert set(val_item) == {"id", "ticket_id", "category", "title", "status", "location_lat", "location_lng", "location_string", "barangay", "description", "image_url", "accuracy_m", "public_details_approved", "created_at", "updated_at"}
        assert val_item["status"] == "pending_approval"
        assert val_item["location_string"] == "Blk 4 Lot 16, private home address"
        assert val_item["location_lat"] == 14.7565
        assert val_item["location_lng"] == 121.045
        assert val_item["image_url"].startswith("/api/thumbnails?src=")
        assert client.get("/api/reports/public", headers=resident_maria["headers"]).json() == items
        assert "Maria Santos" not in res.text
        assert "09171234567" not in res.text
        assert "private home address" in res.text
        assert '"/api/uploads/reports/report_abcdef0123456789.jpg"' not in res.text
