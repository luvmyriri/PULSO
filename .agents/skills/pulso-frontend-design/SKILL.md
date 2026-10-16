---
name: pulso-frontend-design
description: "Plan, critique, document, or design the PULSO web frontend and its Figma system, including public/resident and government experiences. Use for PULSO UI/UX, flows, information architecture, themes, components, accessibility, design-system work, visual QA, Figma artifacts, or implementation handoff when Civic Aperture and role-specific contracts must be preserved. Do not use for backend-only work."
---

# PULSO Frontend Design

Shape one civic product through two role-specific experiences without losing truth, identity, accessibility, or operational context.

## Required companions

1. Always load and use `impeccable` for every task handled by this skill.
2. Use the distinctive-design guidance from `frontend-design` when selecting or refining visual direction.
3. Treat the shared Figma file as required context for material visual design.
4. Before every `use_figma` call, load the official `figma-use` skill. Add `figma-generate-library` for tokens, styles, or components and `figma-generate-design` for screens or multi-section layouts.
5. Follow the currently loaded official Figma skills for low-level execution. This project skill defines PULSO’s product and design constraints, not a replacement Figma API manual.

If the current phase is explicitly documentation-only, do not write to Figma or product code. Produce the repository artifact and name the next Figma action.

## Route the task

Read only the references required for the task, but read each selected reference completely.

| Task | Required references |
|---|---|
| Shared identity, theme, tokens, visual critique | [`brand-system.md`](./references/brand-system.md), [`quality-gates.md`](./references/quality-gates.md) |
| Government portal, staff flow, queue/detail, approvals | [`brand-system.md`](./references/brand-system.md), [`government-portal.md`](./references/government-portal.md), [`quality-gates.md`](./references/quality-gates.md) |
| Public or resident website, reporting, tracking, updates | [`brand-system.md`](./references/brand-system.md), [`resident-web.md`](./references/resident-web.md), [`quality-gates.md`](./references/quality-gates.md) |
| Figma inspection, library, components, screens, handoff | Relevant experience reference plus [`figma-workflow.md`](./references/figma-workflow.md) and [`quality-gates.md`](./references/quality-gates.md) |
| Cross-portal lifecycle or shared component | All five references |

## Establish authority before designing

Classify every material fact:

- **Approved:** product commitments in [`PRODUCT.md`](../../../PRODUCT.md) and Civic Aperture in [`09-visual-art-direction-v2.md`](../../../docs/ui-ux-audit/09-visual-art-direction-v2.md).
- **Figma working authority:** the production handoff and reviewer-final templates, subject to their documented limitations.
- **Proposed:** target IA, routes, lifecycle, capabilities, detailed workflows, and API contracts until their named owners approve them.
- **Observed:** current code, runtime behavior, screenshots, and defects.
- **Sample:** generated evidence, people, locations, tickets, times, maps, metrics, and other study data.

Never present a proposal, sample, static layer, or current defect as approved product behavior. Surface unresolved conflicts instead of silently resolving them.

## Workflow

### 1. Frame the job

State:

- primary audience: public, resident, government, or cross-portal;
- task and decision the interface must support;
- current artifact status and requested deliverable;
- real constraints: permissions, lifecycle, evidence, privacy, language, connectivity, viewport, and theme;
- what is explicitly outside scope, especially implementation.

### 2. Inspect before proposing

- Read the authoritative repository sources and the relevant experience reference.
- Inspect current implementation only when the task depends on observed behavior.
- Inspect the live Figma file before material visual decisions or Figma mutation.
- Inventory reusable tokens, components, templates, naming, themes, and known gaps.
- Preserve useful existing information architecture while identifying generic, misleading, inaccessible, or nonfunctional presentation.

### 3. Shape one decisive direction

- Use Civic Aperture as the identity, not a neutral SaaS kit.
- Select one clear hierarchy, density, signature moment, and action priority for the screen.
- Translate external product references into interaction principles only; never clone their trade dress.
- Use cinematic emphasis only where evidence, place, lifecycle, or public accountability benefits.
- Define real content, states, failures, responsive behavior, and accessibility before high-fidelity polish.

### 4. Design the system before the route

For material Figma work:

1. inspect the file and available libraries;
2. reconcile approved tokens and unresolved aliases;
3. establish or update variables and styles;
4. build or normalize reusable components and complete state variants;
5. compose the route from component instances;
6. create paired light/dark designs in the same review;
7. annotate behavior, data authority, permissions, responsive rules, and accessibility;
8. validate structure and screenshots after each meaningful change.

Do not detach reviewer-final templates merely to restyle them. Do not create route-local copies of a pattern that belongs in PULSO Core.

### 5. Validate the whole experience

Apply [`quality-gates.md`](./references/quality-gates.md). In particular, test task continuity, state truth, theme parity, keyboard behavior, non-color meaning, 320 px reflow, 200% zoom, reduced motion, forced colors, bilingual resident expansion, and failure recovery.

Fix failed validation before declaring the artifact ready. “Reviewer final” means a current planning reference, not proof of production behavior.

### 6. Document the handoff

Deliver the smallest complete contract that enables the next team to work without guessing:

- outcome and user job;
- approved/proposed/observed decisions;
- flow and state matrix;
- Figma file/page/component links;
- component and token dependencies;
- responsive and theme rules;
- copy/localization, data, permission, privacy, and evidence contracts;
- accessibility annotations and acceptance tests;
- unresolved decisions, owner, version, and last validation date.

Stop before product code unless implementation is explicitly authorized.

## Non-negotiables

- Truth before polish; backend state and authorization remain authoritative.
- One civic record, two useful views; lifecycle meaning and accessibility do not fork by portal.
- Resident action uses ember; government action uses Field Blue; status colors remain semantic.
- Evidence remains true-color with source, time, location, and review state where available.
- AI advises and exposes limits; human review remains available for consequential uncertainty.
- Light and dark preserve identical meaning and task capability.
- Target WCAG 2.2 AA and English/Filipino functional parity for resident-facing experiences.
- No dead controls, fake coordinates, fabricated metrics, unmarked sample content, or implied verification.
- No card-everywhere UI, generic dot steppers, giant logo mastheads, glass, neon, gradients, decorative 3D, or ornamental motion.

## Primary sources

- [`PRODUCT.md`](../../../PRODUCT.md)
- [`Frontend and UX dossier`](../../../docs/ui-ux-audit/README.md)
- [`Experience framework`](../../../docs/ui-ux-audit/02-experience-framework.md)
- [`Figma design-system specification`](../../../docs/ui-ux-audit/03-figma-design-system-spec.md)
- [`Resident experience specification`](../../../docs/ui-ux-audit/04-resident-experience-spec.md)
- [`Government experience specification`](../../../docs/ui-ux-audit/05-government-experience-spec.md)
- [`Civic Aperture art direction`](../../../docs/ui-ux-audit/09-visual-art-direction-v2.md)
- [`Figma production handoff`](../../../docs/ui-ux-audit/10-figma-production-handoff.md)
- [`Figma component inventory`](../../../docs/ui-ux-audit/11-figma-component-inventory.md)
- [`Resident user stories and SDLC`](../../../docs/ui-ux-audit/12-resident-user-stories-and-sdlc.md)
- [`Government user stories and SDLC`](../../../docs/ui-ux-audit/13-government-user-stories-and-sdlc.md)
- [`End-to-end lifecycle and API contract`](../../../docs/ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md)
