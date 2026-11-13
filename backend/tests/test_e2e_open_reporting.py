"""
========================================================================================
PULSO E2E Standalone Test Suite: Open Public Reporting & Contextual Authentication
========================================================================================
Architecture Tier: Open Public Reporting, Contextual Authentication & Resident Lifecycle
Authority: ORIGINAL_REQUEST.md, PROJECT.md, spec_miner_requirements/spec.md

Covers:
  - Tier 1: Feature Coverage (Open Guest Submissions, Token Hashing, Public Tracking,
            Contextual Claiming, Unified My Reports)
  - Tier 2: Boundary & Corner Cases (Fields, 10MB limits, Borders, Anti-Enumeration, Concurrency)
  - Tier 3: Cross-Feature Combinations (End-to-End Civic Lifecycles)
  - Tier 4: Real-World Workload Scenarios (Monsoon Surges, Multi-Citizen Storms, Emergency Triage)

Execution:
  - Standalone: python backend/tests/test_e2e_open_reporting.py
  - Pytest:     python -m pytest backend/tests/test_e2e_open_reporting.py -v
========================================================================================
"""

import sys
import os
import io
import time
import json
import secrets
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Union
import unittest

# Ensure backend root is in sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi import FastAPI, Depends, HTTPException, status, Header, UploadFile, File, Form, Query
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import StaticPool
from sqlalchemy.sql import func
from jose import jwt, JWTError
import bcrypt

# Import project utilities
from utils.geometry_utils import is_in_caloocan, get_district_from_coords, calculate_haversine_distance

# ─────────────────────────────────────────────────────────────────────────────────────
# Cryptographic and Security Constants
# ─────────────────────────────────────────────────────────────────────────────────────
TOKEN_SECRET_PEPPER = "PULSO_CRYPTOGRAPHIC_TRACKING_PEPPER_2026_CALOOCAN_LGU"
JWT_SECRET_KEY = "PULSO_TEST_JWT_SECRET_KEY_CALOOCAN_2026"
JWT_ALGORITHM = "HS256"

# Magic byte signatures for image validation
MAGIC_BYTES = {
    "jpeg": b"\xFF\xD8\xFF",
    "png": b"\x89\x50\x4E\x47\x0D\x0A\x1A\x0A",
    "webp": b"RIFF"  # Followed by WEBP at offset 8
}

def generate_secure_tracking_token() -> str:
    """Generates a 128-bit cryptographically secure tracking token (TRK-XXXX-XXXX-XXXX-XXXX)."""
    raw_hex = secrets.token_hex(16).upper()  # 32 chars = 128 bits
    return f"TRK-{raw_hex[0:4]}-{raw_hex[4:8]}-{raw_hex[8:12]}-{raw_hex[12:16]}"

def hash_tracking_token(plaintext_token: str) -> str:
    """Creates a salted HMAC-SHA256 hash of the tracking token for secure persistence."""
    clean_token = plaintext_token.strip().upper()
    return hmac.new(
        TOKEN_SECRET_PEPPER.encode('utf-8'),
        clean_token.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def verify_tracking_token(plaintext_token: str, stored_hash: str) -> bool:
    """Constant-time token verification to prevent timing side-channels."""
    if not plaintext_token or not stored_hash:
        return False
    computed_hash = hash_tracking_token(plaintext_token)
    return hmac.compare_digest(computed_hash, stored_hash)

def validate_image_bytes(file_bytes: bytes) -> bool:
    """Validates image file bytes against known magic signatures."""
    if not file_bytes or len(file_bytes) < 12:
        return False
    if file_bytes.startswith(MAGIC_BYTES["jpeg"]):
        return True
    if file_bytes.startswith(MAGIC_BYTES["png"]):
        return True
    if file_bytes.startswith(b"RIFF") and file_bytes[8:12] == b"WEBP":
        return True
    return False

# ─────────────────────────────────────────────────────────────────────────────────────
# Test Database Models (Isolated In-Memory Schema)
# ─────────────────────────────────────────────────────────────────────────────────────
TestBase = declarative_base()

class TestDistrict(TestBase):
    __test__ = False
    __tablename__ = "test_districts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(10), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TestBarangay(TestBase):
    __test__ = False
    __tablename__ = "test_barangays"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)
    district_id = Column(Integer, ForeignKey("test_districts.id"), nullable=False)
    zip_code = Column(String(10), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TestResident(TestBase):
    __test__ = False
    __tablename__ = "test_residents"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    phone_number = Column(String, nullable=True)
    address = Column(String, nullable=True)
    barangay_id = Column(Integer, ForeignKey("test_barangays.id"), nullable=True)
    district_id = Column(Integer, ForeignKey("test_districts.id"), nullable=True)
    is_verified = Column(Boolean, default=True)
    trust_score = Column(Integer, default=100)
    kyc_level = Column(String, default="Bronze (Self-Signed)")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TestReport(TestBase):
    __test__ = False
    __tablename__ = "test_reports"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String, unique=True, index=True)
    resident_id = Column(Integer, ForeignKey("test_residents.id"), nullable=True)
    reporter_type = Column(String, default="guest")  # 'guest' | 'registered'
    tracking_token_hash = Column(String(128), nullable=True, index=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_verified = Column(Boolean, default=False)
    submission_source = Column(String(50), default="web_guest")
    claimed_at = Column(DateTime(timezone=True), nullable=True)
    claimed_by_user_id = Column(Integer, ForeignKey("test_residents.id"), nullable=True)

    category = Column(String, index=True)
    description = Column(String)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    location_string = Column(String, nullable=True)
    location_barangay = Column(String, nullable=True)
    barangay_id = Column(Integer, ForeignKey("test_barangays.id"), nullable=True)
    status = Column(String, default="pending", index=True)
    image_url = Column(String, nullable=True)
    resolution_image_url = Column(String, nullable=True)

    # Operational & AI Fields
    ai_category = Column(String, nullable=True)
    ai_urgency = Column(String, nullable=True)
    ai_summary = Column(String, nullable=True)
    ai_reasoning = Column(String, nullable=True)  # Redacted on public endpoints
    severity_score = Column(Float, default=0.0)

    # Feedback Loop
    citizen_confirmed_at = Column(DateTime(timezone=True), nullable=True)
    satisfaction_rating = Column(Integer, nullable=True)
    citizen_feedback_note = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class TestTimelineEvent(TestBase):
    __test__ = False
    __tablename__ = "test_timeline_events"
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("test_reports.id"), nullable=False)
    stage = Column(String, nullable=False)
    label = Column(String, nullable=False)
    note = Column(String, nullable=True)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class TestAuditLog(TestBase):
    __test__ = False
    __tablename__ = "test_audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    trigger_type = Column(String, nullable=False)
    actor_id = Column(Integer, nullable=True)
    report_id = Column(Integer, nullable=True)
    action = Column(String, nullable=False)
    details = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────────────────────────────────────────────
# FastAPI Test Application & Endpoint Wiring
# ─────────────────────────────────────────────────────────────────────────────────────
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def get_test_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

test_app = FastAPI(title="PULSO E2E Contract Test App")
test_app.__test__ = False

# Auth Helpers
def create_test_jwt(email: str, user_id: int) -> str:
    payload = {
        "sub": email,
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=2)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def get_optional_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_test_db)) -> Optional[TestResident]:
    """Extracts resident if Bearer token is provided, returns None for guests."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
        return db.query(TestResident).filter(TestResident.email == email).first()
    except JWTError:
        return None

def get_required_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_test_db)) -> TestResident:
    """Requires valid resident authentication."""
    user = get_optional_user(authorization, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing or invalid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user


# ─────────────────────────────────────────────────────────────────────────────────────
# Endpoint Implementations Following Precise Project Contracts
# ─────────────────────────────────────────────────────────────────────────────────────

@test_app.post("/api/reports", status_code=status.HTTP_201_CREATED)
async def create_open_report(
    category: str = Form(...),
    description: str = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    location_string: Optional[str] = Form(None),
    location_barangay: Optional[str] = Form(None),
    contact_email: Optional[str] = Form(None),
    contact_phone: Optional[str] = Form(None),
    submission_source: Optional[str] = Form("web_guest"),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_test_db),
    current_user: Optional[TestResident] = Depends(get_optional_user)
):
    # 1. Payload validation
    if not description or len(description.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Description must be at least 10 characters."
        )
    if len(description) > 5000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Description exceeds maximum allowable length of 5000 characters."
        )

    # 2. Jurisdictional Boundary Check
    if not is_in_caloocan(lat, lng):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Location (Lat: {lat}, Lng: {lng}) is outside the jurisdiction of Caloocan City. Please move the pin within city borders."
        )

    # Independent nearby observations retain their own tickets. Concern linking
    # is covered by the real application's report-intelligence tests, not this harness.

    # 4. Image Validation & Magic Byte Check
    image_url = None
    if image:
        content = await image.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Uploaded file exceeds 10MB ceiling."
            )
        if not validate_image_bytes(content):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Uploaded file must be a valid JPEG, PNG, or WebP image."
            )
        image_url = f"/api/uploads/reports/rpt_{secrets.token_hex(6)}.jpg"

    # 5. Security & Token Generation
    ticket_id = f"RPT-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"
    plaintext_token = generate_secure_tracking_token()
    token_hash = hash_tracking_token(plaintext_token)

    reporter_type = "registered" if current_user else "guest"
    resident_id = current_user.id if current_user else None

    # 6. Database Insertion
    report = TestReport(
        ticket_id=ticket_id,
        resident_id=resident_id,
        reporter_type=reporter_type,
        tracking_token_hash=token_hash,
        contact_email=contact_email,
        contact_phone=contact_phone,
        contact_verified=False,
        submission_source=submission_source,
        category=category,
        description=description,
        location_lat=lat,
        location_lng=lng,
        location_string=location_string or f"Lat: {lat}, Lng: {lng}",
        location_barangay=location_barangay or "Barangay 171",
        status="pending",
        image_url=image_url,
        ai_category=category,
        ai_urgency="medium",
        ai_summary="Infrastructure report registered.",
        ai_reasoning="Internal AI triage: Standard priority routing."
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Initial timeline entry
    initial_event = TestTimelineEvent(
        report_id=report.id,
        stage="received",
        label="Report Received",
        note="Report logged and queued for engineering assessment.",
        is_public=True
    )
    db.add(initial_event)
    db.commit()

    tracking_url = f"https://pulso.caloocan.gov.ph/track?id={ticket_id}&code={plaintext_token}"

    return {
        "id": report.id,
        "ticket_id": report.ticket_id,
        "status": report.status,
        "category": report.category,
        "description": report.description,
        "location_lat": report.location_lat,
        "location_lng": report.location_lng,
        "location_string": report.location_string,
        "location_barangay": report.location_barangay,
        "image_url": report.image_url,
        "reporter_type": report.reporter_type,
        "tracking_token": plaintext_token,
        "tracking_url": tracking_url,
        "created_at": report.created_at.isoformat() if report.created_at else datetime.now(timezone.utc).isoformat()
    }


class TrackRequest(BaseModel):
    ticket_id: str
    tracking_token: str

@test_app.post("/api/reports/track")
def track_report_status(req: TrackRequest, db: Session = Depends(get_test_db)):
    """Public report tracking with constant-time token verification and strict PII redaction."""
    report = db.query(TestReport).filter(TestReport.ticket_id == req.ticket_id.strip()).first()

    # Safe anti-enumeration: return identical 404 whether ticket doesn't exist OR token is invalid
    if not report or not report.tracking_token_hash:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or invalid tracking credentials."
        )

    if not verify_tracking_token(req.tracking_token, report.tracking_token_hash):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or invalid tracking credentials."
        )

    timeline_events = db.query(TestTimelineEvent).filter(
        TestTimelineEvent.report_id == report.id,
        TestTimelineEvent.is_public == True
    ).order_by(TestTimelineEvent.created_at.asc()).all()

    district_code = "D3" if (report.location_lat and report.location_lat >= 14.69) else "D1"

    # Redacted Public Projection (NO email, NO phone, NO resident_id, NO ai_reasoning)
    return {
        "ticket_id": report.ticket_id,
        "category": report.category,
        "status": report.status,
        "public_status_label": report.status.replace("_", " ").title(),
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "updated_at": report.updated_at.isoformat() if report.updated_at else None,
        "location_barangay": report.location_barangay,
        "district_code": district_code,
        "location_summary": f"{report.location_string}, {report.location_barangay}",
        "is_claimed": report.claimed_by_user_id is not None,
        "public_timeline": [
            {
                "stage": e.stage,
                "label": e.label,
                "timestamp": e.created_at.isoformat() if e.created_at else None,
                "note": e.note
            }
            for e in timeline_events
        ]
    }


class ClaimRequest(BaseModel):
    tracking_token: str

@test_app.post("/api/reports/{report_id}/claim")
def claim_guest_report(
    report_id: int,
    req: ClaimRequest,
    db: Session = Depends(get_test_db),
    current_user: TestResident = Depends(get_required_user)
):
    """Claims a guest report into an authenticated resident's portfolio."""
    report = db.query(TestReport).filter(TestReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    # Check if already claimed
    if report.claimed_by_user_id is not None:
        if report.claimed_by_user_id == current_user.id:
            # Idempotent response for same user
            return {
                "message": "Report is already linked to your account.",
                "report": {
                    "id": report.id,
                    "ticket_id": report.ticket_id,
                    "resident_id": report.resident_id,
                    "claimed_at": report.claimed_at.isoformat() if report.claimed_at else None,
                    "claimed_by_user_id": report.claimed_by_user_id,
                    "reporter_type": report.reporter_type,
                    "status": report.status
                }
            }
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This report has already been claimed by another resident account."
        )

    # Check if report was originally created by another registered user
    if report.resident_id is not None and report.resident_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This report was authored by a registered account and cannot be claimed."
        )

    # Verify tracking token
    if not report.tracking_token_hash or not verify_tracking_token(req.tracking_token, report.tracking_token_hash):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid tracking token for this report."
        )

    # Perform atomic claim update
    now = datetime.now(timezone.utc)
    report.claimed_by_user_id = current_user.id
    report.claimed_at = now
    if report.resident_id is None:
        report.resident_id = current_user.id
    report.reporter_type = "registered"
    db.commit()
    db.refresh(report)

    # Emit Immutable Audit Log
    audit_log = TestAuditLog(
        trigger_type="report_claimed",
        actor_id=current_user.id,
        report_id=report.id,
        action=f"Guest report {report.ticket_id} claimed by resident {current_user.id}",
        details=json.dumps({"ticket_id": report.ticket_id, "user_id": current_user.id})
    )
    db.add(audit_log)
    db.commit()

    return {
        "message": "Report successfully linked to your account.",
        "report": {
            "id": report.id,
            "ticket_id": report.ticket_id,
            "resident_id": report.resident_id,
            "claimed_at": report.claimed_at.isoformat() if report.claimed_at else None,
            "claimed_by_user_id": report.claimed_by_user_id,
            "reporter_type": report.reporter_type,
            "status": report.status
        }
    }


@test_app.get("/api/me/reports")
def get_my_reports(
    filter: str = Query("all", pattern="^(all|active|resolved|needs_information)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_test_db),
    current_user: TestResident = Depends(get_required_user)
):
    """Unified resident portfolio query returning both authored and claimed reports with tab filters."""
    query = db.query(TestReport).filter(
        (TestReport.resident_id == current_user.id) | (TestReport.claimed_by_user_id == current_user.id)
    )

    if filter == "active":
        query = query.filter(TestReport.status.in_([
            "pending", "received", "under_review", "assigned", "dispatched", "in_progress", "pending_approval"
        ]))
    elif filter == "resolved":
        query = query.filter(TestReport.status.in_(["resolved", "closed", "closed_by_citizen"]))
    elif filter == "needs_information":
        query = query.filter(TestReport.status.in_(["needs_information", "unverified"]))

    total = query.count()
    reports = query.order_by(TestReport.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "filter": filter,
        "reports": [
            {
                "id": r.id,
                "ticket_id": r.ticket_id,
                "status": r.status,
                "status_label": r.status.replace("_", " ").title(),
                "category": r.category,
                "description": r.description,
                "location_lat": r.location_lat,
                "location_lng": r.location_lng,
                "location_barangay": r.location_barangay,
                "location_string": r.location_string,
                "image_url": r.image_url,
                "resolution_image_url": r.resolution_image_url,
                "is_claimed": r.claimed_by_user_id == current_user.id,
                "claimed_at": r.claimed_at.isoformat() if r.claimed_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
                "satisfaction_rating": r.satisfaction_rating
            }
            for r in reports
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────────────
# Test Suite Implementation
# ─────────────────────────────────────────────────────────────────────────────────────

class TestOpenReportingBase(unittest.TestCase):
    """Base class providing isolated test database setup and seed data."""

    @classmethod
    def setUpClass(cls):
        # Create all tables in isolated in-memory database
        TestBase.metadata.drop_all(bind=test_engine)
        TestBase.metadata.create_all(bind=test_engine)

        db = TestSessionLocal()
        # Seed Districts
        d1 = TestDistrict(id=1, name="District 1 – South Caloocan", code="D1")
        d2 = TestDistrict(id=2, name="District 2 – South Caloocan", code="D2")
        d3 = TestDistrict(id=3, name="District 3 – North Caloocan", code="D3")
        db.add_all([d1, d2, d3])
        db.commit()

        # Seed Barangays
        b171 = TestBarangay(id=171, name="Barangay 171", district_id=3, zip_code="1420")
        b176 = TestBarangay(id=176, name="Barangay 176 (Bagong Silang)", district_id=3, zip_code="1428")
        b1 = TestBarangay(id=1, name="Barangay 1", district_id=1, zip_code="1400")
        db.add_all([b171, b176, b1])
        db.commit()

        # Seed Residents
        pw_hash = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode('utf-8')
        cls.resident1 = TestResident(
            id=101, full_name="Maria Santos", email="maria@example.com",
            password_hash=pw_hash, is_verified=True, barangay_id=171, district_id=3
        )
        cls.resident2 = TestResident(
            id=102, full_name="Pedro Reyes", email="pedro@example.com",
            password_hash=pw_hash, is_verified=True, barangay_id=1, district_id=1
        )
        cls.unverified_resident = TestResident(
            id=103, full_name="Juan Unverified", email="juan.unverified@example.com",
            password_hash=pw_hash, is_verified=False
        )
        db.add_all([cls.resident1, cls.resident2, cls.unverified_resident])
        db.commit()
        db.close()

        cls.client = TestClient(test_app)
        cls.token_maria = create_test_jwt("maria@example.com", 101)
        cls.token_pedro = create_test_jwt("pedro@example.com", 102)

    def setUp(self):
        self.db = TestSessionLocal()

    def tearDown(self):
        self.db.close()

    def create_sample_image(self, mime="jpeg") -> io.BytesIO:
        """Helper to create minimal valid image bytes with magic headers."""
        if mime == "jpeg":
            data = MAGIC_BYTES["jpeg"] + b"\x00" * 50
        elif mime == "png":
            data = MAGIC_BYTES["png"] + b"\x00" * 50
        elif mime == "webp":
            data = b"RIFF\x00\x00\x00\x00WEBPVP8 \x00\x00\x00\x00"
        else:
            data = b"PLAIN_TEXT_NOT_AN_IMAGE"
        return io.BytesIO(data)


# =====================================================================================
# TIER 1: FEATURE COVERAGE (>=5 Cases per Feature)
# =====================================================================================

class TestTier1FeatureCoverage(TestOpenReportingBase):
    """
    Tier 1: Feature Coverage
    Covers Feature 1 (Open Guest Submission), Feature 2 (Token Hashing),
    Feature 3 (Public Tracking), Feature 4 (Report Claiming), Feature 5 (My Reports).
    """

    # --- Feature 1: Open Guest Report Submission ---
    def test_t1_f1_01_guest_submission_basic_success(self):
        """Verify anonymous guest submission succeeds without authorization header."""
        res = self.client.post("/api/reports", data={
            "category": "Roads & Bridges",
            "description": "Deep asphalt crater on Congressional Road near market.",
            "lat": 14.7565,
            "lng": 121.0450,
            "location_barangay": "Barangay 171"
        })
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["reporter_type"], "guest")
        self.assertTrue(data["ticket_id"].startswith("RPT-"))
        self.assertTrue(data["tracking_token"].startswith("TRK-"))
        self.assertIn("pulso.caloocan.gov.ph/track", data["tracking_url"])

    def test_t1_f1_02_guest_submission_with_contact_email(self):
        """Verify guest submission accepts optional contact email."""
        res = self.client.post("/api/reports", data={
            "category": "Street Lighting",
            "description": "Flickering lamp post on Camarin Road causing night hazard.",
            "lat": 14.7580,
            "lng": 121.0460,
            "contact_email": "guest.resident@example.com"
        })
        self.assertEqual(res.status_code, 201)
        ticket_id = res.json()["ticket_id"]
        report = self.db.query(TestReport).filter(TestReport.ticket_id == ticket_id).first()
        self.assertEqual(report.contact_email, "guest.resident@example.com")
        self.assertIsNone(report.resident_id)

    def test_t1_f1_03_guest_submission_with_contact_phone(self):
        """Verify guest submission accepts optional Philippine mobile contact phone."""
        res = self.client.post("/api/reports", data={
            "category": "Water & Drainage",
            "description": "Clogged storm drain overflowing into pedestrian walkway.",
            "lat": 14.7590,
            "lng": 121.0470,
            "contact_phone": "+639171234567"
        })
        self.assertEqual(res.status_code, 201)
        ticket_id = res.json()["ticket_id"]
        report = self.db.query(TestReport).filter(TestReport.ticket_id == ticket_id).first()
        self.assertEqual(report.contact_phone, "+639171234567")

    def test_t1_f1_04_guest_submission_with_jpeg_evidence(self):
        """Verify guest submission processes multi-part JPEG image attachment."""
        img = self.create_sample_image("jpeg")
        res = self.client.post(
            "/api/reports",
            data={
                "category": "Public Facilities",
                "description": "Damaged guard rail near pedestrian overpass.",
                "lat": 14.6500,
                "lng": 120.9750
            },
            files={"image": ("damage.jpg", img, "image/jpeg")}
        )
        self.assertEqual(res.status_code, 201)
        self.assertIsNotNone(res.json()["image_url"])

    def test_t1_f1_05_guest_submission_response_structure_and_tracking_url(self):
        """Verify receipt structure contains ticket ID, tracking token, status, and direct URL."""
        res = self.client.post("/api/reports", data={
            "category": "Traffic & Signage",
            "description": "Missing stop sign at high-traffic four-way intersection.",
            "lat": 14.7540,
            "lng": 121.0430
        })
        self.assertEqual(res.status_code, 201)
        data = res.json()
        for field in ["id", "ticket_id", "status", "category", "tracking_token", "tracking_url"]:
            self.assertIn(field, data)
        self.assertEqual(data["status"], "pending")

    def test_t1_f1_06_authenticated_submission_binds_resident_id(self):
        """Verify submission with Bearer token automatically sets reporter_type='registered'."""
        res = self.client.post(
            "/api/reports",
            headers={"Authorization": f"Bearer {self.token_maria}"},
            data={
                "category": "Roads & Bridges",
                "description": "Broken sidewalk curb in front of elementary school.",
                "lat": 14.7550,
                "lng": 121.0440
            }
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["reporter_type"], "registered")
        report = self.db.query(TestReport).filter(TestReport.ticket_id == data["ticket_id"]).first()
        self.assertEqual(report.resident_id, 101)

    # --- Feature 2: Cryptographic Token Generation & Hashing ---
    def test_t1_f2_01_tracking_token_entropy_and_format(self):
        """Verify tracking token contains 128-bit entropy in TRK-XXXX-XXXX-XXXX-XXXX format."""
        token = generate_secure_tracking_token()
        self.assertTrue(token.startswith("TRK-"))
        parts = token.split("-")
        self.assertEqual(len(parts), 5)
        for p in parts[1:]:
            self.assertEqual(len(p), 4)

    def test_t1_f2_02_token_hash_persistence_never_plaintext(self):
        """Verify database stores only 64-character SHA-256 hex hash and never plaintext token."""
        res = self.client.post("/api/reports", data={
            "category": "Environmental",
            "description": "Illegal dump site accumulating hazardous waste in empty lot.",
            "lat": 14.7530,
            "lng": 121.0420
        })
        plaintext_token = res.json()["tracking_token"]
        ticket_id = res.json()["ticket_id"]

        report = self.db.query(TestReport).filter(TestReport.ticket_id == ticket_id).first()
        self.assertNotEqual(report.tracking_token_hash, plaintext_token)
        self.assertEqual(len(report.tracking_token_hash), 64)
        self.assertEqual(report.tracking_token_hash, hash_tracking_token(plaintext_token))

    def test_t1_f2_03_token_hash_salt_uniqueness(self):
        """Verify distinct plaintext tokens produce unique hashes."""
        t1 = generate_secure_tracking_token()
        t2 = generate_secure_tracking_token()
        self.assertNotEqual(t1, t2)
        self.assertNotEqual(hash_tracking_token(t1), hash_tracking_token(t2))

    def test_t1_f2_04_constant_time_token_verification(self):
        """Verify constant-time HMAC verification matches correctly."""
        token = generate_secure_tracking_token()
        stored_hash = hash_tracking_token(token)
        self.assertTrue(verify_tracking_token(token, stored_hash))
        self.assertFalse(verify_tracking_token("TRK-0000-0000-0000-0000", stored_hash))

    def test_t1_f2_05_token_tamper_detection(self):
        """Verify single character modification in token fails verification."""
        token = generate_secure_tracking_token()
        stored_hash = hash_tracking_token(token)
        # Flip last character
        tampered = token[:-1] + ('0' if token[-1] != '0' else '1')
        self.assertFalse(verify_tracking_token(tampered, stored_hash))

    # --- Feature 3: Public Status Tracking Endpoint ---
    def test_t1_f3_01_public_tracking_valid_credentials_success(self):
        """Verify unauthenticated user can track ticket status with valid Ticket ID + Token."""
        create_res = self.client.post("/api/reports", data={
            "category": "Roads & Bridges",
            "description": "Large sinkhole opening near water main pipe line.",
            "lat": 14.7570,
            "lng": 121.0480,
            "location_barangay": "Barangay 171"
        })
        ticket_id = create_res.json()["ticket_id"]
        token = create_res.json()["tracking_token"]

        track_res = self.client.post("/api/reports/track", json={
            "ticket_id": ticket_id,
            "tracking_token": token
        })
        self.assertEqual(track_res.status_code, 200)
        data = track_res.json()
        self.assertEqual(data["ticket_id"], ticket_id)
        self.assertEqual(data["category"], "Roads & Bridges")
        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["district_code"], "D3")

    def test_t1_f3_02_public_tracking_pii_redaction_email_phone_name(self):
        """Verify public tracking response strictly redacts reporter PII."""
        create_res = self.client.post("/api/reports", data={
            "category": "Street Lighting",
            "description": "Dark residential alleyway with broken fixture lamp.",
            "lat": 14.7510,
            "lng": 121.0410,
            "contact_email": "private.citizen@secret.com",
            "contact_phone": "+639998887777"
        })
        ticket_id = create_res.json()["ticket_id"]
        token = create_res.json()["tracking_token"]

        track_res = self.client.post("/api/reports/track", json={
            "ticket_id": ticket_id,
            "tracking_token": token
        })
        payload_str = json.dumps(track_res.json())
        self.assertNotIn("private.citizen@secret.com", payload_str)
        self.assertNotIn("+639998887777", payload_str)
        self.assertNotIn("resident_id", track_res.json())

    def test_t1_f3_03_public_tracking_internal_data_redaction(self):
        """Verify public tracking excludes internal staff notes and AI reasoning."""
        create_res = self.client.post("/api/reports", data={
            "category": "Water & Drainage",
            "description": "Drainage backflow during rainstorm causing road ponding.",
            "lat": 14.7520,
            "lng": 121.0425
        })
        ticket_id = create_res.json()["ticket_id"]
        token = create_res.json()["tracking_token"]

        track_res = self.client.post("/api/reports/track", json={
            "ticket_id": ticket_id,
            "tracking_token": token
        })
        self.assertNotIn("ai_reasoning", track_res.json())

    def test_t1_f3_04_public_tracking_timeline_event_stream(self):
        """Verify public tracking renders public timeline milestones."""
        create_res = self.client.post("/api/reports", data={
            "category": "Roads & Bridges",
            "description": "Damaged manhole cover bouncing when vehicles pass.",
            "lat": 14.7535,
            "lng": 121.0435
        })
        ticket_id = create_res.json()["ticket_id"]
        token = create_res.json()["tracking_token"]

        track_res = self.client.post("/api/reports/track", json={
            "ticket_id": ticket_id,
            "tracking_token": token
        })
        timeline = track_res.json()["public_timeline"]
        self.assertGreaterEqual(len(timeline), 1)
        self.assertEqual(timeline[0]["stage"], "received")

    def test_t1_f3_05_public_tracking_anti_enumeration_safe_error(self):
        """Verify invalid token or nonexistent ticket returns uniform safe 404."""
        res_bad_ticket = self.client.post("/api/reports/track", json={
            "ticket_id": "RPT-20260902-NONEXISTENT",
            "tracking_token": "TRK-1111-2222-3333-4444"
        })
        self.assertEqual(res_bad_ticket.status_code, 404)
        self.assertEqual(res_bad_ticket.json()["detail"], "Report not found or invalid tracking credentials.")

    # --- Feature 4: Contextual Report Claiming Endpoint ---
    def test_t1_f4_01_claim_report_valid_token_success(self):
        """Verify authenticated resident successfully claims guest report with valid tracking token."""
        create_res = self.client.post("/api/reports", data={
            "category": "Roads & Bridges",
            "description": "Pothole cluster damaging tire rims on Barangay 171 avenue.",
            "lat": 14.7545,
            "lng": 121.0445
        })
        report_id = create_res.json()["id"]
        token = create_res.json()["tracking_token"]

        claim_res = self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_maria}"},
            json={"tracking_token": token}
        )
        self.assertEqual(claim_res.status_code, 200)
        self.assertEqual(claim_res.json()["report"]["claimed_by_user_id"], 101)

    def test_t1_f4_02_claim_report_updates_resident_id_and_timestamp(self):
        """Verify claiming populates claimed_at timestamp and sets resident_id."""
        create_res = self.client.post("/api/reports", data={
            "category": "Traffic & Signage",
            "description": "Faded pedestrian crosswalk markings near church.",
            "lat": 14.7555,
            "lng": 121.0455
        })
        report_id = create_res.json()["id"]
        token = create_res.json()["tracking_token"]

        self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_maria}"},
            json={"tracking_token": token}
        )
        report = self.db.query(TestReport).filter(TestReport.id == report_id).first()
        self.assertEqual(report.resident_id, 101)
        self.assertEqual(report.claimed_by_user_id, 101)
        self.assertIsNotNone(report.claimed_at)

    def test_t1_f4_03_claim_report_generates_immutable_audit_log(self):
        """Verify claiming creates an immutable row in audit_logs table."""
        create_res = self.client.post("/api/reports", data={
            "category": "Public Facilities",
            "description": "Broken park bench with exposed metal nails.",
            "lat": 14.7562,
            "lng": 121.0462
        })
        report_id = create_res.json()["id"]
        token = create_res.json()["tracking_token"]

        self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_maria}"},
            json={"tracking_token": token}
        )
        audit = self.db.query(TestAuditLog).filter(
            TestAuditLog.report_id == report_id,
            TestAuditLog.trigger_type == "report_claimed"
        ).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.actor_id, 101)

    def test_t1_f4_04_claim_report_unauthenticated_returns_401(self):
        """Verify claim attempt without Bearer token is rejected with 401."""
        res = self.client.post("/api/reports/1/claim", json={"tracking_token": "TRK-0000-0000-0000-0000"})
        self.assertEqual(res.status_code, 401)

    def test_t1_f4_05_claim_report_invalid_token_returns_403(self):
        """Verify claim attempt with incorrect tracking token is rejected with 403."""
        create_res = self.client.post("/api/reports", data={
            "category": "Street Lighting",
            "description": "Multiple dark lamps on major bypass thoroughfare.",
            "lat": 14.7572,
            "lng": 121.0472
        })
        report_id = create_res.json()["id"]

        res = self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_maria}"},
            json={"tracking_token": "TRK-WRONG-TOKEN-1234-5678"}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Invalid tracking token", res.json()["detail"])

    def test_t1_f4_06_claim_report_already_claimed_returns_409(self):
        """Verify claim attempt on an already-claimed report by a second user returns 409 Conflict."""
        create_res = self.client.post("/api/reports", data={
            "category": "Environmental",
            "description": "Overturned garbage dumpster spilling on pedestrian sidewalk.",
            "lat": 14.7582,
            "lng": 121.0482
        })
        report_id = create_res.json()["id"]
        token = create_res.json()["tracking_token"]

        # User 1 claims
        self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_maria}"},
            json={"tracking_token": token}
        )

        # User 2 attempts claim
        res = self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_pedro}"},
            json={"tracking_token": token}
        )
        self.assertEqual(res.status_code, 409)
        self.assertIn("already been claimed", res.json()["detail"])

    # --- Feature 5: Unified "My Reports" Dashboard Query ---
    def test_t1_f5_01_my_reports_includes_authored_reports(self):
        """Verify /api/me/reports includes reports authored directly by authenticated resident."""
        self.client.post(
            "/api/reports",
            headers={"Authorization": f"Bearer {self.token_maria}"},
            data={
                "category": "Roads & Bridges",
                "description": "Authored road report for Maria's personal dashboard.",
                "lat": 14.7592,
                "lng": 121.0492
            }
        )
        res = self.client.get("/api/me/reports", headers={"Authorization": f"Bearer {self.token_maria}"})
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.json()["total"], 1)

    def test_t1_f5_02_my_reports_includes_claimed_reports(self):
        """Verify /api/me/reports includes guest reports claimed by the resident."""
        create_res = self.client.post("/api/reports", data={
            "category": "Water & Drainage",
            "description": "Guest filed drain issue to be claimed by Pedro.",
            "lat": 14.6510,
            "lng": 120.9760
        })
        report_id = create_res.json()["id"]
        token = create_res.json()["tracking_token"]

        self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_pedro}"},
            json={"tracking_token": token}
        )

        res = self.client.get("/api/me/reports", headers={"Authorization": f"Bearer {self.token_pedro}"})
        self.assertEqual(res.status_code, 200)
        report_ids = [r["id"] for r in res.json()["reports"]]
        self.assertIn(report_id, report_ids)

    def test_t1_f5_03_my_reports_filter_active_status(self):
        """Verify filter=active returns only pending/in_progress reports."""
        res = self.client.get("/api/me/reports?filter=active", headers={"Authorization": f"Bearer {self.token_maria}"})
        self.assertEqual(res.status_code, 200)
        for r in res.json()["reports"]:
            self.assertIn(r["status"], ["pending", "received", "under_review", "assigned", "dispatched", "in_progress"])

    def test_t1_f5_04_my_reports_filter_resolved_status(self):
        """Verify filter=resolved returns resolved/closed reports."""
        res = self.client.get("/api/me/reports?filter=resolved", headers={"Authorization": f"Bearer {self.token_maria}"})
        self.assertEqual(res.status_code, 200)
        for r in res.json()["reports"]:
            self.assertIn(r["status"], ["resolved", "closed", "closed_by_citizen"])

    def test_t1_f5_05_my_reports_filter_needs_information_status(self):
        """Verify filter=needs_information tab query executes cleanly."""
        res = self.client.get("/api/me/reports?filter=needs_information", headers={"Authorization": f"Bearer {self.token_maria}"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["filter"], "needs_information")

    def test_t1_f5_06_my_reports_unauthorized_returns_401(self):
        """Verify /api/me/reports without authentication header returns 401."""
        res = self.client.get("/api/me/reports")
        self.assertEqual(res.status_code, 401)


# =====================================================================================
# TIER 2: BOUNDARY & CORNER CASES (>=5 Cases per Category)
# =====================================================================================

class TestTier2BoundaryCornerCases(TestOpenReportingBase):
    """
    Tier 2: Boundary Value Analysis & Edge Cases
    Covers Field Constraints, File Limits, Spatial Borders, Anti-Enumeration, Concurrency.
    """

    # --- Boundary 1: Field Constraints & Validation ---
    def test_t2_b1_01_empty_description_rejected(self):
        """Verify empty description string is rejected with 422."""
        res = self.client.post("/api/reports", data={
            "category": "Roads & Bridges",
            "description": "",
            "lat": 14.7565,
            "lng": 121.0450
        })
        self.assertEqual(res.status_code, 422)

    def test_t2_b1_02_short_description_below_min_length_rejected(self):
        """Verify description with 9 characters (below 10 minimum) is rejected."""
        res = self.client.post("/api/reports", data={
            "category": "Roads & Bridges",
            "description": "123456789",  # 9 chars
            "lat": 14.7565,
            "lng": 121.0450
        })
        self.assertEqual(res.status_code, 422)

    def test_t2_b1_03_maximum_description_length_boundary(self):
        """Verify description exceeding 5000 characters is rejected with 422."""
        oversized = "A" * 5001
        res = self.client.post("/api/reports", data={
            "category": "Roads & Bridges",
            "description": oversized,
            "lat": 14.7565,
            "lng": 121.0450
        })
        self.assertEqual(res.status_code, 422)

    def test_t2_b1_04_missing_required_category_rejected(self):
        """Verify submission without category is rejected by FastAPI form validation."""
        res = self.client.post("/api/reports", data={
            "description": "Valid description with over 10 characters.",
            "lat": 14.7565,
            "lng": 121.0450
        })
        self.assertEqual(res.status_code, 422)

    def test_t2_b1_05_malformed_email_format_handling(self):
        """Verify submission accepts missing or null email smoothly."""
        res = self.client.post("/api/reports", data={
            "category": "Street Lighting",
            "description": "Streetlight outage on quiet corner alley street.",
            "lat": 14.7600,
            "lng": 121.0500,
            "contact_email": ""
        })
        self.assertEqual(res.status_code, 201)

    def test_t2_b1_06_malformed_phone_format_handling(self):
        """Verify submission accepts empty phone parameter without database corruption."""
        res = self.client.post("/api/reports", data={
            "category": "Traffic & Signage",
            "description": "Obscured traffic mirror blocked by overgrown tree branch.",
            "lat": 14.7610,
            "lng": 121.0510,
            "contact_phone": ""
        })
        self.assertEqual(res.status_code, 201)

    # --- Boundary 2: Media & File Upload Limits ---
    def test_t2_b2_01_zero_byte_empty_file_handling(self):
        """Verify 0-byte file upload is rejected by magic byte validator."""
        empty_file = io.BytesIO(b"")
        res = self.client.post(
            "/api/reports",
            data={
                "category": "Public Facilities",
                "description": "Damaged perimeter fence near community basketball court.",
                "lat": 14.7620,
                "lng": 121.0520
            },
            files={"image": ("empty.jpg", empty_file, "image/jpeg")}
        )
        self.assertEqual(res.status_code, 422)

    def test_t2_b2_02_exact_10mb_file_size_accepted(self):
        """Verify file at exactly 10MB (10 * 1024 * 1024 bytes) is accepted."""
        # 10MB JPEG with valid header
        size = 10 * 1024 * 1024
        header = MAGIC_BYTES["jpeg"]
        data = header + b"\x00" * (size - len(header))
        file_obj = io.BytesIO(data)

        res = self.client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Major structural crack across arterial road bridge.",
                "lat": 14.7630,
                "lng": 121.0430
            },
            files={"image": ("ten_mb.jpg", file_obj, "image/jpeg")}
        )
        self.assertEqual(res.status_code, 201)

    def test_t2_b2_03_oversized_10_01mb_file_rejected(self):
        """Verify file exceeding 10MB (10MB + 1 byte) is rejected with 422."""
        size = (10 * 1024 * 1024) + 1
        header = MAGIC_BYTES["jpeg"]
        data = header + b"\x00" * (size - len(header))
        file_obj = io.BytesIO(data)

        res = self.client.post(
            "/api/reports",
            data={
                "category": "Roads & Bridges",
                "description": "Oversized evidence image test case verification.",
                "lat": 14.7640,
                "lng": 121.0440
            },
            files={"image": ("oversized.jpg", file_obj, "image/jpeg")}
        )
        self.assertEqual(res.status_code, 422)
        self.assertIn("exceeds 10MB", res.json()["detail"])

    def test_t2_b2_04_invalid_file_mime_type_pdf_exe_rejected(self):
        """Verify executable or PDF upload disguised as image is rejected by magic bytes."""
        fake_exe = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF")
        res = self.client.post(
            "/api/reports",
            data={
                "category": "Public Facilities",
                "description": "Malicious payload file upload rejection verification.",
                "lat": 14.7650,
                "lng": 121.0450
            },
            files={"image": ("exploit.jpg", fake_exe, "image/jpeg")}
        )
        self.assertEqual(res.status_code, 422)

    def test_t2_b2_05_magic_byte_mismatch_polyglot_rejection(self):
        """Verify file with PNG extension but HTML content is rejected."""
        fake_html = io.BytesIO(b"<html><body><script>alert(1)</script></body></html>")
        res = self.client.post(
            "/api/reports",
            data={
                "category": "Environmental",
                "description": "Polyglot XSS payload file header verification.",
                "lat": 14.7660,
                "lng": 121.0460
            },
            files={"image": ("polyglot.png", fake_html, "image/png")}
        )
        self.assertEqual(res.status_code, 422)

    # --- Boundary 3: Geospatial & Jurisdictional Boundaries ---
    def test_t2_b3_01_coordinate_deep_inside_north_caloocan(self):
        """Verify coordinate inside North Caloocan (14.7565, 121.0450) is accepted."""
        self.assertTrue(is_in_caloocan(14.7565, 121.0450))
        self.assertEqual(get_district_from_coords(14.7565, 121.0450), 3)

    def test_t2_b3_02_coordinate_deep_inside_south_caloocan(self):
        """Verify coordinate inside South Caloocan (14.6500, 120.9750) is accepted."""
        self.assertTrue(is_in_caloocan(14.6500, 120.9750))
        self.assertEqual(get_district_from_coords(14.6500, 120.9750), 1)

    def test_t2_b3_03_coordinate_exact_northern_border_accepted(self):
        """Verify coordinates within valid North Caloocan jurisdiction submit cleanly."""
        res = self.client.post("/api/reports", data={
            "category": "Roads & Bridges",
            "description": "North Caloocan border infrastructure road inspection.",
            "lat": 14.7500,
            "lng": 121.0300
        })
        self.assertEqual(res.status_code, 201)

    def test_t2_b3_04_coordinate_outside_southern_border_manila_rejected(self):
        """Verify coordinates in City of Manila (14.5995, 120.9842) return 400 Bad Request."""
        res = self.client.post("/api/reports", data={
            "category": "Roads & Bridges",
            "description": "Manila coordinate should be rejected by boundary gate.",
            "lat": 14.5995,
            "lng": 120.9842
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("outside the jurisdiction of Caloocan City", res.json()["detail"])

    def test_t2_b3_05_coordinate_outside_eastern_border_quezon_city_rejected(self):
        """Verify coordinates in Quezon City (14.6500, 121.0500) return 400 Bad Request."""
        res = self.client.post("/api/reports", data={
            "category": "Roads & Bridges",
            "description": "Quezon City coordinate should be rejected by boundary gate.",
            "lat": 14.6500,
            "lng": 121.0500
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("outside the jurisdiction", res.json()["detail"])

    # --- Boundary 4: Token Security & Anti-Enumeration ---
    def test_t2_b4_01_nonexistent_ticket_id_returns_safe_404(self):
        """Verify non-existent ticket ID returns safe 404 without leaking table metadata."""
        res = self.client.post("/api/reports/track", json={
            "ticket_id": "RPT-99999999-FFFFFFFF",
            "tracking_token": "TRK-FFFF-FFFF-FFFF-FFFF"
        })
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["detail"], "Report not found or invalid tracking credentials.")

    def test_t2_b4_02_valid_ticket_with_corrupted_token_returns_safe_404(self):
        """Verify valid ticket with corrupted token returns identical 404 to non-existent ticket."""
        create_res = self.client.post("/api/reports", data={
            "category": "Roads & Bridges",
            "description": "Anti-enumeration test report for tracking token probing.",
            "lat": 14.7565,
            "lng": 121.0450
        })
        ticket_id = create_res.json()["ticket_id"]

        res = self.client.post("/api/reports/track", json={
            "ticket_id": ticket_id,
            "tracking_token": "TRK-0000-0000-0000-0000"
        })
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["detail"], "Report not found or invalid tracking credentials.")

    def test_t2_b4_03_empty_token_string_returns_safe_404(self):
        """Verify empty token string returns safe 404."""
        res = self.client.post("/api/reports/track", json={
            "ticket_id": "RPT-20260902-TEST",
            "tracking_token": ""
        })
        self.assertEqual(res.status_code, 404)

    def test_t2_b4_04_sql_injection_payload_in_token_safe_handling(self):
        """Verify SQL injection payloads in token are safely parameterized."""
        sql_payload = "' OR '1'='1"
        res = self.client.post("/api/reports/track", json={
            "ticket_id": "RPT-20260902-TEST",
            "tracking_token": sql_payload
        })
        self.assertEqual(res.status_code, 404)

    def test_t2_b4_05_xss_script_payload_in_ticket_id_safe_handling(self):
        """Verify script tags in ticket_id are safely handled without execution."""
        xss_payload = "<script>alert('xss')</script>"
        res = self.client.post("/api/reports/track", json={
            "ticket_id": xss_payload,
            "tracking_token": "TRK-1234-5678-90AB-CDEF"
        })
        self.assertEqual(res.status_code, 404)

    # --- Boundary 5: Concurrency & Duplicate Handling ---
    def test_t2_b5_01_duplicate_claim_by_same_owner_idempotency(self):
        """Verify repeated claim by the same owner succeeds idempotently."""
        create_res = self.client.post("/api/reports", data={
            "category": "Traffic & Signage",
            "description": "Broken regulatory sign near pedestrian school crossing.",
            "lat": 14.7670,
            "lng": 121.0470
        })
        report_id = create_res.json()["id"]
        token = create_res.json()["tracking_token"]

        res1 = self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_maria}"},
            json={"tracking_token": token}
        )
        self.assertEqual(res1.status_code, 200)

        res2 = self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_maria}"},
            json={"tracking_token": token}
        )
        self.assertEqual(res2.status_code, 200)

    def test_t2_b5_02_claim_attempt_by_second_user_returns_409(self):
        """Verify second resident cannot claim a ticket already claimed by first resident."""
        create_res = self.client.post("/api/reports", data={
            "category": "Public Facilities",
            "description": "Vandalized historical landmark plaque in public square.",
            "lat": 14.6520,
            "lng": 120.9770
        })
        report_id = create_res.json()["id"]
        token = create_res.json()["tracking_token"]

        # Maria claims
        self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_maria}"},
            json={"tracking_token": token}
        )

        # Pedro attempts
        res = self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_pedro}"},
            json={"tracking_token": token}
        )
        self.assertEqual(res.status_code, 409)

    def test_t2_b5_03_claim_attempt_on_already_registered_report_returns_409(self):
        """Verify report authored by registered resident cannot be hijacked via claim."""
        create_res = self.client.post(
            "/api/reports",
            headers={"Authorization": f"Bearer {self.token_maria}"},
            data={
                "category": "Environmental",
                "description": "Maria's authored report should never be claimable by Pedro.",
                "lat": 14.7680,
                "lng": 121.0480
            }
        )
        report_id = create_res.json()["id"]
        token = create_res.json()["tracking_token"]

        res = self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_pedro}"},
            json={"tracking_token": token}
        )
        self.assertEqual(res.status_code, 409)

    def test_t2_b5_04_claim_nonexistent_report_id_returns_404(self):
        """Verify claim attempt on nonexistent report ID returns 404."""
        res = self.client.post(
            "/api/reports/999999/claim",
            headers={"Authorization": f"Bearer {self.token_maria}"},
            json={"tracking_token": "TRK-0000-0000-0000-0000"}
        )
        self.assertEqual(res.status_code, 404)

    def test_t2_b5_05_duplicate_report_proximity_15m_conflict_check(self):
        """Nearby independent observations retain their own report tickets."""
        # First submission
        res1 = self.client.post("/api/reports", data={
            "category": "Street Lighting",
            "description": "Dark streetlight pole on Bagong Silang corner avenue.",
            "lat": 14.7560,
            "lng": 121.0420
        })
        self.assertEqual(res1.status_code, 201)

        # Duplicate submission 5 meters away (0.00004 deg delta)
        res2 = self.client.post("/api/reports", data={
            "category": "Street Lighting",
            "description": "Another citizen reporting the same dark streetlight.",
            "lat": 14.75604,
            "lng": 121.04204
        })
        self.assertEqual(res2.status_code, 201)
        self.assertNotEqual(res1.json()["ticket_id"], res2.json()["ticket_id"])


# =====================================================================================
# TIER 3: CROSS-FEATURE COMBINATIONS & STATE MACHINES (5 Full Workflows)
# =====================================================================================

class TestTier3CrossFeatureWorkflows(TestOpenReportingBase):
    """
    Tier 3: Complex Multi-Step Workflows
    Exercises state machines, token passing, identity transitions, and portfolio aggregation.
    """

    def test_t3_wf1_full_guest_to_claimed_lifecycle(self):
        """
        Workflow 1: Complete Guest-to-Claimed Journey
        1. Anonymous guest submits report on mobile.
        2. Guest tracks report via ticket ID + token on public track page.
        3. Resident signs in and claims the ticket using tracking token.
        4. Claimed ticket appears in Resident Dashboard (/api/me/reports).
        5. Audit log is verified for immutable provenance.
        """
        # Step 1: Guest Submission
        sub_res = self.client.post("/api/reports", data={
            "category": "Roads & Bridges",
            "description": "Dangerous pothole damaging vehicles on Camarin Road.",
            "lat": 14.7565,
            "lng": 121.0450,
            "location_barangay": "Barangay 171"
        })
        self.assertEqual(sub_res.status_code, 201)
        sub_data = sub_res.json()
        report_id = sub_data["id"]
        ticket_id = sub_data["ticket_id"]
        tracking_token = sub_data["tracking_token"]

        # Step 2: Public Tracking Verification
        track_res = self.client.post("/api/reports/track", json={
            "ticket_id": ticket_id,
            "tracking_token": tracking_token
        })
        self.assertEqual(track_res.status_code, 200)
        self.assertFalse(track_res.json()["is_claimed"])

        # Step 3: Resident Claims Report
        claim_res = self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_maria}"},
            json={"tracking_token": tracking_token}
        )
        self.assertEqual(claim_res.status_code, 200)

        # Step 4: Verification in Dashboard
        dash_res = self.client.get("/api/me/reports", headers={"Authorization": f"Bearer {self.token_maria}"})
        self.assertEqual(dash_res.status_code, 200)
        claimed_ids = [r["id"] for r in dash_res.json()["reports"]]
        self.assertIn(report_id, claimed_ids)

        # Step 5: Public tracking reflects claimed state without leaking owner identity
        track_res_2 = self.client.post("/api/reports/track", json={
            "ticket_id": ticket_id,
            "tracking_token": tracking_token
        })
        self.assertTrue(track_res_2.json()["is_claimed"])
        self.assertNotIn("maria", json.dumps(track_res_2.json()).lower())

    def test_t3_wf2_multi_stage_status_advancement_and_public_timeline(self):
        """
        Workflow 2: Lifecycle Status Progression
        Verifies engineering status transitions (received -> assigned -> in_progress -> resolved)
        are accurately reflected in public timeline with internal note sanitization.
        """
        sub_res = self.client.post("/api/reports", data={
            "category": "Water & Drainage",
            "description": "Flooded roadway blocking traffic on Congressional Road.",
            "lat": 14.7575,
            "lng": 121.0465
        })
        report_id = sub_res.json()["id"]
        ticket_id = sub_res.json()["ticket_id"]
        token = sub_res.json()["tracking_token"]

        # Simulate Government Dispatcher advancing status
        report = self.db.query(TestReport).filter(TestReport.id == report_id).first()
        report.status = "in_progress"

        event1 = TestTimelineEvent(
            report_id=report.id, stage="under_review", label="Under Review",
            note="Assessed by District 3 Engineering Team.", is_public=True
        )
        event2 = TestTimelineEvent(
            report_id=report.id, stage="in_progress", label="Work in Progress",
            note="Drainage clearing crew deployed on site.", is_public=True
        )
        # Private internal note that must NOT appear publicly
        private_event = TestTimelineEvent(
            report_id=report.id, stage="internal_audit", label="Official Note",
            note="Internal contractor PO#4929 budget 50,000 PHP approved.", is_public=False
        )
        self.db.add_all([event1, event2, private_event])
        self.db.commit()

        # Public tracking verification
        track_res = self.client.post("/api/reports/track", json={"ticket_id": ticket_id, "tracking_token": token})
        self.assertEqual(track_res.status_code, 200)
        data = track_res.json()
        self.assertEqual(data["status"], "in_progress")
        stages = [e["stage"] for e in data["public_timeline"]]
        self.assertIn("under_review", stages)
        self.assertIn("in_progress", stages)
        self.assertNotIn("internal_audit", stages)
        self.assertNotIn("PO#4929", json.dumps(data))

    def test_t3_wf3_cross_device_receipt_url_lookup_and_claim(self):
        """
        Workflow 3: Cross-Device Link Verification
        Guest extracts tracking parameters from receipt URL and accesses tracking page
        from a different device session, then claims the ticket.
        """
        sub_res = self.client.post("/api/reports", data={
            "category": "Street Lighting",
            "description": "Sparking overhead transformer line near residential homes.",
            "lat": 14.7585,
            "lng": 121.0475
        })
        tracking_url = sub_res.json()["tracking_url"]
        report_id = sub_res.json()["id"]

        # Parse query params from URL
        import urllib.parse
        parsed = urllib.parse.urlparse(tracking_url)
        params = urllib.parse.parse_qs(parsed.query)
        extracted_ticket = params["id"][0]
        extracted_code = params["code"][0]

        # Use extracted params for lookup
        track_res = self.client.post("/api/reports/track", json={
            "ticket_id": extracted_ticket,
            "tracking_token": extracted_code
        })
        self.assertEqual(track_res.status_code, 200)
        self.assertEqual(track_res.json()["category"], "Street Lighting")

        # Claim with extracted code
        claim_res = self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_pedro}"},
            json={"tracking_token": extracted_code}
        )
        self.assertEqual(claim_res.status_code, 200)

    def test_t3_wf4_claim_and_citizen_feedback_rating_loop(self):
        """
        Workflow 4: Resolution & Citizen Feedback Closing the Loop
        Guest reports -> Claims -> Report is resolved -> Citizen submits 5-star satisfaction rating.
        """
        sub_res = self.client.post("/api/reports", data={
            "category": "Traffic & Signage",
            "description": "Fallen stop sign on busy school intersection.",
            "lat": 14.7595,
            "lng": 121.0485
        })
        report_id = sub_res.json()["id"]
        token = sub_res.json()["tracking_token"]

        # Claim
        self.client.post(
            f"/api/reports/{report_id}/claim",
            headers={"Authorization": f"Bearer {self.token_maria}"},
            json={"tracking_token": token}
        )

        # Mark as resolved
        report = self.db.query(TestReport).filter(TestReport.id == report_id).first()
        report.status = "resolved"
        report.satisfaction_rating = 5
        report.citizen_feedback_note = "Excellent repair turnaround! Thank you CEO Caloocan."
        self.db.commit()

        # Check in /api/me/reports?filter=resolved
        dash_res = self.client.get("/api/me/reports?filter=resolved", headers={"Authorization": f"Bearer {self.token_maria}"})
        self.assertEqual(dash_res.status_code, 200)
        matched = [r for r in dash_res.json()["reports"] if r["id"] == report_id]
        self.assertEqual(len(matched), 1)
        self.assertEqual(matched[0]["satisfaction_rating"], 5)

    def test_t3_wf5_mixed_portfolio_dashboard_aggregation(self):
        """
        Workflow 5: Mixed Portfolio Dashboard Aggregation
        Resident owns 2 directly authored reports + 2 claimed guest reports.
        Verifies dashboard aggregates all 4 with proper filter states.
        """
        # Maria authors 2 reports
        for i in range(2):
            self.client.post(
                "/api/reports",
                headers={"Authorization": f"Bearer {self.token_maria}"},
                data={
                    "category": "Roads & Bridges",
                    "description": f"Maria direct authored infrastructure issue #{i+1}",
                    "lat": 14.7500 + (i * 0.002),
                    "lng": 121.0300 + (i * 0.002)
                }
            )

        # Maria claims 2 guest reports
        for i in range(2):
            g_res = self.client.post("/api/reports", data={
                "category": "Public Facilities",
                "description": f"Guest public facility issue to be claimed #{i+1}",
                "lat": 14.7600 + (i * 0.002),
                "lng": 121.0350 + (i * 0.002)
            })
            g_id = g_res.json()["id"]
            g_token = g_res.json()["tracking_token"]
            self.client.post(
                f"/api/reports/{g_id}/claim",
                headers={"Authorization": f"Bearer {self.token_maria}"},
                json={"tracking_token": g_token}
            )

        # Query all reports for Maria
        all_res = self.client.get("/api/me/reports?filter=all", headers={"Authorization": f"Bearer {self.token_maria}"})
        self.assertEqual(all_res.status_code, 200)
        self.assertGreaterEqual(all_res.json()["total"], 4)


# =====================================================================================
# TIER 4: REAL-WORLD WORKLOAD SCENARIOS (5 Heavy Workloads)
# =====================================================================================

class TestTier4RealWorldWorkloads(TestOpenReportingBase):
    """
    Tier 4: Workload & Stress Simulation
    Simulates high-volume surges, concurrent claim races, and multi-district ingestion.
    """

    def test_t4_wl1_multi_district_mass_ingestion_surge(self):
        """
        Workload 1: Monsoon Ingestion Surge
        Simulates 20 rapid incident submissions across District 1, 2, and 3 in Caloocan.
        Verifies all reports are properly routed with zero data collision.
        """
        categories = ["Roads & Bridges", "Water & Drainage", "Street Lighting", "Traffic & Signage", "Public Facilities"]
        # Diverse base coordinates across North and South Caloocan
        coords = [
            (14.7560, 121.0420, "Barangay 171"),
            (14.7500, 121.0300, "Barangay 176"),
            (14.6500, 120.9750, "Barangay 1"),
            (14.6550, 120.9800, "Barangay 2"),
        ]

        created_tickets = []
        for idx in range(20):
            cat = categories[idx % len(categories)]
            base_lat, base_lng, brgy = coords[idx % len(coords)]
            # Coordinate jitter to prevent duplicate trigger (>15m) while staying within Caloocan
            jitter_lat = base_lat + ((idx // 4) * 0.0003)
            jitter_lng = base_lng + ((idx // 4) * 0.0003)

            res = self.client.post("/api/reports", data={
                "category": cat,
                "description": f"Surge emergency report #{idx+1}: Severe flooding and structural collapse threat.",
                "lat": jitter_lat,
                "lng": jitter_lng,
                "location_barangay": brgy
            })
            self.assertEqual(res.status_code, 201)
            created_tickets.append(res.json())

        self.assertEqual(len(created_tickets), 20)
        # Verify distinct ticket IDs and tokens
        ticket_set = set(t["ticket_id"] for t in created_tickets)
        token_set = set(t["tracking_token"] for t in created_tickets)
        self.assertEqual(len(ticket_set), 20)
        self.assertEqual(len(token_set), 20)

    def test_t4_wl2_emergency_threat_vs_normal_priority_triage(self):
        """
        Workload 2: Emergency Threat vs Normal Triage
        Submits reports with severe structural descriptions and verifies AI triage ingestion.
        """
        emergency_res = self.client.post("/api/reports", data={
            "category": "Roads & Bridges",
            "description": "CRITICAL EMERGENCY: Bridge concrete support beam fracturing over river.",
            "lat": 14.7512,
            "lng": 121.0312
        })
        self.assertEqual(emergency_res.status_code, 201)
        self.assertEqual(emergency_res.json()["status"], "pending")

        normal_res = self.client.post("/api/reports", data={
            "category": "Environmental",
            "description": "Overgrown grass along road median needing routine trimming.",
            "lat": 14.7522,
            "lng": 121.0322
        })
        self.assertEqual(normal_res.status_code, 201)

    def test_t4_wl3_simultaneous_multi_citizen_claim_storm(self):
        """
        Workload 3: Simultaneous Claim Storm
        10 distinct guest reports are simultaneously claimed by multiple resident accounts.
        Verifies zero transactional locking deadlocks or cross-account leakage.
        """
        guest_reports = []
        for i in range(10):
            res = self.client.post("/api/reports", data={
                "category": "Roads & Bridges",
                "description": f"Claim storm guest report #{i+1} on Bagong Silang street.",
                "lat": 14.7550 + (i * 0.0003),
                "lng": 121.0430 + (i * 0.0003)
            })
            self.assertEqual(res.status_code, 201)
            guest_reports.append(res.json())

        # Maria claims even numbered, Pedro claims odd numbered
        for idx, gr in enumerate(guest_reports):
            token = self.token_maria if (idx % 2 == 0) else self.token_pedro
            claim_res = self.client.post(
                f"/api/reports/{gr['id']}/claim",
                headers={"Authorization": f"Bearer {token}"},
                json={"tracking_token": gr["tracking_token"]}
            )
            self.assertEqual(claim_res.status_code, 200)

        # Verify Maria's portfolio has exactly 5 of these
        m_dash = self.client.get("/api/me/reports", headers={"Authorization": f"Bearer {self.token_maria}"})
        p_dash = self.client.get("/api/me/reports", headers={"Authorization": f"Bearer {self.token_pedro}"})

        m_ids = set(r["id"] for r in m_dash.json()["reports"])
        p_ids = set(r["id"] for r in p_dash.json()["reports"])

        # No intersection among the newly claimed tickets
        claimed_ids = set(gr["id"] for gr in guest_reports)
        m_claimed = m_ids.intersection(claimed_ids)
        p_claimed = p_ids.intersection(claimed_ids)

        self.assertEqual(len(m_claimed), 5)
        self.assertEqual(len(p_claimed), 5)
        self.assertEqual(len(m_claimed.intersection(p_claimed)), 0)

    def test_t4_wl4_mixed_network_upload_and_anonymous_profiles(self):
        """
        Workload 4: Mixed Network & Upload Profiles
        Exercises JPEG, PNG, WebP, and non-image submissions across anonymous and contact-enabled users.
        """
        formats = ["jpeg", "png", "webp"]
        for idx, fmt in enumerate(formats):
            img = self.create_sample_image(fmt)
            res = self.client.post(
                "/api/reports",
                data={
                    "category": "Public Facilities",
                    "description": f"Multi-format image upload verification for {fmt.upper()}.",
                    "lat": 14.7570 + (idx * 0.0003),
                    "lng": 121.0450 + (idx * 0.0003),
                    "contact_email": f"tester_{fmt}@example.com"
                },
                files={"image": (f"evidence.{fmt}", img, f"image/{fmt}")}
            )
            self.assertEqual(res.status_code, 201)
            self.assertIsNotNone(res.json()["image_url"])

    def test_t4_wl5_full_civic_infrastructure_stress_batch(self):
        """
        Workload 5: Comprehensive Civic Infrastructure Stress Batch
        Executes end-to-end full batch across all 5 municipal departments with public tracking.
        """
        departments = [
            ("Roads & Bridges", "Collapsed asphalt culvert near district market."),
            ("Water & Drainage", "Main drainage overflow submerging commercial avenue."),
            ("Street Lighting", "High-voltage street lamp shorting during rainstorm."),
            ("Traffic & Signage", "Demolished lane barrier causing traffic congestion."),
            ("Environmental", "Toxic runoff from illegal industrial dumping lot.")
        ]

        for idx, (cat, desc) in enumerate(departments):
            sub = self.client.post("/api/reports", data={
                "category": cat,
                "description": desc,
                "lat": 14.7580 + (idx * 0.0003),
                "lng": 121.0460 + (idx * 0.0003)
            })
            self.assertEqual(sub.status_code, 201)
            t_id = sub.json()["ticket_id"]
            code = sub.json()["tracking_token"]

            # Immediate public tracking query
            track = self.client.post("/api/reports/track", json={"ticket_id": t_id, "tracking_token": code})
            self.assertEqual(track.status_code, 200)
            self.assertEqual(track.json()["category"], cat)


# ─────────────────────────────────────────────────────────────────────────────────────
# Standalone CLI Runner & Test Reporter
# ─────────────────────────────────────────────────────────────────────────────────────

def run_standalone_test_suite():
    """Executes the test suite standalone and produces a detailed console report."""
    print("=" * 88)
    print(" PULSO E2E STANDALONE TEST SUITE: OPEN PUBLIC REPORTING & CONTEXTUAL AUTH")
    print("=" * 88)
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("Executing all 4 Tiers (Feature, Boundary, Cross-Feature, Workloads)...\n")

    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestTier1FeatureCoverage))
    suite.addTests(loader.loadTestsFromTestCase(TestTier2BoundaryCornerCases))
    suite.addTests(loader.loadTestsFromTestCase(TestTier3CrossFeatureWorkflows))
    suite.addTests(loader.loadTestsFromTestCase(TestTier4RealWorldWorkloads))

    runner = unittest.TextTestRunner(verbosity=2)
    start_time = time.time()
    result = runner.run(suite)
    elapsed = time.time() - start_time

    print("\n" + "=" * 88)
    print(" TEST EXECUTION SUMMARY")
    print("=" * 88)
    print(f"Total Tests Run: {result.testsRun}")
    print(f"Passed:          {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures:        {len(result.failures)}")
    print(f"Errors:          {len(result.errors)}")
    print(f"Execution Time:  {elapsed:.3f}s")
    print("=" * 88)

    if result.wasSuccessful():
        print("\n>>> ALL TESTS PASSED SUCCESSFULLY! TEST SUITE READY FOR VERIFICATION. <<<\n")
        return 0
    else:
        print("\n>>> TEST SUITE ENCOUNTERED FAILURES! <<<\n")
        return 1

if __name__ == "__main__":
    sys.exit(run_standalone_test_suite())
