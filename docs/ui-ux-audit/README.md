# PULSO frontend and UX rework dossier

| Field | Value |
|---|---|
| Status | Planning / design exploration |
| Version | 0.2 |
| Last validated | 24 August 2026 |
| Scope | React web frontend: public, resident, and government experiences |
| Owner | Frontend lead, with product, design, QA/accessibility, and LGU operations |
| Implementation | Not started; this package intentionally contains no product-code changes |

## Executive outcome

PULSO already expresses a credible end-to-end civic-operations model. The strongest ideas are the resident/government separation, role-specific staff dashboards, evidence-rich reporting, bilingual foundations, mapping, analytics, and an auditable status lifecycle.

The next release should not begin with a cosmetic restyle. The current product has correctness, authorization, responsive, accessibility, and information-architecture risks that would be harder to fix after new visuals are applied. The recommended program therefore starts with **functional truth and one shared PULSO Core**, then delivers the resident and government experiences as separate streams.

The experience framework remains **Civic Signal Grid**, but the initial visual pass was too generic. The revised art direction is **Civic Aperture**: field evidence, local cartography, survey records, light/dark operational environments, and one signature **Signal Cut** derived from the PULSO heartbeat. It is intentionally minimalist and professional, with cinematic framing spent only where evidence, place, and lifecycle benefit from it.

## Branches created

All three local branches were created from clean `main` commit `7d7486377c6ab8f7387bdc5b018582d6af94b842`. No branch was checked out and no code was placed on them.

| Branch | Future ownership | Intended scope |
|---|---|---|
| `codex/ui-reworks` | Shared-core team | Tokens, primitives, shells, status vocabulary, accessibility utilities, documentation, and cross-portal contracts |
| `codex/ui-reworks-government` | Government stream | Role-aware staff navigation, queues, case detail, work orders, approvals, analytics, records, and administration |
| `codex/ui-reworks-residents` | Resident stream | Public entry, onboarding, verification, reporting, tracking, updates, profile, and bilingual mobile behavior |

The branches currently share the same baseline. Before implementation, adopt the integration rules in [06-implementation-plan.md](./06-implementation-plan.md): shared-core changes land once, portal branches consume approved versions, and vertical slices merge behind flags.

## Deliverables

1. [Current-state assessment](./01-current-state-assessment.md) — evidence-backed findings, strengths, risks, and prioritization.
2. [Experience framework and information architecture](./02-experience-framework.md) — product principles, service blueprint, lifecycle vocabulary, and target IA.
3. [Figma and design-system specification](./03-figma-design-system-spec.md) — tokens, variables, type, grids, components, naming, and handoff rules.
4. [Resident experience specification](./04-resident-experience-spec.md) — mobile-first journeys, screen contracts, failure paths, copy, and acceptance criteria.
5. [Government experience specification](./05-government-experience-spec.md) — role-aware IA, queue/detail patterns, approvals, responsive behavior, and acceptance criteria.
6. [Implementation and rollout plan](./06-implementation-plan.md) — phases, branch strategy, dependencies, quality gates, migration, rollout, and rollback.
7. [Research and validation plan](./07-research-and-validation-plan.md) — cohorts, studies, metrics, event taxonomy, and privacy rules.
8. [Traceability matrix](./08-traceability-matrix.md) — finding-to-source, branch, acceptance test, and owner mapping.
9. [Visual art direction v0.2](./09-visual-art-direction-v2.md) — the Civic Aperture thesis, light/dark themes, signature motifs, composition, motion, anti-patterns, and migration scope.
10. [Figma production handoff](./10-figma-production-handoff.md) — editable file map, reusable templates, source artifacts, usage rules, Starter-plan constraints, and designer/developer acceptance gates.
11. [Figma component inventory](./11-figma-component-inventory.md) — confirmed page/layer names, component and template inventory, source mapping, parity contract, inspection checklist, and honest API-limit boundary.
12. [Resident-side user stories, QA contract, and SDLC](./12-resident-user-stories-and-sdlc.md) — resident personas, full service cycle, testable stories, endpoint contracts, QA strategy, delivery gates, and release criteria.
13. [Government-side user stories, QA contract, and SDLC](./13-government-user-stories-and-sdlc.md) — capability-based government stories, operational lifecycles, endpoint contracts, QA matrices, SDLC, and release blockers.
14. [End-to-end system lifecycle and API contract](./14-end-to-end-system-lifecycle-and-api-contract.md) — resident-to-government-to-resident service blueprint, data lineage, complete current route inventory, canonical state contracts, cross-system gaps, and integration gates.
15. [Resident-side redesign start packet](./15-resident-redesign-phase-0.md) — Phase 0 evidence, public-home screen contract, component plan, responsive and accessibility requirements, and the exact Figma execution sequence.
16. [Resident public-home visual comp v0.3](./16-resident-public-home-visual-comp-v0.3.md) — paired desktop/mobile and light/dark Civic Aperture comps, Figma anatomy, required corrections, state matrix, and accessibility contract.
17. [Cross-portal UI family examples v0.4](./17-cross-portal-ui-family-examples-v0.4.md) — three coherent directions spanning the public hero, separate resident and government authentication, resident home, government workspace, route model, responsive rules, and Figma production plan.
18. [Futuristic minimal landing exploration v0.5](./18-futuristic-minimal-landing-exploration-v0.5.md) — a bolder Impeccable surface reroll with three cinematic, radically reduced landing compositions and their motion, responsive, accessibility, and cross-portal implications.
19. [Robust minimal civic workspace v0.8](./19-robust-minimal-civic-workspace-v0.8.md) — the Notion-inspired interaction correction that restores complete resident and government capability, separates both login families, defines feature preservation, components, states, responsive behavior, and the next Figma production sequence.
20. [Mobile responsive UI v0.9](./20-mobile-responsive-ui-v0.9.md) — resident-first mobile web and government narrow/field web journeys, navigation, reporting, queue-to-docket transformation, governed actions, connectivity, accessibility, and Figma handoff.
21. [Government website complete design v1.0](./21-government-website-complete-design-v1.0.md) — complete route reconciliation and page atlas for the government website, including access, operations, planning, compliance, records, insights, communications, administration, responsive behavior, toasts, notifications, banners, overlays, system states, 11 end-to-end process contracts, data dependencies, and the exact Figma production sequence.
22. [Government website implementation blueprint v1.0](./22-government-implementation-blueprint-v1.0.md) — framework- and repository-independent execution contract for implementing the approved government direction through portable domain, capability, API, experience, design-system, and platform boundaries; maps all 37 views to delivery waves and defines vertical slices, gates, testing, observability, migration, rollout, rollback, traceability, ownership, and change control.
23. [Antigravity government implementation prompt pack v1.0](./23-antigravity-government-implementation-prompts-v1.0.md) — copy-ready, review-gated prompts for workspace preflight, every government delivery wave, visual correction, accessibility/resilience, authorization/mutation safety, release readiness, and recovery from generic or feature-losing implementation; paired with an always-on Antigravity workspace rule.
24. [Government operating model and automation proposal v1.0](./24-government-operating-model-and-automation-proposal-v1.0.md) — comprehensive operating model, 7-module workspace, role responsibility map, connected record chain, collapsible docket, plain-language analytics, and automation architecture; extended by the [Government System Proposal package](../government-system-proposal/README.md).
25. [Employee dispatch and field PWA proposal v0.1](./25-employee-dispatch-and-field-pwa-proposal-v0.1.md) — employee/crew dispatch, assignment acknowledgement, phone-first field work, updates and evidence, offline recovery, independent review, permissions, and decisions for a dedicated staff PWA.

## Editable Figma file

[Open **PULSO UI Rework — Audit, Core Library & Portal Concepts**](https://www.figma.com/design/1qPgPj4o3smElv8B2B1REi)

The file contains:

- `00 Overview & Foundations`
- `01 Core Library`
- `02 Portal Concepts & Handoff`
- the editable `Foundations/Civic Aperture · v0.2` board
- the editable `Library/Civic Aperture · Production · v0.2` board
- reusable v0.2 component specimens for actions and fields, status and alerts, evidence and records, navigation and decisions, and system states
- reusable `Template/Resident Home · Light · Reviewer final` and `Template/Resident Home · Dark · Reviewer final` components at 390×844
- reusable `Template/Government Citizen reports · Light · Reviewer final` and `Template/Government Citizen reports · Dark · Reviewer final` components at 1440×900
- the original semantic variables, spacing variables, type styles, v0.1 components, and structural screens retained for migration comparison
- accessibility and design-to-development annotations
- the v0.1 high-fidelity concept boards retained as the structural baseline, with v0.2 superseding their visual language

Figma Starter permits only three pages and one mode per variable collection. The file therefore uses paired `PULSO Core / Light` and `PULSO Core / Dark` collections. On a Professional plan, merge these into one `Theme` collection with Light and Dark modes.

The Civic Aperture boards and reviewer-final portal templates are editable Figma objects with live text and semantic layer groups. They are production design references, not coded components. Earlier imports remain archived for traceability. Because the Starter account reached its Figma API limit, the new objects are not yet bound to a consolidated multi-mode variable collection; designers should preserve the documented semantic token roles until that migration is available. See the [Figma production handoff](./10-figma-production-handoff.md) for the exact source and consumption contract.

## Visual review

### Current resident entry

![Current resident login](./assets/current-resident-login-desktop.png)

### Current government entry at 390 px

The staff gateway clips essential content at a common mobile width. This is a P0 responsive issue.

![Current government mobile gateway](./assets/current-government-gateway-mobile.png)

### Civic Aperture resident direction — light and dark

![Resident light and dark concept](./assets/concept-v2-resident-light-dark.png)

### Resident public home v0.3 — desktop light and dark

![Resident public home desktop light](./assets/resident-public-home-desktop-light-v0.3.png)

![Resident public home desktop dark](./assets/resident-public-home-desktop-dark-v0.3.png)

### Resident public home v0.3 — mobile light and dark

![Resident public home mobile light](./assets/resident-public-home-mobile-light-v0.3.png)

![Resident public home mobile dark](./assets/resident-public-home-mobile-dark-v0.3.png)

### Civic Aperture government direction — light and dark

![Government light and dark concept](./assets/concept-v2-government-light-dark.png)

### Civic Aperture shared component language

![PULSO Civic Aperture system concept](./assets/concept-v2-civic-aperture-system.png)

### Robust minimal resident family v0.8

![Resident robust minimal family](./assets/resident-family-robust-minimal-v0.8.png)

### Robust minimal government family v0.8

![Government robust minimal family](./assets/government-family-robust-minimal-v0.8.png)

### Robust minimal light and dark parity v0.8

![Robust minimal light and dark parity](./assets/robust-minimal-theme-parity-v0.8.png)

### Resident mobile responsive family v0.9

![Resident mobile robust minimal journey](./assets/resident-mobile-robust-minimal-v0.9.png)

### Government mobile and narrow-field family v0.9

![Government mobile robust minimal journey](./assets/government-mobile-robust-minimal-v0.9.png)

### Government work orders and projects v1.0

![Government work delivery family](./assets/government-work-delivery-family-v1.0.png)

### Government technical, inspection, procurement, and cost work v1.0

![Government technical and compliance family](./assets/government-technical-compliance-family-v1.0.png)

### Government records, insights, and administration v1.0

![Government records, insights, and administration family](./assets/government-records-insights-admin-family-v1.0.png)

### Government interaction system v1.0

![Government toasts, notifications, overlays, and states](./assets/government-interaction-system-v1.0.png)

### Government end-to-end process blueprints v1.0

![Government process blueprints](./assets/government-process-blueprints-v1.0.png)

The raster boards are design explorations, not implementation specifications. The behavioral contracts in this dossier remain the source of truth. The earlier v0.1 boards remain in `assets/` for comparison and are superseded visually, not structurally.

The built-in ImageGen inputs and constraints are recorded in [concept-v2-imagegen-prompts.md](./assets/concept-v2-imagegen-prompts.md) for reproducibility.

The robust minimal v0.8 ImageGen intent and constraints are recorded in [robust-minimal-v0.8-imagegen-prompts.md](./assets/robust-minimal-v0.8-imagegen-prompts.md). The v0.8 boards replace the rejected minimal-glass study as the active visual proposal; they do not supersede approved Civic Aperture product truth.

The mobile v0.9 ImageGen intent, reference set, and government freshness correction are recorded in [mobile-v0.9-imagegen-prompts.md](./assets/mobile-v0.9-imagegen-prompts.md).

The government-complete v1.0 ImageGen intent, shared constraints, page-family prompts, interaction-system prompt, and process-blueprint prompt are recorded in [government-complete-v1.0-imagegen-prompts.md](./assets/government-complete-v1.0-imagegen-prompts.md).

## Decisions required before implementation

1. Approve one canonical report and project lifecycle across resident, dispatcher, management, field, records, analytics, and mobile surfaces.
2. Approve one role/capability matrix and designate the backend as the authorization authority.
3. Decide which visible controls are functional, intentionally unavailable, or removed. No dead affordance should survive into the rework.
4. Confirm production licensing, Filipino-character coverage, and rendering fallbacks for Archivo / Source Sans 3 / IBM Plex Mono; the Civic Aperture visual direction is approved.
5. Decide whether resident identity/AI failures can enter a manual-review or assisted-service path. The recommendation is yes.
6. Confirm English/Filipino scope for government staff; resident parity is a release gate.
7. Select owners for PULSO Core, resident product, government operations, accessibility/QA, content/localization, and analytics.

## Audit method and limitations

The assessment combined repository inspection, route/flow mapping, static accessibility review, dependency/tooling review, a live Vite session, and responsive browser captures at 1440×900 and 390×844.

The checked-in backend virtual environment points to a Python installation that is not present on this machine. Consequently, authenticated dashboard pages were assessed from source and existing system documentation rather than by completing live authenticated workflows. Public, resident-login, registration, and government-gateway screens were reviewed at runtime. Phase 0 requires a fully running integrated environment and representative role accounts before implementation begins.

No frontend source file was edited. Repository changes in this package are documentation and visual-audit artifacts only.
