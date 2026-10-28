"""Government AI boundaries and evidence-only draft contracts, without provider or database calls."""

import asyncio
import json
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import auth
import database
import gemini_service
import main
import models
import predictive_router
import pulseai_router


def test_legacy_staff_chat_is_retired_before_querying_or_calling_ai(monkeypatch):
    official = models.Official(id=7, role="city_engineer", full_name="Test engineer")
    called = []
    monkeypatch.setattr(gemini_service, "get_ai_assistant_response", lambda *a, **k: called.append(True))

    with pytest.raises(HTTPException) as direct:
        asyncio.run(main.ai_omni_assistant(main.AIChatRequest(query="workload"), official, None))
    with pytest.raises(HTTPException) as stateless:
        pulseai_router.ask_pulseai_stateless(pulseai_router.SendMessageRequest(query="workload"), None, official)
    with pytest.raises(HTTPException) as stored:
        pulseai_router.append_message_and_respond(1, pulseai_router.SendMessageRequest(query="workload"), None, official)

    assert [direct.value.status_code, stateless.value.status_code, stored.value.status_code] == [410, 410, 410]
    assert called == []


def test_resident_chat_never_receives_staff_tools_or_fallback_data(monkeypatch):
    resident = models.Resident(id=7, full_name="Test resident")
    offered = []

    def reply(_prompt, tools, user_id):
        offered.extend(tool.__name__ for tool in tools)
        return "Your own reports can be tracked in PULSO."

    monkeypatch.setattr(gemini_service, "_SDK_READY", True)
    monkeypatch.setattr(gemini_service, "_generate_with_tools", reply)
    gemini_service.get_ai_assistant_response("Show the staff queue", user=resident, db=object())
    assert offered == ["get_my_reports", "get_city_hotlines", "get_active_advisories", "get_evacuation_routes"]

    monkeypatch.setattr(gemini_service, "_SDK_READY", False)
    fallback = gemini_service.get_ai_assistant_response("Show unassigned staff reports", user=resident, db=object())
    assert fallback["tool_name"] is None
    assert "Unassigned citizen reports" not in fallback["response"]


def test_advisory_failure_never_invents_staff_on_site(monkeypatch):
    monkeypatch.setattr(gemini_service, "_generate", lambda *a, **k: None)
    assert gemini_service.generate_advisory_content({"category": "Roads"}) == {}
    monkeypatch.setattr(gemini_service, "_generate", lambda *a, **k: json.dumps({"title": "Draft", "body": "  Review the recorded road issue.  ", "priority": "Info"}))
    assert gemini_service.generate_advisory_content({"category": "Roads"}) == {
        "title": "Draft", "body": "Review the recorded road issue.", "priority": "Info"
    }


def test_staff_advisory_uses_recorded_fields_and_fails_closed(monkeypatch):
    import government_access
    import report_review_router

    report = SimpleNamespace(id=19, category="Drainage", description="Resident report text",
        location_string="Recorded location", ai_summary="Unverified AI summary", severity_score=9.9)
    monkeypatch.setattr(government_access, "require", lambda *a: None)
    monkeypatch.setattr(report_review_router, "get_report", lambda *a: report)
    supplied = []

    def unavailable(facts):
        supplied.append(facts)
        return {}

    monkeypatch.setattr(main.gemini_service, "generate_advisory_content", unavailable)
    with pytest.raises(HTTPException) as failed:
        asyncio.run(main.generate_ai_advisory(report.id, None, models.Official(id=7)))
    assert failed.value.status_code == 503
    assert supplied == [{"category": "Drainage", "description": "Resident report text",
                         "location_string": "Recorded location"}]


def test_disabled_ai_does_not_return_a_cached_answer(monkeypatch):
    monkeypatch.setattr(gemini_service, "AI_DISABLED", True)
    monkeypatch.setattr(gemini_service, "_SDK_READY", True)
    monkeypatch.setattr(gemini_service, "_client", object())
    monkeypatch.setattr(gemini_service._rate_limiter, "get_cached", lambda *_: pytest.fail("Disabled AI must not read cache"))
    assert gemini_service._generate("A cached prompt") is None


def test_maintenance_generator_drops_model_costs_and_rejects_malformed_output(monkeypatch):
    monkeypatch.setattr(gemini_service, "_SDK_READY", True)
    monkeypatch.setattr(gemini_service, "AI_DISABLED", False)
    monkeypatch.setattr(gemini_service, "_generate", lambda *a, **k: json.dumps({
        "maintenance_plan": "Inspect and verify the site.",
        "technical_justification": "Registry condition needs field confirmation.",
        "steps": ["Inspect the asset."], "estimated_cost": 999999,
        "estimated_duration_days": 1, "priority": "CRITICAL",
    }))
    result = gemini_service.generate_maintenance_plan({"asset_id": "CAL-DR-171-01"})
    assert set(result) == {"maintenance_plan", "technical_justification", "steps"}
    monkeypatch.setattr(gemini_service, "_generate", lambda *a, **k: json.dumps({
        "maintenance_plan": "Inspect and verify the site.",
        "technical_justification": "Registry fields need confirmation.",
        "inspection_steps": ["Inspect the asset."],
    }))
    assert gemini_service.generate_maintenance_plan({"asset_id": "CAL-DR-171-01"})["steps"] == ["Inspect the asset."]
    monkeypatch.setattr(gemini_service, "_generate", lambda *a, **k: json.dumps({"maintenance_plan": "Only one field"}))
    assert gemini_service.generate_maintenance_plan({"asset_id": "CAL-DR-171-01"}) == {}


def test_maintenance_notes_use_registry_fields_without_model_forecast(monkeypatch):
    app = FastAPI()
    app.include_router(predictive_router.router)
    official = models.Official(id=7, role="city_engineer")
    asset = SimpleNamespace(asset_id="CAL-DR-171-01", asset_name="Culvert", category="Drainage",
        barangay="171", condition_score=45.0, material_type=None, design_life=None)
    asset_query = SimpleNamespace(filter_by=lambda **_: SimpleNamespace(first=lambda: asset))
    history_query = SimpleNamespace(filter=lambda *_: SimpleNamespace(scalar=lambda: None))
    queries = iter((asset_query, history_query))
    db = SimpleNamespace(query=lambda *_: next(queries))
    app.dependency_overrides[auth.get_current_user] = lambda: official
    app.dependency_overrides[database.get_db] = lambda: db
    monkeypatch.setattr(predictive_router, "_allow_access", lambda _: True)
    monkeypatch.setattr(predictive_router, "require_asset_scope", lambda *a: None)
    monkeypatch.setattr(predictive_router.lightgbm_service, "predict_for_asset", lambda *a: pytest.fail("Synthetic model must not feed the draft"))
    supplied = []

    def draft(facts):
        supplied.append(facts)
        return {"maintenance_plan": "Inspect the culvert and confirm conditions on site.",
            "technical_justification": "Recorded condition is 45; site assessment is needed.",
            "steps": ["Inspect the culvert."]}

    monkeypatch.setattr(predictive_router.gemini_service, "generate_maintenance_plan", draft)
    response = TestClient(app).post("/api/gov/predictive/ai-plan", json={
        "asset_id": asset.asset_id, "barangay": "171", "category": "Drainage"})
    assert response.status_code == 200, response.text
    assert supplied[0]["recorded_condition_score"] == 45.0
    assert not any("probability" in key or "predicted" in key for key in supplied[0])
    assert response.json()["review_state"] == "draft_unreviewed"
    assert response.json()["estimated_cost"] is None
    assert response.json()["estimated_duration_days"] is None
    assert response.json()["lgbm_insights"] is None
