# Report routing, formal letters and external coordination

Status: implemented local pilot, 2026-10-27. This records observed software and the project owner's explicit implementation choices; it is not a declaration of official LGU signing authority or a production deployment.

## User-approved scope

- All functions stay inside Reports. There is no External Referrals sidebar destination or standalone application page.
- A report docket shows its Routing tab and controls only when its server-projected permissions permit them. Ineligible accounts receive no tab/control and their API calls are rejected.
- Outgoing letter approval is explicitly delegated to City Engineer and Assistant City Engineer for this pilot. A draft's creator cannot approve it.
- Keep report review ownership, field-work ownership, external coordination ownership, transport acceptance, receiving-office acknowledgment and report resolution separate.

## Implemented experience

Open a report, then use Routing or the permitted Route to another office action. The component lives in the existing docket in queue/detail, map/detail and full-report contexts. Existing filters and report selection are preserved. `reportTab=routing` and `referral=<id>` deep links open the same report; `routingView` and `referralPage` are independent of the Reports queue filters.

Within the report: prepare/edit a draft; select an active sourced recipient and named CED follow-up owner; record reviewed facts, reason, requested action and next follow-up; acknowledge the disclosure review; preview/download the letter; obtain separate approval; explicitly queue email or record manual handoff; record acknowledgment, refusal, follow-up and external response; close coordination; independently verify report resolution where permitted.

The report-scoped list includes All referrals, Assigned to me and Follow-up overdue. My Work includes the owner's coordination task and eligible approvers' pending decisions. Notifications link back to the original report. A declined/cancelled referral can be rerouted into a linked draft; the previous record and events remain, with the previous referral marked superseded.

## Data and permissions

New tables: `referral_recipients`, `external_referrals`, `referral_packets`, `referral_events`, `referral_deliveries`. Additive Alembic revision: `17def006ba98`. Bootstrap scripts, guarded test revision and normalized schema inventory were advanced with it.

Permissions are enforced by `external_referrals.grant` and projected in the report docket as `referral_permissions`. Explicit `referrals` action lists override defaults. Default preparers are dispatcher, city/asst city engineer, operations manager, project engineer, administrative officer/clerk and records officer. Platform directory management is separate from operational preparation/approval. `referrals:view` is required for delegated access; independent external-outcome verification also requires `referrals:verify` (or the role default), existing verification authority, and a different employee from the referral owner. Mutations recheck active account, scope, version, role grants and state.

Directory maintenance requires `settings_manage`. Recipient changes are versioned and audited, and invalidate unsent packets using an older directory version. Each recipient has a verification source, date, optional email and phone. No email is fabricated for phone-only offices. System-imported public contacts have no staff verification actor; the audit identifies the sourced import instead of impersonating an official.

Approval requires a hash of the current preview and creates immutable PDF bytes, a packet snapshot and SHA-256 hash. Every approved packet remains downloadable under the authorized report, including after a draft revision. Historical packets cannot be retrieved through another report/referral. Downloads are authenticated and `private, no-store`; no files are placed in public uploads.

## Lifecycle and failure paths

Coordination states: draft, approved, awaiting acknowledgment, acknowledged, declined, response received, coordinated closed, cancelled, superseded. Transport states: not sent, queued, sending, provider accepted, failed, delivery unknown. These are separate fields; SMTP acceptance does not claim delivery or responsibility acceptance.

The durable email worker rechecks the packet, approval delegation, source version, sender/reply mailbox, recipient version and queued employee's authority before transmitting. Each queue operation is protected by the referral version and a row lock. A failed send requires an explicit retry. Interrupted/uncertain delivery never automatically resends; a staff member must reconcile it with a recorded reference. Worker and interactive commands lock referral before delivery to avoid lock-order inversion.

Open/declined referrals block automatic resolution from linked work-order verification and project resolution. Closing a referral's coordination task does not change the original report. A separate independent outcome decision requires an evidence reference, explicit confirmation, source-version match, and no remaining linked work, projects or active referrals. It uses the existing report lifecycle notification/audit mechanism.

Filtered-empty and first-use states, failed fetches, stale commands, inactive contacts, unavailable owners, missing approval delegation, disabled email, uncertain transport, manual-only handoff and unsupported transitions have explicit messages or denied actions. Failed fetches are never represented as a valid empty queue. A refresh/retry preserves draft inputs on command failure; persisted drafts survive later visits. There are no destructive delete endpoints.

## Formal letter and disclosure

The generated A4 PDF contains the City/Department identity, draft/approved label, reference and preparation date, recipient, original ticket reference, recorded location, manually reviewed summary, referral reason, requested action, coordination owner, follow-up date, reply channel and preparer/approver names. It does not invent signatures or claim recipient acceptance. Drafts are clearly marked. Only the approved PDF is attached to an outgoing email; resident identity, contact details and original evidence are never attached automatically. The text preview identifies the same packet fields; the PDF download is authoritative for pagination.

This version does not import mail replies automatically, send reminder emails automatically, add evidence attachments, generate digital signatures or make AI jurisdiction decisions. Staff record real acknowledgments and responses with their references. Overdue follow-up is exposed in the report and My Work queues.

## Contact configuration and provenance

The project owner supplied these contacts. They were imported idempotently by `backend/scripts/configure_referral_contacts.py --apply`; existing entries are not overwritten.

- Caloocan CEMD / City Environmental Management Department: no verified email, `(02) 8288-8811 local 2275`; the [City directory](https://caloocancity.gov.ph/about-us/directory/) confirms local 2275. Manual handoff remains required.
- Meralco: `customercare@meralco.com.ph`, `(02) 16211`; confirmed against its [official contact page](https://www.meralco.com.ph/residential/help-support/contact-information).
- Maynilad: project-owner supplied `customer.helpdesk@mayniladwater.com.ph`, hotline `1626`. The email is corroborated by the MWSS-hosted [Maynilad business plan, chapter 5, p.5-15](https://ro.mwss.gov.ph/wp-content/uploads/2023/11/Final-Business-Plan-for-the-6th-RR-Period-2023-2037_23Mar23.pdf); the [current contact page](https://www.mayniladwater.com.ph/contact-us/) confirms hotline 1626. Confirm suitability of a public customer-care channel for each actual referral.

These contacts do not imply an integration agreement or automatic responsibility for any report category.

## Runtime setup

Install backend requirements and run `alembic upgrade head` in `backend/`. The local database has been migrated. The local backend configuration includes `PULSO_REFERRAL_APPROVER_ROLES=city_engineer,asst_city_engineer` following the user's choice.

External email is disabled by default. Before enabling it, configure an approved sending mailbox (`SMTP_USER`, `SMTP_PASS`), a monitored `PULSO_REFERRAL_REPLY_TO`, optional `PULSO_REFERRAL_SMTP_HOST` / `PULSO_REFERRAL_SMTP_PORT` (SSL), and set `PULSO_REFERRALS_ENABLED=true`. Restart the backend after environment changes. No outbound referral was queued or sent during implementation.

## Validation and handoff

- 121 integration checks passed across referral, project-coordination and government-workspace suites, using the guarded disposable PostGIS database. Final worker lock-order changes were rechecked with all 18 referral tests passing. Providers were mocked; there were no external sends or live report mutations.
- Targeted frontend lint, production build and the design detector passed. Existing bundle-size/test deprecation warnings remain.
- The real signed-in City Engineer sees routing inside report PUL-2025-0001. The separate navigation entry/page are absent. The CEMD/manual option and employee selector were checked without saving a live draft.
- At 320 CSS px the embedded form is single-column with no horizontal overflow. Desktop and dark views were checked; viewport and theme restored. Keyboard opening focuses the form heading; confirmation dialogs retain existing escape/cancel/focus-return behavior. Forced-colors uses native boundaries. No motion was introduced; resident localization is not applicable to this staff-only surface.
- A clearly marked sample letter was rendered and inspected as a complete one-page A4 PDF. It is not an issued official document: `output/pdf/sample-referral-letter.pdf`.
- Figma: the previously inspected shared file remains view-only and official Figma write tools are unavailable. No Figma change is claimed. Next action is to carry the permission-gated Routing state and paired light/dark report-docket composition into the existing Core Library / government template, preserving the source and state annotations.

Implementation owners for rollout: City Engineering workflow owner for delegation, templates and closure policy; City IT for mailbox/transport configuration; authorized directory administrator for contact verification; product team for the pending Figma reconciliation. These external rollout actions do not change the implemented backend authorization rules.
