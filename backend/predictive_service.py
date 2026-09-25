"""
predictive_service.py — PULSO Predictive Maintenance Engine
City Engineering Office, Caloocan City

DATA SOURCE: analytics_service.get_infrastructure_clusters()
  — Predictive Maintenance is a downstream consumer of the Analytics Command Center.
  — Both dashboards see exactly the same clusters, threat levels, costs, and barangays.
  — This layer adds: health scores, failure probability forecasting,
    maintenance scheduling, and AI action plans on top of analytics clusters.
"""

import math
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

# Seasonal rainy season months (Philippines)
RAINY_MONTHS = [6, 7, 8, 9, 10, 11]   # June–November

# Category risk profiles — failure acceleration rates
CATEGORY_RISK_PROFILE = {
    "roads":       {"decay_rate": 0.08, "lifespan_years": 7,  "seasonal_amp": 1.4},
    "pothole":     {"decay_rate": 0.08, "lifespan_years": 7,  "seasonal_amp": 1.4},  # standard road profile
    "drainage":    {"decay_rate": 0.12, "lifespan_years": 5,  "seasonal_amp": 2.0},
    "streetlight": {"decay_rate": 0.05, "lifespan_years": 10, "seasonal_amp": 1.1},
    "electrical":  {"decay_rate": 0.05, "lifespan_years": 10, "seasonal_amp": 1.1},
    "structural":  {"decay_rate": 0.03, "lifespan_years": 20, "seasonal_amp": 1.2},
    "sidewalk":    {"decay_rate": 0.06, "lifespan_years": 8,  "seasonal_amp": 1.3},
    "flooding":    {"decay_rate": 0.15, "lifespan_years": 3,  "seasonal_amp": 2.5},
    "default":     {"decay_rate": 0.07, "lifespan_years": 8,  "seasonal_amp": 1.3},
}

# Analytics threat level → Predictive priority  (1:1 mapping keeps dashboards consistent)
THREAT_TO_PRIORITY = {
    "CRITICAL":   "CRITICAL",
    "HIGH":       "HIGH",
    "EMERGING":   "MODERATE",
    "MONITORING": "WATCH",
}

# Preventive cost as % of reactive cost (DPWH standard)
PREVENTIVE_COST_RATIO = 0.32


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_category_profile(category: str) -> Dict:
    """Match a category string to a decay/risk profile."""
    cat = (category or "").lower().replace(" ", "_")
    
    # Try exact match first
    if cat in CATEGORY_RISK_PROFILE:
        return CATEGORY_RISK_PROFILE[cat]
        
    # Fall back to substring match
    for key in CATEGORY_RISK_PROFILE:
        if key in cat:
            return CATEGORY_RISK_PROFILE[key]
            
    return CATEGORY_RISK_PROFILE["default"]


def _seasonal_multiplier(target_date: datetime) -> float:
    """Risk multiplier based on season. Rainy season = elevated failure risk."""
    month = target_date.month
    if month in RAINY_MONTHS:
        return 1.6 if month in [7, 8, 9] else 1.3
    return 1.0


def _failure_probability(
    report_frequency: float,    # reports/month
    recurrence_rate: float,     # 0–1
    days_since_last_action: int,
    category: str,
    target_days: int = 30,
) -> float:
    """
    Estimate probability of failure within target_days.
    Inputs come directly from analytics cluster data.
    Returns 0.0 to 1.0.
    """
    profile = _get_category_profile(category)
    decay = profile["decay_rate"]

    freq_factor       = min(1.0, report_frequency / 5.0)
    time_factor       = 1.0 - math.exp(-decay * (days_since_last_action + target_days) / 30.0)
    recurrence_factor = 0.5 + (recurrence_rate * 0.5)

    now = datetime.now(timezone.utc)
    seasonal = _seasonal_multiplier(now + timedelta(days=target_days))

    raw = (freq_factor * 0.35 + time_factor * 0.35 + recurrence_factor * 0.30) * seasonal
    return round(min(1.0, max(0.0, raw)), 3)


def _health_score(failure_prob_30d: float, recurrence_rate: float, severity: float) -> int:
    """
    Infrastructure health score 0–100.
    100 = perfect, 0 = critical failure imminent.
    """
    base              = (1.0 - failure_prob_30d) * 60
    recurrence_penalty = recurrence_rate * 20
    severity_penalty   = min(20, severity * 2)
    score = base - recurrence_penalty - severity_penalty
    return max(0, min(100, int(round(score))))


def _priority_from_health(health: int) -> str:
    if health <= 15: return "CRITICAL"
    if health <= 35: return "HIGH"
    if health <= 55: return "MODERATE"
    if health <= 75: return "WATCH"
    return "GOOD"


def _next_maintenance_date(health: int) -> str:
    """Suggest next maintenance date based on health score."""
    now = datetime.now(timezone.utc)
    if   health <= 15: days = 7
    elif health <= 35: days = 30
    elif health <= 55: days = 60
    elif health <= 75: days = 120
    else:              days = 180
    return (now + timedelta(days=days)).strftime("%Y-%m-%d")


def _format_cost(cost: float) -> str:
    if cost >= 1_000_000_000:
        return f"₱{cost/1_000_000_000:,.1f}B"
    if cost >= 1_000_000:
        return f"₱{cost/1_000_000:,.2f}M"
    return f"₱{cost:,.0f}"


# ─────────────────────────────────────────────────────────────────────────────
# Cluster → Predictive Asset  (core translation layer)
# ─────────────────────────────────────────────────────────────────────────────

def _cluster_to_asset(cluster: Dict[str, Any], days_back: int = 90) -> Dict[str, Any]:
    """
    Convert an analytics_service cluster dict into a predictive maintenance asset.
    All raw numbers (report_count, recurrence_score, severity_score, growth_rate)
    are taken as-is from the analytics layer — no re-querying the database.
    """
    category       = cluster.get("dominant_category", "infrastructure")
    barangay       = cluster.get("barangay", "Unknown")
    report_count   = cluster.get("report_count", 1)
    recurrence_rate= cluster.get("recurrence_score", 0.0)   # analytics already calculates this
    severity_score = cluster.get("severity_score", 0.0)
    growth_rate    = cluster.get("growth_rate", 0.0)         # weekly growth rate from analytics

    # Frequency: reports per month over the lookback window
    months_window  = days_back / 30.0
    freq_per_month = round(report_count / max(months_window, 1), 2)

    # Days since last action: analytics doesn't track this directly.
    # Use threat level as a proxy — CRITICAL clusters behave as if never maintained.
    threat = cluster.get("threat_level", "MONITORING")
    days_since = {
        "CRITICAL":   days_back,      # Assume aged = full window (worst case)
        "HIGH":       int(days_back * 0.75),
        "EMERGING":   int(days_back * 0.50),
        "MONITORING": int(days_back * 0.25),
    }.get(threat, days_back)

    # Failure probabilities
    p30 = _failure_probability(freq_per_month, recurrence_rate, days_since, category, 30)
    p60 = _failure_probability(freq_per_month, recurrence_rate, days_since, category, 60)
    p90 = _failure_probability(freq_per_month, recurrence_rate, days_since, category, 90)

    health   = _health_score(p30, recurrence_rate, severity_score)
    priority = _priority_from_health(health)

    # Trend from analytics growth_rate
    growth_pct = round(growth_rate * 100, 1)
    trend = (
        "WORSENING" if growth_pct >  30 else
        "IMPROVING" if growth_pct < -15 else
        "STABLE"    if abs(growth_pct) <= 15 else
        "WATCH"
    )

    # Seasonal flag
    seasonal_mult = _seasonal_multiplier(datetime.now(timezone.utc) + timedelta(days=30))
    rainy_warning = seasonal_mult > 1.2

    # Use analytics cost estimate for the preventive fraction
    analytic_cost = cluster.get("estimated_cost", 0)
    preventive_cost = round(analytic_cost * PREVENTIVE_COST_RATIO, 2)

    return {
        # Identity — same as analytics
        "cluster_id":                   cluster.get("cluster_id"),
        "barangay":                     barangay,
        "category":                     category,
        "centroid_lat":                 cluster.get("centroid_lat"),
        "centroid_lng":                 cluster.get("centroid_lng"),
        "radius_meters":                cluster.get("radius_meters"),
        # Analytics-sourced raw numbers
        "report_count":                 report_count,
        "freq_per_month":               freq_per_month,
        "recurrence_rate":              round(recurrence_rate, 2),
        "avg_severity":                 round(severity_score, 2),
        "growth_pct":                   growth_pct,
        "urgency_breakdown":            cluster.get("urgency_breakdown", {}),
        "analytics_threat_level":       threat,
        "analytics_cost_estimate":      analytic_cost,
        "analytics_cost_formatted":     cluster.get("estimated_cost_formatted", _format_cost(analytic_cost)),
        # Predictive layer additions
        "health_score":                 health,
        "priority":                     priority,
        "failure_probability_30d":      p30,
        "failure_probability_60d":      p60,
        "failure_probability_90d":      p90,
        "days_since_last_maintenance":  days_since,
        "next_maintenance_date":        _next_maintenance_date(health),
        "trend":                        trend,
        "rainy_season_warning":         rainy_warning,
        "seasonal_risk_multiplier":     round(seasonal_mult, 2),
        "preventive_cost":              preventive_cost,
        "preventive_cost_formatted":    _format_cost(preventive_cost),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Public API — called by predictive_router.py
# ─────────────────────────────────────────────────────────────────────────────

def get_infrastructure_health_scores(
    db,
    days_back: int = 90,
) -> List[Dict[str, Any]]:
    """
    Returns predictive health scores derived from Analytics Command Center clusters.
    Data is identical to what the analytics dashboard shows — no separate querying.
    """
    import analytics_service
    clusters = analytics_service.get_infrastructure_clusters(db, days_back=days_back)

    assets = [_cluster_to_asset(c, days_back) for c in clusters]

    # Sort: CRITICAL first, then by health score ascending (most at-risk first)
    priority_order = {"CRITICAL": 0, "HIGH": 1, "MODERATE": 2, "WATCH": 3, "GOOD": 4}
    assets.sort(key=lambda x: (priority_order.get(x["priority"], 5), x["health_score"]))
    return assets


def generate_maintenance_schedule(
    db,
    horizon_days: int = 90,
) -> Dict[str, Any]:
    """
    Generate a 90-day maintenance schedule from analytics clusters.
    Costs use the preventive fraction (32%) of the analytics cost estimate.
    """
    from collections import defaultdict
    health_scores = get_infrastructure_health_scores(db)
    now = datetime.now(timezone.utc)

    schedule_items = []
    weekly_buckets: Dict[int, List[Dict]] = defaultdict(list)

    for asset in health_scores:
        maint_date = datetime.strptime(asset["next_maintenance_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        days_until = (maint_date - now).days
        if days_until < 0 or days_until > horizon_days:
            continue

        week_num = max(1, (days_until // 7) + 1)
        est_cost = asset["preventive_cost"]

        item = {
            "asset_id":               f"{asset['barangay']}_{asset['category'].replace(' ', '_')}",
            "cluster_id":             asset.get("cluster_id"),
            "barangay":               asset["barangay"],
            "category":               asset["category"],
            "priority":               asset["priority"],
            "health_score":           asset["health_score"],
            "scheduled_date":         asset["next_maintenance_date"],
            "week_number":            week_num,
            "week_label":             (now + timedelta(weeks=week_num - 1)).strftime("Week of %b %d, %Y"),
            "failure_prob":           asset["failure_probability_30d"],
            "estimated_cost":         est_cost,
            "estimated_cost_formatted": _format_cost(est_cost),
            "rainy_season_warning":   asset["rainy_season_warning"],
            "analytics_threat_level": asset["analytics_threat_level"],
            "maintenance_type": (
                "Emergency Intervention"      if asset["priority"] == "CRITICAL" else
                "Preventive Rehabilitation"   if asset["priority"] == "HIGH"     else
                "Routine Maintenance"         if asset["priority"] == "MODERATE" else
                "Scheduled Inspection"
            ),
        }
        schedule_items.append(item)
        weekly_buckets[week_num].append(item)

    # Weekly summary
    weekly_summary = []
    for week_num in sorted(weekly_buckets.keys()):
        items = weekly_buckets[week_num]
        total_cost = sum(i["estimated_cost"] for i in items)
        weekly_summary.append({
            "week_number":          week_num,
            "week_label":           items[0]["week_label"] if items else "",
            "item_count":           len(items),
            "critical_count":       sum(1 for i in items if i["priority"] == "CRITICAL"),
            "high_count":           sum(1 for i in items if i["priority"] == "HIGH"),
            "total_cost":           total_cost,
            "total_cost_formatted": _format_cost(total_cost),
        })

    total_cost = sum(i["estimated_cost"] for i in schedule_items)

    return {
        "schedule_items":       schedule_items,
        "weekly_summary":       weekly_summary,
        "total_items":          len(schedule_items),
        "total_cost":           total_cost,
        "total_cost_formatted": _format_cost(total_cost),
        "horizon_days":         horizon_days,
        "generated_at":         now.isoformat(),
        "rainy_season_active":  now.month in RAINY_MONTHS,
        "critical_count":       sum(1 for i in schedule_items if i["priority"] == "CRITICAL"),
        "high_count":           sum(1 for i in schedule_items if i["priority"] == "HIGH"),
    }


def get_barangay_risk_map(db) -> List[Dict[str, Any]]:
    """
    Aggregate predictive health scores per barangay.
    Barangay names are the same as in the Analytics Command Center.
    """
    from collections import defaultdict
    health_scores = get_infrastructure_health_scores(db)

    brgy_data: Dict[str, Dict] = defaultdict(lambda: {
        "total_score": 0, "count": 0, "priorities": defaultdict(int), "categories": []
    })

    for asset in health_scores:
        brgy = asset["barangay"]
        brgy_data[brgy]["total_score"]  += asset["health_score"]
        brgy_data[brgy]["count"]        += 1
        brgy_data[brgy]["priorities"][asset["priority"]] += 1
        brgy_data[brgy]["categories"].append(asset["category"])

    result = []
    for brgy, data in brgy_data.items():
        if data["count"] == 0:
            continue
        avg_health        = data["total_score"] / data["count"]
        dominant_priority = max(data["priorities"], key=data["priorities"].get)

        result.append({
            "barangay":            brgy,
            "avg_health_score":    round(avg_health, 1),
            "overall_priority":    dominant_priority,
            "assets_monitored":    data["count"],
            "critical_assets":     data["priorities"].get("CRITICAL", 0),
            "high_assets":         data["priorities"].get("HIGH", 0),
            "priority_breakdown":  dict(data["priorities"]),
            "categories_at_risk":  list(set(data["categories"])),
            "risk_color": (
                "#ef4444" if dominant_priority == "CRITICAL" else
                "#f97316" if dominant_priority == "HIGH"     else
                "#eab308" if dominant_priority == "MODERATE" else
                "#3b82f6" if dominant_priority == "WATCH"    else
                "#22c55e"
            ),
        })

    result.sort(key=lambda x: x["avg_health_score"])
    return result


def get_predictive_summary(db) -> Dict[str, Any]:
    """Top-level KPIs for the Predictive Maintenance dashboard."""
    health_scores = get_infrastructure_health_scores(db)
    schedule      = generate_maintenance_schedule(db, horizon_days=90)
    now           = datetime.now(timezone.utc)

    critical = [a for a in health_scores if a["priority"] == "CRITICAL"]
    high     = [a for a in health_scores if a["priority"] == "HIGH"]
    moderate = [a for a in health_scores if a["priority"] == "MODERATE"]
    good     = [a for a in health_scores if a["priority"] == "GOOD"]

    avg_health = (
        sum(a["health_score"] for a in health_scores) / max(len(health_scores), 1)
    )

    next_week = now + timedelta(days=7)
    urgent_this_week = [
        i for i in schedule["schedule_items"]
        if i["priority"] in ("CRITICAL", "HIGH")
        and datetime.strptime(i["scheduled_date"], "%Y-%m-%d") <= next_week.replace(tzinfo=None)
    ]

    return {
        "total_assets_monitored":          len(health_scores),
        "avg_health_score":                round(avg_health, 1),
        "critical_count":                  len(critical),
        "high_count":                      len(high),
        "moderate_count":                  len(moderate),
        "good_count":                      len(good),
        "assets_needing_immediate_action": len(critical),
        "urgent_this_week":                len(urgent_this_week),
        "scheduled_90d_cost":              schedule["total_cost"],
        "scheduled_90d_cost_formatted":    schedule["total_cost_formatted"],
        "rainy_season_active":             now.month in RAINY_MONTHS,
        "top_at_risk":                     health_scores[:5],
        "generated_at":                    now.isoformat(),
        # Data-source transparency: how many active reports power this analysis
        "total_active_reports":            sum(a.get("report_count", 0) for a in health_scores),
        "total_clusters_analyzed":         len(health_scores),
    }


def generate_ai_maintenance_plan(asset: Dict[str, Any]) -> Optional[str]:
    """
    Ask Gemini to generate a specific maintenance action plan for a high-risk cluster.
    """
    try:
        import gemini_service
        threat = asset.get("analytics_threat_level", asset.get("priority", "UNKNOWN"))
        prompt = f"""You are a licensed civil engineer for the Caloocan City Engineering Office.
Generate a concise, actionable Preventive Maintenance Action Plan for the following infrastructure asset.

ASSET DATA (from PULSO Analytics Command Center):
- Location: Barangay {asset.get('barangay', 'Unknown')}, Caloocan City
- GPS Cluster: ({asset.get('centroid_lat', 'N/A')}, {asset.get('centroid_lng', 'N/A')}), radius ≈{asset.get('radius_meters', 0):.0f}m
- Infrastructure Type: {asset.get('category', 'infrastructure').title()}
- Analytics Threat Level: {threat}
- Health Score: {asset.get('health_score', 0)} / 100 ({asset.get('priority', 'UNKNOWN')} priority)
- Failure Probability (30 days): {asset.get('failure_probability_30d', 0)*100:.1f}%
- Citizen Reports (90 days): {asset.get('report_count', 0)} reports ({asset.get('freq_per_month', 0):.1f}/month)
- Recurrence Rate: {asset.get('recurrence_rate', 0)*100:.1f}%
- Weekly Growth Trend: {asset.get('growth_pct', 0):+.1f}%
- Analytics Cost Estimate: {asset.get('analytics_cost_formatted', '₱0')} (reactive)
- Preventive Budget (32% of reactive): {asset.get('preventive_cost_formatted', '₱0')}
- Rainy Season Warning: {'YES — immediate action before rains' if asset.get('rainy_season_warning') else 'NO'}

Provide a plain-text (no markdown, no bullet points) maintenance plan with:
1. IMMEDIATE ACTIONS (what to do first within 7 days)
2. SCOPE OF WORK (specific maintenance activities for this infrastructure type)
3. MATERIALS NEEDED (list 3-5 key materials with estimated quantities)
4. ESTIMATED CREW (number of workers and equipment needed)
5. SUCCESS CRITERIA (how to verify the maintenance was effective)

Keep it practical and specific to Philippine LGU field operations. Reference DPWH standards where applicable.
Do NOT use markdown, asterisks, or bullets. Use numbered items for lists."""

        result = gemini_service.get_ai_assistant_response(
            query=prompt,
            context="Predictive Maintenance Engine, City Engineering Office"
        )
        return result.get("response") if isinstance(result, dict) else str(result)
    except Exception as e:
        logger.error(f"AI maintenance plan failed: {e}")
        return None
