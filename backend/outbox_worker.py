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
        try:
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
        except Exception:
            event.attempts += 1
            if event.attempts >= 5:
                event.status = "failed"
    db.commit()
    return delivered


def get_outbox_stats(db: Session) -> dict:
    pending = db.query(gov_models.OutboxEvent).filter_by(status="pending").count()
    delivered = db.query(gov_models.OutboxEvent).filter_by(status="delivered").count()
    failed = db.query(gov_models.OutboxEvent).filter_by(status="failed").count()
    oldest = db.query(gov_models.OutboxEvent).filter_by(status="pending").order_by(gov_models.OutboxEvent.created_at.asc()).first()
    now = datetime.now(timezone.utc)
    oldest_age = (now - oldest.created_at).total_seconds() if (oldest and oldest.created_at) else None
    return {
        "pending": pending,
        "delivered": delivered,
        "failed": failed,
        "oldest_pending_age_seconds": oldest_age,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Deliver PULSO in-app notification outbox")
    parser.add_argument("--once", action="store_true", help="Process one pending batch and exit")
    parser.add_argument("--status", action="store_true", help="Print outbox delivery statistics and exit")
    parser.add_argument("--interval", type=float, default=2.0)
    args = parser.parse_args()
    if args.status:
        with SessionLocal() as db:
            stats = get_outbox_stats(db)
            print(f"Outbox: pending={stats['pending']} delivered={stats['delivered']} failed={stats['failed']} oldest_age={stats['oldest_pending_age_seconds']}")
            return
    while True:
        with SessionLocal() as db:
            delivered = deliver_pending(db)
        if args.once:
            print(f"Delivered {delivered} in-app notifications")
            return
        time.sleep(max(0.2, args.interval))


if __name__ == "__main__":
    main()
