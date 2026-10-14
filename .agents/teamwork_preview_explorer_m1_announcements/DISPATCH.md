# DISPATCH: Milestone 1 Explorer — Announcements Lifecycle & Router

## Assigned Role: Announcements Architecture Explorer
## Working Directory: c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_announcements
## Parent: teamwork_preview_orchestrator_2
## Source Documents:
- `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_orchestrator_2\PROJECT.md`
- `c:\Users\Val\Desktop\PULSO\.agents\ORIGINAL_REQUEST.md` (section ## 2026-09-18T15:00:42Z)
- `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_survey_be\survey_backend_report.md` §4
- `c:\Users\Val\Desktop\PULSO\docs\government-system-proposal\02-updates-announcements-and-notifications.md`

### Objective
Produce a complete implementation blueprint for the Governed Announcements module on the backend:
1. Define SQLAlchemy models in `gov_models.py` (or `models.py`):
   - `Announcement`: `id`, `title_en`, `title_fil`, `content_en`, `content_fil`, `category`, `priority`, `target_audience`, `target_districts`, `target_barangays`, `status` (`draft`, `in_review`, `approved`, `scheduled`, `published`, `expired`, `withdrawn`), `author_id`, `approved_by_id`, `scheduled_at`, `published_at`, `expires_at`, `created_at`, `updated_at`.
   - `AnnouncementCorrection`: `id`, `announcement_id`, `editor_id`, `correction_summary`, `reason`, `created_at`.
   - `AnnouncementDelivery`: `id`, `announcement_id`, `channel` (`web`, `sms`, `email`), `status` (`pending`, `delivered`, `failed`), `recipient_count`, `delivered_at`.
2. Define Pydantic schemas in `gov_schemas.py`:
   - `AnnouncementCreate`, `AnnouncementUpdate`, `AnnouncementResponse`, `AnnouncementStatusUpdate`, `AnnouncementCorrectionCreate`.
3. Specify `backend/announcements_router.py` endpoints:
   - `GET /api/gov/announcements` (filtered by status, channel, date)
   - `POST /api/gov/announcements` (create draft)
   - `GET /api/gov/announcements/{id}`
   - `PUT /api/gov/announcements/{id}` (edit, only allowed for draft/in_review)
   - `PATCH /api/gov/announcements/{id}/status` (lifecycle transitions: review, approve, publish, expire, withdraw)
   - `POST /api/gov/announcements/{id}/corrections` (append immutable timestamped correction notice)
   - `GET /api/gov/announcements/{id}/deliveries` (per-channel stats)
4. Specify mounting in `main.py` and test cases for pytest.

Write your report to `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_announcements\announcements_plan.md` and `handoff.md`. Communicate back via `send_message`.

## 2026-09-18T15:11:58Z
User Request:
You are the Announcements Architecture Explorer for Milestone 1.
Your working directory is: c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_announcements
Read your dispatch instructions in c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_announcements\DISPATCH.md.
Design the complete models (Announcement, AnnouncementCorrection, AnnouncementDelivery), schemas, and announcements_router.py supporting the 6-stage lifecycle, bilingual en/fil fields, immutable timestamped corrections, and per-channel tracking.
Write your plan to c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_announcements\announcements_plan.md and handoff.md.
Notify your parent (teamwork_preview_orchestrator_2) via send_message when complete.
