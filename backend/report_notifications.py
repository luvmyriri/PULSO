"""Queue private notices for committed, resident-visible timeline changes."""
import gov_models as gm
import models


def enqueue_report_update(db, report_id, timeline_id):
    transaction = db.get_transaction()
    batch = db.info.get('resident_notice_batch')
    if not batch or batch[0] is not transaction:
        batch = (transaction, set())
        db.info['resident_notice_batch'] = batch
    if report_id in batch[1]: return
    batch[1].add(report_id)
    report = db.get(models.Report, report_id)
    if not report: return
    owner = report.claimed_by_user_id or report.resident_id
    if owner:
        key = f'report-status:{timeline_id}:resident:{owner}'
        if not db.query(gm.OutboxEvent.id).filter_by(event_key=key).first():
            db.add(gm.OutboxEvent(event_key=key, event_type='resident_in_app_notification', payload={
                'resident_id': owner, 'report_id': report.id, 'title': 'Your report has an update',
                'message': f'Open {report.ticket_id or "your report"} to view its latest progress. / Buksan ang iyong ulat upang makita ang pinakabagong update.',
                'target_url': f'/dashboard?tab=reports&reportId={report.id}',
            }))
    from announcements_router import _available, REVIEWED_LINKS
    publications = db.query(gm.Announcement).join(gm.AnnouncementReportAssociation).filter(
        gm.AnnouncementReportAssociation.report_id == report_id,
        gm.AnnouncementReportAssociation.association_type.in_(REVIEWED_LINKS),
        gm.Announcement.published_version.isnot(None)).all()
    for item in publications:
        if not _available(db, item): continue
        revision = db.query(gm.AnnouncementRevision).filter_by(announcement_id=item.id, version=item.published_version).first()
        released = {a['report_id']: a['association_type'] for a in revision.snapshot.get('report_associations', [])}
        if released.get(report_id) not in REVIEWED_LINKS: continue
        recipients = {}
        for assoc in item.report_associations:
            if not assoc.reviewed_by_id or assoc.association_type not in REVIEWED_LINKS or released.get(assoc.report_id) != assoc.association_type: continue
            resident_id = (assoc.report.claimed_by_user_id or assoc.report.resident_id) if assoc.report else None
            if resident_id and resident_id != owner:
                recipients.setdefault(resident_id, []).append(assoc.report_id)
        for resident_id, report_ids in recipients.items():
            key = f'related-report:{timeline_id}:publication:{item.id}:resident:{resident_id}'
            if db.query(gm.OutboxEvent.id).filter_by(event_key=key).first(): continue
            db.add(gm.OutboxEvent(event_key=key, event_type='publication_related_report_notification', payload={
                'announcement_id': item.id, 'version': item.published_version, 'resident_id': resident_id,
                'report_ids': report_ids, 'source_report_id': report_id,
                'title': 'An update connected to your report',
                'message': 'A report connected through a reviewed city update has new progress. Open the city update for context. / May bagong update sa kaugnay na ulat.',
                'target_url': f'/updates/{item.id}',
            }))
