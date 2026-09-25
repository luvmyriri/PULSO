"""
independent_audit_test.py
Independent Forensic Verification & Stress Testing for PULSO Milestone 1
"""

import sys
import os
import re
import secrets
import hashlib
import hmac
import time
from datetime import datetime, timezone, timedelta

# Path resolution
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BACKEND_DIR = os.path.join(REPO_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from jose import jwt

import models
import schemas
import auth
import utils.security
from database import Base
from migrate_guest_reporting import run_migration

def log_check(name, passed, details=""):
    status = "PASS" if passed else "FAIL"
    symbol = "[+]" if passed else "[-]"
    print(f"{symbol} [{status}] {name}: {details}")
    if not passed:
        raise AssertionError(f"Check failed: {name} - {details}")

def run_all_checks():
    print("\n" + "=" * 70)
    print("  FORENSIC INTEGRITY AUDIT: PULSO MILESTONE 1")
    print("=" * 70)

    # ---------------------------------------------------------
    # 1. STATIC CODE & COLUMN STRUCTURE AUDIT
    # ---------------------------------------------------------
    print("\n--- Phase 1: Model & Schema AST / Structure Verification ---")
    
    report_cols = {c.name: c for c in models.Report.__table__.columns}
    
    # Check nullable resident_id
    log_check(
        "Report.resident_id is nullable",
        report_cols["resident_id"].nullable is True,
        f"nullable={report_cols['resident_id'].nullable}"
    )

    # Check new guest columns
    required_cols = {
        "reporter_type": "VARCHAR(20)",
        "tracking_token_hash": "VARCHAR(128)",
        "contact_email": "VARCHAR(255)",
        "contact_phone": "VARCHAR(50)",
        "contact_verified": "BOOLEAN",
        "claimed_at": "DATETIME(timezone=True)",
        "claimed_by_user_id": "INTEGER",
        "submission_source": "VARCHAR(30)",
    }

    for col_name in required_cols:
        exists = col_name in report_cols
        log_check(f"Report table has column '{col_name}'", exists, f"found in models.Report.__table__.columns")

    # Verify tracking_token is NEVER a column on Report table
    log_check(
        "Zero plaintext tracking_token column in Report table",
        "tracking_token" not in report_cols,
        "Confirmed: tracking_token is NOT persisted in DB table"
    )

    # Verify schemas.ReportResponse does NOT have tracking_token_hash
    log_check(
        "ReportResponse excludes tracking_token_hash",
        "tracking_token_hash" not in schemas.ReportResponse.model_fields,
        "Confirmed: tracking_token_hash is excluded from API serialization"
    )

    # Verify schemas.ReportTrackResponse redaction
    prohibited_track_fields = ["resident_id", "contact_email", "contact_phone", "ai_reasoning", "ai_metadata", "tracking_token_hash", "internal_notes"]
    leaked_track_fields = [f for f in prohibited_track_fields if f in schemas.ReportTrackResponse.model_fields]
    log_check(
        "ReportTrackResponse PII & internal field redaction",
        len(leaked_track_fields) == 0,
        f"Leaked fields: {leaked_track_fields}"
    )

    # ---------------------------------------------------------
    # 2. CRYPTOGRAPHIC & CSPRNG ENTROPY AUDIT
    # ---------------------------------------------------------
    print("\n--- Phase 2: Cryptographic & Entropy Audit ---")

    # Format verification
    sample_token = auth.generate_tracking_token()
    token_regex = re.compile(r"^TRK-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$")
    log_check("Token format TRK-XXXX-XXXX-XXXX-XXXX", bool(token_regex.match(sample_token)), f"Sample: {sample_token}")

    sample_128 = auth.generate_tracking_token_128bit()
    token_128_regex = re.compile(r"^TRK-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$")
    log_check("128-bit Token format", bool(token_128_regex.match(sample_128)), f"Sample: {sample_128}")

    # CSPRNG Collision test (50,000 tokens)
    print("  [>] Generating 50,000 tracking tokens to test CSPRNG entropy & collisions...")
    start_time = time.time()
    generated_set = set()
    for _ in range(50000):
        t = auth.generate_tracking_token()
        generated_set.add(t)
    duration = time.time() - start_time
    log_check("50,000 Token CSPRNG Collision Test (0 collisions)", len(generated_set) == 50000, f"50k tokens generated in {duration:.2f}s with 0 collisions")

    # Normalization test across messy user inputs
    canon = "TRK-9F83-A8B2-C4E6-10D7"
    canon_hash = auth.hash_tracking_token(canon)
    test_variations = [
        "trk-9f83-a8b2-c4e6-10d7",
        "TRK 9F83 A8B2 C4E6 10D7",
        "  9f83a8b2c4e610d7  ",
        "trk_9f83_a8b2_c4e6_10d7",
        "9F83-A8B2-C4E6-10D7",
        "TRK-9f83-a8b2-c4e6-10d7"
    ]
    all_var_match = all(auth.hash_tracking_token(v) == canon_hash for v in test_variations)
    log_check("Token normalization invariance", all_var_match, f"All 6 dirty formats mapped to {canon_hash}")

    # Constant time verification
    valid_verif = auth.verify_tracking_token(canon, canon_hash)
    tampered_verif = auth.verify_tracking_token("TRK-9F83-A8B2-C4E6-10D8", canon_hash)
    empty_verif = auth.verify_tracking_token("", canon_hash)
    none_verif = auth.verify_tracking_token(None, canon_hash)
    log_check("Constant-time verification accuracy", valid_verif and not tampered_verif and not empty_verif and not none_verif, "Positive, Negative, Empty, Null checked")

    # ---------------------------------------------------------
    # 3. OPTIONAL AUTHENTICATION DEPENDENCY AUDIT
    # ---------------------------------------------------------
    print("\n--- Phase 3: Optional Authentication Dependency Audit ---")

    engine = create_engine("sqlite:///:memory:", poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Create test resident & official
    res = models.Resident(id=1, full_name="Juan Cruz", email="juan@caloocan.ph", password_hash="pass", is_verified=True)
    unverified_res = models.Resident(id=2, full_name="Pedro Unverified", email="pedro@caloocan.ph", password_hash="pass", is_verified=False)
    off = models.Official(id=1, full_name="Engr. Santos", email="santos@caloocan.gov.ph", password_hash="pass", role="staff")
    db.add_all([res, unverified_res, off])
    db.commit()

    def make_jwt(sub, expired=False):
        exp = datetime.now(timezone.utc) + (timedelta(hours=-1) if expired else timedelta(hours=1))
        return jwt.encode({"sub": sub, "exp": exp}, auth.SECRET_KEY, algorithm=auth.ALGORITHM)

    # Test None token (Guest mode)
    u_none = auth.get_optional_current_user(token=None, db=db)
    log_check("Missing token returns None (guest mode)", u_none is None, "No exception raised")

    # Test Empty token
    u_empty = auth.get_optional_current_user(token="", db=db)
    log_check("Empty token returns None", u_empty is None, "No exception raised")

    # Test Valid Resident
    u_res = auth.get_optional_current_user(token=make_jwt("juan@caloocan.ph"), db=db)
    log_check("Valid resident JWT resolves resident", u_res is not None and u_res.email == "juan@caloocan.ph", f"Resolved: {u_res}")

    # Test Unverified Resident -> None
    u_unv = auth.get_optional_current_user(token=make_jwt("pedro@caloocan.ph"), db=db)
    log_check("Unverified resident returns None (guest mode)", u_unv is None, "Unverified user not treated as authenticated")

    # Test Valid Official
    u_off = auth.get_optional_current_user(token=make_jwt("santos@caloocan.gov.ph"), db=db)
    log_check("Valid official JWT resolves official", u_off is not None and u_off.email == "santos@caloocan.gov.ph", f"Resolved: {u_off}")

    # Test Expired JWT
    u_exp = auth.get_optional_current_user(token=make_jwt("juan@caloocan.ph", expired=True), db=db)
    log_check("Expired JWT gracefully returns None", u_exp is None, "No 401 exception raised")

    # Test Garbage JWT
    u_garb = auth.get_optional_current_user(token="invalid_token_header_string", db=db)
    log_check("Garbage JWT gracefully returns None", u_garb is None, "No exception raised")

    # ---------------------------------------------------------
    # 4. MIGRATION EXECUTION & IDEMPOTENCY AUDIT
    # ---------------------------------------------------------
    print("\n--- Phase 4: Migration Execution & Idempotency Audit ---")

    mig_engine = create_engine("sqlite:///:memory:", poolclass=StaticPool)
    with mig_engine.connect() as conn:
        conn.execute(text("CREATE TABLE residents (id INTEGER PRIMARY KEY, full_name VARCHAR, email VARCHAR UNIQUE);"))
        conn.execute(text("CREATE TABLE reports (id INTEGER PRIMARY KEY, ticket_id VARCHAR UNIQUE, resident_id INTEGER, category VARCHAR, description TEXT, status VARCHAR DEFAULT 'pending');"))
        conn.execute(text("INSERT INTO residents (id, full_name, email) VALUES (1, 'Legacy Resident', 'leg@ph.gov');"))
        conn.execute(text("INSERT INTO reports (id, ticket_id, resident_id, category, description) VALUES (10, 'RPT-OLD-1', 1, 'Road', 'Legacy ticket');"))
        conn.commit()

    # Pass 1
    m1 = run_migration(mig_engine)
    # Pass 2
    m2 = run_migration(mig_engine)
    # Pass 3
    m3 = run_migration(mig_engine)

    log_check("Migration executed 3 times with idempotency", m1 and m2 and m3, "3 consecutive runs succeeded without errors")

    with mig_engine.connect() as conn:
        inspector = inspect(conn)
        cols = {c["name"] for c in inspector.get_columns("reports")}
        for col_name in required_cols:
            log_check(f"Migrated DB has column '{col_name}'", col_name in cols, "Inspected via SQLAlchemy inspector")

        legacy_row = conn.execute(text("SELECT * FROM reports WHERE ticket_id = 'RPT-OLD-1'")).mappings().fetchone()
        log_check(
            "Legacy data preservation and default backfill",
            legacy_row["reporter_type"] == "registered" and legacy_row["submission_source"] == "web" and legacy_row["resident_id"] == 1,
            f"Row: {dict(legacy_row)}"
        )

    # ---------------------------------------------------------
    # 5. RUNTIME ORM & CLAIMING LIFECYCLE AUDIT
    # ---------------------------------------------------------
    print("\n--- Phase 5: Runtime ORM & Claiming Lifecycle Audit ---")

    token = auth.generate_tracking_token()
    token_hash = auth.hash_tracking_token(token)

    guest_report = models.Report(
        ticket_id="RPT-20260902-FORENSIC-01",
        resident_id=None,
        reporter_type="guest",
        tracking_token_hash=token_hash,
        category="Public Works",
        description="Fallen tree blocking intersection",
        contact_email="citizen@caloocan.ph",
        submission_source="web"
    )
    db.add(guest_report)
    db.commit()
    db.refresh(guest_report)

    log_check("Guest report saved with NULL resident_id", guest_report.resident_id is None, f"ID={guest_report.id}")
    log_check("Guest report is_claimed is False", guest_report.is_claimed is False, "Initial state unlinked")
    log_check("Guest report reporter_name is 'Guest Reporter'", guest_report.reporter_name == "Guest Reporter", f"reporter_name={guest_report.reporter_name}")

    # Contextual Claim Execution
    claim_dt = datetime.now(timezone.utc)
    guest_report.claimed_by_user_id = res.id
    guest_report.claimed_at = claim_dt
    guest_report.resident_id = res.id
    guest_report.reporter_type = "registered"
    db.commit()
    db.refresh(guest_report)
    db.refresh(res)

    log_check("Claimed report is_claimed is True", guest_report.is_claimed is True, "State updated")
    log_check("Claimed report linked to Resident relationship", guest_report in res.claimed_reports, "res.claimed_reports contains report")
    log_check("Claimed report claimed_by points to Resident", guest_report.claimed_by.email == "juan@caloocan.ph", f"Claimed by: {guest_report.claimed_by.full_name}")

    print("\n" + "=" * 70)
    print("  ALL FORENSIC CHECKS PASSED: VERDICT = CLEAN")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    run_all_checks()
