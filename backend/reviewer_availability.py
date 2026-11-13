"""Server-owned availability and load, independent of manual report ownership."""
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from fastapi import HTTPException
from jose import jwt, JWTError
import auth
import models

LEASE_SECONDS = 120
DEFAULT_CAPACITY = 5


def utc(value):
    return value.replace(tzinfo=timezone.utc) if value and value.tzinfo is None else value


def open_count(db, official_id):
    from report_review import INTAKE
    return db.query(func.count(models.Report.id)).filter(
        models.Report.review_assigned_to_id == official_id, models.Report.status.in_(INTAKE)).scalar() or 0


def can_receive(user):
    from report_review import permitted
    return permitted(user, 'review') and not user.invitation_pending


def fresh(row, user, now=None):
    now = now or datetime.now(timezone.utc)
    return bool(row and row.state == 'available' and can_receive(user)
        and row.access_version == (user.access_version or 0)
        and row.last_seen_at and utc(row.last_seen_at) >= now-timedelta(seconds=LEASE_SECONDS)
        and row.session_expires_at and utc(row.session_expires_at) > now)


def snapshot(db, user):
    from system_settings import read_config
    if not isinstance(user, models.Official):
        raise HTTPException(403, 'Staff access is required.')
    row = db.get(models.ReportReviewerAvailability, user.id)
    count = open_count(db, user.id)
    connected = fresh(row, user)
    routing_enabled = read_config(db, 'report_review_routing')['enabled']
    effective = 'offline' if not connected and (not row or row.state == 'available') else row.state
    if not can_receive(user):
        effective = 'ineligible'
    elif connected and count >= row.capacity:
        effective = 'at_capacity'
    if connected and not routing_enabled:
        effective = 'routing_paused'
    return dict(eligible=can_receive(user), state=row.state if row else 'offline', effective_state=effective,
        capacity=row.capacity if row else DEFAULT_CAPACITY, open_reviews=count, version=row.version if row else 0,
        heartbeat_seconds=30, lease_seconds=LEASE_SECONDS, last_seen_at=row.last_seen_at if row else None,
        accepting_new_reviews=routing_enabled and connected and count < row.capacity,
        routing_enabled=routing_enabled)


def session_expiry(token):
    # The endpoint also authenticates the current user and current access version.
    try:
        claims = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        return datetime.fromtimestamp(claims['exp'], timezone.utc)
    except (ValueError, KeyError, TypeError, JWTError):
        raise HTTPException(401, 'Sign in again before accepting report reviews.')
