"""
========================================================================================
PULSO E2E Test Harness: Government Workspace UI & Operational System
========================================================================================
Provides:
  - Isolated In-Memory SQLite Database Engine (StaticPool)
  - Full Domain SQLAlchemy Models (Reports, Work Orders, Blockers, Inspections, Assets,
    Predictive Scores, Governed Announcements, Corrections, Deliveries, Audit Logs)
  - Complete FastAPI Application mounting all interface contracts defined in PROJECT.md
  - Cryptographic Authentication & RBAC Helpers (Admin, Engineer, Field Worker, Inspector, Dispatcher)
  - Direct TestClient instances and fixture generators
========================================================================================
"""

import os
import sys
import uuid
import json
import math
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Union

from fastapi import FastAPI, Depends, HTTPException, status, Header, Query, Path, Body
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field
from sqlalchemy import (
    create_engine, Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON, func
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.pool import StaticPool
from jose import jwt, JWTError
import bcrypt

# Ensure backend directory is importable
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Import geometry utilities from project backend
try:
    from utils.geometry_utils import is_in_caloocan, get_district_from_coords, calculate_haversine_distance
except ImportError:
    # High-fidelity fallback if run outside backend context
    def is_in_caloocan(lat: float, lng: float) -> bool:
        return (14.63 <= lat <= 14.82) and (120.95 <= lng <= 121.08)

    def get_district_from_coords(lat: float, lng: float) -> Optional[int]:
        if not is_in_caloocan(lat, lng):
            return None
        return 3 if lat >= 14.69 else 1

    def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371000  # meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        a = (math.sin(delta_phi / 2.0) ** 2 +
             math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c

# ─────────────────────────────────────────────────────────────────────────────────────
# Cryptographic & Auth Constants
# ─────────────────────────────────────────────────────────────────────────────────────
JWT_SECRET_KEY = "PULSO_E2E_GOV_TEST_SECRET_2026"
JWT_ALGORITHM = "HS256"

# User IDs and Roles
ROLE_SYSTEM_ADMIN = "system_admin"
ROLE_PROJECT_ENGINEER = "project_engineer"
ROLE_FIELD_WORKER = "field_worker"
ROLE_INSPECTOR = "inspector"
ROLE_DISPATCHER = "dispatcher"
ROLE_RESIDENT = "resident"

TEST_USERS = {
    1: {"id": 1, "email": "admin@pulso.gov", "full_name": "Engr. Admin Caloocan", "role": ROLE_SYSTEM_ADMIN, "barangay": "172", "district": 3},
    2: {"id": 2, "email": "engineer@pulso.gov", "full_name": "Engr. Roberto Cruz", "role": ROLE_PROJECT_ENGINEER, "barangay": "175", "district": 3},
    3: {"id": 3, "email": "worker@pulso.gov", "full_name": "Juan Dela Cruz", "role": ROLE_FIELD_WORKER, "barangay": "176", "district": 3},
    4: {"id": 4, "email": "inspector@pulso.gov", "full_name": "Arch. Maria Santos", "role": ROLE_INSPECTOR, "barangay": "171", "district": 3},
    5: {"id": 5, "email": "dispatcher@pulso.gov", "full_name": "Clara Reyes", "role": ROLE_DISPATCHER, "barangay": "Monumento", "district": 1},
    6: {"id": 6, "email": "resident@gmail.com", "full_name": "Pedro Penduko", "role": ROLE_RESIDENT, "barangay": "172", "district": 3},
}

def create_jwt_token(user_id: int, role: str, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def get_auth_headers(user_id: int) -> Dict[str, str]:
    user = TEST_USERS[user_id]
    token = create_jwt_token(user["id"], user["role"], user["email"])
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# ─────────────────────────────────────────────────────────────────────────────────────
# Database Models (Isolated In-Memory Schema)
# ─────────────────────────────────────────────────────────────────────────────────────
Base = declarative_base()

class E2EUser(Base):
    __tablename__ = "e2e_users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    role = Column(String)
    barangay = Column(String)
    district = Column(Integer)

class E2EReport(Base):
    __tablename__ = "e2e_reports"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String, unique=True, index=True)
    category = Column(String, index=True) # road_damage, drainage, streetlight, bridge, public_building, other
    description = Column(Text)
    status = Column(String, default="pending", index=True) # pending, under_review, needs_information, dispatched, in_progress, resolved, closed
    priority = Column(String, default="normal", index=True) # normal, high, critical
    location_lat = Column(Float, nullable=False)
    location_lng = Column(Float, nullable=False)
    location_string = Column(String)
    barangay = Column(String, index=True)
    district = Column(Integer, index=True)
    reporter_type = Column(String, default="resident")
    resident_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class E2EProcessTimeline(Base):
    __tablename__ = "e2e_process_timelines"
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("e2e_reports.id"), nullable=True)
    work_order_id = Column(Integer, ForeignKey("e2e_work_orders.id"), nullable=True)
    status = Column(String, nullable=False)
    actor_id = Column(Integer, nullable=False)
    note = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class E2EWorkOrder(Base):
    __tablename__ = "e2e_work_orders"
    id = Column(Integer, primary_key=True, index=True)
    wo_number = Column(String, unique=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    report_id = Column(Integer, ForeignKey("e2e_reports.id"), nullable=True)
    asset_id = Column(String, ForeignKey("e2e_infrastructure_assets.asset_id"), nullable=True)
    priority = Column(String, default="normal")
    # Operational Views: active, blocked, awaiting_verification, completed, rework_required, cancelled
    status = Column(String, default="active", index=True)
    assigned_to_id = Column(Integer, nullable=True) # Field Worker / Engineer
    created_by_id = Column(Integer, nullable=False)
    barangay = Column(String, nullable=True)
    district = Column(Integer, nullable=True)
    estimated_hours = Column(Float, default=8.0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)

class E2EWorkOrderBlocker(Base):
    __tablename__ = "e2e_work_order_blockers"
    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("e2e_work_orders.id"), nullable=False)
    reason_code = Column(String, nullable=False) # weather, utility_conflict, permits, materials, safety, access, other
    description = Column(Text, nullable=False)
    estimated_delay_days = Column(Float, default=1.0)
    blocked_by_id = Column(Integer, nullable=False)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_id = Column(Integer, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class E2EWorkOrderInspection(Base):
    __tablename__ = "e2e_work_order_inspections"
    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("e2e_work_orders.id"), nullable=False)
    inspector_id = Column(Integer, nullable=False) # MUST != assigned_to_id
    status = Column(String, nullable=False) # passed, rework_required, failed
    checklist_results = Column(JSON, nullable=True)
    findings = Column(Text, nullable=True)
    evidence_photo_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class E2EInfrastructureAsset(Base):
    __tablename__ = "e2e_infrastructure_assets"
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String, unique=True, index=True) # e.g. "CAL-RD-001"
    asset_name = Column(String, nullable=False)
    # Categories: Roads, Drainage, Bridges, Public Buildings, Facilities
    category = Column(String, nullable=False, index=True)
    barangay = Column(String, nullable=False)
    district = Column(Integer, default=3)
    gps_lat = Column(Float, nullable=False)
    gps_lng = Column(Float, nullable=False)
    material_type = Column(String, nullable=True)
    installation_date = Column(DateTime(timezone=True), nullable=True)
    design_life_years = Column(Integer, default=20)
    condition_score = Column(Float, default=85.0) # 0 to 100
    flood_risk_level = Column(String, default="Moderate")
    is_critical = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class E2EMaintenanceHistory(Base):
    __tablename__ = "e2e_maintenance_histories"
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String, ForeignKey("e2e_infrastructure_assets.asset_id"), nullable=False)
    work_type = Column(String, nullable=False) # preventive, corrective, rehabilitation, inspection
    cost = Column(Float, default=0.0)
    completion_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class E2EAnnouncement(Base):
    __tablename__ = "e2e_announcements"
    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(String, unique=True, index=True)
    title_en = Column(String, nullable=False)
    title_fil = Column(String, nullable=True)
    content_en = Column(Text, nullable=False)
    content_fil = Column(Text, nullable=True)
    category = Column(String, default="general_notice")
    priority = Column(String, default="normal")
    # 6-Stage Lifecycle: draft, in_review, approved, scheduled, published, expired, withdrawn
    status = Column(String, default="draft", index=True)
    target_audience = Column(String, default="public")
    channels = Column(JSON, default=lambda: ["web"]) # web, sms, email
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    author_id = Column(Integer, nullable=False)
    reviewer_id = Column(Integer, nullable=True)
    approved_by_id = Column(Integer, nullable=True)
    withdrawal_reason = Column(Text, nullable=True)
    withdrawn_at = Column(DateTime(timezone=True), nullable=True)
    withdrawn_by_id = Column(Integer, nullable=True)
    source_report_id = Column(Integer, nullable=True)
    source_work_order_id = Column(Integer, nullable=True)
    source_asset_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class E2EAnnouncementCorrection(Base):
    __tablename__ = "e2e_announcement_corrections"
    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(Integer, ForeignKey("e2e_announcements.id"), nullable=False)
    correction_note = Column(Text, nullable=False)
    corrected_by_id = Column(Integer, nullable=False)
    previous_content = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class E2EAnnouncementDelivery(Base):
    __tablename__ = "e2e_announcement_deliveries"
    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(Integer, ForeignKey("e2e_announcements.id"), nullable=False)
    channel = Column(String, nullable=False) # web, sms, email
    status = Column(String, default="queued") # queued, attempted, delivered, failed
    attempt_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class E2EAuditLog(Base):
    __tablename__ = "e2e_audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, nullable=False)
    trigger_type = Column(String, nullable=False)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

# ─────────────────────────────────────────────────────────────────────────────────────
# Engine & Session Setup
# ─────────────────────────────────────────────────────────────────────────────────────
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

def get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def reset_test_database():
    """Resets tables and seeds initial users and basic geometry reference."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    for uid, udata in TEST_USERS.items():
        user = E2EUser(
            id=udata["id"],
            email=udata["email"],
            full_name=udata["full_name"],
            role=udata["role"],
            barangay=udata["barangay"],
            district=udata["district"]
        )
        db.add(user)
    db.commit()
    db.close()

# ─────────────────────────────────────────────────────────────────────────────────────
# Auth Dependency Helper
# ─────────────────────────────────────────────────────────────────────────────────────
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub") or payload.get("user_id"))
        user = db.query(E2EUser).filter(E2EUser.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token signature or expired")

def require_gov_role(user: E2EUser = Depends(get_current_user)):
    if user.role not in [ROLE_SYSTEM_ADMIN, ROLE_PROJECT_ENGINEER, ROLE_FIELD_WORKER, ROLE_INSPECTOR, ROLE_DISPATCHER]:
        raise HTTPException(status_code=403, detail="Government credentials required")
    return user

# ─────────────────────────────────────────────────────────────────────────────────────
# FastAPI Test Application Factory
# ─────────────────────────────────────────────────────────────────────────────────────
def create_test_app() -> FastAPI:
    app = FastAPI(title="PULSO Government Operations Test API", version="2.0.0")

    @app.get("/api/health")
    def health():
        return {"status": "healthy", "service": "pulso-gov", "timestamp": datetime.now(timezone.utc).isoformat()}

    # ---------------------------------------------------------------------------------
    # 1. Daily Operations Hub ("Today") — Feature 1-5
    # ---------------------------------------------------------------------------------
    @app.get("/api/gov/operations/today")
    def get_operations_today(db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        # 5 core leadership metrics
        unassigned_reports = db.query(func.count(E2EReport.id)).filter(E2EReport.status == "pending").scalar() or 0
        
        # Overdue actions: reports under_review or dispatched older than 48 hours
        cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
        overdue_actions = db.query(func.count(E2EReport.id)).filter(
            E2EReport.status.in_(["pending", "under_review", "dispatched"]),
            E2EReport.created_at < cutoff
        ).scalar() or 0
        
        awaiting_verification = db.query(func.count(E2EWorkOrder.id)).filter(
            E2EWorkOrder.status == "awaiting_verification"
        ).scalar() or 0
        
        open_high_priority = db.query(func.count(E2EReport.id)).filter(
            E2EReport.status.in_(["pending", "under_review", "dispatched", "in_progress"]),
            E2EReport.priority.in_(["high", "critical"])
        ).scalar() or 0
        
        resolved_period = db.query(func.count(E2EReport.id)).filter(
            E2EReport.status.in_(["resolved", "closed"])
        ).scalar() or 0

        # Actionable Triage Feed ("Needs Attention")
        from sqlalchemy import case
        p_weight = case(
            (E2EReport.priority == "critical", 3),
            (E2EReport.priority == "high", 2),
            (E2EReport.priority == "normal", 1),
            else_=0
        )
        pending_reports = db.query(E2EReport).filter(
            E2EReport.status.in_(["pending", "needs_information"])
        ).order_by(p_weight.desc(), E2EReport.created_at.asc()).limit(10).all()

        triage_feed = []
        for r in pending_reports:
            triage_feed.append({
                "id": r.id,
                "ticket_id": r.ticket_id,
                "entity_type": "report",
                "title": r.category.replace("_", " ").title() + ": " + (r.description[:40] if r.description else ""),
                "category": r.category,
                "priority": r.priority,
                "status": r.status,
                "barangay": r.barangay,
                "district": r.district,
                "action_url": f"/gov/reports/{r.id}",
                "recommended_action": "Assign Work Order" if r.status == "pending" else "Await Citizen Response"
            })

        # Dual-sector map summary (North Caloocan D3 vs South Caloocan D1/D2)
        north_open = db.query(func.count(E2EReport.id)).filter(
            E2EReport.district == 3,
            E2EReport.status.in_(["pending", "under_review", "dispatched", "in_progress"])
        ).scalar() or 0
        north_crit = db.query(func.count(E2EReport.id)).filter(
            E2EReport.district == 3,
            E2EReport.priority.in_(["high", "critical"]),
            E2EReport.status.in_(["pending", "under_review", "dispatched", "in_progress"])
        ).scalar() or 0

        south_open = db.query(func.count(E2EReport.id)).filter(
            E2EReport.district.in_([1, 2]),
            E2EReport.status.in_(["pending", "under_review", "dispatched", "in_progress"])
        ).scalar() or 0
        south_crit = db.query(func.count(E2EReport.id)).filter(
            E2EReport.district.in_([1, 2]),
            E2EReport.priority.in_(["high", "critical"]),
            E2EReport.status.in_(["pending", "under_review", "dispatched", "in_progress"])
        ).scalar() or 0

        # Team capacity and active blocker breakdown
        active_wo_count = db.query(func.count(E2EWorkOrder.id)).filter(E2EWorkOrder.status == "active").scalar() or 0
        blocked_wo_count = db.query(func.count(E2EWorkOrder.id)).filter(E2EWorkOrder.status == "blocked").scalar() or 0

        team_capacity = [
            {"team_name": "District 3 Road Maintenance", "active_orders": active_wo_count, "blocked_orders": blocked_wo_count, "capacity_pct": min(100, active_wo_count * 15)},
            {"team_name": "North Drainage Taskforce", "active_orders": max(0, active_wo_count - 1), "blocked_orders": max(0, blocked_wo_count - 1), "capacity_pct": min(100, max(0, active_wo_count - 1) * 12)},
            {"team_name": "Caloocan Streetlight Unit", "active_orders": 2, "blocked_orders": 0, "capacity_pct": 30}
        ]

        return {
            "metrics": {
                "unassigned_reports": unassigned_reports,
                "overdue_actions": overdue_actions,
                "awaiting_verification": awaiting_verification,
                "open_high_priority": open_high_priority,
                "resolved_period": resolved_period
            },
            "triage_feed": triage_feed,
            "sector_stats": {
                "north": {"district": 3, "open_tickets": north_open, "critical_count": north_crit},
                "south": {"district": 1, "open_tickets": south_open, "critical_count": south_crit}
            },
            "team_capacity": team_capacity
        }

    # ---------------------------------------------------------------------------------
    # 2. Citizen Reports Docket & Detail — Features 6-10
    # ---------------------------------------------------------------------------------
    @app.post("/api/gov/reports/{report_id}/request-info")
    def request_citizen_info(report_id: int, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        report = db.query(E2EReport).filter(E2EReport.id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        reason = payload.get("reason", "").strip()
        message = payload.get("message", "").strip()
        if not reason or not message:
            raise HTTPException(status_code=422, detail="Reason and message are required fields")
        if len(message) > 5000:
            raise HTTPException(status_code=422, detail="Message exceeds 5000 character maximum")

        report.status = "needs_information"
        report.updated_at = datetime.now(timezone.utc)

        tl = E2EProcessTimeline(
            report_id=report.id,
            status="needs_information",
            actor_id=current_user.id,
            note=f"Information Requested: [{reason}] {message}",
            is_public=True
        )
        db.add(tl)

        audit = E2EAuditLog(
            actor_id=current_user.id,
            trigger_type="status_change",
            action=f"Requested citizen info on report {report.ticket_id}: {reason}",
            entity_type="report",
            entity_id=str(report.id),
            details={"reason": reason, "message": message}
        )
        db.add(audit)
        db.commit()
        db.refresh(tl)

        return {"status": "success", "report_id": report.id, "timeline_id": tl.id, "report_status": report.status}

    @app.post("/api/gov/reports/{report_id}/assign-work-order")
    def assign_work_order_to_report(report_id: int, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        report = db.query(E2EReport).filter(E2EReport.id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        title = payload.get("title")
        assigned_to_id = payload.get("assigned_to_id")
        if not title:
            raise HTTPException(status_code=422, detail="Work order title is required")

        wo_number = f"WO-{str(uuid.uuid4().int)[:8]}"
        wo = E2EWorkOrder(
            wo_number=wo_number,
            title=title,
            description=payload.get("description", report.description),
            report_id=report.id,
            priority=payload.get("priority", report.priority),
            status="active",
            assigned_to_id=assigned_to_id,
            created_by_id=current_user.id,
            barangay=report.barangay,
            district=report.district
        )
        db.add(wo)
        db.flush()

        report.status = "dispatched"
        report.updated_at = datetime.now(timezone.utc)

        tl = E2EProcessTimeline(
            report_id=report.id,
            work_order_id=wo.id,
            status="dispatched",
            actor_id=current_user.id,
            note=f"Dispatched Work Order {wo.wo_number}: {title}",
            is_public=True
        )
        db.add(tl)
        db.commit()

        return {"work_order_id": wo.id, "wo_number": wo.wo_number, "report_id": report.id, "status": "dispatched"}

    @app.get("/api/gov/reports/{report_id}/docket")
    def get_report_docket(report_id: int, db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        report = db.query(E2EReport).filter(E2EReport.id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report docket not found")

        timelines = db.query(E2EProcessTimeline).filter(E2EProcessTimeline.report_id == report.id).order_by(E2EProcessTimeline.created_at.asc()).all()
        work_orders = db.query(E2EWorkOrder).filter(E2EWorkOrder.report_id == report.id).all()

        return {
            "id": report.id,
            "ticket_id": report.ticket_id,
            "category": report.category,
            "status": report.status,
            "priority": report.priority,
            "description": report.description,
            "location": {
                "lat": report.location_lat,
                "lng": report.location_lng,
                "address": report.location_string,
                "barangay": report.barangay,
                "district": report.district,
                "is_in_caloocan": is_in_caloocan(report.location_lat, report.location_lng)
            },
            "timeline": [{"id": t.id, "status": t.status, "note": t.note, "actor_id": t.actor_id, "timestamp": t.created_at.isoformat()} for t in timelines],
            "work_orders": [{"id": w.id, "wo_number": w.wo_number, "title": w.title, "status": w.status, "assigned_to_id": w.assigned_to_id} for w in work_orders]
        }

    # ---------------------------------------------------------------------------------
    # 3. Work Orders, Blockers & Inspections (Separation of Duties) — Features 11-15
    # ---------------------------------------------------------------------------------
    @app.get("/api/gov/work-orders")
    def list_work_orders(status_view: Optional[str] = Query(None, alias="view"), db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        q = db.query(E2EWorkOrder)
        if status_view:
            if status_view == "active":
                q = q.filter(E2EWorkOrder.status.in_(["active", "in_progress"]))
            elif status_view in ["blocked", "awaiting_verification", "completed", "rework_required"]:
                q = q.filter(E2EWorkOrder.status == status_view)
        orders = q.order_by(E2EWorkOrder.created_at.desc()).all()
        return [{"id": o.id, "wo_number": o.wo_number, "title": o.title, "priority": o.priority, "status": o.status, "assigned_to_id": o.assigned_to_id, "barangay": o.barangay} for o in orders]

    @app.post("/api/gov/work-orders")
    def create_work_order(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        title = payload.get("title")
        if not title:
            raise HTTPException(status_code=422, detail="Title is required")
        wo_number = f"WO-{str(uuid.uuid4().int)[:8]}"
        wo = E2EWorkOrder(
            wo_number=wo_number,
            title=title,
            description=payload.get("description", ""),
            report_id=payload.get("report_id"),
            asset_id=payload.get("asset_id"),
            priority=payload.get("priority", "normal"),
            status="active",
            assigned_to_id=payload.get("assigned_to_id"),
            created_by_id=current_user.id,
            barangay=payload.get("barangay", "Barangay 172"),
            district=payload.get("district", 3)
        )
        db.add(wo)
        db.commit()
        db.refresh(wo)
        return {"id": wo.id, "wo_number": wo.wo_number, "status": wo.status, "title": wo.title}

    @app.post("/api/gov/work-orders/{wo_id}/block")
    def report_work_order_blocker(wo_id: int, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        wo = db.query(E2EWorkOrder).filter(E2EWorkOrder.id == wo_id).first()
        if not wo:
            raise HTTPException(status_code=404, detail="Work order not found")
        reason_code = payload.get("reason_code")
        valid_reasons = ["weather", "utility_conflict", "permits", "materials", "safety", "access", "security", "other"]
        if not reason_code or reason_code not in valid_reasons:
            raise HTTPException(status_code=422, detail=f"Invalid reason_code. Must be one of {valid_reasons}")
        delay_days = payload.get("delay_days", 1.0)
        if delay_days < 0:
            raise HTTPException(status_code=422, detail="delay_days cannot be negative")
        notes = payload.get("notes", "").strip()
        if not notes:
            raise HTTPException(status_code=422, detail="Blocker description/notes are required")

        blocker = E2EWorkOrderBlocker(
            work_order_id=wo.id,
            reason_code=reason_code,
            description=notes,
            estimated_delay_days=delay_days,
            blocked_by_id=current_user.id
        )
        db.add(blocker)
        wo.status = "blocked"

        audit = E2EAuditLog(
            actor_id=current_user.id,
            trigger_type="status_change",
            action=f"Work order {wo.wo_number} blocked due to {reason_code}",
            entity_type="work_order",
            entity_id=str(wo.id),
            details={"reason_code": reason_code, "delay_days": delay_days, "notes": notes}
        )
        db.add(audit)
        db.commit()
        db.refresh(blocker)

        return {
            "id": wo.id,
            "status": "blocked",
            "blocker": {
                "id": blocker.id,
                "reason_code": blocker.reason_code,
                "delay_days": blocker.estimated_delay_days,
                "notes": blocker.description
            }
        }

    @app.post("/api/gov/work-orders/{wo_id}/unblock")
    def resolve_work_order_blocker(wo_id: int, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        wo = db.query(E2EWorkOrder).filter(E2EWorkOrder.id == wo_id).first()
        if not wo:
            raise HTTPException(status_code=404, detail="Work order not found")
        resolution_notes = payload.get("resolution_notes", "").strip()
        if not resolution_notes:
            raise HTTPException(status_code=422, detail="Resolution notes are required to unblock")

        blocker = db.query(E2EWorkOrderBlocker).filter(
            E2EWorkOrderBlocker.work_order_id == wo.id,
            E2EWorkOrderBlocker.is_resolved == False
        ).order_by(E2EWorkOrderBlocker.created_at.desc()).first()
        if blocker:
            blocker.is_resolved = True
            blocker.resolved_at = datetime.now(timezone.utc)
            blocker.resolved_by_id = current_user.id
            blocker.resolution_notes = resolution_notes

        wo.status = "active"
        db.commit()
        return {"id": wo.id, "status": "active", "message": "Work order successfully unblocked"}

    @app.post("/api/gov/work-orders/{wo_id}/submit-verification")
    def submit_work_order_for_verification(wo_id: int, db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        wo = db.query(E2EWorkOrder).filter(E2EWorkOrder.id == wo_id).first()
        if not wo:
            raise HTTPException(status_code=404, detail="Work order not found")
        wo.status = "awaiting_verification"
        db.commit()
        return {"id": wo.id, "status": "awaiting_verification"}

    @app.post("/api/gov/work-orders/{wo_id}/verify")
    def verify_work_order_inspection(wo_id: int, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        wo = db.query(E2EWorkOrder).filter(E2EWorkOrder.id == wo_id).first()
        if not wo:
            raise HTTPException(status_code=404, detail="Work order not found")

        # ── SEPARATION OF DUTIES ENFORCEMENT ──────────────────────────────────────────
        if wo.assigned_to_id is not None and wo.assigned_to_id == current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Separation of duties violation: Assigned field worker cannot verify or inspect their own work order"
            )

        if wo.status != "awaiting_verification":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot verify work order with status '{wo.status}'. Must be 'awaiting_verification'."
            )

        checklist = payload.get("checklist_results", {})
        if not checklist:
            raise HTTPException(status_code=422, detail="Checklist results cannot be empty")

        passed = bool(payload.get("passed", False))
        findings = payload.get("notes", "")

        if not passed and not findings:
            raise HTTPException(status_code=422, detail="Findings and rework instructions required when inspection fails")

        insp_status = "passed" if passed else "rework_required"
        insp = E2EWorkOrderInspection(
            work_order_id=wo.id,
            inspector_id=current_user.id,
            status=insp_status,
            checklist_results=checklist,
            findings=findings,
            evidence_photo_url=payload.get("evidence_photo_url")
        )
        db.add(insp)

        if passed:
            wo.status = "completed"
            wo.completed_at = datetime.now(timezone.utc)
            # If linked to report, mark report resolved
            if wo.report_id:
                rep = db.query(E2EReport).filter(E2EReport.id == wo.report_id).first()
                if rep:
                    rep.status = "resolved"
                    db.add(E2EProcessTimeline(
                        report_id=rep.id,
                        work_order_id=wo.id,
                        status="resolved",
                        actor_id=current_user.id,
                        note=f"Work order verified passed by Inspector #{current_user.id}",
                        is_public=True
                    ))
        else:
            wo.status = "rework_required"

        db.commit()
        db.refresh(insp)

        return {
            "id": wo.id,
            "status": wo.status,
            "inspection": {
                "id": insp.id,
                "inspector_id": insp.inspector_id,
                "status": insp.status,
                "passed": passed,
                "findings": insp.findings
            }
        }

    # ---------------------------------------------------------------------------------
    # 4. Physical Infrastructure Assets Register — Features 16-20
    # ---------------------------------------------------------------------------------
    @app.get("/api/gov/assets")
    def list_assets(
        category: Optional[str] = None,
        barangay: Optional[str] = None,
        search: Optional[str] = None,
        db: Session = Depends(get_db),
        current_user: E2EUser = Depends(require_gov_role)
    ):
        q = db.query(E2EInfrastructureAsset)
        if category and category != "all":
            q = q.filter(E2EInfrastructureAsset.category.ilike(f"%{category}%"))
        if barangay and barangay != "all":
            q = q.filter(E2EInfrastructureAsset.barangay.ilike(f"%{barangay}%"))
        if search:
            q = q.filter(
                (E2EInfrastructureAsset.asset_id.ilike(f"%{search}%")) |
                (E2EInfrastructureAsset.asset_name.ilike(f"%{search}%"))
            )
        assets = q.order_by(E2EInfrastructureAsset.condition_score.asc()).all()
        return [
            {
                "id": a.id,
                "asset_id": a.asset_id,
                "asset_name": a.asset_name,
                "category": a.category,
                "barangay": a.barangay,
                "district": a.district,
                "condition_score": a.condition_score,
                "is_critical": a.is_critical,
                "flood_risk_level": a.flood_risk_level
            }
            for a in assets
        ]

    @app.get("/api/gov/assets/stats")
    def get_asset_stats(db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        total_assets = db.query(func.count(E2EInfrastructureAsset.id)).scalar() or 0
        critical_assets = db.query(func.count(E2EInfrastructureAsset.id)).filter(
            E2EInfrastructureAsset.is_critical == True
        ).scalar() or 0
        avg_score = db.query(func.avg(E2EInfrastructureAsset.condition_score)).scalar() or 0.0

        categories = ["Roads", "Drainage", "Bridges", "Public Buildings", "Facilities"]
        by_category = {}
        for cat in categories:
            cnt = db.query(func.count(E2EInfrastructureAsset.id)).filter(
                E2EInfrastructureAsset.category.ilike(f"%{cat}%")
            ).scalar() or 0
            by_category[cat] = cnt

        active_wos = db.query(func.count(E2EWorkOrder.id)).filter(
            E2EWorkOrder.asset_id.isnot(None),
            E2EWorkOrder.status.in_(["active", "blocked", "awaiting_verification"])
        ).scalar() or 0

        return {
            "total_assets": total_assets,
            "critical_assets": critical_assets,
            "average_health_score": round(float(avg_score), 1),
            "by_category": by_category,
            "active_work_orders": active_wos
        }

    @app.get("/api/gov/assets/{asset_id}")
    def get_asset_detail(asset_id: str, db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        asset = db.query(E2EInfrastructureAsset).filter(E2EInfrastructureAsset.asset_id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Infrastructure asset not found")

        history = db.query(E2EMaintenanceHistory).filter(
            E2EMaintenanceHistory.asset_id == asset.asset_id
        ).order_by(E2EMaintenanceHistory.completion_date.desc()).all()

        wos = db.query(E2EWorkOrder).filter(E2EWorkOrder.asset_id == asset.asset_id).all()

        return {
            "asset": {
                "id": asset.id,
                "asset_id": asset.asset_id,
                "asset_name": asset.asset_name,
                "category": asset.category,
                "barangay": asset.barangay,
                "district": asset.district,
                "gps": {"lat": asset.gps_lat, "lng": asset.gps_lng},
                "material_type": asset.material_type,
                "design_life_years": asset.design_life_years,
                "condition_score": asset.condition_score,
                "is_critical": asset.is_critical,
                "flood_risk_level": asset.flood_risk_level
            },
            "maintenance_history": [
                {"id": m.id, "work_type": m.work_type, "cost": m.cost, "date": m.completion_date.isoformat(), "notes": m.notes}
                for m in history
            ],
            "active_work_orders": [
                {"id": w.id, "wo_number": w.wo_number, "title": w.title, "status": w.status}
                for w in wos
            ]
        }

    @app.post("/api/gov/assets")
    def create_asset(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        asset_id = payload.get("asset_id")
        asset_name = payload.get("asset_name")
        category = payload.get("category")
        barangay = payload.get("barangay")
        if not asset_id or not asset_name or not category or not barangay:
            raise HTTPException(status_code=422, detail="asset_id, asset_name, category, and barangay are required")

        existing = db.query(E2EInfrastructureAsset).filter(E2EInfrastructureAsset.asset_id == asset_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Asset ID already registered")

        asset = E2EInfrastructureAsset(
            asset_id=asset_id,
            asset_name=asset_name,
            category=category,
            barangay=barangay,
            district=payload.get("district", 3),
            gps_lat=payload.get("gps_lat", 14.7500),
            gps_lng=payload.get("gps_lng", 120.9800),
            material_type=payload.get("material_type", "Reinforced Concrete"),
            design_life_years=payload.get("design_life_years", 25),
            condition_score=payload.get("condition_score", 90.0),
            flood_risk_level=payload.get("flood_risk_level", "Moderate"),
            is_critical=payload.get("is_critical", False)
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return {"id": asset.id, "asset_id": asset.asset_id, "asset_name": asset.asset_name}

    @app.post("/api/gov/assets/{asset_id}/maintenance")
    def record_asset_maintenance(asset_id: str, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        asset = db.query(E2EInfrastructureAsset).filter(E2EInfrastructureAsset.asset_id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        work_type = payload.get("work_type", "preventive")
        cost = float(payload.get("cost", 0.0))

        log = E2EMaintenanceHistory(
            asset_id=asset.asset_id,
            work_type=work_type,
            cost=cost,
            notes=payload.get("notes", "")
        )
        db.add(log)
        # Improving condition score after maintenance
        asset.condition_score = min(100.0, asset.condition_score + 10.0)
        db.commit()
        return {"status": "success", "asset_id": asset.asset_id, "new_condition_score": asset.condition_score}

    # ---------------------------------------------------------------------------------
    # 5. Predictive Router & Plain-Language Analytics — Features 21-25
    # ---------------------------------------------------------------------------------
    @app.get("/api/gov/predictive/maintenance-scores")
    def get_predictive_scores(db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        # Pure deterministic calculation without random numbers
        assets = db.query(E2EInfrastructureAsset).all()
        results = []
        now = datetime.now(timezone.utc)
        is_rainy = now.month in [6, 7, 8, 9, 10, 11]
        seasonal_mult = 1.4 if is_rainy else 1.0

        for a in assets:
            # Deterministic report count in barangay
            report_cnt = db.query(func.count(E2EReport.id)).filter(E2EReport.barangay == a.barangay).scalar() or 0
            # Deterministic failure probability
            base_decay = 0.08 if "road" in a.category.lower() else (0.12 if "drain" in a.category.lower() else 0.05)
            age_factor = (100.0 - a.condition_score) / 100.0
            fail_prob_30 = round(min(0.99, (0.35 * age_factor + 0.35 * (1 - math.exp(-base_decay * 2)) + 0.30 * min(1.0, report_cnt / 10.0)) * seasonal_mult), 2)
            fail_prob_60 = round(min(0.99, fail_prob_30 * 1.3), 2)
            fail_prob_90 = round(min(0.99, fail_prob_30 * 1.6), 2)

            health_score = round(max(0.0, min(100.0, (1.0 - fail_prob_30) * 80.0 - (report_cnt * 2.0))), 1)
            next_days = 7 if health_score < 30 else (30 if health_score < 60 else 90)
            next_date = (now + timedelta(days=next_days)).strftime("%Y-%m-%d")

            results.append({
                "asset_id": a.asset_id,
                "asset_name": a.asset_name,
                "category": a.category,
                "barangay": a.barangay,
                "condition_score": a.condition_score,
                "deterministic_health_score": health_score,
                "failure_probability": {
                    "30d": fail_prob_30,
                    "60d": fail_prob_60,
                    "90d": fail_prob_90
                },
                "estimated_dpwh_cost": 25000 * report_cnt if report_cnt > 0 else 12500,
                "next_recommended_maintenance": next_date
            })
        return results

    @app.get("/api/gov/predictive/demand-forecast")
    def get_demand_forecast(db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        # Deterministic rolling 4-week historical baseline
        total_reports = db.query(func.count(E2EReport.id)).scalar() or 0
        baseline_weekly = max(1, total_reports // 4)
        weeks = []
        for w in range(1, 5):
            predicted = int(baseline_weekly * (1.0 + (w * 0.05)))
            weeks.append({"week": f"Week {w}", "predicted_reports": predicted, "confidence_level": 0.92})
        return {"historical_baseline": baseline_weekly, "forecast_horizon_weeks": 4, "weekly_demand": weeks}

    @app.get("/api/gov/analytics/plain-performance")
    def get_plain_civic_performance(db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        # 4 Plain Civic Questions
        # 1. Are we keeping up?
        cutoff_7d = datetime.now(timezone.utc) - timedelta(days=7)
        intake_7d = db.query(func.count(E2EReport.id)).filter(E2EReport.created_at >= cutoff_7d).scalar() or 0
        resolved_7d = db.query(func.count(E2EReport.id)).filter(
            E2EReport.status.in_(["resolved", "closed"]),
            E2EReport.updated_at >= cutoff_7d
        ).scalar() or 0
        pace_diff = resolved_7d - intake_7d
        keeping_up_verdict = "Ahead of intake" if pace_diff >= 0 else "Falling behind intake"

        # 2. Where are concerns recurring?
        barangay_counts = db.query(E2EReport.barangay, func.count(E2EReport.id)).group_by(E2EReport.barangay).order_by(func.count(E2EReport.id).desc()).limit(3).all()
        recurring_hotspots = [{"barangay": b, "report_count": cnt, "is_chronic": cnt >= 5} for b, cnt in barangay_counts if b]

        # 3. Which work is delayed?
        delayed_wos = db.query(E2EWorkOrder).filter(E2EWorkOrder.status == "blocked").all()
        delayed_list = [{"id": w.id, "wo_number": w.wo_number, "title": w.title, "barangay": w.barangay} for w in delayed_wos]

        # 4. What should we inspect next?
        inspect_queue = db.query(E2EWorkOrder).filter(E2EWorkOrder.status == "awaiting_verification").limit(5).all()
        inspect_list = [{"id": w.id, "wo_number": w.wo_number, "title": w.title, "assigned_to_id": w.assigned_to_id} for w in inspect_queue]

        return {
            "questions": {
                "are_we_keeping_up": {
                    "question": "Are we keeping up?",
                    "intake_7d": intake_7d,
                    "resolved_7d": resolved_7d,
                    "velocity_delta": pace_diff,
                    "verdict": keeping_up_verdict
                },
                "where_are_concerns_recurring": {
                    "question": "Where are concerns recurring?",
                    "hotspots": recurring_hotspots
                },
                "which_work_is_delayed": {
                    "question": "Which work is delayed?",
                    "total_blocked": len(delayed_list),
                    "delayed_work_orders": delayed_list
                },
                "what_should_we_inspect_next": {
                    "question": "What should we inspect next?",
                    "ready_for_inspection_count": len(inspect_list),
                    "inspection_targets": inspect_list
                }
            }
        }

    # ---------------------------------------------------------------------------------
    # 6. Governed Updates & Announcements Publishing — Features 26-31
    # ---------------------------------------------------------------------------------
    @app.get("/api/gov/announcements")
    def list_announcements(status_filter: Optional[str] = Query(None, alias="status"), db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        q = db.query(E2EAnnouncement)
        if status_filter and status_filter != "all":
            q = q.filter(E2EAnnouncement.status == status_filter)
        anns = q.order_by(E2EAnnouncement.created_at.desc()).all()
        return [
            {
                "id": a.id,
                "announcement_id": a.announcement_id,
                "title_en": a.title_en,
                "title_fil": a.title_fil,
                "status": a.status,
                "priority": a.priority,
                "channels": a.channels,
                "published_at": a.published_at.isoformat() if a.published_at else None,
                "created_at": a.created_at.isoformat()
            }
            for a in anns
        ]

    @app.get("/api/gov/announcements/{id}")
    def get_announcement_detail(id: int, db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        ann = db.query(E2EAnnouncement).filter(E2EAnnouncement.id == id).first()
        if not ann:
            raise HTTPException(status_code=404, detail="Announcement not found")
        corrections = db.query(E2EAnnouncementCorrection).filter(E2EAnnouncementCorrection.announcement_id == ann.id).order_by(E2EAnnouncementCorrection.created_at.desc()).all()
        deliveries = db.query(E2EAnnouncementDelivery).filter(E2EAnnouncementDelivery.announcement_id == ann.id).all()

        return {
            "id": ann.id,
            "announcement_id": ann.announcement_id,
            "title_en": ann.title_en,
            "title_fil": ann.title_fil,
            "content_en": ann.content_en,
            "content_fil": ann.content_fil,
            "status": ann.status,
            "priority": ann.priority,
            "channels": ann.channels,
            "author_id": ann.author_id,
            "published_at": ann.published_at.isoformat() if ann.published_at else None,
            "corrections": [
                {"id": c.id, "note": c.correction_note, "timestamp": c.created_at.isoformat(), "editor_id": c.corrected_by_id}
                for c in corrections
            ],
            "deliveries": [
                {"channel": d.channel, "status": d.status, "attempt_count": d.attempt_count}
                for d in deliveries
            ]
        }

    @app.post("/api/gov/announcements")
    def create_announcement(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        title_en = payload.get("title_en", "").strip()
        content_en = payload.get("content_en", "").strip()
        if not title_en or not content_en:
            raise HTTPException(status_code=422, detail="title_en and content_en are required")
        channels = payload.get("channels", ["web"])
        if not channels:
            raise HTTPException(status_code=422, detail="At least one delivery channel is required")

        ann_id = f"ANN-{datetime.now(timezone.utc).year}-{uuid.uuid4().hex[:8].upper()}"
        ann = E2EAnnouncement(
            announcement_id=ann_id,
            title_en=title_en,
            title_fil=payload.get("title_fil"),
            content_en=content_en,
            content_fil=payload.get("content_fil"),
            category=payload.get("category", "general_notice"),
            priority=payload.get("priority", "normal"),
            status="draft", # Stage 1: Draft
            channels=channels,
            author_id=current_user.id
        )
        db.add(ann)
        db.commit()
        db.refresh(ann)
        return {"id": ann.id, "announcement_id": ann.announcement_id, "status": ann.status}

    @app.put("/api/gov/announcements/{id}")
    def update_announcement_draft(id: int, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        ann = db.query(E2EAnnouncement).filter(E2EAnnouncement.id == id).first()
        if not ann:
            raise HTTPException(status_code=404, detail="Announcement not found")
        if ann.status == "published":
            raise HTTPException(
                status_code=400,
                detail="Published announcements cannot be directly edited. Use /corrections endpoint to post official errata."
            )
        if "title_en" in payload:
            ann.title_en = payload["title_en"]
        if "title_fil" in payload:
            ann.title_fil = payload["title_fil"]
        if "content_en" in payload:
            ann.content_en = payload["content_en"]
        if "content_fil" in payload:
            ann.content_fil = payload["content_fil"]
        # Editing drops approval back to draft/in_review
        if ann.status == "approved":
            ann.status = "in_review"
        ann.updated_at = datetime.now(timezone.utc)
        db.commit()
        return {"id": ann.id, "status": ann.status}

    @app.post("/api/gov/announcements/{id}/submit-review")
    def submit_announcement_review(id: int, db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        ann = db.query(E2EAnnouncement).filter(E2EAnnouncement.id == id).first()
        if not ann:
            raise HTTPException(status_code=404, detail="Announcement not found")
        if ann.status != "draft":
            raise HTTPException(status_code=400, detail=f"Cannot submit review from status '{ann.status}'")
        ann.status = "in_review"
        db.commit()
        return {"id": ann.id, "status": "in_review"}

    @app.post("/api/gov/announcements/{id}/approve")
    def approve_announcement(id: int, db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        ann = db.query(E2EAnnouncement).filter(E2EAnnouncement.id == id).first()
        if not ann:
            raise HTTPException(status_code=404, detail="Announcement not found")
        if ann.status not in ["in_review", "draft"]:
            raise HTTPException(status_code=400, detail=f"Cannot approve announcement from status '{ann.status}'")
        ann.status = "approved"
        ann.approved_by_id = current_user.id
        db.commit()
        return {"id": ann.id, "status": "approved", "approved_by_id": current_user.id}

    @app.post("/api/gov/announcements/{id}/publish")
    def publish_announcement(id: int, db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        ann = db.query(E2EAnnouncement).filter(E2EAnnouncement.id == id).first()
        if not ann:
            raise HTTPException(status_code=404, detail="Announcement not found")
        if ann.status not in ["approved", "scheduled"]:
            raise HTTPException(status_code=400, detail=f"Cannot publish announcement from status '{ann.status}'. Must be approved first.")

        ann.status = "published"
        ann.published_at = datetime.now(timezone.utc)

        # Initialize delivery accounting records per channel
        for ch in ann.channels:
            deliv = E2EAnnouncementDelivery(
                announcement_id=ann.id,
                channel=ch,
                status="delivered" if ch == "web" else "attempted",
                attempt_count=1,
                delivered_at=datetime.now(timezone.utc) if ch == "web" else None
            )
            db.add(deliv)

        db.commit()
        return {"id": ann.id, "status": "published", "published_at": ann.published_at.isoformat()}

    @app.post("/api/gov/announcements/{id}/withdraw")
    def withdraw_announcement(id: int, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        ann = db.query(E2EAnnouncement).filter(E2EAnnouncement.id == id).first()
        if not ann:
            raise HTTPException(status_code=404, detail="Announcement not found")
        reason = payload.get("withdrawal_reason", "").strip()
        if not reason:
            raise HTTPException(status_code=422, detail="withdrawal_reason is mandatory to withdraw an announcement")

        ann.status = "withdrawn"
        ann.withdrawal_reason = reason
        ann.withdrawn_at = datetime.now(timezone.utc)
        ann.withdrawn_by_id = current_user.id
        db.commit()
        return {"id": ann.id, "status": "withdrawn", "withdrawal_reason": reason}

    @app.post("/api/gov/announcements/{id}/corrections")
    def post_announcement_correction(id: int, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: E2EUser = Depends(require_gov_role)):
        ann = db.query(E2EAnnouncement).filter(E2EAnnouncement.id == id).first()
        if not ann:
            raise HTTPException(status_code=404, detail="Announcement not found")
        if ann.status != "published":
            raise HTTPException(status_code=400, detail="Corrections can only be added to published announcements")
        note = payload.get("correction_note", "").strip()
        if not note:
            raise HTTPException(status_code=422, detail="correction_note cannot be empty")

        corr = E2EAnnouncementCorrection(
            announcement_id=ann.id,
            correction_note=note,
            corrected_by_id=current_user.id,
            previous_content={"title_en": ann.title_en, "content_en": ann.content_en}
        )
        db.add(corr)
        db.commit()
        db.refresh(corr)
        return {"id": corr.id, "announcement_id": ann.id, "correction_note": corr.correction_note, "timestamp": corr.created_at.isoformat()}

    @app.get("/api/announcements/public")
    def list_public_announcements(db: Session = Depends(get_db)):
        anns = db.query(E2EAnnouncement).filter(E2EAnnouncement.status == "published").order_by(E2EAnnouncement.published_at.desc()).all()
        return [
            {
                "id": a.id,
                "announcement_id": a.announcement_id,
                "title_en": a.title_en,
                "title_fil": a.title_fil,
                "content_en": a.content_en,
                "content_fil": a.content_fil,
                "priority": a.priority,
                "published_at": a.published_at.isoformat() if a.published_at else None
            }
            for a in anns
        ]

    return app

# Instantiate global test app and client
test_app = create_test_app()
client = TestClient(test_app)
