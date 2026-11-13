"""Observed service-duration history, separate from prediction and repair time."""
from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
from statistics import median

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

import models
import gov_models as gm
from government_access import can, scoped_reports
from report_review_router import require_report_access

SUCCESS = {'resolved', 'closed_by_citizen'}
TERMINAL = SUCCESS | {'completed', 'closed', 'cancelled', 'rejected', 'duplicate', 'spam'}
NON_RESOLUTION = {'cancelled', 'rejected', 'duplicate', 'spam'}
SCHEMA = 'report-intake-features-v1'


def utc(value):
    return value.replace(tzinfo=timezone.utc) if value and value.tzinfo is None else value


def freeze_intake(db, report, items):
    metadata = report.location_metadata or {}
    db.add(models.ReportLearningSnapshot(report_id=report.id, schema_version=SCHEMA, received_at=report.created_at,
        features=dict(submitted_categories=list(report.categories or [report.category]),
            observation_categories={item.item_key:list(item.categories) for item in items},
            reported_barangay_id=report.barangay_id, location_source=metadata.get('source', 'unknown'),
            issue_accuracy_m=report.accuracy_m, photo_source=metadata.get('photo_source', 'unknown'),
            observation_count=len(items))))


def source_is_valid(db, event):
    if event.inspection_id:
        inspection = db.get(gm.WorkOrderInspection, event.inspection_id)
        work = db.get(gm.WorkOrder, inspection.work_order_id) if inspection else None
        return bool(inspection and inspection.passed and work and work.report_id == event.report_id
            and work.status in {'completed', 'resolved'} and inspection.inspector_id == event.actor_id)
    if event.project_id:
        project = db.get(gm.ProjectRequest, event.project_id)
        return bool(project and project.source_report_id == event.report_id and project.completion_reviewed_by_id
            and project.status in {'completed', 'closed_completion_certified', 'resolved'})
    return False


def record_transition(db, report, previous, timeline, resolution_evidence=None):
    if previous == report.status:
        return
    latest = db.query(models.ReportResolutionEvent).filter_by(report_id=report.id).order_by(models.ReportResolutionEvent.id.desc()).first()
    event = None
    if report.status == 'resolved' and resolution_evidence:
        kind, source_id = resolution_evidence
        event = models.ReportResolutionEvent(report_id=report.id, timeline_id=timeline.id, kind='verified',
            occurred_at=datetime.now(timezone.utc), actor_id=timeline.actor_id,
            inspection_id=source_id if kind == 'work_order_inspection' else None,
            project_id=source_id if kind == 'project_review' else None)
        if not source_is_valid(db, event):
            raise HTTPException(409, 'Resolution learning history needs a valid independent verification source.')
    elif latest and latest.kind == 'verified' and report.status not in SUCCESS:
        event = models.ReportResolutionEvent(report_id=report.id, timeline_id=timeline.id, kind='invalidated',
            occurred_at=datetime.now(timezone.utc), actor_id=timeline.actor_id)
    if event:
        db.add(event)


def require_learning_access(user):
    if (not isinstance(user, models.Official) or not user.is_active or user.is_suspended or user.invitation_pending
            or not can(user, 'insights') or not can(user, 'reports')):
        raise HTTPException(403, 'Active staff insights and report access are required.')


@contextmanager
def read_snapshot(db):
    # Auth has already read on its own session; use a separate read-only snapshot.
    with db.get_bind().connect().execution_options(isolation_level='REPEATABLE READ') as connection:
        connection.exec_driver_sql('SET TRANSACTION READ ONLY')
        with Session(bind=connection) as reader:
            yield reader


def resolution_sources(db,reports,as_of):
    """Authoritative event checks independent of mutable intake feature records."""
    events = db.query(models.ReportResolutionEvent).filter(models.ReportResolutionEvent.report_id.in_(reports)).order_by(models.ReportResolutionEvent.id).all()
    latest = {event.report_id:event for event in events}
    intervening = dict(db.query(gm.ProcessTimeline.report_id,func.max(gm.ProcessTimeline.id)).filter(
        gm.ProcessTimeline.report_id.in_(latest), gm.ProcessTimeline.id > min(e.timeline_id for e in latest.values()),
        gm.ProcessTimeline.work_order_id.is_(None), gm.ProcessTimeline.project_id.is_(None),
        gm.ProcessTimeline.previous_status.is_not(None), gm.ProcessTimeline.previous_status != gm.ProcessTimeline.status,
        gm.ProcessTimeline.status.notin_(SUCCESS)).group_by(gm.ProcessTimeline.report_id).all()) if latest else {}
    valid = {rid:event for rid,event in latest.items() if event.kind == 'verified'
        and utc(event.occurred_at) <= as_of and reports[rid].status in SUCCESS and source_is_valid(db, event)
        and intervening.get(rid,0) <= event.timeline_id}
    return events,valid


def concern_case(db, user, concern, as_of):
    items = db.query(models.ReportObservation).filter_by(concern_id=concern.id).order_by(models.ReportObservation.id).all()
    if not items:
        return None
    reports = {r.id:r for r in db.query(models.Report).filter(models.Report.id.in_({i.report_id for i in items})).all()}
    for report in reports.values():
        require_report_access(db, user, report)
    snapshots = {s.report_id:s for s in db.query(models.ReportLearningSnapshot).filter(models.ReportLearningSnapshot.report_id.in_(reports)).all()}
    received_times = {r.id:utc(snapshots[r.id].received_at if r.id in snapshots else r.created_at) for r in reports.values()}
    first = min(reports.values(), key=lambda r:(received_times[r.id] or as_of, r.id))
    received = min((value for value in received_times.values() if value), default=None)
    events,valid=resolution_sources(db,reports,as_of)
    state = ('verified_resolution' if len(valid) == len(reports) else
        'right_censored' if any(r.status not in TERMINAL for r in reports.values()) else
        'non_resolution_terminal' if any(r.status in NON_RESOLUTION for r in reports.values()) else 'unverified_terminal')
    verified_at = max((utc(e.occurred_at) for e in valid.values()), default=None) if state == 'verified_resolution' else None
    end = verified_at if verified_at else as_of if state == 'right_censored' else None
    elapsed = (end-received).total_seconds()/86400 if end and received else None
    if not received or any(value is None for value in received_times.values()) or (elapsed is not None and elapsed < 0):
        state, elapsed, verified_at = 'data_quality_error', None, None
    snapshot = snapshots.get(first.id)
    feature_items = [i for i in items if i.report_id == first.id]
    features = dict(snapshot.features) if snapshot else None
    if features is not None:
        # Restrict the frozen observation map to items currently in this concern.
        features['observation_categories'] = {i.item_key:features['observation_categories'].get(i.item_key) for i in feature_items}
    membership = [(i.id, i.report_id, i.item_key) for i in items]
    digest = hashlib.sha256(json.dumps(dict(concern_version=concern.version, members=membership,
        reports=[(r.id,r.version,r.status) for r in sorted(reports.values(),key=lambda r:r.id)],
        events=[e.id for e in events], valid_event_ids=sorted(e.id for e in valid.values())),sort_keys=True).encode()).hexdigest()
    return dict(concern_id=concern.public_id, concern_version=concern.version, membership_fingerprint=digest,
        report_ids=sorted(reports), report_count=len(reports), observation_count=len(items), first_received_at=received,
        outcome=dict(state=state, verified_at=verified_at, elapsed_days=elapsed, censored=state == 'right_censored',
            target='all_linked_reports_verified_resolution', sources=[dict(report_id=rid,event_id=e.id,timeline_id=e.timeline_id,
                inspection_id=e.inspection_id,project_id=e.project_id,verified_at=e.occurred_at) for rid,e in sorted(valid.items())],
            recorded_event_count=len(events)),
        intake=dict(status='recorded_at_intake' if snapshot else 'not_recorded_at_intake', report_id=first.id,
            schema_version=snapshot.schema_version if snapshot else None, available_at=snapshot.available_at if snapshot else None,
            features=features), as_of=as_of, model_status='not_a_prediction')


def case_page(db, user, after_id=0, limit=50):
    as_of = db.execute(select(func.statement_timestamp())).scalar_one()
    visible_report_ids = scoped_reports(db.query(models.Report.id),user)
    query = db.query(models.ReportConcern).filter(models.ReportConcern.id > after_id,
        models.ReportConcern.id.in_(db.query(models.ReportObservation.concern_id).filter(models.ReportObservation.report_id.in_(visible_report_ids))))
    candidates = query.order_by(models.ReportConcern.id).limit(limit+1).all()
    rows = []
    for concern in candidates[:limit]:
        try:
            result = concern_case(db,user,concern,as_of)
        except HTTPException as exc:
            if exc.status_code != 403:
                raise
            continue  # Never publish partial concern membership or hidden counts.
        if result:
            rows.append(result)
    completed = [r['outcome']['elapsed_days'] for r in rows if r['outcome']['state'] == 'verified_resolution']
    states = ('verified_resolution','right_censored','non_resolution_terminal','unverified_terminal','data_quality_error')
    return dict(items=rows, next_after_id=candidates[limit-1].id if len(candidates)>limit else None,
        as_of=as_of, page_summary=dict(concern_count=len(rows), completed_count=len(completed),
            right_censored_count=sum(r['outcome']['state']=='right_censored' for r in rows),
            state_counts={state:sum(r['outcome']['state']==state for r in rows) for state in states},
            completed_duration_median_days=median(completed) if completed else None,
            interpretation='Descriptive completed-case history on this page only; excludes open durations from the median, not from the dataset. Not an ETA.'),
        limitations='Current reviewed membership, not a historical membership replay. Group shared report IDs together for any future evaluation; do not use final counts or outcome sources as intake features.')


def observed_repair_intervals(db, asset_id, as_of):
    rows = db.query(gm.AssetFieldObservation).filter_by(asset_id=asset_id, review_status='accepted',
        identity_confirmed=True, location_reviewed=True, visibility='visible').filter(
        gm.AssetFieldObservation.observed_at <= as_of).join(gm.AssetInspectionEvidence,
        gm.AssetInspectionEvidence.id == gm.AssetFieldObservation.evidence_reference).filter(
        gm.AssetInspectionEvidence.asset_id == asset_id).order_by(
        gm.AssetFieldObservation.observed_at.desc(),gm.AssetFieldObservation.id.desc()).limit(1001).all()
    truncated = len(rows) > 1000
    rows = list(reversed(rows[:1000]))
    if truncated and rows:
        # A limit can cut a conflicting same-time group. Omit the boundary group.
        boundary = rows[0].observed_at
        rows = [r for r in rows if r.observed_at != boundary]
    groups = defaultdict(list)
    for row in rows:
        groups[utc(row.observed_at)].append(row)
    intervals, active, ambiguous = [], None, 0
    for observed_at, group in sorted(groups.items()):
        conditions = {r.condition for r in group} - {'not_assessed'}
        if len(conditions) > 1:
            active, ambiguous = None, ambiguous+1
            continue
        if 'defect_observed' in conditions:
            active = next(r for r in group if r.condition == 'defect_observed')
        elif 'no_defect_observed' in conditions and active:
            after = next(r for r in group if r.condition == 'no_defect_observed')
            intervals.append(dict(last_defect_observation_id=active.id, first_no_defect_observation_id=after.id,
                lower_bound_exclusive=active.observed_at, upper_bound_inclusive=after.observed_at,
                interval_days=(utc(after.observed_at)-utc(active.observed_at)).total_seconds()/86400,
                target='observed_defect_absence_interval', exact_repair_time=None))
            active = None
    return dict(asset_id=asset_id, intervals=intervals, open_defect_observation_id=active.id if active else None,
        ambiguous_time_groups=ambiguous, predicted_days=None, as_of=as_of,
        history_truncated=truncated, maximum_observations=1000,
        interpretation='Reviewed observations bound a change in visible condition. Repair cause, responsible agency and exact repair time are unknown; this is not official service-duration data.')
