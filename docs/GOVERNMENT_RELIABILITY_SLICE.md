# Government report command reliability slice

**Status:** implemented and locally verified on `codex/government-finalization`, 2026-10-09. This covers the report-to-work-order pilot path; it is not a system-wide idempotency or production delivery claim.

## Contract

- Reports have a positive `version`, exposed on `ReportResponse`. ORM report updates increment it.
- `POST /api/gov/reports/{id}/approve-for-work`, report-sourced `POST /api/gov/work-orders`, `PATCH /api/reports/{id}/reject`, `PATCH /api/reports/{id}/status` (verification), `POST /api/gov/reports/{id}/request-info`, `POST /api/gov/work-orders/{wo_id}/verify` (inspection), and resident `POST /api/reports/{id}/confirm` accept `If-Match: <report version>` and `Idempotency-Key: <8–128 safe characters>`. During the legacy-client transition these headers are optional.
- A new key with a stale version returns HTTP 409 and the current version. The client must refresh and review the decision again. A reused key with a different request body returns 409.
- A matching replay returns the original approval result or the existing work order. A command receipt, civic state, timeline, audit, and outbox event commit together. The report row lock serializes competing report decisions.
- Each report status change in these paths writes one `resident_in_app_notification` outbox event using the timeline ID as its event key. The worker inserts a notification with a unique outbox reference and marks the event delivered in one transaction. A failed or interrupted transaction can be retried without a duplicate notification.

## Local operation

Run from `backend/` after configuring the local database:

```powershell
python -m alembic upgrade head
python -m outbox_worker --once
python -m outbox_worker
```

The long-running worker must be supervised in a deployed environment. Monitor pending-event age and restart failures. Do not treat an outbox row as a delivered notification until its status is `delivered`.

## Verification and remaining work

The local PostGIS database reached Alembic revision `c81a1f_report_reliability`. A focused test exercises version conflict, same-key replay, changed-body conflict, one work order, one event per resident status change, exactly-once in-app delivery, field proof, independent review, and resident closeout. The report/government access suites passed 60 tests; the frontend production build passed.

Expand this contract to the remaining consequential commands and direct notification paths. Require version/key headers only after all clients are migrated. Add production worker supervision, delivery latency alerts, concurrency tests on PostgreSQL, and deployment/rollback rehearsal before the pilot release.
