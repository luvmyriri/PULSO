"""Scheduled scoring worker; safe to run before an approved artifact is installed."""
import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID
from sqlalchemy import exists, select
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from database import SessionLocal
from production_predictive import score_batch
from hazard_feeds import ingest_licensed_forecasts
from gov_models import AssetInspectionEvidence, AssetInspectionOutcome, AssetFieldObservation
from asset_evidence_store import evidence_lock_key


def purge_orphan_image_files(db):
    """Reconcile old, unreferenced bytes left after an uncertain commit."""
    root = (Path(os.getenv('PUBLICATION_FILE_DIR',Path(__file__).resolve().parents[1]/'private_publications'))/'asset_inspections').resolve()
    if not root.exists():
        return 0
    if db.execute(text('SHOW transaction_isolation')).scalar_one() != 'read committed':
        raise RuntimeError('Private evidence reconciliation requires read committed isolation.')
    if not db.execute(text('SELECT pg_try_advisory_xact_lock(86173349)')).scalar():
        return 0
    cutoff = (datetime.now(timezone.utc)-timedelta(hours=24)).timestamp()
    marker = root/'.cleanup-cursor'
    if marker.is_symlink():
        raise RuntimeError('Private evidence cleanup cursor cannot be a symbolic link.')
    try:
        with marker.open(encoding='utf-8') as source:
            cursor=source.read(100).strip()
    except OSError:
        cursor=''
    candidates=[]
    for path in root.glob('*/*'):
        if path.is_symlink() or path.suffix not in {'.png','.jpg','.webp'}:
            continue
        try:
            evidence_id=str(UUID(path.stem))
            resolved=path.resolve()
            if path.stem!=evidence_id or path.parent.name!=evidence_id[:2] or not resolved.is_relative_to(root):
                continue
            if path.is_file() and path.stat().st_mtime < cutoff:
                candidates.append((path.relative_to(root).as_posix(),path,evidence_id))
        except (ValueError,OSError):
            continue
    candidates.sort(key=lambda item:item[0])
    page=[item for item in candidates if item[0]>cursor][:100]
    if not page:
        page=candidates[:100]
    removed=0
    for _,path,evidence_id in page:
        if not db.execute(text('SELECT pg_try_advisory_xact_lock(:key)'),{'key':evidence_lock_key(evidence_id)}).scalar():
            continue
        if db.get(AssetInspectionEvidence,evidence_id) is not None:
            continue
        # Only canonical UUID images within the verified private root are removed.
        path.unlink(missing_ok=True)
        removed+=1
    if page:
        marker.write_text(page[-1][0],encoding='utf-8')
    db.commit()
    return removed


def purge_unattached_evidence(db):
    """Remove abandoned private uploads after 24 hours without touching attached evidence."""
    root = Path(os.getenv("PUBLICATION_FILE_DIR", Path(__file__).resolve().parents[1] / "private_publications")) / "asset_inspections"
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    attached = select(AssetInspectionOutcome.id).where(AssetInspectionOutcome.evidence_reference == AssetInspectionEvidence.id)
    field_attached = select(AssetFieldObservation.id).where(AssetFieldObservation.evidence_reference == AssetInspectionEvidence.id)
    rows = db.query(AssetInspectionEvidence).filter(
        AssetInspectionEvidence.uploaded_at < cutoff, ~exists(attached), ~exists(field_attached)).with_for_update(skip_locked=True).limit(100).all()
    removed = 0
    for row in rows:
        path = (root / row.stored_path).resolve()
        if path.is_relative_to(root.resolve()):
            path.unlink(missing_ok=True)
        db.delete(row)
        removed += 1
    db.commit()
    return removed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--loop", action="store_true")
    parser.add_argument("--interval-minutes", type=int, default=360)
    args = parser.parse_args()
    if not 30 <= args.interval_minutes <= 1440:
        parser.error("Scoring interval must be between 30 and 1440 minutes.")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    while True:
        try:
            with SessionLocal() as db:
                try:
                    hazard_result = ingest_licensed_forecasts(db)
                except Exception as exc:
                    db.rollback()
                    hazard_result = {"status": "failed", "reason": type(exc).__name__}
                    logging.exception("Licensed hazard ingestion failed; scoring will use only already recorded snapshots.")
                result = score_batch(db)
                removed = purge_unattached_evidence(db)
                orphaned = purge_orphan_image_files(db)
            logging.info("hazard_ingestion %s", json.dumps(hazard_result, sort_keys=True))
            logging.info("predictive_scoring %s", json.dumps(result, sort_keys=True))
            if removed:
                logging.info("abandoned_inspection_evidence_removed count=%s", removed)
            if orphaned:
                logging.info('orphaned_inspection_bytes_removed count=%s',orphaned)
        except Exception:
            logging.exception("Predictive scoring failed; the prior snapshot remains available until its expiry.")
            if not args.loop:
                raise
        if not args.loop:
            break
        time.sleep(args.interval_minutes * 60)


if __name__ == "__main__":
    main()
