from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock

import auth
import main
import models
from tests.test_government_workspace import context
from utils.rate_limiter import auth_limiter


def test_email_codes_are_private_and_scoped_to_their_purpose(context, monkeypatch):
    client, sessions, headers = context
    email = "owner@test.invalid"
    with sessions() as db:
        db.add(models.PasswordResetToken(
            email=email, token="111111", used=False,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        ))
        db.commit()
    deliver = Mock(return_value=True)
    monkeypatch.setattr(main, "send_otp_email", deliver)
    monkeypatch.setattr(main.secrets, "randbelow", Mock(side_effect=[620451, 1, 857032, 2]))

    def reset(code):
        return client.post("/api/auth/reset-password", json={
            "email": email, "code": code, "new_password": "new-private-password",
        })

    assert reset("111111").status_code == 400
    sent = client.post("/api/auth/send-2fa-code", json={"email": email})
    assert sent.status_code == 200
    assert "code" not in sent.json()
    two_step = deliver.call_args.args[1]
    assert reset(two_step).status_code == 400
    assert client.post("/api/auth/verify-2fa-code", json={"email": email, "code": "123456"}).status_code == 400

    recovery = client.post("/api/auth/forgot-password", json={"email": email})
    assert recovery.status_code == 200
    recovery_code = deliver.call_args.args[1]
    assert client.post("/api/auth/verify-2fa-code", json={"email": email, "code": recovery_code}).status_code == 400
    assert client.post("/api/auth/verify-2fa-code", json={"email": email, "code": two_step}).status_code == 200
    assert client.post("/api/auth/verify-2fa-code", json={"email": email, "code": two_step}).status_code == 400

    with sessions() as db:
        stored_codes = [token for (token,) in db.query(models.PasswordResetToken.token)]
        assert two_step not in stored_codes and recovery_code not in stored_codes
    with ThreadPoolExecutor(max_workers=2) as executor:
        assert sorted(executor.map(lambda _: reset(recovery_code).status_code, range(2))) == [200, 400]
    assert client.get("/api/me", headers=headers["owner"]).status_code == 401


def test_failed_email_delivery_invalidates_code_and_allows_retry(context, monkeypatch):
    client, _, _ = context
    deliver = Mock(side_effect=[False, True])
    monkeypatch.setattr(main, "send_otp_email", deliver)
    payload = {"email": "owner@test.invalid"}
    assert client.post("/api/auth/forgot-password", json=payload).status_code == 503
    payload["code"] = deliver.call_args.args[1]
    assert client.post("/api/auth/verify-reset-code", json=payload).status_code == 400
    assert client.post("/api/auth/forgot-password", json=payload).status_code == 200
    assert client.post("/api/auth/forgot-password", json=payload).status_code == 429


def test_resident_login_token_cannot_resolve_to_staff_with_same_email(context, monkeypatch):
    client, sessions, headers = context
    email = "owner@test.invalid"
    with sessions() as db:
        db.get(models.Resident, 100).password_hash = auth.get_password_hash("resident-test-password")
        db.get(models.Official, 1).email = email
        db.get(models.Official, 1).password_hash = auth.get_password_hash("staff-test-password")
        db.commit()

    async def verified_captcha(*args):
        return True

    monkeypatch.setattr(main, "verify_recaptcha", verified_captcha)
    assert client.get("/api/me", headers=headers["owner"]).status_code == 401
    for password, expected in (("resident-test-password", "resident"), ("staff-test-password", "staff")):
        response = client.post("/api/auth/login", data={"username": email, "password": password, "captcha_token": "fake"})
        assert response.status_code == 200, response.text
        assert response.json()["user"]["account_type"] == expected
        signed = {"Authorization": "Bearer " + response.json()["access_token"]}
        me = client.get("/api/me", headers=signed)
        assert me.status_code == 200, me.text
        assert me.json()["id"] == (100 if expected == "resident" else 1)


def test_login_throttling_ignores_forged_client_headers(context, monkeypatch):
    client, _, _ = context
    monkeypatch.setattr(auth_limiter, "max_requests", 2)
    payload = {"username": "missing@test.invalid", "password": "fake"}
    for number in range(2):
        response = client.post("/api/auth/login", data=payload, headers={"X-Forwarded-For": f"192.0.2.{number}"})
        assert response.status_code == 401
    response = client.post("/api/auth/login", data=payload, headers={"X-Real-IP": "192.0.2.3"})
    assert response.status_code == 429
    assert "Retry-After" in response.headers
