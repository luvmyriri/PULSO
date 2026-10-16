# Resident-side redesign start packet

| Field | Value |
|---|---|
| Status | Phase 0 complete; Figma production work queued |
| Design direction | Civic Aperture |
| Priority | Public resident website, then authenticated resident service |
| Themes | Morning Field Sheet / Night Inspection |
| Validation date | 24 August 2026 |
| Implementation | Documentation and Figma only; no product code authorized |

## 1. Outcome

The resident redesign should extend the approved `Template/Resident Home · Light · Reviewer final` and `Template/Resident Home · Dark · Reviewer final` components into a coherent public-to-authenticated service. It should not introduce another visual concept.

The existing reviewer-final pair already establishes the strongest resident identity:

- true-color civic evidence inside a Field Aperture;
- a coordinate rail that makes place and time feel operational rather than decorative;
- a Signal Cut that explains report progress at a glance;
- local cartography as functional context;
- paired light and dark environments with equivalent hierarchy;
- a stable five-destination mobile navigation model.

The first production slice is the public resident home. It must let a first-time or returning resident understand the service and begin one of the three primary tasks without scrolling:

1. Report an issue.
2. Track a report.
3. Sign in as a resident.

Staff sign-in remains available as a quiet utility link and must not compete with resident actions.

## 2. Evidence reviewed

### 2.1 Live website

The current public landing screen presents a polished but marketing-led composition: a large translucent panel, soft atmospheric background, abstract route map, general navigation labels, and `Register` / `View Portal Guide` calls to action.

The problems are structural rather than cosmetic:

- `Report an issue` and `Track a report` are absent from the first viewport;
- `Register` is treated as the primary resident outcome even though account creation is only a prerequisite;
- `Login` does not distinguish resident and staff contexts;
- the abstract route map communicates city identity but not report evidence, jurisdiction, or a resident's next action;
- the navigation labels `Platform` and `Solutions` describe the product rather than the resident's needs;
- the large floating seals and translucent surfaces make the page feel promotional instead of service-oriented;
- the visual language does not continue into the approved resident dashboard pair.

### 2.2 Current frontend structure

The current source confirms the same divergence:

- the landing page is a long marketing surface with glass, gradient, aurora, 3D, marquee, and generic feature-card treatments;
- the main entry directs residents toward registration instead of the reporting and tracking tasks;
- the authenticated dashboard is monolithic and combines reports, maps, services, knowledge, advisories, and assistance without a stable task hierarchy;
- mobile navigation currently diverges from the approved five-destination model and is supplemented by competing fixed actions;
- the current orange/slate tokens and Inter/Oswald typography do not match the Civic Aperture token and type contract;
- sample, operational, semantic, and decorative colors are not consistently separated.

These observations are inputs to design only. They do not authorize frontend changes.

### 2.3 Figma baseline

The live Figma file contains:

- `00 Overview & Foundations`;
- `01 Core Library`;
- `02 Portal Concepts & Handoff`;
- `Foundations/Civic Aperture · v0.2`;
- `Library/Civic Aperture · Production · v0.2`;
- resident reviewer-final components at 390 × 844 in light and dark themes;
- earlier resident templates and exploratory boards retained for comparison.

The reviewed resident home pair contains an active report, evidence image, sample ticket, issue summary, assignment, next expected action, five-step progress, report action, and the stable navigation destinations `Home`, `My reports`, `Report`, `Updates`, and `Account`.

Known Figma boundary: the Starter plan's MCP quota is exhausted. The visible file and named reviewer-final components were inspected in the signed-in Figma application, but structural queries and safe programmatic writes are unavailable until the quota resets or the plan changes. No Figma object was changed during Phase 0.

## 3. Design thesis

**Report what you see. Follow what the city does.**

The resident experience should feel like a public field record made humane: immediate, visual, accountable, and calm. Cinematic character comes from authentic evidence, deliberate framing, spatial rhythm, and restrained motion—not from effects layered over ordinary content.

### 3.1 Required character

- Minimalist: every prominent element supports a decision, record, or next action.
- Vibrant: controlled resident orange, survey blue, resolved teal, and true-color evidence create energy.
- Professional: status, ownership, timestamps, privacy, and jurisdiction are explicit.
- Cinematic: evidence and place receive strong framing, scale, and transitions.
- Local: cartography, barangay context, city seals, engineering language, and bilingual content are used truthfully.
- Reassuring: the interface explains what happens after submission and what the resident should expect next.

### 3.2 Explicit exclusions

- no glass panels;
- no decorative gradients or neon glow;
- no ornamental 3D scenes;
- no giant floating logos or seals;
- no card for every paragraph;
- no generic startup navigation such as `Platform`, `Solutions`, or `Features`;
- no status communicated by color alone;
- no invented operational data presented as live data;
- no unlabelled AI or automation claims.

## 4. Resident information architecture

### 4.1 Public website

| Destination | Resident question answered |
|---|---|
| Home | What can PULSO help me do now? |
| Report an issue | How do I safely send evidence and location? |
| Track a report | What is happening to a submitted report? |
| City updates | Is there an advisory or infrastructure update near me? |
| How it works | What will the city do after I report? |
| Help and accessibility | How can I complete the task with assistance? |
| Resident sign-in | How do I access my reports and preferences? |

`Staff sign-in` belongs in the utility layer or footer. It is not a resident navigation destination.

### 4.2 Authenticated resident service

The stable mobile destinations remain:

1. Home
2. My reports
3. Report
4. Updates
5. Account

Desktop uses the same mental model in a masthead or compact side rail. It may expose contextual links, but it must not rename or reorder the five primary destinations.

### 4.3 Service-path continuity

```text
Public home
  ├─ Report an issue → sign in or bounded guest/assisted path → evidence → location → details → review → receipt
  ├─ Track a report → ticket + verification → report summary → full detail after sign-in where required
  ├─ Resident sign-in → resident home → active report / new report / updates
  ├─ City updates → public advisory detail → optional notification sign-up
  └─ Help → language / accessibility / assisted-service contact
```

## 5. First Figma redesign slice

### 5.1 Required frames

Create one paired set on `02 Portal Concepts & Handoff`, using the reviewer-final resident pair and production library as the source:

| Frame name | Size | Theme | Purpose |
|---|---:|---|---|
| `Screen/Resident Public Home · Desktop · Light · v0.3` | 1440 × 1024 | Morning Field Sheet | Primary public website reference |
| `Screen/Resident Public Home · Desktop · Dark · v0.3` | 1440 × 1024 | Night Inspection | Theme-parity reference |
| `Screen/Resident Public Home · Mobile · Light · v0.3` | 390 × 844 | Morning Field Sheet | Mobile-first public entry |
| `Screen/Resident Public Home · Mobile · Dark · v0.3` | 390 × 844 | Night Inspection | Mobile theme parity |

The 320 px reflow is documented as an annotation and validated before reviewer-final promotion. A dedicated 320 px acceptance frame may be added if any section requires a structural change rather than natural reflow.

### 5.2 First viewport contract

The first viewport contains:

- PULSO resident service identity and city engineering authority;
- language control (`EN` / `FIL`);
- light/dark control with an accessible name;
- resident sign-in;
- quiet staff sign-in;
- headline: `Report what you see. Follow what the city does.`;
- a one-sentence plain-language explanation;
- primary action: `Report an issue`;
- secondary action: `Track a report`;
- a Field Aperture showing authentic local infrastructure context or an explicitly labelled sample;
- a compact trust line covering location use, evidence privacy, and emergency limitations.

The two task actions remain visible at 320 px without horizontal scrolling. Resident sign-in remains reachable without opening an ambiguous product menu.

### 5.3 Page composition

#### A. Civic masthead

- 64–72 px desktop height; 56–64 px mobile height.
- Wordmark and `Resident service` descriptor on the left.
- Task navigation on desktop; compact task menu on mobile.
- Language, theme, and resident sign-in on the right.
- Hairline Signal Cut or coordinate datum may indicate the current section.
- Staff sign-in uses a small text link separated from resident actions.

#### B. Field Aperture hero

- Desktop: asymmetric evidence-led composition, approximately 5/7 copy to 7/12 evidence.
- Mobile: copy and task actions first; evidence follows within the initial scroll rhythm.
- Use one dominant evidence frame rather than a mosaic of decorative cards.
- Include barangay, capture time, evidence type, and sample/live state when available.
- The evidence frame may use subtle depth through border, scale, and crop; no glass or glow.
- The map layer supports location context and never replaces evidence with abstract decoration.

#### C. Signal Cut service explanation

Use three plain-language steps:

1. `Show the issue` — add a photo or video and confirm the location.
2. `The city reviews it` — the correct engineering or response team verifies and assigns it.
3. `Follow every update` — use the ticket to see progress and resolution evidence.

Each step has a verb, a concise explanation, and an expected resident outcome. The Signal Cut is the connective lifecycle device, not a decorative heartbeat line.

#### D. Track a report module

- Ticket input with example format `PUL-2026-0822`.
- One primary `Track report` action.
- Clear distinction between public summary and details that require sign-in.
- Inline validation and recovery guidance.
- Privacy copy explaining why additional verification may be required.
- Empty, invalid, not-found, rate-limited, network, and success states.

#### E. City updates

- One priority advisory and a short update list, not an endless content feed.
- Barangay and publication time are visible.
- Emergency material uses explicit emergency wording and directs residents to the correct emergency channel.
- Update cards use restrained hierarchy and do not imitate social engagement metrics.

#### F. Reporting confidence

Explain evidence, location, privacy, and what happens after submission. Use short answer blocks or an accessible disclosure pattern. The section should reduce uncertainty before a resident starts the form.

#### G. Assistance and footer

- English / Filipino language access;
- accessibility help;
- assisted-service contact path;
- privacy, terms, and data-use summary;
- non-emergency disclaimer;
- quiet government staff sign-in;
- city engineering and city government authority.

## 6. Component plan

### 6.1 Reuse before creation

Inspect and reuse the v0.2 production specimens before creating any new component. Do not detach a reviewer-final component simply to restyle it.

| Component | Action |
|---|---|
| `Signature/Field Aperture` | Reuse; add public-hero composition only if the existing properties cannot express it |
| `Signature/Coordinate Rail` | Reuse for barangay, coordinates, time, and evidence state |
| `Navigation/Signal Cut` | Reuse for the three-step public explanation and five-step report lifecycle |
| `Action/Controls + fields` | Normalize public CTA, ticket field, language, and theme variants |
| `Feedback/Status + alerts` | Reuse semantic states; keep resident action color separate from lifecycle status |
| `Feedback/System states` | Extend only for tracker-specific failure and recovery states |
| `Navigation/Portal + decisions` | Normalize public masthead and resident navigation parity |

### 6.2 New or extended component candidates

| Proposed name | Minimum properties |
|---|---|
| `Navigation/Public masthead` | viewport, theme, language, signed-in state, menu state |
| `Content/Public hero` | theme, evidence state, jurisdiction state, language |
| `Form/Ticket tracker` | default, focus, invalid, loading, not found, restricted, success |
| `Content/Service step` | step, state, icon, language |
| `Content/City update row` | severity, location scope, read state, language |
| `Feedback/Trust line` | privacy, location, emergency, offline variants |
| `Navigation/Resident bottom nav` | active destination, notification state, theme |

Every component requires default, hover, focus, active, disabled, loading where relevant, error, empty where relevant, and light/dark parity. Public touch targets are at least 44 × 44 px.

## 7. Content contract

### 7.1 Primary English copy

- Headline: `Report what you see. Follow what the city does.`
- Supporting copy: `Send evidence of an infrastructure issue, receive a ticket, and follow each verified update from the City Engineering Department.`
- Primary action: `Report an issue`
- Secondary action: `Track a report`
- Account action: `Resident sign-in`
- Staff utility: `Staff sign-in`
- Emergency note: `PULSO is not an emergency service. For immediate danger, use the city's emergency channels.`

### 7.2 Filipino parity

Filipino content must be designed in the same frames or through equivalent content variants before reviewer-final promotion. Translation is not permitted to reduce action clarity, omit privacy meaning, or overflow controls. Product and LGU content owners approve final terminology.

### 7.3 Truth labels

Use one of these labels whenever operational data is not live:

- `Sample report`
- `Synthetic sample`
- `Design example`

Do not use `Live`, `Assigned`, a real person's name, or an exact location unless the data source and privacy approval are confirmed.

## 8. Responsive behavior

### 8.1 Desktop

- Maximum content width: 1200–1280 px within a full-bleed civic canvas.
- Evidence may break the content column only when it remains readable and does not obscure actions.
- The first viewport keeps both task actions, resident sign-in, and trust copy visible at common 768–900 px heights.
- Track and city update sections use the same content grid rather than independent card grids.

### 8.2 Mobile

- Single-column reading and task order.
- No horizontal scroll at 320 px.
- Actions use full available width where this improves touch confidence.
- Sticky behavior is limited to navigation or a task continuation; it must not cover inputs, validation, or system messages.
- Public pages do not show the authenticated five-destination bottom navigation.
- Authenticated pages preserve `Home`, `My reports`, `Report`, `Updates`, and `Account` in that order.

### 8.3 Zoom and text expansion

- Reflow at 200% zoom without loss of action or meaning.
- Long Filipino labels wrap without truncation.
- Coordinate and ticket identifiers may use controlled monospace styles, but adjacent labels remain readable and selectable.

## 9. Accessibility and trust gates

- WCAG 2.2 AA contrast in both themes.
- 3 px visible focus indicator with sufficient contrast against surface and adjacent colors.
- All interactive elements have accessible names and keyboard states.
- Landmarks and headings preserve a logical document outline.
- Motion respects reduced-motion preferences and never delays a task.
- Evidence has meaningful alternative text or is marked decorative only when it carries no information.
- Map information is repeated as text and never requires color recognition.
- Errors identify the field, explain the problem, and provide a recovery action.
- Loading and submission outcomes are announced through appropriate live regions.
- The ticket tracker does not expose sensitive report details without the required verification.
- Light and dark modes retain the same information, states, and control order.

## 10. Figma execution plan

### Phase 1 — foundations normalization

| ID | Task | Exit evidence |
|---|---|---|
| RES-F1.1 | Inspect current variables, styles, and production specimens through Figma MCP | Inventory of reusable assets and binding gaps |
| RES-F1.2 | Confirm resident light/dark semantic roles | Paired theme matrix with contrast results |
| RES-F1.3 | Confirm type availability and Filipino glyph coverage | Approved Figma type styles or documented fallback |
| RES-F1.4 | Define public-page grids and responsive annotations | Desktop, mobile, and 320 px contracts |

### Phase 2 — public components

| ID | Task | Exit evidence |
|---|---|---|
| RES-F2.1 | Build or extend public masthead | Light/dark, desktop/mobile, menu and focus states |
| RES-F2.2 | Build public Field Aperture hero composition | Evidence, sample, privacy, and jurisdiction variants |
| RES-F2.3 | Build ticket tracker | Complete input, result, error, and restricted states |
| RES-F2.4 | Build service-step and update-row patterns | English/Filipino and theme parity |
| RES-F2.5 | Validate component property economy | No duplicated or contradictory variants |

### Phase 3 — screen assembly

| ID | Task | Exit evidence |
|---|---|---|
| RES-F3.1 | Assemble desktop light public home | Reviewer-ready frame |
| RES-F3.2 | Derive desktop dark from semantic tokens | Theme-parity comparison |
| RES-F3.3 | Assemble mobile light public home | Reviewer-ready 390 px frame |
| RES-F3.4 | Derive mobile dark from semantic tokens | Theme-parity comparison |
| RES-F3.5 | Validate 320 px reflow and 200% zoom assumptions | Acceptance annotation or dedicated frame |

### Phase 4 — resident journey continuation

After public-home approval, design in this order:

1. Public ticket tracking result and restricted-detail states.
2. Resident sign-in and recovery.
3. Report-an-issue steps: evidence, location, details, review, receipt.
4. My reports list and report detail.
5. Updates and advisory detail.
6. Account, verification, privacy, notification, and accessibility settings.

Each workflow receives a primary path plus loading, empty, error, offline, permission-denied, duplicate, and recovery states before reviewer-final promotion.

## 11. Figma acceptance contract

A frame is not ready for handoff until:

- it uses reusable components rather than visually similar detached objects;
- tokens or documented semantic roles drive theme changes;
- light and dark modes have equivalent content and hierarchy;
- English and Filipino content have been checked for fit and meaning;
- sample data is explicitly labelled;
- the component tree has meaningful names and intentional auto layout;
- desktop and mobile behavior is annotated;
- focus, disabled, loading, error, empty, and success states are represented where applicable;
- public actions meet 44 px target guidance;
- color contrast and non-color status cues are documented;
- the first viewport visibly supports reporting, tracking, and resident sign-in;
- staff sign-in remains available without competing with resident tasks;
- no frontend implementation is implied or begun by design approval.

## 12. Current blocker and restart point

The exact restart point is `RES-F1.1`. When the Figma MCP quota becomes available, inspect the live variables, styles, and component properties before writing. Then build the four public-home frames as paired component-driven references.

A browser-only manual draft is technically possible, but it would not provide reliable validation of variables, component provenance, property structure, or theme bindings. It should not be promoted as production Figma work. The recommended path is to resume with Figma MCP access and preserve the quality contract above.
