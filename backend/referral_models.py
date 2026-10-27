"""Private, versioned inter-office referrals; never a report-resolution shortcut."""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, LargeBinary
from sqlalchemy.sql import func
from database import Base


class ReferralRecipient(Base):
    __tablename__ = 'referral_recipients'
    id = Column(Integer, primary_key=True)
    name = Column(String(180), nullable=False)
    email = Column(String(254))
    phone = Column(String(80))
    verification_reference = Column(Text, nullable=False)
    verified_by_id = Column(Integer, ForeignKey('officials.id'))
    verified_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    active = Column(Boolean, nullable=False, default=True)
    version = Column(Integer, nullable=False, default=1)


class ExternalReferral(Base):
    __tablename__ = 'external_referrals'
    id = Column(Integer, primary_key=True)
    reference = Column(String(60), unique=True, nullable=False)
    report_id = Column(Integer, ForeignKey('reports.id'), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey('referral_recipients.id'), nullable=False)
    previous_referral_id = Column(Integer, ForeignKey('external_referrals.id'))
    owner_id = Column(Integer, ForeignKey('officials.id'), nullable=False, index=True)
    created_by_id = Column(Integer, ForeignKey('officials.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    status = Column(String(40), nullable=False, default='draft', index=True)
    version = Column(Integer, nullable=False, default=1)
    reason = Column(Text, nullable=False)
    summary = Column(Text, nullable=False)
    requested_action = Column(Text, nullable=False)
    next_follow_up_at = Column(DateTime(timezone=True), nullable=False, index=True)
    recipient_reference = Column(String(255))
    approved_by_id = Column(Integer, ForeignKey('officials.id'))
    approved_at = Column(DateTime(timezone=True))
    packet = Column(JSON)
    packet_hash = Column(String(64))
    letter_pdf = Column(LargeBinary)


class ReferralEvent(Base):
    __tablename__ = 'referral_events'
    id = Column(Integer, primary_key=True)
    referral_id = Column(Integer, ForeignKey('external_referrals.id'), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey('officials.id'))
    action = Column(String(60), nullable=False)
    note = Column(Text, nullable=False)
    facts = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ReferralDelivery(Base):
    __tablename__ = 'referral_deliveries'
    id = Column(Integer, primary_key=True)
    referral_id = Column(Integer, ForeignKey('external_referrals.id'), nullable=False, index=True)
    status = Column(String(40), nullable=False, default='queued', index=True)
    message_id = Column(String(180), nullable=False, unique=True)
    packet_hash = Column(String(64), nullable=False)
    queued_by_id = Column(Integer, ForeignKey('officials.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    finished_at = Column(DateTime(timezone=True))
    error_code = Column(String(60))


class ReferralPacket(Base):
    __tablename__ = 'referral_packets'
    id = Column(Integer, primary_key=True)
    referral_id = Column(Integer, ForeignKey('external_referrals.id'), nullable=False, index=True)
    approved_by_id = Column(Integer, ForeignKey('officials.id'), nullable=False)
    approved_at = Column(DateTime(timezone=True), nullable=False)
    packet = Column(JSON, nullable=False)
    packet_hash = Column(String(64), nullable=False)
    letter_pdf = Column(LargeBinary, nullable=False)
