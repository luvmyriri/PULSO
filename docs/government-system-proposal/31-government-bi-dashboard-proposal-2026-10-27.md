# PULSO government BI dashboard proposal

**Status: Implemented in the local development workspace (27 October 2026); detailed product decisions remain proposed.** Operations overview is routed at `/gov/overview` and backed by `GET /api/gov/overview`. No production deployment or LGU acceptance is claimed.

Audience: City Engineering leaders, division supervisors and delegated coordinators. Primary job: understand department work, identify the specific delay or coverage gap, and open the records needed for a decision. Version 1, 27 October 2026. Product owner: PULSO; operational decision owners: LGU engineering, dispatch, records and communications representatives, still to be confirmed.

This proposal follows [document 16, section 7](16-government-core-workflow-navigation-and-disclosure-research-2026-10-23.md), the approved Civic Aperture direction and the user's requirement to keep the Reports design. The detailed dashboard, routes and definitions below remain proposals until reviewed. This is not a claim of production data quality or measured City performance.

## Purpose and navigation

Use the visible name **Operations overview**. “BI dashboard” can remain the technical feature name in documentation. Staff should be able to understand the navigation without knowing the term BI.

| Destination | Question it answers | Intended use |
|---|---|---|
| My work | What needs my action? | Personal assignments and decisions |
| Operations overview — proposed | Where does department work need attention? | Supervisor/coordinator review across authorized records |
| Reports | What happened to this reported concern? | Evidence, location, owner, severity and report decisions |
| Work orders / Projects | What must be done, by whom, and what is preventing it? | Delivery, dependencies, evidence and verification |
| Report analysis | Where are reporting patterns worth investigating? | Area/category/period comparisons with record drill-through |
| Predictive maintenance | Which assets need an engineering review next? | Condition, linked concerns and maintenance history |

The overview should have its own proposed `/gov/overview` route and server-authorized navigation item for eligible users. Keep My work as the personal workspace; do not relabel it as an executive dashboard. Do not silently change existing bookmarks or the default landing until that navigation decision is approved. Field staff should retain their focused personal workflow rather than an automatic department-wide view.

**Observed today:** `/gov/dashboard`, `/gov/my-dashboard`, `/gov/my-work` and `/gov/today` render My work. The repository retains a `GovBiDashboard.jsx` file, but that file is not the dashboard route's current implementation. Existing Report analysis supplies useful scoped tables; its report counts are a received-period cohort grouped by current status. That is not an all-age operational backlog or a historical flow chart.

## Screen arrangement

Reuse the shared government header, typography, mineral/white work surfaces, Field Blue actions and restrained status colors. The selected Reports record remains the reference for density and operational clarity. Do not add a second design language, decorative KPI cards, a colored chart wall or an AI-chat landing.

At wide widths:

1. **Header:** Operations overview; account, notifications and theme controls in the shared positions.
2. **Scope row:** recorded jurisdiction, source as-of time and Refresh. A compact period control applies only to explicitly labeled period-based views.
3. **Work needing attention:** the dominant ruled table, with simple proportional bars where useful. Rows identify a concrete queue, reason, age basis and “Open records” action.
4. **Area and ownership review:** two related views or a short tab switch, using a horizontal bar/table and an ownership-by-state matrix. Avoid two unrelated full dashboards stacked together.
5. **Maintenance and resident communication:** compact, separately labeled exception lists with links to existing modules.
6. **Data coverage:** a short list of missing location/ownership/history that can change interpretation. Expand definitions and provenance on request.

A summary strip may state plain factual counts beside their labels, but only when they reconcile with a source queue. It should not be a row of oversized performance scores. The dominant question is what the coordinator can investigate or act on.

Maps stay in the Reports map and asset investigation workflows. Selecting an area opens the relevant reports/map with preserved scope and filters. Do not duplicate the full interactive map on the overview by default. A later area view needs a specific spatial decision before an additional map is justified.

On narrow or zoomed layouts, use one column and one visible section at a time. Keep the question, value, meaning and record action together. Wide matrices need an accessible list/table alternative; the page must not shrink the desktop grid into tiny charts.

## Decision views

| Question / visible title | View and record grain | What the relationship means | Supported next action | Necessary limit |
|---|---|---|---|---|
| Which reports are waiting for review? | Current open reports by review state and staff-assessed P0–P5; counts plus age table | Identifies unowned, waiting or older submissions for investigation | Open the exact report queue; assign/reassign an eligible reviewer; inspect the report | Submission age is not time in the present state. AI urgency is a separate advisory field. More reports do not imply greater danger |
| What is preventing field work? | Current blocked work orders grouped by recorded reason, with oldest known blocker | A shared dependency may need supervisor attention | Open the affected work orders and recorded blockers | Unknown reason and missing blocked-since remain visible; do not invent a duration |
| What is waiting for verification? | Work orders/projects awaiting an independent decision; separate grains | A completion claim still needs acceptance or return for work | Open the verification docket and evidence | A completion submission is not a verified resolution. Do not combine work and project counts into “resolved reports” |
| Where is work concentrated? | Current open reports by canonical barangay and category; bars with an accessible table | Shows where reported demand deserves investigation | Open the exact reports, optionally in the existing map | Reporting volume is not prevalence or hazard severity. Unlocated reports remain in totals and in a separate row |
| Who needs coordination support? | Open assigned work and blocked work by actual employee ID and state | Reveals ownership and dependencies that merit a conversation | Open owned jobs or the eligible assignment workflow | Counts are not capacity, effort, attendance, quality or staff performance; no leaderboard |
| Which assets need review? | Assets with recorded condition concerns, recent linked reports, missing condition or a supported maintenance interval | Provides an evidence-based inspection starting point | Open the asset's Predictive maintenance docket and location | One asset is one row. Nearby reports are not confirmed asset links. A model score is not a failure probability or an approved schedule |
| Which resident updates need follow-up? | Reviewed publication/report relationships and private notification delivery states | Reveals unfinished review, release or channel-delivery work | Open Updates, reviewed links or delivery operations | Published, in-app notice created, SMTP accepted and phone delivery are distinct events. No unsupported “residents reached” percentage |
| What information is missing? | Reports/assets/work with missing owner, location, classification or useful history | Shows why a comparison may be incomplete | Open the relevant correction/review queue | Incomplete data is an explicit coverage limitation, not zero demand or staff failure |

Rows and bars must be clickable across their usable area, with a native keyboard action and text alternative. Selecting a view must preserve filters, scope, period and the return path. The dashboard should open operational records for decisions; it should not execute bulk lifecycle decisions from a chart.

## Definitions before charts

**Current workload versus received cohort.** The headline operational view includes every currently open authorized record, regardless of when it was submitted. A “Reports received in the past 30 days” chart is a separate cohort. Changing that period must not quietly hide older outstanding work.

**Separate record grains.** Count reports, work orders, projects, assets, publication revisions, relationships and delivery attempts separately. One work order covering several reports is one job. Repeated submissions about an unresolved concern do not establish a recurrent asset defect.

**Age and duration.** Initially label report age as “since submission.” A future stage-duration view needs trustworthy entry/exit events and a named definition owner. `updated_at` must not be used as the entry time for a stage. No SLA breach or response commitment is inferred from age or configurable internal targets.

**Severity.** Use the staff-assessed ascending scale: P0 Monitoring through P5 Immediate response, retaining the recorded reason, reviewer and time. Show Not assessed separately. Do not convert AI urgency directly into a confirmed staff grade or infer a legal emergency policy.

**Maintenance.** Existing interval planning needs at least three distinct completion dates for the same recorded work type. Show the observed basis and missing history. Do not turn insufficient history into a forecast or present the exploratory model index as a validated probability of failure.

**Ownership.** Group by immutable employee IDs, using names only for display; two employees with the same name must not merge. Separate missing owner, unavailable owner and an active assignee. Workload counts do not establish available capacity.

**Geography.** Prefer canonical barangay IDs and versioned source boundaries. Distinguish an operational sector from jurisdiction and asset ownership. Do not infer record access from GPS or a map label. Label missing or unresolved area references explicitly.

**Finance.** No budget utilization, spending performance, savings, cost-efficiency score or automatic funding allocation. Sourced disclosed amounts remain optional public facts in Updates. Historical estimates and unknown fallback costs must not appear as verified actual spending.

## Data and API plan — not implemented

| Existing source | Useful starting point | Work required before overview implementation |
|---|---|---|
| `/api/gov/operations/today` | Personal tasks, reason, object link and assigned review | Preserve personal grain; do not repurpose it as department metrics |
| `/api/gov/service-insights?days=…` | Current states of received-period reports, blockers, verification, area groups and work ownership | Separate all-open stock from received cohorts; use canonical IDs; add explicit coverage and traceable source selections |
| Report-review records | Reviewer, assignment mode, P0–P5 assessment and reasons | Aggregate only scoped, authorized records; preserve missingness and independent AI urgency |
| Work/project workspaces | Delivery state, owners, dependencies and independent review | Define stage/age rules and prevent duplicate jobs across joins |
| Predictive maintenance / asset context | Condition, observed completion intervals and explicit linked/nearby reports | Reconcile asset count and linkage basis; keep model limits visible |
| Updates / private delivery operations | Reviewed release, report association and actual channel state | Keep recipient privacy; aggregate safely; no email addresses or resident identities in overview |

The observed `GET /api/gov/overview` returns server-scoped sections with an as-of time, definition version, grain, scope, coverage and totals. The follow-up integration adds named report selections that `/api/reports` and `/api/gov/report-map` re-evaluate within the requesting staff member's current scope. A query snapshot or validated filter token remains a candidate if large selections need a durable shareable reference; avoid placing large or private source-ID lists in a URL. Revalidate permissions and source eligibility on every drill-through and mutation.

Apply authorization before joins, aggregation and export. A user with a module denial must not infer that module's counts through another section. Jurisdiction rules must match the operational list/map. Private staff-location coordinates and resident identifying details do not belong in dashboard aggregates or exports.

## Interpretation and interface copy

Each view follows: **question → observed relationship → bounded meaning → next action → source records**. Keep interpretation to one short, evidence-supported sentence where needed. Definitions belong in an expandable panel, not repeated tutorial paragraphs.

Examples of content patterns, not measured findings:

- “Reports without a review owner” → “Open reports” → “Assign reviewer” in the authorized docket.
- “Work blocked by missing input” → recorded reason, work owner and blocker date → “Open work orders.”
- “Maintenance history is incomplete” → the affected asset list → “Review asset history.”

Avoid “AI-powered intelligence,” “city health score,” unsupported “real-time,” directional percentage badges without comparable periods, fabricated deadlines and unexplained performance indices.

## States, accessibility and acceptance

Loading, first-use empty, filtered empty, denied section, stale data, partial source failure, offline, recoverable/system error and successful refresh must have distinct outcomes. A failed source never becomes a legitimate zero. A partial failure leaves successful sections readable with their own source times; links requiring missing selections remain disabled with an explanation.

Use semantic tables and ordinary links/buttons. Charts need a textual finding and the same values in a table. Use non-color status cues, visible 3 px focus, predictable focus return, reduced-motion support and equivalent light/dark meaning. Verify 320 px reflow, 200% zoom, forced colors, keyboard operation and long names. Charts must not depend on hover to reveal the only readable values.

Acceptance before implementation is called complete:

1. Counts reconcile to the same scoped source records across overview, table and map, including missing-location records.
2. A received-period filter cannot erase all-age backlog without an explicit view change.
3. A selected bar/row opens the matching records and Back restores context.
4. Explicit module denials and cross-district requests fail at the server, including drill-through and export.
5. Multiple reports linked to one job do not inflate work/completion counts; repeated names do not merge employees.
6. Missing data, source failures, stale times and insufficient maintenance history remain truthful.
7. Published or SMTP-accepted counts never appear as confirmed phone or mailbox deliveries.
8. Budget processing, unsupported SLA comparisons and staff productivity rankings are absent.
9. Representative engineering/coordinator users can identify the relevant queue and next action without interpreting technical model terminology.

## Proposed delivery sequence and decisions

Review this proposal and agree the overview's audience, navigation position, all-open/cohort definitions and named data owners. Reconcile reusable Reports/shared components with paired light/dark and narrow planning artifacts in the existing design file. Figma work was deferred during the initial documentation phase; this local integration also makes no Figma write claim.

The local implementation now includes the scoped overview read contract, attention queues, report/work relationships, and maintenance/communication exceptions. Named report drill-through and scoped source checks were added after the user's integration request. A compact three-card KPI row summarizes open reports, current work orders, and reports needing triage or an owner. Each card pairs its exact count with a small relationship bar and source links: open reports split by current work, current orders by blocked/verification/other stage, and the triage queue as a subset of open reports. It uses recorded stock counts rather than invented month-over-month performance. The confusing report-to-work node diagram was removed after employee-facing review. In its place, the primary interactive bar chart shows open reports by recorded area or staff priority, split by whether current work exists; selecting a segment opens the exact server-scoped report list. An adjacent attention list links to decision queues. The next row shows daily report intake and an interactive current-work-by-stage column chart, each with exact table values. Intake uses report creation timestamps in Asia/Manila and is distinct from the all-age open stock. Lack of current work is not an overdue or failed-service claim, and work orders are counted separately from reports. Lifecycle-stage duration, resolution velocity, SLA clearance, budget exposure, and inferred hazard rankings still require authoritative event and policy data before visualization. The former `GovBiDashboard` component's hard-coded trajectories, barangay rankings, budget values, and SLA figures were removed.

### Local integration verification — 27 October 2026

The overview's report totals and drill-through use the same server-scoped selection definitions for open, unowned, triage, P4–P5, unlocated, with current work, without current work, priority grade, a combined priority/work selection, and a recorded area. The Reports table and map each request those selections from the server, which rechecks overview permission and district scope. Work-order summary links use the actual `current`, `blocked`, and `completed_pending_review` queues; ownership links apply a server-side employee-ID filter without disclosing out-of-scope owners. Terminal report and work-order states are excluded from open workload. Asset and publication exception queries now respect district scope, and failed optional sources display a partial-error state instead of a false empty state. The guarded disposable PostGIS government workspace suite passed 80 tests on 27 October 2026; frontend build and touched-file lint also passed. The Figma file was inspected: its current government reviewer templates cover Citizen reports, with no approved Operations overview template or chart component. The dashboard remains a local implemented proposal pending a reusable Figma pattern and LGU design review. Live browser acceptance was unavailable when Work browser control became disabled, so responsive, theme, focus, and end-to-end pointer checks remain open.

Open decisions: whether Overview becomes the default for any leadership role; exact coordination delegations; stage-entry history quality; canonical area reconciliation; safe aggregate/export rules; approved maintenance recurrence definition; and LGU usability acceptance. No officer interview, production KPI, City target or service-improvement result is fabricated by this proposal.
