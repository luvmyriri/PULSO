"""Scoped frozen-population outcome audit; no fitting, backfill or forecasts."""
from collections import Counter
from hashlib import sha256

from fastapi import HTTPException
from sqlalchemy import func,select

import models
import gov_models as gm
import report_learning as learning
from report_review import INTAKE
from concern_checkpoints import SCHEMA as CHECKPOINT_SCHEMA,MAX_OBSERVATIONS
from government_access import can,scoped_reports,scoped_assets
from report_review_router import require_report_access
from learning_dataset_contract import canonical,iso,timestamp,project_features,FEATURE_NAMES
from checkpoint_dataset_contract import TARGET,seal,verify,verify_features

MAX_SCAN=10000
MAX_REPORTS=10000
MAX_BYTES=32*1024*1024
KNOWN_OPEN=INTAKE|{'pending_approval','approved_internal','approved_for_action','dispatched','in_progress'}


def project(payload,report_ids,observation_ids,at,areas):
    if payload.get('feature_status')!='complete':return None
    frozen=payload['features'];sources=payload['sources']
    if frozen['report_count']!=len(report_ids) or frozen['observation_count']!=len(observation_ids):
        raise ValueError('Frozen population counts disagree.')
    locations=Counter();photos=Counter();radii=[]
    for source in sources:
        original=source['intake_features']
        if not isinstance(original,dict) or set(original)!=set(FEATURE_NAMES):raise ValueError('Invalid original predictor fields.')
        checked=project_features(dict(submitted_categories=original['submitted_categories'],observation_categories={'source':original['concern_categories']},
            reported_barangay_id=original['reported_barangay_id'],observation_count=original['initial_observation_count'],
            location_source=original['location_source'],issue_accuracy_m=original['issue_accuracy_m'],photo_source=original['photo_source']))
        if checked!=original or any(timestamp(source[k])>at for k in ('received_at','intake_available_at')):
            raise ValueError('Invalid original predictor timing or structure.')
        locations[original['location_source']]+=1;photos[original['photo_source']]+=1
        if original['issue_accuracy_m'] is not None:radii.append(original['issue_accuracy_m'])
    first=timestamp(frozen['first_received_at'])
    associations=frozen['association_counts']
    features=dict(concern_categories=frozen['concern_categories'],report_count=frozen['report_count'],observation_count=frozen['observation_count'],
        unreviewed_observation_count=associations['unreviewed'],reviewer_confirmed_observation_count=associations['reviewer_confirmed'],
        reviewer_separated_observation_count=associations['reviewer_separated'],elapsed_before_checkpoint_days=(at-first).total_seconds()/86400,
        reported_barangay_ids=areas,original_location_source_counts={k:locations[k] for k in ('device','manual','search','uploaded_metadata','unknown')},
        original_photo_source_counts={k:photos[k] for k in ('camera','upload','unknown')},original_issue_accuracy_known_count=len(radii),
        original_issue_accuracy_max_m=max(radii) if radii else None)
    verify_features(features,dict(report_ids=report_ids,observation_ids=observation_ids,recorded_barangay_ids=areas))
    return features


class Reader:
    def __init__(self,db,user,as_of):
        self.db,self.user,self.as_of=db,user,as_of
        self.reports={};self.access={};self.contexts={};self.cases={}

    def authorize(self,ids):
        unknown=set(ids)-set(self.reports)
        if len(set(self.reports)|set(ids))>MAX_REPORTS:
            raise HTTPException(413,'Cohort exceeds the bounded lineage scan; narrow the authorized scope.')
        if unknown:
            self.reports.update({r.id:r for r in self.db.query(models.Report).filter(models.Report.id.in_(unknown)).all()})
        if any(rid not in self.reports for rid in ids):raise ValueError('Missing checkpoint report lineage.')
        allowed=True
        for rid in ids:
            if rid not in self.access:
                try:require_report_access(self.db,self.user,self.reports[rid]);self.access[rid]=True
                except HTTPException as error:
                    if error.status_code!=403:raise
                    self.access[rid]=False
            allowed=allowed and self.access[rid]
        return allowed

    def context(self,concern_id):
        if concern_id not in self.contexts:
            concern=self.db.get(models.ReportConcern,concern_id)
            if not concern:raise ValueError('Missing concern lineage.')
            members=self.db.query(models.ReportObservation.id,models.ReportObservation.report_id).filter_by(concern_id=concern_id).order_by(models.ReportObservation.id).limit(MAX_OBSERVATIONS+1).all()
            if len(members)>MAX_OBSERVATIONS:raise HTTPException(413,'A concern exceeds the bounded cohort lineage scan.')
            allowed=self.authorize({rid for _,rid in members})
            self.contexts[concern_id]=(concern,list(members),allowed)
        return self.contexts[concern_id]

    def row(self,checkpoint):
        payload=checkpoint.payload
        if sha256(canonical(payload)).hexdigest()!=checkpoint.payload_sha256:raise ValueError('Checkpoint integrity failed.')
        if not payload.get('lineage_complete'):return None
        at=timestamp(checkpoint.captured_at)
        if (payload['schema_version']!=CHECKPOINT_SCHEMA or payload['training_release_eligible'] is not False or
            timestamp(payload['captured_at'])!=at or payload['concern_version']!=checkpoint.concern_version or
            payload['trigger_report_id']!=checkpoint.trigger_report_id or at>self.as_of):raise ValueError('Invalid checkpoint source.')
        sources=payload['sources'];report_ids=sorted({s['report_id'] for s in sources})
        members=sorted((item['observation_id'],item['report_id']) for item in payload['memberships'])
        observation_ids=sorted({oid for oid,_ in members})
        if (not report_ids or len(report_ids)!=len(sources) or len(observation_ids)!=len(members) or
            set(report_ids)!={rid for _,rid in members} or any(type(i) is not int or i<1 for i in report_ids+observation_ids)):
            raise ValueError('Invalid frozen population.')
        grouping_ids=sorted(set(report_ids)|{checkpoint.trigger_report_id})
        if not self.authorize(grouping_ids):return None
        concern,current_members,allowed=self.context(checkpoint.concern_id)
        if not allowed:return None
        if concern.public_id!=payload['concern_public_id']:raise ValueError('Inconsistent concern reference.')
        areas=sorted({s['intake_features']['reported_barangay_id'] for s in sources if isinstance(s.get('intake_features'),dict) and
            type(s['intake_features'].get('reported_barangay_id')) is int and s['intake_features']['reported_barangay_id']>0})
        try:features=project(payload,report_ids,observation_ids,at,areas)
        except (ValueError,KeyError,TypeError):features=None
        reasons=[] if features is not None else ['checkpoint_features_incomplete_or_invalid']
        state=None;verified_at=None;provenance=[]
        if concern.version!=checkpoint.concern_version or current_members!=members:state='membership_changed'
        elif any(type(s.get(k)) is not bool for s in sources for k in ('terminal_at_checkpoint','successful_status_at_checkpoint')):state='checkpoint_state_unknown'
        elif any(s['terminal_at_checkpoint'] or s['successful_status_at_checkpoint'] for s in sources):state='already_terminal_at_checkpoint'
        else:
            if concern.id not in self.cases:self.cases[concern.id]=learning.resolution_sources(self.db,{rid:self.reports[rid] for rid in report_ids},self.as_of)
            all_events,valid=self.cases[concern.id]
            provenance=[dict(report_id=rid,event_id=event.id,timeline_id=event.timeline_id,inspection_id=event.inspection_id,
                project_id=event.project_id,verified_at=iso(event.occurred_at)) for rid,event in sorted(valid.items())]
            valid_ids=set(valid)
            events=[event for event in all_events if at<timestamp(event.occurred_at)<=self.as_of]
            verified_ids={event.report_id for event in events if event.kind=='verified'}
            statuses={self.reports[rid].status for rid in report_ids}
            if not statuses<=KNOWN_OPEN|learning.TERMINAL:
                state='data_quality_error';reasons.append('unsupported_current_report_status')
            elif any(event.kind=='invalidated' for event in events):state='resolution_invalidated'
            elif (verified_ids-valid_ids or any(self.reports[rid].status in learning.SUCCESS and rid not in valid_ids for rid in report_ids)):
                state='invalid_resolution_evidence'
            elif statuses&learning.NON_RESOLUTION:state='non_resolution_terminal'
            elif statuses&(learning.TERMINAL-learning.SUCCESS-learning.NON_RESOLUTION):state='unverified_terminal'
            elif valid_ids==set(report_ids):
                state='verified_resolution';verified_at=max(timestamp(event.occurred_at) for event in valid.values())
            else:state='right_censored' if any(status not in learning.TERMINAL for status in statuses) else 'unverified_terminal'
        if state=='verified_resolution' and (verified_at is None or timestamp(verified_at)<at):state='data_quality_error'
        if state in {'verified_resolution','right_censored'} and any(timestamp(source['verified_at'])<at for source in provenance):state='data_quality_error'
        first=payload['features']['first_received_at']
        if state in {'verified_resolution','right_censored'} and first is not None and timestamp(first)>at:state='data_quality_error'
        if state not in {'verified_resolution','right_censored'}:reasons.append(state);verified_at=None
        end=timestamp(verified_at) if state=='verified_resolution' else self.as_of if state=='right_censored' else None
        return dict(checkpoint_id=checkpoint.id,checkpoint_sha256=checkpoint.payload_sha256,concern_id=concern.public_id,
            concern_version=checkpoint.concern_version,prediction_at=iso(at),first_received_at=first,features=features,
            lineage=dict(report_ids=report_ids,observation_ids=observation_ids,trigger_report_id=checkpoint.trigger_report_id,
                grouping_report_ids=grouping_ids,recorded_barangay_ids=areas,reviewed_survey_asset_ids=[]),
            outcome=dict(state=state,target=TARGET,censored=state=='right_censored',verified_at=iso(verified_at),
                elapsed_days=(end-at).total_seconds()/86400 if end else None,
                total_since_first_received_days=(end-timestamp(first)).total_seconds()/86400 if end and first else None,sources=provenance),
            audit=dict(duration_label_eligible=features is not None and state=='verified_resolution',
                censoring_record_eligible=features is not None and state=='right_censored',reasons=sorted(reasons)))


def asset_groups(db,user,rows,as_of):
    reports=sorted({rid for row in rows for rid in row['lineage']['grouping_report_ids']})
    field=gm.AssetFieldObservation
    visible=scoped_assets(db.query(gm.InfrastructureAsset.asset_id),user)
    query=db.query(field.source_report_id,field.asset_id).join(gm.AssetInspectionEvidence,
        (gm.AssetInspectionEvidence.id==field.evidence_reference)&(gm.AssetInspectionEvidence.asset_id==field.asset_id)).filter(
        field.asset_id.in_(visible),field.review_status=='accepted',field.identity_confirmed.is_(True),field.location_reviewed.is_(True),
        field.visibility=='visible',field.reviewed_by_id!=field.recorded_by_id,field.observed_at<=field.reviewed_at,
        field.recorded_at<=field.reviewed_at,field.reviewed_at<=as_of)
    references={};count=0
    for start in range(0,len(reports),1000):
        found=query.filter(field.source_report_id.in_(reports[start:start+1000])).distinct().limit(MAX_SCAN-count+1).all()
        count+=len(found)
        if count>MAX_SCAN:raise HTTPException(413,'Reviewed-reference grouping exceeds its bounded scan.')
        for rid,asset in found:references.setdefault(rid,set()).add(asset)
    for row in rows:row['lineage']['reviewed_survey_asset_ids']=sorted({asset for rid in row['lineage']['grouping_report_ids'] for asset in references.get(rid,())})


def collect(db,user,max_checkpoints=1000):
    learning.require_learning_access(user)
    if type(max_checkpoints) is not int or not 1<=max_checkpoints<=5000:raise HTTPException(422,'Choose 1 to 5000 checkpoints.')
    as_of=db.execute(select(func.statement_timestamp())).scalar_one()
    visible=scoped_reports(db.query(models.Report.id),user)
    candidates=db.query(models.ConcernLearningCheckpoint).filter(models.ConcernLearningCheckpoint.trigger_report_id.in_(visible),
        models.ConcernLearningCheckpoint.captured_at<=as_of).order_by(models.ConcernLearningCheckpoint.captured_at,models.ConcernLearningCheckpoint.id).limit(MAX_SCAN+1).all()
    if len(candidates)>MAX_SCAN:raise HTTPException(413,'Checkpoint cohort exceeds the bounded scan; narrow authorized scope.')
    reader=Reader(db,user,as_of);rows=[];size=0
    try:
        for checkpoint in candidates:
            row=reader.row(checkpoint)
            if row is None:continue
            if len(rows)>=max_checkpoints:raise HTTPException(413,'Complete checkpoint export exceeds max_checkpoints; increase its bound or narrow authorized scope.')
            rows.append(row);size+=len(canonical(row))
            if size>MAX_BYTES:raise HTTPException(413,'Checkpoint cohort exceeds its byte bound.')
        include_assets=can(user,'maintenance','view')
        if include_assets:asset_groups(db,user,rows,as_of)
        result=seal(rows,as_of,include_assets=include_assets);verify(result)
        if len(canonical(result))>MAX_BYTES:raise HTTPException(413,'Checkpoint cohort exceeds its byte bound.')
        return result
    except (ValueError,KeyError,TypeError,OverflowError):
        raise HTTPException(409,'Checkpoint cohort source needs correction; no partial export is available.') from None
