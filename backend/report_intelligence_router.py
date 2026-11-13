"""Permission-scoped concern matching; every identity decision is reviewable."""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user, get_optional_current_user
import models
import report_review as review
from report_review_router import get_report, require_report_access
from report_intelligence import report_context, candidate_reports
from observation_matching import PairDecision, pair_context, record_pair_review
from pair_analysis_jobs import AnalysisInput
from observation_field_assessments import AssessmentInput
import schemas

router = APIRouter(prefix='/api/report-intelligence', tags=['Report intelligence'])


@router.get('/intake-receipt', response_model=schemas.ReportResponse)
def intake_receipt(idempotency_key: str = Header(alias='Idempotency-Key'), db: Session = Depends(get_db), user=Depends(get_optional_current_user)):
    from report_intelligence import intake_scope_key, tracking_receipt
    report = db.query(models.Report).filter_by(intake_key_hash=intake_scope_key(user, idempotency_key)).first()
    if not report:
        raise HTTPException(404, 'No committed receipt is available yet; preserve the original operation for retry.')
    return tracking_receipt(report)


class LinkDecision(BaseModel):
    model_config = ConfigDict(extra='forbid')
    observation_id: int = Field(gt=0)
    target_observation_id: int | None = Field(default=None, gt=0)
    expected_version: int = Field(ge=1)
    expected_concern_version: int = Field(ge=1)
    expected_target_version: int | None = Field(default=None, ge=1)
    expected_target_concern_version: int | None = Field(default=None, ge=1)
    reason: str = Field(min_length=10, max_length=2000)


@router.get('/reports/{report_id}')
def context(report_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    report = db.get(models.Report, report_id)
    if not report:
        raise HTTPException(404, 'Report not found.')
    if isinstance(user, models.Resident):
        if user.id not in (report.resident_id, report.claimed_by_user_id):
            raise HTTPException(403, 'This is not your report.')
        result = report_context(db, report)
        # A resident's submission does not reveal another resident's data.
        return result
    require_report_access(db, user, report)
    from observation_field_assessments import can_view
    from report_screening import latest_assessment
    return {**report_context(db, report), 'candidates': candidate_reports(db, report, user),
            'screening': latest_assessment(db, report.id),
            'can_view_field_assessments': can_view(user),
            'can_review_pairs': review.permitted(user, 'review') and not user.invitation_pending,
            'staff_evidence': dict(report_id=report.id, ticket_id=report.ticket_id, photo_url=report.image_url,
                location_string=report.location_string, latitude=report.location_lat, longitude=report.location_lng,
                accuracy_m=report.accuracy_m, received_at=report.created_at,
                photo_source=(report.location_metadata or {}).get('photo_source','unknown'),
                photo_captured_at=(report.location_metadata or {}).get('photo_captured_at')),
            'report_version': report.version,
            'can_associate': report.status not in review.CLOSED and review.permitted(user, 'review') and (review.permitted(user, 'assign') or report.review_assigned_to_id == user.id),
            'candidate_search': {'maximum_radius_m': 500, 'maximum_results': 50, 'maximum_scanned_reports':201,
                'not_exhaustive':True, 'scope': 'bounded nearby accessible active reports with overlapping categories',
                'uncertainty_policy':'Source and target issue-position estimates expand retrieval only; not an identity tolerance.'},
            'matching_status': 'review_required', 'matching_method': 'uncertainty_spatial_category_candidates_v2'}


@router.post('/reports/{report_id}/association')
def associate(report_id: int, payload: LinkDecision, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if len(payload.reason.strip()) < 10:
        raise HTTPException(422, 'Explain the identity decision in at least ten characters.')
    target = db.get(models.ReportObservation, payload.target_observation_id) if payload.target_observation_id else None
    if payload.target_observation_id and not target:
        raise HTTPException(404, 'Target observation not found.')
    ids = sorted({report_id, target.report_id} if target else {report_id})
    reports = db.query(models.Report).filter(models.Report.id.in_(ids)).order_by(models.Report.id).with_for_update().all()
    report = next((r for r in reports if r.id == report_id), None)
    if not report:
        raise HTTPException(404, 'Report not found.')
    for source in reports:
        require_report_access(db, user, source)
        review.require_decision(db, user, source, 'review')
    if report.version != payload.expected_version:
        raise HTTPException(409, 'Report changed; refresh before deciding.')
    item = db.query(models.ReportObservation).filter_by(id=payload.observation_id, report_id=report_id).with_for_update().first()
    if not item:
        raise HTTPException(404, 'Observation not found on this report.')
    # Refresh after taking ordered report locks, including a potentially moved target.
    if target:
        db.refresh(target)
    concern_ids = sorted({item.concern_id, target.concern_id} if target else {item.concern_id})
    locked = {c.id: c for c in db.query(models.ReportConcern).filter(models.ReportConcern.id.in_(concern_ids)).order_by(models.ReportConcern.id).with_for_update().all()}
    concern = locked[item.concern_id]
    if concern.version != payload.expected_concern_version:
        raise HTTPException(409, 'Concern membership changed; refresh before deciding.')
    if target and (target.id == item.id or target.concern_id == item.concern_id):
        raise HTTPException(409, 'These observations already belong to this concern.')
    if target and (target.report.status in review.CLOSED or report.status in review.CLOSED or
                   concern.completed_at or locked[target.concern_id].completed_at):
        raise HTTPException(409, 'A completed episode needs an explicit recurrence/reopening review.')
    if target:
        destination = locked[target.concern_id]
        if target.report.version != payload.expected_target_version or destination.version != payload.expected_target_concern_version:
            raise HTTPException(409, 'Target report or concern changed; refresh both before deciding.')
    else:
        destination = models.ReportConcern(anchor_report_id=report.id)
        db.add(destination)
        db.flush()
    previous = item.concern_id
    item.concern_id = destination.id
    item.association_status = 'reviewer_confirmed' if target else 'reviewer_separated'
    concern.version += 1
    if target:
        destination.version += 1
    report.version += 1
    decision=models.ConcernDecision(observation_id=item.id, previous_concern_id=previous,
        concern_id=destination.id, actor_id=user.id, reason=payload.reason.strip())
    db.add(decision)
    review._history(db, report, 'concern_association', dict(observation_id=item.id,
        previous_concern_id=previous, concern_id=destination.id, reason=payload.reason.strip()), user)
    db.flush()
    from concern_checkpoints import capture
    for affected in (concern,destination):
        capture(db,affected,trigger_kind='association',trigger_report_id=report.id,decision_id=decision.id)
    db.commit()
    return dict(version=report.version, **report_context(db, report))


@router.get('/reports/{report_id}/observations/{observation_id}/pairs/{target_id}')
def observation_pair(report_id: int, observation_id: int, target_id: int,
                     db: Session = Depends(get_db), user=Depends(get_current_user)):
    from report_learning import read_snapshot
    with read_snapshot(db) as reader:
        return pair_context(reader, user, report_id, observation_id, target_id)


@router.post('/reports/{report_id}/observations/{observation_id}/pairs/{target_id}')
def review_observation_pair(report_id: int, observation_id: int, target_id: int, payload: PairDecision,
                            idempotency_key: str = Header(alias='Idempotency-Key'),
                            db: Session = Depends(get_db), user=Depends(get_current_user)):
    return record_pair_review(db, user, report_id, observation_id, target_id, payload, idempotency_key)


@router.post('/reports/{report_id}/observations/{observation_id}/pairs/{target_id}/analysis',status_code=202)
def request_pair_analysis(report_id: int,observation_id: int,target_id: int,payload: AnalysisInput,
                          idempotency_key: str=Header(alias='Idempotency-Key'),
                          db: Session=Depends(get_db),user=Depends(get_current_user)):
    import main
    from pair_analysis_jobs import enqueue
    return enqueue(db,user,report_id,observation_id,target_id,payload,idempotency_key,main.UPLOAD_DIR)


@router.get('/reports/{report_id}/observations/{observation_id}/pairs/{target_id}/analysis')
def pair_analysis_history(report_id: int,observation_id: int,target_id: int,
                          db: Session=Depends(get_db),user=Depends(get_current_user)):
    from pair_analysis_jobs import list_jobs
    from report_learning import read_snapshot
    with read_snapshot(db) as reader:
        return list_jobs(reader,user,report_id,observation_id,target_id)


@router.get('/reports/{report_id}/observations/{observation_id}/field-assessments')
def field_assessments(report_id:int,observation_id:int,db:Session=Depends(get_db),user=Depends(get_current_user)):
    import asset_inspection_router
    from fastapi.responses import JSONResponse
    from report_learning import read_snapshot
    from observation_field_assessments import history
    with read_snapshot(db) as reader:
        result=history(reader,user,report_id,observation_id,asset_inspection_router.EVIDENCE_ROOT)
    return JSONResponse(content=result,headers={'Cache-Control':'no-store','Pragma':'no-cache'})


@router.get('/reports/{report_id}/observations/{observation_id}/field-assessments/evidence/{field_id}')
def field_assessment_evidence(report_id:int,observation_id:int,field_id:str,
                             db:Session=Depends(get_db),user=Depends(get_current_user)):
    import asset_inspection_router
    from fastapi.responses import JSONResponse
    from report_learning import read_snapshot
    from observation_field_assessments import evidence_context
    with read_snapshot(db) as reader:
        result=evidence_context(reader,user,report_id,observation_id,field_id,asset_inspection_router.EVIDENCE_ROOT)
    return JSONResponse(content=result,headers={'Cache-Control':'no-store','Pragma':'no-cache'})


@router.get('/reports/{report_id}/observations/{observation_id}/field-assessments/sources')
def field_assessment_sources(report_id:int,observation_id:int,before_id:str|None=Query(default=None,max_length=36),
                              db:Session=Depends(get_db),user=Depends(get_current_user)):
    from fastapi.responses import JSONResponse
    from report_learning import read_snapshot
    from observation_field_assessments import sources
    with read_snapshot(db) as reader:
        result=sources(reader,user,report_id,observation_id,before_id)
    return JSONResponse(content=result,headers={'Cache-Control':'no-store','Pragma':'no-cache'})


@router.post('/reports/{report_id}/observations/{observation_id}/field-assessments')
def record_field_assessment(report_id:int,observation_id:int,payload:AssessmentInput,
                            idempotency_key:str=Header(alias='Idempotency-Key'),
                            db:Session=Depends(get_db),user=Depends(get_current_user)):
    import asset_inspection_router
    from fastapi.responses import JSONResponse
    from observation_field_assessments import record
    result=record(db,user,report_id,observation_id,payload,idempotency_key,asset_inspection_router.EVIDENCE_ROOT)
    return JSONResponse(content=result,headers={'Cache-Control':'no-store','Pragma':'no-cache'})
