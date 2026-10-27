"""Persisted document and activity projections for the government records screen."""
from fastapi import HTTPException
from sqlalchemy import or_, and_
import models
import gov_models as gm
import roles_service
from government_access import jurisdiction_ids, scoped, scoped_reports


def record_permissions(db, user):
    if not isinstance(user, models.Official): raise HTTPException(403, 'Staff records access is required.')
    roles_service.assert_permission(db, user, 'records', 'view')
    from legacy_operations import granted, FINANCIAL_READERS
    return dict(upload=roles_service.has_permission(db,user,'records','manage'),
        financial_history=granted(user,'procurement','view',FINANCIAL_READERS),
        audit=roles_service.has_permission(db,user,'admin','audit') or user.role in {'city_engineer','asst_city_engineer'})


def documents_query(db, user):
    permissions = record_permissions(db,user)
    query = db.query(gm.SystemDocument)
    if not permissions['upload'] and not permissions['audit']:
        query = query.filter(gm.SystemDocument.confidentiality != 'Confidential')
    if jurisdiction_ids(user):
        conditions = []
        for name, model in [('WorkOrder',gm.WorkOrder),('ProjectRequest',gm.ProjectRequest),('OBOInspection',gm.OBOInspection)]:
            conditions.append(and_(gm.SystemDocument.target_model == name,gm.SystemDocument.target_id.in_(scoped(db.query(model.id),model.district_id,user))))
        query = query.filter(or_(*conditions))
    if user.role in {'field_worker','foreman','construction_foreman'}:
        query = query.filter(gm.SystemDocument.target_model=='WorkOrder',gm.SystemDocument.target_id.in_(db.query(gm.WorkOrder.id).filter_by(assigned_to_id=user.id)))
    return query


def require_document_scope(db,user,doc):
    if not documents_query(db,user).filter(gm.SystemDocument.id==doc.id).first():
        raise HTTPException(403,'This document is outside your permitted records scope.')


def document_projection(doc):
    """Expose record metadata without server paths or internal storage metadata."""
    fields=('id','document_type','file_name','file_size_bytes','sha256_hash','category','confidentiality','retention_policy','expiry_date','legal_hold','target_model','target_id','uploader_id','uploaded_at')
    return {**{name:getattr(doc,name,None) for name in fields},'download_url':f'/api/gov/documents/get/{doc.id}'}


def activity_query(db,user,model):
    query=db.query(model)
    if jurisdiction_ids(user) or user.role in {'field_worker','foreman','construction_foreman'}:
        reports=scoped_reports(db.query(models.Report.id),user)
        work=scoped(db.query(gm.WorkOrder.id),gm.WorkOrder.district_id,user)
        if user.role in {'field_worker','foreman','construction_foreman'}:
            work=work.filter(gm.WorkOrder.assigned_to_id==user.id)
            reports=reports.filter(models.Report.id.in_(db.query(gm.WorkOrder.report_id).filter_by(assigned_to_id=user.id)))
        projects=scoped(db.query(gm.ProjectRequest.id),gm.ProjectRequest.district_id,user)
        query=query.filter(or_(model.report_id.in_(reports),model.work_order_id.in_(work),model.project_id.in_(projects)))
    return query


def workspace_records(db,user,view='documents',page=1,search=''):
    permissions=record_permissions(db,user)
    if view=='documents':
        query=documents_query(db,user)
        if search: query=query.filter(or_(gm.SystemDocument.file_name.ilike(f'%{search}%'),gm.SystemDocument.document_type.ilike(f'%{search}%')))
        total=query.count()
        rows=query.order_by(gm.SystemDocument.uploaded_at.desc(),gm.SystemDocument.id.desc()).offset((page-1)*15).limit(15).all()
        result=[dict(id=r.id,title=r.file_name,document_type=r.document_type,classification=r.confidentiality,
            size_bytes=r.file_size_bytes,checksum=r.sha256_hash,retention=r.retention_policy,legal_hold=r.legal_hold,
            created_at=r.uploaded_at,target_model=r.target_model,target_id=r.target_id,
            owner=r.uploader.full_name if r.uploader else 'Not recorded') for r in rows]
    else:
        if view not in {'timeline','audit'}: raise HTTPException(422,'Choose Documents, Timeline or Audit trail.')
        if view=='audit' and not permissions['audit']: raise HTTPException(403,'Your account does not have audit access.')
        model=gm.AuditLog if view=='audit' else gm.ProcessTimeline
        query=activity_query(db,user,model)
        action=model.action if view=='audit' else model.status
        if search: query=query.filter(action.ilike(f'%{search}%'))
        total=query.count()
        rows=query.order_by(model.created_at.desc(),model.id.desc()).offset((page-1)*15).limit(15).all()
        result=[dict(id=r.id,title=r.action if view=='audit' else (r.status or 'Status not recorded').replace('_',' '),
            detail=r.details if view=='audit' else r.note,owner=r.actor.full_name if r.actor else 'Not recorded',
            created_at=r.created_at,report_id=r.report_id,work_order_id=r.work_order_id,project_id=r.project_id) for r in rows]
    return dict(items=result,total=total,page=page,permissions=permissions)
