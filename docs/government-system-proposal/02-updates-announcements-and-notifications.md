# 02 — Updates, announcements, and notifications

**Status:** Proposed. **Version/date:** 1.0 / 18 September 2026. **Owners to confirm:** Communications authority, Administrative Division nominee and engineering service owner.

## 1. Recommendation and scope

Add **Updates & announcements** to the government workspace. Staff should be able to prepare accurate notices directly from approved work records, obtain review, schedule publication, track delivery problems and correct information without losing history.

| Communication | Audience | Source and controls |
|---|---|---|
| Public service announcement | Public or a selected service area | Reviewed roadworks, access changes, service interruptions, completed works or authorized general notices |
| Private report update | Reporter or authorized case participants | Permitted case events and reviewed correspondence; never placed in the public feed by default |
| Internal staff notice | Assigned team or authorized staff | Task reminders, coordination notices and operational changes |
| External official advisory | Relevant public/staff audience | Named authoritative source, original URL, issue time and validity; staff verify applicability |

Personal notifications are delivery objects, not the official announcement record. The public notice has a canonical URL, version, issuing office, publication time and validity period. A completed-work post is not technical proof of acceptance by itself.

## 2. Publishing workflow

Proposed content lifecycle:

**Draft → In review → Approved → Scheduled → Published → Expired or Archived.**

- Review can return **Changes requested**; author creates the next version and resubmits.
- An authorized immediate release moves Approved to Published through the same checks as scheduled release.
- Approval applies to a specific immutable version, audience, language variants, channels and release plan. Material edits invalidate approval.
- Published content is corrected through a new approved revision with a visible correction note, not silently overwritten.
- Withdrawal stops future distribution, records who authorized it and why, and changes the canonical public page to an appropriate withdrawal notice. Already delivered email/SMS cannot be recalled.
- Expiry removes an item from current notices while preserving an appropriate archive. Retention/legal-hold policy controls eventual disposal; hard delete is not the normal publishing action.
- Delivery status is separate: queued, attempted, provider accepted, delivered where supported, failed, or unknown. A failed SMS does not revert an otherwise published web notice to Draft.

Store timestamps in UTC and display publication/effect times in **Asia/Manila**. Distinguish “publish on Tuesday” from “road closure begins Friday.” Before release, recheck the approved version, publisher delegation, applicable location, linked-work changes, cancellation and expiry.

## 3. Simple editor and review interface

Offer a short guided form with templates: **Planned works; Service interruption; Progress update; Work completed; General notice; Official advisory relay.**

Required fields depend on the template: title; what is happening; affected place; start/end or next-update time; what residents should do; issuing office; approved contact; supporting record; language; audience; channels. Never invent a completion date, safe alternative route, affected population or emergency instruction to fill a blank.

Allow staff to start from a case, work order, project or asset. Pre-fill verified public-safe fields and display their source. When a linked date or location changes, mark the draft/approved notice **Needs review** rather than silently changing published content.

Show a readable preview with separate English/Filipino variants and channel previews. SMS preview should estimate provider-specific segment/cost impact, especially for Unicode. Show audience definition rather than an invented recipient count. Public reach is not equivalent to registered recipients.

Primary screens:

| View | Information/action |
|---|---|
| Needs my attention | Review requests, missing facts, affected schedules, failed distributions |
| Drafts and review | Owner, linked record, version, missing requirements and next approver |
| Scheduled | Publication time, effect period, audience, channel readiness and cancellation |
| Published | Canonical link, validity, revision history, correction/withdrawal actions |
| Delivery details | Per-channel and per-attempt outcomes; controlled retry and reconciliation |

Public Updates should place active important notices first, then a clear chronological list. Provide location/date/type filters, readable details, issuing source and accessible text for every image. Avoid engagement ranking, likes, public resident profiles and unverified “people reached” claims.

## 4. Who does what

| Action | Proposed role | Required check |
|---|---|---|
| Prepare draft | Authorized administrative/communications staff or technical lead | Within assigned scope |
| Verify engineering facts | Responsible technical lead | Dates, location, work status and resident instructions have authoritative support |
| Approve public release | Named LGU publisher or delegated service owner | Correct audience, sensitivity, channels and approved version |
| Execute scheduled release | System acting under recorded approval | Approval still valid and execution conditions still true |
| Correct/withdraw | Delegated authority | Reason, impact and channel follow-up recorded |
| Review emergency communication | Actual emergency/communications authority | Confirmed local procedure and authoritative source |

The City Engineer's authority to approve engineering work does not automatically establish authority to publish every city announcement. Confirm the relationship with the city public information or communications function. Do not invent an emergency bypass before a policy is approved.

## 5. Useful AI assistance

Buttons should describe the job: **Draft from this work record; Make easier to understand; Translate to Filipino; Check missing details; Suggest a shorter SMS.**

AI receives only necessary, permitted facts and produces a draft with source links and unresolved questions. Names/contact details of residents, precise private locations, unreviewed allegations and identifying photographs are excluded from public drafts unless expressly authorized. Suggested redaction must be reviewed; the original evidence remains protected and unchanged.

A reviewer compares the draft with the source facts. Models must not add promises, claim completed inspections, fabricate quotations or generate evidence imagery. Public release remains a deterministic authorized workflow, not an open-ended AI tool action.

## 6. Existing implementation to reconcile

Targeted source inspection found two advisory API families in [main.py](../../backend/main.py) and [gov_router.py](../../backend/gov_router.py), creation/deletion in [gov_crud.py](../../backend/gov_crud.py), and an advisory interface in [GovDivisionPage.jsx](../../frontend/src/pages/GovDivisionPage.jsx). These paths do not establish the proposed review/scheduling/version lifecycle.

The report-based generation handler describes validated reports, but the inspected handler explicitly checks existence rather than establishing a validated-state gate. Verify all upstream authorization and lifecycle controls before reuse. Existing direct create and hard-delete paths need reconciliation; do not add a second independent publication store.

[NotificationCenter.jsx](../../frontend/src/components/NotificationCenter.jsx) uses sample notifications for some empty/error conditions. [notification_service.py](../../backend/notification_service.py) includes placeholder SMS/push behavior. An application log saying “Sent” is not evidence of provider acceptance. Preserve the observed prior decision to remove automatic Google News monitoring; do not revive it as an unsolicited public feed.

## 7. Acceptance scenarios

1. A drafter cannot publish outside their permission or location scope, including through direct API calls.
2. Changing an approved title, location, effect date, audience or channel produces a new revision requiring applicable review.
3. Cancelled work prevents its stale scheduled notice from releasing; staff receive an actionable explanation.
4. A worker crash and retry do not create a second public revision or uncontrolled duplicate dispatch.
5. A failed/unknown provider request is shown honestly and reconciled before resend.
6. Corrections show what changed and preserve prior versions; public/private projections never expose reporter identity by accident.
7. English/Filipino notices communicate equivalent facts, dates and actions; emergency instructions receive designated human review.
8. Current, expired, withdrawn, no-results, loading, permission-limited and failed-load states remain distinct and accessible.
