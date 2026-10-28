"""Google sign-in must not exchange synthetic or unproven identity for sessions."""

import pytest
from fastapi.testclient import TestClient

from database import get_db
from main import app, verify_google_id_token


@pytest.mark.parametrize("environment", ["", "development", "production", "staging"])
def test_synthetic_google_token_rejected_outside_explicit_test(monkeypatch, environment):
    monkeypatch.setenv("PULSO_ENV", environment)
    monkeypatch.setenv("PULSO_ALLOW_MOCK_GOOGLE_TOKENS", "true")
    with pytest.raises(ValueError, match="Synthetic Google credentials are disabled"):
        verify_google_id_token("mock_google_token:anyone@gmail.com:Any User:synthetic-sub")


def test_synthetic_google_token_requires_second_test_switch(monkeypatch):
    monkeypatch.setenv("PULSO_ENV", "test")
    monkeypatch.delenv("PULSO_ALLOW_MOCK_GOOGLE_TOKENS", raising=False)
    with pytest.raises(ValueError, match="Synthetic Google credentials are disabled"):
        verify_google_id_token("mock_google_token:anyone@gmail.com:Any User:synthetic-sub")


def test_legacy_google_verification_cannot_issue_session():
    app.dependency_overrides[get_db] = lambda: None
    try:
        response = TestClient(app).post(
            "/api/auth/google/complete-verification",
            json={
                "email": "anyone@gmail.com",
                "full_name": "Any User",
                "phone_number": "09170000000",
                "id_tier": "primary",
                "id_type": "philsys",
                "verification_mode": "automated",
            },
        )
    finally:
        app.dependency_overrides.pop(get_db, None)
    assert response.status_code == 410
    assert "access_token" not in response.json()
