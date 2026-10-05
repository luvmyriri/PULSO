"""
gov_models.py — Government-Side SQLAlchemy Models
City Engineering Office, Caloocan City — PULSO System

Covers:
  - WorkOrder          : Dispatch assignments (FR-11 early dispatch support)
  - AuditLog           : Event-triggered audit entries (FR-10)
  - ProcessTimeline    : Full lifecycle tracker per report/ticket (FR-14)
  - ProcurementRequest : RA 9184 procurement workflow (FR-12)
  - BoQItem            : Bill of Quantities line items linked to procurement
  - ProjectRequest     : LGU-initiated infrastructure project tickets (Phase 1–6)
  - OBOInspection      : Office of Building Official parallel workflow (Section 6.4)
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    Float, ForeignKey, Text, Enum, JSON, Date
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime, timezone


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _gen_wo_id():
    return f"WO-{str(uuid.uuid4().int)[:8]}"

def _gen_pr_id():
    return f"PRQ-{str(uuid.uuid4().int)[:8]}"

def _gen_proj_id():
    return f"PROJ-{str(uuid.uuid4().int)[:8]}"

def _gen_obo_id():
    return f"OBO-{str(uuid.uuid4().int)[:8]}"


# ─────────────────────────────────────────────────────────────────────────────
# Work Order  (FR-11 — Dispatch / Preemptive Dispatch)
# ─────────────────────────────────────────────────────────────────────────────

class WorkOrder(Base):
    """
    Represents a dispatched or preemptively created work order
    tied to a citizen Report or a ProjectRequest.

    Status flow:
      open → assigned → in_progress → completed_pending_review → completed
      Inspection failure requests rework before another submission.
    """
    __tablename__ = "work_orders"

    id             = Column(Integer, primary_key=True, index=True)
    wo_number      = Column(String, unique=True, index=True, default=_gen_wo_id)

    # Link to a citizen report (optional — may be preemptive)
    report_id      = Column(Integer, ForeignKey("reports.id"), nullable=True)

    # Link to an LGU project (optional)
    project_id     = Column(Integer, ForeignKey("project_requests.id"), nullable=True)

    # Link to Centralized Asset Registry (Predictive Maintenance)
    asset_id       = Column(String, ForeignKey("infrastructure_assets.asset_id"), nullable=True)

    # Who assigned it and who is responsible
    assigned_by_id = Column(Integer, ForeignKey("officials.id"))   # Dispatcher / City Engineer
    assigned_to_id = Column(Integer, ForeignKey("officials.id"), nullable=True)  # Field crew

    title          = Column(String)
    description    = Column(Text, nullable=True)

    # "standard" | "preemptive" (FR-11)
    wo_type        = Column(String, default="standard", index=True)

    # open | assigned | in_progress | completed_pending_review | completed | rework_required | blocked | cancelled
    status         = Column(String, default="open", index=True)

    priority       = Column(String, default="normal", index=True)   # low | normal | high | critical
    priority_score = Column(Float, default=0.0)                     # calculated score for sorting
    is_emergency_assignment = Column(Boolean, default=False)
    assignment_type = Column(String, default="territorial")         # territorial | global_override | proximity
    # 3NF: FK to districts lookup (was a bare integer with no FK constraint)
    district_id    = Column(Integer, ForeignKey("districts.id"), nullable=True, index=True)
    barangay_id    = Column(Integer, ForeignKey("barangays.id"), nullable=True, index=True)
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    completed_date = Column(DateTime(timezone=True), nullable=True)

    # Predictive Maintenance / Costing Fields
    category       = Column(String, index=True, nullable=True)      # e.g., Road, Bridge, Drainage
    estimated_cost = Column(Float, default=0.0)
    actual_cost    = Column(Float, nullable=True)
    ai_plan_summary = Column(Text, nullable=True)

    notes          = Column(Text, nullable=True)
    
    # Advanced workflow mechanism
    citizen_feedback = Column(String, default="pending", index=True)

    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    assigned_by    = relationship("Official", foreign_keys=[assigned_by_id])
    assigned_to    = relationship("Official", foreign_keys=[assigned_to_id], back_populates="assigned_work_orders")
    district       = relationship("District", foreign_keys=[district_id])
    barangay_ref   = relationship("Barangay", foreign_keys=[barangay_id])
    approvals      = relationship("WorkOrderApproval", back_populates="work_order", cascade="all, delete-orphan")
    updates        = relationship("WorkOrderUpdate", back_populates="work_order", cascade="all, delete-orphan")
    blockers       = relationship("WorkOrderBlocker", back_populates="work_order", cascade="all, delete-orphan")
    inspections    = relationship("WorkOrderInspection", back_populates="work_order", cascade="all, delete-orphan")


# Work Order Approval  (FR-11 — Approval Workflow)
class WorkOrderApproval(Base):
    """
    Tracks approval/rejection actions on work orders.
    """
    __tablename__ = "work_order_approvals"

    id              = Column(Integer, primary_key=True, index=True)
    work_order_id   = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    approver_id     = Column(Integer, ForeignKey("officials.id"), nullable=False)
    action          = Column(String, nullable=False)  # "approved" | "rejected"
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    work_order      = relationship("WorkOrder", back_populates="approvals")
    approver        = relationship("Official")


# Work Order Update  (Field Worker Updates)
class WorkOrderUpdate(Base):
    """
    Field-level updates for a work order, typically submitted by field workers.
    Allows tracking progress with comments and optional image evidence.
    """
    __tablename__ = "work_order_updates"

    id              = Column(Integer, primary_key=True, index=True)
    work_order_id   = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    official_id     = Column(Integer, ForeignKey("officials.id"), nullable=False)  # The field worker / officer

    previous_status = Column(String, nullable=True)
    new_status      = Column(String, nullable=True)
    comment         = Column(Text, nullable=True)
    image_url       = Column(String, nullable=True)

    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    work_order      = relationship("WorkOrder", back_populates="updates")
    official        = relationship("Official")


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
    checklist_results    = Column(JSON, nullable=True)
    passed               = Column(Boolean, nullable=False, default=False)
    notes                = Column(Text, nullable=True)
    evidence_photo_url   = Column(String, nullable=True)
    created_at           = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    work_order           = relationship("WorkOrder", back_populates="inspections")
    inspector            = relationship("Official", foreign_keys=[inspector_id])


# ─────────────────────────────────────────────────────────────────────────────
# Audit Log  (FR-10 — Event-Triggered Audit)
# ─────────────────────────────────────────────────────────────────────────────

class AuditLog(Base):
    """
    Auto-generated on maintenance actions or anomalous events.
    Immutable — rows are only ever inserted, never updated or deleted.
    """
    __tablename__ = "audit_logs"

    id              = Column(Integer, primary_key=True, index=True)

    # Trigger context
    # "maintenance" | "anomaly" | "status_change" | "procurement" | "role_change"
    trigger_type    = Column(String, index=True)

    # Optional links to entities
    report_id       = Column(Integer, ForeignKey("reports.id"), nullable=True)
    work_order_id   = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    project_id      = Column(Integer, ForeignKey("project_requests.id"), nullable=True)
    procurement_id  = Column(Integer, ForeignKey("procurement_requests.id"), nullable=True)

    # Who caused the event
    actor_id        = Column(Integer, ForeignKey("officials.id"), nullable=True)
    actor_role      = Column(String, nullable=True)

    action          = Column(String)          # e.g. "Status changed to dispatched"
    details         = Column(Text, nullable=True)  # JSON-serialisable free text

    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    actor           = relationship("Official", foreign_keys=[actor_id])


# ─────────────────────────────────────────────────────────────────────────────
# Process Timeline  (FR-14 — Full Lifecycle Tracker)
# ─────────────────────────────────────────────────────────────────────────────

class ProcessTimeline(Base):
    """
    Immutable, append-only log of every status/phase transition
    on a report, work order, or project. Drives the citizen-facing
    and LGU-facing process tracker.
    """
    __tablename__ = "process_timelines"

    id             = Column(Integer, primary_key=True, index=True)

    # One of these must be set
    report_id      = Column(Integer, ForeignKey("reports.id"), nullable=True)
    work_order_id  = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    project_id     = Column(Integer, ForeignKey("project_requests.id"), nullable=True)

    status         = Column(String, index=True)           # The new status at this point
    previous_status = Column(String, nullable=True)

    actor_id       = Column(Integer, ForeignKey("officials.id"), nullable=True)
    actor_role     = Column(String, nullable=True)

    note           = Column(Text, nullable=True)   # Optional officer comment
    is_public      = Column(Boolean, default=True, index=True) # False = LGU-internal only

    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    actor          = relationship("Official", foreign_keys=[actor_id])


# ─────────────────────────────────────────────────────────────────────────────
# Procurement Request  (FR-12 — RA 9184 Procurement Workflow)
# ─────────────────────────────────────────────────────────────────────────────

class ProcurementRequest(Base):
    """
    Formal Request Letter → Validation → Procurement List flow.
    Linked to a WorkOrder or ProjectRequest.

    Status flow:
      draft → submitted → validated → sent_to_procurement → procured | rejected
    """
    __tablename__ = "procurement_requests"

    id              = Column(Integer, primary_key=True, index=True)
    pr_number       = Column(String, unique=True, index=True, default=_gen_pr_id)

    # Source links
    work_order_id   = Column(Integer, ForeignKey("work_orders.id"), nullable=True)
    project_id      = Column(Integer, ForeignKey("project_requests.id"), nullable=True)

    # Raised by Field Engineer / Project Engineer (FR-12)
    raised_by_id    = Column(Integer, ForeignKey("officials.id"))

    # Validated by Administrative Officer V
    validated_by_id = Column(Integer, ForeignKey("officials.id"), nullable=True)

    # Signed off by City Engineer (Dept. Head II)
    approved_by_id  = Column(Integer, ForeignKey("officials.id"), nullable=True)

    title           = Column(String)
    purpose         = Column(Text)   # Justification / purpose of the purchase

    # draft | submitted | validated | sent_to_procurement | procured | rejected
    status          = Column(String, default="draft", index=True)

    rejection_reason = Column(Text, nullable=True)

    # RA 9184 Procurement Locks
    funding_certified = Column(Boolean, default=False)
    obr_number        = Column(String, nullable=True)     # Added for ObR Posting Tracking
    cash_released     = Column(Boolean, default=False)    # Added for Cash Availability Tracking
    bac_meeting_date  = Column(DateTime(timezone=True), nullable=True) # BAC Pre-procurement schedule
    ntp_issued        = Column(Boolean, default=False)

    validated_at    = Column(DateTime(timezone=True), nullable=True)
    approved_at     = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    raised_by       = relationship("Official", foreign_keys=[raised_by_id])
    validated_by    = relationship("Official", foreign_keys=[validated_by_id])
    approved_by     = relationship("Official", foreign_keys=[approved_by_id])
    items           = relationship("BoQItem", back_populates="procurement_request", cascade="all, delete-orphan")


# ─────────────────────────────────────────────────────────────────────────────
# Bill of Quantities Items  (FR-12 sub-component)
# ─────────────────────────────────────────────────────────────────────────────

class BoQItem(Base):
    """
    Line items in a Bill of Quantities tied to a ProcurementRequest.
    Created by the Estimator (Engineer II).
    """
    __tablename__ = "boq_items"

    id                   = Column(Integer, primary_key=True, index=True)
    procurement_request_id = Column(Integer, ForeignKey("procurement_requests.id"))

    item_name            = Column(String)
    unit                 = Column(String, nullable=True)   # e.g. "bags", "meters", "pcs"
    quantity             = Column(Float)
    unit_cost            = Column(Float)
    total_cost           = Column(Float)   # quantity × unit_cost (stored for reporting)

    specifications       = Column(Text, nullable=True)

    procurement_request  = relationship("ProcurementRequest", back_populates="items")


# ─────────────────────────────────────────────────────────────────────────────
# Project Request  (LGU-Initiated Infrastructure Project — Phases 1–6)
# ─────────────────────────────────────────────────────────────────────────────

class ProjectRequest(Base):
    """
    An LGU-initiated infrastructure project (from Mayor/Barangay).
    Tracks the full 6-phase lifecycle from Request → Completion.

    Status flow:
      request_received → survey_in_progress → survey_complete →
      design_in_progress → boq_submitted → pending_budget_check →
      budget_confirmed → approved_by_city_engineer → dispatched →
      in_progress → milestone_inspections → resolved →
      closed_completion_certified
    """
    __tablename__ = "project_requests"

    id               = Column(Integer, primary_key=True, index=True)
    proj_number      = Column(String, unique=True, index=True, default=_gen_proj_id)

    # Who requested it (Mayor's Office, Barangay, etc.)
    requesting_party = Column(String)   # Free text: "Office of the Mayor" / "Brgy 172"
    # Legacy free-text barangay kept for backward-compat; barangay_id is the FK (3NF)
    barangay         = Column(String, nullable=True)
    # 3NF: FK to canonical barangays lookup table
    barangay_id      = Column(Integer, ForeignKey("barangays.id"), nullable=True, index=True)

    title            = Column(String)
    description      = Column(Text)
    location_string  = Column(String, nullable=True)
    location_lat     = Column(Float, nullable=True)
    location_lng     = Column(Float, nullable=True)

    # Link to Centralized Asset Registry
    asset_id         = Column(String, ForeignKey("infrastructure_assets.asset_id"), nullable=True)

    # Phase / status
    status           = Column(String, default="request_received", index=True)
    current_phase    = Column(Integer, default=1, index=True)  # 1–6

    # Scaled Compliance / Smart Gate Fields
    estimated_cost   = Column(Float, default=0.0)
    is_emergency     = Column(Boolean, default=False, index=True)
    
    # "competitive_bidding" | "negotiated_emergency" | "direct_contracting" | "small_value"
    procurement_modality = Column(String, default="competitive_bidding", index=True)
    
    # "rehabilitation" | "new_construction" | "emergency_repair" | "maintenance"
    category         = Column(String, default="new_construction", index=True)

    # 3NF: FK to districts lookup
    district_id      = Column(Integer, ForeignKey("districts.id"), nullable=True, index=True)

    # Key personnel assignments
    created_by_id    = Column(Integer, ForeignKey("officials.id"))          # City Engineer / Clerk
    survey_engineer_id = Column(Integer, ForeignKey("officials.id"), nullable=True)
    design_lead_id   = Column(Integer, ForeignKey("officials.id"), nullable=True)
    project_engineer_id = Column(Integer, ForeignKey("officials.id"), nullable=True)

    # Phase completion timestamps
    survey_completed_at  = Column(DateTime(timezone=True), nullable=True)
    design_completed_at  = Column(DateTime(timezone=True), nullable=True)
    approved_at          = Column(DateTime(timezone=True), nullable=True)
    construction_started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at         = Column(DateTime(timezone=True), nullable=True)

    # Certificate of Completion details
    certificate_issued   = Column(Boolean, default=False)
    certificate_issued_by_id = Column(Integer, ForeignKey("officials.id"), nullable=True)

    # FQA / Quality Tracking Fields
    qa_rejection_count   = Column(Integer, default=0)
    fqa_savings          = Column(Float, default=0.0)         # Estimated cost saved by rejecting sub-standard work
    dlp_expiry           = Column(DateTime(timezone=True), nullable=True) # Defects Liability Period Expiration

    # Attachments (comma-separated URLs / references)
    plan_attachments     = Column(Text, nullable=True)
    cad_attachments      = Column(Text, nullable=True)

    # Link to a citizen report (optional)
    source_report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)

    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    created_by            = relationship("Official", foreign_keys=[created_by_id])
    survey_engineer       = relationship("Official", foreign_keys=[survey_engineer_id])
    design_lead           = relationship("Official", foreign_keys=[design_lead_id])
    project_engineer      = relationship("Official", foreign_keys=[project_engineer_id])
    certificate_issued_by = relationship("Official", foreign_keys=[certificate_issued_by_id])
    barangay_ref          = relationship("Barangay", foreign_keys=[barangay_id])
    district_ref          = relationship("District", foreign_keys=[district_id])


# ─────────────────────────────────────────────────────────────────────────────
# OBO Inspection  (Section 6.4 — Office of Building Official)
# ─────────────────────────────────────────────────────────────────────────────

class OBOInspection(Base):
    """
    Building / Electrical / Mechanical inspection record.
    Parallel track to main project workflow (private construction focus).

    Status flow:
      application_received → inspection_scheduled → inspection_complete →
      (compliant: permit_issued | non_compliant: notice_issued) →
      re_inspection_scheduled → cleared
    """
    __tablename__ = "obo_inspections"

    id               = Column(Integer, primary_key=True, index=True)
    obo_number       = Column(String, unique=True, index=True, default=_gen_obo_id)

    applicant_name   = Column(String)
    applicant_contact = Column(String, nullable=True)

    property_address  = Column(String)
    location_lat      = Column(Float, nullable=True)
    location_lng      = Column(Float, nullable=True)
    # Legacy free-text; barangay_id is the normalised FK (3NF)
    barangay          = Column(String, nullable=True, index=True)
    # 3NF: FK to canonical barangays lookup
    barangay_id       = Column(Integer, ForeignKey("barangays.id"), nullable=True, index=True)
    district_id       = Column(Integer, ForeignKey("districts.id"), nullable=True, index=True)

    # "building" | "electrical" | "mechanical"
    inspection_type   = Column(String, default="building", index=True)

    # application_received | inspection_scheduled | inspection_complete |
    # permit_issued | notice_issued | re_inspection_scheduled | cleared
    status            = Column(String, default="application_received", index=True)

    assigned_inspector_id = Column(Integer, ForeignKey("officials.id"), nullable=True)
    filed_by_id           = Column(Integer, ForeignKey("officials.id"), nullable=True)
    cleared_by_id         = Column(Integer, ForeignKey("officials.id"), nullable=True)

    inspection_date       = Column(DateTime(timezone=True), nullable=True)
    findings              = Column(Text, nullable=True)
    is_compliant          = Column(Boolean, nullable=True)
    violation_details     = Column(Text, nullable=True)

    # Linked to a citizen report if complaint-driven
    source_report_id      = Column(Integer, ForeignKey("reports.id"), nullable=True)

    # Technical Reviews (PD 1096 - Parallel Approvals)
    arch_review       = Column(String, default="pending")
    civil_review      = Column(String, default="pending")
    elec_review       = Column(String, default="pending")
    sani_review       = Column(String, default="pending")
    mech_review       = Column(String, default="pending")

    # Unified Clearance (Link to Engineering Dept for Drainage/Infrastructure check)
    engineering_clearance_id = Column(Integer, ForeignKey("project_requests.id"), nullable=True)

    # Digital Signatures for Audit Log authenticity
    # Format: { "architectural": "Ar. Ricardo Santos", "structural": "Engr. Maria Clara Reyes", ... }
    review_signatures = Column(JSON, nullable=True)

    # Financial & Dispute Handling
    order_of_payment_fee = Column(Float, nullable=True)
    payment_verified     = Column(Boolean, default=False)
    appeal_status        = Column(String, default="none")
    appeal_evidence_url  = Column(Text, nullable=True)

    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    assigned_inspector = relationship("Official", foreign_keys=[assigned_inspector_id])
    filed_by           = relationship("Official", foreign_keys=[filed_by_id])
    cleared_by         = relationship("Official", foreign_keys=[cleared_by_id])
    barangay_ref       = relationship("Barangay", foreign_keys=[barangay_id])
    district_ref       = relationship("District", foreign_keys=[district_id])


# ─────────────────────────────────────────────────────────────────────────────
# Agent Location Tracking  (Real-time GPS for field agents)
# ─────────────────────────────────────────────────────────────────────────────

class AgentLocation(Base):
    """
    Stores real-time GPS location of field agents.
    Updated periodically from the mobile app.
    """
    __tablename__ = "agent_locations"

    id              = Column(Integer, primary_key=True, index=True)
    agent_id        = Column(Integer, ForeignKey("officials.id"), index=True)
    
    latitude        = Column(Float)
    longitude       = Column(Float)
    
    # Current status: "offline" | "available" | "en_route" | "on_site" | "returning"
    status          = Column(String, default="available")
    
    # Accuracy in meters
    accuracy        = Column(Float, nullable=True)
    
    # Battery level percentage
    battery_level   = Column(Integer, nullable=True)
    
    # Last known location description
    location_name   = Column(String, nullable=True)
    
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    agent           = relationship("Official", foreign_keys=[agent_id])

# =====================================================================
# Centralized Asset Registry (Digital Twin & Predictive Maintenance)
# =====================================================================

class InfrastructureAsset(Base):
    """
    Centralized registry for physical LGU infrastructure (Digital Twin).
    """
    __tablename__ = "infrastructure_assets"

    # We use String to match the requested UUID format like "CAL-RD-001"
    asset_id             = Column(String, primary_key=True, index=True)
    asset_name           = Column(String, index=True)
    category             = Column(String) # Road, Bridge, Drainage, Building, Light
    gps_coordinates      = Column(JSON, nullable=True) # GeoJSON representation
    material_type        = Column(String) # Asphalt, Concrete, Steel, etc.
    date_completed       = Column(Date, nullable=True)
    design_life          = Column(Integer, default=20) # Expected life in years
    original_contractor  = Column(String, nullable=True)
    # Legacy free-text barangay; barangay_id is the normalised FK (3NF)
    barangay             = Column(String, nullable=True) # Legacy string
    # 3NF: FK to canonical barangays lookup
    barangay_id          = Column(Integer, ForeignKey("barangays.id"), nullable=True, index=True)
    condition_score      = Column(Float, default=100.0, nullable=True)
    status               = Column(String, default="operational", index=True) # operational, maintenance_needed, under_repair, critical, decommissioned
    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    updated_at           = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    maintenance_logs     = relationship("MaintenanceHistory", back_populates="asset")
    work_orders          = relationship("WorkOrder")
    projects             = relationship("ProjectRequest")
    barangay_ref         = relationship("Barangay", foreign_keys=[barangay_id])


class MaintenanceHistory(Base):
    """
    Immutable chronological maintenance log.
    """
    __tablename__ = "maintenance_history"

    log_id               = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    asset_id             = Column(String, ForeignKey("infrastructure_assets.asset_id"), nullable=False)
    work_type            = Column(String) # Patching, Declogging, Retrofitting, Repainting
    cost                 = Column(Float, nullable=True)
    completion_date      = Column(Date)
    
    asset                = relationship("InfrastructureAsset", back_populates="maintenance_logs")


class EnvironmentalContext(Base):
    """
    Context for environmental factors per barangay (Flood Risk, Soil Subsidence).
    barangay_id is now a proper FK to the canonical barangays lookup table (3NF).
    """
    __tablename__ = "environmental_context"

    id                   = Column(Integer, primary_key=True, index=True)
    # 3NF: FK to canonical barangays table (previously a bare integer pointing nowhere)
    barangay_id          = Column(Integer, ForeignKey("barangays.id"), unique=True, nullable=True, index=True)
    flood_risk_level     = Column(String) # Low, Medium, High
    soil_subsidence      = Column(Float, nullable=True)

    barangay             = relationship("Barangay", foreign_keys=[barangay_id])

# ─────────────────────────────────────────────────────────────────────────────
# System Document Registry  (Document-as-a-Status-Gate / FQA Logic)
# ─────────────────────────────────────────────────────────────────────────────

class SystemDocument(Base):
    """
    Central hub for storing documents that act as "Gates" for Status progression.
    Stores the SHA-256 hash for Digital Twin evidence tracking and integrity.
    """
    __tablename__ = "system_documents"
    
    # Retention Policy Overrides (Years)
    RETENTION_YEARS = {
        "PERPETUAL": 99,
        "10_YEARS": 10,
        "5_YEARS": 5,
        "2_YEARS": 2
    }

    id               = Column(Integer, primary_key=True, index=True)
    document_type    = Column(String, index=True) # e.g. 'survey_report', 'topo_map', 'design_plans', 'pow', 'abc', 'ntp', 'contract', 'as_built_plan', 'materials_test'

    file_path        = Column(String)
    file_name        = Column(String)
    file_size_bytes  = Column(Integer, default=0)
    sha256_hash      = Column(String, index=True) # Integrity Fingerprint
    
    # PULSO Category & Compliance
    category         = Column(String, index=True) # Infrastructure, Permits, Legal, Technical, Draft, CitizenEvidence
    confidentiality  = Column(String, index=True, default="Restricted") # Public, Restricted, Confidential
    
    # Retention Policy (RA 10173 & Strategic Lifecycle)
    retention_policy = Column(String, default="5_YEARS") # PERPETUAL, 10_YEARS, 5_YEARS, 2_YEARS
    expiry_date      = Column(DateTime(timezone=True), nullable=True)
    legal_hold       = Column(Boolean, default=False, index=True)

    # Which model does this belong to ('WorkOrder', 'ProjectRequest', 'ProcurementRequest', 'OBOInspection')
    target_model     = Column(String, index=True)
    target_id        = Column(Integer, index=True)

    # Security
    uploader_id      = Column(Integer, ForeignKey("officials.id"))
    npki_signature   = Column(Boolean, default=False) # Marked if PNPKI confirmed signed
    
    metadata_json    = Column(JSON, nullable=True) # Ex: OCR results or dimension matching stats
    
    uploaded_at      = Column(DateTime(timezone=True), server_default=func.now())
    
    uploader         = relationship("Official", foreign_keys=[uploader_id])


# =============================================================================
# Governed Announcements & Public Notices (R6 Architecture)
# =============================================================================

def _gen_announcement_id():
    """Generates canonical identifier e.g. 'ANN-2026-891240'"""
    return f"ANN-{datetime.now(timezone.utc).year}-{str(uuid.uuid4().int)[:6]}"


class Announcement(Base):
    """
    Central authoritative government announcement record supporting
    a 6-stage lifecycle, bilingual fields, and linked engineering records.
    """
    __tablename__ = "announcements"

    id                   = Column(Integer, primary_key=True, index=True)
    announcement_id      = Column(String, unique=True, index=True, default=_gen_announcement_id)

    # ── Bilingual Content ────────────────────────────────────────────────────
    title_en             = Column(String, nullable=False, index=True)
    title_fil            = Column(String, nullable=True)
    content_en           = Column(Text, nullable=False)
    content_fil          = Column(Text, nullable=True)

    # ── Classification & Governance ──────────────────────────────────────────
    category             = Column(String, default="general_notice", index=True)
    priority             = Column(String, default="normal", index=True)
    status               = Column(String, default="draft", index=True)

    # ── Scope & Geographic Targeting ─────────────────────────────────────────
    target_audience      = Column(String, default="public", index=True)
    target_districts     = Column(JSON, nullable=True, default=list)
    target_barangays     = Column(JSON, nullable=True, default=list)
    district_id          = Column(Integer, ForeignKey("districts.id"), nullable=True, index=True)
    barangay_id          = Column(Integer, ForeignKey("barangays.id"), nullable=True, index=True)

    # Delivery channels configured: e.g. ["web", "sms", "email"]
    channels             = Column(JSON, nullable=False, default=lambda: ["web"])

    # ── Timing & Lifecycle Gates ─────────────────────────────────────────────
    scheduled_at         = Column(DateTime(timezone=True), nullable=True, index=True)
    published_at         = Column(DateTime(timezone=True), nullable=True, index=True)
    expires_at           = Column(DateTime(timezone=True), nullable=True, index=True)

    # ── Workflow Actors & Sign-Offs ──────────────────────────────────────────
    author_id            = Column(Integer, ForeignKey("officials.id"), nullable=False, index=True)
    reviewer_id          = Column(Integer, ForeignKey("officials.id"), nullable=True)
    approved_by_id       = Column(Integer, ForeignKey("officials.id"), nullable=True, index=True)
    approved_at          = Column(DateTime(timezone=True), nullable=True)

    # ── Formal Withdrawal Audit ──────────────────────────────────────────────
    withdrawal_reason    = Column(Text, nullable=True)
    withdrawn_at         = Column(DateTime(timezone=True), nullable=True)
    withdrawn_by_id      = Column(Integer, ForeignKey("officials.id"), nullable=True)

    # ── Linked Engineering Records (Provenance) ──────────────────────────────
    source_report_id     = Column(Integer, ForeignKey("reports.id"), nullable=True, index=True)
    source_work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True, index=True)
    source_project_id    = Column(Integer, ForeignKey("project_requests.id"), nullable=True, index=True)
    source_asset_id      = Column(String, ForeignKey("infrastructure_assets.asset_id"), nullable=True, index=True)
    image_url            = Column(String, nullable=True)

    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    updated_at           = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ── Relationships ────────────────────────────────────────────────────────
    author               = relationship("Official", foreign_keys=[author_id])
    reviewer             = relationship("Official", foreign_keys=[reviewer_id])
    approved_by          = relationship("Official", foreign_keys=[approved_by_id])
    withdrawn_by         = relationship("Official", foreign_keys=[withdrawn_by_id])
    district_ref         = relationship("District", foreign_keys=[district_id])
    barangay_ref         = relationship("Barangay", foreign_keys=[barangay_id])

    corrections          = relationship(
        "AnnouncementCorrection",
        back_populates="announcement",
        cascade="all, delete-orphan",
        order_by="AnnouncementCorrection.created_at.desc()"
    )
    deliveries           = relationship(
        "AnnouncementDelivery",
        back_populates="announcement",
        cascade="all, delete-orphan",
        order_by="AnnouncementDelivery.channel"
    )


class AnnouncementCorrection(Base):
    """
    Immutable timestamped revision and errata notice for published announcements.
    Captures prior content snapshot to preserve historical record integrity.
    """
    __tablename__ = "announcement_corrections"

    id                   = Column(Integer, primary_key=True, index=True)
    announcement_id      = Column(Integer, ForeignKey("announcements.id"), nullable=False, index=True)
    editor_id            = Column(Integer, ForeignKey("officials.id"), nullable=False, index=True)
    
    correction_summary   = Column(Text, nullable=False)
    reason               = Column(Text, nullable=False)
    previous_content     = Column(JSON, nullable=True)

    created_at           = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # ── Relationships ────────────────────────────────────────────────────────
    announcement         = relationship("Announcement", back_populates="corrections")
    editor               = relationship("Official", foreign_keys=[editor_id])


class AnnouncementDelivery(Base):
    """
    Per-channel delivery tracking record accounting for Web, SMS, and Email transport.
    """
    __tablename__ = "announcement_deliveries"

    id                   = Column(Integer, primary_key=True, index=True)
    announcement_id      = Column(Integer, ForeignKey("announcements.id"), nullable=False, index=True)
    channel              = Column(String, nullable=False, index=True)  # "web", "sms", "email"
    status               = Column(String, default="pending", index=True)  # "pending", "in_progress", "delivered", "failed"
    recipient_count      = Column(Integer, default=0)
    delivered_count      = Column(Integer, default=0)
    failed_count         = Column(Integer, default=0)
    error_message        = Column(Text, nullable=True)
    last_attempted_at    = Column(DateTime(timezone=True), nullable=True)
    delivered_at         = Column(DateTime(timezone=True), nullable=True)

    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    updated_at           = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ── Relationships ────────────────────────────────────────────────────────
    announcement         = relationship("Announcement", back_populates="deliveries")


# Import models at the end to resolve circular dependency for relationships
import models
