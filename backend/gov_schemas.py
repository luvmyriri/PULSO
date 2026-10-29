"""
gov_schemas.py — Pydantic Schemas for Government-Side Modules
City Engineering Office, Caloocan City — PULSO System
"""

from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional, List, Dict, Any, Literal
from decimal import Decimal
from urllib.parse import urlparse
from datetime import datetime, date


# ─────────────────────────────────────────────────────────────────────────────
# User Management
# ─────────────────────────────────────────────────────────────────────────────

class UserRoleUpdate(BaseModel):
    role: str

# ─────────────────────────────────────────────────────────────────────────────
# Work Order  (FR-11)
# ─────────────────────────────────────────────────────────────────────────────

class WorkOrderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    report_id: Optional[int] = None          # Citizen report that triggered this
    project_id: Optional[int] = None         # LGU project this belongs to
    assigned_to_id: Optional[int] = None     # Field crew member
    wo_type: str = "standard"                # "standard" | "preemptive"
    priority: str = "normal"                 # low | normal | high | critical
    scheduled_date: Optional[datetime] = None
    category: Optional[str] = None
    estimated_cost: float = 0.0
    ai_plan_summary: Optional[str] = None
    notes: Optional[str] = None
    asset_id: Optional[str] = None

class WorkOrderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to_id: Optional[int] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    category: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    ai_plan_summary: Optional[str] = None
    notes: Optional[str] = None
    citizen_feedback: Optional[str] = None


class WorkOrderAssignment(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    assigned_to_id: int
    reason: str = Field(min_length=10, max_length=2000)


class WorkOrderReassignment(WorkOrderAssignment):
    expected_assignment_version: int = Field(ge=1)

class WorkOrderResponse(BaseModel):
    id: int
    wo_number: str
    report_id: Optional[int] = None
    project_id: Optional[int] = None
    assigned_by_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    assignment_version: int = 0
    title: str
    description: Optional[str] = None
    location_string: Optional[str] = None
    barangay: Optional[str] = None
    wo_type: str
    status: str
    priority: str
    is_emergency_assignment: bool = False
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    
    # Costing/Predictive
    category: Optional[str] = None
    estimated_cost: float = 0.0
    actual_cost: Optional[float] = None
    ai_plan_summary: Optional[str] = None

    notes: Optional[str] = None
    citizen_feedback: str
    
    # Child relationships
    updates: List["WorkOrderUpdateResponse"] = []

    # Convenience names resolved server-side
    assigned_by_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkOrderApprovalRequest(BaseModel):
    action: str  # "approve" or "reject"
    notes: Optional[str] = None


class WorkOrderApprovalResponse(BaseModel):
    id: int
    work_order_id: int
    approver_id: int
    approver_name: Optional[str] = None
    action: str  # "approved" or "rejected"
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WorkOrderUpdateCreate(BaseModel):
    comment: Optional[str] = None
    new_status: Optional[str] = None
    image_url: Optional[str] = None


class WorkOrderUpdateResponse(BaseModel):
    id: int
    work_order_id: int
    user_id: int
    user_name: Optional[str] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    comment: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Audit Log  (FR-10)
# ─────────────────────────────────────────────────────────────────────────────

class AuditLogCreate(BaseModel):
    trigger_type: str           # "maintenance" | "anomaly" | "status_change" | etc.
    action: str
    details: Optional[str] = None
    report_id: Optional[int] = None
    work_order_id: Optional[int] = None
    project_id: Optional[int] = None
    procurement_id: Optional[int] = None

class AuditLogResponse(BaseModel):
    id: int
    trigger_type: str
    action: str
    details: Optional[str] = None
    report_id: Optional[int] = None
    work_order_id: Optional[int] = None
    project_id: Optional[int] = None
    procurement_id: Optional[int] = None
    actor_id: Optional[int] = None
    actor_role: Optional[str] = None
    actor_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Process Timeline  (FR-14)
# ─────────────────────────────────────────────────────────────────────────────

class ProcessTimelineCreate(BaseModel):
    status: str
    previous_status: Optional[str] = None
    note: Optional[str] = None
    is_public: bool = True
    report_id: Optional[int] = None
    work_order_id: Optional[int] = None
    project_id: Optional[int] = None

class ProcessTimelineResponse(BaseModel):
    id: int
    report_id: Optional[int] = None
    work_order_id: Optional[int] = None
    project_id: Optional[int] = None
    status: str
    previous_status: Optional[str] = None
    actor_id: Optional[int] = None
    actor_role: Optional[str] = None
    actor_name: Optional[str] = None
    status_display: Optional[str] = None
    note: Optional[str] = None
    official_notes: Optional[str] = None
    is_public: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Bill of Quantities  (FR-12 sub-component)
# ─────────────────────────────────────────────────────────────────────────────

class BoQItemCreate(BaseModel):
    item_name: str
    unit: Optional[str] = None
    quantity: float
    unit_cost: float
    specifications: Optional[str] = None

class BoQItemResponse(BaseModel):
    id: int
    procurement_request_id: int
    item_name: str
    unit: Optional[str] = None
    quantity: float
    unit_cost: float
    total_cost: float
    specifications: Optional[str] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Procurement Request  (FR-12)
# ─────────────────────────────────────────────────────────────────────────────

class ProcurementRequestCreate(BaseModel):
    title: str
    purpose: str
    work_order_id: Optional[int] = None
    project_id: Optional[int] = None
    items: List[BoQItemCreate] = []

class ProcurementStatusUpdate(BaseModel):
    status: str                          # submitted | validated | sent_to_procurement | procured | rejected
    rejection_reason: Optional[str] = None

class ProcurementFundingUpdate(BaseModel):
    funding_certified: bool
    obr_number: Optional[str] = None

class ProcurementCashUpdate(BaseModel):
    cash_released: bool

class ProcurementBACUpdate(BaseModel):
    bac_meeting_date: datetime

class ProcurementNTPUpdate(BaseModel):
    ntp_issued: bool

class ProcurementRequestResponse(BaseModel):
    id: int
    pr_number: str
    work_order_id: Optional[int] = None
    project_id: Optional[int] = None
    raised_by_id: int
    validated_by_id: Optional[int] = None
    approved_by_id: Optional[int] = None
    title: str
    purpose: str
    status: str
    rejection_reason: Optional[str] = None
    funding_certified: bool
    obr_number: Optional[str] = None
    cash_released: bool = False
    bac_meeting_date: Optional[datetime] = None
    ntp_issued: bool
    validated_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    # Convenience names
    raised_by_name: Optional[str] = None
    validated_by_name: Optional[str] = None
    approved_by_name: Optional[str] = None
    items: List[BoQItemResponse] = []
    total_estimated_cost: Optional[float] = None   # Computed server-side
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Project Request — LGU Infrastructure Project (Phases 1–6)
# ─────────────────────────────────────────────────────────────────────────────

class ProjectRequestCreate(BaseModel):
    title: str
    description: str
    requesting_party: str
    barangay: Optional[str] = None
    barangay_id: Optional[int] = None
    district_id: Optional[int] = None
    location_string: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    estimated_cost: float = 0.0
    is_emergency: bool = False
    procurement_modality: Optional[str] = "competitive_bidding"
    category: Optional[str] = "new_construction"

class ProjectRequestUpdate(BaseModel):
    expected_version: Optional[int] = Field(None,ge=0)
    reason: Optional[str] = Field(None,min_length=10,max_length=2000)
    document_id: Optional[int] = None
    next_review_at: Optional[datetime] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    current_phase: Optional[int] = None
    survey_engineer_id: Optional[int] = None
    design_lead_id: Optional[int] = None
    project_engineer_id: Optional[int] = None
    plan_attachments: Optional[str] = None
    cad_attachments: Optional[str] = None
    location_string: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    estimated_cost: Optional[float] = None
    is_emergency: Optional[bool] = None
    procurement_modality: Optional[str] = None
    category: Optional[str] = None

class ProjectRequestResponse(BaseModel):
    coordination_version: int = 0
    coordination_started_at: Optional[datetime] = None
    legacy_status: Optional[str] = None
    next_review_at: Optional[datetime] = None
    certificate_reference: Optional[str] = None
    certificate_document_id: Optional[int] = None
    id: int
    proj_number: str
    title: str
    description: str
    requesting_party: Optional[str] = None
    barangay: Optional[str] = None
    district_id: Optional[int] = None
    location_string: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    status: str
    current_phase: Optional[int] = 1
    estimated_cost: Optional[float] = None
    is_emergency: bool = False
    procurement_modality: str
    category: str
    created_by_id: Optional[int] = None
    survey_engineer_id: Optional[int] = None
    design_lead_id: Optional[int] = None
    project_engineer_id: Optional[int] = None
    survey_completed_at: Optional[datetime] = None
    design_completed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    construction_started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    certificate_issued: bool
    plan_attachments: Optional[str] = None
    cad_attachments: Optional[str] = None
    # Convenience names
    created_by_name: Optional[str] = None
    survey_engineer_name: Optional[str] = None
    design_lead_name: Optional[str] = None
    project_engineer_name: Optional[str] = None
    # FQA / Quality Tracking
    qa_rejection_count: int = 0
    fqa_savings: float = 0.0
    asset_id: Optional[str] = None
    fqa_results: Optional[dict] = None # Added for real-time audit feedback
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProjectStatusUpdate(BaseModel):
    """Payload to advance project phase or status (e.g. issuing FQA certificate)."""
    notes: Optional[str] = None
    expected_version: Optional[int] = Field(None,ge=0)
    reference: Optional[str] = None
    office: Optional[str] = None
    document_id: Optional[int] = None


class CertificateOfCompletionIssue(BaseModel):
    """Body for Assistant City Engineer to issue a Certificate of Completion."""
    notes: Optional[str] = None
    expected_version: Optional[int] = Field(None,ge=0)
    reference: Optional[str] = None
    office: Optional[str] = None
    document_id: Optional[int] = None


# ─────────────────────────────────────────────────────────────────────────────
# OBO Inspection (Section 6.4)
# ─────────────────────────────────────────────────────────────────────────────

class OBOInspectionCreate(BaseModel):
    applicant_name: str
    applicant_contact: Optional[str] = None
    property_address: str
    barangay: Optional[str] = None
    barangay_id: Optional[int] = None
    district_id: Optional[int] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    inspection_type: str = "building"        # building | electrical | mechanical
    source_report_id: Optional[int] = None

class OBOInspectionUpdate(BaseModel):
    status: Optional[Literal['application_received', 'technical_review', 'inspection_scheduled', 'inspection_complete', 'notice_issued', 're_inspection_scheduled', 'permit_issued', 'cleared']] = None
    assigned_inspector_id: Optional[int] = None
    inspection_date: Optional[datetime] = None
    findings: Optional[str] = None
    is_compliant: Optional[bool] = None
    violation_details: Optional[str] = None
    payment_verified: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=4000)
    decision_reference: Optional[str] = Field(None, max_length=500)

class OBOTechnicalReviewUpdate(BaseModel):
    department: Literal['arch', 'civil', 'elec', 'sani', 'mech']
    status: Literal['approved', 'rejected']
    remarks: str = Field(min_length=10, max_length=4000)

class OBOAppealUpdate(BaseModel):
    appeal_evidence_url: str

class OBOOrderOfPayment(BaseModel):
    fee: float

class OBOInspectionResponse(BaseModel):
    id: int
    obo_number: str
    applicant_name: str
    applicant_contact: Optional[str] = None
    property_address: str
    barangay: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    inspection_type: str
    status: str
    assigned_inspector_id: Optional[int] = None
    assigned_inspector_name: Optional[str] = None
    filed_by_id: Optional[int] = None
    cleared_by_id: Optional[int] = None
    inspection_date: Optional[datetime] = None
    findings: Optional[str] = None
    is_compliant: Optional[bool] = None
    violation_details: Optional[str] = None
    source_report_id: Optional[int] = None
    
    arch_review: str
    civil_review: str
    elec_review: str
    sani_review: str
    mech_review: str
    
    order_of_payment_fee: Optional[float] = None
    payment_verified: bool
    appeal_status: str
    appeal_evidence_url: Optional[str] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard Summary Schemas
# ─────────────────────────────────────────────────────────────────────────────

class ClassificationStat(BaseModel):
    label: str
    total: int
    resolved: int
    resolution_rate: float
    icon: str
    color: str

class VelocityPoint(BaseModel):
    date: str
    label: str
    count: int

class PredictiveAlert(BaseModel):
    title: str
    location: str
    risk_score: int
    risk_label: str
    description: str
    category: str

class GovDashboardStats(BaseModel):
    """Aggregated KPIs for the LGU Command Center dashboard."""
    # Citizen Reports (PULSO Core)
    total_reports: int
    resolved: int
    pending_approval: int
    dispatched: int
    total_trend: Optional[str] = None
    resolved_trend: Optional[str] = None
    
    # Advanced Intelligence
    classifications: List[ClassificationStat] = []
    velocity_series: List[VelocityPoint] = []
    velocity_label: Optional[str] = None
    predictive_alerts: List[PredictiveAlert] = []
    staff_stats: dict = {}
    total_users: int = 0
    total_officials: int = 0
    total_residents: int = 0

    # Departmental KPIs
    total_work_orders: int
    open_work_orders: int
    in_progress_work_orders: int
    completed_work_orders: int
    preemptive_work_orders: int

    total_projects: int
    active_projects: int
    completed_projects: int

    total_procurement_requests: int
    pending_procurement: int          # draft + submitted
    sent_to_procurement: int

    total_obo_inspections: int
    pending_obo: int
    non_compliant_obo: int

    total_audit_entries: int


class ApproveWithBudgetRequest(BaseModel):
    project_title: str
    description: Optional[str] = None
    estimated_cost: float
    procurement_modality: str = "competitive_bidding"
    is_emergency: bool = False
    items: List[BoQItemCreate] = []


class FQAResultResponse(BaseModel):
    status: str
    issues: List[str]
    dlp_expiry: Optional[datetime] = None
    fqa_savings: float = 0.0


# ─────────────────────────────────────────────────────────────────────────────
# System Document Registry  (DMS)
# ─────────────────────────────────────────────────────────────────────────────

class SystemDocumentResponse(BaseModel):
    id: int
    document_type: str
    file_name: str
    file_size_bytes: int
    sha256_hash: str
    category: str
    confidentiality: str
    retention_policy: str
    expiry_date: Optional[datetime] = None
    legal_hold: bool
    target_model: str
    target_id: int
    uploader_id: int
    uploader_name: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

class SystemDocumentRegistryResponse(BaseModel):
    documents: List[SystemDocumentResponse]
    total: int
    limit: int
    offset: int

class LegalHoldUpdate(BaseModel):
    legal_hold: bool

# ─────────────────────────────────────────────────────────────────────────────
# Dynamic RBAC Schemas
# ─────────────────────────────────────────────────────────────────────────────
from typing import Dict

class SystemRoleBase(BaseModel):
    name: str  # slug
    label: str
    capabilities: Dict[str, List[str]]
    access_level: str = "staff"

class SystemRoleCreate(SystemRoleBase):
    name: str = Field(pattern=r'^[a-z][a-z0-9_]{1,63}$')
    reason: str = Field(min_length=10,max_length=2000)
    expected_capabilities: Optional[Dict[str,Any]] = None

class SystemRoleResponse(SystemRoleBase):
    # Historical roles mix action grants with typed metadata. Preserve these
    # values on reads; do not convert boolean metadata into wildcard authority.
    capabilities: Dict[str,Any]
    label: Optional[str] = None
    id: int
    created_at: datetime
    is_template: bool

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Tactical Advisories (Management)
# ─────────────────────────────────────────────────────────────────────────────

class AdvisoryCreate(BaseModel):
    title: str
    description: str
    category: str = "Infrastructure"  # Infrastructure, Security, Emergency, Utility
    priority: str = "medium"           # low, medium, high, critical
    department: str = "City Engineering Office"
    has_image: bool = False
    image_url: Optional[str] = None
    stats_affected: Optional[str] = None

class AdvisoryResponse(BaseModel):
    id: int
    advisory_id: str
    title: str
    description: str
    category: str
    priority: str
    department: str
    has_image: bool
    image_url: Optional[str] = None
    stats_views: int
    stats_affected: Optional[str] = None
    author_id: Optional[int] = None
    author_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Physical Infrastructure Asset Schemas
# ─────────────────────────────────────────────────────────────────────────────

class AssetBase(BaseModel):
    asset_name: str
    category: str  # Roads, Drainage, Bridges, Public Buildings, Facilities
    gps_coordinates: Optional[Dict[str, Any]] = None
    material_type: Optional[str] = None
    date_completed: Optional[date] = None
    design_life: Optional[int] = Field(None, ge=1, le=500)
    original_contractor: Optional[str] = None
    barangay: Optional[str] = None
    barangay_id: Optional[int] = None
    condition_score: Optional[float] = Field(None, ge=0, le=100)
    status: Optional[str] = "operational"


class AssetCreate(AssetBase):
    asset_id: Optional[str] = None


class AssetConditionAssessment(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    condition_score: float = Field(ge=0, le=100)
    expected_condition_score: Optional[float] = Field(..., ge=0, le=100)
    notes: str = Field(min_length=10, max_length=2000)


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
    registry_status: str = "candidate"
    maintenance_authority: Optional[str] = None
    source_reference: Optional[str] = None
    verified_at: Optional[datetime] = None
    barangay_name: Optional[str] = None
    district_code: Optional[str] = None
    condition_tier: str  # "good", "fair", "poor", "critical"
    active_work_orders_count: int = 0
    last_maintenance_date: Optional[date] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssetDetailResponse(AssetResponse):
    condition_assessments: List[Dict[str, Any]] = Field(default_factory=list)
    deterioration_velocity: float = 0.0
    flood_risk_level: Optional[str] = "Low"
    soil_subsidence: Optional[float] = 0.0
    maintenance_history: List[AssetMaintenanceLogResponse] = []
    active_work_orders: List[Dict[str, Any]] = []
    linked_projects: List[Dict[str, Any]] = []


class CategoryConditionBreakdown(BaseModel):
    unknown: int = 0
    good: int = 0
    fair: int = 0
    poor: int = 0
    critical: int = 0


class CategoryStats(BaseModel):
    category_name: str
    total_count: int
    avg_condition_score: Optional[float] = None
    condition_breakdown: CategoryConditionBreakdown
    active_work_orders: int


class AssetStatsResponse(BaseModel):
    total_assets: int
    overall_avg_condition: Optional[float] = None
    total_critical_assets: int
    total_active_work_orders: int
    categories: Dict[str, CategoryStats]


# ─────────────────────────────────────────────────────────────────────────────
# Work Order Blockers & Inspections Schemas
# ─────────────────────────────────────────────────────────────────────────────

class WorkOrderBlockRequest(BaseModel):
    reason_code: str  # weather, utility, permit, materials, security, access, other
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


# ─────────────────────────────────────────────────────────────────────────────
# Citizen Report Request Information
# ─────────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────────
# Today Operations Hub
# ─────────────────────────────────────────────────────────────────────────────

class OperationsLeadershipMetrics(BaseModel):
    unassigned_concerns: int
    overdue_actions: int
    awaiting_verification: int
    open_high_priority: int
    resolved_in_period: int


class InitialReviewTarget(BaseModel):
    due_at: datetime
    hours: int
    overdue: bool
    measured_from: Literal['submission']


class OperationsTriageItem(BaseModel):
    review_target: Optional[InitialReviewTarget] = None
    id: int
    entity_type: str  # "report" | "work_order" | "announcement" | "asset_review"
    ticket_id: str
    title: str
    category: str
    priority: str
    status: str
    barangay: Optional[str] = None
    time_in_state: str
    action_url: str
    recommended_action: str
    task_bucket: Optional[str] = "needs_my_review"  # "assigned_to_me" | "needs_my_review" | "waiting_on_others" | "recently_completed"
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    why_in_inbox: Optional[str] = None
    work_bundle: Optional[str] = None
    updated_at: Optional[datetime] = None


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
    routing_enabled: Optional[bool] = None
    can_route_reports: bool = False
    timestamp: datetime
    metrics: Optional[OperationsLeadershipMetrics] = None
    needs_attention: List[OperationsTriageItem]
    sector_summary: Optional[SectorSummary] = None
    team_capacity: List[TeamCapacityItem] = []
    user_role: Optional[str] = None
    user_display_name: Optional[str] = None
    work_bundles: List[Dict[str, Any]] = []
    inbox_counts: Dict[str, int] = {}


# ─────────────────────────────────────────────────────────────────────────────
# Governed Announcements, Report Associations & Budget Disclosures
# ─────────────────────────────────────────────────────────────────────────────

class AnnouncementReportAssociationCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    report_id: int
    expected_version: Optional[int] = None
    association_type: Literal['candidate', 'contextual_relevance', 'confirmed_coverage', 'rejected', 'revoked'] = Field(
        "candidate",
        description="candidate | contextual_relevance | confirmed_coverage | rejected | revoked"
    )
    basis_reason: Optional[str] = None

    @model_validator(mode='after')
    def reviewed_reason(self):
        if self.association_type != 'candidate' and len((self.basis_reason or '').strip()) < 10:
            raise ValueError('Record a review reason of at least 10 characters for this report relationship.')
        return self


class AnnouncementReportAssociationUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_version: int
    association_type: str = Field(
        ...,
        description="candidate | contextual_relevance | confirmed_coverage | rejected | revoked"
    )
    basis_reason: Optional[str] = None
    revoked_reason: Optional[str] = None


class AnnouncementReportAssociationResponse(BaseModel):
    id: int
    announcement_id: int
    report_id: int
    ticket_id: Optional[str] = None
    report_title: Optional[str] = None
    report_category: Optional[str] = None
    report_barangay: Optional[str] = None
    report_status: Optional[str] = None
    association_type: str
    basis_reason: Optional[str] = None
    created_by_id: Optional[int] = None
    reviewed_by_id: Optional[int] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    revoked_by_id: Optional[int] = None
    revoked_by_name: Optional[str] = None
    revoked_at: Optional[datetime] = None
    revoked_reason: Optional[str] = None
    notified_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BudgetDisclosureInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_version: Optional[int] = None
    publication_format: Optional[str] = Field("announcement", description="announcement | advisory | news")
    amount: Optional[Decimal] = Field(None, ge=0, max_digits=18, decimal_places=2, allow_inf_nan=False, description="Null when no budget amount is disclosed")
    currency: str = Field("PHP", description="ISO currency code")
    amount_type: Literal['approved_budget_for_contract', 'contract_award_amount', 'allocated_project_budget', 'maintenance_allocation', 'not_disclosed'] = Field(
        "not_disclosed",
        description="approved_budget_for_contract | contract_award_amount | allocated_project_budget | maintenance_allocation | not_disclosed"
    )
    source_label: Optional[str] = None
    source_url: Optional[str] = None
    official_bidding_url: Optional[str] = "https://caloocancity.gov.ph/invitation-to-bid/"
    source_date: Optional[date] = None
    fiscal_period: Optional[str] = None
    issuing_office: Optional[str] = "City Engineering Department"
    scope_caveat: Optional[str] = None
    review_state: Literal['draft'] = 'draft'
    project_id: Optional[int] = None
    work_order_id: Optional[int] = None

    @model_validator(mode='after')
    def source_required(self):
        if self.amount is not None:
            if self.amount_type == 'not_disclosed' or not (self.source_label or '').strip() or not self.source_url or not self.source_date:
                raise ValueError('A numeric disclosure needs an amount type, source label, original document URL, and source date.')
        elif self.amount_type != 'not_disclosed':
            raise ValueError('Use not_disclosed when no amount is supplied.')
        for url in (self.source_url, self.official_bidding_url):
            if url and (urlparse(url).scheme not in ('https', 'http') or not urlparse(url).hostname):
                raise ValueError('Source links must be complete HTTP or HTTPS URLs.')
        if self.official_bidding_url and urlparse(self.official_bidding_url).hostname not in {'caloocancity.gov.ph', 'www.caloocancity.gov.ph'}:
            raise ValueError('The official bidding link must point to the Caloocan City website.')
        return self


class BudgetDisclosureResponse(BaseModel):
    id: int
    disclosure_id: str
    announcement_id: Optional[int] = None
    project_id: Optional[int] = None
    work_order_id: Optional[int] = None
    version: int = 1
    publication_format: str = "announcement"
    amount: Optional[Decimal] = None
    currency: str = "PHP"
    amount_type: str = "not_disclosed"
    source_label: Optional[str] = None
    source_url: Optional[str] = None
    official_bidding_url: Optional[str] = None
    source_date: Optional[date] = None
    fiscal_period: Optional[str] = None
    issuing_office: Optional[str] = None
    scope_caveat: Optional[str] = None
    review_state: str = "draft"
    entered_by_id: Optional[int] = None
    entered_by_name: Optional[str] = None
    reviewed_by_id: Optional[int] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PublicationDetails(BaseModel):
    model_config = ConfigDict(extra='forbid')
    summary_en: str = Field('', max_length=600)
    summary_fil: str = Field('', max_length=600)
    issuing_office: str = Field('', max_length=200)
    effective_from: Optional[datetime] = None
    effective_until: Optional[datetime] = None
    action_en: str = Field('', max_length=2000)
    action_fil: str = Field('', max_length=2000)


class AnnouncementBase(BaseModel):
    publication_details: PublicationDetails = Field(default_factory=PublicationDetails)
    model_config = ConfigDict(extra='forbid')
    title_en: str = Field(..., min_length=3, max_length=255, description="English announcement headline")
    title_fil: Optional[str] = Field(None, max_length=255, description="Filipino headline translation")
    content_en: str = Field(..., min_length=10, description="Full English announcement text")
    content_fil: Optional[str] = Field(None, description="Full Filipino announcement text")
    category: str = Field("general_notice", description="Category: planned_works, service_interruption, progress_update, work_completed, general_notice, advisory, news_release")
    publication_format: Optional[str] = Field("announcement", description="Format: announcement | advisory | news")
    priority: str = Field("normal", description="Priority: normal, urgent, emergency")
    target_audience: str = Field("public", description="Audience: public, district, barangay, staff")
    target_districts: Optional[List[str]] = Field(default_factory=list, description="Target districts")
    target_barangays: Optional[List[str]] = Field(default_factory=list, description="Target barangays")
    district_id: Optional[int] = Field(None, description="District lookup ID")
    barangay_id: Optional[int] = Field(None, description="Barangay lookup ID")
    channels: List[str] = Field(default=["web"], description="Target channels: web, sms, email")
    scheduled_at: Optional[datetime] = Field(None, description="Scheduled release timestamp")
    expires_at: Optional[datetime] = Field(None, description="Expiration timestamp")
    source_report_id: Optional[int] = Field(None, description="Originating citizen report ID")
    source_work_order_id: Optional[int] = Field(None, description="Originating work order ID")
    source_project_id: Optional[int] = Field(None, description="Originating project ID")
    source_asset_id: Optional[str] = Field(None, description="Originating asset ID")
    image_url: Optional[str] = Field(None, description="Cover visual URL")


class AnnouncementCreate(AnnouncementBase):
    budget_disclosure: Optional[BudgetDisclosureInput] = None
    report_associations_input: Optional[List[AnnouncementReportAssociationCreate]] = None


class AnnouncementUpdate(BaseModel):
    publication_details: Optional[PublicationDetails] = None
    model_config = ConfigDict(extra='forbid')
    expected_version: int
    title_en: Optional[str] = Field(None, min_length=3, max_length=255)
    title_fil: Optional[str] = Field(None, max_length=255)
    content_en: Optional[str] = Field(None, min_length=10)
    content_fil: Optional[str] = None
    category: Optional[str] = None
    publication_format: Optional[str] = None
    priority: Optional[str] = None
    target_audience: Optional[str] = None
    target_districts: Optional[List[str]] = None
    target_barangays: Optional[List[str]] = None
    district_id: Optional[int] = None
    barangay_id: Optional[int] = None
    channels: Optional[List[str]] = None
    scheduled_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    source_report_id: Optional[int] = None
    source_work_order_id: Optional[int] = None
    source_project_id: Optional[int] = None
    source_asset_id: Optional[str] = None
    image_url: Optional[str] = None
    budget_disclosure: Optional[BudgetDisclosureInput] = None
    report_associations_input: Optional[List[AnnouncementReportAssociationCreate]] = None


class AnnouncementStatusUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_version: int
    status: str = Field(..., description="Target status: draft, in_review, approved, scheduled, published, expired, withdrawn")
    scheduled_at: Optional[datetime] = Field(None, description="Mandatory when status transitions to 'scheduled'")
    withdrawal_reason: Optional[str] = Field(None, description="Mandatory when status transitions to 'withdrawn'")
    notes: Optional[str] = Field(None, description="Optional transition notes")


class AnnouncementCorrectionCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_version: int
    correction_summary: str = Field(..., min_length=5, description="Publicly visible summary of correction")
    reason: str = Field(..., min_length=5, description="Operational reason")
    updated_title_en: Optional[str] = None
    updated_title_fil: Optional[str] = None
    updated_content_en: Optional[str] = None
    updated_content_fil: Optional[str] = None


class AnnouncementCorrectionResponse(BaseModel):
    id: int
    announcement_id: int
    editor_id: int
    editor_name: Optional[str] = None
    correction_summary: str
    reason: str
    previous_content: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AnnouncementDeliveryResponse(BaseModel):
    id: int
    announcement_id: int
    channel: str
    status: str
    recipient_count: int
    delivered_count: int
    failed_count: int
    error_message: Optional[str] = None
    last_attempted_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnnouncementResponse(AnnouncementBase):
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    id: int
    announcement_id: str
    status: str
    content_version: int = 1
    approved_version: Optional[int] = None
    published_version: Optional[int] = None
    allowed_actions: List[str] = []
    author_id: int
    author_name: Optional[str] = None
    reviewer_id: Optional[int] = None
    reviewer_name: Optional[str] = None
    approved_by_id: Optional[int] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    withdrawal_reason: Optional[str] = None
    withdrawn_at: Optional[datetime] = None
    withdrawn_by_id: Optional[int] = None
    withdrawn_by_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    has_corrections: bool = False
    corrections_count: int = 0
    corrections: List[AnnouncementCorrectionResponse] = []
    deliveries: List[AnnouncementDeliveryResponse] = []
    budget_disclosure: Optional[BudgetDisclosureResponse] = None
    report_associations: List[AnnouncementReportAssociationResponse] = []
    confirmed_reports_count: int = 0
    contextual_reports_count: int = 0
    candidate_reports_count: int = 0

    class Config:
        from_attributes = True


class AnnouncementListResponse(BaseModel):
    items: List[AnnouncementResponse]
    total: int
    page: int
    limit: int
    pages: int


class AnnouncementDeliveryStatsResponse(BaseModel):
    announcement_id: int
    announcement_title: str
    deliveries: List[AnnouncementDeliveryResponse]
    summary: Dict[str, Any]

