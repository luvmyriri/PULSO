import json
from pydantic import BaseModel, field_validator
from typing import Optional, List, Any, Dict
from datetime import datetime

# ─────────────────────────────────────────────────────────────────────────────
# Citizen / Resident Schemas
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# Citizen / Resident Schemas
# ─────────────────────────────────────────────────────────────────────────────

class ResidentBase(BaseModel):
    full_name: str
    email: str
    phone_number: Optional[str] = None
    address: Optional[str] = None
    barangay_id: Optional[int] = None
    district_id: Optional[int] = None

class ResidentCreate(ResidentBase):
    password: str

class ResidentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    barangay_id: Optional[int] = None
    district_id: Optional[int] = None

class ResidentResponse(ResidentBase):
    id: int
    trust_score: int
    is_verified: bool
    kyc_level: str
    created_at: datetime
    role: str = "resident"

    class Config:
        from_attributes = True

# ─────────────────────────────────────────────────────────────────────────────
# Government Official Schemas
# ─────────────────────────────────────────────────────────────────────────────

class OfficialBase(BaseModel):
    full_name: str
    email: str
    display_name: Optional[str] = None
    role_id: Optional[int] = None
    account_type: Optional[str] = "staff"
    primary_jurisdiction: Optional[List[str]] = None
    barangay: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None

class OfficialCreate(OfficialBase):
    password: str

class OfficialUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    display_name: Optional[str] = None
    role_id: Optional[int] = None
    account_type: Optional[str] = None
    primary_jurisdiction: Optional[List[str]] = None
    barangay: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    is_suspended: Optional[bool] = None
    suspension_reason: Optional[str] = None

class OfficialResponse(OfficialBase):
    id: int
    is_active: bool
    is_suspended: bool
    created_at: datetime
    role: str
    capabilities: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# ─────────────────────────────────────────────────────────────────────────────
# Shared / Polymorphic Schemas
# ─────────────────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    """
    Polymorphic response for /api/me and shared user lookup.
    Exposes fields common to both tables.
    """
    id: int
    full_name: str
    email: str
    role: str
    phone_number: Optional[str] = None
    is_active: bool = True
    is_verified: bool = True # Officials are True by property
    is_suspended: bool = False
    trust_score: int = 100
    created_at: datetime
    display_name: Optional[str] = None # Mainly for officials
    kyc_level: Optional[str] = None # Mainly for residents
    capabilities: Optional[Dict[str, Any]] = None

    # Location fields (Normalized vs Legacy)
    barangay: Optional[str] = None
    address: Optional[str] = None
    barangay_id: Optional[int] = None
    district_id: Optional[int] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    """Legacy/Shared update schema - redirects to ResidentUpdate or OfficialUpdate in CRUD."""
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    barangay: Optional[str] = None
    barangay_id: Optional[int] = None
    district_id: Optional[int] = None


class ReportBase(BaseModel):
    category: str
    description: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_string: Optional[str] = None
    location_barangay: Optional[str] = None
    barangay_id: Optional[int] = None
    image_url: Optional[str] = None
    resolution_image_url: Optional[str] = None
    ai_metadata: Optional[Any] = None
    budget: Optional[float] = None
    deployment_date: Optional[datetime] = None

    @field_validator('ai_metadata', mode='before')
    @classmethod
    def parse_ai_metadata(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return v
        return v

class ReportCreate(ReportBase):
    pass

class ReportResolutionConfirm(BaseModel):
    rating: int # 1-5
    note: Optional[str] = None

class ReportResponse(ReportBase):
    id: int
    ticket_id: str
    resident_id: Optional[int] = None
    status: str
    ai_category: Optional[str] = None
    ai_urgency: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_reasoning: Optional[str] = None
    severity_score: Optional[float] = 0.0
    cluster_id: Optional[int] = None
    reporter_name: Optional[str] = None  # Convenience field for dispatcher/management views
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AdvisoryBase(BaseModel):
    department: str
    title: str
    description: str
    priority: str
    category: str
    has_image: Optional[bool] = False
    image_url: Optional[str] = None
    stats_views: Optional[int] = 0
    stats_affected: Optional[str] = None

class AdvisoryCreate(AdvisoryBase):
    pass

class AdvisoryResponse(AdvisoryBase):
    id: int
    advisory_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationBase(BaseModel):
    title: str
    message: str

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: int
    resident_id: Optional[int] = None
    official_id: Optional[int] = None
    user_id: Optional[int] = None
    is_read: bool
    is_hidden: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

class ReportStats(BaseModel):
    total: int
    pending: int
    pending_approval: int
    approved_internal: int
    dispatched: int
    resolved: int
    rejected: int

# ---------------------------------------------------------------------------
# Government Workflow Schemas (FR-10, FR-11, FR-14)
# ---------------------------------------------------------------------------

class WorkOrderBase(BaseModel):
    title: str
    description: Optional[str] = None
    wo_type: Optional[str] = "standard"
    status: Optional[str] = "open"
    priority: Optional[str] = "normal"
    assigned_to_id: Optional[int] = None
    report_id: Optional[int] = None
    project_id: Optional[int] = None

class WorkOrderCreate(WorkOrderBase):
    pass

class WorkOrderUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to_id: Optional[int] = None

class WorkOrderResponse(WorkOrderBase):
    id: int
    wo_number: str
    assigned_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    trigger_type: str
    actor_id: Optional[int] = None
    action: str
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ProcessTimelineResponse(BaseModel):
    id: int
    report_id: Optional[int] = None
    work_order_id: Optional[int] = None
    project_id: Optional[int] = None
    status: str
    previous_status: Optional[str] = None
    actor_id: Optional[int] = None
    note: Optional[str] = None
    is_public: bool
    created_at: datetime

    class Config:
        from_attributes = True
class KYCStatusResponse(BaseModel):
    is_verified: bool
    kyc_level: str
    trust_score: int
    last_verification: Optional[datetime] = None
    registration_date: datetime

    class Config:
        from_attributes = True
