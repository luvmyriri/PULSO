# Audit and implementation traceability matrix

| Field | Value |
|---|---|
| Status | Working control document |
| Version | 0.2 |
| Last validated | 23 August 2026 |

This matrix prevents the rework from becoming an untraceable visual exercise. Line references describe the audited baseline and will move as implementation begins. Future tickets should link a stable issue/ADR and update this document.

## 1. Finding-to-delivery traceability

| ID | Finding / evidence | Priority | Future outcome | Branch | Acceptance evidence | Accountable owner |
|---|---|---:|---|---|---|---|
| F-001 | Fixed 256 px government sidebar; `GovSidebar.jsx:233-244` | P0 | expanded/rail/drawer staff shell | Government + Core | 390/768/1024/1280 screenshots; keyboard drawer test | Gov FE lead |
| F-002 | Resident top nav has two 200 px minimum regions; `ResidentDashboard.jsx:2352,2412`; 350 px feed at `:3783` | P0 | one nav model per breakpoint | Resident + Core | 320/390 reflow and 200% zoom | Resident FE lead |
| F-003 | Jurisdiction check always true; `ResidentDashboard.jsx:2577-2581` | P0 | truthful location state machine + server confirmation | Resident | integration/E2E for inside/outside/denied/error/default pin | Resident product + backend |
| F-004 | Exact location description captured at `:1669-1677,2901` but absent from payload at `:3341-3346` | P0 | visible field → API → review → detail | Resident | contract test and persisted-report assertion | Resident FE + backend |
| F-005 | `handleViewReport` defined at `:2813-2823` but not passed to `MyReports` at `:3817-3827` | P0 | URL-addressable report detail/timeline | Resident | card/notification/deep-link/reload/back E2E | Resident FE lead |
| F-006 | Notification delete uses undefined `token`; `ResidentDashboard.jsx:2476-2485` | P0 | shared session/API client and undo/error state | Core + Resident | component/integration test with expired session | Core FE lead |
| F-007 | Role definitions repeated across `ProtectedRoute`, `rbac_utils`, `GovSidebar`, `GovLanding`, user management | P0 | canonical backend-owned capability registry | Core + Government | executable role/route/action/data matrix | Security/backend owner |
| F-008 | Settings nav visible broadly but route admin-guarded; `GovSidebar.jsx:325`, `App.jsx:184-187` | P0 | nav, route, page and action agreement | Government | per-role sidebar + deep-link E2E | Gov FE + security |
| F-009 | Hard-coded assignment IDs; `DispatcherDashboard.jsx:748-753,3102-3107,3195-3206` | P0 | eligible assignee service/pattern | Government | no-team/eligible/unavailable/confirm E2E | Operations + backend |
| F-010 | Permanent delete bypass pattern; `DispatcherDashboard.jsx:918-969,2011-2017` | P0 | archive/void/legal-hold workflow | Government | permission/reason/audit/recovery policy test | Records + security |
| F-011 | Nested interactions in report card; `DispatcherDashboard.jsx:1885-2020` | P0 | semantic row/card with separate controls | Government + Core | keyboard/screen-reader interaction test | Gov FE + a11y |
| F-012 | No shared focus-visible/dialog contract; many `outline-none` uses | P0 | primitives with visible focus and overlay behavior | Core | axe + keyboard + NVDA/VoiceOver manual pass | A11y/QA lead |
| F-013 | Custom `OrangeSelect` lacks full combobox/listbox behavior; `OrangeSelect.jsx:45-133` | P0 | native select or proven accessible combobox | Core | APG keyboard/semantics test | Core FE + a11y |
| F-014 | Global scrollbars hidden; `index.css:53-58` | P1 | visible narrow scrollbars and overflow cues | Core | desktop/high-contrast/nested-scroll check | Design-system owner |
| F-015 | Primary `#F97316` used for small text/white controls | P1 | `#C2410C` resident action; pulse kept decorative | Core | automated + manual contrast matrix | Design + a11y |
| F-016 | Declared Inter/Oswald not loaded; `index.css:17-18`, `index.html` | P1 | approved font roles, files/fallbacks, glyph tests | Core | render/EN-FIL/Windows/mobile snapshots | Design-system owner |
| F-017 | Hidden light/dark Spline scenes and looping motion | P1 | lightweight auth visual; route/media lazy loading; reduced motion | Core + portals | bundle/CWV/reduced-motion tests | Performance owner |
| F-018 | Fetch errors become empty arrays/No records; `GovDivisionPage.jsx:920,1070,1493` | P1 | distinct empty/filtered/denied/stale/error states | Core + Government | state-fixture component/integration tests | Gov FE lead |
| F-019 | Dead/prototype actions on landing/search/settings | P1 | functional / disabled with reason / removed register | Portal owners | signed control register + E2E for retained controls | Product owners |
| F-020 | Dark map can lose jurisdiction treatment; `ResidentDashboard.jsx:2583-2598` | P1 | information-equivalent map themes | Resident + Core | visual/data parity in both themes | Maps owner |
| F-021 | Partial i18n and fixed `lang="en"`; language switcher hidden on gov routes | P1 | resident EN/FIL parity and dynamic document language | Core + Resident | locale completeness, pseudolocalization, AT language test | Content/localization |
| F-022 | Militarized/technical copy across government and auth screens | P1 | calm action/outcome vocabulary | Both portals | content review + comprehension test | Content design |
| F-023 | Resident Trust Score lacks transparent policy/appeal | P1 | remove pending policy or fully explain/govern | Resident | signed policy, user comprehension, harm review | Product/privacy |
| F-024 | Conflicting five/six/thirteen-phase project models | P0 | one canonical lifecycle and mapping | Core + Government | signed state model + transition contract tests | Operations/product |
| F-025 | `ManagementDashboard` passes incorrect sidebar prop; `ManagementDashboard.jsx:262` | P0 | shared routed shell and typed/verified contract | Government | interaction test for sidebar tab action | Gov FE lead |
| F-026 | Position quick-action tab context is dropped; `PositionDashboard.jsx:723-733` | P1 | scoped URLs/saved view context | Government | direct-link and back-context E2E | Gov FE lead |
| F-027 | Eager route imports; `App.jsx:5-18` | P1 | route/domain lazy loading | Core | production bundle and route-load budget | Performance owner |
| F-028 | No frontend test script/Storybook/axe/visual regression; `package.json:6-46` | P0 | quality harness and component catalog | Core | CI runs all gates | QA + Core FE |
| F-029 | Lint baseline 170 problems | P1 | changed-file zero-new + ratcheted legacy cleanup | All | CI report trending to zero | Frontend lead |
| F-030 | Dependency install reports 12 vulnerabilities | P1 | reviewed dependency remediation workstream | Core/security | approved audit/remediation report; regression tests | Security/FE lead |

## 2. Current-to-target component mapping

This is a planning map, not permission to refactor before Phase 0.

| Current area | Target design-system/feature destination | First characterization required |
|---|---|---|
| `components/Branding.jsx` and duplicate lockups | `Brand/Lockup` | size, seal use, dark/light, clear space, no animation |
| `components/ThemeToggle.jsx` and duplicates | `Action/SegmentedControl` + theme preference | selected state, system behavior, persistence, accessible name |
| `components/OrangeSelect.jsx` | native select or `Field/Combobox` | keyboard, filtering, Escape, focus restore, errors |
| date-picker implementations | `Field/Date` | typed entry, locale, min/max, calendar keyboard behavior |
| `TermsModal`, upload/camera overlays, page modals | `Overlay/Dialog` / `Drawer` | focus, Escape, outside interaction, return focus, async close |
| local status maps in resident/gov pages | canonical lifecycle + `Data/StatusBadge` + `SignalCut` | mapping of every backend state and exceptional branch |
| `GovSidebar.jsx` | `GovernmentShell` + `Gov/Nav*` | route/capability/scroll persistence and responsive behavior |
| resident TopNavigation + bottom nav | `ResidentShell` | breakpoint visibility, route mapping, account/language/alerts |
| report cards/list/table variants | `Data/RecordCard`, `RecordTable`, portal composites | row actions, selection, keyboard, responsive alternative |
| bespoke alerts/toasts/`alert()` | shared feedback hierarchy | severity, timeout, announcement, persistence, undo |
| chart/map panels | `Chart/Frame`, `Map/*` | definitions, freshness, summary/table/list equivalent |
| `ProtectedRoute` + `rbac_utils` + page role lists | session/capability policy module | authoritative backend response and full role/action matrix |

## 3. Document coverage

| Decision/workstream | Governing document |
|---|---|
| Current findings and priority | [01-current-state-assessment.md](./01-current-state-assessment.md) |
| Product principles, IA, canonical statuses | [02-experience-framework.md](./02-experience-framework.md) |
| Tokens, components, Figma, handoff | [03-figma-design-system-spec.md](./03-figma-design-system-spec.md) |
| Resident routes/flows/states/copy | [04-resident-experience-spec.md](./04-resident-experience-spec.md) |
| Government roles/queues/decisions/modules | [05-government-experience-spec.md](./05-government-experience-spec.md) |
| Phases, branches, tests, performance, rollout | [06-implementation-plan.md](./06-implementation-plan.md) |
| Research, tasks, measures, analytics/privacy | [07-research-and-validation-plan.md](./07-research-and-validation-plan.md) |
| Resident user stories, endpoint acceptance, QA, and SDLC | [12-resident-user-stories-and-sdlc.md](./12-resident-user-stories-and-sdlc.md) |
| Government user stories, operational acceptance, QA, and SDLC | [13-government-user-stories-and-sdlc.md](./13-government-user-stories-and-sdlc.md) |
| Integrated service cycle, complete route inventory, state and API contracts | [14-end-to-end-system-lifecycle-and-api-contract.md](./14-end-to-end-system-lifecycle-and-api-contract.md) |

## 4. Ticket traceability template

Use this block in future implementation tickets:

```text
Finding / opportunity ID:
User job:
Outcome metric:
Route(s):
Role/capability/data scope:
Canonical status/action:
Figma file + node + component version:
API contract/fixture:
Responsive behavior:
State matrix:
Accessibility contract:
English/Filipino content:
Analytics events and privacy classification:
Automated/manual acceptance tests:
Feature flag/cohort:
Rollback:
Owner / reviewers:
```

## 5. Change-control rule

When a source path, role, lifecycle, API field, or Figma component changes:

1. update the linked issue/ADR;
2. update the affected row here;
3. record the design/component version;
4. identify resident, government, mobile, backend, analytics, and documentation impacts;
5. update tests and rollout notes;
6. set `Last validated` to the actual validation date—not the edit date when validation did not occur.
