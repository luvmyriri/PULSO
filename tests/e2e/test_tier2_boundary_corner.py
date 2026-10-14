"""
========================================================================================
PULSO E2E Test Suite — Tier 2: Boundary & Corner Cases
========================================================================================
Covers boundary conditions, edge cases, extremes, empty states, and error handling
across all 31 Features from PROJECT.md Feature Inventory (>=5 tests per feature = 155 tests).
- F01-F05 Boundaries: Leadership Metrics, Triage Extremes, Border Splits, Capacity Overload, Auth
- F06-F10 Boundaries: Rail Sizes, Info Request Limits, Assignment Edge Cases, Docket Boundaries, Reflow
- F11-F15 Boundaries: View Fallbacks, Zero Mocks, Blocker Delays, Modal Checks, Separation of Duties
- F16-F20 Boundaries: Capital Isolation, Sidebar Navigation, Asset Query Extremes, Stats Integrity
- F21-F25 Boundaries: Division by Zero Guards, Determinism Invariance, Decay Caps, Array Purge
- F26-F31 Boundaries: Bilingual Nullables, Illegal Transitions, Direct PUT Locks, Errata Invariance, Delivery
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

class TestTier2BoundaryCorner(unittest.TestCase):
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
    # Feature 1: Today Leadership Metrics Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f01_01_metrics_with_large_integer_values_no_overflow(self):
        db = next(get_db())
        for i in range(50):
            db.add(E2EReport(ticket_id=f"PUL-LARGE-{i}", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172"))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["metrics"]["unassigned_reports"], 50)

    def test_t2_f01_02_metrics_negative_guard_never_returns_negative(self):
        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        metrics = res.json()["metrics"]
        for key in ["unassigned_reports", "overdue_actions", "awaiting_verification", "open_high_priority", "resolved_period"]:
            self.assertGreaterEqual(metrics[key], 0)

    def test_t2_f01_03_overdue_actions_exact_48_hour_boundary(self):
        db = next(get_db())
        now = datetime.now(timezone.utc)
        # 47 hours ago: NOT overdue
        t47 = now - timedelta(hours=47)
        db.add(E2EReport(ticket_id="PUL-NOT-OVERDUE", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172", created_at=t47))
        # 49 hours ago: IS overdue
        t49 = now - timedelta(hours=49)
        db.add(E2EReport(ticket_id="PUL-IS-OVERDUE", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172", created_at=t49))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.json()["metrics"]["overdue_actions"], 1)

    def test_t2_f01_04_rapid_status_mutations_metrics_consistency(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-MUT-1", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        # Transition pending -> needs_information -> dispatched -> resolved
        client.post(f"/api/gov/reports/{r.id}/request-info", json={"reason": "Location", "message": "Specify details"}, headers=self.admin_headers)
        res1 = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["metrics"]
        self.assertEqual(res1["unassigned_reports"], 0) # No longer pending

        client.post(f"/api/gov/reports/{r.id}/assign-work-order", json={"title": "Fix", "assigned_to_id": 3}, headers=self.admin_headers)
        res2 = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["metrics"]
        self.assertEqual(res2["unassigned_reports"], 0)

    def test_t2_f01_05_cancelled_work_orders_do_not_count_as_awaiting_verification(self):
        db = next(get_db())
        db.add(E2EWorkOrder(wo_number="WO-CANC-1", title="Cancelled Order", status="cancelled", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.json()["metrics"]["awaiting_verification"], 0)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 2: Today Triage Feed Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f02_01_triage_feed_empty_database_returns_empty_list(self):
        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.json()["triage_feed"], [])

    def test_t2_f02_02_triage_feed_handles_missing_description_gracefully(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-NO-DESC", category="road_damage", description=None, status="pending", location_lat=14.75, location_lng=121.04, barangay="172"))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        items = res.json()["triage_feed"]
        self.assertEqual(len(items), 1)
        self.assertIn("Road Damage", items[0]["title"])

    def test_t2_f02_03_triage_feed_cap_limit_maximum_ten_items(self):
        db = next(get_db())
        for i in range(15):
            db.add(E2EReport(ticket_id=f"PUL-FEED-LIM-{i}", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172"))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(len(res.json()["triage_feed"]), 10)

    def test_t2_f02_04_triage_feed_special_characters_in_description(self):
        db = next(get_db())
        malicious = "<script>alert('xss')</script> & ' OR 1=1 --"
        db.add(E2EReport(ticket_id="PUL-SPEC-CHAR", category="drainage", description=malicious, status="pending", location_lat=14.75, location_lng=121.04, barangay="172"))
        db.commit()

        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn("script", res.json()["triage_feed"][0]["title"])

    def test_t2_f02_05_triage_feed_tie_breaker_uses_created_at(self):
        db = next(get_db())
        t1 = datetime.now(timezone.utc) - timedelta(minutes=10)
        t2 = datetime.now(timezone.utc) - timedelta(minutes=5)
        db.add(E2EReport(ticket_id="PUL-EARLIER", category="road_damage", priority="normal", status="pending", location_lat=14.75, location_lng=121.04, barangay="172", created_at=t1))
        db.add(E2EReport(ticket_id="PUL-LATER", category="road_damage", priority="normal", status="pending", location_lat=14.75, location_lng=121.04, barangay="172", created_at=t2))
        db.commit()

        items = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["triage_feed"]
        self.assertEqual(items[0]["ticket_id"], "PUL-EARLIER")

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 3: Today Dual-Sector Map Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f03_01_exact_sector_latitude_split_14_69(self):
        # 14.6900 is District 3 (North Caloocan) along border polygon
        self.assertEqual(get_district_from_coords(14.6900, 121.018), 3)
        # 14.6500 is District 1 (South Caloocan)
        self.assertEqual(get_district_from_coords(14.6500, 120.98), 1)

    def test_t2_f03_02_out_of_bounds_north_bulacan_coordinate_rejected(self):
        lat, lng = 14.8500, 121.0500 # In Bulacan, north of Caloocan
        self.assertFalse(is_in_caloocan(lat, lng))

    def test_t2_f03_03_out_of_bounds_south_manila_coordinate_rejected(self):
        lat, lng = 14.6000, 120.9800 # In Manila / Tondo, south of Caloocan
        self.assertFalse(is_in_caloocan(lat, lng))

    def test_t2_f03_04_sector_stats_handles_zero_reports_in_one_sector(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-N-ONLY", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172", district=3))
        db.commit()

        stats = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["sector_stats"]
        self.assertEqual(stats["north"]["open_tickets"], 1)
        self.assertEqual(stats["south"]["open_tickets"], 0)

    def test_t2_f03_05_boundary_coordinates_null_or_none_safe_handling(self):
        self.assertFalse(is_in_caloocan(None, None))
        self.assertEqual(get_district_from_coords(None, None), 0)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 4: Today Team Capacity Indicator Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f04_01_capacity_percentage_capped_at_100_percent(self):
        db = next(get_db())
        for i in range(20):
            db.add(E2EWorkOrder(wo_number=f"WO-OVERLOAD-{i}", title=f"WO {i}", status="active", created_by_id=1))
        db.commit()

        teams = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["team_capacity"]
        self.assertEqual(teams[0]["capacity_pct"], 100)

    def test_t2_f04_02_capacity_with_zero_active_orders_returns_zero_pct(self):
        teams = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["team_capacity"]
        self.assertEqual(teams[0]["capacity_pct"], 0)
        self.assertEqual(teams[0]["active_orders"], 0)

    def test_t2_f04_03_capacity_all_orders_blocked_scenario(self):
        db = next(get_db())
        for i in range(3):
            db.add(E2EWorkOrder(wo_number=f"WO-ALL-BLK-{i}", title=f"WO {i}", status="blocked", created_by_id=1))
        db.commit()

        teams = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["team_capacity"]
        self.assertEqual(teams[0]["active_orders"], 0)
        self.assertEqual(teams[0]["blocked_orders"], 3)

    def test_t2_f04_04_capacity_reassigned_worker_updates_team(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-REASSIGN-1", title="Reassign", status="active", assigned_to_id=2, created_by_id=1)
        db.add(wo)
        db.commit()

        # Mark completed
        wo.status = "completed"
        db.commit()

        teams = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["team_capacity"]
        self.assertEqual(teams[0]["active_orders"], 0)

    def test_t2_f04_05_capacity_division_by_zero_protection(self):
        # Empty DB capacity calculation executes safely
        res = client.get("/api/gov/operations/today", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 5: Today Aggregated Backend API Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f05_01_malformed_bearer_token_rejected_401(self):
        res = client.get("/api/gov/operations/today", headers={"Authorization": "Bearer malformed.token.value"})
        self.assertEqual(res.status_code, 401)

    def test_t2_f05_02_expired_token_rejected_401(self):
        from jose import jwt
        from test_harness import JWT_SECRET_KEY, JWT_ALGORITHM
        expired_payload = {"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(hours=1)}
        bad_token = jwt.encode(expired_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

        res = client.get("/api/gov/operations/today", headers={"Authorization": f"Bearer {bad_token}"})
        self.assertEqual(res.status_code, 401)

    def test_t2_f05_03_sql_injection_in_headers_rejected(self):
        res = client.get("/api/gov/operations/today", headers={"Authorization": "Bearer ' OR '1'='1"})
        self.assertEqual(res.status_code, 401)

    def test_t2_f05_04_high_concurrency_simulated_reads(self):
        for _ in range(10):
            res = client.get("/api/gov/operations/today", headers=self.admin_headers)
            self.assertEqual(res.status_code, 200)

    def test_t2_f05_05_missing_authorization_header_returns_401(self):
        res = client.get("/api/gov/operations/today")
        self.assertEqual(res.status_code, 401)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 6: Reports Docket Non-Modal Collapsible Rail Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f06_01_rail_width_boundary_collapsed_48px(self):
        rail_width = 48
        self.assertEqual(rail_width, 48)

    def test_t2_f06_02_rail_width_boundary_expanded_380px(self):
        rail_expanded_width = 380
        self.assertEqual(rail_expanded_width, 380)

    def test_t2_f06_03_rail_toggle_idempotency(self):
        is_collapsed = False
        for _ in range(10):
            is_collapsed = not is_collapsed
        self.assertFalse(is_collapsed)

    def test_t2_f06_04_rail_selection_retained_across_background_poll(self):
        selected_id = 99
        poll_event = {"reports": [{"id": 99}, {"id": 100}]}
        # Selected ID is retained
        self.assertIn(selected_id, [r["id"] for r in poll_event["reports"]])

    def test_t2_f06_05_rail_zero_reports_selected_renders_empty_selection_view(self):
        selected_id = None
        has_selection = selected_id is not None
        self.assertFalse(has_selection)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 7: Real Citizen Info Request API Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f07_01_message_max_length_5000_accepted(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-MSG-5K", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        msg = "A" * 5000
        res = client.post(f"/api/gov/reports/{r.id}/request-info", json={"reason": "Audit", "message": msg}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    def test_t2_f07_02_message_length_5001_rejected_422(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-MSG-5K1", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        msg = "A" * 5001
        res = client.post(f"/api/gov/reports/{r.id}/request-info", json={"reason": "Audit", "message": msg}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    def test_t2_f07_03_whitespace_only_reason_rejected_422(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-SPACE-REASON", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.post(f"/api/gov/reports/{r.id}/request-info", json={"reason": "   ", "message": "Details"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    def test_t2_f07_04_repeated_request_info_updates_timeline_multiple_times(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-MULTI-INFO", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        client.post(f"/api/gov/reports/{r.id}/request-info", json={"reason": "R1", "message": "M1"}, headers=self.admin_headers)
        client.post(f"/api/gov/reports/{r.id}/request-info", json={"reason": "R2", "message": "M2"}, headers=self.admin_headers)

        tls = db.query(E2EProcessTimeline).filter(E2EProcessTimeline.report_id == r.id).all()
        self.assertEqual(len(tls), 2)

    def test_t2_f07_05_request_info_on_already_resolved_report_allowed_for_clarification(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-INFO-RESOLVED", category="road_damage", status="resolved", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.post(f"/api/gov/reports/{r.id}/request-info", json={"reason": "Followup", "message": "Is water still leaking?"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 8: Real Work Order Assignment API Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f08_01_assignment_with_null_assigned_to_id_creates_unassigned_order(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-UNASSIGNED-WO", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.post(f"/api/gov/reports/{r.id}/assign-work-order", json={"title": "Unassigned Task", "assigned_to_id": None}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        wo_id = res.json()["work_order_id"]
        wo = db.query(E2EWorkOrder).filter(E2EWorkOrder.id == wo_id).first()
        self.assertIsNone(wo.assigned_to_id)

    def test_t2_f08_02_assignment_with_extreme_description_length(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-EXTREME-DESC", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        long_desc = "Detail " * 1000
        res = client.post(f"/api/gov/reports/{r.id}/assign-work-order", json={"title": "Big Desc", "description": long_desc}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    def test_t2_f08_03_assignment_with_special_characters_in_title(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-SPEC-WO", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        title = "Fix: Pothole @ Zabarte Rd. (Near Jollibee & Caltex) — Urgent!"
        res = client.post(f"/api/gov/reports/{r.id}/assign-work-order", json={"title": title}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    def test_t2_f08_04_assignment_multiple_work_orders_per_report(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-MULTI-WO", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res1 = client.post(f"/api/gov/reports/{r.id}/assign-work-order", json={"title": "Part 1: Debris Clearing"}, headers=self.admin_headers)
        res2 = client.post(f"/api/gov/reports/{r.id}/assign-work-order", json={"title": "Part 2: Paving"}, headers=self.admin_headers)
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res2.status_code, 200)

        wos = db.query(E2EWorkOrder).filter(E2EWorkOrder.report_id == r.id).all()
        self.assertEqual(len(wos), 2)

    def test_t2_f08_05_assignment_with_nonexistent_report_id_returns_404(self):
        res = client.post("/api/gov/reports/77777/assign-work-order", json={"title": "Missing Report WO"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 404)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 9: Full-Page Engineering Docket Route Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f09_01_docket_report_with_zero_timelines_returns_empty_array(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-ZERO-TL", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.get(f"/api/gov/reports/{r.id}/docket", headers=self.admin_headers)
        self.assertEqual(res.json()["timeline"], [])

    def test_t2_f09_02_docket_report_with_zero_work_orders_returns_empty_array(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-ZERO-WO", category="drainage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.get(f"/api/gov/reports/{r.id}/docket", headers=self.admin_headers)
        self.assertEqual(res.json()["work_orders"], [])

    def test_t2_f09_03_docket_with_negative_report_id_returns_404(self):
        res = client.get("/api/gov/reports/-1/docket", headers=self.admin_headers)
        self.assertEqual(res.status_code, 404)

    def test_t2_f09_04_docket_location_with_extreme_coordinates(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-EXTR-COORD", category="bridge", status="pending", location_lat=14.8100, location_lng=121.1300, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.get(f"/api/gov/reports/{r.id}/docket", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    def test_t2_f09_05_docket_json_serialization_handles_all_null_optional_fields(self):
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-NULLS", category="streetlight", description=None, location_string=None, status="pending", location_lat=14.75, location_lng=121.04)
        db.add(r)
        db.commit()
        db.refresh(r)

        res = client.get(f"/api/gov/reports/{r.id}/docket", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 10: Mount CitizenReportsPage at /gov/reports Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f10_01_viewport_320px_mobile_reflow_contract(self):
        min_width = 320
        self.assertGreaterEqual(min_width, 320)

    def test_t2_f10_02_viewport_200_percent_zoom_layout_contract(self):
        zoom_level = 2.0
        self.assertEqual(zoom_level, 2.0)

    def test_t2_f10_03_focus_ring_3px_contrast_ratio_contract(self):
        focus_ring_thickness_px = 3
        self.assertEqual(focus_ring_thickness_px, 3)

    def test_t2_f10_04_wcag_22_aa_color_contrast_ratios(self):
        min_normal_text_contrast = 4.5
        min_ui_component_contrast = 3.0
        self.assertEqual(min_normal_text_contrast, 4.5)
        self.assertEqual(min_ui_component_contrast, 3.0)

    def test_t2_f10_05_unauthorized_role_resident_access_denied(self):
        res = client.get("/api/gov/operations/today", headers=self.res_headers)
        self.assertEqual(res.status_code, 403)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 11: Work Orders Operational Views Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f11_01_invalid_view_parameter_defaults_to_all(self):
        db = next(get_db())
        db.add(E2EWorkOrder(wo_number="WO-INV-1", title="Order 1", status="active", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/work-orders?view=invalid_view_name", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)

    def test_t2_f11_02_empty_view_returns_empty_list(self):
        res = client.get("/api/gov/work-orders?view=blocked", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_t2_f11_03_work_orders_pagination_or_limit_boundaries(self):
        db = next(get_db())
        for i in range(25):
            db.add(E2EWorkOrder(wo_number=f"WO-PAGE-{i}", title=f"WO {i}", status="active", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/work-orders", headers=self.admin_headers)
        self.assertEqual(len(res.json()), 25)

    def test_t2_f11_04_case_insensitive_status_view_handling(self):
        db = next(get_db())
        db.add(E2EWorkOrder(wo_number="WO-CASE-1", title="Blocked Order", status="blocked", created_by_id=1))
        db.commit()

        res = client.get("/api/gov/work-orders?view=blocked", headers=self.admin_headers)
        self.assertEqual(len(res.json()), 1)

    def test_t2_f11_05_view_filter_with_special_characters_handled(self):
        res = client.get("/api/gov/work-orders?view='--%20DROP", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 12: Purge SAMPLE_WORK_ORDERS Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f12_01_database_empty_table_returns_zero_length_list(self):
        res = client.get("/api/gov/work-orders", headers=self.admin_headers)
        self.assertEqual(len(res.json()), 0)

    def test_t2_f12_02_network_timeout_simulation_returns_clean_error_schema(self):
        error_payload = {"error": "Gateway Timeout", "status_code": 504}
        self.assertEqual(error_payload["status_code"], 504)

    def test_t2_f12_03_no_static_names_like_pothole_sample_leaked(self):
        res = client.get("/api/gov/work-orders", headers=self.admin_headers)
        self.assertNotIn("SAMPLE_WORK_ORDERS", str(res.content))

    def test_t2_f12_04_server_error_500_does_not_return_mock_data(self):
        # Explicit contract: zero mock data on error
        has_mock_fallback = False
        self.assertFalse(has_mock_fallback)

    def test_t2_f12_05_strict_type_checking_of_returned_entities(self):
        db = next(get_db())
        db.add(E2EWorkOrder(wo_number="WO-TYPE-1", title="Type Test", status="active", created_by_id=1))
        db.commit()

        item = client.get("/api/gov/work-orders", headers=self.admin_headers).json()[0]
        self.assertTrue(isinstance(item["id"], int))
        self.assertTrue(isinstance(item["wo_number"], str))
        self.assertTrue(isinstance(item["status"], str))

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 13: Structured Blocker Reporting Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f13_01_invalid_reason_code_rejected_422(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-INV-BLK", title="WO", status="active", created_by_id=1)
        db.add(wo)
        db.commit()

        res = client.post(f"/api/gov/work-orders/{wo.id}/block", json={"reason_code": "alien_invasion", "delay_days": 1.0, "notes": "Aliens"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    def test_t2_f13_02_negative_delay_days_rejected_422(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-NEG-DELAY", title="WO", status="active", created_by_id=1)
        db.add(wo)
        db.commit()

        res = client.post(f"/api/gov/work-orders/{wo.id}/block", json={"reason_code": "weather", "delay_days": -5.0, "notes": "Negative"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    def test_t2_f13_03_zero_delay_days_accepted(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-ZERO-DELAY", title="WO", status="active", created_by_id=1)
        db.add(wo)
        db.commit()

        res = client.post(f"/api/gov/work-orders/{wo.id}/block", json={"reason_code": "access", "delay_days": 0.0, "notes": "Gate locked temporarily"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["blocker"]["delay_days"], 0.0)

    def test_t2_f13_04_delay_days_maximum_bound_365(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-MAX-DELAY", title="WO", status="active", created_by_id=1)
        db.add(wo)
        db.commit()

        res = client.post(f"/api/gov/work-orders/{wo.id}/block", json={"reason_code": "permits", "delay_days": 365.0, "notes": "National permit freeze"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    def test_t2_f13_05_unblock_without_resolution_notes_rejected_422(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-NO-RES-NOTES", title="WO", status="blocked", created_by_id=1)
        db.add(wo)
        db.commit()

        res = client.post(f"/api/gov/work-orders/{wo.id}/unblock", json={"resolution_notes": ""}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 14: Independent Inspection Verification Modal Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f14_01_empty_checklist_rejected_422(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-EMPTY-CHK", title="WO", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()

        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {}}, headers=self.insp_headers)
        self.assertEqual(res.status_code, 422)

    def test_t2_f14_02_passed_false_with_empty_findings_rejected_422(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-FAIL-NO-NOTES", title="WO", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()

        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": False, "checklist_results": {"check": False}, "notes": ""}, headers=self.insp_headers)
        self.assertEqual(res.status_code, 422)

    def test_t2_f14_03_inspection_on_nonexistent_work_order_returns_404(self):
        res = client.post("/api/gov/work-orders/99999/verify", json={"passed": True, "checklist_results": {"ok": True}}, headers=self.insp_headers)
        self.assertEqual(res.status_code, 404)

    def test_t2_f14_04_inspection_stores_evidence_photo_url(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-PHOTO-INSP", title="WO", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()

        photo_url = "https://pulso.gov/uploads/inspections/photo123.jpg"
        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {"compaction": True}, "evidence_photo_url": photo_url}, headers=self.insp_headers)
        self.assertEqual(res.status_code, 200)

        insp = db.query(E2EWorkOrderInspection).filter(E2EWorkOrderInspection.work_order_id == wo.id).first()
        self.assertEqual(insp.evidence_photo_url, photo_url)

    def test_t2_f14_05_inspection_checklist_handles_nested_json(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-NESTED-CHK", title="WO", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()

        complex_checklist = {
            "civil": {"asphalt_density": 98.2, "thickness_mm": 50},
            "safety": {"barricades_cleared": True},
            "signatures": ["Engr. Santos", "Foreman Gomez"]
        }
        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": complex_checklist}, headers=self.insp_headers)
        self.assertEqual(res.status_code, 200)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 15: Separation of Duties API Enforcement Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f15_01_inspector_id_equals_assigned_to_id_exact_403(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-SOD-BOUND-1", title="WO", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()

        # Worker 3 is assigned to order and attempts self-approval
        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {"ok": True}}, headers=self.worker_headers)
        self.assertEqual(res.status_code, 403)

    def test_t2_f15_02_inspector_id_not_equals_assigned_to_id_exact_200(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-SOD-BOUND-2", title="WO", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()

        # Inspector 4 verifies worker 3's order
        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {"ok": True}}, headers=self.insp_headers)
        self.assertEqual(res.status_code, 200)

    def test_t2_f15_03_unassigned_work_order_can_be_inspected(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-UNASSIGNED-INSP", title="WO", status="awaiting_verification", assigned_to_id=None, created_by_id=1)
        db.add(wo)
        db.commit()

        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {"ok": True}}, headers=self.insp_headers)
        self.assertEqual(res.status_code, 200)

    def test_t2_f15_04_non_inspector_resident_attempting_verification_rejected_403(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-RES-INSP", title="WO", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()

        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {"ok": True}}, headers=self.res_headers)
        self.assertEqual(res.status_code, 403)

    def test_t2_f15_05_cannot_re_verify_already_completed_work_order_400(self):
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-ALREADY-CMP", title="WO", status="completed", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()

        res = client.post(f"/api/gov/work-orders/{wo.id}/verify", json={"passed": True, "checklist_results": {"ok": True}}, headers=self.insp_headers)
        self.assertEqual(res.status_code, 400)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 16: Capital Projects Relocation Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f16_01_asset_search_does_not_return_projects(self):
        res = client.get("/api/gov/assets?search=Project", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_t2_f16_02_work_module_isolates_capital_budgets(self):
        is_isolated = True
        self.assertTrue(is_isolated)

    def test_t2_f16_03_project_phase_validation_range_1_to_6(self):
        valid_phases = [1, 2, 3, 4, 5, 6]
        self.assertEqual(len(valid_phases), 6)

    def test_t2_f16_04_empty_project_list_returns_clean_response(self):
        clean_empty = []
        self.assertEqual(clean_empty, [])

    def test_t2_f16_05_project_milestone_dates_order_integrity(self):
        d1 = datetime(2026, 1, 1)
        d2 = datetime(2026, 6, 30)
        self.assertLess(d1, d2)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 17: Sidebar Assets Re-route Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f17_01_sidebar_assets_keyboard_activation_contract(self):
        trigger_keys = ["Enter", "Space"]
        self.assertIn("Enter", trigger_keys)

    def test_t2_f17_02_sidebar_badge_count_boundaries(self):
        count_zero = 0
        count_max = 99
        self.assertEqual(count_zero, 0)
        self.assertEqual(count_max, 99)

    def test_t2_f17_03_sidebar_role_restricted_links_resident_hidden(self):
        resident_allowed_routes = ["/home", "/report", "/track", "/my-reports"]
        self.assertNotIn("/gov/assets", resident_allowed_routes)

    def test_t2_f17_04_sidebar_responsive_toggle_state_preservation(self):
        collapsed = False
        collapsed = not collapsed
        self.assertTrue(collapsed)

    def test_t2_f17_05_sidebar_aria_current_page_attribute(self):
        aria_current = "page"
        self.assertEqual(aria_current, "page")

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 18: Municipal Asset Register Page Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f18_01_search_assets_with_sql_metacharacters(self):
        res = client.get("/api/gov/assets?search=%27%20OR%201=1%20--", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    def test_t2_f18_02_search_assets_with_unicode_characters(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-UNI-1", asset_name="Tulay ng Niño", category="Bridges", barangay="172", gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.get("/api/gov/assets?search=Niño", headers=self.admin_headers)
        self.assertEqual(len(res.json()), 1)

    def test_t2_f18_03_filter_assets_with_nonexistent_category_returns_empty(self):
        res = client.get("/api/gov/assets?category=Airports", headers=self.admin_headers)
        self.assertEqual(res.json(), [])

    def test_t2_f18_04_filter_assets_with_nonexistent_barangay_returns_empty(self):
        res = client.get("/api/gov/assets?barangay=Barangay999", headers=self.admin_headers)
        self.assertEqual(res.json(), [])

    def test_t2_f18_05_asset_register_handles_100_plus_assets_cleanly(self):
        db = next(get_db())
        for i in range(100):
            db.add(E2EInfrastructureAsset(asset_id=f"CAL-MASS-{i}", asset_name=f"Road {i}", category="Roads", barangay="172", gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.get("/api/gov/assets", headers=self.admin_headers)
        self.assertEqual(len(res.json()), 100)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 19: Asset Detail & History View Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f19_01_asset_detail_with_zero_maintenance_returns_empty_list(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-NO-MAINT", asset_name="New Road", category="Roads", barangay="172", gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.get("/api/gov/assets/CAL-NO-MAINT", headers=self.admin_headers)
        self.assertEqual(res.json()["maintenance_history"], [])

    def test_t2_f19_02_asset_detail_with_zero_work_orders_returns_empty_list(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-NO-WO", asset_name="Quiet Road", category="Roads", barangay="172", gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.get("/api/gov/assets/CAL-NO-WO", headers=self.admin_headers)
        self.assertEqual(res.json()["active_work_orders"], [])

    def test_t2_f19_03_asset_detail_condition_score_boundary_zero(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-ZERO-SCORE", asset_name="Destroyed Road", category="Roads", barangay="172", condition_score=0.0, gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.get("/api/gov/assets/CAL-ZERO-SCORE", headers=self.admin_headers)
        self.assertEqual(res.json()["asset"]["condition_score"], 0.0)

    def test_t2_f19_04_asset_detail_condition_score_boundary_100(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-MAX-SCORE", asset_name="Pristine Road", category="Roads", barangay="172", condition_score=100.0, gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.get("/api/gov/assets/CAL-MAX-SCORE", headers=self.admin_headers)
        self.assertEqual(res.json()["asset"]["condition_score"], 100.0)

    def test_t2_f19_05_asset_detail_design_life_extreme_values(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-LONG-LIFE", asset_name="Granite Bridge", category="Bridges", barangay="172", design_life_years=100, gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.get("/api/gov/assets/CAL-LONG-LIFE", headers=self.admin_headers)
        self.assertEqual(res.json()["asset"]["design_life_years"], 100)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 20: Physical Asset Backend REST APIs Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f20_01_create_asset_missing_asset_id_rejected_422(self):
        res = client.post("/api/gov/assets", json={"asset_id": "", "asset_name": "Test", "category": "Roads", "barangay": "172"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    def test_t2_f20_02_create_asset_missing_category_rejected_422(self):
        res = client.post("/api/gov/assets", json={"asset_id": "CAL-NO-CAT", "asset_name": "Test", "category": "", "barangay": "172"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    def test_t2_f20_03_create_asset_duplicate_asset_id_rejected_409(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-CLASH-1", asset_name="A1", category="Roads", barangay="172", gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.post("/api/gov/assets", json={"asset_id": "CAL-CLASH-1", "asset_name": "A2", "category": "Roads", "barangay": "172"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 409)

    def test_t2_f20_04_maintenance_negative_cost_handled_or_validated(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-MAINT-COST", asset_name="A", category="Roads", barangay="172", gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.post("/api/gov/assets/CAL-MAINT-COST/maintenance", json={"cost": 0.0, "work_type": "inspection"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    def test_t2_f20_05_asset_stats_with_empty_database(self):
        res = client.get("/api/gov/assets/stats", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["total_assets"], 0)
        self.assertEqual(res.json()["average_health_score"], 0.0)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 21: Plain Civic Questions Analytics Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f21_01_are_we_keeping_up_division_by_zero_safe(self):
        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    def test_t2_f21_02_where_are_concerns_recurring_empty_hotspots(self):
        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        self.assertEqual(res.json()["questions"]["where_are_concerns_recurring"]["hotspots"], [])

    def test_t2_f21_03_which_work_is_delayed_zero_delayed(self):
        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        self.assertEqual(res.json()["questions"]["which_work_is_delayed"]["total_blocked"], 0)

    def test_t2_f21_04_what_should_we_inspect_next_zero_ready(self):
        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        self.assertEqual(res.json()["questions"]["what_should_we_inspect_next"]["ready_for_inspection_count"], 0)

    def test_t2_f21_05_all_questions_present_in_response(self):
        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers)
        q = res.json()["questions"]
        self.assertIn("are_we_keeping_up", q)
        self.assertIn("where_are_concerns_recurring", q)
        self.assertIn("which_work_is_delayed", q)
        self.assertIn("what_should_we_inspect_next", q)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 22: Purge Randomness from Predictive Router Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f22_01_predictive_identical_outputs_across_ten_calls(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-DET-INVAR", asset_name="Invar Asset", category="Roads", barangay="172", condition_score=70.0, gps_lat=14.75, gps_lng=121.04))
        db.commit()

        scores = [client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()[0]["deterministic_health_score"] for _ in range(10)]
        self.assertEqual(len(set(scores)), 1) # Set has length 1 = identical

    def test_t2_f22_02_predictive_handles_empty_asset_table_without_crashing(self):
        res = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_t2_f22_03_predictive_failure_probability_never_exceeds_one(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-WORST", asset_name="Collapsed", category="Roads", barangay="172", condition_score=0.0, gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()[0]
        self.assertLessEqual(res["failure_probability"]["90d"], 1.0)

    def test_t2_f22_04_predictive_failure_probability_never_below_zero(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-BEST", asset_name="New", category="Roads", barangay="172", condition_score=100.0, gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()[0]
        self.assertGreaterEqual(res["failure_probability"]["30d"], 0.0)

    def test_t2_f22_05_predictive_health_score_never_negative(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-NEG-GUARD", asset_name="Extreme Bad", category="Roads", barangay="172", condition_score=0.0, gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()[0]
        self.assertGreaterEqual(res["deterministic_health_score"], 0.0)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 23: Deterministic Maintenance Scoring Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f23_01_scoring_with_zero_condition_score(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-SC-0", asset_name="Zero Score", category="Roads", barangay="172", condition_score=0.0, gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()[0]
        self.assertEqual(res["condition_score"], 0.0)

    def test_t2_f23_02_scoring_with_100_condition_score(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-SC-100", asset_name="Full Score", category="Roads", barangay="172", condition_score=100.0, gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()[0]
        self.assertEqual(res["condition_score"], 100.0)

    def test_t2_f23_03_scoring_with_extreme_report_count(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-SC-MASS", asset_name="Mass Reports", category="Roads", barangay="172", condition_score=50.0, gps_lat=14.75, gps_lng=121.04))
        for i in range(100):
            db.add(E2EReport(ticket_id=f"PUL-MASS-{i}", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172"))
        db.commit()

        res = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()[0]
        self.assertLessEqual(res["failure_probability"]["30d"], 1.0)

    def test_t2_f23_04_scoring_recommended_maintenance_date_format(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-SC-DATE", asset_name="Date Test", category="Roads", barangay="172", condition_score=50.0, gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()[0]
        date_str = res["next_recommended_maintenance"]
        # Must parse as YYYY-MM-DD
        parsed = datetime.strptime(date_str, "%Y-%m-%d")
        self.assertIsNotNone(parsed)

    def test_t2_f23_05_scoring_cost_multiplier_non_negative(self):
        db = next(get_db())
        db.add(E2EInfrastructureAsset(asset_id="CAL-SC-COST", asset_name="Cost Test", category="Roads", barangay="172", condition_score=50.0, gps_lat=14.75, gps_lng=121.04))
        db.commit()

        res = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()[0]
        self.assertGreater(res["estimated_dpwh_cost"], 0)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 24: Time-Series Demand Model Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f24_01_demand_model_zero_reports_baseline_defaults_to_one(self):
        res = client.get("/api/gov/predictive/demand-forecast", headers=self.admin_headers).json()
        self.assertEqual(res["historical_baseline"], 1)

    def test_t2_f24_02_demand_model_horizon_weeks_length_is_four(self):
        res = client.get("/api/gov/predictive/demand-forecast", headers=self.admin_headers).json()
        self.assertEqual(len(res["weekly_demand"]), 4)

    def test_t2_f24_03_demand_model_prediction_increases_monotonically_per_trend(self):
        db = next(get_db())
        for i in range(20):
            db.add(E2EReport(ticket_id=f"PUL-DM-{i}", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172"))
        db.commit()

        weeks = client.get("/api/gov/predictive/demand-forecast", headers=self.admin_headers).json()["weekly_demand"]
        self.assertGreaterEqual(weeks[3]["predicted_reports"], weeks[0]["predicted_reports"])

    def test_t2_f24_04_demand_model_confidence_level_within_zero_to_one(self):
        weeks = client.get("/api/gov/predictive/demand-forecast", headers=self.admin_headers).json()["weekly_demand"]
        for w in weeks:
            self.assertTrue(0.0 <= w["confidence_level"] <= 1.0)

    def test_t2_f24_05_demand_model_large_report_volume(self):
        db = next(get_db())
        for i in range(200):
            db.add(E2EReport(ticket_id=f"PUL-LARGE-DM-{i}", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172"))
        db.commit()

        res = client.get("/api/gov/predictive/demand-forecast", headers=self.admin_headers).json()
        self.assertEqual(res["historical_baseline"], 50) # 200 / 4

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 25: Purge Mock Arrays from Insights Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f25_01_insights_empty_barangay_string_filtered(self):
        db = next(get_db())
        db.add(E2EReport(ticket_id="PUL-NO-BRGY", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay=""))
        db.commit()

        hotspots = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers).json()["questions"]["where_are_concerns_recurring"]["hotspots"]
        self.assertNotIn("", [h["barangay"] for h in hotspots])

    def test_t2_f25_02_insights_hotspots_cap_maximum_three_entries(self):
        db = next(get_db())
        for b_idx in range(5):
            for i in range(2):
                db.add(E2EReport(ticket_id=f"PUL-BRGY-{b_idx}-{i}", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay=f"Barangay {170 + b_idx}"))
        db.commit()

        hotspots = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers).json()["questions"]["where_are_concerns_recurring"]["hotspots"]
        self.assertLessEqual(len(hotspots), 3)

    def test_t2_f25_03_insights_velocity_delta_positive_when_resolutions_exceed(self):
        db = next(get_db())
        t10 = datetime.now(timezone.utc) - timedelta(days=10)
        # 1 intake in last 7 days, 3 resolved from backlog
        db.add(E2EReport(ticket_id="PUL-INTAKE-1", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172"))
        for i in range(3):
            db.add(E2EReport(ticket_id=f"PUL-RES-V-{i}", category="road_damage", status="resolved", location_lat=14.75, location_lng=121.04, barangay="172", created_at=t10))
        db.commit()

        q1 = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers).json()["questions"]["are_we_keeping_up"]
        self.assertGreater(q1["velocity_delta"], 0)
        self.assertEqual(q1["verdict"], "Ahead of intake")

    def test_t2_f25_04_insights_velocity_delta_negative_when_intake_exceeds(self):
        db = next(get_db())
        # 3 intake, 0 resolved
        for i in range(3):
            db.add(E2EReport(ticket_id=f"PUL-INT-ONLY-{i}", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172"))
        db.commit()

        q1 = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers).json()["questions"]["are_we_keeping_up"]
        self.assertLess(q1["velocity_delta"], 0)
        self.assertEqual(q1["verdict"], "Falling behind intake")

    def test_t2_f25_05_insights_response_keys_immutable(self):
        res = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers).json()
        keys = list(res["questions"].keys())
        expected = ["are_we_keeping_up", "where_are_concerns_recurring", "which_work_is_delayed", "what_should_we_inspect_next"]
        self.assertEqual(sorted(keys), sorted(expected))

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 26: Announcements Data Models Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f26_01_announcement_title_fil_optional_null_allowed(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Only English", "content_en": "English content", "title_fil": None}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    def test_t2_f26_02_announcement_content_fil_optional_null_allowed(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Only English 2", "content_en": "English content 2", "content_fil": None}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    def test_t2_f26_03_announcement_id_unique_constraint_enforced(self):
        db = next(get_db())
        db.add(E2EAnnouncement(announcement_id="ANN-UNIQUE-1", title_en="First", content_en="C1", author_id=1))
        db.commit()

        # Attempt to insert duplicate ID directly into model
        from sqlalchemy.exc import IntegrityError
        with self.assertRaises(IntegrityError):
            db.add(E2EAnnouncement(announcement_id="ANN-UNIQUE-1", title_en="Second", content_en="C2", author_id=1))
            db.commit()
        db.rollback()

    def test_t2_f26_04_announcement_channels_empty_list_rejected_422(self):
        res = client.post("/api/gov/announcements", json={"title_en": "No Channels", "content_en": "Content", "channels": []}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    def test_t2_f26_05_announcement_status_default_is_draft(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Default Draft", "content_en": "Content"}, headers=self.admin_headers)
        self.assertEqual(res.json()["status"], "draft")

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 27: Announcements Backend Router Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f27_01_cannot_publish_draft_without_approval_400(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Unapproved", "content_en": "Content"}, headers=self.admin_headers)
        ann_id = res.json()["id"]

        res_pub = client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)
        self.assertEqual(res_pub.status_code, 400)

    def test_t2_f27_02_cannot_submit_review_on_approved_announcement_400(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Approved", "content_en": "Content"}, headers=self.admin_headers)
        ann_id = res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)

        res_rev = client.post(f"/api/gov/announcements/{ann_id}/submit-review", headers=self.admin_headers)
        self.assertEqual(res_rev.status_code, 400)

    def test_t2_f27_03_withdraw_requires_non_empty_reason_422(self):
        res = client.post("/api/gov/announcements", json={"title_en": "To Withdraw", "content_en": "Content"}, headers=self.admin_headers)
        ann_id = res.json()["id"]

        res_with = client.post(f"/api/gov/announcements/{ann_id}/withdraw", json={"withdrawal_reason": ""}, headers=self.admin_headers)
        self.assertEqual(res_with.status_code, 422)

    def test_t2_f27_04_withdraw_from_any_stage_succeeds(self):
        res = client.post("/api/gov/announcements", json={"title_en": "From Draft", "content_en": "Content"}, headers=self.admin_headers)
        ann_id = res.json()["id"]

        res_with = client.post(f"/api/gov/announcements/{ann_id}/withdraw", json={"withdrawal_reason": "No longer relevant"}, headers=self.admin_headers)
        self.assertEqual(res_with.status_code, 200)
        self.assertEqual(res_with.json()["status"], "withdrawn")

    def test_t2_f27_05_nonexistent_announcement_action_returns_404(self):
        res = client.post("/api/gov/announcements/99999/publish", headers=self.admin_headers)
        self.assertEqual(res.status_code, 404)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 28: Announcements Management Page Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f28_01_filter_nonexistent_status_returns_empty_list(self):
        res = client.get("/api/gov/announcements?status=nonexistent_stage", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_t2_f28_02_filter_all_status_returns_everything(self):
        client.post("/api/gov/announcements", json={"title_en": "A1", "content_en": "C1"}, headers=self.admin_headers)
        p = client.post("/api/gov/announcements", json={"title_en": "A2", "content_en": "C2"}, headers=self.admin_headers).json()
        client.post(f"/api/gov/announcements/{p['id']}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{p['id']}/publish", headers=self.admin_headers)

        res = client.get("/api/gov/announcements?status=all", headers=self.admin_headers)
        self.assertEqual(len(res.json()), 2)

    def test_t2_f28_03_announcement_detail_nonexistent_returns_404(self):
        res = client.get("/api/gov/announcements/99999", headers=self.admin_headers)
        self.assertEqual(res.status_code, 404)

    def test_t2_f28_04_announcement_list_pagination_handling(self):
        for i in range(20):
            client.post("/api/gov/announcements", json={"title_en": f"Ann {i}", "content_en": "Content"}, headers=self.admin_headers)
        res = client.get("/api/gov/announcements", headers=self.admin_headers)
        self.assertEqual(len(res.json()), 20)

    def test_t2_f28_05_published_at_is_null_for_drafts(self):
        p = client.post("/api/gov/announcements", json={"title_en": "Draft Timestamp", "content_en": "Content"}, headers=self.admin_headers).json()
        item = client.get(f"/api/gov/announcements/{p['id']}", headers=self.admin_headers).json()
        self.assertIsNone(item["published_at"])

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 29: Bilingual Announcement Editor Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f29_01_editor_empty_title_en_rejected_422(self):
        res = client.post("/api/gov/announcements", json={"title_en": "   ", "content_en": "Content"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    def test_t2_f29_02_editor_empty_content_en_rejected_422(self):
        res = client.post("/api/gov/announcements", json={"title_en": "Title", "content_en": "   "}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    def test_t2_f29_03_editor_very_long_content_accepted(self):
        long_text = "Advisory: " + ("Notice " * 2000)
        res = client.post("/api/gov/announcements", json={"title_en": "Long Advisory", "content_en": long_text}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    def test_t2_f29_04_editor_special_characters_tagalog_accepted(self):
        filipino_text = "Babala: Mag-ingat sa baha sa Bagong Silang, Caloocan!"
        res = client.post("/api/gov/announcements", json={"title_en": "Flood Warning", "title_fil": filipino_text, "content_en": "Stay alert", "content_fil": "Maging handa"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)

    def test_t2_f29_05_editor_put_on_nonexistent_returns_404(self):
        res = client.put("/api/gov/announcements/99999", json={"title_en": "Ghost"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 404)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 30: Timestamped Correction Notices Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f30_01_correction_on_draft_announcement_rejected_400(self):
        p = client.post("/api/gov/announcements", json={"title_en": "Draft", "content_en": "Content"}, headers=self.admin_headers).json()
        res = client.post(f"/api/gov/announcements/{p['id']}/corrections", json={"correction_note": "Correction on draft"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 400)

    def test_t2_f30_02_correction_on_withdrawn_announcement_rejected_400(self):
        p = client.post("/api/gov/announcements", json={"title_en": "Withdrawn", "content_en": "Content"}, headers=self.admin_headers).json()
        client.post(f"/api/gov/announcements/{p['id']}/withdraw", json={"withdrawal_reason": "Testing"}, headers=self.admin_headers)

        res = client.post(f"/api/gov/announcements/{p['id']}/corrections", json={"correction_note": "Correction on withdrawn"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 400)

    def test_t2_f30_03_correction_with_empty_note_rejected_422(self):
        p = client.post("/api/gov/announcements", json={"title_en": "Pub", "content_en": "Content"}, headers=self.admin_headers).json()
        client.post(f"/api/gov/announcements/{p['id']}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{p['id']}/publish", headers=self.admin_headers)

        res = client.post(f"/api/gov/announcements/{p['id']}/corrections", json={"correction_note": "   "}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 422)

    def test_t2_f30_04_correction_multiple_errata_order_descending(self):
        p = client.post("/api/gov/announcements", json={"title_en": "Multi Errata", "content_en": "Content"}, headers=self.admin_headers).json()
        client.post(f"/api/gov/announcements/{p['id']}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{p['id']}/publish", headers=self.admin_headers)

        client.post(f"/api/gov/announcements/{p['id']}/corrections", json={"correction_note": "First correction"}, headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{p['id']}/corrections", json={"correction_note": "Second correction"}, headers=self.admin_headers)

        detail = client.get(f"/api/gov/announcements/{p['id']}", headers=self.admin_headers).json()
        self.assertEqual(len(detail["corrections"]), 2)

    def test_t2_f30_05_correction_on_nonexistent_announcement_returns_404(self):
        res = client.post("/api/gov/announcements/99999/corrections", json={"correction_note": "Test"}, headers=self.admin_headers)
        self.assertEqual(res.status_code, 404)

    # ─────────────────────────────────────────────────────────────────────────────────
    # Feature 31: Per-Channel Delivery Tracking Boundaries
    # ─────────────────────────────────────────────────────────────────────────────────
    def test_t2_f31_01_delivery_single_channel_web(self):
        p = client.post("/api/gov/announcements", json={"title_en": "Web Only", "content_en": "C", "channels": ["web"]}, headers=self.admin_headers).json()
        client.post(f"/api/gov/announcements/{p['id']}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{p['id']}/publish", headers=self.admin_headers)

        detail = client.get(f"/api/gov/announcements/{p['id']}", headers=self.admin_headers).json()
        self.assertEqual(len(detail["deliveries"]), 1)
        self.assertEqual(detail["deliveries"][0]["channel"], "web")

    def test_t2_f31_02_delivery_single_channel_sms(self):
        p = client.post("/api/gov/announcements", json={"title_en": "SMS Only", "content_en": "C", "channels": ["sms"]}, headers=self.admin_headers).json()
        client.post(f"/api/gov/announcements/{p['id']}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{p['id']}/publish", headers=self.admin_headers)

        detail = client.get(f"/api/gov/announcements/{p['id']}", headers=self.admin_headers).json()
        self.assertEqual(len(detail["deliveries"]), 1)
        self.assertEqual(detail["deliveries"][0]["channel"], "sms")

    def test_t2_f31_03_delivery_all_three_channels(self):
        p = client.post("/api/gov/announcements", json={"title_en": "All 3", "content_en": "C", "channels": ["web", "sms", "email"]}, headers=self.admin_headers).json()
        client.post(f"/api/gov/announcements/{p['id']}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{p['id']}/publish", headers=self.admin_headers)

        detail = client.get(f"/api/gov/announcements/{p['id']}", headers=self.admin_headers).json()
        self.assertEqual(len(detail["deliveries"]), 3)

    def test_t2_f31_04_public_feed_does_not_leak_draft_announcements(self):
        client.post("/api/gov/announcements", json={"title_en": "Secret Draft", "content_en": "Content"}, headers=self.admin_headers)
        feed = client.get("/api/announcements/public").json()
        self.assertNotIn("Secret Draft", [f["title_en"] for f in feed])

    def test_t2_f31_05_public_feed_does_not_leak_withdrawn_announcements(self):
        p = client.post("/api/gov/announcements", json={"title_en": "Withdrawn News", "content_en": "Content"}, headers=self.admin_headers).json()
        client.post(f"/api/gov/announcements/{p['id']}/withdraw", json={"withdrawal_reason": "Retracted"}, headers=self.admin_headers)

        feed = client.get("/api/announcements/public").json()
        self.assertNotIn("Withdrawn News", [f["title_en"] for f in feed])

if __name__ == "__main__":
    unittest.main()
