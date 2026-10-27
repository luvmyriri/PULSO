"""Consent, private email transport and truthful delivery operations."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from unittest.mock import patch
import json
import pytest
import models
import gov_models as gm
import notification_delivery as nd
from outbox_worker import deliver_pending
from tests.test_government_workspace import context, draft, transition


@pytest.fixture(autouse=True)
def email_off(monkeypatch):
    monkeypatch.delenv('PULSO_EMAIL_NOTIFICATIONS',raising=False)


def enable(monkeypatch):
    monkeypatch.setenv('PULSO_EMAIL_NOTIFICATIONS','true')
    monkeypatch.setenv('PULSO_PUBLIC_BASE_URL','https://pulso.test.invalid')
    monkeypatch.setenv('SMTP_USER','sender@test.invalid')
    monkeypatch.setenv('SMTP_PASS','FAKE-email-provider-secret')


def prefs(client,tokens,**values):
    current=client.get('/api/residents/notification-preferences',headers=tokens['owner']).json()
    body={key:current[key] for key in ('enabled','report_updates','related_updates','in_app','email')}
    body.update(expected_version=current['version'],**values)
    return client.put('/api/residents/notification-preferences',json=body,headers=tokens['owner'])


def event(sessions,**values):
    payload=dict(resident_id=100,report_id=1,title='FAKE report concern',message='FAKE private location and resident details',target_url='/dashboard?tab=reports&reportId=1')
    payload.update(values)
    with sessions() as db:
        record=gm.OutboxEvent(event_key='FAKE-status:1',event_type='resident_in_app_notification',payload=payload)
        db.add(record);db.commit();record_id=record.id
    return record_id


def process(sessions):
    with sessions() as db:return deliver_pending(db)


def test_default_preferences_keep_in_app_without_email_consent(context):
    client,sessions,tokens=context
    saved=client.get('/api/residents/notification-preferences',headers=tokens['owner'])
    assert saved.status_code==200 and saved.json()['in_app'] and not saved.json()['email']
    assert saved.json()['email_service']=='not_configured'
    event(sessions)
    assert process(sessions)==1
    with sessions() as db:
        assert db.query(gm.ResidentNotificationDelivery).count()==0
        assert db.query(models.Notification).count()==1


def test_preferences_are_private_strict_and_versioned(context):
    client,sessions,tokens=context
    assert client.get('/api/residents/notification-preferences',headers=tokens['chief']).status_code==403
    assert prefs(client,tokens,email=True).status_code==200
    current=client.get('/api/residents/notification-preferences',headers=tokens['owner']).json()
    body={key:current[key] for key in ('enabled','report_updates','related_updates','in_app','email')}
    assert client.put('/api/residents/notification-preferences',json={**body,'expected_version':0},headers=tokens['owner']).status_code==409
    assert client.put('/api/residents/notification-preferences',json={**body,'expected_version':1,'email':'true'},headers=tokens['owner']).status_code==422
    with sessions() as db:
        assert not nd.preferences(db.get(models.Resident,101))['email']


@pytest.mark.parametrize('values',[{'enabled':False},{'report_updates':False},{'in_app':False}])
def test_saved_preferences_are_applied_by_in_app_worker(context,values):
    client,sessions,tokens=context
    assert prefs(client,tokens,**values).status_code==200
    event(sessions)
    assert process(sessions)==0
    with sessions() as db:
        assert db.query(models.Notification).count()==0
        assert db.query(gm.OutboxEvent).one().status=='skipped'


def test_email_only_delivery_waits_for_configuration_and_is_deduplicated(context):
    client,sessions,tokens=context
    prefs(client,tokens,email=True,in_app=False)
    event(sessions)
    assert process(sessions)==0
    assert process(sessions)==0
    with sessions() as db:
        record=db.query(gm.ResidentNotificationDelivery).one()
        assert record.status=='waiting_configuration' and len(record.recipient_hash)==64
        assert 'owner@test.invalid' not in record.recipient_hash
    sender=__import__('unittest.mock',fromlist=['Mock']).Mock()
    assert nd.deliver_email(sessions,sender=sender)==0
    sender.assert_not_called()


def test_smtp_acceptance_is_separate_from_in_app_and_mailbox_delivery(context,monkeypatch):
    client,sessions,tokens=context
    enable(monkeypatch);prefs(client,tokens,email=True);event(sessions)
    assert process(sessions)==1
    delivered=[]
    assert nd.deliver_email(sessions,sender=lambda address,payload,key:delivered.append((address,key)))==1
    assert nd.deliver_email(sessions,sender=lambda *args:pytest.fail('Duplicate email'))==0
    assert delivered[0][0]=='owner@test.invalid'
    with sessions() as db:
        record=db.query(gm.ResidentNotificationDelivery).one()
        assert record.status=='smtp_accepted' and record.accepted_at
        assert db.query(models.Notification).one().outbox_event_id==record.event_id


def test_transient_rejection_schedules_retry_and_then_succeeds(context,monkeypatch):
    client,sessions,tokens=context
    enable(monkeypatch);prefs(client,tokens,email=True);event(sessions);process(sessions)
    def failed(*args):raise nd.DeliveryError('smtp_rejected',retry=True)
    assert nd.deliver_email(sessions,sender=failed)==0
    with sessions() as db:
        record=db.query(gm.ResidentNotificationDelivery).one()
        assert record.status=='retry' and record.next_attempt_at>nd.now()
        record.next_attempt_at=nd.now()-timedelta(seconds=1);db.commit()
    assert nd.deliver_email(sessions,sender=lambda *args:None)==1


def test_unknown_or_interrupted_delivery_is_not_automatically_repeated(context,monkeypatch):
    client,sessions,tokens=context
    enable(monkeypatch);prefs(client,tokens,email=True);event(sessions);process(sessions)
    def uncertain(*args):raise nd.DeliveryError('acceptance_unknown',uncertain=True)
    assert nd.deliver_email(sessions,sender=uncertain)==0
    with sessions() as db:
        record=db.query(gm.ResidentNotificationDelivery).one()
        assert record.status=='uncertain'
        record.status='sending';record.lease_until=nd.now()-timedelta(seconds=1);db.commit()
    assert nd.deliver_email(sessions,sender=lambda *args:pytest.fail('Unsafe duplicate'))==0
    with sessions() as db:
        record=db.query(gm.ResidentNotificationDelivery).one()
        assert record.status=='uncertain' and record.error_code=='worker_interrupted'


@pytest.mark.parametrize('change',['opt_out','owner_changed','address_changed','account_restricted'])
def test_email_revalidates_current_recipient_and_preferences(context,monkeypatch,change):
    client,sessions,tokens=context
    enable(monkeypatch);prefs(client,tokens,email=True);event(sessions);process(sessions)
    with sessions() as db:
        resident=db.get(models.Resident,100)
        if change=='opt_out':resident.preferences={**resident.preferences,'notifications_enabled':False}
        elif change=='address_changed':resident.email='changed@test.invalid'
        elif change=='account_restricted':resident.is_active=False
        else:db.get(models.Report,1).claimed_by_user_id=101
        db.commit()
    assert nd.deliver_email(sessions,sender=lambda *args:pytest.fail('Ineligible recipient'))==0
    with sessions() as db:assert db.query(gm.ResidentNotificationDelivery).one().status=='cancelled'


def test_related_update_rechecks_review_and_publication_before_email(context,monkeypatch):
    client,sessions,tokens=context
    enable(monkeypatch);prefs(client,tokens,email=True)
    item=draft(client,tokens,report_associations_input=[dict(report_id=1,association_type='contextual_relevance',basis_reason='FAKE reviewed area relationship')])
    for state in ('in_review','approved','published'):item=transition(client,tokens,item,state)
    process(sessions)
    with sessions() as db:
        assert db.query(gm.ResidentNotificationDelivery).count()==1
        announcement=db.get(gm.Announcement,item['id']);announcement.status='withdrawn';db.commit()
    assert nd.deliver_email(sessions,sender=lambda *args:pytest.fail('Withdrawn publication'))==0
    with sessions() as db:assert db.query(gm.ResidentNotificationDelivery).one().status=='cancelled'


def test_delivery_operations_are_scoped_masked_and_retries_are_recorded(context,monkeypatch):
    client,sessions,tokens=context
    enable(monkeypatch);prefs(client,tokens,email=True);event(sessions);process(sessions)
    def failed(*args):raise nd.DeliveryError('authentication_failed')
    nd.deliver_email(sessions,sender=failed)
    assert client.get('/api/gov/notification-deliveries',headers=tokens['field']).status_code==403
    listed=client.get('/api/gov/notification-deliveries',headers=tokens['chief'])
    assert listed.status_code==200,listed.text
    assert 'owner@test.invalid' not in listed.text and 'private location' not in listed.text
    record=listed.json()['items'][0]
    body=dict(expected_attempts=record['attempts'],reason='FAKE transport issue corrected')
    retry=client.post(f'/api/gov/notification-deliveries/{record["id"]}/retry',json=body,headers=tokens['chief'])
    assert retry.status_code==200,retry.text
    assert client.post(f'/api/gov/notification-deliveries/{record["id"]}/retry',json=body,headers=tokens['chief']).status_code==409
    with sessions() as db:
        assert db.query(gm.AuditLog).filter_by(action='Notification email retry queued').count()==1
        db.get(models.Official,1).primary_jurisdiction=[2];db.commit()
    assert client.get('/api/gov/notification-deliveries',headers=tokens['chief']).json()['total']==0


def test_concurrent_workers_claim_one_email(context,monkeypatch):
    client,sessions,tokens=context
    enable(monkeypatch);prefs(client,tokens,email=True);event(sessions);process(sessions)
    calls=[]
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sum(pool.map(lambda _:nd.deliver_email(sessions,sender=lambda *args:calls.append(args)),range(2)))==1
    assert len(calls)==1


def test_transport_uses_private_link_and_stable_message_id(context,monkeypatch):
    enable(monkeypatch)
    sent=[]
    class FakeSMTP:
        def __init__(self,*args,**kwargs):assert kwargs['timeout']==15
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def login(self,*args):pass
        def send_message(self,message):sent.append(message);return {}
    monkeypatch.setattr(nd.smtplib,'SMTP_SSL',FakeSMTP)
    nd.send_email('owner@test.invalid',dict(target_url='/updates/1',message='FAKE SECRET LOCATION',title='FAKE NAME'),'<fake-stable-id@test.invalid>')
    message=sent[0]
    assert 'https://pulso.test.invalid/updates/1' in message.get_content()
    assert 'FAKE SECRET LOCATION' not in str(message) and 'FAKE NAME' not in str(message)
    assert message['Message-ID']=='<fake-stable-id@test.invalid>'


def test_email_configuration_requires_explicit_enable_and_https_origin(context,monkeypatch):
    enable(monkeypatch)
    assert nd.config()['ready']
    for origin in ['http://pulso.test.invalid','https://user:secret@pulso.test.invalid','https://pulso.test.invalid/path','//pulso.test.invalid','https://[malformed','https://pulso.test.invalid:bad','https://bad domain.invalid']:
        monkeypatch.setenv('PULSO_PUBLIC_BASE_URL',origin)
        assert not nd.config()['ready']


def test_delivery_operations_respect_explicit_report_denial(context,monkeypatch):
    client,sessions,tokens=context
    enable(monkeypatch);prefs(client,tokens,email=True);event(sessions);process(sessions)
    with sessions() as db:
        role=models.SystemRole(name='FAKE transport only',capabilities={'reports':[],'announcements':[],'admin':['settings_view']})
        db.add(role);db.flush();db.get(models.Official,1).role_id=role.id;db.commit()
    response=client.get('/api/gov/notification-deliveries',headers=tokens['chief'])
    assert response.status_code==200 and response.json()['total']==0


def test_legacy_profile_preferences_cannot_override_notification_consent(context):
    client,sessions,tokens=context
    assert prefs(client,tokens,email=True).status_code==200
    blocked=client.patch('/api/users/100',json={'preferences':{'notification_channels':{'in_app':True,'email':False}}},headers=tokens['owner'])
    assert blocked.status_code==409,blocked.text
    language=client.patch('/api/users/100',json={'preferences':{'language':'tl'}},headers=tokens['owner'])
    assert language.status_code==200,language.text
    with sessions() as db:
        resident=db.get(models.Resident,100)
        assert nd.preferences(resident)['email'] and resident.preferences['language']=='tl'
