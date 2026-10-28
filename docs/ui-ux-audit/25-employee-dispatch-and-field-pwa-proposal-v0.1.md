# Employee dispatch and field PWA proposal

| Field | Value |
|---|---|
| Artifact status | **Proposed** workflow; city employees first confirmed by user on 28 October 2026; remaining LGU operations, security/privacy, and product decisions pending |
| Version | 0.1 |
| Last validated | 28 October 2026, against repository sources; no live field-user validation |
| Owner | Government product owner with dispatch/field lead, engineering lead, security/privacy, accessibility, and records owner |
| Scope | Government dispatch workspace and a dedicated installable field web experience for authorized city employees |
| Implementation | Planning only; no product code or Figma mutation in this phase |

## 1. Job and outcome

An authorized dispatcher must be able to send a specific, cleared work order to an eligible employee or crew, know whether the assignment was received, and see work progress without calling for every update. The employee needs a phone-first **PULSO Field** PWA to understand today's assigned work, reach the site, record what happened, and request help when work cannot safely proceed. The dispatcher, employee, reviewer, and resident-facing record must share the same authoritative work and event history.

The first release should cover one nominated repair workflow and one field team. **City employees are the confirmed initial audience.** Contractor access is a later expansion requiring its own identity, device, data, and delegation policy. The PWA is a distinct staff experience, not a resident navigation mode or an automatic replacement of the existing Flutter agent app.

**Proof of success:** a cleared work order moves from dispatch through employee acknowledgement, work update, completion submission, independent review, and the authorized resident-safe outcome, with actor, time, source, version, and next owner visible at each step. A sent notification or locally queued update is never presented as a persisted assignment or completed work.

## 2. Authority and current evidence

- **Approved:** `PRODUCT.md` establishes one civic record, backend-authoritative permissions, truthful evidence/status, and Civic Aperture. It does not approve a separate PWA release or the detailed dispatch workflow.
- **Proposed existing contract:** [government stories](./13-government-user-stories-and-sdlc.md) `GOV-US-004` through `GOV-US-006`, the [canonical lifecycle and API proposal](./14-end-to-end-system-lifecycle-and-api-contract.md), [government experience](./05-government-experience-spec.md), [mobile responsive proposal](./20-mobile-responsive-ui-v0.9.md), and [government operating model](./24-government-operating-model-and-automation-proposal-v1.0.md) already describe eligible assignment, field updates, independent review, and offline reconciliation. Their routes, state names, and policies remain proposed until approved.
- **Observed source, not a release claim:** `frontend/src/pages/WorkOrdersWorkspace.jsx` has a work-order queue, eligible employee selection, assignment, start, blocker, completion, and review actions. `backend/gov_router.py` has agent work-order, status, field-report, and location routes. `mobile_app/lib/agent_app.dart` and `mobile_app/lib/features/agent/` contain a Flutter agent experience. Current route existence does not prove a secure, reliable, or installable PWA. The existing assessment flags field authorization, schema, and sync gaps.
- **Unresolved conflict:** the existing Flutter agent app and proposed PWA overlap. Product/engineering must choose coexistence, migration, or retirement after auditing active users, feature parity, offline behavior, deployment, and support. Do not maintain two divergent work-order lifecycles.

## 3. Dispatch workspace: proposed flow

1. Open the scoped **For assignment** queue from Work orders or a case. Preserve jurisdiction, filters, selected record, freshness, source report, and approved work branch.
2. Inspect the engineering docket: task, site and textual address, jurisdiction, priority and reason, true-color evidence with source/time, safety instructions, required skill/equipment, dependencies, due or visit window, and any approval gate. Unknown values are labeled unknown rather than inferred from a map pin or AI suggestion.
3. Select an **eligible active employee or crew** from a server-scoped list. Show the basis for eligibility: capability/skill, area, declared availability, current work, and required approvals. Workload is coordination context, not a personal productivity score. If no one qualifies, keep the draft and provide a governed coverage/escalation path.
4. Review a consequence-aware assignment summary: work-order ID, linked case/report, recipient and accountable lead, location, priority, timing, safety requirements, reason, notification audience, and next owner. Confirm with current record version and a unique operation ID.
5. After server persistence, show the assignment event and delivery state separately: **assigned**, **notification queued**, **delivered**, or **delivery failed**. The field PWA must find the assignment on refresh even if push/SMS/email fails.
6. Show employee acknowledgement as a distinct event. A dispatcher can follow up on unacknowledged work under an approved deadline policy; absence of acknowledgement is not proof the employee refused or was unreachable.

Reassignment, withdrawal, changed priority, changed site, and cancelled work require an authorized reason, before/after values, new owner, employee notification status, and an immutable event. A concurrent change returns the latest record and lets the dispatcher review before retrying. No assignment action bypasses budget, NTP, safety, or other branch-specific clearance.

## 4. PULSO Field PWA: proposed information architecture

Use a task-first **Operate** experience with one current assignment as the focal object. The employee should always see the last confirmed server state and the state of any unsent local action. Avoid a dense desktop dashboard or a map-only workflow.

| Area | Employee job | Primary content and action |
|---|---|---|
| **Today** | Decide what to do next | Assigned/acknowledgement-needed work, priority reason, visit window, sync/freshness, one clear next action |
| **My work** | Find a specific assignment | Current, blocked, for review, and recent work; search/filter by authorized scope; durable ID and status |
| **Work order** | Execute one job | Scope and safety, text address plus optional map, source evidence, contact/help route, crew/lead, activity, permitted actions |
| **Update** | Record field truth | Progress note, observed condition, materials used if required, true-color photo/file, capture time/source, optional consented location, save/review/submit |
| **Help & sync** | Recover safely | Blocker or safety escalation, supervisor contact, pending uploads, conflict resolution, retry, device/session help |

Proposed entry flow: staff sign-in → device/session and capability check → Today → assignment detail → **Acknowledge** → **Start work** when eligible → add progress/evidence or **Report blocker** → **Submit for review**. Starting, completion, and other lifecycle changes are separate deliberate actions. A field employee may submit proof but cannot independently accept their own completion. The reviewer either accepts it through the governed work-order transition or requests changes; the PWA then shows the specific reason and next action.

The field PWA needs direct deep links from a notification to an authorized work order, but a revoked/suspended account, changed assignment, expired session, or wrong-jurisdiction link must resolve to a clear safe state. The PWA must never reveal resident PII merely because an employee knows a URL. Show only task-relevant resident information when the backend grants it; a phone number, exact residence, or original media may need a separate purpose-bound reveal.

## 5. Shared state and data contract

The [proposed work-order lifecycle](./14-end-to-end-system-lifecycle-and-api-contract.md) is the starting vocabulary: `open → assigned → in_progress → completed_pending_review → completed`, with governed `blocked`, `changes_requested`, `cancelled`, and project handoff paths. **Acknowledged** is proposed as an assignment receipt event, not a silent new canonical work-order status. Dispatch delivery and device sync are separate state axes. LGU owners must approve the canonical lifecycle and resident label mapping before implementation.

| Object/event | Minimum authoritative fields for this feature |
|---|---|
| Work order | Durable ID, linked case/report/project, title/scope, version, state, priority with reason, jurisdiction, text address and location confidence, safety instructions, required evidence, schedule policy, created/updated time |
| Assignment | Assignment ID/version, employee and optional crew/lead, assigning actor and reason, effective time, due/visit window, eligibility snapshot/reference, acknowledgement event/time, reassignment history |
| Field update | Work-order ID/version, actor, event type, note, captured and server times, evidence IDs/source/checksum/review state, optional actual materials, optional consented location with accuracy, operation ID, sync state |
| Review and public update | Independent reviewer/authority, accepted or changes-requested reason, linked proof, audit event, public visibility rule, notification-outbox status |

The backend must authorize every list, detail, field, evidence, and mutation by active subject, capability, assignment, jurisdiction, entity state, and delegation. Client role labels or cached lists are only presentation hints. Mutations need an idempotency key, expected version, transactional event/outbox behavior, and a usable conflict response. Assignment and field evidence may have different retention and access policies.

## 6. Connectivity, device, and privacy contract

The PWA should remain useful with unstable mobile connectivity. Cache only the minimum permitted assignment data for the approved device/session policy. A service worker or install prompt is not evidence that offline submission works. Validate actual devices and browsers before committing to background behavior; offer an in-app retry path that does not depend on background execution.

| State | Employee-visible meaning and recovery |
|---|---|
| Fresh and online | Server-confirmed work and last sync time; eligible actions only |
| Offline with permitted cached work | Read the last confirmed copy with its timestamp; save an update locally only if device policy allows; label it **Saved on this device** |
| Uploading/retrying | Pending operation and attachment count, per-item progress, retry/cancel where safe; leaving the screen does not imply success |
| Server-confirmed | Show persisted event ID/time and refreshed work-order version; only then advance the authoritative timeline |
| Conflict or reassigned | Stop automatic replay, retain safe draft, show current assignee/state and the permitted resolve or supervisor path |
| Session revoked, storage denied/full, or device lost | Prevent new offline edits, explain what is and is not saved, and give a secure sign-in/help path |

Location is **opt-in for an approved duty window**, scoped to the employee's job, accuracy-labeled, and off by default outside that window. No continuous personal movement map or after-hours tracking is assumed. Camera and location denial must not block a text-based update where policy permits. Preserve original evidence; show capture versus upload time and never claim a geotag proves site attendance. Security/privacy owners must approve encrypted local storage, cached PII/evidence limits, expiry, remote revocation, shared-device logout, retention, location access, and device-loss response before offline data is enabled.

## 7. UI, accessibility, and content acceptance

- Apply Civic Aperture as a restrained field tool: clear work-order ID and coordinate rail with real data; one true-color evidence aperture in detail; Signal Cut for actual event history. Keep the government action semantics and the latest approved brand corrections in `PRODUCT.md`; never use status color as decoration.
- At 320 px and 200% zoom, keep the current task, sync state, safety notice, and primary action readable without page-level horizontal scrolling. Controls need outdoor-sized targets, visible 3 px keyboard focus, screen-reader names and announcements, and non-color status text. Support reduced motion and forced colors in light/dark parity.
- Give each field action default, focus, pressed, disabled, loading, success, and error behavior. Distinguish first-use empty, filtered empty, stale, partial, offline, permission-limited, conflict, and true system failure. A failed fetch cannot become “No assignments.”
- Use plain English and Filipino for field-critical instructions, safety, sync, and recovery if the language scope is approved for staff. The government language scope remains an explicit decision; resident-facing updates continue to require English/Filipino parity.
- Keep map directions optional, with a text address and accessible list alternative. Use no route optimization claim without verified travel and capacity data. Provide a human contact/escalation path for ambiguous sites and safety hazards.

## 8. Acceptance scenarios and release sequence

1. **Dispatch:** eligible employee selection, approved gate, one persisted assignment, accurate next owner and outbox state; repeated submit and concurrent dispatcher action do not duplicate work.
2. **Field access:** only the assigned authorized employee can open/update the work order; another employee, resident token, stale role, or revoked session cannot read protected details or replay a queued mutation.
3. **Acknowledgement and progress:** notification failure does not hide the job; employee acknowledgement and progress appear in the same record with actor and time.
4. **Offline:** a permitted note/photo survives reload and reconnect; a duplicate replay creates one event; conflict/reassignment pauses and preserves a recoverable draft; unsupported device storage gets a usable online path.
5. **Completion:** field proof enters `completed_pending_review`; the executor cannot self-accept; rejection gives a clear rework task; an accepted review drives the authorized case/resident update only after persistence.
6. **Inclusive use:** complete the route on a lower-end Android phone, iPhone, tablet, keyboard, screen reader, 320 px viewport, 200% zoom, light/dark, reduced motion, forced colors, denied camera/location, and poor connection.

Suggested delivery order: **(a)** approve employee/crew, lifecycle, location, device, and review policies; **(b)** harden one backend assignment/event/sync contract; **(c)** pilot dispatcher-to-PWA acknowledgement and text update; **(d)** add evidence, blocker, offline queue, and independent review; **(e)** expand beyond the pilot workflow only after observed task and failure-path validation. Do not claim reduced response time or employee performance gains without an approved baseline and measurement plan.

## 9. Decisions and next design action

| Decision | Proposed owner |
|---|---|
| Accountable crew lead for the employee pilot; policy for any later contractor/delegate access | City Engineer and LGU administration |
| Assignment eligibility, acknowledgement deadline, reassignment and escalation rules | Dispatch/operations lead and technical leads |
| Canonical work/case transitions, proof and independent acceptance | Engineering process owner and reviewer lead |
| PWA versus existing Flutter agent app migration and support | Government product and engineering leads |
| Offline storage, device policy, location window, evidence/PII retention | Security/privacy and records owners |
| Staff English/Filipino scope and field safety wording | Government product and content owners |

**Next Figma action:** when the visual design phase begins, inspect the live shared file and reconcile its library/template inventory. Then add reusable assignment receipt, field work row, sync-state, evidence capture, and governed action-sheet patterns to Core Library before composing paired light/dark dispatcher and PULSO Field screens. Include component/version, responsive, state, content, permission, privacy, focus, and API annotations. This document makes no claim that those Figma artifacts exist yet.
