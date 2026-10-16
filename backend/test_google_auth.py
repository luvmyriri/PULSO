"""
test_google_auth.py - Test Suite for Google Identity Services (GIS) Sign-In
=============================================================================
Tests:
1. First-time Google sign-in -> clean new account created with is_verified=False.
2. Returning resident with existing verified account -> links Google account & authenticates.
3. Returning resident with existing unverified account -> enforces pending verification state.
4. Completing ID verification for Google user -> verifies identity, grants portal access.
5. Security: Rejection of invalid tokens.
"""

import sys
import os
import unittest
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import engine, get_db, Base
import models
from main import app, GOOGLE_CLIENT_ID

client = TestClient(app)

class TestGoogleAuth(unittest.TestCase):
    def setUp(self):
        # Setup clean test users in the database
        db = next(get_db())
        try:
            # Clean up prior test accounts
            test_emails = [
                "new_google_resident_test@example.com",
                "existing_verified_resident@example.com",
                "existing_unverified_resident@example.com"
            ]
            for email in test_emails:
                u = db.query(models.Resident).filter(models.Resident.email == email).first()
                if u:
                    db.delete(u)
            db.commit()

            # Seed existing verified resident
            verified_resident = models.Resident(
                full_name="Maria Santos",
                email="existing_verified_resident@example.com",
                password_hash="fake_hash_123",
                phone_number="09171112233",
                is_verified=True,
                kyc_level="Silver (Primary ID Verified)",
                id_tier="primary",
                id_type="philsys",
                address="123 Camarin Rd, Caloocan City",
                is_active=True
            )
            db.add(verified_resident)

            # Seed existing unverified resident
            unverified_resident = models.Resident(
                full_name="Juan Cruz",
                email="existing_unverified_resident@example.com",
                password_hash="fake_hash_456",
                phone_number="09182223344",
                is_verified=False,
                kyc_level="Bronze (Unverified)",
                address="456 Bagumbong Rd, Caloocan City",
                is_active=True
            )
            db.add(unverified_resident)
            db.commit()
        finally:
            db.close()

    def tearDown(self):
        db = next(get_db())
        try:
            test_emails = [
                "new_google_resident_test@example.com",
                "existing_verified_resident@example.com",
                "existing_unverified_resident@example.com"
            ]
            for email in test_emails:
                u = db.query(models.Resident).filter(models.Resident.email == email).first()
                if u:
                    db.delete(u)
            db.commit()
        finally:
            db.close()

    def test_first_time_google_signin(self):
        """First-time Google sign-in should create an unverified account and route to ID verification."""
        email = "new_google_resident_test@example.com"
        mock_token = f"mock_google_token:{email}:New Resident:google_sub_first_time_999"

        response = client.post("/api/auth/google", json={"credential": mock_token})
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["status"], "new_unverified")
        self.assertEqual(data["action"], "route_to_id_verification")
        self.assertEqual(data["user"]["email"], email)
        self.assertFalse(data["user"]["is_verified"])
        self.assertNotIn("access_token", data, "Unverified first-time account MUST NOT receive an access_token")

        # Verify DB entry
        db = next(get_db())
        user_db = db.query(models.Resident).filter(models.Resident.email == email).first()
        self.assertIsNotNone(user_db)
        self.assertEqual(user_db.google_id, "google_sub_first_time_999")
        self.assertFalse(user_db.is_verified)
        db.close()

    def test_existing_verified_account_linking(self):
        """Returning resident who already has a verified account should link Google and get authenticated."""
        email = "existing_verified_resident@example.com"
        mock_token = f"mock_google_token:{email}:Maria Santos:google_sub_verified_777"

        response = client.post("/api/auth/google", json={"credential": mock_token})
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["status"], "authenticated")
        self.assertTrue(data.get("linked_existing"))
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["email"], email)
        self.assertTrue(data["user"]["is_verified"])

        # Check DB that google_id was linked
        db = next(get_db())
        user_db = db.query(models.Resident).filter(models.Resident.email == email).first()
        self.assertEqual(user_db.google_id, "google_sub_verified_777")
        self.assertTrue(user_db.is_verified)
        db.close()

    def test_existing_unverified_account_linking(self):
        """Returning resident who hasn't verified ID must see pending verification and not receive portal token."""
        email = "existing_unverified_resident@example.com"
        mock_token = f"mock_google_token:{email}:Juan Cruz:google_sub_unverified_555"

        response = client.post("/api/auth/google", json={"credential": mock_token})
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["status"], "pending_verification")
        self.assertEqual(data["action"], "route_to_id_verification")
        self.assertFalse(data["user"]["is_verified"])
        self.assertNotIn("access_token", data, "Unverified account MUST NOT receive an access_token")

        # Check DB that google_id was linked
        db = next(get_db())
        user_db = db.query(models.Resident).filter(models.Resident.email == email).first()
        self.assertEqual(user_db.google_id, "google_sub_unverified_555")
        self.assertFalse(user_db.is_verified)
        db.close()

    def test_google_complete_id_verification(self):
        """After Google sign-in, completing ID verification must verify account and grant portal token."""
        # 1. First-time sign-in
        email = "new_google_resident_test@example.com"
        mock_token = f"mock_google_token:{email}:Alex Rivera:google_sub_complete_test"
        client.post("/api/auth/google", json={"credential": mock_token})

        # 2. Submit ID verification details (e.g. PhilSys National ID)
        verify_payload = {
            "email": email,
            "full_name": "Alex Rivera",
            "phone_number": "09179998877",
            "address": "Lot 5 Block 2, Phase 1, Barangay 171, Caloocan City",
            "barangay": "Barangay 171",
            "id_tier": "primary",
            "id_type": "philsys",
            "verification_mode": "automated",
            "id_number": "1234-5678-9012-3456"
        }
        res = client.post("/api/auth/google/complete-verification", json=verify_payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["status"], "verified")
        self.assertIn("access_token", data)
        self.assertTrue(data["user"]["is_verified"])
        self.assertEqual(data["user"]["kyc_level"], "Gold (PhilSys Verified)")

        # Verify DB updated
        db = next(get_db())
        user_db = db.query(models.Resident).filter(models.Resident.email == email).first()
        self.assertTrue(user_db.is_verified)
        self.assertEqual(user_db.kyc_level, "Gold (PhilSys Verified)")
        self.assertEqual(user_db.id_type, "philsys")
        db.close()

    def test_invalid_google_token_rejected(self):
        """Invalid Google token must return 401 Unauthorized."""
        response = client.post("/api/auth/google", json={"credential": "invalid_bogus_token_xyz"})
        self.assertEqual(response.status_code, 401)

if __name__ == "__main__":
    unittest.main()
