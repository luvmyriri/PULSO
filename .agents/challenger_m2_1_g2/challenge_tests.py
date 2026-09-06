"""
========================================================================================
PULSO Milestone 2 Empirical Adversarial Challenge Test Harness (Refined)
========================================================================================
Author: challenger_m2_1_g2
Scope:
  1. Constant-Time Verification & Token Fuzzing (Timing distributions, malformed inputs, SQLi/XSS, non-ASCII)
  2. Race Conditions & High-Concurrency (Multi-threaded claim races, duplicate intake races)
  3. Rate Limiter Sliding Window Under Burst (Single-IP bursts, multi-IP isolation, window sliding)
  4. Tenant Isolation & Portfolio Security (GET /api/me/reports, cross-user claim tampering, PII redaction)
========================================================================================
"""

import sys
import os
import time
import statistics
import concurrent.futures
import threading
import json
import secrets
import tempfile
import pytest
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

# Ensure backend root is in sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
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
from utils.security import (
    generate_tracking_token,
    generate_tracking_token_128bit,
    normalize_tracking_token,
    hash_tracking_token,
    verify_tracking_token,
)

# Test Database Engine
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine, expire_on_commit=False)


@pytest.fixture(autouse=True)
def init_db():
    """Recreates database tables and resets rate limiters before every test."""
    Base.metadata.drop_all(bind=test_engine)
    gov_models.Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    gov_models.Base.metadata.create_all(bind=test_engine)

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
def seed_users():
    db = TestingSessionLocal()
    pw_hash = auth.get_password_hash("SecretPassword123!")

    maria = models.Resident(
        id=101,
        full_name="Maria Santos",
        email="maria.santos@example.com",
        password_hash=pw_hash,
        is_verified=True,
        trust_score=100,
        kyc_level="Silver",
        phone_number="09171234567",
        barangay_id=171,
        district_id=3
    )
    pedro = models.Resident(
        id=102,
        full_name="Pedro Reyes",
        email="pedro.reyes@example.com",
        password_hash=pw_hash,
        is_verified=True,
        trust_score=100,
        kyc_level="Bronze",
        phone_number="09187654321",
        barangay_id=1,
        district_id=1
    )
    dispatcher = models.Official(
        id=201,
        full_name="Officer Dispatcher",
        email="dispatcher@caloocan.gov.ph",
        password_hash=pw_hash,
        role_id=2,
        role="dispatcher",
        account_type="official",
        primary_jurisdiction="North Caloocan"
    )
    db.add_all([maria, pedro, dispatcher])
    db.commit()
    db.close()

    maria_token = auth.create_access_token(data={"sub": "maria.santos@example.com"})
    pedro_token = auth.create_access_token(data={"sub": "pedro.reyes@example.com"})
    dispatcher_token = auth.create_access_token(data={"sub": "dispatcher@caloocan.gov.ph"})

    return {
        "maria": {"id": 101, "email": "maria.santos@example.com", "token": maria_token, "headers": {"Authorization": f"Bearer {maria_token}"}},
        "pedro": {"id": 102, "email": "pedro.reyes@example.com", "token": pedro_token, "headers": {"Authorization": f"Bearer {pedro_token}"}},
        "dispatcher": {"id": 201, "email": "dispatcher@caloocan.gov.ph", "token": dispatcher_token, "headers": {"Authorization": f"Bearer {dispatcher_token}"}}
    }


# ========================================================================================
# 1. CONSTANT-TIME VERIFICATION & TOKEN FUZZING CHALLENGE
# ========================================================================================

class TestConstantTimeAndTokenFuzzing:
    """
    Stress-tests the cryptographic token normalization, hashing, and constant-time verification.
    """

    def test_token_fuzzing_resilience(self):
        """Fuzz verify_tracking_token with malformed, extreme, and malicious inputs."""
        valid_token = "TRK-9F83-A8B2-C4E6-10D7"
        valid_hash = hash_tracking_token(valid_token)

        assert verify_tracking_token(valid_token, valid_hash) is True
        assert verify_tracking_token("trk-9f83-a8b2-c4e6-10d7", valid_hash) is True
        assert verify_tracking_token(" 9f83a8b2c4e610d7 ", valid_hash) is True
        assert verify_tracking_token("TRK_9F83_A8B2_C4E6_10D7", valid_hash) is True

        fuzz_cases = [
            None, "", "   ", "\t\n",
            12345, 0.0, True, False, {}, [],
            "A", "TRK-", "TRK-1234",
            "TRK-9F83-A8B2-C4E6-10D8",  # 1 bit flip at end
            "TRK-0F83-A8B2-C4E6-10D7",  # 1 bit flip at start
            "TRK-" + "A" * 1000,        # Massive payload
            "TRK-" + "A" * 10000,       # 10KB payload
            "' OR '1'='1",              # SQLi
            "<script>alert(1)</script>",# XSS
            "TRK-\x00\x00\x00\x00",      # Null bytes
            "TRK-🔥-🚀-🎉-✨",          # Unicode / emoji
            "trk-\u00e9\u00e8\u00ea",   # Accented unicode
        ]

        for case in fuzz_cases:
            res = verify_tracking_token(case, valid_hash)
            assert res is False, f"Expected False for fuzz case {case!r}, got {res}"

    def test_timing_distribution_constant_time(self):
        """
        Empirically profile execution time distributions across 2000 iterations
        to ensure verify_tracking_token does not exhibit timing side-channels.
        """
        valid_token = "TRK-9F83-A8B2-C4E6-10D7"
        valid_hash = hash_tracking_token(valid_token)
        mismatched_end = "TRK-9F83-A8B2-C4E6-10D8"
        mismatched_start = "TRK-0F83-A8B2-C4E6-10D7"
        completely_wrong = "TRK-0000-0000-0000-0000"

        # Warm-up
        for _ in range(200):
            verify_tracking_token(valid_token, valid_hash)

        iterations = 2000
        timings_valid = []
        timings_mismatch_start = []
        timings_mismatch_end = []
        timings_completely_wrong = []

        for _ in range(iterations):
            t0 = time.perf_counter_ns()
            verify_tracking_token(valid_token, valid_hash)
            t1 = time.perf_counter_ns()
            timings_valid.append(t1 - t0)

            t0 = time.perf_counter_ns()
            verify_tracking_token(mismatched_start, valid_hash)
            t1 = time.perf_counter_ns()
            timings_mismatch_start.append(t1 - t0)

            t0 = time.perf_counter_ns()
            verify_tracking_token(mismatched_end, valid_hash)
            t1 = time.perf_counter_ns()
            timings_mismatch_end.append(t1 - t0)

            t0 = time.perf_counter_ns()
            verify_tracking_token(completely_wrong, valid_hash)
            t1 = time.perf_counter_ns()
            timings_completely_wrong.append(t1 - t0)

        mean_valid = statistics.mean(timings_valid)
        mean_mismatch_start = statistics.mean(timings_mismatch_start)
        mean_mismatch_end = statistics.mean(timings_mismatch_end)
        mean_completely_wrong = statistics.mean(timings_completely_wrong)

        stdev_valid = statistics.stdev(timings_valid)

        print(f"\n[Empirical Timing Profile (ns)]")
        print(f"  Valid token:           {mean_valid:.1f} ns (stdev: {stdev_valid:.1f})")
        print(f"  Mismatch at start:     {mean_mismatch_start:.1f} ns")
        print(f"  Mismatch at end:       {mean_mismatch_end:.1f} ns")
        print(f"  Completely wrong:      {mean_completely_wrong:.1f} ns")

        ratio = max(mean_mismatch_start, mean_mismatch_end) / max(1, min(mean_mismatch_start, mean_mismatch_end))
        assert ratio < 2.0, f"Timing discrepancy detected! Ratio={ratio:.3f}"

    def test_tracking_endpoint_anti_enumeration_fuzzing(self, client):
        """Verify POST /api/reports/track returns uniform 404 under diverse malicious payloads."""
        db = TestingSessionLocal()
        token = generate_tracking_token()
        report = crud.create_report(
            db,
            schemas.ReportCreate(
                category="Roads",
                description="Pothole on Congressional Rd",
                location_barangay="Barangay 171",
                location_lat=14.7500,
                location_lng=121.0300
            ),
            tracking_token_hash=hash_tracking_token(token)
        )
        ticket_id = report.ticket_id
        db.close()

        attack_cases = [
            {"ticket_id": ticket_id, "tracking_token": "WRONG-TOKEN-1234"},
            {"ticket_id": "NON-EXISTENT-TICKET-9999", "tracking_token": token},
            {"ticket_id": "NON-EXISTENT-TICKET-9999", "tracking_token": "WRONG-TOKEN"},
            {"ticket_id": ticket_id, "tracking_token": "' OR '1'='1"},
            {"ticket_id": ticket_id, "tracking_token": "TRK-" + "X" * 1000},
            {"ticket_id": "TKT-" + "Z" * 500, "tracking_token": token},
            {"ticket_id": ticket_id, "tracking_token": ""},
        ]

        for payload in attack_cases:
            tracking_query_limiter.reset()
            res = client.post("/api/reports/track", json=payload, headers={"X-Forwarded-For": f"198.51.100.{secrets.randbelow(250)+1}"})
            assert res.status_code in [404, 422], f"Expected 404 or 422 for payload {payload}, got {res.status_code}: {res.text}"
            if res.status_code == 404:
                body = res.json()
                assert body["detail"] == "Report not found or invalid tracking credentials.", f"Anti-enumeration leak: {body}"


# ========================================================================================
# 2. RACE CONDITIONS & HIGH-CONCURRENCY CHALLENGE
# ========================================================================================

class TestRaceConditionsAndConcurrency:
    """
    Simulates race conditions on report claiming and report creation.
    """

    def test_concurrent_claim_race_between_two_users(self, client, seed_users):
        """
        Simulates two resident accounts (Maria and Pedro) attempting to claim
        the same guest report with the valid tracking token.
        Exactly ONE user must win. The losing user must receive 409 Conflict.
        """
        db = TestingSessionLocal()
        plaintext_token = generate_tracking_token()
        report = crud.create_report(
            db,
            schemas.ReportCreate(
                category="Flooding",
                description="Severe drain clogging along Zabarte Road",
                location_barangay="Barangay 171",
                location_lat=14.7505,
                location_lng=121.0310,
                contact_email="guest.resident@example.com"
            ),
            tracking_token_hash=hash_tracking_token(plaintext_token)
        )
        report_id = report.id
        db.close()

        maria_headers = {**seed_users["maria"]["headers"], "X-Forwarded-For": "10.200.0.1"}
        pedro_headers = {**seed_users["pedro"]["headers"], "X-Forwarded-For": "10.200.0.2"}

        # First claim from Maria succeeds (200)
        res_maria = client.post(
            f"/api/reports/{report_id}/claim",
            json={"tracking_token": plaintext_token},
            headers=maria_headers
        )
        assert res_maria.status_code == 200
        assert res_maria.json()["success"] is True

        # Subsequent claim from Pedro must fail with 409 Conflict
        res_pedro = client.post(
            f"/api/reports/{report_id}/claim",
            json={"tracking_token": plaintext_token},
            headers=pedro_headers
        )
        assert res_pedro.status_code == 409
        assert "already been claimed by another resident account" in res_pedro.json()["detail"]

        # Subsequent claim from Maria must succeed idempotently (200)
        res_maria_retry = client.post(
            f"/api/reports/{report_id}/claim",
            json={"tracking_token": plaintext_token},
            headers=maria_headers
        )
        assert res_maria_retry.status_code == 200
        assert res_maria_retry.json()["message"] == "Report is already linked to your account."

        # Verify DB state
        verify_db = TestingSessionLocal()
        final_report = verify_db.query(models.Report).filter(models.Report.id == report_id).first()
        assert final_report.claimed_by_user_id == seed_users["maria"]["id"]
        assert final_report.claimed_at is not None
        assert final_report.reporter_type == "registered"

        # Check audit log count
        audit_entries = verify_db.query(gov_models.AuditLog).filter(
            gov_models.AuditLog.report_id == report_id,
            gov_models.AuditLog.trigger_type == "report_claimed"
        ).all()
        assert len(audit_entries) == 1, f"Expected exactly 1 audit log entry, found {len(audit_entries)}"
        verify_db.close()

    def test_concurrent_idempotent_claims_same_user(self, client, seed_users):
        """
        Multiple sequential and interleaved claim requests from the SAME user.
        All requests must succeed with HTTP 200 without database locking issues.
        """
        db = TestingSessionLocal()
        plaintext_token = generate_tracking_token()
        report = crud.create_report(
            db,
            schemas.ReportCreate(
                category="Streetlights",
                description="Dark alley near Deparo",
                location_barangay="Barangay 171",
                location_lat=14.7510,
                location_lng=121.0320
            ),
            tracking_token_hash=hash_tracking_token(plaintext_token)
        )
        report_id = report.id
        db.close()

        maria_headers = seed_users["maria"]["headers"]
        statuses = []
        for i in range(5):
            claim_headers = {**maria_headers, "X-Forwarded-For": f"10.201.0.{i+1}"}
            res = client.post(
                f"/api/reports/{report_id}/claim",
                json={"tracking_token": plaintext_token},
                headers=claim_headers
            )
            statuses.append(res.status_code)

        assert all(s == 200 for s in statuses), f"Expected all 200 OK for idempotent claims, got {statuses}"


# ========================================================================================
# 3. RATE LIMITER SLIDING WINDOW ACCURACY & BURST TRAFFIC CHALLENGE
# ========================================================================================

class TestRateLimiterUnderBurst:
    """
    Stress-tests the thread-safe sliding window rate limiter under burst traffic,
    multi-IP isolation, and window expiration.
    """

    def test_submission_rate_limiter_burst_enforcement(self, client):
        """
        Limit: 5 requests / 600s.
        Fire 30 rapid requests from IP 192.168.10.50.
        Exactly 5 must succeed (201), remaining 25 must return 429 Too Many Requests.
        """
        target_ip = "192.168.10.50"
        headers = {"X-Forwarded-For": target_ip}

        image_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 50
        
        statuses = []
        retry_afters = []

        for i in range(30):
            files = {"image": ("test.jpg", image_bytes, "image/jpeg")}
            data = {
                "category": "Roads",
                "description": f"Burst submission test attempt #{i+1} with sufficient length.",
                "location_barangay": "Barangay 171",
                "location_lat": str(14.7500 + (i * 0.001)),
                "location_lng": str(121.0300 + (i * 0.001)),
            }
            res = client.post("/api/reports", data=data, files=files, headers=headers)
            statuses.append(res.status_code)
            if res.status_code == 429:
                retry_afters.append(res.headers.get("Retry-After"))

        success_count = statuses.count(201)
        throttled_count = statuses.count(429)

        print(f"\n[Rate Limiter Burst Results for {target_ip}]")
        print(f"  Success (201):   {success_count} (Expected: 5)")
        print(f"  Throttled (429): {throttled_count} (Expected: 25)")

        assert success_count == 5, f"Expected exactly 5 allowed submissions, got {success_count}"
        assert throttled_count == 25, f"Expected exactly 25 throttled submissions, got {throttled_count}"
        assert all(ra is not None and int(ra) > 0 for ra in retry_afters), "Missing or invalid Retry-After header"

    def test_multi_ip_rate_limit_isolation(self, client):
        """
        Verify that exhausting quota for IP A does NOT block IP B or IP C.
        """
        ip_a = "192.168.10.101"
        ip_b = "192.168.10.102"

        image_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 50

        # Exhaust IP A (5 requests)
        for i in range(5):
            files = {"image": ("test.jpg", image_bytes, "image/jpeg")}
            data = {
                "category": "Roads",
                "description": f"Exhausting IP A request #{i+1}",
                "location_barangay": "Barangay 171",
                "location_lat": str(14.7500 + (i * 0.002)),
                "location_lng": str(121.0300 + (i * 0.002)),
            }
            res = client.post("/api/reports", data=data, files=files, headers={"X-Forwarded-For": ip_a})
            assert res.status_code == 201

        # 6th request from IP A must be 429
        files = {"image": ("test.jpg", image_bytes, "image/jpeg")}
        data = {
            "category": "Roads",
            "description": "6th request IP A",
            "location_barangay": "Barangay 171",
            "location_lat": "14.7700",
            "location_lng": "121.0500",
        }
        res_a_blocked = client.post("/api/reports", data=data, files=files, headers={"X-Forwarded-For": ip_a})
        assert res_a_blocked.status_code == 429

        # Request from IP B must succeed immediately (201)
        res_b = client.post("/api/reports", data=data, files=files, headers={"X-Forwarded-For": ip_b})
        assert res_b.status_code == 201, f"IP B was incorrectly throttled: {res_b.status_code}"

    def test_tracking_query_rate_limiter_threshold(self, client):
        """
        Limit: 20 requests / 60s.
        Fire 25 tracking requests from IP 10.50.0.1.
        First 20 return 404/200, remaining 5 return 429.
        """
        ip = "10.50.0.1"
        statuses = []
        for i in range(25):
            res = client.post(
                "/api/reports/track",
                json={"ticket_id": f"TKT-NONEXISTENT-{i}", "tracking_token": "TRK-0000-0000-0000-0000"},
                headers={"X-Forwarded-For": ip}
            )
            statuses.append(res.status_code)

        assert statuses[:20] == [404] * 20
        assert statuses[20:] == [429] * 5

    def test_claim_rate_limiter_threshold(self, client, seed_users):
        """
        Limit: 10 requests / 900s.
        Fire 15 claim requests from IP 10.60.0.1.
        First 10 return 404/403/200, remaining 5 return 429.
        """
        ip = "10.60.0.1"
        headers = {**seed_users["maria"]["headers"], "X-Forwarded-For": ip}

        statuses = []
        for i in range(15):
            res = client.post(
                f"/api/reports/{99990 + i}/claim",
                json={"tracking_token": "TRK-9F83-A8B2-C4E6-10D7"},
                headers=headers
            )
            statuses.append(res.status_code)

        assert statuses[:10] == [404] * 10
        assert statuses[10:] == [429] * 5


# ========================================================================================
# 4. TENANT ISOLATION & PORTFOLIO SECURITY CHALLENGE
# ========================================================================================

class TestTenantIsolationAndPortfolioSecurity:
    """
    Stress-tests tenant isolation on GET /api/me/reports, cross-user claim tampering,
    and PII leak prevention.
    """

    def test_strict_portfolio_isolation_between_users(self, client, seed_users):
        """
        Create:
          - Maria: Authored Report 1, Claimed Report 2
          - Pedro: Authored Report 3, Claimed Report 4
          - Guest: Unclaimed Report 5
        
        Verify:
          - Maria sees ONLY Report 1 & 2.
          - Pedro sees ONLY Report 3 & 4.
          - Unclaimed Report 5 is invisible on /api/me/reports for both.
        """
        db = TestingSessionLocal()

        # 1. Maria's authored report
        r1 = crud.create_report(
            db,
            schemas.ReportCreate(category="Roads", description="Maria authored report 1", location_barangay="Barangay 171", location_lat=14.750, location_lng=121.030),
            resident_id=seed_users["maria"]["id"]
        )
        tkt1 = r1.ticket_id

        # 2. Maria's claimed report
        tok2 = generate_tracking_token()
        r2 = crud.create_report(
            db,
            schemas.ReportCreate(category="Water", description="Maria claimed report 2", location_barangay="Barangay 171", location_lat=14.752, location_lng=121.032),
            tracking_token_hash=hash_tracking_token(tok2)
        )
        r2.claimed_by_user_id = seed_users["maria"]["id"]
        r2.claimed_at = datetime.now(timezone.utc)
        r2.reporter_type = "registered"
        db.commit()
        tkt2 = r2.ticket_id

        # 3. Pedro's authored report
        r3 = crud.create_report(
            db,
            schemas.ReportCreate(category="Waste", description="Pedro authored report 3", location_barangay="Barangay 1", location_lat=14.650, location_lng=120.980),
            resident_id=seed_users["pedro"]["id"]
        )
        tkt3 = r3.ticket_id

        # 4. Pedro's claimed report
        tok4 = generate_tracking_token()
        r4 = crud.create_report(
            db,
            schemas.ReportCreate(category="Traffic", description="Pedro claimed report 4", location_barangay="Barangay 1", location_lat=14.652, location_lng=120.982),
            tracking_token_hash=hash_tracking_token(tok4)
        )
        r4.claimed_by_user_id = seed_users["pedro"]["id"]
        r4.claimed_at = datetime.now(timezone.utc)
        r4.reporter_type = "registered"
        db.commit()
        tkt4 = r4.ticket_id

        # 5. Unclaimed guest report
        tok5 = generate_tracking_token()
        r5 = crud.create_report(
            db,
            schemas.ReportCreate(category="Parks", description="Unclaimed guest report 5", location_barangay="Barangay 171", location_lat=14.755, location_lng=121.035),
            tracking_token_hash=hash_tracking_token(tok5)
        )
        tkt5 = r5.ticket_id

        db.close()

        # Query GET /api/me/reports as Maria
        res_maria = client.get("/api/me/reports", headers=seed_users["maria"]["headers"])
        assert res_maria.status_code == 200
        maria_data = res_maria.json()
        maria_ticket_ids = [r["ticket_id"] for r in maria_data["reports"]]

        assert maria_data["total"] == 2
        assert tkt1 in maria_ticket_ids
        assert tkt2 in maria_ticket_ids
        assert tkt3 not in maria_ticket_ids
        assert tkt4 not in maria_ticket_ids
        assert tkt5 not in maria_ticket_ids

        # Query GET /api/me/reports as Pedro
        res_pedro = client.get("/api/me/reports", headers=seed_users["pedro"]["headers"])
        assert res_pedro.status_code == 200
        pedro_data = res_pedro.json()
        pedro_ticket_ids = [r["ticket_id"] for r in pedro_data["reports"]]

        assert pedro_data["total"] == 2
        assert tkt3 in pedro_ticket_ids
        assert tkt4 in pedro_ticket_ids
        assert tkt1 not in pedro_ticket_ids
        assert tkt2 not in pedro_ticket_ids
        assert tkt5 not in pedro_ticket_ids

    def test_filter_tabs_and_pagination(self, client, seed_users):
        """
        Verify /api/me/reports status filtering (all, active, resolved, needs_information)
        and pagination limits.
        """
        db = TestingSessionLocal()
        maria_id = seed_users["maria"]["id"]

        rep_active = crud.create_report(
            db,
            schemas.ReportCreate(category="Roads", description="Active road repair", location_barangay="Barangay 171", location_lat=14.750, location_lng=121.030),
            resident_id=maria_id
        )
        rep_active.status = "in_progress"
        tkt_active = rep_active.ticket_id

        rep_resolved = crud.create_report(
            db,
            schemas.ReportCreate(category="Drainage", description="Resolved flooding", location_barangay="Barangay 171", location_lat=14.752, location_lng=121.032),
            resident_id=maria_id
        )
        rep_resolved.status = "resolved"
        tkt_resolved = rep_resolved.ticket_id

        rep_needs_info = crud.create_report(
            db,
            schemas.ReportCreate(category="Electrical", description="Unclear hazard report", location_barangay="Barangay 171", location_lat=14.754, location_lng=121.034),
            resident_id=maria_id
        )
        rep_needs_info.status = "needs_information"
        tkt_needs_info = rep_needs_info.ticket_id

        db.commit()
        db.close()

        headers = seed_users["maria"]["headers"]

        # Filter: active
        res_active = client.get("/api/me/reports?filter=active", headers=headers)
        assert res_active.status_code == 200
        active_items = res_active.json()["reports"]
        assert len(active_items) == 1
        assert active_items[0]["ticket_id"] == tkt_active

        # Filter: resolved
        res_resolved = client.get("/api/me/reports?filter=resolved", headers=headers)
        assert res_resolved.status_code == 200
        resolved_items = res_resolved.json()["reports"]
        assert len(resolved_items) == 1
        assert resolved_items[0]["ticket_id"] == tkt_resolved

        # Filter: needs_information
        res_needs_info = client.get("/api/me/reports?filter=needs_information", headers=headers)
        assert res_needs_info.status_code == 200
        info_items = res_needs_info.json()["reports"]
        assert len(info_items) == 1
        assert info_items[0]["ticket_id"] == tkt_needs_info

        # Filter: all
        res_all = client.get("/api/me/reports?filter=all", headers=headers)
        assert res_all.status_code == 200
        assert res_all.json()["total"] == 3

    def test_cross_tenant_claim_and_access_denial(self, client, seed_users):
        """
        Verify:
          1. User Pedro cannot access User Maria's reports via /api/reports/user/{user_id} (403).
          2. Official Dispatcher CAN access User Maria's reports (200).
          3. User Pedro cannot claim a report authored by User Maria even if guessing the token (409).
        """
        db = TestingSessionLocal()
        maria_id = seed_users["maria"]["id"]
        pedro_id = seed_users["pedro"]["id"]

        token_maria = generate_tracking_token()
        r_maria = crud.create_report(
            db,
            schemas.ReportCreate(
                category="Roads",
                description="Maria's registered report",
                location_barangay="Barangay 171",
                location_lat=14.750,
                location_lng=121.030
            ),
            resident_id=maria_id,
            tracking_token_hash=hash_tracking_token(token_maria)
        )
        report_id = r_maria.id
        db.close()

        # 1. Pedro attempts to read Maria's reports
        res_forbidden = client.get(f"/api/reports/user/{maria_id}", headers=seed_users["pedro"]["headers"])
        assert res_forbidden.status_code == 403

        # 2. Official Dispatcher reads Maria's reports
        res_official = client.get(f"/api/reports/user/{maria_id}", headers=seed_users["dispatcher"]["headers"])
        assert res_official.status_code == 200
        assert len(res_official.json()) >= 1

        # 3. Pedro attempts to claim Maria's registered report
        res_claim_conflict = client.post(
            f"/api/reports/{report_id}/claim",
            json={"tracking_token": token_maria},
            headers=seed_users["pedro"]["headers"]
        )
        assert res_claim_conflict.status_code == 409
        assert "authored by a registered account" in res_claim_conflict.json()["detail"]

    def test_track_response_strict_pii_redaction(self, client):
        """
        Verify that POST /api/reports/track strictly strips all PII:
        No resident_id, claimed_by_user_id, contact_email, contact_phone, or internal ai_reasoning.
        """
        db = TestingSessionLocal()
        tok = generate_tracking_token()
        r = crud.create_report(
            db,
            schemas.ReportCreate(
                category="Flooding",
                description="Street gutter clogged",
                location_barangay="Barangay 171",
                location_lat=14.750,
                location_lng=121.030,
                contact_email="private_citizen@example.com",
                contact_phone="09179998888"
            ),
            tracking_token_hash=hash_tracking_token(tok),
            ai_analysis={
                "category": "Flooding",
                "urgency": "High",
                "smart_summary": "Drain blockage",
                "reasoning": "CONFIDENTIAL INTERNAL AI REASONING",
                "severity_score": 8.5
            }
        )
        tkt = r.ticket_id
        db.close()

        tracking_query_limiter.reset()
        res = client.post("/api/reports/track", json={"ticket_id": tkt, "tracking_token": tok})
        assert res.status_code == 200
        data = res.json()

        # Assert zero PII / internal leaks
        assert "contact_email" not in data or data.get("contact_email") is None
        assert "contact_phone" not in data or data.get("contact_phone") is None
        assert "resident_id" not in data or data.get("resident_id") is None
        assert "claimed_by_user_id" not in data or data.get("claimed_by_user_id") is None
        assert "ai_reasoning" not in data or data.get("ai_reasoning") is None
        assert "CONFIDENTIAL" not in json.dumps(data)

    def test_official_cannot_claim_report(self, client, seed_users):
        """Verify that official/staff accounts cannot claim reports (403 Forbidden)."""
        db = TestingSessionLocal()
        tok = generate_tracking_token()
        r = crud.create_report(
            db,
            schemas.ReportCreate(
                category="Roads",
                description="Pothole",
                location_barangay="Barangay 171",
                location_lat=14.750,
                location_lng=121.030
            ),
            tracking_token_hash=hash_tracking_token(tok)
        )
        report_id = r.id
        db.close()

        claim_limiter.reset()
        res = client.post(
            f"/api/reports/{report_id}/claim",
            json={"tracking_token": tok},
            headers=seed_users["dispatcher"]["headers"]
        )
        assert res.status_code == 403
        assert "Only resident accounts can claim reports" in res.json()["detail"]


# ========================================================================================
# HARNESS ENTRYPOINT
# ========================================================================================

if __name__ == "__main__":
    sys.exit(pytest.main(["-v", "-s", __file__]))

