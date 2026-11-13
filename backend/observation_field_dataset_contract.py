"""Private condition-coverage audit contract; no repair or model release labels."""
from collections import Counter
from hashlib import sha256
import re
from uuid import UUID

from learning_dataset_contract import canonical,iso,timestamp,CATEGORY_LABELS

SCHEMA='pulso-observation-field-coverage-audit-v1'
SOURCE_SCHEMA='pulso-observation-field-assessment-v1'
FINDINGS={'defect_observed','no_defect_observed','not_assessed'}
BLOCKERS=['physical_identity_condition_and_source_origin_not_independently_attested',
    'condition_absence_does_not_establish_repair_causation_or_exact_repair_time',
    'current_context_is_not_a_freshness_or_physical_condition_guarantee',
    'report_resolution_and_category_condition_are_separate_targets',
    'historical_assessment_and_current_membership_are_not_prediction_time_features',
    'grouped_prospective_collection_adjudication_and_release_policy_required']
PROBLEM_FIELDS={'observation_id','report_id','report_version','report_status','barangay_id','concern_id','concern_version','categories','evidence_sha256'}
FIELD_FIELDS={'field_observation_id','asset_id','asset_barangay_id','source_report_id','observed_at','visibility','condition',
    'review_status','identity_confirmed','location_reviewed','recorded_by_id','reviewed_by_id','reviewed_at',
    'evidence_reference','evidence_asset_id','evidence_sha256','context_sha256'}
ASSESSMENT_FIELDS={'id','revision','actor_id','recorded_at','field_observation_id','category_findings','source_snapshot',
    'source_snapshot_sha256','current_context','context_blockers'}
ROW_FIELDS={'problem','assessment_revision','assessments','category_coverage','report_completion','evaluation_groups'}
REASONS={'independent_accepted_field_review_required','visible_field_evidence_required','private_evidence_required',
    'same_recorded_area_required','field_source_belongs_to_another_report','post_report_consistent_field_clock_required',
    'recorded_context_changed','private_evidence_missing_or_changed','superseded_by_later_assessment',
    'later_or_same_time_accepted_field_context_requires_review'}
GROUPINGS=('shared_report_or_concern','shared_report_concern_asset_or_evidence')
REPORT_STATUSES={'pending','received','unverified','unvalidated','under_review','validated','needs_information',
    'pending_approval','approved_internal','approved_for_action','dispatched','in_progress','resolved','closed_by_citizen',
    'completed','closed','cancelled','rejected','duplicate','spam'}


def positive(value):return type(value) is int and value>0
def digest(value):return isinstance(value,str) and re.fullmatch(r'[0-9a-f]{64}',value) is not None


def identifier(value):
    return isinstance(value,str) and 0<len(value)<=100 and not any(ord(c)<32 for c in value)


def uuid(value):
    if not isinstance(value,str):raise ValueError('Invalid source reference.')
    try:valid=str(UUID(value))==value
    except (ValueError,AttributeError):valid=False
    if not valid:raise ValueError('Invalid source reference.')


def labels(values):
    return (isinstance(values,list) and bool(values) and all(isinstance(c,str) and c in CATEGORY_LABELS for c in values)
        and values==sorted(set(values)))


def verify_problem(problem):
    if (not isinstance(problem,dict) or set(problem)!=PROBLEM_FIELDS
            or any(not positive(problem[k]) for k in ('observation_id','report_id','report_version','concern_version'))
            or (problem['barangay_id'] is not None and not positive(problem['barangay_id']))
            or not isinstance(problem['concern_id'],str) or re.fullmatch(r'CON-[0-9a-f]{32}',problem['concern_id']) is None
            or not isinstance(problem['report_status'],str) or problem['report_status'] not in REPORT_STATUSES
            or not labels(problem['categories']) or not digest(problem['evidence_sha256'])):
        raise ValueError('Invalid current or recorded problem context.')


def coverage(problem,assessments):
    last=assessments[-1] if assessments else None
    known={p['category']:p['finding'] for p in last['category_findings']} if last and last['current_context'] else {}
    return [dict(category=category,state='not_recorded' if last is None else 'historical_or_changed_context' if not last['current_context'] else
        'not_assessed' if known[category]=='not_assessed' else 'reviewed_condition',finding=known.get(category)) for category in problem['categories']]


def groups(rows,extended):
    parents={};owners={}
    def root(key):
        parents.setdefault(key,key)
        while parents[key]!=key:
            parents[key]=parents[parents[key]];key=parents[key]
        return key
    for row in rows:
        p=row['problem'];oid=p['observation_id'];root(oid)
        keys={('report',p['report_id']),('concern',p['concern_id'])}
        for assessment in row['assessments']:
            snapshot=assessment['source_snapshot'];keys.add(('concern',snapshot['problem']['concern_id']))
            if extended:
                field=snapshot['field']
                keys.update({('asset',field['asset_id']),('field',field['field_observation_id']),('photo',field['evidence_sha256'])})
        for key in keys:
            if key in owners:
                a,b=sorted((root(oid),root(owners[key])));parents[b]=a
            else:owners[key]=oid
    members={}
    for oid in sorted(parents):members.setdefault(root(oid),[]).append(oid)
    return {oid:'FIELD-GROUP-'+sha256(canonical(values)).hexdigest()[:24] for values in members.values() for oid in values}


def counts(rows):
    return dict(assessment_count=sum(len(row['assessments']) for row in rows),
        exported_report_count=len({row['problem']['report_id'] for row in rows}),
        category_count=sum(len(row['category_coverage']) for row in rows),
        category_coverage_state_counts=dict(sorted(Counter(part['state'] for row in rows for part in row['category_coverage']).items())),
        current_known_finding_counts=dict(sorted(Counter(part['finding'] for row in rows for part in row['category_coverage'] if part['state']=='reviewed_condition').items())),
        sourced_verified_report_count=len({row['problem']['report_id'] for row in rows if row['report_completion']['state']=='sourced_verified_report_resolution'}))


def seal(rows,as_of,*,legacy_report_ids,data_origin='unattested',selection_report_id=None):
    rows=sorted(rows,key=lambda row:row['problem']['observation_id'])
    group_maps=[groups(rows,False),groups(rows,True)]
    for row in rows:
        row['category_coverage']=coverage(row['problem'],row['assessments'])
        row['evaluation_groups']={key:value[row['problem']['observation_id']] for key,value in zip(GROUPINGS,group_maps)}
    manifest=dict(schema_version=SCHEMA,as_of=iso(as_of),row_count=len(rows),data_origin=data_origin,
        model_status='not_a_prediction',training_release_eligible=False,training_release_blockers=list(BLOCKERS),
        purpose='private_current_category_condition_coverage_audit',unit='Current reported observation with complete accessible assessment history.',
        coverage='All full-lineage authorized observations within bounds, including unassessed categories; inaccessible histories omitted whole without counts.',
        snapshot_policy='One read-only repeatable-read snapshot plus bounded evidence-byte checks; not historical as-of replay.',
        label_policy='Operational reviewer condition at survey time; report completion is separate. No repair, exact-time or model-release label is inferred.',
        grouping_policy='Transitive current/historical report/concern references; extended grouping also includes recorded asset, field and exact-photo hashes. Not physical identity proof.',
        legacy_report_ids_without_observations=legacy_report_ids,selection_report_id=selection_report_id,
        privacy='Private report/observation/asset/field/event/actor references and times, not anonymized. No raw coordinates, photos, paths, contacts or reasons.',
        **counts(rows),rows_sha256=sha256(canonical(rows)).hexdigest())
    manifest['export_sha256']=sha256(canonical(dict(manifest=manifest,rows=rows))).hexdigest()
    return dict(manifest=manifest,rows=rows)


def verify(document):
    if not isinstance(document,dict) or set(document)!={'manifest','rows'}:raise ValueError('Invalid field audit envelope.')
    manifest,rows=document['manifest'],document['rows']
    if (not isinstance(manifest,dict) or not isinstance(rows,list) or len(rows)>5000 or manifest.get('schema_version')!=SCHEMA
            or manifest.get('training_release_eligible') is not False or manifest.get('model_status')!='not_a_prediction'
            or manifest.get('data_origin') not in {'unattested','synthetic'} or type(manifest.get('row_count')) is not int or manifest['row_count']!=len(rows)
            or manifest.get('training_release_blockers')!=BLOCKERS):raise ValueError('Invalid field audit manifest.')
    at=timestamp(manifest['as_of']);seen=set();assessment_ids=set();report_completion={}
    selection=manifest.get('selection_report_id')
    if selection is not None and not positive(selection):raise ValueError('Invalid report selection.')
    template=seal([],at,legacy_report_ids=[],data_origin=manifest['data_origin'],selection_report_id=selection)['manifest']
    mutable={'row_count','legacy_report_ids_without_observations','rows_sha256','export_sha256'}|set(counts([]))
    if set(manifest)!=set(template) or any(manifest[k]!=v for k,v in template.items() if k not in mutable):
        raise ValueError('Unsupported field audit metadata.')
    unsigned={k:v for k,v in manifest.items() if k!='export_sha256'}
    if (manifest.get('rows_sha256')!=sha256(canonical(rows)).hexdigest()
            or manifest.get('export_sha256')!=sha256(canonical(dict(manifest=unsigned,rows=rows))).hexdigest()):
        raise ValueError('Field audit checksum mismatch.')
    for row in rows:
        if not isinstance(row,dict) or set(row)!=ROW_FIELDS:raise ValueError('Unexpected field audit row.')
        p=row['problem'];verify_problem(p);oid=p['observation_id']
        if selection is not None and p['report_id']!=selection:raise ValueError('Report selection was not preserved.')
        if oid in seen:raise ValueError('Repeated current observation.')
        seen.add(oid);assessments=row['assessments']
        if not isinstance(assessments,list) or len(assessments)>1000:raise ValueError('Incomplete or oversized assessment history.')
        previous_time=None
        for expected,a in enumerate(assessments,1):
            if (not isinstance(a,dict) or set(a)!=ASSESSMENT_FIELDS or not positive(a['id']) or a['id'] in assessment_ids
                    or a['revision']!=expected or type(a['revision']) is not int or not positive(a['actor_id'])
                    or type(a['current_context']) is not bool or not isinstance(a['context_blockers'],list)
                    or any(not isinstance(r,str) or r not in REASONS for r in a['context_blockers'])
                    or a['context_blockers']!=sorted(set(a['context_blockers'])) or a['current_context']!=(not bool(a['context_blockers']))):
                raise ValueError('Invalid assessment revision or audit state.')
            assessment_ids.add(a['id']);recorded=timestamp(a['recorded_at'])
            if recorded>at or (previous_time is not None and recorded<previous_time):raise ValueError('Invalid assessment clock.')
            previous_time=recorded;s=a['source_snapshot']
            if (not isinstance(s,dict) or set(s)!={'schema_version','identity_confirmed','problem','field'}
                    or s['schema_version']!=SOURCE_SCHEMA or s['identity_confirmed'] is not True
                    or a['source_snapshot_sha256']!=sha256(canonical(s)).hexdigest()):raise ValueError('Invalid recorded source snapshot.')
            old=s['problem'];verify_problem(old);f=s['field']
            if old['observation_id']!=oid or old['report_id']!=p['report_id']:raise ValueError('Observation lineage differs.')
            if (not isinstance(f,dict) or set(f)!=FIELD_FIELDS or not identifier(f['asset_id']) or f['asset_id']!=f['evidence_asset_id']
                    or not positive(f['asset_barangay_id']) or f['asset_barangay_id']!=old['barangay_id']
                    or f['source_report_id'] not in (None,p['report_id']) or (f['source_report_id'] is not None and not positive(f['source_report_id']))
                    or f['visibility']!='visible' or not isinstance(f['condition'],str) or f['condition'] not in FINDINGS
                    or f['review_status']!='accepted' or f['identity_confirmed'] is not True or f['location_reviewed'] is not True
                    or not positive(f['recorded_by_id']) or not positive(f['reviewed_by_id'])
                    or f['recorded_by_id'] in (f['reviewed_by_id'],a['actor_id'])
                    or not digest(f['evidence_sha256']) or not digest(f['context_sha256'])):raise ValueError('Invalid independent field provenance.')
            uuid(f['field_observation_id']);uuid(f['evidence_reference'])
            if a['field_observation_id']!=f['field_observation_id'] or not timestamp(f['observed_at'])<=timestamp(f['reviewed_at'])<=recorded:
                raise ValueError('Inconsistent field source clock or identity.')
            findings=a['category_findings']
            if (not isinstance(findings,list) or any(not isinstance(v,dict) or set(v)!={'category','finding'}
                    or not isinstance(v['finding'],str) or v['finding'] not in FINDINGS for v in findings) or [v['category'] for v in findings]!=old['categories']):
                raise ValueError('Recorded categories are incomplete or changed.')
            known={v['finding'] for v in findings}-{'not_assessed'}
            if known and (('defect_observed' in known and f['condition']!='defect_observed') or
                    ('defect_observed' not in known and f['condition']!='no_defect_observed')):raise ValueError('Inconsistent category condition.')
            if (expected<len(assessments))!=('superseded_by_later_assessment' in a['context_blockers']):raise ValueError('Correction chain is inconsistent.')
            if a['current_context'] and old!=p:raise ValueError('Current finding differs from its source context.')
        if type(row['assessment_revision']) is not int or row['assessment_revision']!=len(assessments):raise ValueError('Missing assessment revisions.')
        if row['category_coverage']!=coverage(p,assessments):raise ValueError('False category coverage.')
        completion=row['report_completion']
        if not isinstance(completion,dict) or set(completion)!={'state','verified_at','event_id','source_kind','source_id'}:
            raise ValueError('Invalid separate report completion.')
        if completion['state']=='sourced_verified_report_resolution':
            if (not positive(completion['event_id']) or not positive(completion['source_id']) or completion['source_kind'] not in
                    {'work_order_inspection','project_review'} or p['report_status'] not in {'resolved','closed_by_citizen'}
                    or timestamp(completion['verified_at'])>at):raise ValueError('Invalid report completion source.')
        elif completion['state']!='no_current_sourced_report_resolution' or any(completion[k] is not None for k in ('verified_at','event_id','source_kind','source_id')):
            raise ValueError('Unsupported report completion claim.')
        if report_completion.setdefault(p['report_id'],completion)!=completion:raise ValueError('Contradictory sibling completion.')
    if len(assessment_ids)>10000:raise ValueError('Assessment audit exceeds its bound.')
    for key,expected in counts(rows).items():
        actual=manifest.get(key)
        if (actual!=expected or (type(expected) is int and type(actual) is not int)
                or (isinstance(expected,dict) and any(type(v) is not int for v in actual.values()))):raise ValueError('Invalid field audit counts.')
    legacy=manifest.get('legacy_report_ids_without_observations')
    if (not isinstance(legacy,list) or len(legacy)>10000 or any(not positive(v) for v in legacy)
            or legacy!=sorted(set(legacy)) or set(legacy)&set(report_completion)):raise ValueError('False legacy report gap.')
    if selection is not None and any(rid!=selection for rid in legacy):raise ValueError('Legacy gap differs from selected report.')
    if [r['problem']['observation_id'] for r in rows]!=sorted(seen):raise ValueError('Unordered observations.')
    for strategy,extended in zip(GROUPINGS,(False,True)):
        expected=groups(rows,extended)
        for row in rows:
            if set(row['evaluation_groups'])!=set(GROUPINGS) or row['evaluation_groups'][strategy]!=expected[row['problem']['observation_id']]:
                raise ValueError('Invalid related-evidence grouping.')
    return manifest
