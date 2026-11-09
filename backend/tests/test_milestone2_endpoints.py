"""
========================================================================================
PULSO Milestone 2 Test Suite: Endpoints, Routing, Security, & Rate Limiting
========================================================================================
Targets:
  - backend/main.py
  - backend/crud.py
  - backend/utils/rate_limiter.py
  - backend/utils/security.py
========================================================================================
"""

import sys
import os
import io
import json
import secrets
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


@pytest.fixture
def official_admin(client):
    """Seed official user."""
    db = TestingSessionLocal()
    pw_hash = auth.get_password_hash("AdminPassword123!")
    official = models.Official(
        id=201,
        full_name="Engineer Admin",
        email="admin.engineer@caloocan.gov.ph",
        password_hash=pw_hash,
        role="admin",
        account_type="staff",
        is_active=True
    )
    db.add(official)
    db.commit()
    db.refresh(official)
    db.close()

    token = auth.create_access_token(data={"sub": "admin.engineer@caloocan.gov.ph"})
    return {"user": official, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


# ========================================================================================
# 1. POST /api/reports (Dual Intake, Validation, File Security, Boundary, Deduplication)
# ========================================================================================

class TestReportIntake:
    def test_guest_submission_success(self, client):
        """Unauthenticated guest submission should succeed with 201 Created and return tracking token."""
        response = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Hazardous pothole causing vehicle damage near Congressional Rd.",
                "lat": 14.7565,
                "lng": 121.0450,
                "location_string": "Congressional Rd, Bagumbong",
                "location_barangay": "Barangay 171",
                "contact_email": "guest.resident@example.com",
                "contact_phone": "09171234567",
                "submission_source": "web_guest"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["reporter_type"] == "guest"
        assert data["resident_id"] is None
        assert data["category"] == "Roads & Bridges"
        assert data["status"] == "pending"
        assert data["tracking_token"] is not None
        assert data["tracking_token"].startswith("TRK-")
        assert f"id={data['ticket_id']}" in data["tracking_url"]
        assert f"code={data['tracking_token']}" in data["tracking_url"]

        # Verify DB persisted hashed token, never plaintext
        db = TestingSessionLocal()
        db_rep = db.query(models.Report).filter(models.Report.ticket_id == data["ticket_id"]).first()
        assert db_rep is not None
        assert db_rep.tracking_token_hash is not None
        assert db_rep.tracking_token_hash != data["tracking_token"]
        assert auth.verify_tracking_token(data["tracking_token"], db_rep.tracking_token_hash)
        db.close()

    def test_authenticated_submission_success(self, client, resident_maria):
        """Authenticated resident submission associates resident_id and sets reporter_type='registered'."""
        response = client.post(
            "/api/reports",
            headers=resident_maria["headers"],
            data={
                "category": "Water & Drainage",
                "description": "Clogged storm drain overflowing onto sidewalk during heavy rain.",
                "lat": 14.7565,
                "lng": 121.0450,
                "location_string": "Barangay 171, North Caloocan"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["reporter_type"] == "registered"
        assert data["resident_id"] == 101
        assert data["tracking_token"] is not None

    def test_description_length_validation(self, client):
        """Short description (<10 chars) and oversized description (>5000 chars) are rejected with 422."""
        # Short
        r_short = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Short",
                "lat": 14.7565,
                "lng": 121.0450
            }
        )
        assert r_short.status_code == 422

        # Oversized
        r_long = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Pothole " * 800, # > 5000 chars
                "lat": 14.7565,
                "lng": 121.0450
            }
        )
        assert r_long.status_code == 422

    def test_jurisdiction_boundary_check(self, client):
        """Coordinates outside Caloocan City jurisdiction return 400 Bad Request."""
        # Manila City coordinates (14.5995, 120.9842)
        response = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Pothole along Taft Avenue in Manila City.",
                "lat": 14.5995,
                "lng": 120.9842
            }
        )
        assert response.status_code == 400
        assert "outside the jurisdiction of Caloocan City" in response.json()["detail"]

    def test_duplicate_proximity_conflict(self, client):
        """Reports within 15 meters for the same category return 409 Conflict with X-Canonical-Ticket-ID."""
        # 1st report
        r1 = client.post(
            "/api/reports",
            data={
                "category": "Street Lighting",
                "description": "Broken lamppost on Congressional Road near corner.",
                "lat": 14.7565,
                "lng": 121.0450
            }
        )
        assert r1.status_code == 201
        ticket_id1 = r1.json()["ticket_id"]

        # 2nd report at exact same coordinates
        r2 = client.post(
            "/api/reports",
            data={
                "category": "Street Lighting",
                "description": "Dark streetlight not functioning at night near corner.",
                "lat": 14.7565,
                "lng": 121.0450
            }
        )
        assert r2.status_code == 409
        assert r2.headers.get("X-Canonical-Ticket-ID") == ticket_id1

    def test_file_upload_security_and_magic_bytes(self, client):
        """Valid JPEG/PNG/WebP uploads succeed; corrupt/disguised files and oversized files are rejected."""
        # 1. Valid JPEG
        valid_jpeg = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 100
        r_jpeg = client.post(
            "/api/reports",
            data={
                "category": "Public Facilities",
                "description": "Damaged playground equipment in barangay park.",
                "lat": 14.7565,
                "lng": 121.0450
            },
            files={"image": ("park.jpg", io.BytesIO(valid_jpeg), "image/jpeg")}
        )
        assert r_jpeg.status_code == 201
        assert r_jpeg.json()["image_url"] is not None

        # 2. Executable disguised as JPG (use different location to avoid spatial duplicate check)
        fake_jpg = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00" + b"\x00" * 50
        r_fake = client.post(
            "/api/reports",
            data={
                "category": "Public Facilities",
                "description": "Damaged playground equipment in barangay park.",
                "lat": 14.7580,
                "lng": 121.0470
            },
            files={"image": ("malware.jpg", io.BytesIO(fake_jpg), "image/jpeg")}
        )
        assert r_fake.status_code == 422
        assert "valid JPEG, PNG, or WebP" in r_fake.json()["detail"]

        # 3. 0-byte file
        r_zero = client.post(
            "/api/reports",
            data={
                "category": "Public Facilities",
                "description": "Damaged playground equipment in barangay park.",
                "lat": 14.7590,
                "lng": 121.0480
            },
            files={"image": ("empty.jpg", io.BytesIO(b""), "image/jpeg")}
        )
        assert r_zero.status_code == 422

        # 4. Oversized file (>10MB)
        oversized_data = b"\xFF\xD8\xFF" + b"\x00" * (10 * 1024 * 1024 + 1024)
        r_over = client.post(
            "/api/reports",
            data={
                "category": "Public Facilities",
                "description": "Damaged playground equipment in barangay park.",
                "lat": 14.7600,
                "lng": 121.0490
            },
            files={"image": ("large.jpg", io.BytesIO(oversized_data), "image/jpeg")}
        )
        assert r_over.status_code == 422
        assert "10MB ceiling" in r_over.json()["detail"]


# ========================================================================================
# 2. POST /api/reports/track (Public Tracking, Constant-Time Verification, Anti-Enum, Redaction)
# ========================================================================================

class TestReportTracking:
    def test_valid_tracking_returns_public_projection(self, client):
        """Tracking with valid ticket_id and token returns sanitized public payload."""
        # Create a report first
        r_create = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Sinkhole developing along Camarin Rd.",
                "lat": 14.7565,
                "lng": 121.0450,
                "location_string": "Camarin Rd, North Caloocan",
                "location_barangay": "Barangay 171",
                "contact_email": "private.resident@example.com",
                "contact_phone": "09171234567"
            }
        )
        assert r_create.status_code == 201
        ticket_id = r_create.json()["ticket_id"]
        token = r_create.json()["tracking_token"]

        # Track report
        r_track = client.post(
            "/api/reports/track",
            json={"ticket_id": ticket_id, "tracking_token": token}
        )
        assert r_track.status_code == 200
        data = r_track.json()
        assert data["ticket_id"] == ticket_id
        assert data["category"] == "Roads & Bridges"
        assert data["status"] == "pending"
        assert data["public_status_label"] == "Pending"
        assert len(data["public_timeline"]) >= 1

        # Assert strict PII and internal data redaction
        assert "contact_email" not in data or data.get("contact_email") is None
        assert "contact_phone" not in data or data.get("contact_phone") is None
        assert "resident_id" not in data or data.get("resident_id") is None
        assert "ai_reasoning" not in data or data.get("ai_reasoning") is None

    def test_anti_enumeration_uniform_404(self, client):
        """Non-existent ticket, corrupted token, and wrong token all return uniform 404 Not Found."""
        # 1. Nonexistent ticket ID
        r1 = client.post(
            "/api/reports/track",
            json={"ticket_id": "RPT-20990101-NONEXIST", "tracking_token": "TRK-0000-0000-0000-0000"}
        )
        assert r1.status_code == 404
        assert r1.json()["detail"] == "Report not found or invalid tracking credentials."

        # 2. Existing ticket with wrong token
        r_create = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Pothole on Zabarte Road.",
                "lat": 14.7565,
                "lng": 121.0450
            }
        )
        ticket_id = r_create.json()["ticket_id"]

        r2 = client.post(
            "/api/reports/track",
            json={"ticket_id": ticket_id, "tracking_token": "TRK-FFFF-FFFF-FFFF-FFFF"}
        )
        assert r2.status_code == 404
        assert r2.json()["detail"] == "Report not found or invalid tracking credentials."

    def test_sql_and_xss_injection_resilience(self, client):
        """SQL injection and XSS payloads in tracking requests are handled safely without 500 errors."""
        r_sqli = client.post(
            "/api/reports/track",
            json={"ticket_id": "' OR 1=1 --", "tracking_token": "TRK-9F83-A8B2-C4E6-10D7"}
        )
        assert r_sqli.status_code == 404

        r_xss = client.post(
            "/api/reports/track",
            json={"ticket_id": "<script>alert('xss')</script>", "tracking_token": "TRK-9F83-A8B2-C4E6-10D7"}
        )
        assert r_xss.status_code == 404


# ========================================================================================
# 3. POST /api/reports/{id}/claim (Contextual Report Claiming & Ownership)
# ========================================================================================

class TestReportClaiming:
    def test_claim_unclaimed_guest_report_success(self, client, resident_maria):
        """Authenticated resident can claim guest report with valid tracking token."""
        # 1. Guest creates report
        r_create = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Severe road depression along Susano Road.",
                "lat": 14.7565,
                "lng": 121.0450,
                "contact_email": "guest-report@example.com"
            }
        )
        assert r_create.status_code == 201, r_create.text
        report_id = r_create.json()["id"]
        token = r_create.json()["tracking_token"]

        # 2. Maria claims report
        r_claim = client.post(
            f"/api/reports/{report_id}/claim",
            headers=resident_maria["headers"],
            json={"tracking_token": token}
        )
        assert r_claim.status_code == 200
        data = r_claim.json()
        assert data["success"] is True
        assert data["report"]["claimed_by_user_id"] == 101
        assert data["report"]["resident_id"] == 101
        assert data["report"]["reporter_type"] == "registered"

        # 3. Verify Audit Log and In-App Notification in DB
        db = TestingSessionLocal()
        audit = db.query(gov_models.AuditLog).filter(gov_models.AuditLog.report_id == report_id,gov_models.AuditLog.trigger_type == "report_claimed").first()
        assert audit is not None
        assert audit.trigger_type == "report_claimed"
        assert audit.actor_role == "resident"

        notif = db.query(models.Notification).filter(models.Notification.resident_id == 101).first()
        assert notif is not None
        assert "Report Linked" in notif.title
        db.close()

    def test_claim_idempotency_for_same_user(self, client, resident_maria):
        """Claiming already claimed report by the same user returns 200 OK idempotently."""
        r_create = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Severe road depression along Susano Road.",
                "lat": 14.7565,
                "lng": 121.0450
            }
        )
        report_id = r_create.json()["id"]
        token = r_create.json()["tracking_token"]

        # 1st Claim
        r_claim1 = client.post(
            f"/api/reports/{report_id}/claim",
            headers=resident_maria["headers"],
            json={"tracking_token": token}
        )
        assert r_claim1.status_code == 200

        # 2nd Claim by same Maria
        r_claim2 = client.post(
            f"/api/reports/{report_id}/claim",
            headers=resident_maria["headers"],
            json={"tracking_token": token}
        )
        assert r_claim2.status_code == 200
        assert "already linked" in r_claim2.json()["message"]

    def test_claim_conflict_by_different_user(self, client, resident_maria, resident_pedro):
        """Claiming a report already claimed by User A returns 409 Conflict when attempted by User B."""
        r_create = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Severe road depression along Susano Road.",
                "lat": 14.7565,
                "lng": 121.0450
            }
        )
        report_id = r_create.json()["id"]
        token = r_create.json()["tracking_token"]

        # Maria claims first
        client.post(
            f"/api/reports/{report_id}/claim",
            headers=resident_maria["headers"],
            json={"tracking_token": token}
        )

        # Pedro attempts to claim with same token
        r_pedro = client.post(
            f"/api/reports/{report_id}/claim",
            headers=resident_pedro["headers"],
            json={"tracking_token": token}
        )
        assert r_pedro.status_code == 409
        assert "already been claimed by another resident" in r_pedro.json()["detail"]

    def test_claim_invalid_token_returns_403(self, client, resident_maria):
        """Claiming with incorrect tracking token returns 403 Forbidden."""
        r_create = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Severe road depression along Susano Road.",
                "lat": 14.7565,
                "lng": 121.0450
            }
        )
        report_id = r_create.json()["id"]

        r_claim = client.post(
            f"/api/reports/{report_id}/claim",
            headers=resident_maria["headers"],
            json={"tracking_token": "TRK-0000-0000-0000-0000"}
        )
        assert r_claim.status_code == 403
        assert "Invalid tracking token" in r_claim.json()["detail"]

    def test_claim_registered_report_returns_409(self, client, resident_maria, resident_pedro):
        """Attempting to claim a report created by another registered user returns 409 Conflict."""
        # Maria creates authenticated report
        r_create = client.post(
            "/api/reports",
            headers=resident_maria["headers"],
            data={
                "category": "Roads & Bridges",
                "description": "A deep road pothole beside the corner has damaged the concrete lane.",
                "lat": 14.7565,
                "lng": 121.0450
            }
        )
        assert r_create.status_code in {200,201}, r_create.text
        report_id = r_create.json()["id"]
        token = r_create.json()["tracking_token"]

        # Pedro tries to claim Maria's registered report
        r_pedro = client.post(
            f"/api/reports/{report_id}/claim",
            headers=resident_pedro["headers"],
            json={"tracking_token": token}
        )
        assert r_pedro.status_code == 409
        assert "authored by a registered account" in r_pedro.json()["detail"]


# ========================================================================================
# 4. GET /api/me/reports (Unified Resident Portfolio & Status Filtering)
# ========================================================================================

class TestMyReportsPortfolio:
    def test_unified_my_reports_and_filtering(self, client, resident_maria, resident_pedro):
        """GET /api/me/reports returns authored + claimed reports with tab filters and cross-tenant isolation."""
        # 1. Maria authors Report 1 (Active)
        r1 = client.post(
            "/api/reports",
            headers=resident_maria["headers"],
            data={
                "category": "Roads & Bridges",
                "description": "Active road report authored by Maria.",
                "lat": 14.7565,
                "lng": 121.0450
            }
        ).json()

        # 2. Guest authors Report 2, then Maria claims it (Active)
        r2_guest = client.post(
            "/api/reports",
            data={
                "category": "Street Lighting",
                "description": "Guest street light report claimed by Maria.",
                "lat": 14.7580,
                "lng": 121.0470
            }
        ).json()
        client.post(
            f"/api/reports/{r2_guest['id']}/claim",
            headers=resident_maria["headers"],
            json={"tracking_token": r2_guest["tracking_token"]}
        )

        # 3. Pedro authors Report 3 (Pedro's report - Maria should NEVER see this)
        r3_pedro = client.post(
            "/api/reports",
            headers=resident_pedro["headers"],
            data={
                "category": "Public Facilities",
                "description": "Pedro's park report.",
                "lat": 14.6500,
                "lng": 120.9750
            }
        ).json()

        # 4. Maria queries /api/me/reports?filter=all
        r_all = client.get("/api/me/reports?filter=all", headers=resident_maria["headers"])
        assert r_all.status_code == 200
        data_all = r_all.json()
        assert data_all["total"] == 2
        returned_ids = [r["id"] for r in data_all["reports"]]
        assert r1["id"] in returned_ids
        assert r2_guest["id"] in returned_ids
        assert r3_pedro["id"] not in returned_ids  # Strict cross-tenant isolation

        # 5. Maria queries /api/me/reports?filter=active
        r_active = client.get("/api/me/reports?filter=active", headers=resident_maria["headers"])
        assert r_active.status_code == 200
        assert r_active.json()["total"] == 2

        # 6. Maria queries /api/me/reports?filter=resolved
        r_resolved = client.get("/api/me/reports?filter=resolved", headers=resident_maria["headers"])
        assert r_resolved.status_code == 200
        assert r_resolved.json()["total"] == 0

        # 7. Unauthenticated request returns 401
        r_unauth = client.get("/api/me/reports")
        assert r_unauth.status_code == 401


# ========================================================================================
# 5. Rate Limiting Tests
# ========================================================================================

class TestRateLimiting:
    def test_submission_rate_limiter_5_per_10min(self, client):
        """POST /api/reports allows 5 submissions per 10 minutes; 6th returns 429."""
        for i in range(5):
            r = client.post(
                "/api/reports",
                data={
                    "category": f"Roads & Bridges",
                    "description": f"Rate limit test report description {i} long enough.",
                    "lat": 14.7565 + (i * 0.001),  # separate locations to avoid 409
                    "lng": 121.0450 + (i * 0.001)
                }
            )
            assert r.status_code == 201

        # 6th request triggers 429
        r_breach = client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "6th rate limit breach attempt description.",
                "lat": 14.7600,
                "lng": 121.0500
            }
        )
        assert r_breach.status_code == 429
        assert "Too many submissions" in r_breach.json()["detail"]
        assert "Retry-After" in r_breach.headers
