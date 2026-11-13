"""SAMPLE-only real HTTP review. External effects disabled; exact DB guard."""
import os
if os.getenv('PULSO_INTELLIGENCE_BROWSER_REVIEW')!='1':
    raise RuntimeError('This app requires the explicit isolated browser-review flag.')

from pathlib import Path
from typing import Literal
from contextlib import asynccontextmanager
from datetime import datetime,timezone
import sys

from sqlalchemy import text
from sqlalchemy.engine import make_url
from fastapi import Depends,HTTPException
from pydantic import BaseModel
from PIL import Image

from database import DATABASE_URL,SessionLocal,get_db
review_url=make_url(DATABASE_URL)
if (review_url.database!='pulso_test_intelligence_browser_20261106'
        or review_url.host not in {'localhost','127.0.0.1','::1'}
        or os.getenv('PULSO_TEST_DATABASE')!='1'):
    raise RuntimeError('Refusing to run this fixture outside its exact disposable database.')
if not os.getenv('JWT_SECRET_KEY') or len(os.environ['JWT_SECRET_KEY'])<40:
    raise RuntimeError('An isolated per-run signing key is required.')

import main
import auth
import models
import gemini_service
import report_receipts
import maps_service
import pair_analysis_jobs
import asset_inspection_router
from pair_image_analysis import VisualHints

ROOT=Path(__file__).resolve().parents[1]/'.pytest_cache'/'intelligence-browser'
UPLOADS=ROOT/'uploads'
REPORTS=UPLOADS/'reports'
REPORTS.mkdir(parents=True,exist_ok=True)
main.UPLOAD_DIR=str(REPORTS)
asset_inspection_router.EVIDENCE_ROOT=ROOT/'private_asset_inspections'
for route in main.app.routes:
    if getattr(route,'path',None) in {'/api/uploads','/uploads'}:
        route.app=main.PublicUploadFiles(directory=str(UPLOADS))

@asynccontextmanager
async def isolated_lifespan(_):
    yield  # Do not start map synchronization, notification or email workers.

main.app.router.lifespan_context=isolated_lifespan
gemini_service._client=None
gemini_service._SDK_READY=False
gemini_service.AI_DISABLED=False  # Only the explicitly injected SAMPLE worker can produce output.
report_receipts.send_report_gmail_notification=lambda *args,**kwargs:None

async def synthetic_address(*args,**kwargs):
    return 'SAMPLE test location — not a civic address'
maps_service.reverse_geocode=synthetic_address
app=main.app


def seed():
    from tests.postgis_support import reset_rows
    reset_rows()
    with SessionLocal() as db:
        db.add(models.District(id=3,name='SAMPLE integration district',code='SAMPLE'))
        db.flush()
        db.add(models.Barangay(id=171,name='Barangay 171',district_id=3))
        db.add_all([
            models.Official(id=1,full_name='SAMPLE Chief Reviewer',email='chief.integration@test.invalid',password_hash='no-password-login',role='city_engineer',is_active=True),
            models.Official(id=2,full_name='SAMPLE Available Validator',email='validator.integration@test.invalid',password_hash='no-password-login',role='dispatcher',is_active=True),
            models.Official(id=3,full_name='SAMPLE Intake Clerk',email='clerk.integration@test.invalid',password_hash='no-password-login',role='admin_clerk',is_active=True),
            models.Official(id=4,full_name='SAMPLE Field Recorder',email='inspector.integration@test.invalid',password_hash='no-password-login',role='project_engineer',is_active=True),
            models.Resident(id=101,full_name='SAMPLE Resident',email='resident.integration@test.invalid',password_hash='no-password-login',is_active=True,is_verified=True,barangay_id=171,district_id=3),
        ])
        db.execute(text("INSERT INTO city_boundaries(name,sector,geom) VALUES ('SAMPLE boundary','North',ST_Multi(ST_MakeEnvelope(121.0,14.70,121.09,14.80,4326)))"))
        db.commit()
    # Deliberately artificial pixels. Not a photo/object-matching benchmark.
    Image.new('RGB',(720,480),(100,130,140)).save(ROOT/'SAMPLE-input.png')
    print('Prepared SAMPLE accounts, boundary and media in the isolated intelligence-review target.')


class Actor(BaseModel):
    actor:Literal['resident','chief','validator','clerk','inspector']


@app.post('/api/_fixture/session')
def session(payload:Actor,db=Depends(get_db)):
    ids={'resident':101,'chief':1,'validator':2,'clerk':3,'inspector':4}
    kind=models.Resident if payload.actor=='resident' else models.Official
    user=db.get(kind,ids[payload.actor])
    if not user:
        raise HTTPException(409,'Seed this isolated fixture first.')
    return dict(access_token=auth.create_access_token({'sub':user.email,'sv':user.access_version or 0}),
        user=dict(id=user.id,full_name=user.full_name,email=user.email,role=user.role,phone_number='',barangay='Barangay 171'))


def chief(user=Depends(auth.get_current_user)):
    if not isinstance(user,models.Official) or user.id!=1:
        raise HTTPException(403,'This SAMPLE diagnostic requires the fixture chief.')
    return user


@app.get('/api/_fixture/state')
def state(db=Depends(get_db),_=Depends(chief)):
    reports=db.query(models.Report).order_by(models.Report.id).all()
    observations=db.query(models.ReportObservation).all()
    return dict(sample_only=True,reports=[dict(id=r.id,ticket_id=r.ticket_id,categories=r.categories,status=r.status,
        version=r.version,review_owner_id=r.review_assigned_to_id,assignment_mode=r.review_assignment_mode,
        accuracy_m=r.accuracy_m,latitude=r.location_lat,longitude=r.location_lng,location_metadata=r.location_metadata) for r in reports],
        report_count=len(reports),observation_count=len(observations),
        active_concern_count=len({row.concern_id for row in observations}),
        human_pair_reviews=db.query(models.ObservationPairReview).count(),
        field_assessments=[dict(id=row.id,observation_id=row.observation_id,revision=row.revision)
            for row in db.query(models.ObservationFieldAssessment).order_by(models.ObservationFieldAssessment.id)],
        membership_decisions=db.query(models.ConcernDecision).count(),
        image_jobs=[dict(id=row.id,status=row.status,attempts=row.attempts,failure_code=row.failure_code)
            for row in db.query(models.PairImageAnalysisJob).order_by(models.PairImageAnalysisJob.created_at)])


def synthetic_provider(*args,**kwargs):
    hints=VisualHints(source_usable=True,target_usable=True,asset_relation='uncertain',defect_relation='uncertain',
        visible_matches=[],visible_differences=[],limitations=['SAMPLE injected provider output. No real visual identification was performed.'])
    return dict(hints=hints.model_dump(),model_version='SAMPLE-injected-provider-v1',review_required=True,
        episode_identity='not_established_from_images',location_verified=False,training_release_eligible=False)


@app.post('/api/_fixture/process-one-image-job')
def worker(_=Depends(chief)):
    job_id=pair_analysis_jobs.run_one(SessionLocal,REPORTS,provider=synthetic_provider)
    return dict(processed_job_id=job_id,provider='SAMPLE injected adapter; no external API call')


if __name__=='__main__':
    if sys.argv[1:]!=['--seed']:
        raise SystemExit('Use the guarded review_report_intelligence.py launcher.')
    seed()
