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
- Resident reports become visible to other residents after authorized government verification. The shared view contains the ticket, category, status, recorded report coordinates, full incident address, issue description, and report photo when available. Government reviewers must check public content for personal information as part of verification. Resident identity, account and contact details remain private. The report author retains their own full view.
- Resident-facing experiences require English and Filipino support.
- Light and dark modes must carry identical meaning, hierarchy, content, and accessibility.
- Permission checks must be consistent at route, navigation, page, data, and action levels; the backend remains the authority.
- Evidence must remain true-color where fidelity matters. Coordinates, timestamps, source, and review state must be explicit rather than decorative.
- The interface must not claim that location, identity, classification, or resolution is verified unless the system has actually established that state.
- Destructive government actions require retention, audit, legal-hold, and confirmation safeguards.
- This design phase produces documentation and editable Figma assets only; product implementation is intentionally deferred.

## Brand Commitments

- Preserve the PULSO name, existing civic identity assets, and public-service tone.
- Brand palette confirmed by the user on 27 October 2026: **orange, light green, white, and dark blue** across both experiences. Exact brand swatches were not specified in this correction. Earlier portal-specific blue/teal accent mappings must be reconciled with this palette before further color implementation; they must not be treated as a replacement brand palette. Status colors retain their semantic meaning.
- Latest visual reference supplied on 27 October 2026 supersedes the lime-green application: use the supplied resident-portal screenshot as palette direction—orange primary emphasis, pale warm-orange selection, white/cool-neutral surfaces, and restrained teal/mint secondary accents. Preserve semantic status/focus roles, compact government layout and readable dark-blue text. Remove the Operations overview breadcrumb and use a minimal authenticated-user greeting in its existing context strip.
- Application refined by the user on 27 October 2026: emphasize orange and light green in accents and chart marks; keep light-mode backgrounds and work surfaces white, retain existing text colors, and use subtle neumorphic depth for chart bars/tracks. Dark blue remains the dark-mode foundation. The user rejected the interim green page/card tint.
- Color-role consolidation approved by the user ("proceed") on 27 October 2026: orange signals primary action/AI/chart emphasis; the same pale-green selection family applies to navigation, tabs and selected records; white surfaces, existing dark-blue text and neutral rules remain. Quiet panels/rows and tactile controls/chart bars preserve hierarchy.
- Dashboard presentation requested on 27 October 2026: show core KPIs, operational charts and attention queues at a glance with no or minimal desktop scrolling where feasible; reflow responsively under browser zoom, retaining readable text, exact-value access and vertical scrolling on smaller viewports. Do not crop content or scale the entire UI merely to force a one-screen result.
- Government-wide design reference, confirmed by the user on 23 October 2026: preserve the current Reports UI at `/gov/reports` and extend its professional, understandable presentation, navigation patterns, coordinated tone, and restrained use of color across government modules. Use its actual shared components and interaction patterns as the starting point for subsequent design work.
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
