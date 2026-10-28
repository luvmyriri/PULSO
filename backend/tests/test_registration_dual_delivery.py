"""One registration secret can be requested over both contact channels."""
from types import SimpleNamespace
from unittest.mock import patch

import main
import resident_accounts
import sms_utils


def test_same_registration_code_is_given_to_email_and_textbee():
    resident = SimpleNamespace(full_name='FAKE Resident', email='fake@test.invalid', phone_number='09171234567')
    with patch('main.send_otp_email', return_value=True) as email, patch(
        'main.sms_utils.send_registration_sms', return_value=sms_utils.SmsSendResult(True, 'batch', 'queued')
    ) as sms:
        channels = main.send_resident_confirmation(resident, '456789')
    assert channels == {'email': True, 'sms': True}
    assert email.call_args.args[1] == '456789'
    assert '456789' in sms.call_args.args[1]


def test_sms_only_acceptance_still_leaves_code_redeemable():
    resident = SimpleNamespace(
        id=27, email='fake@test.invalid', phone_number='09171234567',
        is_verified=False, is_active=True, email_code_sent_at=None,
        administration_version=0,
    )

    class Query:
        def filter_by(self, **kwargs): return self
        def populate_existing(self): return self
        def with_for_update(self): return self
        def one(self): return resident

    class DB:
        def query(self, model): return Query()
        def commit(self): pass

    received = []
    def sms_only(email, code, kind):
        received.append(code)
        return {'email': False, 'sms': True}

    db = DB()
    result = resident_accounts.send_confirmation(db, resident, sms_only)
    assert result['delivery_status'] == 'sms_accepted'
    assert result['confirmation_channels'] == ['sms']
    assert resident.verification_code.startswith('hmac:')
    with patch('resident_contacts.ensure_available'), patch('resident_contacts.normalize_resident'):
        assert resident_accounts.accept_code(db, resident, received[0])['status'] == 'success'
    assert resident.is_verified is True


def test_registration_textbee_does_not_enable_general_sms(monkeypatch):
    monkeypatch.setenv('SMS_PROVIDER', 'none')
    monkeypatch.setenv('REGISTRATION_SMS_PROVIDER', 'textbee')
    with patch('sms_utils._send_textbee_sms', return_value=sms_utils.SmsSendResult(True, 'batch', 'queued')) as textbee:
        assert sms_utils.send_registration_sms('09171234567', 'test').accepted
        assert textbee.call_count == 1
    assert not sms_utils.send_plain_sms('09171234567', 'test').accepted
