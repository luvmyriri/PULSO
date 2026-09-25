"""
gov_schemas.py — Pydantic Schemas for Government-Side Modules
City Engineering Office, Caloocan City — PULSO System
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


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

class WorkOrderResponse(BaseModel):
    id: int
    wo_number: str
    report_id: Optional[int] = None
    project_id: Optional[int] = None
    assigned_by_id: int
    assigned_to_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    wo_type: str
    status: str
    priority: str
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
    id: int
    proj_number: str
    title: str
    description: str
    requesting_party: Optional[str] = None
    barangay: Optional[str] = None
    location_string: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    status: str
    current_phase: Optional[int] = 1
    estimated_cost: float = 0.0
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


class CertificateOfCompletionIssue(BaseModel):
    """Body for Assistant City Engineer to issue a Certificate of Completion."""
    notes: Optional[str] = None


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
    status: Optional[str] = None
    assigned_inspector_id: Optional[int] = None
    inspection_date: Optional[datetime] = None
    findings: Optional[str] = None
    is_compliant: Optional[bool] = None
    violation_details: Optional[str] = None
    payment_verified: Optional[bool] = None

class OBOTechnicalReviewUpdate(BaseModel):
    department: str # arch, civil, elec, sani, mech
    status: str     # approved, rejected

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
    pass

class SystemRoleResponse(SystemRoleBase):
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
