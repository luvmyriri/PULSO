import json
from pydantic import BaseModel, Field, field_validator
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
    id_tier: Optional[str] = None
    id_type: Optional[str] = None
    secondary_id_type: Optional[str] = None
    verification_mode: Optional[str] = None

class ResidentCreate(ResidentBase):
    password: str
    barangay: Optional[str] = Field(None, max_length=200)

class ResidentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    barangay_id: Optional[int] = None
    district_id: Optional[int] = None
    id_tier: Optional[str] = None
    id_type: Optional[str] = None
    secondary_id_type: Optional[str] = None
    verification_mode: Optional[str] = None

class ResidentResponse(ResidentBase):
    id: int
    trust_score: int
    is_verified: bool
    kyc_level: str
    avatar_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    role: str = "resident"
    confirmation_channels: List[str] = Field(default_factory=list)

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
    is_active: bool = True
    is_suspended: bool = False
    created_at: datetime
    role: str
    capabilities: Optional[Dict[str, Any]] = None

    @field_validator('is_active', mode='before')
    @classmethod
    def set_is_active(cls, v):
        return True if v is None else bool(v)

    @field_validator('is_suspended', mode='before')
    @classmethod
    def set_is_suspended(cls, v):
        return False if v is None else bool(v)

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

    @field_validator('is_active', mode='before')
    @classmethod
    def set_is_active(cls, v):
        return True if v is None else bool(v)

    @field_validator('is_suspended', mode='before')
    @classmethod
    def set_is_suspended(cls, v):
        return False if v is None else bool(v)

    @field_validator('is_verified', mode='before')
    @classmethod
    def set_is_verified(cls, v):
        return True if v is None else bool(v)

    @field_validator('trust_score', mode='before')
    @classmethod
    def set_trust_score(cls, v):
        return 100 if v is None else int(v)

    # Location fields (Normalized vs Legacy)
    barangay: Optional[str] = None
    address: Optional[str] = None
    barangay_id: Optional[int] = None
    district_id: Optional[int] = None
    avatar_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    updated_at: Optional[datetime] = None

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
    avatar_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


# ─────────────────────────────────────────────────────────────────────────────
# Report Schemas (Dual Guest & Registered Support)
# ─────────────────────────────────────────────────────────────────────────────

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
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    submission_source: Optional[str] = "web"

    @field_validator('ai_metadata', mode='before')
    @classmethod
    def parse_ai_metadata(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return v
        return v


class ReportCreate(ReportBase):
    reporter_type: Optional[str] = "registered"
    guest_reporter_name: Optional[str] = Field(None, max_length=160)
    submitted_urgency: Optional[str] = None


class ReportResolutionConfirm(BaseModel):
    rating: int = Field(ge=1, le=5)
    note: Optional[str] = Field(default=None, max_length=2000)


class ReportResponse(ReportBase):
    id: int
    version: int = 1
    ticket_id: str
    resident_id: Optional[int] = None
    reporter_type: str = "registered"
    status: str
    ai_category: Optional[str] = None
    ai_urgency: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_reasoning: Optional[str] = None
    severity_score: Optional[float] = 0.0
    cluster_id: Optional[int] = None
    reporter_name: Optional[str] = None  # Convenience field for dispatcher/management views
    submitted_urgency: Optional[str] = None
    contact_verified: bool = False
    claimed_at: Optional[datetime] = None
    claimed_by_user_id: Optional[int] = None
    is_claimed: Optional[bool] = False
    barangay: Optional[str] = None
    urgency: Optional[str] = None
    district: Optional[str] = None
    
    # Secure token fields (populated only upon initial guest creation response; None otherwise)
    tracking_token: Optional[str] = None
    tracking_url: Optional[str] = None

    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PublicReportResponse(BaseModel):
    """Verified incident fields only; never include reporter identity or contact data."""
    id: int
    ticket_id: str
    category: str
    title: str
    status: str
    location_lat: float
    location_lng: float
    location_string: str
    barangay: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    accuracy_m: Optional[float] = None
    public_details_approved: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None


# ─────────────────────────────────────────────────────────────────────────────
# Public Tracking & Contextual Claim Schemas
# ─────────────────────────────────────────────────────────────────────────────

class PublicTimelineItem(BaseModel):
    stage: Optional[str] = None
    status: str
    label: Optional[str] = None
    note: Optional[str] = None
    timestamp: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportTrackRequest(BaseModel):
    ticket_id: Optional[str] = None
    report_id: Optional[str] = None
    tracking_token: Optional[str] = None
    tracking_code: Optional[str] = None
    contact: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None

    @field_validator('ticket_id', mode='before')
    @classmethod
    def normalize_ticket_id(cls, v: Optional[str]) -> Optional[str]:
        if v and isinstance(v, str) and v.strip():
            return v.strip().upper()
        return v

    def get_token(self) -> Optional[str]:
        token = self.tracking_token or self.tracking_code
        if token and token.strip():
            return token.strip().upper()
        return None


class ReportTrackResponse(BaseModel):
    ticket_id: str
    category: str
    description: Optional[str] = None
    status: str
    public_status_label: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    location_barangay: Optional[str] = None
    district_code: Optional[str] = None
    location_summary: Optional[str] = None
    location_string: Optional[str] = None
    image_url: Optional[str] = None
    resolution_image_url: Optional[str] = None
    is_claimed: bool = False
    public_timeline: List[PublicTimelineItem] = []
    timeline: Optional[List[PublicTimelineItem]] = None

    class Config:
        from_attributes = True


class ReportInformationReply(BaseModel):
    ticket_id: str = Field(min_length=3, max_length=80)
    tracking_token: Optional[str] = None
    message: str = Field(min_length=10, max_length=2000)


class ReportClaimRequest(BaseModel):
    tracking_token: Optional[str] = None
    tracking_code: Optional[str] = None

    def get_token(self) -> str:
        token = self.tracking_token or self.tracking_code
        if not token or not token.strip():
            raise ValueError('Tracking token is required to claim a report.')
        return token.strip().upper()


class ReportClaimResponse(BaseModel):
    message: str = "Report successfully linked to your account."
    report: Optional[ReportResponse] = None
    success: bool = True


class UserReportsResponse(BaseModel):
    total: int
    filter: str = "all"
    reports: List[ReportResponse] = []
    skip: int = 0
    limit: int = 50

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
    target_url: Optional[str] = None
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

# ---------------------------------------------------------------------------
# News & City Announcements Schemas
# ---------------------------------------------------------------------------

class NewsItemBase(BaseModel):
    category: str
    headline: str
    excerpt: str
    image_url: Optional[str] = None
    barangay: Optional[str] = None
    source_url: Optional[str] = None
    priority: Optional[str] = "normal"

class NewsItemCreate(NewsItemBase):
    published_at: Optional[datetime] = None

class NewsItemUpdate(BaseModel):
    category: Optional[str] = None
    headline: Optional[str] = None
    excerpt: Optional[str] = None
    image_url: Optional[str] = None
    barangay: Optional[str] = None
    source_url: Optional[str] = None
    priority: Optional[str] = None
    published_at: Optional[datetime] = None

class NewsItemResponse(NewsItemBase):
    id: int
    published_at: datetime
    posted_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NewsListResponse(BaseModel):
    items: List[NewsItemResponse]
    total: int
    page: int
    limit: int
    total_pages: int
