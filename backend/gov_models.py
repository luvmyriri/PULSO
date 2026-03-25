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
    Float, ForeignKey, Text, Enum
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _gen_wo_id():
    return f"WO-{str(uuid.uuid4().int)[:6]}"

def _gen_pr_id():
    return f"PRQ-{str(uuid.uuid4().int)[:6]}"

def _gen_proj_id():
    return f"PROJ-{str(uuid.uuid4().int)[:6]}"

def _gen_obo_id():
    return f"OBO-{str(uuid.uuid4().int)[:6]}"


# ─────────────────────────────────────────────────────────────────────────────
# Work Order  (FR-11 — Dispatch / Preemptive Dispatch)
# ─────────────────────────────────────────────────────────────────────────────

class WorkOrder(Base):
    """
    Represents a dispatched or preemptively created work order
    tied to a citizen Report or a ProjectRequest.

    Status flow:
      open → assigned → in_progress → completed | cancelled
    """
    __tablename__ = "work_orders"

    id             = Column(Integer, primary_key=True, index=True)
    wo_number      = Column(String, unique=True, index=True, default=_gen_wo_id)

    # Link to a citizen report (optional — may be preemptive)
    report_id      = Column(Integer, ForeignKey("reports.id"), nullable=True)

    # Link to an LGU project (optional)
    project_id     = Column(Integer, ForeignKey("project_requests.id"), nullable=True)

    # Who assigned it and who is responsible
    assigned_by_id = Column(Integer, ForeignKey("users.id"))   # Dispatcher / City Engineer
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Field crew

    title          = Column(String)
    description    = Column(Text, nullable=True)

    # "standard" | "preemptive" (FR-11)
    wo_type        = Column(String, default="standard")

    # open | assigned | in_progress | completed | cancelled
    status         = Column(String, default="open")

    priority       = Column(String, default="normal")   # low | normal | high | critical
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    completed_date = Column(DateTime(timezone=True), nullable=True)

    notes          = Column(Text, nullable=True)

    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    assigned_by    = relationship("User", foreign_keys=[assigned_by_id])
    assigned_to    = relationship("User", foreign_keys=[assigned_to_id])


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
    actor_id        = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_role      = Column(String, nullable=True)

    action          = Column(String)          # e.g. "Status changed to dispatched"
    details         = Column(Text, nullable=True)  # JSON-serialisable free text

    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    actor           = relationship("User", foreign_keys=[actor_id])


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

    status         = Column(String)           # The new status at this point
    previous_status = Column(String, nullable=True)

    actor_id       = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_role     = Column(String, nullable=True)

    note           = Column(Text, nullable=True)   # Optional officer comment
    is_public      = Column(Boolean, default=True) # False = LGU-internal only

    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    actor          = relationship("User", foreign_keys=[actor_id])


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
    raised_by_id    = Column(Integer, ForeignKey("users.id"))

    # Validated by Administrative Officer V
    validated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Signed off by City Engineer (Dept. Head II)
    approved_by_id  = Column(Integer, ForeignKey("users.id"), nullable=True)

    title           = Column(String)
    purpose         = Column(Text)   # Justification / purpose of the purchase

    # draft | submitted | validated | sent_to_procurement | procured | rejected
    status          = Column(String, default="draft")

    rejection_reason = Column(Text, nullable=True)

    validated_at    = Column(DateTime(timezone=True), nullable=True)
    approved_at     = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    raised_by       = relationship("User", foreign_keys=[raised_by_id])
    validated_by    = relationship("User", foreign_keys=[validated_by_id])
    approved_by     = relationship("User", foreign_keys=[approved_by_id])
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
    barangay         = Column(String, nullable=True)

    title            = Column(String)
    description      = Column(Text)
    location_string  = Column(String, nullable=True)
    location_lat     = Column(Float, nullable=True)
    location_lng     = Column(Float, nullable=True)

    # Phase / status
    status           = Column(String, default="request_received")
    current_phase    = Column(Integer, default=1)  # 1–6

    # Key personnel assignments
    created_by_id    = Column(Integer, ForeignKey("users.id"))          # City Engineer / Clerk
    survey_engineer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    design_lead_id   = Column(Integer, ForeignKey("users.id"), nullable=True)
    project_engineer_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Phase completion timestamps
    survey_completed_at  = Column(DateTime(timezone=True), nullable=True)
    design_completed_at  = Column(DateTime(timezone=True), nullable=True)
    approved_at          = Column(DateTime(timezone=True), nullable=True)
    construction_started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at         = Column(DateTime(timezone=True), nullable=True)

    # Certificate of Completion details
    certificate_issued   = Column(Boolean, default=False)
    certificate_issued_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Attachments (comma-separated URLs / references)
    plan_attachments     = Column(Text, nullable=True)
    cad_attachments      = Column(Text, nullable=True)

    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    created_by            = relationship("User", foreign_keys=[created_by_id])
    survey_engineer       = relationship("User", foreign_keys=[survey_engineer_id])
    design_lead           = relationship("User", foreign_keys=[design_lead_id])
    project_engineer      = relationship("User", foreign_keys=[project_engineer_id])
    certificate_issued_by = relationship("User", foreign_keys=[certificate_issued_by_id])


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
    barangay          = Column(String, nullable=True)

    # "building" | "electrical" | "mechanical"
    inspection_type   = Column(String, default="building")

    # application_received | inspection_scheduled | inspection_complete |
    # permit_issued | notice_issued | re_inspection_scheduled | cleared
    status            = Column(String, default="application_received")

    assigned_inspector_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filed_by_id           = Column(Integer, ForeignKey("users.id"), nullable=True)
    cleared_by_id         = Column(Integer, ForeignKey("users.id"), nullable=True)

    inspection_date       = Column(DateTime(timezone=True), nullable=True)
    findings              = Column(Text, nullable=True)
    is_compliant          = Column(Boolean, nullable=True)
    violation_details     = Column(Text, nullable=True)

    # Linked to a citizen report if complaint-driven
    source_report_id      = Column(Integer, ForeignKey("reports.id"), nullable=True)

    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    assigned_inspector = relationship("User", foreign_keys=[assigned_inspector_id])
    filed_by           = relationship("User", foreign_keys=[filed_by_id])
    cleared_by         = relationship("User", foreign_keys=[cleared_by_id])
