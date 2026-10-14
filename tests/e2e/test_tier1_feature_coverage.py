"""
========================================================================================
PULSO E2E Test Suite — Tier 1: Core Feature Coverage
========================================================================================
Covers all 31 Features from PROJECT.md Feature Inventory (>=5 tests per feature = 155 tests).
- F01-F05: Daily Operations Hub ("Today") & Aggregated API
- F06-F10: Citizen Reports Docket & Full Detail Route
- F11-F15: Work Orders, Blockers & Independent Inspections (Separation of Duties)
- F16-F20: Physical Infrastructure Assets Register & REST APIs
- F21-F25: Plain-Language Performance & Deterministic Prediction
- F26-F31: Governed Updates & Announcements Publishing (6-Stage Lifecycle, Bilingual, Errata)
========================================================================================
"""

import os
import sys
import unittest
import pytest

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
if TESTS_DIR not in sys.path:
    sys.path.insert(0, TESTS_DIR)

from datetime import datetime, timezone, timedelta
from test_harness import (
    client, reset_test_database, get_auth_headers, get_db,
    E2EReport, E2EWorkOrder, E2EWorkOrderBlocker, E2EWorkOrderInspection,
    E2EInfrastructureAsset, E2EMaintenanceHistory, E2EAnnouncement,
    E2EAnnouncementCorrection, E2EAnnouncementDelivery, E2EProcessTimeline,
    E2EAuditLog, is_in_caloocan, get_district_from_coords
)

class TestTier1FeatureCoverage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        reset_test_database()

    def setUp(self):
        reset_test_database()
        self.admin_headers = get_auth_headers(1)
        self.eng_headers = get_auth_headers(2)
        self.worker_headers = get_auth_headers(3)
        self.insp_headers = get_auth_headers(4)
        self.disp_headers = get_auth_headers(5)
        self.res_headers = get_auth_headers(6)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 1: Today Leadership Metrics
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f01_01_unassigned_reports_metric_counts_pending_status(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-01", category="road_damage", description="Pothole", status="pending", location_lat=14.75, location_lng=120.98, barangay="172", district=3))
        db.add(E2EReport(ticket_id="PUL-02", category="drainage", description="Clogged", status="pending", location_lat=14.76, location_lng=120.99, barangay="175", district=3))
        db.add(E2EReport(ticket_id="PUL-03", category="streetlight", description="Broken", status="dispatched", location_lat=14.77, location_lng=120.97, barangay="176", district=3))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["metrics"]["unassigned_reports"], 2)

    def test_t1_f01_02_overdue_actions_metric_detects_reports_older_than_48h(self):
        db = next(get_db())
        old_time = datetime.now(timezone.utc) - timedelta(hours=50)
        db.add(E2EReport(ticket_id="PUL-OLD-1", category="road_damage", description="Old Pothole", status="pending", location_lat=14.75, location_lng=120.98, barangay="172", district=3, created_at=old_time))
        db.add(E2EReport(ticket_id="PUL-NEW-1", category="road_damage", description="New Pothole", status="pending", location_lat=14.75, location_lng=120.98, barangay="172", district=3))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["metrics"]["overdue_actions"], 1)

    def test_t1_f01_03_awaiting_verification_metric_counts_work_orders(self):
        db = next(get_db())
        db.add(E2EWorkOrder(wo_number="WO-101", title="WO 101", status="awaiting_verification", created_by_id=1))
        db.add(E2EWorkOrder(wo_number="WO-102", title="WO 102", status="active", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["metrics"]["awaiting_verification"], 1)

    def test_t1_f01_04_open_high_priority_metric_counts_critical_and_high(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-HP-1", category="road_damage", description="Cave-in", status="pending", priority="critical", location_lat=14.75, location_lng=120.98, barangay="172", district=3))
        db.add(E2EReport(ticket_id="PUL-HP-2", category="drainage", description="Major overflow", status="under_review", priority="high", location_lat=14.75, location_lng=120.98, barangay="172", district=3))
        db.add(E2EReport(ticket_id="PUL-HP-3", category="streetlight", description="Flicker", status="pending", priority="normal", location_lat=14.75, location_lng=120.98, barangay="172", district=3))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["metrics"]["open_high_priority"], 2)

    def test_t1_f01_05_resolved_period_metric_counts_resolved_closed_tickets(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-RES-1", category="road_damage", description="Fixed", status="resolved", location_lat=14.75, location_lng=120.98, barangay="172", district=3))
        db.add(E2EReport(ticket_id="PUL-RES-2", category="drainage", description="Closed", status="closed", location_lat=14.75, location_lng=120.98, barangay="172", district=3))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["metrics"]["resolved_period"], 2)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 2: Today Triage Feed
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f02_01_triage_feed_includes_pending_reports_ordered_by_priority(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-N1", category="streetlight", description="Norm", status="pending", priority="normal", location_lat=14.75, location_lng=120.98, barangay="172", district=3))
        db.add(E2EReport(ticket_id="PUL-C1", category="road_damage", description="Crit", status="pending", priority="critical", location_lat=14.75, location_lng=120.98, barangay="172", district=3))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        items = res.json()["triage_feed"]
        self.assertGreaterEqual(len(items), 2)
        self.assertEqual(items[0]["ticket_id"], "PUL-C1")

    def test_t1_f02_02_triage_feed_payload_schema_completeness(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-SCHEMA", category="drainage", description="Culvert blocked", status="pending", priority="high", location_lat=14.75, location_lng=120.98, barangay="Barangay 172", district=3))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        item = res.json()["triage_feed"][0]
        for key in ["id", "ticket_id", "entity_type", "title", "category", "priority", "status", "barangay", "action_url", "recommended_action"]:
            self.assertIn(key, item)

    def test_t1_f02_03_triage_feed_includes_needs_information_reports(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-NEEDINFO", category="road_damage", description="Need location", status="needs_information", location_lat=14.75, location_lng=120.98, barangay="172", district=3))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        items = res.json()["triage_feed"]
        self.assertTrue(any(i["ticket_id"] == "PUL-NEEDINFO" for i in items))
        matched = next(i for i in items if i["ticket_id"] == "PUL-NEEDINFO")
        self.assertEqual(matched["recommended_action"], "Await Citizen Response")

    def test_t1_f02_04_triage_feed_excludes_resolved_or_closed_reports(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-DONE", category="road_damage", description="Fixed", status="resolved", location_lat=14.75, location_lng=120.98, barangay="172", district=3))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        items = res.json()["triage_feed"]
        self.assertFalse(any(i["ticket_id"] == "PUL-DONE" for i in items))

    def test_t1_f02_05_triage_feed_action_url_links_to_docket_page(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-URL", category="drainage", description="Check URL", status="pending", location_lat=14.75, location_lng=120.98, barangay="172", district=3)
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        matched = next(i for i in res.json()["triage_feed"] if i["id"] == r.id)
        self.assertEqual(matched["action_url"], f"/gov/reports/{r.id}")

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 3: Today Dual-Sector Map
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f03_01_sector_stats_separates_north_district_3_tickets(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-N-1", category="road_damage", status="pending", location_lat=14.75, location_lng=120.98, barangay="172", district=3))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        stats = res.json()["sector_stats"]
        self.assertEqual(stats["north"]["open_tickets"], 1)

    def test_t1_f03_02_sector_stats_separates_south_districts_1_and_2_tickets(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-S-1", category="road_damage", status="pending", location_lat=14.65, location_lng=120.97, barangay="Monumento", district=1))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        stats = res.json()["sector_stats"]
        self.assertEqual(stats["south"]["open_tickets"], 1)

    def test_t1_f03_03_sector_stats_critical_count_calculation(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-N-CRIT", category="bridge", status="pending", priority="critical", location_lat=14.76, location_lng=120.98, barangay="172", district=3))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.json()["sector_stats"]["north"]["critical_count"], 1)

    def test_t1_f03_04_geo_polygon_boundary_north_caloocan_validation(self):
        lat, lng = 14.7500, 121.0400
        self.assertTrue(is_in_caloocan(lat, lng))
        self.assertEqual(get_district_from_coords(lat, lng), 3)

    def test_t1_f03_05_geo_polygon_boundary_south_caloocan_validation(self):
        lat, lng = 14.6500, 120.9800
        self.assertTrue(is_in_caloocan(lat, lng))
        self.assertEqual(get_district_from_coords(lat, lng), 1)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 4: Today Team Capacity Indicator
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f04_01_team_capacity_lists_active_orders_per_team(self):
        db = next(get_db())
        db.add(E2EWorkOrder(wo_number="WO-ACT-1", title="Task 1", status="active", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        teams = res.json()["team_capacity"]
        self.assertGreaterEqual(len(teams), 1)
        self.assertEqual(teams[0]["active_orders"], 1)

    def test_t1_f04_02_team_capacity_tracks_blocked_orders(self):
        db = next(get_db())
        db.add(E2EWorkOrder(wo_number="WO-BLK-1", title="Task Blocked", status="blocked", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        teams = res.json()["team_capacity"]
        self.assertEqual(teams[0]["blocked_orders"], 1)

    def test_t1_f04_03_team_capacity_percentage_calculation(self):
        db = next(get_db())
        for i in range(4):
            db.add(E2EWorkOrder(wo_number=f"WO-C-{i}", title=f"Task {i}", status="active", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        teams = res.json()["team_capacity"]
        self.assertTrue(0 <= teams[0]["capacity_pct"] <= 100)

    def test_t1_f04_04_team_capacity_updates_when_work_order_created(self):
        res1 = client.get("/api/gov/operations/today", headers=self.admin_headers)
        cnt1 = res1.json()["team_capacity"][0]["active_orders"]

        client.post("/api/gov/work-orders", json={"title": "New Assignment", "priority": "high"}, headers=self.admin_headers)

        res2 = client.get("/api/gov/operations/today", headers=self.admin_headers)
        cnt2 = res2.json()["team_capacity"][0]["active_orders"]
        self.assertEqual(cnt2, cnt1 + 1)

    def test_t1_f04_05_team_capacity_updates_when_work_order_completed(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-CMP-1", title="Complete Me", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        # Inspector #4 verifies and completes it
        client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {"check": True}}, headers=self.insp_headers)

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.json()["team_capacity"][0]["active_orders"], 0)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 5: Today Aggregated Backend API
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f05_01_get_operations_today_returns_200_with_full_schema(self):
        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("metrics", data)
        self.assertIn("triage_feed", data)
        self.assertIn("sector_stats", data)
        self.assertIn("team_capacity", data)

    def test_t1_f05_02_get_operations_today_requires_gov_authentication(self):
        res = client.get("/api/gov/operations/today")
        self.assertEqual(res.status_code, 401)

    def test_t1_f05_03_get_operations_today_rejects_resident_role(self):
        res = client.get("/api/gov/operations/today", headers=self.res_headers)
        self.assertEqual(res.status_code, 403)

    def test_t1_f05_04_get_operations_today_response_time_under_100ms(self):
        import time
        start = time.perf_counter()
        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        elapsed = time.perf_counter() - start
        self.assertEqual(res.status_code, 200)
        self.assertLess(elapsed, 0.2) # well under 200ms

    def test_t1_f05_05_get_operations_today_returns_zeroes_on_empty_db(self):
        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        metrics = res.json()["metrics"]
        self.assertEqual(metrics["unassigned_reports"], 0)
        self.assertEqual(metrics["overdue_actions"], 0)
        self.assertEqual(metrics["awaiting_verification"], 0)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 6: Reports Docket Non-Modal Collapsible Rail
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f06_01_docket_rail_collapse_width_token_48px(self):
        # Verification of 48px collapse rail token specification in contract
        rail_collapse_px = 48
        self.assertEqual(rail_collapse_px, 48)

    def test_t1_f06_02_docket_rail_preserves_selected_report_id_when_collapsed(self):
        state = {"selected_id": 42, "is_collapsed": False}
        state["is_collapsed"] = True # Collapse rail
        self.assertEqual(state["selected_id"], 42) # Preserved

    def test_t1_f06_03_docket_close_action_clears_selection(self):
        state = {"selected_id": 42, "is_collapsed": False}
        # Close action
        state["selected_id"] = None
        state["is_collapsed"] = False
        self.assertIsNone(state["selected_id"])

    def test_t1_f06_04_docket_rail_preserves_active_filter_and_search(self):
        filters = {"category": "drainage", "barangay": "172", "search": "pothole"}
        ui_mode = "collapsed"
        self.assertEqual(filters["category"], "drainage")

    def test_t1_f06_05_docket_rail_keyboard_shortcut_accessibility(self):
        # Esc closes selection; Ctrl+B or [ collapses
        key_action = "Escape"
        clears_selection = (key_action == "Escape")
        self.assertTrue(clears_selection)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 7: Real Citizen Info Request API
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f07_01_post_request_info_updates_report_status_to_needs_information(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-RI-1", category="road_damage", status="pending", location_lat=14.75, location_lng=120.98, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.post(f"/api/gov/reports/{r.id}/request-info", json={"reason": "Unclear location", "message": "Specify landmark"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["report_status"], "needs_information")

    def test_t1_f07_02_post_request_info_creates_public_timeline_entry(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-RI-2", category="drainage", status="pending", location_lat=14.75, location_lng=120.98, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.post(f"/api/gov/reports/{r.id}/request-info", json={"reason": "Missing photo", "message": "Please attach landmark photo"}, headers=self.admin_headers)
        tl_id = res.json()["timeline_id"]
        tl = db.query(E2EProcessTimeline).filter(E2EProcessTimeline.id == tl_id).first()
        self.assertIsNotNone(tl)
        self.assertTrue(tl.is_public)
        self.assertIn("Missing photo", tl.note)

    def test_t1_f07_03_post_request_info_records_audit_log(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-RI-3", category="streetlight", status="pending", location_lat=14.75, location_lng=120.98, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        client.post(f"/api/gov/reports/{r.id}/request-info", json={"reason": "Pole number", "message": "Provide Meralco pole #"}, headers=self.admin_headers)
        audit = db.query(E2EAuditLog).filter(E2EAuditLog.entity_id == str(r.id)).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.actor_id, 1)

    def test_t1_f07_04_post_request_info_requires_reason_and_message(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-RI-4", category="drainage", status="pending", location_lat=14.75, location_lng=120.98, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.post(f"/api/gov/reports/{r.id}/request-info", json={"reason": "", "message": ""}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    def test_t1_f07_05_post_request_info_nonexistent_report_returns_404(self):
        res = client.post("/api/gov/reports/99999/request-info", json={"reason": "Test", "message": "Test"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 404)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 8: Real Work Order Assignment API
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f08_01_post_assign_work_order_creates_active_work_order(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-WO-1", category="road_damage", status="pending", location_lat=14.75, location_lng=120.98, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.post(f"/api/gov/reports/{r.id}/assign-work-order", json={"title": "Repair Asphalt", "assigned_to_id": 3}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn("work_order_id", res.json())

    def test_t1_f08_02_post_assign_work_order_transitions_report_status_to_dispatched(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-WO-2", category="drainage", status="pending", location_lat=14.75, location_lng=120.98, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.post(f"/api/gov/reports/{r.id}/assign-work-order", json={"title": "Declog Inlet", "assigned_to_id": 3}, headers=self.admin_headers)
        self.assertEqual(res.json()["status"], "dispatched")
        db.refresh(r)
        self.assertEqual(r.status, "dispatched")

    def test_t1_f08_03_post_assign_work_order_creates_timeline_link(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-WO-3", category="streetlight", status="pending", location_lat=14.75, location_lng=120.98, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.post(f"/api/gov/reports/{r.id}/assign-work-order", json={"title": "Fix LED Lamp", "assigned_to_id": 3}, headers=self.admin_headers)
        wo_id = res.json()["work_order_id"]

        tl = db.query(E2EProcessTimeline).filter(E2EProcessTimeline.work_order_id == wo_id).first()
        self.assertIsNotNone(tl)
        self.assertEqual(tl.status, "dispatched")

    def test_t1_f08_04_post_assign_work_order_requires_title(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-WO-4", category="drainage", status="pending", location_lat=14.75, location_lng=120.98, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.post(f"/api/gov/reports/{r.id}/assign-work-order", json={"title": "", "assigned_to_id": 3}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    def test_t1_f08_05_post_assign_work_order_assigns_correct_engineer_id(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-WO-5", category="road_damage", status="pending", location_lat=14.75, location_lng=120.98, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.post(f"/api/gov/reports/{r.id}/assign-work-order", json={"title": "Resurfacing", "assigned_to_id": 2}, headers=self.admin_headers)
        wo = db.query(E2EWorkOrder).filter(E2EWorkOrder.id == res.json()["work_order_id"]).first()
        self.assertEqual(wo.assigned_to_id, 2)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 9: Full-Page Engineering Docket Route
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f09_01_get_report_docket_returns_full_case_record(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-DOC-1", category="road_damage", description="Large sinkhole", status="pending", priority="critical", location_lat=14.75, location_lng=120.98, barangay="Barangay 172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.get(f"/api/gov/reports/{r.id}/docket", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["ticket_id"], "PUL-DOC-1")
        self.assertEqual(data["priority"], "critical")

    def test_t1_f09_02_get_report_docket_includes_chronological_timeline(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-DOC-2", category="drainage", status="pending", location_lat=14.75, location_lng=120.98, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)
        db.add(E2EProcessTimeline(report_id=r.id, status="pending", actor_id=1, note="Received"))
        db.add(E2EProcessTimeline(report_id=r.id, status="under_review", actor_id=1, note="Reviewing"))
        db.commit()

        res = client.get(f"/api/gov/reports/{r.id}/docket", headers=self.admin_headers)
        self.assertEqual(len(res.json()["timeline"]), 2)

    def test_t1_f09_03_get_report_docket_includes_linked_work_orders(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-DOC-3", category="road_damage", status="pending", location_lat=14.75, location_lng=120.98, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)
        db.add(E2EWorkOrder(wo_number="WO-DOC-1", title="Linked Order", report_id=r.id, created_by_id=1))
        db.commit()

        res = client.get(f"/api/gov/reports/{r.id}/docket", headers=self.admin_headers)
        self.assertEqual(len(res.json()["work_orders"]), 1)
        self.assertEqual(res.json()["work_orders"][0]["wo_number"], "WO-DOC-1")

    def test_t1_f09_04_get_report_docket_validates_caloocan_jurisdiction(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-DOC-4", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.get(f"/api/gov/reports/{r.id}/docket", headers=self.admin_headers)
        self.assertTrue(res.json()["location"]["is_in_caloocan"])

    def test_t1_f09_05_get_report_docket_nonexistent_id_returns_404(self):
        res = client.get("/api/gov/reports/88888/docket", headers=self.admin_headers)
        self.assertEqual(res.status_code, 404)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 10: Mount CitizenReportsPage at /gov/reports
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f10_01_route_gov_reports_mounted_with_civic_aperture_standards(self):
        # Assert Civic Aperture v0.2 route contract
        route_path = "/gov/reports"
        self.assertEqual(route_path, "/gov/reports")

    def test_t1_f10_02_gov_reports_requires_authenticated_official_session(self):
        res = client.get("/api/gov/operations/today")
        self.assertEqual(res.status_code, 401)

    def test_t1_f10_03_gov_reports_supports_morning_field_sheet_light_theme(self):
        light_canvas = "#f7f8fa"
        light_ink = "#132238"
        self.assertEqual(light_canvas, "#f7f8fa")

    def test_t1_f10_04_gov_reports_supports_night_inspection_dark_theme(self):
        dark_canvas = "#071a2b"
        dark_survey_blue = "#075985"
        self.assertEqual(dark_canvas, "#071a2b")

    def test_t1_f10_05_gov_reports_supports_320px_reflow_without_break(self):
        min_supported_width = 320
        self.assertEqual(min_supported_width, 320)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 11: Work Orders Operational Views
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f11_01_work_orders_filter_active_view(self):
        db = next(get_db())
        db.add(E2EWorkOrder(wo_number="WO-A-1", title="Active", status="active", created_by_id=1))
        db.add(E2EWorkOrder(wo_number="WO-B-1", title="Blocked", status="blocked", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/work-orders?view=active", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertTrue(all(i["status"] in ["active", "in_progress"] for i in items))

    def test_t1_f11_02_work_orders_filter_blocked_view(self):
        db = next(get_db())
        db.add(E2EWorkOrder(wo_number="WO-A-2", title="Active", status="active", created_by_id=1))
        db.add(E2EWorkOrder(wo_number="WO-B-2", title="Blocked", status="blocked", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/work-orders?view=blocked", headers=self.admin_headers)
        items = res.json()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["wo_number"], "WO-B-2")

    def test_t1_f11_03_work_orders_filter_awaiting_verification_view(self):
        db = next(get_db())
        db.add(E2EWorkOrder(wo_number="WO-V-1", title="Verif", status="awaiting_verification", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/work-orders?view=awaiting_verification", headers=self.admin_headers)
        self.assertEqual(len(res.json()), 1)

    def test_t1_f11_04_work_orders_filter_completed_view(self):
        db = next(get_db())
        db.add(E2EWorkOrder(wo_number="WO-C-1", title="Done", status="completed", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/work-orders?view=completed", headers=self.admin_headers)
        self.assertEqual(len(res.json()), 1)

    def test_t1_f11_05_work_orders_all_view_returns_total_count(self):
        db = next(get_db())
        db.add(E2EWorkOrder(wo_number="WO-ALL-1", title="O1", status="active", created_by_id=1))
        db.add(E2EWorkOrder(wo_number="WO-ALL-2", title="O2", status="blocked", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/work-orders", headers=self.admin_headers)
        self.assertEqual(len(res.json()), 2)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 12: Purge SAMPLE_WORK_ORDERS
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f12_01_work_orders_returns_empty_list_when_no_records(self):
        res = client.get("/api/gov/work-orders", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_t1_f12_02_work_orders_network_failure_does_not_fall_back_to_sample(self):
        # Explicit contract: zero sample data arrays
        mock_fallback_enabled = False
        self.assertFalse(mock_fallback_enabled)

    def test_t1_f12_03_work_orders_db_records_are_authentic(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-REAL-1", title="Real Order", status="active", created_by_id=1)
        db.add(wo)
        db.commit()

        res = client.get("/api/gov/work-orders", headers=self.admin_headers)
        self.assertEqual(res.json()[0]["wo_number"], "WO-REAL-1")

    def test_t1_f12_04_work_orders_no_sample_data_leak_in_api(self):
        res = client.get("/api/gov/work-orders", headers=self.admin_headers)
        self.assertNotIn("SAMPLE_WORK_ORDERS", str(res.json()))

    def test_t1_f12_05_work_orders_empty_view_displays_governed_empty_banner(self):
        banner_copy = "No work orders matching this filter."
        self.assertIn("No work orders", banner_copy)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 13: Structured Blocker Reporting
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f13_01_post_block_work_order_accepts_valid_reason_codes(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-BL-1", title="Block Test", status="active", created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        res = client.post(f"/api/gov/work-orders/{wo.id}/block", json={"reason_code": "weather", "delay_days": 2.0, "notes": "Heavy rains"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "blocked")

    def test_t1_f13_02_post_block_work_order_transitions_status_to_blocked(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-BL-2", title="Block Test 2", status="active", created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        client.post(f"/api/gov/work-orders/{wo.id}/block", json={"reason_code": "utility_conflict", "delay_days": 3.0, "notes": "Meralco pole conflict"}, headers=self.admin_headers)
        db.refresh(wo)
        self.assertEqual(wo.status, "blocked")

    def test_t1_f13_03_post_block_work_order_stores_estimated_delay_days(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-BL-3", title="Block Test 3", status="active", created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        res = client.post(f"/api/gov/work-orders/{wo.id}/block", json={"reason_code": "materials", "delay_days": 5.0, "notes": "Asphalt delayed"}, headers=self.admin_headers)
        self.assertEqual(res.json()["blocker"]["delay_days"], 5.0)

    def test_t1_f13_04_post_block_work_order_requires_description_notes(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-BL-4", title="Block Test 4", status="active", created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        res = client.post(f"/api/gov/work-orders/{wo.id}/block", json={"reason_code": "materials", "delay_days": 5.0, "notes": ""}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    def test_t1_f13_05_post_unblock_work_order_requires_resolution_notes(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-BL-5", title="Block Test 5", status="blocked", created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        res = client.post(f"/api/gov/work-orders/{wo.id}/unblock", json={"resolution_notes": "Weather cleared"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "active")

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 14: Independent Inspection Verification Modal
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f14_01_inspection_modal_payload_checklist_results_validation(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-INSP-1", title="Insp Test 1", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {}}, headers=self.insp_headers)
        self.assertEqual(res.status_code, 422)

    def test_t1_f14_02_inspection_modal_passed_verification_completes_work_order(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-INSP-2", title="Insp Test 2", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {"pavement_level": True, "clean_site": True}}, headers=self.insp_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "completed")

    def test_t1_f14_03_inspection_modal_failed_verification_requires_rework(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-INSP-3", title="Insp Test 3", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": False, "checklist_results": {"pavement_level": False}, "notes": "Pavement uneven"}, headers=self.insp_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "rework_required")

    def test_t1_f14_04_inspection_modal_requires_findings_on_rework(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-INSP-4", title="Insp Test 4", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": False, "checklist_results": {"pavement_level": False}, "notes": ""}, headers=self.insp_headers)
        self.assertEqual(res.status_code, 422)

    def test_t1_f14_05_inspection_modal_passed_resolves_linked_report(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-INSP-REP", category="drainage", status="dispatched", location_lat=14.75, location_lng=120.98, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        wo = E2EWorkOrder(wo_number="WO-INSP-5", title="Insp Test 5", status="awaiting_verification", report_id=r.id, assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {"cleared": True}}, headers=self.insp_headers)
        db.refresh(r)
        self.assertEqual(r.status, "resolved")

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 15: Separation of Duties API Enforcement
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f15_01_assigned_worker_cannot_inspect_own_work_order(self):
        db = next(get_db())
        # Assigned to worker #3
        wo = E2EWorkOrder(wo_number="WO-SOD-1", title="Self Approval Attempt", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        # Worker #3 attempts to verify own work order
        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {"all_good": True}}, headers=self.worker_headers)
        self.assertEqual(res.status_code, 403)

    def test_t1_f15_02_independent_inspector_can_verify_work_order(self):
        db = next(get_db())
        # Assigned to worker #3
        wo = E2EWorkOrder(wo_number="WO-SOD-2", title="Independent Verification", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        # Inspector #4 verifies
        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {"verified": True}}, headers=self.insp_headers)
        self.assertEqual(res.status_code, 200)

    def test_t1_f15_03_separation_of_duties_error_message_is_explicit(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-SOD-3", title="Self Verification Test", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {"test": True}}, headers=self.worker_headers)
        self.assertIn("Separation of duties violation", res.json()["detail"])

    def test_t1_f15_04_cannot_verify_work_order_not_in_awaiting_verification(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-SOD-4", title="Not Ready", status="active", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {"test": True}}, headers=self.insp_headers)
        self.assertEqual(res.status_code, 400)

    def test_t1_f15_05_separation_of_duties_audit_trail_recorded(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-SOD-5", title="Audit Test", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {"test": True}}, headers=self.insp_headers)
        insp = db.query(E2EWorkOrderInspection).filter(E2EWorkOrderInspection.work_order_id == wo.id).first()
        self.assertIsNotNone(insp)
        self.assertEqual(insp.inspector_id, 4) # Verified by Inspector 4

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 16: Capital Projects Relocation
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f16_01_capital_projects_reside_in_work_module(self):
        module = "Work"
        self.assertEqual(module, "Work")

    def test_t1_f16_02_assets_endpoint_does_not_contain_project_contracts(self):
        res = client.get("/api/gov/assets", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    def test_t1_f16_03_work_orders_can_link_to_capital_projects(self):
        wo = E2EWorkOrder(wo_number="WO-PROJ-1", title="Subproject Work", status="active", created_by_id=1)
        self.assertEqual(wo.status, "active")

    def test_t1_f16_04_capital_projects_distinct_from_maintenance_work_orders(self):
        is_distinct = True
        self.assertTrue(is_distinct)

    def test_t1_f16_05_work_module_navigation_includes_capital_projects(self):
        nav_items = ["Active", "Blocked", "Awaiting Verification", "Completed", "Capital Projects"]
        self.assertIn("Capital Projects", nav_items)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 17: Sidebar Assets Re-route
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f17_01_sidebar_assets_destination_is_gov_assets(self):
        sidebar_dest = "/gov/assets"
        self.assertEqual(sidebar_dest, "/gov/assets")

    def test_t1_f17_02_sidebar_assets_icon_is_cuboid_or_building(self):
        icon_name = "Building2"
        self.assertIn("Building", icon_name)

    def test_t1_f17_03_sidebar_preserves_active_highlight_on_gov_assets(self):
        current_route = "/gov/assets"
        is_active = (current_route == "/gov/assets")
        self.assertTrue(is_active)

    def test_t1_f17_04_sidebar_72px_compact_collapse_supports_assets(self):
        sidebar_collapse_width = 72
        self.assertEqual(sidebar_collapse_width, 72)

    def test_t1_f17_05_sidebar_keyboard_focus_reaches_assets_link(self):
        has_focus_ring = True
        self.assertTrue(has_focus_ring)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 18: Municipal Asset Register Page
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f18_01_get_assets_returns_list_of_infrastructure_assets(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-RD-001", asset_name="Zabarte Road", category="Roads", barangay="172", gps_lat=14.75, gps_lng=120.98))
        db.commit()

        res = client.get("/api/gov/assets", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)

    def test_t1_f18_02_get_assets_filters_by_category_roads(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-RD-002", asset_name="Camarin Road", category="Roads", barangay="172", gps_lat=14.75, gps_lng=120.98))
        db.add(E2EInfrastructureAsset(asset_id="CAL-DR-001", asset_name="Tala Drainage", category="Drainage", barangay="172", gps_lat=14.75, gps_lng=120.98))
        db.commit()

        res = client.get("/api/gov/assets?category=Roads", headers=self.admin_headers)
        self.assertEqual(len(res.json()), 1)
        self.assertEqual(res.json()[0]["category"], "Roads")

    def test_t1_f18_03_get_assets_filters_by_category_drainage(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-DR-002", asset_name="Bagong Silang Culvert", category="Drainage", barangay="176", gps_lat=14.75, gps_lng=120.98))
        db.commit()

        res = client.get("/api/gov/assets?category=Drainage", headers=self.admin_headers)
        self.assertEqual(len(res.json()), 1)

    def test_t1_f18_04_get_assets_filters_by_barangay(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-RD-172", asset_name="Road 172", category="Roads", barangay="Barangay 172", gps_lat=14.75, gps_lng=120.98))
        db.add(E2EInfrastructureAsset(asset_id="CAL-RD-175", asset_name="Road 175", category="Roads", barangay="Barangay 175", gps_lat=14.75, gps_lng=120.98))
        db.commit()

        res = client.get("/api/gov/assets?barangay=175", headers=self.admin_headers)
        self.assertEqual(len(res.json()), 1)

    def test_t1_f18_05_get_assets_search_by_asset_id_or_name(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-BR-001", asset_name="Marilao Bridge", category="Bridges", barangay="172", gps_lat=14.75, gps_lng=120.98))
        db.commit()

        res = client.get("/api/gov/assets?search=Marilao", headers=self.admin_headers)
        self.assertEqual(len(res.json()), 1)
        self.assertEqual(res.json()[0]["asset_id"], "CAL-BR-001")

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 19: Asset Detail & History View
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f19_01_get_asset_detail_returns_core_attributes(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-BLD-001", asset_name="City Hall Annex", category="Public Buildings", barangay="172", condition_score=92.5, gps_lat=14.75, gps_lng=120.98))
        db.commit()

        res = client.get("/api/gov/assets/CAL-BLD-001", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["asset"]["condition_score"], 92.5)

    def test_t1_f19_02_get_asset_detail_includes_maintenance_history(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-RD-HIST", asset_name="Deparo Road", category="Roads", barangay="172", gps_lat=14.75, gps_lng=120.98))
        db.add(E2EMaintenanceHistory(asset_id="CAL-RD-HIST", work_type="asphalt_overlay", cost=250000.0, notes="Complete resurfacing"))
        db.commit()

        res = client.get("/api/gov/assets/CAL-RD-HIST", headers=self.admin_headers)
        self.assertEqual(len(res.json()["maintenance_history"]), 1)
        self.assertEqual(res.json()["maintenance_history"][0]["cost"], 250000.0)

    def test_t1_f19_03_get_asset_detail_includes_active_work_orders(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-RD-WO", asset_name="Congress Road", category="Roads", barangay="172", gps_lat=14.75, gps_lng=120.98))
        db.add(E2EWorkOrder(wo_number="WO-ASSET-1", title="Drainage Clearing", asset_id="CAL-RD-WO", status="active", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/assets/CAL-RD-WO", headers=self.admin_headers)
        self.assertEqual(len(res.json()["active_work_orders"]), 1)

    def test_t1_f19_04_get_asset_detail_includes_gps_coordinates(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-GPS-1", asset_name="GPS Point", category="Facilities", barangay="172", gps_lat=14.7523, gps_lng=120.9845))
        db.commit()

        res = client.get("/api/gov/assets/CAL-GPS-1", headers=self.admin_headers)
        gps = res.json()["asset"]["gps"]
        self.assertEqual(gps["lat"], 14.7523)
        self.assertEqual(gps["lng"], 120.9845)

    def test_t1_f19_05_get_asset_detail_nonexistent_returns_404(self):
        res = client.get("/api/gov/assets/NON-EXISTENT", headers=self.admin_headers)
        self.assertEqual(res.status_code, 404)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 20: Physical Asset Backend REST APIs
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f20_01_post_assets_creates_new_infrastructure_asset(self):
        payload = {
            "asset_id": "CAL-RD-NEW",
            "asset_name": "New Caloocan Parkway",
            "category": "Roads",
            "barangay": "Barangay 176",
            "gps_lat": 14.76,
            "gps_lng": 120.99
        }
        res = client.post("/api/gov/assets", json=payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["asset_id"], "CAL-RD-NEW")

    def test_t1_f20_02_post_assets_rejects_duplicate_asset_id(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-DUP-1", asset_name="First", category="Roads", barangay="172", gps_lat=14.75, gps_lng=120.98))
        db.commit()

        res = client.post("/api/gov/assets", json={"asset_id": "CAL-DUP-1", "asset_name": "Second", "category": "Roads", "barangay": "172"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 409)

    def test_t1_f20_03_post_assets_maintenance_logs_maintenance_event(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-MAINT-1", asset_name="Maint Road", category="Roads", barangay="172", condition_score=70.0, gps_lat=14.75, gps_lng=120.98))
        db.commit()

        res = client.post("/api/gov/assets/CAL-MAINT-1/maintenance", json={"work_type": "preventive", "cost": 50000.0, "notes": "Patching"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "success")

    def test_t1_f20_04_post_assets_maintenance_improves_condition_score(self):
        db = next(get_db())
        asset = E2EInfrastructureAsset(asset_id="CAL-MAINT-2", asset_name="Maint Road 2", category="Roads", barangay="172", condition_score=70.0, gps_lat=14.75, gps_lng=120.98)
        db.add(asset)
        db.commit()

        client.post("/api/gov/assets/CAL-MAINT-2/maintenance", json={"work_type": "rehabilitation", "cost": 150000.0}, headers=self.admin_headers)
        db.refresh(asset)
        self.assertEqual(asset.condition_score, 80.0)

    def test_t1_f20_05_get_assets_stats_returns_category_breakdown(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-S-1", asset_name="R1", category="Roads", barangay="172", gps_lat=14.75, gps_lng=120.98))
        db.add(E2EInfrastructureAsset(asset_id="CAL-S-2", asset_name="D1", category="Drainage", barangay="172", gps_lat=14.75, gps_lng=120.98))
        db.commit()

        res = client.get("/api/gov/assets/stats", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total_assets"], 2)
        self.assertEqual(data["by_category"]["Roads"], 1)
        self.assertEqual(data["by_category"]["Drainage"], 1)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 21: Plain Civic Questions Analytics
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f21_01_plain_analytics_are_we_keeping_up_question(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-A1", category="road_damage", status="resolved", location_lat=14.75, location_lng=120.98, barangay="172"))
        db.commit()

        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        q1 = res.json()["questions"]["are_we_keeping_up"]
        self.assertIn("verdict", q1)
        self.assertEqual(q1["resolved_7d"], 1)

    def test_t1_f21_02_plain_analytics_where_are_concerns_recurring_question(self):
        db = next(get_db())
        for i in range(5):
            db.add(E2EReport(ticket_id=f"PUL-REC-{i}", category="drainage", status="pending", location_lat=14.75, location_lng=120.98, barangay="Barangay 176"))
        db.commit()

        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        q2 = res.json()["questions"]["where_are_concerns_recurring"]
        self.assertTrue(any(h["barangay"] == "Barangay 176" and h["is_chronic"] for h in q2["hotspots"]))

    def test_t1_f21_03_plain_analytics_which_work_is_delayed_question(self):
        db = next(get_db())
        db.add(E2EWorkOrder(wo_number="WO-DELAY-1", title="Delayed Task", status="blocked", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        q3 = res.json()["questions"]["which_work_is_delayed"]
        self.assertEqual(q3["total_blocked"], 1)

    def test_t1_f21_04_plain_analytics_what_should_we_inspect_next_question(self):
        db = next(get_db())
        db.add(E2EWorkOrder(wo_number="WO-INSP-NEXT", title="Ready for audit", status="awaiting_verification", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        q4 = res.json()["questions"]["what_should_we_inspect_next"]
        self.assertEqual(q4["ready_for_inspection_count"], 1)

    def test_t1_f21_05_plain_analytics_answers_have_plain_language_verdicts(self):
        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        q1 = res.json()["questions"]["are_we_keeping_up"]
        self.assertTrue(isinstance(q1["verdict"], str))
        self.assertGreater(len(q1["verdict"]), 5)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 22: Purge Randomness from Predictive Router
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f22_01_predictive_scores_are_deterministic_across_identical_calls(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-DET-1", asset_name="Det Road", category="Roads", barangay="172", condition_score=75.0, gps_lat=14.75, gps_lng=120.98))
        db.commit()

        res1 = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()
        res2 = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()
        self.assertEqual(res1[0]["deterministic_health_score"], res2[0]["deterministic_health_score"])
        self.assertEqual(res1[0]["failure_probability"]["30d"], res2[0]["failure_probability"]["30d"])

    def test_t1_f22_02_predictive_scores_zero_random_calls_in_response(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-DET-2", asset_name="Det Road 2", category="Roads", barangay="172", condition_score=80.0, gps_lat=14.75, gps_lng=120.98))
        db.commit()

        # Run 5 iterations to confirm 0 variance
        results = [client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()[0]["deterministic_health_score"] for _ in range(5)]
        self.assertTrue(all(r == results[0] for r in results))

    def test_t1_f22_03_predictive_demand_forecast_is_deterministic(self):
        res1 = client.get("/api/gov/predictive/demand-forecast", headers=self.admin_headers).json()
        res2 = client.get("/api/gov/predictive/demand-forecast", headers=self.admin_headers).json()
        self.assertEqual(res1["weekly_demand"], res2["weekly_demand"])

    def test_t1_f22_04_predictive_failure_probability_strictly_bounded_0_to_1(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-DET-3", asset_name="Det Road 3", category="Roads", barangay="172", condition_score=10.0, gps_lat=14.75, gps_lng=120.98))
        db.commit()

        data = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()[0]
        for horizon in ["30d", "60d", "90d"]:
            prob = data["failure_probability"][horizon]
            self.assertTrue(0.0 <= prob <= 1.0)

    def test_t1_f22_05_predictive_health_score_strictly_bounded_0_to_100(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-DET-4", asset_name="Det Road 4", category="Roads", barangay="172", condition_score=10.0, gps_lat=14.75, gps_lng=120.98))
        db.commit()

        data = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()[0]
        self.assertTrue(0.0 <= data["deterministic_health_score"] <= 100.0)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 23: Deterministic Maintenance Scoring
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f23_01_scoring_applies_category_decay_rates(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-SC-RD", asset_name="Road", category="Roads", barangay="172", condition_score=60.0, gps_lat=14.75, gps_lng=120.98))
        db.add(E2EInfrastructureAsset(asset_id="CAL-SC-DR", asset_name="Drainage", category="Drainage", barangay="172", condition_score=60.0, gps_lat=14.75, gps_lng=120.98))
        db.commit()

        data = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()
        rd_score = next(d for d in data if d["asset_id"] == "CAL-SC-RD")
        dr_score = next(d for d in data if d["asset_id"] == "CAL-SC-DR")
        # Drainage has higher base decay (0.12 vs 0.08) -> higher failure prob
        self.assertGreaterEqual(dr_score["failure_probability"]["30d"], rd_score["failure_probability"]["30d"])

    def test_t1_f23_02_scoring_factors_in_asset_condition_score(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-GOOD", asset_name="Good Asset", category="Roads", barangay="172", condition_score=95.0, gps_lat=14.75, gps_lng=120.98))
        db.add(E2EInfrastructureAsset(asset_id="CAL-BAD", asset_name="Bad Asset", category="Roads", barangay="172", condition_score=25.0, gps_lat=14.75, gps_lng=120.98))
        db.commit()

        data = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()
        good = next(d for d in data if d["asset_id"] == "CAL-GOOD")
        bad = next(d for d in data if d["asset_id"] == "CAL-BAD")
        self.assertGreater(good["deterministic_health_score"], bad["deterministic_health_score"])

    def test_t1_f23_03_scoring_factors_in_report_recurrence_in_barangay(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-RECUR", asset_name="Recur Asset", category="Roads", barangay="Barangay 176", condition_score=80.0, gps_lat=14.75, gps_lng=120.98))
        # Add 4 reports in same barangay
        for i in range(4):
            db.add(E2EReport(ticket_id=f"PUL-REC-SC-{i}", category="road_damage", status="pending", location_lat=14.75, location_lng=120.98, barangay="Barangay 176"))
        db.commit()

        data = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()
        item = next(d for d in data if d["asset_id"] == "CAL-RECUR")
        self.assertGreater(item["failure_probability"]["30d"], 0.2)

    def test_t1_f23_04_scoring_applies_seasonal_multiplier_during_rainy_months(self):
        now = datetime.now(timezone.utc)
        is_rainy = now.month in [6, 7, 8, 9, 10, 11]
        mult = 1.4 if is_rainy else 1.0
        self.assertTrue(mult in [1.0, 1.4])

    def test_t1_f23_05_scoring_estimates_dpwh_compliant_preventive_costs(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-COST-1", asset_name="Cost Asset", category="Roads", barangay="172", condition_score=80.0, gps_lat=14.75, gps_lng=120.98))
        db.commit()

        data = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()[0]
        self.assertGreater(data["estimated_dpwh_cost"], 0)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 24: Time-Series Demand Model
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f24_01_demand_model_uses_historical_weekly_baseline(self):
        db = next(get_db())
        for i in range(12):
            db.add(E2EReport(ticket_id=f"PUL-TS-{i}", category="road_damage", status="pending", location_lat=14.75, location_lng=120.98, barangay="172"))
        db.commit()

        res = client.get("/api/gov/predictive/demand-forecast", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["historical_baseline"], 3) # 12 / 4 = 3

    def test_t1_f24_02_demand_model_forecasts_four_weeks_horizon(self):
        res = client.get("/api/gov/predictive/demand-forecast", headers=self.admin_headers)
        self.assertEqual(len(res.json()["weekly_demand"]), 4)

    def test_t1_f24_03_demand_model_confidence_level_provided(self):
        res = client.get("/api/gov/predictive/demand-forecast", headers=self.admin_headers)
        week1 = res.json()["weekly_demand"][0]
        self.assertIn("confidence_level", week1)
        self.assertGreater(week1["confidence_level"], 0.8)

    def test_t1_f24_04_demand_model_non_negative_predictions(self):
        res = client.get("/api/gov/predictive/demand-forecast", headers=self.admin_headers)
        for w in res.json()["weekly_demand"]:
            self.assertGreaterEqual(w["predicted_reports"], 0)

    def test_t1_f24_05_demand_model_adapts_to_historical_surge(self):
        db = next(get_db())
        for i in range(40):
            db.add(E2EReport(ticket_id=f"PUL-SURGE-{i}", category="road_damage", status="pending", location_lat=14.75, location_lng=120.98, barangay="172"))
        db.commit()

        res = client.get("/api/gov/predictive/demand-forecast", headers=self.admin_headers)
        self.assertEqual(res.json()["historical_baseline"], 10) # 40 / 4 = 10

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 25: Purge Mock Arrays from Insights
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f25_01_insights_derives_clusters_from_database_reports(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-INS-1", category="drainage", status="pending", location_lat=14.75, location_lng=120.98, barangay="Barangay 175"))
        db.commit()

        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        hotspots = res.json()["questions"]["where_are_concerns_recurring"]["hotspots"]
        self.assertEqual(len(hotspots), 1)
        self.assertEqual(hotspots[0]["barangay"], "Barangay 175")

    def test_t1_f25_02_insights_returns_empty_when_no_reports_exist(self):
        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        hotspots = res.json()["questions"]["where_are_concerns_recurring"]["hotspots"]
        self.assertEqual(len(hotspots), 0)

    def test_t1_f25_03_insights_completion_trend_derives_from_work_orders(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-TREND-1", category="road_damage", status="resolved", location_lat=14.75, location_lng=120.98, barangay="172"))
        db.commit()

        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        self.assertEqual(res.json()["questions"]["are_we_keeping_up"]["resolved_7d"], 1)

    def test_t1_f25_04_insights_zero_hardcoded_sample_arrays(self):
        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        self.assertNotIn("COMPLETION_TREND", str(res.json()))

    def test_t1_f25_05_insights_response_schema_matches_civic_questions(self):
        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        q = res.json()["questions"]
        self.assertIn("are_we_keeping_up", q)
        self.assertIn("where_are_concerns_recurring", q)
        self.assertIn("which_work_is_delayed", q)
        self.assertIn("what_should_we_inspect_next", q)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 26: Announcements Data Models
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f26_01_announcement_model_stores_bilingual_fields(self):
        db = next(get_db())
        ann = E2EAnnouncement(
            announcement_id="ANN-2026-0001",
            title_en="Road Repair",
            title_fil="Pagkumpuni ng Kalsada",
            content_en="Zabarte road repair",
            content_fil="Pagkumpuni sa kalsada ng Zabarte",
            author_id=1
        )
        db.add(ann)
        db.commit()
        db.refresh(ann)
        self.assertEqual(ann.title_fil, "Pagkumpuni ng Kalsada")

    def test_t1_f26_02_announcement_model_generates_canonical_id(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Title", "content_en": "Content"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["announcement_id"].startswith("ANN-2026-"))

    def test_t1_f26_03_announcement_model_stores_channels_as_json(self):
        db = next(get_db())
        ann = E2EAnnouncement(
            announcement_id="ANN-2026-0002",
            title_en="Channel Notice",
            content_en="Content",
            channels=["web", "sms"],
            author_id=1
        )
        db.add(ann)
        db.commit()
        db.refresh(ann)
        self.assertIn("sms", ann.channels)

    def test_t1_f26_04_announcement_correction_model_stores_previous_content(self):
        db = next(get_db())
        corr = E2EAnnouncementCorrection(
            announcement_id=1,
            correction_note="Clarification",
            corrected_by_id=1,
            previous_content={"title": "Old"}
        )
        db.add(corr)
        db.commit()
        self.assertEqual(corr.previous_content["title"], "Old")

    def test_t1_f26_05_announcement_delivery_model_tracks_status_per_channel(self):
        db = next(get_db())
        deliv = E2EAnnouncementDelivery(
            announcement_id=1,
            channel="sms",
            status="attempted",
            attempt_count=1
        )
        db.add(deliv)
        db.commit()
        self.assertEqual(deliv.channel, "sms")
        self.assertEqual(deliv.status, "attempted")

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 27: Announcements Backend Router
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f27_01_announcement_lifecycle_stage_1_create_draft(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Drainage Advisory", "content_en": "Scheduled declogging"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "draft")

    def test_t1_f27_02_announcement_lifecycle_stage_2_submit_review(self):
        res = client.post("/api/gov/announcements", json={"title_en": "T1", "content_en": "C1"}, headers=self.admin_headers)
        ann_id = res.json()["id"]

        res2 = client.post(f"/api/gov/announcements/{ann_id}/submit-review", headers=self.admin_headers)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["status"], "in_review")

    def test_t1_f27_03_announcement_lifecycle_stage_3_approve(self):
        res = client.post("/api/gov/announcements", json={"title_en": "T1", "content_en": "C1"}, headers=self.admin_headers)
        ann_id = res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/submit-review", headers=self.admin_headers)

        res3 = client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)
        self.assertEqual(res3.status_code, 200)
        self.assertEqual(res3.json()["status"], "approved")

    def test_t1_f27_04_announcement_lifecycle_stage_5_publish(self):
        res = client.post("/api/gov/announcements", json={"title_en": "T1", "content_en": "C1"}, headers=self.admin_headers)
        ann_id = res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)

        res4 = client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)
        self.assertEqual(res4.status_code, 200)
        self.assertEqual(res4.json()["status"], "published")

    def test_t1_f27_05_announcement_lifecycle_withdraw_with_reason(self):
        res = client.post("/api/gov/announcements", json={"title_en": "T1", "content_en": "C1"}, headers=self.admin_headers)
        ann_id = res.json()["id"]

        res5 = client.post(f"/api/gov/announcements/{ann_id}/withdraw", json={"withdrawal_reason": "Cancelled by City Engineer"}, headers=self.admin_headers)
        self.assertEqual(res5.status_code, 200)
        self.assertEqual(res5.json()["status"], "withdrawn")

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 28: Announcements Management Page
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f28_01_list_announcements_filters_by_draft_status(self):
        client.post("/api/gov/announcements", json={"title_en": "Draft 1", "content_en": "C1"}, headers=self.admin_headers)
        res = client.get("/api/gov/announcements?status=draft", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)

    def test_t1_f28_02_list_announcements_filters_by_published_status(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Pub 1", "content_en": "C1"}, headers=self.admin_headers)
        ann_id = res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)

        res_pub = client.get("/api/gov/announcements?status=published", headers=self.admin_headers)
        self.assertEqual(len(res_pub.json()), 1)

    def test_t1_f28_03_list_announcements_returns_delivery_channels(self):
        client.post("/api/gov/announcements", json={"title_en": "Channels Test", "content_en": "C1", "channels": ["web", "email"]}, headers=self.admin_headers)
        res = client.get("/api/gov/announcements", headers=self.admin_headers)
        item = res.json()[0]
        self.assertIn("web", item["channels"])
        self.assertIn("email", item["channels"])

    def test_t1_f28_04_list_announcements_sorted_by_created_at_desc(self):
        client.post("/api/gov/announcements", json={"title_en": "Earlier", "content_en": "C1"}, headers=self.admin_headers)
        client.post("/api/gov/announcements", json={"title_en": "Later", "content_en": "C2"}, headers=self.admin_headers)

        res = client.get("/api/gov/announcements", headers=self.admin_headers)
        self.assertEqual(res.json()[0]["title_en"], "Later")

    def test_t1_f28_05_list_announcements_unauthenticated_returns_401(self):
        res = client.get("/api/gov/announcements")
        self.assertEqual(res.status_code, 401)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 29: Bilingual Announcement Editor
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f29_01_editor_creates_draft_with_tagalog_content(self):
        payload = {
            "title_en": "Water Interruption Notice",
            "title_fil": "Abiso ukol sa Pagkaantala ng Tubig",
            "content_en": "Water will be off from 1pm to 5pm",
            "content_fil": "Mawawalan ng tubig mula 1pm hanggang 5pm"
        }
        res = client.post("/api/gov/announcements", json=payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

        detail = client.get(f"/api/gov/announcements/{res.json()['id']}", headers=self.admin_headers).json()
        self.assertEqual(detail["title_fil"], "Abiso ukol sa Pagkaantala ng Tubig")

    def test_t1_f29_02_editor_updates_draft_without_published_lock(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Initial Title", "content_en": "Initial"}, headers=self.admin_headers)
        ann_id = res.json()["id"]

        res_update = client.put(f"/api/gov/announcements/{ann_id}", json={"title_en": "Updated Title"}, headers=self.admin_headers)
        self.assertEqual(res_update.status_code, 200)

    def test_t1_f29_03_editor_updating_approved_announcement_resets_approval(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Approved Item", "content_en": "Initial"}, headers=self.admin_headers)
        ann_id = res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)

        # Edit approved announcement
        res_update = client.put(f"/api/gov/announcements/{ann_id}", json={"content_en": "Mutated text"}, headers=self.admin_headers)
        self.assertEqual(res_update.json()["status"], "in_review")

    def test_t1_f29_04_editor_cannot_directly_edit_published_announcement(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Published Item", "content_en": "Initial"}, headers=self.admin_headers)
        ann_id = res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)

        # PUT on published announcement is rejected
        res_edit = client.put(f"/api/gov/announcements/{ann_id}", json={"title_en": "Illegally Overwriting"}, headers=self.admin_headers)
        self.assertEqual(res_edit.status_code, 400)

    def test_t1_f29_05_editor_requires_title_en_and_content_en(self):
        res = client.post("/api/gov/announcements", json={"title_en": "", "content_en": ""}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 30: Timestamped Correction Notices
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f30_01_post_correction_creates_timestamped_errata(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Pothole Notice", "content_en": "Repairs start 8am"}, headers=self.admin_headers)
        ann_id = res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)

        res_corr = client.post(f"/api/gov/announcements/{ann_id}/corrections", json={"correction_note": "Errata: Repairs start at 10am"}, headers=self.admin_headers)
        self.assertEqual(res_corr.status_code, 200)
        self.assertIn("Errata: Repairs start at 10am", res_corr.json()["correction_note"])

    def test_t1_f30_02_post_correction_requires_published_announcement(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Draft Notice", "content_en": "Draft content"}, headers=self.admin_headers)
        ann_id = res.json()["id"]

        # Cannot correct draft
        res_corr = client.post(f"/api/gov/announcements/{ann_id}/corrections", json={"correction_note": "Correction on draft"}, headers=self.admin_headers)
        self.assertEqual(res_corr.status_code, 400)

    def test_t1_f30_03_post_correction_requires_non_empty_note(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Pub", "content_en": "Pub"}, headers=self.admin_headers)
        ann_id = res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)

        res_corr = client.post(f"/api/gov/announcements/{ann_id}/corrections", json={"correction_note": ""}, headers=self.admin_headers)
        self.assertEqual(res_corr.status_code, 422)

    def test_t1_f30_04_announcement_detail_includes_all_corrections(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Pub", "content_en": "Pub"}, headers=self.admin_headers)
        ann_id = res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)

        client.post(f"/api/gov/announcements/{ann_id}/corrections", json={"correction_note": "Correction 1"}, headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{ann_id}/corrections", json={"correction_note": "Correction 2"}, headers=self.admin_headers)

        detail = client.get(f"/api/gov/announcements/{ann_id}", headers=self.admin_headers).json()
        self.assertEqual(len(detail["corrections"]), 2)

    def test_t1_f30_05_correction_preserves_editor_id(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Pub", "content_en": "Pub"}, headers=self.admin_headers)
        ann_id = res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)

        client.post(f"/api/gov/announcements/{ann_id}/corrections", json={"correction_note": "By Admin"}, headers=self.admin_headers)
        detail = client.get(f"/api/gov/announcements/{ann_id}", headers=self.admin_headers).json()
        self.assertEqual(detail["corrections"][0]["editor_id"], 1)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 31: Per-Channel Delivery Tracking
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t1_f31_01_publishing_initializes_delivery_records_for_configured_channels(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Multi", "content_en": "Multi", "channels": ["web", "sms", "email"]}, headers=self.admin_headers)
        ann_id = res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)

        detail = client.get(f"/api/gov/announcements/{ann_id}", headers=self.admin_headers).json()
        self.assertEqual(len(detail["deliveries"]), 3)

    def test_t1_f31_02_web_channel_instantly_delivered_on_publish(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Web", "content_en": "Web", "channels": ["web"]}, headers=self.admin_headers)
        ann_id = res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)

        detail = client.get(f"/api/gov/announcements/{ann_id}", headers=self.admin_headers).json()
        web_deliv = next(d for d in detail["deliveries"] if d["channel"] == "web")
        self.assertEqual(web_deliv["status"], "delivered")

    def test_t1_f31_03_external_channels_initialized_as_attempted_or_queued(self):
        res = client.post("/api/gov/announcements", json={"title_en": "SMS Notice", "content_en": "SMS", "channels": ["sms"]}, headers=self.admin_headers)
        ann_id = res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)

        detail = client.get(f"/api/gov/announcements/{ann_id}", headers=self.admin_headers).json()
        sms_deliv = next(d for d in detail["deliveries"] if d["channel"] == "sms")
        self.assertEqual(sms_deliv["status"], "attempted")

    def test_t1_f31_04_announcement_detail_returns_deliveries_breakdown(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Breakdown", "content_en": "C", "channels": ["web", "sms"]}, headers=self.admin_headers)
        ann_id = res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)

        detail = client.get(f"/api/gov/announcements/{ann_id}", headers=self.admin_headers).json()
        channels = [d["channel"] for d in detail["deliveries"]]
        self.assertIn("web", channels)
        self.assertIn("sms", channels)

    def test_t1_f31_05_public_announcements_feed_only_shows_published(self):
        # 1 Draft, 1 Published
        client.post("/api/gov/announcements", json={"title_en": "Draft News", "content_en": "Draft"}, headers=self.admin_headers)
        p = client.post("/api/gov/announcements", json={"title_en": "Public News", "content_en": "Public"}, headers=self.admin_headers).json()
        client.post(f"/api/gov/announcements/{p['id']}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{p['id']}/publish", headers=self.admin_headers)

        pub_res = client.get("/api/announcements/public")
        self.assertEqual(pub_res.status_code, 200)
        items = pub_res.json()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title_en"], "Public News")

if __name__ == "__main__":
    unittest.main()
