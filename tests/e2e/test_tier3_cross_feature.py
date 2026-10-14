"""
========================================================================================
PULSO E2E Test Suite — Tier 3: Cross-Feature Combinations & State Transitions
========================================================================================
Covers complex pairwise and multi-feature interaction workflows across the government system:
- Workflow 01: Citizen Report -> Triage -> Work Order -> Blocker -> Resolution -> Inspection -> Closure
- Workflow 02: Report Cluster -> Recurrence Hotspot -> Predictive Decay -> Preventive Maintenance Dispatch
- Workflow 03: Major Incident -> Bilingual Notice -> Review/Approve -> Multi-Channel Dispatch -> Public Errata
- Workflow 04: Real-Time Leadership Metrics Synchronization across Full Lifecycle Transitions
- Workflow 05: Citizen Information Request Loop -> Clarification -> Re-triage -> Assignment
- Workflow 06: Separation of Duties Self-Approval Rejection -> Rework Loop -> Independent Audit Pass
- Workflow 07: Complete 6-Stage Governed Announcements Publishing Lifecycle State Machine
- Workflow 08: Plain Civic Performance Analytics Response to Municipal Surge and Clearance
- Workflow 09: Dual-Sector Geographic Spatial Routing & Isolation (North D3 vs South D1)
- Workflow 10: Capital Projects Unbundling & Architectural Decoupling from Asset Register
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

class TestTier3CrossFeature(unittest.TestCase):
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

    def test_t3_wf01_citizen_report_to_triage_to_work_order_to_blocker_to_resolution(self):
        """Full end-to-end civic lifecycle from citizen intake to verified field closure."""
        db = next(get_db())
        # 1. Citizen report intake
        report = E2EReport(
            ticket_id="PUL-WF1-01",
            category="road_damage",
            description="Deep crater on Zabarte Road causing traffic",
            status="pending",
            priority="critical",
            location_lat=14.7500,
            location_lng=121.0400,
            barangay="Barangay 172",
            district=3
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        # 2. Check Operations Today Hub shows pending critical item in triage feed
        today_res = client.get("/api/gov/operations/today", headers=self.admin_headers).json()
        self.assertEqual(today_res["metrics"]["unassigned_reports"], 1)
        self.assertEqual(today_res["metrics"]["open_high_priority"], 1)
        self.assertEqual(today_res["triage_feed"][0]["ticket_id"], "PUL-WF1-01")

        # 3. Dispatcher creates work order assigned to Field Worker #3
        assign_res = client.post(
            f"/api/gov/reports/{report.id}/assign-work-order",
            json={"title": "Emergency Crater Repair", "assigned_to_id": 3},
            headers=self.disp_headers
        )
        self.assertEqual(assign_res.status_code, 200)
        wo_id = assign_res.json()["work_order_id"]

        # Report is now dispatched
        db.refresh(report)
        self.assertEqual(report.status, "dispatched")

        # 4. Field worker encounters heavy monsoon flooding -> reports blocker
        block_res = client.post(
            f"/api/gov/work-orders/{wo_id}/block",
            json={"reason_code": "weather", "delay_days": 2.0, "notes": "Torrential rain flooded trench"},
            headers=self.worker_headers
        )
        self.assertEqual(block_res.status_code, 200)
        self.assertEqual(block_res.json()["status"], "blocked")

        # Check Operations Today Hub reflects active blocker
        today_res2 = client.get("/api/gov/operations/today", headers=self.admin_headers).json()
        self.assertEqual(today_res2["team_capacity"][0]["blocked_orders"], 1)

        # 5. Weather clears -> unblock work order
        unblock_res = client.post(
            f"/api/gov/work-orders/{wo_id}/unblock",
            json={"resolution_notes": "Water pumped out, trench dry"},
            headers=self.worker_headers
        )
        self.assertEqual(unblock_res.status_code, 200)
        self.assertEqual(unblock_res.json()["status"], "active")

        # 6. Worker finishes paving and submits for verification
        client.post(f"/api/gov/work-orders/{wo_id}/submit-verification", headers=self.worker_headers)

        # Check Operations Today Hub shows awaiting verification
        today_res3 = client.get("/api/gov/operations/today", headers=self.admin_headers).json()
        self.assertEqual(today_res3["metrics"]["awaiting_verification"], 1)

        # 7. Independent Inspector #4 verifies site
        verify_res = client.post(
            f"/api/gov/work-orders/{wo_id}/verify",
            json={"passed": True, "checklist_results": {"depth_checked": True, "compaction_tested": True}},
            headers=self.insp_headers
        )
        self.assertEqual(verify_res.status_code, 200)
        self.assertEqual(verify_res.json()["status"], "completed")

        # 8. Report automatically resolved
        db.refresh(report)
        self.assertEqual(report.status, "resolved")

        # Docket contains full chronological audit trail
        docket = client.get(f"/api/gov/reports/{report.id}/docket", headers=self.admin_headers).json()
        self.assertEqual(docket["status"], "resolved")
        self.assertGreaterEqual(len(docket["timeline"]), 2)

    def test_t3_wf02_report_cluster_to_predictive_score_degradation_to_preventive_dispatch(self):
        """Citizen report cluster triggers chronic hotspot, degrading predictive score and scheduling preventive maintenance."""
        db = next(get_db())
        # 1. Register road asset
        asset = E2EInfrastructureAsset(
            asset_id="CAL-RD-BAGONG-SILANG",
            asset_name="Bagong Silang Main Arterial",
            category="Roads",
            barangay="Barangay 176",
            condition_score=85.0,
            gps_lat=14.7500,
            gps_lng=121.0400
        )
        db.add(asset)
        db.commit()

        # 2. Add 6 reports in Barangay 176
        for i in range(6):
            db.add(E2EReport(
                ticket_id=f"PUL-BS-{i}",
                category="road_damage",
                status="pending",
                location_lat=14.7500,
                location_lng=121.0400,
                barangay="Barangay 176"
            ))
        db.commit()

        # 3. Check plain civic performance analytics detects chronic recurrence
        analytics = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers).json()
        hotspots = analytics["questions"]["where_are_concerns_recurring"]["hotspots"]
        bs_hotspot = next(h for h in hotspots if h["barangay"] == "Barangay 176")
        self.assertTrue(bs_hotspot["is_chronic"])
        self.assertEqual(bs_hotspot["report_count"], 6)

        # 4. Check predictive maintenance engine degrades health score
        scores = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()
        asset_score = next(s for s in scores if s["asset_id"] == "CAL-RD-BAGONG-SILANG")
        self.assertLess(asset_score["deterministic_health_score"], 70.0)
        self.assertGreater(asset_score["failure_probability"]["30d"], 0.25)

        # 5. Dispatch preventive work order linked to asset
        wo_res = client.post(
            "/api/gov/work-orders",
            json={"title": "Preventive Resurfacing", "asset_id": "CAL-RD-BAGONG-SILANG", "priority": "high", "assigned_to_id": 2},
            headers=self.admin_headers
        )
        self.assertEqual(wo_res.status_code, 200)

        # 6. Verify asset detail shows linked active work order
        asset_detail = client.get("/api/gov/assets/CAL-RD-BAGONG-SILANG", headers=self.admin_headers).json()
        self.assertEqual(len(asset_detail["active_work_orders"]), 1)

    def test_t3_wf03_major_incident_announcement_with_errata_and_delivery_telemetry(self):
        """Major municipal incident notice published across channels and updated with official errata."""
        # 1. Author drafts bilingual notice
        create_res = client.post(
            "/api/gov/announcements",
            json={
                "title_en": "Emergency Road Closure: Camarin Road",
                "title_fil": "Pansamantalang Pagsasara ng Kalsada sa Camarin",
                "content_en": "Closed from 9pm to 5am due to water main replacement.",
                "content_fil": "Sarado mula 9pm hanggang 5am dahil sa pagkukumpuni ng tubo ng tubig.",
                "category": "service_interruption",
                "priority": "urgent",
                "channels": ["web", "sms"]
            },
            headers=self.eng_headers
        )
        self.assertEqual(create_res.status_code, 200)
        ann_id = create_res.json()["id"]

        # 2. Submit for review
        client.post(f"/api/gov/announcements/{ann_id}/submit-review", headers=self.eng_headers)

        # 3. City Engineer approves
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)

        # 4. Immediate publication
        pub_res = client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)
        self.assertEqual(pub_res.status_code, 200)

        # 5. Delivery accounting initialized
        detail = client.get(f"/api/gov/announcements/{ann_id}", headers=self.admin_headers).json()
        self.assertEqual(len(detail["deliveries"]), 2)
        web_d = next(d for d in detail["deliveries"] if d["channel"] == "web")
        self.assertEqual(web_d["status"], "delivered")

        # 6. Incident timeline extends by 2 hours -> post official correction errata
        corr_res = client.post(
            f"/api/gov/announcements/{ann_id}/corrections",
            json={"correction_note": "ADVISORY UPDATE: Work extended until 7:00 AM due to rock excavation."},
            headers=self.admin_headers
        )
        self.assertEqual(corr_res.status_code, 200)

        # 7. Verify correction is visible in announcement docket
        detail_after = client.get(f"/api/gov/announcements/{ann_id}", headers=self.admin_headers).json()
        self.assertEqual(len(detail_after["corrections"]), 1)
        self.assertIn("7:00 AM", detail_after["corrections"][0]["note"])

        # 8. Verify public resident feed serves announcement
        public_feed = client.get("/api/announcements/public").json()
        self.assertTrue(any(a["id"] == ann_id for a in public_feed))

    def test_t3_wf04_today_hub_metrics_synchronization_across_full_lifecycle(self):
        """Operations Today metrics precisely reflect status transitions in real time."""
        db = next(get_db())
        # T0: Initial empty state
        m0 = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["metrics"]
        self.assertEqual(m0["unassigned_reports"], 0)
        self.assertEqual(m0["awaiting_verification"], 0)
        self.assertEqual(m0["resolved_period"], 0)

        # T1: Report intake
        r = E2EReport(ticket_id="PUL-METRIC-SYNC", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        m1 = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["metrics"]
        self.assertEqual(m1["unassigned_reports"], 1)

        # T2: Work order assigned
        assign_res = client.post(f"/api/gov/reports/{r.id}/assign-work-order", json={"title": "Fix Road", "assigned_to_id": 3}, headers=self.admin_headers)
        wo_id = assign_res.json()["work_order_id"]

        m2 = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["metrics"]
        self.assertEqual(m2["unassigned_reports"], 0)

        # T3: Work order submitted for verification
        client.post(f"/api/gov/work-orders/{wo_id}/submit-verification", headers=self.worker_headers)
        m3 = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["metrics"]
        self.assertEqual(m3["awaiting_verification"], 1)

        # T4: Verified passed by Inspector #4
        client.post(f"/api/gov/work-orders/{wo_id}/verify", json={"passed": True, "checklist_results": {"done": True}}, headers=self.insp_headers)
        m4 = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["metrics"]
        self.assertEqual(m4["awaiting_verification"], 0)
        self.assertEqual(m4["resolved_period"], 1)

    def test_t3_wf05_citizen_info_request_response_loop(self):
        """Information request pauses triage, audits action, and resumes upon resident clarification."""
        db = next(get_db())
        r = E2EReport(ticket_id="PUL-INFO-LOOP", category="drainage", description="Flooding near school", status="pending", location_lat=14.75, location_lng=121.04, barangay="172")
        db.add(r)
        db.commit()
        db.refresh(r)

        # 1. Staff requests clarification
        res1 = client.post(
            f"/api/gov/reports/{r.id}/request-info",
            json={"reason": "Which school?", "message": "Please specify whether High School or Elementary."},
            headers=self.admin_headers
        )
        self.assertEqual(res1.status_code, 200)

        # 2. Check triage feed changes recommendation to "Await Citizen Response"
        triage = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["triage_feed"]
        item = next(i for i in triage if i["id"] == r.id)
        self.assertEqual(item["status"], "needs_information")
        self.assertEqual(item["recommended_action"], "Await Citizen Response")

        # 3. Resident provides clarification
        db.expire_all()
        rep = db.query(E2EReport).filter(E2EReport.id == r.id).first()
        rep.description = "Flooding near Caloocan National High School Gate 2"
        rep.status = "pending" # Returns to pending queue
        db.commit()

        # 4. Triage feed now recommends assigning work order
        triage_after = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["triage_feed"]
        item_after = next(i for i in triage_after if i["id"] == r.id)
        self.assertEqual(item_after["status"], "pending")
        self.assertEqual(item_after["recommended_action"], "Assign Work Order")

    def test_t3_wf06_separation_of_duties_enforcement_with_rework_loop(self):
        """Assigned worker cannot self-approve; inspector rejects with rework; worker fixes; inspector passes."""
        db = next(get_db())
        wo = E2EWorkOrder(wo_number="WO-SOD-REWORK", title="Bridge Expansion Joint", status="awaiting_verification", assigned_to_id=3, created_by_id=1)
        db.add(wo)
        db.commit()
        db.refresh(wo)

        # 1. Worker #3 attempts self-inspection -> HTTP 403 Forbidden
        self_audit_res = client.post(
            f"/api/gov/work-orders/{wo.id}/verify",
            json={"passed": True, "checklist_results": {"joint_sealed": True}},
            headers=self.worker_headers
        )
        self.assertEqual(self_audit_res.status_code, 403)
        self.assertIn("Separation of duties violation", self_audit_res.json()["detail"])

        # 2. Independent Inspector #4 inspects and fails it -> status becomes rework_required
        fail_audit_res = client.post(
            f"/api/gov/work-orders/{wo.id}/verify",
            json={"passed": False, "checklist_results": {"joint_sealed": False}, "notes": "Sealant peeling, requires re-application"},
            headers=self.insp_headers
        )
        self.assertEqual(fail_audit_res.status_code, 200)
        self.assertEqual(fail_audit_res.json()["status"], "rework_required")

        # 3. Worker performs rework and resubmits
        client.post(f"/api/gov/work-orders/{wo.id}/submit-verification", headers=self.worker_headers)

        # 4. Inspector #4 re-inspects and approves -> completed
        pass_audit_res = client.post(
            f"/api/gov/work-orders/{wo.id}/verify",
            json={"passed": True, "checklist_results": {"joint_sealed": True}, "notes": "Sealant re-applied smoothly."},
            headers=self.insp_headers
        )
        self.assertEqual(pass_audit_res.status_code, 200)
        self.assertEqual(pass_audit_res.json()["status"], "completed")

    def test_t3_wf07_announcement_6_stage_publishing_pipeline(self):
        """Full transition through 6-stage publishing pipeline with strict rejection of illegal jumps."""
        # Stage 1: Draft
        p = client.post("/api/gov/announcements", json={"title_en": "6-Stage Lifecycle", "content_en": "Content"}, headers=self.admin_headers).json()
        ann_id = p["id"]
        self.assertEqual(p["status"], "draft")

        # Illegal jump: Draft -> Published (rejection)
        bad_pub = client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)
        self.assertEqual(bad_pub.status_code, 400)

        # Stage 2: In Review
        s2 = client.post(f"/api/gov/announcements/{ann_id}/submit-review", headers=self.admin_headers).json()
        self.assertEqual(s2["status"], "in_review")

        # Stage 3: Approved
        s3 = client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers).json()
        self.assertEqual(s3["status"], "approved")

        # Stage 4: Published
        s4 = client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers).json()
        self.assertEqual(s4["status"], "published")

        # Stage 5: Withdrawn
        s5 = client.post(f"/api/gov/announcements/{ann_id}/withdraw", json={"withdrawal_reason": "Event concluded"}, headers=self.admin_headers).json()
        self.assertEqual(s5["status"], "withdrawn")

    def test_t3_wf08_plain_civic_performance_response_to_municipal_surge(self):
        """Intake surge triggers negative velocity; subsequent resolution batch restores positive velocity."""
        db = next(get_db())
        # 10 intake reports created today
        for i in range(10):
            db.add(E2EReport(ticket_id=f"PUL-SURGE-P-{i}", category="road_damage", status="pending", location_lat=14.75, location_lng=121.04, barangay="172"))
        db.commit()

        # Net velocity is negative (-10)
        res1 = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers).json()["questions"]["are_we_keeping_up"]
        self.assertEqual(res1["velocity_delta"], -10)
        self.assertEqual(res1["verdict"], "Falling behind intake")

        # Clear backlog: Resolve 15 tickets
        t10 = datetime.now(timezone.utc) - timedelta(days=10)
        for i in range(15):
            db.add(E2EReport(ticket_id=f"PUL-CLEAR-P-{i}", category="road_damage", status="resolved", location_lat=14.75, location_lng=121.04, barangay="172", created_at=t10))
        db.commit()

        # Net velocity is positive (15 resolved - 10 intake = +5)
        res2 = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers).json()["questions"]["are_we_keeping_up"]
        self.assertEqual(res2["velocity_delta"], 5)
        self.assertEqual(res2["verdict"], "Ahead of intake")

    def test_t3_wf09_dual_sector_spatial_routing_and_isolation(self):
        """North and South Caloocan tickets and assets are spatially segregated and accurately attributed."""
        db = next(get_db())
        # North Caloocan report (D3)
        db.add(E2EReport(ticket_id="PUL-NORTH-TICKET", category="drainage", status="pending", location_lat=14.7500, location_lng=121.0400, barangay="Barangay 172", district=3))
        # South Caloocan report (D1)
        db.add(E2EReport(ticket_id="PUL-SOUTH-TICKET", category="drainage", status="pending", location_lat=14.6500, location_lng=120.9800, barangay="Monumento", district=1))
        # North Asset
        db.add(E2EInfrastructureAsset(asset_id="CAL-NORTH-CULVERT", asset_name="North Culvert", category="Drainage", barangay="Barangay 172", district=3, gps_lat=14.75, gps_lng=121.04))
        # South Asset
        db.add(E2EInfrastructureAsset(asset_id="CAL-SOUTH-CULVERT", asset_name="South Culvert", category="Drainage", barangay="Monumento", district=1, gps_lat=14.65, gps_lng=120.98))
        db.commit()

        # Sector stats
        sectors = client.get("/api/gov/operations/today", headers=self.admin_headers).json()["sector_stats"]
        self.assertEqual(sectors["north"]["open_tickets"], 1)
        self.assertEqual(sectors["south"]["open_tickets"], 1)

        # Asset query by barangay isolates correctly
        north_assets = client.get("/api/gov/assets?barangay=172", headers=self.admin_headers).json()
        self.assertEqual(len(north_assets), 1)
        self.assertEqual(north_assets[0]["asset_id"], "CAL-NORTH-CULVERT")

        south_assets = client.get("/api/gov/assets?barangay=Monumento", headers=self.admin_headers).json()
        self.assertEqual(len(south_assets), 1)
        self.assertEqual(south_assets[0]["asset_id"], "CAL-SOUTH-CULVERT")

    def test_t3_wf10_capital_projects_unbundling_from_assets_register(self):
        """Capital projects are isolated in Work module; asset registry queries only physical components."""
        db = next(get_db())
        # Physical Asset
        db.add(E2EInfrastructureAsset(asset_id="CAL-RD-PHYSICAL", asset_name="Real Asphalt Road", category="Roads", barangay="172", gps_lat=14.75, gps_lng=121.04))
        # Work order for capital project
        db.add(E2EWorkOrder(wo_number="WO-CAPITAL-1", title="City Hall Renovation Phase 1", status="active", created_by_id=1))
        db.commit()

        # Asset register does not return the capital project
        assets = client.get("/api/gov/assets", headers=self.admin_headers).json()
        self.assertEqual(len(assets), 1)
        self.assertEqual(assets[0]["asset_id"], "CAL-RD-PHYSICAL")

        # Work orders view does return the capital project order
        wos = client.get("/api/gov/work-orders", headers=self.admin_headers).json()
        self.assertTrue(any(w["wo_number"] == "WO-CAPITAL-1" for w in wos))

if __name__ == "__main__":
    unittest.main()
