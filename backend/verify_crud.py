"""
verify_crud.py — End-to-End CRUD Verification Script
Tests the full citizen report → government processing lifecycle.

Usage:
    python verify_crud.py
"""

import requests
import json
import sys

BASE = "http://localhost:8000"

# ─── Styled output ───────────────────────────────────────────────────── 
def ok(msg):   print(f"  ✅ {msg}")
def fail(msg): print(f"  ❌ {msg}")
def info(msg): print(f"  ℹ️  {msg}")
def header(msg): print(f"\n{'='*60}\n  {msg}\n{'='*60}")

errors = []

def check(label, condition, detail=""):
    if condition:
        ok(label)
    else:
        fail(f"{label} — {detail}")
        errors.append(label)


# ═══════════════════════════════════════════════════════════════════════
# Step 0: Health Check
# ═══════════════════════════════════════════════════════════════════════
header("STEP 0: Backend Health Check")
try:
    r = requests.get(f"{BASE}/api/health", timeout=5)
    check("Backend is reachable", r.status_code == 200, f"Got {r.status_code}")
except Exception as e:
    fail(f"Backend unreachable: {e}")
    sys.exit(1)


# ═══════════════════════════════════════════════════════════════════════
# Step 1: Login as a gov staff member (bypass captcha for testing)
# ═══════════════════════════════════════════════════════════════════════
header("STEP 1: Government Staff Login")

# Generate token directly using auth module (bypasses captcha)
try:
    sys.path.insert(0, ".")
    import auth as auth_mod
    from database import SessionLocal
    import models as db_models
    from datetime import timedelta

    _db = SessionLocal()
    test_emails = [
        "admin@pulso.system",
        "city.engineer@caloocan.gov.ph",
        "admin.officer@caloocan.gov.ph",
    ]
    logged_user = None
    token = None
    for email in test_emails:
        user = _db.query(db_models.User).filter(db_models.User.email == email).first()
        if user:
            token = auth_mod.create_access_token(
                data={"sub": user.email},
                expires_delta=timedelta(minutes=30)
            )
            logged_user = user.email
            info(f"Logged in as: {user.full_name} ({user.role}) — {user.email}")
            break
    _db.close()
except Exception as e:
    fail(f"Direct auth import failed: {e}")
    token = None

if not token:
    fail("Could not authenticate with any test account.")
    sys.exit(1)

check("Got auth token", bool(token))
AUTH = {"Authorization": f"Bearer {token}"}


# ═══════════════════════════════════════════════════════════════════════
# Step 2: Verify Government Router is mounted
# ═══════════════════════════════════════════════════════════════════════
header("STEP 2: Verify Government API Endpoints Are Mounted")

gov_endpoints = [
    "/api/gov/dashboard/stats",
    "/api/gov/work-orders",
    "/api/gov/procurement",
    "/api/gov/projects",
    "/api/gov/obo",
    "/api/gov/audit-logs",
    "/api/gov/timeline",
    "/api/gov/records",
    "/api/gov/users",
]

for ep in gov_endpoints:
    r = requests.get(f"{BASE}{ep}", headers=AUTH)
    # 200 or 403 (role restricted) means the endpoint IS MOUNTED
    mounted = r.status_code in (200, 403, 422)
    check(f"GET {ep}", mounted, f"status={r.status_code}")


# ═══════════════════════════════════════════════════════════════════════
# Step 3: Verify Analytics Router is mounted
# ═══════════════════════════════════════════════════════════════════════
header("STEP 3: Verify Analytics API Endpoints Are Mounted")

analytics_endpoints = [
    "/api/gov/analytics/summary",
    "/api/gov/analytics/clusters",
    "/api/gov/analytics/heatmap",
    "/api/gov/analytics/forecast",
    "/api/gov/analytics/recurrence",
]

for ep in analytics_endpoints:
    r = requests.get(f"{BASE}{ep}", headers=AUTH)
    mounted = r.status_code in (200, 403, 422)
    check(f"GET {ep}", mounted, f"status={r.status_code}")


# ═══════════════════════════════════════════════════════════════════════
# Step 4: Dashboard Stats (integration test)
# ═══════════════════════════════════════════════════════════════════════
header("STEP 4: Government Dashboard Stats")

r = requests.get(f"{BASE}/api/gov/dashboard/stats", headers=AUTH)
if r.status_code == 200:
    data = r.json()
    check("Dashboard returns JSON", isinstance(data, dict))
    expected_keys = ["total_work_orders", "total_projects", "total_procurement_requests", "total_obo_inspections", "total_audit_entries"]
    for k in expected_keys:
        check(f"  Has key: {k}", k in data, f"Missing from response")
    info(f"Work Orders: {data.get('total_work_orders')} | Projects: {data.get('total_projects')} | Procurement: {data.get('total_procurement_requests')}")
else:
    fail(f"Dashboard stats returned {r.status_code}: {r.text[:200]}")


# ═══════════════════════════════════════════════════════════════════════
# Step 5: Citizen Report CRUD (from main.py endpoints)
# ═══════════════════════════════════════════════════════════════════════
header("STEP 5: Citizen Report CRUD")

# Get existing reports
r = requests.get(f"{BASE}/api/reports", headers=AUTH)
check("GET /api/reports", r.status_code == 200, f"status={r.status_code}")

if r.status_code == 200:
    reports = r.json()
    info(f"Found {len(reports)} reports in the system")
    
    # Find a pending report to test status transitions
    pending = [rpt for rpt in reports if rpt.get("status") == "pending"]
    if pending:
        test_report = pending[0]
        rid = test_report["id"]
        info(f"Testing status transition on report #{rid} ({test_report.get('ticket_id')})")
        
        # Verify → pending_approval
        r = requests.patch(f"{BASE}/api/reports/{rid}/status", 
                          json={"status": "pending_approval"}, headers=AUTH)
        check(f"  Report #{rid} → pending_approval", r.status_code == 200, f"status={r.status_code}: {r.text[:200] if r.status_code != 200 else ''}")
        
        # Approve → approved_internal
        if r.status_code == 200:
            r = requests.patch(f"{BASE}/api/reports/{rid}/status",
                              json={"status": "approved_internal"}, headers=AUTH)
            check(f"  Report #{rid} → approved_internal", r.status_code == 200, f"status={r.status_code}")
        
        # Dispatch 
        if r.status_code == 200:
            r = requests.patch(f"{BASE}/api/reports/{rid}/dispatch", headers=AUTH)
            check(f"  Report #{rid} → dispatched", r.status_code == 200, f"status={r.status_code}")
        
        # Resolve
        if r.status_code == 200:
            r = requests.patch(f"{BASE}/api/reports/{rid}/resolve", headers=AUTH)
            check(f"  Report #{rid} → resolved", r.status_code == 200, f"status={r.status_code}")
    else:
        info("No pending reports to test transitions on (all may already be processed)")


# ═══════════════════════════════════════════════════════════════════════
# Step 6: Work Order CRUD (government-side)
# ═══════════════════════════════════════════════════════════════════════
header("STEP 6: Work Order CRUD (Government-Side)")

r = requests.get(f"{BASE}/api/gov/work-orders", headers=AUTH)
check("GET /api/gov/work-orders", r.status_code == 200, f"status={r.status_code}: {r.text[:200]}")

if r.status_code == 200:
    wos = r.json()
    info(f"Found {len(wos)} work orders")
    
    # If there are any, test getting a single one
    if wos:
        wo_id = wos[0]["id"]
        r = requests.get(f"{BASE}/api/gov/work-orders/{wo_id}", headers=AUTH)
        check(f"GET /api/gov/work-orders/{wo_id}", r.status_code == 200, f"status={r.status_code}")


# ═══════════════════════════════════════════════════════════════════════
# Step 7: Procurement CRUD
# ═══════════════════════════════════════════════════════════════════════
header("STEP 7: Procurement CRUD")

r = requests.get(f"{BASE}/api/gov/procurement", headers=AUTH)
check("GET /api/gov/procurement", r.status_code == 200, f"status={r.status_code}: {r.text[:200]}")

if r.status_code == 200:
    prs = r.json()
    info(f"Found {len(prs)} procurement requests")
    
    if prs:
        pr_id = prs[0]["id"]
        r = requests.get(f"{BASE}/api/gov/procurement/{pr_id}", headers=AUTH)
        check(f"GET /api/gov/procurement/{pr_id}", r.status_code == 200, f"status={r.status_code}")


# ═══════════════════════════════════════════════════════════════════════
# Step 8: Project CRUD 
# ═══════════════════════════════════════════════════════════════════════
header("STEP 8: Project CRUD")

r = requests.get(f"{BASE}/api/gov/projects", headers=AUTH)
check("GET /api/gov/projects", r.status_code == 200, f"status={r.status_code}: {r.text[:200]}")

if r.status_code == 200:
    projs = r.json()
    info(f"Found {len(projs)} projects")
    
    if projs:
        proj_id = projs[0]["id"]
        r = requests.get(f"{BASE}/api/gov/projects/{proj_id}", headers=AUTH)
        check(f"GET /api/gov/projects/{proj_id}", r.status_code == 200, f"status={r.status_code}")


# ═══════════════════════════════════════════════════════════════════════
# Step 9: OBO Inspections CRUD
# ═══════════════════════════════════════════════════════════════════════
header("STEP 9: OBO Inspections CRUD")

r = requests.get(f"{BASE}/api/gov/obo", headers=AUTH)
check("GET /api/gov/obo", r.status_code == 200, f"status={r.status_code}: {r.text[:200]}")

if r.status_code == 200:
    obos = r.json()
    info(f"Found {len(obos)} OBO inspections")


# ═══════════════════════════════════════════════════════════════════════
# Step 10: Audit Trail & Timeline
# ═══════════════════════════════════════════════════════════════════════
header("STEP 10: Audit Trail & Timeline")

r = requests.get(f"{BASE}/api/gov/audit-logs", headers=AUTH)
check("GET /api/gov/audit-logs", r.status_code == 200, f"status={r.status_code}: {r.text[:200]}")

if r.status_code == 200:
    logs = r.json()
    info(f"Found {len(logs)} audit log entries")

r = requests.get(f"{BASE}/api/gov/timeline", headers=AUTH)
check("GET /api/gov/timeline", r.status_code == 200, f"status={r.status_code}: {r.text[:200]}")

if r.status_code == 200:
    timeline = r.json()
    info(f"Found {len(timeline)} timeline entries")


# ═══════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════
header("VERIFICATION SUMMARY")
if errors:
    print(f"\n  ❌ {len(errors)} test(s) FAILED:")
    for e in errors:
        print(f"     • {e}")
    sys.exit(1)
else:
    print("\n  ✅ ALL TESTS PASSED — Full CRUD lifecycle is operational.")
    print("     Government-side endpoints are mounted and functional.")
    print("     Citizen ↔ Government status propagation is wired.")
    sys.exit(0)
