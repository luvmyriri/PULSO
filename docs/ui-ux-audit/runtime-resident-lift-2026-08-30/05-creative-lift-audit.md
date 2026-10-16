# Resident creative-lift audit

**Date:** 2026-08-30  
**Surface:** Authenticated resident web  
**Mode:** Combined UX, visual-design, and screenshot-based accessibility audit  
**Status:** Observed current implementation with proposed creative direction  
**Approved visual authority:** Civic Aperture v0.2

## Audit scope

The audit covers the current resident home at desktop and mobile widths, the mobile evidence step, and the mobile updates surface. It compares observed runtime behavior with approved Civic Aperture principles and the proposed resident workflow contract.

## User goal and accessibility target

A North Caloocan resident should immediately understand their current civic context, resume or create a report, follow accountable city work, and reach service help. The target remains WCAG 2.2 AA, 320 px reflow, bilingual functional parity, outdoor mobile use, and denied-permission recovery.

## Captured steps

1. **Resident home — desktop:** healthy structure, visually flat and functionally thinned.
2. **Report evidence — mobile:** usable and safe, but generic and missing evidence-capture depth.
3. **Resident home — mobile:** clear next action, but a large blank card replaces civic context.
4. **Updates — mobile:** readable, but structurally indistinguishable from a generic settings/news list.

## Strengths

- Stable navigation and clear reporting action.
- Good 320–390 px reflow and target sizes.
- Honest empty, location, AI, and submission language.
- Stronger route continuity and draft recovery than the previous modal-only implementation.
- Correct resident ember, mineral canvas, rules, and dark-theme semantics.
- Updates use open ruled lists instead of a card grid.

## UX risks

1. **The home no longer carries enough civic utility.** Services, emergency contacts, map/list browsing, draft continuation, and meaningful nearby context are not first-class.
2. **The primary action is repeated instead of staged.** Desktop shows Report in the masthead, page header, and empty object. Mobile shows it in the body, empty object, and bottom navigation.
3. **The empty active-report object consumes the focal region without useful content.** It advertises absence instead of showing local context or a saved draft.
4. **Nearby issues are display-only.** The previous map/list discovery behavior and location context are absent.
5. **The report lifecycle is visually and functionally thin.** The review lacks section-level Edit actions, privacy/contact choices, duplicate-candidate handling, and uncertain-submission reconciliation.
6. **Record actions were lost.** State-permitted cancellation/retraction, resolution confirmation/feedback, and notification-level controls are not represented.
7. **Registration and account flows lost depth.** Accepted-ID/privacy explanation, manual review, accessibility alternative, and in-session password change need deliberate restoration where supported by policy/API.

## Visual-design risks

1. **Civic Aperture became a token theme rather than a visual system.** The palette is present, but Field Aperture, Signal Cut, Coordinate Rail, local cartography, and engineering pictograms are mostly absent from the authenticated experience.
2. **The desktop home is a conventional two-column dashboard.** The centered greeting, large rounded empty card, list sidebar, and repeated CTA could belong to banking, telecom, or municipal SaaS.
3. **The mobile home uses the most visually dominant region for a generic image icon.** The screen has no truthful evidence, map, barangay, route, responsible unit, or freshness anchor.
4. **The report stepper is a generic progress line.** It does not express the heartbeat-route geometry, current notch, future state, or recoverable status.
5. **Typography delivers clarity but little character.** Scale and weight are uniform; Archivo, Source Sans 3, and IBM Plex Mono roles are not being used as an authored rhythm.
6. **Universal Lucide icons stand in for infrastructure identity.** PULSO categories need the proposed two-pixel engineering pictograms.
7. **Updates lack civic provenance as a visible organizing device.** Unit, time, affected barangay, urgency, and action are presented as ordinary metadata rather than a traceable city record.

## Screenshot-visible accessibility risks

- Some supporting and mono metadata appears small for outdoor mobile use.
- The empty-state card devotes substantial reading space to low-value repetition, increasing navigation effort.
- The mobile report flow leaves the persistent bottom navigation active during a focused task, which can encourage accidental abandonment and creates two navigation models inside the wizard.
- Screenshot review cannot confirm screen-reader announcements, route focus management, upload progress announcements, keyboard ordering, or 200% zoom behavior.

## Proposed direction: Civic Fieldboard

**Civic Fieldboard** is a proposed resident composition inside the approved Civic Aperture system, not a new brand. The home becomes a living field sheet: one dominant truthful place/evidence region, a connected lifecycle, and public-service actions organized around the resident’s current context.

### Home composition

```text
Compact masthead: PULSO / location scope / notifications / account
┌──────────────────────── FIELD APERTURE ────────────────────────┐
│ Active report evidence, saved-draft preview, or governed map   │
└─────────────────────────────────────────────────────────────────┘
BRGY / TICKET OR SOURCE / UPDATED / LOCATION STATE   ← Coordinate rail
────────────── Signal Cut: observed → received → city work ──────
Current status + next event                     one primary action

Nearby verified work — open evidence-led rows
City updates — chronological provenance rail
Services and emergency contacts — accessible call rows
Five-destination mobile navigation
```

When there is no active report, the aperture shows governed local cartography and verified nearby work. “No active report” becomes a compact state band, not a large blank media card. A saved report draft outranks the empty state.

### Report composition

- Turn the reporting route into a focused capture mode and hide ordinary bottom navigation until exit.
- Allocate the majority of the first step to the actual camera/upload preview.
- Use a true Signal Cut with labels, current notch, saved state, and recoverable error state.
- Make the location step a governed map aperture with address/list alternative and manual pin/search.
- Make review an engineering field sheet with visible Edit actions for evidence, location, issue, contact/privacy, and duplicate candidates.
- Make the receipt feel like the first page of a civic docket: copyable ticket, server time, Received state, next event, notification choice, and one-time lifecycle draw.

### Updates composition

- Replace generic articles with a chronological civic rail.
- Every advisory row exposes authoritative unit, published time, affected barangay/scope, severity where real, and a clear action.
- Deep-link report notifications to the exact record event.
- Restore per-notification read/delete controls only where backend policy supports them.

### Signature and craft

- Use one large Field Aperture per viewport, never a grid of cards.
- Let the Signal Cut physically connect evidence to status and next action.
- Use real Coordinate Rails on report and update surfaces.
- Commission six two-pixel engineering pictograms for roads, drainage, electrical, obstruction, facilities, and inspection.
- Use Archivo for decisive civic statements, Source Sans 3 for tasks, and IBM Plex Mono only for real record data.
- Animate one moment: the Signal Cut advances once over 320–450 ms when authoritative state changes.
- Keep ember to resident action and the current signal notch; do not spread it across navigation and decoration.

## Function restoration priorities

### P0 — restore before calling the redesign complete

- Saved-draft continuation on Home.
- Service directory and emergency call rows.
- Location map, address search, manual pin, and list alternative.
- Review-step Edit actions and contact/privacy choice.
- State-permitted report cancellation/retraction.
- Receipt ticket copy/save, server time, and notification preference.
- Explicit uncertain-submission reconciliation.
- Full English/Filipino copy and error parity.

### P1 — restore with workflow/policy approval

- Nearby issue map/list exploration with privacy-safe fields.
- Duplicate candidate comparison and support-evidence path.
- Information-needed response flow.
- Resolution evidence confirmation and resident feedback.
- Notification deep links and per-item controls.
- Manual-review and assisted-registration alternatives.
- In-session password change if the API and security policy support it.

### P2 — distinctive craft

- Custom engineering pictogram set.
- Governed local cartography theme.
- One-time Signal Cut motion and route-aware page transitions.
- Evidence-led public and portal imagery rules.

## Evidence limits

The audit did not submit a report, invoke device permissions, change profile data, or test with assistive technology. The current resident account contains no owned reports, so active-report and report-detail screenshots could not be captured. Figma writeback was not attempted; the shared Starter file previously reached its inspection limit, and no unverified Figma change is claimed.

## Recommendation

Add restrained decorative and cinematic effects that reinforce civic context and improve UX without obscuring content, reducing contrast, slowing interaction, or compromising accessibility. Use subtle Field Aperture depth, Coordinate Rail transitions, evidence-led motion, and a single Signal Cut animation for authoritative state changes; respect reduced-motion preferences and avoid effects that compete with the primary action. Replace the generic empty-card composition with Civic Fieldboard, restore the P0 functions, then redesign the reporting and updates surfaces from the same evidence/place/lifecycle system. This yields a product that is more visually memorable because it is more specifically civic and more useful—not merely louder.

## Implementation follow-through — 2026-08-30

**Status:** Observed in the repository and runtime-validated. Product policies and lifecycle vocabulary remain subject to their named decision owners.

The Civic Fieldboard direction has now been implemented in the authenticated resident experience:

- Home uses one dominant evidence or North Caloocan map aperture, an external Coordinate Rail, a connected Signal Cut, a compact engineering docket, saved-draft continuation, and open ruled nearby/update/service rows.
- The reporting wizard is a focused capture mode with reload-safe IndexedDB evidence, address search, device and manual-pin recovery, a map/list alternative, section-level Edit actions, contact/privacy choices, uncertain-submission reconciliation, and a server-confirmed receipt.
- Report records expose evidence, location, public activity, copyable ticket data, server-permitted retraction, and resolution confirmation/feedback without presenting resident input as city verification.
- Updates support report deep links plus read, mark-all-read, and delete controls where the current endpoints allow them.
- Account security now exposes the existing in-session password-change contract.
- The system retains exactly five mobile destinations and one thumb-visible report action, while ordinary bottom navigation is hidden inside the reporting workflow.

The previously listed P0 capabilities are implemented. The P1 resolution-feedback, notification-control, and password-change items are also implemented where a backend endpoint already exists. Duplicate-candidate comparison, an information-needed response workflow, and formal assisted-registration policy remain unimplemented because they require product and API decisions rather than presentational invention.

Notification preference on the receipt is intentionally device-local because the report API exposes no per-report delivery-channel field. Manual location is resident-provided and not displayed as city-verified. Official service phone rows link to the City of Caloocan directory rather than presenting sample contact data.

Runtime checks covered desktop, 375 px, and 320 px resident layouts; English and Filipino workflow operation; dark-theme contrast; denied location permission; empty address-search recovery; manual pinning; review editing; updates; and account security. Focused ESLint and the production build passed. A large-chunk build warning remains and should be handled as a separate performance task.

Live Figma reconciliation was attempted before coding, but the shared Starter workspace returned its MCP call-limit error. No Figma mutation or post-write validation is claimed. The next design-system action is to apply this implemented contract to the resident reviewer-final templates and promote Fieldboard, location, receipt, and service-row patterns into the Core Library when the quota is available.
