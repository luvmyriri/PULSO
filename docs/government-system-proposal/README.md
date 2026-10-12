# PULSO government system: research and agent handoff

**Status:** Proposed for product and LGU review. **Version:** 1.0. **Research date:** 18 September 2026. **Phase:** Documentation only; no implementation authorization.

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

The earlier [detailed operating-model proposal](../ui-ux-audit/24-government-operating-model-and-automation-proposal-v1.0.md) remains part of this handoff. This package extends it with communications, model research, integration and automation plans. It changes the **proposed** navigation from seven modules to eight by adding Updates & announcements. Its model shortlist is a dated update to the earlier general Gemini recommendation.

## Authority and boundaries

Read repository [AGENTS.md](../../AGENTS.md), [PRODUCT.md](../../PRODUCT.md), and the [approved Civic Aperture direction](../ui-ux-audit/09-visual-art-direction-v2.md) first. Existing code is evidence of implementation, not authority for the intended product. The [government experience](../ui-ux-audit/05-government-experience-spec.md), [government user stories](../ui-ux-audit/13-government-user-stories-and-sdlc.md), and [lifecycle/API proposal](../ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md) must be reconciled before implementation.

- Known local roles: City Engineer, Assistant City Engineer, Administrative Division. All additional roles here are **functional assignments**, not claims about Caloocan's organizational chart.
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
