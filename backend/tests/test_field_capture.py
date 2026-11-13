"""Atomic field photo intake, scoped receipts and rollback on disposable PostGIS."""
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import json
from threading import Barrier
from unittest.mock import patch
from uuid import uuid4

from PIL import Image
import pytest
from sqlalchemy.orm import Session

import gov_models as gm
import asset_inspection_router
from tests.test_field_inventory import field_context, candidate, observation
from tests.test_asset_inspection_routes import inspection_context

PATH='/api/gov/field-inventory'


def png(color='#604020'):
    stream=BytesIO();Image.new('RGB',(8,8),color).save(stream,format='PNG');return stream.getvalue()


def capture(client,tokens,payload=None,key=None,asset_id=None,image=True,actor='inspector'):
    route=PATH+('/assets/'+asset_id+'/capture' if asset_id else '/assets/capture')
    return client.post(route,data={'payload':json.dumps(payload or (observation() if asset_id else candidate()))},
        files={'image':('FAKE-field.png',png() if image is True else image,'image/png')} if image is not False else None,
        headers={**tokens[actor],'Idempotency-Key':key or str(uuid4())})


def test_one_capture_commits_one_candidate_one_observation_and_one_private_photo(field_context):
    client,sessions,tokens=field_context;payload=candidate(category='Road');key=str(uuid4())
    first=capture(client,tokens,payload,key);assert first.status_code==201,first.text
    result=first.json();assert result['asset']['category']=='Roads'
    assert capture(client,tokens,payload,key).json()==result
    receipt=client.get(PATH+'/receipt?operation=create_capture',headers={**tokens['inspector'],'Idempotency-Key':key})
    assert receipt.status_code==200 and receipt.json()==result
    assert client.get(PATH+'/receipt?operation=create_capture',headers={**tokens['chief'],'Idempotency-Key':key}).status_code==404
    evidence_id=result['observation']['evidence_reference'];assert evidence_id
    download=client.get('/api/gov/predictive/inspection-evidence/'+evidence_id,headers=tokens['chief'])
    assert download.status_code==200 and download.content==png()
    with sessions() as db:
        assert db.query(gm.AssetFieldObservation).count()==db.query(gm.AssetInspectionEvidence).count()==1
    assert len([p for p in asset_inspection_router.EVIDENCE_ROOT.rglob('*') if p.is_file()])==1
    filtered=client.get('/api/gov/asset-workspace?category=Roads',headers=tokens['chief'])
    assert result['asset']['asset_id'] in [a['asset_id'] for a in filtered.json()['items']]


def test_revisit_keeps_the_asset_identity_and_receipt_target(field_context):
    client,sessions,tokens=field_context
    asset_id=capture(client,tokens).json()['asset']['asset_id'];key=str(uuid4());payload=observation()
    revisit=capture(client,tokens,payload,key,asset_id)
    assert revisit.status_code==201,revisit.text
    assert revisit.json()['asset']['asset_id']==asset_id
    query=f'/receipt?operation=observe_capture&asset_id={asset_id}'
    assert client.get(PATH+query,headers={**tokens['inspector'],'Idempotency-Key':key}).json()==revisit.json()
    assert client.get(PATH+'/receipt?operation=create_capture&asset_id='+asset_id,headers={**tokens['inspector'],'Idempotency-Key':key}).status_code==422
    with sessions() as db:
        assert db.query(gm.AssetFieldObservation).count()==2
        assert db.query(gm.InfrastructureAsset).count()==2  # Existing fixture plus one candidate.


def test_changed_payload_or_photo_conflicts_without_duplicate_storage(field_context):
    client,sessions,tokens=field_context;payload=candidate();key=str(uuid4())
    assert capture(client,tokens,payload,key).status_code==201
    assert capture(client,tokens,{**payload,'notes':'FAKE different field account with other facts.'},key).status_code==409
    assert capture(client,tokens,payload,key,image=png('#806040')).status_code==409
    with sessions() as db: assert db.query(gm.AssetFieldObservation).count()==1
    assert len([p for p in asset_inspection_router.EVIDENCE_ROOT.rglob('*') if p.is_file()])==1


@pytest.mark.parametrize('image',[b'FAKE invalid PNG bytes',False,b'x'*(5*1024*1024+1)],ids=['invalid','missing','oversize'])
def test_invalid_or_missing_visible_evidence_leaves_no_partial_candidate(field_context,image):
    client,sessions,tokens=field_context
    assert capture(client,tokens,image=image).status_code==422
    with sessions() as db:
        assert db.query(gm.AssetFieldObservation).count()==db.query(gm.AssetInspectionEvidence).count()==0
        assert db.query(gm.InfrastructureAsset).count()==1


def test_unsafe_observation_can_be_recorded_without_manufacturing_evidence(field_context):
    client,_,tokens=field_context
    result=capture(client,tokens,candidate(visibility='unsafe',condition='not_assessed'),image=False)
    assert result.status_code==201,result.text
    assert result.json()['observation']['evidence_reference'] is None


def test_precommit_failure_rolls_back_rows_and_removes_staged_bytes(field_context):
    client,sessions,tokens=field_context
    with patch('field_inventory.make_observation',side_effect=RuntimeError('FAKE precommit failure')):
        with pytest.raises(RuntimeError): capture(client,tokens)
    with sessions() as db:
        assert db.query(gm.AssetInspectionEvidence).count()==db.query(gm.AssetFieldObservation).count()==0
        assert db.query(gm.InfrastructureAsset).count()==1
    assert not [p for p in asset_inspection_router.EVIDENCE_ROOT.rglob('*') if p.is_file()]


def test_lost_commit_acknowledgement_preserves_photo_for_receipt_recovery(field_context):
    client,sessions,tokens=field_context;key=str(uuid4());payload=candidate();original=Session.commit
    def uncertain_commit(db):
        capture_commit=any(isinstance(row,gm.AssetFieldObservation) for row in db.new)
        original(db)
        if capture_commit: raise RuntimeError('FAKE lost commit acknowledgement')
    with patch.object(Session,'commit',uncertain_commit):
        with pytest.raises(RuntimeError): capture(client,tokens,payload,key)
    result=client.get(PATH+'/receipt?operation=create_capture',headers={**tokens['inspector'],'Idempotency-Key':key})
    assert result.status_code==200,result.text
    photo=client.get('/api/gov/predictive/inspection-evidence/'+result.json()['observation']['evidence_reference'],headers=tokens['chief'])
    assert photo.status_code==200 and photo.content==png()


def test_concurrent_capture_replay_creates_one_photo_and_one_observation(field_context):
    client,sessions,tokens=field_context;key=str(uuid4());payload=candidate();barrier=Barrier(2)
    def send(_):
        barrier.wait(timeout=10);result=capture(client,tokens,payload,key)
        assert result.status_code==201,result.text
        return result.json()['observation']['id']
    with ThreadPoolExecutor(max_workers=2) as pool: ids=list(pool.map(send,range(2)))
    assert ids[0]==ids[1]
    with sessions() as db: assert db.query(gm.AssetInspectionEvidence).count()==db.query(gm.AssetFieldObservation).count()==1


def test_server_permissions_and_capture_scope_match(field_context):
    client,_,tokens=field_context
    allowed=client.get(PATH+'/permissions',headers=tokens['inspector'])
    assert allowed.status_code==200 and allowed.json()['record'] and not allowed.json()['review']
    assert [a['id'] for a in allowed.json()['barangays']]==[1]
    assert client.get(PATH+'/permissions',headers=tokens['chief']).json()['review']
    assert capture(client,tokens,actor='resident').status_code==403
    assert capture(client,tokens,candidate(barangay_id=2)).status_code==403
