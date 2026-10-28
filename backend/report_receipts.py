"""Durable, private receipts for reports submitted by signed-in residents."""
import os
import smtplib
import ssl
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from types import SimpleNamespace
from zoneinfo import ZoneInfo
from urllib.parse import urlsplit

from sqlalchemy import or_

import gov_models as gm
import models
import notification_delivery as nd
import sms_utils
from database import SessionLocal

EMAIL = 'report_creation_receipt_email'
SMS = 'report_creation_receipt_sms'
EVENTS = {EMAIL, SMS}


def enabled():
    return os.getenv('REPORT_CREATION_RECEIPTS_ENABLED', 'false').lower() == 'true'


def smtp_ready():
    return bool(nd.config()['origin'] and os.getenv('SMTP_USER') and os.getenv('SMTP_PASS'))


def sms_ready():
    return bool(os.getenv('REPORT_RECEIPT_SMS_PROVIDER', 'none').lower() == 'textbee'
                and os.getenv('TEXTBEE_ENABLE_OUTBOUND', 'false').lower() == 'true'
                and os.getenv('TEXTBEE_API_KEY'))


def safe_category(value):
    # The report category originates in user input. Keep transport copy short and one-line.
    clean = ''.join(ch if ch.isprintable() else ' ' for ch in str(value or 'Issue'))
    return ' '.join(clean.split())[:60] or 'Issue'


def receipt_details(report):
    created = report.created_at or datetime.now(timezone.utc)
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    date = created.astimezone(ZoneInfo('Asia/Manila')).strftime('%d %b %Y, %I:%M %p')
    return report.ticket_id, safe_category(report.category), date


def queue_intents(db, report):
    """Add both channel intents in the same transaction as the report."""
    if not enabled() or not report.resident_id:
        return
    resident = db.get(models.Resident, report.resident_id)
    if not resident or not resident.is_active or resident.is_suspended:
        return
    for event_type, contact in ((EMAIL, resident.email), (SMS, resident.phone_number)):
        if contact:
            db.add(gm.OutboxEvent(
                event_key=f'{event_type}:{report.id}', event_type=event_type,
                payload={'resident_id': resident.id, 'report_id': report.id},
            ))


def eligible(db, event, resident=None):
    if not event or event.event_type not in EVENTS or not enabled():
        return False
    resident = resident or db.get(models.Resident, event.payload.get('resident_id'))
    report = db.get(models.Report, event.payload.get('report_id'))
    return bool(resident and resident.is_active and not resident.is_suspended
                and report and report.resident_id == resident.id)


def recipient(resident, event_type):
    if event_type == EMAIL:
        return resident.email
    return sms_utils._normalize_e164_ph_phone(resident.phone_number)


def queue_delivery(db, event):
    if not eligible(db, event):
        return False
    if db.query(gm.ResidentNotificationDelivery.id).filter_by(event_id=event.id).first():
        return True
    resident = db.get(models.Resident, event.payload['resident_id'])
    address = recipient(resident, event.event_type)
    if not address:
        return False
    ready = smtp_ready() if event.event_type == EMAIL else sms_ready()
    db.add(gm.ResidentNotificationDelivery(
        event_id=event.id, resident_id=resident.id,
        recipient_hash=nd.email_hash(address),
        status='pending' if ready else 'waiting_configuration', next_attempt_at=nd.now(),
    ))
    return True


def send_email(address, report, message_id):
    if not smtp_ready():
        raise nd.DeliveryError('not_configured')
    ticket, category, date = receipt_details(report)
    message = EmailMessage()
    message['Subject'] = f'PULSO report received: {ticket}'
    message['From'] = os.environ['SMTP_USER']
    message['To'] = address
    message['Message-ID'] = message_id
    message.set_content(
        f'Your PULSO report was created successfully.\n'
        f'Reference: {ticket}\nCategory: {category}\nSubmitted: {date} (Philippine time)\n'
        f'Status: Received for engineering review. This does not mean the issue is resolved.\n\n'
        f'Your complete report is available after sign-in: {nd.config()["origin"]}/dashboard?tab=reports\n\n'
        f'Matagumpay na naitala ang iyong ulat sa PULSO.\n'
        f'Reperensiya: {ticket}\nKategorya: {category}\nPetsa: {date} (oras sa Pilipinas)\n'
        f'Katayuan: Natanggap para sa pagsusuri ng engineering. Hindi pa ito nangangahulugang nalutas na.\n'
        'Mag-sign in sa PULSO upang makita ang buong ulat.'
    )
    data_started = False
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=15, context=ssl.create_default_context()) as server:
            server.login(os.environ['SMTP_USER'], os.environ['SMTP_PASS'].replace(' ', ''))
            data_started = True
            if server.send_message(message):
                raise nd.DeliveryError('recipient_refused')
    except nd.DeliveryError:
        raise
    except smtplib.SMTPAuthenticationError:
        raise nd.DeliveryError('authentication_failed')
    except smtplib.SMTPRecipientsRefused as error:
        raise nd.DeliveryError('recipient_refused', retry=all(v[0] < 500 for v in error.recipients.values()))
    except smtplib.SMTPResponseException as error:
        raise nd.DeliveryError('smtp_rejected', retry=error.smtp_code < 500)
    except (TimeoutError, OSError, smtplib.SMTPServerDisconnected):
        raise nd.DeliveryError('acceptance_unknown' if data_started else 'connection_failed',
                               retry=not data_started, uncertain=data_started)
    except smtplib.SMTPException:
        raise nd.DeliveryError('smtp_failed', retry=not data_started, uncertain=data_started)


def send_sms(address, report):
    ticket, category, _ = receipt_details(report)
    message = (f'PULSO: Report {ticket} received. Category: {category}. '
               'Pending engineering review. Sign in to PULSO for details. '
               'Naitala ang ulat; hindi pa nalutas.')
    return sms_utils.send_report_receipt_sms(address, message)


def deliver(sessions=SessionLocal, limit=10, email_sender=send_email, sms_sender=send_sms):
    """Claim before sending; uncertain outcomes are held to avoid duplicate receipts."""
    accepted = 0
    with sessions() as db:
        db.query(gm.ResidentNotificationDelivery).filter(
            gm.ResidentNotificationDelivery.status == 'sending',
            gm.ResidentNotificationDelivery.lease_until < nd.now(),
            gm.ResidentNotificationDelivery.event_id.in_(
                db.query(gm.OutboxEvent.id).filter(gm.OutboxEvent.event_type.in_(EVENTS))
            )
        ).update({'status': 'uncertain', 'error_code': 'worker_interrupted'}, synchronize_session=False)
        db.commit()
    for _ in range(limit):
        with sessions() as db:
            item = db.query(gm.ResidentNotificationDelivery).join(
                gm.OutboxEvent, gm.OutboxEvent.id == gm.ResidentNotificationDelivery.event_id
            ).filter(gm.OutboxEvent.event_type.in_(EVENTS),
                     gm.ResidentNotificationDelivery.status.in_(['pending', 'retry', 'waiting_configuration']),
                     or_(gm.ResidentNotificationDelivery.next_attempt_at.is_(None),
                         gm.ResidentNotificationDelivery.next_attempt_at <= nd.now())).order_by(
                             gm.ResidentNotificationDelivery.id).with_for_update(skip_locked=True).first()
            if not item:
                break
            event = db.get(gm.OutboxEvent, item.event_id)
            resident = db.get(models.Resident, item.resident_id)
            address = recipient(resident, event.event_type) if resident else None
            if not eligible(db, event, resident) or not address or nd.email_hash(address) != item.recipient_hash:
                item.status = 'cancelled'; item.error_code = 'eligibility_changed'; db.commit(); continue
            is_email = event.event_type == EMAIL
            if not (smtp_ready() if is_email else sms_ready()):
                item.status = 'waiting_configuration'; item.next_attempt_at = nd.now() + timedelta(minutes=5)
                db.commit(); continue
            report = db.get(models.Report, event.payload['report_id'])
            # SMTP/TextBee run after commit; copy only fields needed for the receipt.
            report_summary = SimpleNamespace(ticket_id=report.ticket_id, category=report.category,
                                             created_at=report.created_at)
            item.status = 'sending'; item.attempts += 1; item.lease_until = nd.now() + timedelta(minutes=2)
            item_id, attempt = item.id, item.attempts
            message_id = f'<pulso-receipt-{item.id}@{urlsplit(nd.config()["origin"]).hostname}>' if is_email else None
            db.commit()
        outcome, code, next_attempt = ('smtp_accepted' if is_email else 'sms_accepted'), None, None
        try:
            if is_email:
                email_sender(address, report_summary, message_id)
            elif not sms_sender(address, report_summary).accepted:
                raise nd.DeliveryError('provider_acceptance_unknown', uncertain=True)
        except nd.DeliveryError as error:
            code = error.code
            outcome = 'uncertain' if error.uncertain else 'retry' if error.retry and attempt < 5 else 'failed'
            if outcome == 'retry':
                next_attempt = nd.now() + timedelta(minutes=min(60, 2 ** attempt))
        except Exception:
            outcome, code = 'uncertain', 'unexpected_transport_result'
        with sessions() as db:
            item = db.query(gm.ResidentNotificationDelivery).filter_by(id=item_id, status='sending').with_for_update().first()
            if item:
                item.status = outcome; item.error_code = code; item.next_attempt_at = next_attempt
                item.lease_until = None
                if outcome in {'smtp_accepted', 'sms_accepted'}:
                    item.accepted_at = nd.now(); accepted += 1
                db.commit()
    return accepted
