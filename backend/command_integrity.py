"""Integrity helpers for report-sourced government commands."""

import hashlib
import json
import re

from fastapi import HTTPException
from sqlalchemy.orm import Session

import gov_models


def parse_version(value: str | None) -> int | None:
    if value is None:
        return None  # Legacy clients can migrate without losing access.
    match = re.fullmatch(r'"?([1-9][0-9]*)"?', value.strip())
    if not match:
        raise HTTPException(status_code=422, detail="If-Match must contain a positive report version")
    return int(match.group(1))


def check_version(current: int, expected: int | None) -> None:
    if expected is not None and current != expected:
        raise HTTPException(status_code=409, detail={
            "code": "REPORT_VERSION_CONFLICT", "current_version": current,
            "next_action": "Refresh the report and review the decision again",
        })


def validate_key(key: str | None) -> str | None:
    if key is None:
        return None
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:-]{7,127}", key):
        raise HTTPException(status_code=422, detail="Idempotency-Key must be 8–128 safe characters")
    return key


def request_hash(payload: dict) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def find_receipt(
    db: Session, *, actor_id: int, operation: str, report_id: int,
    key: str | None, digest: str,
) -> gov_models.CommandReceipt | None:
    if key is None:
        return None
    receipt = db.query(gov_models.CommandReceipt).filter_by(
        actor_id=actor_id, operation=operation, report_id=report_id,
        idempotency_key=key,
    ).first()
    if receipt and receipt.request_hash != digest:
        raise HTTPException(status_code=409, detail="Idempotency-Key was already used with different input")
    return receipt


def record_receipt(
    db: Session, *, actor_id: int, operation: str, report_id: int,
    key: str | None, digest: str, resource_id: int, result_json: dict | None = None,
) -> None:
    if key is not None:
        db.add(gov_models.CommandReceipt(
            actor_id=actor_id, operation=operation, report_id=report_id,
            idempotency_key=key, request_hash=digest, resource_id=resource_id,
            result_json=result_json,
        ))
