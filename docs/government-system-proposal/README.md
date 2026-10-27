# PULSO government system: research and agent handoff

**Status:** Proposed for product and LGU review. **Version:** 1.0. **Research date:** 18 September 2026. **Phase:** Documentation only; no implementation authorization.

**23 October 2026 research update:** Read [16 — Core workflow, navigation, and disclosure research](16-government-core-workflow-navigation-and-disclosure-research-2026-10-23.md) for the current user-directed boundary: budget disclosure and official bidding links, with budgeting/procurement processing outside PULSO. It reconciles earlier proposals with official Caloocan role/function evidence, work allocation, decision-oriented insights, and reviewed report-to-publication notifications. The functional roles and workflows remain proposals pending LGU validation; older financial-processing plans are historical proposals to reconcile, not current implementation instructions.

**Runtime evidence follow-up:** [Analytics, Map, and Predictive Maintenance review](../ui-ux-audit/runtime-insights-2026-10-23/README.md) captures eleven current local screen states and traces their actual routes and data definitions. It corrects the duplicate BI-file attribution and supplies the concrete module-consolidation recommendation.

**User-confirmed government design reference:** Preserve the current Reports UI at `/gov/reports` and extend its shared patterns, professional tone, understandable navigation, and restrained palette throughout the government portal. The proposed Analytics/Maintenance changes should use that established design language; see PRODUCT.md and the runtime review for the dated clarification.

**Implementation update, verified 24 October 2026:** [18 — Government core workspace implementation](18-government-core-workspace-implementation-2026-10-23.md) records the authorized core implementation, active Reports map and heatmap, functioning maintenance calculations and work handoff, publishing/disclosure safeguards, 65 passing regression checks, and remaining limitations. The normal local API uses the configured database; disposable browser review runs separately on port 33160. The research proposals above remain subject to their stated approval dependencies.

**Browser feedback correction:** [19 — Browser feedback corrections](19-browser-feedback-corrections-2026-10-24.md) records the nine annotated comments: clearer Report analysis and Predictive maintenance navigation, asset map investigation, plain-language maintenance, draft creation, real Records data/actions, and restored Caloocan/photo-pin interactions. Verification now covers 70 passing regression checks.

## Recommendation

Build a connected government workspace that helps staff receive concerns, assign work, inspect outcomes, maintain infrastructure, communicate service updates, and explain performance. Make everyday actions clear before adding advanced prediction. Add **Updates & announcements** as a dedicated publishing module, with private report updates and staff notifications kept distinct.

Retain the existing application stack where practical. Introduce dependable background processing, governed geography, explicit permissions, and reliable records before expanding AI. Compare current Gemini candidates with an OpenAI challenger on local evaluation data; do not select a production model from marketing claims alone.

## Read order and deliverables

| Document | What the receiving agent should obtain |
|---|---|
| [01 — Operating model, modules, and roles](01-operating-model-modules-and-roles.md) | Scope, linked workflows, responsibility assignments, dashboard and Assets direction |
| [02 — Updates, announcements, and notifications](02-updates-announcements-and-notifications.md) | Publishing lifecycle, simple editor, approvals, scheduling, corrections, channel behavior |
| [03 — AI models and evaluation](03-ai-model-selection-and-evaluation.md) | Researched candidates, task routing, vision and prediction boundaries, evaluation and cost plan |
| [04 — Integrations and architecture](04-integrations-and-technology-architecture.md) | Recommended stack, integration priorities, access dependencies, architecture |
| [05 — Automations and reliability](05-automation-workflows-and-reliability.md) | Trigger/action catalog, durable jobs, retries, delivery tracking, human decision boundaries |
| [06 — Data, API, and UX contracts](06-data-api-and-ux-contracts.md) | Proposed records, commands, geography, drawer/detail behavior, metrics, quality gates |
| [07 — Delivery and agent work packages](07-delivery-plan-agent-work-packages-and-acceptance.md) | Sequencing, bounded assignments, exit criteria, acceptance scenarios and rollout |
| [08 — Sources and decisions](08-research-sources-and-decision-register.md) | Evidence, unresolved approvals, source limits and recommendations to revalidate |
| [09 — Reconciled implementation plan](09-reconciled-government-implementation-plan.md) | Actionable implementation roadmap reconciling proposals into engineering stages and work packages |
| [10 — User profiling and research framework](10-user-profiling-and-operational-research-framework.md) | Work-based profiling for the 10 proposed user groups, research inquiries, separation of duties, and environmental matrices |
| [11 — Priority, SLA, documents, spatial data, and ML plan](11-priority-sla-documents-spatial-ml-plan-2026-09-29.md) | Current-code gap review, proposed P0–P5 policy and internal clocks, document generation/public release, PostGIS migration, LightGBM proof plan, and owner decisions |
| [12 — Email referrals, official documents, and publications](12-government-referrals-documents-and-publications-2026-09-29.md) | Caloocan source documents, external-department email handoff and clocks, controlled generated forms, announcement workflow, Canva role, and launch tests |
| [13 — SMS provider research and release gates](13-semaphore-sms-decision-and-release-gates-2026-09-29.md) | Initial Semaphore recommendation, later PhilSMS test-provider selection, authentication and delivery blockers, and proof required before launch |
| [14 — Government sprint roadmap and release plan](14-government-sprint-roadmap-and-release-plan-2026-10-05.md) | Relative pilot-to-finalization sequence, decision gates, release layers, and Definition of Ready/Done |
| [15 — Sprint 0 and pilot backlog](15-government-sprint-0-and-pilot-backlog-2026-10-05.md) | Assignable S0/S1 evidence and contract tasks plus the future report-to-work implementation slices |
| [16 — Core workflow, navigation, and disclosure research](16-government-core-workflow-navigation-and-disclosure-research-2026-10-23.md) | Official-source role findings and limits, functional users/task allocation, navigation/module reconciliation, useful relational insights, report-to-news notifications, and disclosure-only budget scope |

The earlier [detailed operating-model proposal](../ui-ux-audit/24-government-operating-model-and-automation-proposal-v1.0.md) remains part of this handoff. This package extends it with communications, model research, integration and automation plans. It changes the **proposed** navigation from seven modules to eight by adding Updates & announcements. Its model shortlist is a dated update to the earlier general Gemini recommendation.

## Authority and boundaries

Read repository [AGENTS.md](../../AGENTS.md), [PRODUCT.md](../../PRODUCT.md), and the [approved Civic Aperture direction](../ui-ux-audit/09-visual-art-direction-v2.md) first. Existing code is evidence of implementation, not authority for the intended product. The [government experience](../ui-ux-audit/05-government-experience-spec.md), [government user stories](../ui-ux-audit/13-government-user-stories-and-sdlc.md), and [lifecycle/API proposal](../ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md) must be reconciled before implementation.

- Earlier package baseline names City Engineer, Assistant City Engineer, and Administrative Division. The October research independently corroborates the published City Engineer listing and Engineering Admin/Planning contacts, but does not establish the current assistant-engineer appointment or complete plantilla. All proposed functional assignments remain separate from an official organizational chart; see document 16 for evidence limits.
- Government maps should support North and South Caloocan. Resident service eligibility remains a separate decision because PRODUCT.md describes North Caloocan residents.
- Models, budgets, service deadlines, public-release delegations, retention, geographic boundaries, and emergency procedures require named owners. No deadlines in these documents are statutory service promises.
- No code, migrations, Figma mutations, provider setup, publication, scheduled jobs, or external messages are authorized by this package.
- No model benchmark, production-data audit, full authorization audit, or integrated runtime test was performed. Source inspection and public documentation support this proposal.

## Instructions for another agent

1. Read this index, document 08, and the package relevant to the assigned task.
2. Re-inspect current code and record drift; line numbers in the earlier proposal are approximate.
3. Keep observed behavior, proposed behavior, and approved decisions separate. Raise conflicts with provenance rather than silently replacing policy.
4. In this phase, produce only analysis or specifications. Future product changes require explicit implementation authorization.
5. For visual work, follow the mandatory Impeccable → PULSO design workflow and inspect the existing Figma file. Do not invent completed Figma components or approvals.
6. Return changed artifacts, evidence, unresolved decisions, validation, and the next dependency. Never claim delivery based on a success toast, mock data, or a generated screenshot.

## Proposed ownership

Sponsor: City Engineer, subject to nomination. Operational product owner: Assistant City Engineer or delegate. Records/communications coordinator: Administrative Division nominee. Publishing authority: LGU-designated communications or service owner, **not yet confirmed**. Technical delivery owner, data steward, GIS owner, privacy reviewer, and pilot users remain to be named.

Implementation follow-up: [20 — Publication workspace and map actions](20-publication-workspace-and-map-actions-2026-10-24.md) records the news/advisory editor, inline documents, automatic private notices, direct map decisions and verification limits.

Implementation follow-up: [21 — Report review routing, priority and UI consistency](21-report-review-routing-priority-and-ui-consistency-2026-10-24.md) records shared report views, automatic review queues, manual reassignment, reviewed P1–P5 grading and live development verification.

Current correction: [22 — Ascending severity, boundary reference and sidebar](22-ascending-severity-map-reference-and-sidebar-2026-10-24.md) supersedes the earlier grading order with the user's **P0 monitoring → P5 immediate response** instruction and records the PostGIS map reference, top collapse control and validation limits.

Implementation follow-up: [23 — Government workspace completion pass](23-government-workspace-completion-pass-2026-10-24.md) records the working asset-assessment path, scoped paginated asset/work registers, Reports consistency fixes, real browser review, 96 passing integration checks and remaining verification limits.

Current completion ledger: [24 — Government endpoint and workflow completion ledger](24-government-endpoint-and-workflow-completion-ledger-2026-10-24.md) records the 209-route inventory, legacy publication/scope corrections, real inspection workflow, truthful audit status, 113 passing checks and the explicit work remaining for the full government-side objective.

Implementation follow-up: [25 — Staff administration and account lifecycle](25-staff-administration-and-account-lifecycle-2026-10-24.md) records usable invitation/recovery links, synchronized role/district changes, session revocation, staff self-service, administrative action guards, the additive staff schema migration and remaining government-side work.

Implementation follow-up: [26 — Operational settings and live UI verification](26-operational-settings-and-live-ui-verification-2026-10-26.md) records transactional configuration, working routing/AI controls, sourced internal review targets and live shared-dialog checks.

Implementation follow-up: [27 — Resident administration and confirmation](27-resident-administration-and-confirmation-2026-10-26.md) records the shared resident workspace, access/session safeguards, externally referenced identity reviews, real confirmation delivery results and remaining completion work.

Implementation follow-up: [28 — Project coordination, evidence and report closure](28-project-coordination-evidence-and-report-closure-2026-10-26.md) records the real project workspace, external follow-ups, evidence/independent review, atomic work referrals, external certificate records, explicit report closure, 189 passing checks and remaining completion/data-recovery dependencies.

Implementation follow-up: [29 — Report referral and notification delivery](29-report-project-referral-and-notification-delivery-2026-10-27.md) records direct report-to-project creation, enforced resident preferences, opt-in email delivery/retries, private delivery operations, verification and remaining phone/provider/live-UI work.

Implementation follow-up: [30 — Retained engineering workflows and access](30-retained-engineering-workflows-and-access-2026-10-27.md) records scoped planning/surveys, preserved project queues, read-only financial history, staff-location privacy/freshness and verification limits.

Design proposal: [31 — Government BI dashboard](31-government-bi-dashboard-proposal-2026-10-27.md) defines Operations overview, decision views, data/authorization contracts and acceptance criteria. Documentation only; dashboard implementation is deferred.

Implementation follow-up: [32 — Shared header, selection and scrolling](32-government-shared-header-selection-and-scrolling-2026-10-27.md) records the browser-feedback fixes, meaningful report selection, shared row opening, independent queue/detail scrolling and current verification limits.

Implementation follow-up: [33 — Publication workspace Tailwind refinement](33-publication-workspace-tailwind-refinement-2026-10-27.md) records the Updates list/editor refinement, shared styled controls, article composition, uploads, audience handling and verification limits.
