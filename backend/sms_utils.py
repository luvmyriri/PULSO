"""Small, fail-closed SMS provider adapters for PULSO traffic."""

import logging
import os
import re
from dataclasses import dataclass

import requests
from dotenv import load_dotenv

_ENV_DIR = os.path.dirname(__file__)
load_dotenv(os.path.join(_ENV_DIR, ".env.local"))
load_dotenv(os.path.join(_ENV_DIR, ".env"))

_LOG = logging.getLogger(__name__)
_SEMAPHORE_BASE_URL = "https://api.semaphore.co/api/v4"
_PHILSMS_SEND_URL = "https://dashboard.philsms.com/api/v3/sms/send"
_PHILSMS_MESSAGE_URL = "https://dashboard.philsms.com/api/v3/sms"
_IPROG_SEND_URL = "https://www.iprogsms.com/api/v1/sms_messages"
_IPROG_NETWORK_URL = "https://www.iprogsms.com/api/v1/phone_numbers/detect"
_TEXTBEE_BASE_URL = "https://api.textbee.dev/api/v1/gateway"
_ACCEPTED_STATUSES = {"queued", "pending", "sent"}


@dataclass(frozen=True)
class SmsSendResult:
    accepted: bool
    provider_message_id: str | int | None = None
    provider_status: str | None = None


def _provider() -> str:
    return os.getenv("SMS_PROVIDER", "semaphore").strip().lower()


def _send_semaphore_sms(route: str, phone_number: str, message: str, *, code: str | None = None) -> SmsSendResult:
    api_key = os.getenv("SEMAPHORE_API_KEY", "").strip()
    if not api_key:
        _LOG.warning("Semaphore SMS not configured; no message was sent")
        return SmsSendResult(False)

    payload = {"apikey": api_key, "number": phone_number, "message": message}
    sender_name = os.getenv("SEMAPHORE_SENDER_NAME", "").strip()
    if sender_name:
        payload["sendername"] = sender_name
    if code is not None:
        payload["code"] = code

    try:
        response = requests.post(f"{_SEMAPHORE_BASE_URL}/{route}", data=payload, timeout=8)
        response.raise_for_status()
        entries = response.json()
    except (requests.RequestException, ValueError):
        # Provider error bodies can contain phone numbers, message text, or account data.
        _LOG.warning("Semaphore SMS request failed on %s route", route)
        return SmsSendResult(False)

    if not isinstance(entries, list) or len(entries) != 1 or not isinstance(entries[0], dict):
        _LOG.warning("Semaphore SMS returned an unexpected response on %s route", route)
        return SmsSendResult(False)

    entry = entries[0]
    provider_id = entry.get("message_id")
    provider_status = str(entry.get("status", "")).lower()
    accepted = isinstance(provider_id, int) and provider_status in _ACCEPTED_STATUSES
    if not accepted:
        _LOG.warning("Semaphore SMS was not accepted on %s route", route)
    return SmsSendResult(accepted, provider_id if accepted else None, provider_status or None)


def _send_philsms_sms(phone_number: str, message: str) -> SmsSendResult:
    # The 2026-09-29 live pilot was classified by PhilSMS as Voice despite
    # requesting plain SMS. Keep this route off until the provider resolves it.
    if os.getenv("PHILSMS_ENABLE_OUTBOUND", "false").strip().lower() != "true":
        _LOG.warning("PhilSMS outbound is disabled pending channel verification")
        return SmsSendResult(False)

    token = os.getenv("PHILSMS_API_TOKEN", "").strip()
    sender_id = os.getenv("PHILSMS_SENDER_ID", "").strip()
    digits = "".join(character for character in phone_number if character.isdigit())
    if digits.startswith("09") and len(digits) == 11:
        recipient = "63" + digits[1:]
    elif digits.startswith("639") and len(digits) == 12:
        recipient = digits
    else:
        _LOG.warning("PhilSMS recipient number is invalid")
        return SmsSendResult(False)
    if not token or not sender_id:
        _LOG.warning("PhilSMS token or sender ID is not configured; no message was sent")
        return SmsSendResult(False)

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload = {"recipient": recipient, "sender_id": sender_id, "type": "plain", "message": message}
    try:
        response = requests.post(_PHILSMS_SEND_URL, headers=headers, json=payload, timeout=8)
        response.raise_for_status()
        body = response.json()
    except (requests.RequestException, ValueError):
        _LOG.warning("PhilSMS request failed")
        return SmsSendResult(False)

    if not isinstance(body, dict) or str(body.get("status", "")).lower() != "success":
        _LOG.warning("PhilSMS did not accept the message")
        return SmsSendResult(False)
    data = body.get("data")
    if isinstance(data, list) and data:
        data = data[0]
    provider_id = None
    provider_status = "accepted"
    if isinstance(data, dict):
        provider_id = data.get("uid") or data.get("message_id") or data.get("id")
        provider_status = str(data.get("status") or "accepted").lower()
    if provider_status in {"error", "failed", "rejected"}:
        _LOG.warning("PhilSMS returned a failed message state")
        return SmsSendResult(False, provider_id, provider_status)

    # A successful POST only means the provider accepted a job. The pilot's
    # successful jobs were later recorded as Voice, so confirm the channel.
    if not isinstance(provider_id, (str, int)) or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", str(provider_id)):
        _LOG.warning("PhilSMS returned no usable message ID for channel verification")
        return SmsSendResult(False, provider_id, provider_status)
    sms_type = ""
    try:
        detail_response = requests.get(
            f"{_PHILSMS_MESSAGE_URL}/{provider_id}", headers=headers, timeout=8
        )
        detail_response.raise_for_status()
        detail = detail_response.json()
        if isinstance(detail, dict) and isinstance(detail.get("data"), dict):
            sms_type = str(detail["data"].get("sms_type") or "").lower()
    except (requests.RequestException, ValueError):
        _LOG.warning("PhilSMS channel lookup failed")
    if sms_type != "plain":
        _LOG.warning("PhilSMS message channel was not confirmed as plain SMS")
        return SmsSendResult(False, provider_id, provider_status)
    return SmsSendResult(True, provider_id, provider_status)


def _send_iprogsms_sms(phone_number: str, message: str) -> SmsSendResult:
    if os.getenv("IPROG_SMS_ENABLE_OUTBOUND", "false").strip().lower() != "true":
        _LOG.warning("IPROG SMS outbound is disabled pending pilot verification")
        return SmsSendResult(False)

    token = os.getenv("IPROG_SMS_API_TOKEN", "").strip()
    digits = "".join(character for character in phone_number if character.isdigit())
    if digits.startswith("09") and len(digits) == 11:
        recipient = "63" + digits[1:]
    elif digits.startswith("639") and len(digits) == 12:
        recipient = digits
    else:
        _LOG.warning("IPROG SMS recipient number is invalid")
        return SmsSendResult(False)
    if not token:
        _LOG.warning("IPROG SMS token is not configured; no message was sent")
        return SmsSendResult(False)

    # IPROG's shared sender does not cover Smart/TNT. Check before a paid send.
    try:
        network_response = requests.post(
            _IPROG_NETWORK_URL,
            json={"api_token": token, "phone_number": "0" + recipient[2:]},
            timeout=8,
        )
        network_response.raise_for_status()
        network_body = network_response.json()
    except (requests.RequestException, ValueError):
        _LOG.warning("IPROG SMS network check failed; no message was sent")
        return SmsSendResult(False)
    network_data = network_body.get("data") if isinstance(network_body, dict) else None
    if not isinstance(network_data, dict) or network_body.get("status") != "success":
        _LOG.warning("IPROG SMS did not confirm the recipient network")
        return SmsSendResult(False)
    network = str(network_data.get("network") or "").strip().lower()
    is_smart_tnt = network_data.get("is_smart_tnt") is True or network == "smart/tnt"
    if is_smart_tnt:
        if os.getenv("IPROG_SMS_ALLOW_SMART_TNT", "false").strip().lower() != "true":
            _LOG.warning("IPROG SMS shared sender does not support this network")
            return SmsSendResult(False)
    elif network not in {"globe/tm", "dito", "gomo"}:
        _LOG.warning("IPROG SMS recipient network is not confirmed as supported")
        return SmsSendResult(False)

    try:
        response = requests.post(
            _IPROG_SEND_URL,
            json={"api_token": token, "phone_number": recipient, "message": message},
            timeout=8,
        )
        response.raise_for_status()
        body = response.json()
    except (requests.RequestException, ValueError):
        _LOG.warning("IPROG SMS request failed")
        return SmsSendResult(False)

    if not isinstance(body, dict) or str(body.get("status")) != "200":
        _LOG.warning("IPROG SMS did not queue the message")
        return SmsSendResult(False)
    provider_id = body.get("message_id")
    if not isinstance(provider_id, str) or not re.fullmatch(r"iSms-[A-Za-z0-9_-]+", provider_id):
        _LOG.warning("IPROG SMS returned no usable message ID")
        return SmsSendResult(False)
    return SmsSendResult(True, provider_id, "queued")


def _normalize_e164_ph_phone(phone_number: str) -> str | None:
    digits = "".join(character for character in (phone_number or "") if character.isdigit())
    if digits.startswith("09") and len(digits) == 11:
        return "+63" + digits[1:]
    if digits.startswith("639") and len(digits) == 12:
        return "+" + digits
    return None


def _send_textbee_sms(phone_number: str, message: str) -> SmsSendResult:
    if os.getenv("TEXTBEE_ENABLE_OUTBOUND", "false").strip().lower() != "true":
        _LOG.warning("TextBee SMS outbound is disabled")
        return SmsSendResult(False)

    api_key = os.getenv("TEXTBEE_API_KEY", "").strip()
    device_id = os.getenv("TEXTBEE_DEVICE_ID", "").strip()
    recipient = _normalize_e164_ph_phone(phone_number)
    if not recipient:
        _LOG.warning("TextBee SMS recipient number is invalid")
        return SmsSendResult(False)
    if not api_key or not (message or "").strip():
        _LOG.warning("TextBee SMS API key or message is not configured; no message was sent")
        return SmsSendResult(False)

    headers = {
        "x-api-key": api_key,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if device_id:
        send_url = f"{_TEXTBEE_BASE_URL}/devices/{device_id}/send-sms"
    else:
        send_url = f"{_TEXTBEE_BASE_URL}/send-sms"

    payload: dict = {"recipients": [recipient], "message": message}
    sim_sub = os.getenv("TEXTBEE_SIM_SUBSCRIPTION_ID", "").strip()
    if sim_sub.isdigit():
        payload["simSubscriptionId"] = int(sim_sub)

    try:
        response = requests.post(send_url, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        body = response.json()
    except (requests.RequestException, ValueError):
        _LOG.warning("TextBee SMS request failed")
        return SmsSendResult(False)

    if not isinstance(body, dict):
        _LOG.warning("TextBee SMS returned an unexpected response")
        return SmsSendResult(False)

    data = body.get("data") if isinstance(body.get("data"), dict) else body
    success = data.get("success") is True or body.get("success") is True
    provider_id = (
        data.get("smsBatchId")
        or data.get("_id")
        or data.get("id")
        or data.get("message_id")
        or body.get("smsBatchId")
    )
    if not success or not isinstance(provider_id, (str, int)) or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", str(provider_id)):
        _LOG.warning("TextBee SMS did not accept the message")
        return SmsSendResult(False)

    provider_status = str(data.get("status") or data.get("message") or "queued").lower()
    return SmsSendResult(True, provider_id, provider_status)


def send_plain_sms(phone_number: str, message: str) -> SmsSendResult:
    """Send one plain SMS using the configured provider."""
    if _provider() == "textbee":
        return _send_textbee_sms(phone_number, message)
    if _provider() == "philsms":
        return _send_philsms_sms(phone_number, message)
    if _provider() == "iprogsms":
        return _send_iprogsms_sms(phone_number, message)
    if _provider() == "semaphore":
        return _send_semaphore_sms("messages", phone_number, message)
    _LOG.warning("Unknown SMS provider configured")
    return SmsSendResult(False)


def send_registration_sms(phone_number: str, message: str) -> SmsSendResult:
    """Use TextBee for registration without enabling unrelated outbound SMS."""
    if os.getenv("REGISTRATION_SMS_PROVIDER", "none").strip().lower() == "textbee":
        return _send_textbee_sms(phone_number, message)
    _LOG.warning("Registration SMS is not configured")
    return SmsSendResult(False)


def send_report_receipt_sms(phone_number: str, message: str) -> SmsSendResult:
    """Use TextBee for submitted-report receipts without enabling unrelated SMS."""
    if os.getenv("REPORT_RECEIPT_SMS_PROVIDER", "none").strip().lower() == "textbee":
        return _send_textbee_sms(phone_number, message)
    _LOG.warning("Report receipt SMS is not configured")
    return SmsSendResult(False)


def send_emergency_sms(phone_number: str, title: str, message: str) -> SmsSendResult:
    """Alert staff without disclosing case details in the SMS body."""
    sms_text = "Urgent PULSO engineering alert. Open your staff workspace for details."
    if _provider() == "textbee":
        return _send_textbee_sms(phone_number, sms_text)
    if _provider() == "philsms":
        return _send_philsms_sms(phone_number, sms_text)
    if _provider() == "iprogsms":
        return _send_iprogsms_sms(phone_number, sms_text)
    if _provider() == "semaphore":
        return _send_semaphore_sms("priority", phone_number, sms_text)
    return SmsSendResult(False)


def _portal_domain() -> str:
    raw = os.getenv("PULSO_PUBLIC_URL", "pulso-caloocan.gov.ph").strip()
    raw = re.sub(r"^https?://", "", raw).rstrip("/")
    return raw or "pulso-caloocan.gov.ph"


def _sanitize_gsm7(text: str) -> str:
    """Keep SMS strictly within 7-bit GSM-7 ASCII so 160-char single-segment delivery never degrades to 70-char UCS-2."""
    replacements = {
        "—": "-",
        "–": "-",
        "•": "-",
        "“": '"',
        "”": '"',
        "‘": "'",
        "’": "'",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return text


def send_login_otp_sms(phone_number: str, otp_code: str, ref_id: str | None = None) -> SmsSendResult:
    """Send a caller-generated code using the configured SMS provider."""
    ref_suffix = f" Ref: {ref_id}." if ref_id else ""
    if _provider() == "textbee":
        message = _sanitize_gsm7(
            f"[PULSO Caloocan Engineering]\n"
            f"PULSO Caloocan: Your sign-in code is {otp_code}. "
            f"Valid for 10 minutes. Do not share it.{ref_suffix}"
        )
        return _send_textbee_sms(phone_number, message)
    if _provider() == "philsms":
        message = f"PULSO Caloocan: Your sign-in code is {otp_code}. Valid for 10 minutes. Do not share it.{ref_suffix}"
        return _send_philsms_sms(phone_number, message)
    if _provider() == "iprogsms":
        message = f"PULSO Caloocan: Your sign-in code is {otp_code}. Valid for 10 minutes. Do not share it.{ref_suffix}"
        return _send_iprogsms_sms(phone_number, message)
    if _provider() != "semaphore":
        return SmsSendResult(False)
    message = f"PULSO Caloocan: Your sign-in code is {{otp}}. Valid for 10 minutes. Do not share it.{ref_suffix}"
    return _send_semaphore_sms("otp", phone_number, message, code=otp_code)


def send_templated_sms(
    phone_number: str,
    template_name: str = "report_received",
    *,
    ticket_id: str = "CE-2026-0001",
    barangay: str = "175",
    category: str = "Roads & Bridges",
    status: str = "Validated",
    eta_days: str = "2 to 5 working days",
    wo_number: str = "WO-2026-0104",
    asset_id: str = "CAL-DR-002",
    asset_name: str = "Camarin Drainage Line",
    priority: str = "HIGH",
) -> SmsSendResult:
    """
    Send a warm, official PULSO Caloocan civic update or public works announcement SMS.
    Sanitizes punctuation to GSM-7 ASCII so multi-part messages deliver cleanly across PH carriers.
    """
    domain = _portal_domain()

    if template_name == "report_status_update":
        msg = (
            f"PULSO Caloocan Advisory: Good day! Report {ticket_id} (Brgy {barangay}, {category}) "
            f"is now {status.upper()} to our field crew (Est: {eta_days}). Hotline: 8288-8811"
        )
    elif template_name == "city_announcement":
        msg = (
            f"PULSO Caloocan Notice: Good day! Scheduled {category} works are underway in "
            f"Brgy {barangay} ({asset_name}, Est: {eta_days}). Hotline: 8288-8811"
        )
    elif template_name == "predictive_work_order":
        msg = (
            f"PULSO Engineering Dispatch: Preemptive WO {wo_number} opened for {asset_name} "
            f"(Brgy {barangay}, {priority.upper()} Priority, Est: {eta_days})."
        )
    else:
        msg = (
            f"PULSO Caloocan: Good day! Your report {ticket_id} in Brgy. {barangay} ({category}) "
            f"has been received and queued for engineering review (Est: {eta_days})."
        )
    return send_plain_sms(phone_number, _sanitize_gsm7(msg))
