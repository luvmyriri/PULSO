from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON
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
    password_hash = Column(String)
    
    address = Column(String, nullable=True)
    barangay_id = Column(Integer, ForeignKey("barangays.id"), nullable=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True, index=True)
    phone_number = Column(String, nullable=True)
    
    # Citizen-specific features
    trust_score = Column(Integer, default=100)
    verification_code = Column(String, nullable=True)
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def role(self):
        return "resident"
        
    @property
    def is_suspended(self):
        return False

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
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    role = Column(String, default="staff", index=True)  # Denormalized for query performance & compatibility


    @property
    def is_verified(self):
        # Officials are inherently verified by being in the officials table
        return True

    @property
    def trust_score(self):
        # Standardize for UI compatibility
        return 100

    @property
    def capabilities(self):
        """Resolves capabilities from the linked role_ref or defaults."""
        if self.role_ref and self.role_ref.capabilities:
            return self.role_ref.capabilities
        # Fallback for staff/admin if role_ref is missing or empty
        if self.role == "admin":
            return {"admin": ["*"]}
        return {"general": ["view"]}

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

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    outbox_event_id = Column(Integer, ForeignKey("outbox_events.id"), nullable=True, unique=True)
    
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
    contact_verified = Column(Boolean, default=False, nullable=False)                   # OTP verification status
    claimed_at = Column(DateTime(timezone=True), nullable=True)                         # Timestamp when claimed by resident
    claimed_by_user_id = Column(Integer, ForeignKey("residents.id"), nullable=True, index=True) # Resident who claimed ticket
    submission_source = Column(String(30), default="web", nullable=False)               # 'web' | 'mobile' | 'assisted'

    category = Column(String, index=True)
    description = Column(String)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    location_string = Column(String, nullable=True)
    # PostGIS Spatial Core
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    accuracy_m = Column(Float, default=0.0)
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
            return "Guest Reporter"
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
    PULSEAI Resident Chat Conversation Session.
    Maintains persistent conversation history per resident account.
    """
    __tablename__ = "chat_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("residents.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="New Conversation")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    resident = relationship("Resident", backref="chat_conversations")
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
    tool_name = Column(String(100), nullable=True)  # Tool called during grounding (e.g. get_my_reports)
    tool_data = Column(Text, nullable=True)  # Reference snippet of retrieved data for audit/debugging
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("ChatConversation", back_populates="messages")


# Import gov_models at the end to resolve circular dependency for relationships
import gov_models

