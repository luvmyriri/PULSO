"""Record-backed personal inbox and service investigations; no simulated capacity."""
from collections import Counter, defaultdict
from datetime import datetime, time, timedelta, timezone
from urllib.parse import urlencode
from fastapi import HTTPException
from sqlalchemy import func, or_
import models
import report_review
import gov_models as gm
from government_access import can, require, scoped, scoped_assets, scoped_reports

CLOSED = {'completed', 'resolved', 'cancelled'}
REPORT_CLOSED = {'resolved', 'completed', 'closed', 'closed_by_citizen', 'cancelled', 'rejected', 'spam', 'duplicate'}
OVERVIEW_TRIAGE_STATES = {'submitted', 'received', 'pending', 'unverified', 'unvalidated', 'under_review'}


def overview_report_query(db, user, selection, area=None, priority=None):
    """The same scoped report set feeds overview counts, Reports, and the map."""
    require(user, 'overview')
    from gov_router import FIELD_SELF_ROLES

    query = scoped_reports(db.query(models.Report), user)
    if user.role in FIELD_SELF_ROLES:
        query = query.filter(models.Report.id.in_(db.query(gm.WorkOrder.report_id).filter(gm.WorkOrder.assigned_to_id == user.id)))
    query = query.filter(models.Report.status.notin_(list(REPORT_CLOSED)))
    if area is not None:
        if not area or len(area) > 160:
            raise HTTPException(422, 'Choose a recorded area.')
        query = query.filter(models.Report.location_barangay == area)
    if priority is not None:
        grade = priority.upper()
        if grade == 'UNASSESSED':
            query = query.filter(func.upper(func.coalesce(models.Report.priority_grade, '')).notin_(['P0', 'P1', 'P2', 'P3', 'P4', 'P5']))
        elif grade in {'P0', 'P1', 'P2', 'P3', 'P4', 'P5'}:
            query = query.filter(func.upper(models.Report.priority_grade) == grade)
        else:
            raise HTTPException(422, 'Choose a recorded priority grade.')
    if selection == 'open':
        return query
    if selection == 'unowned':
        return query.filter(models.Report.review_assigned_to_id.is_(None))
    if selection == 'triage':
        return query.filter(or_(models.Report.status.in_(list(OVERVIEW_TRIAGE_STATES)), models.Report.review_assigned_to_id.is_(None)))
    if selection == 'urgent':
        return query.filter(func.upper(models.Report.priority_grade).in_(['P4', 'P5']))
    if selection == 'unlocated':
        return query.filter(or_(models.Report.location_barangay.is_(None), models.Report.location_barangay == ''))
    if selection == 'area' and area:
        return query
    if selection == 'priority' and priority:
        return query
    if selection in {'with_work', 'without_work'}:
        work = scoped(db.query(gm.WorkOrder.report_id), gm.WorkOrder.district_id, user).filter(
            gm.WorkOrder.status.notin_(list(CLOSED)), gm.WorkOrder.report_id.isnot(None)
        )
        if user.role in FIELD_SELF_ROLES:
            work = work.filter(gm.WorkOrder.assigned_to_id == user.id)
        return query.filter(models.Report.id.in_(work) if selection == 'with_work' else models.Report.id.notin_(work))
    raise HTTPException(422, 'Choose an available overview report selection.')


def overview_report_url(selection, area=None, priority=None):
    return '/gov/reports?' + urlencode({'overview': selection, **({'area': area} if area else {}), **({'priority': priority} if priority else {})})


def utc(value):
    return value.replace(tzinfo=timezone.utc) if value and not value.tzinfo else value


def age(value, now):
    return max(0, (now - utc(value)).days) if value else None


def wo_location(db, wo):
    if wo.barangay_ref:
        return f'Barangay {wo.barangay_ref.name}' if str(wo.barangay_ref.name).isdigit() else wo.barangay_ref.name
    if wo.report_id:
        report = db.query(models.Report).filter(models.Report.id == wo.report_id).first()
        if report:
            return report.location_barangay or report.location_string
    return f'District {wo.district_id}' if wo.district_id else None


def my_work(db, user):
    now = datetime.now(timezone.utc)
    items = []
    wos = scoped(db.query(gm.WorkOrder), gm.WorkOrder.district_id, user)
    own = wos.filter(gm.WorkOrder.assigned_to_id == user.id).all()

    def append_wo(wo, bucket, why, action):
        days = age(wo.updated_at or wo.created_at, now)
        items.append(dict(id=wo.id, entity_type='work_order', ticket_id=wo.wo_number,
            title=wo.title or 'Work order', category=wo.category or 'Engineering work',
            priority=wo.priority or 'normal', status=wo.status, barangay=wo_location(db, wo),
            time_in_state=f'Updated {days}d ago' if days is not None else 'Update date not recorded',
            action_url=f'/gov/work-orders?wo={wo.id}', recommended_action=action,
            task_bucket=bucket, assigned_to_id=wo.assigned_to_id,
            assigned_to_name=wo.assigned_to.full_name if wo.assigned_to else None,
            why_in_inbox=why, work_bundle='engineering_field', updated_at=wo.updated_at or wo.created_at))

    for wo in own:
        if wo.status in CLOSED:
            if utc(wo.completed_date or wo.updated_at or wo.created_at) and utc(wo.completed_date or wo.updated_at or wo.created_at) >= now - timedelta(days=7):
                append_wo(wo, 'recently_completed', 'Your assigned work completed in the past 7 days.', 'Open work record')
        elif wo.status in {'completed_pending_review', 'awaiting_verification'}:
            append_wo(wo, 'waiting_on_others', 'Your completion submission is waiting for independent verification.', 'View submission')
        elif wo.status == 'blocked':
            append_wo(wo, 'waiting_on_others', 'Your assigned work has an unresolved blocker.', 'Review blocker')
        else:
            append_wo(wo, 'assigned_to_me', 'You are the recorded work-order owner.', 'Open assigned work')

    if can(user, 'verification'):
        for wo in wos.filter(gm.WorkOrder.status.in_(['completed_pending_review', 'awaiting_verification']), or_(gm.WorkOrder.assigned_to_id != user.id, gm.WorkOrder.assigned_to_id.is_(None))).all():
            append_wo(wo, 'needs_my_review', 'Independent completion review is available within your operational scope.', 'Review completion evidence')
    review_reports = scoped_reports(db.query(models.Report),user).filter(models.Report.review_assigned_to_id == user.id,models.Report.status.in_(['pending','received','unverified','unvalidated','under_review','validated','needs_information','pending_approval','approved_internal'])).all()
    for report in review_reports:
        waiting = report.status in {'needs_information','pending_approval'}
        owner = db.get(models.Official,report.review_assigned_to_id)
        items.append(dict(id=report.id,entity_type='report',ticket_id=report.ticket_id,title=(report.description or 'Citizen report')[:160],category=report.category or 'Unclassified',priority=report.priority_grade or 'Unreviewed',status=report.status,barangay=report.location_barangay,time_in_state=f'Updated {age(report.updated_at or report.created_at,now)}d ago',action_url=f'/gov/reports?reportId={report.id}',recommended_action='Review report',task_bucket='waiting_on_others' if waiting else 'assigned_to_me',assigned_to_id=user.id,assigned_to_name=owner.full_name,why_in_inbox='You are the recorded report review owner.',work_bundle='intake_review',updated_at=report.updated_at or report.created_at))
    if can(user, 'coordination') or report_review.permitted(user,'assign'):
        active_report_ids = db.query(gm.WorkOrder.report_id).filter(gm.WorkOrder.status.notin_(list(CLOSED)), gm.WorkOrder.report_id.isnot(None))
        for report in scoped_reports(db.query(models.Report), user).filter(models.Report.status.in_(['received', 'pending', 'unverified', 'unvalidated', 'under_review', 'validated']), or_(models.Report.review_assigned_to_id.is_(None),models.Report.review_assigned_to_id.notin_(db.query(models.Official.id).filter(models.Official.is_active.is_(True),models.Official.is_suspended.is_not(True)))), models.Report.id.notin_(active_report_ids)).all():
            days = age(report.updated_at or report.created_at, now)
            items.append(dict(id=report.id, entity_type='report', ticket_id=report.ticket_id or f'Report {report.id}',
                title=(report.description or 'Citizen report')[:160], category=report.category or 'Unclassified',
                priority=report.priority_grade or 'Unreviewed', status=report.status, barangay=report.location_barangay,
                time_in_state=f'Updated {days}d ago' if days is not None else 'Update date not recorded',
                action_url=f'/gov/reports?reportId={report.id}', recommended_action='Review and route report', task_bucket='needs_my_review',
                why_in_inbox='Review owner unavailable; reassignment needed.' if report.review_assigned_to_id else report.review_routing_reason or 'Needs a review owner; a coordinator can route this report.', work_bundle='intake_routing', updated_at=report.updated_at or report.created_at))
    if can(user, 'announcements', 'approve'):
        for item in scoped(db.query(gm.Announcement), gm.Announcement.district_id, user).filter(gm.Announcement.status.in_(['in_review', 'approved'])).all():
            items.append(dict(id=item.id, entity_type='announcement', ticket_id=item.announcement_id,
                title=item.title_en, category=item.category, priority=item.priority, status=item.status,
                barangay=', '.join(item.target_barangays or []) or 'Public update', time_in_state='Awaiting publication decision',
                action_url=f'/gov/announcements?selected={item.id}', recommended_action='Review public update', task_bucket='needs_my_review',
                why_in_inbox='A publication decision is available under your current account permissions.', work_bundle='executive_approvals', updated_at=item.updated_at or item.created_at))
    import project_workspace
    if project_workspace.allowed(user):
        projects=scoped(db.query(gm.ProjectRequest),gm.ProjectRequest.district_id,user).filter(gm.ProjectRequest.coordination_started_at.isnot(None),or_(gm.ProjectRequest.status.notin_(project_workspace.CLOSED),gm.ProjectRequest.status=='completed')).all()
        for project in projects:
            waiting=any(dependency.status=='pending' and dependency.owner_id==user.id for dependency in project_workspace.dependencies(db,project))
            available=project_workspace.actions(db,user,project)
            closing='verify_report_resolution' in available
            reviewing='accept_completion' in available or closing
            if project.status=='completed' and not reviewing: continue
            if project.project_engineer_id!=user.id and not waiting and not reviewing: continue
            bucket='needs_my_review' if reviewing else 'waiting_on_others' if waiting else 'assigned_to_me'
            items.append(dict(id=project.id,entity_type='project',ticket_id=project.proj_number,title=project.title,
                category='Project coordination',priority='normal',status=project.status,
                barangay=project.barangay or 'Not recorded',time_in_state='Project coordination',
                action_url=f'/gov/projects?project={project.id}',recommended_action='Verify report resolution' if closing else 'Review completion evidence' if reviewing else 'Open project coordination',
                task_bucket=bucket,assigned_to_id=project.project_engineer_id,assigned_to_name=project_workspace.person_name(db,project.project_engineer_id),
                why_in_inbox='The project is complete; its source report still needs an explicit resolution decision.' if closing else 'Independent completion review is available.' if reviewing else 'You own a pending external follow-up.' if waiting else 'You are the recorded engineering owner.',
                work_bundle='engineering_field',updated_at=project.updated_at or project.created_at))
    from referral_models import ExternalReferral, ReferralRecipient
    from external_referrals import grant as referral_grant, CLOSED as REFERRAL_CLOSED
    if referral_grant(user,'view'):
        referrals=db.query(ExternalReferral).filter(ExternalReferral.report_id.in_(scoped_reports(db.query(models.Report.id),user)),
            ExternalReferral.status.notin_(REFERRAL_CLOSED)).all()
        for referral in referrals:
            reviewing=referral.status=='draft' and referral_grant(user,'approve') and referral.created_by_id!=user.id
            if referral.owner_id!=user.id and not reviewing: continue
            recipient=db.get(ReferralRecipient,referral.recipient_id)
            report=db.get(models.Report,referral.report_id)
            items.append(dict(id=referral.id,entity_type='referral',ticket_id=referral.reference,title=f'External referral: {recipient.name}',
                category='External coordination',priority='normal',status=referral.status,
                barangay=report.location_barangay or 'Not recorded',time_in_state='Follow-up required',
                action_url=f'/gov/reports/{referral.report_id}?reportTab=routing&referral={referral.id}',recommended_action='Review referral letter' if reviewing else 'Reroute declined referral' if referral.status=='declined' else 'Follow up with receiving office',
                task_bucket='needs_my_review' if reviewing else 'assigned_to_me' if referral.status=='draft' else 'waiting_on_others',
                assigned_to_id=referral.owner_id,assigned_to_name=project_workspace.person_name(db,referral.owner_id),
                why_in_inbox='A referral letter awaits your delegated approval.' if reviewing else f'You own external coordination. Next follow-up: {referral.next_follow_up_at.isoformat()}.',
                work_bundle='intake_routing',updated_at=referral.updated_at or referral.created_at))
    from system_settings import read_config,review_target
    target_config=read_config(db,'sla_response_time')
    reports_by_id={r.id:r for r in db.query(models.Report).filter(models.Report.id.in_([item['id'] for item in items if item['entity_type']=='report'])).all()} if target_config else {}
    for item in items:
        if item['entity_type']=='report' and item['id'] in reports_by_id:
            item['review_target']=review_target(target_config,reports_by_id[item['id']],now)
    counts = Counter(i['task_bucket'] for i in items)
    items.sort(key=lambda i: ({'P5':0,'critical':0,'P4':1,'P3':2,'high':2,'P2':3,'P1':4,'P0':5}.get(i['priority'],6), utc(i['updated_at']) or now))
    return dict(timestamp=now,can_route_reports=report_review.permitted(user,'assign'),routing_enabled=read_config(db,'report_review_routing')['enabled'], metrics=None, sector_summary=None, team_capacity=[], needs_attention=items,
        user_role=user.role, user_display_name=user.full_name,
        work_bundles=[], inbox_counts={k: counts[k] for k in ['assigned_to_me', 'needs_my_review', 'waiting_on_others', 'recently_completed']})


def service_insights(db, user, days=90):
    now = datetime.now(timezone.utc)
    reports = scoped_reports(db.query(models.Report), user).filter(models.Report.created_at >= now - timedelta(days=days)).all()
    wos = scoped(db.query(gm.WorkOrder), gm.WorkOrder.district_id, user).filter(gm.WorkOrder.status.notin_(list(CLOSED))).all()
    open_reports = [r for r in reports if r.status not in REPORT_CLOSED]
    stages = defaultdict(list)
    areas = defaultdict(list)
    for report in open_reports:
        stages[report.status or 'not_recorded'].append(report)
        areas[report.location_barangay or 'Location not recorded'].append(report)

    def group(label, records):
        ages = [age(r.created_at, now) for r in records if r.created_at]
        return dict(label=label, count=len(records), oldest_days=max(ages) if ages else None, report_ids=[r.id for r in records])

    blockers = []
    workload = defaultdict(list)
    verification = []
    for wo in wos:
        owner = wo.assigned_to.full_name if wo.assigned_to else 'Unassigned'
        workload[owner].append(wo)
        if wo.status in {'completed_pending_review', 'awaiting_verification'}:
            verification.append(dict(id=wo.id, reference=wo.wo_number, title=wo.title, owner=owner, updated_at=wo.updated_at, url=f'/gov/work-orders?wo={wo.id}'))
        if wo.status == 'blocked':
            active = [b for b in wo.blockers if not b.resolved_at]
            blockers.append(dict(id=wo.id, reference=wo.wo_number, title=wo.title, owner=owner,
                reason=active[-1].reason_code if active else 'Reason not recorded',
                blocked_since=active[-1].created_at if active else None, url=f'/gov/work-orders?wo={wo.id}'))
    return dict(as_of=now, period_days=days, grain='reports', scope='Configured district scope' if getattr(user, 'primary_jurisdiction', None) else 'Department records',
        period_definition='Reports received during the selected period, grouped by their current status. Work-order queues show current open work.',
        open_report_count=len(open_reports), received_report_count=len(reports), unlocated_report_count=sum(1 for r in reports if not r.location_barangay),
        stages=sorted([group(k, v) for k, v in stages.items()], key=lambda r: -r['count']),
        areas=sorted([group(k, v) for k, v in areas.items()], key=lambda r: -r['count']),
        blockers=blockers, verification=verification,
        workload=[dict(owner=k, active=len(v), blocked=sum(w.status == 'blocked' for w in v), work_order_ids=[w.id for w in v]) for k, v in workload.items()],
        limitations=['Age is time since report submission, not time in the current process step.', 'Report volume is not a measure of danger or staff productivity.', 'Availability and effort estimates are not recorded; work counts do not measure capacity.'])


def operations_overview(db, user):
    now = datetime.now(timezone.utc)

    # All open authorized reports (all-age workload, not filtered by recent days)
    open_reports = overview_report_query(db, user, 'open').all()

    # All open authorized work orders
    open_wo_query = scoped(db.query(gm.WorkOrder), gm.WorkOrder.district_id, user).filter(
        gm.WorkOrder.status.notin_(list(CLOSED))
    )
    from gov_router import FIELD_SELF_ROLES
    if user.role in FIELD_SELF_ROLES:
        open_wo_query = open_wo_query.filter(gm.WorkOrder.assigned_to_id == user.id)
    open_wos = open_wo_query.all()

    open_report_ids = {report.id for report in open_reports}
    linked_current_work = [work for work in open_wos if work.report_id in open_report_ids]
    reports_with_work = {work.report_id for work in linked_current_work}
    relationships = dict(
        open_reports=len(open_reports),
        reports_with_current_work=len(reports_with_work),
        reports_without_current_work=len(open_reports) - len(reports_with_work),
        current_work_orders=len(open_wos),
        current_orders_linked_to_open_reports=len(linked_current_work),
        other_current_orders=len(open_wos) - len(linked_current_work),
        blocked_orders=sum(work.status == 'blocked' for work in open_wos),
        awaiting_verification=sum(work.status in {'completed_pending_review', 'awaiting_verification'} for work in open_wos),
    )

    # Daily intake is a received-period cohort, separate from the all-age open stock.
    manila = timezone(timedelta(hours=8))
    local_today = now.astimezone(manila).date()
    first_day = local_today - timedelta(days=13)
    first_instant = datetime.combine(first_day, time.min, tzinfo=manila).astimezone(timezone.utc)
    intake_query = scoped_reports(db.query(models.Report), user).filter(models.Report.created_at >= first_instant, models.Report.created_at <= now)
    if user.role in FIELD_SELF_ROLES:
        intake_query = intake_query.filter(models.Report.id.in_(db.query(gm.WorkOrder.report_id).filter(gm.WorkOrder.assigned_to_id == user.id)))
    intake_counts = Counter(utc(created).astimezone(manila).date().isoformat() for (created,) in intake_query.with_entities(models.Report.created_at).all() if created)
    intake_series = [
        dict(date=(first_day + timedelta(days=offset)).isoformat(), count=intake_counts[(first_day + timedelta(days=offset)).isoformat()])
        for offset in range(14)
    ]

    work_stage_definitions = [
        ('open', 'For assignment', {'open'}),
        ('assigned', 'Assigned', {'assigned'}),
        ('active', 'In progress', {'in_progress', 'rework_required'}),
        ('blocked', 'Blocked', {'blocked'}),
        ('completed_pending_review', 'For verification', {'completed_pending_review', 'awaiting_verification'}),
    ]
    known_work_states = set().union(*(states for _, _, states in work_stage_definitions))
    work_stages = [
        dict(key=key, label=label, count=sum(work.status in states for work in open_wos), url=f'/gov/work-orders?tab={key}')
        for key, label, states in work_stage_definitions
    ]
    other_work_count = sum(work.status not in known_work_states for work in open_wos)
    if other_work_count:
        work_stages.append(dict(key='other', label='Other current work', count=other_work_count, url=None))

    # 1. Reports needing attention (waiting for review / unassigned / unassessed / urgent)
    unreviewed_reports = [
        r for r in open_reports
        if r.status in OVERVIEW_TRIAGE_STATES
        or not r.review_assigned_to_id
    ]

    unowned_reports = [r for r in open_reports if not r.review_assigned_to_id]

    # Priority breakdown (P0 to P5 + not assessed)
    priorities = {'P0': 0, 'P1': 0, 'P2': 0, 'P3': 0, 'P4': 0, 'P5': 0, 'unassessed': 0}
    priority_work = {grade: {'with_work': 0, 'without_work': 0} for grade in priorities}
    for r in open_reports:
        grade = str(r.priority_grade or '').upper()
        if grade not in priorities:
            grade = 'unassessed'
        priorities[grade] += 1
        priority_work[grade]['with_work' if r.id in reports_with_work else 'without_work'] += 1

    urgent_count = priorities['P4'] + priorities['P5']

    # Review queues breakdown
    review_queues = [
        dict(
            id='unowned_reports',
            title='Reports without review owner',
            count=len(unowned_reports),
            meaning='Citizen submissions awaiting assignment to an authorized staff reviewer.',
            recommended_action='Open reports without a review owner',
            action_url=overview_report_url('unowned'),
            severity='warning' if len(unowned_reports) > 0 else 'neutral'
        ),
        dict(
            id='pending_initial_review',
            title='Reports pending triage & assessment',
            count=len(unreviewed_reports),
            meaning='Submissions awaiting staff validation, category confirmation, or urgency assessment.',
            recommended_action='Open reports needing triage',
            action_url=overview_report_url('triage'),
            severity='neutral'
        ),
        dict(
            id='urgent_reports',
            title='High-severity reports (P4–P5)',
            count=urgent_count,
            meaning='Citizen submissions assessed at urgent municipal response grades.',
            recommended_action='Inspect urgent reports',
            action_url=overview_report_url('urgent'),
            severity='danger' if urgent_count > 0 else 'neutral'
        )
    ]

    # 2. Blocked work orders
    blocked_wos = [w for w in open_wos if w.status == 'blocked']
    blocker_reasons = defaultdict(list)
    for w in blocked_wos:
        active = [b for b in w.blockers if not b.resolved_at]
        reason = active[-1].reason_code if active else 'Reason not recorded'
        oldest_date = active[-1].created_at if active else (w.updated_at or w.created_at)
        days_blocked = age(oldest_date, now) if oldest_date else None
        blocker_reasons[reason].append(dict(
            id=w.id,
            wo_number=w.wo_number,
            title=w.title,
            owner=w.assigned_to.full_name if w.assigned_to else 'Unassigned',
            blocked_since=oldest_date.isoformat() if oldest_date else None,
            days_blocked=days_blocked,
            url=f'/gov/work-orders?wo={w.id}'
        ))

    blocked_summary = [
        dict(
            reason=k,
            count=len(v),
            oldest_days=max((item['days_blocked'] for item in v if item['days_blocked'] is not None), default=None),
            items=v
        )
        for k, v in blocker_reasons.items()
    ]
    blocked_summary.sort(key=lambda x: -x['count'])

    # 3. Work awaiting verification (completed_pending_review, awaiting_verification)
    verification_wos = [w for w in open_wos if w.status in {'completed_pending_review', 'awaiting_verification'}]
    verification_queue = [
        dict(
            id=w.id,
            entity_type='work_order',
            reference=w.wo_number,
            title=w.title,
            owner=w.assigned_to.full_name if w.assigned_to else 'Unassigned',
            updated_at=w.updated_at.isoformat() if w.updated_at else None,
            days_waiting=age(w.updated_at or w.created_at, now),
            url=f'/gov/work-orders?wo={w.id}'
        )
        for w in verification_wos
    ]

    # 4. Area distribution (canonical barangay)
    area_dict = defaultdict(lambda: {'count': 0, 'urgent_count': 0, 'with_work_count': 0, 'categories': defaultdict(int)})
    for r in open_reports:
        brgy = r.location_barangay or 'Location not recorded'
        area_dict[brgy]['count'] += 1
        if r.id in reports_with_work:
            area_dict[brgy]['with_work_count'] += 1
        if str(r.priority_grade or '').upper() in {'P4', 'P5'}:
            area_dict[brgy]['urgent_count'] += 1
        area_dict[brgy]['categories'][r.category or 'General'] += 1

    areas_summary = [
        dict(
            barangay=k,
            count=v['count'],
            urgent_count=v['urgent_count'],
            with_work_count=v['with_work_count'],
            without_work_count=v['count'] - v['with_work_count'],
            top_category=max(v['categories'].items(), key=lambda c: c[1])[0] if v['categories'] else 'General',
            url=overview_report_url('area', k) if k != 'Location not recorded' else overview_report_url('unlocated')
        )
        for k, v in area_dict.items()
    ]
    areas_summary.sort(key=lambda x: -x['count'])

    # 5. Ownership distribution (work orders by assigned staff)
    ownership_dict = defaultdict(list)
    for w in open_wos:
        owner_id = w.assigned_to_id
        owner_name = w.assigned_to.full_name if w.assigned_to else 'Unassigned'
        ownership_dict[(owner_id, owner_name)].append(w)

    ownership_summary = [
        dict(
            owner_id=o_id,
            owner_name=o_name,
            total=len(w_list),
            active=sum(1 for w in w_list if w.status != 'blocked'),
            blocked=sum(1 for w in w_list if w.status == 'blocked'),
            awaiting_verification=sum(1 for w in w_list if w.status in {'completed_pending_review', 'awaiting_verification'}),
            url=f'/gov/work-orders?tab=current&assignee={o_id}' if o_id else '/gov/work-orders?tab=current&assignee=unassigned'
        )
        for (o_id, o_name), w_list in ownership_dict.items()
    ]
    ownership_summary.sort(key=lambda x: -x['total'])

    # 6. Maintenance & Public Updates exceptions
    asset_exceptions = None
    source_errors = {}
    if can(user, 'maintenance'):
        asset_exceptions = []
        try:
            flagged_assets = scoped_assets(db.query(gm.InfrastructureAsset), user).filter(
                or_(
                    gm.InfrastructureAsset.condition_score < 40,
                    gm.InfrastructureAsset.status == 'needs_inspection'
                )
            ).limit(8).all()
            for a in flagged_assets:
                asset_exceptions.append(dict(
                    id=a.asset_id,
                    name=a.asset_name,
                    category=a.category,
                    barangay=a.barangay or 'Unspecified',
                    condition_score=a.condition_score,
                    condition_tier='critical' if a.condition_score is not None and a.condition_score < 25 else 'poor' if a.condition_score is not None and a.condition_score < 40 else 'not_assessed' if a.condition_score is None else 'fair',
                    url=f'/gov/assets?asset={a.asset_id}'
                ))
        except Exception:
            asset_exceptions = None
            source_errors['assets'] = 'Infrastructure exceptions could not be loaded. Other overview sections remain available.'

    update_exceptions = None
    if can(user, 'announcements'):
        update_exceptions = []
        try:
            pending_announcements = scoped(db.query(gm.Announcement), gm.Announcement.district_id, user).filter(
                gm.Announcement.status.in_(['in_review', 'approved'])
            ).limit(8).all()
            for pa in pending_announcements:
                update_exceptions.append(dict(
                    id=pa.id,
                    reference=pa.announcement_id or f'ANN-{pa.id}',
                    title=pa.title_en or 'Draft announcement',
                    category=pa.category or 'Advisory',
                    status=pa.status,
                    url=f'/gov/announcements?selected={pa.id}'
                ))
        except Exception:
            update_exceptions = None
            source_errors['updates'] = 'Publication review exceptions could not be loaded. Other overview sections remain available.'

    # Coverage indicators
    unlocated_count = sum(1 for r in open_reports if not r.location_barangay)
    unassigned_report_count = len(unowned_reports)
    unassigned_wo_count = sum(1 for w in open_wos if not w.assigned_to_id)

    return dict(
        as_of=now.isoformat(),
        version='v1.0-2026-10-27',
        scope='Citywide (All Sectors)' if not getattr(user, 'primary_jurisdiction', None) else 'Configured District Scope',
        grain='all_open_records',
        totals=dict(
            open_reports=len(open_reports),
            open_work_orders=len(open_wos),
            blocked_work_orders=len(blocked_wos),
            awaiting_verification=len(verification_wos),
            unreviewed_reports=len(unreviewed_reports),
            urgent_reports=urgent_count
        ),
        review_queues=review_queues,
        priorities=priorities,
        priority_work=priority_work,
        relationships=relationships,
        report_intake=dict(period_days=14, timezone='Asia/Manila', series=intake_series, total=sum(intake_counts.values())),
        work_stages=work_stages,
        blocked_summary=blocked_summary,
        verification_queue=verification_queue,
        areas=areas_summary,
        ownership=ownership_summary,
        asset_exceptions=asset_exceptions,
        update_exceptions=update_exceptions,
        source_errors=source_errors,
        coverage=dict(
            unlocated_reports=unlocated_count,
            unassigned_reports=unassigned_report_count,
            unassigned_work_orders=unassigned_wo_count,
            total_open_reports=len(open_reports),
            total_open_work_orders=len(open_wos)
        ),
        limitations=[
            'Headline figures represent all currently open authorized records regardless of submission age.',
            'Report submission age is measured from initial citizen submission, not duration in present state.',
            'Reporting volume reflects citizen submissions and demand concentration, not confirmed hazard.',
            'Work distribution counts reflect recorded assignments and do not represent staff capacity or effort.'
        ]
    )
