# PULSO Civic Aperture v0.2 — Figma production handoff

| Field | Value |
|---|---|
| Status | Ready for product-design iteration and implementation planning |
| Version | 0.2 |
| Last validated | 23 August 2026 |
| Figma file | [PULSO UI Rework — Audit, Core Library & Portal Concepts](https://www.figma.com/design/1qPgPj4o3smElv8B2B1REi) |
| Product code | Not changed |

## 1. Outcome and authority

The existing Figma file now contains an editable Civic Aperture system and four reusable portal templates. The v0.2 work translates the approved concept boards into live text, vector geometry, semantic layer groups, and top-level Figma components. It is intended for design iteration, prototyping, annotation, and engineering handoff.

Authority is intentionally split:

1. product, role, privacy, lifecycle, and failure-path truth comes from the UX dossier;
2. visual language, composition, and theme behavior come from the v0.2 foundations and templates;
3. production behavior is not implied by a static Figma layer and must meet the screen contracts and acceptance gates in this dossier;
4. sample locations, tickets, people, timestamps, maps, evidence, and operational metrics must be replaced or validated by the responsible LGU data owner.

## 2. File map

### `00 Overview & Foundations`

- `Foundations/Civic Aperture · v0.2`
- paired Morning Field Sheet and Night Inspection color roles;
- Archivo, Source Sans 3, and IBM Plex Mono type roles;
- spacing, radius, elevation, motion, Field Aperture, Signal Cut, and theme-parity rules;
- accessibility and release-gate summary.

### `01 Core Library`

- `Library/Civic Aperture · Production · v0.2`
- `Signature/Evidence + record`
- `Action/Controls + fields`
- `Feedback/Status + alerts`
- `Navigation/Portal + decisions`
- `Feedback/System states`
- retained v0.1 components for anatomy comparison and controlled migration.

### `02 Portal Concepts & Handoff`

- `Template/Resident Home · Light · Reviewer final`
- `Template/Resident Home · Dark · Reviewer final`
- `Template/Government Citizen reports · Light · Reviewer final`
- `Template/Government Citizen reports · Dark · Reviewer final`
- retained v0.1 structural screens, concept references, original v0.2 imports, and non-destructive `Archive/... · Preflight` imports for comparison.

The four reviewer-final components are the implementation-planning authority. Use this [direct portal-set view](https://www.figma.com/design/1qPgPj4o3smElv8B2B1REi/PULSO-UI-Rework-%E2%80%94-Audit--Core-Library---Portal-Concepts?node-id=3-187&p=f) when reviewing the paired templates.

Do not detach a template merely to restyle it. Duplicate or instantiate the appropriate light/dark template, preserve the semantic group names, and promote repeated local patterns into the Core Library before creating route-specific copies.

## 3. Editable source artifacts

These files are the native-size, versionable sources used for the v0.2 Figma import:

| Artifact | Size | Purpose |
|---|---:|---|
| [Foundations](./figma-import/foundations-civic-aperture.svg) | 1440×1800 | Visual-system rules and paired semantic foundations |
| [Core library](./figma-import/core-library-civic-aperture.svg) | 1440×2200 | Component anatomy, themes, portal variants, and system states |
| [Resident home — light](./figma-import/resident-home-light.svg) | 390×844 | Morning field-sheet resident template |
| [Resident home — dark](./figma-import/resident-home-dark.svg) | 390×844 | Night resident template with content parity |
| [Government citizen reports — light](./figma-import/government-citizen-reports-light.svg) | 1440×900 | Light operations queue and selected docket |
| [Government citizen reports — dark](./figma-import/government-citizen-reports-dark.svg) | 1440×900 | Night operations queue and selected docket |
| [Government evidence — Figma transport](./figma-import/government-evidence-figma.jpg) | 720×540 | Prompt-bearing JPEG derivative used identically in both editable government templates |

The SVGs contain live text and semantic groups. Resident evidence is synthetic design-study material embedded for a stable concept render and visibly marked as sample content. Government evidence uses a generated true-color electrical-hazard placeholder whose exact prompt is recorded in [the prompt sidecar](./assets/government-electrical-hazard-generated-v2.prompt.txt), embedded in [the source PNG](./assets/government-electrical-hazard-generated-v2.png), and retained in the compact Figma transport JPEG. The government SVGs also include direct light/dark class fallbacks because Figma's SVG importer does not reliably apply ancestor-scoped theme selectors; the fallback values are identical to the documented theme tokens. Replace both evidence sets with governed, consented, representative evidence before production validation.

The [component inventory](./11-figma-component-inventory.md) maps the confirmed Figma layer names to these versioned sources and provides the manual component/instance/variable inspection checklist required while the Starter API limit is active.

## 4. Theme and portal contract

Light and dark are paired environments, not automatic color inversions. Both themes must preserve the same content, hierarchy, control boundaries, target sizes, statuses, recovery paths, and privacy messaging.

| Role | Light | Dark |
|---|---:|---:|
| Canvas | `#F4F7F5` | `#071A2B` |
| Surface | `#FFFFFF` | `#0E283E` |
| Primary text | `#0C2436` | `#F4F7F2` |
| Secondary text | `#465D6C` | `#B9C7CF` |
| Border | `#C9D4D9` | `#335166` |
| Resident action | `#B9380B` | `#FF8A3D` |
| Government action | `#0B4F6C` | `#82C7D8` |
| Resolved | `#0B756B` | `#66D2C8` |
| Warning | `#B45309` | `#FBBF24` |
| Critical | `#B42318` | `#FDA29B` |
| Focus ring | `#2563EB` | `#93C5FD` |

Portal accent changes do not redefine status meaning. Resident orange belongs to resident actions and the shared signal. Government blue belongs to staff actions and operational selection. Success, warning, critical, and focus roles remain stable.

## 5. Signature pattern rules

### Field Aperture

- One evidence or map region anchors the task.
- Four quiet corner marks frame the source; they never simulate a recording interface.
- True-color evidence remains unfiltered and un-tinted.
- Metadata sits on an opaque, readable rail outside the evidence content.
- A list or address alternative is mandatory for map-dependent actions.

### Signal Cut

- A two-pixel route connects evidence to the public or internal record.
- The current step uses one authored notch plus icon, label, and time.
- Completed, current, future, failed, and unavailable stages remain distinguishable without color.
- Status animation may happen once and settle; reduced motion changes state immediately or with a short opacity fade.
- Do not replace Signal Cut with a generic evenly spaced dot stepper.

## 6. Template consumption

### Resident template

Use the resident home component as the reference for 390×844 priority, not as a promise that every device is exactly that size. Preserve this order:

1. identity, language, profile, and current context;
2. dominant evidence with honest metadata;
3. active report identifier and status;
4. issue, location, assignment, and next expected event;
5. public lifecycle;
6. thumb-visible primary report action;
7. stable five-destination bottom navigation.

At 320 px reflow and 200% zoom, content may become longer, but evidence, ticket ID, status, next action, and recovery must not disappear or overlap. English and Filipino content parity is a resident release gate.

### Government template

Use the government component as the reference for a live queue and a selected docket visible in one operational frame. Preserve:

1. role-aware navigation and staff identity;
2. queue context, freshness, filtering/search affordance, and pinned critical work;
3. selected ticket, severity, verification, evidence, and location;
4. lifecycle, case facts, activity provenance, and safe staff-note handling;
5. sticky, explicit decisions: assign work order, request changes, escalate.

The template shows a 72 px compact navigation rail. The previously documented 256 px expanded shell remains a valid component variant for labels and lower-frequency staff use; product and accessibility testing must decide when each state is default.

## 7. Component promotion framework

Promote a pattern into PULSO Core when it appears in two routes, expresses a shared lifecycle or privacy rule, or requires centralized accessibility behavior. Keep it portal-specific when only density, copy, permissions, or action accent differ. Keep it template-local when its composition is route-specific and its anatomy is not reused.

Every promoted component needs:

- a semantic name and purpose statement;
- light/dark and resident/government applicability;
- default, hover, focus, active, disabled, loading, error, empty, offline, and permission-limited behavior where relevant;
- content-length and Filipino-string examples;
- keyboard and screen-reader annotations;
- a data/state contract naming the authoritative backend state;
- an owner and migration status.

## 8. Accessibility, content, and truth gates

- Target WCAG 2.2 AA in both themes.
- Maintain visible 3 px focus treatment and at least 3:1 control-boundary contrast.
- Use 44 px public targets; compact staff controls require validated spacing and an equivalent accessible target.
- Never use color alone for severity, status, assignment, or completion.
- Keep ticket identifiers, coordinates, timestamps, source, and freshness readable and copyable where the workflow requires it.
- Identity reveal requires a named purpose and backend authorization; the interface must not imply access the user does not have.
- AI suggestions are advisory, show confidence/provenance where appropriate, and never replace manual operational judgment.
- Offline, failed upload, unsaved note, stale data, permission-limited, and manual-review paths are part of the component, not later error copy.

## 9. Figma Starter constraints

The connected Starter plan permits three pages and only one mode per variable collection. The existing file therefore retains separate light and dark collections. The Figma API call limit was reached during this design pass, so the new imported v0.2 objects are editable but are not fully bound to a consolidated Theme/Portal/Density variable architecture.

Do not interpret that limitation as permission to change token meaning. Until a Professional-plan migration:

- keep light and dark templates as paired components;
- make content changes in both themes in the same review;
- use the token names and values in this dossier;
- record any local override in the handoff annotation;
- avoid creating a third, ad hoc theme or portal accent.

On Professional, migrate to one `Theme` collection with Light and Dark modes, a `Portal` collection with Resident and Government modes, and a `Density` collection with Comfortable and Compact modes. Rebind the library before deleting or archiving any temporary collection.

## 10. Design-to-development sequence

1. Validate lifecycle, role/capability matrix, bilingual scope, and backend authorization authority.
2. Reconcile Figma tokens with the future shared-core branch; do not copy screen-local hex values into code.
3. Implement and test primitives and system states before route templates.
4. Implement one resident vertical slice and one government vertical slice against real API contracts.
5. Verify responsive behavior, 200% zoom, keyboard flow, screen-reader names, dark mode, reduced motion, forced colors, slow/offline recovery, and Filipino expansion.
6. Compare implementation captures with the native-size templates, recording any deliberate divergence.
7. Promote only validated shared behavior to the shared-core branch.

## 11. Acceptance checklist before implementation approval

- [ ] Canonical public and internal lifecycle approved.
- [ ] Role and capability matrix approved with backend enforcement.
- [ ] Resident Filipino/English content inventory approved.
- [ ] Real or governed representative evidence and map data available.
- [ ] Light/dark content parity reviewed.
- [ ] Focus, contrast, target size, reflow, and reduced-motion annotations reviewed.
- [ ] Empty, loading, error, offline, stale, permission-limited, and manual-review states designed for the first vertical slices.
- [ ] Figma component ownership and branching strategy assigned.
- [ ] Every sample fact is marked for validation or replacement.
- [ ] No dead or visually implied-but-nonfunctional control remains in the implementation scope.

The Figma file is ready for design work now. Product implementation should begin only after the truth, authorization, and accessibility gates above have owners and acceptance tests.
