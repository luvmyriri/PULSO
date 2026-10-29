"""Offline release builder. Requires verified outcomes and an owner-approved policy JSON."""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from database import SessionLocal
from production_predictive import train_release


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--category", required=True)
    parser.add_argument("--policy", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    policy = json.loads(args.policy.read_text(encoding="utf-8"))
    with SessionLocal() as db:
        result = train_release(db, args.category, policy, args.output)
    print(json.dumps(dict(artifact=args.output.as_posix(), metrics=result["metrics"], model_sha256=result["model_sha256"]), indent=2))


if __name__ == "__main__":
    main()
