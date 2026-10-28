"""Review characterization probes: assertions describe observed defects, not desired behavior.

Run with backend/.venv/Scripts/python.exe <this file> -v. No database is opened;
all endpoint sessions are fakes and schema creation/delivery is patched out.
"""
import datetime
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'backend'))
import announcements_router as ar
import gov_models as gm
import gov_schemas as gs
import models
from fastapi import HTTPException

NOW = datetime.datetime.now(datetime.timezone.utc)


class Query:
    def __init__(self, first=None, rows=None):
        self.value = first
        self.rows = rows or []
    def filter(self, *args): return self
    def order_by(self, *args): return self
    def first(self): return self.value
    def all(self): return self.rows


class FakeDB:
    def __init__(self, values=None):
        self.values = values or {}
        self.added = []
        self.commits = 0
    def query(self, model): return self.values.get(model, Query())
    def add(self, value): self.added.append(value)
    def commit(self): self.commits += 1
    def refresh(self, obj): pass


def notice(status='published', source_report_id=None):
    return gm.Announcement(
        id=1, announcement_id='TEST-ONLY-NOTICE', title_en='Test notice',
        content_en='Test description for isolated review.', category='general_notice',
        priority='normal', status=status, target_audience='public', author_id=100,
        source_report_id=source_report_id, channels=['web'], created_at=NOW,
        corrections=[], deliveries=[],
    )


def disclosure():
    return gm.BudgetDisclosure(
        id=2, disclosure_id='TEST-ONLY-DISCLOSURE', announcement_id=1,
        version=1, publication_format='announcement', amount=123.45,
        currency='PHP', amount_type='allocated_project_budget', review_state='draft',
    )


class PlanContractProbes(unittest.TestCase):
    def test_editor_create_keys_are_silently_discarded(self):
        payload = gs.AnnouncementCreate.model_validate({
            'title_en': 'Test notice', 'content_en': 'Test description.',
            'affected_barangays': ['171'],
            'report_associations': [{'report_id': 99, 'association_state': 'confirmed_coverage'}],
        })
        self.assertEqual(payload.target_barangays, [])
        self.assertIsNone(payload.report_associations_input)

    def test_editor_association_confirmation_becomes_candidate(self):
        payload = gs.AnnouncementReportAssociationCreate.model_validate({
            'report_id': 99, 'association_state': 'confirmed_coverage',
            'association_reason': 'An actual reviewed work relationship',
        })
        self.assertEqual(payload.association_type, 'candidate')
        self.assertIsNone(payload.basis_reason)

    def test_public_projection_exposes_source_report_and_draft_disclosure(self):
        db = FakeDB({gm.BudgetDisclosure: Query(first=disclosure())})
        with patch.object(ar, '_ensure_announcement_tables'), patch.object(ar, '_resolve_official_name', return_value=None):
            result = ar._format_announcement_response(db, notice(source_report_id=99), False)
        self.assertEqual(result.report_associations, [])
        self.assertEqual(result.source_report_id, 99)
        self.assertEqual(result.budget_disclosure.review_state, 'draft')
        self.assertEqual(result.budget_disclosure.amount, 123.45)

    def test_low_authority_official_can_edit_published_budget(self):
        item = notice()
        db = FakeDB({gm.Announcement: Query(first=item), gm.BudgetDisclosure: Query(first=disclosure())})
        actor = models.Official(id=7, role='building_inspector')
        self.assertIs(ar.require_announcement_staff(actor), actor)
        with patch.object(ar, '_ensure_announcement_tables'), patch.object(ar, '_upsert_budget_disclosure_and_associations') as write, patch.object(ar, '_format_budget_disclosure', return_value={'observed': 'accepted'}):
            result = ar.update_announcement_budget_disclosure(1, gs.BudgetDisclosureInput(amount=999, source_label='Test source'), db, actor)
        write.assert_called_once()
        self.assertEqual(db.commits, 1)
        self.assertEqual(item.status, 'published')
        self.assertEqual(result, {'observed': 'accepted'})

    def test_published_disclosure_is_overwritten_without_new_version(self):
        item, disc = notice(), disclosure()
        db = FakeDB({gm.BudgetDisclosure: Query(first=disc)})
        with patch.object(ar, '_ensure_announcement_tables'):
            ar._upsert_budget_disclosure_and_associations(db, item, 7, budget_input=gs.BudgetDisclosureInput(amount=999, source_label='Changed source'))
        self.assertEqual(disc.amount, 999)
        self.assertEqual(disc.version, 1)
        self.assertEqual(db.added, [])

    def test_editor_direct_publish_from_draft_is_rejected(self):
        db = FakeDB({gm.Announcement: Query(first=notice('draft'))})
        with self.assertRaises(HTTPException) as caught:
            ar.update_announcement_status(1, gs.AnnouncementStatusUpdate(status='published'), db, models.Official(id=7, role='city_engineer'))
        self.assertEqual(caught.exception.status_code, 400)

    def test_low_authority_official_can_publish_already_approved_notice(self):
        item = notice('approved')
        db = FakeDB({gm.Announcement: Query(first=item)})
        with patch.object(ar, '_execute_channel_deliveries'), patch.object(ar, '_format_announcement_response', return_value={'observed': 'accepted'}):
            ar.update_announcement_status(1, gs.AnnouncementStatusUpdate(status='published'), db, models.Official(id=7, role='building_inspector'))
        self.assertEqual(item.status, 'published')
        self.assertEqual(db.commits, 1)

    def test_multiple_owned_reports_produce_duplicate_recipient_notices_without_target(self):
        assocs = [SimpleNamespace(report_id=i, association_type='confirmed_coverage', notified_at=None) for i in (1, 2)]
        db = FakeDB({
            gm.AnnouncementReportAssociation: Query(rows=assocs),
            models.Report: Query(first=SimpleNamespace(id=1, resident_id=42, ticket_id='TEST-ONLY-REPORT')),
        })
        with patch.object(ar, '_ensure_announcement_tables'):
            ar._execute_channel_deliveries(db, notice())
        notifications = [obj for obj in db.added if isinstance(obj, models.Notification)]
        self.assertEqual(len(notifications), 2)
        self.assertEqual([obj.resident_id for obj in notifications], [42, 42])
        self.assertTrue(all(obj.outbox_event_id is None for obj in notifications))
        self.assertNotIn('target_url', models.Notification.__table__.columns)

    def test_current_work_order_has_no_my_work_location_field(self):
        self.assertFalse(hasattr(gm.WorkOrder, 'location_string'))
        with self.assertRaises(AttributeError):
            _ = gm.WorkOrder().location_string

    def test_invalid_budget_semantics_are_accepted_by_input_schema(self):
        payload = gs.BudgetDisclosureInput(amount=-999, amount_type='arbitrary', review_state='published')
        self.assertEqual(payload.amount, -999)
        self.assertEqual(payload.amount_type, 'arbitrary')
        self.assertIsNone(payload.source_url)

    def test_default_editor_category_is_rejected_before_database_access(self):
        payload = gs.AnnouncementCreate(title_en='Test notice', content_en='Test description.', category='roadworks')
        db = FakeDB()
        with self.assertRaises(HTTPException) as caught:
            ar.create_announcement_draft(payload, db, models.Official(id=7, role='city_engineer'))
        self.assertEqual(caught.exception.status_code, 400)
        self.assertEqual(db.added, [])
        self.assertEqual(db.commits, 0)

    def test_manual_maintenance_watch_option_is_rejected(self):
        import predictive_router as pr
        class AssetQuery(Query):
            def filter_by(self, **kwargs): return self
            def with_for_update(self): return self
        db = FakeDB({pr.InfrastructureAsset: AssetQuery(first=SimpleNamespace(asset_id='TEST-ASSET'))})
        payload = pr.ConvertWORequest(asset_id='TEST-ASSET', plan_summary='Manual field inspection', review_reason='Review needed for this recorded defect', priority='WATCH')
        with self.assertRaises(HTTPException) as caught:
            pr.convert_to_work_order(payload, db, models.Official(id=7, role='city_engineer'))
        self.assertEqual(caught.exception.status_code, 422)
        self.assertEqual(db.commits, 0)


if __name__ == '__main__':
    unittest.main()
