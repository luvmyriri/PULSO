# PULSO experience framework and target information architecture

| Field | Value |
|---|---|
| Status | Proposed for review |
| Version | 0.2 |
| Last validated | 23 August 2026 |
| Decision owner | Product + LGU operations + resident-services owner |

## 1. Product thesis

**Subject:** infrastructure reporting and accountable resolution in North Caloocan.

**Resident audience:** people who notice an infrastructure issue, may have limited time/data/digital confidence, and need certainty that their evidence reached the right office.

**Government audience:** staff who must review, assign, execute, approve, document, and explain public-works outcomes under real operational pressure.

**Single job:** make the state, responsibility, and next action of a civic issue unmistakable from public evidence to accountable resolution.

North-star statement:

> PULSO turns a resident’s observation into a traceable city action without making the resident understand government structure or making staff reconstruct context across disconnected screens.

## 2. Experience principles

### 2.1 Truth before polish

The interface must distinguish live, delayed, unavailable, simulated, AI-suggested, human-verified, and completed states. A polished false affordance is worse than a plain honest state.

### 2.2 One civic record, two useful views

Residents and staff should see the same canonical incident lifecycle. Residents get plain language and only useful detail; staff get permissions, evidence, timing, dependencies, and decision history.

### 2.3 One decision per resident step

Mobile reporting should not mix capture, map manipulation, classification, consent, and submission in one dense modal. Preserve progress and explain why information is needed before asking for it.

### 2.4 Operational context stays visible

Government users must retain filters, jurisdiction, selection, current status, and permissible next actions while moving between queue and detail. Completing an action should not return them to an unfiltered starting point.

### 2.5 AI advises; people remain accountable

Every AI classification or recommendation must show its basis, limitations, and human owner. AI failure must route to manual review rather than block a legitimate civic task.

### 2.6 Accessible by construction

Keyboard, visible focus, text alternatives, semantic controls, 200% zoom, 320 px reflow, reduced motion, and English/Filipino content are component contracts—not end-of-project checks.

### 2.7 Privacy follows the task

Only show identity, exact location, contact, and evidence to roles that need them. Public/analytics views use aggregation and privacy-safe summaries. Instrumentation never records sensitive narrative, images, exact GPS, addresses, or credentials.

### 2.8 Calm language in high-trust moments

Explain what happened, what remains saved, who can act, and what the user can do next. Reserve **Emergency** and **Critical** for real states. Avoid theatrical command-center vocabulary.

## 3. Visual direction: Civic Aperture

The structural framework remains Civic Signal Grid. Its visual layer is now **Civic Aperture**, derived from city engineering evidence and public records rather than generic dashboard conventions.

The thesis is: **a field observation becomes visible, accountable public work**.

### Material sources

- true-color resident and inspector evidence;
- road paint and hazard markings;
- survey instruments, coordinates, and timestamps;
- barangay boundaries and local street linework;
- work orders, signatures, and audit trails;
- the heartbeat-route shape in the PULSO identity.

### Mode plan

Light mode is a **morning field sheet**: cool mineral canvas, crisp rules, natural evidence, and restrained ember action. Dark mode is a **night inspection**: deep survey blue, tonal surfaces, pale operational blue, reflective ember, and no neon bloom. The modes carry identical content, status, hierarchy, and boundaries.

Core roles:

- `Survey Night` — `#071A2B`: dark canvas and institutional ink.
- `Archive White` — `#F4F7F5`: cool light canvas.
- `Concrete Line` — `#C9D4D9`: boundaries and future lifecycle.
- `Field Blue` — `#0B4F6C`: government primary action.
- `Signal Ember` — `#B9380B`: resident primary action.
- `Resolve Teal` — `#0B756B`: completed/resolved.

### Type plan

- **Archivo Variable 650/700, slightly condensed** — civic headings and important state statements.
- **Source Sans 3 400/600/700** — body, navigation, forms, tables, and bilingual UI.
- **IBM Plex Mono 500/600** — ticket IDs, coordinates, timestamps, measurements, and hashes.

Font licensing, Filipino glyph coverage, Windows rendering, variable-font behavior, and fallbacks must be verified before implementation. The editable v0.1 Figma prototype uses Inter as a placeholder.

### Composition plan

Resident: one Field Aperture or active report establishes the first focus; one dominant report action remains thumb-accessible; persistent objects receive containment while updates and nearby issues use open lists and rules.

Government: retain the queue/detail workspace, but render the selected case as an engineering docket. A compact rail, quiet rows, focused evidence/location, and a sticky decision rail replace the generic admin-dashboard silhouette.

### Signature: the Signal Cut

The justified visual risk is a two-pixel route derived from the PULSO heartbeat. A sharp pulse notch identifies the current state, selected record, or active map segment. It becomes:

- resident and internal lifecycle progress;
- the selected edge of a queue row;
- a route or jurisdiction segment on a map;
- an approval or audit timeline;
- the transition from evidence to public record.

Completed segments use teal; the current segment uses the appropriate portal action color; future segments use the neutral rule. The line always includes icons/shapes and labels.

### Evidence frame and restraint

One panoramic Field Aperture may anchor an important viewport. Four corner marks frame the source, and a separate coordinate rail carries real metadata. User evidence is never filtered, covered by copy, or used as decoration.

“Cinematic” means framing, scale, light, contrast, and pacing—not glassmorphism, neon, aurora gradients, particles, parallax, decorative 3D, or reduced readability. Official seals remain stable and unanimated. The complete rules are in [09-visual-art-direction-v2.md](./09-visual-art-direction-v2.md).

## 4. Canonical service blueprint

```text
Resident                         PULSO platform                     LGU staff
--------                         --------------                     ---------
Notice issue
Capture evidence  ─────────────► Draft / validate
Confirm location ──────────────► Jurisdiction + duplicate check
Review & submit  ──────────────► Create canonical incident ───────► Intake queue
Receive ticket   ◄────────────── Receipt + notifications
                                 AI suggestion (nonbinding) ──────► Human review
Track status     ◄────────────── Status/event projection ◄──────── Verify / request info
                                 Work order / assignment ◄──────── Assign responsible team
Receive update   ◄────────────── Notification event ◄──────────── Execute / add proof
Review outcome   ◄────────────── Resolution record ◄───────────── Approve resolution
Provide feedback ──────────────► Service-quality event ──────────► Review and improve
```

### Required recovery paths

- camera permission denied → upload or take photo later;
- location permission denied → address search + manual pin;
- location outside jurisdiction → explain boundary and route to correct service;
- OCR/face/AI inconclusive → manual review or assisted-service route;
- suspected duplicate → show existing incident and allow supporting evidence;
- offline/timeout → preserve draft locally and retry safely;
- expired session → reauthenticate without losing the draft;
- staff lacks capability → explain scope and identify an authorized route/role;
- no eligible assignee → retain queue state and escalate to staffing owner;
- blocked work → record reason, owner, next review date, and resident-safe update.

## 5. Canonical lifecycle and vocabulary

The backend may keep granular internal states, but every state must map to one canonical model. Do not let individual pages invent labels.

| Canonical stage | Resident label | Staff label | Required event/data |
|---|---|---|---|
| `draft` | Draft | Draft | Local/server draft owner and last saved time |
| `received` | Received | Intake received | Ticket ID, received time, jurisdiction state |
| `needs_information` | More information needed | Awaiting resident information | Requested fields, requester, due date |
| `under_review` | Under review | Verification queue | reviewer/queue, freshness, AI suggestion if any |
| `not_actionable` | Closed — no city action | Rejected / duplicate / outside scope | reason code, plain-language explanation, appeal/support path |
| `verified` | Reviewed | Verified | human verifier, evidence and decision event |
| `awaiting_approval` | Planning response | Awaiting approval | approving role, dependency, service target |
| `assigned` | Assigned | Assigned | team/owner, work order, assignment time |
| `in_progress` | Work in progress | In progress | owner, last update, blockers, ETA if approved |
| `blocked` | Delayed | Blocked | reason, owner, next review date, resident-safe note |
| `resolved_pending_review` | Work completed — checking | Resolution review | completion proof and reviewing role |
| `resolved` | Resolved | Resolved | approved proof, resolution time, resident notification |
| `closed` | Closed | Closed / retained | closure reason, retention and audit event |

Resident Signal Cut projection:

```text
Received → Reviewed → Assigned → In progress → Resolved
```

Exceptional states appear as labeled branches/banners, never as a fake completed stage.

## 6. Target information architecture

### 6.1 Public entry

```text
Home
├─ Report an issue
├─ Track a report
├─ City updates
├─ City services and emergency contacts
├─ How PULSO works
├─ Accessibility / language / privacy
├─ Resident sign in / register
└─ Staff sign in
```

The first viewport must answer: what PULSO does, who it serves, and the next resident action. Secondary city-service directories sit below the PULSO task.

### 6.2 Resident portal

```text
Home
├─ latest report / status
├─ report an issue
├─ city updates
├─ nearby issues (privacy-safe)
└─ services / contacts
My reports
├─ active
├─ needs information
├─ resolved
└─ report detail / timeline
Report
├─ evidence
├─ location
├─ details
├─ review
└─ receipt
Updates
├─ advisories
└─ notifications
Account
├─ profile
├─ verification
├─ language / accessibility
├─ privacy / security
└─ help
```

Every major destination and report detail gets a real URL. Tabs may style navigation, but they do not replace browser history.

### 6.3 Government portal

```text
My work
├─ assigned to me
├─ waiting for my review
└─ recently completed
Operations
├─ citizen reports
├─ work orders
└─ projects
Records
├─ documents
├─ reports archive
└─ audit trail
Insights
├─ operational overview
└─ predictive maintenance
Administration (capability-gated)
├─ people and roles
├─ resident accounts
└─ system settings
```

Department, jurisdiction, date, team, and status are context/scope filters. They should not be the primary navigation model.

## 7. Navigation and shell framework

| Viewport | Resident | Government |
|---|---|---|
| <480 | Compact masthead + five-item bottom navigation; central Report action | Masthead + navigation drawer; record cards or full-page details |
| 480–767 | Same model with wider cards and optional two-column secondary content | Drawer + filter sheet + queue/detail as separate routes |
| 768–1023 | Top masthead; optional secondary rail; two-column home | Drawer/72 px rail; detail drawer/full page |
| 1024–1279 | Desktop resident header and content rail | 72 px rail; master-detail workspace |
| ≥1280 | Max 1200 px resident content | 256 px expanded sidebar; max 1600 px operational workspace |

Shell invariants:

- skip link and landmarks;
- current route and scope announced;
- visible focus never obscured;
- page title, jurisdiction/context, and primary action remain available;
- no nested scroll region without a visible cue and keyboard access;
- logout clears authentication only, not unrelated preferences;
- theme never removes information.

## 8. Content and interaction vocabulary

| Avoid | Use |
|---|---|
| Initialize session | Sign in |
| Citizen credential | Email or mobile number |
| Strategic failure | Couldn’t load reports |
| Tactical blackout | Live updates are temporarily unavailable |
| Asset purge | Archive record / Request deletion review |
| Execute | Start work / Complete task, depending on action |
| Submit | Name the outcome: Submit report, Save changes, Approve request |
| Cancel (ambiguous) | Keep report / Discard changes / Close |

Action wording stays consistent across control, confirmation, toast, audit event, and notification. **Assign work order** produces **Work order assigned**, not **Operation successful**.

## 9. Decision framework for every proposed feature

Before adding a control, card, metric, animation, or AI surface, answer:

1. Which user job does it support?
2. What decision does it help the user make?
3. Is the data live, delayed, simulated, or derived?
4. Who has permission to see and act?
5. What are loading, empty, denied, error, offline, and success states?
6. What happens with keyboard, screen reader, 200% zoom, small screen, dark theme, and reduced motion?
7. What is the English/Filipino content contract?
8. What sensitive data is exposed or logged?
9. How is success measured?
10. What is the rollback/removal path?

If these answers are not known, the feature is not ready for high-fidelity design or implementation.

## 10. Governance

- Weekly PULSO Core council: design lead, frontend lead, accessibility/QA, content/localization, resident owner, government operations owner.
- Lifecycle: proposed → reviewed → approved → published → deprecated.
- Decision log for tokens, statuses, routes, RBAC, privacy, and component contracts.
- Every Figma section and document records owner, status, version, last validation, and superseded-by link.
- Shared-core changes are made once and consumed by both portal streams at a pinned version.
- Design changes after implementation begins require an impact note for both branches.
