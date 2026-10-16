# Implementation Blueprint: PULSO Government Operational Endpoints (Milestone 1)

**Investigator / Author:** Operational Endpoints Explorer  
**Date:** 2026-09-18  
**Working Directory:** `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_gov_endpoints`  
**Target Files:**
- `c:\Users\Val\Desktop\PULSO\backend\gov_models.py`
- `c:\Users\Val\Desktop\PULSO\backend\gov_schemas.py`
- `c:\Users\Val\Desktop\PULSO\backend\gov_crud.py`
- `c:\Users\Val\Desktop\PULSO\backend\gov_router.py`
- `c:\Users\Val\Desktop\PULSO\backend\tests\test_gov_endpoints_m1.py`

---

## 1. Executive Summary & Architectural Scope

This blueprint delivers the exact database models, Pydantic schemas, business logic, and REST API endpoints required to transition the PULSO Government Workspace from mock-assisted prototyping to 100% authoritative database state.

### The Four Operational Pillars:
1. **Physical Infrastructure Asset Register (`/api/gov/assets`)**:
   - Paginated register with multi-criteria filtering (category, barangay, condition score, search query).
   - High-level category stats breakdown across the 5 canonical infrastructure classes: Roads, Drainage, Bridges, Public Buildings, Facilities.
   - Comprehensive single-asset docket (`/api/gov/assets/{id}`) linking physical attributes, calculated Asset Health Score (AHS), Deterioration Velocity (DV), environmental flood/subsidence context, historical maintenance logs, and active work orders.
   - Asset onboarding endpoint (`POST /api/gov/assets`).
2. **Work Order Blockers & Independent Inspection Verification**:
   - `WorkOrderBlocker` model capturing structured delay reasons (`weather`, `utility`, `permit`, `materials`, `security`, `access`, `other`), estimated delay days, and resolution audit.
   - `WorkOrderInspection` model logging independent quality audits with checklist results, pass/fail status, and evidence photos.
   - Separation of Duties (SoD) mandatory gate: `current_user.id != work_order.assigned_to_id` (HTTP 403 Forbidden on violation; field workers cannot self-certify work).
   - State transition machine: `passed=True` → `completed` (syncs citizen report to `resolved`), `passed=False` → `rework_required` (syncs citizen report to `in_progress`).
3. **Citizen Reports "Request Information" & Docket Hub**:
   - `POST /api/gov/reports/{id}/request-info` replacing frontend mock toasts with real database status change (`needs_information`), public `ProcessTimeline` entry, resident notification, and audit logging.
   - `GET /api/gov/reports/{id}/docket` delivering the complete engineering docket (evidence, AI triage metadata, timeline, linked work orders, inspector logs).
4. **Today Operations Hub Aggregated Endpoint (`/api/gov/operations/today`)**:
   - Aggregates five leadership metrics: Unassigned Concerns, Overdue Actions, Awaiting Verification, Open High-Priority, Resolved in Period (7 days).
   - Dynamic "Needs Attention" triage feed with direct routing (`action_url`) and recommended operational actions.
   - Dual-sector overview partitioning Caloocan North (Districts 2 & 3 / lat ≥ 14.69) vs. Caloocan South (District 1 / lat < 14.69).
   - Team capacity breakdown across 5 municipal engineering taskforces.

---

## 2. Database Models Specification (`gov_models.py`)

### 2.1 Model Extensions: `WorkOrderBlocker`
```python
# ─────────────────────────────────────────────────────────────────────────────
# Work Order Blockers (Delay Tracking & Reason Codes)
# ─────────────────────────────────────────────────────────────────────────────

class WorkOrderBlocker(Base):
    """
    Tracks structured blockers preventing work order progression.
    Captures standard municipal delay reasons and estimated downtime.
    """
    __tablename__ = "work_order_blockers"

    id                   = Column(Integer, primary_key=True, index=True)
    work_order_id        = Column(Integer, ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Reason codes: weather | utility | permit | materials | security | access | other
    reason_code          = Column(String, nullable=False, index=True)
    delay_days           = Column(Float, default=1.0)
    notes                = Column(Text, nullable=True)
    
    blocked_by_id        = Column(Integer, ForeignKey("officials.id"), nullable=True)
    is_resolved          = Column(Boolean, default=False, index=True)
    
    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at          = Column(DateTime(timezone=True), nullable=True)
    resolved_by_id       = Column(Integer, ForeignKey("officials.id"), nullable=True)
    resolution_notes     = Column(Text, nullable=True)

    # Relationships
    work_order           = relationship("WorkOrder", back_populates="blockers")
    blocked_by           = relationship("Official", foreign_keys=[blocked_by_id])
    resolved_by          = relationship("Official", foreign_keys=[resolved_by_id])
```

### 2.2 Model Extensions: `WorkOrderInspection`
```python
# ─────────────────────────────────────────────────────────────────────────────
# Work Order Inspections (Independent Quality Audit & Separation of Duties)
# ─────────────────────────────────────────────────────────────────────────────

class WorkOrderInspection(Base):
    """
    Immutable record of an independent quality inspection conducted on a completed
    or awaiting-verification work order. Enforces Separation of Duties.
    """
    __tablename__ = "work_order_inspections"

    id                   = Column(Integer, primary_key=True, index=True)
    work_order_id        = Column(Integer, ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    inspector_id         = Column(Integer, ForeignKey("officials.id"), nullable=False, index=True)
    
    inspection_date      = Column(DateTime(timezone=True), server_default=func.now())
    # Structured checklist results (e.g., {"dimensions_verified": True, "compaction_tested": True, "debris_cleared": True})
    checklist_results    = Column(JSON, nullable=True)
    passed               = Column(Boolean, nullable=False, default=False)
    notes                = Column(Text, nullable=True)
    evidence_photo_url   = Column(String, nullable=True)
    created_at           = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    work_order           = relationship("WorkOrder", back_populates="inspections")
    inspector            = relationship("Official", foreign_keys=[inspector_id])
```

### 2.3 Updates to `WorkOrder` Model
In `WorkOrder` class in `backend/gov_models.py`:
1. Expand `status` vocabulary in docstrings and validation:
   `open` → `assigned` → `in_progress` → `blocked` → `awaiting_verification` → `rework_required` → `completed` | `cancelled`
2. Add back-populating relationships:
   ```python
   blockers    = relationship("WorkOrderBlocker", back_populates="work_order", cascade="all, delete-orphan")
   inspections = relationship("WorkOrderInspection", back_populates="work_order", cascade="all, delete-orphan")
   ```

### 2.4 Updates to `InfrastructureAsset` Model
In `InfrastructureAsset` class in `backend/gov_models.py`:
Add `condition_score`, `status`, and timestamps:
```python
    condition_score      = Column(Float, default=100.0, nullable=True)
    status               = Column(String, default="operational", index=True) # operational, maintenance_needed, under_repair, critical, decommissioned
    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    updated_at           = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

---

## 3. Pydantic Schemas Specification (`gov_schemas.py`)

### 3.1 Physical Infrastructure Asset Schemas
```python
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class AssetBase(BaseModel):
    asset_name: str
    category: str # Roads, Drainage, Bridges, Public Buildings, Facilities
    gps_coordinates: Optional[Dict[str, Any]] = None # GeoJSON Point or {"lat": float, "lng": float}
    material_type: Optional[str] = None
    date_completed: Optional[date] = None
    design_life: int = 20
    original_contractor: Optional[str] = None
    barangay: Optional[str] = None
    barangay_id: Optional[int] = None
    condition_score: Optional[float] = 100.0
    status: Optional[str] = "operational"

class AssetCreate(AssetBase):
    asset_id: Optional[str] = None # Auto-generated if not supplied

class AssetUpdate(BaseModel):
    asset_name: Optional[str] = None
    category: Optional[str] = None
    gps_coordinates: Optional[Dict[str, Any]] = None
    material_type: Optional[str] = None
    design_life: Optional[int] = None
    original_contractor: Optional[str] = None
    barangay_id: Optional[int] = None
    barangay: Optional[str] = None
    condition_score: Optional[float] = None
    status: Optional[str] = None

class AssetMaintenanceLogResponse(BaseModel):
    log_id: str
    asset_id: str
    work_type: str
    cost: Optional[float] = None
    completion_date: date

    class Config:
        from_attributes = True

class AssetResponse(AssetBase):
    asset_id: str
    barangay_name: Optional[str] = None
    district_code: Optional[str] = None
    condition_tier: str # "good", "fair", "poor", "critical"
    active_work_orders_count: int = 0
    last_maintenance_date: Optional[date] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AssetDetailResponse(AssetResponse):
    deterioration_velocity: float = 0.0
    flood_risk_level: Optional[str] = "Low"
    soil_subsidence: Optional[float] = 0.0
    maintenance_history: List[AssetMaintenanceLogResponse] = []
    active_work_orders: List[Dict[str, Any]] = []
    linked_projects: List[Dict[str, Any]] = []

class CategoryConditionBreakdown(BaseModel):
    good: int = 0      # 80-100
    fair: int = 0      # 60-79
    poor: int = 0      # 40-59
    critical: int = 0  # 0-39

class CategoryStats(BaseModel):
    category_name: str
    total_count: int
    avg_condition_score: float
    condition_breakdown: CategoryConditionBreakdown
    active_work_orders: int

class AssetStatsResponse(BaseModel):
    total_assets: int
    overall_avg_condition: float
    total_critical_assets: int
    total_active_work_orders: int
    categories: Dict[str, CategoryStats]
```

### 3.2 Blocker & Inspection Schemas
```python
# Blocker Schemas
class WorkOrderBlockRequest(BaseModel):
    reason_code: str # weather, utility, permit, materials, security, access, other
    delay_days: float = Field(default=1.0, ge=0.1)
    notes: Optional[str] = None

class WorkOrderUnblockRequest(BaseModel):
    resolution_notes: Optional[str] = None
    next_status: Optional[str] = "in_progress"

class WorkOrderBlockerResponse(BaseModel):
    id: int
    work_order_id: int
    reason_code: str
    delay_days: float
    notes: Optional[str] = None
    blocked_by_id: Optional[int] = None
    blocked_by_name: Optional[str] = None
    is_resolved: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by_id: Optional[int] = None
    resolved_by_name: Optional[str] = None
    resolution_notes: Optional[str] = None

    class Config:
        from_attributes = True

# Inspection Schemas
class WorkOrderVerifyRequest(BaseModel):
    inspection_date: Optional[datetime] = None
    checklist_results: Optional[Dict[str, Any]] = None
    passed: bool
    notes: Optional[str] = None
    evidence_photo_url: Optional[str] = None

class WorkOrderInspectionResponse(BaseModel):
    id: int
    work_order_id: int
    inspector_id: int
    inspector_name: Optional[str] = None
    inspection_date: datetime
    checklist_results: Optional[Dict[str, Any]] = None
    passed: bool
    notes: Optional[str] = None
    evidence_photo_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
```

### 3.3 Citizen Report Request-Info & Docket Schemas
```python
class ReportRequestInfo(BaseModel):
    reason: str = Field(..., description="Short classification: Unclear photo, Access permission, Landmark verification")
    message: str = Field(..., description="Actionable explanation shown to citizen")

class ReportRequestInfoResponse(BaseModel):
    status: str
    report_id: int
    ticket_id: str
    new_status: str
    timeline_id: int
    message: str
```

### 3.4 Today Operations Hub Schemas
```python
class OperationsLeadershipMetrics(BaseModel):
    unassigned_concerns: int
    overdue_actions: int
    awaiting_verification: int
    open_high_priority: int
    resolved_in_period: int

class OperationsTriageItem(BaseModel):
    id: int
    entity_type: str # "report" | "work_order"
    ticket_id: str
    title: str
    category: str
    priority: str
    status: str
    barangay: Optional[str] = None
    time_in_state: str
    action_url: str
    recommended_action: str

class SectorMetric(BaseModel):
    open_tickets: int
    critical_count: int
    resolved_7d: int
    active_work_orders: int

class SectorSummary(BaseModel):
    north_caloocan: SectorMetric
    south_caloocan: SectorMetric

class TeamCapacityItem(BaseModel):
    team_id: str
    team_name: str
    category: str
    active_orders: int
    blocked_orders: int
    personnel_count: int
    capacity_pct: float

class GovOperationsTodayResponse(BaseModel):
    timestamp: datetime
    metrics: OperationsLeadershipMetrics
    needs_attention: List[OperationsTriageItem]
    sector_summary: SectorSummary
    team_capacity: List[TeamCapacityItem]
```

---

## 4. CRUD Layer Implementation Specification (`gov_crud.py`)

### 4.1 Asset Management Functions
```python
def normalize_asset_category(category_input: str) -> str:
    """Map singular/plural variations to the 5 standard categories."""
    cat = (category_input or "").strip().lower()
    if cat in ["road", "roads", "pavement", "highway"]:
        return "Roads"
    elif cat in ["drainage", "drain", "culvert", "canal", "sewer"]:
        return "Drainage"
    elif cat in ["bridge", "bridges", "overpass", "flyover"]:
        return "Bridges"
    elif cat in ["public building", "public buildings", "building", "buildings", "hall"]:
        return "Public Buildings"
    elif cat in ["facility", "facilities", "street light", "light", "lights", "park", "plaza"]:
        return "Facilities"
    return category_input.title()

def get_condition_tier(score: float) -> str:
    if score >= 80.0: return "good"
    elif score >= 60.0: return "fair"
    elif score >= 40.0: return "poor"
    return "critical"

def create_infrastructure_asset(
    db: Session,
    data: gov_schemas.AssetCreate,
    actor_id: int,
    actor_role: str,
) -> gov_models.InfrastructureAsset:
    cat_normalized = normalize_asset_category(data.category)
    
    # Auto-generate asset_id if not provided
    asset_id = data.asset_id
    if not asset_id:
        prefix = cat_normalized[:2].upper()
        asset_id = f"CAL-{prefix}-{secrets.token_hex(2).upper()}"

    # Verify uniqueness
    existing = db.query(gov_models.InfrastructureAsset).filter(
        gov_models.InfrastructureAsset.asset_id == asset_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Asset ID '{asset_id}' already exists.")

    # Resolve Barangay & District
    barangay_name = data.barangay
    if data.barangay_id:
        brgy = db.query(models.Barangay).filter(models.Barangay.id == data.barangay_id).first()
        if brgy:
            barangay_name = brgy.name

    asset = gov_models.InfrastructureAsset(
        asset_id=asset_id,
        asset_name=data.asset_name,
        category=cat_normalized,
        gps_coordinates=data.gps_coordinates,
        material_type=data.material_type,
        date_completed=data.date_completed,
        design_life=data.design_life,
        original_contractor=data.original_contractor,
        barangay=barangay_name,
        barangay_id=data.barangay_id,
        condition_score=data.condition_score or 100.0,
        status=data.status or "operational",
    )
    db.add(asset)
    db.flush()

    _append_audit(
        db,
        trigger_type="maintenance",
        action=f"Created physical infrastructure asset {asset.asset_id} ({cat_normalized})",
        actor_id=actor_id,
        actor_role=actor_role,
        details=f"Name: {asset.asset_name} | Barangay: {barangay_name}"
    )
    db.commit()
    db.refresh(asset)
    return asset

def list_infrastructure_assets(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    category: Optional[str] = None,
    barangay: Optional[str] = None,
    condition_score: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "asset_id",
    order: Optional[str] = "asc",
) -> List[gov_models.InfrastructureAsset]:
    q = db.query(gov_models.InfrastructureAsset).options(
        joinedload(gov_models.InfrastructureAsset.barangay_ref)
    )

    if category:
        cat_norm = normalize_asset_category(category)
        # Match both standard plural and stored variants
        q = q.filter(or_(
            gov_models.InfrastructureAsset.category.ilike(f"%{cat_norm}%"),
            gov_models.InfrastructureAsset.category.ilike(f"%{category}%")
        ))

    if barangay:
        # Match ID or Name
        if barangay.isdigit():
            q = q.filter(or_(
                gov_models.InfrastructureAsset.barangay_id == int(barangay),
                gov_models.InfrastructureAsset.barangay == barangay
            ))
        else:
            q = q.filter(gov_models.InfrastructureAsset.barangay.ilike(f"%{barangay}%"))

    if condition_score:
        cs = condition_score.strip().lower()
        if cs == "critical":
            q = q.filter(gov_models.InfrastructureAsset.condition_score < 40.0)
        elif cs == "poor":
            q = q.filter(gov_models.InfrastructureAsset.condition_score >= 40.0,
                         gov_models.InfrastructureAsset.condition_score < 60.0)
        elif cs == "fair":
            q = q.filter(gov_models.InfrastructureAsset.condition_score >= 60.0,
                         gov_models.InfrastructureAsset.condition_score < 80.0)
        elif cs == "good":
            q = q.filter(gov_models.InfrastructureAsset.condition_score >= 80.0)
        else:
            try:
                score_num = float(cs)
                q = q.filter(gov_models.InfrastructureAsset.condition_score <= score_num)
            except ValueError:
                pass

    if search:
        s = f"%{search}%"
        q = q.filter(or_(
            gov_models.InfrastructureAsset.asset_id.ilike(s),
            gov_models.InfrastructureAsset.asset_name.ilike(s),
            gov_models.InfrastructureAsset.material_type.ilike(s),
            gov_models.InfrastructureAsset.original_contractor.ilike(s)
        ))

    # Sorting
    sort_col = getattr(gov_models.InfrastructureAsset, sort_by, gov_models.InfrastructureAsset.asset_id)
    if order == "desc":
        q = q.order_by(sort_col.desc())
    else:
        q = q.order_by(sort_col.asc())

    return q.offset(skip).limit(limit).all()

def get_infrastructure_assets_stats(db: Session) -> gov_schemas.AssetStatsResponse:
    from predictive_engine import calculate_ahs
    all_assets = db.query(gov_models.InfrastructureAsset).all()

    standard_categories = ["Roads", "Drainage", "Bridges", "Public Buildings", "Facilities"]
    category_data = {
        cat: {
            "category_name": cat,
            "total_count": 0,
            "scores": [],
            "condition_breakdown": {"good": 0, "fair": 0, "poor": 0, "critical": 0},
            "active_work_orders": 0,
        }
        for cat in standard_categories
    }

    # Count active work orders grouped by asset_id
    active_wo_counts = dict(
        db.query(
            gov_models.WorkOrder.asset_id,
            func.count(gov_models.WorkOrder.id)
        ).filter(
            gov_models.WorkOrder.asset_id.isnot(None),
            gov_models.WorkOrder.status.notin_(["completed", "cancelled"])
        ).group_by(gov_models.WorkOrder.asset_id).all()
    )

    total_critical = 0
    all_scores = []

    for asset in all_assets:
        cat = normalize_asset_category(asset.category)
        if cat not in category_data:
            cat = "Facilities"

        score = asset.condition_score
        if score is None:
            score = calculate_ahs(db, asset.asset_id)

        all_scores.append(score)
        category_data[cat]["total_count"] += 1
        category_data[cat]["scores"].append(score)

        tier = get_condition_tier(score)
        category_data[cat]["condition_breakdown"][tier] += 1
        if tier == "critical":
            total_critical += 1

        category_data[cat]["active_work_orders"] += active_wo_counts.get(asset.asset_id, 0)

    # Format result
    cat_stats_dict = {}
    for cat_name, val in category_data.items():
        avg_score = round(sum(val["scores"]) / max(len(val["scores"]), 1), 1)
        cat_stats_dict[cat_name] = gov_schemas.CategoryStats(
            category_name=cat_name,
            total_count=val["total_count"],
            avg_condition_score=avg_score,
            condition_breakdown=gov_schemas.CategoryConditionBreakdown(**val["condition_breakdown"]),
            active_work_orders=val["active_work_orders"],
        )

    overall_avg = round(sum(all_scores) / max(len(all_scores), 1), 1)
    total_active_wos = sum(active_wo_counts.values())

    return gov_schemas.AssetStatsResponse(
        total_assets=len(all_assets),
        overall_avg_condition=overall_avg,
        total_critical_assets=total_critical,
        total_active_work_orders=total_active_wos,
        categories=cat_stats_dict,
    )
```

### 4.2 Work Order Blocker & Separation of Duties Functions
```python
def block_work_order(
    db: Session,
    wo_id: int,
    data: gov_schemas.WorkOrderBlockRequest,
    actor_id: int,
    actor_role: str,
) -> gov_models.WorkOrder:
    wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    if wo.status in ("completed", "cancelled"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot block work order that is already '{wo.status}'."
        )

    prev_status = wo.status
    wo.status = "blocked"

    blocker = gov_models.WorkOrderBlocker(
        work_order_id=wo.id,
        reason_code=data.reason_code,
        delay_days=data.delay_days,
        notes=data.notes,
        blocked_by_id=actor_id,
        is_resolved=False,
    )
    db.add(blocker)

    # Immutable Timeline & Audit
    _append_timeline(
        db,
        status="blocked",
        previous_status=prev_status,
        actor_id=actor_id,
        actor_role=actor_role,
        note=f"Work blocked ({data.reason_code}): +{data.delay_days}d estimated delay. {data.notes or ''}".strip(),
        work_order_id=wo.id,
        report_id=wo.report_id,
        project_id=wo.project_id,
    )

    _append_audit(
        db,
        trigger_type="status_change",
        action=f"Work order {wo.wo_number} marked BLOCKED ({data.reason_code})",
        actor_id=actor_id,
        actor_role=actor_role,
        work_order_id=wo.id,
        details=f"Delay: {data.delay_days} days | Notes: {data.notes}"
    )

    db.commit()
    db.refresh(wo)
    return wo

def unblock_work_order(
    db: Session,
    wo_id: int,
    data: gov_schemas.WorkOrderUnblockRequest,
    actor_id: int,
    actor_role: str,
) -> gov_models.WorkOrder:
    wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    # Resolve all open blockers
    open_blockers = db.query(gov_models.WorkOrderBlocker).filter(
        gov_models.WorkOrderBlocker.work_order_id == wo_id,
        gov_models.WorkOrderBlocker.is_resolved == False
    ).all()

    now_utc = datetime.now(timezone.utc)
    for b in open_blockers:
        b.is_resolved = True
        b.resolved_at = now_utc
        b.resolved_by_id = actor_id
        b.resolution_notes = data.resolution_notes

    next_status = data.next_status or "in_progress"
    prev_status = wo.status
    wo.status = next_status

    _append_timeline(
        db,
        status=next_status,
        previous_status=prev_status,
        actor_id=actor_id,
        actor_role=actor_role,
        note=f"Blocker resolved. Resumed work order ({next_status}). Notes: {data.resolution_notes or 'None'}",
        work_order_id=wo.id,
        report_id=wo.report_id,
        project_id=wo.project_id,
    )

    _append_audit(
        db,
        trigger_type="status_change",
        action=f"Work order {wo.wo_number} UNBLOCKED → {next_status}",
        actor_id=actor_id,
        actor_role=actor_role,
        work_order_id=wo.id,
        details=data.resolution_notes
    )

    db.commit()
    db.refresh(wo)
    return wo

def verify_work_order_inspection(
    db: Session,
    wo_id: int,
    data: gov_schemas.WorkOrderVerifyRequest,
    inspector_id: int,
    inspector_role: str,
) -> Dict[str, Any]:
    wo = db.query(gov_models.WorkOrder).filter(gov_models.WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    # 1. MANDATORY SEPARATION OF DUTIES ENFORCEMENT
    if inspector_id == wo.assigned_to_id:
        raise HTTPException(
            status_code=403,
            detail="Separation of duties violation: Assigned field worker cannot inspect or verify their own work order."
        )

    # 2. Record Inspection
    inspection = gov_models.WorkOrderInspection(
        work_order_id=wo.id,
        inspector_id=inspector_id,
        inspection_date=data.inspection_date or datetime.now(timezone.utc),
        checklist_results=data.checklist_results,
        passed=data.passed,
        notes=data.notes,
        evidence_photo_url=data.evidence_photo_url,
    )
    db.add(inspection)
    db.flush()

    prev_status = wo.status
    if data.passed:
        # Passed Quality Gate -> Completed
        wo.status = "completed"
        wo.completed_date = datetime.now(timezone.utc)
        timeline_note = f"Independent inspection PASSED (Inspector #{inspector_id}). Work order verified."
        if wo.report_id:
            _sync_report_status(db, wo.report_id, "resolved", inspector_id, inspector_role)
    else:
        # Failed Quality Gate -> Rework Required
        wo.status = "rework_required"
        timeline_note = f"Independent inspection FAILED: Rework required. Notes: {data.notes or 'None'}"
        if wo.report_id:
            _sync_report_status(db, wo.report_id, "in_progress", inspector_id, inspector_role)

    _append_timeline(
        db,
        status=wo.status,
        previous_status=prev_status,
        actor_id=inspector_id,
        actor_role=inspector_role,
        note=timeline_note,
        work_order_id=wo.id,
        report_id=wo.report_id,
        project_id=wo.project_id,
    )

    _append_audit(
        db,
        trigger_type="status_change",
        action=f"Work order {wo.wo_number} inspection verification: {'PASSED' if data.passed else 'FAILED'}",
        actor_id=inspector_id,
        actor_role=inspector_role,
        work_order_id=wo.id,
        details=f"Passed: {data.passed} | Notes: {data.notes}"
    )

    db.commit()
    db.refresh(wo)
    db.refresh(inspection)

    return {
        "work_order": enrich_work_order(wo, db),
        "inspection": {
            "id": inspection.id,
            "work_order_id": inspection.work_order_id,
            "inspector_id": inspection.inspector_id,
            "inspector_name": _name(db, inspection.inspector_id),
            "passed": inspection.passed,
            "inspection_date": inspection.inspection_date,
            "notes": inspection.notes,
            "checklist_results": inspection.checklist_results,
        }
    }
```

### 4.3 Citizen Report Request-Info Logic
```python
def request_citizen_information(
    db: Session,
    report_id: int,
    data: gov_schemas.ReportRequestInfo,
    actor_id: int,
    actor_role: str,
) -> Dict[str, Any]:
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Citizen report not found")

    if report.status in ("resolved", "cancelled", "rejected"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot request information for report in '{report.status}' status."
        )

    prev_status = report.status
    report.status = "needs_information"
    report.updated_at = datetime.now(timezone.utc)

    # 1. Public Process Timeline Entry
    timeline_entry = _append_timeline(
        db,
        status="needs_information",
        previous_status=prev_status,
        actor_id=actor_id,
        actor_role=actor_role,
        note=f"Action Required: [{data.reason}] {data.message}",
        is_public=True,
        report_id=report.id,
    )

    # 2. Resident Notification Dispatch
    ticket = report.ticket_id or f"PUL-{report.id}"
    notif_msg = f"City Engineering requested more information for report {ticket}: {data.message}"
    if report.resident_id:
        notif = models.Notification(
            resident_id=report.resident_id,
            title="Information Needed on Your Report",
            message=notif_msg,
            priority=10
        )
        db.add(notif)
    elif report.contact_email:
        # Dispatch or audit log external guest notification
        notification_service.log_notification("guest_email", report.contact_email, notif_msg, "request_info")

    # 3. Audit Log Entry
    _append_audit(
        db,
        trigger_type="status_change",
        action=f"Requested citizen information for report {ticket}: {data.reason}",
        actor_id=actor_id,
        actor_role=actor_role,
        details=data.message,
        report_id=report.id,
    )

    db.commit()
    db.refresh(report)

    return {
        "status": "success",
        "report_id": report.id,
        "ticket_id": report.ticket_id,
        "new_status": report.status,
        "timeline_id": timeline_entry.id,
        "message": "Information request sent to citizen successfully."
    }
```

### 4.4 Today Operations Hub Metric Calculations
```python
def get_operations_today_hub(db: Session) -> gov_schemas.GovOperationsTodayResponse:
    now_utc = datetime.now(timezone.utc)
    seven_days_ago = now_utc - timedelta(days=7)

    # ──────────────── 1. Five Leadership Metrics ────────────────
    # Unassigned concerns: Reports in active intake states without assigned work order
    assigned_report_ids = db.query(gov_models.WorkOrder.report_id).filter(
        gov_models.WorkOrder.report_id.isnot(None),
        gov_models.WorkOrder.assigned_to_id.isnot(None)
    ).subquery()

    unassigned_count = db.query(func.count(models.Report.id)).filter(
        models.Report.status.in_(["received", "pending", "under_review", "validated"]),
        models.Report.id.notin_(assigned_report_ids)
    ).scalar() or 0

    # Overdue actions: Work orders past scheduled_date and not completed
    overdue_count = db.query(func.count(gov_models.WorkOrder.id)).filter(
        gov_models.WorkOrder.status.notin_(["completed", "cancelled"]),
        gov_models.WorkOrder.scheduled_date.isnot(None),
        gov_models.WorkOrder.scheduled_date < now_utc
    ).scalar() or 0

    # Awaiting verification
    awaiting_count = db.query(func.count(gov_models.WorkOrder.id)).filter(
        gov_models.WorkOrder.status == "awaiting_verification"
    ).scalar() or 0

    # Open high-priority
    open_reports_hp = db.query(func.count(models.Report.id)).filter(
        models.Report.status.notin_(["resolved", "cancelled", "rejected"]),
        or_(models.Report.ai_urgency.in_(["critical", "high"]), models.Report.priority.in_(["critical", "high"]))
    ).scalar() or 0
    open_wo_hp = db.query(func.count(gov_models.WorkOrder.id)).filter(
        gov_models.WorkOrder.status.notin_(["completed", "cancelled"]),
        gov_models.WorkOrder.priority.in_(["critical", "high"])
    ).scalar() or 0
    open_hp = open_reports_hp + open_wo_hp

    # Resolved in 7-day period
    resolved_7d = db.query(func.count(models.Report.id)).filter(
        models.Report.status == "resolved",
        models.Report.updated_at >= seven_days_ago
    ).scalar() or 0

    metrics = gov_schemas.OperationsLeadershipMetrics(
        unassigned_concerns=unassigned_count,
        overdue_actions=overdue_count,
        awaiting_verification=awaiting_count,
        open_high_priority=open_hp,
        resolved_in_period=resolved_7d,
    )

    # ──────────────── 2. Triage Feed ("Needs Attention") ────────────────
    triage_items: List[gov_schemas.OperationsTriageItem] = []

    # Priority A: Critical/Urgent unassigned reports
    urgent_reports = db.query(models.Report).filter(
        models.Report.status.in_(["received", "pending", "under_review", "validated"]),
        or_(models.Report.ai_urgency == "critical", models.Report.priority == "critical")
    ).order_by(models.Report.created_at.asc()).limit(5).all()

    for r in urgent_reports:
        time_ago = format_time_diff(r.created_at, now_utc)
        triage_items.append(gov_schemas.OperationsTriageItem(
            id=r.id,
            entity_type="report",
            ticket_id=r.ticket_id or f"PUL-{r.id}",
            title=r.description[:50] if r.description else "Critical Citizen Report",
            category=r.category or "Civic Concern",
            priority="critical",
            status=r.status,
            barangay=r.location_barangay,
            time_in_state=time_ago,
            action_url=f"/gov/reports/{r.id}",
            recommended_action="Dispatch Emergency Work Order",
        ))

    # Priority B: Blocked work orders
    blocked_wos = db.query(gov_models.WorkOrder).filter(
        gov_models.WorkOrder.status == "blocked"
    ).order_by(gov_models.WorkOrder.updated_at.desc()).limit(5).all()

    for wo in blocked_wos:
        time_ago = format_time_diff(wo.updated_at or wo.created_at, now_utc)
        triage_items.append(gov_schemas.OperationsTriageItem(
            id=wo.id,
            entity_type="work_order",
            ticket_id=wo.wo_number,
            title=wo.title,
            category=wo.category or "Field Repair",
            priority=wo.priority or "normal",
            status="blocked",
            barangay=f"District {wo.district_id}" if wo.district_id else None,
            time_in_state=time_ago,
            action_url=f"/gov/work/{wo.id}",
            recommended_action="Resolve Site Blocker",
        ))

    # Priority C: Awaiting verification work orders
    verify_wos = db.query(gov_models.WorkOrder).filter(
        gov_models.WorkOrder.status == "awaiting_verification"
    ).order_by(gov_models.WorkOrder.updated_at.asc()).limit(5).all()

    for wo in verify_wos:
        time_ago = format_time_diff(wo.updated_at or wo.created_at, now_utc)
        triage_items.append(gov_schemas.OperationsTriageItem(
            id=wo.id,
            entity_type="work_order",
            ticket_id=wo.wo_number,
            title=wo.title,
            category=wo.category or "Field Repair",
            priority=wo.priority or "normal",
            status="awaiting_verification",
            barangay=f"District {wo.district_id}" if wo.district_id else None,
            time_in_state=time_ago,
            action_url=f"/gov/work/{wo.id}",
            recommended_action="Dispatch Independent Inspector",
        ))

    # ──────────────── 3. Sector Summary (North vs South) ────────────────
    # North Caloocan: District 2 & 3 or lat >= 14.69
    # South Caloocan: District 1 or lat < 14.69
    all_active_reports = db.query(models.Report).filter(
        models.Report.status.notin_(["resolved", "cancelled", "rejected"])
    ).all()

    north_open, south_open = 0, 0
    north_crit, south_crit = 0, 0
    for r in all_active_reports:
        is_north = (r.district_id in (2, 3)) or (r.location_lat and r.location_lat >= 14.69)
        is_crit = (r.ai_urgency == "critical" or r.priority == "critical")
        if is_north:
            north_open += 1
            if is_crit: north_crit += 1
        else:
            south_open += 1
            if is_crit: south_crit += 1

    all_resolved_7d = db.query(models.Report).filter(
        models.Report.status == "resolved",
        models.Report.updated_at >= seven_days_ago
    ).all()
    north_res, south_res = 0, 0
    for r in all_resolved_7d:
        if (r.district_id in (2, 3)) or (r.location_lat and r.location_lat >= 14.69):
            north_res += 1
        else:
            south_res += 1

    all_active_wos = db.query(gov_models.WorkOrder).filter(
        gov_models.WorkOrder.status.notin_(["completed", "cancelled"])
    ).all()
    north_wo, south_wo = 0, 0
    for w in all_active_wos:
        if w.district_id in (2, 3):
            north_wo += 1
        else:
            south_wo += 1

    sector_summary = gov_schemas.SectorSummary(
        north_caloocan=gov_schemas.SectorMetric(
            open_tickets=north_open,
            critical_count=north_crit,
            resolved_7d=north_res,
            active_work_orders=north_wo,
        ),
        south_caloocan=gov_schemas.SectorMetric(
            open_tickets=south_open,
            critical_count=south_crit,
            resolved_7d=south_res,
            active_work_orders=south_wo,
        )
    )

    # ──────────────── 4. Team Capacity ────────────────
    taskforces = [
        {"team_id": "roads_div", "team_name": "Road & Pavement Taskforce", "category": "Road", "base_capacity": 10},
        {"team_id": "drainage_div", "team_name": "North Drainage Maintenance Unit", "category": "Drainage", "base_capacity": 8},
        {"team_id": "lights_div", "team_name": "Streetlight & Electrical Section", "category": "Light", "base_capacity": 8},
        {"team_id": "bldg_div", "team_name": "Public Buildings & Structures", "category": "Building", "base_capacity": 6},
        {"team_id": "bridges_div", "team_name": "Bridge & Overpass Engineering", "category": "Bridge", "base_capacity": 4},
    ]

    team_capacity_list = []
    for tf in taskforces:
        cat_filter = tf["category"]
        active_cnt = db.query(func.count(gov_models.WorkOrder.id)).filter(
            gov_models.WorkOrder.category.ilike(f"%{cat_filter}%"),
            gov_models.WorkOrder.status.in_(["assigned", "in_progress", "awaiting_verification"])
        ).scalar() or 0

        blocked_cnt = db.query(func.count(gov_models.WorkOrder.id)).filter(
            gov_models.WorkOrder.category.ilike(f"%{cat_filter}%"),
            gov_models.WorkOrder.status == "blocked"
        ).scalar() or 0

        # Personnel in this category or division
        personnel_cnt = db.query(func.count(models.Official.id)).filter(
            models.Official.is_active == True,
            models.Official.account_type == "staff"
        ).scalar() or 5

        cap_max = tf["base_capacity"]
        cap_pct = round(min((active_cnt / max(cap_max, 1)) * 100.0, 100.0), 1)

        team_capacity_list.append(gov_schemas.TeamCapacityItem(
            team_id=tf["team_id"],
            team_name=tf["team_name"],
            category=tf["category"],
            active_orders=active_cnt,
            blocked_orders=blocked_cnt,
            personnel_count=personnel_cnt,
            capacity_pct=cap_pct,
        ))

    return gov_schemas.GovOperationsTodayResponse(
        timestamp=now_utc,
        metrics=metrics,
        needs_attention=triage_items,
        sector_summary=sector_summary,
        team_capacity=team_capacity_list,
    )
```

---

## 5. API Router Endpoints Specification (`gov_router.py`)

All endpoints mount under the government router `prefix="/api/gov"`:

### 5.1 Physical Asset Register Endpoints
```python
@router.get("/assets", response_model=List[gov_schemas.AssetResponse])
def list_assets(
    skip: int = 0,
    limit: int = 50,
    category: Optional[str] = Query(None, description="Category filter (Roads, Drainage, Bridges, Public Buildings, Facilities)"),
    barangay: Optional[str] = Query(None, description="Barangay name or ID"),
    condition_score: Optional[str] = Query(None, description="critical, poor, fair, good, or float threshold"),
    search: Optional[str] = Query(None, description="Keyword search in ID, name, contractor, material"),
    sort_by: Optional[str] = Query("asset_id"),
    order: Optional[str] = Query("asc"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List and filter municipal infrastructure assets. All gov staff can access."""
    _assert_role(current_user, *GOV_ROLES)
    items = gov_crud.list_infrastructure_assets(db, skip, limit, category, barangay, condition_score, search, sort_by, order)
    return [gov_crud.enrich_asset_response(a, db) for a in items]


@router.get("/assets/stats", response_model=gov_schemas.AssetStatsResponse)
def get_assets_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Aggregate statistics and condition tier breakdowns across all 5 categories."""
    _assert_role(current_user, *GOV_ROLES)
    return gov_crud.get_infrastructure_assets_stats(db)


@router.get("/assets/{asset_id}", response_model=gov_schemas.AssetDetailResponse)
def get_asset_detail(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Single physical infrastructure asset docket with full history and linked orders."""
    _assert_role(current_user, *GOV_ROLES)
    asset = db.query(gov_models.InfrastructureAsset).filter(
        gov_models.InfrastructureAsset.asset_id == asset_id
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Infrastructure asset not found")
    return gov_crud.enrich_asset_detail(asset, db)


@router.post("/assets", response_model=gov_schemas.AssetResponse)
def create_asset(
    data: gov_schemas.AssetCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Register a new physical infrastructure asset."""
    _assert_role(current_user, *SENIOR_ROLES)
    asset = gov_crud.create_infrastructure_asset(db, data, actor_id=current_user.id, actor_role=current_user.role)
    return gov_crud.enrich_asset_response(asset, db)
```

### 5.2 Work Order Blocker & Separation of Duties Endpoints
```python
@router.post("/work-orders/{wo_id}/block", response_model=gov_schemas.WorkOrderResponse)
def block_work_order_endpoint(
    wo_id: int,
    data: gov_schemas.WorkOrderBlockRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Report an operational blocker with structured reason codes and delay days."""
    _assert_role(current_user, *FIELD_ROLES)
    wo = gov_crud.block_work_order(db, wo_id, data, actor_id=current_user.id, actor_role=current_user.role)
    return gov_crud.enrich_work_order(wo, db)


@router.post("/work-orders/{wo_id}/unblock", response_model=gov_schemas.WorkOrderResponse)
def unblock_work_order_endpoint(
    wo_id: int,
    data: gov_schemas.WorkOrderUnblockRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Resolve an active blocker and resume the work order."""
    _assert_role(current_user, *FIELD_ROLES)
    wo = gov_crud.unblock_work_order(db, wo_id, data, actor_id=current_user.id, actor_role=current_user.role)
    return gov_crud.enrich_work_order(wo, db)


@router.post("/work-orders/{wo_id}/verify")
def verify_work_order_endpoint(
    wo_id: int,
    payload: gov_schemas.WorkOrderVerifyRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Independent inspection verification of completed work.
    MANDATORY ENFORCEMENT:
      current_user.id != work_order.assigned_to_id (HTTP 403 on violation)
    Transitions:
      passed=True  → status = 'completed'
      passed=False → status = 'rework_required'
    """
    _assert_role(current_user, *INSPECTOR_ROLES)
    return gov_crud.verify_work_order_inspection(
        db, wo_id, payload,
        inspector_id=current_user.id,
        inspector_role=current_user.role
    )


@router.get("/work-orders/{wo_id}/inspections", response_model=List[gov_schemas.WorkOrderInspectionResponse])
def get_work_order_inspections(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieve independent inspection logs for a work order."""
    _assert_role(current_user, *GOV_ROLES)
    inspections = db.query(gov_models.WorkOrderInspection).filter(
        gov_models.WorkOrderInspection.work_order_id == wo_id
    ).order_by(gov_models.WorkOrderInspection.created_at.desc()).all()

    return [
        gov_schemas.WorkOrderInspectionResponse(
            id=ins.id,
            work_order_id=ins.work_order_id,
            inspector_id=ins.inspector_id,
            inspector_name=gov_crud._name(db, ins.inspector_id),
            inspection_date=ins.inspection_date,
            checklist_results=ins.checklist_results,
            passed=ins.passed,
            notes=ins.notes,
            evidence_photo_url=ins.evidence_photo_url,
            created_at=ins.created_at,
        )
        for ins in inspections
    ]
```

### 5.3 Citizen Report Request-Info Endpoint
```python
@router.post("/reports/{report_id}/request-info", response_model=gov_schemas.ReportRequestInfoResponse)
def request_citizen_info(
    report_id: int,
    payload: gov_schemas.ReportRequestInfo,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Request clarification from citizen:
    - Sets Report.status = 'needs_information'
    - Logs public ProcessTimeline entry
    - Dispatches resident Notification
    - Appends AuditLog
    """
    _assert_role(current_user, *GOV_ROLES)
    return gov_crud.request_citizen_information(
        db, report_id, payload,
        actor_id=current_user.id,
        actor_role=current_user.role
    )
```

### 5.4 Today Operations Hub Endpoint
```python
@router.get("/operations/today", response_model=gov_schemas.GovOperationsTodayResponse)
def get_today_operations(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Centralized leadership dashboard:
    - 5 Core Metrics (unassigned, overdue, awaiting_verification, open_high_priority, resolved_period)
    - Actionable Needs Attention Triage Feed
    - Dual-Sector Summary (North & South Caloocan)
    - Team Capacity and Blocker Breakdown
    """
    _assert_role(current_user, *GOV_ROLES)
    return gov_crud.get_operations_today_hub(db)
```

---

## 6. Comprehensive Testing Plan (`test_gov_endpoints_m1.py`)

A dedicated pytest test suite will validate the newly introduced government endpoints against an isolated in-memory SQLite database:

| Test Name | Target Route | Core Assertions & Validations |
|---|---|---|
| `test_list_assets_filtering` | `GET /api/gov/assets` | Verify filtering by `category="Roads"`, `barangay=171`, `condition_score="critical"`, and keyword search. |
| `test_asset_stats_breakdown` | `GET /api/gov/assets/stats` | Verify 5 categories (Roads, Drainage, Bridges, Public Buildings, Facilities), condition tiers sum to total, and correct active work orders. |
| `test_asset_detail_complete_docket` | `GET /api/gov/assets/{id}` | Returns 404 for nonexistent; returns maintenance history, linked work orders, calculated AHS, and environmental context. |
| `test_create_asset_duplicate_prevention` | `POST /api/gov/assets` | Creates asset successfully; second call with same `asset_id` returns HTTP 409 Conflict. |
| `test_block_and_unblock_work_order` | `POST /work-orders/{id}/block`<br>`POST /work-orders/{id}/unblock` | Transitions status to `blocked`, stores reason code and delay days; unblock resolves blocker and transitions back to `in_progress`. |
| `test_verify_separation_of_duties_violation` | `POST /work-orders/{id}/verify` | When `current_user.id == work_order.assigned_to_id`, assert server raises **HTTP 403 Forbidden** with descriptive detail. |
| `test_verify_work_order_passed` | `POST /work-orders/{id}/verify` | With independent inspector, `passed=True` sets status to `completed`, records `WorkOrderInspection`, and syncs linked report to `resolved`. |
| `test_verify_work_order_rework_required` | `POST /work-orders/{id}/verify` | With independent inspector, `passed=False` sets status to `rework_required` and keeps report in `in_progress`. |
| `test_request_citizen_info_flow` | `POST /reports/{id}/request-info` | Sets report status to `needs_information`, appends public `ProcessTimeline`, creates resident `Notification`, and logs `AuditLog`. |
| `test_operations_today_metrics` | `GET /api/gov/operations/today` | Seeds reports and work orders in various states; asserts exact numerical match for all 5 leadership metrics, triage queue, dual sectors, and team capacity. |

---

## 7. Migration & Compatibility Analysis

1. **Schema Migration Compatibility**:
   - `Base.metadata.create_all` and `gov_models.Base.metadata.create_all` in `main.py` automatically create the new tables (`work_order_blockers`, `work_order_inspections`) and columns (`condition_score`, `status` on `infrastructure_assets`).
   - SQLite in-memory test suite creates all tables without requiring external migration files.
2. **Backward Compatibility**:
   - Existing work order endpoints (`GET /api/gov/work-orders`, `POST /api/gov/work-orders`) remain fully functional.
   - `WorkOrderResponse` is backward compatible.
   - Existing report endpoints (`GET /api/reports/{id}`, `GET /api/reports`) remain unmodified.
3. **Frontend Integration Ready**:
   - `GovTodayPage.jsx` can bind directly to `/api/gov/operations/today`.
   - `CitizenReportsPage.jsx` "Request Info" modal binds to `/api/gov/reports/{id}/request-info`.
   - `GovWorkOrdersPage.jsx` blocker actions bind to `/api/gov/work-orders/{id}/block`.
   - `GovInspectionModal.jsx` binds to `/api/gov/work-orders/{id}/verify`.
   - `GovAssetsPage.jsx` and `GovAssetDetailPage.jsx` bind to `/api/gov/assets`, `/stats`, and `/{id}`.
