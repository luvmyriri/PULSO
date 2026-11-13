"""Authenticated self-service review availability; no action grants permissions."""
from datetime import datetime, timezone
import json
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user, oauth2_scheme
import models
import gov_models as gm
import report_review as review
import reviewer_availability as availability

router = APIRouter(prefix='/api/gov/report-review/availability', tags=['Report review availability'])


class AvailabilityChange(BaseModel):
    model_config = ConfigDict(extra='forbid')
    state: Literal['available', 'away', 'offline']
    capacity: int = Field(default=5, ge=1, le=50, strict=True)
    expected_version: int = Field(ge=0, strict=True)


def require_eligible(user):
    if not availability.can_receive(user):
        raise HTTPException(403, 'Your account is not authorized to accept report validation work.')


@router.get('/me')
def get_availability(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return availability.snapshot(db, user)


@router.patch('/me')
def set_availability(payload: AvailabilityChange, db: Session = Depends(get_db), user=Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    require_eligible(user)
    expiry = availability.session_expiry(token)
    db.execute(text('SELECT pg_advisory_xact_lock(86173301)'))
    row = db.get(models.ReportReviewerAvailability, user.id)
    if (row.version if row else 0) != payload.expected_version:
        raise HTTPException(409, 'Availability changed in another session. Refresh before changing it again.')
    previous = dict(state=row.state if row else 'offline', capacity=row.capacity if row else 5)
    if row is None:
        row = models.ReportReviewerAvailability(official_id=user.id, version=0)
        db.add(row)
    row.state, row.capacity = payload.state, payload.capacity
    row.access_version = user.access_version or 0
    row.last_seen_at, row.session_expires_at = datetime.now(timezone.utc), expiry
    row.version += 1
    db.add(gm.AuditLog(trigger_type='review_availability', actor_id=user.id, actor_role=user.role,
        action='Report review availability changed', details=json.dumps(dict(previous=previous, state=row.state, capacity=row.capacity))))
    db.flush()
    if row.state == 'available':
        review.route_waiting(db, commit=False)
    db.commit()
    return availability.snapshot(db, user)


@router.post('/me/heartbeat')
def heartbeat(db: Session = Depends(get_db), user=Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    require_eligible(user)
    db.execute(text('SELECT pg_advisory_xact_lock(86173301)'))
    row = db.get(models.ReportReviewerAvailability, user.id)
    # Heartbeats keep an explicitly selected status fresh; they cannot set Away
    # or Offline back to Available after another tab changed the status.
    if row and row.state == 'available' and row.access_version == (user.access_version or 0):
        row.last_seen_at = datetime.now(timezone.utc)
        row.session_expires_at = availability.session_expiry(token)
        row.access_version = user.access_version or 0
        db.flush()
        review.route_waiting(db, commit=False)
    db.commit()
    return availability.snapshot(db, user)


@router.post('/me/offline')
def go_offline(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not isinstance(user, models.Official):
        raise HTTPException(403, 'Staff access is required.')
    db.execute(text('SELECT pg_advisory_xact_lock(86173301)'))
    row = db.get(models.ReportReviewerAvailability, user.id)
    if row and row.state != 'offline':
        row.state = 'offline'
        row.version += 1
        row.last_seen_at = datetime.now(timezone.utc)
        db.add(gm.AuditLog(trigger_type='review_availability', actor_id=user.id, actor_role=user.role,
            action='Report reviewer went offline', details='Explicit sign-out/offline request.'))
    db.commit()
    return availability.snapshot(db, user)
