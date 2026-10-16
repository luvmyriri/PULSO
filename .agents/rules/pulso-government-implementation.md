# PULSO government implementation rule

Apply this rule to every task that changes the PULSO government website, shared frontend foundations consumed by it, or its API/authorization/lifecycle contracts.

## Authority

Read these before planning:

- `@AGENTS.md`
- `@PRODUCT.md`
- `@docs/ui-ux-audit/22-government-implementation-blueprint-v1.0.md`
- `@docs/ui-ux-audit/21-government-website-complete-design-v1.0.md`
- `@docs/ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md`
- `@docs/ui-ux-audit/13-government-user-stories-and-sdlc.md`
- `@.agents/skills/pulso-frontend-design/SKILL.md`

Use the visual boards under `docs/ui-ux-audit/assets/` as composition evidence. They are not lifecycle, API, permission, or production-data authority.

Classify material behavior as `APPROVED`, `PROPOSED`, `OBSERVED`, `SAMPLE`, `DEPRECATED`, or `BLOCKED`. Never silently implement a proposed lifecycle, permission, financial, retention, emergency, navigation, or API decision as approved.

## Working method

1. Use Planning Mode and Request Review for every material slice.
2. Inspect the current routes, components, tokens, state, API calls, backend authorization, tests, and runtime before proposing changes.
3. Work in one vertical slice that produces a persisted civic outcome. Do not implement all pages or only a visual layer in one task.
4. Produce an implementation-plan artifact before code. List exact files, reused components, contracts, states, tests, risks, flag, migration, and rollback. Wait for approval.
5. Preserve unrelated user changes and current public/resident behavior outside the approved slice.
6. Use the current stack unless an approved ADR authorizes a technology change.
7. Build or normalize shared primitives before route-local copies. Pages remain thin compositions.
8. After implementation, run relevant automated checks and use the browser to verify the real app. Provide screenshots or recordings and a walkthrough.
9. Perform one batched correction pass, then one confirmation pass. Do not enter an open-ended visual-polish loop.

## Product invariants

- Minimalism removes friction, not information.
- The portal is a calm, precise Operate workspace with Civic Aperture identity.
- Government actions use Field Blue; status colors remain semantic.
- Use one meaningful evidence, location, lifecycle, document, cost, or decision aperture. Routine rows remain quiet.
- No glass, neon, gradients, decorative 3D, floating-card field, theatrical command center, generic KPI wall, ornamental motion, or Notion/ChatGPT trade-dress copying.
- Light and dark preserve identical content, hierarchy, capability, target geometry, privacy, status meaning, and recovery.
- Backend authorization and persisted state are authoritative.
- Never use static frontend role arrays as security, generic arbitrary status selectors, hard-coded assignees, fabricated coordinates/metrics, random operational predictions, dead controls, or false real-time claims.
- Evidence remains true-color with provenance. Maps require address/list alternatives; charts require summaries/data tables.
- AI is advisory, names source/confidence/limits, and never replaces accountable human decisions.

## Required slice contract

Every plan and walkthrough must trace:

```text
job/story → page/flow → capability → source state/version
→ eligible command/target state → API operation/error/idempotency
→ database/audit/timeline/outbox/storage effects → next owner
→ Figma/component version → tests/telemetry → flag/rollback
```

Include applicable states: default, hover, focus, pressed, selected, disabled, loading, background refresh, first-use empty, filtered empty, partial, stale, offline, permission-limited, transition-ineligible, validation, provider failure, system failure, conflict/version changed, no eligible assignee, unsaved/upload recovery, and success with a durable event.

On every failure state answer: what happened, what remains saved, what is stale, what the official can do next, and whether anything committed.

## Authorization and mutation safety

- Route, navigation, page, field, data/query scope, export, and action must agree.
- The backend evaluates subject, capability, jurisdiction, assignment, entity state/version, field classification, threshold, evidence gate, delegation, and emergency scope.
- The server supplies valid transitions and eligible assignees.
- Consequential actions show reason, source/target state, prerequisites, consequences, notification effect, next owner, and confirmation.
- Mutations use the approved idempotency and concurrency contract and reconcile audit/timeline/outbox effects.
- Denied government deep links remain inside the government identity and never redirect to resident access.
- Fetch failure is never an empty state. Optimistic UI never claims an uncommitted lifecycle outcome.

## Accessibility and responsive gate

Target WCAG 2.2 AA. Require native semantics, logical landmarks/headings, keyboard completion, visible unclipped 3px focus, focus-safe overlays, accessible names/errors/announcements, non-color meaning, reduced motion, forced colors, screen-reader support, 200% zoom, and 320px reflow.

Verify 1440px desktop, 1280×720 staff laptop, tablet/narrow, and 320/390px field layouts. Queue/detail becomes a usable full-page or drawer/card topology on narrow screens; do not shrink the desktop canvas.

## Stop conditions

Stop and report a blocker instead of inventing behavior when the slice lacks an approved lifecycle adjacency, capability/data rule, endpoint/schema, evidence gate, retention/financial/emergency policy, representative fixture, or safe failure contract.

Do not declare completion without passing tests, real browser verification, visual comparison, accessibility checks appropriate to the slice, documentation/traceability updates, and an explicit list of remaining risks.
