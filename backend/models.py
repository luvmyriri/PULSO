from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON, UniqueConstraint, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from typing import Optional, List, Union
from database import Base
from datetime import datetime
import random
import uuid
import re
from geoalchemy2 import Geometry


# ─────────────────────────────────────────────────────────────────────────────
# Geographic Lookup Tables (3NF Normalisation & PostGIS Spatial Core)
# ─────────────────────────────────────────────────────────────────────────────

class CityBoundary(Base):
    """
    Authoritative boundary polygons for North and South Caloocan.
    Stored as two separate non-contiguous MultiPolygons.
    """
    __tablename__ = "city_boundaries"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(64), unique=True, nullable=False) # 'North Caloocan' | 'South Caloocan'
    sector     = Column(String(32), nullable=False)              # 'North' | 'South'
    geom       = Column(Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class District(Base):
    """
    Caloocan City legislative districts.
    D1 = South Caloocan, D2 = North Caloocan, D3 = Far North Caloocan.
    Provides FK anchor for district_id fields across the system.
    """
    __tablename__ = "districts"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(100), unique=True, nullable=False)  # "District 1 – South Caloocan"
    code       = Column(String(10),  unique=True, nullable=False)  # D1 | D2 | D3
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    barangays  = relationship("Barangay", back_populates="district")


class Barangay(Base):
    """
    Master list of Caloocan City barangays.
    Normalises every scattered `barangay VARCHAR` column in the system so all
    geographic references resolve to a single, authoritative row.
    """
    __tablename__ = "barangays"

    id           = Column(Integer,      primary_key=True, index=True)
    name         = Column(String(150),  unique=True, nullable=False)   # "Barangay 172" / "Camarin"
    district_id  = Column(Integer,      ForeignKey("districts.id"), nullable=False, index=True)
    sector       = Column(String(32),   nullable=True, index=True)    # 'North' | 'South'
    brgy_num     = Column(Integer,      nullable=True, index=True)
    display_name = Column(String(100),  nullable=True)
    geom         = Column(Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=True)
    zip_code     = Column(String(10),   nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    district    = relationship("District", back_populates="barangays")

def generate_ticket_id():
    current_year = datetime.now().year
    random_digits = f"{random.randint(1000, 9999)}"
    return f"PUL-{current_year}-{random_digits}"

def generate_advisory_id():
    import secrets
    from datetime import datetime
    date_prefix = datetime.now().strftime("%Y%m")
    return f"PUB-{date_prefix}-{secrets.token_hex(4).upper()}"

class Resident(Base):
    """
    Citizen-facing account table.
    Supports registration, verification, KYC, and trust scoring.
    """
    __tablename__ = "residents"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    normalized_email = Column(String, index=True, nullable=True)
    password_hash = Column(String)
    
    address = Column(String, nullable=True)
    barangay_id = Column(Integer, ForeignKey("barangays.id"), nullable=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True, index=True)
    phone_number = Column(String, nullable=True)
    normalized_phone_number = Column(String, index=True, nullable=True)
    
    # Citizen-specific features
    trust_score = Column(Integer, default=100)
    verification_code = Column(String, nullable=True)
    email_code_expires_at = Column(DateTime(timezone=True), nullable=True)
    email_code_sent_at = Column(DateTime(timezone=True), nullable=True)
    email_code_attempts = Column(Integer, nullable=False, default=0, server_default='0')
    administration_version = Column(Integer, nullable=False, default=0, server_default='0')
    notification_preferences_version = Column(Integer, nullable=False, default=0, server_default='0')
    access_version = Column(Integer, nullable=False, default=0, server_default='0')
    is_verified = Column(Boolean, default=False)
    kyc_level = Column(String, default="Bronze (Self-Signed)")  # Bronze, Silver, Gold
    id_tier = Column(String, nullable=True)  # "primary" or "secondary"
    id_type = Column(String, nullable=True)  # e.g. "philsys", "lto", "passport"
    secondary_id_type = Column(String, nullable=True)
    verification_mode = Column(String, nullable=True)  # "automated", "second_id", "manual_review"
    last_kyc_verification = Column(DateTime(timezone=True), nullable=True)
    google_id = Column(String, nullable=True, index=True)
    auth_provider = Column(String, nullable=True, default="local")
    
    is_active = Column(Boolean, default=True)
    status = Column(String, default="active", nullable=True)  # "active", "inactive", "pending", "suspended", "deactivated"
    status_reason = Column(String, nullable=True)
    status_changed_by = Column(String, nullable=True)
    status_changed_at = Column(DateTime(timezone=True), nullable=True)
    
    # ID Verification Columns
    id_verification_status = Column(String, default="N/A", nullable=True)  # "Verified", "Pending review", "Rejected", "N/A"
    id_rejection_reason = Column(String, nullable=True)
    id_verified_at = Column(DateTime(timezone=True), nullable=True)
    id_review_reference = Column(String(255), nullable=True)
    id_reviewed_at = Column(DateTime(timezone=True), nullable=True)
    id_reviewed_by_id = Column(Integer, ForeignKey('officials.id'), nullable=True)

    avatar_url = Column(String, nullable=True)
    preferences = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @property
    def role(self):
        return "resident"
        
    @property
    def is_suspended(self):
        return not self.is_active or self.status == "suspended"

    @property
    def barangay(self):
        """Returns the barangay name for schema compatibility."""
        if self.barangay_ref:
            return self.barangay_ref.name
        # Fallback for legacy records/incomplete registration where barangay is in address
        if self.address and "Barangay" in self.address:
            match = re.search(r"Barangay\s+(\d+)", self.address, re.IGNORECASE)
            if match:
                return f"Barangay {match.group(1)}"
        return None

    @property
    def display_name(self):
        """Returns full name as display name for schema compatibility."""
        return self.full_name

    @property
    def capabilities(self):
        # Default citizen capabilities
        return {
            "can_report": True,
            "can_view_public_analytics": True,
            "can_access_social_intelligence": True
        }

    # Relationships
    barangay_ref = relationship("Barangay", foreign_keys=[barangay_id])
    district_ref = relationship("District", foreign_keys=[district_id])
    reports = relationship("Report", foreign_keys="[Report.resident_id]", back_populates="reporter")
    claimed_reports = relationship("Report", foreign_keys="[Report.claimed_by_user_id]", back_populates="claimed_by")
    notifications = relationship("Notification", back_populates="resident")


class Official(Base):
    """
    Government personnel account table.
    Supports RBAC, area designation, and official jurisdiction.
    """
    __tablename__ = "officials"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    
    # RBAC & Identity
    role_id = Column(Integer, ForeignKey("system_roles.id"), nullable=True, index=True)
    display_name = Column(String, nullable=True)  # e.g. "Engineer II / District lead"
    account_type = Column(String, default="staff")
    
    # Jurisdiction
    primary_jurisdiction = Column(JSON, nullable=True) 
    
    # NEW: Plantilla Contact Info
    barangay = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True)
    is_suspended = Column(Boolean, default=False)
    suspension_reason = Column(String, nullable=True)
    suspended_at = Column(DateTime(timezone=True), nullable=True)
    suspended_by = Column(Integer, ForeignKey("officials.id"), nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    role = Column(String, default="staff", index=True)  # Denormalized for query performance & compatibility
    invitation_pending = Column(Boolean, nullable=False, default=False, server_default="false")
    access_version = Column(Integer, nullable=False, default=0, server_default="0")


    @property
    def is_verified(self):
        # Officials are inherently verified by being in the officials table
        return True

    @property
    def trust_score(self):
        # Standardize for UI compatibility
        return 100

    @property
    def role_details(self):
        """Alias for role_ref to keep RBAC resolution consistent across services."""
        return self.role_ref

    @property
    def capabilities(self):
        """Resolves capabilities from the linked role_ref or defaults."""
        if self.role_ref and self.role_ref.capabilities:
            caps = self.role_ref.capabilities
            return {**caps, 'admin': caps.get('admin', ['*'])} if self.role in ('admin','system_admin') else caps
        # Fallback for staff/admin if role_ref is missing or empty
        if self.role in ("admin", "system_admin"):
            return {"admin": ["*"], "records": ["*"], "announcements": ["*"], "reports": ["*"], "work": ["*"], "assets": ["*"], "insights": ["*"]}
        if self.role == "manager":
            return {"records": ["*"], "announcements": ["*"], "reports": ["*"], "work": ["*"], "assets": ["*"], "insights": ["*"], "projects": ["*"]}
        if self.role in ("supervisor", "dispatcher"):
            return {"reports": ["view", "edit", "assign"], "work": ["view", "create", "edit"], "assets": ["view"], "insights": ["view"], "announcements": ["view", "create"]}
        if self.role == "records_officer":
            return {"records": ["view", "create", "edit", "legal_hold"], "announcements": ["view", "create"], "reports": ["view"]}
        return {"general": ["view"], "reports": ["view"], "work": ["view"]}

    @property
    def kyc_level(self):
        """Returns 'Government' for officials to satisfy schema requirements."""
        return "Government Verified"

    # Relationships
    role_ref = relationship("SystemRole", foreign_keys=[role_id])
    suspender = relationship("Official", foreign_keys=[suspended_by], remote_side=[id])
    notifications = relationship("Notification", back_populates="official")
    assigned_work_orders = relationship("WorkOrder", foreign_keys="[WorkOrder.assigned_to_id]", back_populates="assigned_to")

# -----------------------------------------------------------------------------
# Segregated Identity Models (Phase 3: Finalized)
# -----------------------------------------------------------------------------

class StaffCredentialToken(Base):
    """Hashed single-use staff credentials; raw secrets never enter audit history."""
    __tablename__ = "staff_credential_tokens"
    id = Column(Integer, primary_key=True)
    official_id = Column(Integer, ForeignKey("officials.id"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True)
    purpose = Column(String(16), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_by_id = Column(Integer, ForeignKey("officials.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    outbox_event_id = Column(Integer, ForeignKey("outbox_events.id"), nullable=True, unique=True)
    target_url = Column(String, nullable=True)
    
    # Dual FK support for segregated architecture
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=True)
    official_id = Column(Integer, ForeignKey("officials.id"), nullable=True)

    title = Column(String)
    message = Column(String)
    priority = Column(Integer, default=0) # 0=Normal, 100=Emergency / Jump-to-top
    is_read = Column(Boolean, default=False)
    is_hidden = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    resident = relationship("Resident", back_populates="notifications")
    official = relationship("Official", back_populates="notifications")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(Integer, nullable=False, default=1, server_default="1")
    __mapper_args__ = {"version_id_col": version}
    ticket_id = Column(String, unique=True, index=True, default=generate_ticket_id)
    
    # Points to Resident table (Explicitly nullable for guest submissions)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=True, index=True)

    # Guest Reporting & Contextual Authentication Extensions (Milestone 1)
    reporter_type = Column(String(20), default="registered", nullable=False, index=True) # 'guest' | 'registered'
    tracking_token_hash = Column(String(128), nullable=True, index=True)                 # HMAC-SHA256 hex digest
    contact_email = Column(String(255), nullable=True, index=True)                       # Optional guest contact email
    contact_phone = Column(String(50), nullable=True)                                    # Optional guest contact phone
    guest_reporter_name = Column(String(160), nullable=True)
    submitted_urgency = Column(String(20), nullable=True)
    contact_verified = Column(Boolean, default=False, nullable=False)                   # OTP verification status
    claimed_at = Column(DateTime(timezone=True), nullable=True)                         # Timestamp when claimed by resident
    claimed_by_user_id = Column(Integer, ForeignKey("residents.id"), nullable=True, index=True) # Resident who claimed ticket
    submission_source = Column(String(30), default="web", nullable=False)               # 'web' | 'mobile' | 'assisted'

    category = Column(String, index=True)
    categories = Column(JSON, nullable=False, default=list, server_default='[]')
    location_metadata = Column(JSON, nullable=False, default=dict, server_default='{}')
    intake_key_hash = Column(String(64), nullable=True, unique=True)
    intake_request_hash = Column(String(64), nullable=True)
    description = Column(String)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    location_string = Column(String, nullable=True)
    # PostGIS Spatial Core
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    accuracy_m = Column(Float, nullable=True)
    plus_code = Column(String(32), nullable=True)
    sector = Column(String(32), nullable=True, index=True) # 'North' | 'South'
    status = Column(String, default="pending", index=True)
    image_url = Column(String, nullable=True)
    resolution_image_url = Column(String, nullable=True)
    
    # AI Analysis Fields (Expanded)
    ai_category = Column(String, nullable=True, index=True)
    ai_urgency = Column(String, nullable=True, index=True)
    ai_summary = Column(String, nullable=True)
    ai_reasoning = Column(String, nullable=True)
    severity_score = Column(Float, default=0.0)
    review_assigned_to_id = Column(Integer, ForeignKey('officials.id'), nullable=True, index=True)
    review_assigned_at = Column(DateTime(timezone=True), nullable=True)
    review_assignment_mode = Column(String(24), nullable=True)
    review_routing_reason = Column(String, nullable=True)
    priority_grade = Column(String(2), nullable=True, index=True)
    priority_policy_version = Column(String(48), nullable=True)
    priority_reason = Column(String, nullable=True)
    priority_reviewed_by_id = Column(Integer, ForeignKey('officials.id'), nullable=True)
    priority_reviewed_at = Column(DateTime(timezone=True), nullable=True)
    next_review_at = Column(DateTime(timezone=True), nullable=True)
    ai_metadata = Column(JSON, nullable=True)  # Formatted JSON: {"image_description": "...", "tags": [...]}
    
    # Deduplication, Routing & Trust
    location_barangay = Column(String, nullable=True, index=True)
    cluster_id = Column(Integer, nullable=True)
    citizen_trust_score = Column(Integer, default=0)
    kyc_tier_at_report  = Column(String, nullable=True)
    barangay_id         = Column(Integer, ForeignKey("barangays.id"), nullable=True, index=True)
    
    # Budgeting & Operational Planning (PULSO Dashboard Integration)
    budget = Column(Float, nullable=True)
    deployment_date = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Closing the loop: Citizen Feedback
    citizen_confirmed_at = Column(DateTime(timezone=True), nullable=True)
    satisfaction_rating = Column(Integer, nullable=True) # 1-5
    citizen_feedback_note = Column(String, nullable=True)

    @property
    def reporter_name(self):
        """Social logic to fetch name for schema serialization."""
        if hasattr(self, "_reporter_name_override"):
            return self._reporter_name_override
        if self.reporter:
            return self.reporter.full_name
        if self.reporter_type == "guest":
            return self.guest_reporter_name or "Guest Reporter"
        return "Anonymous Resident"

    @reporter_name.setter
    def reporter_name(self, value):
        self._reporter_name_override = value

    @property
    def is_claimed(self) -> bool:
        """Helper property indicating whether report is linked to an authenticated resident account."""
        return self.claimed_by_user_id is not None or (self.reporter_type == "registered" and self.resident_id is not None)

    @property
    def barangay(self):
        """Returns the barangay name for schema and government portal compatibility."""
        return self.location_barangay or (self.barangay_ref.name if self.barangay_ref else None) or "Caloocan City"

    @property
    def urgency(self):
        """Returns urgency string for frontend mapping compatibility."""
        return self.ai_urgency or "normal"

    @property
    def district(self):
        """Returns the district name based on barangay reference or coordinates."""
        if self.barangay_ref and self.barangay_ref.district:
            return self.barangay_ref.district.name
        if self.location_lat and self.location_lat < 14.70:
            return "South Caloocan"
        return "North Caloocan"

    # Relationships
    barangay_ref = relationship("Barangay", foreign_keys=[barangay_id])
    reporter = relationship("Resident", foreign_keys=[resident_id], back_populates="reports")
    claimed_by = relationship("Resident", foreign_keys=[claimed_by_user_id], back_populates="claimed_reports")

class Advisory(Base):
    __tablename__ = "advisories"

    id = Column(Integer, primary_key=True, index=True)
    advisory_id = Column(String, unique=True, index=True, default=generate_advisory_id)
    department = Column(String)   # Free-text department name (e.g. "City Engineering Office")
    title = Column(String)
    description = Column(String)
    priority = Column(String)     # low | medium | high | critical  (CHECK constraint in DB)
    category = Column(String)
    has_image = Column(Boolean, default=False)
    image_url = Column(String, nullable=True)
    stats_views = Column(Integer, default=0)
    stats_affected = Column(String, nullable=True)

    # 3NF: FK to the official who published this advisory
    author_id = Column(Integer, ForeignKey("officials.id"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    author = relationship("Official")

    @property
    def author_name(self):
        return self.author.full_name if self.author else "System Administrator"

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True))
    used = Column(Boolean, default=False)

class SystemRole(Base):
    """
    Dynamic RBAC Role definition.
    Stores fine-grained capabilities as JSON.
    """
    __tablename__ = "system_roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # slug: e.g. "city_engineer"
    label = Column(String) # display: e.g. "City Engineer"
    capabilities = Column(JSON, default={}) # e.g. {"records": ["view", "edit"], "analytics": ["view"]}
    access_level = Column(String, default="staff") # template hint: staff, senior, executive, admin
    is_template = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class NewsItem(Base):
    __tablename__ = "news_items"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True)  # Advisories, Events, Infrastructure, General
    headline = Column(String, nullable=False)
    excerpt = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    barangay = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    published_at = Column(DateTime(timezone=True), default=func.now(), index=True)
    priority = Column(String, default="normal", index=True)  # normal | urgent
    posted_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChatConversation(Base):
    """
    PULSEAI Chat Conversation Session.
    Maintains persistent conversation history per resident or official account.
    """
    __tablename__ = "chat_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    owner_type = Column(String(16), nullable=False, default="resident", server_default="resident")
    title = Column(String(255), nullable=False, default="New Conversation")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatMessage.created_at.asc()")


class ChatMessage(Base):
    """
    PULSEAI Chat Message Record.
    Stores user queries, AI responses, and audit records of invoked tools.
    """
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user' | 'assistant'
    content = Column(Text, nullable=False)
    tool_name = Column(String(100), nullable=True)
    tool_data = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("ChatConversation", back_populates="messages")


class SystemSetting(Base):
    """
    Persisted system-wide configurations, policies, SLAs, and retention standards.
    Records versioned configuration and attributed change history.
    """
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    value = Column(JSON, nullable=False)
    policy_source = Column(String(255), nullable=True)
    category = Column(String(50), default="general")
    version = Column(Integer, default=1)
    updated_by_id = Column(Integer, ForeignKey("officials.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    updated_by = relationship("Official", foreign_keys=[updated_by_id])
    history = relationship("SystemSettingHistory", back_populates="setting", cascade="all, delete-orphan", order_by="SystemSettingHistory.created_at.desc()")


class SystemSettingHistory(Base):
    """
    Immutable audit history of all changes to system settings.
    Requires mandatory reason and captures actor identity.
    """
    __tablename__ = "system_setting_history"

    id = Column(Integer, primary_key=True, index=True)
    setting_id = Column(Integer, ForeignKey("system_settings.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=False)
    reason = Column(Text, nullable=False)
    changed_by_id = Column(Integer, ForeignKey("officials.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    setting = relationship("SystemSetting", back_populates="history")
    changed_by = relationship("Official", foreign_keys=[changed_by_id])


class ReportReviewerAvailability(Base):
    """Explicit acceptance of new validation work, backed by a short-lived lease."""
    __tablename__ = 'report_reviewer_availability'
    __table_args__ = (
        CheckConstraint("state IN ('available','away','offline')", name='ck_review_availability_state'),
        CheckConstraint('capacity BETWEEN 1 AND 50', name='ck_review_availability_capacity'),
    )
    official_id = Column(Integer, ForeignKey('officials.id'), primary_key=True)
    state = Column(String(16), nullable=False, default='offline', server_default='offline')
    capacity = Column(Integer, nullable=False, default=5, server_default='5')
    version = Column(Integer, nullable=False, default=1, server_default='1')
    access_version = Column(Integer, nullable=False, default=0, server_default='0')
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    session_expires_at = Column(DateTime(timezone=True), nullable=True)
    last_assigned_at = Column(DateTime(timezone=True), nullable=True)


class ReportConcern(Base):
    """A durable problem episode; proximity clusters never define its identity."""
    __tablename__ = 'report_concerns'
    id = Column(Integer, primary_key=True)
    public_id = Column(String(40), unique=True, nullable=False, default=lambda: 'CON-' + uuid.uuid4().hex)
    version = Column(Integer, nullable=False, default=1, server_default='1')
    anchor_report_id = Column(Integer, ForeignKey('reports.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completion_report_id = Column(Integer, ForeignKey('reports.id'), nullable=True)
    __mapper_args__ = {'version_id_col': version}


class ReportObservation(Base):
    __tablename__ = 'report_observations'
    __table_args__ = (UniqueConstraint('report_id', 'item_key', name='uq_report_observation_item'),)
    id = Column(Integer, primary_key=True)
    report_id = Column(Integer, ForeignKey('reports.id'), nullable=False, index=True)
    item_key = Column(String(64), nullable=False)
    categories = Column(JSON, nullable=False)
    description = Column(Text, nullable=False)
    concern_id = Column(Integer, ForeignKey('report_concerns.id'), nullable=False, index=True)
    association_status = Column(String(24), nullable=False, default='unreviewed')
    report = relationship('Report', foreign_keys=[report_id])
    concern = relationship('ReportConcern', foreign_keys=[concern_id])


class ObservationFieldAssessment(Base):
    """Append-only category findings against independently reviewed survey evidence."""
    __tablename__ = 'observation_field_assessments'
    __table_args__ = (
        UniqueConstraint('observation_id', 'revision', name='uq_observation_field_assessment_revision'),
        CheckConstraint('revision > 0', name='ck_observation_field_assessment_revision'),
    )
    id = Column(Integer, primary_key=True)
    observation_id = Column(Integer, ForeignKey('report_observations.id', ondelete='RESTRICT'), nullable=False)
    field_observation_id = Column(String(36), ForeignKey('asset_field_observations.id', ondelete='RESTRICT'), nullable=False)
    revision = Column(Integer, nullable=False)
    category_findings = Column(JSON, nullable=False)
    reason = Column(Text, nullable=False)
    snapshot = Column(JSON, nullable=False)
    actor_id = Column(Integer, ForeignKey('officials.id', ondelete='RESTRICT'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.statement_timestamp(), nullable=False)


class ReportLearningSnapshot(Base):
    """Submission-time features; later review/outcome fields never rewrite them."""
    __tablename__ = 'report_learning_snapshots'
    report_id = Column(Integer, ForeignKey('reports.id', ondelete='RESTRICT'), primary_key=True)
    schema_version = Column(String(40), nullable=False)
    received_at = Column(DateTime(timezone=True), nullable=False)
    available_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    features = Column(JSON, nullable=False)


class ConcernLearningCheckpoint(Base):
    """Prospective server-known concern context, never reconstructed as intake truth."""
    __tablename__='concern_learning_checkpoints'
    __table_args__=(
        UniqueConstraint('concern_id','concern_version',name='uq_concern_checkpoint_version'),
        CheckConstraint('concern_version > 0',name='ck_concern_checkpoint_version'),
        CheckConstraint("(trigger_kind = 'intake' AND decision_id IS NULL) OR (trigger_kind = 'association' AND decision_id IS NOT NULL)",name='ck_concern_checkpoint_source'),
    )
    id=Column(String(36),primary_key=True,default=lambda:str(uuid.uuid4()))
    concern_id=Column(Integer,ForeignKey('report_concerns.id',ondelete='RESTRICT'),nullable=False,index=True)
    concern_version=Column(Integer,nullable=False)
    trigger_kind=Column(String(16),nullable=False)
    trigger_report_id=Column(Integer,ForeignKey('reports.id',ondelete='RESTRICT'),nullable=False)
    decision_id=Column(Integer,ForeignKey('concern_decisions.id',ondelete='RESTRICT'),nullable=True)
    captured_at=Column(DateTime(timezone=True),nullable=False)
    payload=Column(JSON,nullable=False)
    payload_sha256=Column(String(64),nullable=False)


class ReportResolutionEvent(Base):
    """Authoritative verified transitions and invalidations, never inferred dates."""
    __tablename__ = 'report_resolution_events'
    __table_args__ = (
        CheckConstraint("kind IN ('verified','invalidated')", name='ck_resolution_event_kind'),
        CheckConstraint("(kind = 'invalidated' AND inspection_id IS NULL AND project_id IS NULL) OR (kind = 'verified' AND ((inspection_id IS NOT NULL AND project_id IS NULL) OR (inspection_id IS NULL AND project_id IS NOT NULL)))", name='ck_resolution_event_source'),
    )
    id = Column(Integer, primary_key=True)
    report_id = Column(Integer, ForeignKey('reports.id', ondelete='RESTRICT'), nullable=False, index=True)
    timeline_id = Column(Integer, ForeignKey('process_timelines.id', ondelete='RESTRICT'), nullable=False, unique=True)
    kind = Column(String(16), nullable=False)
    occurred_at = Column(DateTime(timezone=True), nullable=False)
    actor_id = Column(Integer, ForeignKey('officials.id', ondelete='RESTRICT'), nullable=False)
    inspection_id = Column(Integer, ForeignKey('work_order_inspections.id', ondelete='RESTRICT'), nullable=True)
    project_id = Column(Integer, ForeignKey('project_requests.id', ondelete='RESTRICT'), nullable=True)


class PairImageAnalysisJob(Base):
    """Durable advisory job. AI output never becomes a human identity label."""
    __tablename__ = 'pair_image_analysis_jobs'
    __table_args__ = (
        CheckConstraint('left_observation_id < right_observation_id', name='ck_pair_analysis_order'),
        CheckConstraint("status IN ('queued','running','completed','failed','cancelled')", name='ck_pair_analysis_status'),
        CheckConstraint('attempts >= 0 AND attempts <= 1', name='ck_pair_analysis_attempts'),
    )
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    left_observation_id = Column(Integer, ForeignKey('report_observations.id', ondelete='RESTRICT'), nullable=False)
    right_observation_id = Column(Integer, ForeignKey('report_observations.id', ondelete='RESTRICT'), nullable=False)
    requested_by_id = Column(Integer, ForeignKey('officials.id', ondelete='RESTRICT'), nullable=False)
    command_hash = Column(String(64), nullable=False, unique=True)
    payload_hash = Column(String(64), nullable=False)
    snapshot = Column(JSON, nullable=False)
    image_hashes = Column(JSON, nullable=False)
    categories = Column(JSON, nullable=False)
    model = Column(String(200), nullable=False)
    prompt_version = Column(String(40), nullable=False)
    image_recipe = Column(String(80), nullable=False)
    status = Column(String(16), nullable=False, default='queued')
    attempts = Column(Integer, nullable=False, default=0)
    lease_token = Column(String(36), nullable=True)
    lease_until = Column(DateTime(timezone=True), nullable=True)
    dispatched_at = Column(DateTime(timezone=True), nullable=True, index=True)
    result = Column(JSON, nullable=True)
    failure_code = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)


class ObservationPairReview(Base):
    """Append-only operational identity labels; never automatic training truth."""
    __tablename__ = 'observation_pair_reviews'
    __table_args__ = (
        UniqueConstraint('left_observation_id', 'right_observation_id', 'revision', name='uq_observation_pair_revision'),
        CheckConstraint('left_observation_id < right_observation_id', name='ck_observation_pair_order'),
        CheckConstraint('revision > 0', name='ck_observation_pair_revision'),
        CheckConstraint("relation IN ('same_problem','same_asset_different_problem','different_asset','uncertain')", name='ck_observation_pair_relation'),
    )
    id = Column(Integer, primary_key=True)
    left_observation_id = Column(Integer, ForeignKey('report_observations.id', ondelete='RESTRICT'), nullable=False)
    right_observation_id = Column(Integer, ForeignKey('report_observations.id', ondelete='RESTRICT'), nullable=False)
    revision = Column(Integer, nullable=False)
    relation = Column(String(32), nullable=False)
    evidence_basis = Column(JSON, nullable=False)
    reason = Column(Text, nullable=False)
    snapshot = Column(JSON, nullable=False)
    actor_id = Column(Integer, ForeignKey('officials.id', ondelete='RESTRICT'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ConcernDecision(Base):
    """Append-only history of reviewer corrections to problem membership."""
    __tablename__ = 'concern_decisions'
    id = Column(Integer, primary_key=True)
    observation_id = Column(Integer, ForeignKey('report_observations.id'), nullable=False, index=True)
    previous_concern_id = Column(Integer, ForeignKey('report_concerns.id'), nullable=False)
    concern_id = Column(Integer, ForeignKey('report_concerns.id'), nullable=False)
    actor_id = Column(Integer, ForeignKey('officials.id'), nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# Import gov_models at the end to resolve circular dependency for relationships
import gov_models

