# 06 — Data, API, and UX contracts

**Status:** Proposed contract outline, not a migration or approved endpoint specification. **Version/date:** 1.0 / 18 September 2026. **Owners to nominate:** Product, backend, data and UX leads.

## Shared records

| Record | Required meaning and relationships |
|---|---|
| Report | Original submission, reporter access, evidence, location observations and intake history |
| Case | Coordinated response linking one or more reports; accountable owner and lifecycle |
| Work order | Assigned executable job, team, dates, progress, blocker and acceptance linkage |
| Project | Larger delivery initiative containing jobs and milestones; not a physical asset |
| Inspection | Dated observations, inspector, evidence, findings and acceptance decision |
| Asset | Stable infrastructure identity, location and ownership; dated condition/maintenance history |
| Document | Version, source, access classification, linked records and retention metadata |
| Announcement | Stable public/internal notice identity and canonical location |
| Announcement revision | Immutable content, language variants, source facts, audience and release plan |
| Approval | Actor, delegation, approved revision, scope, decision, reason and time |
| Publication | Approved revision, actual release/expiry/withdrawal state and canonical URL |
| Notification / delivery attempt | Recipient/channel, payload version, consent/purpose where applicable, provider ID and observed result |
| AI suggestion | Task/model/prompt version, input references, proposed output, uncertainty and reviewer disposition |
| Audit event / outbox event | Traceable committed action and durable asynchronous intent |

Map these to existing entities before introducing new tables. Do not create parallel advisory stores because two current routes expose similar data. Historical advisories need a reviewed migration interpretation; do not fabricate past approval records.

## API behavior

Prefer explicit commands such as request-information, assign, submit-for-inspection, accept-inspection, approve-publication, schedule, correct and withdraw. Their final route names remain to be reconciled with the existing API proposal.

Each command must check authentication, server-side capability, geographic/record scope, current lifecycle, required facts and expected record version. Accept a client request key for safely retried mutations. Return the persisted record/version, allowed next actions and actual outcome; a queued notification is not a sent notification.

Define consistent conflict, forbidden, invalid-input, unavailable and uncertain-outcome responses. Concurrent edits should produce a recoverable conflict with current state. File access and exports must enforce the same permissions as record views. Public responses use an explicit field allowlist.

Keep proposed `/gov/reports/:reportId` as a UI route pending route reconciliation. A deep link must resolve authorized data independently of prior navigation; it cannot depend on a previously selected in-memory object.

## Report queue, map and detail behavior

- Use one query/scope definition for list rows, map markers and totals. Distinguish cases from reports and explain any clustering.
- Selecting a report opens a **nonmodal right-side engineering docket**. Keep the queue usable and do not trap keyboard focus as if it were a blocking modal.
- **Collapse** minimizes the docket while preserving the selected report, filters and map context. **Close** clears selection. Label these actions distinctly.
- Make the report title a real link to the full detail page. Provide a visible “Open full report” action as an additional clear affordance.
- Full details include summary, evidence, location, owner, chronology, related work/assets, correspondence, decisions and permitted next steps.
- Returning to the queue restores filters, sorting, pagination/scroll, selection and map viewport where practical. URL state must not contain sensitive data.
- On narrow screens, use a dedicated detail view or accessible full-width panel; do not squeeze a desktop drawer over an unusable list.
- After collapse/close, return focus to the appropriate control or selected row. Announce successful state changes and actionable errors.

## Geography contract

Use versioned barangay IDs and geometry from an approved source. Keep barangay, North/South operational sector, legislative district and responsible office separate. Record source/version and location certainty. Do not derive jurisdiction solely by extracting digits from arbitrary text.

For unlocated or conflicting reports, show “Location needs review” and retain them in the list and totals. Map visibility must not determine service eligibility. Full-city government coverage must not silently expand the North-focused resident service policy.

## Metric definitions to approve

| Measure | Proposed definition / caveat |
|---|---|
| Unassigned concerns | Open cases requiring assignment and lacking an accountable owner; exclude documented referrals only under agreed rules |
| Overdue actions | Active actions past an approved due timestamp after documented clock rules; do not count arbitrary status age as a legal breach |
| Awaiting verification | Submitted work with required acceptance still pending |
| Open high-priority cases | Open cases with human-confirmed priority under the approved rubric |
| Resolved in period | Cases whose authoritative resolution transition occurred in the selected period; report reopened counts separately |
| Response time | Receipt to first defined meaningful staff response; distinguish automated acknowledgment |
| Resolution time | Receipt to verified resolution, with explicit pause/reopen rules and median/percentile reporting |
| Backlog | Cases open at period end, calculated from history rather than only current status |
| Recurrence | New verified issue linked to the same asset/location/category within an agreed window; duplicate submissions are not automatically recurrence |

Store definitions/version, source fields, clock rules and exclusions in a shared metric catalog. Show scope, period, freshness, missing-data coverage and drill-through records. Compare equivalent periods; suppress misleading percentage change when the baseline is zero or insufficient. Never show sample data as a real fallback.

## Quality and accessibility contract

Every material component defines loading, first-use empty, filtered empty, partial, stale, offline, permission-limited, recoverable error, system error and success behavior, plus normal interaction states. Failed fetches cannot become legitimate empty states.

Target WCAG 2.2 AA: keyboard access, visible 3 px focus, meaningful names, non-color status cues, accessible tables, chart summaries/data access and map address/list alternatives. Verify 320 px reflow, 200% zoom, reduced motion, high contrast and light/dark meaning parity. Resident-facing English/Filipino text must preserve function and allow expansion.

Use approved Civic Aperture foundations and true-color evidence. Next design-phase action: inspect the existing [PULSO Figma file](https://www.figma.com/design/1qPgPj4o3smElv8B2B1REi), reconcile the documented templates with the live structure, then specify reusable docket, publication review, metric and map patterns. No Figma changes were made in this documentation phase.
