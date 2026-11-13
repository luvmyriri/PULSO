"""Only old orphan image bytes can be removed; committed/in-flight photos stay."""
from datetime import datetime,timedelta,timezone
import os
from uuid import UUID,uuid4

from sqlalchemy import text
import pytest

import gov_models as gm
import asset_inspection_router
from asset_evidence_store import evidence_lock_key
from asset_evidence_store import store_image
from scripts.score_production_predictive import purge_orphan_image_files
from tests.test_field_inventory import field_context
from tests.test_asset_inspection_routes import inspection_context


def stored_file(root,uid=None,old=True):
    uid=uid or str(uuid4());folder=root/uid[:2];folder.mkdir(parents=True,exist_ok=True)
    path=folder/(uid+'.png');path.write_bytes(b'SAMPLE synthetic orphan bytes')
    if old:
        at=(datetime.now(timezone.utc)-timedelta(days=2)).timestamp();os.utime(path,(at,at))
    return uid,path


def test_reconciliation_removes_only_old_canonical_orphans(field_context):
    _,sessions,_=field_context;root=asset_inspection_router.EVIDENCE_ROOT
    _,old=stored_file(root);_,fresh=stored_file(root,old=False)
    unknown=root/'00'/'unrecognized.png';unknown.parent.mkdir(parents=True,exist_ok=True);unknown.write_bytes(b'SAMPLE retained unknown file')
    with sessions() as db: assert purge_orphan_image_files(db)==1
    assert not old.exists() and fresh.exists() and unknown.exists()


def test_an_active_producer_lock_prevents_orphan_deletion(field_context):
    _,sessions,_=field_context;uid,path=stored_file(asset_inspection_router.EVIDENCE_ROOT)
    with sessions() as producer:
        producer.execute(text('SELECT pg_advisory_xact_lock(:key)'),{'key':evidence_lock_key(uid)})
        with sessions() as worker: assert purge_orphan_image_files(worker)==0
        assert path.exists();producer.rollback()
    with sessions() as worker: assert purge_orphan_image_files(worker)==1
    assert not path.exists()


def test_committed_file_metadata_is_retained_and_cursor_advances_past_full_batches(field_context):
    _,sessions,_=field_context;root=asset_inspection_router.EVIDENCE_ROOT
    with sessions() as db:
        for number in range(1,101):
            uid,path=stored_file(root,str(UUID(int=number)))
            db.add(gm.AssetInspectionEvidence(id=uid,asset_id='FAKE-DRAIN-01',uploaded_by_id=2,
                stored_path=str(path.relative_to(root)),content_type='image/png',byte_size=path.stat().st_size,sha256='f'*64))
        db.commit()
    _,orphan=stored_file(root,str(UUID(int=101)))
    with sessions() as worker: assert purge_orphan_image_files(worker)==0
    assert orphan.exists()
    with sessions() as worker: assert purge_orphan_image_files(worker)==1
    assert not orphan.exists()
    with sessions() as db: assert db.query(gm.AssetInspectionEvidence).count()==100


def test_snapshot_isolation_cannot_delete_using_a_stale_metadata_snapshot(field_context):
    _,sessions,_=field_context;stored_file(asset_inspection_router.EVIDENCE_ROOT)
    with sessions() as db:
        db.execute(text('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ'))
        with pytest.raises(RuntimeError,match='read committed'): purge_orphan_image_files(db)


def test_an_exclusive_filename_collision_never_removes_existing_bytes(field_context,monkeypatch):
    from tests.test_field_capture import png
    _,sessions,_=field_context;uid,path=stored_file(asset_inspection_router.EVIDENCE_ROOT)
    original=path.read_bytes()
    monkeypatch.setattr('asset_evidence_store.uuid4',lambda:UUID(uid))
    with sessions() as db:
        with pytest.raises(FileExistsError): store_image(db,asset_inspection_router.EVIDENCE_ROOT,'FAKE-DRAIN-01',2,png())
        db.rollback()
    assert path.read_bytes()==original
