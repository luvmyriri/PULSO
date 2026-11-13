"""Offline agreement/grouping diagnostics. Never authorizes an automatic merge."""
from collections import Counter,defaultdict
from datetime import datetime,timezone
from hashlib import sha256
from typing import Annotated,Literal

from pydantic import AwareDatetime,BaseModel,ConfigDict,Field,StringConstraints,model_validator

from learning_dataset_contract import canonical,iso,timestamp
from matching_dataset_contract import verify

SCHEMA='pulso-matching-evaluation-v1'
PREDICTION_SCHEMA='pulso-matching-predictions-v1'
MAX_PAIRS=5000
RELEASE_BLOCKERS=[
    'reviewer_labels_not_independently_attested',
    'representative_same_object_and_adjacent_lookalike_trials_required',
    'physical_asset_and_episode_leakage_audit_required','prospective_evaluation_required',
    'prediction_evidence_and_independence_not_attested',
    'review_selected_pair_universe_is_not_an_independent_retrieval_benchmark',
]
Identifier=Annotated[str,StringConstraints(pattern=r'^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$')]
Digest=Annotated[str,StringConstraints(pattern=r'^[a-f0-9]{64}$')]
Relation=Literal['same_problem','same_asset_different_problem','different_asset','uncertain']
Partition=Literal['train','validation','test']


class Prediction(BaseModel):
    model_config=ConfigDict(extra='forbid',strict=True)
    left_observation_id:int=Field(gt=0)
    right_observation_id:int=Field(gt=0)
    partition:Partition|None
    retrieved:bool|None
    decision:Relation|Literal['not_evaluated']|None

    @model_validator(mode='after')
    def order(self):
        if self.left_observation_id>=self.right_observation_id:
            raise ValueError('Prediction pairs need canonical distinct observation IDs.')
        return self


class PredictionRun(BaseModel):
    model_config=ConfigDict(extra='forbid')
    schema_version:Literal['pulso-matching-predictions-v1']=PREDICTION_SCHEMA
    source_export_sha256:Digest
    run_id:Identifier
    artifact_key:Identifier
    generated_at:AwareDatetime|None
    data_origin:Literal['synthetic','field_collected','unattested']='unattested'
    predictions:list[Prediction]=Field(max_length=MAX_PAIRS)


def key(row):
    return row['left_observation_id'],row['right_observation_id']


def latest_rows(document):
    """Validate history before choosing one highest revision per observation pair."""
    if isinstance(document,dict) and isinstance(document.get('rows'),list) and len(document['rows'])>MAX_PAIRS:
        raise ValueError('Matching history exceeds the evaluation bound.')
    verify(document)
    if document['manifest'].get('data_origin') not in {'unattested','synthetic','field_collected'}:
        raise ValueError('Unsupported source origin claim.')
    rows=document['rows']
    latest,seen_revisions,observation_reports={},{},{}
    as_of=timestamp(document['manifest']['as_of'])
    for row in rows:
        pair=key(row)
        if timestamp(row['recorded_at'])>as_of:
            raise ValueError('A reference review postdates its export snapshot.')
        revisions=seen_revisions.setdefault(pair,set())
        if row['revision'] in revisions:
            raise ValueError('Duplicate pair revision.')
        revisions.add(row['revision'])
        for side in ('left','right'):
            observation,report=row[side+'_observation_id'],row[side+'_report_id']
            if observation_reports.setdefault(observation,report)!=report:
                raise ValueError('Observation/report lineage is inconsistent.')
        if row['relation']!='uncertain' and not {'photos','field_visit'}&set(row['evidence_basis']):
            raise ValueError('Decisive reference needs observed evidence.')
        if 'photos' in row['evidence_basis'] and not all(row['features'][side+'_photo_present'] for side in ('left','right')):
            raise ValueError('Photo-based reference lacks both photos.')
        if pair not in latest or row['revision']>latest[pair]['revision']:
            latest[pair]=row
    if any(row['latest_review']!=(row['revision']==latest[key(row)]['revision']) for row in rows):
        raise ValueError('Latest-review flags contradict the complete supplied history.')
    return [latest[pair] for pair in sorted(latest)]


def prepare(document,*,run_id,artifact_key,at=None):
    """A blank scoring work file, without copied answers or generated decisions."""
    rows=latest_rows(document)
    return PredictionRun(source_export_sha256=document['manifest']['export_sha256'],run_id=run_id,artifact_key=artifact_key,
        generated_at=at,predictions=[Prediction(left_observation_id=key(row)[0],right_observation_id=key(row)[1],
            partition=None,retrieved=None,decision=None) for row in rows]).model_dump(mode='json')


def ratio(numerator,denominator):
    return numerator/denominator if denominator else None


def metrics(rows):
    valid=[row for row in rows if row['reference_eligible']]
    positive=[row for row in valid if row['reference_relation']=='same_problem']
    links=[row for row in valid if row['decision']=='same_problem']
    supported=sum(row['reference_relation']=='same_problem' for row in links)
    false_links=[row for row in links if row['reference_relation']!='same_problem']
    classified=[row for row in valid if row['retrieved'] and row['decision']!='uncertain']
    matrix=defaultdict(Counter)
    for row in valid:
        matrix[row['reference_relation']][row['decision']]+=1
    return dict(provided_pair_count=len(rows),current_decisive_reference_count=len(valid),
        stale_reference_count=sum(not row['reference_current'] for row in rows),
        current_uncertain_reference_count=sum(row['reference_current'] and row['reference_relation']=='uncertain' for row in rows),
        retrieved_pair_count=sum(row['retrieved'] for row in rows),
        proposed_link_without_current_decisive_reference_count=sum(row['decision']=='same_problem' and not row['reference_eligible'] for row in rows),
        provided_positive_count=len(positive),provided_positive_retrieved_count=sum(row['retrieved'] for row in positive),
        provided_positive_retrieval_fraction=ratio(sum(row['retrieved'] for row in positive),len(positive)),
        supported_direct_link_count=supported,contradicted_direct_link_count=len(false_links),
        false_episode_link_same_asset_count=sum(row['reference_relation']=='same_asset_different_problem' for row in false_links),
        false_link_different_asset_count=sum(row['reference_relation']=='different_asset' for row in false_links),
        direct_link_precision_against_operational_references=ratio(supported,len(links)),
        provided_positive_direct_link_fraction=ratio(supported,len(positive)),
        provided_positive_not_directly_linked_count=len(positive)-supported,
        decisive_prediction_count=len(classified),decisive_prediction_coverage=ratio(len(classified),len(valid)),
        selective_relation_agreement=ratio(sum(row['decision']==row['reference_relation'] for row in classified),len(classified)),
        abstention_count=sum(row['decision']=='uncertain' for row in valid),
        not_retrieved_count=sum(not row['retrieved'] for row in valid),
        confusion_counts={name:dict(sorted(counts.items())) for name,counts in sorted(matrix.items())},
        transitive_contradiction_count=sum(row['reference_eligible'] and row['reference_relation']!='same_problem' and row['predicted_co_clustered'] for row in rows),
        transitive_same_asset_different_problem_count=sum(row['reference_eligible'] and row['reference_relation']=='same_asset_different_problem' and row['predicted_co_clustered'] for row in rows),
        provided_positive_not_co_clustered_count=sum(not row['predicted_co_clustered'] for row in positive))


def evaluate(document,prediction_document,*,as_of=None):
    rows=latest_rows(document)
    run=PredictionRun.model_validate(prediction_document)
    as_of=as_of or datetime.now(timezone.utc)
    if run.source_export_sha256!=document['manifest']['export_sha256']:
        raise ValueError('Predictions are for another evidence snapshot.')
    if run.generated_at is None:
        raise ValueError('A completed scoring run needs its actual generation time.')
    if not timestamp(document['manifest']['as_of'])<=run.generated_at<=timestamp(as_of):
        raise ValueError('Scoring time must fall between the export snapshot and evaluation.')
    predictions={}
    for prediction in run.predictions:
        pair=(prediction.left_observation_id,prediction.right_observation_id)
        if pair in predictions:
            raise ValueError('Duplicate prediction pair.')
        if prediction.partition is None or prediction.retrieved is None or prediction.decision is None:
            raise ValueError('Complete every scoring entry; a blank template is not a model run.')
        if (prediction.retrieved and prediction.decision=='not_evaluated') or (not prediction.retrieved and prediction.decision!='not_evaluated'):
            raise ValueError('Retrieval and decision disagree.')
        predictions[pair]=prediction
    if set(predictions)!={key(row) for row in rows}:
        raise ValueError('Supply exactly one scoring result for every latest pair, including non-retrieved pairs.')
    partitions={}
    for row in rows:
        partition=predictions[key(row)].partition
        group=row['evaluation_group']
        if partitions.setdefault(group,partition)!=partition:
            raise ValueError('Shared-report evaluation groups must stay in one partition.')

    # Inspect the implications of applying proposed same-problem edges, even
    # where another observed edge abstained or was not retrieved.
    parents={}
    def root(partition,observation):
        item=(partition,observation)
        parents.setdefault(item,item)
        while parents[item]!=item:
            parents[item]=parents[parents[item]]
            item=parents[item]
        return item
    for pair,prediction in predictions.items():
        if prediction.decision=='same_problem':
            a,b=sorted((root(prediction.partition,pair[0]),root(prediction.partition,pair[1])))
            parents[b]=a
    results=[]
    for row in rows:
        prediction=predictions[key(row)]
        results.append(dict(left_observation_id=key(row)[0],right_observation_id=key(row)[1],
            latest_review_id=row['review_id'],reference_relation=row['relation'],reference_current=row['current_evidence'],
            reference_eligible=row['current_evidence'] and row['relation']!='uncertain',
            partition=prediction.partition,evaluation_group=row['evaluation_group'],retrieved=prediction.retrieved,decision=prediction.decision,
            predicted_co_clustered=root(prediction.partition,key(row)[0])==root(prediction.partition,key(row)[1])))
    report=dict(schema_version=SCHEMA,as_of=iso(as_of),source_export_sha256=run.source_export_sha256,
        prediction_sha256=sha256(canonical(prediction_document)).hexdigest(),run_id=run.run_id,artifact_key=run.artifact_key,
        predictions_generated_at=iso(run.generated_at),
        data_origin='synthetic' if run.data_origin=='synthetic' else 'unattested',prediction_data_origin_claim=run.data_origin,
        source_data_origin=document['manifest']['data_origin'],reference_basis='latest_current_operational_reviewer_judgments',
        training_release_eligible=False,automatic_matching_release_allowed=False,
        release_blockers=list(RELEASE_BLOCKERS),
        interpretation='Descriptive agreement on supplied reviewed pairs only; no population recall, independently verified accuracy or release approval.',
        history_row_count=len(document['rows']),latest_pair_count=len(rows),evaluation_group_count=len(partitions),
        summary=metrics(results),by_partition={part:metrics([row for row in results if row['partition']==part]) for part in ('train','validation','test')},
        partition_policy='Reported aggregate includes all partitions. Shared report groups cannot split; physical asset/episode independence remains unproven.',
        cluster_policy='Connected components of supplied same-problem predictions within each partition; unprovided edges and production clusters are not evaluated.',
        privacy='Private observation/review/group references only; no images, raw coordinates, contacts or narratives.',rows=results)
    report['evaluation_sha256']=sha256(canonical(report)).hexdigest()
    return report
