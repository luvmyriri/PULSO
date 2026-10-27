from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from government_access import require, require_report_scope, scoped_reports
import command_integrity
import models
import gov_models as gm
import report_review as review

router = APIRouter(prefix='/api/gov/report-review',tags=['Report review ownership'])


class Assignment(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_version: int = Field(...,ge=1)
    assigned_to_id: int
    reason: str = Field(...,min_length=10,max_length=2000)


class PriorityDecision(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_version: int = Field(...,ge=1)
    priority_grade: str = Field(...,pattern='^P[0-5]$')
    reason: str = Field(...,min_length=10,max_length=2000)
    next_review_at: datetime | None = None


def require_report_access(db,user,report):
    require(user,'reports')
    require_report_scope(db,user,report)
    from gov_router import FIELD_SELF_ROLES
    if user.role in FIELD_SELF_ROLES and not db.query(gm.WorkOrder.id).filter_by(report_id=report.id,assigned_to_id=user.id).first():
        raise HTTPException(403,'This report is outside your assigned work.')


def get_report(db,user,id,lock=False):
    require(user,'reports')
    query = db.query(models.Report).filter_by(id=id)
    report = (query.with_for_update() if lock else query).first()
    if not report: raise HTTPException(404,'Report not found.')
    require_report_access(db,user,report)
    return report


@router.get('')
def report_operations(ids: str = Query('',max_length=12000),db:Session=Depends(get_db),user=Depends(get_current_user)):
    require(user,'reports')
    parts = ids.split(',') if ids else []
    if len(parts)>1000 or any(not p.isdigit() for p in parts): raise HTTPException(422,'Choose up to 1000 report IDs.')
    query = scoped_reports(db.query(models.Report),user).filter(models.Report.id.in_([int(p) for p in parts]))
    from gov_router import FIELD_SELF_ROLES
    if user.role in FIELD_SELF_ROLES:
        query = query.filter(models.Report.id.in_(db.query(gm.WorkOrder.report_id).filter_by(assigned_to_id=user.id)))
    return {str(r.id):review.projection(db,r) for r in query.all()}


@router.get('/{report_id}/reviewers')
def eligible_reviewers(report_id:int,db:Session=Depends(get_db),user=Depends(get_current_user)):
    report = get_report(db,user,report_id)
    review.require_decision(db,user,report,'assign')
    return [dict(id=p.id,full_name=p.full_name,role=p.role) for p in review.eligible(db,report)]


@router.post('/{report_id}/assignment')
def assign_review(report_id:int,payload:Assignment,db:Session=Depends(get_db),user=Depends(get_current_user)):
    report = get_report(db,user,report_id,True)
    review.require_decision(db,user,report,'assign')
    command_integrity.check_version(report.version,payload.expected_version)
    if report.status in review.CLOSED: raise HTTPException(409,'Closed reports do not enter an active review queue.')
    if len(payload.reason.strip())<10: raise HTTPException(422,'Explain the assignment in at least 10 characters.')
    review.routing_area(db,report,persist=True)
    person = next((p for p in review.eligible(db,report) if p.id == payload.assigned_to_id),None)
    if not person: raise HTTPException(422,'Choose an active reviewer authorized for the recorded district.')
    if report.review_assigned_to_id != person.id:
        review.assign(db,report,person,payload.reason.strip(),user)
    db.commit()
    return dict(version=report.version,**review.projection(db,report))


@router.post('/{report_id}/priority')
def set_priority(report_id:int,payload:PriorityDecision,db:Session=Depends(get_db),user=Depends(get_current_user)):
    report = get_report(db,user,report_id,True)
    review.require_decision(db,user,report,'review')
    command_integrity.check_version(report.version,payload.expected_version)
    if len(payload.reason.strip())<10: raise HTTPException(422,'Record the evidence and reason for this grade.')
    revisit = payload.next_review_at
    if revisit and not revisit.tzinfo: revisit = revisit.replace(tzinfo=timezone.utc)
    if payload.priority_grade == 'P0' and (not report.review_assigned_to_id or not revisit or revisit<=datetime.now(timezone.utc)):
        raise HTTPException(422,'Monitoring requires a named review owner and a future review date.')
    if payload.priority_grade == 'P0' and report.status in review.CLOSED:
        raise HTTPException(409,'A closed report cannot be placed in an active monitoring queue.')
    previous = report.priority_grade
    report.priority_grade = payload.priority_grade
    report.priority_policy_version = review.PRIORITY_POLICY
    report.priority_reason = payload.reason.strip()
    report.priority_reviewed_by_id = user.id
    report.priority_reviewed_at = datetime.now(timezone.utc)
    report.next_review_at = revisit
    review._history(db,report,'report_priority',dict(policy=review.PRIORITY_POLICY,previous_grade=previous,grade=payload.priority_grade,reason=payload.reason.strip(),next_review_at=revisit.isoformat() if revisit else None),user)
    db.commit()
    return dict(version=report.version,**review.projection(db,report))
