from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from auth import get_current_user
from gov_models import InfrastructureAsset, EnvironmentalContext, MaintenanceHistory, SystemDocument, ProjectRequest, WorkOrder
import models
from predictive_engine import calculate_ahs, calculate_dv, calculate_ci, calculate_fvf
from predictive_service import (
    _failure_probability, _health_score, _next_maintenance_date,
    _format_cost, _get_category_profile, _seasonal_multiplier,
    CATEGORY_RISK_PROFILE, PREVENTIVE_COST_RATIO, RAINY_MONTHS
)
from analytics_service import COST_MODEL, _match_cost_key, get_forecast
import gemini_service
import datetime
from datetime import timezone
import roles_service
import gov_crud
import gov_schemas
from government_access import can, scoped_assets, require_asset_scope
from maintenance_planning import maintenance_projection
from services import lightgbm_service

router = APIRouter(prefix="/api/gov/predictive", tags=["predictive"])

GOV_ROLES = (
    "city_engineer", "asst_city_engineer", "admin_officer",
    "admin_clerk", "records_officer", "division_chief",
    "design_engineer", "estimator", "cad_operator",
    "project_engineer", "construction_foreman", "field_worker",
    "building_inspector", "electrical_inspector", "mechanical_inspector",
    "dispatcher", "manager", "system_admin",
)

def determine_priority(ahs: float) -> str:
    if ahs <= 35: return "CRITICAL"
    if ahs <= 55: return "HIGH"
    if ahs <= 75: return "MODERATE"
    if ahs <= 90: return "WATCH"
    return "GOOD"

def format_currency(val: float) -> str:
    return f"PHP{val:,.2f}"

def _allow_access(user):
    return can(user, 'maintenance')

def get_asset_incident_metrics(db: Session, asset: InfrastructureAsset, days_back: int = 90):
    """
    Deterministic incident metrics calculation from real DB records.
    Returns (report_count, freq_per_month, recurrence_rate, days_since).
    """
    today = datetime.date.today()
    ninety_days_ago_dt = datetime.datetime.now(timezone.utc) - datetime.timedelta(days=days_back)

    # 1. Days since last maintenance
    last_maint_date = db.query(func.max(MaintenanceHistory.completion_date)).filter(
        MaintenanceHistory.asset_id == asset.asset_id
    ).scalar()

    if last_maint_date:
        days_since = (today - last_maint_date).days
    else:
        last_wo_date = db.query(func.max(WorkOrder.completed_date)).filter(
            WorkOrder.asset_id == asset.asset_id,
            WorkOrder.status == "completed"
        ).scalar()
        if last_wo_date:
            last_dt = last_wo_date.date() if isinstance(last_wo_date, datetime.datetime) else last_wo_date
            days_since = (today - last_dt).days
        elif asset.date_completed:
            days_since = (today - asset.date_completed).days
        else:
            days_since = 365

    days_since = max(0, days_since)

    # Only reports explicitly linked through a work order belong to this asset.
    # Barangay/category similarity is not enough to attribute a citizen report.
    report_count = db.query(func.count(func.distinct(models.Report.id))).join(
        WorkOrder, WorkOrder.report_id == models.Report.id
    ).filter(
        WorkOrder.asset_id == asset.asset_id,
        models.Report.created_at >= ninety_days_ago_dt,
        models.Report.status.notin_(["rejected", "spam"]),
    ).scalar() or 0
    freq_per_month = round(report_count / max(days_back / 30.0, 1.0), 2)

    # 3. Recurrence rate (180-day baseline)
    hundred_eighty_days_ago = today - datetime.timedelta(days=180)
    total_maint_180d = db.query(func.count(MaintenanceHistory.log_id)).filter(
        MaintenanceHistory.asset_id == asset.asset_id,
        MaintenanceHistory.completion_date >= hundred_eighty_days_ago
    ).scalar() or 0

    if total_maint_180d > 1:
        recurrence_rate = min(1.0, round((total_maint_180d - 1) / 5.0, 2))
    elif report_count > 1:
        recurrence_rate = min(1.0, round((report_count - 1) / 10.0, 2))
    else:
        recurrence_rate = 0.0

    return report_count, freq_per_month, recurrence_rate, days_since


@router.get("/summary")
def get_predictive_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not _allow_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied to predictive engine")
    assets = scoped_assets(db.query(InfrastructureAsset), current_user).limit(200).all()
    
    total_assets = len(assets)
    if total_assets == 0:
        return {
            "model_status": "no_asset_data",
            "total_assets_monitored": 0,
            "limitation": "No registered infrastructure assets are available for maintenance review.",
        }

    ahs_sum = 0
    critical_count = 0
    high_count = 0
    good_count = 0
    urgent_cnt = 0
    immediate_cnt = 0
    
    top_at_risk = []
    scheduled_90d_cost = 0.0

    for a in assets:
        ahs = a.condition_score if a.condition_score is not None else calculate_ahs(db, a.asset_id)
        dv = calculate_dv(db, a.asset_id)
        ahs_sum += ahs
        
        priority = determine_priority(ahs)
        
        if priority == "CRITICAL": critical_count += 1
        elif priority == "HIGH": high_count += 1
        elif priority == "GOOD": good_count += 1

        report_count, freq, rec, days_since = get_asset_incident_metrics(db, a)
        fail_prob = _failure_probability(freq, rec, days_since, a.category or "default", target_days=30)
        
        if fail_prob > 0.8: urgent_cnt += 1
        if dv > 2.0 or ahs <= 15: immediate_cnt += 1

        if ahs <= 75:
            unit_cost = COST_MODEL.get(_match_cost_key(a.category), COST_MODEL["default"])["cost"]
            scheduled_90d_cost += unit_cost * PREVENTIVE_COST_RATIO
            
        if priority in ["CRITICAL", "HIGH"]:
            lgbm_pred = lightgbm_service.predict_for_asset(
                db, a, days_since_override=days_since, linked_reports_override=report_count
            )
            top_at_risk.append({
                "asset_id": a.asset_id,
                "asset_name": a.asset_name,
                "priority": priority,
                "health_score": ahs,
                "category": a.category,
                "barangay": str(a.barangay),
                "failure_probability_30d": fail_prob,
                "lgbm_failure_probability_30d": lgbm_pred["lgbm_failure_probability_30d"],
                "predicted_repair_days_p50": lgbm_pred["predicted_repair_days_p50"],
                "predicted_repair_days_p90": lgbm_pred["predicted_repair_days_p90"],
                "risk_drivers": lgbm_pred["risk_drivers"],
            })
            
    top_at_risk.sort(key=lambda x: x["health_score"])
    top_at_risk = top_at_risk[:5]
    
    now = datetime.datetime.now()
    month = now.month
    rainy_active = (month >= 6 and month <= 11)

    return {
        "model_status": "exploratory_heuristic_unvalidated",
        "ml_engine": lightgbm_service.get_global_model_diagnostics(db),
        "data_window_days": 90,
        "source": "infrastructure_assets, maintenance_history, work_orders, reports",
        "limitation": "Scores and costs are inspection prompts, not validated failure probabilities, schedules, or approved budgets.",
        "rainy_season_active": rainy_active,
        "total_assets_monitored": total_assets,
        "avg_health_score": round(ahs_sum / total_assets),
        "critical_count": critical_count,
        "high_count": high_count,
        "urgent_this_week": urgent_cnt,
        "assets_needing_immediate_action": immediate_cnt,
        "scheduled_90d_cost": round(scheduled_90d_cost, 2),
        "scheduled_90d_cost_formatted": format_currency(scheduled_90d_cost),
        "good_count": good_count,
        "top_at_risk": top_at_risk
    }


def _resolve_asset_health_score(db: Session, asset: InfrastructureAsset) -> float:
    """Single authoritative condition/health score resolution across summary, health, schedule, and risk-map."""
    return float(asset.condition_score if asset.condition_score is not None else calculate_ahs(db, asset.asset_id))


def _get_existing_open_wo(db: Session, asset_id: str) -> Optional[Dict[str, Any]]:
    wo = db.query(WorkOrder).filter(
        WorkOrder.asset_id == asset_id,
        WorkOrder.status.notin_(["completed", "cancelled"])
    ).order_by(WorkOrder.created_at.desc()).first()
    if not wo:
        return None
    return {
        "id": wo.id,
        "wo_number": wo.wo_number,
        "status": wo.status,
        "wo_type": wo.wo_type,
        "assigned_to_id": wo.assigned_to_id,
        "title": wo.title,
    }


def _build_why_review(ahs: float, pri: str, report_count: int, days_since: int, rainy_warn: bool) -> str:
    reasons = [f"Condition score {round(ahs)}/100 ({pri.title()})"]
    if report_count > 0:
        reasons.append(f"{report_count} explicitly linked report{'s' if report_count != 1 else ''} in 90d")
    if days_since and days_since > 0:
        reasons.append(f"{days_since}d since last recorded maintenance")
    if rainy_warn:
        reasons.append("elevated flood/rainy-season exposure")
    return " · ".join(reasons)


@router.get("/health")
def get_predictive_health(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if not _allow_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied to maintenance review")
    assets = scoped_assets(db.query(InfrastructureAsset), current_user).all()
    rows = []
    today = datetime.date.today()
    for asset in assets:
        score = float(asset.condition_score) if asset.condition_score is not None else None
        priority = determine_priority(score) if score is not None else 'UNKNOWN'
        count, _, _, _ = get_asset_incident_metrics(db, asset)
        completions = [log.completion_date for log in asset.maintenance_logs if log.completion_date]
        last = max((day for day in completions if day <= today), default=None)
        days = max(0, (today - last).days) if last else None
        existing = _get_existing_open_wo(db, asset.asset_id)
        projection = maintenance_projection(asset.maintenance_logs, today)
        review_needed = score is None or score <= 75 or bool(projection and projection['days_until_review'] <= 30) or count > 0
        reasons = [f"Condition index {score:g}/100 from the asset registry." if score is not None else 'No inspected condition index is recorded.']
        reasons.append(f"{count} reports explicitly linked through work orders in the past 90 days.")
        reasons.append(f"Last recorded maintenance completed {days} days ago." if last else "No maintenance completion is recorded; inspect the history before planning work.")
        rows.append(dict(asset_id=asset.asset_id, asset_name=asset.asset_name,
            barangay=str(asset.barangay or 'Not recorded'), category=asset.category or 'Unclassified',
            health_score=score, condition_source='asset_registry' if score is not None else 'not_recorded',
            priority=priority, report_count=count, why_review=' '.join(reasons),
            existing_work_order=existing, last_maintenance_date=last.isoformat() if last else None,
            days_since_last_maintenance=days,
            projection=projection, review_needed=review_needed,
            review_status='open_work' if existing else 'suggested_review' if review_needed else 'monitoring'))
    rows.sort(key=lambda row: (0 if row['review_needed'] else 1, row['health_score'] if row['health_score'] is not None else 101))
    return dict(model_status='record_based_maintenance_projection', as_of=datetime.datetime.now(timezone.utc),
        data_window_days=90, can_create_work_order=can(current_user, 'maintenance', 'create_work_order'), health_scores=rows)


@router.get('/assets/{asset_id}/forecast')
def asset_maintenance_forecast(asset_id: str, include_model: bool = False, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if not _allow_access(current_user): raise HTTPException(403, 'Maintenance access is required.')
    asset = db.query(InfrastructureAsset).filter_by(asset_id=asset_id).first()
    if not asset: raise HTTPException(404, 'Infrastructure asset not found.')
    require_asset_scope(db, current_user, asset)
    from asset_map_context import asset_report_context
    location = asset_report_context(db, current_user, asset_id, 500)
    logs = sorted(asset.maintenance_logs, key=lambda row: row.completion_date or datetime.date.min, reverse=True)
    projection = maintenance_projection(logs)
    cutoff = datetime.datetime.now(timezone.utc) - datetime.timedelta(days=90)
    from government_access import scoped_reports, jurisdiction_ids
    reports = scoped_reports(db.query(models.Report), current_user).filter(models.Report.id.in_(db.query(WorkOrder.report_id).filter(WorkOrder.asset_id == asset_id)), models.Report.created_at >= cutoff, models.Report.status.notin_(['rejected', 'spam'])).order_by(models.Report.created_at.desc()).all()
    experimental = None
    if include_model:
        if jurisdiction_ids(current_user):
            experimental = dict(status='unavailable', reason='The existing experimental model has citywide training scope. It is not available for a district-restricted account.')
        else:
            try:
                prediction = lightgbm_service.predict_for_asset(db, asset)
                experimental = dict(status='experimental', engine=prediction['engine'], training_mode='synthetic_examples_and_registry_proxy_labels',
                    review_index=round(prediction['lgbm_failure_probability_30d'] * 100, 1),
                    limitation='Existing LightGBM model combines synthetic training examples and proxy labels. This is an exploratory review index, not a validated probability of failure, repair deadline, or engineering approval.')
            except Exception:
                experimental = dict(status='unavailable', reason='The experimental model could not complete this calculation. Recorded history and manual work creation remain available.')
    return dict(asset_id=asset_id, as_of=datetime.datetime.now(timezone.utc), projection=projection,
        location=location['asset'], linked_report_count=len(location['linked_ids']), nearby_report_count=len(set(location['distances'])-location['linked_ids']),
        projection_status='available' if projection else 'insufficient_comparable_history',
        method='Historical maintenance interval, grouped by recorded work type. At least three distinct completed dates are required. No budget values are used.',
        limitation='A projected review date is a planning prompt based on recorded past work. It does not establish a failure date or an approved maintenance schedule.',
        history=[dict(id=log.log_id, work_type=log.work_type, completed_date=log.completion_date) for log in logs],
        linked_reports=[dict(id=r.id, ticket_id=r.ticket_id, status=r.status, created_at=r.created_at) for r in reports],
        experimental_model=experimental)


@router.get("/schedule")
def get_predictive_schedule(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not _allow_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied to predictive engine")
    assets = scoped_assets(db.query(InfrastructureAsset), current_user).limit(200).all()
    
    schedule_items = []
    total_cost = 0.0
    crit_count = 0
    
    today = datetime.date.today()
    now = datetime.datetime.now()
    rainy_active = (now.month >= 6 and now.month <= 11)

    horizon_labels = {
        1: "Immediate Review (Within 14 Days)",
        2: "30-Day Inspection Window (Days 15–30)",
        3: "60-Day Preventive Window (Days 31–60)",
        4: "Later review (more than 60 days)",
    }

    for a in assets:
        ahs = _resolve_asset_health_score(db, a)
        if ahs > 75:
            continue  # Only schedule assets needing attention
        
        pri = determine_priority(ahs)
        if pri == "CRITICAL":
            crit_count += 1
        
        report_count, freq_per_month, recurrence_rate, days_since = get_asset_incident_metrics(db, a)
        fail_prob = _failure_probability(freq_per_month, recurrence_rate, days_since, a.category or "default", target_days=30)
        
        next_maint = _next_maintenance_date(ahs)
        next_maint_date_obj = datetime.datetime.strptime(next_maint, "%Y-%m-%d").date()
        days_until = max(0, (next_maint_date_obj - today).days)

        # Truthful review horizon binning without false week-4 date capping
        if days_until <= 14:
            horizon_bucket = 1
        elif days_until <= 30:
            horizon_bucket = 2
        elif days_until <= 60:
            horizon_bucket = 3
        else:
            horizon_bucket = 4

        # Deterministic reference cost (kept only for backward-compatibility; UI leads with inspection scope)
        cost_key = _match_cost_key(a.category)
        unit_cost = COST_MODEL.get(cost_key, COST_MODEL["default"])["cost"]
        cost = round(unit_cost * PREVENTIVE_COST_RATIO, 2)
        total_cost += cost

        rainy_warn = rainy_active and (a.category or "").lower() in ["drainage", "road", "pothole", "flooding"]
        existing_wo = _get_existing_open_wo(db, a.asset_id)
        
        schedule_items.append({
            "asset_id": a.asset_id,
            "asset_name": a.asset_name,
            "week_number": horizon_bucket,
            "horizon_label": horizon_labels[horizon_bucket],
            "days_until_review": days_until,
            "priority": pri,
            "health_score": ahs,
            "rainy_season_warning": rainy_warn,
            "category": a.category,
            "barangay": str(a.barangay),
            "maintenance_type": "Immediate Field Inspection" if pri == "CRITICAL" else ("Preventive Engineering Review" if pri == "HIGH" else "Routine Condition Check"),
            "why_review": _build_why_review(ahs, pri, report_count, days_since, rainy_warn),
            "existing_work_order": existing_wo,
            "scheduled_date": next_maint,
            "estimated_cost_formatted": format_currency(cost),
            "failure_prob": fail_prob
        })
        
        if len(schedule_items) > 40:
            break
            
    # Group by truthful review horizon bucket
    weekly_summary = []
    for w in range(1, 5):
        w_items = [i for i in schedule_items if i["week_number"] == w]
        w_cost = sum([float(i["estimated_cost_formatted"].replace("PHP", "").replace(",", "")) for i in w_items])
        w_crit = sum([1 for i in w_items if i["priority"] == "CRITICAL"])
        
        if w_items:
            weekly_summary.append({
                "week_number": w,
                "week_label": horizon_labels[w],
                "item_count": len(w_items),
                "total_cost_formatted": format_currency(w_cost),
                "critical_count": w_crit
            })

    return {
        "model_status": "exploratory_heuristic_unvalidated",
        "is_committed_schedule": False,
        "total_items": len(schedule_items),
        "critical_count": crit_count,
        "rainy_season_active": rainy_active,
        "total_cost_formatted": format_currency(total_cost),
        "weekly_summary": weekly_summary,
        "schedule_items": schedule_items
    }


@router.get("/risk-map")
def get_predictive_risk_map(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not _allow_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied to predictive engine")
    all_assets = scoped_assets(db.query(InfrastructureAsset), current_user).limit(300).all()
    by_barangay: Dict[str, List[InfrastructureAsset]] = {}
    for a in all_assets:
        b_key = str(a.barangay or "Unassigned").strip()
        by_barangay.setdefault(b_key, []).append(a)

    risk_map = []
    for b_key, b_assets in by_barangay.items():
        if not b_assets:
            continue
        sum_ahs = 0.0
        crit_assets = 0
        high_assets = 0
        open_wos = 0
        at_risk_cats = set()
        
        for a in b_assets:
            ahs = _resolve_asset_health_score(db, a)
            sum_ahs += ahs
            if ahs <= 35: 
                crit_assets += 1
                at_risk_cats.add(a.category)
            elif ahs <= 50:
                high_assets += 1
                at_risk_cats.add(a.category)
            if _get_existing_open_wo(db, a.asset_id):
                open_wos += 1
                
        avg_ahs = round(sum_ahs / len(b_assets))
        pri = determine_priority(avg_ahs)
        if crit_assets > 0 and pri not in ("CRITICAL", "HIGH"):
            pri = "HIGH"
        
        color = "#22c55e"  # GOOD
        if pri == "CRITICAL": color = "#ef4444"
        elif pri == "HIGH": color = "#f97316"
        elif pri == "MODERATE": color = "#eab308"
        elif pri == "WATCH": color = "#3b82f6"
        
        risk_map.append({
            "barangay": b_key,
            "asset_count": len(b_assets),
            "risk_color": color,
            "avg_health_score": avg_ahs,
            "overall_priority": pri,
            "critical_assets": crit_assets,
            "high_risk_assets": high_assets,
            "open_work_orders": open_wos,
            "categories_at_risk": sorted(list(at_risk_cats))
        })
        
    risk_map.sort(key=lambda x: (-x["critical_assets"], x["avg_health_score"]))

    return {
        "risk_map": risk_map
    }


class AIPlanRequest(BaseModel):
    barangay: str
    category: str
    asset_id: Optional[str] = None


@router.post("/ai-plan")
def generate_ai_plan(
    req: AIPlanRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not _allow_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied to predictive engine")
        
    asset = None
    if req.asset_id:
        asset = db.query(InfrastructureAsset).filter_by(asset_id=req.asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Infrastructure asset not found")
    
    if not asset:
        matches = db.query(InfrastructureAsset).filter(
            InfrastructureAsset.category == req.category,
            InfrastructureAsset.barangay == req.barangay
        ).limit(2).all()
        if not matches:
            raise HTTPException(status_code=404, detail="No registered infrastructure asset matches this location and category")
        if len(matches) > 1:
            raise HTTPException(status_code=409, detail="Select a specific infrastructure asset")
        asset = matches[0]

    require_asset_scope(db, current_user, asset)
    last_maintenance = db.query(func.max(MaintenanceHistory.completion_date)).filter(
        MaintenanceHistory.asset_id == asset.asset_id
    ).scalar()
    asset_data = {
        "asset_name": asset.asset_name,
        "asset_id": asset.asset_id,
        "category": asset.category,
        "barangay": str(asset.barangay),
        "recorded_condition_score": asset.condition_score,
        "material_type": asset.material_type,
        "design_life": asset.design_life,
        "last_recorded_maintenance": last_maintenance.isoformat() if last_maintenance else None,
    }

    plan = gemini_service.generate_maintenance_plan(asset_data)
    if not isinstance(plan, dict) or not plan.get("maintenance_plan") or not plan.get("technical_justification"):
        raise HTTPException(status_code=503, detail="AI maintenance draft is unavailable; use manual engineering review")
    
    return {
        "barangay": str(asset.barangay),
        "category": asset.category,
        "health_score": asset.condition_score,
        "condition_source": "recorded" if asset.condition_score is not None else "not_recorded",
        "asset_id": asset.asset_id,
        "priority": None,
        "maintenance_plan": plan["maintenance_plan"],
        "steps": plan.get("steps", []),
        "technical_justification": plan["technical_justification"],
        "generated_by": f"Gemini {gemini_service.GEMINI_MODEL}",
        "generated_at": datetime.datetime.now(timezone.utc).isoformat(),
        "review_state": "draft_unreviewed",
        "source": "infrastructure_asset_registry",
        "estimated_cost": None,
        "estimated_duration_days": None,
        "lgbm_insights": None,
    }


class ConvertWORequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    asset_id: str
    plan_summary: str = Field(min_length=10)
    priority: str
    estimated_cost: Optional[float] = Field(default=0.0, ge=0, allow_inf_nan=False)
    review_reason: str = Field(min_length=10)


@router.post("/convert-to-work-order")
def convert_to_work_order(
    req: ConvertWORequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not can(current_user, 'maintenance', 'create_work_order'):
        raise HTTPException(status_code=403, detail="Access denied to convert to work order")
    asset = db.query(InfrastructureAsset).filter_by(asset_id=req.asset_id).with_for_update().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Infrastructure asset not found")
    require_asset_scope(db, current_user, asset)
    priority = {"critical": "critical", "high": "high", "moderate": "normal", "low": "low"}.get(req.priority.lower())
    if priority is None:
        raise HTTPException(status_code=422, detail="Unsupported priority")
    existing = db.query(WorkOrder.id).filter(
        WorkOrder.asset_id == asset.asset_id,
        WorkOrder.wo_type == "preemptive",
        WorkOrder.status.notin_(["completed", "cancelled"]),
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Asset already has an open preventive work order")
    new_wo = gov_crud.create_work_order(
        db,
        gov_schemas.WorkOrderCreate(
            title=f"Preventive review: {asset.asset_name}",
            description=req.plan_summary.strip(),
            category=asset.category,
            priority=priority,
            estimated_cost=req.estimated_cost,
            wo_type="preemptive",
            asset_id=asset.asset_id,
            ai_plan_summary=None,
            notes=f"Human review reason: {req.review_reason.strip()}",
        ),
        actor_id=current_user.id,
        actor_role=current_user.role,
    )
    
    return {
         "wo_number": new_wo.wo_number,
         "id": new_wo.id,
         "status": new_wo.status
    }


@router.get("/export")
def export_predictive_data(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not isinstance(current_user, models.Official) or current_user.role not in (
        "system_admin", "city_engineer", "asst_city_engineer", "manager", "admin_officer", "division_chief"
    ):
        raise HTTPException(status_code=403, detail="Access denied to predictive engine")
    
    import csv
    import io
    from fastapi.responses import StreamingResponse
    
    assets = scoped_assets(db.query(InfrastructureAsset), current_user).limit(200).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    def safe_cell(value):
        return "'" + value if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")) else value
    writer.writerow([
        "Asset ID", "Asset Name", "Category", "Barangay", 
        "Health Score", "Priority", "Exploratory 30d Signal",
        "Exploratory 60d Signal", "Exploratory 90d Signal", "Suggested Review Date"
    ])
    
    for a in assets:
        ahs = a.condition_score if a.condition_score is not None else calculate_ahs(db, a.asset_id)
        pri = determine_priority(ahs)
        report_count, freq_per_month, recurrence_rate, days_since = get_asset_incident_metrics(db, a)

        fail_30 = _failure_probability(freq_per_month, recurrence_rate, days_since, a.category or "default", target_days=30)
        fail_60 = max(fail_30, _failure_probability(freq_per_month, recurrence_rate, days_since, a.category or "default", target_days=60))
        fail_90 = max(fail_60, _failure_probability(freq_per_month, recurrence_rate, days_since, a.category or "default", target_days=90))
        next_maint = _next_maintenance_date(ahs)
        
        writer.writerow([safe_cell(value) for value in [
            a.asset_id, a.asset_name, a.category, a.barangay,
            ahs, pri, fail_30, fail_60, fail_90, next_maint
        ]])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=predictive_maintenance.csv"}
    )


@router.get("/maintenance-scores")
def get_maintenance_scores(
    category: Optional[str] = Query(None),
    barangay: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Dedicated REST endpoint providing per-asset deterministic DPWH scores
    based on asset.date_completed, design_life, recurrence frequency, and rain/flood exposure.
    """
    if not _allow_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied to predictive engine")

    query = db.query(InfrastructureAsset)
    if category:
        query = query.filter(InfrastructureAsset.category.ilike(f"%{category}%"))
    if barangay:
        query = query.filter(InfrastructureAsset.barangay.ilike(f"%{barangay}%"))
    
    assets = query.limit(200).all()
    results = []
    
    for a in assets:
        ahs = a.condition_score if a.condition_score is not None else calculate_ahs(db, a.asset_id)
        dv = calculate_dv(db, a.asset_id)
        pri = determine_priority(ahs)
        
        if priority and pri.lower() != priority.lower():
            continue
            
        report_count, freq_per_month, recurrence_rate, days_since = get_asset_incident_metrics(db, a)
        fail_30 = _failure_probability(freq_per_month, recurrence_rate, days_since, a.category or "default", target_days=30)
        fail_60 = max(fail_30, _failure_probability(freq_per_month, recurrence_rate, days_since, a.category or "default", target_days=60))
        fail_90 = max(fail_60, _failure_probability(freq_per_month, recurrence_rate, days_since, a.category or "default", target_days=90))
        next_maint = _next_maintenance_date(ahs)
        
        lgbm_pred = lightgbm_service.predict_for_asset(
            db, a, days_since_override=days_since, linked_reports_override=report_count
        )
        results.append({
            "asset_id": a.asset_id,
            "asset_name": a.asset_name,
            "category": a.category,
            "barangay": str(a.barangay),
            "design_life": a.design_life,
            "date_completed": a.date_completed.isoformat() if a.date_completed else None,
            "health_score": ahs,
            "deterioration_velocity": dv,
            "priority": pri,
            "days_since_last_maintenance": days_since,
            "report_count": report_count,
            "freq_per_month": freq_per_month,
            "recurrence_rate": recurrence_rate,
            "failure_probability_30d": fail_30,
            "failure_probability_60d": fail_60,
            "failure_probability_90d": fail_90,
            "lgbm_failure_probability_30d": lgbm_pred["lgbm_failure_probability_30d"],
            "lgbm_failure_probability_60d": lgbm_pred["lgbm_failure_probability_60d"],
            "lgbm_failure_probability_90d": lgbm_pred["lgbm_failure_probability_90d"],
            "predicted_repair_days_p50": lgbm_pred["predicted_repair_days_p50"],
            "predicted_repair_days_p90": lgbm_pred["predicted_repair_days_p90"],
            "spatial_telemetry": lgbm_pred["spatial_telemetry"],
            "risk_drivers": lgbm_pred["risk_drivers"],
            "next_maintenance_date": next_maint
        })
        
    return results


@router.get("/demand-forecast")
def get_demand_forecast(
    weeks_back: int = Query(12, ge=1, le=52),
    weeks_forward: int = Query(4, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Connects directly to historical rolling baseline time-series regression
    across 12 weeks and projects 4-week forward citizen report demand.
    """
    if not _allow_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied to predictive engine")
        
    return get_forecast(db, weeks_back=weeks_back, weeks_forward=weeks_forward)


@router.get("/model-diagnostics")
def get_model_diagnostics(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Exposes PostGIS + LightGBM model diagnostics, feature importances,
    calibration status, and TreeSHAP attributions for top-priority assets.
    """
    if not _allow_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied to predictive engine")
    diagnostics = lightgbm_service.get_global_model_diagnostics(db)
    assets = db.query(InfrastructureAsset).limit(10).all()
    asset_predictions = []
    for a in assets:
        pred = lightgbm_service.predict_for_asset(db, a)
        asset_predictions.append({
            "asset_id": a.asset_id,
            "asset_name": a.asset_name,
            "category": a.category,
            "barangay": str(a.barangay),
            **pred,
        })
    asset_predictions.sort(key=lambda x: x["lgbm_failure_probability_30d"], reverse=True)
    return {
        **diagnostics,
        "top_asset_predictions": asset_predictions[:5],
    }
