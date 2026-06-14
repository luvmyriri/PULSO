from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from typing import Optional, List, Union
from database import Base
import uuid
import re


# ─────────────────────────────────────────────────────────────────────────────
# Geographic Lookup Tables (3NF Normalisation)
# ─────────────────────────────────────────────────────────────────────────────

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

    id          = Column(Integer,      primary_key=True, index=True)
    name        = Column(String(150),  unique=True, nullable=False)   # "Barangay 172" / "Camarin"
    district_id = Column(Integer,      ForeignKey("districts.id"), nullable=False, index=True)
    zip_code    = Column(String(10),   nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    district    = relationship("District", back_populates="barangays")

def generate_ticket_id():
    import secrets
    from datetime import datetime
    # Prefix with year, month, and day for maximal chronological grouping and uniqueness
    date_prefix = datetime.now().strftime("%Y%m%d")
    return f"RPT-{date_prefix}-{secrets.token_hex(8).upper()}"

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
    last_kyc_verification = Column(DateTime(timezone=True), nullable=True)
    
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
    reports = relationship("Report", back_populates="reporter")
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
    ticket_id = Column(String, unique=True, index=True, default=generate_ticket_id)
    
    # Points to Resident table
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=True)

    category = Column(String, index=True)
    description = Column(String)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    location_string = Column(String, nullable=True)
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
        return self.reporter.full_name if self.reporter else "Anonymous Resident"

    @reporter_name.setter
    def reporter_name(self, value):
        self._reporter_name_override = value

    # Relationships
    barangay_ref = relationship("Barangay", foreign_keys=[barangay_id])
    reporter = relationship("Resident", back_populates="reports")
    barangay_ref = relationship("Barangay", foreign_keys=[barangay_id])

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

# Import gov_models at the end to resolve circular dependency for relationships
import gov_models

