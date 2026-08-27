# Research, usability, and measurement plan

| Field | Value |
|---|---|
| Status | Proposed |
| Version | 0.2 |
| Last validated | 23 August 2026 |
| Research principle | Test realistic success and failure paths with residents and staff |

## 1. Questions the project must answer

### Resident

1. Do people understand PULSO’s scope and why verification is required?
2. Can they complete verification without hidden requirements or fear about ID use?
3. Can they capture safe, useful evidence and confirm location?
4. Do they understand AI suggestions as editable/nonbinding?
5. Can they recover from denied permissions, weak network, and inconclusive automation?
6. Does the report receipt create confidence and prevent duplicate resubmission?
7. Do public statuses explain what the city is doing and what the resident should do?
8. Is English/Filipino copy equally understandable?

### Government

1. Does each role see its real work without unauthorized or irrelevant actions?
2. Can staff retain filter/selection context from queue to decision?
3. Are evidence, location, AI suggestion, status, ownership, and history sufficient to decide?
4. Can dispatchers assign the right team without hard-coded knowledge?
5. Are project/work-order stages understood consistently across divisions?
6. Are destructive, emergency, privacy, and approval actions appropriately guarded?
7. Can staff perform critical tasks at 1280×720, 200% zoom, and by keyboard?
8. Can managers trace analytics claims to source records and act appropriately?

## 2. Research phases

| Round | Timing | Method | Purpose | Decision output |
|---|---|---|---|---|
| Discovery | Phase 0–1 | contextual interview/workflow observation | validate current jobs, vocabulary, workarounds, policy | service blueprint and top tasks |
| Concept test | early Phase 2 | moderated low/mid-fi prototype | compare IA, Signal Cut lifecycle, shell, copy | direction selection |
| Formative 1 | resident/gov slice design | moderated task test | find major flow/recovery issues | revise before build |
| Formative 2 | interactive high-fi | moderated + accessibility specialist | validate corrected flows and state behavior | implementation-ready decision |
| Technical validation | pre-pilot | integrated E2E, a11y, performance, field devices | verify real system behavior | release candidate |
| Pilot | controlled rollout | observation + telemetry + interviews | measure operational fit and support burden | expand/hold/rollback |
| Post-launch | 2/6/12 weeks | field analytics + targeted interviews | confirm outcomes and detect harm | backlog/retirement decisions |

Run at least two formative rounds before broad implementation and one integrated validation round before pilot.

## 3. Recruitment

### Residents

Across rounds, recruit a mix of:

- English-first and Filipino-first participants;
- seniors/low-digital-confidence users;
- mobile-first Android users;
- residents using larger text, magnification, keyboard/switch, or screen reader;
- residents from different supported barangays;
- people with varied connectivity and device quality;
- returning reporters and people unfamiliar with PULSO.

Suggested formative sample: 5–7 residents per round, deliberately varied rather than statistically representative. Run targeted accessibility sessions in addition.

### Staff

Recruit representative participants from:

- dispatch/operations;
- administrative/records;
- inspector/engineering/design/survey;
- field/construction;
- procurement/approvals;
- management/executive;
- system administration/security.

Suggested formative sample: 6–10 staff per round spanning critical capability classes. Critical dispatch scenarios should be tested with all pilot dispatchers, not a small sample.

Do not use only project-team members; familiarity hides navigation and vocabulary problems.

## 4. Resident task protocol

Use realistic scenarios and seeded test data. Do not tell the participant which button to press.

### R1 Understand and begin

> You noticed an exposed wire near a street corner. Starting from the public site, find how you would report it and explain what information PULSO will need.

Measure: service comprehension, first-action findability, verification expectations.

### R2 Verify with an inconclusive result

> Your ID photo is readable to you, but the automated check cannot confirm one field. Continue without starting over.

Measure: recovery, trust, manual-review discoverability, retained progress.

### R3 Report with denied location

> Location access is off. Add a photo, place the issue near a known street/landmark, review the report, and submit it.

Measure: alternative path, map/text comprehension, error recovery, completion.

### R4 Uncertain network result

> The connection becomes unstable when you submit. Determine whether the report was received without creating a duplicate.

Measure: durable receipt, reconciliation, confidence.

### R5 Track and respond

> Staff requested a closer location description for your report. Find the request, add the information, and understand what happens next.

Measure: notification deep link, status language, response completion.

### R6 Resolved and retract language

> Review a resolved report, then show what you would do if you wanted to withdraw a new report by mistake.

Measure: outcome comprehension and confirmation-action clarity.

## 5. Government task protocol

### G1 Find owned work

> Find reports waiting for your review in Barangay 176 and open the oldest critical item.

Measure: My Work, filters, saved view, time to record.

### G2 Verify with conflicting evidence

> Review a report whose AI category and resident description disagree. Make a defensible decision.

Measure: human/AI relationship, evidence sufficiency, reason capture.

### G3 Assign work

> Verify an exposed-wire report and assign an eligible electrical team while retaining your queue context.

Measure: eligible-team discovery, confirmation, persisted status, context retention.

### G4 No eligible team

> No team is available in the normal jurisdiction. Record and escalate the situation without inventing an assignee.

Measure: exceptional path, accountability, error prevention.

### G5 Work completion/review

> Review field proof, request a correction, then approve corrected completion.

Measure: approval chain, status clarity, evidence/audit history.

### G6 Records and privacy

> Find the official record for a resolved incident and determine who accessed resident PII.

Measure: records IA, capability scope, audit traceability.

### G7 Analytics to source

> Investigate a high-severity barangay trend, verify the definition/time range, and open the source incidents.

Measure: analytical trust and actionability.

### G8 Emergency override

> Normal jurisdiction access is insufficient during a declared incident. Request temporary scope and then end it.

Measure: reason/scope/expiry/audit comprehension; policy guardrails.

## 6. Session measures

For each task:

- success: complete / assisted / failed;
- time on task;
- critical/noncritical error count;
- backtracks and dead ends;
- help/intervention count;
- Single Ease Question, 1–7;
- confidence in outcome, 1–7;
- comprehension probe: explain status/next owner in own words;
- trust/privacy concern notes;
- observed accessibility/physical-context issue.

Do not treat preference ratings as evidence of task success.

## 7. Release decision thresholds

### Resident

- ≥85% unassisted completion for report creation and status tracking;
- zero unrecovered critical errors;
- median SEQ ≥5.5/7;
- every participant can identify whether a report was received;
- camera/location/AI failure alternatives complete successfully;
- no material EN/FIL task-performance gap requiring remediation.

### Government

- ≥90% completion for routine workflows;
- 100% completion for critical dispatch scenarios during pilot validation;
- no unauthorized affordance or data exposure;
- no status transition without understood consequence;
- queue filters/selection retained through the task;
- median SEQ ≥5.5/7 for routine tasks.

Thresholds do not override severe safety, privacy, security, or accessibility findings. One severe issue can block release.

## 8. Accessibility validation

Automated checks are supporting evidence only. Manual matrix:

- keyboard-only navigation and action;
- NVDA + Chrome/Edge;
- VoiceOver + Safari;
- 200% browser zoom;
- 320 CSS px reflow;
- large text on mobile;
- reduced motion;
- forced colors/high contrast where supported;
- touch target/spacing;
- focus after navigation, validation, dialog, toast, and async status;
- maps/charts with equivalent text/table paths.

Target [WCAG 2.2 Level AA](https://www.w3.org/TR/WCAG22/). Log issues by user impact and blocked task, not only criterion number.

## 9. Analytics plan

### Privacy-minimized envelope

```text
event_name, surface, flow, step, role_class, locale,
device_class, result, error_code, duration_ms,
design_version, experiment_id
```

Never collect through UX telemetry:

- names or resident IDs;
- ID/evidence images;
- report narrative;
- exact address or GPS;
- email/mobile;
- credentials/tokens;
- staff free-text notes;
- clipboard/camera contents.

Use server-side privacy-safe entity identifiers only when governance approves and retention/access are documented.

### Resident funnel events

- `registration_started`
- `verification_step_completed`
- `verification_outcome`
- `report_started`
- `evidence_added`
- `location_method_selected`
- `location_confirmed`
- `classification_reviewed`
- `report_submitted`
- `report_submit_failed`
- `report_submit_reconciled`
- `report_abandoned`
- `receipt_viewed`
- `report_status_viewed`
- `notification_opened`
- `manual_review_selected`

### Government events

- `work_queue_viewed`
- `filter_applied`
- `saved_view_used`
- `record_opened`
- `triage_decision`
- `assignment_started`
- `assignment_completed`
- `work_order_created`
- `status_change_attempted`
- `status_change_completed`
- `decision_undo_used`
- `source_record_opened_from_insight`
- `emergency_access_requested`
- `emergency_access_ended`

### Outcome dashboard

Resident:

- completion, duration, step abandonment, retries, manual review, receipt/status success.

Government:

- time to review/assignment, queue age, rework/undo, no-owner time, transition errors.

Guardrails:

- duplicates, support contacts, API failures, performance, accessibility defects, permission denials, privacy/security events.

## 10. Qualitative analysis

Tag findings by:

- audience/cohort;
- task and step;
- environment/device;
- severity: blocks / serious friction / minor friction / opportunity;
- root cause: navigation / content / control / state / policy / backend / performance;
- frequency;
- confidence and evidence;
- responsible branch/owner;
- design/implementation decision.

Maintain a research repository with raw notes access-controlled and synthesis privacy-safe. Do not copy identity or sensitive report content into general design tools.

## 11. Pilot monitoring

Before pilot, define:

- cohort/role and duration;
- success and guardrail thresholds;
- support channel and hours;
- telemetry and incident dashboard;
- old-UI return path;
- daily operations review;
- stop/rollback authority.

Pilot stop conditions include:

- report loss/duplication;
- authorization or PII exposure;
- critical task unable to complete;
- severe accessibility barrier;
- sustained error/performance degradation;
- staff status/assignment inconsistency;
- rollback not functioning.

## 12. Research outputs

Every round produces:

- participant/cohort summary without unnecessary identity;
- scenario and prototype version;
- task metrics;
- finding clips/notes under controlled access;
- severity and confidence;
- decision/recommendation;
- owner and due milestone;
- what changed in Figma/content/requirements;
- unresolved policy/technical questions;
- go/revise/stop decision.
