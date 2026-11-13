"""First-party collection tests against the guarded disposable PostGIS database."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from io import BytesIO
from threading import Barrier
from uuid import uuid4

from PIL import Image
import pytest
from sqlalchemy import text

import auth
import models
import gov_models as gm
import asset_inspection_router
import production_predictive
from scripts.score_production_predictive import purge_unattached_evidence
from tests.test_asset_inspection_routes import inspection_context

PATH = '/api/gov/field-inventory'


@pytest.fixture
def field_context(inspection_context, monkeypatch, tmp_path):
    client, sessions, tokens = inspection_context
    with sessions() as db:
        db.add(models.District(id=2, name='FAKE outside district', code='FAKE2'))
        db.flush()
        db.add(models.Barangay(id=2, name='FAKE outside area', district_id=2))
        db.add(models.Official(id=4, full_name='FAKE Second inspector', email='second@test.invalid',
            role='project_engineer', is_active=True, password_hash='not-for-login', primary_jurisdiction=[1]))
        db.add(models.Resident(id=100, full_name='FAKE Resident', email='resident@test.invalid',
            password_hash='not-for-login', is_active=True, is_verified=True))
        for uid in (1, 2, 3):
            db.get(models.Official, uid).primary_jurisdiction = [1]
        db.execute(text('UPDATE barangays SET geom=ST_Multi(ST_MakeEnvelope(121,14.70,121.09,14.80,4326)) WHERE id=1'))
        db.commit()
    tokens = {**tokens, **{name:{'Authorization':'Bearer '+auth.create_access_token({'sub':name+'@test.invalid'})}
        for name in ('second', 'resident')}}
    monkeypatch.setattr(asset_inspection_router, 'EVIDENCE_ROOT', tmp_path/'asset_inspections')
    monkeypatch.setenv('PUBLICATION_FILE_DIR', str(tmp_path))
    yield client, sessions, tokens


def observation(**changes):
    now = datetime.now(timezone.utc).isoformat()
    return dict(observed_at=now, latitude=14.72, longitude=121.04,
        location_metadata=dict(source='device', device_fix=dict(latitude=14.72,longitude=121.04,accuracy_m=12,measured_at=now)),
        visibility='visible', condition='defect_observed', notes='FAKE repeatable field observation of a visible inlet.', **changes)


def candidate(**changes):
    payload = dict(**observation(), asset_name='FAKE surveyed inlet', category='Drainage', barangay_id=1)
    payload.update(changes)
    return payload


def create(client, tokens, payload=None, key=None, actor='inspector'):
    return client.post(PATH+'/assets', json=payload or candidate(),
        headers={**tokens[actor], 'Idempotency-Key':key or str(uuid4())})


def evidence(client, tokens, asset_id):
    data = BytesIO()
    Image.new('RGB', (8, 8), '#604020').save(data, format='PNG')
    response = client.post(f'/api/gov/predictive/assets/{asset_id}/inspection-evidence',
        files={'file':('FAKE-evidence.png',data.getvalue(),'image/png')}, headers=tokens['inspector'])
    assert response.status_code == 201, response.text
    return response.json()['id']


def review(client, tokens, row_id, actor='chief', **changes):
    payload = dict(decision='accepted', identity_confirmed=True, location_reviewed=True,
        reason='FAKE independently compared the private photo and surveyed context.')
    payload.update(changes)
    return client.post(PATH+f'/observations/{row_id}/review', json=payload, headers=tokens[actor])


def test_candidate_preserves_unknowns_location_and_one_record_on_replay(field_context):
    client, sessions, tokens = field_context
    key, payload = str(uuid4()), candidate()
    first = create(client,tokens,payload,key)
    assert first.status_code == 201, first.text
    replay = create(client,tokens,payload,key)
    assert replay.json() == first.json()
    result = first.json()
    assert result['asset']['registry_status'] == 'candidate'
    assert result['asset']['maintenance_authority'] is result['asset']['condition_score'] is None
    assert result['observation']['accuracy_m'] == 12
    assert result['observation']['boundary_status'] == 'within_recorded_boundary'
    assert result['observation']['review_status'] == 'pending'
    assert result['asset']['model_label_status'] == 'not_exported_from_field_observations'
    assert create(client,tokens,{**payload,'asset_name':'FAKE edited candidate'},key).status_code == 409
    with sessions() as db:
        assert db.query(gm.AssetFieldObservation).count() == 1
        asset = db.get(gm.InfrastructureAsset,result['asset']['asset_id'])
        assert asset.design_life is asset.date_completed is None
        assert asset.status == 'unassessed'
        assert db.query(gm.AssetInspectionOutcome).count() == 0


def test_nearby_candidates_are_scoped_suggestions_not_merged_assets(field_context):
    client, sessions, tokens = field_context
    one, two = create(client,tokens).json(), create(client,tokens).json()
    assert one['asset']['asset_id'] != two['asset']['asset_id']
    with sessions() as db:
        db.add(gm.InfrastructureAsset(asset_id='FAKE-OUTSIDE', asset_name='FAKE outside inlet', category='Drainage', barangay_id=2,
            geom='SRID=4326;POINT(121.04 14.72)'))
        db.commit()
    response = client.get(PATH+'/assets/nearby?latitude=14.72&longitude=121.04&radius_m=100',headers=tokens['inspector'])
    assert response.status_code == 200, response.text
    rows = response.json()['items']
    assert len(rows) == 2
    assert all(r['identity_status'] == 'not_established_by_proximity' and r['distance_m'] == 0 for r in rows)
    listing = client.get(PATH+'/assets?registry_status=candidate&limit=1',headers=tokens['chief']).json()
    assert listing['total'] == 3 and listing['next_offset'] == 1
    assert client.get(PATH+'/assets/FAKE-OUTSIDE/observations',headers=tokens['chief']).status_code == 403
    assert client.get(PATH+'/assets?barangay_id=2',headers=tokens['chief']).status_code == 403


def test_repeat_observation_is_append_only_with_independent_review_and_private_evidence(field_context):
    client, sessions, tokens = field_context
    result = create(client,tokens).json()
    asset_id = result['asset']['asset_id']
    photo_id = evidence(client,tokens,asset_id)
    payload = observation()
    payload.update(condition='no_defect_observed',evidence_reference=photo_id)
    key = str(uuid4())
    endpoint = PATH+f'/assets/{asset_id}/observations'
    created = client.post(endpoint,json=payload,headers={**tokens['inspector'],'Idempotency-Key':key})
    assert created.status_code == 201, created.text
    assert client.post(endpoint,json=payload,headers={**tokens['inspector'],'Idempotency-Key':key}).json() == created.json()
    row_id = created.json()['observation']['id']
    assert review(client,tokens,row_id,'inspector').status_code == 403
    accepted = review(client,tokens,row_id)
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()['review_status'] == 'accepted' and accepted.json()['identity_confirmed']
    assert review(client,tokens,row_id).status_code == 409
    assert client.post(endpoint,json=payload,headers={**tokens['inspector'],'Idempotency-Key':str(uuid4())}).status_code == 409
    history = client.get(endpoint+'?limit=1',headers=tokens['chief']).json()
    assert history['total'] == 2 and history['next_offset'] == 1
    with sessions() as db:
        asset = db.get(gm.InfrastructureAsset,asset_id)
        assert asset.registry_status == 'candidate' and asset.condition_score is None and asset.maintenance_authority is None
        assert db.query(gm.AssetInspectionOutcome).count() == 0
        assert production_predictive.assess_asset(db, asset)['status'] == 'insufficient_data'
        db.get(gm.AssetInspectionEvidence,photo_id).uploaded_at = datetime.now(timezone.utc)-timedelta(days=2)
        db.commit()
        assert purge_unattached_evidence(db) == 0


def test_unobserved_is_not_negative_and_visible_findings_need_fresh_private_evidence(field_context):
    client, _, tokens = field_context
    visible = create(client,tokens).json()
    assert review(client,tokens,visible['observation']['id']).status_code == 422
    unsafe = create(client,tokens,candidate(visibility='unsafe',condition='not_assessed')).json()
    accepted = review(client,tokens,unsafe['observation']['id'],identity_confirmed=False,location_reviewed=False)
    assert accepted.status_code == 200, accepted.text
    assert not accepted.json()['identity_confirmed'] and accepted.json()['condition'] == 'not_assessed'
    rejected = review(client,tokens,visible['observation']['id'],decision='rejected',identity_confirmed=False,location_reviewed=False)
    assert rejected.status_code == 200
    assert client.patch(PATH+'/observations/'+visible['observation']['id'],json={'notes':'FAKE change'},headers=tokens['chief']).status_code in (404,405)


@pytest.mark.parametrize('changes', [
    dict(visibility='not_visible',condition='no_defect_observed'), dict(visibility='missing',condition='defect_observed'),
    dict(observed_at='2026-01-01T00:00:00'), dict(observed_at='2099-01-01T00:00:00+00:00'),
    dict(latitude=14.9), dict(barangay_id=999), dict(location_metadata={'source':'device'}),
    dict(maintenance_authority='FAKE unearned approval'), dict(condition_score=90), dict(latitude=float('inf')),
])
def test_invalid_or_invented_field_facts_cannot_write_partial_records(field_context, changes):
    client, sessions, tokens = field_context
    # JSON clients cannot encode nonfinite numbers; send the literal to test API validation.
    if changes.get('latitude') == float('inf'):
        import json
        response = client.post(PATH+'/assets', content=json.dumps(candidate(**changes)),
            headers={**tokens['inspector'],'Idempotency-Key':str(uuid4()),'Content-Type':'application/json'})
    else:
        response = create(client,tokens,candidate(**changes))
    assert response.status_code == 422, response.text
    with sessions() as db:
        assert db.query(gm.AssetFieldObservation).count() == 0
        assert db.query(gm.InfrastructureAsset).count() == 1


@pytest.mark.parametrize('actor', ['clerk','resident'])
def test_field_collection_does_not_grant_staff_or_resident_authority(field_context, actor):
    client, _, tokens = field_context
    assert create(client,tokens,actor=actor).status_code == 403
    assert client.get(PATH+'/assets',headers=tokens[actor]).status_code == 403


def test_corrected_pin_does_not_inherit_device_accuracy_and_missing_boundaries_remain_unknown(field_context):
    client, sessions, tokens = field_context
    with sessions() as db:
        db.get(models.Barangay,1).geom = None
        db.commit()
    payload = candidate(latitude=14.73)
    payload['location_metadata']['source'] = 'manual'
    response = create(client,tokens,payload)
    assert response.status_code == 201, response.text
    row = response.json()['observation']
    assert row['accuracy_m'] is None and row['location_metadata']['device_fix']['accuracy_m'] == 12
    assert row['boundary_status'] == 'boundary_unavailable' and not row['location_reviewed']


def test_concurrent_replay_creates_one_candidate_and_one_observation(field_context):
    client, sessions, tokens = field_context
    barrier, payload, key = Barrier(2), candidate(), str(uuid4())
    def submit(_):
        barrier.wait(timeout=10)
        response = create(client,tokens,payload,key)
        assert response.status_code == 201, response.text
        return response.json()['asset']['asset_id']
    with ThreadPoolExecutor(max_workers=2) as executor:
        ids = list(executor.map(submit,range(2)))
    assert ids[0] == ids[1]
    with sessions() as db:
        assert db.query(gm.AssetFieldObservation).count() == 1
        assert db.query(gm.InfrastructureAsset).count() == 2


def test_idempotency_is_scoped_to_actor_and_distinct_operations(field_context):
    client, sessions, tokens = field_context
    key, payload = str(uuid4()), candidate()
    one = create(client,tokens,payload,key).json()
    two = create(client,tokens,payload,key,'second').json()
    assert one['asset']['asset_id'] != two['asset']['asset_id']
    asset_id = one['asset']['asset_id']
    assert client.post(PATH+f'/assets/{asset_id}/observations',json=observation(),
        headers={**tokens['inspector'],'Idempotency-Key':key}).status_code == 201
    with sessions() as db:
        assert db.query(gm.AssetFieldObservation).count() == 3


def test_coverage_distinguishes_unknown_sites_and_reports_observed_records_only(field_context):
    client, _, tokens = field_context
    empty = client.get(PATH+'/coverage',headers=tokens['chief'])
    assert empty.status_code == 200, empty.text
    assert empty.json()['observation_count'] == empty.json()['surveyed_record_count'] == 0
    unknown = create(client,tokens,candidate(visibility='not_visible',condition='not_assessed')).json()
    assert review(client,tokens,unknown['observation']['id'],identity_confirmed=False,location_reviewed=False).status_code == 200
    create(client,tokens,candidate(condition='no_defect_observed'))
    counts = client.get(PATH+'/coverage',headers=tokens['chief']).json()
    assert counts['observation_count'] == counts['surveyed_record_count'] == 2
    assert counts['counts']['not_assessed'] == counts['counts']['no_defect_observed'] == 1
    assert counts['counts']['accepted'] == counts['counts']['pending'] == 1
    assert counts['counts']['identity_confirmed'] == 0
    assert counts['counts_include_pending_and_rejected_claims']
    assert client.get(PATH+'/coverage',headers=tokens['resident']).status_code == 403


def test_source_report_is_access_checked_and_never_replaces_revisit_evidence(field_context):
    client, sessions, tokens = field_context
    with sessions() as db:
        db.add_all([models.Report(id=1,ticket_id='FAKE-SOURCE-1',category='Drainage',description='FAKE source inlet report',status='pending',barangay_id=1,image_url='/FAKE-private-source.png'),
            models.Report(id=2,ticket_id='FAKE-SOURCE-2',category='Drainage',description='FAKE outside district source',status='pending',barangay_id=2)])
        db.commit()
    valid = create(client,tokens,candidate(source_report_id=1))
    assert valid.status_code == 201, valid.text
    assert valid.json()['observation']['source_report_id'] == 1
    assert review(client,tokens,valid.json()['observation']['id']).status_code == 422
    assert create(client,tokens,candidate(source_report_id=2)).status_code == 403
    assert create(client,tokens,candidate(source_report_id=999)).status_code == 404
    with sessions() as db:
        assert db.query(gm.AssetFieldObservation).count() == 1


def test_stale_fix_is_retained_with_time_mismatch_without_false_precision(field_context):
    client, _, tokens = field_context
    payload = candidate()
    payload['location_metadata']['device_fix']['measured_at'] = (datetime.now(timezone.utc)-timedelta(minutes=10)).isoformat()
    result = create(client,tokens,payload)
    assert result.status_code == 201, result.text
    quality = result.json()['observation']['location_quality']
    assert quality['fix_time_status'] == 'time_mismatch' and quality['fix_time_offset_seconds'] > 120
    assert quality['issue_position_status'] == 'unreviewed_proposal'


def test_evidence_from_another_asset_cannot_be_attached(field_context):
    client, sessions, tokens = field_context
    one, two = create(client,tokens).json(), create(client,tokens).json()
    photo_id = evidence(client,tokens,one['asset']['asset_id'])
    payload = observation()
    payload['evidence_reference'] = photo_id
    response = client.post(PATH+f"/assets/{two['asset']['asset_id']}/observations",json=payload,
        headers={**tokens['inspector'],'Idempotency-Key':str(uuid4())})
    assert response.status_code == 422
    with sessions() as db:
        assert db.query(gm.AssetFieldObservation).count() == 2


def test_independent_review_denied_even_when_observer_has_review_capability(field_context):
    client, _, tokens = field_context
    row = create(client,tokens,candidate(visibility='unsafe',condition='not_assessed'),actor='second').json()['observation']
    denied = review(client,tokens,row['id'],actor='second',identity_confirmed=False,location_reviewed=False)
    assert denied.status_code == 403 and 'independent' in denied.json()['detail'].lower()


def test_explicit_module_denial_and_outside_district_block_collection(field_context):
    client, sessions, tokens = field_context
    with sessions() as db:
        role = models.SystemRole(name='FAKE denied verification',capabilities={'verification':[]})
        db.add(role); db.flush()
        db.get(models.Official,2).role_id = role.id
        db.commit()
    assert create(client,tokens).status_code == 403
    assert create(client,tokens,candidate(barangay_id=2),actor='second').status_code == 403


def test_nonfinite_queries_and_nested_sensor_values_return_safe_validation_errors(field_context):
    import json
    client, _, tokens = field_context
    assert client.get(PATH+'/assets/nearby?latitude=nan&longitude=121.04',headers=tokens['chief']).status_code == 422
    payload = candidate()
    payload['location_metadata']['device_fix']['accuracy_m'] = float('nan')
    response = client.post(PATH+'/assets',content=json.dumps(payload),
        headers={**tokens['inspector'],'Idempotency-Key':str(uuid4()),'Content-Type':'application/json'})
    assert response.status_code == 422
    assert 'input' not in response.json()['detail'][0]
