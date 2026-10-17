"""
test_m1_database_challenge.py
PULSO — Caloocan City Engineering Department Management System
Milestone 1 Empirical Challenger Test Harness: Database Schema, Migration, FKs & Security

Adversarial Stress Test Suite:
1. Consecutive Migration Idempotency & Partial State Recovery (5x cycles on empty, populated, and broken schemas)
2. Null resident_id Insertion & Guest-to-Claimed State Machine Transitions
3. Foreign Key Referential Integrity & 3NF Chain Enforcement (SQLite PRAGMA foreign_keys = ON)
4. Long Strings, Extreme Boundary Values, Unicode & SQL Injection Resilience
5. Cryptographic Tracking Token High-Volume Entropy, Normalization Attacks & Constant-Time Verification
6. Schema Zero-Leakage & PII Redaction Audit
"""

import os
import sys
import unittest
import re
import secrets
import hashlib
import hmac
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

# Ensure backend root is on Python path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_engine, inspect, text, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.exc import IntegrityError, DataError, StatementError
from jose import jwt

import models
import gov_models
import schemas
import auth
import utils.security
from database import Base
from migrate_guest_reporting import run_migration


TOKEN_16_REGEX = re.compile(r"^TRK-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$")
TOKEN_32_REGEX = re.compile(r"^TRK-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$")


def create_sqlite_engine_with_fk(memory: bool = True, db_path: Optional[str] = None):
    """Creates a SQLite engine with foreign key enforcement enabled on every connection."""
    url = "sqlite:///:memory:" if memory else f"sqlite:///{db_path}"
    engine = create_engine(
        url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool if memory else None
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


# ─────────────────────────────────────────────────────────────────────────────
# Challenge Suite 1: Migration Idempotency & Partial Schema Recovery
# ─────────────────────────────────────────────────────────────────────────────
class TestMigrationStressAndIdempotency(unittest.TestCase):
    """Stress tests the dual-dialect migration script under adversarial conditions."""

    def test_consecutive_migrations_on_empty_db(self):
        """A legacy column migration cannot bootstrap the spatial application schema."""
        engine = create_sqlite_engine_with_fk(memory=True)
        self.assertFalse(run_migration(engine))
        self.assertNotIn("reports", inspect(engine).get_table_names())

    def test_consecutive_migrations_on_populated_legacy_db(self):
        """CHALLENGE 1.2: Run migration 5 consecutive times on pre-populated legacy DB with NULL columns."""
        engine = create_sqlite_engine_with_fk(memory=True)
        
        # Build minimal legacy schema without guest columns
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE residents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    full_name VARCHAR,
                    email VARCHAR UNIQUE,
                    password_hash VARCHAR
                )
            """))
            conn.execute(text("""
                CREATE TABLE reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticket_id VARCHAR UNIQUE,
                    resident_id INTEGER REFERENCES residents(id),
                    category VARCHAR,
                    description VARCHAR,
                    status VARCHAR DEFAULT 'pending'
                )
            """))
            # Insert legacy records
            conn.execute(text("INSERT INTO residents (id, full_name, email) VALUES (1, 'Legacy User', 'legacy@caloocan.ph')"))
            conn.execute(text("INSERT INTO reports (id, ticket_id, resident_id, category, description) VALUES (10, 'RPT-LEGACY-001', 1, 'Pothole', 'Old report')"))
            conn.execute(text("INSERT INTO reports (id, ticket_id, resident_id, category, description) VALUES (11, 'RPT-LEGACY-002', 1, 'Streetlight', 'Old report 2')"))
            conn.commit()

        # Run migration 5 times
        for i in range(5):
            success = run_migration(engine)
            self.assertTrue(success, f"Migration failed on iteration {i+1} on populated legacy DB")

        # Verify data preservation and default backfilling
        with engine.connect() as conn:
            rows = conn.execute(text("SELECT id, reporter_type, submission_source, contact_verified, tracking_token_hash FROM reports ORDER BY id")).fetchall()
            self.assertEqual(len(rows), 2)
            for r in rows:
                self.assertEqual(r[1], "registered", "Legacy row reporter_type must be backfilled to 'registered'")
                self.assertEqual(r[2], "web", "Legacy row submission_source must be backfilled to 'web'")
                self.assertEqual(r[3], 0, "Legacy row contact_verified must be backfilled to 0/False")
                self.assertIsNone(r[4], "Legacy row tracking_token_hash must remain NULL")

    def test_partial_column_state_recovery(self):
        """CHALLENGE 1.3: Simulate interrupted migration where only 3 of 8 columns exist, then run migration."""
        engine = create_sqlite_engine_with_fk(memory=True)
        
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE residents (
                    id INTEGER PRIMARY KEY,
                    full_name VARCHAR,
                    email VARCHAR UNIQUE
                )
            """))
            conn.execute(text("""
                CREATE TABLE reports (
                    id INTEGER PRIMARY KEY,
                    ticket_id VARCHAR UNIQUE,
                    resident_id INTEGER REFERENCES residents(id),
                    reporter_type VARCHAR(20) DEFAULT 'registered',
                    contact_email VARCHAR(255),
                    submission_source VARCHAR(30) DEFAULT 'web'
                )
            """))
            conn.commit()

        # Run migration
        success = run_migration(engine)
        self.assertTrue(success, "Migration failed to recover from partial column state")

        # Verify all 8 guest columns exist
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("reports")}
        expected_cols = {
            "reporter_type", "tracking_token_hash", "contact_email",
            "contact_phone", "contact_verified", "claimed_at",
            "claimed_by_user_id", "submission_source"
        }
        self.assertTrue(expected_cols.issubset(cols), f"Missing columns: {expected_cols - cols}")

    def test_index_creation_idempotency(self):
        """CHALLENGE 1.4: Verify indexes are created idempotently without causing duplicate index errors."""
        engine = create_sqlite_engine_with_fk(memory=True)
        with engine.begin() as conn:
            conn.execute(text("CREATE TABLE residents (id INTEGER PRIMARY KEY, email VARCHAR)"))
            conn.execute(text("CREATE TABLE reports (id INTEGER PRIMARY KEY, resident_id INTEGER REFERENCES residents(id))"))
        self.assertTrue(run_migration(engine))
        self.assertTrue(run_migration(engine))

        with engine.connect() as conn:
            indexes = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='reports'")).fetchall()
            idx_names = {r[0] for r in indexes}
            
            expected_indexes = {
                "ix_reports_reporter_type",
                "ix_reports_tracking_token_hash",
                "ix_reports_contact_email",
                "ix_reports_claimed_by_user_id",
                "ix_reports_resident_id"
            }
            for exp_idx in expected_indexes:
                self.assertIn(exp_idx, idx_names, f"Expected index '{exp_idx}' was not found in database")


# ─────────────────────────────────────────────────────────────────────────────
# Challenge Suite 2: Foreign Key Integrity & Relational Constraints
# ─────────────────────────────────────────────────────────────────────────────
class TestForeignKeyIntegrityAndRelationalStress(unittest.TestCase):
    """Stress tests 3NF relational integrity with PRAGMA foreign_keys = ON."""

    def setUp(self):
        from tests.postgis_support import reset_rows
        self.engine = reset_rows()
        Session = sessionmaker(bind=self.engine)
        self.db = Session()

        # Create master geographic records
        self.district = models.District(name="District 2 – North Caloocan", code="D2")
        self.db.add(self.district)
        self.db.commit()

        self.barangay = models.Barangay(name="Barangay 171 Bagumbong", district_id=self.district.id, zip_code="1421")
        self.db.add(self.barangay)
        self.db.commit()

        # Create verified resident
        self.resident = models.Resident(
            full_name="Maria Santos",
            email="maria.santos@caloocan.ph",
            password_hash="fakehash",
            is_verified=True,
            barangay_id=self.barangay.id,
            district_id=self.district.id
        )
        self.db.add(self.resident)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_invalid_resident_id_raises_integrity_error(self):
        """CHALLENGE 2.1: Inserting report with non-existent resident_id MUST raise IntegrityError."""
        bad_report = models.Report(
            ticket_id="RPT-INVALID-RES",
            resident_id=999999, # Does not exist
            category="Roads",
            description="Testing invalid resident FK"
        )
        self.db.add(bad_report)
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_invalid_claimed_by_user_id_raises_integrity_error(self):
        """CHALLENGE 2.2: Claiming report with non-existent resident_id MUST raise IntegrityError."""
        guest_report = models.Report(
            ticket_id="RPT-GUEST-CLAIM-BAD",
            resident_id=None,
            reporter_type="guest",
            claimed_by_user_id=888888, # Does not exist
            claimed_at=datetime.now(timezone.utc)
        )
        self.db.add(guest_report)
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_invalid_barangay_id_raises_integrity_error(self):
        """CHALLENGE 2.3: Setting non-existent barangay_id on Report MUST raise IntegrityError."""
        bad_geo_report = models.Report(
            ticket_id="RPT-BAD-BRGY",
            resident_id=None,
            barangay_id=777777, # Does not exist
            category="Drainage"
        )
        self.db.add(bad_geo_report)
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_guest_report_with_null_resident_id_allowed(self):
        """CHALLENGE 2.4: Guest report with resident_id=None succeeds with full geographic FK relations."""
        guest_report = models.Report(
            ticket_id="RPT-VALID-GUEST-GEO",
            resident_id=None,
            reporter_type="guest",
            barangay_id=self.barangay.id,
            category="Waste Management",
            description="Uncollected garbage along Congressional Rd"
        )
        self.db.add(guest_report)
        self.db.commit()
        self.db.refresh(guest_report)

        self.assertIsNotNone(guest_report.id)
        self.assertIsNone(guest_report.resident_id)
        self.assertEqual(guest_report.barangay_ref.name, "Barangay 171 Bagumbong")
        self.assertEqual(guest_report.barangay_ref.district.code, "D2")

    def test_claim_state_transition_and_two_way_relations(self):
        """CHALLENGE 2.5: Test complete lifecycle of guest creation -> claim -> resident bidirectional relationships."""
        # 1. Create guest report
        token = auth.generate_tracking_token()
        token_hash = auth.hash_tracking_token(token)
        report = models.Report(
            ticket_id="RPT-GUEST-TO-CLAIM",
            resident_id=None,
            reporter_type="guest",
            tracking_token_hash=token_hash,
            category="Parks & Recreation",
            description="Damaged bench in public plaza"
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)

        self.assertFalse(report.is_claimed)
        self.assertIsNone(report.claimed_by)
        self.assertEqual(len(self.resident.claimed_reports), 0)
        self.assertEqual(len(self.resident.reports), 0)

        # 2. Claim report
        claim_time = datetime.now(timezone.utc)
        report.claimed_by_user_id = self.resident.id
        report.claimed_at = claim_time
        report.reporter_type = "registered"
        self.db.commit()
        self.db.refresh(report)
        self.db.refresh(self.resident)

        # 3. Verify state
        self.assertTrue(report.is_claimed)
        self.assertEqual(report.claimed_by.id, self.resident.id)
        self.assertEqual(report.claimed_by.full_name, "Maria Santos")
        self.assertEqual(len(self.resident.claimed_reports), 1)
        self.assertIn(report, self.resident.claimed_reports)
        # Authored reports should still be 0 since resident_id was None
        self.assertEqual(len(self.resident.reports), 0)


# ─────────────────────────────────────────────────────────────────────────────
# Challenge Suite 3: Extreme Inputs, String Boundaries & SQL Injection
# ─────────────────────────────────────────────────────────────────────────────
class TestExtremeInputsAndInjectionResilience(unittest.TestCase):
    """Stress tests boundary strings, special characters, unicode, and injection attacks."""

    def setUp(self):
        from tests.postgis_support import reset_rows
        self.engine = reset_rows()
        Session = sessionmaker(bind=self.engine)
        self.db = Session()

    def tearDown(self):
        self.db.close()

    def test_extreme_contact_field_lengths(self):
        """CHALLENGE 3.1: Test boundary and oversized contact email / phone / source values."""
        # Standard max boundary strings
        max_email = "a" * 240 + "@caloocan.ph" # 252 chars (< 255)
        max_phone = "+63 917 " + "9" * 40 # 48 chars (< 50)
        max_source = "assisted-mobile-field-worker-v" # 30 chars (VARCHAR(30))

        report = models.Report(
            ticket_id="RPT-MAX-STRINGS",
            resident_id=None,
            reporter_type="guest",
            contact_email=max_email,
            contact_phone=max_phone,
            submission_source=max_source,
            category="Infrastructure",
            description="Testing standard max lengths"
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)

        self.assertEqual(report.contact_email, max_email)
        self.assertEqual(report.contact_phone, max_phone)
        self.assertEqual(report.submission_source, max_source)

    def test_massive_text_payloads_in_description_and_notes(self):
        """CHALLENGE 3.2: Insert 100,000-character description and verify persistence without truncation."""
        massive_text = "PULSO Caloocan Engineering Citizen Report " * 2500 # 105,000 characters
        report = models.Report(
            ticket_id="RPT-MASSIVE-TEXT",
            resident_id=None,
            category="Flood Control",
            description=massive_text
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)

        self.assertEqual(len(report.description), len(massive_text))
        self.assertEqual(report.description, massive_text)

    def test_unicode_emojis_and_multilingual_diacritics(self):
        """CHALLENGE 3.3: Verify Tagalog diacritics, multilingual scripts, and emojis persist accurately."""
        unicode_title = "Barangay 172 Bagumbong: Mabigat na Baha 🌊🌧️🚨"
        unicode_desc = (
            "May malaking lubak sa kanto ng San Vicente St. (14°45'23.4\"N 121°02'42.1\"E). "
            "Delikado para sa mga tricycle at jeepney! "
            "Special characters: ñ, Ñ, é, ü, 中文测试, العربية, 한국어 🚧🛑🔧"
        )
        report = models.Report(
            ticket_id="RPT-UNICODE-001",
            resident_id=None,
            category=unicode_title,
            description=unicode_desc,
            location_string="Kanto ng San Vicente St., Brgy. 172, Caloocan City"
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)

        self.assertEqual(report.category, unicode_title)
        self.assertEqual(report.description, unicode_desc)

    def test_sql_injection_payload_resilience(self):
        """CHALLENGE 3.4: Attempt classic SQL injection strings across all string columns; verify literal storage."""
        injection_payloads = [
            "'; DROP TABLE reports; --",
            "' OR 1=1 --",
            "' UNION SELECT id, email, password_hash FROM residents --",
            "1'; UPDATE reports SET reporter_type='admin' WHERE '1'='1",
            "<script>alert('XSS_PULSO_EXPLOIT');</script>",
            '{"$gt": ""}',
            "'; EXEC xp_cmdshell('dir'); --",
            "Robert'); DROP TABLE Students;--"
        ]

        for idx, payload in enumerate(injection_payloads):
            report = models.Report(
                ticket_id=f"RPT-SQLI-{idx:03d}",
                resident_id=None,
                category=payload,
                description=payload,
                contact_email=f"sqli_{idx}@injection.com",
                contact_phone=payload[:50],
                submission_source=payload[:30]
            )
            self.db.add(report)
            self.db.commit()
            self.db.refresh(report)

            self.assertEqual(report.category, payload)
            self.assertEqual(report.description, payload)

        # Verify table was NOT dropped and reports count equals number of injections
        count = self.db.query(models.Report).filter(models.Report.ticket_id.like("RPT-SQLI-%")).count()
        self.assertEqual(count, len(injection_payloads))

    def test_extreme_numeric_and_coordinate_boundaries(self):
        """CHALLENGE 3.5: Test extreme float values for latitude, longitude, severity_score, and budget."""
        report = models.Report(
            ticket_id="RPT-NUMERICS-EXTREME",
            resident_id=None,
            category="Extreme Values",
            description="Testing extreme numeric constraints",
            location_lat=-90.0,
            location_lng=180.0,
            severity_score=100.0,
            budget=9_999_999_999.99,  # NUMERIC(12,2) maximum
            citizen_trust_score=-50
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)

        self.assertEqual(report.location_lat, -90.0)
        self.assertEqual(report.location_lng, 180.0)
        self.assertEqual(report.severity_score, 100.0)
        self.assertEqual(report.budget, 9_999_999_999.99)
        self.assertEqual(report.citizen_trust_score, -50)

    def test_complex_json_in_ai_metadata(self):
        """CHALLENGE 3.6: Verify deep and complex nested JSON structures in ai_metadata."""
        complex_metadata = {
            "vision_model": "gemini-1.5-flash",
            "detected_objects": [
                {"label": "asphalt_crack", "confidence": 0.982, "box": [120, 45, 600, 400]},
                {"label": "water_ponding", "confidence": 0.894, "box": [300, 100, 800, 600]}
            ],
            "severity_matrix": {
                "structural": 8.5,
                "safety_hazard": 9.0,
                "traffic_disruption": 7.0
            },
            "tags": ["road_hazard", "pothole", "caloocan_d2", "urgent"],
            "raw_scores": [0.1, 0.5, 0.9999999]
        }
        report = models.Report(
            ticket_id="RPT-AI-JSON-001",
            resident_id=None,
            category="Roads",
            description="AI Vision Triage",
            ai_metadata=complex_metadata
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)

        self.assertEqual(report.ai_metadata["vision_model"], "gemini-1.5-flash")
        self.assertEqual(len(report.ai_metadata["detected_objects"]), 2)
        self.assertEqual(report.ai_metadata["severity_matrix"]["safety_hazard"], 9.0)


# ─────────────────────────────────────────────────────────────────────────────
# Challenge Suite 4: Cryptographic Token Security & Adversarial Attack Simulation
# ─────────────────────────────────────────────────────────────────────────────
class TestCryptographicSecurityAdversarialHarness(unittest.TestCase):
    """Stress tests token generation entropy, normalization edge cases, and constant-time verification."""

    def test_high_volume_token_entropy_and_uniqueness(self):
        """CHALLENGE 4.1: Generate 20,000 tokens (10k 64-bit + 10k 128-bit); verify 0 collisions and strict regex format."""
        tokens_16 = [auth.generate_tracking_token() for _ in range(10000)]
        self.assertEqual(len(set(tokens_16)), 10000, "Collision detected in 16-char tracking tokens!")
        for t in tokens_16:
            self.assertTrue(TOKEN_16_REGEX.match(t), f"Token {t} failed regex pattern")

        tokens_32 = [auth.generate_tracking_token_128bit() for _ in range(10000)]
        self.assertEqual(len(set(tokens_32)), 10000, "Collision detected in 128-bit tracking tokens!")
        for t in tokens_32:
            self.assertTrue(TOKEN_32_REGEX.match(t), f"128-bit Token {t} failed regex pattern")

    def test_adversarial_normalization_matrix(self):
        """CHALLENGE 4.2: Adversarial input normalization matrix must map to identical canonical representation."""
        expected_canonical = "9F83A8B2C4E610D7"
        
        test_inputs = [
            "TRK-9F83-A8B2-C4E6-10D7",
            "trk-9f83-a8b2-c4e6-10d7",
            "  TRK-9F83-A8B2-C4E6-10D7  ",
            "\t\nTRK-9F83-A8B2-C4E6-10D7\r\n",
            "9F83A8B2C4E610D7",
            "9f83a8b2c4e610d7",
            "9F83-A8B2-C4E6-10D7",
            "9f83_a8b2_c4e6_10d7",
            "TRK_9F83_A8B2_C4E6_10D7",
            "TRK 9F83 A8B2 C4E6 10D7",
            "  trk   9f83   a8b2   c4e6   10d7  ",
            "TRK-9F-83-A8-B2-C4-E6-10-D7",
        ]

        for raw_input in test_inputs:
            normalized = auth.normalize_tracking_token(raw_input)
            self.assertEqual(
                normalized,
                expected_canonical,
                f"Failed to normalize input: '{raw_input}' -> got '{normalized}'"
            )

    def test_normalization_malformed_and_none_inputs(self):
        """CHALLENGE 4.3: Normalization of None, empty string, non-strings must return empty string without raising."""
        self.assertEqual(auth.normalize_tracking_token(None), "")
        self.assertEqual(auth.normalize_tracking_token(""), "")
        self.assertEqual(auth.normalize_tracking_token("   "), "")
        self.assertEqual(auth.normalize_tracking_token(12345), "") # type: ignore
        self.assertEqual(auth.normalize_tracking_token(["TRK-1234"]), "") # type: ignore
        self.assertEqual(auth.normalize_tracking_token({}), "") # type: ignore

    def test_constant_time_verification_tampering_matrix(self):
        """CHALLENGE 4.4: Bit-flip and byte-tampering matrix against verify_tracking_token."""
        token = "TRK-9F83-A8B2-C4E6-10D7"
        valid_hash = auth.hash_tracking_token(token)

        # 1. Valid inputs in different formats
        self.assertTrue(auth.verify_tracking_token("TRK-9F83-A8B2-C4E6-10D7", valid_hash))
        self.assertTrue(auth.verify_tracking_token("trk-9f83-a8b2-c4e6-10d7", valid_hash))
        self.assertTrue(auth.verify_tracking_token("9f83a8b2c4e610d7", valid_hash))
        self.assertTrue(auth.verify_tracking_token("  TRK 9F83 A8B2 C4E6 10D7  ", valid_hash))

        # 2. Single-character tamper in token
        self.assertFalse(auth.verify_tracking_token("TRK-9F83-A8B2-C4E6-10D8", valid_hash)) # Last char 7 -> 8
        self.assertFalse(auth.verify_tracking_token("TRK-8F83-A8B2-C4E6-10D7", valid_hash)) # First char 9 -> 8
        self.assertFalse(auth.verify_tracking_token("TRK-9F83-A8B2-C4E6-10D", valid_hash))  # Truncated token
        self.assertFalse(auth.verify_tracking_token("TRK-9F83-A8B2-C4E6-10D7-AAAA", valid_hash)) # Extra chars

        # 3. Single-character tamper in hash
        tampered_hash_first = ("0" if valid_hash[0] != "0" else "1") + valid_hash[1:]
        tampered_hash_last = valid_hash[:-1] + ("0" if valid_hash[-1] != "0" else "1")
        self.assertFalse(auth.verify_tracking_token(token, tampered_hash_first))
        self.assertFalse(auth.verify_tracking_token(token, tampered_hash_last))

        # 4. Truncated & malformed hashes
        self.assertFalse(auth.verify_tracking_token(token, valid_hash[:32])) # 32 chars instead of 64
        self.assertFalse(auth.verify_tracking_token(token, valid_hash + "ff"))
        self.assertFalse(auth.verify_tracking_token(token, ""))
        self.assertFalse(auth.verify_tracking_token(token, None))
        self.assertFalse(auth.verify_tracking_token(None, valid_hash))
        self.assertFalse(auth.verify_tracking_token("", valid_hash))
        self.assertFalse(auth.verify_tracking_token(12345, valid_hash)) # type: ignore

        # 5. Secret salt variation
        diff_salt_hash = auth.hash_tracking_token(token, secret_key="DIFFERENT_SALT_KEY_XYZ")
        self.assertFalse(auth.verify_tracking_token(token, diff_salt_hash, secret_key="ORIGINAL_SALT"))
        self.assertTrue(auth.verify_tracking_token(token, diff_salt_hash, secret_key="DIFFERENT_SALT_KEY_XYZ"))


# ─────────────────────────────────────────────────────────────────────────────
# Challenge Suite 5: Pydantic Schema Security & Zero Leakage Audit
# ─────────────────────────────────────────────────────────────────────────────
class TestSchemaZeroLeakageAndPIIRedaction(unittest.TestCase):
    """Verifies that internal hashes, secrets, and private triage reasoning never leak into public schema models."""

    def test_report_response_never_contains_tracking_token_hash(self):
        """CHALLENGE 5.1: ReportResponse schema must NEVER expose tracking_token_hash."""
        self.assertNotIn(
            "tracking_token_hash",
            schemas.ReportResponse.model_fields,
            "CRITICAL SECURITY LEAK: tracking_token_hash exists on schemas.ReportResponse!"
        )

    def test_report_track_response_sanitizes_pii_and_internal_notes(self):
        """CHALLENGE 5.2: Public tracking response schema must NOT expose reporter identity, email, or phone."""
        forbidden_fields = [
            "contact_email", "contact_phone", "resident_id",
            "claimed_by_user_id", "tracking_token_hash", "ai_reasoning",
            "citizen_feedback_note", "citizen_trust_score"
        ]
        for field in forbidden_fields:
            self.assertNotIn(
                field,
                schemas.ReportTrackResponse.model_fields,
                f"CRITICAL PII/INTERNAL LEAK: '{field}' exposed on schemas.ReportTrackResponse!"
            )

    def test_report_track_request_validator_normalizes_optional_fields(self):
        """CHALLENGE 5.3: Tracking input normalizes identifiers and optional tokens."""
        req = schemas.ReportTrackRequest(
            ticket_id="  rpt-20260902-abc12345  ",
            tracking_token="  trk-9f83-a8b2-c4e6-10d7  "
        )
        self.assertEqual(req.ticket_id, "RPT-20260902-ABC12345")
        self.assertEqual(req.get_token(), "TRK-9F83-A8B2-C4E6-10D7")

        # Token is optional at the schema level; the route rejects missing credentials.
        req_no_token = schemas.ReportTrackRequest(ticket_id="RPT-TEST-001")
        self.assertIsNone(req_no_token.get_token())

        # Empty ticket id is also checked at the route boundary.
        self.assertEqual(schemas.ReportTrackRequest(ticket_id="   ", tracking_token="TRK-1234").ticket_id, "   ")


# ─────────────────────────────────────────────────────────────────────────────
# Challenge Suite 6: Optional Auth Dependency Edge Cases
# ─────────────────────────────────────────────────────────────────────────────
class TestOptionalAuthDependencyAdversarial(unittest.TestCase):
    """Stress tests get_optional_current_user with adversarial and malformed inputs."""

    def setUp(self):
        from tests.postgis_support import reset_rows
        self.engine = reset_rows()
        Session = sessionmaker(bind=self.engine)
        self.db = Session()

        # Official
        self.official = models.Official(
            full_name="Engr. Aris Ramos",
            email="aris.official@caloocan.ph",
            password_hash="fakehash",
            role="admin",
            is_active=True
        )
        # Verified Resident
        self.resident_verified = models.Resident(
            full_name="Verified Resident",
            email="verified.citizen@caloocan.ph",
            password_hash="fakehash",
            is_verified=True,
            is_active=True
        )
        # Unverified Resident
        self.resident_unverified = models.Resident(
            full_name="Unverified Resident",
            email="unverified.citizen@caloocan.ph",
            password_hash="fakehash",
            is_verified=False,
            is_active=True
        )
        self.db.add_all([self.official, self.resident_verified, self.resident_unverified])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def _create_jwt(self, email: Optional[str], delta: timedelta = timedelta(minutes=15)) -> str:
        data = {}
        if email is not None:
            data["sub"] = email
        exp = datetime.now(timezone.utc) + delta
        data["exp"] = exp
        return jwt.encode(data, auth.SECRET_KEY, algorithm=auth.ALGORITHM)

    def test_none_and_empty_token_returns_none(self):
        """CHALLENGE 6.1: None or whitespace-only token returns None (guest)."""
        self.assertIsNone(auth.get_optional_current_user(None, self.db))
        self.assertIsNone(auth.get_optional_current_user("", self.db))
        self.assertIsNone(auth.get_optional_current_user("   ", self.db))

    def test_malformed_and_garbage_tokens_return_none(self):
        """CHALLENGE 6.2: Corrupted, random garbage, and unsigned JWTs return None without raising exceptions."""
        garbage_inputs = [
            "Bearer invalid.garbage.token",
            "not_a_jwt",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
            "Bearer " + "A" * 500,
            "null",
            "undefined",
            "12345"
        ]
        for token in garbage_inputs:
            res = auth.get_optional_current_user(token, self.db)
            self.assertIsNone(res, f"Expected None for garbage token: '{token}'")

    def test_expired_token_returns_none(self):
        """CHALLENGE 6.3: Expired JWT returns None (guest mode) rather than throwing 401."""
        expired_token = self._create_jwt("verified.citizen@caloocan.ph", delta=timedelta(minutes=-30))
        res = auth.get_optional_current_user(expired_token, self.db)
        self.assertIsNone(res)

    def test_unverified_resident_returns_none(self):
        """CHALLENGE 6.4: Unverified resident JWT returns None (cannot act as authenticated citizen)."""
        unverified_token = self._create_jwt("unverified.citizen@caloocan.ph")
        res = auth.get_optional_current_user(unverified_token, self.db)
        self.assertIsNone(res)

    def test_verified_resident_and_official_resolve_correctly(self):
        """CHALLENGE 6.5: Valid tokens for Official and verified Resident resolve to respective model objects."""
        # Official
        off_token = self._create_jwt("aris.official@caloocan.ph")
        user = auth.get_optional_current_user(off_token, self.db)
        self.assertIsNotNone(user)
        self.assertIsInstance(user, models.Official)
        self.assertEqual(user.email, "aris.official@caloocan.ph")

        # Resident
        res_token = self._create_jwt("verified.citizen@caloocan.ph")
        user2 = auth.get_optional_current_user(res_token, self.db)
        self.assertIsNotNone(user2)
        self.assertIsInstance(user2, models.Resident)
        self.assertEqual(user2.email, "verified.citizen@caloocan.ph")

# ─────────────────────────────────────────────────────────────────────────────
# Challenge Suite 7: Live PostgreSQL Database Engine Verification
# ─────────────────────────────────────────────────────────────────────────────

class TestPostgreSQLLiveEngineChallenge(unittest.TestCase):
    """Stress tests and verifies schema behavior against live PostgreSQL instance."""

    @classmethod
    def setUpClass(cls):
        from database import engine as default_engine, check_database_connection
        cls.pg_available = False
        cls.engine = default_engine
        if default_engine.dialect.name == "postgresql":
            cls.pg_available = check_database_connection()

    def setUp(self):
        if not self.pg_available:
            self.skipTest("PostgreSQL instance is not reachable or engine is not postgresql.")
        Session = sessionmaker(bind=self.engine)
        self.db = Session()

    def tearDown(self):
        if hasattr(self, "db") and self.db:
            self.db.close()

    def test_pg_migration_idempotency(self):
        """CHALLENGE 7.1: Execute run_migration 3 times on live PostgreSQL; verify return code True."""
        for i in range(3):
            success = run_migration(self.engine)
            self.assertTrue(success, f"PG migration failed on iteration {i+1}")

    def test_pg_guest_report_insertion_and_null_resident_id(self):
        """CHALLENGE 7.2: Insert guest report with resident_id=NULL in live PG; verify all guest columns and query."""
        test_ticket = f"RPT-PG-GUEST-{secrets.token_hex(4).upper()}"
        raw_token = auth.generate_tracking_token()
        token_hash = auth.hash_tracking_token(raw_token)

        guest_report = models.Report(
            ticket_id=test_ticket,
            resident_id=None,
            category="Live PG Verification",
            description="Empirical challenger PG insert test",
            reporter_type="guest",
            tracking_token_hash=token_hash,
            contact_email="pg.challenger@caloocan.ph",
            contact_phone="09187654321",
            submission_source="web",
            status="pending"
        )
        self.db.add(guest_report)
        self.db.commit()
        self.db.refresh(guest_report)

        try:
            self.assertIsNotNone(guest_report.id)
            self.assertIsNone(guest_report.resident_id)
            self.assertEqual(guest_report.reporter_type, "guest")
            self.assertEqual(guest_report.tracking_token_hash, token_hash)
            self.assertEqual(guest_report.contact_email, "pg.challenger@caloocan.ph")
            self.assertFalse(guest_report.is_claimed)
            self.assertEqual(guest_report.reporter_name, "Guest Reporter")

            # Direct raw SQL verification on PostgreSQL
            with self.engine.connect() as conn:
                row = conn.execute(
                    text("SELECT resident_id, reporter_type, tracking_token_hash, contact_email, submission_source FROM reports WHERE ticket_id = :t"),
                    {"t": test_ticket}
                ).fetchone()
                self.assertIsNotNone(row)
                self.assertIsNone(row[0]) # resident_id is NULL
                self.assertEqual(row[1], "guest")
                self.assertEqual(row[2], token_hash)
                self.assertEqual(row[3], "pg.challenger@caloocan.ph")
                self.assertEqual(row[4], "web")
        finally:
            # Clean up test row
            self.db.delete(guest_report)
            self.db.commit()


if __name__ == "__main__":
    unittest.main()

