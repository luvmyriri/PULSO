"""
analytics_router.py — Government Analytics & Intelligence API
City Engineering Office, Caloocan City — PULSO System

Mounts under /api/gov/analytics/

Endpoints:
  GET  /api/gov/analytics/summary            → Dashboard KPIs for City Engineer
  GET  /api/gov/analytics/clusters           → All infrastructure stress zones
  GET  /api/gov/analytics/clusters/{id}      → Single cluster with AI narrative
  GET  /api/gov/analytics/heatmap            → Enriched heatmap intelligence data
  GET  /api/gov/analytics/forecast           → Barangay trend projections
  GET  /api/gov/analytics/recurrence         → Chronic infrastructure failures
  POST /api/gov/analytics/narrative          → AI engineering assessment (Gemini)
  POST /api/gov/analytics/estimate           → Auto-BoQ from cluster
  POST /api/gov/analytics/create-procurement → One-click procurement from cluster
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import roles_service
from pydantic import BaseModel
from datetime import datetime
import csv
import io

from database import get_db
from auth import get_current_user
import analytics_service
import gov_crud
import gov_schemas
import gov_models
import models

router = APIRouter(prefix="/api/gov/analytics", tags=["Analytics"])

# Role groups
GOV_ROLES = (
    "city_engineer", "asst_city_engineer", "admin_officer",
    "admin_clerk", "records_officer", "division_chief",
    "division_chief_arch", "division_chief_structural", "division_chief_electrical",
    "design_engineer", "estimator", "cad_operator",
    "project_engineer", "construction_foreman", "field_worker",
    "building_inspector", "electrical_inspector", "mechanical_inspector",
    "dispatcher", "manager", "system_admin",
)
SENIOR_ROLES = (
    "city_engineer", "asst_city_engineer", "admin_officer",
    "division_chief", "division_chief_arch", "division_chief_structural", "division_chief_electrical",
    "manager", "system_admin",
)

ANALYTICS_VIEW_ROLES = set(GOV_ROLES) - {"field_worker"}
ANALYTICS_REVIEW_ROLES = set(SENIOR_ROLES) | {"project_engineer", "design_engineer"}
ANALYTICS_EXPORT_ROLES = (set(SENIOR_ROLES) - {"system_admin"}) | {"records_officer"}
PROCUREMENT_DRAFT_ROLES = {"city_engineer", "manager", "admin_officer", "estimator", "project_engineer"}
REPORT_DETAIL_ROLES = {"city_engineer", "asst_city_engineer", "manager", "dispatcher", "project_engineer"}


def _assert_permission(user, db, module, action):
    """Check the requested operation, not merely membership in a broad staff list."""
    if not isinstance(user, models.Official):
        raise HTTPException(status_code=403, detail="Government capability required")
    role_matrix = {
        ("analytics", "view"): ANALYTICS_VIEW_ROLES,
        ("analytics", "narrative"): ANALYTICS_REVIEW_ROLES,
        ("analytics", "export"): ANALYTICS_EXPORT_ROLES,
        ("procurement", "manage"): PROCUREMENT_DRAFT_ROLES,
        ("reports", "detail"): REPORT_DETAIL_ROLES,
    }
    allowed = role_matrix.get((module, action), set())
    if user.role not in allowed and not roles_service.has_permission(db, user, module, action):
        raise HTTPException(status_code=403, detail=f"User lacks required capability: {module}:{action}")


# ─────────────────────────────────────────────────────────────────────────────
# Summary KPIs
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/summary")
def analytics_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Aggregated analytics KPIs.
    """
    try:
        _assert_permission(current_user, db, "analytics", "view")
        return analytics_service.get_analytics_summary(db)
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Analytics summary error: {e}")
        raise HTTPException(status_code=500, detail="Analytics summary unavailable")


# ─────────────────────────────────────────────────────────────────────────────
# Spatial Clusters (Infrastructure Stress Zones)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/stress-zones")
def list_stress_zones(
    category: Optional[str] = Query(None, description="Filter by infrastructure category"),
    days_back: int = Query(90, ge=7, le=365, description="Lookback window in days"),
    min_points: int = Query(analytics_service.DEFAULT_DBSCAN_MIN_POINTS, ge=2, le=20, description="Minimum reports to form a cluster"),
    eps: float = Query(analytics_service.DEFAULT_DBSCAN_EPS_METERS, ge=10, le=2000, description="Clustering radius in meters"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Run DBSCAN spatial clustering on active reports to detect stress zones.
    Powered by PostgreSQL PostGIS ST_ClusterDBSCAN (units: meters).
    """
    _assert_permission(current_user, db, "analytics", "view")
    clusters = analytics_service.get_infrastructure_clusters(
        db,
        category_filter=category,
        days_back=days_back,
        min_samples=min_points,
        radius_meters=eps,
    )
    return {"clusters": clusters, "count": len(clusters), "eps": eps, "min_points": min_points}


@router.get("/clusters")
def list_clusters(
    category: Optional[str] = Query(None, description="Filter by infrastructure category"),
    days_back: int = Query(90, ge=7, le=365, description="Lookback window in days"),
    min_reports: Optional[int] = Query(None, ge=2, le=20, description="Minimum reports to form a cluster"),
    radius_m: Optional[float] = Query(None, ge=10, le=2000, description="Clustering radius in meters"),
    min_points: Optional[int] = Query(None, ge=2, le=20, description="Alias for min_reports"),
    eps: Optional[float] = Query(None, ge=10, le=2000, description="Alias for radius_m"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Run DBSCAN spatial clustering on active reports.
    Returns infrastructure stress zones with threat classification,
    estimated costs, and barangay mapping.
    """
    _assert_permission(current_user, db, "analytics", "view")
    effective_min_points = min_points or min_reports or analytics_service.DEFAULT_DBSCAN_MIN_POINTS
    effective_eps = eps or radius_m or analytics_service.DEFAULT_DBSCAN_EPS_METERS
    clusters = analytics_service.get_infrastructure_clusters(
        db,
        category_filter=category,
        days_back=days_back,
        min_samples=effective_min_points,
        radius_meters=effective_eps,
    )
    return {"clusters": clusters, "count": len(clusters), "eps": effective_eps, "min_points": effective_min_points}


@router.get("/clusters/{cluster_id}")
def get_cluster_detail(
    cluster_id: int,
    days_back: int = Query(90),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single cluster by ID with full report list and BoQ estimate."""
    _assert_permission(current_user, db, "analytics", "view")
    clusters = analytics_service.get_infrastructure_clusters(db, days_back=days_back)
    cluster = next((c for c in clusters if c["cluster_id"] == cluster_id), None)
    if not cluster:
        raise HTTPException(status_code=404, detail=f"Cluster {cluster_id} not found")
    boq = analytics_service.generate_boq_from_cluster(cluster)
    return {**cluster, "boq": boq}


# ─────────────────────────────────────────────────────────────────────────────
# Heatmap Intelligence
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/heatmap")
def heatmap_intelligence(
    days_back: int = Query(90, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns enriched heatmap data:
    - raw_points: each report coord with weight, threat level, cluster_id
    - clusters: circle overlay data with threat classification
    - summary: KPI counts for header
    """
    _assert_permission(current_user, db, "analytics", "view")
    return analytics_service.get_heatmap_intelligence(db, days_back=days_back)


# ─────────────────────────────────────────────────────────────────────────────
# Forecast — Weekly Trend Projections
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/forecast")
def get_forecast(
    weeks_back: int = Query(12, ge=4, le=52),
    weeks_forward: int = Query(4, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Weekly report frequency trend per (barangay, category).
    Projects the next N weeks using linear regression.
    Returns EMERGING zones first — these need preemptive action.
    """
    _assert_permission(current_user, db, "analytics", "view")
    return analytics_service.get_forecast(db, weeks_back=weeks_back, weeks_forward=weeks_forward)


# ─────────────────────────────────────────────────────────────────────────────
# Recurrence Tracking
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/recurrence")
def get_recurrence_events(
    days_window: int = Query(90, ge=30, le=365),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Chronic infrastructure failure detection.
    Returns locations where repairs failed to resolve the root cause.
    These indicate systemic structural failure requiring escalated budget.
    """
    _assert_permission(current_user, db, "analytics", "narrative")
    events = analytics_service.get_recurrence_events(db, days_window=days_window)
    return {
        "recurrence_events": events,
        "count": len(events),
        "chronic_flag": len(events) > 5,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Live Citizen Reports Feed (with full location strings)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/reports")
def get_analytics_reports(
    days_back: int = Query(90, ge=7, le=365, description="Lookback window in days"),
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    barangay: Optional[str] = Query(None, description="Filter by barangay number"),
    limit: int = Query(200, ge=10, le=500),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Live citizen report feed for the Analytics Command Center.
    Returns real reports with full location strings (not raw lat/lng),
    urgency, category, status, and thumbnail for the Live Reports tab.
    Excludes cancelled, rejected, and spam reports.
    """
    from datetime import datetime, timedelta, timezone
    import re as re_module

    _assert_permission(current_user, db, "reports", "detail")

    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days_back)
    q = db.query(models.Report).filter(
        models.Report.created_at >= since,
        models.Report.status.notin_(["cancelled", "rejected", "spam"]),
    )
    if status:
        q = q.filter(models.Report.status == status)
    if category:
        clean_cat = category.replace('_', '%')
        q = q.filter(models.Report.category.ilike(f"%{clean_cat}%"))

    reports = q.order_by(models.Report.created_at.desc()).limit(limit).all()

    # Optional barangay digit filter
    def _brgy_digits(s):
        m = re_module.search(r'(\d+)', str(s or ''))
        return m.group(1) if m else None

    if barangay:
        target_digits = _brgy_digits(barangay)
        if target_digits:
            reports = [r for r in reports
                       if _brgy_digits(r.location_barangay) == target_digits]

    result = []
    for r in reports:
        # Build a human-readable full location (never raw lat/lng)
        loc_parts = []
        if r.location_string and not r.location_string.startswith("Lat:"):
            loc_parts.append(r.location_string)
        elif r.location_barangay:
            loc_parts.append(f"Barangay {r.location_barangay}, Caloocan City")
        else:
            loc_parts.append("Caloocan City (location unspecified)")

        full_location = loc_parts[0] if loc_parts else "Unknown Location"

        # Reporter name (anonymize if resident)
        reporter_name = "Anonymous"
        if hasattr(r, "reporter") and r.reporter:
            reporter_name = getattr(r.reporter, "full_name", None) or "Anonymous"

        canonical_ticket_id = r.ticket_id or f"PUL-2026-{r.id:04d}"
        result.append({
            "id": r.id,
            "ticket_id": canonical_ticket_id,
            "report_id": canonical_ticket_id,
            "category": r.ai_category or r.category or "infrastructure",
            "description": r.description or "",
            "status": r.status,
            "urgency": r.ai_urgency or "Medium",
            "full_location": full_location,
            "location_barangay": analytics_service._resolve_barangay(r),
            "location_lat": r.location_lat,
            "location_lng": r.location_lng,
            "image_url": r.image_url or None,
            "reporter_name": reporter_name,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        })

    return {
        "reports": result,
        "count": len(result),
        "days_back": days_back,
    }


# ─────────────────────────────────────────────────────────────────────────────
# AI Narrative Generation
# ─────────────────────────────────────────────────────────────────────────────

class NarrativeRequest(BaseModel):
    cluster_id: int
    days_back: int = 90


@router.post("/narrative")
def generate_narrative(
    req: NarrativeRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Trigger Gemini to generate a formal engineering assessment narrative
    for a specific infrastructure stress zone.
    Output is suitable for BAC submission and Sanggunian budget hearings.
    Requires: City Engineer, Division Chief, or Senior roles.
    """
    _assert_permission(current_user, db, "analytics", "narrative")
    clusters = analytics_service.get_infrastructure_clusters(db, days_back=req.days_back)
    cluster = next((c for c in clusters if c["cluster_id"] == req.cluster_id), None)
    if not cluster:
        raise HTTPException(status_code=404, detail=f"Cluster {req.cluster_id} not found")

    narrative = analytics_service.generate_cluster_narrative(cluster)
    if not narrative:
        raise HTTPException(status_code=503, detail="AI narrative generation failed. Check Gemini service connectivity.")

    boq = analytics_service.generate_boq_from_cluster(cluster)

    return {
        "cluster_id": req.cluster_id,
        "barangay": cluster["barangay"],
        "threat_level": cluster["threat_level"],
        "narrative": narrative,
        "boq": boq,
        "generated_by": current_user.full_name,
        "generated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Budget Estimation
# ─────────────────────────────────────────────────────────────────────────────

class EstimateRequest(BaseModel):
    cluster_id: int
    days_back: int = 90


@router.post("/estimate")
def estimate_budget(
    req: EstimateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Generate a Bill of Quantities (BoQ) estimate from a spatial cluster.
    Uses DPWH 2024 Unit Price Guide, Region 3.
    """
    _assert_permission(current_user, db, "analytics", "view")
    clusters = analytics_service.get_infrastructure_clusters(db, days_back=req.days_back)
    cluster = next((c for c in clusters if c["cluster_id"] == req.cluster_id), None)
    if not cluster:
        raise HTTPException(status_code=404, detail=f"Cluster {req.cluster_id} not found")
    return analytics_service.generate_boq_from_cluster(cluster)


# ─────────────────────────────────────────────────────────────────────────────
# One-Click Procurement Creation from Cluster
# ─────────────────────────────────────────────────────────────────────────────

class CreateProcurementRequest(BaseModel):
    cluster_id: int
    days_back: int = 90
    narrative: Optional[str] = None  # Pre-generated narrative to embed in title/notes


@router.post("/create-procurement")
def create_procurement_from_cluster(
    req: CreateProcurementRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    One-click creation of a Procurement Request pre-filled from cluster analytics.
    Creates a ProcurementRequest in 'draft' status with auto-generated BoQ items.
    Requires: Estimator, Project Engineer, Admin Officer, or higher.
    """
    _assert_permission(current_user, db, "procurement", "manage")

    clusters = analytics_service.get_infrastructure_clusters(db, days_back=req.days_back)
    cluster = next((c for c in clusters if c["cluster_id"] == req.cluster_id), None)
    if not cluster:
        raise HTTPException(status_code=404, detail=f"Cluster {req.cluster_id} not found")

    boq = analytics_service.generate_boq_from_cluster(cluster)
    cat_title = cluster["dominant_category"].replace("_", " ").title()

    # Build BoQ items using the BoQItemCreate schema
    boq_items = [
        gov_schemas.BoQItemCreate(
            item_name=item["description"],
            quantity=float(item["quantity"]),
            unit=item["unit"],
            unit_cost=float(item["unit_cost"]),
            specifications=f"Cluster {cluster['cluster_id']} — AI-estimated per DPWH 2024 Unit Price Guide",
        )
        for item in boq["boq_items"]
    ]

    purpose = (
        req.narrative
        or f"Infrastructure stress zone detected by PULSO Analytics Engine. "
           f"Cluster of {cluster['report_count']} verified citizen reports within "
           f"{cluster['radius_meters']:.0f}m radius of Barangay {cluster['barangay']}. "
           f"Threat Level: {cluster['threat_level']}. "
           f"Recurrence Rate: {cluster['recurrence_score']*100:.1f}%. "
           f"Scope: {cat_title} rehabilitation. "
           f"Estimate per DPWH 2024 Unit Price Guide, Region 3."
    )

    pr_data = gov_schemas.ProcurementRequestCreate(
        title=f"[Analytics] {cat_title} Rehabilitation — Barangay {cluster['barangay']}",
        purpose=purpose,
        work_order_id=None,
        project_id=None,
        items=boq_items,
    )

    pr = gov_crud.create_procurement_request(
        db, pr_data,
        actor_id=current_user.id,
        actor_role=current_user.role,
    )

    enriched = gov_crud.enrich_procurement(pr, db)
    return {
        "message": "Procurement Request created successfully from analytics cluster.",
        "procurement_id": pr.id,
        "pr_number": pr.pr_number,
        "cluster_id": cluster["cluster_id"],
        "boq_summary": boq,
    }


# ─────────────────────────────────────────────────────────────────────────────
# CSV Export Endpoints
# ─────────────────────────────────────────────────────────────────────────────

def _safe_csv_cell(value):
    if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


class _SafeCSVWriter:
    def __init__(self, output):
        self.writer = csv.writer(output)

    def writerow(self, row):
        self.writer.writerow([_safe_csv_cell(value) for value in row])


def _csv_response(rows: list, headers: list, filename: str) -> StreamingResponse:
    """Helper to build a streaming CSV response."""
    buf = io.StringIO()
    writer = _SafeCSVWriter(buf)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/clusters")
def export_clusters_csv(
    days_back: int = Query(90),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Export infrastructure stress zones as CSV."""
    _assert_permission(current_user, db, "analytics", "export")
    clusters = analytics_service.get_infrastructure_clusters(db, days_back=days_back)
    headers = [
        "Cluster ID", "Barangay", "Category", "Threat Level",
        "Reports", "Severity Score", "Recurrence %", "Radius (m)",
        "Estimated Cost", "Lat", "Lng",
    ]
    rows = []
    for c in clusters:
        rows.append([
            c["cluster_id"], c["barangay"], c["dominant_category"],
            c["threat_level"], c["report_count"],
            c["severity_score"], f'{c["recurrence_score"]*100:.1f}%',
            f'{c["radius_meters"]:.0f}', c["estimated_cost_formatted"],
            f'{c["centroid_lat"]:.6f}', f'{c["centroid_lng"]:.6f}',
        ])
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M")
    return _csv_response(rows, headers, f"PULSO_StressZones_{ts}.csv")


@router.get("/export/forecast")
def export_forecast_csv(
    weeks_back: int = Query(12),
    weeks_forward: int = Query(4),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Export forecast trends as CSV."""
    _assert_permission(current_user, db, "analytics", "export")
    forecast = analytics_service.get_forecast(db, weeks_back=weeks_back, weeks_forward=weeks_forward)
    headers = [
        "Barangay", "Category", "Status", "Total Reports",
        "Growth %", "Projected 4-Week Total",
    ]
    rows = []
    for f in forecast:
        rows.append([
            f["barangay"], f["category"], f["status"],
            f["total_reports"], f'{f["growth_pct"]:+.1f}%',
            f'{f["projected_4wk_total"]:.1f}',
        ])
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M")
    return _csv_response(rows, headers, f"PULSO_Forecast_{ts}.csv")


@router.get("/export/recurrence")
def export_recurrence_csv(
    days_window: int = Query(90),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Export chronic failure recurrence events as CSV."""
    _assert_permission(current_user, db, "analytics", "export")
    events = analytics_service.get_recurrence_events(db, days_window=days_window)
    headers = [
        "Prior Report ID", "New Report ID", "Category", "Location",
        "Distance (m)", "Days Since Repair", "Severity",
    ]
    rows = []
    for r in events:
        rows.append([
            r["prior_report_id"], r["new_report_id"], r["category"],
            r["location_string"] or "", r["distance_meters"],
            r["days_since_resolved"] or "—", r["severity"],
        ])
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M")
    return _csv_response(rows, headers, f"PULSO_Recurrence_{ts}.csv")


@router.get("/export/full-report")
def export_full_report_csv(
    days_back: int = Query(90),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Combined analytics export — summary KPIs + clusters + forecast + recurrence in one CSV."""
    _assert_permission(current_user, db, "analytics", "export")

    summary = analytics_service.get_analytics_summary(db)
    clusters = analytics_service.get_infrastructure_clusters(db, days_back=days_back)
    forecast = analytics_service.get_forecast(db)
    recurrence = analytics_service.get_recurrence_events(db, days_window=days_back)

    buf = io.StringIO()
    writer = _SafeCSVWriter(buf)

    # Section 1 — Summary KPIs
    writer.writerow(["=== PULSO ANALYTICS REPORT ==="])
    writer.writerow(["Generated", datetime.utcnow().isoformat()])
    writer.writerow(["Window", f"Last {days_back} days"])
    writer.writerow([])
    writer.writerow(["--- SUMMARY KPIs ---"])
    for key in ["total_reports", "total_clusters", "critical_zones", "high_zones",
                 "emerging_zones", "resolution_rate_pct", "total_budget_exposure",
                 "chronic_recurrence_events"]:
        writer.writerow([key.replace("_", " ").title(), summary.get(key, "—")])
    writer.writerow([])

    # Section 2 — Stress Zones
    writer.writerow(["--- INFRASTRUCTURE STRESS ZONES ---"])
    writer.writerow(["ID", "Barangay", "Category", "Threat", "Reports",
                     "Severity", "Recurrence %", "Radius (m)", "Est. Cost"])
    for c in clusters:
        writer.writerow([
            c["cluster_id"], c["barangay"], c["dominant_category"],
            c["threat_level"], c["report_count"], c["severity_score"],
            f'{c["recurrence_score"]*100:.1f}%', f'{c["radius_meters"]:.0f}',
            c["estimated_cost_formatted"],
        ])
    writer.writerow([])

    # Section 3 — Forecast
    writer.writerow(["--- FORECAST TRENDS ---"])
    writer.writerow(["Barangay", "Category", "Status", "Total", "Growth %", "4-Week Projected"])
    for f in forecast:
        writer.writerow([
            f["barangay"], f["category"], f["status"], f["total_reports"],
            f'{f["growth_pct"]:+.1f}%', f'{f["projected_4wk_total"]:.1f}',
        ])
    writer.writerow([])

    # Section 4 — Recurrence
    writer.writerow(["--- CHRONIC RECURRENCE EVENTS ---"])
    writer.writerow(["Prior ID", "New ID", "Category", "Location", "Distance (m)", "Days Since Repair", "Severity"])
    for r in recurrence:
        writer.writerow([
            r["prior_report_id"], r["new_report_id"], r["category"],
            r["location_string"] or "", r["distance_meters"],
            r["days_since_resolved"] or "—", r["severity"],
        ])

    buf.seek(0)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M")
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=PULSO_FullReport_{ts}.csv"},
    )
