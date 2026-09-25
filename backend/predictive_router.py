from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
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
    """Simplified access check for predictive."""
    allowed = ["system_admin", "city_engineer", "manager", "admin_officer", 
              "division_chief", "division_chief_arch", "division_chief_structural",
              "division_chief_electrical", "project_engineer", "design_engineer",
              "asst_city_engineer"]
    if user.role in allowed:
        return True
    return False

def get_asset_incident_metrics(db: Session, asset: InfrastructureAsset, days_back: int = 90):
    """
    Deterministic incident metrics calculation from real DB records.
    Returns (report_count, freq_per_month, recurrence_rate, days_since).
    """
    today = datetime.date.today()
    ninety_days_ago = today - datetime.timedelta(days=days_back)
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

    # 2. Report count in lookback window
    direct_incidents = db.query(func.count(MaintenanceHistory.log_id)).filter(
        MaintenanceHistory.asset_id == asset.asset_id,
        MaintenanceHistory.completion_date >= ninety_days_ago
    ).scalar() or 0

    direct_work_orders = db.query(func.count(WorkOrder.id)).filter(
        WorkOrder.asset_id == asset.asset_id,
        WorkOrder.created_at >= ninety_days_ago_dt
    ).scalar() or 0

    brgy_str = str(asset.barangay or "")
    cat_str = str(asset.category or "").lower()

    citizen_reports = 0
    if brgy_str:
        citizen_reports = db.query(func.count(models.Report.id)).filter(
            (models.Report.location_barangay == brgy_str) | (models.Report.location_string.ilike(f"%{brgy_str}%")),
            (models.Report.category.ilike(f"%{cat_str}%") | models.Report.ai_category.ilike(f"%{cat_str}%")),
            models.Report.created_at >= ninety_days_ago_dt,
            models.Report.status.notin_(["rejected", "spam"])
        ).scalar() or 0

    report_count = direct_incidents + direct_work_orders + citizen_reports
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
    assets = db.query(InfrastructureAsset).limit(200).all()
    
    total_assets = len(assets)
    if total_assets == 0:
        return {}

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
            top_at_risk.append({
                "priority": priority,
                "health_score": ahs,
                "category": a.category,
                "barangay": str(a.barangay),
                "failure_probability_30d": fail_prob
            })
            
    top_at_risk.sort(key=lambda x: x["health_score"])
    top_at_risk = top_at_risk[:5]
    
    now = datetime.datetime.now()
    month = now.month
    rainy_active = (month >= 6 and month <= 11)

    return {
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


@router.get("/health")
def get_predictive_health(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not _allow_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied to predictive engine")
    assets = db.query(InfrastructureAsset).limit(200).all()
    health_scores = []
    for a in assets:
        ahs = a.condition_score if a.condition_score is not None else calculate_ahs(db, a.asset_id)
        brgy_id = int(a.barangay) if a.barangay and a.barangay.isdigit() else 170
        fvf = calculate_fvf(db, brgy_id)
        dv = calculate_dv(db, a.asset_id)
        
        report_count, freq_per_month, recurrence_rate, days_since = get_asset_incident_metrics(db, a)

        fail_prob_30 = _failure_probability(freq_per_month, recurrence_rate, days_since, a.category or "default", target_days=30)
        fail_prob_60 = max(fail_prob_30, _failure_probability(freq_per_month, recurrence_rate, days_since, a.category or "default", target_days=60))
        fail_prob_90 = max(fail_prob_60, _failure_probability(freq_per_month, recurrence_rate, days_since, a.category or "default", target_days=90))
        
        next_maint = _next_maintenance_date(ahs)
        trend = "WORSENING" if dv > 0.3 else ("IMPROVING" if dv < -0.15 else "STABLE")

        # Fetch Audit & Compliance documents
        project_ids = [p.id for p in a.projects]
        docs = db.query(SystemDocument).filter(
            SystemDocument.target_model == 'ProjectRequest',
            SystemDocument.target_id.in_(project_ids) if project_ids else False
        ).all()

        audit_compliance = []
        doc_types_map = {
            "materials_test": "Materials Test Report",
            "design_plans": "NPKI-Signed Design Plans",
            "ntp": "Notice to Proceed",
            "audit_report": "FQA Final Audit Report"
        }

        for d in docs:
            if d.document_type in doc_types_map:
                audit_compliance.append({
                    "name": doc_types_map[d.document_type],
                    "status": "verified" if d.npki_signature else "available",
                    "doc_id": d.id,
                    "file_name": d.file_name,
                    "date": d.uploaded_at.strftime("%Y-%m-%d") if d.uploaded_at else "N/A"
                })

        health_scores.append({
            "asset_id": a.asset_id,
            "asset_name": a.asset_name,
            "barangay": str(a.barangay),
            "category": a.category,
            "health_score": ahs,
            "priority": determine_priority(ahs),
            "rainy_season_warning": fvf > 60,
            "failure_probability_30d": fail_prob_30,
            "failure_probability_60d": fail_prob_60,
            "failure_probability_90d": fail_prob_90,
            "report_count": report_count,
            "trend": trend,
            "growth_pct": round(dv * 100),
            "recurrence_rate": recurrence_rate,
            "days_since_last_maintenance": days_since,
            "next_maintenance_date": next_maint,
            "freq_per_month": freq_per_month,
            "audit_compliance": audit_compliance
        })
        
    health_scores.sort(key=lambda x: x["health_score"])

    return {
        "health_scores": health_scores
    }


@router.get("/schedule")
def get_predictive_schedule(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not _allow_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied to predictive engine")
    assets = db.query(InfrastructureAsset).limit(200).all()
    
    schedule_items = []
    total_cost = 0.0
    crit_count = 0
    
    today = datetime.date.today()
    now = datetime.datetime.now()
    rainy_active = (now.month >= 6 and now.month <= 11)

    for a in assets:
        ahs = a.condition_score if a.condition_score is not None else calculate_ahs(db, a.asset_id)
        if ahs > 75: continue  # Only schedule assets needing attention
        
        pri = determine_priority(ahs)
        if pri == "CRITICAL": crit_count += 1
        
        report_count, freq_per_month, recurrence_rate, days_since = get_asset_incident_metrics(db, a)
        fail_prob = _failure_probability(freq_per_month, recurrence_rate, days_since, a.category or "default", target_days=30)
        
        next_maint = _next_maintenance_date(ahs)
        next_maint_date_obj = datetime.datetime.strptime(next_maint, "%Y-%m-%d").date()
        days_until = (next_maint_date_obj - today).days

        # Deterministic calendar week binning (1 to 4)
        week = max(1, min(4, (max(0, days_until) // 7) + 1))

        # Deterministic cost from DPWH unit price standard
        cost_key = _match_cost_key(a.category)
        unit_cost = COST_MODEL.get(cost_key, COST_MODEL["default"])["cost"]
        cost = round(unit_cost * PREVENTIVE_COST_RATIO, 2)
        total_cost += cost
        
        schedule_items.append({
            "week_number": week,
            "priority": pri,
            "rainy_season_warning": rainy_active and (a.category or "").lower() in ["drainage", "road", "pothole", "flooding"],
            "category": a.category,
            "barangay": str(a.barangay),
            "maintenance_type": "Emergency Intervention" if pri == "CRITICAL" else ("Preventive Repair" if pri == "HIGH" else "Scheduled Service"),
            "scheduled_date": next_maint,
            "estimated_cost_formatted": format_currency(cost),
            "failure_prob": fail_prob
        })
        
        if len(schedule_items) > 30:
            break
            
    # Group by week
    weekly_summary = []
    for w in range(1, 5):
        w_items = [i for i in schedule_items if i["week_number"] == w]
        w_cost = sum([float(i["estimated_cost_formatted"].replace("PHP", "").replace(",", "")) for i in w_items])
        w_crit = sum([1 for i in w_items if i["priority"] == "CRITICAL"])
        
        if w_items:
            start_d = today + datetime.timedelta(days=(w-1)*7)
            end_d = today + datetime.timedelta(days=w*7)
            weekly_summary.append({
                "week_number": w,
                "week_label": f"Week {w} ({start_d.strftime('%b %d')} - {end_d.strftime('%b %d')})",
                "item_count": len(w_items),
                "total_cost_formatted": format_currency(w_cost),
                "critical_count": w_crit
            })

    return {
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
    brgys = db.query(EnvironmentalContext).all()
    risk_map = []
    
    for b in brgys:
        b_assets = db.query(InfrastructureAsset).filter_by(barangay=str(b.barangay_id)).all()
        if not b_assets: continue
        
        sum_ahs = 0
        crit_assets = 0
        at_risk_cats = set()
        
        for a in b_assets:
            ahs = calculate_ahs(db, a.asset_id)
            sum_ahs += ahs
            if ahs <= 35: 
                crit_assets += 1
                at_risk_cats.add(a.category)
                
        avg_ahs = round(sum_ahs / len(b_assets))
        pri = determine_priority(avg_ahs)
        
        color = "#22c55e" # GOOD
        if pri == "CRITICAL": color = "#ef4444"
        elif pri == "HIGH": color = "#f97316"
        elif pri == "MODERATE": color = "#eab308"
        elif pri == "WATCH": color = "#3b82f6"
        
        risk_map.append({
            "barangay": str(b.barangay_id),
            "risk_color": color,
            "avg_health_score": avg_ahs,
            "overall_priority": pri,
            "critical_assets": crit_assets,
            "categories_at_risk": list(at_risk_cats)
        })
        
    risk_map.sort(key=lambda x: x["avg_health_score"])

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
        asset = db.query(InfrastructureAsset).filter(
            InfrastructureAsset.category == req.category,
            InfrastructureAsset.barangay == req.barangay
        ).first()

    if asset:
        ahs = calculate_ahs(db, asset.asset_id)
        env = db.query(EnvironmentalContext).filter_by(barangay_id=asset.barangay_id).first()
        
        asset_data = {
            "asset_name": asset.asset_name,
            "category": asset.category,
            "barangay": str(asset.barangay),
            "health_score": ahs,
            "material_type": asset.material_type,
            "design_life": asset.design_life,
            "environmental_risks": env.flood_risk_level if env else "Standard"
        }
    else:
        asset_data = {
            "asset_name": f"{req.category} System",
            "category": req.category,
            "barangay": req.barangay,
            "health_score": 50,
            "material_type": "Various",
            "design_life": 20
        }

    plan = gemini_service.generate_maintenance_plan(asset_data)
    
    return {
        "barangay": req.barangay,
        "category": req.category,
        "health_score": asset_data["health_score"],
        "asset_id": asset.asset_id if asset else None,
        "priority": plan.get("priority", "HIGH"),
        "maintenance_plan": plan.get("maintenance_plan", ""),
        "steps": plan.get("steps", []),
        "technical_justification": plan.get("technical_justification", ""),
        "generated_by": "Gemini-2.1-Flash-PULSO",
        "generated_at": datetime.datetime.now().isoformat(),
        "estimated_cost": plan.get("estimated_cost", 35000),
        "estimated_duration_days": plan.get("estimated_duration_days", 5)
    }


class ConvertWORequest(BaseModel):
    barangay: str
    category: str
    plan_summary: str
    priority: str
    estimated_cost: float
    asset_id: Optional[str] = None


@router.post("/convert-to-work-order")
def convert_to_work_order(
    req: ConvertWORequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not _allow_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied to convert to work order")
        
    new_wo = WorkOrder(
        title=f"Predictive Maintenance: {req.category} - Brgy. {req.barangay}",
        description=req.plan_summary,
        category=req.category,
        priority=req.priority.lower() if req.priority else "high",
        estimated_cost=req.estimated_cost,
        wo_type="preemptive",
        status="open",
        assigned_by_id=current_user.id,
        asset_id=req.asset_id,
        ai_plan_summary=req.plan_summary
    )
    
    db.add(new_wo)
    db.commit()
    db.refresh(new_wo)
    
    return {
         "wo_number": new_wo.wo_number,
         "id": new_wo.id,
         "status": "success"
    }


@router.get("/export")
def export_predictive_data(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not _allow_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied to predictive engine")
    
    import csv
    import io
    from fastapi.responses import StreamingResponse
    
    assets = db.query(InfrastructureAsset).limit(200).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Asset ID", "Asset Name", "Category", "Barangay", 
        "Health Score", "Priority", "Failure Prob 30d", 
        "Failure Prob 60d", "Failure Prob 90d", "Next Maintenance"
    ])
    
    for a in assets:
        ahs = a.condition_score if a.condition_score is not None else calculate_ahs(db, a.asset_id)
        pri = determine_priority(ahs)
        report_count, freq_per_month, recurrence_rate, days_since = get_asset_incident_metrics(db, a)

        fail_30 = _failure_probability(freq_per_month, recurrence_rate, days_since, a.category or "default", target_days=30)
        fail_60 = max(fail_30, _failure_probability(freq_per_month, recurrence_rate, days_since, a.category or "default", target_days=60))
        fail_90 = max(fail_60, _failure_probability(freq_per_month, recurrence_rate, days_since, a.category or "default", target_days=90))
        next_maint = _next_maintenance_date(ahs)
        
        writer.writerow([
            a.asset_id, a.asset_name, a.category, a.barangay,
            ahs, pri, fail_30, fail_60, fail_90, next_maint
        ])
    
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
