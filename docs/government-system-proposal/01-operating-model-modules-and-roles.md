# 01 — Operating model, modules, and roles

**Status:** Proposed. **Version/date:** 1.0 / 18 September 2026. **Owners to confirm:** City Engineer and nominated operational product owner. See [package authority](README.md).

## 1. A connected service workflow

Use the same underlying civic records across government and resident experiences. A resident report is an observation; a case is the government's coordinated response; a work order is an assigned job; an asset is physical infrastructure; a project can contain several jobs. These are linked records, not interchangeable status labels.

Proposed flow: **Receive → Review responsibility and urgency → Assign → Inspect or perform work → Submit completion evidence → Verify → Resolve and communicate → Retain maintenance history.** Information requests, referrals, blocked work, rejection with reasons, and reopening must have explicit paths. A completed work order does not automatically resolve every linked report.

Routine staff work should answer: What needs my attention? Who owns it? What must happen next? Where is it? What evidence supports the decision?

## 2. Eight proposed modules

| Module / plain label | Everyday purpose | Essential content | Primary job owner |
|---|---|---|---|
| Today | Start the day and act | My actions, overdue work, unassigned concerns, approvals, verified service indicators | Each signed-in role |
| Reports | Review and follow concerns | Queue and map, right-side preview, full docket, related concerns and correspondence | Intake and technical coordinator |
| Work | Plan and deliver action | Work orders, assignments, inspections, blockers, projects and milestones | Assistant City Engineer / technical leads |
| Assets | Understand infrastructure condition | Asset register, location, condition, last inspection, linked issues, maintenance and planned work | Asset custodian and engineers |
| Records | Find authoritative documents | Versioned plans, inspection records, decisions, correspondence, retention and controlled exports | Records function |
| Service performance | Understand demand and service delivery | Backlog, response and resolution times, repeat issues, geographic workload and qualified forecasts | Leadership and analysts |
| Updates & announcements | Publish accurate service information | Drafts, review, schedule, published notices, corrections, audience and channel status | Designated publishing function |
| Administration | Keep the operation working | Teams, delegated permissions, categories, calendars, automation rules and integration health | Authorized administrative/system roles |

Notifications, search, contextual AI assistance, and map controls are shared utilities. Avoid creating a separate AI destination staff must visit to complete ordinary work. Finance, payroll, procurement, and permitting are not implicitly added as complete systems under Assets or Administration.

## 3. Roles without inventing an organizational chart

Use permission bundles and assignment scopes rather than hard-coded assumptions that everyone with a title can do every action.

| Functional role | Proposed responsibility | Permission boundary |
|---|---|---|
| City Engineer | Priorities, escalations, delegated approvals, management review | Approval limits and public-release authority require LGU confirmation |
| Assistant City Engineer | Coordinate technical queues, teams, inspections, blockers | Acts within recorded delegation and service/geographic scope |
| Administrative Division nominee | Intake support, correspondence, schedules, records coordination, announcement preparation | No automatic authority to certify engineering outcomes |
| Intake/review officer | Check completeness, jurisdiction and duplicate suggestions; request information | Cannot silently discard resident reports based on AI |
| Technical lead / dispatcher | Assess work, assign teams, propose dates, monitor blockers | Budget and exceptional decisions follow separate approval rules |
| Field worker | Accept authorized assignments; record progress and evidence | Cannot independently approve their own final technical acceptance |
| Inspector / verifier | Inspect and accept or return completed work | Must be distinguishable from executor; exception policy needs approval |
| Asset custodian | Maintain asset identity and validated condition/history | AI suggestions do not overwrite confirmed condition |
| Records officer | Version, release and retain records under policy | No routine destructive deletion of audit history |
| Communications drafter / reviewer / publisher | Prepare, verify and authorize publication | Delegated audience, category, channels, and emergency authority are explicit |
| System administrator / auditor | Configure access or inspect audit evidence | Administrative access does not itself grant engineering or publishing authority |

One person may hold several functional roles if the LGU permits it. Critical decisions still need accountable actors, explicit delegations, and appropriate separation of duties. Inactive, expired, or out-of-scope permissions must fail on the server.

Reference: [Quezon City's Engineering Department](https://quezoncity.gov.ph/departments/quezon-city-engineering-department/) describes administration, planning/design, maintenance and supervision functions. These support the proposed division of work, not a claim that Caloocan has the same structure. [Caloocan's CED page](https://caloocancity.gov.ph/category/ced/) and [charter landing page](https://caloocancity.gov.ph/ced-citizen-charter/) provide local service context; the embedded charter was not fully readable in this research.

## 4. The one-stop dashboard

The first viewport should show five role-relevant measures, the next actions, and a compact geographic/service summary. “One stop” means enough information to take the next action immediately, with deeper evidence one click away; it does not mean every chart on one screen.

Recommended leadership measures: **Unassigned concerns; Overdue actions; Work awaiting verification; Open high-priority cases; Cases resolved in the selected period.** Staff views substitute their own assigned/due work where appropriate. Show definitions, time window, scope, last successful update, and unavailable-data states. Avoid mixing cases and reports in one denominator.

Below the measures:

- **Needs attention:** named owner, issue, next action, due date, blocker and direct action link.
- **Where work is needed:** same filtered records as the list; North/South/full-city scope; show unmapped items separately.
- **Demand and completions:** a restrained trend with a plain-language explanation and data table.
- **Team workload and blockers:** active work by responsible team, without a simplistic staff leaderboard.
- **Publishing tasks:** only for authorized roles; awaiting review, scheduled today, corrections needed, delivery problems.

Use open ruled lists and compact rows, a quiet navigation rail, Field Blue actions, and one dominant map/evidence region. No decorative gauges, fake “live” badges, unsupported population-affected counts, or AI certainty percentages.

## 5. Rebuild the Assets experience

Rename ambiguous labels in the interface around physical infrastructure: **Roads, drainage, bridges, buildings and other approved categories**. Category applicability must be agreed with engineering staff.

An asset summary answers: What is it? Where is it? Who maintains it? What condition was last verified, by whom and when? What open issues and planned work relate to it? What has been repaired before?

Suggested main views: **All infrastructure; Needs inspection; Needs attention; Planned maintenance.** Use “Not yet assessed” when condition is unknown. Condition observations are dated records, not a permanent color. Keep replacement value and estimated remaining life out of the primary view until reliable methods and data exist.

Reuse the inspected InfrastructureAsset and MaintenanceHistory entities where appropriate. Projects remain in Work; plans and official documents remain in Records. Linking these avoids duplicate entry while preserving their distinct purposes.

## 6. Non-technical analytics and prediction

Start with questions: “Are we keeping up?”, “Where are concerns recurring?”, “Which work is delayed?”, and “What should we inspect next?” Lead each chart with an answer grounded in current data. Preserve access to counts, definitions and records.

Distinguish **observed facts**, **rule-based recommendations**, and **model forecasts** in language and styling. A rule can say “Inspection recommended because the last inspection is overdue.” It cannot become “80% likely to fail” without a calibrated model and validated outcomes.

Maps covering both sectors should share basemap style, location search, accessible list alternatives and governance across Reports, Assets and Service performance. Legislative district, operational sector, barangay, asset ownership and staff scope are separate concepts.

## 7. Approval dependencies

Confirm role assignments, closure authority, emergency routing, inspection acceptance, service clock rules, geographic ownership, asset categories and publishing delegation before finalizing behavior. The proposal does not replace a statutory charter or local delegation instrument.
