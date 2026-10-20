# Government Sprint 0 and pilot implementation backlog

**Status:** Proposed, ready for owner review; not implementation authorization. **Version/date:** 0.1 / 5 October 2026. **Companion:** [sprint roadmap 14](14-government-sprint-roadmap-and-release-plan-2026-10-05.md). **Planning assumption:** two-week sprint; actual capacity and dates to be confirmed. **Product code/Figma:** unchanged in this documentation phase.

## 1. Working agreement

The pilot is a report-to-work service slice, not a promise to finish every government module. Order tickets by dependency and risk. A ticket is an implementation candidate only after the relevant LGU owner approves the policy and the [Definition of Ready](14-government-sprint-roadmap-and-release-plan-2026-10-05.md#7-definition-of-ready-done-and-finalization) is met. Otherwise deliver the decision/evidence artifact and mark the implementation ticket **Blocked**.

| Role to nominate | Decision or evidence owned |
|---|---|
| Government product/service owner | Pilot boundary, priority, release and resident-facing outcome |
| Triage/work process owners | Assignment, inspection, closure, exception and duty practice |
| Backend/data integration lead | One entity/lifecycle/API/migration/outbox authority |
| Design/Figma and frontend lead | Civic Aperture, shared components, state/responsive/theme contract |
| QA/accessibility lead | Traceability, independent negative/end-to-end and assistive-technology evidence |
| Security/privacy and records owners | PII/evidence scope, retention, legal hold, audit and release |
| GIS/data steward | Official geography, asset source, uncertain location handling |
| Release/support owner | Environment, flags, incident, restore/rollback and pilot support |

## 2. Sprint 0: evidence and decision backlog

The output of S0 is a **reviewable implementation packet**, not code. Suggested IDs make it possible to assign work without confusing these tasks with the older GOV-01–10 package names.

| ID / candidate owner | Work product | Acceptance evidence and exit |
|---|---|---|
| **GOV-S0-01 Baseline** / technical lead + QA | Select the integrated government branch/SHA; inventory current routes, API operations, models, migrations, workers, notifications, file access and active feature flags. Recheck the historical GOV-BLK-001–015 register and local documents 11–13 against that SHA. | Observed/proposed/approved columns, reproducible URLs or source references, severity and owner; obsolete findings closed only with evidence. No secrets copied into the packet. |
| **GOV-S0-02 Workflow study** / process owner | Walk 20–30 recent or representative cases across routine, urgent, duplicate, ambiguous location, blocked field work, referred, inspected and reopened paths; note source channels and handoffs. If real cases are unavailable, record a smaller sample and label synthetic walkthroughs. | Case-flow map, exceptions, staff roles actually observed, source/evidence limits, delay/volume baseline or explicit data gap. No invented SLA. |
| **GOV-S0-03 Policy decisions** / government owner + DPO/records | Nominate owners and open GOV-D01–D11; decide the pilot report/work-order transition subset, eligible teams, assignment/inspection separation, evidence and PII classification, retention/hold, resident-safe projection, and emergency boundary. | Dated decision record for each pilot-critical choice; unresolved decisions have accountable owner, due review and blocked ticket IDs. Ten- versus thirteen-stage project fork remains open outside pilot. |
| **GOV-S0-04 Data and environment** / backend/data + release | Verify clean database migration and supported upgrade, representative scoped accounts, locations, evidence, event history, backup/restore path, provider sandbox, and permission to use data. | Reproducible environment inventory and fixtures with labeled sample data; migration/restore failures become P0/P1 defects, not hidden setup work. |
| **GOV-S0-05 Pilot charter** / product + QA | Choose cohort, geography, monitored hours, support contact, feature flags, user journeys, baseline measures, acceptance and no-go rules. | Signed draft charter with the S2–S6 pilot boundary, manual fallback and owner for each critical workflow. |

### Sprint 0 review demonstration

Show one existing report's route/API/event chain and one failed or unauthorized path against the selected baseline. Present the decision ledger and the top implementation risks. S0 is complete when every P0 decision has an owner and no observed code behavior is misrepresented as approved policy; unresolved P0 choices keep dependent implementation blocked.

## 3. Sprint 1: contract, Figma, and test backlog

| ID / candidate owner | Work product | Acceptance evidence and exit |
|---|---|---|
| **GOV-S1-01 Canonical pilot contract** / process + backend/data | One report/case/work-order relationship, durable IDs, source→target commands, reason/evidence/approver, resident projection, and legacy-state migration map. | Transition table covers received, under review, needs information, duplicate/outside scope, assignment, blocked work, completion pending inspection, rework/accepted, resolved/follow-up; owners approve exact pilot subset. |
| **GOV-S1-02 Authorization contract** / security/privacy + backend | Capability × jurisdiction × assignment × entity state × field/query/export/evidence matrix; session revocation and PII reveal/audit rules. | Allow/deny fixtures include anonymous, resident, inactive, cross-scope, delegated, direct API and file URL cases; no UI-only permission. |
| **GOV-S1-03 API and event contract** / backend + frontend + QA | Versioned operations, schemas, pagination/filter/sort, structured errors, operation ID, optimistic version/409 recovery, audit event, transactional outbox and delivery states. | Contract fixtures for accepted, validation, denied, stale, conflict, provider unknown, partial and retry; one mutation states exactly what committed and next owner. |
| **GOV-S1-04 Core/Figma reconciliation** / design lead | Inspect live shared file and reviewer-final government template; resolve semantic alias map and components for shell, queue/docket, evidence, Signal Cut, map/list, decision, feedback, notification and tables. Produce paired pilot frames and annotations. | Structural and visual validation, component/version links, light/dark, 320 px/200% zoom, keyboard/focus/announcement, true-color evidence and privacy notes. Figma limitations and sample content remain labeled. |
| **GOV-S1-05 Test and release design** / QA + release | Golden report-to-work journey, denied/adversarial matrix, offline/conflict/provider failure, migration/restore/rollback, accessibility and UAT protocol. | Every pilot acceptance criterion maps to automated/manual evidence, fixture, owner, environment, flag and release no-go rule. |

S1 exits when product/process, design, frontend, backend, QA, security/privacy, records and release owners agree on a versioned packet. A route mockup alone cannot close S1.

## 4. Pilot implementation slice backlog for later authorization

These are **future implementation tickets**, ordered to create persisted outcomes. Their file paths and API operations are deliberately deferred until S0 re-inspection and S1 contract approval.

| ID / planned sprint | Slice and acceptance contract | Required negative/recovery proof |
|---|---|---|
| **GOV-P01 / S2** | Staff access and active session: only server-authorized routes, fields and commands appear; deep links preserve intended government destination. | Anonymous/resident/inactive/cross-jurisdiction requests fail closed; revoked token cannot continue; denial never redirects to resident UI. |
| **GOV-P02 / S2** | Secure evidence/document access, versioned records, audit and outbox foundation; migration preserves existing civic history. | Direct file URL and export denial; accepted command writes one attributable event and one outbox record; replay does not duplicate side effects; restore/rollback tested. |
| **GOV-P03 / S3** | Scoped queue and engineering docket: real ticket, issue, source, freshness, owner, evidence and map/list; URL-safe scope/filter/selection. | Failed fetch versus true/filtered empty, partial/stale/offline, denied fields, unknown location, keyboard and narrow layout; no invented coordinate or nested interactive row. |
| **GOV-P04 / S3** | Triage command: verify, request information, duplicate or outside-scope disposition with reason, consequence, resident-safe event and next owner. | Illegal transition, version conflict, unavailable reviewer, failed notification and safe retry; no arbitrary status dropdown. |
| **GOV-P05 / S4** | Eligible assignment and work-order creation with explicit team, scope, priority and authoritative clock when approved. | No hard-coded assignee; no eligible team leaves an owned escalation; duplicate operation ID has one outcome; unapproved P0–P5 targets never display as law. |
| **GOV-P06 / S4** | Field evidence, blocker and independent inspection/rework/acceptance; case close derives from validated proof. | Executor cannot self-certify; missing proof blocks close; offline/replay/conflict and blocked work preserve safe input and next action. |
| **GOV-P07 / S5** | Resident projection and notification outbox: public language explains actual stage; channel results are queued/accepted/failed/unknown as evidenced. | Provider timeout, worker restart, revoked approval and duplicate retry do not claim delivery or resolution; PII is absent from ordinary SMS/public text. |
| **GOV-P08 / S5** | My Work/Today pilot summary draws from scoped real tasks and source-record definitions. | Counts reconcile to permitted records; stale/partial/unavailable distinguished; chart summary and data table; no sample or random operational metrics. |
| **GOV-P09 / S6** | Pilot assurance, training and rollback rehearsal with representative roles and a bounded cohort. | Full golden journey, P0/P1 register disposition, accessibility and privacy review, migration/restore, provider failure, support handoff and signed go/no-go packet. |

## 5. Dependency map and first decisions to schedule

```text
GOV-S0-01/02/03/04 → GOV-S0-05
GOV-S0 decisions → GOV-S1-01/02/03/04/05
S1 approved packet → GOV-P01/P02 → GOV-P03/P04 → GOV-P05/P06 → GOV-P07/P08 → GOV-P09
```

Design and API fixtures can be worked on together during S1. Shared schema, lifecycle and permission changes must have one integration owner. Staff research for records/referrals, publishing, GIS/assets and finance may begin during the pilot, but their production slices remain gated as described in [roadmap 14](14-government-sprint-roadmap-and-release-plan-2026-10-05.md#5-critical-path-and-decision-ledger).

**Schedule first:** government product/service owner; triage/work/inspection process owners; DPO and records owner; technical integration lead; representative staff for a workflow review. Then obtain the current Citizen's Charter, role/delegation evidence, approved retention and evidence rules, official geography, and a supported test environment. Do not infer missing approvals from current application behavior.

## 6. Sprint review packet template

For each ticket or slice, attach:

```text
Ticket ID, version, status and branch SHA:
User/job and durable outcome:
Approved/proposed/observed decision IDs:
Process/delivery owner and reviewers:
Authoritative entity, record version, transition and next owner:
Capability, jurisdiction, field/query/export and evidence scope:
Figma frame/component/version and responsive/theme/state behavior:
API schema, fixture, error/idempotency/concurrency and audit/outbox effects:
Loading/empty/stale/partial/offline/denied/conflict/provider/system/success evidence:
Keyboard/focus/announcement, 320 px, 200% zoom, forced colors, reduced motion:
Automated tests, staff UAT and defect disposition:
Telemetry, flag, migration, compatibility, rollback and support note:
Open decisions and release impact:
```

This packet is the handoff. A screenshot, toast, or meeting note alone is not proof of completion.
