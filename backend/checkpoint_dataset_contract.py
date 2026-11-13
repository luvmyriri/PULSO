"""Private prospective-context outcome audit, never training release approval."""
from collections import Counter
from hashlib import sha256
import math
import re

from learning_dataset_contract import canonical,components,iso,timestamp,CATEGORY_LABELS

SCHEMA='pulso-checkpoint-outcome-audit-v1'
TARGET='all_frozen_member_reports_verified_resolution_after_checkpoint_without_membership_change'
FEATURES={'concern_categories','report_count','observation_count','unreviewed_observation_count',
    'reviewer_confirmed_observation_count','reviewer_separated_observation_count','elapsed_before_checkpoint_days',
    'reported_barangay_ids','original_location_source_counts','original_photo_source_counts',
    'original_issue_accuracy_known_count','original_issue_accuracy_max_m'}
STATES={'verified_resolution','right_censored','membership_changed','already_terminal_at_checkpoint',
    'checkpoint_state_unknown','non_resolution_terminal','unverified_terminal','resolution_invalidated',
    'invalid_resolution_evidence','data_quality_error'}
BLOCKERS=['source_data_and_physical_episode_identity_not_independently_attested',
    'prediction_clock_is_server_capture_before_command_commit','censoring_and_competing_outcomes_require_model_policy',
    'all_related_checkpoints_reports_and_assets_require_grouped_temporal_evaluation','prospective_evaluation_and_release_policy_required']
ROW_FIELDS={'checkpoint_id','checkpoint_sha256','concern_id','concern_version','prediction_at','first_received_at',
    'features','lineage','outcome','audit','evaluation_groups'}
LINEAGE_FIELDS={'report_ids','observation_ids','trigger_report_id','grouping_report_ids','recorded_barangay_ids','reviewed_survey_asset_ids'}


def grouping(rows,*,assets=False,areas=False):
    projected=[dict(concern_id=row['concern_id'],lineage={**row['lineage'],'report_ids':row['lineage']['grouping_report_ids']}) for row in rows]
    return components(projected,include_assets=assets,include_areas=areas)


def seal(rows,as_of,*,include_assets,data_origin='unattested'):
    rows=sorted(rows,key=lambda row:(row['prediction_at'],row['checkpoint_id']))
    groups=[grouping(rows),grouping(rows,assets=True),grouping(rows,assets=True,areas=True)]
    for row in rows:
        row['evaluation_groups']=dict(zip(('shared_report','shared_report_or_reviewed_survey_asset','shared_report_asset_or_recorded_area'),
            (group[row['concern_id']] for group in groups)))
    manifest=dict(schema_version=SCHEMA,as_of=iso(as_of),row_count=len(rows),model_status='not_a_prediction',
        purpose='private_frozen_checkpoint_outcome_audit',prediction_clock='server_capture_before_command_commit',
        outcome_target=TARGET,data_origin=data_origin,training_release_eligible=False,training_release_blockers=list(BLOCKERS),
        feature_names=sorted(FEATURES),asset_reference_coverage='scoped_reviewed_survey_references' if include_assets else 'no_maintenance_access',
        coverage='Complete authorized full-lineage checkpoints within bounds; unrecorded rosters cannot be exported.',
        snapshot_policy='One read-only repeatable-read snapshot; outcome labels are assessed at export time, not historical as-of replay.',
        grouping_policy='All checkpoints of a concern, shared frozen/trigger reports and reviewed asset/area references stay together.',
        asset_reference_time_policy='Current reviewed references are conservative grouping keys only; never checkpoint predictors.',
        outcome_state_counts=dict(sorted(Counter(row['outcome']['state'] for row in rows).items())),
        duration_audit_eligible_count=sum(row['audit']['duration_label_eligible'] for row in rows),
        censoring_audit_eligible_count=sum(row['audit']['censoring_record_eligible'] for row in rows),
        privacy='Private checkpoint, report, observation, asset, area and event references/times. Not anonymized; no raw photos, coordinates, contacts or narratives.',
        rows_sha256=sha256(canonical(rows)).hexdigest())
    manifest['export_sha256']=sha256(canonical(dict(manifest=manifest,rows=rows))).hexdigest()
    return dict(manifest=manifest,rows=rows)


def positive_ids(values,*,allow_empty=False):
    return (isinstance(values,list) and (allow_empty or bool(values)) and
        all(type(value) is int and value>0 for value in values) and values==sorted(set(values)))


def number(value):
    return type(value) in (int,float) and math.isfinite(value) and value>=0


def verify_features(features,lineage):
    if not isinstance(features,dict) or set(features)!=FEATURES:
        raise ValueError('Unexpected checkpoint predictors.')
    labels=features['concern_categories']
    if not isinstance(labels,list) or not labels or any(not isinstance(c,str) or c not in CATEGORY_LABELS for c in labels) or labels!=sorted(set(labels)):
        raise ValueError('Invalid checkpoint categories.')
    counts=('report_count','observation_count','unreviewed_observation_count','reviewer_confirmed_observation_count',
        'reviewer_separated_observation_count','original_issue_accuracy_known_count')
    if any(type(features[k]) is not int or features[k]<0 for k in counts):
        raise ValueError('Invalid checkpoint counts.')
    if (features['report_count']!=len(lineage['report_ids']) or features['observation_count']!=len(lineage['observation_ids']) or
            sum(features[k] for k in counts[2:5])!=features['observation_count'] or
            features['original_issue_accuracy_known_count']>features['report_count'] or
            features['reported_barangay_ids']!=lineage['recorded_barangay_ids']):
        raise ValueError('Checkpoint counts contradict frozen lineage.')
    if not number(features['elapsed_before_checkpoint_days']):
        raise ValueError('Invalid pre-checkpoint duration.')
    for key,names in (('original_location_source_counts',{'device','manual','search','uploaded_metadata','unknown'}),
                      ('original_photo_source_counts',{'camera','upload','unknown'})):
        values=features[key]
        if not isinstance(values,dict) or set(values)!=names or any(type(v) is not int or v<0 for v in values.values()) or sum(values.values())!=features['report_count']:
            raise ValueError('Invalid original-source counts.')
    radius=features['original_issue_accuracy_max_m']
    if (radius is None)!=(features['original_issue_accuracy_known_count']==0) or (radius is not None and (not number(radius) or not 0<radius<=100000)):
        raise ValueError('Invalid original uncertainty feature.')


def verify(document):
    if not isinstance(document,dict) or set(document)!={'manifest','rows'}:
        raise ValueError('Invalid checkpoint audit envelope.')
    manifest,rows=document['manifest'],document['rows']
    if (not isinstance(manifest,dict) or not isinstance(rows,list) or manifest.get('schema_version')!=SCHEMA or
        manifest.get('training_release_eligible') is not False or manifest.get('model_status')!='not_a_prediction' or
        manifest.get('feature_names')!=sorted(FEATURES) or type(manifest.get('row_count')) is not int or manifest.get('row_count')!=len(rows) or
        manifest.get('training_release_blockers')!=BLOCKERS or manifest.get('outcome_target')!=TARGET or
        manifest.get('prediction_clock')!='server_capture_before_command_commit' or manifest.get('data_origin') not in {'unattested','synthetic'} or
        any(type(manifest.get(k)) is not int for k in ('duration_audit_eligible_count','censoring_audit_eligible_count'))):
        raise ValueError('Unsupported checkpoint audit contract.')
    unsigned={k:v for k,v in manifest.items() if k!='export_sha256'}
    if manifest.get('rows_sha256')!=sha256(canonical(rows)).hexdigest() or manifest.get('export_sha256')!=sha256(canonical(dict(manifest=unsigned,rows=rows))).hexdigest():
        raise ValueError('Checkpoint audit checksum mismatch.')
    as_of=timestamp(manifest['as_of']);seen=set();versions=set()
    for row in rows:
        if not isinstance(row,dict) or set(row)!=ROW_FIELDS:
            raise ValueError('Unexpected checkpoint row fields.')
        if (not isinstance(row['checkpoint_id'],str) or not re.fullmatch(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}',row['checkpoint_id']) or
            row['checkpoint_id'] in seen or type(row['concern_version']) is not int or row['concern_version']<1 or
            not isinstance(row['concern_id'],str) or not re.fullmatch(r'CON-[0-9a-f]{32}',row['concern_id']) or
            not isinstance(row['checkpoint_sha256'],str) or not re.fullmatch(r'[0-9a-f]{64}',row['checkpoint_sha256'])):
            raise ValueError('Invalid checkpoint identity.')
        seen.add(row['checkpoint_id']);version=(row['concern_id'],row['concern_version'])
        if version in versions:raise ValueError('Repeated concern checkpoint version.')
        versions.add(version)
        at=timestamp(row['prediction_at'])
        if at>as_of:raise ValueError('Checkpoint postdates audit.')
        if row['first_received_at'] is not None:timestamp(row['first_received_at'])
        lineage=row['lineage']
        if (not isinstance(lineage,dict) or set(lineage)!=LINEAGE_FIELDS or
            any(not positive_ids(lineage[k],allow_empty=k=='recorded_barangay_ids') for k in ('report_ids','observation_ids','grouping_report_ids','recorded_barangay_ids')) or
            type(lineage['trigger_report_id']) is not int or lineage['trigger_report_id']<1 or
            lineage['grouping_report_ids']!=sorted(set(lineage['report_ids'])|{lineage['trigger_report_id']}) or
            not isinstance(lineage['reviewed_survey_asset_ids'],list) or any(not isinstance(a,str) or not 1<=len(a)<=100 for a in lineage['reviewed_survey_asset_ids']) or
            lineage['reviewed_survey_asset_ids']!=sorted(set(lineage['reviewed_survey_asset_ids']))):
            raise ValueError('Invalid frozen checkpoint lineage.')
        if row['features'] is not None:
            verify_features(row['features'],lineage)
            if row['first_received_at'] is None or timestamp(row['first_received_at'])>at or not math.isclose(row['features']['elapsed_before_checkpoint_days'],(at-timestamp(row['first_received_at'])).total_seconds()/86400,abs_tol=1e-10):
                raise ValueError('Feature clock contradicts frozen receipt.')
        outcome,audit=row['outcome'],row['audit']
        if (not isinstance(outcome,dict) or set(outcome)!={'state','target','elapsed_days','total_since_first_received_days','censored','verified_at','sources'} or
            outcome['state'] not in STATES or outcome['target']!=TARGET or type(outcome['censored']) is not bool or
            not isinstance(audit,dict) or set(audit)!={'duration_label_eligible','censoring_record_eligible','reasons'} or
            not isinstance(audit['reasons'],list) or any(not isinstance(r,str) or not re.fullmatch(r'[a-z_]{1,100}',r) for r in audit['reasons'])):
            raise ValueError('Invalid checkpoint outcome or audit fields.')
        state=outcome['state'];valid=state in {'verified_resolution','right_censored'}
        if outcome['censored']!=(state=='right_censored'):
            raise ValueError('Censoring cannot relabel competing or excluded outcomes.')
        end=timestamp(outcome['verified_at']) if state=='verified_resolution' else as_of if state=='right_censored' else None
        if state!='verified_resolution' and outcome['verified_at'] is not None:raise ValueError('Unexpected completion time.')
        if valid:
            if not at<=end<=as_of or not number(outcome['elapsed_days']) or not math.isclose(outcome['elapsed_days'],(end-at).total_seconds()/86400,abs_tol=1e-10):
                raise ValueError('Invalid checkpoint-relative label.')
            total=outcome['total_since_first_received_days']
            if row['first_received_at'] is None:
                if total is not None:raise ValueError('Total duration lacks a frozen receipt time.')
            elif not number(total) or not math.isclose(total,(end-timestamp(row['first_received_at'])).total_seconds()/86400,abs_tol=1e-10):
                raise ValueError('Total service duration is inconsistent.')
        elif outcome['elapsed_days'] is not None or outcome['total_since_first_received_days'] is not None:
            raise ValueError('Excluded outcomes cannot become zero-duration labels.')
        sources=outcome['sources'];ids=[];times=[]
        if not isinstance(sources,list):raise ValueError('Invalid completion provenance.')
        for source in sources:
            if (not isinstance(source,dict) or set(source)!={'report_id','event_id','timeline_id','inspection_id','project_id','verified_at'} or
                any(type(source[k]) is not int or source[k]<1 for k in ('report_id','event_id','timeline_id')) or
                source['report_id'] not in lineage['report_ids'] or
                (source['inspection_id'] is None)==(source['project_id'] is None) or
                any(source[k] is not None and (type(source[k]) is not int or source[k]<1) for k in ('inspection_id','project_id'))):
                raise ValueError('Invalid completion source.')
            ids.append(source['report_id']);times.append(timestamp(source['verified_at']))
        if len(set(ids))!=len(ids) or any(t>as_of for t in times):raise ValueError('Duplicate or future completion sources.')
        if valid and any(t<at for t in times):raise ValueError('Resolution source predates the prediction clock.')
        if state=='verified_resolution' and (set(ids)!=set(lineage['report_ids']) or max(times)!=end or any(t<at for t in times)):
            raise ValueError('Completion lacks all frozen-member sources after checkpoint.')
        expected_duration=row['features'] is not None and state=='verified_resolution'
        expected_censor=row['features'] is not None and state=='right_censored'
        if type(audit['duration_label_eligible']) is not bool or type(audit['censoring_record_eligible']) is not bool or audit['duration_label_eligible']!=expected_duration or audit['censoring_record_eligible']!=expected_censor:
            raise ValueError('Audit eligibility contradicts data.')
    groups=[grouping(rows),grouping(rows,assets=True),grouping(rows,assets=True,areas=True)]
    for row in rows:
        expected=dict(zip(('shared_report','shared_report_or_reviewed_survey_asset','shared_report_asset_or_recorded_area'),(g[row['concern_id']] for g in groups)))
        if row['evaluation_groups']!=expected:raise ValueError('Invalid checkpoint evaluation groups.')
    if (manifest.get('outcome_state_counts')!=dict(sorted(Counter(row['outcome']['state'] for row in rows).items())) or
        manifest.get('duration_audit_eligible_count')!=sum(row['audit']['duration_label_eligible'] for row in rows) or
        manifest.get('censoring_audit_eligible_count')!=sum(row['audit']['censoring_record_eligible'] for row in rows)):
        raise ValueError('Manifest counts contradict checkpoint rows.')
    return manifest
