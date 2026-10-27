# Report-to-project referral and resident notification delivery

Status: observed development implementation, 27 October 2026. Continues documents 16 and 28. The full government-side completion objective remains active.

## Direct report referral

The shared report docket now offers **Refer to project** when the server permits coordination, the report has a recorded barangay, the report is open and it has no open related project. This applies to table, map and full-record uses of the same docket.

The referral opens the existing project creation form with the ticket, report description, location and normalized barangay. It retains a safe government return URL. The server supplies context independently; a crafted URL does not grant source access. Creation checks the current report version, actual jurisdiction and matching barangay/district. A locked duplicate check rejects a second open project for the same source. Stale/closed reports cannot create a new project. Failed requests retain the form and offer a link to inspect the current report and its projects.

Creating a project leaves report status unchanged and records a public progress entry through the existing private resident notice path. Work-order referrals reuse an existing open project for the source report rather than creating a parallel duplicate. Source-report and work-status preservation remain in effect. This is engineering coordination, not funding authorization.

## Consent and delivery

The old resident notification switches persisted values but the worker did not honor them. The new resident form reads authoritative preferences and saves them with an expected version. English and Filipino copy covers channel/category choices, service availability, privacy, failure and saved state. It exposes native labeled checkboxes, disabled/loading states and a visible three-pixel focus treatment. These are implemented contracts, not a new live accessibility sign-off.

The saved controls cover:

- receiving updates;
- changes to the resident's own reports;
- city updates connected through reviewed report associations;
- in-app delivery; and
- email delivery, which is **off by default and requires explicit resident choice**.

The in-app worker checks these choices before creating a notification. Existing notices stay in the inbox. Muting future notices does not erase report history. Profile language/theme saves merge with saved preferences and cannot overwrite channel consent through a stale legacy profile payload.

Each eligible event creates at most one durable email-delivery intent. It stores the event/resident IDs and a keyed recipient-address fingerprint, not a plaintext recipient address. The worker rechecks current preference, active-account state, report ownership, publication availability and reviewed association before sending. If the address changes, it cancels the queued delivery rather than silently redirecting it. A preference or relationship change can cancel waiting mail; a send already underway may finish.

Email contains a generic English/Filipino alert and a private PULSO deep link. It does not copy report descriptions, resident names, location, internal notes, identity documents or attachments into the email. Publication content stays behind its ordinary release/access rules. Report relevance continues to require reviewed associations; proximity or repeated submissions alone do not authorize another resident's notification.

## Truthful outcomes and operations

| Recorded outcome | Meaning / next step |
|---|---|
| Queued | Eligible intent is waiting for the worker |
| Waiting for email service | Required deployment configuration is absent; no email was sent |
| Sending | One worker claimed the intent with a short lease |
| Scheduled retry | A definite transient failure received bounded exponential backoff; at most five automatic attempts |
| Accepted by email service | SMTP returned acceptance; mailbox delivery/read is not confirmed |
| Failed | Definite non-retryable failure or retry limit; authorized staff may queue a reasoned retry |
| Outcome unknown | Acceptance could not be established, or the worker stopped during a send; automatic resend is withheld to avoid duplication |
| Cancelled | Recipient, consent, ownership or publication eligibility changed |

Workers claim records with row locks and skip locked work, commit the claim before network activity, and record outcomes separately. A stable Message-ID accompanies retries. SMTP and database writes are not a distributed transaction; exactly-once external delivery is not claimed. An expired in-flight lease becomes unknown rather than being blindly resent. SMTP acceptance semantics follow the [Python 3.12 smtplib documentation](https://docs.python.org/3.12/library/smtplib.html).

In-app and email processing run in separate background loops. A slow mail service therefore does not block in-app batches. `python -m outbox_worker --once` can also process a supervised batch. The worker only calls the email sender when deployment configuration and resident consent are present.

The government Updates toolbar links to a **Notification delivery** queue for authorized operations staff. It shows scoped related-record links, outcomes, attempts, next attempts and sanitized failure reasons. It does not reveal resident email addresses or private message bodies. Failed deliveries can be queued for retry with a reason and current attempt count; unknown outcomes cannot be automatically retried through that action. The request records audit history and revalidates eligibility before queueing. Publication record summaries show both in-app and email outcomes for the released version, including subsequent reviewed related-report notices.

## Deployment configuration

The update-email feature is distinct from existing registration/recovery email. It requires all of the following:

```text
PULSO_EMAIL_NOTIFICATIONS=true
PULSO_PUBLIC_BASE_URL=https://<public-pulso-hostname>
SMTP_USER=<configured-sender>
SMTP_PASS=<sender-credential>
```

The current adapter reuses the existing Gmail SMTP SSL contract, with TLS validation and a bounded socket timeout. Public origin configuration rejects HTTP, embedded credentials, path prefixes, queries and fragments. “Configured” means required configuration exists, not that provider credentials or deliverability have been verified. Credentials are not editable or exposed in the government UI. Only commented placeholders were added to `.env.example`; the actual environment was not changed.

Phone push is explicitly **not connected**. No push provider, device registration or phone delivery is claimed. In-app notices remain usable in a mobile browser. This pass implements email and in-app delivery; phone push and deployment/provider acceptance remain open work.

Migration `16cbed05a987` adds the preference version and durable delivery table. It was applied to the disposable test database and local application database without resetting or seeding operational records. Bootstrap/schema guards now expect this head.

## Verification

- Final full guarded PostGIS suite: **213 passed**, including all referral, notification, publication, administration, settings and existing government regression cases. The earlier integration run passed 211 before the two final preference/access cases were added. Test reports are preserved per test-scope digest under the ignored `.pytest_cache` directory so a later focused check does not erase the full-run evidence.
- Subsequent focused notification checks: **20 passed**, adding explicit report-access denial and protection against stale legacy preference overwrites. Final focused notification/publication regression: **21 passed** after account-state and released-version summary refinements.
- Meaningful cases include concurrent referrals/workers, one open project, stale report versions, scope/privacy, opt-in/default behavior, in-app suppression, provider configuration, ownership/address changes, withdrawal, definite retry/backoff, unknown/interrupted outcomes, private content, stable Message-ID and reasoned retry audit. SMTP is replaced by a test transport; no real message is sent by these tests.
- Targeted new/changed government components lint without errors. The large retained ResidentDashboard has 154 existing warnings and no lint errors. Production build passes with the existing large-bundle warning.
- Authenticated local read checks returned 200 for delivery operations, publication permissions and source-report referral context. The local API uses the new schema head. The application still had one project, zero email opt-ins and zero email delivery rows; update email service status was `not_configured`. No real project creation, resident preference change, publication or external email was submitted for these runtime checks.
- The route inventory now contains **227 selected-family routes**, without duplicate method/path registrations. The two resident preference routes are outside this inventory's selected government families. Route counts are not completion certification.
- Browser access is currently disabled in Work settings. No new live visual, 320 px, keyboard, light/dark, resident bilingual or email deep-link acceptance is claimed for this pass. Prior project screenshots belong to document 28; they do not verify the new referral or delivery form. No new Figma inspection or write is claimed.

## Remaining work

Phone push/device registration, a real configured email-provider acceptance test, live referral/preferences/delivery UI verification, the retained planning/design/survey interfaces, remaining legacy financial-read/PII/scope paths, records lifecycle and the final all-route acceptance audit remain open. The missing historical project PDF identified in document 28 still needs original-file recovery.

Next access-review targets confirmed by current source inspection: legacy `design-requests` / `analysis` queries read project rows without the shared district filter; survey queries combine work/project rows outside the new workspace; staff-location reads and historical procurement reads still require scope/privacy reconciliation. These observations are pending fixes, not claims that those endpoint families are secured by this pass.

Implementation owner: repository work. Operational approvers: nominated LGU engineering, communications, administration, records and privacy owners, still to be confirmed. Version: 1. Last validated: 27 October 2026. Changes remain in the working tree; no commit or deployment is claimed.
