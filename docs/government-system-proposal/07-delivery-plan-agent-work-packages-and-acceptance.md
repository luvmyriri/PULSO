# 07 — Delivery plan and agent work packages

**Status:** Proposed plan, not implementation authorization. **Version/date:** 1.0 / 18 September 2026. **Owners to nominate:** Sponsor, operational product owner and technical lead.

## Delivery approach

Build a limited pilot around real report-to-work-to-inspection tracking, a useful daily dashboard and controlled publishing. Treat advanced prediction, citywide asset surveying, procurement integration and social publishing as separately gated expansions.

An indicative 12–16 week pilot assumes two engineers, shared design/QA/product support, part-time data/GIS support, weekly LGU access and timely approvals. This is an initial planning range, not a committed estimate. Added publishing, data repair and integration requirements must be estimated after discovery; they may extend it. Do not squeeze every proposed capability into that range.

| Stage | Deliverable | Exit condition |
|---|---|---|
| 0. Validate and decide | Current-state evidence, workflow mapping, role/policy decisions and pilot scope | Named owners approve the critical decisions in document 08 |
| 1. Establish truthful state | Permissions, lifecycle reconciliation, real outcomes, geography and reliable data contracts | No false success/sample fallback in pilot journeys; recoverable failure states |
| 2. Deliver daily operations | Queue/map/docket/detail, work/inspection links, minimal Assets and role-based Today | Staff complete representative end-to-end jobs with traceable records |
| 3. Publish and automate | Draft/review/schedule/correct workflow; outbox/jobs; actual channel outcomes | Approval, retry, cancellation and privacy scenarios pass |
| 4. Add evaluated assistance | Grounded drafts, summaries, extraction and vision suggestions | Local evaluation and privacy controls meet approved gates |
| 5. Improve planning | Validated workload forecasts and maintenance recommendations | Beats agreed baselines with usable uncertainty; qualified staff accept usefulness |

Discovery/specification packages may proceed independently where they do not assume unresolved policy. Product implementation remains gated by explicit authorization and approved dependencies.

## Bounded work packages for future agents

| ID / assignment | Inputs and output | Dependencies and acceptance |
|---|---|---|
| GOV-01 Current-state reconciliation | Inspect relevant routes/models; produce observed-vs-proposed map and migration risks | Read AGENTS/PRODUCT first; distinguish source observations from runtime claims |
| GOV-02 Roles and workflow | Draft capability-by-action/scope matrix, state transitions, delegations and exception paths | LGU decisions required; no invented org chart or statutory deadlines |
| GOV-03 Data and geography | Entity relationships, field dictionary, canonical IDs, import/geometry rules | GOV-01/02; no parallel advisory/asset store, unknown locations retained |
| GOV-04 UX and Figma | Queue/docket/detail, Today, Assets, analytics and publishing specifications | GOV-02/03; mandatory skills/live Figma reconciliation, full responsive/state contract |
| GOV-05 Publishing | Version, approval, schedule, correction and private/public projections | GOV-02/03; document 02 acceptance scenarios and safe migration of existing advisories |
| GOV-06 Automation | Outbox, job policies, monitoring, delivery adapters and recovery runbook | GOV-02/03/05; failure-injection and replay scenarios from document 05 |
| GOV-07 Operational analytics | Metric catalog, reconciled queries, chart summaries and data-quality views | GOV-03; counts match underlying records, no random probabilities or sample fallback |
| GOV-08 AI evaluation | Labeled evaluation set, candidate comparison, cost/review analysis and model decision record | Approved data handling; document 03 gates and reproducible configurations |
| GOV-09 External integrations | Connector contracts and controlled integration tests | Named account owners/access; no inferred availability or uncontrolled synchronization |
| GOV-10 Pilot assurance | End-to-end acceptance, accessibility, permission tests, restore/recovery evidence and pilot feedback | Relevant packages complete; owner signs release with documented limitations |

Agents should not simultaneously modify shared schema/lifecycle/permission contracts without an assigned integration owner. Each package returns a concise evidence log and unresolved decisions. Subsequent implementation agents must receive an explicit coding request; these work descriptions alone do not provide it.

## Copyable assignment template

> Work on GOV-[ID] from docs/government-system-proposal. Read README.md, the relevant package documents, AGENTS.md and PRODUCT.md. Treat all unapproved roles, routes, lifecycles and technologies as proposals. Re-inspect current sources and document drift. For this assignment, produce documentation only unless the user explicitly authorizes implementation. Return artifacts, evidence, acceptance coverage, unresolved decisions and next dependencies. Preserve existing user changes. Do not publish, provision services, send messages or claim approvals that have not occurred.

## Pilot acceptance journeys

1. Receive a report, request information, assign a real team, capture evidence, inspect, resolve and communicate; every step persists and is authorized.
2. Open a report from the map, collapse/reopen the docket, open the linked detail page and return with context intact.
3. Keep an unresolved-location report visible; correct geography without losing original evidence/history.
4. Reject an attempted out-of-scope read, export, assignment, approval and attachment fetch, including direct API calls.
5. Draft a bilingual planned-work notice, return it for correction, approve a specific version, schedule, publish and amend with history.
6. Cancel the underlying work before release; prevent stale publication and explain the blocked job to staff.
7. Simulate provider timeout and worker restart; show uncertainty and reconcile without uncontrolled duplicate delivery.
8. Deny/disable AI and continue through manual intake and templates. Reject instructions embedded in a submitted document.
9. Reconcile dashboard counts with authorized source records; distinguish unavailable, partial and genuinely empty data.
10. Complete core journeys by keyboard and at narrow/zoomed layouts; verify language and light/dark parity.

## Rollout and rollback

Use a limited service/team/geographic pilot with nominated users and support contacts. Start integrations in test/sandbox mode and AI in shadow mode. Reconcile imported records and migrated permissions before live cutover.

Use feature flags for optional AI, external channels and predictive views. A rollback must retain committed civic records and publication history. Disable new dispatch when needed, reconcile in-flight messages and keep manual work available. Test backups through restore, not merely successful backup-job logs.

## Measures of success

Establish a baseline before rollout: time to assign, staff steps per representative job, record completeness, time awaiting inspection, publishing turnaround, failed/unknown deliveries, AI correction effort and support incidents. Report changes with workload/context rather than attributing every difference to the system. Targets require owner agreement; no efficiency percentages are claimed in this proposal.
