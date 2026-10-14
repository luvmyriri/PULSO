# PULSO Civic Aperture v0.2 — Figma component inventory

| Field | Value |
|---|---|
| Figma file | [PULSO UI Rework — Audit, Core Library & Portal Concepts](https://www.figma.com/design/1qPgPj4o3smElv8B2B1REi) |
| Inventory date | 23 August 2026 |
| Scope | Existing Civic Aperture v0.2 boards, component specimens, and portal template components |
| Evidence basis | Visually confirmed Figma page/layer tree, versioned SVG sources, [design-system specification](./03-figma-design-system-spec.md), and [production handoff](./10-figma-production-handoff.md) |

This is an inspection inventory, not an export of Figma's component API. Component conversion was visually confirmed in the Figma layer tree. API-level instance, component-key, and variable inspection was unavailable after the connected Starter account reached its rate limit. No node IDs, instance counts, variable bindings, or individual component bounds are asserted below.

## File map

The Starter file contains the following three pages:

1. `00 Overview & Foundations`
2. `01 Core Library`
3. `02 Portal Concepts & Handoff`

### Production boards

| Page | Confirmed layer name | Native size | Versioned SVG source | Expected top-level semantic groups |
|---|---|---:|---|---|
| `00 Overview & Foundations` | `Foundations/Civic Aperture · v0.2` | 1440×1800 | [Foundations](./figma-import/foundations-civic-aperture.svg) | `Header`, `Semantic-color`, `Typography`, `Scale-and-motion`, `Signature-principles`, `Accessibility`, `Footer` |
| `01 Core Library` | `Library/Civic Aperture · Production · v0.2` | 1440×2200 | [Core library](./figma-import/core-library-civic-aperture.svg) | `Header`, `Actions-and-fields`, `Status-and-feedback`, `Surface-evidence-record`, `Navigation-and-decisions`, `System-states`, `Footer` |

The listed sizes come from the versioned SVG roots and the documented native-size import contract. They should be rechecked in Figma's Design panel before an export or handoff.

## Component specimens

All five specimens are confirmed by name under `01 Core Library` and are represented on the 1440×2200 Core Library source board. Their individual Figma width and height values were not available through the rate-limited API, so this inventory deliberately does not derive or invent bounding boxes from the artwork.

| Confirmed component specimen | SVG source region | Expected semantic groups and content |
|---|---|---|
| `Signature/Evidence + record` | [Core library](./figma-import/core-library-civic-aperture.svg) | `Surface-evidence-record`; paired `Surface-light` / `Surface-dark`; `FieldAperture-light` / `FieldAperture-dark`; `CoordinateRail-light` / `CoordinateRail-dark`; `SignalCut-light` / `SignalCut-dark` |
| `Action/Controls + fields` | [Core library](./figma-import/core-library-civic-aperture.svg) | `Actions-and-fields`; paired button, focus, loading, disabled, field, select, checkbox, helper, and error examples |
| `Feedback/Status + alerts` | [Core library](./figma-import/core-library-civic-aperture.svg) | `Status-and-feedback`; paired `Status-light` / `Status-dark` and `Alerts-light` / `Alerts-dark`; text, icon, and shape carry status together |
| `Navigation/Portal + decisions` | [Core library](./figma-import/core-library-civic-aperture.svg) | `Navigation-and-decisions`; paired resident bottom navigation and government navigation/decision specimens; portal accent changes without changing status meaning |
| `Feedback/System states` | [Core library](./figma-import/core-library-civic-aperture.svg) | `System-states`; paired `States-light` / `States-dark`; loading, empty, error, offline, and permission-limited recovery examples |

## Portal template components

| Page | Confirmed template component | Native size | Versioned SVG source | Expected semantic groups |
|---|---|---:|---|---|
| `02 Portal Concepts & Handoff` | `Template/Resident Home · Light · Reviewer final` | 390×844 | [Resident home — light](./figma-import/resident-home-light.svg) | Root screen, status bar, app header, greeting, coordinate rail, field aperture, evidence image/frame/source/metadata, active report, map preview, report details, Signal Cut, primary report action, five-destination bottom navigation |
| `02 Portal Concepts & Handoff` | `Template/Resident Home · Dark · Reviewer final` | 390×844 | [Resident home — dark](./figma-import/resident-home-dark.svg) | Same resident information and group contract as Light; theme styling changes, meaning does not |
| `02 Portal Concepts & Handoff` | `Template/Government Citizen reports · Light · Reviewer final` | 1440×900 | [Government citizen reports — light](./figma-import/government-citizen-reports-light.svg) | Root screen, navigation rail, top bar, queue pane and report rows, case docket/header/body, Field Aperture, evidence metadata, map/coordinate rail, Signal Cut, case facts, activity, decision rail, live-status rail |
| `02 Portal Concepts & Handoff` | `Template/Government Citizen reports · Dark · Reviewer final` | 1440×900 | [Government citizen reports — dark](./figma-import/government-citizen-reports-dark.svg) | Same government queue, selected docket, evidence/location, lifecycle, facts, activity, decision, and live-status contract as Light |

Earlier government imports are preserved as `Archive/Government Citizen reports · Light · Preflight` and `Archive/Government Citizen reports · Dark · Preflight`; original v0.2 template components without the `Reviewer final` suffix also remain for traceability. They are comparison artifacts, not handoff authority.

The resident evidence raster is synthetic design-study material derived from [the approved resident concept](./assets/concept-v2-resident-light-dark.png); its recipe is retained in the [concept-generation record](./assets/concept-v2-imagegen-prompts.md). Both resident SVGs visibly label it `SYNTHETIC SAMPLE`, retain identical provenance-bearing JPEG bytes, and require governed resident evidence before production.

## Theme-parity inspection contract

Light and dark are paired operating environments, not automatic inversions. Review each pair in the same session and require all of the following:

- identical native dimensions and viewBox;
- identical visible content, record identifiers, status vocabulary, timestamps, next event, navigation destinations, and available actions;
- matching information order, semantic group coverage, target geometry, and recovery paths;
- true-color evidence with the same source, sample/validation state, crop, and metadata;
- semantic token roles preserved across themes: canvas, surface, primary/secondary text, border, portal action, resolved, warning, critical, and focus;
- Field Aperture and Signal Cut remain the same authored mechanisms in both themes;
- no state or severity conveyed by color alone;
- resident English/Filipino expansion, 320 px reflow, 200% zoom, keyboard focus, forced colors, reduced motion, and WCAG 2.2 AA remain release checks.

For the resident pair, the versioned sources are expected to match text-for-text except for the accessible Light/Dark title and theme-specific styling. For the government pair, compare the queue, selected record, evidence/location, lifecycle, case facts, activity, and decisions; nested SVG group depth may differ, so inspect meaning and editability rather than assuming identical layer counts.

## Practical manual inspection checklist

- [ ] Open the Figma file and confirm exactly the three page names listed above.
- [ ] On `00 Overview & Foundations`, select `Foundations/Civic Aperture · v0.2`; confirm 1440×1800 and the expected semantic sections.
- [ ] On `01 Core Library`, select `Library/Civic Aperture · Production · v0.2`; confirm 1440×2200 and the five named component specimens.
- [ ] Select each specimen and verify Figma identifies it as a component, not merely a frame or group. Record its actual width and height in this inventory when API access returns.
- [ ] Inspect light/dark anatomy inside each specimen for the same controls, labels, status meaning, boundaries, and recovery examples.
- [ ] On `02 Portal Concepts & Handoff`, select the four `Template/... · Reviewer final` layers; confirm component status and the documented 390×844 or 1440×900 size.
- [ ] Create a temporary instance of each template and verify it remains linked to its main component. Remove the temporary inspection instances afterward; do not detach production templates.
- [ ] Compare each Light/Dark template pair side by side for content, hierarchy, group coverage, target geometry, and sample-data labels.
- [ ] Confirm the resident raster is visibly marked `SYNTHETIC SAMPLE`; do not treat the embedded crop, ticket, person, location, timestamp, assignment, or status as production data.
- [ ] Confirm Field Aperture uses one evidence/map anchor with an opaque metadata rail, and Signal Cut uses authored current/completed/future states rather than color-only dots.
- [ ] Inspect the Variables panel without assuming bindings: document which fills, text styles, effects, and component properties are actually bound, and log unbound local values for migration.
- [ ] Check Auto Layout, Fill/Hug behavior, constraints, component descriptions, keyboard/focus annotations, bilingual examples, and loading/empty/error/offline/permission-limited states.
- [ ] Record any detached instances, renamed layers, missing dark counterpart, local override, or size drift before approving handoff.

## Known limitations

- Figma Starter permits only three pages and one mode per variable collection; light and dark collections remain separate pending a Professional-plan migration.
- The API rate limit prevented authoritative inspection of node IDs, main-component keys, instance relationships, variable collections/modes, bindings, and per-component bounds. The layer-tree confirmation does not substitute for that API-level audit.
- SVG import preserves inspectable live text and semantic groups, but it does not prove Auto Layout, constraints, variants, properties, interactions, accessibility semantics, or production behavior.
- Fonts and effects must be checked on the inspecting workstation; the SVGs include fallbacks, while the intended type system is Archivo, Source Sans 3, and IBM Plex Mono.
- The component specimens are broad visual/anatomy references. Their full interactive state matrices and backend authority contracts remain governed by the design-system specification and production handoff.
- The resident raster and every displayed ticket, person, location, timestamp, assignment, status, map, and metric are design-study/sample content until a responsible LGU data owner validates or replaces them.
- Product code is outside this artifact inventory and was not modified by this design pass.
