# Government core workflow, navigation, task allocation, and public disclosure

| Field | Value |
|---|---|
| Artifact | Research findings and proposed operating/UX contract |
| Version / research date | 1.0 / 23 October 2026 |
| Audience / mode | Caloocan engineering staff and PULSO product team / Operate |
| Status | Public-source findings, current-source observations, user-directed scope, and proposals are distinguished below |
| Scope | Government work, useful operational data, resident publication links, budget disclosure, and external bidding references |
| Research limitation | No staff interview, verified current plantilla, internal delegation matrix, or production-data audit |
| Review owners to nominate | CED operational owner; engineering leads; records; authorized city publisher; privacy/IT; product/data lead |
| Implementation | Documentation only; no product code, database, Figma, provider, publication, or external message changed |

**Runtime follow-up, 23 October 2026:** The [screenshot-based Analytics/Map/Predictive review](../ui-ux-audit/runtime-insights-2026-10-23/README.md) directly inspects the working local pages and refines this proposal. In particular, the routed Dashboard imports `pages/GovBiDashboard.jsx`, whereas section 6 originally cited the separate `components/GovBiDashboard.jsx`. The follow-up confirms simulated data in the routed page as well, and documents the duplicate Overview route, dispatcher Map purpose, predictive identity/score/date issues, and a concrete consolidation. Its observations are local development evidence, not production statistics.

**User-confirmed visual direction, 23 October 2026:** Preserve the current Reports UI at `/gov/reports` as the government-wide design reference. Extend its professional presentation, understandable navigation, coordinated tone, shared layout/control patterns, and restrained colors to the other modules. Recommendations in this document concern clearer module responsibilities and decision workflows within that existing design language. Reconcile earlier palette/shell proposals explicitly against this instruction; no replacement visual direction is requested. See the updated [PRODUCT.md](../../PRODUCT.md) and runtime review for the reference and reuse plan.

## 1. Recommended direction

**Organize the workspace around work and accountability: what needs to be done, who owns it, what is blocking it, and which decision comes next.** The government portal should connect a resident observation to reviewed action, field evidence, verification, public communication, and infrastructure history.

Use one shared workspace with role-scoped views. A job title is an employment fact; a permission is an explicitly delegated authority; an assignment is responsibility for a particular task. These must be separately recorded.

The user's scope instruction in this research session is explicit: **PULSO collects approved budget disclosures and links to official procurement information; it does not process budgeting or procurement.** This constrains this plan. It is not evidence that the LGU has approved the proposed roles or transitions.

The recommended result has five parts:

1. **My work** replaces competing dashboard landings with an actionable inbox.
2. **Reports → Work → Verification → Report outcome** provides continuity and named handoffs; planning and external-process waits are explicit branches.
3. **Service insights** explains relationships and opens the underlying work. Charts answer a question before displaying a number.
4. **Updates** publishes reviewed announcements, advisories, and news, with private links to relevant resident reports.
5. **Budget disclosure** stores sourced public facts. Bidding takes the user to the official Caloocan site.

This is a candidate operating model for LGU review, not a declaration of the City's actual internal procedure. It extends [01](01-operating-model-modules-and-roles.md), [02](02-updates-announcements-and-notifications.md), [06](06-data-api-and-ux-contracts.md), and [12](12-government-referrals-documents-and-publications-2026-09-29.md). It records scope conflicts with the broader older proposals rather than silently rewriting them.

## 2. What the research establishes

### 2.1 Caloocan evidence and the limits of the role research

| Finding | Evidence and status | Implication for PULSO |
|---|---|---|
| The published department list identifies a City Engineer; the retrieved listing names Engr. Errol Bitanga | [Caloocan department list](https://caloocancity.gov.ph/about-us/list-of-departments/), retrieved 23 October 2026. The page's effective/update date is not established | Design for the position and recorded delegation, never a hard-coded incumbent |
| Engineering has public Admin and Planning contact entries | [City directory](https://caloocancity.gov.ph/about-us/directory/) | These are locally evidenced functions; contact entries do not establish a complete formal division chart |
| CED publicly lists engineering/public-works complaint action and two excavation-permit services | [CED service page](https://caloocancity.gov.ph/category/ced/) | Complaint intake is directly relevant. Permit processing still needs separate scope and authority |
| OCBO, Public Affairs and Information Division, Procurement, Budget, Accounting, and Treasury appear separately in the department list | Same department-list source | Model them as possible counterpart offices, without assuming CED staff inherit their powers |
| General local-engineering duties cover public works coordination, maintenance, investigation/survey, design, and project management; budgeting has separately described duties | [RA 7160, sections 475 and 477](https://lawphil.net/statutes/repacts/ra1991/ra_7160_1991.html) | These support functional work areas. They do not establish PULSO-specific signing rights or resolve Caloocan's current OCBO delegation |

**Not established:** the current assistant-engineer appointment/delegation, exact CED division names, plantilla counts, reporting lines, field crew structure, who may accept work, who may publish, and current Charter processing times. Earlier repository documents describe City Engineer, Assistant City Engineer, and Administrative Division as known local roles. This session independently corroborated the City Engineer and public Admin/Planning contacts, but did not independently verify the full earlier role claim.

The [CED Charter landing page](https://caloocancity.gov.ph/ced-citizen-charter/) embeds [15-CED.pdf](https://drive.google.com/file/d/148pE7QsDhtxyT0XJpPdPJ54tSvTIc3Ya/preview). Its public preview did not expose readable text; the connected Drive read returned 403. The [Transparency page](https://caloocancity.gov.ph/transparency-seal/) links another [citywide Charter file](https://drive.google.com/file/d/1o6WPQl57yBDzQa8elIro-znWwPtj9rIo/view); that connector read failed in transport. No Charter contents or deadlines are asserted from these attempts. Older third-party mirrors and other cities' staff charts are not treated as current Caloocan authority.

For functional comparison, [Quezon City's Engineering Department](https://quezoncity.gov.ph/departments/quezon-city-engineering-department/) documents administrative intake, planning/design, maintenance, project supervision, and quality-control work. Its published repair process includes inspection/evaluation and resource availability. **Inference:** these are useful work distinctions for a configurable PULSO model. QC's divisions, staff titles, and procedures are not imported as Caloocan facts.

### 2.2 QC iReport and MyNaga: the correct comparison

| Official source | What it establishes | What it does not establish |
|---|---|---|
| [QC iReport overview](https://quezoncity.gov.ph/program/qc-ireport/) and [FAQ](https://quezoncity.gov.ph/faqs/faq-ireport/) | Non-emergency reporting, supporting information, departmental action, and progress tracking | An exhaustive audit of all app functions or its internal finance systems |
| [QC's May 2026 platform announcement](https://quezoncity.gov.ph/qc-govt-boosts-transparency-accountability-with-qcitizen-data-platforms/) | QC Open Infra is a distinct project-transparency dashboard that includes budgets alongside location, timelines, status, and photographs | That QC iReport itself processes budget approvals |
| [Naga's official MyNaga introduction](https://www2.naga.gov.ph/available-mynaga-app/) | City services access, official news/updates, hotlines, and community issue reporting | That no unlisted feature exists in the installed app |

The defensible conclusion is: **the reviewed descriptions do not document an in-app budgeting workflow for QC iReport or MyNaga.** Absence from a feature description is not proof of absence. Public project-cost transparency is a separate capability from processing public funds.

For PULSO, retain the useful combination of issue reporting and official updates. Budget disclosure can help explain a linked project without introducing a finance subsystem. QC's own response policy must not become a Caloocan service promise.

### 2.3 Navigation and information-design basis

[GOV.UK's service-navigation guidance](https://design-system.service.gov.uk/patterns/navigate-a-service/) recommends important top-level destinations rather than turning navigation into a complete site map. [Government Analysis Function guidance](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/) starts with the message and statistical relationship, and provides accessible text/table alternatives. [ONS chart guidance](https://service-manual.ons.gov.uk/data-visualisation/chart-types/choosing-a-chart-type) favors familiar chart forms.

**Application to PULSO, proposed:** stable task destinations; contextual planning tools; map/list views of the same records; simple comparisons and timelines; a visible path from evidence to an authorized action. These sources inform interaction principles, not a claim that this exact navigation is universally best.

## 3. Users and responsibility: a configurable functional model

### 3.1 Separate four kinds of information

| Concept | Example, illustrative only | Why it matters |
|---|---|---|
| Official position / office | Position supplied by HR or an appointment record | Preserves the actual organization rather than inventing one |
| Functional permission bundle | Intake reviewer; technical coordinator; verifier | Defines authorized operations |
| Operational scope | Named team, service area, record assignment, delegation dates | Prevents a title from granting unrestricted access |
| Task assignment | Review this report; inspect this work; review this notice version | Establishes the person accountable for the next action |

One employee may have multiple bundles where policy permits. Every consequential decision records the actual actor and authority used. Read access, drafting, approval, public release, and PII reveal are separate permissions.

### 3.2 Proposed work bundles and landing views

All mappings below are **proposed assignments**, not verified Caloocan plantilla entries.

| Work bundle | Candidate local assignment | First view / recurring tasks | Boundary |
|---|---|---|---|
| Department oversight | City Engineer or recorded delegate | Exceptions needing direction; unresolved responsibility; decisions within delegation | Does not automatically grant IT administration or all public-release rights |
| Operations coordination | Assistant City Engineer if confirmed, or a designated engineering coordinator | Unassigned work, blocked jobs, schedules, inspection backlog | Cannot certify funding, issue procurement instruments, or bypass technical gates |
| Intake and case coordination | Designated Admin staff | New reports, incomplete location/evidence, information requests, resident correspondence, referrals | Checks completeness; technical validity remains an engineering decision |
| Technical assessment and planning | Designated Planning/engineering personnel | Site assessment, scope, drawings, survey tasks, resource needs, project referral | A design estimate is neither an allocation nor expenditure approval |
| Field delivery | Authorized foreman, crew lead, or assigned personnel | Today's assigned jobs; start/update; blocker; completion evidence | Completion submission is not independent acceptance |
| Technical verification | Qualified, designated reviewing engineer/inspector | Work awaiting verification; findings; return for rework; acceptance | Distinct from the executor for the same decision; exception requires explicit approved policy |
| Records and infrastructure stewardship | Designated records and asset personnel, separately permissioned | Register/version documents; maintain asset identity and dated history | Records stewardship does not authorize a technical condition change without its source |
| Public communication | Designated CED drafter, technical reviewer, city-authorized publisher | Draft/review/publish/correct updates; review report associations | Engineering authority and publication authority are separately delegated |
| Platform administration / audit | Authorized IT administrator and separately scoped auditor | Accounts, permissions, integration failures / read-only audit review | IT privileges do not themselves authorize engineering, money, or publication decisions |

An external office or contractor does not need a PULSO account in the pilot. The assigned CED coordinator records reviewed correspondence and external references. Any later external access requires its own limited-access contract.

### 3.3 Every handoff needs an accountable record

Each active case has **one accountable case coordinator**; each task has **one responsible owner**, with collaborators and a separately required reviewer where applicable. The department supervisor remains responsible for work that has no eligible assignee.

Minimum task contract: task ID; source object/version; plain action; why it is needed; responsible person/team; scope; assigned/due/last-update times; prerequisites; blocked reason; next reviewer; evidence required; permitted outcomes; next owner. A due date is absent until an approved service rule or authorized schedule supplies it.

Assignment order:

1. Confirm responsibility, location certainty, work type, required qualification, and urgency with authorized human review.
2. Ask the server for eligible teams/people within current delegation and scope.
3. Show workload, availability, equipment dependencies, and known scheduling conflicts. Unknown capacity is labeled unknown.
4. Coordinator assigns and reviews consequences; the persisted assignment creates the next task and history.
5. Assignee acknowledges or requests reassignment with reason; the case does not disappear while acknowledgment is pending.
6. No eligible assignee, overdue acknowledgment, staff absence, or revoked delegation goes to a named supervisor queue. Reassignment preserves the prior actor, reason, and pending work.

AI may suggest category, related records, or a summary. It does not silently assign crews, reject a report, declare an emergency, publish, or accept work.

## 4. Core service workflow and handoffs

The following are **process steps**, not approved canonical status strings or a replacement for the unresolved lifecycle models.

| Step | Responsible function | Decision and saved result | Next owner / resident meaning |
|---|---|---|---|
| Receive | System + intake coordinator | Durable report receipt, source evidence, observed location, access scope | Intake; receipt does not imply verified jurisdiction |
| Check completeness | Intake | Request missing information, flag location uncertainty, or prepare technical review | Reporter or technical reviewer; explain what is needed |
| Assess responsibility and action | Technical reviewer | Confirm engineering scope, urgency, related-case/duplicate relation, and proposed response | Coordinator; no AI-only rejection |
| Choose the work path | Technical coordinator | Routine job, investigation/planning task, larger project coordination, or external referral | Named task owner; every branch remains traceable |
| Assign and schedule | Coordinator | Eligible team, scope, prerequisites, schedule, evidence gate, assignment event | Field/planning owner; assignment differs from work started |
| Perform and document | Assigned personnel | Progress, blockers, measurements where applicable, original completion evidence | Verifier when submitted; resident sees truthful progress |
| Verify | Designated verifier | Accept evidence and applicable outcome, request inspection, or return specific work | Case coordinator or executor for rework |
| Review report outcome | Authorized case decision owner | Check the actual scope of each linked report and any unresolved elements | Reporter gets a reviewed, report-specific outcome |
| Retain and communicate | Records + authorized publishing functions | Asset history, issued records, private response, optional linked public update | Follow-up/reopening remains available under approved rules |

### Branches that must work

- **Duplicate observations:** retain each submission and evidence, link to a reviewed canonical case, and keep each reporter informed. Do not count multiple submissions as multiple completed repairs.
- **Several defects at one site:** location proximity alone must not merge distinct engineering problems. A road defect and an unrelated light failure can remain separate cases.
- **Simple repair:** assigned work → completion submission → independent verification → applicable report outcome. Do not force a routine job through a procurement workflow inside PULSO.
- **Needs survey/design:** create technical tasks under Work; keep the report coordinator and next-update obligation visible.
- **Needs a larger project or external approval:** retain a project coordination record, current external dependency, reference document/URL, named follow-up owner, and next review date. Budget disclosure is optional and does not unlock construction.
- **Outside CED responsibility:** use the reviewed referral approach in [12](12-government-referrals-documents-and-publications-2026-09-29.md). Sent, accepted by recipient, acted on, and resolved remain distinct.
- **Blocked job:** record cause, who can unblock it, next review/update time, and public-safe explanation. No indefinite unowned waiting state.
- **Rejected completion:** preserve original evidence and findings; create rework task. No erasure of the rejected attempt.
- **Safety concern:** follow the existing approved city emergency channel/policy, once confirmed. PULSO does not invent emergency authority or promise asynchronous reporting is emergency dispatch.
- **Resident disputes outcome:** route a follow-up/review task without rewriting the original acceptance history.

Starting physical work still requires whatever lawful external authority applies. A future `external_authorization_reference` records evidence of that authority; it does not approve, certify funds, or issue an NTP. A missing authorization keeps the relevant activity waiting, even when a budget figure is publicly available.

## 5. Navigation proposal

### 5.1 Stable destinations, contextual tools

```text
My work
Reports
Work
  Work orders | Inspections | Projects | Planning tasks
Infrastructure
Records
Service insights
Updates

Administration [utility destination; authorized staff only]
```

These labels are proposals. They retain the earlier eight-module concept while making the first destination personal, the asset meaning explicit, and analytics decision-oriented. Keep the order stable; show only authorized destinations. Do not create a complete navigation tree for every position.

| Destination | Main question | Contextual views |
|---|---|---|
| My work | What do I need to do now? | Assigned to me; needs my review; waiting on others; recently completed |
| Reports | What is the concern, and who is responsible? | Needs intake; needs technical review; active; awaiting information; referred; outcomes; list/map |
| Work | What work is required, who will do it, and what is missing? | Jobs; inspections; planning tasks; projects; schedule; blocked work |
| Infrastructure | What is the condition and history of this infrastructure asset? | Register; location; dated inspection/maintenance; repeat issues; linked work |
| Records | Where is the authoritative document or decision? | Registry; versions; correspondence; controlled archive; authorized audit view |
| Service insights | Where is a decision or investigation needed? | Backlog; waiting reasons; geographic workload; recurrence; data quality |
| Updates | What should be communicated, to whom, and who approved it? | Drafts; review; scheduled; published; corrected/withdrawn; notification problems |
| Administration | Who is authorized to perform each action? | People/teams/delegations; service configuration; integrations; security |

Global search, staff notifications, scope, help, language/theme, and account are utilities. A decision task belongs in My work and links to its original object; it is not a duplicate record in a separate Approvals silo.

**Map is a view of work or infrastructure.** Put List/Map inside Reports and Infrastructure; use a location view in Work when useful. Preserve any truly cross-object operational map as a scoped saved view or secondary shortcut only if staff validation establishes its job. Do not maintain different unexplained totals across separate Map, Dashboard, and Reports destinations.

**Survey, design requests, engineering analysis, and technical quantities belong to Planning tasks inside Work**, with linked files in Records. This preserves engineering capability without forcing everyone to scan specialist tools. In-app financial estimation/BoQ calculation is deferred under the user's disclosure-only scope; approved technical documents can still be referenced.

### 5.2 How each user reaches work

| Function | Default landing content | Most-used destinations |
|---|---|---|
| Intake | New/incomplete reports, promised replies, referrals needing follow-up | My work, Reports, Records |
| Coordinator | Unowned/blocked work, assignments awaiting acknowledgment, verification waits | My work, Reports, Work, Service insights |
| Planning | Assessment/survey/design tasks and missing inputs | My work, Work, Infrastructure, Records |
| Field | Assigned jobs, location/address, prerequisites, progress/evidence actions | My work, Work |
| Verifier | Submitted work awaiting review and returned/reinspection tasks | My work, Work, source evidence |
| Leadership | Decisions within authority, aging exceptions, recurring asset problems | My work, Work, Service insights |
| Records | Documents needing registration/release and incomplete asset links | My work, Records, Infrastructure |
| Publisher | Notices awaiting review, changed work facts, corrections/delivery failures | My work, Updates, permitted source records |

An employee with several bundles sees one combined inbox with named task types and relevant saved filters. No repeated login or manual role switching should be needed for routine work. If policy requires selecting a delegation context, show the active authority clearly.

### 5.3 Queue-to-record continuity

Retain scope, saved view, filters, sort, selection, pagination/scroll, and safe draft input across detail, action, refresh, and Back. Use a nonmodal engineering docket for preview and a real full-record URL for deep links. On narrow screens the record becomes a full page; Back restores the queue.

The 72 px rail versus 256 px expanded default remains a documented **design fork**. This research does not select a permanent default. The next design study tests discoverability, staff labels, keyboard use, narrow widths, and zoom. Civic Aperture's evidence, status, and theme contracts remain binding; no new visual theme is proposed here.

## 6. Existing system: retain, reorganize, or constrain

Static inspection on 23 October 2026; no authenticated end-to-end runtime validation. Source presence does not prove production readiness.

| Current evidence | Observed issue / existing foundation | Proposed disposition |
|---|---|---|
| [GovSidebar](../../frontend/src/components/GovSidebar.jsx) | Separate Dashboard and Today; Map and Analytics; `/gov/bi` matches two navigation items; item rendering in this component does not use currentUser to filter capabilities | One personal landing; stable task modules; reconcile current-route selection and server-authorized visibility |
| [App routes](../../frontend/src/App.jsx) | Work, project, record, planning, analytics, procurement, and OBO route families coexist | Map every retained route to a module; preserve useful deep links with reviewed redirects |
| [Routed BI page](../../frontend/src/pages/GovBiDashboard.jsx) and separate [BI component](../../frontend/src/components/GovBiDashboard.jsx) | App.jsx imports the page: its KPI calculation and chart datasets are simulated. The separate component also contains hard-coded `TRAJECTORY_DATA`, `SECTOR_METRICS`, `DEFAULT_TOP_BARANGAYS`, and `CAPITAL_MILESTONES`; it must not be confused with the routed page | Exclude simulated values from operational truth; separate labeled demos; replace with record-backed decision views; see runtime follow-up |
| [Analytics page](../../frontend/src/pages/GovAnalyticsPage.jsx) | Cluster cards expose estimated cost, recurrence score, and threat labels | Require definitions, evaluation, uncertainty, and source records; no unexplained financial/risk authority |
| [Official and role models](../../backend/models.py), [frontend RBAC](../../frontend/src/utils/rbac_utils.js), [roles service](../../backend/roles_service.py) | Dynamic capabilities coexist with broad role-name overrides. Role helper uses `role_details`; inspected Official model exposes `role_ref` | Reconcile before implementing permissions; test actual server behavior. Do not assume a configurable role UI already enforces the proposed matrix |
| [Work/project models](../../backend/gov_models.py) | Work ownership, inspections, asset links, project personnel, and source-report links are useful foundations; project model also embeds budget stages | Keep engineering relationships; design migration away from in-PULSO finance transitions |
| [Government router](../../backend/gov_router.py) | Funding-certification, cash-release, and NTP-issuance routes remain in source; approve-with-budget shortcut explicitly returns 409 | Plan backend de-scoping and legacy access rules. Hiding navigation alone does not establish the new boundary |
| [Announcement model](../../backend/gov_models.py) | Bilingual content, reviewers, source report/work/project/asset, corrections, and delivery rows exist; source links are singular fields | Reuse after validation; add a reviewed many-to-many association for multiple reports rather than one copied notice per reporter |
| [Announcement router](../../backend/announcements_router.py) | Valid channels are web/SMS/email. Current helper marks web publication and leaves unconfigured SMS/email pending; push is not a listed channel | Build a distinct durable in-app notice plus optional push attempt. Do not claim existing phone notification support |
| Same announcement router | Role approver list includes system_admin and other titles | Replace implicit title authority with approved publishing delegation; source code is not the City's publication policy |
| [Maintenance history creation](../../backend/gov_crud.py) | Resolved reports can record cost using actual cost, then estimate, then report budget, then zero | Preserve original provenance in migration; never treat these fallback values as verified actual maintenance spending |

Earlier document [12](12-government-referrals-documents-and-publications-2026-09-29.md) described fabricated SMS/email delivery in an older helper. The currently inspected helper no longer makes that claim for those channels. Remaining channel support, public release, recipient selection, and end-to-end delivery still require validation. Do not repeat the older defect as if unchanged.

## 7. Replace decorative BI with decision views

### 7.1 Contract for every insight

Each view must answer **question → observed relationship → meaning/limit → next action → underlying records**. A chart without a decision or investigation path does not belong on the operational landing.

Use explanatory titles derived from valid data; if the evidence is insufficient, state what is unknown. The wording below is an illustrative interpretation template, not measured PULSO findings.

| Decision question | Relationship / suitable view | What seeing it can mean | Next action and owner | Minimum evidence / limitation |
|---|---|---|---|---|
| Where is work accumulating? | Open cases by current process step, with age distribution; horizontal bars + table | Many old cases awaiting review suggests a review queue to investigate | Coordinator opens the filtered queue and assigns/rebalances reviews | Timestamped state history; distinguish report/case/work grains; age alone is not a legal breach |
| What is preventing progress? | Blocked work by reason, waiting time, next owner; sorted table/bar | A concentration in equipment or missing survey inputs identifies a shared dependency | Responsible supervisor opens affected jobs and acts on the dependency | Structured reason and blocked-since; an unknown reason stays visible |
| Which team needs support? | Assigned active tasks, age, work type, and known availability; comparison table | High load plus delayed tasks merits a workload discussion | Coordinator reviews eligible reassignment/schedule | Counts are not effort, productivity, or capacity; show missing availability |
| Which areas have related concerns? | Unique reviewed cases by category/location and linked asset; map + equivalent list | Related concerns may justify a site visit or coordinated work | Engineer opens exact records and proposes an assessment | Unlocated reports remain counted separately; dense reporting is not proof of greater danger |
| Which infrastructure assets have recurring concerns? | Asset timeline of distinct incidents, inspected maintenance, and new occurrences | A new reviewed defect after accepted work may justify a technical review | Asset engineer creates an inspection task | Duplicate submissions are not recurrence; uncertain asset links are excluded/labeled |
| Are we keeping up with incoming work? | New cases, verified resolutions, and end-period backlog over equal intervals; simple trend | Sustained intake above resolution can explain a growing queue | Leadership investigates capacity, blockers, or process | Reopens, merges, transfers, and scope changes must reconcile; referral is not automatically resolution |
| Which work is awaiting verification? | Completion submissions by waiting age, assigned verifier, missing proof | The bottleneck may be review or evidence rather than field work | Verifier reviews a specific job; coordinator assigns unowned review | Submission is not acceptance; use actual submission/decision history |
| Who should receive an update? | Approved report–publication associations and notification outcomes; relationship table | A notice is relevant to several report owners, or delivery needs recovery | Publisher reviews links; coordinator resolves failed delivery | Public publication, candidate association, in-app creation, push attempt, and read are different events |
| Is the current operational picture reliable? | Missing owner/location/asset link, stale source times, incomplete history; data-quality list | Apparent trends may be incomplete because records need correction | Assigned data steward opens the affected records | Disclose missingness before drawing conclusions; failures do not become zeros |

My work uses task lists and only necessary counts with direct drill-through. Service insights provides the cross-team questions above. Infrastructure contains asset-level history. The same definitions and filters power all three.

### 7.2 Data definitions before chart styling

- **Grain:** label whether a number counts submissions, canonical cases, tasks, work orders, inspections, or assets. If a canonical Case entity is not yet implemented, label report-based views honestly; do not silently call them cases.
- **Join control:** one report can relate to several jobs and publications. Aggregate at the intended grain before joining; otherwise a single concern multiplies across relationships.
- **Period:** distinguish a period-end stock from events during a period. Reconstruct historical backlog from events, not today's statuses.
- **Reconciliation:** closing backlog = opening backlog + new cases + reopens + transfers in − verified resolutions − approved non-resolution closures − merged-away cases − transfers out, adjusted for documented corrections. Categories must be mutually exclusive and retain provenance.
- **Stage waiting:** use actual entry/exit events. Separate total elapsed age from approved working-time clocks and recorded pauses. Do not declare a breach without an approved deadline/calendar.
- **Recurrence:** a new incident after a prior accepted outcome is distinct from repeated submissions about the same still-open defect. The asset/category/window rule requires engineering approval.
- **Comparison:** equal periods, same geography and definition version, visible sample size and data coverage. No percentage change against zero or incomparable populations.
- **Geography:** versioned barangay IDs, actual source geometry, and location confidence. North/South operational sector, legislative district, service eligibility, and asset ownership remain distinct.
- **Freshness:** show last successful retrieval and source as-of time. A stale view may remain readable but cannot imply current eligibility for actions.
- **Privacy:** scoped queries and exports apply before aggregation, charting, AI retrieval, and drill-through. Public projections suppress identifying details and unsafe small groups according to reviewed policy.

Do not include unsupported SLA percentages, composite city-health scores, staff leaderboards, estimated savings, financial utilization, or automatic cost-per-repair claims. The system may later support a measured indicator, but it first needs a real definition, data owner, event capture, and acceptance evidence.

## 8. Report → announcement/advisory/news → private notification

### 8.1 One publication system, distinct public formats

Use **Updates** as the staff module. Within it, choose Announcement, Advisory, or News as content formats with appropriate templates and review requirements. Keep one canonical publication/version system; do not build independent news and advisory databases.

- **Announcement:** approved planned works, schedule, program, or service information.
- **Advisory:** time-sensitive effects, restrictions, disruptions, or an authorized official relay.
- **News:** reviewed account of progress or a civic development, with source and dates.

Required public content: what is happening, where, effective dates or known uncertainty, resident action, issuing office, source, published/updated time, English/Filipino equivalents, and correction state. Optional budget disclosure appears with its precise amount label and source. Resident identity, report IDs belonging to other people, contact information, private coordinates, and original unreviewed evidence do not become public just because records are linked.

### 8.2 Association types and approval

| Association | Meaning | User-facing treatment |
|---|---|---|
| Candidate | Rules/AI or staff found a possible match by place, time, issue, asset, or work | Internal review queue only; no automatic personalized push in the pilot |
| Reviewed contextual relevance | Staff confirmed the notice is useful context but cannot claim the report is covered by that work | Say “may be related”; show a plain reason privately; report status unchanged |
| Confirmed work coverage | Authorized reviewer explicitly linked the case/report scope to the relevant work/project | Say it is linked to the work described; still do not imply started, completed, or resolved |
| Rejected / revoked | Match was wrong, no longer applicable, or superseded | Preserve reviewer/time/reason; remove active relevance and issue a correction if necessary |

Being in the same barangay is insufficient proof. A general roadworks post can be nearby but concern a different segment, asset, period, or agency. No universal AI-confidence cutoff is proposed without local evaluation.

### 8.3 Proposed publishing and notification flow

1. Staff starts a draft from authorized source work, a case, or a city-approved source.
2. Staff completes public-safe facts and optional sourced disclosure. The system may suggest related reports; it explains the candidate basis.
3. Technical reviewer checks facts, locations, schedules, scope, and association type. A publisher reviews privacy, language parity, content version, audience, and channels.
4. Approval binds the publication revision and reviewed targeting plan. New associations or changed source facts need applicable review; they cannot be added silently after approval.
5. Actual publication creates the canonical public page. Only then does a durable event create private in-app notifications for eligible report owners and queue optional push attempts.
6. A resident opens the public update. After sign-in where necessary, a private contextual panel explains the relation to their own report and links back to that report. Other reporters remain private.
7. A material correction, withdrawal, incorrect link, or cancelled work records a new event and the required follow-up. Already delivered phone notifications cannot be recalled.

A failed publication creates no “published news” notification. A push failure does not delete an existing in-app notification. A publication may proceed with no related reports; reporting is not a prerequisite for legitimate city communication.

### 8.4 Proposed bilingual copy

| Context | English | Filipino |
|---|---|---|
| Generic phone preview | A city update may be relevant to you. Open PULSO to view it. | May update ang lungsod na maaaring mahalaga sa iyo. Buksan ang PULSO para basahin. |
| Contextual in-app notice | Your report may be related to this city update. View the details. | Maaaring may kaugnayan ang ulat mo sa update na ito ng lungsod. Tingnan ang mga detalye. |
| Confirmed coverage notice | Your report is linked to the work described in this update. View the details. | Nakaugnay ang ulat mo sa gawaing inilalarawan sa update na ito. Tingnan ang mga detalye. |
| Relationship explanation | This update may be relevant because it concerns the same reviewed area and issue type. Your report status has not changed. | Maaaring mahalaga ang update na ito dahil tungkol ito sa parehong nasuring lugar at uri ng concern. Hindi nagbago ang status ng ulat mo. |
| Budget not disclosed | No budget amount is disclosed in this update. | Walang halagang badyet na inilathala sa update na ito. |

These are draft content examples for language review, not published messages. Phone previews should avoid issue details, exact location, reporter identity, and report IDs by default because a lock screen can be shared.

### 8.5 In-app and phone are separate channels

**In-app:** durable recipient-owned notification, unread/read state, canonical link, source revision, association reference, creation time, and permitted action. Reading on one device should reconcile across devices after sync.

**Phone push:** optional, supported device/browser, explicit permission and preferences, registered installation/subscription, server dispatch, and a safe deep link. [Firebase web guidance](https://firebase.google.com/docs/cloud-messaging/web/get-started) requires HTTPS, permission, and a service worker. [WebKit's iOS/iPadOS guidance](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) documents Home Screen web-app push and user-initiated permission. Validate currently supported devices in the pilot; ordinary page publication does not provide phone push.

Keep publication state, in-app record state, provider acceptance, device receipt where observable, and opened/read state separate. Record unknown when no receipt exists. Deduplicate in-app events by recipient + publication revision + notification purpose; dispatch per eligible device separately. Group multiple owned reports into one appropriate notice where possible. Revalidate ownership, permission, association, publication state, and preferences before dispatch. Expired/withdrawn notices must not be sent as new current advice.

Denied push permission, unsupported devices, expired subscriptions, quiet hours, offline phones, failed workers, and duplicate retries all have explicit states. In-app access remains usable. SMS/email are optional separately approved channels; “phone notification” does not automatically mean paid SMS.

## 9. Budget: collect sourced disclosure, keep processing outside PULSO

### 9.1 Scope decision and factual distinction

The user specifically excludes in-system budgeting and procurement processing. Their description that the local process uses paper is recorded as **user-supplied operational context, not independently verified research**. It is unnecessary to prove every external process is paper-based to keep it outside PULSO.

The [Caloocan Invitation to Bid page](https://caloocancity.gov.ph/invitation-to-bid/) publishes project names, ABC amounts, and bid dates; the [BAC page](https://caloocancity.gov.ph/bids-and-awards/) provides official procurement entries. These are appropriate external destinations. Current [RA 12009 IRR](https://www.gppb.gov.ph/wp-content/uploads/2026/05/IRR-of-RA-12009-1st-Edition.pdf) addresses official procurement publication and PhilGEPS. **A PULSO shortcut is a convenience; it does not replace the responsible office's required official postings.** No detailed procurement-compliance workflow is specified here.

| In scope | Outside this product scope |
|---|---|
| Optional public budget disclosure on an approved update | Budget proposal, appropriation/allotment, funding certification, or approval |
| Source URL/document, date, issuing office, amount type, project scope | Obligations, cash release, disbursement, accounting, liquidation, payments |
| Read-only reference to an externally issued authorization when relevant to engineering work | Creating/issuing procurement requests, BAC decisions, awards, or NTPs |
| “View official bidding opportunities” and a reviewed project-specific official link | Bid submission, evaluation, supplier selection, procurement financial processing |
| Versioned disclosed facts for future approved research | Automatic cost-based prioritization, funding allocation, or monetary decisions |

### 9.2 Proposed disclosure record

Store a canonical disclosure record and attach its approved version to publication revisions. Do not re-enter the same project amount into every linked report.

| Field | Rule |
|---|---|
| Disclosure ID, project/source reference, version | Stable identity; exact project, phase, or package scope |
| Amount and currency | Exact decimal monetary representation; explicit PHP or source currency; unknown is null, never default zero |
| Amount type | Source-described project allocation, ABC, awarded contract amount, or other clearly explained disclosure; do not infer actual expenditure |
| Source label and original URL/document | Required for a numeric disclosure; retain relevant cited page/section and controlled copy/hash where permitted |
| Source date, coverage/fiscal period, captured date | Distinguish publication date, effective period, and entry date |
| Issuing office and entered/reviewed actor | Entry is transcription; review records factual correspondence with source |
| Review / release state | Unverified draft; verified transcription; approved for public release; superseded/corrected/withdrawn |
| Scope and caveat | Whether the value covers multiple areas, phases, assets, tax, or other components, where disclosed; unknown remains stated |
| Public visibility and publication revision | A stored value is not public until the authorized release includes it |

Use the source's exact financial meaning. An ABC is not interchangeable with a project allocation, awarded contract value, actual spending, or per-asset maintenance cost. No arithmetic converts one into another. A technical transcription reviewer does not certify that money is available.

The update may display the amount label, source date/link, scope, and necessary caveat. If no reliable amount is provided, publish the otherwise valid service update without a budget number. Never block intake, assignment, inspection, or a legitimate announcement solely because a budget disclosure is absent.

### 9.3 Future AI and predictive-maintenance use

Collecting structured provenance preserves future options; it does not validate prediction. Start maintenance prioritization with verified asset identity, condition, defect type/severity, inspections, repair dates, recurrence, exposure, and data coverage.

Disclosed project budgets can later supply **context for sourced AI summaries**, within the same authorization and public-release boundaries. Using them as model features requires a defined question, comparable project scope, available-at-the-time timestamps, evaluated benefit over a simpler baseline, uncertainty, and privacy review. Do not treat total project allocation as actual asset repair cost or a proxy for failure risk. Avoid future-information leakage from budgets/awards published after the prediction date.

No budget-only maintenance prediction, automated prioritization by amount, invented remaining funds, savings, utilization percentage, or missing-value-to-zero substitution is authorized by this plan.

### 9.4 Migration implications requiring later implementation

The old proposal and code contain funding checks, monetary thresholds, procurement/NTP processing, and report-budget fields. Preserve historical values and issued-document provenance under retention rules, but do not translate legacy `budget_confirmed` into PULSO authority to spend.

Before a future release, inventory routes, background jobs, direct APIs, role bundles, documents, BI calculations, and model features that depend on these fields. Define each as legacy read-only reference, reviewed external-authority record, deferred financial calculation, or disabled processing command. Backend enforcement and data migration must match the product boundary; removing a menu is insufficient.

Any unknown historical `cost` produced by the current estimate/budget fallback needs a provenance warning or exclusion from actual-cost analysis. Do not overwrite it with a fabricated corrected actual amount. Reconcile old approved/proposed documents through a recorded change decision; this research does not delete the historical contract.

## 10. Data and authority contract for the next design phase

These are conceptual additions/reconciliations, not approved table or endpoint names.

| Record / relationship | Required content and authority |
|---|---|
| Employee assignment/delegation | Actual position/office; permission bundles; team/geography; start/expiry; approving authority |
| Case coordination | Report membership, reviewed responsibility, accountable coordinator, canonical lifecycle and public projection |
| Task | Source/version, responsible owner, prerequisites, next reviewer, known deadline basis, outcomes/history |
| Inspection/acceptance | Qualified actor, evidence, decision, scope, time, executor-conflict check |
| External process reference | Issuer/reference/date, document/URL, recorded dependency, follow-up owner; no in-app issuance |
| Publication revision | Approved bilingual facts, release authority, effective dates, public projection, correction/withdrawal |
| Report–publication association | Many-to-many; type, basis, reviewer, source scope, created/revoked time; private ownership checks |
| Disclosure | Sourced amount/version and public-release decision, attached by reference |
| Notification and attempts | Recipient, purpose, source revision/link, durable in-app state, channel-specific actual outcomes |
| Insight definition | Grain, event fields, clock/timezone, period, exclusions, geometry/version, coverage, authorized source query |

Enforce role capability + record/geographic scope + delegation + current state + evidence gate on the server. The client receives allowed actions; it does not infer them from a title. Mutation retries/concurrency must not create duplicate jobs, approvals, publications, or notifications. Approval binds the source version; stale or materially changed facts trigger review.

Government full-city visibility, if authorized, does not silently expand the North-focused resident eligibility in PRODUCT.md. Source timestamps remain authoritative; display city-facing service times in Asia/Manila with explicit zone where relevant. Store event times consistently and never count browser/device time as the approval time.

## 11. State, accessibility, privacy, and acceptance matrix

Apply default, hover, 3 px focus, pressed, selected, disabled-with-reason, and loading behavior to interactive patterns. The following matrix supplies minimum exceptional-state contracts; detailed component variants remain a design-phase deliverable.

| Pattern | States / recovery | Keyboard, focus, announcement, and privacy |
|---|---|---|
| My work / queue | First-use empty; filtered empty; partial/stale; offline; fetch error; permission changed; success with next task | Native table/list links; announce count changes politely; preserve filters; refresh does not steal focus; failed fetch never means no work |
| Docket / full record | Loading; missing evidence; unknown location; related-record unavailable; denied link; unsaved draft | Nonmodal preview has no focus trap; full-page title receives appropriate route focus; closing preview returns to originating control; original evidence protected |
| Assignment / review | No eligible assignee; absent staff; changed version; invalid prerequisite; denied/revoked authority; uncertain outcome; success | Labeled choices and eligibility reasons; governed confirmation names consequence; failure retains safe input; retry reconciles committed state |
| Field evidence | Permission denied; interrupted upload; saved draft; pending sync; rejected proof; conflict | Upload fallback; explicit saved/uploaded/synced distinction; safety guidance; text alternatives; never fabricate GPS/time |
| Insight | No records; incomplete history; stale query; partial geography; suppressed data; system failure | Summary + data table + ordinary source links; keyboard-accessible filters; map address/list equivalent; avoid hover-only interpretation |
| Update and report link | Missing fact; translation needs review; candidate/rejected/revoked match; changed work; unpublished/expired/withdrawn | Show public preview and private recipient context separately; no reporter leak; corrections readable; approval invalidation announced |
| Disclosure | No amount; source inaccessible; conflicting scopes/types; unverified value; correction | Absence differs from zero; source/amount label readable; review form errors associated with fields; preserve prior revision |
| Notifications | In-app unread/read; push permission denied; unsupported; queued/failed/unknown; expired session; wrong owner | Safe lock-screen text; deep link restores intended destination after sign-in; no cross-account disclosure; retry avoids duplicate notice |

Both themes preserve meaning, content, hierarchy, targets, privacy, and recovery. Use true-color evidence, Field Blue government action, stable semantic statuses, non-color cues, reduced motion, forced colors, and WCAG 2.2 AA. Government desktop queues become usable full-page/narrow layouts at 320 CSS px and 200% zoom. Resident-facing notification, public content, errors, dates, accessible names, and help require English/Filipino parity and text-expansion checks; public targets are generally at least 44×44 px.

### Acceptance scenarios for the eventual implementation

1. Intake can request information but cannot technically certify or publish through a direct API outside delegation.
2. Assignment creates a persisted owner/task/history; no eligible staff produces a supervisor task, not a fake success.
3. Executing and accepting the same work fails the approved conflict rule. Rework retains original evidence and the decision.
4. One job linked to several reports resolves only the scopes actually accepted; a news post alone resolves none.
5. Back from a record restores the same authorized queue, filters, selection, and safe position.
6. List/map/insight totals reconcile at the labeled grain, including unlocated and permission-limited records.
7. Backlog history includes reopen/merge/transfer corrections; repeated report submissions do not become repeated repair incidents.
8. A candidate report/news match creates no personalized pilot push before review. A confirmed link reveals no other resident's report.
9. Failed/withdrawn publication, invalid approval, changed audience, or revoked link prevents the corresponding new dispatch; corrections retain history.
10. Worker restart/retry creates one intended in-app event per recipient/revision/purpose, with independently tracked device attempts.
11. Push denied/offline/unsupported still permits in-app reading; provider acceptance is not displayed as opened/read.
12. A missing budget permits ordinary report/work/publication tasks. A disclosure cannot approve funds, issue NTP, or unlock construction.
13. The same project amount linked to multiple reports remains one disclosure; ABC and allocation are not summed or substituted as actual maintenance cost.
14. Legacy funding/cash/procurement commands cannot bypass the new backend scope boundary when implemented; historical records remain auditable.
15. Error/partial/offline/permission states never substitute operational samples. Every displayed insight traces to authorized source data.
16. Keyboard, focus return, screen-reader meaning, chart/table and map/list equivalence, themes, 320 px, 200% zoom, Filipino expansion, and slow/denied-provider scenarios pass representative testing.

No numerical improvement claim is made. A proposed measurement plan records task receipt/assignment/acknowledgment/start/submission/review/outcome events, stage waits, correction/reopen reasons, navigation task success, and notification attempts. Establish a baseline and approved retention/purpose before comparing results; avoid employee productivity rankings or engagement metrics.

## 12. Decisions, delivery order, and next Figma action

### Decisions requiring actual LGU evidence

| ID | Decision | Proposed owner / needed evidence |
|---|---|---|
| GOV-16-01 | Current positions, team responsibilities, and delegation | CED/HR; current org chart, plantilla or approved designation, sample actual work routing |
| GOV-16-02 | Case coordination, technical review, work acceptance, and closure | CED operational owner; walkthrough of routine repair, larger project, disputed outcome |
| GOV-16-03 | Charter times, schedules, working calendars, pause/referral rules | Service owner; current approved Charter and applicable policy |
| GOV-16-04 | CED/OCBO/other-office responsibility and referral contacts | CED and counterpart offices; actual routing and acknowledgment procedure |
| GOV-16-05 | Disclosure-only boundary reconciled with older lifecycle/API plans | Product owner + CED; user scope is set here, institutional adoption/migration remains pending |
| GOV-16-06 | Public publisher, technical reviewer, bilingual review, and emergency authority | Authorized city communications/service authority; delegation instrument and sample notices |
| GOV-16-07 | Publication/report associations and notification preferences | Operations + privacy + communications; reviewed match examples and correction policy |
| GOV-16-08 | Location/asset IDs, current geometry, and insight definitions | GIS/asset/data owners; authoritative records, coverage and historical changes |
| GOV-16-09 | Actual field devices/connectivity, push channel, and support | IT + field/resident pilot; device tests, permission/registration and delivery evidence |
| GOV-16-10 | Navigation labels, default rail/expanded shell, and field views | Representative staff + product/design; observed task testing |

The absence of interviews does not block a documented proposal. It blocks claiming this as the City's validated operating procedure. The next research activity is an artifact-led walkthrough with intake/Admin, Planning/technical coordination, field execution, verification, records, and publishing representatives. Request a real redacted example of a complaint, action slip, job order, inspection, referral, project update, and public budget source. Do not request resident PII for design discovery.

### Delivery order after decisions and separate implementation authorization

1. Agree the limited pilot work path, role/delegation matrix, lifecycle, external-finance boundary, and official source records.
2. Reconcile routes/permissions and design shared My work, queue/docket, assignment, evidence, verification, and truthful state primitives.
3. Deliver one complete routine workflow from report to accepted outcome with audit and resident updates.
4. Connect infrastructure history, records, and the highest-value insight questions; validate counts against real permitted records.
5. Deliver governed Updates, reviewed report associations, versioned disclosures, durable in-app notices, then tested optional push.
6. Add planning/project coordination and external official bidding references without financial processing.
7. Consider predictive assistance only after input provenance, historical coverage, task-specific evaluation, and human-review evidence exist.

This is dependency order, not a promised schedule. It does not change the approved resident-first expansion priority.

**Next Figma action:** inspect and reconcile the existing [shared file](https://www.figma.com/design/1qPgPj4o3smElv8B2B1REi) and reviewer-final light/dark templates before material visual decisions. Load official figma-use and the relevant library/design skills. Then create reusable planning artifacts for My work/task row, report docket, assignment/review, insight + source table, publication review, report association, disclosure block, and notification states; compose representative coordinator/field/publisher journeys in paired themes and narrow layouts. Preserve semantic variables/component relationships, annotate data/permission/state/localization/accessibility, and validate structure plus screenshots. This session did not inspect or mutate Figma and makes no claims about its current nodes or bindings.

### Research completion and remaining validation

- Completed: primary-source research, bounded current-code inspection, role/ownership proposal, navigation/module reconciliation, decision-oriented insight catalog, publication/notification and budget-boundary contracts, source links, and acceptance scenarios.
- Pending: LGU validation, production-data analysis, actual device/provider tests, lifecycle/capability approval, Figma reconciliation and visual design, implementation, and runtime acceptance.
- Not applicable in this documentation phase: product build/tests, screenshot-based UI audit, Figma structural/visual validation, provider setup, deployed/published outcomes, and measured performance gains.

## 13. Source and provenance register

All web sources below were accessed or retrieved through public search/web reading on 23 October 2026. A retrieval date is not proof that the source's underlying information was updated that day.

| ID | Source | Use / limitation |
|---|---|---|
| S01 | [Caloocan department list](https://caloocancity.gov.ph/about-us/list-of-departments/) | Published office/City Engineer listing; detailed text retrieved through indexed official result; direct page reading timed out; current appointment/delegation not independently verified |
| S02 | [Caloocan directory](https://caloocancity.gov.ph/about-us/directory/) | Official indexed Engineering Admin/Planning contact entries; not a full org chart |
| S03 | [CED services](https://caloocancity.gov.ph/category/ced/) | Readable service labels; complaint and excavation-service context |
| S04 | [CED Charter](https://caloocancity.gov.ph/ced-citizen-charter/) and [Transparency](https://caloocancity.gov.ph/transparency-seal/) | Verified links to Charter files; file content not verified because of access/transport failures |
| S05 | [RA 7160](https://lawphil.net/statutes/repacts/ra1991/ra_7160_1991.html) | General local-engineering/budget-function context; no inferred local signing delegation |
| S06 | [QC Engineering](https://quezoncity.gov.ph/departments/quezon-city-engineering-department/) | Comparative functional/service evidence only |
| S07 | [QC iReport](https://quezoncity.gov.ph/program/qc-ireport/) and [FAQ](https://quezoncity.gov.ph/faqs/faq-ireport/) | Official reporting/tracking descriptions; no full authenticated app audit |
| S08 | [QCitizen platforms announcement](https://quezoncity.gov.ph/qc-govt-boosts-transparency-accountability-with-qcitizen-data-platforms/) | Distinction between iReport and Open Infra budget/project transparency |
| S09 | [MyNaga introduction](https://www2.naga.gov.ph/available-mynaga-app/) | Official published app functions; not proof of absent unlisted features |
| S10 | [Caloocan invitations](https://caloocancity.gov.ph/invitation-to-bid/) and [BAC](https://caloocancity.gov.ph/bids-and-awards/) | Verified official external destinations and published ABC context |
| S11 | [GPPB RA 12009 IRR, first edition](https://www.gppb.gov.ph/wp-content/uploads/2026/05/IRR-of-RA-12009-1st-Edition.pdf) | Current-source publication/PhilGEPS context; not a procurement compliance review |
| S12 | [GOV.UK navigation](https://design-system.service.gov.uk/patterns/navigate-a-service/) | Top-level task navigation principle; not visual trade dress |
| S13 | [Analysis Function charts](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/) and [ONS choosing charts](https://service-manual.ons.gov.uk/data-visualisation/chart-types/choosing-a-chart-type) | Message/relationship, familiar charts, accessible alternatives |
| S14 | [FCM web setup](https://firebase.google.com/docs/cloud-messaging/web/get-started) and [WebKit Home Screen push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) | Permission/device/web-push prerequisites; no claim a provider was chosen/configured |
| R01 | [PRODUCT.md](../../PRODUCT.md), [Civic Aperture](../ui-ux-audit/09-visual-art-direction-v2.md), [government spec](../ui-ux-audit/05-government-experience-spec.md), [government stories](../ui-ux-audit/13-government-user-stories-and-sdlc.md), [lifecycle/API](../ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md) | Approved constraints versus older proposals; procurement/budget/lifecycle disagreements retained explicitly |
| R02 | Current source files linked in section 6 | Static observations only; no full authorization audit, database inspection, or integrated runtime claim |
| U01 | User instructions and clarification in this chat, 23 October 2026 | Research-based plan requested; no clear staff interview yet; disclosure/external-link budget scope explicit |

No officer, resident, asset condition, live KPI, project budget amount, predicted outcome, or measured service improvement was fabricated for this plan.
