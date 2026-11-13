"""Whole-observation private condition coverage, retaining unassessed categories."""
from collections import defaultdict
from hashlib import sha256

from fastapi import HTTPException
from sqlalchemy import func,select

import models
import report_learning as learning
import observation_field_assessments as assessments
from asset_evidence_store import MAX_EVIDENCE_BYTES
from government_access import scoped_reports
from learning_dataset_contract import canonical,iso
from observation_field_dataset_contract import seal,verify
from report_review_router import require_report_access

MAX_SCAN=10000
MAX_BYTES=32*1024*1024
MAX_EVIDENCE_SCAN_BYTES=64*1024*1024


class EvidenceChecks:
    """Read each selected private photo once; refuse an oversized byte scan."""
    def __init__(self):self.results={};self.bytes=0

    def __call__(self,evidence,root):
        if evidence is None:return False
        if evidence.id not in self.results:
            if type(evidence.byte_size) is not int or not 0<evidence.byte_size<=MAX_EVIDENCE_BYTES:
                self.results[evidence.id]=False
            else:
                if self.bytes+evidence.byte_size+1>MAX_EVIDENCE_SCAN_BYTES:
                    raise HTTPException(413,'Evidence scan exceeds its byte bound; no partial coverage audit is available.')
                self.bytes+=evidence.byte_size+1
                self.results[evidence.id]=assessments.file_available(evidence,root)
        return self.results[evidence.id]


def collect(db,user,root,max_observations=1000,report_id=None):
    learning.require_learning_access(user);assessments.require_access(user)
    if type(max_observations) is not int or not 1<=max_observations<=5000:
        raise HTTPException(422,'Choose 1 to 5000 observations.')
    if report_id is not None:
        if type(report_id) is not int or report_id<1:raise HTTPException(422,'Choose a positive report identifier.')
        selected=db.get(models.Report,report_id)
        if not selected:raise HTTPException(404,'Report not found.')
        require_report_access(db,user,selected)
    at=db.execute(select(func.statement_timestamp())).scalar_one()
    query=scoped_reports(db.query(models.Report),user)
    if report_id is not None:query=query.filter(models.Report.id==report_id)
    candidates=query.order_by(models.Report.id).limit(MAX_SCAN+1).all()
    reports=[]
    for report in candidates:
        try:require_report_access(db,user,report)
        except HTTPException as exc:
            if exc.status_code!=403:raise
            continue
        reports.append(report)
    if len(candidates)>MAX_SCAN:raise HTTPException(413,'Report scope exceeds the bounded coverage scan.')
    if len(reports)>MAX_SCAN:raise HTTPException(413,'Report scope exceeds the bounded coverage scan.')
    ids={r.id for r in reports}
    items=db.query(models.ReportObservation).filter(models.ReportObservation.report_id.in_(ids)).order_by(models.ReportObservation.id).limit(MAX_SCAN+1).all()
    if len(items)>MAX_SCAN:raise HTTPException(413,'Observation scope exceeds the bounded coverage scan.')
    records=db.query(models.ObservationFieldAssessment).filter(models.ObservationFieldAssessment.observation_id.in_([i.id for i in items]),
        models.ObservationFieldAssessment.created_at<=at).order_by(models.ObservationFieldAssessment.observation_id,
            models.ObservationFieldAssessment.revision).limit(MAX_SCAN+1).all()
    if len(records)>MAX_SCAN:raise HTTPException(413,'Assessment history exceeds the bounded coverage scan.')
    # The existing resolution helper reads this history, so bound it before use.
    if db.query(models.ReportResolutionEvent.id).filter(models.ReportResolutionEvent.report_id.in_(ids)).limit(MAX_SCAN+1).count()>MAX_SCAN:
        raise HTTPException(413,'Resolution history exceeds the bounded coverage scan.')
    _,valid=learning.resolution_sources(db,{r.id:r for r in reports},at)
    by_item=defaultdict(list)
    for record in records:by_item[record.observation_id].append(record)
    rows=[];size=0;check=EvidenceChecks()
    try:
        for item in items:
            try:
                report,current,concern=assessments.rows(db,user,item.report_id,item.id)
                # Authorize the entire history, including frozen areas, even when stale.
                scoped=assessments.scoped_history(db,user,current)
            except HTTPException as exc:
                if exc.status_code!=403:raise
                continue
            history=by_item[item.id]
            if [r.id for r in scoped]!=[r.id for r in reversed(history)]:
                raise ValueError('Assessment history clocks or completeness are inconsistent.')
            if len(rows)>=max_observations:raise HTTPException(413,'Complete coverage audit exceeds max_observations; increase the bound or narrow scope.')
            exported=[]
            for record in history:
                projected=assessments.projection(db,user,record,report,current,concern,root,at,evidence_check=check)
                exported.append(dict(id=record.id,revision=record.revision,actor_id=record.actor_id,recorded_at=iso(record.created_at),
                    field_observation_id=record.field_observation_id,category_findings=record.category_findings,
                    source_snapshot=record.snapshot,source_snapshot_sha256=sha256(canonical(record.snapshot)).hexdigest(),
                    current_context=projected['current_context'],context_blockers=projected['current_context_blockers']))
            event=valid.get(report.id)
            completion=dict(state='sourced_verified_report_resolution' if event else 'no_current_sourced_report_resolution',
                verified_at=iso(event.occurred_at) if event else None,event_id=event.id if event else None,
                source_kind=('work_order_inspection' if event.inspection_id else 'project_review') if event else None,
                source_id=(event.inspection_id or event.project_id) if event else None)
            row=dict(problem=assessments.source_problem(report,current,concern),assessment_revision=len(exported),
                assessments=exported,report_completion=completion)
            size+=len(canonical(row))
            if size>MAX_BYTES:raise HTTPException(413,'Coverage audit exceeds its byte bound.')
            rows.append(row)
        legacy=sorted(ids-{i.report_id for i in items})
        document=seal(rows,at,legacy_report_ids=legacy,selection_report_id=report_id);verify(document)
        if len(canonical(document))>MAX_BYTES:raise HTTPException(413,'Coverage audit exceeds its byte bound.')
        return document
    except (ValueError,KeyError,TypeError,OverflowError,AttributeError):
        raise HTTPException(409,'Condition coverage source needs correction; no partial export is available.') from None
