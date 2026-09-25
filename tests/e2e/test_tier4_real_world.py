"""
========================================================================================
PULSO E2E Test Suite — Tier 4: Real-World Operational Scenarios
========================================================================================
Simulates realistic, multi-role municipal civic engineering scenarios in Caloocan City:
- Scenario 1: Typhoon Monsoon Surge Mass Ingestion, Triage & Blocker Management
- Scenario 2: Monumento Circle Underground Utility Conflict & Resurfacing
- Scenario 3: School Zone Pedestrian Safety Inspection Rejection & Rework
- Scenario 4: Pre-Monsoon DPWH Predictive Drainage Desiltation Program
- Scenario 5: Erroneous Emergency Bridge Closure Announcement Retraction & Errata
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

class TestTier4RealWorldScenarios(unittest.TestCase):
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

    def test_t4_sc01_typhoon_monsoon_surge_mass_triage_and_blockers(self):
        """Typhoon Enteng causes severe flooding in North Caloocan; mass intake, blockers, advisory, and resolution."""
        db = next(get_db())
        # 1. Ingest 12 emergency citizen reports across Bagong Silang (176), Camarin (175), and Tala (172)
        report_ids = []
        for i in range(12):
            brgy = "Barangay 176" if i % 2 == 0 else "Barangay 172"
            prio = "critical" if i < 6 else "high"
            r = E2EReport(
                ticket_id=f"PUL-TYPHOON-{i+1:02d}",
                category="drainage" if i % 2 == 0 else "road_damage",
                description=f"Severe flash flood and shoulder washout #{i+1}",
                status="pending",
                priority=prio,
                location_lat=14.7500 + (i * 0.001),
                location_lng=121.0400 + (i * 0.001),
                barangay=brgy,
                district=3
            )
            db.add(r)
            db.flush()
            report_ids.append(r.id)
        db.commit()

        # 2. Verify Operations Today reflects North Caloocan crisis
        today_state = client.get("/api/gov/operations/today", headers=self.admin_headers).json()
        self.assertEqual(today_state["metrics"]["unassigned_reports"], 12)
        self.assertEqual(today_state["metrics"]["open_high_priority"], 12)
        self.assertEqual(today_state["sector_stats"]["north"]["open_tickets"], 12)
        self.assertEqual(today_state["sector_stats"]["south"]["open_tickets"], 0)

        # 3. Dispatch Work Orders for the first 3 critical reports
        dispatched_wos = []
        for rep_id in report_ids[:3]:
            res = client.post(
                f"/api/gov/reports/{rep_id}/assign-work-order",
                json={"title": f"Emergency Culvert Declogging Rep #{rep_id}", "assigned_to_id": 3},
                headers=self.disp_headers
            )
            self.assertEqual(res.status_code, 200)
            dispatched_wos.append(res.json()["work_order_id"])

        # 4. Field worker reports weather blocker for work orders due to deep water
        for wo_id in dispatched_wos:
            blk_res = client.post(
                f"/api/gov/work-orders/{wo_id}/block",
                json={"reason_code": "weather", "delay_days": 3.0, "notes": "Floodwaters 1.2m deep; unsafe for heavy machinery"},
                headers=self.worker_headers
            )
            self.assertEqual(blk_res.status_code, 200)

        # Operations Hub shows 3 blocked orders
        today_blocked = client.get("/api/gov/operations/today", headers=self.admin_headers).json()
        self.assertEqual(today_blocked["team_capacity"][0]["blocked_orders"], 3)

        # 5. City Engineer publishes urgent bilingual typhoon advisory
        adv_res = client.post(
            "/api/gov/announcements",
            json={
                "title_en": "Typhoon Flash Flood Advisory — North Caloocan",
                "title_fil": "Babala sa Baha Dulot ng Bagyo — Hilagang Caloocan",
                "content_en": "Avoid Zabarte and Camarin roads due to active culvert overflow.",
                "content_fil": "Iwasan ang mga kalsada ng Zabarte at Camarin dahil sa pag-apaw ng tubig.",
                "category": "service_interruption",
                "priority": "emergency",
                "channels": ["web", "sms", "email"]
            },
            headers=self.admin_headers
        )
        ann_id = adv_res.json()["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)

        # Public feed has emergency notice
        pub_ann = client.get("/api/announcements/public").json()
        self.assertTrue(any(a["id"] == ann_id for a in pub_ann))

        # 6. Post-monsoon: Waters recede -> unblock and complete repairs
        for wo_id in dispatched_wos:
            client.post(f"/api/gov/work-orders/{wo_id}/unblock", json={"resolution_notes": "Waters receded, crew mobilized"}, headers=self.worker_headers)
            client.post(f"/api/gov/work-orders/{wo_id}/submit-verification", headers=self.worker_headers)
            # Independent inspection passes
            v_res = client.post(f"/api/gov/work-orders/{wo_id}/verify", json={"passed": True, "checklist_results": {"drained": True, "paved": True}}, headers=self.insp_headers)
            self.assertEqual(v_res.json()["status"], "completed")

        # 3 reports resolved
        final_today = client.get("/api/gov/operations/today", headers=self.admin_headers).json()
        self.assertEqual(final_today["metrics"]["resolved_period"], 3)
        self.assertEqual(final_today["metrics"]["unassigned_reports"], 9)

    def test_t4_sc02_monumento_circle_utility_conflict_water_main_break(self):
        """Burst water pipe in South Caloocan blocked by Meralco underground cables; coordination and resolution."""
        db = next(get_db())
        # 1. Report filed in Monumento (South Caloocan, D1)
        rep = E2EReport(
            ticket_id="PUL-MONUMENTO-PIPE",
            category="drainage",
            description="Massive water geyser flooding Samson Road near Monumento Circle",
            status="pending",
            priority="critical",
            location_lat=14.6550,
            location_lng=120.9820,
            barangay="Monumento",
            district=1
        )
        db.add(rep)
        db.commit()
        db.refresh(rep)

        # 2. Dispatch work order to Field Worker #3
        wo_res = client.post(
            f"/api/gov/reports/{rep.id}/assign-work-order",
            json={"title": "Excavate and Patch Water Main", "assigned_to_id": 3},
            headers=self.disp_headers
        )
        wo_id = wo_res.json()["work_order_id"]

        # 3. Excavation hits concrete duct with 13.8kV Meralco cables -> Blocker logged
        blk_res = client.post(
            f"/api/gov/work-orders/{wo_id}/block",
            json={
                "reason_code": "utility_conflict",
                "delay_days": 1.5,
                "notes": "Maynilad pipe crosses Meralco 13.8kV underground conduit. Awaiting utility representative."
            },
            headers=self.worker_headers
        )
        self.assertEqual(blk_res.status_code, 200)

        # 4. Check delayed work analytics reflects this blocker
        analytics = client.get("/api/gov/analytics/plain-performance", headers=self.admin_headers).json()
        q3 = analytics["questions"]["which_work_is_delayed"]
        self.assertEqual(q3["total_blocked"], 1)
        self.assertEqual(q3["delayed_work_orders"][0]["id"], wo_id)

        # 5. Utility coordinator clears conduit -> Unblock
        client.post(
            f"/api/gov/work-orders/{wo_id}/unblock",
            json={"resolution_notes": "Meralco safety escort on site; hand-digging approved"},
            headers=self.worker_headers
        )

        # 6. Pipe repaired and backfilled -> Submit for inspection
        client.post(f"/api/gov/work-orders/{wo_id}/submit-verification", headers=self.worker_headers)

        # 7. Independent Inspector #4 checks pressure and asphalt restoration
        insp_res = client.post(
            f"/api/gov/work-orders/{wo_id}/verify",
            json={"passed": True, "checklist_results": {"pressure_test_passed": True, "compaction_standard": True}},
            headers=self.insp_headers
        )
        self.assertEqual(insp_res.json()["status"], "completed")

        # 8. Report resolved and timeline reflects full history
        docket = client.get(f"/api/gov/reports/{rep.id}/docket", headers=self.admin_headers).json()
        self.assertEqual(docket["status"], "resolved")
        self.assertTrue(any("verified passed" in t["note"] for t in docket["timeline"]))

    def test_t4_sc03_school_zone_lighting_inspection_rejection_rework(self):
        """School pedestrian safety audit; contractor self-approval blocked; inspector demands rework."""
        db = next(get_db())
        # 1. School pedestrian lighting report
        rep = E2EReport(
            ticket_id="PUL-SCHOOL-LIGHT",
            category="streetlight",
            description="Dark pedestrian crosswalk in front of Bagong Silang Elementary School",
            status="pending",
            priority="high",
            location_lat=14.7550,
            location_lng=121.0450,
            barangay="Barangay 176",
            district=3
        )
        db.add(rep)
        db.commit()
        db.refresh(rep)

        # 2. Dispatched to electrical contractor (Worker #3)
        wo_res = client.post(
            f"/api/gov/reports/{rep.id}/assign-work-order",
            json={"title": "Install High-Lumen Solar LED Crosswalk Illuminators", "assigned_to_id": 3},
            headers=self.admin_headers
        )
        wo_id = wo_res.json()["work_order_id"]

        # 3. Contractor finishes physical mounting and submits
        client.post(f"/api/gov/work-orders/{wo_id}/submit-verification", headers=self.worker_headers)

        # 4. Contractor attempts self-approval -> 403 Forbidden
        self_audit = client.post(
            f"/api/gov/work-orders/{wo_id}/verify",
            json={"passed": True, "checklist_results": {"illuminance": True}},
            headers=self.worker_headers
        )
        self.assertEqual(self_audit.status_code, 403)
        self.assertIn("Separation of duties violation", self_audit.json()["detail"])

        # 5. Official Inspector #4 inspects and discovers safety violation -> Rework required
        fail_audit = client.post(
            f"/api/gov/work-orders/{wo_id}/verify",
            json={
                "passed": False,
                "checklist_results": {"lux_meter_test": True, "ground_wire_connected": False, "weatherproof_box": False},
                "notes": "CRITICAL REWORK: Ground rod disconnected and solar battery enclosure lacks silicone seal."
            },
            headers=self.insp_headers
        )
        self.assertEqual(fail_audit.status_code, 200)
        self.assertEqual(fail_audit.json()["status"], "rework_required")

        # 6. Contractor returns, solders ground wire, seals enclosure
        client.post(f"/api/gov/work-orders/{wo_id}/submit-verification", headers=self.worker_headers)

        # 7. Inspector re-inspects -> Passed
        pass_audit = client.post(
            f"/api/gov/work-orders/{wo_id}/verify",
            json={
                "passed": True,
                "checklist_results": {"lux_meter_test": True, "ground_wire_connected": True, "weatherproof_box": True},
                "notes": "Ground wire verified 0.2 ohms. Weatherproofing intact."
            },
            headers=self.insp_headers
        )
        self.assertEqual(pass_audit.json()["status"], "completed")

    def test_t4_sc04_dpwh_predictive_drainage_maintenance_program(self):
        """Pre-monsoon DPWH drainage desiltation program driven by deterministic asset scoring."""
        db = next(get_db())
        # 1. Register 3 critical drainage assets
        db.add(E2EInfrastructureAsset(asset_id="CAL-DR-TALA-01", asset_name="Tala Creek Main Culvert", category="Drainage", barangay="Barangay 172", condition_score=35.0, gps_lat=14.75, gps_lng=121.04))
        db.add(E2EInfrastructureAsset(asset_id="CAL-DR-CAM-01", asset_name="Camarin Secondary Channel", category="Drainage", barangay="Barangay 175", condition_score=60.0, gps_lat=14.75, gps_lng=121.04))
        db.add(E2EInfrastructureAsset(asset_id="CAL-DR-BS-01", asset_name="Bagong Silang Trunkline", category="Drainage", barangay="Barangay 176", condition_score=85.0, gps_lat=14.75, gps_lng=121.04))
        db.commit()

        # 2. Query predictive maintenance scores
        scores = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()
        tala = next(s for s in scores if s["asset_id"] == "CAL-DR-TALA-01")
        # Low condition score + high drainage decay (0.12) -> elevated 30d failure prob
        self.assertGreater(tala["failure_probability"]["30d"], 0.3)
        self.assertLess(tala["deterministic_health_score"], 50.0)

        # 3. Schedule pre-monsoon preventive desiltation
        maint_res = client.post(
            "/api/gov/assets/CAL-DR-TALA-01/maintenance",
            json={"work_type": "preventive_desilting", "cost": 75000.0, "notes": "Removed 40 tons of silt and plastic debris."},
            headers=self.admin_headers
        )
        self.assertEqual(maint_res.status_code, 200)

        # 4. Verify asset condition score improved
        detail = client.get("/api/gov/assets/CAL-DR-TALA-01", headers=self.admin_headers).json()
        self.assertEqual(detail["asset"]["condition_score"], 45.0) # +10.0 improvement
        self.assertEqual(len(detail["maintenance_history"]), 1)

        # 5. Recalculated predictive score shows health score improvement
        scores_after = client.get("/api/gov/predictive/maintenance-scores", headers=self.admin_headers).json()
        tala_after = next(s for s in scores_after if s["asset_id"] == "CAL-DR-TALA-01")
        self.assertGreater(tala_after["deterministic_health_score"], tala["deterministic_health_score"])

    def test_t4_sc05_erroneous_bridge_closure_emergency_retraction_and_errata(self):
        """Erroneous emergency bridge closure notice retracted via official timestamped errata."""
        # 1. Publish emergency bridge closure announcement
        ann = client.post(
            "/api/gov/announcements",
            json={
                "title_en": "URGENT: Marilao River Boundary Bridge Closed Immediately",
                "title_fil": "BABALA: Agarang Pagsasara ng Tulay sa Marilao River Boundary",
                "content_en": "Bridge is closed to all vehicular traffic due to reported foundation shift.",
                "content_fil": "Sarado sa lahat ng sasakyan ang tulay dahil sa ulat ng paggalaw ng pundasyon.",
                "category": "advisory",
                "priority": "emergency",
                "channels": ["web", "sms"]
            },
            headers=self.admin_headers
        ).json()
        ann_id = ann["id"]
        client.post(f"/api/gov/announcements/{ann_id}/approve", headers=self.admin_headers)
        client.post(f"/api/gov/announcements/{ann_id}/publish", headers=self.admin_headers)

        # 2. Staff attempts direct PUT edit -> Blocked
        direct_edit = client.put(
            f"/api/gov/announcements/{ann_id}",
            json={"title_en": "Nevermind, bridge is open"},
            headers=self.admin_headers
        )
        self.assertEqual(direct_edit.status_code, 400)
        self.assertIn("Published announcements cannot be directly edited", direct_edit.json()["detail"])

        # 3. Post official public errata
        corr_res = client.post(
            f"/api/gov/announcements/{ann_id}/corrections",
            json={
                "correction_note": "CORRECTION & RETRACTION: Structural inspection completed by DPWH at 10:15 AM confirms zero foundation defect. Hairline crack was superficial plaster only. Bridge is 100% structurally sound and open."
            },
            headers=self.admin_headers
        )
        self.assertEqual(corr_res.status_code, 200)

        # 4. Withdraw announcement with formal recorded reason
        with_res = client.post(
            f"/api/gov/announcements/{ann_id}/withdraw",
            json={"withdrawal_reason": "False report cleared after certified on-site engineering load inspection."},
            headers=self.admin_headers
        )
        self.assertEqual(with_res.status_code, 200)
        self.assertEqual(with_res.json()["status"], "withdrawn")

        # 5. Public announcements feed no longer displays the withdrawn notice
        pub_feed = client.get("/api/announcements/public").json()
        self.assertFalse(any(a["id"] == ann_id for a in pub_feed))

        # 6. Internal government record retains immutable audit trail with correction and withdrawal note
        internal_detail = client.get(f"/api/gov/announcements/{ann_id}", headers=self.admin_headers).json()
        self.assertEqual(internal_detail["status"], "withdrawn")
        self.assertEqual(len(internal_detail["corrections"]), 1)
        self.assertIn("Structural inspection completed", internal_detail["corrections"][0]["note"])

if __name__ == "__main__":
    unittest.main()
