"""Read-only cohort readiness summary. No synthetic data and no model training."""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from database import SessionLocal
from production_predictive import _split_forward, build_labeled_rows


def summary(rows):
    return {"windows": len(rows), "defect_events": sum(row["y"] for row in rows),
            "no_defect_followups": sum(not row["y"] for row in rows),
            "critical_or_major_events": sum(row["critical"] for row in rows),
            "windows_with_as_of_hazard_snapshots": sum(row["hazard_complete"] for row in rows)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--category", required=True)
    parser.add_argument("--barangay-id", type=int, action="append", dest="areas")
    args = parser.parse_args()
    with SessionLocal() as db:
        rows, coverage = build_labeled_rows(db, args.category, approved_barangay_ids=args.areas)
    result = {"category": args.category, "approved_barangay_ids": args.areas,
              "coverage": coverage, "all_labeled": summary(rows)}
    try:
        training, calibration, holdout = _split_forward(rows)
        result["forward_split"] = {"training": summary(training), "calibration": summary(calibration),
                                    "holdout": summary(holdout)}
    except ValueError as exc:
        result["forward_split"] = {"status": "insufficient_data", "reason": str(exc)}
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
