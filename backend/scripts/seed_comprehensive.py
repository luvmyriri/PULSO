"""
Comprehensive Seed Script for PULSO System
============================================
Implements the Final Seed Plan with:
- Layer 1: Infrastructure Assets (50+) with GPS coordinates
- Layer 2: Maintenance History (500+) with cost progression
- Layer 3: Environmental Context (20 barangays)
- Layer 4: Historical Projects (15, 2015-2020, resolved)
- Layer 5: Current Data (Users, Reports, WorkOrders, Projects, etc.)

Coherency Rules:
- Report → WorkOrder: status = approved or dispatched
- WorkOrder → Project: status = completed + high cost
- Project → Procurement: phase = procurement
- Asset → Preemptive WO: age > design_life * 0.7
"""

import sys
import os
from datetime import datetime, timedelta
import random
import uuid

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from database import SessionLocal, engine
from models import Resident, Official, Report, Notification, Advisory, PasswordResetToken
from gov_models import (
    WorkOrder, WorkOrderApproval, WorkOrderUpdate, AuditLog,
    ProcessTimeline, ProcurementRequest, BoQItem, ProjectRequest,
    OBOInspection, AgentLocation, InfrastructureAsset, MaintenanceHistory,
    EnvironmentalContext, SystemDocument
)
from sqlalchemy import func, text


# =====================================================================
# CONFIGURATION & CONSTANTS
# =====================================================================

CALOOCAN_NORTH_BARANGAYS = [
    "Bagbaguin", "Balintawak", "Bayanbayan", "Bonifacio", "Calanas",
    "Camarin", "Deparo", "Grace Park", "Kal觉醒", "Llano",
    "North Fairview", "Novaliches", "Pasong Putik", "San Agustin",
    "San Bartolome", "San Jose", "Santa Lucia", "Santo Tomas",
    "Tala", "Tugatog"
]

ROAD_PREFIXES = ["A. Bonifacio Ave", "Quirino Highway", "M.H. del Pilar", "M.N. del Pilar", "EDSA", "C-5 Road"]
BRIDGE_NAMES = ["Balintawak Bridge", "Camarin Bridge", "Novaliches Bridge", "Deparo Bridge", "Tala Bridge"]
DRAINAGE_MAIN = ["Camarin Drainage", "Deparo Main", "Fairview Canal", "Novaliches Ditch", "Tala Floodway"]
BUILDINGS = ["City Hall Bldg A", "City Hall Bldg B", "Public Market", "Sports Complex", "Library", "Health Center", "Senior Citizen Center", "Multi-purpose Hall", "Day Care Center", "Barangay Hall"]
STREET_LIGHTS = ["SL-A", "SL-B", "SL-C", "SL-D", "SL-E"]

CATEGORY_ROAD = "Road"
CATEGORY_BRIDGE = "Bridge"
CATEGORY_DRAINAGE = "Drainage"
CATEGORY_BUILDING = "Building"
CATEGORY_LIGHT = "Street Light"

WORK_TYPES = ["Patching", "Inspection", "Declogging", "Retrofitting", "Repainting", "Resurfacing", "Reconstruction", "Cleaning"]

# Caloocan North approximate center: 14.7667, 121.0500
BASE_LAT = 14.7667
BASE_LNG = 121.0500


# =====================================================================
# HELPER FUNCTIONS
# =====================================================================

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_progress(msg, count=None):
    if count:
        print(f"  [OK] {msg}: {count}")
    else:
        print(f"  [OK] {msg}")

def generate_coords(barangay_idx, offset_range=0.02):
    lat = BASE_LAT + random.uniform(-offset_range, offset_range) + (barangay_idx * 0.001)
    lng = BASE_LNG + random.uniform(-offset_range, offset_range) + (barangay_idx * 0.001)
    return {"lat": round(lat, 6), "lng": round(lng, 6)}

def random_date(start_year, end_year):
    start = datetime(start_year, 1, 1)
    end = datetime(end_year, 12, 31)
    delta = end - start
    random_days = random.randint(0, delta.days)
    return (start + timedelta(days=random_days)).date()

def random_datetime(start_year, end_year, max_days_ago=90):
    base = datetime.now() - timedelta(days=random.randint(0, max_days_ago))
    start = datetime(start_year, 1, 1)
    end = datetime(end_year, 12, 31)
    if base > end:
        base = end
    if base < start:
        base = start
    delta = base - start
    random_seconds = random.randint(0, max(1, int(delta.total_seconds())))
    return start + timedelta(seconds=random_seconds)

def get_or_create(session, model, **kwargs):
    instance = session.query(model).filter_by(**kwargs).first()
    if instance:
        return instance
    instance = model(**kwargs)
    session.add(instance)
    session.flush()
    return instance


# =====================================================================
# SEED FUNCTIONS
# =====================================================================

def seed_infrastructure_assets(session):
    """Layer 1: Create 50+ infrastructure assets with GPS coordinates"""
    print_section("LAYER 1: Infrastructure Assets (50+)")
    
    existing = session.query(InfrastructureAsset).count()
    if existing > 0:
        existing_assets = session.query(InfrastructureAsset).all()
        print_progress(f"Using existing assets", existing)
        return existing_assets
    
    assets = []
    
    # Roads (20)
    for i in range(20):
        prefix = ROAD_PREFIXES[i % len(ROAD_PREFIXES)]
        barangay = CALOOCAN_NORTH_BARANGAYS[i % len(CALOOCAN_NORTH_BARANGAYS)]
        coords = generate_coords(i)
        asset = InfrastructureAsset(
            asset_id=f"CAL-RD-{str(i+1).zfill(3)}",
            asset_name=f"{prefix} - Section {i+1}",
            category=CATEGORY_ROAD,
            gps_coordinates=coords,
            material_type=random.choice(["Asphalt", "Concrete", "Asphalt Overlay"]),
            date_completed=random_date(2014, 2020),
            design_life=20,
            original_contractor=f"Contractor {random.choice(['A', 'B', 'C', 'D'])}",
            barangay=barangay
        )
        assets.append(asset)
    
    # Bridges (5)
    for i in range(5):
        barangay = CALOOCAN_NORTH_BARANGAYS[i % len(CALOOCAN_NORTH_BARANGAYS)]
        coords = generate_coords(i + 20)
        asset = InfrastructureAsset(
            asset_id=f"CAL-BR-{str(i+1).zfill(3)}",
            asset_name=BRIDGE_NAMES[i],
            category=CATEGORY_BRIDGE,
            gps_coordinates=coords,
            material_type="Concrete/Steel",
            date_completed=random_date(2014, 2018),
            design_life=50,
            original_contractor=f"Bridge Builders Corp",
            barangay=barangay
        )
        assets.append(asset)
    
    # Drainage (10)
    for i in range(10):
        barangay = CALOOCAN_NORTH_BARANGAYS[i % len(CALOOCAN_NORTH_BARANGAYS)]
        coords = generate_coords(i + 25)
        asset = InfrastructureAsset(
            asset_id=f"CAL-DR-{str(i+1).zfill(3)}",
            asset_name=f"{DRAINAGE_MAIN[i % len(DRAINAGE_MAIN)]} Section {i+1}",
            category=CATEGORY_DRAINAGE,
            gps_coordinates=coords,
            material_type="Concrete",
            date_completed=random_date(2014, 2019),
            design_life=30,
            original_contractor=f"Drainage Works Inc",
            barangay=barangay
        )
        assets.append(asset)
    
    # Buildings (10)
    for i in range(10):
        barangay = CALOOCAN_NORTH_BARANGAYS[i % len(CALOOCAN_NORTH_BARANGAYS)]
        coords = generate_coords(i + 35)
        asset = InfrastructureAsset(
            asset_id=f"CAL-BLD-{str(i+1).zfill(3)}",
            asset_name=BUILDINGS[i],
            category=CATEGORY_BUILDING,
            gps_coordinates=coords,
            material_type="Concrete/Steel",
            date_completed=random_date(2014, 2022),
            design_life=40,
            original_contractor=f"Building Solutions {chr(65+i)}",
            barangay=barangay
        )
        assets.append(asset)
    
    # Street Lights (5)
    for i in range(5):
        barangay = CALOOCAN_NORTH_BARANGAYS[i % len(CALOOCAN_NORTH_BARANGAYS)]
        coords = generate_coords(i + 45)
        asset = InfrastructureAsset(
            asset_id=f"CAL-SL-{str(i+1).zfill(3)}",
            asset_name=f"Street Light {STREET_LIGHTS[i]} - Zone {i+1}",
            category=CATEGORY_LIGHT,
            gps_coordinates=coords,
            material_type="Steel/Pole",
            date_completed=random_date(2015, 2020),
            design_life=15,
            original_contractor="LightTech Solutions",
            barangay=barangay
        )
        assets.append(asset)
    
    session.add_all(assets)
    session.commit()
    print_progress(f"Created infrastructure assets", len(assets))
    return assets


def seed_maintenance_history(session, assets):
    """Layer 2: Create 500+ maintenance history records (2-4/year × 10 years per asset)"""
    print_section("LAYER 2: Maintenance History (500+)")
    
    existing = session.query(MaintenanceHistory).count()
    if existing > 0:
        print_progress(f"Using existing maintenance history", existing)
        return
    
    logs = []
    for asset in assets:
        # Calculate asset age
        if asset.date_completed:
            years_since_completed = (datetime.now().date() - asset.date_completed).days / 365.25
            years_to_cover = min(years_since_completed, 10)  # Cap at 10 years
        else:
            years_to_cover = 5
        
        # 2-4 interventions per year
        yearly_count = random.randint(2, 4)
        total_interventions = int(years_to_cover * yearly_count)
        
        for j in range(total_interventions):
            # Progressive cost over time (inflation factor)
            year_offset = j / yearly_count
            base_cost = random.uniform(5000, 50000)
            cost = base_cost * (1 + year_offset * 0.1)  # 10% increase per year
            
            log = MaintenanceHistory(
                log_id=str(uuid.uuid4()),
                asset_id=asset.asset_id,
                work_type=random.choice(WORK_TYPES),
                cost=round(cost, 2),
                completion_date=random_date(2014, 2025)
            )
            logs.append(log)
    
    session.add_all(logs)
    session.commit()
    print_progress(f"Created maintenance history records", len(logs))


def seed_environmental_context(session):
    """Layer 3: Create environmental context for all 20 barangays"""
    print_section("LAYER 3: Environmental Context (20 barangays)")
    
    existing = session.query(EnvironmentalContext).count()
    if existing > 0:
        print_progress(f"Using existing environmental context", existing)
        return
    
    contexts = []
    for i, barangay in enumerate(CALOOCAN_NORTH_BARANGAYS):
        context = EnvironmentalContext(
            barangay_id=i + 1,
            flood_risk_level=random.choice(["Low", "Medium", "High"]),
            soil_subsidence=random.uniform(0.1, 5.0)
        )
        contexts.append(context)
    
    session.add_all(contexts)
    session.commit()
    print_progress(f"Created environmental context records", len(contexts))


def seed_users(session):
    """Layer 5: Ensure 112 users exist with hierarchy"""
    print_section("USERS (112 target)")
    
    existing_residents = session.query(Resident).count()
    existing_officials = session.query(Official).count()
    existing_count = existing_residents + existing_officials
    
    if existing_count >= 112:
        print_progress(f"Using existing users", existing_count)
        return list(session.query(Resident).all()) + list(session.query(Official).all())
    
    users_needed = 112 - existing_count
    print(f"  Creating {users_needed} additional users...")
    
    # Create user hierarchy
    # City Engineers
    roles_data = [
        ("city_engineer", 1),
        ("assistant_city_engineer", 2),
        ("lead_engineer", 3),
        ("engineer_ii", 5),
        ("engineer_i", 8),
        ("field_engineer", 10),
        ("maintenance_foreman", 5),
        ("technical_assistant", 10),
        ("admin_officer", 5),
        ("clerk", 8),
        ("barangay_engineer", 20),
        ("resident", 40)
    ]
    
    new_users = []
    role_idx = 0
    for role, count in roles_data:
        for i in range(count):
            if len(new_users) >= users_needed:
                break
            
            display_name = role.replace("_", " ").title()
            
            if role == "resident":
                user = Resident(
                    full_name=f"User {role}_{i+1}",
                    email=f"{role}_{i+1}@pulso.gov",
                    password_hash="$2b$12$dummy_hash_for_seeding",
                    address=f"Address {i+1}",
                    phone_number=f"+639{random.randint(100000000, 999999999)}",
                    trust_score=random.randint(80, 100),
                    is_verified=True,
                    kyc_level=random.choice(["Bronze (Self-Signed)", "Silver", "Gold"]),
                    created_at=random_datetime(2020, 2025, max_days_ago=365)
                )
            else:
                user = Official(
                    full_name=f"User {role}_{i+1}",
                    email=f"{role}_{i+1}@pulso.gov",
                    password_hash="$2b$12$dummy_hash_for_seeding",
                    role=role,
                    display_name=f"Role: {display_name}",
                    account_type="government",
                    address=f"Address {i+1}",
                    phone_number=f"+639{random.randint(100000000, 999999999)}",
                    is_active=True,
                    created_at=random_datetime(2020, 2025, max_days_ago=365)
                )
            new_users.append(user)
        
        if len(new_users) >= users_needed:
            break
    
    session.add_all(new_users)
    session.commit()
    
    all_users = list(session.query(Resident).all()) + list(session.query(Official).all())
    print_progress(f"Total users", len(all_users))
    return all_users


def seed_historical_projects(session, users):
    """Layer 4: Create 15 historical projects (2015-2020, status=resolved)"""
    print_section("HISTORICAL PROJECTS (2015-2020)")
    
    existing = session.query(ProjectRequest).filter(
        ProjectRequest.status.in_(["resolved", "closed_completion_certified"])
    ).count()
    
    if existing > 0:
        print_progress(f"Using existing historical projects", existing)
        return
    
    projects = []
    for i in range(15):
        start_date = random_datetime(2015, 2020)
        completion_date = start_date + timedelta(days=random.randint(90, 365))
        
        proj = ProjectRequest(
            proj_number=f"PROJ-HIST-{str(i+1).zfill(3)}",
            requesting_party=random.choice(["Office of the Mayor", f"Brgy {random.choice(CALOOCAN_NORTH_BARANGAYS)}"]),
            barangay=random.choice(CALOOCAN_NORTH_BARANGAYS),
            title=f"Historical Infrastructure Project {i+1}",
            description=f"Completed infrastructure project from 2015-2020",
            location_string=f"Location {i+1}",
            location_lat=BASE_LAT + random.uniform(-0.02, 0.02),
            location_lng=BASE_LNG + random.uniform(-0.02, 0.02),
            status="resolved",
            current_phase=6,
            estimated_cost=random.uniform(100000, 2000000),
            is_emergency=False,
            procurement_modality="competitive_bidding",
            category=random.choice(["rehabilitation", "new_construction"]),
            created_by_id=random.choice(users).id,
            survey_engineer_id=random.choice(users).id,
            design_lead_id=random.choice(users).id,
            project_engineer_id=random.choice(users).id,
            survey_completed_at=start_date + timedelta(days=30),
            design_completed_at=start_date + timedelta(days=60),
            approved_at=start_date + timedelta(days=90),
            construction_started_at=start_date + timedelta(days=100),
            completed_at=completion_date,
            certificate_issued=True,
            certificate_issued_by_id=random.choice(users).id,
            created_at=start_date,
            updated_at=completion_date
        )
        projects.append(proj)
    
    session.add_all(projects)
    session.commit()
    print_progress(f"Created historical projects", len(projects))


def seed_reports(session, users):
    """Layer 5: Create 105 reports with various statuses and 90-day spread"""
    print_section("REPORTS (105)")
    
    existing = session.query(Report).count()
    if existing > 0:
        print_progress(f"Using existing reports", existing)
        return session.query(Report).all()
    
    reports = []
    statuses = ["pending", "approved", "dispatched", "in_progress", "resolved", "rejected"]
    categories = ["Road", "Bridge", "Drainage", "Street Light", "Building", "Other"]
    
    for i in range(105):
        user = random.choice(users)
        created_at = random_datetime(2025, 2025, max_days_ago=90)
        
        report = Report(
            ticket_id=f"RPT-{str(uuid.uuid4().int)[:8]}",
            resident_id=user.id,
            category=random.choice(categories),
            description=f"Report description {i+1} - {random.choice(['Pothole', 'Flooding', 'Broken light', 'Crack', 'Blocked drainage'])}",
            location_lat=BASE_LAT + random.uniform(-0.02, 0.02),
            location_lng=BASE_LNG + random.uniform(-0.02, 0.02),
            location_string=f"Location {random.choice(CALOOCAN_NORTH_BARANGAYS)}",
            status=random.choice(statuses),
            location_barangay=random.choice(CALOOCAN_NORTH_BARANGAYS),
            cluster_id=random.randint(1, 10) if random.random() > 0.3 else None,
            citizen_trust_score=random.randint(50, 100),
            kyc_tier_at_report=random.choice(["Bronze (Self-Signed)", "Silver", "Gold"]),
            ai_category=random.choice(categories),
            ai_urgency=random.choice(["low", "medium", "high", "critical"]),
            ai_summary=f"AI Analysis summary for report {i+1}",
            severity_score=random.uniform(0, 100),
            created_at=created_at,
            updated_at=created_at + timedelta(hours=random.randint(1, 48))
        )
        reports.append(report)
    
    session.add_all(reports)
    session.commit()
    print_progress(f"Created reports", len(reports))
    return reports


def seed_workorders(session, users, reports, assets):
    """Layer 5: Create 45 work orders (standard + preemptive)"""
    print_section("WORK ORDERS (45)")
    
    existing = session.query(WorkOrder).count()
    if existing > 0:
        print_progress(f"Using existing work orders", existing)
        return session.query(WorkOrder).all()
    
    workorders = []
    
    # Get approved/dispatched reports for linking
    linked_reports = [r for r in reports if r.status in ["approved", "dispatched", "in_progress"]]
    
    # Standard work orders (from reports) - 30
    for i in range(30):
        report = random.choice(linked_reports) if linked_reports else None
        asset = random.choice(assets)
        
        wo = WorkOrder(
            wo_number=f"WO-{str(uuid.uuid4().int)[:8]}",
            report_id=report.id if report else None,
            asset_id=asset.asset_id,
            assigned_by_id=random.choice([u for u in users if isinstance(u, Official) and u.role in ["city_engineer", "lead_engineer", "engineer_ii"]]).id,
            assigned_to_id=random.choice([u for u in users if isinstance(u, Official) and u.role in ["field_engineer", "maintenance_foreman", "technical_assistant"]]).id,
            title=f"Work Order {i+1} - {asset.asset_name}",
            description=f"Work order for {asset.category}",
            wo_type="standard",
            status=random.choice(["open", "assigned", "in_progress", "completed"]),
            priority=random.choice(["low", "normal", "high", "critical"]),
            priority_score=random.uniform(0, 100),
            assignment_type="territorial",
            district_id=random.randint(1, 3),
            scheduled_date=datetime.now() + timedelta(days=random.randint(1, 14)),
            category=asset.category,
            estimated_cost=random.uniform(5000, 100000),
            created_at=random_datetime(2025, 2025, max_days_ago=60)
        )
        workorders.append(wo)
    
    # Preemptive work orders (from assets with age > design_life * 0.7) - 15
    now = datetime.now().date()
    for i in range(15):
        asset = random.choice(assets)
        
        # Calculate age percentage
        if asset.date_completed:
            age_years = (now - asset.date_completed).days / 365.25
            age_percentage = age_years / asset.design_life
        else:
            age_percentage = 0.5
        
        # Only create preemptive if age > 70% of design life
        if age_percentage >= 0.7 or random.random() > 0.5:
            wo = WorkOrder(
                wo_number=f"WO-PRE-{str(uuid.uuid4().int)[:8]}",
                asset_id=asset.asset_id,
                assigned_by_id=random.choice([u for u in users if isinstance(u, Official) and u.role in ["city_engineer", "lead_engineer"]]).id,
                assigned_to_id=random.choice([u for u in users if isinstance(u, Official) and u.role in ["field_engineer", "maintenance_foreman"]]).id,
                title=f"Preemptive Maintenance - {asset.asset_name}",
                description=f"Preventive maintenance based on asset age ({age_percentage:.1%})",
                wo_type="preemptive",
                status=random.choice(["open", "assigned", "in_progress"]),
                priority="high",
                priority_score=random.uniform(70, 100),
                assignment_type="territorial",
                district_id=random.randint(1, 3),
                category=asset.category,
                estimated_cost=random.uniform(10000, 80000),
                created_at=random_datetime(2025, 2025, max_days_ago=30)
            )
            workorders.append(wo)
    
    session.add_all(workorders)
    session.commit()
    print_progress(f"Created work orders", len(workorders))
    return workorders


def seed_project_requests(session, users):
    """Layer 5: Create 22 project requests (15 citizen-initiated + 7 strategic)"""
    print_section("PROJECT REQUESTS (22)")
    
    existing = session.query(ProjectRequest).filter(
        ~ProjectRequest.proj_number.like("PROJ-HIST-%")
    ).count()
    
    if existing > 0:
        print_progress(f"Using existing project requests", existing)
        return session.query(ProjectRequest).all()
    
    projects = []
    
    # Citizen-initiated projects - 15
    for i in range(15):
        proj = ProjectRequest(
            proj_number=f"PROJ-CIT-{str(i+1).zfill(3)}",
            requesting_party=f"Citizen / Brgy {random.choice(CALOOCAN_NORTH_BARANGAYS)}",
            barangay=random.choice(CALOOCAN_NORTH_BARANGAYS),
            title=f"Citizen-Initiated Project {i+1}",
            description=f"Project requested by citizens in barangay",
            location_string=f"Location in barangay",
            location_lat=BASE_LAT + random.uniform(-0.02, 0.02),
            location_lng=BASE_LNG + random.uniform(-0.02, 0.02),
            status=random.choice(["request_received", "survey_in_progress", "survey_complete", "design_in_progress", "boq_submitted", "pending_budget_check", "budget_confirmed", "approved_by_city_engineer", "dispatched", "in_progress", "milestone_inspections"]),
            current_phase=random.randint(1, 5),
            estimated_cost=random.uniform(50000, 1500000),
            is_emergency=random.choice([True, False]),
            procurement_modality=random.choice(["competitive_bidding", "small_value", "direct_contracting"]),
            category=random.choice(["rehabilitation", "new_construction", "emergency_repair", "maintenance"]),
            created_by_id=random.choice([u for u in users if isinstance(u, Resident)]).id,
            created_at=random_datetime(2024, 2025, max_days_ago=180)
        )
        projects.append(proj)
    
    # Strategic/LGU-initiated projects - 7
    for i in range(7):
        proj = ProjectRequest(
            proj_number=f"PROJ-STR-{str(i+1).zfill(3)}",
            requesting_party="Office of the Mayor / City Engineering Office",
            barangay=random.choice(CALOOCAN_NORTH_BARANGAYS),
            title=f"Strategic Infrastructure Project {i+1}",
            description=f"Strategic infrastructure project for city development",
            location_string=f"Strategic location",
            location_lat=BASE_LAT + random.uniform(-0.02, 0.02),
            location_lng=BASE_LNG + random.uniform(-0.02, 0.02),
            status=random.choice(["request_received", "survey_in_progress", "design_in_progress", "boq_submitted", "approved_by_city_engineer", "dispatched", "in_progress"]),
            current_phase=random.randint(1, 5),
            estimated_cost=random.uniform(1000000, 5000000),
            is_emergency=False,
            procurement_modality="competitive_bidding",
            category=random.choice(["new_construction", "rehabilitation"]),
            created_by_id=random.choice([u for u in users if isinstance(u, Official)]).id,
            created_at=random_datetime(2024, 2025, max_days_ago=120)
        )
        projects.append(proj)
    
    session.add_all(projects)
    session.commit()
    print_progress(f"Created project requests", len(projects))
    return projects


def seed_procurement_requests(session, users, workorders, projects):
    """Layer 5: Create 12 procurement requests + 60 BoQ items"""
    print_section("PROCUREMENT REQUESTS (12 + 60 BoQ items)")
    
    existing = session.query(ProcurementRequest).count()
    if existing > 0:
        print_progress(f"Using existing procurement requests", existing)
        return
    
    procurements = []
    boq_items = []
    
    for i in range(12):
        # Link to either work order or project
        source = random.choice(["workorder", "project"])
        if source == "workorder" and workorders:
            linked_id = random.choice(workorders).id
            source_id = None
            work_order_id = linked_id
            project_id = None
        else:
            linked_id = random.choice(projects).id
            source_id = linked_id
            work_order_id = None
            project_id = linked_id
        
        pr = ProcurementRequest(
            pr_number=f"PRQ-{str(uuid.uuid4().int)[:8]}",
            work_order_id=work_order_id,
            project_id=project_id,
            raised_by_id=random.choice([u for u in users if isinstance(u, Official) and u.role in ["engineer_ii", "field_engineer"]]).id,
            validated_by_id=random.choice([u for u in users if isinstance(u, Official) and u.role in ["admin_officer"]]).id if random.random() > 0.3 else None,
            approved_by_id=random.choice([u for u in users if isinstance(u, Official) and u.role in ["city_engineer", "lead_engineer"]]).id if random.random() > 0.3 else None,
            title=f"Procurement Request {i+1}",
            purpose=f"Procurement for materials and services",
            status=random.choice(["draft", "submitted", "validated", "sent_to_procurement", "procured"]),
            funding_certified=random.choice([True, False]),
            obr_number=f"OBR-{random.randint(10000, 99999)}" if random.random() > 0.5 else None,
            cash_released=random.choice([True, False]) if random.random() > 0.5 else False,
            ntp_issued=random.choice([True, False]) if random.random() > 0.5 else False,
            created_at=random_datetime(2024, 2025, max_days_ago=90)
        )
        procurements.append(pr)
    
    session.add_all(procurements)
    session.flush()
    
    # Create 5 BoQ items per procurement (60 total)
    item_names = ["Cement", "Sand", "Gravel", "Asphalt", "Steel Bars", "Concrete Mix", "Paint", "Steel Pipes", "Aggregate", "Primer"]
    units = ["bags", "cubic meters", "tons", "liters", "pieces", "kg"]
    
    for pr in procurements:
        items_count = random.randint(3, 8)
        for j in range(items_count):
            quantity = random.uniform(10, 1000)
            unit_cost = random.uniform(100, 5000)
            boq = BoQItem(
                procurement_request_id=pr.id,
                item_name=random.choice(item_names),
                unit=random.choice(units),
                quantity=quantity,
                unit_cost=unit_cost,
                total_cost=quantity * unit_cost,
                specifications=f"Item specification {j+1}"
            )
            boq_items.append(boq)
    
    session.add_all(boq_items)
    session.commit()
    print_progress(f"Created procurement requests", len(procurements))
    print_progress(f"Created BoQ items", len(boq_items))


def seed_advisories(session):
    """Layer 5: Create 25 advisories (all categories)"""
    print_section("ADVISORIES (25)")
    
    existing = session.query(Advisory).count()
    if existing > 0:
        print_progress(f"Using existing advisories", existing)
        return
    
    advisories = []
    departments = ["City Engineering Office", "Mayor's Office", "DPWH", "MMDA", "Barangay Council"]
    categories = ["Construction", "Traffic", "Flood", "Safety", "Maintenance", "Emergency"]
    priorities = ["low", "medium", "high", "critical"]
    
    for i in range(25):
        adv = Advisory(
            advisory_id=f"PUB-{str(uuid.uuid4().int)[:8]}",
            department=random.choice(departments),
            title=f"Advisory {i+1}: {random.choice(['Road Work', 'Flood Warning', 'Traffic Update', 'Maintenance Schedule', 'Safety Notice'])}",
            description=f"Important advisory for residents of Caloocan North",
            priority=random.choice(priorities),
            category=random.choice(categories),
            has_image=random.choice([True, False]),
            stats_views=random.randint(10, 500),
            stats_affected=f"{random.randint(100, 10000)} residents",
            created_at=random_datetime(2024, 2025, max_days_ago=60)
        )
        advisories.append(adv)
    
    session.add_all(advisories)
    session.commit()
    print_progress(f"Created advisories", len(advisories))


def seed_obo_inspections(session, users):
    """Layer 5: Create 12 OBO inspections"""
    print_section("OBO INSPECTIONS (12)")
    
    existing = session.query(OBOInspection).count()
    if existing > 0:
        print_progress(f"Using existing OBO inspections", existing)
        return
    
    inspections = []
    types = ["building", "electrical", "mechanical"]
    
    for i in range(12):
        ins = OBOInspection(
            obo_number=f"OBO-{str(uuid.uuid4().int)[:8]}",
            applicant_name=f"Applicant {i+1}",
            applicant_contact=f"+639{random.randint(100000000, 999999999)}",
            property_address=f"Property Address {i+1}",
            location_lat=BASE_LAT + random.uniform(-0.02, 0.02),
            location_lng=BASE_LNG + random.uniform(-0.02, 0.02),
            barangay=random.choice(CALOOCAN_NORTH_BARANGAYS),
            inspection_type=random.choice(types),
            status=random.choice(["application_received", "inspection_scheduled", "inspection_complete", "permit_issued", "notice_issued"]),
            assigned_inspector_id=random.choice([u for u in users if isinstance(u, Official) and u.role in ["engineer_ii", "field_engineer"]]).id,
            filed_by_id=random.choice([u for u in users if isinstance(u, Official)]).id,
            inspection_date=random_datetime(2024, 2025, max_days_ago=60),
            findings=f"Inspection findings for case {i+1}",
            is_compliant=random.choice([True, False, None]),
            arch_review=random.choice(["pending", "approved", "rejected"]),
            civil_review=random.choice(["pending", "approved", "rejected"]),
            elec_review=random.choice(["pending", "approved", "rejected"]),
            sani_review=random.choice(["pending", "approved", "rejected"]),
            mech_review=random.choice(["pending", "approved", "rejected"]),
            order_of_payment_fee=random.uniform(500, 10000),
            payment_verified=random.choice([True, False]),
            created_at=random_datetime(2024, 2025, max_days_ago=90)
        )
        inspections.append(ins)
    
    session.add_all(inspections)
    session.commit()
    print_progress(f"Created OBO inspections", len(inspections))


def seed_process_timelines(session, reports, workorders, projects):
    """Layer 5: Create 300+ process timelines (full lifecycle tracking)"""
    print_section("PROCESS TIMELINES (300+)")
    
    existing = session.query(ProcessTimeline).count()
    if existing > 0:
        print_progress(f"Using existing process timelines", existing)
        return
    
    timelines = []
    
    # Timeline entries for Reports
    for report in reports:
        statuses = ["pending", "approved", "dispatched", "in_progress", "resolved"]
        current_idx = statuses.index(report.status) if report.status in statuses else 0
        
        for idx in range(current_idx + 1):
            timeline = ProcessTimeline(
                report_id=report.id,
                status=statuses[idx],
                previous_status=statuses[idx - 1] if idx > 0 else None,
                actor_id=random.choice([u for u in users if isinstance(u, Official)]).id,
                actor_role=random.choice(["engineer", "clerk", "admin"]),
                note=f"Status update: {statuses[idx]}",
                is_public=True,
                created_at=report.created_at + timedelta(hours=idx * 24)
            )
            timelines.append(timeline)
    
    # Timeline entries for WorkOrders
    for wo in workorders:
        statuses = ["open", "assigned", "in_progress", "completed"]
        current_idx = statuses.index(wo.status) if wo.status in statuses else 0
        
        for idx in range(current_idx + 1):
            timeline = ProcessTimeline(
                work_order_id=wo.id,
                status=statuses[idx],
                previous_status=statuses[idx - 1] if idx > 0 else None,
                actor_id=random.choice([u for u in users if isinstance(u, Official)]).id,
                actor_role="engineer",
                note=f"Work order status: {statuses[idx]}",
                is_public=False,
                created_at=wo.created_at + timedelta(hours=idx * 12)
            )
            timelines.append(timeline)
    
    # Timeline entries for Projects
    for proj in projects:
        statuses = ["request_received", "survey_in_progress", "survey_complete", "design_in_progress", "boq_submitted", "pending_budget_check", "budget_confirmed", "approved_by_city_engineer", "dispatched", "in_progress", "milestone_inspections", "resolved", "closed_completion_certified"]
        current_phase = proj.current_phase
        current_status = proj.status
        
        for idx in range(min(current_phase + 1, len(statuses))):
            timeline = ProcessTimeline(
                project_id=proj.id,
                status=statuses[idx],
                previous_status=statuses[idx - 1] if idx > 0 else None,
                actor_id=random.choice([u for u in users if isinstance(u, Official)]).id,
                actor_role="engineer",
                note=f"Project phase: {statuses[idx]}",
                is_public=True,
                created_at=proj.created_at + timedelta(days=idx * 15)
            )
            timelines.append(timeline)
    
    session.add_all(timelines)
    session.commit()
    print_progress(f"Created process timelines", len(timelines))


def seed_audit_logs(session, reports, workorders, projects):
    """Create audit logs for tracking actions"""
    print_section("AUDIT LOGS")
    
    existing = session.query(AuditLog).count()
    if existing > 0:
        print_progress(f"Using existing audit logs", existing)
        return
    
    audit_logs = []
    trigger_types = ["maintenance", "anomaly", "status_change", "procurement", "role_change"]
    
    # Generate audit logs from reports
    for report in reports[:30]:
        log = AuditLog(
            trigger_type=random.choice(trigger_types),
            report_id=report.id,
            actor_id=random.choice([u for u in users if isinstance(u, Official)]).id,
            actor_role="engineer",
            action=f"Report status changed to {report.status}",
            details=f"Audit log for report {report.id}",
            created_at=report.created_at + timedelta(hours=random.randint(1, 48))
        )
        audit_logs.append(log)
    
    # Generate audit logs from work orders
    for wo in workorders[:20]:
        log = AuditLog(
            trigger_type="maintenance",
            work_order_id=wo.id,
            actor_id=random.choice([u for u in users if isinstance(u, Official)]).id,
            actor_role="field_engineer",
            action=f"Work order {wo.status}",
            details=f"Maintenance audit for work order",
            created_at=wo.created_at + timedelta(hours=random.randint(1, 24))
        )
        audit_logs.append(log)
    
    session.add_all(audit_logs)
    session.commit()
    print_progress(f"Created audit logs", len(audit_logs))


# =====================================================================
# MAIN EXECUTION
# =====================================================================

def main():
    if os.getenv("PULSO_ALLOW_DESTRUCTIVE_SEED") != "true":
        raise RuntimeError("Refusing broad seed. Set PULSO_ALLOW_DESTRUCTIVE_SEED=true explicitly.")
    print("\n" + "="*60)
    print("  PULSO COMPREHENSIVE SEED SCRIPT")
    print("  Final Seed Plan Implementation")
    print("="*60)
    
    session = SessionLocal()
    
    try:
        # Layer 1: Infrastructure Assets
        assets = seed_infrastructure_assets(session)
        
        # Layer 2: Maintenance History
        seed_maintenance_history(session, assets)
        
        # Layer 3: Environmental Context
        seed_environmental_context(session)
        
        # Layer 5: Users (must exist before other data)
        users = seed_users(session)
        
        # Layer 4: Historical Projects
        seed_historical_projects(session, users)
        
        # Layer 5: Reports
        reports = seed_reports(session, users)
        
        # Layer 5: Work Orders (links to reports)
        workorders = seed_workorders(session, users, reports, assets)
        
        # Layer 5: Project Requests
        projects = seed_project_requests(session, users)
        
        # Layer 5: Procurement + BoQ
        seed_procurement_requests(session, users, workorders, projects)
        
        # Layer 5: Advisories
        seed_advisories(session)
        
        # Layer 5: OBO Inspections
        seed_obo_inspections(session, users)
        
        # Layer 5: Process Timelines (full lifecycle)
        seed_process_timelines(session, reports, workorders, projects)
        
        # Audit Logs
        seed_audit_logs(session, reports, workorders, projects)
        
        # Final Summary
        print("\n" + "="*60)
        print("  FINAL COUNT SUMMARY")
        print("="*60)
        
        counts = {
            "InfrastructureAssets": session.query(InfrastructureAsset).count(),
            "MaintenanceHistory": session.query(MaintenanceHistory).count(),
            "EnvironmentalContext": session.query(EnvironmentalContext).count(),
            "HistoricalProjects": session.query(ProjectRequest).filter(
                ProjectRequest.proj_number.like("PROJ-HIST-%")
            ).count(),
            "Residents": session.query(Resident).count(),
            "Officials": session.query(Official).count(),
            "Reports": session.query(Report).count(),
            "WorkOrders": session.query(WorkOrder).count(),
            "ProjectRequests": session.query(ProjectRequest).filter(
                ~ProjectRequest.proj_number.like("PROJ-HIST-%")
            ).count(),
            "ProcurementRequests": session.query(ProcurementRequest).count(),
            "BoQItems": session.query(BoQItem).count(),
            "Advisories": session.query(Advisory).count(),
            "OBOInspections": session.query(OBOInspection).count(),
            "ProcessTimelines": session.query(ProcessTimeline).count(),
            "AuditLogs": session.query(AuditLog).count()
        }
        
        for table, count in counts.items():
            print(f"  {table}: {count}")
        
        total = sum(counts.values())
        print(f"\n  GRAND TOTAL: {total}+ records")
        
        print("\n" + "="*60)
        print("  SEED COMPLETED SUCCESSFULLY")
        print("="*60)
        
    except Exception as e:
        print(f"\n[ERROR] Seed failed: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
