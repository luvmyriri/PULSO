#!/usr/bin/env python3
"""Fail CI when an xfailed test has started passing or the baseline is stale."""

import argparse
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--xpass-file", required=True, type=Path)
    args = parser.parse_args()
    if not args.xpass_file.exists():
        print("XPASS results were not written by pytest")
        return 1
    passed = [line for line in args.xpass_file.read_text(encoding="utf-8").splitlines() if line.strip()]
    if passed:
        print("Known failures now passing; remove these entries and rerun CI:")
        for nodeid in passed:
            print(nodeid)
        return 1
    print("Known failure baseline has no unexpected passes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
