"""Synthetic geometry/timing fixtures; no claim of physical phone performance."""
from copy import deepcopy
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import sys

import pytest
from pydantic import ValidationError

from location_pilot import Pilot, Point, audit, distance_m, distribution, trial_from_record
from scripts import audit_location_pilot as cli

AS_OF = datetime(2026, 11, 2, tzinfo=timezone.utc)


def sample():
    station = dict(reference_id='station-1', role='device_station', latitude=14.72, longitude=121.04,
        method='independent_measurement', measured_at='2026-11-01T00:00:00Z', uncertainty_m=0.5,
        uncertainty_basis='documented_bound', independent=True, evidence_key='SAMPLE-reference-not-real',
        reviewed_by='reviewer-1')
    target = dict(station, reference_id='target-1', role='issue_target', longitude=121.0402, object_id='pole-a')
    fix = dict(latitude=14.72, longitude=121.04, accuracy_m=2.0, measured_at='2026-11-01T00:00:09Z')
    trial = dict(trial_id='trial-1', session_id='session-1', device_id='android-1', environment='across_road',
        observed_at='2026-11-01T00:00:10Z', acquisition_status='success', request_started_at='2026-11-01T00:00:00Z',
        request_finished_at='2026-11-01T00:00:09Z', stationary_since='2026-11-01T00:00:00Z',
        station_reference_id='station-1', target_reference_id='target-1',
        issue_point=dict(latitude=14.72, longitude=121.0402), selected_object_id='pole-a', identity_reviewed_by='reviewer-1',
        location_metadata=dict(source='manual', device_fix=fix, photo_device_fix=dict(fix),
            photo_source='camera', photo_captured_at='2026-11-01T00:00:10Z', issue_pin_confirmed=True))
    return dict(pilot_id='SAMPLE-pilot', data_origin='synthetic',
        policy=dict(horizontal_tolerance_m=5.0, maximum_reference_uncertainty_m=1.0, maximum_fix_age_s=10.0),
        references=[station,target], trials=[trial])


def evaluate(payload=None):
    return audit(Pilot.model_validate(payload or sample()), as_of=AS_OF)


def test_published_wgs84_vector_and_dateline():
    # GeographicLib's published inverse test case, not a phone/reference fixture:
    # https://github.com/geographiclib/geographiclib-python/blob/main/geographiclib/test/test_geodesic.py
    assert distance_m(Point(latitude=35.60777, longitude=-139.44815),
        Point(latitude=-11.17491, longitude=-69.95921)) == pytest.approx(8935244.5604818305, abs=1e-6)
    assert 200 < distance_m(Point(latitude=0.0, longitude=179.999), Point(latitude=0.0, longitude=-179.999)) < 230


def test_phone_and_photographed_object_use_different_reference_points():
    report = evaluate()
    row, = report['rows']
    assert row['device']['distance_to_reference_m'] == row['issue']['distance_to_reference_m'] == 0
    assert row['issue_accuracy_m'] is None and row['device_reported_accuracy_m'] == 2
    assert row['photo_timing'] == dict(state='fresh_pre_capture_fix', fix_offset_s=-1)
    assert row['object_identity'] == 'correct' and row['issue']['working_tolerance'] == 'within'
    assert row['acquisition_latency_s'] == 9
    assert row['device']['reported_radius_coverage'] == 'inside'
    assert not report['automatic_location_verification_allowed'] and not report['automatic_matching_release_allowed']
    assert 'latitude' not in json.dumps(report) and 'longitude' not in json.dumps(report)
    assert report['data_origin'] == 'synthetic'


def test_small_numeric_error_does_not_verify_correct_object():
    payload = sample()
    payload['trials'][0]['selected_object_id'] = 'pole-b'
    report = evaluate(payload)
    assert report['rows'][0]['issue']['working_tolerance'] == 'within'
    assert report['rows'][0]['object_identity'] == 'wrong'
    assert report['summary']['wrong_object_rate_among_reviewed'] == 1
    payload['trials'][0]['identity_reviewed_by'] = None
    unknown = evaluate(payload)['summary']
    assert unknown['identity_counts'] == dict(correct=0, wrong=0, unknown=1)
    assert unknown['wrong_object_rate_among_reviewed'] is None


@pytest.mark.parametrize('changes,reason', [
    ({'method':'map_pin'},'reference_not_independent'),
    ({'method':'same_phone'},'reference_not_independent'),
    ({'independent':False},'reference_not_independent'),
    ({'evidence_key':None},'reference_evidence_or_review_missing'),
    ({'reviewed_by':None},'reference_evidence_or_review_missing'),
    ({'uncertainty_m':None},'reference_bound_not_documented'),
    ({'uncertainty_basis':'estimate'},'reference_bound_not_documented'),
    ({'uncertainty_m':2.0},'reference_bound_exceeds_working_policy'),
    ({'measured_at':'2026-11-03T00:00:00Z'},'reference_time_in_future'),
])
def test_unqualified_reference_cannot_produce_benchmark_statistics(changes, reason):
    payload = sample()
    payload['references'][1].update(changes)
    report = evaluate(payload)
    assert reason in report['rows'][0]['issue']['reasons']
    assert report['summary']['qualified_issue_error_m']['count'] == 0
    assert report['summary']['qualified_issue_error_m']['median'] is None


def test_reference_uncertainty_makes_boundary_indeterminate():
    payload = sample()
    payload['policy']['horizontal_tolerance_m'] = 0.25
    payload['trials'][0]['location_metadata']['device_fix']['accuracy_m'] = 0.25
    row = evaluate(payload)['rows'][0]
    assert row['issue']['error_lower_m'] == 0 and row['issue']['error_upper_m'] == 0.5
    assert row['issue']['working_tolerance'] == row['device']['reported_radius_coverage'] == 'indeterminate'
    payload['trials'][0]['issue_point']['longitude'] = 121.04
    row = evaluate(payload)['rows'][0]
    assert 20 < row['issue']['distance_to_reference_m'] < 23
    assert row['issue']['working_tolerance'] == 'outside'


@pytest.mark.parametrize('photo_change,state', [
    ({'photo_source':'upload'},'not_camera_capture'),
    ({'photo_captured_at':None},'capture_or_fix_time_missing'),
    ({'photo_device_fix':None},'capture_or_fix_time_missing'),
])
def test_uploads_and_missing_times_do_not_claim_fresh_camera_location(photo_change, state):
    payload = sample()
    payload['trials'][0]['location_metadata'].update(photo_change)
    row = evaluate(payload)['rows'][0]
    assert row['photo_timing']['state'] == state and not row['photo_device']['qualified']


def test_stale_post_capture_and_pre_stationary_fixes_are_counted_explicitly():
    payload = sample()
    trial = payload['trials'][0]
    trial['location_metadata']['photo_device_fix']['measured_at'] = '2026-11-01T00:00:11Z'
    row = evaluate(payload)['rows'][0]
    assert row['photo_timing']['state'] == 'post_capture_fix' and not row['photo_device']['qualified']
    trial['location_metadata']['photo_device_fix']['measured_at'] = '2026-10-31T23:59:00Z'
    row = evaluate(payload)['rows'][0]
    assert row['photo_timing']['state'] == 'stale_at_capture'
    trial['location_metadata']['device_fix']['measured_at'] = '2026-10-31T23:59:59Z'
    trial['location_metadata']['quality'] = 'device_estimate'
    assert 'fix_outside_documented_stationary_interval' in evaluate(payload)['rows'][0]['device']['reasons']


def test_photo_fix_freshness_uses_capture_time_even_when_trial_ends_later():
    payload = sample()
    payload['trials'][0]['observed_at'] = '2026-11-01T00:02:00Z'
    row = evaluate(payload)['rows'][0]
    assert 'fix_stale_at_observation' in row['device']['reasons']
    assert row['photo_device']['qualified'] and row['photo_timing']['state'] == 'fresh_pre_capture_fix'


def test_denied_location_keeps_manual_issue_and_unknown_denominators():
    payload = sample()
    trial = payload['trials'][0]
    trial['acquisition_status'] = 'denied'
    trial['selected_object_id'] = None
    trial['location_metadata'] = dict(source='manual')
    report = evaluate(payload)
    assert report['summary']['acquisition_counts'] == {'denied':1}
    assert report['summary']['qualified_issue_error_m']['count'] == 1
    assert report['summary']['qualified_device_error_m']['count'] == 0
    assert report['summary']['successful_request_latency_s']['count'] == 0
    assert report['summary']['identity_counts']['unknown'] == 1


def test_reused_fix_does_not_inflate_device_or_photo_error_count():
    payload = sample()
    payload['trials'].append(dict(deepcopy(payload['trials'][0]), trial_id='trial-2', observed_at='2026-11-01T00:00:11Z'))
    report = evaluate(payload)
    assert report['summary']['trial_count'] == 2 and report['summary']['session_count'] == 1
    assert report['summary']['qualified_device_error_m']['count'] == 1
    assert report['summary']['qualified_photo_device_error_m']['count'] == 1
    assert report['summary']['reused_device_fix_count'] == report['summary']['reused_photo_fix_count'] == 1
    assert report['summary']['session_median_issue_error_m']['count'] == 1
    payload['trials'][1]['device_id'] = 'iphone-2'
    assert evaluate(payload)['summary']['qualified_device_error_m']['count'] == 2


def test_policy_unset_and_future_clocks_never_silently_pass():
    payload = sample()
    payload['policy'] = None
    row = evaluate(payload)['rows'][0]
    assert row['issue']['working_tolerance'] == row['photo_timing']['state'] == 'policy_unset'
    payload['trials'][0]['observed_at'] = '2026-11-03T00:00:00Z'
    report = evaluate(payload)
    assert 'future_timestamp' in report['rows'][0]['clock_reasons']
    assert report['summary']['qualified_issue_error_m']['count'] == 0


@pytest.mark.parametrize('point', [dict(latitude=91,longitude=121),dict(latitude=14,longitude=float('nan')),
                                 dict(latitude=True,longitude=121),dict(latitude='14.72',longitude=121.04)])
def test_malformed_coordinates_are_rejected(point):
    with pytest.raises(ValidationError):
        Point.model_validate(point)


def test_duplicate_source_trial_reference_roles_and_chronology_are_rejected():
    payload = sample()
    payload['trials'][0]['source_record_key'] = 'report:1'
    payload['trials'].append(dict(deepcopy(payload['trials'][0]), trial_id='trial-2'))
    with pytest.raises(ValidationError, match='more than one trial'):
        Pilot.model_validate(payload)
    payload = sample()
    payload['trials'][0]['station_reference_id'] = 'target-1'
    with pytest.raises(ValidationError, match='wrong role'):
        Pilot.model_validate(payload)
    payload = sample()
    payload['trials'][0]['request_started_at'] = '2026-11-01T00:00:12Z'
    with pytest.raises(ValidationError, match='precedes'):
        Pilot.model_validate(payload)
    payload = sample()
    payload['trials'][0]['observed_at'] = '2026-11-01T00:00:10'
    with pytest.raises(ValidationError):
        Pilot.model_validate(payload)


def test_adapter_preserves_original_provenance_and_drops_unneeded_private_fields():
    payload = sample()['trials'][0]
    record = dict(id=7, location_lat=14.72, location_lng=121.0402, location_metadata=payload['location_metadata'],
        contact_email='PRIVATE@example.invalid', description='PRIVATE text', image_url='/private/SAMPLE.png')
    trial = trial_from_record(record, kind='report', trial_id='trial-1', session_id='session-1', device_id='phone-1',
        environment='across_road', observed_at=payload['observed_at'])
    assert trial.location_metadata.model_dump(mode='json')['device_fix']['longitude'] == 121.04
    assert trial.issue_point.longitude == 121.0402 and trial.acquisition_status == 'unknown'
    assert trial.station_reference_id is None and trial.identity_reviewed_by is None
    assert 'PRIVATE' not in trial.model_dump_json()


def test_empty_plan_and_nearest_rank_are_honest():
    report = audit(Pilot(pilot_id='empty'), as_of=AS_OF)
    assert report['summary']['trial_count'] == 0 and report['summary']['qualified_issue_error_m']['median'] is None
    assert report['working_policy'] is None and report['data_origin'] == 'unattested'
    assert distribution(range(1,21))['p95_nearest_rank'] == 19


def test_cli_round_trip_is_offline_and_never_overwrites(tmp_path, capsys):
    source = tmp_path/'private-pilot.json'
    output = tmp_path/'audit.json'
    source.write_text(json.dumps(sample()), encoding='utf-8')
    assert cli.main(['audit','--input',str(source),'--output',str(output)]) == 0
    assert json.loads(output.read_text())['summary']['trial_count'] == 1
    first = output.read_bytes()
    assert cli.main(['audit','--input',str(source),'--output',str(output)]) == 1
    assert output.read_bytes() == first
    source.write_text('{"pilot_id":"PRIVATE example invalid"}', encoding='utf-8')
    assert cli.main(['audit','--input',str(source),'--output',str(tmp_path/'bad.json')]) == 2
    assert 'PRIVATE' not in capsys.readouterr().err


def test_cli_initialization_extraction_append_and_audit_without_database(tmp_path):
    script = Path(cli.__file__).resolve()
    env = {**os.environ, 'DATABASE_URL':'this-is-deliberately-not-a-database-url'}

    def run(*args):
        result = subprocess.run([sys.executable,str(script),*map(str,args)], env=env, capture_output=True, text=True)
        assert result.returncode == 0, result.stderr

    plan, trial_file, appended, report = [tmp_path/name for name in ('plan.json','trial.json','appended.json','audit.json')]
    run('init','--pilot-id','SAMPLE-pilot','--output',plan)
    assert json.loads(plan.read_text())['policy'] is None
    source = tmp_path/'receipt.json'
    source.write_text(json.dumps({'observation':dict(id='SAMPLE-observation',latitude=14.72,longitude=121.04,
        location_metadata=sample()['trials'][0]['location_metadata'],notes='PRIVATE notes excluded')}),encoding='utf-8')
    run('trial','--input',source,'--kind','field_observation','--trial-id','trial-1','--session-id','session-1',
        '--device-id','phone-1','--environment','across_road','--observed-at','2026-11-01T00:00:10Z','--output',trial_file)
    assert 'PRIVATE' not in trial_file.read_text()
    run('append','--input',plan,'--trial',trial_file,'--output',appended)
    run('audit','--input',appended,'--output',report)
    result = json.loads(report.read_text())
    assert result['summary']['trial_count'] == 1
    assert result['summary']['qualified_issue_error_m']['count'] == 0
    assert result['rows'][0]['issue']['reasons'] == ['reference_missing']
