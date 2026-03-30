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

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
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
    "design_engineer", "estimator", "cad_operator",
    "project_engineer", "construction_foreman", "field_worker",
    "building_inspector", "electrical_inspector", "mechanical_inspector",
    "dispatcher", "manager", "system_admin",
)
SENIOR_ROLES = (
    "city_engineer", "asst_city_engineer", "admin_officer",
    "division_chief", "manager", "system_admin",
)


def _assert_role(user, *allowed):
    if user.role not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{user.role}' not authorized. Requires: {list(allowed)}"
        )


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
    _assert_role(current_user, *GOV_ROLES)
    return analytics_service.get_analytics_summary(db)


# ─────────────────────────────────────────────────────────────────────────────
# Spatial Clusters (Infrastructure Stress Zones)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/clusters")
def list_clusters(
    category: Optional[str] = Query(None, description="Filter by infrastructure category"),
    days_back: int = Query(90, ge=7, le=365, description="Lookback window in days"),
    min_reports: int = Query(3, ge=2, le=20, description="Minimum reports to form a cluster"),
    radius_m: float = Query(200.0, ge=50, le=1000, description="Clustering radius in meters"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Run DBSCAN spatial clustering on active reports.
    Returns infrastructure stress zones with threat classification,
    estimated costs, and barangay mapping.
    """
    _assert_role(current_user, *GOV_ROLES)
    clusters = analytics_service.get_infrastructure_clusters(
        db,
        category_filter=category,
        days_back=days_back,
        min_samples=min_reports,
        radius_meters=radius_m,
    )
    return {"clusters": clusters, "count": len(clusters)}


@router.get("/clusters/{cluster_id}")
def get_cluster_detail(
    cluster_id: int,
    days_back: int = Query(90),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get a single cluster by ID with full report list and BoQ estimate."""
    _assert_role(current_user, *GOV_ROLES)
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
    _assert_role(current_user, *GOV_ROLES)
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
    _assert_role(current_user, *GOV_ROLES)
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
    _assert_role(current_user, *SENIOR_ROLES)
    events = analytics_service.get_recurrence_events(db, days_window=days_window)
    return {
        "recurrence_events": events,
        "count": len(events),
        "chronic_flag": len(events) > 5,
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
    _assert_role(current_user, *SENIOR_ROLES)
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
    _assert_role(current_user, *GOV_ROLES)
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
    allowed = ("project_engineer", "admin_officer", "estimator",
               "city_engineer", "asst_city_engineer", "manager", "system_admin")
    _assert_role(current_user, *allowed)

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

def _csv_response(rows: list, headers: list, filename: str) -> StreamingResponse:
    """Helper to build a streaming CSV response."""
    buf = io.StringIO()
    writer = csv.writer(buf)
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
    _assert_role(current_user, *GOV_ROLES)
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
    _assert_role(current_user, *GOV_ROLES)
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
    _assert_role(current_user, *SENIOR_ROLES)
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
    _assert_role(current_user, *SENIOR_ROLES)

    summary = analytics_service.get_analytics_summary(db)
    clusters = analytics_service.get_infrastructure_clusters(db, days_back=days_back)
    forecast = analytics_service.get_forecast(db)
    recurrence = analytics_service.get_recurrence_events(db, days_window=days_back)

    buf = io.StringIO()
    writer = csv.writer(buf)

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
