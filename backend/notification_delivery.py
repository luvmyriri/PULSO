"""Opt-in email for private resident updates. SMTP acceptance is not mailbox delivery."""
import hashlib
import hmac
import os
import smtplib
import ssl
from datetime import datetime,timedelta,timezone
from email.message import EmailMessage
from urllib.parse import urlsplit
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,ConfigDict,StrictBool,Field
from sqlalchemy import or_,false
from sqlalchemy.orm import Session
import auth
import models
import gov_models as gm
from database import get_db,SessionLocal

router=APIRouter(prefix='/api/residents/notification-preferences',tags=['Resident notifications'])
ops_router=APIRouter(prefix='/api/gov/notification-deliveries',tags=['Notification delivery operations'])
SUPPORTED={'resident_in_app_notification','publication_in_app_notification','publication_related_report_notification'}


def now(): return datetime.now(timezone.utc)


def email_hash(address):
    return hmac.new(auth.SECRET_KEY.encode(),str(address or '').strip().lower().encode(),hashlib.sha256).hexdigest()


def config():
    enabled=os.getenv('PULSO_EMAIL_NOTIFICATIONS','').lower()=='true'
    origin=os.getenv('PULSO_PUBLIC_BASE_URL','').strip().rstrip('/')
    try:
        parts=urlsplit(origin)
        port=parts.port
        origin_valid=parts.scheme=='https' and bool(parts.hostname) and not any(character.isspace() for character in parts.netloc) and not parts.username and not parts.password and parts.path in {'','/'} and not parts.query and not parts.fragment and (port is None or 1<=port<=65535)
    except ValueError:
        origin_valid=False
    return dict(enabled=enabled,ready=bool(enabled and origin_valid and os.getenv('SMTP_USER') and os.getenv('SMTP_PASS')),origin=origin if origin_valid else None,
        status='configured' if enabled and origin_valid and os.getenv('SMTP_USER') and os.getenv('SMTP_PASS') else 'not_configured')


def preferences(resident):
    saved=resident.preferences if isinstance(resident.preferences,dict) else {}
    categories=saved.get('notification_categories') if isinstance(saved.get('notification_categories'),dict) else {}
    channels=saved.get('notification_channels') if isinstance(saved.get('notification_channels'),dict) else {}
    return dict(enabled=saved.get('notifications_enabled',True) is True,report_updates=categories.get('reportStatus',True) is True,
        related_updates=categories.get('advisories',True) is True,in_app=channels.get('in_app',True) is True,email=channels.get('email',False) is True)


def category_allowed(resident,event):
    prefs=preferences(resident)
    return prefs['enabled'] and prefs['related_updates' if event.event_type.startswith('publication_') else 'report_updates']


def event_valid(db,event):
    if event.event_type not in SUPPORTED:return False
    payload=event.payload
    if event.event_type.startswith('publication_'):
        from outbox_worker import _publication_is_current
        return _publication_is_current(db,payload)
    resident=db.get(models.Resident,payload.get('resident_id'))
    report=db.get(models.Report,payload.get('report_id'))
    return bool(resident and resident.is_active and not resident.is_suspended and report and (report.claimed_by_user_id or report.resident_id)==resident.id)


def queue_email(db,event,resident):
    if not category_allowed(resident,event) or not preferences(resident)['email'] or not resident.email:return
    if db.query(gm.ResidentNotificationDelivery.id).filter_by(event_id=event.id).first():return
    db.add(gm.ResidentNotificationDelivery(event_id=event.id,resident_id=resident.id,recipient_hash=email_hash(resident.email),
        status='pending' if config()['ready'] else 'waiting_configuration',next_attempt_at=now()))


class DeliveryError(Exception):
    def __init__(self,code,retry=False,uncertain=False):
        self.code=code;self.retry=retry;self.uncertain=uncertain


def send_email(address,payload,message_id):
    settings=config()
    if not settings['ready']:raise DeliveryError('not_configured')
    target=payload.get('target_url','')
    if not (target.startswith('/dashboard?') or target.startswith('/updates/')) or '\\' in target or '\r' in target or '\n' in target:
        raise DeliveryError('invalid_target')
    message=EmailMessage()
    message['Subject']='PULSO: an update is available / May bagong update'
    message['From']=os.getenv('SMTP_USER')
    message['To']=address
    message['Message-ID']=message_id
    # No report description, resident name, location, internal note or attachment leaves the system.
    message.set_content('An update connected to your PULSO report is available. Open PULSO to view it.\n'
        'May bagong update na kaugnay ng iyong ulat. Buksan ang PULSO para makita ito.\n\n'
        +settings['origin']+target+'\n\nManage notifications in Account > Notifications. / Pamahalaan sa Account > Notifications.')
    data_started=False
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com',465,timeout=15,context=ssl.create_default_context()) as server:
            server.login(os.environ['SMTP_USER'],os.environ['SMTP_PASS'].replace(' ',''))
            data_started=True
            refused=server.send_message(message)
            if refused:raise DeliveryError('recipient_refused')
    except DeliveryError:raise
    except smtplib.SMTPAuthenticationError:raise DeliveryError('authentication_failed')
    except smtplib.SMTPRecipientsRefused as error:raise DeliveryError('recipient_refused',retry=all(value[0]<500 for value in error.recipients.values()))
    except smtplib.SMTPResponseException as error:raise DeliveryError('smtp_rejected',retry=error.smtp_code<500)
    except (TimeoutError,OSError,smtplib.SMTPServerDisconnected):
        raise DeliveryError('acceptance_unknown' if data_started else 'connection_failed',retry=not data_started,uncertain=data_started)
    except smtplib.SMTPException:raise DeliveryError('smtp_failed',retry=not data_started,uncertain=data_started)


def deliver_email(sessions=SessionLocal,limit=25,sender=send_email):
    accepted=0
    # Claim and commit before calling SMTP. Expired claims become uncertain, never silently resent.
    with sessions() as db:
        db.query(gm.ResidentNotificationDelivery).filter(gm.ResidentNotificationDelivery.status=='sending',gm.ResidentNotificationDelivery.lease_until<now()).update({'status':'uncertain','error_code':'worker_interrupted'},synchronize_session=False)
        db.commit()
    for _ in range(limit):
        with sessions() as db:
            query=db.query(gm.ResidentNotificationDelivery).filter(gm.ResidentNotificationDelivery.status.in_(['pending','retry','waiting_configuration']),
                or_(gm.ResidentNotificationDelivery.next_attempt_at.is_(None),gm.ResidentNotificationDelivery.next_attempt_at<=now()))
            item=query.order_by(gm.ResidentNotificationDelivery.id).with_for_update(skip_locked=True).first()
            if not item:break
            event=db.get(gm.OutboxEvent,item.event_id);resident=db.get(models.Resident,item.resident_id)
            if not event or not resident or not event_valid(db,event) or not category_allowed(resident,event) or not preferences(resident)['email'] or email_hash(resident.email)!=item.recipient_hash:
                item.status='cancelled';item.error_code='eligibility_changed';db.commit();continue
            if not config()['ready']:
                item.status='waiting_configuration';item.next_attempt_at=now()+timedelta(minutes=5);db.commit();continue
            item.status='sending';item.attempts+=1;item.lease_until=now()+timedelta(minutes=2)
            item_id=item.id;address=resident.email;payload=dict(event.payload);attempt=item.attempts
            message_id=f'<pulso-update-{item.id}@{urlsplit(config()["origin"]).hostname}>'
            db.commit()
        outcome='smtp_accepted';code=None;next_attempt=None
        try:sender(address,payload,message_id)
        except DeliveryError as error:
            code=error.code
            outcome='uncertain' if error.uncertain else 'retry' if error.retry and attempt<5 else 'failed'
            if outcome=='retry':next_attempt=now()+timedelta(minutes=min(60,2**attempt))
        except Exception:
            outcome='uncertain';code='unexpected_transport_result'
        with sessions() as db:
            item=db.query(gm.ResidentNotificationDelivery).filter_by(id=item_id,status='sending').with_for_update().first()
            if item:
                item.status=outcome;item.error_code=code;item.next_attempt_at=next_attempt;item.lease_until=None
                if outcome=='smtp_accepted':item.accepted_at=now();accepted+=1
                db.commit()
    return accepted


def projection(resident):
    return dict(**preferences(resident),version=resident.notification_preferences_version,email_service=config()['status'],phone_push='not_configured')


class PreferenceUpdate(BaseModel):
    model_config=ConfigDict(extra='forbid')
    expected_version:int=Field(ge=0)
    enabled:StrictBool
    report_updates:StrictBool
    related_updates:StrictBool
    in_app:StrictBool
    email:StrictBool


@router.get('')
def get_preferences(db:Session=Depends(get_db),user=Depends(auth.get_current_user)):
    if not isinstance(user,models.Resident):raise HTTPException(403,'Resident account required.')
    return projection(user)


@router.put('')
def update_preferences(payload:PreferenceUpdate,db:Session=Depends(get_db),user=Depends(auth.get_current_user)):
    if not isinstance(user,models.Resident):raise HTTPException(403,'Resident account required.')
    resident=db.query(models.Resident).filter_by(id=user.id).populate_existing().with_for_update().one()
    if resident.notification_preferences_version!=payload.expected_version:raise HTTPException(409,'Your notification preferences changed. Reload and review them before saving.')
    current=dict(resident.preferences) if isinstance(resident.preferences,dict) else {}
    current['notifications_enabled']=payload.enabled
    categories=current.get('notification_categories') if isinstance(current.get('notification_categories'),dict) else {}
    current['notification_categories']={**categories,'reportStatus':payload.report_updates,'advisories':payload.related_updates}
    current['notification_channels']={'in_app':payload.in_app,'email':payload.email}
    resident.preferences=current;resident.notification_preferences_version+=1
    db.commit()
    return projection(resident)


def operational_access(user,manage=False):
    import staff_accounts
    from government_access import can
    if not isinstance(user,models.Official):return False
    return staff_accounts.allowed(user,'settings_manage' if manage else 'settings_view') or can(user,'coordination') or can(user,'announcements','publish' if manage else 'review')


def scoped_deliveries(db,user):
    from government_access import scoped,scoped_reports,can
    announcements=scoped(db.query(gm.Announcement.id),gm.Announcement.district_id,user)
    reports=scoped_reports(db.query(models.Report.id),user)
    criteria=[]
    if can(user,'announcements'):criteria.append(gm.OutboxEvent.payload['announcement_id'].as_integer().in_(announcements))
    if can(user,'reports'):criteria.append(gm.OutboxEvent.payload['report_id'].as_integer().in_(reports))
    return db.query(gm.ResidentNotificationDelivery).join(gm.OutboxEvent,gm.OutboxEvent.id==gm.ResidentNotificationDelivery.event_id).filter(or_(*criteria) if criteria else false())


@ops_router.get('')
def operations(page:int=1,status:str='all',db:Session=Depends(get_db),user=Depends(auth.get_current_user)):
    if not operational_access(user):raise HTTPException(403,'Notification delivery operations access required.')
    if page<1:raise HTTPException(422,'Choose a positive page number.')
    query=scoped_deliveries(db,user)
    if status!='all':
        if status not in {'pending','retry','waiting_configuration','sending','smtp_accepted','failed','uncertain','cancelled'}:raise HTTPException(422,'Choose a delivery state.')
        query=query.filter(gm.ResidentNotificationDelivery.status==status)
    total=query.count();items=[]
    for delivery in query.order_by(gm.ResidentNotificationDelivery.id.desc()).offset((page-1)*15).limit(15):
        event=db.get(gm.OutboxEvent,delivery.event_id);payload=event.payload
        announcement=payload.get('announcement_id');report=payload.get('report_id')
        reference=f'Update #{announcement}' if announcement else f'Report #{report}'
        items.append(dict(id=delivery.id,reference=reference,status=delivery.status,attempts=delivery.attempts,
            next_attempt_at=delivery.next_attempt_at,accepted_at=delivery.accepted_at,error_code=delivery.error_code,
            can_retry=delivery.status=='failed' and operational_access(user,True),
            target_url=f'/gov/announcements?selected={announcement}' if announcement else f'/gov/reports?reportId={report}'))
    return dict(items=items,total=total,page=page,email_service=config()['status'],phone_push='not_configured')


class RetryDelivery(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    expected_attempts:int=Field(ge=0)
    reason:str=Field(min_length=10,max_length=2000)


@ops_router.post('/{delivery_id}/retry')
def retry_delivery(delivery_id:int,payload:RetryDelivery,db:Session=Depends(get_db),user=Depends(auth.get_current_user)):
    import staff_accounts
    if not operational_access(user,True):raise HTTPException(403,'Notification retry permission required.')
    staff_accounts.lock_accounts(db,user)
    if not operational_access(user,True):raise HTTPException(403,'Notification retry permission required.')
    item=scoped_deliveries(db,user).filter(gm.ResidentNotificationDelivery.id==delivery_id).with_for_update(of=gm.ResidentNotificationDelivery).first()
    if not item:raise HTTPException(404,'Delivery record not found in your scope.')
    if item.status!='failed' or item.attempts!=payload.expected_attempts:raise HTTPException(409,'This delivery changed or cannot be safely retried. Refresh its status.')
    if not config()['ready']:raise HTTPException(409,'Connect the email service before retrying delivery.')
    event=db.get(gm.OutboxEvent,item.event_id);resident=db.get(models.Resident,item.resident_id)
    if not event_valid(db,event) or not category_allowed(resident,event) or not preferences(resident)['email'] or email_hash(resident.email)!=item.recipient_hash:
        raise HTTPException(409,'The notice is no longer eligible for email delivery. The resident or report relationship changed.')
    item.status='pending';item.next_attempt_at=now();item.error_code=None
    staff_accounts.audit(db,user,'Notification email retry queued',dict(delivery_id=item.id,event_id=item.event_id,reason=payload.reason,previous_attempts=item.attempts))
    db.commit()
    return dict(status='pending',message='Retry queued. No delivery is confirmed yet.')
