"""Report creation receipts use a durable, channel-specific outbox."""
from types import SimpleNamespace
from unittest.mock import patch

import gov_models as gm
import models
import report_receipts as receipts
import schemas
import sms_utils
from outbox_worker import deliver_pending
from tests.test_government_workspace import context


def test_receipt_intents_are_private_and_only_for_registered_residents(monkeypatch):
    monkeypatch.setenv('REPORT_CREATION_RECEIPTS_ENABLED', 'true')
    resident = SimpleNamespace(id=23, email='resident@test.invalid', phone_number='09171234567',
                               is_active=True, is_suspended=False)
    report = SimpleNamespace(id=91, resident_id=23)
    class DB:
        def __init__(self): self.events=[]
        def get(self, model, id): return resident if model is models.Resident and id == 23 else None
        def add(self, value): self.events.append(value)
    db=DB()
    receipts.queue_intents(db, report)
    assert {event.event_type for event in db.events} == receipts.EVENTS
    assert all(event.payload == {'resident_id': 23, 'report_id': 91} for event in db.events)
    assert all('resident@test.invalid' not in str(event.payload) for event in db.events)
    receipts.queue_intents(db, SimpleNamespace(id=92, resident_id=None))
    assert len(db.events) == 2


def test_receipt_copy_contains_safe_summary_without_evidence_or_token(monkeypatch):
    monkeypatch.setenv('REPORT_RECEIPT_SMS_PROVIDER','textbee')
    report=SimpleNamespace(ticket_id='PUL-2026-0042', category='Roads\nPrivate location',
                           created_at=None, description='SECRET_DESCRIPTION', location_string='SECRET_LOCATION',
                           tracking_token='SECRET_TOKEN')
    with patch('sms_utils._send_textbee_sms', return_value=sms_utils.SmsSendResult(True,'batch','queued')) as gateway:
        assert receipts.send_sms('09171234567', report).accepted
    text=gateway.call_args.args[1]
    assert 'PUL-2026-0042' in text and 'Roads Private location' in text
    assert all(secret not in text for secret in ('SECRET_DESCRIPTION','SECRET_LOCATION','SECRET_TOKEN'))
    assert '\n' not in text
    monkeypatch.setenv('REPORT_RECEIPT_SMS_PROVIDER','none')
    assert not sms_utils.send_report_receipt_sms('09171234567','test').accepted


def test_receipt_smtp_copy_uses_account_link_not_tracking_secret(monkeypatch):
    monkeypatch.setenv('PULSO_PUBLIC_BASE_URL','https://pulso.test.invalid')
    monkeypatch.setenv('SMTP_USER','sender@test.invalid')
    monkeypatch.setenv('SMTP_PASS','FAKE_SECRET')
    report=SimpleNamespace(ticket_id='PUL-2026-0042',category='Roads',created_at=None,
                           description='SECRET_DESCRIPTION',location_string='SECRET_LOCATION',tracking_token='SECRET_TOKEN')
    class SMTP:
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def login(self,*args):pass
        def send_message(self,message):
            assert message['To']=='resident@test.invalid'
            for mime in ('plain', 'html'):
                text = message.get_body(preferencelist=(mime,)).get_content()
                assert 'PUL-2026-0042' in text and 'Roads' in text
                assert 'https://pulso.test.invalid/dashboard?tab=reports' in text
                assert all(secret not in text for secret in ('SECRET_DESCRIPTION','SECRET_LOCATION','SECRET_TOKEN'))
            return {}
    with patch('report_receipts.smtplib.SMTP_SSL',return_value=SMTP()):
        receipts.send_email('resident@test.invalid',report,'<fake@test.invalid>')


def test_report_creation_queues_and_delivers_each_channel_once(context,monkeypatch):
    _, sessions, _ = context
    monkeypatch.setenv('REPORT_CREATION_RECEIPTS_ENABLED','true')
    monkeypatch.setenv('REPORT_RECEIPT_SMS_PROVIDER','textbee')
    monkeypatch.setenv('TEXTBEE_ENABLE_OUTBOUND','true')
    monkeypatch.setenv('TEXTBEE_API_KEY','FAKE_KEY')
    monkeypatch.setenv('PULSO_PUBLIC_BASE_URL','https://pulso.test.invalid')
    monkeypatch.setenv('SMTP_USER','sender@test.invalid')
    monkeypatch.setenv('SMTP_PASS','FAKE_SECRET')
    import crud
    with sessions() as db:
        db.get(models.Resident,100).phone_number='09171234567'
        report=crud.create_report(db,schemas.ReportCreate(category='Roads',description='FAKE report receipt integration concern',location_barangay='FAKE Area one'),resident_id=100,queue_resident_receipt=True)
        report_id=report.id
    with sessions() as db:
        events=db.query(gm.OutboxEvent).filter(
            gm.OutboxEvent.payload['report_id'].as_integer()==report_id,
            gm.OutboxEvent.event_type.in_(receipts.EVENTS),
        ).all()
        assert {event.event_type for event in events}==receipts.EVENTS
        assert deliver_pending(db)>=2
    sent=[]
    assert receipts.deliver(sessions,email_sender=lambda address,report,message_id:sent.append(('email',address)),
        sms_sender=lambda address,report:(sent.append(('sms',address)) or sms_utils.SmsSendResult(True,'batch','queued')))==2
    assert len(sent)==2
    assert receipts.deliver(sessions,email_sender=lambda *args:None,sms_sender=lambda *args:None)==0
    with sessions() as db:
        statuses={row.status for row in db.query(gm.ResidentNotificationDelivery).all()}
        assert statuses=={'smtp_accepted','sms_accepted'}
