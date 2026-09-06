"""
Self-verification runner for explorer_m1_3 to prove test suite design validity.
"""
import sys
import os
import unittest
import re
import secrets
import hashlib
import hmac
from datetime import datetime, timezone, timedelta
from typing import Optional, Union, List, Dict, Any

from pydantic import BaseModel, ConfigDict, ValidationError
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON, text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.pool import StaticPool
from jose import jwt

TestBase = declarative_base()

class MockResident(TestBase):
    __tablename__ = "residents"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    is_verified = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    @property
    def role(self):
        return "resident"

    reports = relationship("MockReport", foreign_keys="[MockReport.resident_id]", back_populates="reporter")


class MockOfficial(TestBase):
    __tablename__ = "officials"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    role = Column(String, default="staff")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class MockReport(TestBase):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String, unique=True, index=True)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=True)
    category = Column(String, index=True)
    description = Column(String)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    location_string = Column(String, nullable=True)
    location_barangay = Column(String, nullable=True)
    status = Column(String, default="pending", index=True)
    image_url = Column(String, nullable=True)

    # 8 New Guest Reporting & Contextual Authentication Columns
    reporter_type = Column(String(20), default="registered", nullable=False, index=True)
    tracking_token_hash = Column(String(128), nullable=True, index=True)
    contact_email = Column(String(255), nullable=True, index=True)
    contact_phone = Column(String(50), nullable=True)
    contact_verified = Column(Boolean, default=False, nullable=False)
    claimed_at = Column(DateTime(timezone=True), nullable=True)
    claimed_by_user_id = Column(Integer, ForeignKey("residents.id"), nullable=True, index=True)
    submission_source = Column(String(30), default="web", nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    reporter = relationship("MockResident", foreign_keys=[resident_id], back_populates="reports")
    claimed_by = relationship("MockResident", foreign_keys=[claimed_by_user_id])

    @property
    def reporter_name(self):
        if hasattr(self, "_reporter_name_override"):
            return self._reporter_name_override
        return self.reporter.full_name if self.reporter else "Anonymous Resident"

    @reporter_name.setter
    def reporter_name(self, value):
        self._reporter_name_override = value

    @property
    def is_claimed(self) -> bool:
        return self.claimed_by_user_id is not None


TEST_JWT_SECRET = "PULSO_TEST_SECRET_KEY_CALOOCAN_2026_UNIT_VERIFICATION"
TOKEN_REGEX = re.compile(r"^TRK-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$")

def generate_tracking_token() -> str:
    raw = secrets.token_hex(8).upper()
    return f"TRK-{raw[:4]}-{raw[4:8]}-{raw[8:12]}-{raw[12:16]}"

def normalize_tracking_token(token: Optional[str]) -> str:
    if not token or not isinstance(token, str):
        return ""
    clean = token.strip().upper().replace("-", "").replace(" ", "").replace("_", "")
    if clean.startswith("TRK"):
        clean = clean[3:]
    return clean

def hash_tracking_token(token: Optional[str], secret: Optional[str] = None) -> str:
    normalized = normalize_tracking_token(token)
    if not normalized:
        return ""
    key = (secret or TEST_JWT_SECRET).encode("utf-8")
    return hmac.new(key, normalized.encode("utf-8"), hashlib.sha256).hexdigest()

def verify_tracking_token(provided_token: Optional[str], stored_hash: Optional[str], secret: Optional[str] = None) -> bool:
    if not provided_token or not stored_hash:
        return False
    computed_hash = hash_tracking_token(provided_token, secret=secret)
    if not computed_hash:
        return False
    return secrets.compare_digest(computed_hash.lower(), stored_hash.strip().lower())


class ReportCreateSchema(BaseModel):
    category: str
    description: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_string: Optional[str] = None
    location_barangay: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    submission_source: Optional[str] = "web"

class PublicTimelineItemSchema(BaseModel):
    stage: Optional[str] = None
    status: str
    label: Optional[str] = None
    timestamp: Optional[datetime] = None
    note: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ReportTrackResponseSchema(BaseModel):
    ticket_id: str
    category: str
    status: str
    public_status_label: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    location_barangay: Optional[str] = None
    location_summary: Optional[str] = None
    is_claimed: bool = False
    timeline: List[PublicTimelineItemSchema] = []
    model_config = ConfigDict(from_attributes=True)

class ReportTrackRequestSchema(BaseModel):
    ticket_id: str
    tracking_token: str

class ReportClaimRequestSchema(BaseModel):
    tracking_token: str

class ReportResponseSchema(BaseModel):
    id: int
    ticket_id: str
    resident_id: Optional[int] = None
    status: str
    category: str
    description: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_string: Optional[str] = None
    location_barangay: Optional[str] = None
    image_url: Optional[str] = None
    reporter_type: str = "registered"
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_verified: bool = False
    claimed_at: Optional[datetime] = None
    claimed_by_user_id: Optional[int] = None
    submission_source: str = "web"
    is_claimed: bool = False
    reporter_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TestReportModelEvolution(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", poolclass=StaticPool)
        TestBase.metadata.create_all(bind=self.engine)
        Session = sessionmaker(bind=self.engine)
        self.db = Session()

    def tearDown(self):
        self.db.close()
        TestBase.metadata.drop_all(bind=self.engine)

    def test_guest_report_creation_and_defaults(self):
        token = generate_tracking_token()
        token_hash = hash_tracking_token(token)

        guest_report = MockReport(
            ticket_id="RPT-20260902-A1B2C3D4",
            resident_id=None,
            category="Roads & Bridges",
            description="Severe pothole causing vehicle damage",
            reporter_type="guest",
            tracking_token_hash=token_hash,
            contact_email="citizen.guest@caloocan.ph",
            contact_phone="09171234567",
            submission_source="web"
        )
        self.db.add(guest_report)
        self.db.commit()
        self.db.refresh(guest_report)

        self.assertIsNotNone(guest_report.id)
        self.assertIsNone(guest_report.resident_id)
        self.assertEqual(guest_report.reporter_type, "guest")
        self.assertEqual(guest_report.tracking_token_hash, token_hash)
        self.assertFalse(guest_report.contact_verified)
        self.assertIsNone(guest_report.claimed_at)
        self.assertIsNone(guest_report.claimed_by_user_id)
        self.assertFalse(guest_report.is_claimed)
        self.assertEqual(guest_report.submission_source, "web")
        self.assertEqual(guest_report.reporter_name, "Anonymous Resident")

    def test_registered_report_relation(self):
        resident = MockResident(
            id=101,
            full_name="Maria Clara Santos",
            email="maria.santos@caloocan.ph"
        )
        self.db.add(resident)
        self.db.commit()

        report = MockReport(
            ticket_id="RPT-20260902-REG00001",
            resident_id=resident.id,
            category="Street Lighting",
            description="Busted bulb near barangay hall",
            reporter_type="registered"
        )
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)

        self.assertEqual(report.resident_id, 101)
        self.assertEqual(report.reporter.full_name, "Maria Clara Santos")
        self.assertEqual(report.reporter_name, "Maria Clara Santos")
        self.assertIsNone(report.tracking_token_hash)

    def test_report_claiming_flow(self):
        guest_report = MockReport(
            ticket_id="RPT-20260902-CLAIM001",
            resident_id=None,
            category="Drainage",
            description="Flooding during rain",
            reporter_type="guest"
        )
        resident = MockResident(
            id=202,
            full_name="Juan dela Cruz",
            email="juan@caloocan.ph"
        )
        self.db.add_all([guest_report, resident])
        self.db.commit()

        claim_time = datetime.now(timezone.utc)
        guest_report.claimed_by_user_id = resident.id
        guest_report.claimed_at = claim_time
        guest_report.resident_id = resident.id
        self.db.commit()
        self.db.refresh(guest_report)

        self.assertEqual(guest_report.claimed_by_user_id, 202)
        self.assertTrue(guest_report.is_claimed)
        self.assertEqual(guest_report.claimed_by.full_name, "Juan dela Cruz")
        self.assertEqual(guest_report.resident_id, 202)


class TestPydanticSchemaValidation(unittest.TestCase):
    def test_report_create_schema_guest(self):
        payload = {
            "category": "Waste Management",
            "description": "Uncollected garbage piling up",
            "location_lat": 14.7565,
            "location_lng": 121.0450,
            "location_barangay": "Barangay 171",
            "contact_email": "resident@gmail.com",
            "contact_phone": "09181234567",
            "submission_source": "web"
        }
        schema = ReportCreateSchema(**payload)
        self.assertEqual(schema.category, "Waste Management")
        self.assertEqual(schema.contact_email, "resident@gmail.com")
        self.assertEqual(schema.submission_source, "web")

    def test_report_response_zero_hash_leakage(self):
        mock_data = {
            "id": 1,
            "ticket_id": "RPT-20260902-SEC00001",
            "resident_id": None,
            "status": "pending",
            "category": "Roads & Bridges",
            "description": "Pothole repair needed",
            "reporter_type": "guest",
            "tracking_token_hash": "SUPER_SECRET_HMAC_HASH_1234567890ABCDEF",
            "contact_email": "guest@caloocan.ph",
            "contact_phone": "09171234567",
            "contact_verified": False,
            "claimed_at": None,
            "claimed_by_user_id": None,
            "submission_source": "web",
            "is_claimed": False,
            "reporter_name": "Anonymous Resident",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        resp = ReportResponseSchema(**mock_data)
        dumped = resp.model_dump()

        self.assertNotIn("tracking_token_hash", dumped)
        self.assertNotIn("tracking_token_hash", ReportResponseSchema.model_fields.keys())
        self.assertEqual(dumped["reporter_type"], "guest")
        self.assertFalse(dumped["is_claimed"])

    def test_public_track_response_sanitization(self):
        prohibited_fields = {
            "resident_id",
            "contact_email",
            "contact_phone",
            "ai_reasoning",
            "ai_metadata",
            "tracking_token_hash",
            "internal_notes"
        }
        track_fields = set(ReportTrackResponseSchema.model_fields.keys())
        leakage = prohibited_fields.intersection(track_fields)
        self.assertEqual(leakage, set(), f"PII or Internal fields found in PublicTrackResponse: {leakage}")

    def test_track_request_validation(self):
        with self.assertRaises(ValidationError):
            ReportTrackRequestSchema(ticket_id="RPT-12345")

        with self.assertRaises(ValidationError):
            ReportTrackRequestSchema(tracking_token="TRK-1234-5678-9012-3456")


class TestSecurityAndTokenCryptography(unittest.TestCase):
    def test_token_format(self):
        for _ in range(50):
            token = generate_tracking_token()
            self.assertTrue(TOKEN_REGEX.match(token), f"Token '{token}' failed regex validation")
            self.assertEqual(len(token), 23)

    def test_token_uniqueness(self):
        tokens = [generate_tracking_token() for _ in range(10000)]
        self.assertEqual(len(tokens), len(set(tokens)), "Collision detected in token generator")

    def test_token_hashing_determinism_and_length(self):
        token = "TRK-9F83-A8B2-C4E6-10D7"
        hash1 = hash_tracking_token(token)
        hash2 = hash_tracking_token(token)

        self.assertEqual(len(hash1), 64)
        self.assertEqual(hash1, hash2)
        self.assertTrue(all(c in "0123456789abcdef" for c in hash1))

    def test_token_normalization_invariance(self):
        canonical = "TRK-9F83-A8B2-C4E6-10D7"
        canonical_hash = hash_tracking_token(canonical)

        variations = [
            "trk-9f83-a8b2-c4e6-10d7",
            "Trk-9F83-a8B2-C4e6-10D7",
            "  TRK-9F83-A8B2-C4E6-10D7  ",
            "TRK9F83A8B2C4E610D7",
            "9F83A8B2C4E610D7",
            "trk 9f83 a8b2 c4e6 10d7"
        ]

        for var in variations:
            var_hash = hash_tracking_token(var)
            self.assertEqual(var_hash, canonical_hash, f"Variation '{var}' did not match canonical hash")

    def test_token_verification_positive(self):
        token = generate_tracking_token()
        stored_hash = hash_tracking_token(token)

        self.assertTrue(verify_tracking_token(token, stored_hash))
        self.assertTrue(verify_tracking_token(token.lower(), stored_hash))
        self.assertTrue(verify_tracking_token(f"  {token}  ", stored_hash))
        self.assertTrue(verify_tracking_token(token.replace("-", ""), stored_hash))

    def test_token_verification_negative(self):
        token = generate_tracking_token()
        stored_hash = hash_tracking_token(token)

        other_token = generate_tracking_token()
        self.assertFalse(verify_tracking_token(other_token, stored_hash))

        tampered_token = token[:-1] + ("0" if token[-1] != "0" else "1")
        self.assertFalse(verify_tracking_token(tampered_token, stored_hash))

    def test_token_verification_edge_cases(self):
        token = generate_tracking_token()
        stored_hash = hash_tracking_token(token)

        self.assertFalse(verify_tracking_token("", stored_hash))
        self.assertFalse(verify_tracking_token(None, stored_hash))
        self.assertFalse(verify_tracking_token(token, ""))
        self.assertFalse(verify_tracking_token(token, None))
        self.assertFalse(verify_tracking_token(None, None))
        self.assertFalse(verify_tracking_token("   ", stored_hash))


class TestDatabaseMigrationIdempotency(unittest.TestCase):
    def test_migration_sqlite_idempotent_execution(self):
        engine = create_engine("sqlite:///:memory:", poolclass=StaticPool)

        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticket_id VARCHAR UNIQUE,
                    resident_id INTEGER,
                    category VARCHAR NOT NULL,
                    description TEXT NOT NULL,
                    status VARCHAR DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("""
                INSERT INTO reports (ticket_id, resident_id, category, description)
                VALUES ('RPT-LEGACY-001', 5, 'Roads', 'Pre-existing legacy report');
            """))
            conn.commit()

        NEW_COLUMNS = [
            ("reporter_type", "VARCHAR(20) DEFAULT 'registered'"),
            ("tracking_token_hash", "VARCHAR(128)"),
            ("contact_email", "VARCHAR(255)"),
            ("contact_phone", "VARCHAR(50)"),
            ("contact_verified", "BOOLEAN DEFAULT 0"),
            ("claimed_at", "TIMESTAMP"),
            ("claimed_by_user_id", "INTEGER"),
            ("submission_source", "VARCHAR(30) DEFAULT 'web'")
        ]

        def run_migration():
            with engine.connect() as conn:
                cols_info = conn.execute(text("PRAGMA table_info(reports);")).fetchall()
                existing_cols = {c[1] for c in cols_info}

                for col_name, col_def in NEW_COLUMNS:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE reports ADD COLUMN {col_name} {col_def};"))
                conn.commit()

        run_migration()
        run_migration()
        run_migration()

        with engine.connect() as conn:
            cols = conn.execute(text("PRAGMA table_info(reports);")).fetchall()
            col_names = {c[1] for c in cols}
            for col_name, _ in NEW_COLUMNS:
                self.assertIn(col_name, col_names)

            legacy_row = conn.execute(text("SELECT * FROM reports WHERE ticket_id = 'RPT-LEGACY-001';")).mappings().fetchone()
            self.assertIsNotNone(legacy_row)
            self.assertEqual(legacy_row["category"], "Roads")
            self.assertEqual(legacy_row["resident_id"], 5)
            self.assertEqual(legacy_row["reporter_type"], "registered")
            self.assertEqual(legacy_row["submission_source"], "web")


class TestOptionalAuthenticationMiddleware(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", poolclass=StaticPool)
        TestBase.metadata.create_all(bind=self.engine)
        Session = sessionmaker(bind=self.engine)
        self.db = Session()

        self.resident = MockResident(id=50, full_name="Pedro Citizen", email="pedro@caloocan.ph", is_verified=True)
        self.unverified_resident = MockResident(id=51, full_name="New Citizen", email="unverified@caloocan.ph", is_verified=False)
        self.official = MockOfficial(id=10, full_name="Engr. Admin", email="admin@caloocan.gov.ph", role="admin")

        self.db.add_all([self.resident, self.unverified_resident, self.official])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        TestBase.metadata.drop_all(bind=self.engine)

    def _create_token(self, email: str, expired: bool = False) -> str:
        delta = timedelta(hours=-1) if expired else timedelta(hours=1)
        exp = datetime.now(timezone.utc) + delta
        payload = {"sub": email, "exp": exp}
        return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")

    def _get_optional_current_user(self, token: Optional[str]) -> Optional[Union[MockOfficial, MockResident]]:
        if not token:
            return None
        try:
            payload = jwt.decode(token, TEST_JWT_SECRET, algorithms=["HS256"])
            email: str = payload.get("sub")
            if not email:
                return None
            official = self.db.query(MockOfficial).filter(MockOfficial.email == email).first()
            if official and official.is_active:
                return official
            resident = self.db.query(MockResident).filter(MockResident.email == email).first()
            if resident and resident.is_verified and resident.is_active:
                return resident
            return None
        except Exception:
            return None

    def test_missing_header_returns_none(self):
        user = self._get_optional_current_user(token=None)
        self.assertIsNone(user)

    def test_valid_resident_jwt(self):
        token = self._create_token("pedro@caloocan.ph")
        user = self._get_optional_current_user(token=token)
        self.assertIsNotNone(user)
        self.assertEqual(user.email, "pedro@caloocan.ph")
        self.assertEqual(user.role, "resident")

    def test_valid_official_jwt(self):
        token = self._create_token("admin@caloocan.gov.ph")
        user = self._get_optional_current_user(token=token)
        self.assertIsNotNone(user)
        self.assertEqual(user.email, "admin@caloocan.gov.ph")
        self.assertEqual(user.role, "admin")

    def test_unverified_resident_returns_none(self):
        token = self._create_token("unverified@caloocan.ph")
        user = self._get_optional_current_user(token=token)
        self.assertIsNone(user)

    def test_expired_jwt_returns_none(self):
        token = self._create_token("pedro@caloocan.ph", expired=True)
        user = self._get_optional_current_user(token=token)
        self.assertIsNone(user)

    def test_garbage_jwt_returns_none(self):
        user = self._get_optional_current_user(token="not_a_valid_jwt_string_12345")
        self.assertIsNone(user)


if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
