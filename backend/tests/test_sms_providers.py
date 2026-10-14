"""Provider contract and phone OTP safety tests; no real SMS is sent."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import gov_models
import models
import sms_utils
from database import Base, get_db
from main import app


class FakeResponse:
    def __init__(self, status_code=200, body=None):
        self.status_code = status_code
        self.body = body

    def raise_for_status(self):
        if self.status_code >= 400:
            raise sms_utils.requests.HTTPError("provider rejected request")

    def json(self):
        return self.body


def test_semaphore_otp_route_and_failure_handling(monkeypatch):
    monkeypatch.setenv("SMS_PROVIDER", "semaphore")
    monkeypatch.setenv("SEMAPHORE_API_KEY", "test-only-key")
    monkeypatch.delenv("SEMAPHORE_SENDER_NAME", raising=False)
    calls = []

    def post(url, data, timeout):
        calls.append((url, data.copy(), timeout))
        return FakeResponse(body=[{"message_id": 73, "status": "Pending"}])

    monkeypatch.setattr(sms_utils.requests, "post", post)
    result = sms_utils.send_login_otp_sms("09171234567", "246810", "OTP-12345")
    assert result.accepted is True
    assert result.provider_message_id == 73
    assert calls[0][0].endswith("/otp")
    assert calls[0][1]["code"] == "246810"
    assert "{otp}" in calls[0][1]["message"]
    assert "sendername" not in calls[0][1]

    monkeypatch.setattr(sms_utils.requests, "post", lambda *a, **kw: FakeResponse(400))
    assert sms_utils.send_login_otp_sms("09171234567", "246810").accepted is False
    monkeypatch.setattr(sms_utils.requests, "post", lambda *a, **kw: FakeResponse(body={"status": "Pending"}))
    assert sms_utils.send_login_otp_sms("09171234567", "246810").accepted is False


def test_no_key_never_claims_success_or_calls_provider(monkeypatch):
    monkeypatch.setenv("SMS_PROVIDER", "semaphore")
    monkeypatch.delenv("SEMAPHORE_API_KEY", raising=False)
    monkeypatch.setattr(sms_utils.requests, "post", lambda *a, **kw: pytest.fail("unexpected API call"))
    assert sms_utils.send_login_otp_sms("09171234567", "246810").accepted is False
    assert sms_utils.send_emergency_sms("09171234567", "test", "test").accepted is False


def test_staff_alert_uses_priority_without_case_details(monkeypatch):
    monkeypatch.setenv("SMS_PROVIDER", "semaphore")
    monkeypatch.setenv("SEMAPHORE_API_KEY", "test-only-key")
    captured = {}

    def post(url, data, timeout):
        captured.update(url=url, data=data)
        return FakeResponse(body=[{"message_id": 74, "status": "Queued"}])

    monkeypatch.setattr(sms_utils.requests, "post", post)
    result = sms_utils.send_emergency_sms("09171234567", "Private title", "Private report evidence")
    assert result.accepted is True
    assert captured["url"].endswith("/priority")
    assert "Private" not in captured["data"]["message"]


def test_philsms_plain_send_and_error_handling(monkeypatch):
    monkeypatch.setenv("SMS_PROVIDER", "philsms")
    monkeypatch.setenv("PHILSMS_API_TOKEN", "test-only-token")
    monkeypatch.setenv("PHILSMS_SENDER_ID", "TestSender")
    monkeypatch.setenv("PHILSMS_ENABLE_OUTBOUND", "true")
    captured = {}

    def post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, payload=json, timeout=timeout)
        return FakeResponse(body={"status": "success", "data": {"uid": "abc123", "status": "queued"}})

    monkeypatch.setattr(sms_utils.requests, "post", post)
    monkeypatch.setattr(sms_utils.requests, "get", lambda *a, **kw: FakeResponse(body={
        "status": "success", "data": {"uid": "abc123", "sms_type": "plain"}
    }))
    result = sms_utils.send_plain_sms("0961 433 1761", "1")
    assert result.accepted is True
    assert result.provider_message_id == "abc123"
    assert captured["url"] == "https://dashboard.philsms.com/api/v3/sms/send"
    assert captured["headers"]["Authorization"] == "Bearer test-only-token"
    assert captured["payload"] == {
        "recipient": "639614331761", "sender_id": "TestSender", "type": "plain", "message": "1"
    }

    monkeypatch.setattr(sms_utils.requests, "post", lambda *a, **kw: FakeResponse(body={"status": "error"}))
    assert sms_utils.send_plain_sms("09614331761", "1").accepted is False
    monkeypatch.setattr(sms_utils.requests, "post", lambda *a, **kw: FakeResponse(body={"status": "success", "data": {"status": "failed"}}))
    assert sms_utils.send_plain_sms("09614331761", "1").accepted is False


def test_philsms_pilot_is_disabled_and_voice_is_rejected(monkeypatch):
    monkeypatch.setenv("SMS_PROVIDER", "philsms")
    monkeypatch.setenv("PHILSMS_API_TOKEN", "test-only-token")
    monkeypatch.setenv("PHILSMS_SENDER_ID", "TestSender")
    monkeypatch.delenv("PHILSMS_ENABLE_OUTBOUND", raising=False)
    monkeypatch.setattr(sms_utils.requests, "post", lambda *a, **kw: pytest.fail("outbound should be disabled"))
    assert sms_utils.send_plain_sms("09614331761", "1").accepted is False

    monkeypatch.setenv("PHILSMS_ENABLE_OUTBOUND", "true")
    monkeypatch.setattr(sms_utils.requests, "post", lambda *a, **kw: FakeResponse(body={
        "status": "success", "data": {"uid": "voice123", "status": "Delivered"}
    }))
    monkeypatch.setattr(sms_utils.requests, "get", lambda *a, **kw: FakeResponse(body={
        "status": "success", "data": {"uid": "voice123", "sms_type": "voice"}
    }))
    result = sms_utils.send_plain_sms("09614331761", "1")
    assert result.accepted is False
    assert result.provider_message_id == "voice123"
    assert result.provider_status == "delivered"


def test_iprogsms_single_send_and_failure_handling(monkeypatch):
    monkeypatch.setenv("SMS_PROVIDER", "iprogsms")
    monkeypatch.setenv("IPROG_SMS_API_TOKEN", "test-only-token")
    monkeypatch.setenv("IPROG_SMS_ENABLE_OUTBOUND", "true")
    captured = {}

    def post(url, json, timeout):
        if url.endswith("/phone_numbers/detect"):
            assert json == {"api_token": "test-only-token", "phone_number": "09690390776"}
            return FakeResponse(body={
                "status": "success", "data": {"network": "Globe/TM", "is_smart_tnt": False}
            })
        captured.update(url=url, payload=json, timeout=timeout)
        return FakeResponse(body={"status": 200, "message_id": "iSms-abc123"})

    monkeypatch.setattr(sms_utils.requests, "post", post)
    result = sms_utils.send_plain_sms("0969 039 0776", "1")
    assert result == sms_utils.SmsSendResult(True, "iSms-abc123", "queued")
    assert captured["url"] == "https://www.iprogsms.com/api/v1/sms_messages"
    assert captured["payload"] == {
        "api_token": "test-only-token", "phone_number": "639690390776", "message": "1"
    }
    assert captured["timeout"] == 8

    otp_result = sms_utils.send_login_otp_sms("09690390776", "246810", "OTP-12345")
    assert otp_result.accepted is True
    assert "246810" in captured["payload"]["message"]
    assert "OTP-12345" in captured["payload"]["message"]
    staff_result = sms_utils.send_emergency_sms("09690390776", "Private title", "Private details")
    assert staff_result.accepted is True
    assert "Private" not in captured["payload"]["message"]

    monkeypatch.setattr(sms_utils.requests, "post", lambda *a, **kw: FakeResponse(body={"status": 500, "message": "Invalid token"}))
    assert sms_utils.send_plain_sms("09690390776", "1").accepted is False
    monkeypatch.setattr(sms_utils.requests, "post", lambda url, **kw: (
        FakeResponse(body={"status": "success", "data": {"network": "DITO", "is_smart_tnt": False}})
        if url.endswith("/phone_numbers/detect") else FakeResponse(body={"status": 200})
    ))
    assert sms_utils.send_plain_sms("09690390776", "1").accepted is False


def test_iprogsms_is_disabled_by_default(monkeypatch):
    monkeypatch.setenv("SMS_PROVIDER", "iprogsms")
    monkeypatch.setenv("IPROG_SMS_API_TOKEN", "test-only-token")
    monkeypatch.delenv("IPROG_SMS_ENABLE_OUTBOUND", raising=False)
    monkeypatch.setattr(sms_utils.requests, "post", lambda *a, **kw: pytest.fail("outbound should be disabled"))
    assert sms_utils.send_plain_sms("09690390776", "1").accepted is False


def test_iprogsms_blocks_smart_without_approved_sender(monkeypatch):
    monkeypatch.setenv("SMS_PROVIDER", "iprogsms")
    monkeypatch.setenv("IPROG_SMS_API_TOKEN", "test-only-token")
    monkeypatch.setenv("IPROG_SMS_ENABLE_OUTBOUND", "true")
    monkeypatch.delenv("IPROG_SMS_ALLOW_SMART_TNT", raising=False)

    def post(url, json, timeout):
        if url.endswith("/phone_numbers/detect"):
            return FakeResponse(body={
                "status": "success", "data": {"network": "Smart/TNT", "is_smart_tnt": True}
            })
        pytest.fail("unsupported network should not trigger a paid send")

    monkeypatch.setattr(sms_utils.requests, "post", post)
    assert sms_utils.send_plain_sms("09690390776", "1").accepted is False


@pytest.fixture
def phone_client(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "unit-test-only-secret")
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    gov_models.Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)

    def override_db():
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    with session_factory() as db:
        db.add(models.Resident(
            full_name="Test Resident",
            email="sms-test@example.invalid",
            password_hash="unused",
            phone_number="09171234567",
            is_verified=True,
        ))
        db.commit()
    yield TestClient(app), session_factory
    app.dependency_overrides.pop(get_db, None)
    engine.dispose()


def test_phone_otp_is_hashed_hidden_and_single_use(phone_client, monkeypatch):
    client, session_factory = phone_client
    sent_codes = []

    def fake_send(phone, code, ref_id=None):
        sent_codes.append(code)
        return sms_utils.SmsSendResult(True, 91, "pending")

    monkeypatch.setattr(sms_utils, "send_login_otp_sms", fake_send)
    send = client.post("/api/auth/phone/send-otp", json={"phone_number": "09171234567"})
    assert send.status_code == 200
    assert "dev_code" not in send.json()
    assert sent_codes
    with session_factory() as db:
        stored = db.query(models.PasswordResetToken).filter_by(email="phone:09171234567").one()
        assert stored.token != sent_codes[0]
        assert len(stored.token) == 64

    wrong = client.post("/api/auth/phone/verify-otp", json={"phone_number": "09171234567", "code": "123456"})
    if sent_codes[0] != "123456":
        assert wrong.status_code == 400
    valid = client.post("/api/auth/phone/verify-otp", json={"phone_number": "09171234567", "code": sent_codes[0]})
    assert valid.status_code == 200
    replay = client.post("/api/auth/phone/verify-otp", json={"phone_number": "09171234567", "code": sent_codes[0]})
    assert replay.status_code == 400


def test_phone_otp_provider_failure_revokes_code(phone_client, monkeypatch):
    client, session_factory = phone_client
    monkeypatch.setattr(sms_utils, "send_login_otp_sms", lambda *a, **kw: sms_utils.SmsSendResult(False))
    send = client.post("/api/auth/phone/send-otp", json={"phone_number": "09171234567"})
    assert send.status_code == 503
    with session_factory() as db:
        stored = db.query(models.PasswordResetToken).filter_by(email="phone:09171234567").one()
        assert stored.used is True
