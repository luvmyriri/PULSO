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


def _publication_is_current(db, payload):
    item = db.query(gov_models.Announcement).filter_by(id=payload['announcement_id']).first()
    if not item or item.status in {'withdrawn', 'expired'} or item.published_version != payload['version']:
        return False
    revision = db.query(gov_models.AnnouncementRevision).filter_by(announcement_id=item.id, version=payload['version']).first()
    if not revision:
        return False
    expiry = revision.snapshot.get('expires_at')
    if expiry:
        dt = datetime.fromisoformat(expiry)
        if (dt.replace(tzinfo=timezone.utc) if not dt.tzinfo else dt) <= datetime.now(timezone.utc):
            return False
    resident = db.query(models.Resident).filter_by(id=payload['resident_id']).first()
    if not resident or not resident.is_active or resident.is_suspended:
        return False
    released = {a['report_id']: a['association_type'] for a in revision.snapshot.get('report_associations', [])}
    assocs = db.query(gov_models.AnnouncementReportAssociation).filter_by(announcement_id=item.id).all()
    source_id = payload.get('source_report_id')
    if source_id and not any(a.report_id == source_id and a.reviewed_by_id and a.association_type in {'confirmed_coverage', 'contextual_relevance'} and released.get(source_id) == a.association_type for a in assocs):
        return False
    for assoc in assocs:
        if assoc.report_id not in payload['report_ids'] or assoc.association_type not in {'confirmed_coverage', 'contextual_relevance'} or released.get(assoc.report_id) != assoc.association_type:
            continue
        report = assoc.report
        if assoc.reviewed_by_id and report and (report.claimed_by_user_id or report.resident_id) == payload['resident_id']:
            return True
    return False


def deliver_pending(db: Session, limit: int = 100) -> int:
    supported = {'resident_in_app_notification', 'publication_in_app_notification', 'publication_related_report_notification'}
    events = db.query(gov_models.OutboxEvent).filter(gov_models.OutboxEvent.status == 'pending', gov_models.OutboxEvent.event_type.in_(supported)).order_by(
        gov_models.OutboxEvent.id,
    ).with_for_update(skip_locked=True).limit(limit).all()
    delivered = 0
    for event in events:
        if event.event_type not in {"resident_in_app_notification", "publication_in_app_notification", "publication_related_report_notification"}:
            # Leave unknown types pending for their own registered transport.
            continue
        payload = event.payload
        try:
            with db.begin_nested():
                valid = True
                if event.event_type.startswith('publication_'):
                    valid = _publication_is_current(db, payload)
                elif payload.get('report_id'):
                    report = db.get(models.Report, payload['report_id'])
                    resident = db.get(models.Resident, payload['resident_id'])
                    valid = bool(report and resident and resident.is_active and not resident.is_suspended and (report.claimed_by_user_id or report.resident_id) == payload['resident_id'])
                if not valid:
                    event.status = 'cancelled'
                    event.attempts += 1
                    continue
                from notification_delivery import queue_email,category_allowed,preferences
                resident=db.get(models.Resident,payload['resident_id'])
                if not category_allowed(resident,event):
                    event.status='skipped';event.attempts+=1
                    continue
                queue_email(db,event,resident)
                if not preferences(resident)['in_app']:
                    event.status='skipped';event.attempts+=1
                    continue
                if not db.query(models.Notification.id).filter_by(outbox_event_id=event.id).first():
                    db.add(models.Notification(
                        outbox_event_id=event.id,
                        resident_id=payload["resident_id"],
                        title=payload["title"],
                        message=payload["message"],
                        target_url=payload.get('target_url'),
                    ))
                db.flush()
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
        from notification_delivery import deliver_email
        deliver_email()
        if args.once:
            print(f"Delivered {delivered} in-app notifications")
            return
        time.sleep(max(0.2, args.interval))


if __name__ == "__main__":
    main()
