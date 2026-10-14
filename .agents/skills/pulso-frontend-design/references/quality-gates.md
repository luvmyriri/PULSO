# PULSO frontend-design quality gates

Use this checklist before calling a plan, specification, Figma component, screen, prototype, or handoff complete. Mark non-applicable items explicitly; do not silently omit them.

## 1. Authority and outcome

- [ ] Primary audience, task, decision, and success condition are named.
- [ ] Every material fact is marked approved, proposed, observed, sample, or deprecated.
- [ ] Unresolved lifecycle, permission, navigation, token, typography, and content decisions are visible with an owner.
- [ ] No sample evidence, ticket, person, location, timestamp, map, metric, or outcome is presented as production truth.
- [ ] The interface does not imply verified identity, location, jurisdiction, classification, submission, assignment, resolution, or “real time” without authoritative state.

## 2. Flow continuity

- [ ] The primary action is obvious and names its outcome.
- [ ] Back, refresh, deep link, authentication, and recoverable failure preserve safe context.
- [ ] Queue filters, scope, selection, draft input, lifecycle, and next owner persist where the job requires them.
- [ ] Every irreversible or consequential decision exposes consequences, required reason, confirmation, and recovery.
- [ ] AI/provider failure degrades to manual entry, upload, retry, assisted service, or human review.
- [ ] There are no dead controls or visually implied capabilities that do not exist.

## 3. Complete state matrix

Where applicable, design and document:

- [ ] default, hover, focus, pressed, active, selected, disabled, and loading;
- [ ] first-use empty and filtered empty;
- [ ] background refresh, partial data, stale data, and offline;
- [ ] permission-limited, transition-ineligible, and session-expired;
- [ ] validation error, provider error, conflict/version changed, and system error;
- [ ] failed upload, unsaved input, uncertain submission, and safe retry;
- [ ] AI/OCR inconclusive, manual review, no eligible assignee, blocked work, and escalation;
- [ ] success with durable ID/event, committed state, next step, and next owner.

Each state states what happened, what remains saved, what is stale, what the user can do, and whether anything committed.

## 4. Accessibility

- [ ] Target WCAG 2.2 AA in light and dark.
- [ ] Critical paths are keyboard-complete with logical order and no trap.
- [ ] Focus is visible with the approved 3 px treatment and is not obscured.
- [ ] Native elements and semantics are used where possible.
- [ ] Accessible name, role, state, error association, announcement, initial focus, and focus return are documented.
- [ ] Status, severity, selection, completion, and errors do not rely on color or motion alone.
- [ ] Public targets are generally at least 44×44 px; compact staff controls have validated accessible spacing/targets.
- [ ] Evidence has useful text alternatives; maps have address/list alternatives; charts have summaries and data tables.
- [ ] Forced colors/high contrast, reduced motion, screen readers, and 200% zoom are covered.
- [ ] 320 CSS px reflow avoids essential horizontal scrolling except inside a deliberate labeled data region.

## 5. Responsive and environmental resilience

- [ ] The design has explicit mobile, tablet, desktop, and narrow/zoomed behavior rather than scaled screenshots.
- [ ] Exactly one primary navigation model is active at each resident breakpoint.
- [ ] Government master/detail becomes usable full-page or drawer/card patterns on narrow layouts.
- [ ] Outdoor mobile use, slow or intermittent connectivity, denied permissions, imprecise GPS, lower-end hardware, and provider outage are considered.
- [ ] Overflow, truncation, wrapping, long IDs, visible scroll cues, and sticky regions are validated.

## 6. Theme and visual integrity

- [ ] Light and dark preserve the same content, hierarchy, actions, targets, evidence, status meaning, privacy, and recovery.
- [ ] Portal action accents do not redefine resolved, warning, critical, or focus colors.
- [ ] Evidence remains true-color and readable in both themes.
- [ ] One meaningful Civic Aperture signature is present without decorative overload.
- [ ] Cinematic treatment supports evidence, place, lifecycle, or accountability.
- [ ] No card-everywhere layout, generic dot stepper, glass, neon, gradient, decorative 3D, autoplay, engagement bait, or ornamental motion appears.

## 7. Content and localization

- [ ] Language is plain, calm, specific, and outcome-oriented.
- [ ] Resident-facing English and Filipino have full functional parity, including errors, dates, statuses, accessible names, announcements, and help.
- [ ] Long Filipino strings, document language, fallback fonts, and 200% zoom are validated.
- [ ] Government language avoids militarized, theatrical, or needlessly technical vocabulary.
- [ ] Ticket IDs, coordinates, timestamps, source, and freshness are readable and copyable where the task requires them.

## 8. Authorization, privacy, and evidence

- [ ] Backend capability and transition eligibility are authoritative.
- [ ] Route, navigation, page, field, data, query scope, and action agree.
- [ ] PII reveal has purpose, authorization, masking, logging, and a safe denied state.
- [ ] Destructive, monetary, permission, emergency, retention, and legal-hold rules are represented.
- [ ] Evidence source, capture/upload state, time, location, review, and modification policy are explicit.
- [ ] AI suggestions expose source, confidence/limits, and human accountability.

## 9. Figma completeness

- [ ] The live file was inspected before mutation.
- [ ] Relevant official Figma skills were loaded and followed.
- [ ] Existing libraries/components were searched before creating duplicates.
- [ ] Semantic variables/styles precede component and route composition.
- [ ] Components use semantic naming, Auto Layout, intentional Fill/Hug, documented properties, and complete states.
- [ ] Light/dark pairs were reviewed together.
- [ ] Metadata and screenshots validate each meaningful change.
- [ ] Reviewer-final templates were instantiated/duplicated rather than casually detached.
- [ ] Sample content and limitations remain visible.
- [ ] No node ID, binding, interaction, or component relationship is claimed without inspection.

## 10. Handoff and scope

- [ ] The artifact links the user/job, component version, responsive rules, states, content, API fields, permission, analytics, accessibility, tests, owner, version, and last validation.
- [ ] Deliberate divergences between dossier, Figma, and eventual implementation are recorded.
- [ ] The next action and decision owner are explicit.
- [ ] Documentation/Figma-only scope contains no product-code change.
- [ ] A screenshot is supported by behavior and acceptance documentation; it is not the entire handoff.
