# PULSO repository agent guidance

## Scope

These instructions apply to the entire repository. More specific `AGENTS.md` files may add local rules but must not weaken the product-truth, accessibility, authorization, or design-system requirements here.

PULSO is a City Engineering Department Management System with two connected web experiences:

- a public and resident service for reporting, evidence capture, tracking, and city updates; and
- a government operations workspace for triage, assignment, field work, approvals, records, analytics, and administration.

Both experiences present the same civic record through interfaces designed for different jobs.

## Mandatory frontend-design workflow

For every PULSO task involving frontend design, UI/UX, information architecture, flows, visual review, themes, components, design systems, prototypes, or Figma:

1. Load and use the `impeccable` skill first. Use its planning/shape guidance for documentation work and its relevant design guidance for visual work.
2. Load and use the project skill [`$pulso-frontend-design`](./.agents/skills/pulso-frontend-design/SKILL.md).
3. Treat Figma as a required design source for material visual work. Inspect and reconcile the current file before final visual decisions, and carry approved visual deliverables into reusable Figma artifacts.
4. Before every `use_figma` call, including reads, load the official `figma-use` skill. Also load `figma-generate-library` for variables, styles, or components and `figma-generate-design` for screens or multi-section layouts. Follow the currently loaded official Figma instructions for execution details.
5. Never claim a Figma change unless the write succeeded and the result was structurally and visually validated. Never invent node IDs, bindings, component status, or prototype behavior.

If the user explicitly limits a phase to repository artifacts, plans, or documentation, do not mutate Figma in that phase. Record the next Figma action and continue in the shared file when the design phase begins.

Pure backend, infrastructure, and data tasks do not need this frontend-design workflow unless they change a user-facing contract.

## No-code boundary

Plans, audits, specifications, design-system documentation, and Figma work do not authorize product-code changes. Do not edit `frontend/`, `backend/`, or `mobile_app/` unless the user separately and explicitly requests implementation.

When implementation is authorized later:

- reconcile the approved UX contract and Figma artifact before coding;
- implement shared primitives before route-specific composition;
- preserve backend authorization as the security authority; and
- verify the implementation against Figma, responsive behavior, real states, and accessibility acceptance criteria.

## Authority and status discipline

Do not collapse approved, proposed, and observed material into one source of truth.

1. [`PRODUCT.md`](./PRODUCT.md) defines approved product commitments, constraints, and principles.
2. [`09-visual-art-direction-v2.md`](./docs/ui-ux-audit/09-visual-art-direction-v2.md) defines the user-approved Civic Aperture visual direction.
3. [`03-figma-design-system-spec.md`](./docs/ui-ux-audit/03-figma-design-system-spec.md), [`10-figma-production-handoff.md`](./docs/ui-ux-audit/10-figma-production-handoff.md), and [`11-figma-component-inventory.md`](./docs/ui-ux-audit/11-figma-component-inventory.md) define the current Figma working contract and its limitations.
4. The experience, resident, government, user-story, lifecycle, and API documents are detailed proposals until the named product and LGU decision owners approve them. Label proposed routes, status models, capabilities, and workflows as proposed.
5. Existing source code and runtime captures describe observed current behavior. They do not override approved product truth or automatically become target UX.

When sources conflict, report the conflict and its provenance. Do not silently choose a lifecycle, permission model, token alias, navigation default, or production claim.

## Visual north star: Civic Aperture

The approved thesis is: **A field observation becomes visible, accountable public work.**

The website must feel minimalist, vibrant, professional, locally grounded, and selectively cinematic. “Cinematic” means controlled framing, scale, light, contrast, and pacing. It does not mean neon, glass, black gradients, particles, aurora blobs, decorative 3D, or theatrical command-center styling.

Preserve these PULSO signatures:

- **Field Aperture:** one dominant true-color evidence or map region, quiet corner marks, and readable metadata outside the image.
- **Signal Cut:** the two-pixel heartbeat-derived route for lifecycle, selection, location, approval, and audit context; always pair it with text, icon/shape, and time where relevant.
- **Coordinate Rail:** real ticket, barangay, coordinate, source, freshness, or time data only.
- **Local cartography:** governed North Caloocan context with text/list alternatives.
- **Engineering pictograms:** custom domain icons for civic infrastructure; familiar icons for universal actions.

Do not filter resident evidence, place explanatory text over evidence, fabricate coordinates, or use technical decoration without real data.

### Light and dark

- Light mode is **Morning Field Sheet**: mineral canvas, white work surfaces, crisp rules, natural evidence, restrained shadows.
- Dark mode is **Night Inspection**: deep survey blue, tonal separation, pale operational accents, true-color evidence, no glow.
- Both themes must preserve identical meaning, content, hierarchy, control boundaries, target geometry, status language, privacy messaging, and recovery paths.
- Portal accents never redefine semantic status colors. Resident action is ember; government action is Field Blue; resolved, warning, critical, and focus remain stable semantic roles.

## Government experience: precise operations

Design the government portal as an **Operate** workspace: calm, role-aware, information-dense, and traceable.

Translate the best interaction principles from Notion and ChatGPT:

- quiet editorial hierarchy and plain labels;
- compact persistent navigation and strong current-context awareness;
- progressive disclosure without hidden critical actions;
- fast search, commands, filters, and deep links;
- restrained surfaces and confident density;
- continuity from queue to record to decision.

Do not clone either product’s trade dress, generic monochrome shell, navigation vocabulary, or AI-chat layout. “Futuristic” comes from precise state, provenance, freshness, responsive density, intelligent assistance with limits, and subtle one-time motion—not science-fiction ornament.

Government invariants:

- preserve scope, filters, selected record, freshness, lifecycle, and permissible actions across navigation and mutations;
- use queue/detail where it supports the job; present the selected case as an engineering docket, not a generic drawer;
- let evidence and location carry visual emphasis while routine rows remain nearly monochrome;
- use explicit, consequence-aware decisions and immutable activity history;
- show only server-authorized navigation, fields, data, and actions;
- never render a failed fetch as a legitimate empty state;
- require governed confirmation for destructive, monetary, permission, emergency, retention, and lifecycle actions; and
- retain map list alternatives, accessible table semantics, and usable narrow/zoomed layouts.

The government IA, capability matrix, lifecycle mapping, emergency policy, and 72 px versus 256 px default navigation remain proposed until approved. Preserve those decisions as explicit design forks.

## Resident and public experience: clear civic participation

Prioritize the resident website before expanding the authenticated portal. It must explain PULSO quickly and make reporting, tracking, and understanding updates feel familiar without turning public service into social entertainment.

Translate the useful interaction principles from Netflix and Facebook:

- immediate visual orientation through one evidence-led focal region;
- a clear “continue where I left off” active-report object;
- grouped, scannable sections for active reports, city updates, nearby privacy-safe issues, and services;
- familiar persistent navigation, deep-linked notifications, account context, and one obvious creation action.

Do not copy trade dress, autoplay heroes, endless carousels, infinite feeds, engagement ranking, likes, shares, follower counts, public resident profiles, vanity metrics, or algorithmic opacity.

Resident invariants:

- the first public viewport explains what PULSO does, who it serves, and the next action;
- expose `Report an issue`, `Track a report`, and resident sign-in clearly; keep staff sign-in separate and quiet;
- preserve one thumb-visible report action and exactly one navigation model per breakpoint;
- use five stable mobile destinations: Home, My reports, Report, Updates, Account;
- give containment to persistent task objects, not every section; use open ruled lists for updates and nearby issues;
- make reporting guided, URL/history-aware, draft-preserving, reload-safe, and recoverable;
- never imply verified identity, location, jurisdiction, classification, submission, assignment, or resolution without authoritative state;
- provide English and Filipino functional parity; and
- assume uneven connectivity, denied camera/location permissions, AI/provider failure, and a need for human review or assisted service.

The detailed resident routes, status vocabulary, verification policy, and lifecycle are proposed until approved and validated with residents.

## Shared quality gates

Every material component, pattern, and screen must define, where applicable:

- default, hover, focus, pressed, selected, disabled, and loading states;
- first-use empty, filtered empty, partial, stale, offline, permission-limited, recoverable error, system error, and success states;
- authoritative data/state, freshness, provenance, permission, and privacy behavior;
- keyboard behavior, focus destination/return, accessible name, announcement, and non-color status cue;
- light/dark parity, reduced motion, forced colors/high contrast, 320 px reflow, and 200% zoom;
- English/Filipino examples and content expansion for resident-facing material;
- responsive behavior rather than desktop-only shrinking; and
- analytics and acceptance criteria only when backed by a real measurement plan.

Target WCAG 2.2 AA. Use a visible 3 px focus treatment. Public targets are generally at least 44×44 px. Evidence needs text alternatives; maps need address/list alternatives; charts need summaries and data-table access.

No dead controls, false “real-time” claims, fabricated outcomes, unmarked sample data, or UI-only authorization are acceptable.

## Figma working contract

Use the existing file: [PULSO UI Rework — Audit, Core Library & Portal Concepts](https://www.figma.com/design/1qPgPj4o3smElv8B2B1REi).

Current pages:

1. `00 Overview & Foundations`
2. `01 Core Library`
3. `02 Portal Concepts & Handoff`

Use `Foundations/Civic Aperture · v0.2`, `Library/Civic Aperture · Production · v0.2`, and the four `Template/... · Reviewer final` components as current visual-planning references. Instantiate or duplicate the appropriate paired template, preserve semantic group names, and promote repeated patterns into Core Library. Do not detach a production template merely to restyle it.

Use `Domain/Component` names, `Property=Value` variants, semantic layer names, Auto Layout, intentional Fill/Hug behavior, and semantic variables. Variables and shared component behavior precede route templates.

Known limitations must remain visible: Starter currently uses separate light/dark collections, v0.2 objects are not fully rebound, typography is provisional, sample evidence/data are not production content, and prior API limits prevented authoritative inspection of all bindings, keys, variants, and instance relationships. Inspect the live file before relying on any of these details.

## Documentation and handoff

Every implementation-ready Figma frame and associated specification must include:

- user/job and intended outcome;
- artifact status: observed, proposed, approved, or deprecated;
- component/version inventory and responsive rules;
- complete state and failure-path matrix;
- content/localization contract;
- API fields, authoritative lifecycle/state, and permission rule;
- privacy, evidence, and sample-data notes;
- accessibility annotations and acceptance tests;
- analytics only when valid and measurable;
- owner, version, last validated date, and decision dependencies.

A screenshot is evidence, not a complete handoff. A polished mockup is not permission to invent behavior.

## Core references

- [`PRODUCT.md`](./PRODUCT.md)
- [`docs/ui-ux-audit/README.md`](./docs/ui-ux-audit/README.md)
- [`02-experience-framework.md`](./docs/ui-ux-audit/02-experience-framework.md)
- [`03-figma-design-system-spec.md`](./docs/ui-ux-audit/03-figma-design-system-spec.md)
- [`04-resident-experience-spec.md`](./docs/ui-ux-audit/04-resident-experience-spec.md)
- [`05-government-experience-spec.md`](./docs/ui-ux-audit/05-government-experience-spec.md)
- [`09-visual-art-direction-v2.md`](./docs/ui-ux-audit/09-visual-art-direction-v2.md)
- [`10-figma-production-handoff.md`](./docs/ui-ux-audit/10-figma-production-handoff.md)
- [`11-figma-component-inventory.md`](./docs/ui-ux-audit/11-figma-component-inventory.md)
- [`12-resident-user-stories-and-sdlc.md`](./docs/ui-ux-audit/12-resident-user-stories-and-sdlc.md)
- [`13-government-user-stories-and-sdlc.md`](./docs/ui-ux-audit/13-government-user-stories-and-sdlc.md)
- [`14-end-to-end-system-lifecycle-and-api-contract.md`](./docs/ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md)
