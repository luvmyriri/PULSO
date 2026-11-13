"""Freeze actual server-known membership and features, without model inference."""
from collections import Counter
from copy import deepcopy
from hashlib import sha256

from fastapi import HTTPException
from sqlalchemy import func,select

import models
from learning_dataset_contract import canonical,iso,project_features,CATEGORY_LABELS
from report_review_router import require_report_access
from report_learning import TERMINAL,SUCCESS

SCHEMA='concern-prediction-checkpoint-v1'
ASSOCIATIONS={'unreviewed','reviewer_confirmed','reviewer_separated'}
MAX_OBSERVATIONS=1000


def capture(db,concern,*,trigger_kind,trigger_report_id,decision_id=None):
    # Caller holds the new concern or its ordered concern lock. No separate commit.
    db.flush()
    query=db.query(models.ReportObservation).filter_by(concern_id=concern.id)
    count=query.count()
    if count>MAX_OBSERVATIONS:
        # Keep reporting operational at large volumes without pretending a
        # truncated roster is a complete prediction population or access scope.
        captured_at=db.execute(select(func.clock_timestamp())).scalar_one()
        report_count=db.query(func.count(func.distinct(models.ReportObservation.report_id))).filter(models.ReportObservation.concern_id==concern.id).scalar()
        payload=dict(schema_version=SCHEMA,concern_public_id=concern.public_id,concern_version=concern.version,
            captured_at=iso(captured_at),prediction_clock='server_capture_before_command_commit',trigger_kind=trigger_kind,
            trigger_report_id=trigger_report_id,decision_id=decision_id,lineage_complete=False,memberships=[],sources=[],
            features=dict(report_count=report_count,observation_count=count,concern_categories=None,association_counts=None,first_received_at=None),
            feature_status='incomplete',feature_blockers=['case_size_exceeds_checkpoint_bound'],training_release_eligible=False)
        return store(db,concern,trigger_kind,trigger_report_id,decision_id,captured_at,payload)
    items=query.order_by(models.ReportObservation.id).all()
    if not items:
        return None  # An emptied concern has no prospective prediction population.
    ids=sorted({item.report_id for item in items})
    reports={row.id:row for row in db.query(models.Report).filter(models.Report.id.in_(ids)).all()}
    snapshots={row.report_id:row for row in db.query(models.ReportLearningSnapshot).filter(models.ReportLearningSnapshot.report_id.in_(ids)).all()}
    captured_at=db.execute(select(func.clock_timestamp())).scalar_one()
    sources,blockers=[],set()
    for rid in ids:
        report,snapshot=reports[rid],snapshots.get(rid)
        features=None
        if snapshot is None:
            blockers.add('original_intake_snapshot_missing')
        elif snapshot.schema_version!='report-intake-features-v1':
            blockers.add('unsupported_intake_schema')
        elif snapshot.available_at is None or snapshot.available_at>captured_at or snapshot.received_at>captured_at:
            blockers.add('intake_time_unavailable_or_after_checkpoint')
        else:
            try:
                features=deepcopy(project_features(snapshot.features))
            except (ValueError,TypeError,KeyError):
                blockers.add('unsupported_or_invalid_intake_features')
        sources.append(dict(report_id=rid,report_version=report.version,
            terminal_at_checkpoint=report.status in TERMINAL,successful_status_at_checkpoint=report.status in SUCCESS,
            intake_schema=snapshot.schema_version if snapshot else None,
            received_at=iso(snapshot.received_at) if snapshot else None,
            intake_available_at=iso(snapshot.available_at) if snapshot else None,intake_features=features))
    categories_valid=all(isinstance(item.categories,list) and all(isinstance(c,str) for c in item.categories) for item in items)
    labels={category for item in items for category in item.categories} if categories_valid else set()
    if not categories_valid or not labels or not labels<=CATEGORY_LABELS:
        blockers.add('unsupported_concern_categories')
    associations=Counter(item.association_status for item in items)
    if set(associations)-ASSOCIATIONS:
        blockers.add('unsupported_association_state')
    # Compare actual timestamps; serialized offsets need not sort chronologically.
    first=min((snapshot.received_at for snapshot in snapshots.values()),default=None) if len(snapshots)==len(ids) else None
    payload=dict(schema_version=SCHEMA,concern_public_id=concern.public_id,concern_version=concern.version,
        captured_at=iso(captured_at),prediction_clock='server_capture_before_command_commit',
        trigger_kind=trigger_kind,trigger_report_id=trigger_report_id,decision_id=decision_id,
        lineage_complete=True,
        memberships=[dict(observation_id=item.id,report_id=item.report_id) for item in items],
        sources=sources,features=dict(report_count=len(ids),observation_count=len(items),
            concern_categories=sorted(labels) if categories_valid and labels and labels<=CATEGORY_LABELS else None,
            association_counts={name:associations[name] for name in sorted(ASSOCIATIONS)},first_received_at=iso(first)),
        feature_status='complete' if not blockers else 'incomplete',feature_blockers=sorted(blockers),
        training_release_eligible=False)
    return store(db,concern,trigger_kind,trigger_report_id,decision_id,captured_at,payload)


def store(db,concern,trigger_kind,trigger_report_id,decision_id,captured_at,payload):
    row=models.ConcernLearningCheckpoint(concern_id=concern.id,concern_version=concern.version,
        trigger_kind=trigger_kind,trigger_report_id=trigger_report_id,decision_id=decision_id,captured_at=captured_at,
        payload=payload,payload_sha256=sha256(canonical(payload)).hexdigest())
    db.add(row)
    return row


def history(db,user,concern,limit=20):
    current_ids=[rid for rid, in db.query(models.ReportObservation.report_id).filter_by(concern_id=concern.id).distinct().limit(MAX_OBSERVATIONS+1).all()]
    if len(current_ids)>MAX_OBSERVATIONS:
        raise HTTPException(409,'Checkpoint history cannot be returned within its access and size bounds.')
    current_reports=db.query(models.Report).filter(models.Report.id.in_(current_ids)).all()
    for report in current_reports:
        require_report_access(db,user,report)
    rows=db.query(models.ConcernLearningCheckpoint).filter_by(concern_id=concern.id).order_by(
        models.ConcernLearningCheckpoint.concern_version.desc()).limit(limit).all()
    result=[]
    for row in rows:
        if not row.payload.get('lineage_complete'):
            continue  # An unrecorded roster cannot support a historical scope check.
        ids={source['report_id'] for source in row.payload['sources']}|{row.trigger_report_id}
        reports=db.query(models.Report).filter(models.Report.id.in_(ids)).all()
        if len(reports)!=len(ids):
            raise HTTPException(409,'Checkpoint lineage is unavailable; no partial history can be returned.')
        try:
            for report in reports:
                require_report_access(db,user,report)
        except HTTPException as error:
            if error.status_code!=403:
                raise
            continue  # Never expose partial frozen membership or skipped counts.
        if sha256(canonical(row.payload)).hexdigest()!=row.payload_sha256:
            raise HTTPException(409,'Checkpoint integrity check failed.')
        result.append(dict(id=row.id,payload=row.payload,payload_sha256=row.payload_sha256,
            membership_current=concern.version==row.concern_version))
    if not current_reports and not result:
        raise HTTPException(404,'No accessible checkpoint history was found.')
    return dict(items=result,maximum_results=limit,bounded_history=True,
        coverage='bounded_whole_authorized_checkpoints_not_exhaustive',model_status='not_a_prediction',training_release_eligible=False)
