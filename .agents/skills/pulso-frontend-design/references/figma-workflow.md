# PULSO Figma workflow

## File and current authority

Use [PULSO UI Rework — Audit, Core Library & Portal Concepts](https://www.figma.com/design/1qPgPj4o3smElv8B2B1REi).

Current pages:

1. `00 Overview & Foundations`
2. `01 Core Library`
3. `02 Portal Concepts & Handoff`

Current visual-planning references:

- `Foundations/Civic Aperture · v0.2`
- `Library/Civic Aperture · Production · v0.2`
- `Signature/Evidence + record`
- `Action/Controls + fields`
- `Feedback/Status + alerts`
- `Navigation/Portal + decisions`
- `Feedback/System states`
- `Template/Resident Home · Light · Reviewer final`
- `Template/Resident Home · Dark · Reviewer final`
- `Template/Government Citizen reports · Light · Reviewer final`
- `Template/Government Citizen reports · Dark · Reviewer final`

The dossier governs product, roles, privacy, lifecycle, failures, and acceptance. Figma governs approved visual language, composition, and theme behavior. Static layers do not prove production interaction or authorization.

## Mandatory skill routing

Before any `use_figma` call:

1. load `figma-use`;
2. load `figma-generate-library` when variables, styles, or components are involved;
3. load `figma-generate-design` for a page, screen, view, or multi-section layout;
4. include the official skill names required by those skills in the tool call; and
5. follow their current execution, sequencing, validation, and error-recovery instructions.

Always use `impeccable` and this PULSO skill for design judgment. Do not invent low-level Figma behavior from this reference when the official skill provides it.

## Phase 0: inspect and reconcile

Do not mutate the file until you have:

- inspected pages, top-level frames, local variables, styles, components, and naming;
- discovered available libraries and searched before recreating assets;
- reviewed the relevant light/dark reviewer-final pair;
- checked whether intended components are actual components and whether instances remain linked;
- identified current Auto Layout, constraints, bindings, variants, properties, and unbound local values;
- compared the approved dossier with the live file;
- classified every discrepancy as approved change, proposed change, observed defect, sample content, or unresolved decision; and
- recorded a bounded scope for the design pass.

Never assume the previously documented API limit, node IDs, bindings, or component state still applies. Inspect current reality.

## Source and conflict precedence

1. Approved product truth and Civic Aperture identity.
2. Explicitly approved product/operations decisions.
3. Current Figma visual-planning contract.
4. Proposed UX dossier, clearly labeled.
5. Existing code as observed implementation.

If code, Figma, and the dossier disagree on lifecycle, permission, token, content, or behavior, present the conflict with provenance and seek the relevant owner decision. Do not hide it inside a visual override.

## Build order

For material design-system or screen work:

1. normalize semantic vocabulary and token aliases;
2. create or update variables and text/effect styles;
3. verify scopes, theme behavior, and code syntax where applicable;
4. build atoms before composites and shared patterns;
5. define complete component variants and states;
6. validate each component structurally and visually;
7. compose route templates from instances;
8. add responsive layouts and paired light/dark designs;
9. annotate content, data/state, permission, privacy, accessibility, and implementation behavior;
10. run final paired-theme and cross-portal QA.

Use incremental writes and validation. Fix a failed phase before building on it.

## Variables and current plan limits

Intended future collections:

- `Color / Primitive`
- `Theme`: Light, Dark, High Contrast
- `Portal`: Resident, Government
- `Density`: Comfortable, Compact
- `Scale`
- `Motion`: Full, Reduced

The Starter file currently uses separate `PULSO Core / Light`, `PULSO Core / Dark`, and `PULSO Core / Scale` collections. New v0.2 objects are not fully rebound. Until plan migration:

- update light and dark pairs in the same review;
- preserve semantic token roles and document local overrides;
- do not add a third ad hoc theme;
- do not delete or archive temporary collections before successful rebind and validation;
- do not treat imported SVG values as permission to duplicate screen-local hex values.

Resolve the documented token alias differences before treating the system as machine-binding authority.

## Component and layer construction

- Components use `Domain/Component`.
- Properties use `Property=Value`.
- Layers use semantic names such as `Label`, `Helper`, `Leading icon`, `Status`, and `Evidence metadata`.
- Use Auto Layout for production frames and resizable components.
- Use Fill/Hug intentionally and test long English/Filipino content.
- Bind semantic variables instead of leaving one-off approved colors.
- Keep interaction targets separate from visual icon bounds.
- Component descriptions include purpose, anatomy, use/do-not-use, content, accessibility, data/state contract, owner, and change notes.
- Promote a pattern to PULSO Core when it appears in two routes, carries shared lifecycle/privacy meaning, or centralizes accessibility behavior.
- Keep portal-specific density, copy, permissions, or action accent without forking shared anatomy or state meaning.

Do not detach reviewer-final templates merely to restyle. Instantiate or duplicate the appropriate theme component, preserve semantic group names, and promote repeated local patterns before making route copies.

## Theme-pair contract

Review light and dark together and require:

- identical content, identifiers, status vocabulary, timestamps, next event, actions, and recovery;
- matching information order, semantic groups, target geometry, and privacy messaging;
- identical evidence source, crop, provenance, and sample/validation label;
- preserved semantic token roles and non-color cues;
- equivalent contrast, focus, forced-color behavior, and readability;
- identical 320 px, 200% zoom, reduced-motion, and bilingual expectations.

Theme changes atmosphere, not task capability.

## Required validation

After each meaningful mutation:

- inspect metadata for hierarchy, names, component/instance relations, counts, positions, and bindings;
- capture a screenshot of the affected node or frame;
- check clipping, overlap, text wrap, target size, contrast, and theme parity;
- verify placeholders are removed and sample content remains visibly marked;
- repair the issue before continuing;
- retain exact returned IDs in the workflow state required by the official Figma skill.

At final review, inspect every changed page and component pair. Never infer interaction, accessibility, or code readiness solely from a screenshot.

## Handoff annotations

Every implementation-ready frame includes:

- user/job and measurable outcome;
- artifact status and decision dependencies;
- component/version inventory;
- responsive rules and state matrix;
- English/Filipino content where resident-facing;
- API fields and authoritative state/permission rules;
- privacy, evidence, freshness, and sample-data notes;
- keyboard, focus, screen-reader, contrast, zoom, reflow, and reduced-motion behavior;
- acceptance tests, owner, version, and last validation date.

Figma work does not authorize product-code changes. Stop at the requested artifact boundary.

## Known limitations to keep visible

- “Reviewer final” means current planning authority, not production readiness.
- Prior API limits prevented authoritative inspection of all keys, instances, bindings, bounds, variants, and component properties.
- SVG import preserves editable geometry and text but does not prove Auto Layout, constraints, accessibility, responsiveness, or behavior.
- Archivo, Source Sans 3, and IBM Plex Mono remain pending production validation; Inter may still be the safe placeholder.
- Resident evidence is synthetic; government evidence is generated placeholder material.
- Every displayed ticket, person, location, map, time, status, and metric remains sample data until an LGU data owner validates or replaces it.

See [`10-figma-production-handoff.md`](../../../../docs/ui-ux-audit/10-figma-production-handoff.md) and [`11-figma-component-inventory.md`](../../../../docs/ui-ux-audit/11-figma-component-inventory.md) for the detailed current boundary.
