# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Residents of North Caloocan who need to report, document, and follow up on civic infrastructure and public-safety issues, often from a mobile device at the incident location.
- Government staff who validate reports, coordinate assignments, manage field work, review evidence, approve decisions, communicate updates, and retain an auditable record. This includes dispatch, engineering, management, records, and administrative roles with different permissions.

## Product Purpose

PULSO turns a resident's location-aware report and evidence into a traceable government response. Success means a resident can submit and understand the status of a real issue, while authorized staff can confidently triage, assign, act, communicate, and close the same civic record without losing its evidence or history.

## Positioning

PULSO presents one civic record through two purpose-built views: a calm, legible resident experience and an accountable government operations workspace. Evidence, location, lifecycle, ownership, and decision history remain connected across both views.

## Operating Context

- Residents may capture a report outdoors on a phone, with uneven connectivity, uncertain location permissions, bilingual needs, and concern about whether government will act.
- Government staff work primarily on desktop queues, case details, maps, work orders, approvals, timelines, and records. They need compact information without sacrificing legibility or provenance.
- Reports can include identity/residency checks, imagery, coordinates, location descriptions, classification, notifications, assignments, field proof, and closure evidence.
- AI-assisted classification and verification may advise a workflow, but legitimate residents need a manual-review path when automated checks are unavailable or uncertain.

## Capabilities and Constraints

- Separate resident and government portals must preserve a canonical report lifecycle and consistent status language.
- Resident-facing experiences require English and Filipino support.
- Light and dark modes must carry identical meaning, hierarchy, content, and accessibility.
- Permission checks must be consistent at route, navigation, page, data, and action levels; the backend remains the authority.
- Evidence must remain true-color where fidelity matters. Coordinates, timestamps, source, and review state must be explicit rather than decorative.
- The interface must not claim that location, identity, classification, or resolution is verified unless the system has actually established that state.
- Destructive government actions require retention, audit, legal-hold, and confirmation safeguards.
- This design phase produces documentation and editable Figma assets only; product implementation is intentionally deferred.

## Brand Commitments

- Preserve the PULSO name, existing civic identity assets, and public-service tone.
- The approved visual direction is Civic Aperture: creative and visually distinctive, minimalist, professional, and cinematic without compromising operational clarity.
- The Field Aperture and Signal Cut are the signature visual mechanisms. Light mode evokes a clear morning field sheet; dark mode evokes a focused night inspection.
- Resident action and government action use distinct accents. Status colors remain semantic and are not repurposed as portal branding.

## Evidence on Hand

- Existing product routes, interface copy, workflows, roles, and assets in `frontend/`.
- Existing logos in `frontend/public/pulso-logo.svg`, `frontend/public/pulso-logo.png`, and `frontend/public/engineering-logo.jpg`.
- UI/UX assessment and redesign specifications in `docs/ui-ux-audit/`.
- Approved Civic Aperture visual studies in `docs/ui-ux-audit/assets/concept-v2-resident-light-dark.png`, `concept-v2-government-light-dark.png`, and `concept-v2-civic-aperture-system.png`.
- No verified testimonials, performance benchmarks, adoption claims, or public outcome statistics are on hand; future work must not fabricate them.

## Product Principles

1. Truth before polish: every status, permission, location claim, and action must reflect real system state.
2. One public record, two useful views: residents and staff should understand the same case through interfaces shaped for their jobs.
3. Evidence carries context: imagery, location, time, provenance, and lifecycle stay visibly connected.
4. AI advises; people remain accountable: uncertainty leads to review, not silent exclusion.
5. Privacy follows the task: reveal only what a role needs, while preserving a complete authorized audit trail.

## Accessibility & Inclusion

Target WCAG 2.2 AA in both themes. Support keyboard operation, visible focus, reduced motion, forced-colors/high-contrast behavior, 320 px reflow, 200% zoom, screen-reader semantics, non-color status cues, touch targets appropriate to public mobile use, and bilingual content expansion.
