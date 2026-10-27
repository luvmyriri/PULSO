"""Bounded, read-only staff evidence. Models never issue SQL or choose permissions."""
import re
from datetime import datetime, timezone
from sqlalchemy import func, or_

import models
import gov_models as gm
from government_access import can, jurisdiction_ids, scoped, scoped_assets, scoped_reports
from operations_workspace import CLOSED, REPORT_CLOSED, OVERVIEW_TRIAGE_STATES

MODEL_LIMITATION = ('The existing LightGBM model uses synthetic examples and registry proxy labels. '
    'Its review index is experimental, not a validated failure probability, repair deadline or approved work schedule.')


def module_access(user, module):
    from gov_router import GOV_ROLES
    caps = user.role_ref.capabilities or {} if user.role_ref else {}
    if module in caps:
        grant = caps[module]
        return isinstance(grant, list) and ('view' in grant or '*' in grant)
    return user.role in GOV_ROLES and (can(user, 'maintenance') if module == 'assets' else can(user, 'reports') if module == 'reports' else True)


def report_query(db, user):
    from gov_router import FIELD_SELF_ROLES
    query = scoped_reports(db.query(models.Report), user)
    if user.role in FIELD_SELF_ROLES:
        query = query.filter(models.Report.id.in_(db.query(gm.WorkOrder.report_id).filter_by(assigned_to_id=user.id)))
    return query


def work_query(db, user):
    from gov_router import FIELD_SELF_ROLES
    query = scoped(db.query(gm.WorkOrder), gm.WorkOrder.district_id, user)
    return query.filter(gm.WorkOrder.assigned_to_id == user.id) if user.role in FIELD_SELF_ROLES else query


def build_context(db, user, question, selection=None):
    """Server-generated facts and internal links; no names, contact data or evidence."""
    selection = selection or {}
    districts = jurisdiction_ids(user)
    from gov_router import FIELD_SELF_ROLES
    scope_label = 'Assigned work and linked reports' if user.role in FIELD_SELF_ROLES else 'Configured districts' if districts else 'Department records'
    now = datetime.now(timezone.utc).isoformat()
    facts = dict(as_of=now, scope={'district_ids': districts, 'description': scope_label},
        limitations=['Counts describe recorded workload, not danger, staff capacity or productivity.',
            'One report may have several work orders. Nearby reports are not necessarily linked reports.',
            'Application records are not independent verification of current conditions on the ground.',
            'Only structured operational fields are supplied; confidential notes and resident identity are excluded.'], sources=[])

    def source(key, label, url, data):
        facts['sources'].append(dict(id=key, label=label, url=url, data=data))

    reports = report_query(db, user) if module_access(user, 'reports') else None
    works = work_query(db, user) if module_access(user, 'work_orders') else None
    if reports is not None:
        open_reports = reports.filter(models.Report.status.notin_(REPORT_CLOSED))
        source('reports', 'Reports: current workload', '/gov/reports', dict(
            open_reports=open_reports.count(),
            needs_triage_or_owner=open_reports.filter(or_(models.Report.status.in_(OVERVIEW_TRIAGE_STATES), models.Report.review_assigned_to_id.is_(None))).count(),
            urgent_P4_P5=open_reports.filter(func.upper(models.Report.priority_grade).in_(['P4', 'P5'])).count(),
            awaiting_resident_information=open_reports.filter_by(status='needs_information').count(),
            by_status=dict(reports.with_entities(models.Report.status, func.count(models.Report.id)).group_by(models.Report.status).all())))
        tickets = re.findall(r'\bPUL-[A-Z0-9-]{3,60}\b', question.upper())[:3]
        selected = selection.get('report_id')
        details = reports.filter(or_(models.Report.id == selected, models.Report.ticket_id.in_(tickets))).limit(3).all() if selected or tickets else []
        for row in details:
            source(f'report-{row.id}', row.ticket_id or f'Report {row.id}', f'/gov/reports?reportId={row.id}', dict(
                ticket_id=row.ticket_id, category=row.category, status=row.status, priority_grade=row.priority_grade,
                barangay=row.location_barangay, review_assigned=bool(row.review_assigned_to_id), updated_at=row.updated_at))
        if (selected or tickets) and not details:
            facts['limitations'].append('The requested report is unavailable in this account’s authorized scope; no details were retrieved.')
    if works is not None:
        source('work-orders', 'Work orders: current stages', '/gov/work-orders', dict(
            current_work_orders=works.filter(gm.WorkOrder.status.notin_(CLOSED)).count(),
            by_status=dict(works.with_entities(gm.WorkOrder.status, func.count(gm.WorkOrder.id)).group_by(gm.WorkOrder.status).all())))
        if selection.get('work_order_id'):
            row = works.filter_by(id=selection['work_order_id']).first()
            if row:
                source(f'work-{row.id}', row.wo_number or f'Work order {row.id}', f'/gov/work-orders?wo={row.id}', dict(
                    status=row.status, priority=row.priority, asset_id=row.asset_id, assigned=bool(row.assigned_to_id),
                    assigned_to_you=row.assigned_to_id == user.id, updated_at=row.updated_at))

    wants_maintenance = bool(selection.get('asset_id')) or bool(re.search(r'maintenan|predict|forecast|risk|inspect|asset|infrastructure|lightgbm|postgis|spatial|nearby|hotspot|CAL-[A-Z0-9-]+|imprastraktura|panganib', question, re.I))
    if wants_maintenance and module_access(user, 'assets') and can(user, 'maintenance'):
        from maintenance_planning import maintenance_projection
        from asset_map_context import asset_report_context
        assets = scoped_assets(db.query(gm.InfrastructureAsset), user)
        requested = selection.get('asset_id')
        codes = re.findall(r'\bCAL-[A-Z0-9-]{2,60}\b', question.upper())[:3]
        chosen = assets.filter(gm.InfrastructureAsset.asset_id.in_(([requested] if requested else []) + codes)).limit(3).all() if requested or codes else assets.order_by(gm.InfrastructureAsset.condition_score.asc().nullsfirst(), gm.InfrastructureAsset.asset_id).limit(3).all()
        source('assets', 'Infrastructure registry', '/gov/assets', dict(registered_assets=assets.count(),
            selection='Requested assets' if requested or codes else 'Up to three assets with the lowest recorded condition; not a model ranking'))
        for asset in chosen:
            location = asset_report_context(db, user, asset.asset_id, 500)
            data = dict(asset_id=asset.asset_id, category=asset.category, barangay=asset.barangay,
                recorded_condition_score=asset.condition_score, updated_at=asset.updated_at,
                spatial=dict(source='PostGIS ST_DWithin on scoped reports and registered geometry',
                    geometry_available=location['location_available'], radius_m=500, nearby_window_days=90,
                    nearby_reports_90d=len(location['distances']) if location['location_available'] else None,
                    explicitly_linked_reports=len(location['linked_ids'])),
                maintenance_projection=maintenance_projection(asset.maintenance_logs))
            # The current model trains citywide. Never expose it through a narrower grant.
            if not location['location_available'] or asset.condition_score is None:
                data['model'] = dict(status='unavailable', reason='Registered geometry and a recorded condition score are required before model inference.')
            elif districts or not all(module_access(user, key) for key in ('reports', 'work_orders', 'assets')):
                data['model'] = dict(status='unavailable', reason='The current model uses citywide training scope; this account has narrower data permissions.')
            else:
                from services import lightgbm_service
                try:
                    with db.begin_nested():
                        if not lightgbm_service._LGBM_AVAILABLE:
                            raise RuntimeError('LightGBM unavailable')
                        prediction = lightgbm_service.predict_for_asset(db, asset)
                    data['model'] = dict(status='experimental', engine=prediction['engine'],
                        training_mode='synthetic_examples_and_registry_proxy_labels', review_index=round(prediction['lgbm_failure_probability_30d'] * 100, 1),
                        limitation=MODEL_LIMITATION)
                except Exception:
                    data['model'] = dict(status='unavailable', reason='The model could not complete this calculation. Recorded history remains available.')
            source(f'asset-{asset.asset_id}', f'Maintenance: {asset.asset_id}', f'/gov/insights?view=predictive&asset={asset.asset_id}', data)
        if (requested or codes) and not chosen:
            facts['limitations'].append('The requested asset is unavailable in this account’s authorized scope.')
    return facts
