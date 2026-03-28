from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    full_name: str
    email: str
    phone_number: Optional[str] = None
    role: Optional[str] = "resident"
    address: Optional[str] = None
    barangay: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    barangay: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    trust_score: int
    created_at: datetime

    class Config:
        from_attributes = True

class ReportBase(BaseModel):
    category: str
    description: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_string: Optional[str] = None
    image_url: Optional[str] = None

class ReportCreate(ReportBase):
    pass

class ReportResponse(ReportBase):
    id: int
    ticket_id: str
    user_id: int
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
    user_id: int
    is_read: bool
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
