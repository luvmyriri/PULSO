"""Scheduled scoring worker; safe to run before an approved artifact is installed."""
import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from sqlalchemy import exists, select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from database import SessionLocal
from production_predictive import score_batch
from hazard_feeds import ingest_licensed_forecasts
from gov_models import AssetInspectionEvidence, AssetInspectionOutcome


def purge_unattached_evidence(db):
    """Remove abandoned private uploads after 24 hours without touching attached evidence."""
    root = Path(os.getenv("PUBLICATION_FILE_DIR", Path(__file__).resolve().parents[1] / "private_publications")) / "asset_inspections"
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    attached = select(AssetInspectionOutcome.id).where(AssetInspectionOutcome.evidence_reference == AssetInspectionEvidence.id)
    rows = db.query(AssetInspectionEvidence).filter(
        AssetInspectionEvidence.uploaded_at < cutoff, ~exists(attached)).with_for_update(skip_locked=True).limit(100).all()
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
            logging.info("hazard_ingestion %s", json.dumps(hazard_result, sort_keys=True))
            logging.info("predictive_scoring %s", json.dumps(result, sort_keys=True))
            if removed:
                logging.info("abandoned_inspection_evidence_removed count=%s", removed)
        except Exception:
            logging.exception("Predictive scoring failed; the prior snapshot remains available until its expiry.")
            if not args.loop:
                raise
        if not args.loop:
            break
        time.sleep(args.interval_minutes * 60)


if __name__ == "__main__":
    main()
