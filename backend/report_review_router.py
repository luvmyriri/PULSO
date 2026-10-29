from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from collections import Counter
from database import get_db
from auth import get_current_user
from government_access import jurisdiction_ids, require, require_report_scope, scoped_reports
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


class TakeReview(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_version: int = Field(...,ge=1)
    reason: str | None = Field(default=None,max_length=2000)


class PriorityDecision(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_version: int = Field(...,ge=1)
    priority_grade: str = Field(...,pattern='^P[0-5]$')
    reason: str = Field(...,min_length=10,max_length=2000)
    next_review_at: datetime | None = None


class IntakeHandoff(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_version: int = Field(...,ge=1)
    reason: str = Field(...,min_length=10,max_length=2000)


class RoutingAreaDecision(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_version: int = Field(...,ge=1)
    barangay_id: int = Field(...,ge=1)
    reason: str = Field(...,min_length=10,max_length=2000)


def _clerk_owner(db, user, report, action):
    if user.role not in review.CLERK_ROLES:
        raise HTTPException(403,'This intake handoff is available only to an assigned clerk.')
    review.require_decision(db,user,report,action)
    if report.status not in review.INTAKE:
        raise HTTPException(409,'This report is no longer in intake review.')


def _handoff_owner(db, user, report):
    action = 'intake' if user.role in review.CLERK_ROLES else 'review'
    if review.permitted(user,'verify'):
        raise HTTPException(403,'An authorized engineering verifier should make the report decision directly.')
    review.require_decision(db,user,report,action)
    if report.review_assigned_to_id != user.id:
        raise HTTPException(403,'Only the current review owner can submit this handoff.')
    if report.status not in review.INTAKE:
        raise HTTPException(409,'This report is no longer in intake review.')


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
    return [dict(id=p.id,full_name=p.full_name,role=p.role) for p in review.eligible(db,report,manual=True)]


@router.get('/{report_id}/routing-areas')
def routing_areas(report_id:int,db:Session=Depends(get_db),user=Depends(get_current_user)):
    report = get_report(db,user,report_id)
    review.require_decision(db,user,report,'assign')
    districts = jurisdiction_ids(user)
    query = db.query(models.Barangay)
    if districts: query = query.filter(models.Barangay.district_id.in_(districts))
    return [dict(id=area.id,name=area.name,district_id=area.district_id,district_name=area.district.name if area.district else None)
            for area in query.order_by(models.Barangay.district_id,models.Barangay.name).all()]


@router.post('/{report_id}/routing-area')
def confirm_routing_area(report_id:int,payload:RoutingAreaDecision,db:Session=Depends(get_db),user=Depends(get_current_user)):
    report = get_report(db,user,report_id,True)
    review.require_decision(db,user,report,'assign')
    command_integrity.check_version(report.version,payload.expected_version)
    if report.status not in review.INTAKE or report.review_assigned_to_id or db.query(gm.WorkOrder.id).filter_by(report_id=report.id).first():
        raise HTTPException(409,'Routing location can be confirmed only before review or field work is assigned.')
    area = db.get(models.Barangay,payload.barangay_id)
    if not area or area.district_id is None: raise HTTPException(422,'Choose a recorded barangay with a district.')
    districts = jurisdiction_ids(user)
    if districts and area.district_id not in districts: raise HTTPException(403,'The chosen barangay is outside your configured district scope.')
    if report.barangay_id == area.id: raise HTTPException(409,'This barangay is already recorded for routing.')
    previous = db.get(models.Barangay,report.barangay_id) if report.barangay_id else None
    report.barangay_id = area.id
    review._history(db,report,'report_routing_location',dict(policy=review.POLICY,location_confirmation=True,
        previous_barangay_id=previous.id if previous else None,previous_barangay_name=previous.name if previous else None,
        barangay_id=area.id,barangay_name=area.name,district_id=area.district_id,reason=payload.reason.strip()),user)
    db.commit()
    return dict(version=report.version,barangay_id=area.id,barangay_name=area.name,district_id=area.district_id)


@router.post('/{report_id}/assignment')
def assign_review(report_id:int,payload:Assignment,db:Session=Depends(get_db),user=Depends(get_current_user)):
    report = get_report(db,user,report_id,True)
    review.require_decision(db,user,report,'assign')
    command_integrity.check_version(report.version,payload.expected_version)
    if report.status in review.CLOSED: raise HTTPException(409,'Closed reports do not enter an active review queue.')
    if len(payload.reason.strip())<10: raise HTTPException(422,'Explain the assignment in at least 10 characters.')
    review.routing_area(db,report,persist=True)
    person = next((p for p in review.eligible(db,report,manual=True) if p.id == payload.assigned_to_id),None)
    if not person: raise HTTPException(422,'Choose an active reviewer authorized for the recorded district.')
    if report.review_assigned_to_id != person.id:
        review.assign(db,report,person,payload.reason.strip(),user)
    db.commit()
    return dict(version=report.version,**review.projection(db,report))


@router.post('/{report_id}/take')
def take_review(report_id:int,payload:TakeReview,db:Session=Depends(get_db),user=Depends(get_current_user)):
    report = get_report(db,user,report_id,True)
    review.require_decision(db,user,report,'assign')
    command_integrity.check_version(report.version,payload.expected_version)
    if report.status not in review.INTAKE | {'pending_approval','approved_internal'}: raise HTTPException(409,'Only reports in intake or approval review can be taken into My Work.')
    if report.review_assigned_to_id == user.id: raise HTTPException(409,'This report is already in your My Work.')
    area = review.routing_area(db,report)
    if not area or area.district_id is None: raise HTTPException(422,'Confirm the routing barangay before taking this report.')
    districts = jurisdiction_ids(user)
    if districts and area.district_id not in districts: raise HTTPException(403,'This report is outside your configured district scope.')
    reason = (payload.reason or '').strip()
    previous = report.review_assigned_to_id
    if previous and len(reason)<10: raise HTTPException(422,'Explain why you are taking this report from its current owner in at least 10 characters.')
    if not reason: reason = 'Self-assigned by an authorized report coordinator.'
    review.routing_area(db,report,persist=True)
    review.assign(db,report,user,reason,user,mode='self_take')
    if previous:
        db.add(models.Notification(official_id=previous,title='Report review reassigned',
            message=f'{report.ticket_id}: {user.full_name} took review ownership. The previous activity remains in the report history.',
            target_url=f'/gov/reports?reportId={report.id}'))
    db.commit()
    return dict(version=report.version,**review.projection(db,report))


@router.get('/{report_id}/peer-clerks')
def peer_clerks(report_id:int,db:Session=Depends(get_db),user=Depends(get_current_user)):
    report = get_report(db,user,report_id)
    _clerk_owner(db,user,report,'peer_transfer')
    return [dict(id=p.id,full_name=p.full_name,role=p.role) for p in review.eligible(db,report,manual=True)
            if p.role == user.role and p.id != user.id]


@router.post('/{report_id}/peer-transfer')
def peer_transfer(report_id:int,payload:Assignment,db:Session=Depends(get_db),user=Depends(get_current_user)):
    report = get_report(db,user,report_id,True)
    _clerk_owner(db,user,report,'peer_transfer')
    command_integrity.check_version(report.version,payload.expected_version)
    if len(payload.reason.strip())<10: raise HTTPException(422,'Explain the transfer in at least 10 characters.')
    review.routing_area(db,report,persist=True)
    person = next((p for p in review.eligible(db,report,manual=True) if p.id == payload.assigned_to_id and p.role == user.role and p.id != user.id),None)
    if not person: raise HTTPException(422,'Choose another active clerk authorized for this district.')
    review.assign(db,report,person,payload.reason.strip(),user,mode='peer_transfer')
    db.commit()
    return dict(version=report.version,**review.projection(db,report))


@router.post('/{report_id}/submit-engineering')
def submit_engineering(report_id:int,payload:IntakeHandoff,db:Session=Depends(get_db),user=Depends(get_current_user)):
    report = get_report(db,user,report_id,True)
    _handoff_owner(db,user,report)
    command_integrity.check_version(report.version,payload.expected_version)
    if report.status == 'needs_information': raise HTTPException(409,'Wait for the resident response before submitting intake to engineering.')
    if len(payload.reason.strip())<10: raise HTTPException(422,'Summarize the intake findings in at least 10 characters.')
    review.routing_area(db,report,persist=True)
    pool = [p for p in review.eligible(db,report,manual=True) if p.role in review.ENGINEER_ROLES]
    if not pool: raise HTTPException(409,'No eligible City Engineer is available in this district. Your assignment remains open; ask a coordinator to route it.')
    counts = Counter(owner for (owner,) in db.query(models.Report.review_assigned_to_id).filter(models.Report.status.in_(review.INTAKE),models.Report.review_assigned_to_id.in_([p.id for p in pool])).all())
    person = min(pool,key=lambda p:(counts[p.id],p.id))
    review.assign(db,report,person,payload.reason.strip(),user,mode='engineering_handoff')
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
