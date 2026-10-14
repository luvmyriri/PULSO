"""Deliver committed in-app notifications from the transactional outbox.

Run `python -m outbox_worker --once` or supervise this module as a worker.
"""

import argparse
import time
from datetime import datetime, timezone

from sqlalchemy.orm import Session

import gov_models
import models
from database import SessionLocal


def deliver_pending(db: Session, limit: int = 100) -> int:
    events = db.query(gov_models.OutboxEvent).filter_by(status="pending").order_by(
        gov_models.OutboxEvent.id,
    ).with_for_update(skip_locked=True).limit(limit).all()
    delivered = 0
    for event in events:
        if event.event_type != "resident_in_app_notification":
            # Leave unknown types pending for their own registered transport.
            continue
        payload = event.payload
        if not db.query(models.Notification.id).filter_by(outbox_event_id=event.id).first():
            db.add(models.Notification(
                outbox_event_id=event.id,
                resident_id=payload["resident_id"],
                title=payload["title"],
                message=payload["message"],
            ))
        event.attempts += 1
        event.status = "delivered"
        event.delivered_at = datetime.now(timezone.utc)
        delivered += 1
    db.commit()
    return delivered


def main() -> None:
    parser = argparse.ArgumentParser(description="Deliver PULSO in-app notification outbox")
    parser.add_argument("--once", action="store_true", help="Process one pending batch and exit")
    parser.add_argument("--interval", type=float, default=2.0)
    args = parser.parse_args()
    while True:
        with SessionLocal() as db:
            delivered = deliver_pending(db)
        if args.once:
            print(f"Delivered {delivered} in-app notifications")
            return
        time.sleep(max(0.2, args.interval))


if __name__ == "__main__":
    main()
