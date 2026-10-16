# Antigravity prompt pack — PULSO government implementation v1.0

| Field | Value |
|---|---|
| Status | Copy-ready implementation prompts; execution remains gated by the approved slice and human review |
| Version | 1.0 |
| Last validated | 27 August 2026 |
| Intended tool | Google Antigravity IDE or Antigravity 2.0 with local workspace access |
| Recommended mode | Planning Mode with Artifact Review set to Request Review |
| Workspace rule | [PULSO government implementation rule](../../.agents/rules/pulso-government-implementation.md) |
| Master blueprint | [Government implementation blueprint](./22-government-implementation-blueprint-v1.0.md) |
| Visual contract | [Complete government website design](./21-government-website-complete-design-v1.0.md) |
| Implementation | These prompts do not themselves authorize unresolved product policy or code changes |

## 1. Recommended usage

1. Open the PULSO repository as the Antigravity workspace.
2. Set Planning Mode and Artifact Review to `Request Review`.
3. Enable the workspace rule `.agents/rules/pulso-government-implementation.md` as Always On or explicitly mention it.
4. Connect Figma Dev Mode MCP when the approved editable government frames are available.
5. Run Prompt 0 once for the implementation branch.
6. Run only the prompt for the next approved wave.
7. Review and comment on the implementation-plan artifact before selecting Proceed.
8. After implementation, run the focused QA prompts, then the release prompt.

Do not paste every implementation prompt into one conversation and ask Antigravity to execute all waves autonomously. The pause between waves is where product, lifecycle, security, and operations owners prevent expensive divergence.

### Placeholders

Replace these before use:

- `<TARGET_BRANCH>` — implementation branch or worktree;
- `<APPROVED_WAVE>` — one of G0–G12 from the blueprint;
- `<APPROVED_ROLES>` — representative capability classes available for testing;
- `<APPROVED_ENVIRONMENT>` — local, integration, QA, staging, or pilot;
- `<APPROVED_FIGMA_LINKS>` — exact frames/components when available;
- `<APPROVED_DECISIONS>` — decision or ADR IDs resolved for the slice;
- `<BASE_URL>` — local or approved test URL.

## 2. Prompt 0 — workspace preflight and implementation plan

Use this first. It intentionally forbids coding.

```text
You are preparing the PULSO government website for controlled implementation.
Work in Planning Mode with Request Review. Do not modify product code in this task.

Read completely:
@AGENTS.md
@PRODUCT.md
@.agents/rules/pulso-government-implementation.md
@.agents/skills/pulso-frontend-design/SKILL.md
@docs/ui-ux-audit/22-government-implementation-blueprint-v1.0.md
@docs/ui-ux-audit/21-government-website-complete-design-v1.0.md
@docs/ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md
@docs/ui-ux-audit/13-government-user-stories-and-sdlc.md
@docs/ui-ux-audit/10-figma-production-handoff.md
@docs/ui-ux-audit/11-figma-component-inventory.md

Treat PRODUCT.md and Civic Aperture as approved. Treat target IA, detailed lifecycles,
capabilities, emergency rules, and APIs as proposed unless an approved decision says otherwise.
Treat current source/runtime as observed evidence, not automatic target truth.

Inspect the repository and produce a preflight artifact containing:
1. current branch, worktree status, application stack, commands, environments and test tooling;
2. observed government routes mapped to GOV-PAGE identifiers and blueprint waves;
3. reusable tokens, primitives, shells, data patterns and route-local duplicates;
4. current session, authorization, lifecycle, state/cache, API and error-handling architecture;
5. current backend endpoints and mismatches against the proposed canonical contract;
6. P0/P1 blockers, dead controls, false states, hard-coded roles/assignees and unsafe mutations;
7. current accessibility, responsive, light/dark and performance baseline;
8. proposed implementation boundaries that preserve the current stack;
9. the smallest safe G1–G4 pilot slice and its dependencies;
10. exact files expected to change, tests to add, feature flags, migration and rollback;
11. questions requiring product, operations, security, records, finance or accessibility approval.

Classify every finding as APPROVED, PROPOSED, OBSERVED, SAMPLE, DEPRECATED or BLOCKED.
Do not install dependencies, change Figma, create routes, refactor code or fix defects yet.
End by requesting review of the artifact.
```

## 3. Prompt 1 — convert preflight into an approved slice plan

Run after reviewers resolve or explicitly defer the preflight decisions.

```text
Prepare the implementation plan for <APPROVED_WAVE> on <TARGET_BRANCH>.
Do not code until I approve the plan artifact.

Use:
@.agents/rules/pulso-government-implementation.md
@docs/ui-ux-audit/22-government-implementation-blueprint-v1.0.md
@docs/ui-ux-audit/21-government-website-complete-design-v1.0.md
@docs/ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md
@docs/ui-ux-audit/13-government-user-stories-and-sdlc.md

Approved decisions for this slice:
<APPROVED_DECISIONS>

Approved Figma frames/components:
<APPROVED_FIGMA_LINKS>

Build one vertical slice with a persisted civic outcome. The plan must contain:
- job, actors, routes, scope and explicit non-goals;
- current behavior characterization and migration boundary;
- component/token reuse and any Core additions;
- source entity/state/version, valid commands, prerequisites and next owner;
- capability, jurisdiction, assignment, field, PII and export rules;
- API operation/schema/errors/idempotency/concurrency/outbox effects;
- complete state and failure matrix;
- desktop, 1280×720, tablet/narrow and 320/390px behavior;
- light/dark, keyboard, screen reader, focus, forced-colors and reduced-motion behavior;
- component, contract, integration, E2E, adversarial and manual tests;
- safe telemetry, feature flag, migration, compatibility and rollback;
- exact files and ordered task list.

Flag any item that is still proposed or blocked. Do not invent a backend transition,
permission, endpoint, metric, prediction, coordinate, record, or outcome.
Request review before making changes.
```

## 4. Prompt 2 — G1 Core, government access and shell

```text
Implement only the approved G1 slice: PULSO Core additions required by government access,
the government-only institutional entry, sign-in/MFA/recovery/denied-session states,
and the responsive capability-aware government shell.

First read and follow:
@.agents/rules/pulso-government-implementation.md
@docs/ui-ux-audit/22-government-implementation-blueprint-v1.0.md
@docs/ui-ux-audit/21-government-website-complete-design-v1.0.md
@docs/ui-ux-audit/03-figma-design-system-spec.md
@docs/ui-ux-audit/10-figma-production-handoff.md

Use the approved implementation-plan artifact and <APPROVED_FIGMA_LINKS>.
Preserve the existing stack and unrelated routes.

Required outcomes:
- resident and government access remain explicitly separate;
- route, navigation and session guards use backend-authoritative identity/capability state;
- intended government deep links survive safe authentication and recovery;
- denied, suspended, expired and unavailable states remain in government identity;
- shell preserves scope, route title, breadcrumbs, search/command access, notifications,
  official/delegation context and freshness where authorized;
- narrow layouts use a real drawer/full-page topology, not a compressed desktop sidebar;
- Morning Field Sheet and Night Inspection have semantic token parity;
- shared components include all interactive and failure states required by the slice.

Do not implement domain pages beyond a clearly labeled shell placeholder.
Do not add resident sign-in or public reporting actions to the government landing.

After coding, run relevant tests and launch the real app. Verify at 1440px, 1280×720,
390px and 320px, light/dark, keyboard-only, 200% zoom and session failure.
Produce a walkthrough with screenshots, changed contracts, test evidence, known risks,
flag/rollback instructions and the next blocked decision.
```

## 5. Prompt 3 — G2 My Work, scope and notifications

```text
Implement only the approved G2 slice: capability-aware My Work, the permission-scoped
operational overview, saved scope/view continuity, and actionable government notifications.

Follow @.agents/rules/pulso-government-implementation.md and the G2 contract in
@docs/ui-ux-audit/22-government-implementation-blueprint-v1.0.md.
Use the page and interaction designs in
@docs/ui-ux-audit/21-government-website-complete-design-v1.0.md.

My Work must explain why each item is present and show durable object ID, task, priority,
age/freshness, owner/team, state, scope and a direct authorized destination.
Metrics appear only when they change prioritization, staffing, approval or investigation.
Notifications are task routing, not a social feed; inaccessible source records must not leak.

Implement loading, background refresh, first-use empty, filtered empty, stale, partial,
offline, permission change, failure and persisted success. Preserve URL-safe scope,
filters, saved view and return context. Do not convert a failed aggregation into zero counts.

Verify representative <APPROVED_ROLES> and negative capability cases, deep links,
keyboard navigation, screen-reader names, narrow recomposition and both themes.
Provide browser evidence and a traceability walkthrough before completion.
```

## 6. Prompt 4 — G3 citizen reports and dispatch

```text
Implement only the approved G3 vertical slice: Citizen reports queue, engineering docket,
triage decisions, eligible assignment/dispatch and reports archive behavior.

Read and obey:
@.agents/rules/pulso-government-implementation.md
@docs/ui-ux-audit/21-government-website-complete-design-v1.0.md
@docs/ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md
@docs/ui-ux-audit/13-government-user-stories-and-sdlc.md

Use a quiet queue plus engineering docket on capable viewports and a full-page/card flow
on narrow layouts. Preserve search, filters, sort, count, freshness, selected record,
return context and the selected item’s movement after mutation.

The docket order is: identity/state/freshness; privacy-safe resident context; true-color
evidence/provenance; map plus address/list; advisory AI with source/confidence/limits;
Signal Cut lifecycle; facts/duplicates; immutable activity; eligible decisions.

Render only backend-authorized commands and server-provided eligible teams.
Use explicit actions such as Verify report, Request information, Assign work order,
Escalate, Mark duplicate and Close as outside scope when their approved transitions allow.
Every decision includes reason, source/target state, consequences, resident notification,
next owner, expected version and persisted event. No arbitrary status dropdown.

Test wrong roles/jurisdictions, masked PII, missing evidence, no eligible team, stale version,
concurrent dispatch, retry/replay, partial provider failure, failed fetch and offline recovery.
Verify map list alternatives, evidence text alternatives, keyboard queue/detail use,
light/dark and required viewports. Produce screenshots/recording and reconciliation evidence.
```

## 7. Prompt 5 — G4 work-order pilot completion

```text
Implement only the approved G4 work-order slice and complete the first government pilot:
work-order views, docket, assignment context, field updates, blockers, evidence upload,
completion proof, review/approval, resident-safe projection, notification and audit timeline.

Follow the workspace rule and Processes 2–3 in
@docs/ui-ux-audit/21-government-website-complete-design-v1.0.md.
Use the canonical work-order contract approved from
@docs/ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md.

Do not resolve a report from UI status alone. Completion requires authoritative proof and
review gates. Mutations must be idempotent, version-safe and reconcile entity, evidence,
audit, timeline and outbox effects. Offline/pending evidence must never appear committed.

Implement Assigned, Active, Blocked, For review and Completed views only as supported by
the approved lifecycle. Preserve source report/project, scope, location, team, priority,
target, dependencies, safety, updates, proof, review, activity and resident notification.

Test duplicate replay, failed upload, scan/provider delay, offline recovery, stale conflict,
blocked work, no eligible assignee, unauthorized evidence, proofless completion and
notification/outbox failure. Run the complete pilot golden journey in the browser and API
test environment. Provide durable IDs/events and reconciliation evidence in the walkthrough.
```

## 8. Prompt 6 — G5 and G6 projects and technical planning

```text
Implement the single approved wave named <APPROVED_WAVE>: either G5 Projects or
G6 Technical planning. Do not combine both unless the approved plan proves one inseparable
vertical outcome.

Follow @.agents/rules/pulso-government-implementation.md and the corresponding page/process
contracts in @docs/ui-ux-audit/21-government-website-complete-design-v1.0.md.

For G5, use one approved project lifecycle. Preserve source records, phase criteria,
required artifacts, dependencies, documents, design/survey/BoQ/estimate relations,
procurement/construction/inspection/turnover context, decisions and immutable activity.
No arbitrary phase selector or silent choice between conflicting lifecycle models.

For G6, preserve discipline, assumptions, version, source documents, measurements,
location/list alternative, safety, field/offline state, reviewer, limitations and signed
human accountability. Never present generated analysis as engineering judgment.

Implement complete states, capability/field access, conflict/version behavior, responsive
topology and accessible document/evidence alternatives. Verify using realistic SAMPLE
fixtures that remain visibly non-production. Provide plan traceability and browser evidence.
```

## 9. Prompt 7 — G7 OBO, procurement, BoQ and estimation

```text
Implement only the approved G7 process slice. Before coding, confirm the approved OBO,
procurement, finance, BAC, ObR, cash, NTP, BoQ, estimation, threshold and segregation rules.
If any required rule is missing, stop with a BLOCKED decision artifact.

Follow @.agents/rules/pulso-government-implementation.md, Process 5–6 and pages 21–24 in
@docs/ui-ux-audit/21-government-website-complete-design-v1.0.md.

Use explicit domain commands and server-enforced prerequisites. Show source project,
versioned BoQ, totals/assumptions, funding/approval evidence, technical reviews, payment,
inspection/reinspection, documents, prior decisions, consequences and next owner.
Never claim legal or procurement compliance merely because a UI checklist is checked.

Test negative/zero/overflow/precision currency, stale versions, threshold boundaries,
segregation conflicts, duplicate approvals, missing prerequisites, unauthorized documents,
provider failure and concurrent reviewers. Verify accessible tables, narrow layouts,
light/dark and governed confirmation/focus behavior. Produce reconciliation evidence.
```

## 10. Prompt 8 — G8 records, documents, timeline and audit

```text
Implement only the approved G8 records slice after records/legal/security approve
classification, storage, versioning, download, retention, legal hold, disposition/tombstone,
access logging and immutable audit behavior.

Follow @.agents/rules/pulso-government-implementation.md and Process 7/pages 25–27 in
@docs/ui-ux-audit/21-government-website-complete-design-v1.0.md.

Official records are read-only by default. Routine hard delete is prohibited. Show source,
owner, linked object, classification, version, integrity metadata when real, retention,
hold/disposition, access history and immutable related events. A missing audit endpoint or
failed fetch must be unavailable/error, never an empty or successful record history.

Test direct URL/storage bypass, wrong capability/target, legal hold, disposition approval,
version conflict, MIME spoofing, oversized/malicious upload, export authorization and
audit/outbox failure. Verify keyboard tables, preview/download labels, focus-safe governed
overlays, 200% zoom and narrow record cards. Provide security and reconciliation evidence.
```

## 11. Prompt 9 — G9 insights and predictive review

```text
Implement only the approved G9 insights slice. Confirm metric definitions, source lineage,
period/scope, freshness, exclusions, masking/export and model-governance decisions first.

Follow @.agents/rules/pulso-government-implementation.md and Process 8/pages 28–30 in
@docs/ui-ux-audit/21-government-website-complete-design-v1.0.md.

Only show metrics that change prioritization, staffing, approval, investigation or
maintenance. Every metric exposes definition, source, scope, freshness and limitations,
with an accessible summary and data table. Clusters/maps/narratives drill into authorized
source records. Exact location and identity remain masked unless separately authorized.

Predictive output must expose model/provider/version, data window, confidence/limits,
freshness and accountable review. Random or mock output is SAMPLE and cannot create
operational work. Conversion to a work order uses the governed canonical command.

Test deterministic replay, empty/stale/partial data, provider timeout, kill switch,
unauthorized drill-through/export, chart-table equivalence, narrow layouts and both themes.
Provide visual, data-lineage and accessibility evidence.
```

## 12. Prompt 10 — G10 and G11 communications and administration

```text
Implement the single approved wave <APPROVED_WAVE>: G10 Communications or G11 Administration.
Do not combine them without an approved vertical outcome.

Follow @.agents/rules/pulso-government-implementation.md and the corresponding contracts in
@docs/ui-ux-audit/21-government-website-complete-design-v1.0.md.

For G10, advisories use Draft → Review → Schedule/Publish → Archive only as approved.
Preserve source, audience/scope, version, author/reviewer, accessibility/plain-language check,
delivery/outbox result and activity. Assisted copy is never auto-published. Notifications
never leak inaccessible records and remain actionable rather than engagement-ranked.

For G11, test people/roles, resident account administration, versioned settings, agent access
and emergency access separately. Permission changes show before/after, affected scope,
effective time, reason, actor, session impact and immutable audit. PII reveal is purpose-bound
and logged. Emergency access has explicit scope/time/reason, persistent banner, review and end.

Test target-role validation, current-session revocation, wrong scope, concurrent settings,
delivery failure, expired delegation/emergency access, missing agent artifact and all governed
confirmation/focus paths. Provide role-matrix, browser and audit evidence.
```

## 13. Prompt 11 — visual fidelity correction

Use this after functional implementation, not as permission to redesign.

```text
Perform one bounded visual-fidelity correction pass for the implemented PULSO government slice.
Do not add features, change product copy, alter lifecycle, refactor unrelated code or select a
new visual direction.

Compare the real implementation against:
@docs/ui-ux-audit/09-visual-art-direction-v2.md
@docs/ui-ux-audit/19-robust-minimal-civic-workspace-v0.8.md
@docs/ui-ux-audit/21-government-website-complete-design-v1.0.md
@docs/ui-ux-audit/assets/government-family-robust-minimal-v0.8.png
@docs/ui-ux-audit/assets/government-work-delivery-family-v1.0.png
@docs/ui-ux-audit/assets/government-interaction-system-v1.0.png

Capture the same route/state at 1440×900, 1280×720, 390×844 and 320px in light and dark.
Inspect hierarchy, density, alignment, typography, negative space, surface rules, evidence,
Signal Cut, Coordinate Rail, focus, overflow, sticky regions and complete component states.

Correct only verified divergences. Preserve robust information and all features.
Reject card-everywhere composition, large empty hero areas, oversized type/content,
glass, glow, gradients, generic dashboard tiles, excessive icons/color and decorative motion.

After the batch correction, capture one confirmation set and stop. Produce a concise defect
table with before/after evidence and any remaining issue requiring design-owner judgment.
```

## 14. Prompt 12 — accessibility and resilience audit

```text
Audit the implemented PULSO government slice against WCAG 2.2 AA and the complete resilience
contract. Begin read-only. Produce a prioritized artifact before fixing anything.

Use:
@.agents/skills/pulso-frontend-design/references/quality-gates.md
@docs/ui-ux-audit/22-government-implementation-blueprint-v1.0.md

Test keyboard-only, logical focus order, skip links/landmarks/headings, visible unclipped 3px
focus, names/roles/states, field error association, announcements, dialog/drawer/menu/combobox
behavior, focus return, non-color meaning, reduced motion, forced colors and screen reader.

Test 200% zoom, 320px reflow, 390px field layout, 1280×720 and 1440px. Verify long IDs,
wrapping, table overflow cues, map address/list alternatives, chart summaries/tables and
evidence alternatives. Exercise loading, empty, partial, stale, offline, denied, conflict,
provider failure, system error, upload recovery and success.

Report exact route/state, reproduction, user impact, WCAG criterion where applicable,
severity, root cause, recommended fix and regression test. After plan approval, fix the
bounded issues, rerun the same matrix and provide evidence. Do not mask failures with ARIA.
```

## 15. Prompt 13 — authorization and mutation safety audit

```text
Perform an adversarial authorization and mutation audit for the implemented government slice.
Start read-only and do not change policy. Use backend enforcement as authority.

Test identity/session × capability/version × jurisdiction/team × assignment × entity
state/version × field/document classification × amount/threshold/segregation ×
delegation/emergency scope × query/export scope.

Exercise no/invalid/expired/revoked/suspended/resident/wrong-role tokens; cross-jurisdiction
and other-assignee records; restricted documents/PII/exact locations/exports; stale role
changes; deep links; lifecycle skips/regressions; replay; duplicate approvals; concurrent
reviewers; stale versions; upload/storage bypass; audit/outbox failure; and provider outage.

Trace every accepted mutation through entity, database, audit, timeline, outbox, storage and
resident-safe effects. Verify idempotent replay returns one outcome and conflicts never
overwrite silently.

Produce a severity-ranked artifact with evidence and required owner. Any unauthorized access,
proofless completion, arbitrary transition, unaudited consequential action or immutable-history
loss is an automatic no-go. Request review before remediation.
```

## 16. Prompt 14 — release-readiness and walkthrough

```text
Assess release readiness for <APPROVED_WAVE> in <APPROVED_ENVIRONMENT>.
Do not deploy or broaden a feature flag in this task.

Use the Definition of Ready, Definition of Done, no-go conditions and implementation packet in
@docs/ui-ux-audit/22-government-implementation-blueprint-v1.0.md.

Verify:
- approved decisions and traceability IDs;
- Figma/component and implementation parity;
- API/schema/error/idempotency/concurrency compatibility;
- role/state/field negative tests and golden journey reconciliation;
- loading/failure/recovery states;
- accessibility, responsive and theme evidence;
- performance and privacy-safe telemetry;
- migration, legacy compatibility and data reconciliation;
- feature-flag owner/default/expiry/disable path;
- backup/restore/rollback rehearsal;
- SOP, training, support, incident and on-call readiness;
- open defects with owner/date/risk acceptance.

Produce a walkthrough artifact with changed files/contracts, screenshots or recordings,
test evidence, durable sample IDs/events, telemetry confirmation and rollback steps.
Return one conclusion: READY FOR NAMED PILOT, NOT READY, or BLOCKED.
Do not say ready when any P0/P1 or automatic no-go condition remains.
```

## 17. Recovery prompt — when the implementation becomes generic or loses features

```text
Stop adding new UI. The current implementation has diverged from PULSO’s approved robust-minimal
government direction or has removed operational capability.

Read @docs/ui-ux-audit/21-government-website-complete-design-v1.0.md and compare the current
route/state to its page contract and visual family. Produce a read-only divergence report for:
missing jobs/actions/data, broken process continuity, generic component substitutions,
card-everywhere layout, hierarchy/density drift, excessive icon/color use, evidence/location
de-emphasis, light/dark mismatch, responsive loss and missing failure/accessibility states.

Propose the smallest correction that restores the complete feature and process contract while
preserving Civic Aperture. Do not redesign, introduce a new aesthetic, add decorative effects,
or rewrite unrelated architecture. Wait for plan approval, make one batched correction,
capture before/after screenshots in paired themes/viewports and stop.
```

## 18. Review checklist for every Antigravity plan

Before selecting Proceed, reject or comment on any plan that:

- modifies more than one unapproved blueprint wave;
- begins from the raster board without reading the behavioral contracts;
- invents routes, statuses, permissions, endpoints, metrics, people, coordinates or outcomes;
- treats frontend role hiding as authorization;
- introduces generic status mutation or hard-coded assignment;
- postpones dark mode, responsive behavior, accessibility, failure states or tests;
- creates route-local copies of shared components;
- replaces a failed fetch with an empty state;
- claims success before authoritative persistence and side-effect reconciliation;
- performs a big-bang rewrite without characterization, compatibility, flags and rollback;
- changes resident/public surfaces outside the approved shared-core impact; or
- lacks browser evidence and a traceable walkthrough.

## 19. Suggested conversation boundaries

Use a new Antigravity conversation for each of these boundaries:

1. preflight and G0 decisions;
2. shared Core and G1 access/shell;
3. G2 My Work/notifications;
4. G3 reports/dispatch;
5. G4 work-order pilot;
6. each later domain wave;
7. cross-cutting visual/accessibility/security audit; and
8. release-readiness review.

This keeps artifacts reviewable, reduces stale assumptions, and makes each implementation commit, walkthrough and rollback boundary explicit.
