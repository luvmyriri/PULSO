# Government portal playbook

## Status

The Civic Aperture visual direction and product truth constraints are approved. The government information architecture, capability model, lifecycle mapping, emergency policy, target workflows, and API behavior are **proposed pending validation with representative LGU roles**.

Primary sources:

- [`05-government-experience-spec.md`](../../../../docs/ui-ux-audit/05-government-experience-spec.md)
- [`13-government-user-stories-and-sdlc.md`](../../../../docs/ui-ux-audit/13-government-user-stories-and-sdlc.md)
- [`14-end-to-end-system-lifecycle-and-api-contract.md`](../../../../docs/ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md)
- [`10-figma-production-handoff.md`](../../../../docs/ui-ux-audit/10-figma-production-handoff.md)

## Experience goal

Every authorized employee should see work they can perform, understand why it needs attention, keep context from queue to decision, and leave a traceable persisted outcome.

Treat the portal as an **Operate** workspace. Scanability, task completion, evidence provenance, current scope, and predictable state outrank decoration.

## Inspiration translation

Use Notion as a principle reference for calm editorial hierarchy, plain labels, progressive disclosure, and confident density. Use ChatGPT as a principle reference for compact persistent navigation, low chrome, current-context awareness, and immediate search/help/command access.

Do not copy either product’s appearance, IA vocabulary, sidebar styling, neutral SaaS shell, or conversational layout. Preserve Civic Aperture as the identity.

Make “futuristic” mean:

- visible freshness and sync state;
- evidence provenance and coordinate context;
- precise, role-aware actions;
- fast scoped search and saved views;
- responsive comfortable/compact density;
- advisory intelligence with source, confidence, and limitations;
- subtle one-time state transitions.

Do not use sci-fi ornament, neon, glass, command-center jargon, decorative KPI walls, or artificial live animation.

## Proposed information architecture

```text
My work
├─ Assigned to me
├─ Waiting for my review
└─ Recently completed
Operations
├─ Citizen reports
├─ Work orders
└─ Projects
Records
├─ Documents
├─ Reports archive
└─ Audit trail
Insights
├─ Operational overview
└─ Predictive maintenance
Administration
├─ People and roles
├─ Resident accounts
└─ System settings
```

Department, jurisdiction, team, date, and status are persistent scope filters, not primary navigation. Render only groups that the current capability set permits.

The 72 px rail and 256 px expanded navigation are both valid current proposals. Do not select a permanent default until staff usability, discoverability, zoom, and viewport testing resolves the fork.

## Shell and context

Persist these across queue, detail, action, refresh, back, and deep link where safe:

- current route and jurisdiction/scope;
- filters, sort, saved view, and result count;
- selected record;
- freshness/sync state;
- lifecycle and related object context;
- authorized next actions.

At narrow widths, prefer navigation drawer, filter sheet, record cards, and full-page detail. Do not shrink the desktop master-detail layout into an unusable horizontal canvas.

## My Work

Each task should show:

- object type and durable ID;
- plain-language task and why it is in the queue;
- priority/severity and age/freshness;
- owner/team and scope;
- current state;
- direct deep link to the scoped decision.

Include metrics only when they change prioritization, staffing, approval, or investigation. A decorative KPI grid is not a dashboard.

## Citizen reports: queue and engineering docket

Use a queue/detail workspace on capable viewports.

### Queue

- Keep routine rows quiet and nearly monochrome.
- Use Signal Cut plus a surface shift for selection, not a full blue outline.
- Show ticket, issue, barangay/location, severity, state, age/freshness, ownership, and the most decision-relevant exception.
- Make filters URL-addressable where practical and show result count and freshness.
- Preserve selection after a successful mutation when the record still belongs in the view; otherwise explain where it moved.
- Distinguish loading, true empty, filtered empty, stale, partial, permission-limited, and failed states.
- Do not make a clickable row contain nested interactive controls.
- Never turn a fetch failure into an empty queue.

### Selected docket order

1. Ticket, issue, severity, state, and freshness.
2. Privacy-safe resident context.
3. True-color evidence with provenance.
4. Map plus textual location and jurisdiction.
5. Clearly labeled advisory AI suggestion, source, confidence, and limits.
6. Internal Signal Cut lifecycle or approval chain.
7. Case facts and related/duplicate incidents.
8. Immutable activity/audit history and safe staff-note handling.
9. Sticky, role-aware decisions.

Use one Field Aperture. Put evidence metadata on an opaque rail. Provide a list/address alternative to the map.

## Decisions and triage

Prefer explicit actions such as:

- `Verify report`
- `Request information`
- `Assign work order`
- `Escalate`
- `Mark duplicate`
- `Close as outside scope`

Every decision contract includes reason, actor, time, source state, target state, related object, consequences, and next owner. The server provides eligible staff and transition eligibility.

Proposed triage sequence:

```text
Scoped queue
→ inspect evidence and location
→ compare possible duplicates
→ optionally review advisory AI
→ verify / request information / duplicate / outside scope
→ choose an eligible team or create work order
→ review assignment, priority, and resident notification
→ confirm
→ show persisted event and next owner
```

If no one is eligible, preserve context and offer a governed escalation path. On failure, state whether anything committed and keep the employee’s selection and safe input.

## Work orders, projects, approvals, and records

- Work orders keep scope, team, assignment, schedule, dependencies, evidence, safety, proof, inspection, approval, and audit context together.
- Projects group departmental work under an approved canonical lifecycle; do not silently choose between the currently conflicting ten-stage and thirteen-stage models.
- Approval queues show amount/impact, policy threshold, prerequisites, evidence, prior decisions, conflicts, and next owner.
- Records use archive, tombstone, disposition, retention, legal hold, and immutable audit rather than routine hard deletion.
- Analytics mask identity and exact coordinates unless separately authorized, expose definitions and freshness, and provide accessible summaries/data tables.

Generic arbitrary status dropdowns are prohibited. Render only valid backend transitions.

## Authorization, privacy, and emergency access

Authorize by capability, jurisdiction, assignment, entity state, field classification, threshold, evidence gate, and delegation—not role label alone. Backend enforcement is authoritative; frontend hiding is only usability.

Route, navigation, page, field, data, query scope, and action must agree. A denied staff deep link gets a clear government permission state, never a resident redirect.

PII reveal must be purpose-bound, capability-gated, and logged. Permission changes show before/after, reason, effective time, actor, affected access, and confirmation.

Emergency access cannot be designed as ordinary mode. It needs an approved policy, explicit scope, time window, reason/reference, persistent banner, audit/review, and an end action.

## Required states

For queues, records, dashboards, and decisions, design:

- loading and background refresh;
- true empty and filtered empty;
- stale and partial data;
- offline or connection failure;
- permission-limited and transition-ineligible;
- conflict/version changed;
- validation and system error;
- no eligible assignee;
- blocked work and escalation;
- unsaved note and safe recovery;
- success with persisted event and next owner.

## Accessibility and responsive acceptance

- WCAG 2.2 AA in both themes.
- Keyboard-complete operation, skip links, landmarks, visible 3 px focus, and no traps.
- Native table semantics and separate tab stops for row actions.
- Dialog, drawer, menu, popover, and combobox focus/keyboard behavior is annotated.
- Maps have list/address alternatives; charts have summaries and data tables.
- Preserve essential work at 1280×720, 200% zoom, and narrow field layouts.
- Avoid essential horizontal scrolling except inside a deliberate, labeled data region with visible overflow cues.
- Destructive, monetary, permission, and lifecycle actions require consequence, reason, confirmation, and focus-safe recovery.

## Guard against observed defects

Treat these as current risks, not completed fixes:

- fixed desktop sidebar and lost context on quick actions;
- duplicated role authorities and route/navigation mismatch;
- hard-coded assignment IDs;
- permanent-delete bypass;
- nested interactive report rows;
- fetch failure displayed as empty;
- militarized or technical copy;
- conflicting project lifecycle counts;
- broken sidebar prop contracts.
