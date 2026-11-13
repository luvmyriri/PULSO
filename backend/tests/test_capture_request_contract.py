"""Client-observed intervals are useful measurement data, never location proof."""
from datetime import datetime,timedelta,timezone
import json
from pathlib import Path
import shutil
import subprocess
import pytest
from pydantic import ValidationError
from capture_request_contract import CameraLocationRequest
from location_pilot import Pilot,audit,trial_from_record
from report_intelligence import LocationEvidence


def interval(**changes):
    now=datetime.now(timezone.utc)-timedelta(seconds=30)
    value=dict(schema_version='camera-location-request-v1',started_at=now.isoformat(),finished_at=(now+timedelta(seconds=10)).isoformat(),
        first_fix_received_at=(now+timedelta(seconds=2)).isoformat(),outcome='success',end_reason='capture')
    value.update(changes)
    return value


def test_absent_trace_does_not_change_pre_extension_metadata_hash_shape():
    old=dict(source='unknown',device_fix=None,issue_pin_confirmed=False,confirmed_at=None,
        photo_captured_at=None,photo_source='unknown',photo_device_fix=None)
    assert LocationEvidence.model_validate(old).model_dump(mode='json')==old
    assert LocationEvidence.model_validate({**old,'photo_location_request':None}).model_dump(mode='json')==old


@pytest.mark.parametrize('change',[
    {'finished_at':'2000-01-01T00:00:00Z'}, {'started_at':'2026-01-01T00:00:00'},
    {'first_fix_received_at':None},{'first_fix_received_at':'2000-01-01T00:00:00Z'},
    {'outcome':'unsupported'},{'outcome':'not_requested'},{'latitude':14.7},
])
def test_invalid_or_extra_request_claims_are_rejected(change):
    value=interval();value.update(change)
    with pytest.raises(ValidationError):CameraLocationRequest.model_validate(value)


def test_api_only_accepts_camera_request_metadata_and_rejects_future_times():
    value=interval()
    assert LocationEvidence(photo_source='camera',photo_location_request=value).photo_location_request.outcome=='success'
    with pytest.raises(ValidationError):LocationEvidence(photo_source='upload',photo_location_request=value)
    future=(datetime.now(timezone.utc)+timedelta(days=1)).isoformat()
    with pytest.raises(ValidationError):LocationEvidence(photo_source='camera',photo_location_request={**value,'finished_at':future})


def test_pilot_copies_explicit_interval_and_separates_window_from_first_delivery():
    value=interval()
    trial=trial_from_record(dict(id=9,location_lat=None,location_lng=None,location_metadata=dict(photo_source='camera',photo_location_request=value)),
        kind='report',trial_id='SAMPLE-request',session_id='SAMPLE-session',device_id='SAMPLE-phone',environment='open_sky',observed_at=datetime.now(timezone.utc))
    report=audit(Pilot(pilot_id='SAMPLE',data_origin='synthetic',trials=[trial]))
    row=report['rows'][0]
    assert row['acquisition_latency_s']==10 and row['first_fix_delivery_latency_s']==2
    assert row['acquisition_status']=='success' and row['device']['qualified'] is False
    assert report['summary']['first_fix_delivery_latency_s']['median']==2
    assert report['automatic_location_verification_allowed'] is False


def test_legacy_records_never_infer_request_success_from_a_photo_fix():
    trial=trial_from_record(dict(id=1,location_lat=14.7,location_lng=121.0,location_metadata=dict(photo_source='camera',
        photo_device_fix=dict(latitude=14.7,longitude=121.0,accuracy_m=10))),kind='report',trial_id='SAMPLE-old',
        session_id='SAMPLE-session',device_id='SAMPLE-phone',environment='open_sky',observed_at=datetime.now(timezone.utc))
    assert trial.acquisition_status=='unknown'
    assert trial.request_started_at is trial.request_first_fix_received_at is None


def test_pilot_audit_excludes_future_nested_request_times_even_with_old_trial_times():
    trial=trial_from_record(dict(id=9,location_lat=None,location_lng=None,location_metadata=dict(photo_source='camera',photo_location_request=interval())),
        kind='report',trial_id='SAMPLE-clock',session_id='SAMPLE-session',device_id='SAMPLE-phone',environment='open_sky',observed_at=datetime.now(timezone.utc))
    payload=trial.model_dump(mode='json')
    future=datetime.now(timezone.utc)+timedelta(days=1)
    payload['location_metadata']['photo_location_request'].update(started_at=future.isoformat(),
        first_fix_received_at=(future+timedelta(seconds=2)).isoformat(),finished_at=(future+timedelta(seconds=10)).isoformat())
    result=audit(Pilot(pilot_id='SAMPLE',data_origin='synthetic',trials=[payload]))
    assert result['rows'][0]['clock_reasons']==['future_timestamp']
    assert result['summary']['first_fix_delivery_latency_s']['count']==0


@pytest.mark.skipif(shutil.which('node') is None,reason='Producer/consumer check requires the frontend Node runtime.')
def test_actual_javascript_sampler_draft_and_payloads_match_python_contract():
    code="""
import {createCaptureLocationSampler} from './frontend/src/utils/captureLocation.js';
import {packResidentPhoto,unpackResidentPhoto} from './frontend/src/utils/residentReportDraft.js';
import {locationEvidence} from './frontend/src/utils/reportIntake.js';
import {fieldPayload} from './frontend/src/utils/fieldSurvey.js';
let at=Date.now()-15000,deliver;
const sampler=createCaptureLocationSampler({now:()=>at,setTimer:()=>1,clearTimer:()=>{},
    geolocation:{watchPosition(ok){deliver=ok;return 0;},clearWatch(){}}});
sampler.start();at+=1000;deliver({timestamp:at,coords:{latitude:14.72,longitude:121.04,accuracy:12}});
at+=1000;const frame=sampler.capture();
const photo=unpackResidentPhoto(packResidentPhoto(new File(['SAMPLE'],'sample.png',{type:'image/png'}),frame));
const field=fieldPayload({latitude:'14.72',longitude:'121.04',pinConfirmed:true,observedAt:new Date(at).toISOString(),
    visibility:'visible',condition:'defect_observed',notes:'SAMPLE producer consumer check'},null,frame,false);
console.log(JSON.stringify({resident:locationEvidence({},photo.provenance),field:field.location_metadata}));
"""
    result=subprocess.run([shutil.which('node'),'--input-type=module','-e',code],cwd=Path(__file__).resolve().parents[2],
        capture_output=True,text=True,check=True,timeout=20)
    document=json.loads(result.stdout)
    a,b=(LocationEvidence.model_validate(document[key]).photo_location_request for key in ('resident','field'))
    assert a==b and a.outcome=='success'
    assert (a.first_fix_received_at-a.started_at).total_seconds()==1
    assert (a.finished_at-a.started_at).total_seconds()==2
