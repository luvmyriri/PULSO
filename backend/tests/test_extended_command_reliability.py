"""Extended command reliability tests covering If-Match versioning and Idempotency-Key retries."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import auth
import gov_models
import models
from database import engine, get_db
from main import app

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def override_db(clean_postgis):
    def _override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def test_context():
    db = TestingSessionLocal()
    dispatcher = models.Official(
        id=601, full_name="Triage Dispatcher", email="dispatcher.triage@caloocan.gov.ph",
        role="dispatcher", password_hash=auth.get_password_hash("Pass123!"), is_active=True,
    )
    engineer = models.Official(
        id=602, full_name="Senior Engineer", email="engineer.senior@caloocan.gov.ph",
        role="city_engineer", password_hash=auth.get_password_hash("Pass123!"), is_active=True,
    )
    inspector = models.Official(
        id=603, full_name="Inspector Dan", email="inspector.dan@caloocan.gov.ph",
        role="building_inspector", password_hash=auth.get_password_hash("Pass123!"), is_active=True,
    )
    resident = models.Resident(
        id=701, full_name="Juan Cruz", email="juan.cruz@example.com",
        phone_number="+639171234567", password_hash=auth.get_password_hash("Pass123!"),
        is_verified=True, trust_score=75,
    )
    db.add_all([dispatcher, engineer, inspector, resident])
    db.commit()

    tokens = {
        "dispatcher": auth.create_access_token({"sub": dispatcher.email}),
        "engineer": auth.create_access_token({"sub": engineer.email}),
        "inspector": auth.create_access_token({"sub": inspector.email}),
        "resident": auth.create_access_token({"sub": resident.email}),
    }
    db.close()
    return tokens


def test_rejection_command_integrity(client, test_context):
    db = TestingSessionLocal()
    report = models.Report(
        ticket_id="PUL-REJ-INT-01", category="Roads", description="Pothole needs inspection",
        status="pending", resident_id=701,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    report_id, version = report.id, report.version
    db.close()

    url = f"/api/reports/{report_id}/reject"
    headers = {
        "Authorization": f"Bearer {test_context['dispatcher']}",
        "If-Match": str(version),
        "Idempotency-Key": "reject-key-001",
    }
    body = {"reason": "Duplicate report already being serviced"}

    # 1. Stale version returns 409
    stale_headers = {**headers, "If-Match": str(version + 99), "Idempotency-Key": "reject-key-stale"}
    stale_resp = client.patch(url, json=body, headers=stale_headers)
    assert stale_resp.status_code == 409
    assert stale_resp.json()["detail"]["code"] == "REPORT_VERSION_CONFLICT"
    assert stale_resp.json()["detail"]["current_version"] == version

    # 2. Matching version succeeds
    resp = client.patch(url, json=body, headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "rejected"
    assert resp.json()["version"] == version + 1

    # 3. Same key with same body replays cached result
    replay = client.patch(url, json=body, headers=headers)
    assert replay.status_code == 200
    assert replay.json()["id"] == resp.json()["id"]
    assert replay.json()["version"] == resp.json()["version"]

    # 4. Same key with different body returns 409
    conflict = client.patch(url, json={"reason": "A completely different reason"}, headers=headers)
    assert conflict.status_code == 409

    # 5. Receipt recorded in database
    db = TestingSessionLocal()
    receipt = db.query(gov_models.CommandReceipt).filter_by(
        actor_id=601, operation="report_reject", report_id=report_id, idempotency_key="reject-key-001"
    ).first()
    assert receipt is not None
    db.close()


def test_verification_command_integrity(client, test_context):
    db = TestingSessionLocal()
    report = models.Report(
        ticket_id="PUL-VER-INT-01", category="Roads", description="Street light broken near corner",
        status="pending", resident_id=701,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    report_id, version = report.id, report.version
    db.close()

    url = f"/api/reports/{report_id}/status"
    headers = {
        "Authorization": f"Bearer {test_context['dispatcher']}",
        "If-Match": str(version),
        "Idempotency-Key": "verify-key-001",
    }
    body = {"status": "pending_approval"}

    # 1. Stale version returns 409
    stale_headers = {**headers, "If-Match": str(version + 10)}
    stale_resp = client.patch(url, json=body, headers=stale_headers)
    assert stale_resp.status_code == 409
    assert stale_resp.json()["detail"]["code"] == "REPORT_VERSION_CONFLICT"

    # 2. Matching version succeeds
    resp = client.patch(url, json=body, headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "pending_approval"
    assert resp.json()["version"] == version + 1

    # 3. Same key replays result
    replay = client.patch(url, json=body, headers=headers)
    assert replay.status_code == 200
    assert replay.json()["version"] == resp.json()["version"]


def test_request_citizen_info_integrity(client, test_context):
    db = TestingSessionLocal()
    report = models.Report(
        ticket_id="PUL-REQ-INT-01", category="Drainage", description="Clogged drain on street",
        status="pending", resident_id=701,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    report_id, version = report.id, report.version
    db.close()

    url = f"/api/gov/reports/{report_id}/request-info"
    headers = {
        "Authorization": f"Bearer {test_context['dispatcher']}",
        "If-Match": str(version),
        "Idempotency-Key": "reqinfo-key-001",
    }
    body = {"reason": "Need landmark", "message": "Please provide the nearest house number."}

    # 1. Stale version returns 409
    stale_headers = {**headers, "If-Match": str(version + 5)}
    stale_resp = client.post(url, json=body, headers=stale_headers)
    assert stale_resp.status_code == 409

    # 2. Valid request succeeds
    resp = client.post(url, json=body, headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["new_status"] == "needs_information"

    # 3. Same key replay returns cached receipt
    replay = client.post(url, json=body, headers=headers)
    assert replay.status_code == 200
    assert replay.json()["new_status"] == "needs_information"


def test_resident_closeout_version_integrity(client, test_context):
    db = TestingSessionLocal()
    report = models.Report(
        ticket_id="PUL-CLOSE-INT-01", category="Roads", description="Fixed road asphalt",
        status="resolved", resident_id=701,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    report_id, version = report.id, report.version
    db.close()

    url = f"/api/reports/{report_id}/confirm"
    headers = {
        "Authorization": f"Bearer {test_context['resident']}",
        "If-Match": str(version + 5),
    }

    # Stale version returns 409
    stale_resp = client.post(url, json={"rating": 5}, headers=headers)
    assert stale_resp.status_code == 409
    assert stale_resp.json()["detail"]["code"] == "REPORT_VERSION_CONFLICT"

    # Matching version closes report
    valid_headers = {
        "Authorization": f"Bearer {test_context['resident']}",
        "If-Match": str(version),
    }
    resp = client.post(url, json={"rating": 5, "note": "Great work"}, headers=valid_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "closed_by_citizen"
