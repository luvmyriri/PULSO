from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from gov_models import InfrastructureAsset, EnvironmentalContext, MaintenanceHistory, SystemDocument, ProjectRequest, WorkOrder
from predictive_engine import calculate_ahs, calculate_dv, calculate_ci, calculate_fvf
import gemini_service
import datetime
import random
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

@router.get("/summary")
def get_predictive_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not _allow_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied to predictive engine")
    assets = db.query(InfrastructureAsset).limit(200).all() # limiting to a subset for performance
    
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

    for a in assets:
        ahs = calculate_ahs(db, a.asset_id)
        dv = calculate_dv(db, a.asset_id)
        ahs_sum += ahs
        
        priority = determine_priority(ahs)
        
        if priority == "CRITICAL": critical_count += 1
        elif priority == "HIGH": high_count += 1
        elif priority == "GOOD": good_count += 1
            
        fail_prob = min(1.0, max(0.0, (100 - ahs) / 100.0 + (dv / 2.0)))
        
        if fail_prob > 0.8: urgent_cnt += 1
        if dv > 2.0 or ahs <= 15: immediate_cnt += 1
            
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
        "scheduled_90d_cost_formatted": format_currency(urgent_cnt * 12500), # Mock calc
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
        ahs = calculate_ahs(db, a.asset_id)
        brgy_id = int(a.barangay) if a.barangay and a.barangay.isdigit() else 170
        fvf = calculate_fvf(db, brgy_id)
        dv = calculate_dv(db, a.asset_id)
        
        # Calculate probabilities (placeholder logic)
        fail_prob_30 = round(random.uniform(0.01, 0.1), 2)
        fail_prob_60 = round(random.uniform(0.1, 0.25), 2)
        fail_prob_90 = round(random.uniform(0.2, 0.5), 2)
        
        trend = "INCREASING" if ahs < 60 else "STABLE"

        # Fetch Audit & Compliance documents
        # Linked via ProjectRequest target_model
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
            "report_count": random.randint(0, 10),
            "trend": trend,
            "growth_pct": round(dv * 100),
            "recurrence_rate": round(random.uniform(0.1, 0.4), 2),
            "days_since_last_maintenance": random.randint(10, 300),
            "next_maintenance_date": (datetime.datetime.now() + datetime.timedelta(days=random.randint(5, 60))).strftime("%Y-%m-%d"),
            "freq_per_month": round(random.uniform(0.1, 2.0), 1),
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
    total_cost = 0
    crit_count = 0
    
    now = datetime.datetime.now()
    rainy_active = (now.month >= 6 and now.month <= 11)

    for a in assets:
        ahs = calculate_ahs(db, a.asset_id)
        if ahs > 60: continue # Only schedule high-risk
        
        pri = determine_priority(ahs)
        if pri == "CRITICAL": crit_count += 1
        
        week = random.randint(1, 4)
        cost = random.randint(5000, 50000)
        total_cost += cost
        
        schedule_items.append({
            "week_number": week,
            "priority": pri,
            "rainy_season_warning": rainy_active and a.category in ["Drainage", "Road"],
            "category": a.category,
            "barangay": str(a.barangay),
            "maintenance_type": "Preventive Repair" if pri == "HIGH" else "Urgent Action",
            "scheduled_date": (now + datetime.timedelta(days=week*7)).strftime("%Y-%m-%d"),
            "estimated_cost_formatted": format_currency(cost),
            "failure_prob": round((100 - ahs) / 100, 2)
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
            weekly_summary.append({
                "week_number": w,
                "week_label": f"Week {w} ({(now + datetime.timedelta(days=(w-1)*7)).strftime('%b %d')} - {(now + datetime.timedelta(days=w*7)).strftime('%b %d')})",
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
        # Get assets in this brgy
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
        
    # Find asset details for better AI context
    asset = None
    if req.asset_id:
        asset = db.query(InfrastructureAsset).filter_by(asset_id=req.asset_id).first()
    
    if not asset:
        # Fallback: find first asset matching category/brgy
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
        # Generic plan if no asset found
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
        
    # 1. Create the Work Order
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
    
    # Try to resolve district if possible
    # (Simplified for now, could use a mapping)
    
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
        ahs = calculate_ahs(db, a.asset_id)
        dv = calculate_dv(db, a.asset_id)
        pri = determine_priority(ahs)
        fail_30 = round(random.uniform(0.01, 0.1), 2)
        fail_60 = round(random.uniform(0.1, 0.25), 2)
        fail_90 = round(random.uniform(0.2, 0.5), 2)
        
        writer.writerow([
            a.asset_id, a.asset_name, a.category, a.barangay,
            ahs, pri, fail_30, fail_60, fail_90,
            (datetime.datetime.now() + datetime.timedelta(days=random.randint(5, 60))).strftime("%Y-%m-%d")
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=predictive_maintenance.csv"}
    )

