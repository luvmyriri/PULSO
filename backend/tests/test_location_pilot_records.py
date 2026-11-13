"""Pilot extraction uses actual private API record shapes on disposable PostGIS."""
from datetime import datetime, timezone
import json
import pytest
from uuid import uuid4
from capture_request_contract import CameraLocationRequest
from tests.test_capture_request_contract import interval
from tests.test_field_capture import capture

from location_pilot import trial_from_record
from tests.test_resident_government_integration import connected, submit
from tests.test_field_inventory import field_context, candidate, create
from tests.test_asset_inspection_routes import inspection_context


@pytest.mark.parametrize('outcome',['success','denied'])
def test_report_trace_survives_intake_receipt_and_private_record(outcome,connected):
    client,_,tokens,_=connected
    trace=interval() if outcome=='success' else interval(outcome='denied',end_reason='permission_denied',first_fix_received_at=None)
    metadata=json.dumps(dict(photo_source='camera',photo_captured_at=datetime.now(timezone.utc).isoformat(),photo_location_request=trace))
    headers={**tokens['resident'],'Idempotency-Key':str(uuid4())}
    one=submit(client,headers,location_metadata=metadata)
    assert one.status_code==201,one.text
    two=submit(client,headers,location_metadata=metadata)
    assert two.json()['id']==one.json()['id']
    private=client.get('/api/reports/'+str(one.json()['id']),headers=tokens['chief']).json()
    assert CameraLocationRequest.model_validate(private['location_metadata']['photo_location_request'])==CameraLocationRequest.model_validate(trace)
    trial=trial_from_record(private,kind='report',trial_id='SAMPLE-request',session_id='SAMPLE-session',device_id='SAMPLE-phone',
        environment='open_sky',observed_at=datetime.now(timezone.utc))
    assert trial.acquisition_status==outcome
    assert trial.request_first_fix_received_at==CameraLocationRequest.model_validate(trace).first_fix_received_at


def test_field_photo_trace_survives_atomic_capture_and_trial_extraction(field_context):
    client,_,tokens=field_context
    payload=candidate();trace=interval()
    payload['location_metadata'].update(photo_source='camera',photo_captured_at=datetime.now(timezone.utc).isoformat(),photo_location_request=trace)
    response=capture(client,tokens,payload)
    assert response.status_code==201,response.text
    trial=trial_from_record(response.json(),kind='field_observation',trial_id='SAMPLE-field-request',session_id='SAMPLE-session',
        device_id='SAMPLE-phone',environment='open_sky',observed_at=datetime.now(timezone.utc))
    assert trial.acquisition_status=='success'
    assert (trial.request_first_fix_received_at-trial.request_started_at).total_seconds()==2


def test_extract_saved_report_keeps_moved_pin_separate_from_original_phone_fix(connected):
    client, _, tokens, _ = connected
    now = datetime.now(timezone.utc).isoformat()
    metadata = dict(source='manual', device_fix=dict(latitude=14.7565,longitude=121.0449,accuracy_m=12,measured_at=now),
        photo_source='camera',photo_captured_at=now,issue_pin_confirmed=True,confirmed_at=now)
    submitted = submit(client,tokens['resident'],location_metadata=json.dumps(metadata))
    assert submitted.status_code == 201, submitted.text
    response = client.get('/api/reports/'+str(submitted.json()['id']),headers=tokens['chief'])
    assert response.status_code == 200, response.text
    trial = trial_from_record(response.json(),kind='report',trial_id='SAMPLE-report-trial',session_id='SAMPLE-session',
        device_id='SAMPLE-phone',environment='across_road',observed_at=now)
    assert trial.issue_point.longitude == 121.045
    assert trial.location_metadata.device_fix.longitude == 121.0449
    assert trial.location_metadata.device_fix.accuracy_m == 12
    assert trial.acquisition_status == 'unknown' and trial.target_reference_id is None
    assert 'guest@test.invalid' not in trial.model_dump_json()


def test_extract_capture_receipt_preserves_field_observation_metadata(field_context):
    client, _, tokens = field_context
    response = create(client,tokens,candidate())
    assert response.status_code == 201,response.text
    receipt = response.json()
    trial = trial_from_record(receipt,kind='field_observation',trial_id='SAMPLE-field-trial',session_id='SAMPLE-session',
        device_id='SAMPLE-phone',environment='open_sky',observed_at=receipt['observation']['observed_at'])
    assert trial.source_record_key == 'field_observation:'+receipt['observation']['id']
    assert trial.location_metadata.device_fix.accuracy_m == 12
    assert trial.location_metadata.photo_source == 'unknown'
    assert 'notes' not in trial.model_dump_json()
