"""
gov_schemas.py — Pydantic Schemas for Government-Side Modules
City Engineering Office, Caloocan City — PULSO System
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


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
    notes: Optional[str] = None

class WorkOrderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to_id: Optional[int] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    notes: Optional[str] = None

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
    notes: Optional[str] = None
    # Convenience names resolved server-side
    assigned_by_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

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
    note: Optional[str] = None
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
    location_string: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None

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

class ProjectRequestResponse(BaseModel):
    id: int
    proj_number: str
    title: str
    description: str
    requesting_party: str
    barangay: Optional[str] = None
    location_string: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    status: str
    current_phase: int
    created_by_id: int
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
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

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
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard Summary Schemas
# ─────────────────────────────────────────────────────────────────────────────

class GovDashboardStats(BaseModel):
    """Aggregated KPIs for the LGU Command Center dashboard."""
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
