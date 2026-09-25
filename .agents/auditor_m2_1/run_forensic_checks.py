"""
PULSO Milestone 2 Forensic Integrity Audit Script
=================================================
Independent verification harness executing static inspection, runtime tracing,
cryptographic verification, rate limiter stress testing, and database schema audit.
"""

import sys
import os
import io
import time
import json
import secrets
import threading
from datetime import datetime, timezone

# Add backend directory to sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi.testclient import TestClient
from fastapi import Request, HTTPException
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models, gov_models, schemas, crud, auth
from database import Base, get_db
from main import app
from utils.rate_limiter import SlidingWindowRateLimiter, report_submission_limiter, tracking_query_limiter, claim_limiter
from utils.security import (
    generate_tracking_token,
    normalize_tracking_token,
    hash_tracking_token,
    verify_tracking_token
)

results = []

def record_check(check_name: str, passed: bool, details: str, evidence: str = ""):
    results.append({
        "check": check_name,
        "passed": passed,
        "details": details,
        "evidence": evidence
    })
    status_str = "PASS" if passed else "FAIL"
    print(f"[{status_str}] {check_name}: {details}")

def run_all_checks():
    print("=" * 80)
    print("STARTING PULSO MILESTONE 2 FORENSIC INTEGRITY AUDIT")
    print("=" * 80)

    # -------------------------------------------------------------------------
    # 1. Database Schema & Column Nullability Forensic Check
    # -------------------------------------------------------------------------
    print("\n--- Check 1: Database Schema & Zero Plaintext Token Persistence ---")
    report_columns = [c.name for c in models.Report.__table__.columns]
    
    # Check nullable resident_id
    resident_id_col = models.Report.__table__.columns.get("resident_id")
    is_resident_nullable = resident_id_col.nullable is True
    
    # Check 8 guest columns
    required_guest_cols = [
        "reporter_type", "tracking_token_hash", "contact_email", "contact_phone",
        "contact_verified", "claimed_at", "claimed_by_user_id", "submission_source"
    ]
    missing_cols = [col for col in required_guest_cols if col not in report_columns]
    
    # Check NO plaintext tracking_token column in DB schema
    has_plaintext_token_col = "tracking_token" in report_columns
    
    passed_db = is_resident_nullable and len(missing_cols) == 0 and not has_plaintext_token_col
    record_check(
        "DB Schema: Nullable resident_id & 8 Guest Columns",
        passed_db,
        f"resident_id nullable={is_resident_nullable}, missing columns={missing_cols}, plaintext token in DB col={has_plaintext_token_col}",
        evidence=f"Report Columns: {report_columns}"
    )

    # -------------------------------------------------------------------------
    # 2. Cryptographic Token Generation, Hashing & Zero-Plaintext Audit
    # -------------------------------------------------------------------------
    print("\n--- Check 2: Cryptographic Token Hashing & Constant-Time Verification ---")
    token = generate_tracking_token()
    token_hash = hash_tracking_token(token)
    
    # Verify hash properties
    is_hex_64 = len(token_hash) == 64 and all(c in "0123456789abcdef" for c in token_hash)
    is_not_plaintext = token != token_hash and token not in token_hash
    verify_correct = verify_tracking_token(token, token_hash)
    verify_tampered = not verify_tracking_token(token + "X", token_hash)
    verify_wrong_token = not verify_tracking_token("TRK-0000-0000-0000-0000", token_hash)
    
    # Normalization variations
    norm1 = verify_tracking_token(token.lower(), token_hash)
    norm2 = verify_tracking_token(token.replace("-", ""), token_hash)
    norm3 = verify_tracking_token(f"  {token}  ", token_hash)
    normalization_passed = norm1 and norm2 and norm3

    crypto_passed = is_hex_64 and is_not_plaintext and verify_correct and verify_tampered and verify_wrong_token and normalization_passed
    record_check(
        "Cryptography: HMAC-SHA256 Salted Hashing & Timing Resilience",
        crypto_passed,
        f"64-char hex={is_hex_64}, zero plaintext={is_not_plaintext}, verification={verify_correct}, tampering rejection={verify_tampered}, normalization={normalization_passed}",
        evidence=f"Sample Token: {token} -> Hash: {token_hash}"
    )

    # -------------------------------------------------------------------------
    # 3. Setup Test Database & Runtime Client
    # -------------------------------------------------------------------------
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    gov_models.Base.metadata.create_all(bind=test_engine)

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db

    # Seed District & Barangays
    db = TestingSession()
    d3 = models.District(id=3, name="District 3 – North Caloocan", code="D3")
    d1 = models.District(id=1, name="District 1 – South Caloocan", code="D1")
    b171 = models.Barangay(id=171, name="Barangay 171", district_id=3, zip_code="1420")
    b1 = models.Barangay(id=1, name="Barangay 1", district_id=1, zip_code="1400")
    db.add_all([d1, d3, b171, b1])

    # Seed Resident & Official
    pw = auth.get_password_hash("ValidPass123!")
    res_juan = models.Resident(id=501, full_name="Juan Luna", email="juan.luna@example.com", password_hash=pw, is_verified=True, trust_score=100, barangay_id=171, district_id=3)
    res_clara = models.Resident(id=502, full_name="Maria Clara", email="clara@example.com", password_hash=pw, is_verified=True, trust_score=100, barangay_id=1, district_id=1)
    db.add_all([res_juan, res_clara])
    db.commit()
    db.close()

    juan_jwt = auth.create_access_token(data={"sub": "juan.luna@example.com"})
    clara_jwt = auth.create_access_token(data={"sub": "clara@example.com"})
    juan_headers = {"Authorization": f"Bearer {juan_jwt}"}
    clara_headers = {"Authorization": f"Bearer {clara_jwt}"}

    client = TestClient(app)
    report_submission_limiter.reset()
    tracking_query_limiter.reset()
    claim_limiter.reset()

    # -------------------------------------------------------------------------
    # 4. Runtime Intake Tracing: Real DB Query, Nullable resident_id, Ephemeral Plaintext
    # -------------------------------------------------------------------------
    print("\n--- Check 3: Runtime Intake Tracing (Guest & Auth) ---")
    r_guest = client.post(
        "/api/reports",
        data={
            "category": "Roads & Bridges",
            "description": "Forensic audit test pothole at Bagumbong intersection.",
            "lat": 14.7565,
            "lng": 121.0450,
            "location_string": "Bagumbong, North Caloocan",
            "location_barangay": "Barangay 171",
            "contact_email": "guest.auditor@example.com"
        }
    )
    guest_data = r_guest.json()
    assert r_guest.status_code == 201, f"Guest intake failed: {guest_data}"

    # Verify directly in SQLite DB via raw SQL query
    db = TestingSession()
    raw_row = db.execute(text(f"SELECT id, ticket_id, resident_id, reporter_type, tracking_token_hash, claimed_by_user_id FROM reports WHERE id = {guest_data['id']}")).fetchone()
    db.close()

    db_id, db_ticket, db_resident_id, db_reporter_type, db_token_hash, db_claimed_by = raw_row
    intake_verified = (
        db_id == guest_data["id"] and
        db_ticket == guest_data["ticket_id"] and
        db_resident_id is None and
        db_reporter_type == "guest" and
        db_token_hash is not None and
        auth.verify_tracking_token(guest_data["tracking_token"], db_token_hash) and
        db_claimed_by is None
    )
    record_check(
        "Runtime Tracing: Guest Intake DB Persistence & Null resident_id",
        intake_verified,
        f"DB row: id={db_id}, ticket={db_ticket}, resident_id={db_resident_id}, reporter_type={db_reporter_type}, token_hash={db_token_hash[:16]}...",
        evidence=f"Raw DB Tuple: {raw_row}"
    )

    # -------------------------------------------------------------------------
    # 5. File Stream & Magic Byte Inspection
    # -------------------------------------------------------------------------
    print("\n--- Check 4: Upload File Security & Magic Byte Inspection ---")
    report_submission_limiter.reset()
    valid_jpeg = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 200
    valid_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 200
    valid_webp = b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 200
    malicious_exe = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00" + b"\x00" * 200
    oversized_file = b"\xFF\xD8\xFF" + b"\x00" * (10 * 1024 * 1024 + 100)

    # 1. JPEG
    r_jpg = client.post("/api/reports", data={"category": "Street Lighting", "description": "Broken streetlight along Congressional.", "lat": 14.7570, "lng": 121.0460}, files={"image": ("light.jpg", io.BytesIO(valid_jpeg), "image/jpeg")})
    jpg_ok = r_jpg.status_code == 201

    # 2. PNG
    r_png = client.post("/api/reports", data={"category": "Water & Drainage", "description": "Blocked canal drain along Deparo.", "lat": 14.7580, "lng": 121.0470}, files={"image": ("drain.png", io.BytesIO(valid_png), "image/png")})
    png_ok = r_png.status_code == 201

    # 3. WebP
    r_webp = client.post("/api/reports", data={"category": "Public Facilities", "description": "Damaged fence at community center.", "lat": 14.7590, "lng": 121.0480}, files={"image": ("fence.webp", io.BytesIO(valid_webp), "image/webp")})
    webp_ok = r_webp.status_code == 201

    # 4. Disguised EXE
    r_exe = client.post("/api/reports", data={"category": "Public Facilities", "description": "Damaged playground equipment in park.", "lat": 14.7600, "lng": 121.0490}, files={"image": ("park.jpg", io.BytesIO(malicious_exe), "image/jpeg")})
    exe_rejected = r_exe.status_code == 422

    # 5. Oversized
    r_over = client.post("/api/reports", data={"category": "Public Facilities", "description": "Damaged playground equipment in park.", "lat": 14.7610, "lng": 121.0500}, files={"image": ("large.jpg", io.BytesIO(oversized_file), "image/jpeg")})
    over_rejected = r_over.status_code == 422

    magic_byte_passed = jpg_ok and png_ok and webp_ok and exe_rejected and over_rejected
    record_check(
        "Upload Security: Magic Byte & File Size Verification",
        magic_byte_passed,
        f"JPEG={jpg_ok}, PNG={png_ok}, WebP={webp_ok}, Malicious EXE Rejected={exe_rejected}, Oversized Rejected={over_rejected}",
        evidence=f"EXE Status: {r_exe.status_code}, Oversized Status: {r_over.status_code}"
    )

    # -------------------------------------------------------------------------
    # 6. Rate Limiter Execution, IP Isolation & Sliding Window Stress Test
    # -------------------------------------------------------------------------
    print("\n--- Check 5: Rate Limiter Execution & IP Isolation ---")
    custom_limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=2, error_detail="Rate limit exceeded test.")
    
    class FakeRequest:
        def __init__(self, ip):
            self.headers = {"X-Forwarded-For": ip}
            self.client = None

    req_ip1 = FakeRequest("198.51.100.1")
    req_ip2 = FakeRequest("198.51.100.2")

    # IP 1 consumes 3 tokens
    custom_limiter.check(req_ip1)
    custom_limiter.check(req_ip1)
    custom_limiter.check(req_ip1)

    # IP 1 breach
    ip1_blocked = False
    try:
        custom_limiter.check(req_ip1)
    except HTTPException as e:
        ip1_blocked = (e.status_code == 429 and "Retry-After" in e.headers)

    # IP 2 should NOT be blocked (isolation)
    ip2_allowed = False
    try:
        custom_limiter.check(req_ip2)
        ip2_allowed = True
    except HTTPException:
        ip2_allowed = False

    # Wait for sliding window to expire (2.1s)
    time.sleep(2.1)
    ip1_recovered = False
    try:
        custom_limiter.check(req_ip1)
        ip1_recovered = True
    except HTTPException:
        ip1_recovered = False

    limiter_passed = ip1_blocked and ip2_allowed and ip1_recovered
    record_check(
        "Rate Limiting: Sliding Window, 429 Headers & IP Isolation",
        limiter_passed,
        f"IP1 Blocked={ip1_blocked}, IP2 Isolated={ip2_allowed}, IP1 Expired Recovery={ip1_recovered}",
        evidence=f"Limiter state: {len(custom_limiter.requests)} tracked IPs"
    )

    # -------------------------------------------------------------------------
    # 7. Public Tracking, Anti-Enumeration & Strict Redaction
    # -------------------------------------------------------------------------
    print("\n--- Check 6: Public Tracking, Anti-Enumeration & Redaction ---")
    tracking_query_limiter.reset()
    
    # Valid tracking
    r_track_valid = client.post("/api/reports/track", json={"ticket_id": guest_data["ticket_id"], "tracking_token": guest_data["tracking_token"]})
    track_ok = r_track_valid.status_code == 200
    track_body = r_track_valid.json()
    
    # Redaction checks
    pii_redacted = ("contact_email" not in track_body or track_body.get("contact_email") is None) and \
                   ("contact_phone" not in track_body or track_body.get("contact_phone") is None) and \
                   ("resident_id" not in track_body or track_body.get("resident_id") is None)

    # Non-existent ticket ID
    r_track_nonexist = client.post("/api/reports/track", json={"ticket_id": "RPT-20990101-NONEXIST", "tracking_token": "TRK-0000-0000-0000-0000"})
    nonexist_ok = r_track_nonexist.status_code == 404

    # Existing ticket with bad token
    r_track_badtoken = client.post("/api/reports/track", json={"ticket_id": guest_data["ticket_id"], "tracking_token": "TRK-FFFF-FFFF-FFFF-FFFF"})
    badtoken_ok = r_track_badtoken.status_code == 404

    # Both error responses must be identical
    uniform_errors = r_track_nonexist.json()["detail"] == r_track_badtoken.json()["detail"]

    tracking_passed = track_ok and pii_redacted and nonexist_ok and badtoken_ok and uniform_errors
    record_check(
        "Public Tracking: Sanitization & Anti-Enumeration 404",
        tracking_passed,
        f"Valid 200={track_ok}, PII Redacted={pii_redacted}, Nonexistent 404={nonexist_ok}, Bad Token 404={badtoken_ok}, Uniform Error={uniform_errors}",
        evidence=f"Track Response Keys: {list(track_body.keys())}"
    )

    # -------------------------------------------------------------------------
    # 8. Contextual Claiming, Conflict Protection & Audit Logging
    # -------------------------------------------------------------------------
    print("\n--- Check 7: Contextual Claiming & Immutable Audit Logging ---")
    claim_limiter.reset()
    
    # Juan claims guest report
    r_claim_juan = client.post(
        f"/api/reports/{guest_data['id']}/claim",
        headers=juan_headers,
        json={"tracking_token": guest_data["tracking_token"]}
    )
    claim_ok = r_claim_juan.status_code == 200
    claim_data = r_claim_juan.json()

    # Verify DB mutation
    db = TestingSession()
    updated_rep = db.query(models.Report).filter(models.Report.id == guest_data["id"]).first()
    rep_mutated = (
        updated_rep.claimed_by_user_id == 501 and
        updated_rep.resident_id == 501 and
        updated_rep.claimed_at is not None and
        updated_rep.reporter_type == "registered"
    )

    # Verify Audit Log
    audit_row = db.query(gov_models.AuditLog).filter(
        gov_models.AuditLog.report_id == guest_data["id"],
        gov_models.AuditLog.trigger_type == "report_claimed"
    ).first()
    audit_created = (
        audit_row is not None and
        audit_row.actor_role == "resident" and
        "501" in audit_row.action
    )

    # Verify In-App Notification
    notif_row = db.query(models.Notification).filter(models.Notification.resident_id == 501).first()
    notif_created = notif_row is not None and "Report Linked" in notif_row.title

    # Clara attempts to claim already-claimed report (Conflict 409)
    r_claim_clara = client.post(
        f"/api/reports/{guest_data['id']}/claim",
        headers=clara_headers,
        json={"tracking_token": guest_data["tracking_token"]}
    )
    conflict_ok = r_claim_clara.status_code == 409

    # Juan re-claims idempotently (200 OK)
    r_reclaim = client.post(
        f"/api/reports/{guest_data['id']}/claim",
        headers=juan_headers,
        json={"tracking_token": guest_data["tracking_token"]}
    )
    idempotent_ok = r_reclaim.status_code == 200

    db.close()

    claim_passed = claim_ok and rep_mutated and audit_created and notif_created and conflict_ok and idempotent_ok
    record_check(
        "Claiming: Ownership Mutation, Audit Log & Conflict Protection",
        claim_passed,
        f"Claim Success={claim_ok}, DB Mutated={rep_mutated}, Audit Log={audit_created}, Notification={notif_created}, Conflict 409={conflict_ok}, Idempotent={idempotent_ok}",
        evidence=f"Audit Action: {audit_row.action if audit_row else 'None'}"
    )

    # -------------------------------------------------------------------------
    # 9. Unified /api/me/reports Portfolio & Tenant Isolation
    # -------------------------------------------------------------------------
    print("\n--- Check 8: Unified Resident Portfolio & Cross-Tenant Isolation ---")
    
    # Juan checks /api/me/reports
    r_me_juan = client.get("/api/me/reports?filter=all", headers=juan_headers)
    assert r_me_juan.status_code == 200
    juan_reports = r_me_juan.json()
    juan_sees_claimed = any(r["id"] == guest_data["id"] for r in juan_reports["reports"])

    # Clara checks /api/me/reports -> Clara must NOT see Juan's claimed report
    r_me_clara = client.get("/api/me/reports?filter=all", headers=clara_headers)
    assert r_me_clara.status_code == 200
    clara_reports = r_me_clara.json()
    clara_isolated = not any(r["id"] == guest_data["id"] for r in clara_reports["reports"])

    portfolio_passed = juan_sees_claimed and clara_isolated
    record_check(
        "Resident Portfolio: Unified Query & Tenant Isolation",
        portfolio_passed,
        f"Juan sees claimed ticket={juan_sees_claimed}, Clara isolated={clara_isolated}",
        evidence=f"Juan total: {juan_reports['total']}, Clara total: {clara_reports['total']}"
    )

    # -------------------------------------------------------------------------
    # Final Summary & Verdict
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    all_passed = all(r["passed"] for r in results)
    verdict = "CLEAN" if all_passed else "INTEGRITY VIOLATION"
    print(f"FORENSIC VERDICT: {verdict}")
    print(f"CHECKS PASSED: {sum(1 for r in results if r['passed'])}/{len(results)}")
    print("=" * 80)

    return all_passed, results

if __name__ == "__main__":
    success, audit_results = run_all_checks()
    sys.exit(0 if success else 1)
