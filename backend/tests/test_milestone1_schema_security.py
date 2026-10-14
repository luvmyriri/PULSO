"""
test_milestone1_schema_security.py
PULSO — Caloocan City Engineering Department Management System
Milestone 1: Schema Evolution, Cryptographic Security & Migration Unit Tests

Comprehensive unit test suite verifying:
1. Database Model Evolution (models.Report & models.Resident with guest fields)
2. Pydantic Schema Serialization, Zero Hash Leakage & PII Redaction
3. Cryptographic Token Generation (TRK-XXXX-XXXX-XXXX-XXXX), Normalization & Constant-Time HMAC-SHA256 Verification
4. Optional Authentication Dependency (get_optional_current_user)
5. Dual-Dialect Database Migration Idempotency & Legacy Data Preservation
"""

import os
import sys
import unittest
import re
import secrets
import hashlib
import hmac
from datetime import datetime, timezone, timedelta
from typing import Optional, Union, List, Dict, Any

# Ensure backend directory is in python path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from jose import jwt

import models
import schemas
import auth
import utils.security
from database import Base
from migrate_guest_reporting import run_migration


TOKEN_REGEX = re.compile(r"^TRK-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$")
TOKEN_128_REGEX = re.compile(r"^TRK-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$")


# ─────────────────────────────────────────────────────────────────────────────
# Test Class 1: Database Model Evolution
# ─────────────────────────────────────────────────────────────────────────────
class TestReportModelEvolution(unittest.TestCase):

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        Base.metadata.create_all(bind=self.engine)
        Session = sessionmaker(bind=self.engine)
        self.db = Session()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_guest_report_instantiation(self):
        """M1-MOD-01: Verify guest report can be instantiated with nullable resident_id and guest defaults."""
        token = auth.generate_tracking_token()
        token_hash = auth.hash_tracking_token(token)

        guest_report = models.Report(
            ticket_id="RPT-20260902-GUEST01",
            resident_id=None,
            category="Roads & Bridges",
            description="Severe pothole along Samson Road",
            reporter_type="guest",
            tracking_token_hash=token_hash,
            contact_email="guest.citizen@caloocan.ph",
            contact_phone="09171234567",
            submission_source="web",
            status="pending"
        )
        self.db.add(guest_report)
        self.db.commit()
        self.db.refresh(guest_report)

        self.assertIsNotNone(guest_report.id)
        self.assertIsNone(guest_report.resident_id)
        self.assertEqual(guest_report.reporter_type, "guest")
        self.assertEqual(guest_report.tracking_token_hash, token_hash)
        self.assertEqual(guest_report.contact_email, "guest.citizen@caloocan.ph")
        self.assertEqual(guest_report.contact_phone, "09171234567")
        self.assertFalse(guest_report.contact_verified)
        self.assertIsNone(guest_report.claimed_at)
        self.assertIsNone(guest_report.claimed_by_user_id)
        self.assertEqual(guest_report.submission_source, "web")
        self.assertFalse(guest_report.is_claimed)
        self.assertEqual(guest_report.reporter_name, "Guest Reporter")

    def test_registered_report_instantiation(self):
        """M1-MOD-02: Verify registered report links to Resident and resolves full name."""
        resident = models.Resident(
            id=101,
            full_name="Juan dela Cruz",
            email="juan.delacruz@caloocan.ph",
            password_hash="fakehash",
            is_verified=True
        )
        self.db.add(resident)
        self.db.commit()

        report = models.Report(
            ticket_id="RPT-20260902-REG001",
            resident_id=resident.id,
            category="Street Lighting",
            description="Busted street light in Bagong Barrio",
            reporter_type="registered"
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)

        self.assertEqual(report.resident_id, 101)
        self.assertEqual(report.reporter.full_name, "Juan dela Cruz")
        self.assertEqual(report.reporter_name, "Juan dela Cruz")
        self.assertTrue(report.is_claimed)
        self.assertIn(report, resident.reports)

    def test_reporter_name_property_fallback_and_setter(self):
        """M1-MOD-03: Verify reporter_name fallback and override setter."""
        report = models.Report(
            ticket_id="RPT-20260902-ANON01",
            resident_id=None,
            reporter_type="guest"
        )
        self.assertEqual(report.reporter_name, "Guest Reporter")

        # Fallback for unknown reporter type
        report.reporter_type = "unknown"
        self.assertEqual(report.reporter_name, "Anonymous Resident")

        # Override setter
        report.reporter_name = "Custom Name Override"
        self.assertEqual(report.reporter_name, "Custom Name Override")

    def test_report_claiming_flow(self):
        """M1-MOD-04: Verify atomic claiming updates claimed_by_user_id, claimed_at, and relationships."""
        guest_report = models.Report(
            ticket_id="RPT-20260902-CLAIM01",
            resident_id=None,
            category="Drainage & Flood Control",
            description="Clogged canal causing overflow",
            reporter_type="guest"
        )
        resident = models.Resident(
            id=202,
            full_name="Maria Clara Santos",
            email="maria.santos@caloocan.ph",
            password_hash="fakehash",
            is_verified=True
        )
        self.db.add_all([guest_report, resident])
        self.db.commit()

        self.assertFalse(guest_report.is_claimed)
        self.assertIsNone(guest_report.claimed_by)

        claim_time = datetime.now(timezone.utc)
        guest_report.claimed_by_user_id = resident.id
        guest_report.claimed_at = claim_time
        guest_report.resident_id = resident.id
        guest_report.reporter_type = "registered"
        self.db.commit()
        self.db.refresh(guest_report)

        self.assertTrue(guest_report.is_claimed)
        self.assertEqual(guest_report.claimed_by_user_id, 202)
        self.assertEqual(guest_report.claimed_by.full_name, "Maria Clara Santos")
        self.assertIn(guest_report, resident.claimed_reports)


# ─────────────────────────────────────────────────────────────────────────────
# Test Class 2: Pydantic Schema Validation & Zero Leakage
# ─────────────────────────────────────────────────────────────────────────────
class TestPydanticSchemaValidation(unittest.TestCase):

    def test_report_create_schema_guest(self):
        """M1-SCH-01: Validate ReportCreate schema with guest fields."""
        payload = {
            "category": "Waste Management",
            "description": "Uncollected garbage in Camarin",
            "location_lat": 14.7565,
            "location_lng": 121.0450,
            "location_barangay": "Barangay 172",
            "contact_email": "resident@gmail.com",
            "contact_phone": "09181234567",
            "submission_source": "web",
            "reporter_type": "guest"
        }
        schema_obj = schemas.ReportCreate(**payload)
        self.assertEqual(schema_obj.category, "Waste Management")
        self.assertEqual(schema_obj.contact_email, "resident@gmail.com")
        self.assertEqual(schema_obj.reporter_type, "guest")
        self.assertEqual(schema_obj.submission_source, "web")

    def test_report_create_minimal_payload(self):
        """M1-SCH-02: Validate minimal ReportCreate payload with defaults."""
        payload = {
            "category": "Roads & Bridges",
            "description": "Crack on sidewalk"
        }
        schema_obj = schemas.ReportCreate(**payload)
        self.assertEqual(schema_obj.category, "Roads & Bridges")
        self.assertIsNone(schema_obj.location_lat)
        self.assertIsNone(schema_obj.contact_email)
        self.assertEqual(schema_obj.submission_source, "web")

    def test_report_response_zero_hash_leakage(self):
        """M1-SCH-03: CRITICAL -- Assert tracking_token_hash is NEVER serialized in ReportResponse."""
        now = datetime.now(timezone.utc)
        mock_data = {
            "id": 1,
            "ticket_id": "RPT-20260902-SEC01",
            "resident_id": None,
            "category": "Roads & Bridges",
            "description": "Pothole repair needed",
            "status": "pending",
            "reporter_type": "guest",
            "tracking_token_hash": "SUPER_SECRET_HMAC_SHA256_DIGEST_DO_NOT_LEAK",
            "contact_email": "guest@caloocan.ph",
            "contact_phone": "09171234567",
            "contact_verified": False,
            "claimed_at": None,
            "claimed_by_user_id": None,
            "submission_source": "web",
            "is_claimed": False,
            "reporter_name": "Guest Reporter",
            "created_at": now,
            "updated_at": now
        }
        resp = schemas.ReportResponse.model_validate(mock_data)
        dumped = resp.model_dump()

        self.assertNotIn("tracking_token_hash", dumped)
        self.assertNotIn("tracking_token_hash", schemas.ReportResponse.model_fields.keys())
        self.assertEqual(dumped["reporter_type"], "guest")
        self.assertFalse(dumped["is_claimed"])

    def test_public_track_response_sanitization(self):
        """M1-SCH-04: CRITICAL -- Verify Public Tracking schema excludes reporter identity, contact info, and internal notes."""
        prohibited_fields = {
            "resident_id",
            "contact_email",
            "contact_phone",
            "ai_reasoning",
            "ai_metadata",
            "tracking_token_hash",
            "internal_notes"
        }
        track_fields = set(schemas.ReportTrackResponse.model_fields.keys())
        leakage = prohibited_fields.intersection(track_fields)
        self.assertEqual(leakage, set(), f"PII or internal fields found in ReportTrackResponse: {leakage}")

    def test_track_request_validation(self):
        """M1-SCH-05: Verify ReportTrackRequest normalization and token extraction."""
        req1 = schemas.ReportTrackRequest(ticket_id=" rpt-12345 ", tracking_token=" trk-9f83-a8b2-c4e6-10d7 ")
        self.assertEqual(req1.ticket_id, "RPT-12345")
        self.assertEqual(req1.get_token(), "TRK-9F83-A8B2-C4E6-10D7")

        req2 = schemas.ReportTrackRequest(ticket_id="RPT-999", tracking_code="code-123")
        self.assertEqual(req2.get_token(), "CODE-123")

    def test_claim_request_validation(self):
        """M1-SCH-06: Verify ReportClaimRequest token extraction and validation."""
        claim_req = schemas.ReportClaimRequest(tracking_token="  trk-1111-2222-3333-4444  ")
        self.assertEqual(claim_req.get_token(), "TRK-1111-2222-3333-4444")

        empty_claim = schemas.ReportClaimRequest()
        with self.assertRaises(ValueError):
            empty_claim.get_token()

    def test_user_reports_response(self):
        """M1-SCH-07: Verify UserReportsResponse structure."""
        user_reports = schemas.UserReportsResponse(
            total=0,
            filter="active",
            reports=[],
            skip=0,
            limit=50
        )
        self.assertEqual(user_reports.total, 0)
        self.assertEqual(user_reports.filter, "active")


# ─────────────────────────────────────────────────────────────────────────────
# Test Class 3: Cryptographic Token Generation, Hashing & Verification
# ─────────────────────────────────────────────────────────────────────────────
class TestSecurityAndTokenCryptography(unittest.TestCase):

    def test_token_format(self):
        """M1-SEC-01: Verify generated tokens match standard TRK-XXXX-XXXX-XXXX-XXXX pattern."""
        for _ in range(50):
            token = auth.generate_tracking_token()
            self.assertTrue(TOKEN_REGEX.match(token), f"Token '{token}' failed regex validation")
            self.assertEqual(len(token), 23)

    def test_token_128bit_format(self):
        """M1-SEC-02: Verify 128-bit token generation format."""
        token = auth.generate_tracking_token_128bit()
        self.assertTrue(TOKEN_128_REGEX.match(token), f"128-bit token '{token}' failed regex validation")
        self.assertEqual(len(token), 39)

    def test_token_uniqueness(self):
        """M1-SEC-03: Verify 10,000 generated tokens have zero collisions (CSPRNG randomness)."""
        tokens = [auth.generate_tracking_token() for _ in range(10000)]
        self.assertEqual(len(tokens), len(set(tokens)), "Collision detected in token generator")

    def test_token_hashing_determinism_and_length(self):
        """M1-SEC-04: Verify HMAC-SHA256 produces 64-char hex digest and is deterministic."""
        token = "TRK-9F83-A8B2-C4E6-10D7"
        hash1 = auth.hash_tracking_token(token)
        hash2 = auth.hash_tracking_token(token)

        self.assertEqual(len(hash1), 64)
        self.assertEqual(hash1, hash2)
        self.assertTrue(all(c in "0123456789abcdef" for c in hash1))

    def test_token_normalization_invariance(self):
        """M1-SEC-05: Verify formatting/case variations produce identical hashes."""
        canonical = "TRK-9F83-A8B2-C4E6-10D7"
        canonical_hash = auth.hash_tracking_token(canonical)

        variations = [
            "trk-9f83-a8b2-c4e6-10d7",
            "Trk-9F83-a8B2-C4e6-10D7",
            "  TRK-9F83-A8B2-C4E6-10D7  ",
            "TRK9F83A8B2C4E610D7",
            "9F83A8B2C4E610D7",
            "trk 9f83 a8b2 c4e6 10d7",
            "9f83a8b2c4e610d7"
        ]

        for var in variations:
            var_hash = auth.hash_tracking_token(var)
            self.assertEqual(var_hash, canonical_hash, f"Variation '{var}' did not match canonical hash")

    def test_token_verification_positive(self):
        """M1-SEC-06: Verify positive token verification with various format inputs."""
        token = auth.generate_tracking_token()
        stored_hash = auth.hash_tracking_token(token)

        self.assertTrue(auth.verify_tracking_token(token, stored_hash))
        self.assertTrue(auth.verify_tracking_token(token.lower(), stored_hash))
        self.assertTrue(auth.verify_tracking_token(f"  {token}  ", stored_hash))
        self.assertTrue(auth.verify_tracking_token(token.replace("-", ""), stored_hash))
        self.assertTrue(auth.verify_tracking_token(token.replace("TRK-", ""), stored_hash))

    def test_token_verification_negative(self):
        """M1-SEC-07: Verify negative token verification rejects fraudulent or altered tokens."""
        token = auth.generate_tracking_token()
        stored_hash = auth.hash_tracking_token(token)

        other_token = auth.generate_tracking_token()
        self.assertFalse(auth.verify_tracking_token(other_token, stored_hash))

        # Single character tampering
        tampered_token = token[:-1] + ("0" if token[-1] != "0" else "1")
        self.assertFalse(auth.verify_tracking_token(tampered_token, stored_hash))

    def test_token_verification_edge_cases(self):
        """M1-SEC-08: Verify safe rejection of empty/null inputs without unhandled exceptions."""
        token = auth.generate_tracking_token()
        stored_hash = auth.hash_tracking_token(token)

        self.assertFalse(auth.verify_tracking_token("", stored_hash))
        self.assertFalse(auth.verify_tracking_token(None, stored_hash))
        self.assertFalse(auth.verify_tracking_token(token, ""))
        self.assertFalse(auth.verify_tracking_token(token, None))
        self.assertFalse(auth.verify_tracking_token(None, None))
        self.assertFalse(auth.verify_tracking_token("   ", stored_hash))


# ─────────────────────────────────────────────────────────────────────────────
# Test Class 4: Optional Authentication Dependency
# ─────────────────────────────────────────────────────────────────────────────
class TestOptionalAuthenticationDependency(unittest.TestCase):

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        Base.metadata.create_all(bind=self.engine)
        Session = sessionmaker(bind=self.engine)
        self.db = Session()

        self.resident = models.Resident(
            id=10,
            full_name="Pedro Resident",
            email="pedro.resident@caloocan.ph",
            password_hash="fakehash",
            is_verified=True,
            is_active=True
        )
        self.unverified_resident = models.Resident(
            id=11,
            full_name="Unverified Citizen",
            email="unverified@caloocan.ph",
            password_hash="fakehash",
            is_verified=False,
            is_active=True
        )
        self.official = models.Official(
            id=20,
            full_name="Engr. Admin Official",
            email="admin.engineer@caloocan.gov.ph",
            password_hash="fakehash",
            role="admin",
            is_active=True
        )
        self.db.add_all([self.resident, self.unverified_resident, self.official])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def _create_jwt(self, email: str, expired: bool = False) -> str:
        delta = timedelta(hours=-1) if expired else timedelta(hours=1)
        exp = datetime.utcnow() + delta
        payload = {"sub": email, "exp": exp}
        return jwt.encode(payload, auth.SECRET_KEY, algorithm=auth.ALGORITHM)

    def test_missing_header_returns_none(self):
        """M1-AUT-01: Verify missing token returns None without raising 401."""
        user = auth.get_optional_current_user(token=None, db=self.db)
        self.assertIsNone(user)

        user_blank = auth.get_optional_current_user(token="   ", db=self.db)
        self.assertIsNone(user_blank)

    def test_valid_resident_jwt(self):
        """M1-AUT-02: Verify valid resident JWT returns Resident instance."""
        token = self._create_jwt("pedro.resident@caloocan.ph")
        user = auth.get_optional_current_user(token=token, db=self.db)
        self.assertIsNotNone(user)
        self.assertIsInstance(user, models.Resident)
        self.assertEqual(user.email, "pedro.resident@caloocan.ph")
        self.assertEqual(user.role, "resident")

    def test_valid_official_jwt(self):
        """M1-AUT-03: Verify valid official JWT returns Official instance."""
        token = self._create_jwt("admin.engineer@caloocan.gov.ph")
        user = auth.get_optional_current_user(token=token, db=self.db)
        self.assertIsNotNone(user)
        self.assertIsInstance(user, models.Official)
        self.assertEqual(user.email, "admin.engineer@caloocan.gov.ph")
        self.assertEqual(user.role, "admin")

    def test_unverified_resident_returns_none(self):
        """M1-AUT-04: Verify unverified resident returns None (guest mode)."""
        token = self._create_jwt("unverified@caloocan.ph")
        user = auth.get_optional_current_user(token=token, db=self.db)
        self.assertIsNone(user)

    def test_expired_jwt_returns_none(self):
        """M1-AUT-05: Verify expired token returns None without raising exception."""
        token = self._create_jwt("pedro.resident@caloocan.ph", expired=True)
        user = auth.get_optional_current_user(token=token, db=self.db)
        self.assertIsNone(user)

    def test_garbage_jwt_returns_none(self):
        """M1-AUT-06: Verify malformed/corrupt token string returns None."""
        user = auth.get_optional_current_user(token="completely_invalid_garbage_jwt_string", db=self.db)
        self.assertIsNone(user)


# ─────────────────────────────────────────────────────────────────────────────
# Test Class 5: Database Migration Idempotency & Legacy Data Preservation
# ─────────────────────────────────────────────────────────────────────────────
class TestDatabaseMigration(unittest.TestCase):

    def test_migration_sqlite_idempotency_and_preservation(self):
        """M1-MIG-01 & M1-MIG-02: Verify migration runs idempotently and preserves existing rows."""
        engine = create_engine("sqlite:///:memory:", poolclass=StaticPool)

        # 1. Simulate legacy database with old reports schema
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE residents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    full_name VARCHAR,
                    email VARCHAR UNIQUE
                );
            """))
            conn.execute(text("""
                CREATE TABLE reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticket_id VARCHAR UNIQUE,
                    resident_id INTEGER REFERENCES residents(id),
                    category VARCHAR NOT NULL,
                    description TEXT NOT NULL,
                    status VARCHAR DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("""
                INSERT INTO residents (id, full_name, email) VALUES (1, 'Legacy User', 'legacy@caloocan.ph');
            """))
            conn.execute(text("""
                INSERT INTO reports (id, ticket_id, resident_id, category, description)
                VALUES (1, 'RPT-LEGACY-001', 1, 'Pothole', 'Pre-existing legacy ticket');
            """))
            conn.commit()

        # 2. Run migration first time
        success1 = run_migration(engine)
        self.assertTrue(success1)

        # 3. Run migration second time (idempotency check)
        success2 = run_migration(engine)
        self.assertTrue(success2)

        # 4. Run migration third time
        success3 = run_migration(engine)
        self.assertTrue(success3)

        # 5. Verify all columns are present and legacy data is intact
        with engine.connect() as conn:
            inspector = inspect(conn)
            col_names = {c["name"] for c in inspector.get_columns("reports")}
            expected_new_cols = {
                "reporter_type",
                "tracking_token_hash",
                "contact_email",
                "contact_phone",
                "contact_verified",
                "claimed_at",
                "claimed_by_user_id",
                "submission_source",
            }
            self.assertTrue(expected_new_cols.issubset(col_names))

            row = conn.execute(text("SELECT * FROM reports WHERE ticket_id = 'RPT-LEGACY-001'")).mappings().fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["ticket_id"], "RPT-LEGACY-001")
            self.assertEqual(row["resident_id"], 1)
            self.assertEqual(row["reporter_type"], "registered")
            self.assertEqual(row["submission_source"], "web")
            self.assertEqual(row["contact_verified"], 0)


# ─────────────────────────────────────────────────────────────────────────────
# Test Runner
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
