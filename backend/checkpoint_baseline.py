"""Temporal descriptive survival reference; not live ETA or model approval."""
from collections import Counter
from datetime import datetime,timezone
from hashlib import sha256
import math
import re

from checkpoint_dataset_contract import verify
from learning_dataset_contract import canonical,iso,timestamp

SCHEMA='pulso-checkpoint-temporal-baseline-v1'
GROUPINGS={'shared_report','shared_report_or_reviewed_survey_asset','shared_report_asset_or_recorded_area'}
FROZEN_FIELDS=('checkpoint_sha256','concern_id','concern_version','prediction_at','first_received_at','features')
FROZEN_LINEAGE=('report_ids','observation_ids','trigger_report_id','grouping_report_ids','recorded_barangay_ids')


def joint_groups(train,later,grouping):
    parents={}
    def root(key):
        parents.setdefault(key,key)
        while parents[key]!=key:
            parents[key]=parents[parents[key]];key=parents[key]
        return key
    owners={}
    for row in train+later:
        cid=row['checkpoint_id'];root(cid)
        keys=[('concern',row['concern_id'])]+[('report',str(rid)) for rid in row['lineage']['grouping_report_ids']]
        if grouping!='shared_report':keys += [('asset',asset) for asset in row['lineage']['reviewed_survey_asset_ids']]
        if grouping=='shared_report_asset_or_recorded_area':keys += [('area',str(area)) for area in row['lineage']['recorded_barangay_ids']]
        for key in keys:
            if key in owners:
                a,b=sorted((root(cid),root(owners[key])));parents[b]=a
            else:owners[key]=cid
    members={}
    for cid in sorted(parents):members.setdefault(root(cid),[]).append(cid)
    return {cid:'TEMPORAL-'+sha256(canonical(group)).hexdigest()[:24] for group in members.values() for cid in group}


def eligible(row):
    return row['audit']['duration_label_eligible'] or row['audit']['censoring_record_eligible']


def survival_reference(rows):
    """Use SciPy's established right-censored ECDF implementation, not imputation."""
    import scipy
    from scipy.stats import CensoredData,ecdf
    events=[row['outcome']['elapsed_days'] for row in rows if row['outcome']['state']=='verified_resolution']
    censored=[row['outcome']['elapsed_days'] for row in rows if row['outcome']['state']=='right_censored']
    if not rows:return None,dict(method='scipy.stats.ecdf(CensoredData)',scipy_version=scipy.__version__,curve=[],median_days=None,maximum_followup_days=None)
    sf=ecdf(CensoredData(uncensored=events,right=censored)).sf
    curve=[dict(days=float(day),unresolved_fraction=float(p)) for day,p in zip(sf.quantiles,sf.probabilities)]
    median=next((point['days'] for point in curve if point['unresolved_fraction']<=.5),None)
    return sf,dict(method='scipy.stats.ecdf(CensoredData)',scipy_version=scipy.__version__,curve=curve,median_days=median,
        maximum_followup_days=max(events+censored))


def horizon_diagnostic(rows,horizon,probability):
    outcomes=[];unknown=0
    for row in rows:
        duration=row['outcome']['elapsed_days']
        if row['outcome']['state']=='verified_resolution':outcomes.append(int(duration<=horizon))
        elif duration>=horizon:outcomes.append(0)
        else:unknown+=1
    known=len(outcomes);total=known+unknown
    error=sum((probability-y)**2 for y in outcomes) if probability is not None else None
    lower=upper=None
    if total and probability is not None:
        a,b=probability**2,(1-probability)**2
        lower=(error+unknown*min(a,b))/total;upper=(error+unknown*max(a,b))/total
    return dict(days=horizon,completion_fraction_reference=probability,holdout_checkpoint_count=total,
        known_status_count=known,unknown_status_count=unknown,known_status_fraction=known/total if total else None,
        observed_completed_by_horizon_count=sum(outcomes),
        known_status_squared_error=error/known if known and error is not None else None,
        full_holdout_squared_error_bounds=dict(lower=lower,upper=upper),
        interpretation='Known-status subset error and worst-case missing-binary-status bounds; not IPCW, sampling confidence intervals or population calibration.')


def evaluate(training_document,later_document,*,grouping,horizons_days,min_train_groups,min_train_events,source_key,as_of=None):
    verify(training_document);verify(later_document)
    if grouping not in GROUPINGS or not isinstance(source_key,str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}',source_key):
        raise ValueError('Choose an explicit grouping and a bounded source-instance claim.')
    if type(min_train_groups) is not int or not 1<=min_train_groups<=5000 or type(min_train_events) is not int or not 0<=min_train_events<=5000:
        raise ValueError('Specify bounded working support requirements.')
    if not isinstance(horizons_days,list) or not 1<=len(horizons_days)<=20 or any(type(h) not in (int,float) or not math.isfinite(h) or not 0<h<=3650 for h in horizons_days) or len(set(horizons_days))!=len(horizons_days):
        raise ValueError('Provide distinct finite positive working horizons within the resource bound.')
    now=timestamp(as_of or datetime.now(timezone.utc))
    cutoff=timestamp(training_document['manifest']['as_of']);later_cutoff=timestamp(later_document['manifest']['as_of'])
    if not cutoff<later_cutoff<=now:raise ValueError('Use strictly ordered saved snapshots, without a future cutoff.')
    before,after=training_document['rows'],later_document['rows']
    if len(before)>5000 or len(after)>5000:raise ValueError('Snapshot exceeds the baseline bound.')
    if grouping!='shared_report' and any(doc['manifest']['asset_reference_coverage']!='scoped_reviewed_survey_references' for doc in (training_document,later_document)):
        raise ValueError('The requested asset grouping is unavailable in one snapshot.')
    checkpoints={};versions={}
    for row in before+after:
        cid=row['checkpoint_id'];version=(row['concern_id'],row['concern_version'])
        if versions.setdefault(version,cid)!=cid:raise ValueError('Concern/version lineage changed between snapshots.')
        if cid in checkpoints:
            old=checkpoints[cid]
            if any(row[k]!=old[k] for k in FROZEN_FIELDS) or any(row['lineage'][k]!=old['lineage'][k] for k in FROZEN_LINEAGE):
                raise ValueError('Frozen checkpoint content differs between snapshots.')
        else:checkpoints[cid]=row
    groups=joint_groups(before,after,grouping)
    historical_groups={groups[row['checkpoint_id']] for row in before}
    train=[row for row in before if eligible(row)]
    future=[row for row in after if timestamp(row['prediction_at'])>cutoff]
    purged=[row for row in future if groups[row['checkpoint_id']] in historical_groups]
    holdout=[row for row in future if groups[row['checkpoint_id']] not in historical_groups and eligible(row)]
    excluded_future=[row for row in future if groups[row['checkpoint_id']] not in historical_groups and not eligible(row)]
    before_ids={row['checkpoint_id'] for row in before}
    newly_visible_old=[row for row in after if timestamp(row['prediction_at'])<=cutoff and row['checkpoint_id'] not in before_ids]
    # Later linkage can invalidate a holdout's independence, but cannot change
    # the training-time support rule or rewrite an earlier reference curve.
    training_groups=joint_groups(before,[],grouping)
    train_groups={training_groups[row['checkpoint_id']] for row in train}
    train_events=sum(row['outcome']['state']=='verified_resolution' for row in train)
    support=len(train_groups)>=min_train_groups and train_events>=min_train_events
    sf,reference=survival_reference(train) if support else survival_reference([])
    supported=reference['maximum_followup_days']
    horizons=[]
    for day in sorted(horizons_days):
        probability=float(1-sf.evaluate(day)) if sf is not None and day<=supported else None
        diagnostic=horizon_diagnostic(holdout,float(day),probability)
        diagnostic['reference_status']='available_descriptive_only' if probability is not None else 'insufficient_training_support' if not support else 'beyond_observed_training_followup'
        horizons.append(diagnostic)
    exclusions=Counter(row['outcome']['state'] for row in before if not eligible(row))
    later_exclusions=Counter(row['outcome']['state'] for row in excluded_future)
    later_by_id={row['checkpoint_id']:row for row in after}
    overlap=[row for row in before if row['checkpoint_id'] in later_by_id]
    result=dict(schema_version=SCHEMA,as_of=iso(now),source_key_claim=source_key,source_instance_verified=False,
        training_export_sha256=training_document['manifest']['export_sha256'],evaluation_export_sha256=later_document['manifest']['export_sha256'],
        training_cutoff=iso(cutoff),evaluation_cutoff=iso(later_cutoff),
        data_origin='synthetic' if any(doc['manifest']['data_origin']=='synthetic' for doc in (training_document,later_document)) else 'unattested',
        model_status='descriptive_temporal_reference_not_live_eta',training_release_eligible=False,live_inference_allowed=False,
        working_policy=dict(grouping=grouping,horizons_days=sorted(horizons_days),min_train_groups=min_train_groups,min_train_events=min_train_events,status='unapproved_working_analysis'),
        unit='Eligible checkpoint; within-group dependence is retained, not treated as independent sampling or used for confidence intervals.',
        grouping_policy='Joint graph across both snapshots; all historical footprints purge related later holdout checkpoints. Future references are grouping-only.',
        counts=dict(training_source_checkpoints=len(before),training_eligible_checkpoints=len(train),training_eligible_groups=len(train_groups),training_completion_events=train_events,
            evaluation_source_checkpoints=len(after),evaluation_nonfuture_checkpoints=len(after)-len(future),newly_visible_pre_cutoff_checkpoints=len(newly_visible_old),
            training_censored_checkpoints=len(train)-train_events,future_checkpoints=len(future),purged_related_future_checkpoints=len(purged),
            joint_training_eligible_groups_after_later_references=len({groups[row['checkpoint_id']] for row in train}),
            holdout_eligible_checkpoints=len(holdout),holdout_eligible_groups=len({groups[row['checkpoint_id']] for row in holdout}),
            historical_checkpoints_seen_again=len(overlap),
            historical_outcome_states_changed_later=sum(row['outcome']['state']!=later_by_id[row['checkpoint_id']]['outcome']['state'] for row in overlap),
            historical_eligibility_changed_later=sum(eligible(row)!=eligible(later_by_id[row['checkpoint_id']]) for row in overlap),
            training_excluded_states=dict(sorted(exclusions.items())),holdout_excluded_states=dict(sorted(later_exclusions.items()))),
        reference_status='available_descriptive_only' if support else 'insufficient_training_support',reference=reference,horizons=horizons,
        holdout_status='available_descriptive_only' if holdout else 'none_after_temporal_group_and_eligibility_filters',
        label_change_policy='Later label changes are diagnostic counts only; they never filter or rewrite the earlier training labels.',
        support_group_scope='Working support requirements use training-snapshot groups only. Joint later groups are used for purge/audit, not fitting or support selection.',
        assignments=[dict(checkpoint_id=row['checkpoint_id'],group=groups[row['checkpoint_id']],role=role,source_audit_eligible=eligible(row))
            for role,rows in (('training_source',before),('purged_future',purged),('eligible_holdout',holdout),('excluded_future',excluded_future),('newly_visible_nonfuture',newly_visible_old)) for row in rows],
        blockers=['source_identity_and_physical_episode_outcomes_not_independently_attested','working_policy_not_an_approved_release_policy',
            'kaplan_meier_independent_censoring_assumption_unverified','eligibility_is_conditioned_on_export_time_outcome_and_membership_state',
            'competing_excluded_outcomes_are_not_part_of_an_unconditional_city_completion_distribution',
            'known_status_error_is_not_full_population_censoring_adjusted_evaluation','prospective_model_comparison_and_release_required'],
        privacy='Private checkpoint/group references and timing summaries; not anonymized. No raw evidence or executable model is read or emitted.')
    result['analysis_sha256']=sha256(canonical(result)).hexdigest()
    return result
