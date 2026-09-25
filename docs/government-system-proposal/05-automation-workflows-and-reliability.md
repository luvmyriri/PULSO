# 05 — Automation workflows and reliability

**Status:** Proposed. **Version/date:** 1.0 / 18 September 2026. **Owners to nominate:** Operational product owner and technical lead.

## Automation catalog

| Trigger | System action | Human control / exception |
|---|---|---|
| Report accepted | Create review task; acknowledge receipt through an approved template | Do not claim verified jurisdiction, priority or resolution |
| Review completed | Suggest responsible queue using rules and staff scope | Reviewer confirms uncertain ownership; AI cannot discard the report |
| Assignment confirmed | Notify assigned staff; create due reminders | Actual assignment must commit first |
| Due threshold reached | Notify owner, then escalate according to approved policy | Respect working calendar, pauses and approved deadline changes |
| Work marked blocked | Request blocker reason and alert coordinator | Never silently extend service deadlines |
| Field evidence submitted | Create inspection/review task | Submission is not technical acceptance |
| Inspection accepted | Update eligible linked records and prepare permitted communications | Case closure follows explicit rules; preserve unresolved related issues |
| Inspection due | Create proposed inspection task from asset history | Custodian checks asset status and existing scheduled work |
| Announcement approved | Schedule release tied to approved version | Recheck validity at execution; no AI-controlled release |
| Publication time reached | Publish canonical page; queue permitted channel deliveries | Expired/cancelled/changed content stops with an actionable state |
| Material work detail changes | Flag linked notices for review | Do not silently rewrite previously approved notices |
| Provider failure/timeout | Retry eligible failures or reconcile uncertain results | Controlled manual replay; show unknown honestly |
| Daily/weekly reporting time | Prepare scoped operational summary from defined metrics | Mark data freshness and missing inputs; no invented narrative facts |
| Model task completes | Save suggestion, sources and review state | Does not mutate engineering decisions by itself |

Service clock thresholds, escalation destinations, notification quiet hours and emergency exceptions are policy values requiring LGU agreement. They are not inferred from developer defaults.

## Implementation pattern

1. Validate the user's permission, record version and requested business transition.
2. In one database transaction, save the transition, audit event and outbox event.
3. A dispatcher claims pending outbox events and submits jobs. Repeated submission is expected and handled.
4. A worker checks the event, current record/version and execution conditions before acting.
5. Save attempt/result metadata; update authoritative outcome only when supported by evidence. Failures remain visible and recoverable.

Use at-least-once processing with idempotent effects. Do not promise exactly-once external delivery. An idempotency key should distinguish event, rule version, content/record version, recipient and channel. Enforce uniqueness in the database where applicable, not only in worker memory.

For long-future schedules, store due dates in the database and periodically claim due records with leases/locking. Do not rely on one in-memory timer or a long-lived worker process. Store UTC timestamps; calculate local schedules using Asia/Manila and the approved working calendar.

## Failure and cancellation behavior

- Retry transient failures with bounded exponential backoff and jitter; route permanent failures and exhausted attempts to a visible failure queue.
- When a provider may have accepted a timed-out request, preserve the provider reference and reconcile before resending. If reconciliation is impossible, show uncertainty and require a controlled decision.
- Recheck permissions/delegation, approval version, expiry and cancellation at execution time. Scheduled automation cannot preserve privileges indefinitely after revocation.
- Cancellation or material edits invalidate old jobs through version/state checks. Record why a job was skipped.
- Separate critical notifications from optional AI processing so provider delays do not block essential work.
- Rate-limit recipients and deduplicate reminders within a policy window. A retry must not restart a reminder sequence.
- Provide scoped pause/disable controls, failed-job inspection and authorized replay. Audit changes to automation rules and replay decisions.

## Events and audit

Proposed event fields: event ID/type, aggregate type/ID/version, actor or service identity, policy/rule version, occurred time, correlation ID and minimal necessary payload. Sensitive documents should be referenced through protected IDs rather than copied into every message.

Keep business event history separate from worker attempts. A queued request, an executed command, a provider-accepted message, a delivered message and a read acknowledgment mean different things. Metrics and UI labels must preserve those distinctions.

## Monitoring and acceptance

Monitor oldest pending outbox age, queue age, job failures, retry counts, delivery unknowns, dead letters, stale schedules, model costs and discrepancies between committed events and generated tasks. Thresholds depend on the pilot's measured workload and service expectations.

Required scenarios: duplicate event; crash before/after enqueue; crash after external acceptance; duplicate callback; invalid callback signature; revoked publisher; cancelled work; changed schedule; expired notice; provider outage; database outage; worker restart; unauthorized replay; and recipient unsubscribe where applicable.

Passing means no unauthorized transition, no lost committed event within the tested recovery scenario, controlled duplicate effects, observable uncertainty and a usable recovery path. Save test evidence and observed limitations. Recommended technical reference: [Celery tasks, retries and idempotency](https://docs.celeryq.dev/en/stable/userguide/tasks.html).
