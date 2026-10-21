"""Resident and staff PulseAI histories remain separate, even at the same ID."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

import auth
import models
from main import app


@pytest.fixture
def chat_client(clean_postgis):
    client = TestClient(app)
    resident = models.Resident(id=1, full_name="Test Resident", email="resident@example.test")
    official = models.Official(id=1, full_name="Test Official", email="official@example.test", role="dispatcher")

    def act_as(user):
        app.dependency_overrides[auth.get_current_user] = lambda: user

    try:
        yield client, resident, official, act_as
    finally:
        app.dependency_overrides.pop(auth.get_current_user, None)


def test_chat_owner_migration_is_present(clean_postgis):
    db = clean_postgis()
    try:
        columns = db.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'chat_conversations' AND column_name = 'owner_type'
        """)).scalars().all()
        assert columns == ["owner_type"]
        legacy_fk = db.execute(text("""
            SELECT count(*) FROM pg_constraint
            WHERE conname = 'chat_conversations_user_id_fkey'
        """)).scalar_one()
        assert legacy_fk == 0
    finally:
        db.close()


def test_chat_histories_are_isolated_across_account_types(chat_client):
    client, resident, official, act_as = chat_client

    act_as(resident)
    resident_response = client.post("/api/pulseai/conversations", json={"title": "Resident private"})
    assert resident_response.status_code == 201
    resident_chat_id = resident_response.json()["id"]

    act_as(official)
    assert client.get("/api/pulseai/conversations").json()["count"] == 0
    assert client.get(f"/api/pulseai/conversations/{resident_chat_id}/messages").status_code == 403
    assert client.delete(f"/api/pulseai/conversations/{resident_chat_id}").status_code == 403

    official_response = client.post("/api/pulseai/conversations", json={"title": "Official private"})
    assert official_response.status_code == 201
    official_chat_id = official_response.json()["id"]
    assert [item["id"] for item in client.get("/api/pulseai/conversations").json()["conversations"]] == [official_chat_id]

    act_as(resident)
    assert [item["id"] for item in client.get("/api/pulseai/conversations").json()["conversations"]] == [resident_chat_id]
    assert client.get(f"/api/pulseai/conversations/{official_chat_id}/messages").status_code == 403
    assert client.delete(f"/api/pulseai/conversations/{official_chat_id}").status_code == 403

    act_as(official)
    assert client.delete("/api/pulseai/conversations").json()["deleted_count"] == 1
    act_as(resident)
    assert client.get("/api/pulseai/conversations").json()["count"] == 1
