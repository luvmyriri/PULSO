"""Authorized read-only learning history; estimates remain unreleased."""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response,JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from government_access import can, require_asset_scope
import gov_models as gm
import models
import report_learning as learning
import report_learning_export
from learning_dataset_contract import canonical

router = APIRouter(prefix='/api/gov/report-learning', tags=['Report learning history'])


@router.get('/observation-field-dataset')
def observation_field_dataset(max_observations:int=Query(default=1000,ge=1,le=5000),
                              report_id:int|None=Query(default=None,ge=1),
                              db:Session=Depends(get_db),user=Depends(get_current_user)):
    import asset_inspection_router
    import observation_field_dataset_export
    learning.require_learning_access(user)
    with learning.read_snapshot(db) as reader:
        document=observation_field_dataset_export.collect(reader,user,asset_inspection_router.EVIDENCE_ROOT,max_observations,report_id)
    digest=document['manifest']['export_sha256']
    return Response(content=canonical(document),media_type='application/json',headers={
        'Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff',
        'Content-Disposition':f'attachment; filename="pulso-observation-fields-{digest[:16]}.json"'})


@router.get('/matching-dataset')
def matching_dataset(max_reviews: int = Query(default=1000, ge=1, le=5000),
                     db: Session = Depends(get_db), user=Depends(get_current_user)):
    import matching_dataset_export
    learning.require_learning_access(user)
    with learning.read_snapshot(db) as reader:
        document = matching_dataset_export.collect(reader, user, max_reviews)
    digest = document['manifest']['export_sha256']
    return Response(content=canonical(document), media_type='application/json', headers={
        'Cache-Control':'no-store', 'Pragma':'no-cache',
        'Content-Disposition':f'attachment; filename="pulso-matching-{digest[:16]}.json"',
        'X-Content-Type-Options':'nosniff'})


@router.get('/checkpoint-dataset')
def checkpoint_dataset(max_checkpoints:int=Query(default=1000,ge=1,le=5000),
                       db:Session=Depends(get_db),user=Depends(get_current_user)):
    import checkpoint_dataset_export
    learning.require_learning_access(user)
    with learning.read_snapshot(db) as reader:
        document=checkpoint_dataset_export.collect(reader,user,max_checkpoints)
    digest=document['manifest']['export_sha256']
    return Response(content=canonical(document),media_type='application/json',headers={
        'Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff',
        'Content-Disposition':f'attachment; filename="pulso-checkpoints-{digest[:16]}.json"'})


@router.get('/dataset')
def dataset(max_cases: int = Query(default=1000, ge=1, le=5000),
            db: Session = Depends(get_db), user=Depends(get_current_user)):
    learning.require_learning_access(user)
    with learning.read_snapshot(db) as reader:
        document = report_learning_export.collect(reader, user, max_cases)
    digest = document['manifest']['export_sha256']
    return Response(content=canonical(document), media_type='application/json', headers={
        'Cache-Control':'no-store', 'Pragma':'no-cache',
        'Content-Disposition':f'attachment; filename="pulso-learning-{digest[:16]}.json"',
        'X-Content-Type-Options':'nosniff'})


@router.get('/cases')
def cases(after_id: int = Query(default=0, ge=0), limit: int = Query(default=50, ge=1, le=100),
          db: Session = Depends(get_db), user=Depends(get_current_user)):
    learning.require_learning_access(user)
    with learning.read_snapshot(db) as reader:
        return learning.case_page(reader,user,after_id,limit)


@router.get('/cases/{concern_id}')
def case(concern_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    learning.require_learning_access(user)
    with learning.read_snapshot(db) as reader:
        concern = reader.query(models.ReportConcern).filter_by(public_id=concern_id).first()
        if not concern:
            raise HTTPException(404, 'Concern not found.')
        as_of = reader.execute(select(func.statement_timestamp())).scalar_one()
        result = learning.concern_case(reader,user,concern,as_of)
        if not result:
            raise HTTPException(404, 'This concern has no current observations.')
        return result


@router.get('/cases/{concern_id}/prediction-checkpoints')
def prediction_checkpoints(concern_id:str,limit:int=Query(default=20,ge=1,le=100),
                           db:Session=Depends(get_db),user=Depends(get_current_user)):
    learning.require_learning_access(user)
    from concern_checkpoints import history
    with learning.read_snapshot(db) as reader:
        concern=reader.query(models.ReportConcern).filter_by(public_id=concern_id).first()
        if not concern:
            raise HTTPException(404,'Concern not found.')
        result=history(reader,user,concern,limit)
    return JSONResponse(content=result,headers={'Cache-Control':'no-store','Pragma':'no-cache'})


@router.get('/observed-repair-intervals')
def repair_intervals(asset_id: str = Query(min_length=1, max_length=100),
                     db: Session = Depends(get_db), user=Depends(get_current_user)):
    learning.require_learning_access(user)
    if not can(user,'maintenance','view'):
        raise HTTPException(403,'Maintenance view access is required.')
    with learning.read_snapshot(db) as reader:
        asset = reader.get(gm.InfrastructureAsset,asset_id)
        if not asset:
            raise HTTPException(404,'Infrastructure record not found.')
        require_asset_scope(reader,user,asset)
        as_of = reader.execute(select(func.statement_timestamp())).scalar_one()
        return learning.observed_repair_intervals(reader,asset_id,as_of)
