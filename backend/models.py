from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid

def generate_ticket_id():
    return f"RPT-{str(uuid.uuid4().int)[:8]}"

def generate_advisory_id():
    return f"PUB-{str(uuid.uuid4().int)[:8]}"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="resident")
    address = Column(String)
    barangay = Column(String)
    phone_number = Column(String, nullable=True)
    trust_score = Column(Integer, default=100)
    verification_code = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reports = relationship("Report", back_populates="reporter")
    notifications = relationship("Notification", back_populates="user")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    message = Column(String)
    is_read = Column(Boolean, default=False)
    is_hidden = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String, unique=True, index=True, default=generate_ticket_id)
    user_id = Column(Integer, ForeignKey("users.id"))
    category = Column(String)
    description = Column(String)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    location_string = Column(String, nullable=True)
    status = Column(String, default="pending")
    image_url = Column(String, nullable=True)
    resolution_image_url = Column(String, nullable=True)
    
    # AI Analysis Fields (Expanded)
    ai_category = Column(String, nullable=True)
    ai_urgency = Column(String, nullable=True)
    ai_summary = Column(String, nullable=True)
    ai_reasoning = Column(String, nullable=True)
    severity_score = Column(Float, default=0.0)
    ai_metadata = Column(Text, nullable=True)  # Formatted JSON: {image_description: "...", tags: [...]}
    
    # Deduplication Fields
    cluster_id = Column(Integer, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter = relationship("User", back_populates="reports")

class Advisory(Base):
    __tablename__ = "advisories"

    id = Column(Integer, primary_key=True, index=True)
    advisory_id = Column(String, unique=True, index=True, default=generate_advisory_id)
    department = Column(String)
    title = Column(String)
    description = Column(String)
    priority = Column(String)
    category = Column(String)
    has_image = Column(Boolean, default=False)
    image_url = Column(String, nullable=True)
    stats_views = Column(Integer, default=0)
    stats_affected = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True))
    used = Column(Boolean, default=False)

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

