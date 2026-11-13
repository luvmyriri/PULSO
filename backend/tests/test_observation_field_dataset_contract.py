"""Synthetic field-audit semantics and safe offline collection; no condition truth."""
from copy import deepcopy
from datetime import datetime,timedelta,timezone
from io import BytesIO
import json
from pathlib import Path
import subprocess
import sys
from uuid import UUID

import pytest

from learning_dataset_contract import canonical
from observation_field_dataset_contract import seal,verify,SCHEMA,SOURCE_SCHEMA
from scripts import export_report_learning as cli

AT=datetime(2026,11,1,tzinfo=timezone.utc)
AS_OF=AT+timedelta(days=5)
CATEGORIES=['Roads & Bridges','Water & Drainage']


def item(key=1,report=1):
    return dict(problem=dict(observation_id=key,report_id=report,report_version=1,report_status='pending',barangay_id=171,
        concern_id='CON-'+f'{key:032x}',concern_version=1,categories=list(CATEGORIES),evidence_sha256='a'*64),
        assessment_revision=0,assessments=[],report_completion=dict(state='no_current_sourced_report_resolution',
            verified_at=None,event_id=None,source_kind=None,source_id=None))


def assessed(key=1,report=1):
    row=item(key,report);field_id=str(UUID(int=key));photo_id=str(UUID(int=key+100))
    source=dict(schema_version=SOURCE_SCHEMA,identity_confirmed=True,problem=deepcopy(row['problem']),
        field=dict(field_observation_id=field_id,asset_id='SAMPLE-'+str(key),asset_barangay_id=171,source_report_id=report,
            observed_at=(AT+timedelta(days=1)).isoformat(),visibility='visible',condition='defect_observed',review_status='accepted',
            identity_confirmed=True,location_reviewed=True,recorded_by_id=2,reviewed_by_id=1,
            reviewed_at=(AT+timedelta(days=2)).isoformat(),evidence_reference=photo_id,evidence_asset_id='SAMPLE-'+str(key),
            evidence_sha256='b'*64,context_sha256='c'*64))
    from hashlib import sha256
    row['assessments']=[dict(id=key,revision=1,actor_id=1,recorded_at=(AT+timedelta(days=3)).isoformat(),field_observation_id=field_id,
        category_findings=[dict(category=CATEGORIES[0],finding='no_defect_observed'),dict(category=CATEGORIES[1],finding='defect_observed')],
        source_snapshot=source,source_snapshot_sha256=sha256(canonical(source)).hexdigest(),current_context=True,context_blockers=[])]
    row['assessment_revision']=1
    return row


def document(rows=None,**options):
    return seal(rows if rows is not None else [assessed()],AS_OF,legacy_report_ids=[],data_origin='synthetic',**options)


def test_unassessed_categories_remain_in_denominator_and_are_not_completion_labels():
    doc=document([item(),assessed(2,2)]);manifest=verify(doc)
    assert manifest['category_count']==4 and manifest['assessment_count']==1
    assert manifest['category_coverage_state_counts']=={'not_recorded':2,'reviewed_condition':2}
    assert manifest['current_known_finding_counts']=={'defect_observed':1,'no_defect_observed':1}
    assert manifest['sourced_verified_report_count']==0 and manifest['training_release_eligible'] is False


def test_all_uncertain_current_findings_remain_unknown_with_history_preserved():
    row=assessed();old=row['assessments'][0];old.update(current_context=False,context_blockers=['superseded_by_later_assessment'])
    correction=deepcopy(old);correction.update(id=2,revision=2,recorded_at=(AT+timedelta(days=4)).isoformat(),current_context=True,context_blockers=[])
    for part in correction['category_findings']:part['finding']='not_assessed'
    row.update(assessments=[old,correction],assessment_revision=2)
    doc=document([row]);manifest=verify(doc)
    assert manifest['assessment_count']==2 and manifest['current_known_finding_counts']=={}
    assert manifest['category_coverage_state_counts']=={'not_assessed':2}


def test_stale_assessment_does_not_leave_a_current_negative_finding():
    row=assessed();row['assessments'][0].update(current_context=False,context_blockers=['private_evidence_missing_or_changed'])
    doc=document([row]);verify(doc)
    assert all(v['state']=='historical_or_changed_context' and v['finding'] is None for v in doc['rows'][0]['category_coverage'])


def test_extended_groups_keep_shared_asset_or_exact_photo_evidence_together():
    rows=[assessed(1,1),assessed(2,2)]
    doc=document(rows);verify(doc)
    a,b=doc['rows']
    assert a['evaluation_groups']['shared_report_or_concern']!=b['evaluation_groups']['shared_report_or_concern']
    assert a['evaluation_groups']['shared_report_concern_asset_or_evidence']==b['evaluation_groups']['shared_report_concern_asset_or_evidence']


@pytest.mark.parametrize('change',[
    lambda r:r['problem'].update(latitude=14.75),
    lambda r:r['problem'].update(categories=[]),
    lambda r:r['problem'].update(report_id=True),
    lambda r:r['assessments'][0].update(actor_id=2),
    lambda r:r['assessments'][0].update(revision=2),
    lambda r:r['assessments'][0].update(recorded_at=(AS_OF+timedelta(days=1)).isoformat()),
    lambda r:r['assessments'][0]['category_findings'][0].update(finding='repaired'),
    lambda r:r['assessments'][0].update(context_blockers=['private_evidence_missing_or_changed']),
    lambda r:r['report_completion'].update(state='sourced_verified_report_resolution'),
    lambda r:r.update(assessment_revision=2),
])
def test_resealed_false_structure_or_claim_is_rejected(change):
    row=assessed();change(row)
    with pytest.raises((ValueError,KeyError)):verify(document([row]))


def test_resealed_false_group_counts_privacy_and_release_metadata_are_rejected():
    from hashlib import sha256
    changes=[lambda d:d['manifest'].update(training_release_eligible=True),
        lambda d:d['manifest'].update(assessment_count=90),lambda d:d['manifest'].update(data_origin='field_collected'),
        lambda d:d['manifest'].update(private_notes='SAMPLE forbidden text'),
        lambda d:d['rows'][0]['evaluation_groups'].update(shared_report_or_concern='FAKE'),
        lambda d:d['rows'][0]['category_coverage'][0].update(state='not_recorded',finding=None)]
    for change in changes:
        doc=document();change(doc)
        doc['manifest']['rows_sha256']=sha256(canonical(doc['rows'])).hexdigest()
        unsigned={k:v for k,v in doc['manifest'].items() if k!='export_sha256'}
        doc['manifest']['export_sha256']=sha256(canonical(dict(manifest=unsigned,rows=doc['rows']))).hexdigest()
        with pytest.raises(ValueError):verify(doc)


def test_complete_revisions_and_source_hash_are_not_optional():
    row=assessed();row['assessments'][0]['source_snapshot']['field']['context_sha256']='d'*64
    with pytest.raises(ValueError,match='snapshot'):verify(document([row]))


def test_separate_report_verification_does_not_turn_unknown_findings_into_repair():
    row=item();row['problem']['report_status']='resolved';row['report_completion'].update(state='sourced_verified_report_resolution',event_id=1,
        source_kind='work_order_inspection',source_id=3,verified_at=(AT+timedelta(days=2)).isoformat())
    manifest=verify(document([row]))
    assert manifest['sourced_verified_report_count']==1 and manifest['category_coverage_state_counts']=={'not_recorded':2}


def test_collector_fetch_selection_schema_and_offline_verify_keep_transport_safeguards(tmp_path,monkeypatch,capsys):
    doc=document(selection_report_id=1);calls=[]
    monkeypatch.setenv('PULSO_LEARNING_TOKEN','SAMPLE-PRIVATE-TOKEN')
    def fetch(request):
        calls.append(request.full_url)
        assert request.get_header('Authorization')=='Bearer SAMPLE-PRIVATE-TOKEN'
        return BytesIO(canonical(doc))
    monkeypatch.setattr(cli,'open_request',fetch)
    output=tmp_path/'private.json'
    args=['fetch','--dataset','observation-fields','--report-id','1','--max-cases','20','--output',str(output)]
    assert cli.main(args)==0
    assert calls==['http://127.0.0.1:8000/api/gov/report-learning/observation-field-dataset?max_observations=20&report_id=1']
    assert cli.main(['verify','--input',str(output)])==0 and len(calls)==1
    assert cli.main(args)==2 and len(calls)==1
    text=capsys.readouterr();assert 'SAMPLE-PRIVATE-TOKEN' not in text.out+text.err
    assert json.loads(output.read_bytes())['manifest']['schema_version']==SCHEMA


@pytest.mark.parametrize('other',['wrong_schema','wrong_selection'])
def test_collector_refuses_valid_but_different_response(tmp_path,monkeypatch,other):
    from matching_dataset_contract import seal as other_seal
    doc=other_seal([],AS_OF) if other=='wrong_schema' else document()
    monkeypatch.setenv('PULSO_LEARNING_TOKEN','SAMPLE-PRIVATE-TOKEN')
    monkeypatch.setattr(cli,'open_request',lambda *_:BytesIO(canonical(doc)))
    output=tmp_path/'not-created.json'
    assert cli.main(['fetch','--dataset','observation-fields','--report-id','1','--output',str(output)])==1
    assert not output.exists()


def test_standalone_verifier_has_no_database_provider_or_network_dependency(tmp_path):
    source=tmp_path/'synthetic.json';source.write_bytes(canonical(document()))
    script=Path(__file__).resolve().parents[1]/'scripts'/'export_report_learning.py'
    code="""
import runpy,socket,sys
def denied(*a,**k):raise RuntimeError('Unexpected network access')
class NoNetwork(socket.socket):
    def __new__(cls,*a,**k):return denied()
socket.socket=NoNetwork;socket.create_connection=socket.getaddrinfo=denied
sys.modules['database']=None;sys.modules['gemini_service']=None
sys.argv=sys.argv[1:];runpy.run_path(sys.argv[0],run_name='__main__')
"""
    result=subprocess.run([sys.executable,'-c',code,str(script),'verify','--input',str(source)],capture_output=True,text=True,timeout=30)
    assert result.returncode==0,result.stderr


@pytest.mark.parametrize('kind',['missing_metadata','deep_json'])
def test_malformed_private_file_fails_with_generic_error_and_preserves_source(tmp_path,capsys,kind):
    if kind=='missing_metadata':
        doc=document();del doc['manifest']['as_of'];content=canonical(doc)
    else:content=b'['*3000+b'"SAMPLE-PRIVATE-VALUE"'+b']'*3000
    source=tmp_path/'invalid.json';source.write_bytes(content)
    assert cli.main(['verify','--input',str(source)])==1
    assert source.read_bytes()==content
    assert 'SAMPLE-PRIVATE-VALUE' not in capsys.readouterr().err
