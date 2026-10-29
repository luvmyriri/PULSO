"""Classify verified assets against the pinned NOAH Metro Manila ZIP archives.

Dry run is the default. --apply requires a named LGU approval and license review.
The script never downloads source data; archives must be acquired and checked by
the operator using the exact pinned revision documented in the runbook.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from database import SessionLocal
from noah_flood import import_approved_release


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--flood-5", type=Path, required=True)
    parser.add_argument("--flood-25", type=Path, required=True)
    parser.add_argument("--flood-100", type=Path, required=True)
    parser.add_argument("--approved-by", required=True)
    parser.add_argument("--approval-reference", required=True)
    parser.add_argument("--license-reference", required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    archives = {5: args.flood_5, 25: args.flood_25, 100: args.flood_100}
    with SessionLocal() as db:
        try:
            result = import_approved_release(db, archives, args.approved_by,
                                             args.approval_reference, args.license_reference,
                                             apply=args.apply)
            print(json.dumps(result, indent=2, sort_keys=True, default=str))
        finally:
            if not args.apply:
                db.rollback()


if __name__ == "__main__":
    main()
