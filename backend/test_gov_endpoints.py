"""
test_gov_endpoints.py
Comprehensive functional test for all PULSO government-side API endpoints.
Run: python test_gov_endpoints.py
"""

import requests
import json
import sys

BASE = "http://localhost:33159"
PASS = "[PASS]"
FAIL = "[FAIL]"

results = []


def check(label, resp, expected_status=200):
    ok = resp.status_code == expected_status
    symbol = PASS if ok else FAIL
    line = f"  {symbol} [{resp.status_code}] {label}"
    if not ok:
        try:
            line += f"  => {resp.json()}"
        except Exception:
            line += f"  => {resp.text[:150]}"
    print(line)
    results.append((label, ok))
    return resp.json() if ok else None


def section(title):
    print(f"\n--- {title} ---")


# -----------------------------------------------------
# 0. Health Check
# -----------------------------------------------------
section("0. HEALTH CHECK")
r = requests.get(f"{BASE}/api/health")
check("GET /api/health", r)

# -----------------------------------------------------
# 1. Register & Login a System Admin
# -----------------------------------------------------
section("1. AUTH — Register & Login")

# Register system admin
r = requests.post(f"{BASE}/api/auth/register", json={
    "full_name": "Test SysAdmin",
    "email": "sysadmin_test@pulso.gov",
    "password": "TestPass123!",
    "role": "system_admin",
    "barangay": "172",
    "address": "Caloocan City"
})
# 200 = new, 400 = already exists — both are fine for testing
if r.status_code not in (200, 400):
    check("POST /api/auth/register (sysadmin)", r, 200)

# Login as system_admin
r = requests.post(f"{BASE}/api/auth/login", data={
    "username": "sysadmin_test@pulso.gov",
    "password": "TestPass123!"
})
login_data = check("POST /api/auth/login (sysadmin)", r)
TOKEN = login_data["access_token"] if login_data else None
USER_ID = login_data["user"]["id"] if login_data else None

if not TOKEN:
    print("\n\033[91mFATAL: Cannot obtain auth token. Aborting tests.\033[0m")
    sys.exit(1)

HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# Promote account to system_admin if needed (in case DB already had it as resident)
requests.patch(f"{BASE}/api/gov/users/{USER_ID}/role",
               json={"role": "system_admin"}, headers=HEADERS)

# -----------------------------------------------------
# 2. Register a second user for assignment tests
# -----------------------------------------------------
section("2. SECOND USER — Project Engineer")
r = requests.post(f"{BASE}/api/auth/register", json={
    "full_name": "Engineer Juan",
    "email": "eng_juan@pulso.gov",
    "password": "TestPass123!",
    "role": "project_engineer",
    "barangay": "175",
    "address": "Caloocan City"
})
if r.status_code in (200, 400):
    # Get or retrieve id
    r2 = requests.post(f"{BASE}/api/auth/login", data={
        "username": "eng_juan@pulso.gov",
        "password": "TestPass123!"
    })
    ENG_ID = r2.json()["user"]["id"] if r2.status_code == 200 else None
    # Ensure correct role
    if ENG_ID:
        requests.patch(f"{BASE}/api/gov/users/{ENG_ID}/role",
                       json={"role": "project_engineer"}, headers=HEADERS)
    check("Second user ready (project_engineer)", r2 if r2.status_code == 200 else r, 200 if r2.status_code == 200 else 400)
else:
    ENG_ID = None

# -----------------------------------------------------
# 3. Create a Citizen Report (to link to WOs)
# -----------------------------------------------------
section("3. CITIZEN REPORT — Create seed report")
r = requests.post(f"{BASE}/api/reports", json={
    "category": "Water",
    "description": "Burst pipe flooding barangay road",
    "location_lat": 14.7500,
    "location_lng": 120.9833,
    "location_string": "Brgy 172, Caloocan City"
}, headers=HEADERS)
report_data = check("POST /api/reports (seed)", r)
REPORT_ID = report_data["id"] if report_data else 1

# -----------------------------------------------------
# 4. Government Dashboard Stats
# -----------------------------------------------------
section("4. GOV DASHBOARD — Stats")
r = requests.get(f"{BASE}/api/gov/dashboard/stats", headers=HEADERS)
stats = check("GET /api/gov/dashboard/stats", r)
if stats:
    print(f"       -> WOs: {stats['total_work_orders']} | Projects: {stats['total_projects']} | PRQs: {stats['total_procurement_requests']}")

# -----------------------------------------------------
# 5. Work Orders
# -----------------------------------------------------
section("5. WORK ORDERS")
r = requests.post(f"{BASE}/api/gov/work-orders", json={
    "title": "Repair Burst Water Pipe – Brgy 172",
    "description": "Emergency repair of main water line",
    "report_id": REPORT_ID,
    "wo_type": "standard",
    "priority": "high",
    "assigned_to_id": ENG_ID
}, headers=HEADERS)
wo_data = check("POST /api/gov/work-orders (standard)", r)
WO_ID = wo_data["id"] if wo_data else None

r = requests.post(f"{BASE}/api/gov/work-orders", json={
    "title": "Preventive Road Check – Brgy 177",
    "wo_type": "preemptive",
    "priority": "normal",
}, headers=HEADERS)
wo2 = check("POST /api/gov/work-orders (preemptive / FR-11)", r)
WO2_ID = wo2["id"] if wo2 else None

r = requests.get(f"{BASE}/api/gov/work-orders", headers=HEADERS)
check("GET /api/gov/work-orders (list all)", r)

r = requests.get(f"{BASE}/api/gov/work-orders?wo_type=preemptive", headers=HEADERS)
check("GET /api/gov/work-orders?wo_type=preemptive", r)

if WO_ID:
    r = requests.get(f"{BASE}/api/gov/work-orders/{WO_ID}", headers=HEADERS)
    check(f"GET /api/gov/work-orders/{WO_ID}", r)

    r = requests.patch(f"{BASE}/api/gov/work-orders/{WO_ID}/status",
                       json={"status": "assigned"}, headers=HEADERS)
    check(f"PATCH /api/gov/work-orders/{WO_ID}/status -> assigned", r)

    r = requests.patch(f"{BASE}/api/gov/work-orders/{WO_ID}/status",
                       json={"status": "in_progress"}, headers=HEADERS)
    check(f"PATCH /api/gov/work-orders/{WO_ID}/status -> in_progress", r)

# -----------------------------------------------------
# 6. Procurement Requests (RA 9184)
# -----------------------------------------------------
section("6. PROCUREMENT REQUESTS (RA 9184 / FR-12)")
r = requests.post(f"{BASE}/api/gov/procurement", json={
    "title": "Materials for Brgy 172 Water Pipe Repair",
    "purpose": "Purchase PVC pipes and fittings for emergency repair",
    "work_order_id": WO_ID,
    "items": [
        {"item_name": "PVC Pipe 4-inch", "unit": "pcs", "quantity": 20, "unit_cost": 350.00},
        {"item_name": "Pipe Fittings Set", "unit": "set", "quantity": 5, "unit_cost": 180.00},
        {"item_name": "PVC Cement 400cc", "unit": "can", "quantity": 10, "unit_cost": 95.00},
    ]
}, headers=HEADERS)
pr_data = check("POST /api/gov/procurement (draft + 3 BoQ items)", r)
PR_ID = pr_data["id"] if pr_data else None
if pr_data:
    total = pr_data.get("total_estimated_cost", 0)
    print(f"       -> PR# {pr_data['pr_number']} | Total BoQ: P{total:,.2f}")

r = requests.get(f"{BASE}/api/gov/procurement", headers=HEADERS)
check("GET /api/gov/procurement (list)", r)

if PR_ID:
    r = requests.get(f"{BASE}/api/gov/procurement/{PR_ID}", headers=HEADERS)
    check(f"GET /api/gov/procurement/{PR_ID}", r)

    # Add one more BoQ item
    r = requests.post(f"{BASE}/api/gov/procurement/{PR_ID}/items", json={
        "item_name": "Safety Tape", "unit": "roll", "quantity": 3, "unit_cost": 45.00
    }, headers=HEADERS)
    check(f"POST /api/gov/procurement/{PR_ID}/items (add BoQ item)", r)

    # Workflow: draft -> submitted -> validated -> sent_to_procurement
    r = requests.patch(f"{BASE}/api/gov/procurement/{PR_ID}/status",
                       json={"status": "submitted"}, headers=HEADERS)
    check("PATCH /procurement/status -> submitted", r)

    r = requests.patch(f"{BASE}/api/gov/procurement/{PR_ID}/status",
                       json={"status": "validated"}, headers=HEADERS)
    check("PATCH /procurement/status -> validated (Admin Officer V)", r)

    r = requests.patch(f"{BASE}/api/gov/procurement/{PR_ID}/status",
                       json={"status": "sent_to_procurement"}, headers=HEADERS)
    check("PATCH /procurement/status -> sent_to_procurement (City Engineer)", r)

# -----------------------------------------------------
# 7. LGU Projects (Phases 1–6)
# -----------------------------------------------------
section("7. LGU PROJECTS — 6-Phase Infrastructure Lifecycle")
r = requests.post(f"{BASE}/api/gov/projects", json={
    "title": "Brgy 173 Road Widening Project",
    "description": "Widening of main road from 6m to 10m, Brgy 173",
    "requesting_party": "Office of the Mayor",
    "barangay": "173",
    "location_string": "Main St., Brgy 173, Caloocan City",
    "location_lat": 14.7510,
    "location_lng": 120.9845
}, headers=HEADERS)
proj_data = check("POST /api/gov/projects (Phase 1 — Request)", r)
PROJ_ID = proj_data["id"] if proj_data else None
if proj_data:
    print(f"       -> PROJ# {proj_data['proj_number']} | Status: {proj_data['status']}")

r = requests.get(f"{BASE}/api/gov/projects", headers=HEADERS)
check("GET /api/gov/projects (list)", r)

if PROJ_ID:
    # Assign personnel
    r = requests.patch(f"{BASE}/api/gov/projects/{PROJ_ID}", json={
        "survey_engineer_id": ENG_ID,
        "project_engineer_id": ENG_ID,
    }, headers=HEADERS)
    check(f"PATCH /api/gov/projects/{PROJ_ID} (assign personnel)", r)

    # Walk through phases
    phases = [
        ("survey_in_progress", "Phase 2 — Survey started"),
        ("survey_complete",    "Phase 3 — Survey complete"),
        ("design_in_progress", "Phase 4 — Design started"),
        ("boq_submitted",      "Phase 5 — BoQ submitted by Estimator"),
        ("pending_budget_check", "Phase 6 — Forwarded to Admin Officer"),
        ("budget_confirmed",   "Phase 7 — Budget confirmed"),
        ("approved_by_city_engineer", "Phase 8 — City Engineer signed off"),
        ("dispatched",         "Phase 9 — Dispatched to field"),
        ("in_progress",        "Phase 10 — Construction in progress"),
        ("milestone_inspections", "Phase 11 — Building Inspector on-site"),
        ("resolved",           "Phase 12 — All milestones cleared"),
    ]
    for status_val, label in phases:
        r = requests.patch(f"{BASE}/api/gov/projects/{PROJ_ID}/advance",
                           json={"status": status_val}, headers=HEADERS)
        check(f"PATCH /advance -> {status_val}", r)

    # Certificate of Completion (Phase 13 — Assistant City Engineer)
    r = requests.post(f"{BASE}/api/gov/projects/{PROJ_ID}/certificate",
                      json={"notes": "All works completed as per approved plans."}, headers=HEADERS)
    cert = check("POST /projects/certificate — Certificate of Completion issued", r)
    if cert:
        print(f"       -> {cert['proj_number']} | Status: {cert['status']} | Certificate: {cert['certificate_issued']}")

# -----------------------------------------------------
# 8. Process Timeline (FR-14)
# -----------------------------------------------------
section("8. PROCESS TIMELINE (FR-14)")
if WO_ID:
    r = requests.get(f"{BASE}/api/gov/timeline/work-order/{WO_ID}", headers=HEADERS)
    tl = check(f"GET /timeline/work-order/{WO_ID}", r)
    if tl:
        print(f"       -> {len(tl)} timeline entries")

if PROJ_ID:
    r = requests.get(f"{BASE}/api/gov/timeline/project/{PROJ_ID}", headers=HEADERS)
    tl = check(f"GET /timeline/project/{PROJ_ID}", r)
    if tl:
        print(f"       -> {len(tl)} timeline entries (all 13 phases)")

r = requests.get(f"{BASE}/api/gov/timeline/report/{REPORT_ID}", headers=HEADERS)
check(f"GET /timeline/report/{REPORT_ID}", r)

# -----------------------------------------------------
# 9. Audit Logs (FR-10)
# -----------------------------------------------------
section("9. AUDIT LOGS (FR-10)")
r = requests.get(f"{BASE}/api/gov/audit-logs", headers=HEADERS)
audit = check("GET /api/gov/audit-logs (all)", r)
if audit:
    print(f"       -> {len(audit)} audit entries auto-generated")

r = requests.get(f"{BASE}/api/gov/audit-logs?trigger_type=procurement", headers=HEADERS)
check("GET /api/gov/audit-logs?trigger_type=procurement", r)

r = requests.get(f"{BASE}/api/gov/audit-logs?trigger_type=status_change", headers=HEADERS)
check("GET /api/gov/audit-logs?trigger_type=status_change", r)

# -----------------------------------------------------
# 10. OBO Inspections (Section 6.4)
# -----------------------------------------------------
section("10. OBO INSPECTIONS (Building Official)")
r = requests.post(f"{BASE}/api/gov/obo", json={
    "applicant_name": "Juan dela Cruz",
    "applicant_contact": "09171234567",
    "property_address": "123 Rizal St., Brgy 172, Caloocan",
    "barangay": "172",
    "location_lat": 14.7499,
    "location_lng": 120.9830,
    "inspection_type": "building",
    "source_report_id": REPORT_ID
}, headers=HEADERS)
obo_data = check("POST /api/gov/obo (building inspection)", r)
OBO_ID = obo_data["id"] if obo_data else None
if obo_data:
    print(f"       -> {obo_data['obo_number']} | Status: {obo_data['status']}")

r = requests.post(f"{BASE}/api/gov/obo", json={
    "applicant_name": "SM Corp.",
    "property_address": "North EDSA, Brgy 180, Caloocan",
    "barangay": "180",
    "inspection_type": "mechanical"
}, headers=HEADERS)
check("POST /api/gov/obo (mechanical — elevator inspection)", r)

r = requests.get(f"{BASE}/api/gov/obo", headers=HEADERS)
check("GET /api/gov/obo (list)", r)

r = requests.get(f"{BASE}/api/gov/obo?inspection_type=building", headers=HEADERS)
check("GET /api/gov/obo?inspection_type=building", r)

r = requests.get(f"{BASE}/api/gov/obo?barangay=172", headers=HEADERS)
check("GET /api/gov/obo?barangay=172", r)

if OBO_ID:
    r = requests.get(f"{BASE}/api/gov/obo/{OBO_ID}", headers=HEADERS)
    check(f"GET /api/gov/obo/{OBO_ID}", r)

    r = requests.patch(f"{BASE}/api/gov/obo/{OBO_ID}", json={
        "status": "inspection_scheduled",
        "assigned_inspector_id": USER_ID,
        "inspection_date": "2026-03-25T09:00:00+08:00"
    }, headers=HEADERS)
    check(f"PATCH /obo/{OBO_ID} -> inspection_scheduled", r)

    r = requests.patch(f"{BASE}/api/gov/obo/{OBO_ID}", json={
        "status": "inspection_complete",
        "findings": "Structure is sound. Minor gap in roofing insulation noted.",
        "is_compliant": True
    }, headers=HEADERS)
    check(f"PATCH /obo/{OBO_ID} -> inspection_complete (compliant)", r)

    r = requests.patch(f"{BASE}/api/gov/obo/{OBO_ID}", json={
        "status": "permit_issued"
    }, headers=HEADERS)
    check(f"PATCH /obo/{OBO_ID} -> permit_issued (City Engineer)", r)

# -----------------------------------------------------
# 11. RBAC — User & Role Management (FR-13)
# -----------------------------------------------------
section("11. USER ROLE MANAGEMENT (FR-13 RBAC)")
r = requests.get(f"{BASE}/api/gov/users", headers=HEADERS)
users = check("GET /api/gov/users (list all)", r)
if users:
    print(f"       -> {len(users)} users in system")

r = requests.get(f"{BASE}/api/gov/users?role=resident", headers=HEADERS)
check("GET /api/gov/users?role=resident", r)

if ENG_ID:
    r = requests.patch(f"{BASE}/api/gov/users/{ENG_ID}/role",
                       json={"role": "estimator"}, headers=HEADERS)
    resp = check(f"PATCH /users/{ENG_ID}/role -> estimator", r)
    if resp:
        print(f"       -> {resp['previous_role']} -> {resp['new_role']}")

    # Restore role
    requests.patch(f"{BASE}/api/gov/users/{ENG_ID}/role",
                   json={"role": "project_engineer"}, headers=HEADERS)

# Test invalid role rejection
r = requests.patch(f"{BASE}/api/gov/users/{USER_ID}/role",
                   json={"role": "supreme_overlord"}, headers=HEADERS)
check("PATCH /role with INVALID role (expect 422)", r, 422)

# -----------------------------------------------------
# RESULTS SUMMARY
# -----------------------------------------------------
print(f"\n{'='*55}")
total = len(results)
passed = sum(1 for _, ok in results if ok)
failed = total - passed
print(f"  RESULTS: {passed}/{total} passed  |  {failed} failed")
print(f"{'='*55}")

if failed > 0:
    print("\n  Failed tests:")
    for label, ok in results:
        if not ok:
            print(f"    {FAIL} {label}")

sys.exit(0 if failed == 0 else 1)
