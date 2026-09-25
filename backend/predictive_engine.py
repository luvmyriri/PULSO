import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, String
from typing import Optional

from gov_models import InfrastructureAsset, MaintenanceHistory, EnvironmentalContext

def fetch_asset_by_id(db: Session, asset_id: str) -> Optional[InfrastructureAsset]:
    return db.query(InfrastructureAsset).filter_by(asset_id=asset_id).first()

def calculate_ahs(db: Session, asset_id: str) -> float:
    """
    Asset Health Score (AHS) Multi-Factor Model:
    100 - [(AgePenalty*25) + (FreqPenalty*20) + (SevPenalty*20) + (QAPenalty*25) + (FloodPenalty*10)]
    """
    asset = fetch_asset_by_id(db, asset_id)
    if not asset:
        return 100.0

    # 1. Age Factor (25%)
    age_years = 0
    if asset.date_completed:
        delta = datetime.date.today() - asset.date_completed
        age_years = delta.days / 365.25
    
    design_life = asset.design_life if asset.design_life else 20
    age_ratio = min(age_years / design_life, 1.0) if design_life > 0 else 0
    age_penalty = age_ratio * 25

    # 2. Report Frequency Factor (20%)
    ninety_days_ago = datetime.date.today() - datetime.timedelta(days=90)
    # Exclude Resolution/Repair types from Frequency Penalty
    # We only count 'Incident' or generic reports that indicate a problem.
    resolution_types = ["Patching", "Declogging", "Retrofitting", "Repainting", "Repair", "Maintenance"]
    
    reports = db.query(MaintenanceHistory).filter(
        MaintenanceHistory.asset_id == asset_id,
        MaintenanceHistory.completion_date >= ninety_days_ago,
        ~MaintenanceHistory.work_type.in_(resolution_types)
    ).all()
    
    report_freq = len(reports)
    freq_ratio = min(report_freq / 5.0, 1.0) # 5 reports in 90 days = 1.0
    freq_penalty = freq_ratio * 20

    # 3. Severity (Cost-Based) Factor (20%)
    severity_sum = 0
    for r in reports:
        # high cost (>100k) is severe (10). Scale 1-10
        sev = min((r.cost or 0) / 10000.0, 10.0) 
        severity_sum += max(sev, 1.0)
        
    severity_avg = (severity_sum / report_freq) if report_freq > 0 else 0.0
    sev_ratio = severity_avg / 10.0
    sev_penalty = sev_ratio * 20

    # 4. Quality Audit History (25%) - Count rejections from linked projects
    rejection_count = 0
    from gov_models import ProjectRequest
    linked_projects = db.query(ProjectRequest).filter(ProjectRequest.asset_id == asset_id).all()
    for p in linked_projects:
        rejection_count += (p.qa_rejection_count or 0)
    
    qa_ratio = min(rejection_count / 5.0, 1.0) # 5 cumulative rejections is max penalty
    qa_penalty = qa_ratio * 25

    # 5. Flood Risk Level (10%) - NEW
    flood_penalty = 0
    if asset.barangay:
        # Try finding by barangay name or ID mapping
        env = db.query(EnvironmentalContext).filter(
            (EnvironmentalContext.barangay_id.cast(String) == asset.barangay)
        ).first()
        
        if env:
            if env.flood_risk_level == 'High':
                flood_penalty = 10
            elif env.flood_risk_level == 'Medium':
                flood_penalty = 5
            elif env.flood_risk_level == 'Low':
                flood_penalty = 0

    ahs_result = 100 - (age_penalty + freq_penalty + sev_penalty + qa_penalty + flood_penalty)
    
    return max(round(ahs_result, 2), 0.0)


def calculate_dv(db: Session, asset_id: str) -> float:
    """
    Deterioration Velocity (DV) = (NewReports - OldReports) / TimeInterval
    TimeInterval = 90 days.
    OldReports = 91-180 days ago
    NewReports = 0-90 days ago
    """
    now = datetime.date.today()
    interval_1_end = now - datetime.timedelta(days=90)
    interval_2_end = now - datetime.timedelta(days=180)

    # new reports
    new_reports = db.query(func.count(MaintenanceHistory.log_id)).filter(
        MaintenanceHistory.asset_id == asset_id,
        MaintenanceHistory.completion_date >= interval_1_end
    ).scalar()

    old_reports = db.query(func.count(MaintenanceHistory.log_id)).filter(
        MaintenanceHistory.asset_id == asset_id,
        MaintenanceHistory.completion_date < interval_1_end,
        MaintenanceHistory.completion_date >= interval_2_end
    ).scalar()

    # DV formula simplified
    if old_reports == 0:
        return float(new_reports)  # if 0 old, and 5 new, DV = 5.0 (flagged)

    dv = (new_reports - old_reports) / float(old_reports)
    return round(dv, 2)


def calculate_ci(db: Session, asset_id: str) -> float:
    """
    Criticality Index (CI) = (PopulationDensity * 0.4) + (FacilityProximity * 0.4) + (TrafficVolume * 0.2)
    Will mock traffic and population based on Brgy context.
    """
    asset = fetch_asset_by_id(db, asset_id)
    if not asset:
        return 0.0

    # Psuedo logic mapping for demonstration
    brgy = int(asset.barangay) if asset.barangay and asset.barangay.isdigit() else 170
    
    # Base density on barangay number (176 is largest in Caloocan)
    population_density = 100 if brgy == 176 else 60
    
    # Base proximity on category
    facility_proximity = 100 if asset.category in ["Bridge", "Road"] else 50
    
    # Base traffic on category
    traffic_volume = 100 if asset.category == "Road" else 20
    
    ci = (population_density * 0.4) + (facility_proximity * 0.4) + (traffic_volume * 0.2)
    return round(ci, 2)


def calculate_fvf(db: Session, barangay_id: int) -> float:
    """
    Flood Vulnerability Forecast (FVF) = (RainfallForecast * 0.5) + (HistoricalFloodLevel * 0.3) + (DrainageClogRate * 0.2)
    """
    env = db.query(EnvironmentalContext).filter_by(barangay_id=barangay_id).first()
    
    historical_level = 0
    if env:
        if env.flood_risk_level == 'High': historical_level = 100
        elif env.flood_risk_level == 'Medium': historical_level = 50
        else: historical_level = 20

    # Mock rainfall cast from weather API pseudo-value
    rainfall_forecast = 85.0 
    
    # Mock drainage clog rate
    drainage_clog_rate = 60.0
    
    fvf = (rainfall_forecast * 0.5) + (historical_level * 0.3) + (drainage_clog_rate * 0.2)
    return round(fvf, 2)
