"""Database-backed visual assistance; intake and reviewer labels are independent."""
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import os
import re
from uuid import uuid4

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, StrictBool, model_validator
from sqlalchemy import func, select, text

import models
import report_review as review
from command_integrity import request_hash, validate_key
from observation_matching import pair_rows, pair_snapshot, require_reviewer
from pair_image_analysis import AnalysisUnavailable, IMAGE_RECIPE, PROMPT_VERSION, prepare_report_image, compare_images
from public_reports import PUBLIC_CATEGORIES


class AnalysisInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_version: int = Field(ge=1, strict=True)
    expected_target_version: int = Field(ge=1, strict=True)
    expected_concern_version: int = Field(ge=1, strict=True)
    expected_target_concern_version: int = Field(ge=1, strict=True)
    photos_reviewed_for_provider: StrictBool

    @model_validator(mode='after')
    def photos_need_review(self):
        if not self.photos_reviewed_for_provider:
            raise ValueError('Review both photos for provider disclosure before requesting analysis.')
        return self


def enabled():
    return os.getenv('PULSO_PAIR_ANALYSIS_ENABLED','false').lower()=='true'


def clock(db):
    return db.execute(select(func.clock_timestamp())).scalar_one()


def images_for(source, target, reports, root):
    left, right = sorted((source,target),key=lambda item:item.id)
    return [prepare_report_image(root,reports[item.report_id].image_url) for item in (left,right)]


def hashes(images):
    return [{key:image[key] for key in ('original_sha256','prepared_sha256')} for image in images]


def project(job, snapshot, as_of):
    return dict(id=job.id,status=job.status,created_at=job.created_at,finished_at=job.finished_at,
        image_a_observation_id=job.left_observation_id,image_b_observation_id=job.right_observation_id,
        model=job.model,prompt_version=job.prompt_version,image_recipe=job.image_recipe,
        image_hashes=job.image_hashes,context_current=job.snapshot==snapshot,
        provider_call_may_have_started=job.dispatched_at is not None,
        lease_expires_at=job.lease_until,
        lease_expired=bool(job.status=='running' and job.lease_until and job.lease_until<as_of),
        result=job.result,failure_code=job.failure_code,review_required=True,
        membership_changed=False,training_release_eligible=False)


def enqueue(db,user,report_id,observation_id,target_id,payload,key,root):
    require_reviewer(user)
    if not validate_key(key):
        raise HTTPException(422,'An Idempotency-Key is required for visual analysis.')
    source,target,reports,concerns = pair_rows(db,user,report_id,observation_id,target_id,lock=True)
    left,right = sorted((source.id,target.id))
    command_hash = sha256(f'pair-analysis:{user.id}:{left}:{right}:{key}'.encode()).hexdigest()
    digest = request_hash(dict(source_id=source.id,target_id=target.id,**payload.model_dump()))
    snapshot = pair_snapshot(source,target,reports,concerns)
    previous = db.query(models.PairImageAnalysisJob).filter_by(command_hash=command_hash).first()
    if previous:
        if previous.payload_hash!=digest:
            raise HTTPException(409,'This analysis key was used with different input.')
        return project(previous,snapshot,clock(db))
    if not enabled():
        raise HTTPException(503,'Visual comparison is not enabled. Manual comparison remains available.')
    active = db.query(models.PairImageAnalysisJob).filter_by(left_observation_id=left,right_observation_id=right).filter(
        models.PairImageAnalysisJob.status.in_(['queued','running'])).first()
    if active:
        raise HTTPException(409,dict(next_action='Inspect the existing queued comparison before requesting another.',job_id=active.id))
    db.execute(text('SELECT pg_advisory_xact_lock(86173335)'))
    if db.query(models.PairImageAnalysisJob).filter(models.PairImageAnalysisJob.status.in_(['queued','running'])).count()>=200:
        raise HTTPException(429,'Visual comparison queue is full. Manual comparison remains available.')
    a,b = reports[source.report_id],reports[target.report_id]
    if (a.version!=payload.expected_version or b.version!=payload.expected_target_version or
            concerns[source.concern_id].version!=payload.expected_concern_version or
            concerns[target.concern_id].version!=payload.expected_target_concern_version):
        raise HTTPException(409,'Evidence changed. Refresh both observations before requesting analysis.')
    try:
        images = images_for(source,target,reports,root)
    except AnalysisUnavailable as error:
        raise HTTPException(422,dict(code=error.code,next_action='Check both recorded photos. Manual comparison remains available.')) from None
    import gemini_service
    model = os.getenv('PULSO_PAIR_ANALYSIS_MODEL') or gemini_service.GEMINI_MODEL
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}',model):
        raise HTTPException(503,'The configured comparison model needs operator review.')
    job = models.PairImageAnalysisJob(left_observation_id=left,right_observation_id=right,requested_by_id=user.id,
        command_hash=command_hash,payload_hash=digest,snapshot=snapshot,image_hashes=hashes(images),
        categories={side:[category for category in item.categories if category in PUBLIC_CATEGORIES]
            for side,item in zip(('image_a','image_b'),sorted((source,target),key=lambda item:item.id))},
        model=model,
        prompt_version=PROMPT_VERSION,image_recipe=IMAGE_RECIPE,status='queued',attempts=0)
    db.add(job);db.flush()
    review._history(db,a,'pair_image_analysis_queued',dict(job_id=job.id,observation_ids=[left,right],
        provider='configured_google_gemini',photos_reviewed_for_provider=True),user)
    db.commit()
    return project(job,snapshot,clock(db))


def list_jobs(db,user,report_id,observation_id,target_id):
    require_reviewer(user)
    source,target,reports,concerns = pair_rows(db,user,report_id,observation_id,target_id)
    left,right = sorted((source.id,target.id))
    rows = db.query(models.PairImageAnalysisJob).filter_by(left_observation_id=left,right_observation_id=right).order_by(
        models.PairImageAnalysisJob.created_at.desc(),models.PairImageAnalysisJob.id).limit(10).all()
    snapshot = pair_snapshot(source,target,reports,concerns)
    as_of = clock(db)
    available=enabled()
    permitted=True
    for report in reports.values():
        try:
            review.require_decision(db,user,report,'review')
        except HTTPException as error:
            if error.status_code!=403:
                raise
            permitted=False
    photos=all(report.image_url for report in reports.values())
    active=any(row.status in {'queued','running'} for row in rows)
    block=('Image assistance is disabled. Manual comparison remains available.' if not available else
        'Review ownership of both reports is required.' if not permitted else
        'Both reports need recorded photos.' if not photos else
        'An analysis is already queued or running. Check its progress before requesting another.' if active else None)
    return dict(enabled=enabled(),provider='configured_google_gemini',maximum_results=10,
        can_request=block is None,request_block_reason=block,
        jobs=[project(row,snapshot,as_of) for row in rows],
        limitation='AI visual hints do not establish asset, incident or exact location identity. Manual review remains authoritative.')


def claim(sessions):
    with sessions() as db:
        now = clock(db)
        # A crashed worker may have sent images. Never automatically resend them.
        db.query(models.PairImageAnalysisJob).filter(models.PairImageAnalysisJob.status=='running',
            models.PairImageAnalysisJob.lease_until<now).update(dict(status='failed',failure_code='worker_interrupted_outcome_unknown',
                finished_at=now,lease_token=None,lease_until=None),synchronize_session=False)
        job = db.query(models.PairImageAnalysisJob).filter_by(status='queued').order_by(
            models.PairImageAnalysisJob.created_at,models.PairImageAnalysisJob.id).with_for_update(skip_locked=True).first()
        if not job:
            db.commit();return None
        job.status='running';job.lease_token=str(uuid4());job.lease_until=now+timedelta(seconds=120)
        value=(job.id,job.lease_token)
        db.commit();return value


def current_inputs(db,job,root):
    user = db.get(models.Official,job.requested_by_id)
    require_reviewer(user)
    source = db.get(models.ReportObservation,job.left_observation_id)
    a,b,reports,concerns = pair_rows(db,user,source.report_id,job.left_observation_id,job.right_observation_id)
    for report in reports.values():
        review.require_decision(db,user,report,'review')
    if pair_snapshot(a,b,reports,concerns)!=job.snapshot:
        raise AnalysisUnavailable('evidence_context_changed')
    images = images_for(a,b,reports,root)
    if hashes(images)!=job.image_hashes:
        raise AnalysisUnavailable('photo_bytes_changed')
    return images


def finish(sessions,job_id,lease,status,*,result=None,code=None):
    with sessions() as db:
        job = db.query(models.PairImageAnalysisJob).filter_by(id=job_id,status='running',lease_token=lease).with_for_update().first()
        if not job:
            return False
        if job.lease_until is None or job.lease_until<clock(db):
            status,result,code='failed',None,'worker_interrupted_outcome_unknown'
        job.status=status;job.result=result;job.failure_code=code;job.finished_at=clock(db)
        job.lease_until=None;job.lease_token=None
        db.commit();return True


def run_one(sessions,root,*,provider=compare_images):
    claimed = claim(sessions)
    if not claimed:
        return None
    job_id,lease = claimed
    try:
        if not enabled():
            raise AnalysisUnavailable('deployment_disabled')
        import gemini_service
        if gemini_service.AI_DISABLED:
            raise AnalysisUnavailable('deployment_disabled')
        if provider is compare_images and (not gemini_service._SDK_READY or gemini_service._client is None):
            raise AnalysisUnavailable('provider_not_configured')
        with sessions() as db:
            job = db.get(models.PairImageAnalysisJob,job_id)
            if job.prompt_version!=PROMPT_VERSION or job.image_recipe!=IMAGE_RECIPE:
                raise AnalysisUnavailable('unsupported_job_version')
            images = current_inputs(db,job,root)
            # Global DB budget serializes reservations across processes and workers.
            db.execute(text('SELECT pg_advisory_xact_lock(86173334)'))
            now = clock(db)
            try:
                cap = int(os.getenv('PULSO_PAIR_ANALYSIS_DAILY_CAP','20'))
            except ValueError:
                raise AnalysisUnavailable('invalid_budget_configuration') from None
            if not 0<=cap<=200:
                raise AnalysisUnavailable('invalid_budget_configuration')
            used = db.query(models.PairImageAnalysisJob).filter(models.PairImageAnalysisJob.dispatched_at>=now.astimezone(timezone.utc).replace(
                hour=0,minute=0,second=0,microsecond=0)).count()
            if used>=cap:
                raise AnalysisUnavailable('daily_pair_budget_exhausted')
            # Lease ownership is rechecked before reserving any external call.
            db.refresh(job,with_for_update=True)
            if job.status!='running' or job.lease_token!=lease or job.lease_until<now:
                raise AnalysisUnavailable('worker_lease_lost')
            job.attempts=1;job.dispatched_at=now
            model,actor_id,categories = job.model,job.requested_by_id,job.categories
            db.commit()  # Never hold report/DB locks while waiting for a provider.
        result = provider(images[0],images[1],categories,model=model,actor_id=actor_id)
        # Neither stale evidence nor revoked access becomes current advice on return.
        with sessions() as db:
            current_inputs(db,db.get(models.PairImageAnalysisJob,job_id),root)
        finish(sessions,job_id,lease,'completed',result=result)
    except HTTPException:
        finish(sessions,job_id,lease,'cancelled',code='review_access_changed')
    except AnalysisUnavailable as error:
        finish(sessions,job_id,lease,'failed',code=error.code)
    except Exception:
        finish(sessions,job_id,lease,'failed',code='worker_failed_outcome_unknown')
    return job_id
