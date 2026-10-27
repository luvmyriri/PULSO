"""Engineering project coordination, external follow-up and independent proof review.

This records operational work. It does not certify funding, process procurement,
issue an official certificate, or automatically resolve a resident report.
"""
import json
import os
import re
from datetime import datetime, timezone
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, AwareDatetime, StrictBool
from sqlalchemy import or_, null
from sqlalchemy.orm import Session
import models
import gov_models as gm
import staff_accounts
from auth import get_current_user
from database import get_db
from government_access import jurisdiction_ids, require_scope, require_report_scope, scoped

router = APIRouter(prefix='/api/gov/project-workspace',tags=['Project coordination'])
MANAGERS={'city_engineer','asst_city_engineer','division_chief','project_engineer','dispatcher','manager','admin_officer','admin_clerk','system_admin'}
INSPECTORS={'city_engineer','asst_city_engineer','division_chief','building_inspector','electrical_inspector','mechanical_inspector','manager'}
OWNERS={'city_engineer','asst_city_engineer','division_chief','project_engineer','design_engineer','engineer_ii','manager'}
CLOSED={'completed','cancelled','closed_completion_certified','resolved'}
NEXT={'intake':'assessment','assessment':'planning','planning':'ready_for_work','ready_for_work':'in_progress','in_progress':'awaiting_verification'}
STATES=set(NEXT)|{'awaiting_verification','completed','cancelled'}


def now(): return datetime.now(timezone.utc)


def allowed(user,action='view'):
    if not isinstance(user,models.Official): return False
    caps=user.role_ref.capabilities or {} if user.role_ref else {}
    if 'projects' in caps:
        grants=caps['projects']
        return isinstance(grants,list) and (action in grants or '*' in grants)
    if action=='view': return user.role in MANAGERS|INSPECTORS|OWNERS|{'records_officer','cad_operator','estimator'}
    if action=='manage': return user.role in MANAGERS
    if action in {'evidence_view','evidence_upload'}: return user.role in MANAGERS|INSPECTORS|OWNERS|{'records_officer','cad_operator','estimator'}
    if action=='inspect': return user.role in INSPECTORS
    if action=='record_certificate': return user.role in {'city_engineer','asst_city_engineer','records_officer','manager'}
    return False


def require(user,action='view'):
    if not allowed(user,action): raise HTTPException(403,'Your account does not have this project coordination permission.')


def target(db,user,project_id,lock=False):
    require(user)
    query=db.query(gm.ProjectRequest).filter_by(id=project_id)
    if lock: query=query.populate_existing().with_for_update()
    project=query.first()
    if not project: raise HTTPException(404,'Project record not found.')
    require_scope(user,project)
    return project


def person_name(db,person_id):
    person=db.get(models.Official,person_id) if person_id else None
    return person.full_name if person else None


def area_name(value):
    text=str(value or '').strip()
    match=re.fullmatch(r'(?:barangay\s*|brgy\.?\s*)?(\d+)',text,re.I)
    return str(int(match.group(1))) if match else text.casefold()


def canonical_areas(rows):
    grouped={}
    for row in rows: grouped.setdefault((row.district_id,area_name(row.name)),[]).append(row)
    result=[]
    for (_,name),aliases in grouped.items():
        preferred=min(aliases,key=lambda row:(row.id!=int(name) if name.isdigit() else False,not row.name.lower().startswith('barangay'),row.id))
        result.append(dict(id=preferred.id,name=f'Barangay {name}' if name.isdigit() else preferred.name,district_id=preferred.district_id))
    return sorted(result,key=lambda row:(0,int(area_name(row['name'])),row['district_id'] or 0) if area_name(row['name']).isdigit() else (1,row['name'].casefold(),row['district_id'] or 0))


def dependencies(db,project):
    return db.query(gm.ProjectDependency).filter_by(project_id=project.id).order_by(gm.ProjectDependency.id.desc()).all()


def accessible_source(db,user,project):
    from government_access import can
    if not project.source_report_id or not can(user,'reports'): return None
    report=db.get(models.Report,project.source_report_id)
    if report:
        try: require_report_scope(db,user,report)
        except HTTPException as error:
            if error.status_code==403: return None
            raise
    return report


def actions(db,user,project):
    result=[]
    if project.status in CLOSED:
        if project.coordination_started_at and project.status=='completed':
            if not project.certificate_reference and allowed(user,'record_certificate'): result.append('record_certificate')
            from government_access import can
            if project.source_report_id and allowed(user,'inspect') and can(user,'verification') and user.id not in {project.project_engineer_id,project.completion_submitted_by_id}:
                report=accessible_source(db,user,project)
                if report and report.status in {'in_progress','approved_internal','validated','pending_approval'}: result.append('verify_report_resolution')
        return result
    if not project.coordination_started_at:
        return ['adopt'] if allowed(user,'manage') else []
    if allowed(user,'manage'):
        result=['edit','assign','add_dependency','resolve_dependency','cancel']
        if project.status in NEXT: result.append('advance')
    if project.status=='awaiting_verification' and allowed(user,'inspect') and user.id not in {project.project_engineer_id,project.completion_submitted_by_id}:
        result+=['accept_completion','return_for_work']
    return result


def project_row(db,user,project):
    waiting=[item for item in dependencies(db,project) if item.status=='pending']
    report=accessible_source(db,user,project)
    return dict(id=project.id,reference=project.proj_number,title=project.title,
        status=project.status if project.coordination_started_at else 'historical_record',
        historical_status=project.legacy_status or (project.status if not project.coordination_started_at else None),
        description=project.description,requesting_party=project.requesting_party,
        barangay=project.barangay_ref.name if project.barangay_ref else project.barangay or 'Not recorded',
        barangay_id=project.barangay_id,district_id=project.district_id,location=project.location_string,
        owner_id=project.project_engineer_id,owner_name=person_name(db,project.project_engineer_id),
        next_review_at=project.next_review_at,version=project.coordination_version,updated_at=project.updated_at or project.created_at,
        pending_dependencies=len(waiting),source_report_id=report.id if report else None,
        source_report_version=report.version if report else None,
        completion_document_id=project.completion_document_id,completion_reviewed_by=person_name(db,project.completion_reviewed_by_id),
        completed_at=project.completed_at,certificate_reference=project.certificate_reference,
        certificate_document_id=project.certificate_document_id,certificate_recorded_at=project.certificate_recorded_at,
        allowed_actions=actions(db,user,project))


def event(db,user,project,action,reason,details=None):
    payload=dict(reason=reason,**(details or {}))
    db.add(gm.AuditLog(trigger_type='project_coordination',actor_id=user.id,actor_role=user.role,project_id=project.id,action=action,details=json.dumps(payload)))
    db.add(gm.ProcessTimeline(project_id=project.id,status=project.status,actor_id=user.id,actor_role=user.role,note=f'{action}: {reason}',is_public=False))
    if project.source_report_id:
        report=db.get(models.Report,project.source_report_id)
        if report:
            require_report_scope(db,user,report)
            from gov_crud import _append_timeline
            _append_timeline(db,status=report.status,previous_status=report.status,actor_id=user.id,actor_role=user.role,
                report_id=report.id,is_public=True,note=f'Related engineering project {project.proj_number} has a coordination update. The report status is unchanged.')


def eligible_owner(db,user,project,owner_id):
    person=db.get(models.Official,owner_id)
    if not person or not person.is_active or person.is_suspended or person.role not in OWNERS:
        raise HTTPException(422,'Choose an active engineering owner.')
    ids=jurisdiction_ids(person)
    if ids and project.district_id not in ids: raise HTTPException(422,'The engineering owner does not cover this district.')
    require_scope(user,project)
    return person


def future(value):
    if not value or not value.tzinfo or value<=now(): raise HTTPException(422,'Choose a future follow-up date and time, including its timezone.')
    return value


def proof(db,user,project,document_id,document_type):
    from records_workspace import require_document_scope
    from document_router import UPLOAD_DIR
    document=db.get(gm.SystemDocument,document_id) if document_id else None
    if not document or document.target_model!='ProjectRequest' or document.target_id!=project.id or document.document_type!=document_type:
        raise HTTPException(422,f'Upload a {document_type.replace("_"," ")} linked to this project and select its document reference.')
    require(user,'evidence_view')
    if document.confidentiality=='Confidential': require_document_scope(db,user,document)
    root=os.path.realpath(UPLOAD_DIR)
    path=os.path.realpath(document.file_path)
    if not path.startswith(root+os.sep) or not os.path.isfile(path): raise HTTPException(409,'The evidence file is unavailable. Restore or upload the record before continuing.')
    return document


class Reason(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    reason: str=Field(min_length=10,max_length=2000)


class Create(Reason):
    title: str=Field(min_length=3,max_length=255)
    description: str=Field(min_length=10,max_length=10000)
    requesting_party: str=Field(min_length=3,max_length=255)
    barangay_id: int=Field(gt=0)
    location_string: Optional[str]=Field(None,max_length=1000)
    owner_id: Optional[int]=None
    next_review_at: Optional[AwareDatetime]=None
    source_report_id: Optional[int]=None
    expected_source_version: Optional[int]=Field(None,ge=1)


class Command(Reason):
    expected_version: int=Field(ge=0)
    action: Literal['adopt','edit','assign','advance','add_dependency','resolve_dependency','accept_completion','return_for_work','record_certificate','verify_report_resolution','cancel']
    expected_report_version: Optional[int]=Field(None,ge=1)
    report_issue_addressed: StrictBool=False
    title: Optional[str]=Field(None,min_length=3,max_length=255)
    location_string: Optional[str]=Field(None,max_length=1000)
    owner_id: Optional[int]=None
    next_review_at: Optional[AwareDatetime]=None
    description: Optional[str]=Field(None,max_length=5000)
    office: Optional[str]=Field(None,max_length=255)
    reference: Optional[str]=Field(None,max_length=255)
    document_id: Optional[int]=None
    dependency_id: Optional[int]=None


def create(db,user,payload):
    staff_accounts.lock_accounts(db,user)
    require(user,'manage')
    area=db.get(models.Barangay,payload.barangay_id)
    if not area: raise HTTPException(422,'Choose an existing barangay.')
    project=gm.ProjectRequest(title=payload.title,description=payload.description,requesting_party=payload.requesting_party,
        barangay=area.name,barangay_id=area.id,district_id=area.district_id,location_string=payload.location_string,
        source_report_id=payload.source_report_id,status='intake',current_phase=1,created_by_id=user.id,coordination_started_at=now(),
        estimated_cost=null(),procurement_modality='not_recorded',category='engineering_coordination')
    require_scope(user,project)
    if payload.source_report_id:
        from government_access import can
        if not can(user,'reports'): raise HTTPException(403,'Report access is required to link this source.')
        report=db.query(models.Report).filter_by(id=payload.source_report_id).populate_existing().with_for_update().first()
        if not report: raise HTTPException(404,'Source report not found.')
        require_report_scope(db,user,report)
        if payload.expected_source_version!=report.version: raise HTTPException(409,'The source report changed. Reload it before creating this project.')
        if report.status in {'resolved','completed','rejected','cancelled','spam','duplicate'}: raise HTTPException(409,'A closed report cannot start new project coordination.')
        if db.query(gm.ProjectRequest.id).filter(gm.ProjectRequest.source_report_id==report.id,gm.ProjectRequest.status.notin_(CLOSED)).first():
            raise HTTPException(409,'This report already has an open project. Review its linked project before creating another record.')
        source_area=db.get(models.Barangay,report.barangay_id) if report.barangay_id else None
        if not source_area or source_area.district_id!=area.district_id or area_name(source_area.name)!=area_name(area.name):
            raise HTTPException(422,'The source report and project barangay must agree.')
    if payload.owner_id:
        eligible_owner(db,user,project,payload.owner_id)
        project.project_engineer_id=payload.owner_id
        project.next_review_at=future(payload.next_review_at)
    db.add(project);db.flush()
    event(db,user,project,'Project coordination opened',payload.reason)
    if project.project_engineer_id: notify_owner(db,project)
    db.commit()
    return project


def notify_owner(db,project):
    db.add(models.Notification(official_id=project.project_engineer_id,title='Project coordination assigned',message=f'{project.proj_number}: {project.title}',target_url=f'/gov/projects?project={project.id}'))


def update_metadata(db,user,project_id,payload):
    staff_accounts.lock_accounts(db,user)
    project=target(db,user,project_id,True)
    require(user,'manage')
    if payload.expected_version is None: raise HTTPException(428,'Provide the current project expected_version.')
    if payload.expected_version!=project.coordination_version: raise HTTPException(409,'This project changed. Refresh its record.')
    if not project.coordination_started_at or project.status in CLOSED: raise HTTPException(409,'Open the project coordination record before editing.')
    if not payload.reason or len(payload.reason.strip())<10: raise HTTPException(422,'Record a reason of at least 10 characters.')
    values=payload.model_dump(exclude_unset=True,exclude={'expected_version','reason'})
    valid={'title','description','location_string','location_lat','location_lng','category','survey_engineer_id','design_lead_id','project_engineer_id','next_review_at'}
    if values.keys()-valid: raise HTTPException(422,'Use the governed project action or a linked document for these fields.')
    for field in ('survey_engineer_id','design_lead_id','project_engineer_id'):
        if field in values and values[field]: eligible_owner(db,user,project,values[field])
    if 'title' in values and (not values['title'] or len(values['title'].strip())<3): raise HTTPException(422,'Provide a project title.')
    if 'description' in values and (not values['description'] or len(values['description'].strip())<10): raise HTTPException(422,'Provide a project description.')
    for field,limit in [('location_lat',90),('location_lng',180)]:
        if field in values and values[field] is not None:
            from math import isfinite
            if not isfinite(values[field]) or abs(values[field])>limit: raise HTTPException(422,'Provide valid coordinates.')
    if 'next_review_at' in values: future(values['next_review_at'])
    for key,value in values.items(): setattr(project,key,value)
    project.coordination_version+=1
    event(db,user,project,'Project metadata updated',payload.reason.strip(),dict(fields=sorted(values)))
    db.commit()
    return project


def execute(db,user,project_id,payload):
    staff_accounts.lock_accounts(db,user)
    require(user,'inspect' if payload.action in {'accept_completion','return_for_work','verify_report_resolution'} else 'record_certificate' if payload.action=='record_certificate' else 'manage')
    project=target(db,user,project_id,True)
    if project.coordination_version!=payload.expected_version: raise HTTPException(409,'This project changed. Refresh and review its current record before trying again.')
    if payload.action not in actions(db,user,project): raise HTTPException(403,'This action is not available for your account and the current project state.')
    before=project.status
    details={}
    if payload.action=='adopt':
        project.legacy_status=project.status
        project.status='intake'
        project.coordination_started_at=now()
        project.project_engineer_id=None
        project.next_review_at=None
    elif payload.action=='edit':
        if not payload.title or not payload.description or len(payload.description)<10:
            raise HTTPException(422,'Provide a project title and description.')
        project.title=payload.title;project.description=payload.description;project.location_string=payload.location_string
    elif payload.action=='assign':
        eligible_owner(db,user,project,payload.owner_id)
        project.project_engineer_id=payload.owner_id
        project.next_review_at=future(payload.next_review_at)
        notify_owner(db,project)
        details=dict(owner_id=payload.owner_id,next_review_at=payload.next_review_at.isoformat())
    elif payload.action=='add_dependency':
        if not payload.description or len(payload.description)<10 or not payload.office or len(payload.office)<3:
            raise HTTPException(422,'Describe the dependency and name the responsible external office.')
        eligible_owner(db,user,project,payload.owner_id)
        db.add(gm.ProjectDependency(project_id=project.id,description=payload.description,office=payload.office,
            reference=payload.reference,owner_id=payload.owner_id,next_review_at=future(payload.next_review_at)))
        details=dict(office=payload.office,reference=payload.reference,owner_id=payload.owner_id)
    elif payload.action=='resolve_dependency':
        dependency=db.query(gm.ProjectDependency).filter_by(id=payload.dependency_id,project_id=project.id).with_for_update().first()
        if not dependency or dependency.status!='pending': raise HTTPException(409,'Select a pending dependency on this project.')
        if not payload.reference or len(payload.reference)<3: raise HTTPException(422,'Record the external response or completion reference.')
        dependency.status='resolved';dependency.resolved_at=now();dependency.resolution_reference=payload.reference
        details=dict(dependency_id=dependency.id,reference=payload.reference)
    elif payload.action=='advance':
        if not project.project_engineer_id: raise HTTPException(422,'Assign an engineering owner before advancing the project.')
        eligible_owner(db,user,project,project.project_engineer_id)
        if any(item.status=='pending' for item in dependencies(db,project)): raise HTTPException(409,'Resolve the pending external dependencies before advancing.')
        next_status=NEXT[project.status]
        types={'ready_for_work':'planning_record','in_progress':'work_authorization','awaiting_verification':'completion_report'}
        if next_status in types:
            document=proof(db,user,project,payload.document_id,types[next_status])
            details['document_id']=document.id
            if next_status=='awaiting_verification':
                project.completion_document_id=document.id
                project.completion_submitted_by_id=user.id
        project.status=next_status
        project.next_review_at=future(payload.next_review_at)
        if next_status=='in_progress': project.construction_started_at=now()
    elif payload.action=='accept_completion':
        if any(item.status=='pending' for item in dependencies(db,project)): raise HTTPException(409,'Resolve the pending dependencies before completion review.')
        if db.query(gm.WorkOrder.id).filter(gm.WorkOrder.project_id==project.id,gm.WorkOrder.status.notin_({'completed','resolved','cancelled','rejected'})).first():
            raise HTTPException(409,'Complete or explicitly close the linked work orders before accepting project completion.')
        proof(db,user,project,project.completion_document_id,'completion_report')
        document=proof(db,user,project,payload.document_id,'inspection_report')
        project.status='completed';project.completed_at=now();project.completion_reviewed_by_id=user.id;project.next_review_at=None
        details['inspection_document_id']=document.id
    elif payload.action=='return_for_work':
        project.status='in_progress';project.next_review_at=future(payload.next_review_at)
        project.completion_document_id=None;project.completion_submitted_by_id=None
    elif payload.action=='record_certificate':
        if not payload.reference or len(payload.reference)<3 or not payload.office or len(payload.office)<3:
            raise HTTPException(422,'Record the official certificate reference and issuing office.')
        document=proof(db,user,project,payload.document_id,'completion_certificate')
        project.certificate_reference=payload.reference;project.certificate_document_id=document.id;project.certificate_recorded_at=now()
        details=dict(reference=payload.reference,issuing_office=payload.office,document_id=document.id)
    elif payload.action=='verify_report_resolution':
        if not payload.report_issue_addressed: raise HTTPException(422,'Confirm that the completed work addressed the resident report.')
        from referral_models import ExternalReferral
        if db.query(ExternalReferral.id).filter(ExternalReferral.report_id==project.source_report_id,
            ExternalReferral.status.notin_({'coordinated_closed','superseded','cancelled'})).first():
            raise HTTPException(409,'External referrals still require follow-up before report resolution.')
        report=db.query(models.Report).filter_by(id=project.source_report_id).populate_existing().with_for_update().one()
        require_report_scope(db,user,report)
        if payload.expected_report_version!=report.version: raise HTTPException(409,'The source report changed. Refresh the record and inspect its latest evidence.')
        active_work=db.query(gm.WorkOrder.id).filter(gm.WorkOrder.report_id==report.id,gm.WorkOrder.status.notin_({'completed','resolved','cancelled','rejected'})).first()
        active_project=db.query(gm.ProjectRequest.id).filter(gm.ProjectRequest.source_report_id==report.id,gm.ProjectRequest.status.notin_(CLOSED)).first()
        if active_work or active_project: raise HTTPException(409,'Other linked work or project coordination remains open.')
        if not project.completion_reviewed_by_id: raise HTTPException(409,'Independent project completion review is not recorded.')
        from gov_crud import _sync_report_status
        _sync_report_status(db,report.id,'resolved',user.id,user.role,note='A staff verifier confirmed that the completed engineering project addressed the reported issue.')
        details=dict(report_id=report.id,report_version=report.version)
    elif payload.action=='cancel':
        project.status='cancelled';project.next_review_at=None
    project.coordination_version+=1
    details.update(before=before,after=project.status,version=project.coordination_version)
    event(db,user,project,payload.action.replace('_',' ').capitalize(),payload.reason,details)
    db.commit()
    return project


@router.get('/options')
def options(db:Session=Depends(get_db),user=Depends(get_current_user)):
    require(user)
    people=[]
    for person in db.query(models.Official).filter(models.Official.is_active.is_(True),models.Official.is_suspended.is_not(True),models.Official.role.in_(OWNERS)).order_by(models.Official.full_name):
        actor_ids=jurisdiction_ids(user);ids=jurisdiction_ids(person)
        if actor_ids and ids and not set(actor_ids)&set(ids): continue
        people.append(dict(id=person.id,name=person.full_name,district_ids=ids))
    areas=db.query(models.Barangay)
    ids=jurisdiction_ids(user)
    if ids: areas=areas.filter(models.Barangay.district_id.in_(ids))
    return dict(owners=people,areas=canonical_areas(areas.all()),can_create=allowed(user,'manage'))


@router.get('/report/{report_id}/context')
def report_context(report_id:int,db:Session=Depends(get_db),user=Depends(get_current_user)):
    require(user,'manage')
    from report_review_router import get_report
    report=get_report(db,user,report_id)
    area=db.get(models.Barangay,report.barangay_id) if report.barangay_id else None
    linked=scoped(db.query(gm.ProjectRequest),gm.ProjectRequest.district_id,user).filter(gm.ProjectRequest.source_report_id==report.id,gm.ProjectRequest.status.notin_(CLOSED)).all()
    choices=canonical_areas(db.query(models.Barangay).filter_by(district_id=area.district_id).all()) if area else []
    normalized=next((choice for choice in choices if area_name(choice['name'])==area_name(area.name)),None) if area else None
    return dict(report_id=report.id,version=report.version,ticket=report.ticket_id,description=report.description,
        location=report.location_string,barangay_id=normalized['id'] if normalized else None,
        can_create=bool(area and not linked and report.status not in {'resolved','completed','rejected','cancelled','spam','duplicate'}),
        location_needed=not bool(area),projects=[dict(id=p.id,reference=p.proj_number,title=p.title) for p in linked])


@router.get('')
def listing(page:int=Query(1,ge=1),view:str='all',search:str=Query('',max_length=200),db:Session=Depends(get_db),user=Depends(get_current_user)):
    require(user)
    query=scoped(db.query(gm.ProjectRequest),gm.ProjectRequest.district_id,user)
    if search: query=query.filter(or_(gm.ProjectRequest.title.ilike(f'%{search}%'),gm.ProjectRequest.proj_number.ilike(f'%{search}%')))
    if view=='open': query=query.filter(gm.ProjectRequest.status.notin_(CLOSED))
    elif view=='assessment': query=query.filter(gm.ProjectRequest.status.in_({'intake','assessment','request_received','survey_in_progress','survey_complete'}))
    elif view=='planning': query=query.filter(gm.ProjectRequest.status.in_({'planning','ready_for_work','design_in_progress','approved_by_city_engineer'}))
    elif view=='waiting': query=query.filter(gm.ProjectRequest.id.in_(db.query(gm.ProjectDependency.project_id).filter_by(status='pending')))
    elif view=='for_review': query=query.filter_by(status='awaiting_verification')
    elif view=='completed': query=query.filter(gm.ProjectRequest.status.in_(CLOSED-{'cancelled'}))
    elif view=='historical': query=query.filter(gm.ProjectRequest.coordination_started_at.is_(None))
    elif view!='all': raise HTTPException(422,'Choose a project queue.')
    total=query.count()
    return dict(items=[project_row(db,user,p) for p in query.order_by(gm.ProjectRequest.updated_at.desc(),gm.ProjectRequest.id.desc()).offset((page-1)*15).limit(15)],total=total,page=page,can_create=allowed(user,'manage'))


@router.post('',status_code=201)
def opening(payload:Create,db:Session=Depends(get_db),user=Depends(get_current_user)):
    project=create(db,user,payload)
    return project_row(db,user,project)


@router.get('/{project_id}')
def detail(project_id:int,db:Session=Depends(get_db),user=Depends(get_current_user)):
    project=target(db,user,project_id)
    from records_workspace import documents_query,document_projection
    import roles_service
    documents=[]
    can_view=allowed(user,'evidence_view')
    if can_view:
        accessible=db.query(gm.SystemDocument).filter_by(target_model='ProjectRequest',target_id=project.id)
        if roles_service.has_permission(db,user,'records','view'):
            permitted_records=documents_query(db,user).with_entities(gm.SystemDocument.id)
            accessible=accessible.filter(or_(gm.SystemDocument.confidentiality!='Confidential',gm.SystemDocument.id.in_(permitted_records)))
        else:
            accessible=accessible.filter(gm.SystemDocument.confidentiality!='Confidential')
        documents=[document_projection(d) for d in accessible.order_by(gm.SystemDocument.id.desc())]
    return dict(**project_row(db,user,project),documents=documents,can_upload=allowed(user,'evidence_upload'),
        dependencies=[dict(id=d.id,description=d.description,office=d.office,reference=d.reference,owner_id=d.owner_id,
            owner=person_name(db,d.owner_id),next_review_at=d.next_review_at,status=d.status,resolved_at=d.resolved_at,resolution_reference=d.resolution_reference) for d in dependencies(db,project)])


@router.get('/{project_id}/history')
def history(project_id:int,page:int=Query(1,ge=1),db:Session=Depends(get_db),user=Depends(get_current_user)):
    target(db,user,project_id)
    query=db.query(gm.AuditLog).filter_by(project_id=project_id)
    total=query.count()
    return dict(items=[dict(id=e.id,action=e.action,at=e.created_at,actor=person_name(db,e.actor_id),details=e.details) for e in query.order_by(gm.AuditLog.id.desc()).offset((page-1)*15).limit(15)],total=total,page=page)


@router.post('/{project_id}/commands')
def command(project_id:int,payload:Command,db:Session=Depends(get_db),user=Depends(get_current_user)):
    project=execute(db,user,project_id,payload)
    return project_row(db,user,project)
