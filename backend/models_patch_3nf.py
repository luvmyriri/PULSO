"""
models_patch_3nf.py — SQLAlchemy Model Updates for 3NF Refactoring
City Engineering Office, Caloocan City — PULSO System

This module shows the DIFF/patch to apply to models.py and gov_models.py
so the ORM reflects the new FK columns added by pulso_3nf_migration.sql.

HOW TO USE:
  1. Run pulso_3nf_migration.sql on the live database first.
  2. Apply the changes in this file to models.py and gov_models.py.
  3. Run Alembic migrations or Base.metadata.create_all() to confirm schema sync.

Changes:
  models.py
  ─────────
  • User          — added role_id FK (→ system_roles), barangay_id FK (→ barangays)
  • Advisory      — added author_id FK (→ users)

  gov_models.py
  ─────────────
  • WorkOrder         — district_id now formally FK (→ districts)
  • ProjectRequest    — barangay_id FK (→ barangays)
  • InfrastructureAsset — barangay_id FK (→ barangays)
  • OBOInspection     — barangay_id FK (→ barangays)
  • EnvironmentalContext — barangay_id now proper FK (→ barangays)

New models (add to models.py):
  • District          — districts table
  • Barangay          — barangays table
"""

# ─────────────────────────────────────────────────────────────────────────────
# NEW MODELS — add to models.py
# ─────────────────────────────────────────────────────────────────────────────

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    Float, ForeignKey, Text, Enum, JSON, Date
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class District(Base):
    """
    Caloocan City legislative districts.
    D1 = South Caloocan, D2 = North Caloocan, D3 = Far North Caloocan.
    """
    __tablename__ = "districts"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(100), unique=True, nullable=False)  # e.g. "District 1 – South Caloocan"
    code       = Column(String(10), unique=True, nullable=False)   # D1, D2, D3
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    barangays  = relationship("Barangay", back_populates="district")


class Barangay(Base):
    """
    Master list of Caloocan City barangays.
    Normalises the scattered barangay VARCHAR columns across all domain tables.
    """
    __tablename__ = "barangays"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(150), unique=True, nullable=False)   # e.g. "Barangay 172"
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    zip_code    = Column(String(10), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    district    = relationship("District", back_populates="barangays")


# ─────────────────────────────────────────────────────────────────────────────
# PATCHES FOR EXISTING models.py CLASSES
# Apply the following changes manually to models.py
# ─────────────────────────────────────────────────────────────────────────────

# ── User ─────────────────────────────────────────────────────────────────────
# ADD these two columns inside class User(Base):
#
#   # 3NF: FK to system_roles (authoritative role reference)
#   # Keep legacy `role` varchar for backward compat; use role_id for queries
#   role_id    = Column(Integer, ForeignKey("system_roles.id"), nullable=True, index=True)
#
#   # 3NF: FK to normalised barangay lookup
#   barangay_id = Column(Integer, ForeignKey("barangays.id"), nullable=True, index=True)
#
# UPDATE the relationships block in User:
#
#   role_ref  = relationship("SystemRole", foreign_keys=[role_id])     # replaces viewonly
#   barangay  = relationship("Barangay",   foreign_keys=[barangay_id])
#
# NOTE: Remove the old viewonly relationship:
#   role_details = relationship("SystemRole", primaryjoin="User.role == SystemRole.name",
#                               foreign_keys="SystemRole.name", uselist=False, viewonly=True)

# ── Advisory ─────────────────────────────────────────────────────────────────
# ADD to class Advisory(Base):
#
#   author_id  = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
#
# ADD relationship:
#
#   author     = relationship("User", foreign_keys=[author_id])

# ─────────────────────────────────────────────────────────────────────────────
# PATCHES FOR EXISTING gov_models.py CLASSES
# ─────────────────────────────────────────────────────────────────────────────

# ── WorkOrder ─────────────────────────────────────────────────────────────────
# CHANGE:
#   district_id = Column(Integer, nullable=True, index=True)
# TO:
#   district_id = Column(Integer, ForeignKey("districts.id"), nullable=True, index=True)
#
# ADD relationship:
#   district    = relationship("District", foreign_keys=[district_id])

# ── ProjectRequest ────────────────────────────────────────────────────────────
# ADD new FK column after existing `barangay` varchar:
#
#   # 3NF: FK to normalised barangay lookup
#   barangay_id = Column(Integer, ForeignKey("barangays.id"), nullable=True, index=True)
#
# ADD relationship:
#   barangay_ref = relationship("Barangay", foreign_keys=[barangay_id])

# ── InfrastructureAsset ───────────────────────────────────────────────────────
# ADD after existing `barangay` varchar:
#
#   barangay_id  = Column(Integer, ForeignKey("barangays.id"), nullable=True, index=True)
#
# ADD relationship:
#   barangay_ref = relationship("Barangay", foreign_keys=[barangay_id])

# ── OBOInspection ─────────────────────────────────────────────────────────────
# ADD after existing `barangay` varchar:
#
#   barangay_id  = Column(Integer, ForeignKey("barangays.id"), nullable=True, index=True)
#
# ADD relationship:
#   barangay_ref = relationship("Barangay", foreign_keys=[barangay_id])

# ── EnvironmentalContext ──────────────────────────────────────────────────────
# CHANGE:
#   barangay_id = Column(Integer, unique=True, index=True)
# TO:
#   barangay_id = Column(Integer, ForeignKey("barangays.id"), unique=True, nullable=False, index=True)
#
# ADD relationship:
#   barangay    = relationship("Barangay", foreign_keys=[barangay_id])
