"""
analytics_service.py — PULSO Spatial Intelligence Engine
City Engineering Office, Caloocan City

Converts raw citizen reports into government-actionable intelligence:
  - DBSCAN spatial clustering → Infrastructure Stress Zones
  - Threat classification (CRITICAL / HIGH / EMERGING / MONITORING)
  - Cost estimation per DPWH 2024 Unit Price Guide, Region 3
  - Weekly trend forecasting per barangay + category
  - 90-day recurrence tracking for chronic infrastructure failures
"""

import math
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from collections import defaultdict

import numpy as np
from sklearn.cluster import DBSCAN
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

import models
import gov_models

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Constants — DPWH 2024 Unit Price Guide, Region 3 (NCR-Adjacent)
# ─────────────────────────────────────────────────────────────────────────────

COST_MODEL: Dict[str, Dict] = {
    "pothole":            {"unit": "sqm",    "cost": 12_500,  "coverage_ratio": 0.15},
    "road_damage":        {"unit": "sqm",    "cost": 28_000,  "coverage_ratio": 0.35},
    "road_overlay":       {"unit": "sqm",    "cost": 28_000,  "coverage_ratio": 0.40},
    "drainage":           {"unit": "lin_m",  "cost": 45_000,  "coverage_ratio": 0.60,  "linear": True},
    "drainage_clearing":  {"unit": "lin_m",  "cost":  8_500,  "coverage_ratio": 0.80,  "linear": True},
    "flooding":           {"unit": "sqm",    "cost": 95_000,  "coverage_ratio": 0.25},
    "streetlight":        {"unit": "unit",   "cost": 85_000,  "items_per_100m": 3},
    "electrical":         {"unit": "unit",   "cost": 85_000,  "items_per_100m": 3},
    "sidewalk":           {"unit": "sqm",    "cost":  6_500,  "coverage_ratio": 0.30},
    "structural":         {"unit": "sqm",    "cost": 65_000,  "coverage_ratio": 0.20},
    "garbage":            {"unit": "trip",   "cost": 12_000,  "items_per_100m": 2},
    "tree_hazard":        {"unit": "unit",   "cost": 15_000,  "items_per_100m": 1},
    "default":            {"unit": "sqm",    "cost": 20_000,  "coverage_ratio": 0.20},
}

# AI urgency → numeric weight
URGENCY_WEIGHTS = {"Critical": 3, "High": 2, "Medium": 1, "Low": 0.5}

# Threat level thresholds
THREAT_THRESHOLDS = {
    "CRITICAL":   {"severity": 20, "recurrence": 0.60},
    "HIGH":       {"severity": 10, "count": 8},
    "EMERGING":   {"growth_rate": 0.30},
    "MONITORING": {},                              # fallback
}

# Caloocan barangay bounds (North Caloocan)
CALOOCAN_CENTER_LAT = 14.749  # rough center for fallback
CALOOCAN_CENTER_LNG = 120.983


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Haversine distance in meters between two GPS points."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _match_cost_key(category: str) -> str:
    """Map AI category strings to cost model keys."""
    cat = (category or "").lower()
    for key in COST_MODEL:
        if key in cat:
            return key
    return "default"


def _estimate_cost(category: str, radius_m: float, report_count: int) -> float:
    """
    Estimate rehabilitation cost for a cluster.
    Uses DPWH 2024 unit prices with area/linear/unit methods.
    """
    key = _match_cost_key(category)
    model = COST_MODEL.get(key, COST_MODEL["default"])
    unit_cost = model["cost"]

    if model["unit"] == "unit":
        # Count-based items (streetlights, trees)
        per_100m = model.get("items_per_100m", 1)
        circumference = 2 * math.pi * radius_m
        items = max(report_count, int((circumference / 100) * per_100m))
        scope = items
    elif model.get("linear"):
        # Linear meter items (drainage)
        scope = max(radius_m * 2, report_count * 15)   # min 2×radius linear meters
    else:
        # Area-based items
        area_sqm = math.pi * radius_m ** 2
        coverage = model.get("coverage_ratio", 0.20)
        scope = area_sqm * coverage

    subtotal = scope * unit_cost
    contingency = subtotal * 0.12          # 12% contingency per GPPB guidelines
    engineering  = subtotal * 0.08         # 8% engineering/overhead
    return round(subtotal + contingency + engineering, 2)


def _classify_threat(severity_score: float, recurrence_score: float,
                     report_count: int, growth_rate: float) -> str:
    if severity_score > THREAT_THRESHOLDS["CRITICAL"]["severity"] or \
       recurrence_score > THREAT_THRESHOLDS["CRITICAL"]["recurrence"]:
        return "CRITICAL"
    if severity_score > THREAT_THRESHOLDS["HIGH"]["severity"] or \
       report_count > THREAT_THRESHOLDS["HIGH"]["count"]:
        return "HIGH"
    if growth_rate > THREAT_THRESHOLDS["EMERGING"]["growth_rate"]:
        return "EMERGING"
    return "MONITORING"


# ─────────────────────────────────────────────────────────────────────────────
# Core: Spatial Clustering
# ─────────────────────────────────────────────────────────────────────────────

def get_infrastructure_clusters(
    db: Session,
    category_filter: Optional[str] = None,
    days_back: int = 90,
    min_samples: int = 3,
    radius_meters: float = 200.0,
) -> List[Dict[str, Any]]:
    """
    DBSCAN clustering of georeferenced citizen reports.

    Returns a list of infrastructure stress zone clusters, each with:
      - centroid, radius, report_ids, threat_level, severity_score,
        recurrence_score, estimated_cost, dominant_category, ai_summary stub
    """
    since = datetime.now(timezone.utc) - timedelta(days=days_back)

    q = db.query(models.Report).options(joinedload(models.Report.reporter)).filter(
        models.Report.location_lat.isnot(None),
        models.Report.location_lng.isnot(None),
        models.Report.created_at >= since,
        models.Report.status.notin_(["rejected", "spam", "cancelled"]),
    )
    if category_filter:
        q = q.filter(models.Report.category.ilike(f"%{category_filter}%"))

    reports = q.all()
    if len(reports) < min_samples:
        return []

    coords = np.array([[r.location_lat, r.location_lng] for r in reports])
    # Convert radius from meters to radians for haversine DBSCAN
    eps_rad = radius_meters / 6_371_000
    db_model = DBSCAN(eps=eps_rad, min_samples=min_samples, algorithm="ball_tree", metric="haversine")
    labels = db_model.fit_predict(np.radians(coords))

    # Build cluster groups
    label_map: Dict[int, List[models.Report]] = defaultdict(list)
    for report, label in zip(reports, labels):
        if label >= 0:   # -1 = noise/outlier
            label_map[label].append(report)

    clusters = []
    for label, group in label_map.items():
        lats = [r.location_lat for r in group]
        lngs = [r.location_lng for r in group]
        centroid_lat = float(np.mean(lats))
        centroid_lng = float(np.mean(lngs))

        # Cluster radius = max distance from centroid to any member
        radii = [_haversine_meters(centroid_lat, centroid_lng, r.location_lat, r.location_lng)
                 for r in group]
        cluster_radius = max(max(radii), radius_meters / 4)  # minimum visible radius

        # Severity score — weighted AI urgency sum
        severity_score = 0.0
        urgency_breakdown = defaultdict(int)
        categories = []
        for r in group:
            urgency = getattr(r, "ai_urgency", "Medium") or "Medium"
            severity_score += URGENCY_WEIGHTS.get(urgency, 1)
            urgency_breakdown[urgency] += 1
            categories.append(r.category or "infrastructure")

        # Dominant category
        cat_counts = defaultdict(int)
        for c in categories:
            cat_counts[c.lower()] += 1
        dominant_category = max(cat_counts, key=cat_counts.get)

        # Recurrence score — resolved reports of same category near the centroid
        resolved_ids = {
            res.id for res in db.query(models.Report).filter(
                models.Report.status == "resolved",
                models.Report.location_lat.isnot(None),
                models.Report.category == dominant_category
            ).all()
            if _haversine_meters(res.location_lat, res.location_lng, centroid_lat, centroid_lng) <= cluster_radius
        }

        # Recurrence score capped at 100% based on active group size
        recurrence_score = min(1.0, len(resolved_ids) / max(len(group), 1))

        # Weekly growth rate (compare last 2 weeks)
        now_utc = datetime.now(timezone.utc)
        two_weeks_ago = now_utc - timedelta(days=14)
        one_week_ago  = now_utc - timedelta(days=7)
        
        week1, week2 = 0, 0
        for r in group:
            try:
                # Ensure r.created_at is aware for comparison
                rcat = r.created_at
                if rcat and rcat.tzinfo is None:
                    rcat = rcat.replace(tzinfo=timezone.utc)
                
                if rcat:
                    if rcat < one_week_ago and rcat >= two_weeks_ago:
                        week1 += 1
                    elif rcat >= one_week_ago:
                        week2 += 1
            except Exception as e:
                logger.error(f"Date comparison failed for report {r.id}: {e}")
                continue

        growth_rate = ((week2 - week1) / max(week1, 1)) if week1 > 0 else 0.5

        threat_level = _classify_threat(severity_score, recurrence_score, len(group), growth_rate)
        estimated_cost = _estimate_cost(dominant_category, cluster_radius, len(group))

        # Barangay extraction (Prioritize official reporter barangay, fallback to regex)
        barangays = []
        for r in group:
            b = getattr(r, "barangay", None)
            if not b and r.reporter:
                b = r.reporter.barangay
            if not b:
                b = _extract_barangay(r.location_string)
            
            # Clean up: ensure only the number remains
            if b:
                import re
                nums = re.findall(r"\d+", str(b))
                b = nums[0] if nums else str(b)
            barangays.append(b)
        barangay_counts = defaultdict(int)
        for b in barangays:
            if b:
                barangay_counts[b] += 1
        dominant_barangay = max(barangay_counts, key=barangay_counts.get) if barangay_counts else "Unknown"

        # Sample report descriptions for AI prompt
        sample_descriptions = [
            (r.description or "")[:200]
            for r in group[:5]
            if r.description
        ]

        clusters.append({
            "cluster_id": int(label),
            "centroid_lat": centroid_lat,
            "centroid_lng": centroid_lng,
            "radius_meters": round(cluster_radius, 1),
            "report_count": len(group),
            "report_ids": [r.id for r in group],
            "dominant_category": dominant_category,
            "categories": dict(cat_counts),
            "threat_level": threat_level,
            "severity_score": round(severity_score, 2),
            "recurrence_score": round(recurrence_score, 2),
            "growth_rate": round(growth_rate, 2),
            "estimated_cost": estimated_cost,
            "estimated_cost_formatted": f"₱{estimated_cost/1_000_000_000:,.1f}B" if estimated_cost >= 1_000_000_000 else f"₱{estimated_cost/1_000_000:,.1f}M",
            "cost_unit": COST_MODEL.get(_match_cost_key(dominant_category), COST_MODEL["default"])["unit"],
            "barangay": dominant_barangay,
            "urgency_breakdown": dict(urgency_breakdown),
            "sample_descriptions": sample_descriptions,
            "days_window": days_back,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Sort by threat priority
    threat_order = {"CRITICAL": 0, "HIGH": 1, "EMERGING": 2, "MONITORING": 3}
    clusters.sort(key=lambda c: (threat_order.get(c["threat_level"], 4), -c["severity_score"]))
    return clusters


def _extract_barangay(location_string: Optional[str]) -> Optional[str]:
    """Extract barangay number from a location string like 'Brgy 176, Caloocan'."""
    if not location_string:
        return None
    import re
    # Match various formats: Brgy 176, Barangay 176, Bgy 176, or just 176 (if it looks like a Caloocan North brgy number)
    # Using \b for word boundary instead of variable-width look-behind
    m = re.search(r"(?:[Bb]r(?:gy?|arangay)\.?\s*|\b)((?:16[5-9]|17\d|18[0-8]))(?:\b|$)", location_string)
    return m.group(1) if m else None


# ─────────────────────────────────────────────────────────────────────────────
# Forecast: Weekly Trend per Barangay × Category
# ─────────────────────────────────────────────────────────────────────────────

def get_forecast(db: Session, weeks_back: int = 12, weeks_forward: int = 4) -> List[Dict]:
    """
    Compute weekly report frequency per (barangay, category) pair.
    Fits a linear trend and projects the next N weeks.
    Returns sorted by projected urgency (highest first).
    """
    since = datetime.now(timezone.utc) - timedelta(weeks=weeks_back)
    reports = db.query(models.Report).options(joinedload(models.Report.reporter)).filter(
        models.Report.created_at >= since,
        models.Report.status.notin_(["rejected", "spam", "cancelled"]),
    ).all()

    # Bucket into (barangay, category, week_number)
    buckets: Dict[tuple, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
    week_zero = since.date()

    for r in reports:
        if not r.created_at:
            continue
        barangay = getattr(r, "barangay", None)
        if not barangay and r.reporter:
            barangay = r.reporter.barangay
        if not barangay:
            barangay = _extract_barangay(r.location_string) or "Unknown"
        
        # Clean to just number
        if barangay != "Unknown":
            import re
            nums = re.findall(r"\d+", str(barangay))
            barangay = nums[0] if nums else str(barangay)
        category = (r.category or "infrastructure").lower()
        week_num = (r.created_at.date() - week_zero).days // 7
        buckets[(barangay, category)][week_num] += 1

    results = []
    for (barangay, category), week_data in buckets.items():
        if sum(week_data.values()) < 3:
            continue   # skip very sparse pairs

        x = np.array(list(week_data.keys()), dtype=float)
        y = np.array(list(week_data.values()), dtype=float)

        # Linear regression
        if len(x) >= 2:
            coeffs = np.polyfit(x, y, 1)
            slope, intercept = coeffs
        else:
            slope, intercept = 0, float(y.mean())

        # Current week index
        current_week = (datetime.now(timezone.utc).date() - week_zero).days // 7

        # Historical series (fill missing weeks with 0)
        history = [{"week": int(w), "count": int(week_data.get(w, 0))}
                   for w in range(int(x.min()), current_week + 1)]

        # Forecast series
        forecast = []
        for fw in range(1, weeks_forward + 1):
            projected = max(0, slope * (current_week + fw) + intercept)
            forecast.append({
                "week_offset": fw,
                "projected_count": round(float(projected), 1),
                "week_label": (datetime.now(timezone.utc) + timedelta(weeks=fw)).strftime("Week of %b %d"),
            })

        # Growth classification
        recent_avg = float(np.mean([week_data.get(w, 0) for w in range(max(0, current_week - 3), current_week + 1)]))
        prev_avg   = float(np.mean([week_data.get(w, 0) for w in range(max(0, current_week - 7), current_week - 3)]))
        growth_pct = ((recent_avg - prev_avg) / max(prev_avg, 0.1)) * 100

        total_projected = sum(f["projected_count"] for f in forecast)

        status = (
            "EMERGING"   if growth_pct > 30 and total_projected > 10 else
            "STABLE"     if abs(growth_pct) <= 15 else
            "DECLINING"  if growth_pct < -15 else
            "WATCH"
        )

        results.append({
            "barangay": barangay,
            "category": category,
            "total_reports": int(sum(week_data.values())),
            "growth_pct": round(growth_pct, 1),
            "slope": round(float(slope), 3),
            "status": status,
            "history": history,
            "forecast": forecast,
            "projected_4wk_total": round(total_projected, 1),
        })

    # Sort: emerging / high growth first
    results.sort(key=lambda r: (-abs(r["growth_pct"]), -r["total_reports"]))
    return results[:50]   # top 50 pairs


# ─────────────────────────────────────────────────────────────────────────────
# Heatmap Intelligence: Enrich raw coordinates with cluster/threat metadata
# ─────────────────────────────────────────────────────────────────────────────

def get_heatmap_intelligence(db: Session, days_back: int = 90) -> Dict[str, Any]:
    """
    Returns two data structures for the frontend:
      1. raw_points — all report coords with weight + threat metadata
      2. clusters   — cluster circle overlays with threat levels
    """
    since = datetime.now(timezone.utc) - timedelta(days=days_back)
    reports = db.query(models.Report).filter(
        models.Report.location_lat.isnot(None),
        models.Report.location_lng.isnot(None),
        models.Report.created_at >= since,
        models.Report.status.notin_(["rejected", "spam", "cancelled"]),
    ).all()

    # Build cluster lookup
    clusters = get_infrastructure_clusters(db, days_back=days_back)
    cluster_lookup: Dict[int, Dict] = {r_id: c for c in clusters for r_id in c["report_ids"]}

    raw_points = []
    urgency_color = {
        "Critical": "#ef4444",
        "High":     "#f97316",
        "Medium":   "#eab308",
        "Low":      "#22c55e",
    }
    threat_weight = {"CRITICAL": 4.0, "HIGH": 2.5, "EMERGING": 1.8, "MONITORING": 1.0}

    for r in reports:
        cluster = cluster_lookup.get(r.id)
        threat = cluster["threat_level"] if cluster else "MONITORING"
        weight = URGENCY_WEIGHTS.get(getattr(r, "ai_urgency", "Medium") or "Medium", 1)
        raw_points.append({
            "lat":       r.location_lat,
            "lng":       r.location_lng,
            "weight":    weight * threat_weight.get(threat, 1.0),
            "threat":    threat,
            "cluster_id": cluster["cluster_id"] if cluster else None,
            "category":  r.category,
            "urgency":   getattr(r, "ai_urgency", "Medium"),
            "color":     urgency_color.get(getattr(r, "ai_urgency", "Medium"), "#94a3b8"),
            "report_id": r.id,
            "status":    r.status,
        })

    return {
        "raw_points": raw_points,
        "clusters": clusters,
        "summary": {
            "total_reports": len(reports),
            "total_clusters": len(clusters),
            "critical_zones": sum(1 for c in clusters if c["threat_level"] == "CRITICAL"),
            "high_zones":     sum(1 for c in clusters if c["threat_level"] == "HIGH"),
            "emerging_zones": sum(1 for c in clusters if c["threat_level"] == "EMERGING"),
            "total_estimated_cost": sum(c["estimated_cost"] for c in clusters),
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# Budget Estimator: Auto-BoQ from Cluster Data
# ─────────────────────────────────────────────────────────────────────────────

def generate_boq_from_cluster(cluster: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a Bill of Quantities (BoQ) draft from cluster analytics data.
    Aligned with DPWH Program of Works (POW) format.
    """
    cat = cluster["dominant_category"]
    key = _match_cost_key(cat)
    model = COST_MODEL.get(key, COST_MODEL["default"])
    radius = cluster["radius_meters"]
    count  = cluster["report_count"]

    # Line item 1: Main rehabilitation work
    if model["unit"] == "unit":
        qty = max(count, int((2 * math.pi * radius / 100) * model.get("items_per_100m", 1)))
    elif model.get("linear"):
        qty = round(max(radius * 2, count * 15), 1)
    else:
        area = math.pi * radius ** 2
        qty = round(area * model.get("coverage_ratio", 0.20), 2)

    direct_cost = round(qty * model["cost"], 2)

    boq_items = [
        {
            "item_no": "1",
            "description": f"Rehabilitation Works — {cat.replace('_', ' ').title()}",
            "quantity": qty,
            "unit": model["unit"],
            "unit_cost": model["cost"],
            "amount": direct_cost,
        },
        {
            "item_no": "2",
            "description": "Mobilization and Demobilization",
            "quantity": 1,
            "unit": "LS",
            "unit_cost": round(direct_cost * 0.05, 2),
            "amount": round(direct_cost * 0.05, 2),
        },
        {
            "item_no": "3",
            "description": "Traffic Management and Safety Barriers",
            "quantity": max(1, int(radius / 50)),
            "unit": "set",
            "unit_cost": 8_500,
            "amount": max(1, int(radius / 50)) * 8_500,
        },
        {
            "item_no": "4",
            "description": "Site Cleanup and Disposal",
            "quantity": 1,
            "unit": "LS",
            "unit_cost": round(direct_cost * 0.03, 2),
            "amount": round(direct_cost * 0.03, 2),
        },
    ]

    subtotal  = sum(i["amount"] for i in boq_items)
    contingency = round(subtotal * 0.12, 2)     # 12% GPPB standard
    engineering = round(subtotal * 0.08, 2)     # 8% overhead/engineering
    total       = round(subtotal + contingency + engineering, 2)

    return {
        "cluster_id": cluster["cluster_id"],
        "barangay": cluster["barangay"],
        "dominant_category": cat,
        "affected_area_sqm": round(math.pi * radius ** 2, 1) if model["unit"] == "sqm" else None,
        "boq_items": boq_items,
        "subtotal": subtotal,
        "contingency_12pct": contingency,
        "engineering_8pct": engineering,
        "total_estimate": total,
        "total_formatted": f"₱{total/1_000_000_000:,.1f}B" if total >= 1_000_000_000 else f"₱{total/1_000_000:,.1f}M",
        "dpwh_reference": "DPWH 2024 Unit Price Guide, Region 3 (NCR-Adjacent)",
        "threat_level": cluster["threat_level"],
        "report_count": cluster["report_count"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Recurrence Tracking
# ─────────────────────────────────────────────────────────────────────────────

def get_recurrence_events(db: Session, days_window: int = 90) -> List[Dict]:
    """
    Find locations where reports were filed after a prior resolution.
    These are chronic infrastructure failures requiring system-level intervention.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days_window)

    # Get all resolved reports with coordinates
    resolved = db.query(models.Report).filter(
        models.Report.status == "resolved",
        models.Report.location_lat.isnot(None),
    ).order_by(models.Report.updated_at.desc()).all()

    # Get new reports since window
    new_reports = db.query(models.Report).options(joinedload(models.Report.reporter)).filter(
        models.Report.created_at >= since,
        models.Report.status.notin_(["resolved", "rejected"]),
        models.Report.location_lat.isnot(None),
    ).all()

    recurrence_events = []
    matched_resolved = set()

    RECURRENCE_RADIUS = 100  # meters — same location threshold

    for new_r in new_reports:
        for res_r in resolved:
            if res_r.id in matched_resolved:
                continue
            dist = _haversine_meters(
                new_r.location_lat, new_r.location_lng,
                res_r.location_lat, res_r.location_lng
            )
            if dist <= RECURRENCE_RADIUS and new_r.category == res_r.category:
                recurrence_events.append({
                    "new_report_id":      new_r.id,
                    "prior_report_id":    res_r.id,
                    "category":           new_r.category,
                    "location_string":    new_r.location_string or res_r.location_string,
                    "lat":                new_r.location_lat,
                    "lng":                new_r.location_lng,
                    "distance_meters":    round(dist, 1),
                    "days_since_resolved": (datetime.now(timezone.utc) - res_r.updated_at).days if res_r.updated_at else None,
                    "barangay":           None,  # placeholder
                    "severity":           "HIGH" if dist < 30 else "MEDIUM",
                    "recommendation":     "Systemic infrastructure failure. Recommend full structural assessment and budget escalation.",
                })
                # Clean barangay number for recurrence event
                b_raw = getattr(new_r, "barangay", None) or (new_r.reporter.barangay if new_r.reporter else None) or _extract_barangay(new_r.location_string)
                if b_raw:
                    import re
                    nums = re.findall(r"\d+", str(b_raw))
                    b_raw = nums[0] if nums else str(b_raw)
                recurrence_events[-1]["barangay"] = b_raw

                matched_resolved.add(res_r.id)
                break

    return sorted(recurrence_events, key=lambda x: x["distance_meters"])


# ─────────────────────────────────────────────────────────────────────────────
# Gemini AI Narrative Generator
# ─────────────────────────────────────────────────────────────────────────────

def build_gemini_cluster_prompt(cluster: Dict[str, Any]) -> str:
    """
    Build the Gemini prompt for generating a formal engineering assessment narrative.
    Output is suitable for BAC submission and Sanggunian budget hearings.
    """
    urgency_str = ", ".join(f"{k}: {v}" for k, v in cluster.get("urgency_breakdown", {}).items())
    samples = "; ".join(f'"{d}"' for d in cluster.get("sample_descriptions", [])[:3])
    recurrence_pct = round(cluster.get("recurrence_score", 0) * 100, 1)
    growth_pct = round(cluster.get("growth_rate", 0) * 100, 1)
    boq = generate_boq_from_cluster(cluster)

    return f"""You are a licensed civil engineer writing an official Infrastructure Assessment Report
for the City Engineering Office, Caloocan City. This report will be submitted to the
Bids and Awards Committee (BAC) and the Sangguniang Panlungsod as justification for a
supplemental infrastructure budget appropriation.

INFRASTRUCTURE STRESS ZONE DATA:
- Location: Barangay {cluster.get('barangay', 'Unknown')}, Caloocan City (North District)
- GPS Centroid: ({cluster['centroid_lat']:.6f}, {cluster['centroid_lng']:.6f})
- Affected Radius: approximately {cluster['radius_meters']:.0f} meters
- Dominant Infrastructure Failure: {cluster['dominant_category'].replace('_', ' ').title()}
- Citizen Report Volume: {cluster['report_count']} verified reports over {cluster.get('days_window', 90)} days
- AI Urgency Distribution: {urgency_str}
- Recurrence Rate: {recurrence_pct}% (reports filed at locations previously repaired)
- Weekly Growth Rate: {'+' if growth_pct > 0 else ''}{growth_pct}%
- Threat Classification: {cluster['threat_level']}
- Sample Citizen Descriptions: {samples if samples else 'Multiple field reports of infrastructure failure'}
- Preliminary Cost Estimate: {boq['total_formatted']} (DPWH 2024 Unit Price Guide, Region 3)

Write a formal engineering assessment with the following structure:
1. INFRASTRUCTURE CONDITION SUMMARY — Current state in 2-3 professional sentences.
2. ROOT CAUSE ASSESSMENT — Probable engineering causes (age, design, loading, climate).
3. PUBLIC SAFETY RISK — Specific hazards to residents, traffic, flooding potential.
4. RECOMMENDED SCOPE OF WORK — Detailed list of specific engineering interventions required.
5. URGENCY CLASSIFICATION — Justify {cluster['threat_level']} classification with technical reasoning.
6. BUDGET JUSTIFICATION — Narrative supporting the {boq['total_formatted']} estimate with reference to DPWH Unit Price Guide.

Requirements:
- Professional engineering report language. Formal tone. Third person.
- Include specific references to Philippine engineering standards where applicable (NSCP, PD 1096, DPWH standards).
- Each section should be 3-5 sentences minimum.
- Recurrence rate above 60% indicates systemic structural failure — call this out explicitly.
- Suitable for COA audit review and BAC submission.
Do NOT use bullet points inside section paragraphs. Do not use markdown. Plain text paragraphs only.
End with: "This assessment was generated by the PULSO Infrastructure Intelligence System, City Engineering Office, Caloocan City."
"""


def generate_cluster_narrative(cluster: Dict[str, Any]) -> Optional[str]:
    """
    Call Gemini to generate the engineering assessment narrative.
    Returns the narrative text or None on failure.
    """
    try:
        import gemini_service
        prompt = build_gemini_cluster_prompt(cluster)
        # Use the AI assistant pathway
        result = gemini_service.get_ai_assistant_response(
            query=prompt,
            context="Infrastructure Analytics Engine, City Engineering Office"
        )
        if isinstance(result, dict):
            return result.get("response") or result.get("message") or str(result)
        return str(result)
    except Exception as e:
        logger.error(f"Gemini narrative generation failed: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard Summary Stats
# ─────────────────────────────────────────────────────────────────────────────

def get_analytics_summary(db: Session) -> Dict[str, Any]:
    """
    Aggregated analytics KPIs for the City Engineer's Analytics Dashboard.
    """
    heatmap = get_heatmap_intelligence(db, days_back=90)
    summary = heatmap["summary"]
    clusters = heatmap["clusters"]

    # Barangay stress ranking
    brgy_stress: Dict[str, float] = defaultdict(float)
    for c in clusters:
        brgy = c.get("barangay", "Unknown")
        weight = {"CRITICAL": 10, "HIGH": 5, "EMERGING": 3, "MONITORING": 1}.get(c["threat_level"], 1)
        brgy_stress[brgy] += c["severity_score"] * weight

    top_barangays = sorted(brgy_stress.items(), key=lambda x: -x[1])[:10]

    # Category breakdown
    cat_totals: Dict[str, int] = defaultdict(int)
    for r in db.query(models.Report).filter(
        models.Report.created_at >= datetime.now(timezone.utc) - timedelta(days=90),
        models.Report.status.notin_(["rejected", "spam", "cancelled"]),
    ).all():
        cat_totals[(r.category or "other").lower()] += 1

    # Resolution rate
    total_all = db.query(models.Report).filter(models.Report.status != "cancelled").count()
    total_resolved = db.query(models.Report).filter(models.Report.status == "resolved").count()
    resolution_rate = round((total_resolved / max(total_all, 1)) * 100, 1)

    recurrence_events = get_recurrence_events(db, days_window=90)

    return {
        **summary,
        "resolution_rate_pct": resolution_rate,
        "total_resolved_all_time": total_resolved,
        "total_all_time": total_all,
        "top_stress_barangays": [{"barangay": b, "stress_score": round(s, 1)} for b, s in top_barangays],
        "category_breakdown": dict(sorted(cat_totals.items(), key=lambda x: -x[1])[:10]),
        "chronic_recurrence_events": len(recurrence_events),
        "total_budget_exposure": f"₱{summary['total_estimated_cost']:,.2f}",
    }
