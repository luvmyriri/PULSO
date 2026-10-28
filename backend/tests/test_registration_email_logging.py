"""Registration email transport must not expose verification secrets in logs."""

import smtplib

import main


def test_registration_email_does_not_log_code_or_recipient(monkeypatch, capsys):
    sent = []

    class FakeSMTP:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def login(self, *args):
            pass

        def send_message(self, message):
            sent.append(message)

    monkeypatch.setenv("SMTP_USER", "sender@test.invalid")
    monkeypatch.setenv("SMTP_PASS", "fake-password")
    monkeypatch.setattr(main.smtplib, "SMTP_SSL", FakeSMTP)

    assert main.send_otp_email("resident@test.invalid", "483927") is True
    assert len(sent) == 1
    assert "483927" in str(sent[0])
    output = capsys.readouterr()
    assert "483927" not in output.out + output.err
    assert "resident@test.invalid" not in output.out + output.err


def test_smtp_error_does_not_log_provider_message(monkeypatch, capsys):
    class FakeSMTP:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def login(self, *args):
            raise smtplib.SMTPException("secret code 483927 for resident@test.invalid")

    monkeypatch.setenv("SMTP_USER", "sender@test.invalid")
    monkeypatch.setenv("SMTP_PASS", "fake-password")
    monkeypatch.setattr(main.smtplib, "SMTP_SSL", FakeSMTP)

    assert main.send_otp_email("resident@test.invalid", "483927") is False
    output = capsys.readouterr()
    assert "483927" not in output.out + output.err
    assert "resident@test.invalid" not in output.out + output.err
