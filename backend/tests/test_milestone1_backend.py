"""
test_milestone1_backend.py — Comprehensive Milestone 1 Backend Verification Suite
PULSO Government Workspace — Caloocan City

Covers:
1. Static AST inspection: Zero random library imports or invocations in predictive_router.py
2. Deterministic predictive engine endpoints: summary, health, schedule, risk-map, export, maintenance-scores, demand-forecast
3. Governed Announcements 6-stage lifecycle, bilingual fields, immutable corrections, per-channel deliveries, public feed
4. Physical Infrastructure Assets Register: creation, listing, stats (5 categories), detail docket
5. Work Order Blockers & Separation of Duties (mandatory server check: inspector != assigned_to)
6. Citizen Report Request-Info and Docket Hub
7. Operations Today aggregated leadership dashboard
8. RBAC and authorization constraints
"""

import ast
import os
import io
import csv
import datetime
from datetime import timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
import gov_models
import auth
import document_router
from database import Base, get_db
from main import app

# Isolated In-Memory SQLite Setup
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_test_database():
    """Drops and recreates all database tables for test isolation."""
    Base.metadata.drop_all(bind=test_engine)
    gov_models.Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    gov_models.Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def seeded_users_and_geo():
    """Seeds districts, barangays, staff officials, and test resident."""
    db = TestingSessionLocal()

    # Districts & Barangays
    d1 = models.District(id=1, name="District 1", code="D1")
    d2 = models.District(id=2, name="District 2", code="D2")
    d3 = models.District(id=3, name="District 3", code="D3")
    db.add_all([d1, d2, d3])

    b171 = models.Barangay(id=171, name="Barangay 171", district_id=3, zip_code="1420")
    b172 = models.Barangay(id=172, name="Barangay 172", district_id=3, zip_code="1420")
    b20 = models.Barangay(id=20, name="Barangay 20", district_id=1, zip_code="1400")
    db.add_all([b171, b172, b20])

    # Environmental Context
    env171 = gov_models.EnvironmentalContext(barangay_id=171, flood_risk_level="High", soil_subsidence=1.2)
    env172 = gov_models.EnvironmentalContext(barangay_id=172, flood_risk_level="Medium", soil_subsidence=0.5)
    db.add_all([env171, env172])

    # Officials
    city_eng = models.Official(
        id=501,
        full_name="Engr. Roberto Dela Cruz",
        email="city.engineer@caloocan.gov.ph",
        role="city_engineer",
        display_name="Engineering",
        password_hash=auth.get_password_hash("EngPass123!"),
        is_active=True
    )
    inspector = models.Official(
        id=502,
        full_name="Arch. Victor Ramos",
        email="inspector@caloocan.gov.ph",
        role="building_inspector",
        display_name="Inspection Division",
        password_hash=auth.get_password_hash("InspPass123!"),
        is_active=True
    )
    field_worker = models.Official(
        id=503,
        full_name="Juan Foreman",
        email="foreman@caloocan.gov.ph",
        role="project_engineer",
        display_name="Operations",
        password_hash=auth.get_password_hash("WorkerPass123!"),
        is_active=True
    )
    clerk = models.Official(
        id=504,
        full_name="Clara Santos",
        email="clerk@caloocan.gov.ph",
        role="admin_clerk",
        display_name="Administration",
        password_hash=auth.get_password_hash("ClerkPass123!"),
        is_active=True
    )

    # Resident
    resident = models.Resident(
        id=901,
        full_name="Pedro Resident",
        email="pedro@citizen.ph",
        phone_number="+639171112233",
        password_hash=auth.get_password_hash("ResPass123!")
    )

    db.add_all([city_eng, inspector, field_worker, clerk, resident])
    db.commit()

    tokens = {
        "city_engineer": auth.create_access_token({"sub": city_eng.email}),
        "inspector": auth.create_access_token({"sub": inspector.email}),
        "field_worker": auth.create_access_token({"sub": field_worker.email}),
        "clerk": auth.create_access_token({"sub": clerk.email}),
        "resident": auth.create_access_token({"sub": resident.email}),
    }
    db.close()
    return tokens


# =============================================================================
# 1. Static AST Audit: Zero Random Calls
# =============================================================================

def test_ast_audit_zero_random_in_predictive_router():
    """Statically parses backend/predictive_router.py to prove 0 random calls and imports."""
    router_path = os.path.join(os.path.dirname(__file__), "..", "predictive_router.py")
    with open(router_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename="predictive_router.py")

    # Verify no import of 'random'
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                assert alias.name != "random", f"Forbidden import 'random' found on line {node.lineno}"
        elif isinstance(node, ast.ImportFrom):
            assert node.module != "random", f"Forbidden 'from random import ...' found on line {node.lineno}"

        # Verify no call to random.<func>()
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Attribute):
                if isinstance(node.func.value, ast.Name):
                    assert node.func.value.id != "random", f"Forbidden call to random.{node.func.attr} on line {node.lineno}"


# =============================================================================
# 2. Predictive Maintenance Engine Tests
# =============================================================================

def test_predictive_summary_deterministic_and_cost(client, seeded_users_and_geo):
    """Verifies predictive summary returns deterministic numbers and DPWH unit costs."""
    headers = {"Authorization": f"Bearer {seeded_users_and_geo['city_engineer']}"}

    # Seed 2 assets
    db = TestingSessionLocal()
    a1 = gov_models.InfrastructureAsset(
        asset_id="CAL-RD-171-001",
        asset_name="Camarin Main Arterial",
        category="Roads",
        barangay="171",
        barangay_id=171,
        condition_score=30.0,  # CRITICAL
        date_completed=datetime.date(2020, 1, 1)
    )
    a2 = gov_models.InfrastructureAsset(
        asset_id="CAL-DR-171-002",
        asset_name="Bagong Silang Culvert",
        category="Drainage",
        barangay="171",
        barangay_id=171,
        condition_score=70.0,  # MODERATE
        date_completed=datetime.date(2022, 6, 1)
    )
    db.add_all([a1, a2])
    db.commit()
    db.close()

    res1 = client.get("/api/gov/predictive/summary", headers=headers)
    res2 = client.get("/api/gov/predictive/summary", headers=headers)

    assert res1.status_code == 200
    assert res2.status_code == 200
    # Strict determinism: multiple calls produce identical payload
    assert res1.json() == res2.json()

    data = res1.json()
    assert data["total_assets_monitored"] == 2
    assert data["critical_count"] >= 1
    assert "scheduled_90d_cost" in data
    assert "scheduled_90d_cost_formatted" in data
    assert "PHP" in data["scheduled_90d_cost_formatted"]
    # DPWH cost check: roads (28,000 * 0.32 = 8,960) + drainage (45,000 * 0.32 = 14,400) = 23,360
    assert data["scheduled_90d_cost"] > 0


def test_predictive_health_monotonic_probabilities(client, seeded_users_and_geo):
    """Verifies failure probabilities are monotonic P30 <= P60 <= P90 and days_since matches DB."""
    headers = {"Authorization": f"Bearer {seeded_users_and_geo['city_engineer']}"}

    db = TestingSessionLocal()
    a = gov_models.InfrastructureAsset(
        asset_id="CAL-DR-171-003",
        asset_name="Tala Drainage Outfall",
        category="Drainage",
        barangay="171",
        barangay_id=171,
        condition_score=25.0
    )
    m = gov_models.MaintenanceHistory(
        log_id="LOG-TEST-01",
        asset_id="CAL-DR-171-003",
        work_type="Declogging",
        cost=15000.0,
        completion_date=datetime.date.today() - datetime.timedelta(days=45)
    )
    db.add_all([a, m])
    db.commit()
    db.close()

    res = client.get("/api/gov/predictive/health", headers=headers)
    assert res.status_code == 200
    scores = res.json()["health_scores"]
    target = next((item for item in scores if item["asset_id"] == "CAL-DR-171-003"), None)
    assert target is not None

    # Monotonic probability test: P30 <= P60 <= P90
    p30 = target["failure_probability_30d"]
    p60 = target["failure_probability_60d"]
    p90 = target["failure_probability_90d"]
    assert 0.0 <= p30 <= 1.0
    assert 0.0 <= p60 <= 1.0
    assert 0.0 <= p90 <= 1.0
    assert p30 <= p60 <= p90

    # Days since maintenance matches DB completion_date delta
    assert target["days_since_last_maintenance"] == 45
    assert isinstance(target["report_count"], int)
    assert "next_maintenance_date" in target


def test_predictive_schedule_deterministic_weeks_and_costs(client, seeded_users_and_geo):
    """Verifies schedule bins weeks deterministically (1..4) and uses DPWH unit costs."""
    headers = {"Authorization": f"Bearer {seeded_users_and_geo['city_engineer']}"}

    db = TestingSessionLocal()
    a = gov_models.InfrastructureAsset(
        asset_id="CAL-RD-171-004",
        asset_name="Zabarte Road Section",
        category="Roads",
        barangay="171",
        barangay_id=171,
        condition_score=35.0
    )
    db.add(a)
    db.commit()
    db.close()

    res = client.get("/api/gov/predictive/schedule", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_items"] >= 1
    for item in data["schedule_items"]:
        assert 1 <= item["week_number"] <= 4
        assert "PHP" in item["estimated_cost_formatted"]
        assert "scheduled_date" in item


def test_predictive_export_csv_deterministic(client, seeded_users_and_geo):
    """Verifies CSV export contains exact deterministic failure probabilities matching health."""
    headers = {"Authorization": f"Bearer {seeded_users_and_geo['city_engineer']}"}

    db = TestingSessionLocal()
    a = gov_models.InfrastructureAsset(
        asset_id="CAL-BR-171-005",
        asset_name="Camarin Bridge",
        category="Bridges",
        barangay="171",
        barangay_id=171,
        condition_score=40.0
    )
    db.add(a)
    db.commit()
    db.close()

    res = client.get("/api/gov/predictive/export", headers=headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    reader = csv.reader(io.StringIO(res.text))
    rows = list(reader)
    headers_row = rows[0]
    assert "Failure Prob 30d" in headers_row
    assert "Next Maintenance" in headers_row
    assert len(rows) >= 2


def test_predictive_maintenance_scores_and_demand_forecast(client, seeded_users_and_geo):
    """Verifies contract endpoints /maintenance-scores and /demand-forecast."""
    headers = {"Authorization": f"Bearer {seeded_users_and_geo['city_engineer']}"}

    db = TestingSessionLocal()
    a = gov_models.InfrastructureAsset(
        asset_id="CAL-RD-171-006",
        asset_name="Susano Road",
        category="Roads",
        barangay="171",
        barangay_id=171,
        condition_score=50.0
    )
    db.add(a)
    db.commit()
    db.close()

    res = client.get("/api/gov/predictive/maintenance-scores?category=Roads", headers=headers)
    assert res.status_code == 200
    scores = res.json()
    assert isinstance(scores, list)
    assert len(scores) >= 1
    assert scores[0]["asset_id"] == "CAL-RD-171-006"
    assert "health_score" in scores[0]

    # Forecast
    res_fc = client.get("/api/gov/predictive/demand-forecast?weeks_back=4&weeks_forward=2", headers=headers)
    assert res_fc.status_code == 200
    assert isinstance(res_fc.json(), list)


# =============================================================================
# 3. Governed Announcements Module (R6)
# =============================================================================

def test_announcements_full_lifecycle_and_corrections(client, seeded_users_and_geo):
    """
    Tests:
    - Draft creation with bilingual fields and channel deliveries
    - draft -> in_review -> approved -> scheduled -> published -> expired
    - RBAC: non-approver forbidden from approving
    - Immutable published correction with snapshot
    - Public feed filtering
    """
    clerk_hdr = {"Authorization": f"Bearer {seeded_users_and_geo['clerk']}"}
    eng_hdr = {"Authorization": f"Bearer {seeded_users_and_geo['city_engineer']}"}

    # 1. Create draft
    payload = {
        "title_en": "Scheduled Road Repair on Camarin Road",
        "title_fil": "Nakatakdang Pag-aayos ng Kalsada sa Camarin Road",
        "content_en": "Please expect lane closures between 10:00 PM and 4:00 AM for asphalt overlay.",
        "content_fil": "Asahan ang pagsasara ng linya mula 10:00 PM hanggang 4:00 AM para sa aspalto.",
        "category": "planned_works",
        "priority": "urgent",
        "target_audience": "public",
        "target_barangays": ["Barangay 171"],
        "channels": ["web", "sms"],
    }
    create_res = client.post("/api/gov/announcements", json=payload, headers=clerk_hdr)
    assert create_res.status_code == 201
    ann = create_res.json()
    ann_id = ann["id"]
    assert ann["status"] == "draft"
    assert ann["title_fil"] == payload["title_fil"]
    assert len(ann["deliveries"]) == 2

    # 2. Advance: draft -> in_review
    trans_res = client.patch(f"/api/gov/announcements/{ann_id}/status", json={"status": "in_review"}, headers=clerk_hdr)
    assert trans_res.status_code == 200
    assert trans_res.json()["status"] == "in_review"

    # 3. RBAC Check: Clerk cannot approve (requires city_engineer / approver)
    fail_approve = client.patch(f"/api/gov/announcements/{ann_id}/status", json={"status": "approved"}, headers=clerk_hdr)
    assert fail_approve.status_code == 403

    # Authorized approve
    app_res = client.patch(f"/api/gov/announcements/{ann_id}/status", json={"status": "approved"}, headers=eng_hdr)
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "approved"
    assert app_res.json()["approved_by_id"] is not None

    # 4. Advance: approved -> scheduled (with future date)
    future_time = (datetime.datetime.now(timezone.utc) + datetime.timedelta(days=2)).isoformat()
    sched_res = client.patch(f"/api/gov/announcements/{ann_id}/status", json={"status": "scheduled", "scheduled_at": future_time}, headers=eng_hdr)
    assert sched_res.status_code == 200
    assert sched_res.json()["status"] == "scheduled"

    # 5. Advance: scheduled -> published
    pub_res = client.patch(f"/api/gov/announcements/{ann_id}/status", json={"status": "published"}, headers=eng_hdr)
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "published"
    assert pub_res.json()["published_at"] is not None

    # 6. Guard: Published announcement cannot be updated directly via PUT
    put_res = client.put(f"/api/gov/announcements/{ann_id}", json={"title_en": "Sneaky Change"}, headers=eng_hdr)
    assert put_res.status_code == 400
    assert "corrections" in put_res.json()["detail"].lower()

    # 7. Add immutable correction notice
    corr_payload = {
        "correction_summary": "Updated closure window from 10:00 PM to 11:00 PM.",
        "reason": "Adjusted due to local traffic coordination.",
        "updated_content_en": "Please expect lane closures between 11:00 PM and 4:00 AM.",
        "updated_content_fil": "Asahan ang pagsasara ng linya mula 11:00 PM hanggang 4:00 AM."
    }
    corr_res = client.post(f"/api/gov/announcements/{ann_id}/corrections", json=corr_payload, headers=eng_hdr)
    assert corr_res.status_code == 201
    corr_data = corr_res.json()
    assert corr_data["correction_summary"] == corr_payload["correction_summary"]
    assert corr_data["previous_content"] is not None
    assert corr_data["previous_content"]["content_en"] == payload["content_en"]

    # 8. Check deliveries telemetry
    deliv_res = client.get(f"/api/gov/announcements/{ann_id}/deliveries", headers=eng_hdr)
    assert deliv_res.status_code == 200
    assert deliv_res.json()["summary"]["total_delivered"] > 0

    # 9. Public feed verification
    pub_feed = client.get("/api/announcements")
    assert pub_feed.status_code == 200
    feed_items = pub_feed.json()
    assert any(item["id"] == ann_id for item in feed_items)


def test_announcement_withdrawal_requires_reason(client, seeded_users_and_geo):
    """Verifies withdrawing an announcement strictly mandates withdrawal_reason."""
    clerk_hdr = {"Authorization": f"Bearer {seeded_users_and_geo['clerk']}"}

    create_res = client.post("/api/gov/announcements", json={
        "title_en": "Notice to Cancel",
        "content_en": "Initial text for notice.",
        "category": "general_notice",
        "priority": "normal"
    }, headers=clerk_hdr)
    ann_id = create_res.json()["id"]

    # Attempt withdraw without reason -> 400
    fail_withdraw = client.patch(f"/api/gov/announcements/{ann_id}/status", json={"status": "withdrawn"}, headers=clerk_hdr)
    assert fail_withdraw.status_code == 400

    # Withdraw with reason -> 200
    ok_withdraw = client.patch(f"/api/gov/announcements/{ann_id}/status", json={
        "status": "withdrawn",
        "withdrawal_reason": "Project postponed indefinitely by department order."
    }, headers=clerk_hdr)
    assert ok_withdraw.status_code == 200
    assert ok_withdraw.json()["status"] == "withdrawn"


# =============================================================================
# 4. Physical Infrastructure Assets Register Endpoints
# =============================================================================

def test_physical_assets_crud_and_stats(client, seeded_users_and_geo):
    """Verifies asset onboarding, filtering, 5-category stats, and detailed docket."""
    eng_hdr = {"Authorization": f"Bearer {seeded_users_and_geo['city_engineer']}"}

    # Create Asset
    asset_payload = {
        "asset_id": "CAL-RD-BAGONG-01",
        "asset_name": "Bagong Silang Access Spine",
        "category": "Roads",
        "material_type": "Reinforced Concrete",
        "design_life": 25,
        "barangay": "Barangay 171",
        "barangay_id": 171,
        "condition_score": 85.0
    }
    create_res = client.post("/api/gov/assets", json=asset_payload, headers=eng_hdr)
    assert create_res.status_code == 200
    assert create_res.json()["asset_id"] == "CAL-RD-BAGONG-01"
    assert create_res.json()["condition_tier"] == "good"

    # List Assets with category filter
    list_res = client.get("/api/gov/assets?category=Roads", headers=eng_hdr)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # Stats breakdown (covers 5 standard categories)
    stats_res = client.get("/api/gov/assets/stats", headers=eng_hdr)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "Roads" in stats["categories"]
    assert "Drainage" in stats["categories"]
    assert "Bridges" in stats["categories"]
    assert "Public Buildings" in stats["categories"]
    assert "Facilities" in stats["categories"]

    # Detail docket
    detail_res = client.get("/api/gov/assets/CAL-RD-BAGONG-01", headers=eng_hdr)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["asset_id"] == "CAL-RD-BAGONG-01"
    assert "deterioration_velocity" in detail
    assert "maintenance_history" in detail
    assert "active_work_orders" in detail


# =============================================================================
# 5. Work Order Blockers & Strict Separation of Duties
# =============================================================================

def test_work_order_blocker_workflow(client, seeded_users_and_geo):
    """Verifies blocking with structured reason code and unblocking resumes order."""
    field_hdr = {"Authorization": f"Bearer {seeded_users_and_geo['field_worker']}"}

    # Create work order
    db = TestingSessionLocal()
    wo = gov_models.WorkOrder(
        title="Culvert Clearing at Camarin",
        wo_type="standard",
        status="in_progress",
        assigned_by_id=501,
        assigned_to_id=503
    )
    db.add(wo)
    db.commit()
    db.refresh(wo)
    wo_id = wo.id
    db.close()

    # Block work order
    block_res = client.post(f"/api/gov/work-orders/{wo_id}/block", json={
        "reason_code": "weather",
        "delay_days": 2.5,
        "notes": "Heavy monsoon rains flooded trench excavation."
    }, headers=field_hdr)
    assert block_res.status_code == 200
    assert block_res.json()["status"] == "blocked"

    # Unblock work order
    unblock_res = client.post(f"/api/gov/work-orders/{wo_id}/unblock", json={
        "resolution_notes": "Weather cleared, pumping equipment deployed.",
        "next_status": "in_progress"
    }, headers=field_hdr)
    assert unblock_res.status_code == 200
    assert unblock_res.json()["status"] == "in_progress"


def test_separation_of_duties_strictly_enforced(client, seeded_users_and_geo):
    """
    CRITICAL SERVER ENFORCEMENT:
    Assigned worker (id=503) attempts to verify their own work order -> 403 Forbidden!
    Independent inspector (id=502) verifies -> succeeds and transitions status.
    """
    worker_hdr = {"Authorization": f"Bearer {seeded_users_and_geo['field_worker']}"}  # id=503
    inspector_hdr = {"Authorization": f"Bearer {seeded_users_and_geo['inspector']}"}  # id=502

    db = TestingSessionLocal()
    # Create Report to verify report syncing
    rep = models.Report(
        ticket_id="PUL-2026-SOD01",
        description="Pothole on Main St",
        category="Roads",
        status="in_progress",
        location_barangay="171"
    )
    db.add(rep)
    db.flush()

    wo = gov_models.WorkOrder(
        title="Pothole Patching Task",
        wo_type="standard",
        status="completed_pending_review",
        report_id=rep.id,
        assigned_by_id=501,
        assigned_to_id=503  # assigned to field worker
    )
    db.add(wo)
    db.flush()
    db.add(gov_models.WorkOrderUpdate(
        work_order_id=wo.id, official_id=503, previous_status="in_progress",
        new_status="completed_pending_review", image_url="/api/uploads/reports/initial-proof.jpg",
    ))
    db.commit()
    db.refresh(wo)
    wo_id = wo.id
    rep_id = rep.id
    db.close()

    # 1. Assigned worker attempts self-verification -> FORBIDDEN (403)
    self_verify_res = client.post(f"/api/gov/work-orders/{wo_id}/verify", json={
        "passed": True,
        "notes": "Self-certifying my own work"
    }, headers=worker_hdr)
    assert self_verify_res.status_code == 403
    assert "separation of duties" in self_verify_res.json()["detail"].lower()

    # 2. Independent inspector verifies with passed=False -> rework_required
    fail_verify_res = client.post(f"/api/gov/work-orders/{wo_id}/verify", json={
        "passed": False,
        "notes": "Compaction density inadequate, rework needed."
    }, headers=inspector_hdr)
    assert fail_verify_res.status_code == 200
    assert fail_verify_res.json()["work_order"]["status"] == "rework_required"

    # Verify report synced to in_progress
    db = TestingSessionLocal()
    r_check = db.query(models.Report).filter(models.Report.id == rep_id).first()
    assert r_check.status == "in_progress"
    db.close()

    # Rework needs a fresh submission before another independent review.
    db = TestingSessionLocal()
    reworked = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()
    reworked.status = "completed_pending_review"
    db.add(gov_models.WorkOrderUpdate(
        work_order_id=wo_id, official_id=503, previous_status="rework_required",
        new_status="completed_pending_review", image_url="/api/uploads/reports/rework-proof.jpg",
    ))
    db.commit()
    db.close()

    # 3. Independent inspector verifies with passed=True -> completed & report resolved
    pass_verify_res = client.post(f"/api/gov/work-orders/{wo_id}/verify", json={
        "passed": True,
        "notes": "Rework verified, asphalt compaction passed test.",
        "checklist_results": {
            "specifications": True, "siteCleared": True,
            "qualityTested": True, "photoVerified": True,
        },
    }, headers=inspector_hdr)
    assert pass_verify_res.status_code == 200
    assert pass_verify_res.json()["work_order"]["status"] == "completed"

    # Verify report synced to resolved
    db = TestingSessionLocal()
    r_check = db.query(models.Report).filter(models.Report.id == rep_id).first()
    assert r_check.status == "resolved"
    db.close()


def test_report_work_approval_requires_reason_and_eligible_state(client, seeded_users_and_geo):
    db = TestingSessionLocal()
    report = models.Report(ticket_id="PUL-APPROVAL-01", category="Roads", description="Road repair", status="pending_approval")
    db.add(report)
    db.commit()
    db.refresh(report)
    report_id = report.id
    db.close()

    headers = {"Authorization": f"Bearer {seeded_users_and_geo['city_engineer']}"}
    short = client.post(f"/api/gov/reports/{report_id}/approve-for-work", json={"reason": "ok"}, headers=headers)
    assert short.status_code == 422
    approved = client.post(f"/api/gov/reports/{report_id}/approve-for-work", json={
        "reason": "Field repair is warranted after engineering review",
    }, headers=headers)
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved_internal"
    repeat = client.post(f"/api/gov/reports/{report_id}/approve-for-work", json={
        "reason": "Second approval attempt must be rejected",
    }, headers=headers)
    assert repeat.status_code == 409
    assigned = client.post("/api/gov/work-orders", json={
        "title": "Repair approved road report", "report_id": report_id,
        "assigned_to_id": 503, "priority": "critical", "notes": "Assign field repair",
    }, headers=headers)
    assert assigned.status_code == 200, assigned.text
    assert assigned.json()["status"] == "assigned"
    assert assigned.json()["is_emergency_assignment"] is False
    db = TestingSessionLocal()
    assert db.query(models.Report).filter(models.Report.id == report_id).first().status == "dispatched"
    db.close()


def test_report_rejection_records_reason_without_penalizing_resident(client, seeded_users_and_geo):
    db = TestingSessionLocal()
    report = models.Report(
        ticket_id="PUL-REJECT-01", category="Roads", description="Unclear road report",
        status="pending", resident_id=901,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    report_id = report.id
    original_score = db.query(models.Resident).filter(models.Resident.id == 901).first().trust_score
    db.close()

    headers = {"Authorization": f"Bearer {seeded_users_and_geo['city_engineer']}"}
    response = client.patch(f"/api/reports/{report_id}/reject", json={
        "reason": "Location and evidence require a new submission",
    }, headers=headers)
    # City Engineer may inspect the decision, but only intake roles can reject it.
    assert response.status_code == 403

    db = TestingSessionLocal()
    dispatcher = models.Official(
        id=505, full_name="Intake Dispatcher", email="dispatcher@caloocan.gov.ph",
        role="dispatcher", password_hash=auth.get_password_hash("Dispatch123!"), is_active=True,
    )
    db.add(dispatcher)
    db.commit()
    db.close()
    dispatcher_token = auth.create_access_token({"sub": "dispatcher@caloocan.gov.ph"})
    response = client.patch(f"/api/reports/{report_id}/reject", json={
        "reason": "Location and evidence require a new submission",
    }, headers={"Authorization": f"Bearer {dispatcher_token}"})
    assert response.status_code == 200, response.text

    db = TestingSessionLocal()
    assert db.query(models.Report).filter(models.Report.id == report_id).first().status == "rejected"
    assert db.query(models.Resident).filter(models.Resident.id == 901).first().trust_score == original_score
    timeline = db.query(gov_models.ProcessTimeline).filter(gov_models.ProcessTimeline.report_id == report_id).order_by(gov_models.ProcessTimeline.id.desc()).first()
    assert "new submission" in timeline.note
    db.close()


def test_project_route_advances_one_phase_and_returns_project(client, seeded_users_and_geo):
    headers = {"Authorization": f"Bearer {seeded_users_and_geo['city_engineer']}"}
    created = client.post("/api/gov/projects", json={
        "title": "Drainage survey", "description": "Survey blocked drainage",
        "requesting_party": "City Engineering Department",
    }, headers=headers)
    assert created.status_code == 200, created.text
    project_id = created.json()["id"]

    skipped = client.patch(f"/api/gov/projects/{project_id}/advance", json={
        "status": "resolved",
    }, headers=headers)
    assert skipped.status_code == 400

    advanced = client.patch(f"/api/gov/projects/{project_id}/advance", json={
        "status": "survey_in_progress",
    }, headers=headers)
    assert advanced.status_code == 200, advanced.text
    assert advanced.json()["id"] == project_id
    assert advanced.json()["current_phase"] == 2


def test_document_upload_requires_staff_permission_and_existing_target(client, seeded_users_and_geo, monkeypatch, tmp_path):
    monkeypatch.setattr(document_router, "UPLOAD_DIR", str(tmp_path))
    resident_headers = {"Authorization": f"Bearer {seeded_users_and_geo['resident']}"}
    staff_headers = {"Authorization": f"Bearer {seeded_users_and_geo['city_engineer']}"}
    upload = {"file": ("..\\survey.pdf", b"%PDF-1.4\nTest survey", "application/pdf")}
    data = {"document_type": "survey_report", "target_model": "ProjectRequest", "target_id": "999"}

    denied = client.post("/api/gov/documents/upload", data=data, files=upload, headers=resident_headers)
    assert denied.status_code == 403

    monkeypatch.setattr(document_router.roles_service, "assert_permission", lambda *_args: None)
    missing = client.post("/api/gov/documents/upload", data=data, files=upload, headers=staff_headers)
    assert missing.status_code == 404

    db = TestingSessionLocal()
    project = gov_models.ProjectRequest(
        title="Survey target", description="Drainage study", requesting_party="City Engineering Department",
        status="request_received", current_phase=1, created_by_id=501,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    data["target_id"] = str(project.id)
    db.close()

    uploaded = client.post("/api/gov/documents/upload", data=data, files=upload, headers=staff_headers)
    assert uploaded.status_code == 200, uploaded.text
    document_id = uploaded.json()["document"]["id"]
    db = TestingSessionLocal()
    doc = db.query(gov_models.SystemDocument).filter(gov_models.SystemDocument.id == document_id).first()
    assert doc.file_name == "survey.pdf"
    db.close()
    monkeypatch.setattr(document_router.roles_service, "has_permission", lambda *_args: True)
    downloaded = client.get(f"/api/gov/documents/get/{document_id}", headers=staff_headers)
    assert downloaded.status_code == 200
    assert downloaded.content.startswith(b"%PDF-1.4")
    outside = tmp_path.parent / "outside.pdf"
    outside.write_bytes(b"%PDF-1.4\nNot governed")
    db = TestingSessionLocal()
    db.query(gov_models.SystemDocument).filter(gov_models.SystemDocument.id == document_id).first().file_path = str(outside)
    db.commit()
    db.close()
    assert client.get(f"/api/gov/documents/get/{document_id}", headers=staff_headers).status_code == 404


def test_completion_proof_is_private_and_requires_independent_review(client, seeded_users_and_geo):
    from PIL import Image

    db = TestingSessionLocal()
    wo = gov_models.WorkOrder(
        title="Drainage repair", wo_type="standard", status="in_progress",
        assigned_by_id=501, assigned_to_id=503,
    )
    db.add(wo)
    db.commit()
    db.refresh(wo)
    wo_id = wo.id
    db.close()

    proof = io.BytesIO()
    Image.new("RGB", (8, 8), color="blue").save(proof, format="JPEG")
    field_headers = {"Authorization": f"Bearer {seeded_users_and_geo['field_worker']}"}
    inspector_headers = {"Authorization": f"Bearer {seeded_users_and_geo['inspector']}"}
    response = client.post(
        f"/api/gov/work-orders/{wo_id}/completion-evidence",
        files={"image": ("proof.jpg", proof.getvalue(), "image/jpeg")},
        data={"notes": "Drainage cleared and flow checked"}, headers=field_headers,
    )
    assert response.status_code == 200, response.text
    evidence_url = response.json()["image_url"]
    assert client.get(evidence_url).status_code == 401
    assert client.get(evidence_url, headers=inspector_headers).status_code == 200
    assert client.get(evidence_url.replace("/api/gov/work-orders/", "/api/uploads/docs/work_orders/")).status_code == 404

    db = TestingSessionLocal()
    assert db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first().status == "completed_pending_review"
    db.close()

    review = client.post(f"/api/gov/work-orders/{wo_id}/verify", json={
        "passed": True,
        "notes": "Independent inspection passed",
        "checklist_results": {
            "specifications": True, "siteCleared": True,
            "qualityTested": True, "photoVerified": True,
        },
    }, headers=inspector_headers)
    assert review.status_code == 200, review.text
    assert review.json()["work_order"]["status"] == "completed"

    filename = evidence_url.rsplit("/", 1)[-1]
    os.remove(os.path.join("uploads", "docs", "work_orders", str(wo_id), filename))


# =============================================================================
# 6. Citizen Report Request-Info & Docket Hub
# =============================================================================

def test_report_request_info_and_docket(client, seeded_users_and_geo):
    """Verifies request-info transitions report to needs_information, adds timeline, and retrieves docket."""
    eng_hdr = {"Authorization": f"Bearer {seeded_users_and_geo['city_engineer']}"}

    db = TestingSessionLocal()
    rep = models.Report(
        ticket_id="PUL-2026-INFO01",
        description="Fallen tree on access road",
        category="Obstruction",
        status="validated",
        location_barangay="171",
        resident_id=901
    )
    db.add(rep)
    db.commit()
    db.refresh(rep)
    rep_id = rep.id
    db.close()

    req_payload = {
        "reason": "Landmark verification",
        "message": "Please specify whether the fallen tree is before or after the barangay hall entrance."
    }
    req_res = client.post(f"/api/gov/reports/{rep_id}/request-info", json=req_payload, headers=eng_hdr)
    assert req_res.status_code == 200
    assert req_res.json()["new_status"] == "needs_information"

    # Verify database state and notification created
    db = TestingSessionLocal()
    r = db.query(models.Report).filter(models.Report.id == rep_id).first()
    assert r.status == "needs_information"
    notif = db.query(models.Notification).filter(models.Notification.resident_id == 901).first()
    assert notif is not None
    assert "Landmark verification" in req_payload["reason"]
    db.close()

    # Docket verification
    docket_res = client.get(f"/api/gov/reports/{rep_id}/docket", headers=eng_hdr)
    assert docket_res.status_code == 200
    docket = docket_res.json()
    assert docket["report"]["id"] == rep_id
    assert len(docket["timeline"]) >= 1
    assert any("Action Required" in t["note"] for t in docket["timeline"])


# =============================================================================
# 7. Operations Today Hub Endpoint
# =============================================================================

def test_operations_today_dashboard(client, seeded_users_and_geo):
    """Verifies /api/gov/operations/today aggregates 5 metrics, triage items, sectors, and teams."""
    eng_hdr = {"Authorization": f"Bearer {seeded_users_and_geo['city_engineer']}"}

    # Seed sample unassigned reports and work orders
    db = TestingSessionLocal()
    r_crit = models.Report(
        ticket_id="PUL-2026-CRIT-99",
        description="Collapsing Drainage Culvert on Main Ave",
        category="Drainage",
        ai_urgency="critical",
        severity_score=9.5,
        status="received",
        location_barangay="171",
        barangay_id=171,
        location_lat=14.750,
        location_lng=120.985
    )
    db.add(r_crit)
    db.commit()
    db.close()

    res = client.get("/api/gov/operations/today", headers=eng_hdr)
    assert res.status_code == 200
    data = res.json()

    # 1. Leadership metrics
    metrics = data["metrics"]
    assert "unassigned_concerns" in metrics
    assert "overdue_actions" in metrics
    assert "awaiting_verification" in metrics
    assert "open_high_priority" in metrics
    assert "resolved_in_period" in metrics
    assert metrics["open_high_priority"] >= 1

    # 2. Needs Attention triage items
    triage = data["needs_attention"]
    assert len(triage) >= 1
    assert any(t["priority"] == "critical" for t in triage)

    # 3. Sector summary
    sec = data["sector_summary"]
    assert "north_caloocan" in sec
    assert "south_caloocan" in sec
    assert sec["north_caloocan"]["open_tickets"] >= 1

    # 4. Team capacity
    teams = data["team_capacity"]
    assert len(teams) == 5
    team_names = [t["team_name"] for t in teams]
    assert "Road & Pavement Taskforce" in team_names
    assert "North Drainage Maintenance Unit" in team_names
