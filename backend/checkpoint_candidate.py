"""Offline experimental LightGBM rate model. Never installs a live ETA artifact."""
from collections import Counter
from hashlib import sha256
import math

from checkpoint_baseline import evaluate as baseline_evaluate,eligible,joint_groups
from learning_dataset_contract import canonical,CATEGORY_LABELS

SCHEMA='pulso-checkpoint-lightgbm-experiment-v1'
MAX_PERIODS=100000
NUMERIC=('report_count','observation_count','unreviewed_observation_count','reviewer_confirmed_observation_count',
    'reviewer_separated_observation_count','elapsed_before_checkpoint_days','original_issue_accuracy_known_count','original_issue_accuracy_max_m')
LOCATIONS=('device','manual','search','uploaded_metadata','unknown')
PHOTOS=('camera','upload','unknown')
CATEGORIES=tuple(sorted(CATEGORY_LABELS))
FEATURE_NAMES=list(NUMERIC)+['original_area_count','original_area_set_code']+['original_location_'+s for s in LOCATIONS]+[
    'original_photo_'+s for s in PHOTOS]+[f'category_{i:03}' for i in range(len(CATEGORIES))]+['interval_index','interval_start_days','interval_end_days']
AREA_INDEX=FEATURE_NAMES.index('original_area_set_code')
INTERVAL_INDEX=FEATURE_NAMES.index('interval_index')


def context_key(row):
    return tuple(row['features']['concern_categories']),tuple(row['features']['reported_barangay_ids'])


class Encoder:
    def __init__(self,rows):
        self.areas={value:i for i,value in enumerate(sorted({tuple(r['features']['reported_barangay_ids']) for r in rows}))}
        self.context_followup={}
        for row in rows:
            key=context_key(row)
            self.context_followup[key]=max(self.context_followup.get(key,0),row['outcome']['elapsed_days'])

    def vector(self,row,index,start,end):
        f=row['features'];areas=tuple(f['reported_barangay_ids'])
        return [float(f[k]) if f[k] is not None else float('nan') for k in NUMERIC]+[len(areas),self.areas.get(areas,-1)]+[
            f['original_location_source_counts'][s] for s in LOCATIONS]+[f['original_photo_source_counts'][s] for s in PHOTOS]+[
            int(label in f['concern_categories']) for label in CATEGORIES]+[index,start,end]

    def provenance(self):
        return dict(feature_names=FEATURE_NAMES,category_order=list(CATEGORIES),area_vocabulary_size=len(self.areas),
            area_vocabulary_sha256=sha256(canonical([list(a) for a in self.areas])).hexdigest(),
            vocabulary_scope='Positive-exposure training checkpoints only; no later labels, areas or category-frequency fitting.',
            categorical_features=[FEATURE_NAMES[AREA_INDEX],FEATURE_NAMES[INTERVAL_INDEX]],
            context_policy='Unseen category/area combinations and horizons beyond their observed training follow-up abstain.')


def periods(rows,ends,encoder):
    x=[];rates=[];weights=[];owners=[];events=Counter();exposure=Counter();zero_censored=0;capped=0
    for row in rows:
        duration=row['outcome']['elapsed_days'];event=row['outcome']['state']=='verified_resolution'
        if duration==0:
            if event:raise ValueError('Zero-time events need a clock/model review; no artificial exposure is added.')
            zero_censored+=1;continue
        if duration>ends[-1]:capped+=1
        start=0.
        for i,end in enumerate(ends):
            used=max(0.,min(duration,end)-start)
            if used>0:
                occurred=int(event and start<duration<=end)
                rate=occurred/used
                if not math.isfinite(rate) or used<1.1754944e-38 or rate>3.4028234e38:
                    raise ValueError('Exposure or rate lies outside the numeric training range.')
                x.append(encoder.vector(row,i,start,end));rates.append(rate);weights.append(used);owners.append(row['checkpoint_id'])
                events[i]+=occurred;exposure[i]+=used
                if len(x)>MAX_PERIODS:raise ValueError('Expanded experiment exceeds its period bound.')
            if duration<=end:break
            start=end
    return dict(x=x,y=rates,weights=weights,owners=owners,event_count=sum(events.values()),
        interval_events=[events[i] for i in range(len(ends))],interval_exposure_days=[exposure[i] for i in range(len(ends))],
        zero_followup_censored_checkpoints=zero_censored,administratively_capped_checkpoints=capped)


def score(rows,probabilities,horizon):
    known=unknown=0;error=lower=upper=0.;completed=0
    for row,p in zip(rows,probabilities):
        if p is None:continue
        duration=row['outcome']['elapsed_days']
        status=int(duration<=horizon) if row['outcome']['state']=='verified_resolution' else 0 if duration>=horizon else None
        if status is None:
            unknown+=1;lower+=min(p*p,(1-p)**2);upper+=max(p*p,(1-p)**2)
        else:
            known+=1;completed+=status;value=(p-status)**2;error+=value;lower+=value;upper+=value
    n=known+unknown
    return dict(prediction_count=n,abstention_count=len(rows)-n,prediction_coverage=n/len(rows) if rows else None,
        known_status_count=known,unknown_status_count=unknown,known_status_fraction=known/n if n else None,
        observed_completed_by_horizon_count=completed,known_status_squared_error=error/known if known else None,
        squared_error_bounds=dict(lower=lower/n if n else None,upper=upper/n if n else None))


def experiment(training,later,*,grouping,interval_ends,min_train_groups,min_train_events,source_key,trees,seed,as_of=None):
    if type(trees) is not int or not 1<=trees<=200 or type(seed) is not int or not 0<=seed<2**31:
        raise ValueError('Use bounded working tree/seed settings.')
    baseline=baseline_evaluate(training,later,grouping=grouping,horizons_days=interval_ends,
        min_train_groups=min_train_groups,min_train_events=min_train_events,source_key=source_key,as_of=as_of)
    ends=sorted(float(v) for v in interval_ends)
    train=[row for row in training['rows'] if eligible(row)]
    selected={item['checkpoint_id'] for item in baseline['assignments'] if item['role']=='eligible_holdout'}
    holdout=[row for row in later['rows'] if row['checkpoint_id'] in selected]
    contributing=[row for row in train if row['outcome']['elapsed_days']>0]
    encoder=Encoder(contributing)
    params=dict(objective='poisson',n_estimators=trees,learning_rate=.05,num_leaves=7,max_depth=3,min_child_samples=10,
        reg_lambda=1.,random_state=seed,n_jobs=1,verbosity=-1,deterministic=True,force_col_wise=True)
    status='fitted_offline_experiment';data=None;model=None;model_sha=None;runtime=None
    if baseline['reference_status']!='available_descriptive_only':status='insufficient_training_support'
    elif any(row['outcome']['elapsed_days']==0 and row['outcome']['state']=='verified_resolution' for row in train):
        status='zero_time_event_requires_clock_or_model_review'
    else:
        data=periods(train,ends,encoder)
        training_groups=joint_groups(training['rows'],[],grouping)
        exposed_groups={training_groups[cid] for cid in data['owners']}
        if len(exposed_groups)<min_train_groups or data['event_count']<max(1,min_train_events):status='insufficient_exposed_groups_or_in_grid_events'
        elif len(data['y'])<2:status='insufficient_exposed_periods_for_runtime'
        else:
            import lightgbm as lgb
            import numpy as np
            runtime=lgb.__version__
            try:
                model=lgb.LGBMRegressor(**params)
                model.fit(np.asarray(data['x'],dtype=float),np.asarray(data['y'],dtype=float),sample_weight=np.asarray(data['weights'],dtype=float),
                    feature_name=FEATURE_NAMES,categorical_feature=[AREA_INDEX,INTERVAL_INDEX])
                model_sha=sha256(model.booster_.model_to_string().encode()).hexdigest()
            except Exception:
                raise ValueError('LightGBM runtime did not produce a complete experiment.') from None
    predictions=[];comparisons=[]
    for row in holdout:
        cap=encoder.context_followup.get(context_key(row));rates=None
        if model is not None and cap is not None:
            import numpy as np
            start=0.;x=[]
            for i,end in enumerate(ends):x.append(encoder.vector(row,i,start,end));start=end
            rates=[float(v) for v in model.booster_.predict(np.asarray(x,dtype=float),num_threads=1)]
            if any(not math.isfinite(value) or value<0 for value in rates):raise ValueError('Unsupported model rate output.')
        cumulative=0.;start=0.;values=[];median=None
        for i,end in enumerate(ends):
            reason=status if model is None else 'unseen_training_category_area_context' if cap is None else 'beyond_context_training_followup' if end>cap else None
            p=None
            if rates is not None:
                cumulative+=rates[i]*(end-start)
                if reason is None:
                    p=-math.expm1(-cumulative)
                    if median is None and p>=.5:median=dict(lower_exclusive_days=start,upper_inclusive_days=end)
            values.append(dict(days=end,completion_probability=p,abstention_reason=reason));start=end
        predictions.append(dict(checkpoint_id=row['checkpoint_id'],context_seen=cap is not None,context_maximum_training_followup_days=cap,
            horizons=values,median_grid_bracket_days=median))
    for i,end in enumerate(ends):
        candidate=[row['horizons'][i]['completion_probability'] for row in predictions]
        reference=baseline['horizons'][i]['completion_fraction_reference']
        matched_rows=[];matched_candidate=[];matched_reference=[]
        for row,p in zip(holdout,candidate):
            if p is not None and reference is not None:
                matched_rows.append(row);matched_candidate.append(p);matched_reference.append(reference)
        comparisons.append(dict(days=end,candidate_coverage=score(holdout,candidate,end),
            matched_checkpoint_count=len(matched_rows),matched_fraction=len(matched_rows)/len(holdout) if holdout else None,
            candidate_on_matched=score(matched_rows,matched_candidate,end),reference_on_matched=score(matched_rows,matched_reference,end),
            interpretation='Identical covered checkpoint subset; unknown horizon status retained. Descriptive subset errors/bounds, not IPCW or calibration.'))
    result=dict(schema_version=SCHEMA,as_of=baseline['as_of'],data_origin=baseline['data_origin'],source_key_claim=source_key,
        source_instance_verified=False,training_export_sha256=baseline['training_export_sha256'],evaluation_export_sha256=baseline['evaluation_export_sha256'],
        model_status=status,live_inference_allowed=False,training_release_eligible=False,reusable_model_emitted=False,
        method='Piecewise-constant hazard via exposure-weighted Poisson LightGBM: target=event/exposure, sample_weight=exposure.',
        time_policy='Exact positive partial exposure retained; event on interval end belongs to that interval; no zero-time padding or tail extrapolation.',
        working_policy=dict(status='unapproved_research_recipe',interval_ends_days=ends,parameters=params),
        lightgbm_version=runtime,model_text_sha256=model_sha,encoder=encoder.provenance(),temporal_reference=baseline,
        expansion=dict(person_period_count=len(data['y']),in_grid_event_count=data['event_count'],
            total_exposure_days=sum(data['weights']),interval_event_counts=data['interval_events'],interval_exposure_days=data['interval_exposure_days'],
            zero_followup_censored_checkpoints=data['zero_followup_censored_checkpoints'],administratively_capped_checkpoints=data['administratively_capped_checkpoints']) if data else None,
        predictions=predictions,comparisons=comparisons,
        blockers=baseline['blockers']+['experimental_piecewise_hazard_and_independent_censoring_assumptions_not_validated',
            'no_independent_calibration_or_hyperparameter_selection_snapshot','per_observation_repair_coverage_not_established',
            'unseen_context_and_tail_abstentions_require_prospective_policy','cohort_audit_is_not_an_approved_model_release_dataset'],
        privacy='Private checkpoint references and experimental probabilities. No evidence, executable model, credentials or report narratives emitted.')
    result['experiment_sha256']=sha256(canonical(result)).hexdigest()
    return result
