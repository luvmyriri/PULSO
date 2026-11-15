"""Validated operational settings; read paths never seed configuration."""
from datetime import datetime,timedelta,timezone
from fastapi import HTTPException
from pydantic import BaseModel,ConfigDict,Field,StrictBool,ValidationError,model_validator
import models
import staff_accounts
from government_access import jurisdiction_ids

CATALOG = {
    'report_review_routing':dict(title='Automatic report review assignment',category='operations',description='Queue incoming reports to eligible staff in the recorded district.',editable=True),
    'sla_response_time':dict(title='Initial report review targets',category='operations',description='Planning targets measured from report submission; they do not authorize emergency dispatch.',editable=True),
    'ai_report_category_suggestion':dict(title='Report suggestions',category='ai',description='Suggest a category and optional urgency for staff to review.',editable=True),
    'maintenance_review_support':dict(title='Maintenance review support',category='ai',description='Uses recorded asset condition, linked reports and maintenance history.',editable=False),
    'ai_flood_drainage_risk':dict(title='Weather and drainage feeds',category='ai',description='No weather-feed or drainage-sensor integration is connected to this workspace.',editable=False),
    'record_storage_duration':dict(title='Document retention',category='records',description='Retention and legal holds belong to individual document records.',editable=False),
    'activity_log_security':dict(title='Activity history',category='records',description='Changes are recorded. Historical cryptographic verification is not configured.',editable=False),
}
DEFAULTS = {'report_review_routing':{'enabled':True},'ai_report_category_suggestion':{'enabled':True,'suggest_urgency':True}}


class RoutingValue(BaseModel):
    model_config=ConfigDict(extra='forbid')
    enabled: StrictBool


class AIValue(RoutingValue):
    suggest_urgency: StrictBool


class TargetValue(BaseModel):
    model_config=ConfigDict(extra='forbid')
    urgent_hours: int = Field(strict=True,ge=1,le=8760)
    standard_hours: int = Field(strict=True,ge=1,le=8760)

    @model_validator(mode='after')
    def priority_order(self):
        if self.urgent_hours>self.standard_hours: raise ValueError('The P4–P5 review target cannot exceed the standard review target.')
        return self

SCHEMAS={'report_review_routing':RoutingValue,'ai_report_category_suggestion':AIValue,'sla_response_time':TargetValue}


def read_config(db,key):
    row=db.query(models.SystemSetting).filter_by(key=key).first()
    if not row: return DEFAULTS.get(key)
    if key=='sla_response_time' and (not isinstance(row.value,dict) or row.value.get('_configuration_schema')!='pulso-operational-v1' or not row.updated_by_id or not row.policy_source): return None
    fields=SCHEMAS[key].model_fields
    raw=row.value if isinstance(row.value,dict) else {}
    try: return SCHEMAS[key].model_validate({name:raw[name] for name in fields if name in raw}).model_dump()
    except ValidationError:
        if key=='ai_report_category_suggestion':
            return {'enabled':False,'suggest_urgency':False}
        return {'enabled':False} if key=='report_review_routing' else None


def display(key,value):
    if not isinstance(value,dict): return 'Not configured'
    if key=='report_review_routing': return 'Automatic assignment on' if value.get('enabled') else 'Manual assignment'
    if key=='ai_report_category_suggestion':
        return ('Category and urgency suggestions' if value.get('suggest_urgency') else 'Category suggestions only') if value.get('enabled') else 'Off · staff review'
    if key=='sla_response_time':
        if type(value.get('urgent_hours')) is int and type(value.get('standard_hours')) is int:
            return f"P4–P5: {value['urgent_hours']} hours · Other reports: {value['standard_hours']} hours"
    return 'Historical configuration'


def projection(db,key,row,user):
    spec=CATALOG.get(key,dict(title=key,description='Historical setting with no supported control in this workspace.',category='legacy',editable=False))
    value=read_config(db,key) if key in SCHEMAS else row.value if row else None
    status='configured' if row else 'application_default' if key in DEFAULTS else 'unconfigured'
    valid=True
    if row and key in SCHEMAS:
        try: SCHEMAS[key].model_validate({name:row.value[name] for name in SCHEMAS[key].model_fields if isinstance(row.value,dict) and name in row.value})
        except ValidationError: valid=False;status='needs_review'
    if row and key=='sla_response_time' and value is None: valid=False;status='needs_review'
    if not spec['editable']: status='informational' if key in CATALOG else 'legacy'
    operational=None
    if key=='ai_report_category_suggestion':
        import gemini_service
        operational='disabled' if not value.get('enabled') else 'deployment_disabled' if gemini_service.AI_DISABLED else 'configured' if gemini_service._SDK_READY else 'not_configured'
    if key=='maintenance_review_support': operational='engineering_review_required'
    if key=='ai_flood_drainage_risk': operational='not_connected'
    if key=='activity_log_security': operational='historical_integrity_not_verified'
    related_url=related_label=None
    if key=='record_storage_duration':
        from records_workspace import record_permissions
        try:
            record_permissions(db,user)
            related_url='/gov/records-workspace?view=registry';related_label='Open document registry'
        except HTTPException: pass
    elif key=='activity_log_security' and staff_accounts.allowed(user,'audit_view'):
        related_url='/gov/administration?view=audit&tab=audit';related_label='Open activity log'
    elif key=='maintenance_review_support':
        from government_access import can
        from gov_router import GOV_ROLES
        if can(user,'maintenance') and user.role in GOV_ROLES:
            related_url='/gov/insights?view=predictive';related_label='Open predictive maintenance'
    return dict(key=key,**spec,value=value if spec['editable'] else None,
        display_value=display(key,value) if spec['editable'] else {'maintenance_review_support':'Available for engineering review','ai_flood_drainage_risk':'Not connected','record_storage_duration':'Managed per document','activity_log_security':'History recorded'}.get(key,'Historical configuration'),
        related_url=related_url,related_label=related_label,status=status,operational_status=operational,valid=valid,version=(row.version or 0) if row else 0,
        can_edit=spec['editable'] and staff_accounts.allowed(user,'settings_manage') and not jurisdiction_ids(user),
        source_reference=row.policy_source if row and row.updated_by_id else None,
        reference_status='recorded_unverified' if row and row.policy_source and row.updated_by_id else 'not_recorded',
        updated_by=row.updated_by.full_name if row and row.updated_by else None,updated_at=row.updated_at if row else None,
        configured=bool(row))


def workspace(db,user):
    rows={row.key:row for row in db.query(models.SystemSetting).all()}
    keys=list(CATALOG)+[key for key in rows if key not in CATALOG]
    return dict(settings=[projection(db,key,rows.get(key),user) for key in keys],can_manage=staff_accounts.allowed(user,'settings_manage') and not jurisdiction_ids(user))


def save(db,user,key,payload):
    staff_accounts.require_action(user,'settings_manage')
    if jurisdiction_ids(user): raise HTTPException(403,'Global settings require citywide administrative scope.')
    if key not in SCHEMAS:
        raise HTTPException(409,'This entry is informational. Use its linked records or operational tool.')
    try: value=SCHEMAS[key].model_validate(payload.value).model_dump()
    except ValidationError as error: raise HTTPException(422,'; '.join(item['msg'] for item in error.errors()))
    reason=payload.reason.strip()
    if len(reason)<10: raise HTTPException(422,'Provide a reason of at least 10 characters.')
    reference=(payload.source_reference or '').strip() or None
    if key=='sla_response_time' and (not reference or len(reference)<3):
        raise HTTPException(422,'Record the reference authorizing these review planning targets.')
    staff_accounts.lock_accounts(db,user)
    staff_accounts.require_action(user,'settings_manage')
    row=db.query(models.SystemSetting).filter_by(key=key).with_for_update().first()
    version=(row.version or 0) if row else 0
    if payload.expected_version!=version:
        raise HTTPException(409,'This setting changed. Refresh it before saving.')
    value={**value,'_configuration_schema':'pulso-operational-v1'}
    old=row.value if row else None
    old_reference=row.policy_source if row else None
    if row and value==old and reference==old_reference:
        return projection(db,key,row,user)
    if not row:
        spec=CATALOG[key]
        row=models.SystemSetting(key=key,title=spec['title'],description=spec['description'],category=spec['category'],value=value,version=1,updated_by_id=user.id,policy_source=reference)
        db.add(row);db.flush()
    else:
        row.value=value;row.version=version+1;row.updated_by_id=user.id;row.policy_source=reference
    db.add(models.SystemSettingHistory(setting_id=row.id,version=version,old_value=old,new_value=value,reason=reason,changed_by_id=user.id))
    staff_accounts.audit(db,user,'Operational setting changed',dict(key=key,from_version=version,to_version=row.version,
        before=old,after=value,previous_reference=old_reference,source_reference=reference,reason=reason))
    db.commit();db.refresh(row)
    return projection(db,key,row,user)


def history(db,key,page):
    row=db.query(models.SystemSetting).filter_by(key=key).first()
    if not row: return dict(items=[],total=0)
    query=db.query(models.SystemSettingHistory).filter_by(setting_id=row.id)
    total=query.count()
    events=query.order_by(models.SystemSettingHistory.id.desc()).offset((page-1)*15).limit(15).all()
    return dict(total=total,items=[dict(id=e.id,from_version=e.version,to_version=e.version+1,old_display=display(key,e.old_value),new_display=display(key,e.new_value),
        reason=e.reason,actor=e.changed_by.full_name if e.changed_by else None,created_at=e.created_at) for e in events])


def review_target(value,report,now):
    if not value or not report.created_at or report.status not in {'pending','received','unverified','unvalidated','under_review'}: return None
    hours=value['urgent_hours'] if report.priority_grade in ('P4','P5') else value['standard_hours']
    submitted=report.created_at if report.created_at.tzinfo else report.created_at.replace(tzinfo=timezone.utc)
    due=submitted+timedelta(hours=hours)
    return dict(due_at=due,hours=hours,overdue=now>due,measured_from='submission')


def report_analysis(db,description,image_data=None,selected_categories=None):
    import gemini_service
    from report_screening import normalize_analysis
    value=read_config(db,'ai_report_category_suggestion')
    state='disabled' if not value['enabled'] else 'unavailable' if gemini_service.AI_DISABLED or not gemini_service._SDK_READY else None
    try:
        result=gemini_service.analyze_report(description,image_data=image_data,selected_categories=selected_categories) if state is None else {}
    except Exception:
        result={};state='unavailable'
    if not isinstance(result,dict): result={};state='unavailable'
    if result.get('analysis_status')=='manual_review': state='unavailable'
    if state:
        return normalize_analysis({},has_image=bool(image_data),provider_state=state,selected_categories=selected_categories or ())
    result=normalize_analysis(result,has_image=bool(image_data),provider_state='suggested',selected_categories=selected_categories or ())
    if not value['suggest_urgency']: result['urgency']=None;result['severity_score']=None
    return result
