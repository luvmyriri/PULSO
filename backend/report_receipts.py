"""Durable, private receipts and official Gmail notifications for PULSO reports."""
import os
import smtplib
import ssl
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape
from types import SimpleNamespace
from urllib.parse import urlsplit
from dotenv import load_dotenv

load_dotenv()
PH_TZ = timezone(timedelta(hours=8))

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
    date = created.astimezone(PH_TZ).strftime('%d %b %Y, %I:%M %p')
    return report.ticket_id, safe_category(report.category), date


def build_report_receipt_html(
    ticket_id: str,
    category: str,
    submitted_str: str,
    tracking_token: str | None = None,
    location_str: str | None = None,
    recipient_name: str | None = None,
    tracking_url: str | None = None,
) -> str:
    """
    Builds the official Caloocan City Engineer HTML email template matching the
    registration OTP verification email design.
    """
    greeting_recipient = escape((recipient_name or '').strip()) or 'Resident'
    safe_ticket = escape(str(ticket_id or 'RPT-PENDING'))
    safe_token = escape(str(tracking_token or ''))
    safe_cat = escape(str(category or 'Infrastructure Issue'))
    safe_loc = escape(str(location_str or 'Caloocan City'))
    safe_date = escape(str(submitted_str or datetime.now().strftime('%B %d, %Y, %I:%M %p')))
    origin = (os.getenv('PULSO_PUBLIC_BASE_URL') or 'https://pulso.caloocan.gov.ph').strip().rstrip('/')
    default_url = (
        f"{origin}/track?id={safe_ticket}&code={safe_token}"
        if safe_token
        else f"{origin}/dashboard?tab=reports"
    )
    safe_url = escape(str(tracking_url or default_url))
    title = 'Official Report Receipt Notice'

    token_section = (
        f'<div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">'
        f'<div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 6px;">'
        f'Security Tracking Code'
        f'</div>'
        f'<span style="font-family: \'Courier New\', Courier, monospace; font-size: 15px; font-weight: 800; color: #0f172a; background-color: #ffffff; padding: 6px 12px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block;">'
        f'{safe_token}'
        f'</span>'
        f'</div>'
        if safe_token
        else ''
    )

    return f"""<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>{title}</title>
        <style>
            body {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f1f5f9;
                color: #334155;
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }}
            table, td {{
                border-collapse: collapse;
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }}
            img {{
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
            }}
            .wrapper {{
                width: 100%;
                table-layout: fixed;
                background-color: #f1f5f9;
                padding: 30px 12px;
            }}
            .main-card {{
                max-width: 540px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
                border: 1px solid #e2e8f0;
            }}
            .otp-container {{
                background-color: #f8fafc;
                border: 2px dashed #cbd5e1;
                border-radius: 16px;
                padding: 26px 16px;
                margin: 24px 0;
                text-align: center;
            }}
            .otp-code {{
                font-size: 30px;
                font-weight: 800;
                color: #ea580c;
                font-family: 'Courier New', Courier, monospace;
                letter-spacing: 1.5px;
                white-space: nowrap;
                display: inline-block;
                line-height: 1.2;
            }}
            @media only screen and (max-width: 480px) {{
                .wrapper {{
                    padding: 8px 4px !important;
                }}
                .header-pad {{
                    padding: 24px 14px 16px 14px !important;
                }}
                .content-pad {{
                    padding: 16px 14px 28px 14px !important;
                }}
                .seal-img {{
                    width: 70px !important;
                    height: 70px !important;
                }}
                .notice-heading {{
                    font-size: 16px !important;
                }}
                .otp-container {{
                    padding: 20px 10px !important;
                    margin: 18px 0 !important;
                }}
                .otp-code {{
                    font-size: 24px !important;
                    letter-spacing: 1px !important;
                }}
                .footer-pad {{
                    padding: 20px 14px !important;
                }}
            }}
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9;">
        <!-- Preheader hidden snippet for mobile notification previews -->
        <div style="display: none; font-size: 1px; color: #f1f5f9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
            Your PULSO report ({safe_ticket}) has been received and queued for engineering review.
        </div>

        <table role="presentation" class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td align="center">
                    <table role="presentation" class="main-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
                        <!-- Header -->
                        <tr>
                            <td align="center" class="header-pad" style="padding: 36px 24px 20px 24px; text-align: center;">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/8/8b/Caloocan_City.png" class="seal-img" width="85" height="85" alt="Caloocan Seal" style="display: block; margin: 0 auto 16px auto;">
                                <div style="color: #1e3a8a; font-weight: 700; font-size: 13px; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em;">Republic of the Philippines</div>
                                <div style="color: #1e3a8a; font-weight: 700; font-size: 13px; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em;">City Government of Caloocan</div>
                                <div style="color: #1e3a8a; font-weight: 700; font-size: 12px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Office of the City Engineer</div>
                                <div class="notice-heading" style="display: inline-block; color: #1e3a8a; font-size: 19px; font-weight: 900; border-bottom: 3px solid #1e3a8a; padding-bottom: 2px; text-transform: uppercase; letter-spacing: 0.08em;">
                                    {title}
                                </div>
                            </td>
                        </tr>

                        <!-- Body Content -->
                        <tr>
                            <td class="content-pad" style="padding: 24px 32px 36px 32px; text-align: center;">
                                <div style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 auto 16px auto; text-align: left;">
                                    <p style="margin: 0 0 10px 0; font-weight: 700; color: #0f172a; font-size: 15px;">Hello {greeting_recipient},</p>
                                    <p style="margin: 0; color: #475569;">
                                        Thank you for submitting an infrastructure report with PULSO Caloocan. Your report has been officially recorded and queued for engineering review. Please keep your Official Ticket ID below to track status updates:
                                    </p>
                                </div>

                                <!-- Official Ticket ID & Tracking Code Box -->
                                <div class="otp-container">
                                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 6px;">
                                        Official Ticket ID
                                    </div>
                                    <span class="otp-code">{safe_ticket}</span>
                                    {token_section}
                                </div>

                                <!-- Report Details Card -->
                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; text-align: left; font-size: 13px; color: #334155; line-height: 1.75; margin-top: 16px;">
                                    <div><strong style="color: #0f172a;">Category:</strong> {safe_cat}</div>
                                    <div><strong style="color: #0f172a;">Location:</strong> {safe_loc}</div>
                                    <div><strong style="color: #0f172a;">Current Status:</strong> <span style="color: #ea580c; font-weight: 700;">Received &amp; Queued for Triage</span></div>
                                    <div><strong style="color: #0f172a;">Date Submitted:</strong> {safe_date}</div>
                                </div>

                                <!-- Track Report Action Button -->
                                <div style="margin-top: 22px; text-align: center;">
                                    <a href="{safe_url}" style="display: inline-block; background-color: #ea580c; color: #ffffff; font-weight: 800; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 10px; letter-spacing: 0.04em;">
                                        Track Your Report &rarr;
                                    </a>
                                </div>

                                <!-- Security Advisory Box -->
                                <div style="background-color: #fff1f2; border: 1.5px solid #fecaca; border-radius: 12px; padding: 18px 20px; text-align: left; margin-top: 26px;">
                                    <div style="color: #991b1b; font-weight: 900; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
                                        SECURITY AND COMPLIANCE ADVISORY
                                    </div>
                                    <div style="font-size: 11px; color: #7f1d1d; line-height: 1.6;">
                                        Keep your Ticket ID and Tracking Code confidential. City Engineering personnel will review your field evidence and send official progress notifications to this Gmail address.
                                    </div>
                                </div>
                            </td>
                        </tr>

                        <!-- Solid Orange Footer -->
                        <tr>
                            <td class="footer-pad" style="background-color: #ea580c; padding: 24px 20px; text-align: center; color: #ffffff;">
                                <div style="font-weight: 900; font-size: 11px; letter-spacing: 0.1em; margin-bottom: 8px; text-transform: uppercase;">
                                    OFFICIAL SECURITY DETAILS
                                </div>
                                <div style="font-size: 10px; opacity: 0.95; margin-bottom: 12px;">
                                    {safe_date} | OFFICE: Engineer Department | Caloocan City Hall
                                </div>
                                <div style="font-size: 9px; opacity: 0.75; border-top: 1px solid rgba(255,255,255,0.25); padding-top: 8px;">
                                    This is an automated message. Please do not reply to this email.
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>"""


def send_report_gmail_notification(
    to_email: str,
    ticket_id: str,
    category: str,
    tracking_token: str | None = None,
    location_str: str | None = None,
    recipient_name: str | None = None,
    tracking_url: str | None = None,
) -> bool:
    """
    Sends the official PULSO report receipt notification via Gmail SMTP (matching send_otp_email).
    """
    try:
        load_dotenv()
        clean_to = (to_email or '').strip().lower()
        smtp_user = os.getenv('SMTP_USER')
        smtp_pass = os.getenv('SMTP_PASS')

        if not clean_to or not smtp_user or not smtp_pass:
            print('[MAIL ERROR] SMTP credentials or recipient email missing for report notification.')
            return False

        now_str = datetime.now(PH_TZ).strftime('%B %d, %Y, %I:%M %p')
        email_html = build_report_receipt_html(
            ticket_id=ticket_id,
            category=category,
            submitted_str=now_str,
            tracking_token=tracking_token,
            location_str=location_str,
            recipient_name=recipient_name,
            tracking_url=tracking_url,
        )

        clean_pass = smtp_pass.replace(' ', '')
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'【PULSO Official】 Official Report Receipt Notice: {ticket_id}'
        msg['From'] = f'PULSO Security <{smtp_user}>'
        msg['To'] = clean_to
        msg['X-Priority'] = '1'

        plain_text = (
            f'Your PULSO report was created successfully.\n'
            f'Reference: {ticket_id}\n'
            f'Tracking Code: {tracking_token or "N/A"}\n'
            f'Category: {safe_category(category)}\n'
            f'Location: {location_str or "Caloocan City"}\n'
            f'Submitted: {now_str} (Philippine time)\n'
            f'Status: Received for engineering review.\n'
        )
        msg.attach(MIMEText(plain_text, 'plain'))
        msg.attach(MIMEText(email_html, 'html'))

        with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=10) as server:
            server.login(smtp_user, clean_pass)
            server.send_message(msg)
            print(f'[MAIL] SMTP accepted report notification email for {ticket_id} -> {clean_to}.')
        return True
    except Exception as e:
        print(f'[MAIL ERROR] Report notification email error: {e.__class__.__name__}: {e}')
        return False


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
    plain_body = (
        f'Your PULSO report was created successfully.\n'
        f'Reference: {ticket}\nCategory: {category}\nSubmitted: {date} (Philippine time)\n'
        f'Status: Received for engineering review. This does not mean the issue is resolved.\n\n'
        f'Your complete report is available after sign-in: {nd.config()["origin"]}/dashboard?tab=reports\n\n'
        f'Matagumpay na naitala ang iyong ulat sa PULSO.\n'
        f'Reperensiya: {ticket}\nKategorya: {category}\nPetsa: {date} (oras sa Pilipinas)\n'
        f'Katayuan: Natanggap para sa pagsusuri ng engineering. Hindi pa ito nangangahulugang nalutas na.\n'
        'Mag-sign in sa PULSO upang makita ang buong ulat.'
    )
    message.set_content(plain_body)
    html_body = build_report_receipt_html(
        ticket_id=ticket,
        category=category,
        submitted_str=date,
        tracking_url=f'{nd.config()["origin"]}/dashboard?tab=reports',
    )
    message.add_alternative(html_body, subtype='html')
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
