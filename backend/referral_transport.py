"""At-most-one automatic dispatch attempt; unknown SMTP outcomes require reconciliation."""
import os
import ssl
import smtplib
from datetime import timedelta
from email.message import EmailMessage
from email_validator import validate_email, EmailNotValidError
from database import SessionLocal
import models
from referral_models import ExternalReferral, ReferralDelivery
from external_referrals import now, event, current_recipient, grant
from government_access import require_report_scope


def valid_email(value):
    try:
        return validate_email(value, check_deliverability=False).normalized
    except (EmailNotValidError, TypeError):
        return None


def configuration():
    sender = valid_email(os.getenv('SMTP_USER', ''))
    reply_to = valid_email(os.getenv('PULSO_REFERRAL_REPLY_TO', ''))
    enabled = os.getenv('PULSO_REFERRALS_ENABLED', '').lower() == 'true'
    return dict(ready=bool(enabled and sender and reply_to and os.getenv('SMTP_PASS')), sender=sender, reply_to=reply_to)


class DispatchError(Exception):
    def __init__(self, code, uncertain=False):
        self.code, self.uncertain = code, uncertain


def transmit(packet, pdf, message_id):
    settings = configuration()
    if not settings['ready']: raise DispatchError('not_configured')
    message = EmailMessage()
    message['From'], message['Reply-To'], message['To'] = settings['sender'], settings['reply_to'], packet['recipient_email']
    message['Message-ID'] = message_id
    message['Subject'] = f"[PULSO {packet['reference']}] Coordination requested: {packet['ticket_id']}"
    message.set_content(f"Dear {packet['recipient_name']},\n\nPlease review the attached City Engineering Department referral letter. "
        f"Kindly acknowledge receipt and quote {packet['reference']} when replying. Receipt of this email does not itself record acceptance.\n\n"
        f"CED coordination owner: {packet['owner_name']}\nReply to: {settings['reply_to']}\n")
    message.add_attachment(pdf, maintype='application', subtype='pdf', filename=f"{packet['reference']}.pdf")
    data_started = False
    try:
        with smtplib.SMTP_SSL(os.getenv('PULSO_REFERRAL_SMTP_HOST', 'smtp.gmail.com'), int(os.getenv('PULSO_REFERRAL_SMTP_PORT', '465')), timeout=20, context=ssl.create_default_context()) as server:
            server.login(settings['sender'], os.environ['SMTP_PASS'].replace(' ', ''))
            data_started = True
            if server.send_message(message): raise DispatchError('recipient_refused')
    except DispatchError: raise
    except smtplib.SMTPRecipientsRefused: raise DispatchError('recipient_refused')
    except smtplib.SMTPAuthenticationError: raise DispatchError('authentication_failed')
    except smtplib.SMTPDataError: raise DispatchError('provider_rejected')
    except Exception: raise DispatchError('delivery_unknown' if data_started else 'connection_failed', uncertain=data_started)


def deliver_referrals(sessions=SessionLocal, limit=3):
    if not configuration()['ready']: return
    # A worker lost after entering SMTP must never blindly resend the packet.
    with sessions() as db:
        stale = db.query(ExternalReferral).join(ReferralDelivery, ReferralDelivery.referral_id == ExternalReferral.id).filter(
            ReferralDelivery.status == 'sending', ReferralDelivery.started_at < now()-timedelta(minutes=10)).with_for_update(of=ExternalReferral, skip_locked=True).all()
        for item in stale:
            delivery = db.query(ReferralDelivery).filter(ReferralDelivery.referral_id == item.id, ReferralDelivery.status == 'sending',
                ReferralDelivery.started_at < now()-timedelta(minutes=10)).with_for_update().first()
            if not delivery: continue
            delivery.status, delivery.error_code, delivery.finished_at = 'delivery_unknown', 'worker_interrupted', now()
            item.version += 1
            event(db, item, None, 'delivery_unknown', 'Dispatch was interrupted. Reconcile the message before sending again.', message_id=delivery.message_id)
        db.commit()
    for _ in range(limit):
        with sessions() as db:
            # Same lock order as interactive commands: referral, then delivery.
            item = db.query(ExternalReferral).join(ReferralDelivery, ReferralDelivery.referral_id == ExternalReferral.id).filter(
                ReferralDelivery.status == 'queued').order_by(ReferralDelivery.id).with_for_update(of=ExternalReferral, skip_locked=True).first()
            if not item: break
            delivery = db.query(ReferralDelivery).filter_by(referral_id=item.id, status='queued').order_by(ReferralDelivery.id).with_for_update().first()
            if not delivery: continue
            actor = db.get(models.Official, delivery.queued_by_id)
            approver = db.get(models.Official, item.approved_by_id) if item.approved_by_id else None
            report = db.get(models.Report, item.report_id)
            allowed = bool(item.status == 'approved' and actor and grant(actor, 'create') and approver and grant(approver, 'approve')
                and current_recipient(db, item) and item.packet_hash == delivery.packet_hash
                and item.packet.get('reply_to') == configuration()['reply_to'] and item.packet.get('report_version') == report.version)
            if allowed:
                try: require_report_scope(db, actor, report)
                except Exception: allowed = False
            if not allowed:
                delivery.status, delivery.error_code, delivery.finished_at = 'failed', 'approval_or_recipient_changed', now()
                item.version += 1
                event(db, item, None, 'delivery_failed', 'Dispatch stopped because authority, report, recipient or packet changed. Review before retrying.')
                db.commit()
                continue
            delivery.status, delivery.started_at = 'sending', now()
            delivery_id, referral_id, packet, pdf, message_id = delivery.id, item.id, dict(item.packet), bytes(item.letter_pdf), delivery.message_id
            db.commit()
        status, error = 'provider_accepted', None
        try: transmit(packet, pdf, message_id)
        except DispatchError as exc: status, error = ('delivery_unknown' if exc.uncertain else 'failed'), exc.code
        with sessions() as db:
            item = db.query(ExternalReferral).filter_by(id=referral_id).with_for_update().one()
            delivery = db.query(ReferralDelivery).filter_by(id=delivery_id).with_for_update().one()
            if delivery.status != 'sending': continue
            delivery.status, delivery.error_code, delivery.finished_at = status, error, now()
            item.version += 1
            item.updated_at = now()
            if status == 'provider_accepted': item.status = 'awaiting_acknowledgment'
            event(db, item, None, status, 'Mail provider accepted the referral; receiving-office acknowledgment remains pending.' if status == 'provider_accepted' else 'Dispatch needs staff review. No automatic resend will occur.', message_id=message_id, error_code=error)
            db.add(models.Notification(official_id=item.owner_id, title='External referral dispatch update', message=f'{item.reference}: {status.replace("_", " ")}.', target_url=f'/gov/reports/{item.report_id}?reportTab=routing&referral={item.id}'))
            db.commit()
