# Resident experience specification

| Field | Value |
|---|---|
| Status | Proposed; validate with residents before implementation |
| Version | 0.2 |
| Last validated | 23 August 2026 |
| Target stream | `codex/ui-reworks-residents` consuming `codex/ui-reworks` |

## 1. Experience goal

A resident can understand PULSO, establish an account, report an infrastructure issue, receive a durable ticket, and track what the city is doing without assistance, hidden requirements, or internal-government vocabulary.

Primary outcomes:

- more valid reports completed;
- fewer abandoned verification/report attempts;
- fewer duplicate/support contacts caused by unclear status;
- higher resident confidence that evidence reached an accountable owner;
- English/Filipino functional parity;
- no resident blocked solely because an automated classifier is inconclusive.

Non-goals for the first vertical slice:

- redesigning every city-service directory;
- adding public social engagement or gamification;
- exposing staff-only workflow detail;
- expanding a resident Trust Score;
- replacing the backend’s fraud, duplicate, or jurisdiction controls.

## 2. Resident cohorts to design and test with

- mobile-first Android users on variable connectivity;
- English-first and Filipino-first residents;
- older adults and low-digital-confidence residents;
- residents using screen magnification or assistive technology;
- residents with denied/unavailable camera or location permission;
- people reporting in rain, low light, unsafe roadside conditions, or limited time;
- people with an inconclusive ID/OCR/face match;
- returning residents primarily checking status rather than reporting.

The product must not assume high-end devices, precise GPS, continuous connectivity, or comfort uploading identity documents without explanation.

## 3. Navigation model

### Mobile

```text
[PULSO]                           [EN/FIL] [Account]
[Urgent city advisory — only when applicable]

Latest report
Received ─ Reviewed ─ Assigned ─ In progress ─ Resolved

[                   Report an issue                   ]

City updates
Nearby issues
Services & emergency contacts

Home     My reports      (+ Report)      Updates     Account
```

### Larger screens

- persistent masthead with language, updates, help, and account;
- max-width content with home/status as the first column and contextual updates/services as the second;
- no duplicate top and bottom navigation at one breakpoint;
- primary report action remains visible but does not cover content.

## 4. Route model

| Route | User job | Primary action |
|---|---|---|
| `/` | Understand the service and choose a task | Report an issue / Track a report |
| `/login` | Sign in | Sign in |
| `/register` | Create and verify an account | Start verification |
| `/reset-password` | Recover access | Send recovery code / Save new password |
| `/dashboard` | See latest status and city context | Report an issue |
| `/dashboard/reports` | Find a report | View report |
| `/dashboard/reports/:reportId` | Understand status, events, evidence, and next action | Provide information / View update |
| `/dashboard/report/new/evidence` | Capture or upload evidence | Continue |
| `/dashboard/report/new/location` | Confirm where the issue is | Confirm location |
| `/dashboard/report/new/details` | Describe what happened | Continue |
| `/dashboard/report/new/review` | Check and consent to submission | Submit report |
| `/dashboard/report/new/receipt` | Save the ticket and know what happens next | View report |
| `/dashboard/updates` | Read advisories and notifications | Open update |
| `/dashboard/account` | Manage profile, verification, language, security | Save changes |

Report-creation routes may use a shared wizard shell, but each step must be URL/history-aware and preserve its draft.

## 5. Public entry and authentication

### Public home

First-viewport content:

1. **Report infrastructure issues. Track what happens next.**
2. One sentence explaining North Caloocan scope.
3. Primary **Report an issue**.
4. Secondary **Track a report** and **Resident sign in**.
5. Separate, quiet **Staff sign in**.

Do not make residents scroll through product marketing before reaching the service.

### Sign in

Required fields:

- Email or mobile number.
- Password.

Behavior:

- visible programmatic labels, autocomplete, password reveal with announced state;
- submit label **Sign in**;
- inline field errors plus a summary for server/auth errors;
- rate-limit messages explain wait time and preserve the identifier;
- expired session returns to the intended route after authentication;
- **Forgot password?** and **Create account** remain visible;
- never clear language/theme during logout.

### Recovery

Flow: identifier → choose/confirm channel → code → new password → success.

Requirements:

- one-time-code autocomplete and numeric input mode;
- code group label and per-digit accessible labels if split fields remain;
- paste support;
- resend timer that is not the only way to understand availability;
- no loss of context when an incorrect/expired code is entered;
- final confirmation **Password updated. Sign in with your new password.**

## 6. Registration and identity verification

### Required sequence

1. **Why verification is needed**
   - explain service/jurisdiction purpose;
   - list accepted IDs, what is extracted, retention/use, and manual alternatives;
   - obtain privacy/processing acknowledgement before document processing.
2. **Capture ID**
   - one card per side on narrow screens;
   - camera, upload, and assisted-service options;
   - clear quality guidance and retake.
3. **Review extracted information**
   - show source and confidence without technical jargon;
   - highlight uncertain or changed fields;
   - allow correction with reason/audit if policy requires.
4. **Face/liveness or alternative verification**
   - explain purpose before camera request;
   - offer manual review when inconclusive or inaccessible.
5. **Contact and account security**
   - mobile/email, password requirements, communication preference.
6. **Verify channel**
   - OTP behavior described above.
7. **Success**
   - state verification level and any pending review;
   - primary **Go to dashboard**.

### Verification state model

| State | Resident message | Next action |
|---|---|---|
| Not started | Verify residency to submit official reports | Start verification |
| In progress | Your verification draft is saved | Continue |
| Automated review | We’re checking your information | Wait / View details |
| Needs correction | We couldn’t confirm these details | Review details |
| Manual review | A staff member will review your information | View expected time / Get help |
| Verified | Your account is verified | Go to dashboard |
| Not eligible/outside scope | PULSO currently serves the listed area | Find the correct service / Request review |
| Service unavailable | Verification is temporarily unavailable; your draft is saved | Try again |

No automated outcome may strand the person without an explanation and support/review route.

## 7. Report-an-issue flow

### Step 1: Evidence

Job: show the physical issue clearly without encouraging unsafe behavior.

Requirements:

- camera and file upload;
- safe-position guidance: never step into traffic or approach exposed wiring;
- preview, retake/remove, file type/size guidance;
- permission-denied alternative;
- upload progress, retry, and retained local draft;
- AI/image check presented as a suggestion/quality check, not final civic eligibility.

Primary: **Use this photo**. Secondary: **Choose another photo**.

### Step 2: Location

Job: confirm a usable location.

Requirements:

- device location only after explanation;
- address search, manual pin, and landmark/exact-location description;
- visible jurisdiction state: checking, inside, outside, unknown, error;
- map and equivalent textual fields;
- location confirmation shows barangay, address/landmark, and coordinates only when useful;
- default map center is never accepted as a confirmed location.

Primary: **Confirm location**.

### Step 3: Issue details

Job: describe what city staff need to evaluate the issue.

Fields:

- category, prefilled as **Suggested** when AI has a result and editable by the resident;
- description: what happened, what is affected, when noticed;
- exact location description: visible in photo/nearby landmark;
- optional safety/urgency observations with plain examples.

AI inconclusive: allow **Submit for staff review**. AI must never be the only route to submission.

### Step 4: Review

Show:

- image/evidence;
- category and description;
- map/address/exact-location description;
- contact/notification channel;
- privacy and accuracy statement;
- duplicate candidate if detected.

Every section has **Edit**. Back navigation preserves fields and evidence.

Primary: **Submit report**. Do not use generic **Submit**.

### Step 5: Receipt

Show immediately and durably:

- ticket ID with copy/save behavior;
- **Received** status;
- submission time;
- what happens next;
- expected update policy without invented ETA;
- notification preference;
- **View report** and **Back to home**.

If the request timed out after transmission, reconcile before encouraging another submission. Avoid duplicates caused by uncertain success.

## 8. Report detail and tracking

Page anatomy:

1. Ticket ID + issue title.
2. Public status badge and Signal Cut lifecycle.
3. Latest update with time and responsible city unit when policy allows.
4. Required resident action, if any.
5. Evidence and confirmed location summary.
6. Chronological public-safe updates.
7. Contact/help and notification preference.
8. Retraction only when policy/status permits.

Exceptional states:

- **More information needed**: show exact request, deadline/policy, and **Provide information**.
- **Duplicate**: show canonical ticket and how the resident’s evidence contributes.
- **Outside scope**: explain which service/agency should handle it.
- **Delayed/blocked**: plain reason and next update date when available.
- **Resolved**: show approved proof/summary, resolution time, and feedback.

Retraction confirmation uses **Retract report** and **Keep report**. Explain consequences; do not label the safe action **Cancel**.

## 9. Home, updates, and services

### Home priority

1. urgent advisory only when truly urgent;
2. latest active report;
3. **Report an issue**;
4. city updates;
5. nearby privacy-safe issues;
6. services/emergency contacts.

### Notifications

- group by report/advisory, not an undifferentiated stream;
- opening a report notification deep-links to the report/event;
- read and hidden/dismissed are distinct server-backed states;
- dismiss offers undo when practical;
- mark-all-read has progress, failure, and reconciliation;
- never include sensitive resident/evidence details in lock-screen text by default.

### Advisories

Each advisory identifies severity, area, effective time, issuing office, last update, and recommended action. Expired advisories are clearly archived.

### Services and emergency contacts

Call actions must identify who will be called and the number before initiation. A map/list of services cannot displace the core reporting task.

## 10. Profile, privacy, and settings

- profile and contact changes show verification consequences before saving;
- language changes update `<html lang>` and all resident copy;
- theme controls expose name and selected state;
- security lists active sessions and sign-out behavior if supported;
- privacy page explains identity/evidence/location use in plain language;
- account deletion is a governed request, not an immediate destructive button;
- accessibility settings include text/motion preferences where feasible.

## 11. Resident screen-state contract

| State | Required design behavior |
|---|---|
| Loading | Preserve layout with skeleton; identify region as busy |
| First-use empty | Explain benefit and offer the permitted first action |
| Filtered empty | Summarize filter and offer Clear filters |
| Offline | Show saved/cached data age; allow draft; explain sync |
| Permission denied | Explain why permission helps and provide manual alternative |
| AI/OCR inconclusive | Preserve evidence and route to manual review |
| Recoverable error | State what failed, what is saved, and Retry |
| Session expired | Preserve draft and return after sign-in |
| Success | Name completed action and durable next destination |

## 12. Content examples

| Situation | Recommended copy |
|---|---|
| Photo check failed | We couldn’t clearly identify an infrastructure issue in this photo. Try another photo or submit it for staff review. |
| Location denied | Location access is off. Search for the address or place the pin manually. |
| Upload timeout | The photo did not finish uploading. Your draft is saved. Retry upload. |
| Report received | Report received. Ticket PUL-2026-0822 is ready to track. |
| Needs information | Staff need a closer location description before they can assign this report. |
| No reports | Your submitted reports will appear here. Report an issue when you see a city infrastructure problem. |

## 13. Accessibility and responsive acceptance

- complete each core task with keyboard only;
- controls have accessible names/states and visible focus;
- dialogs trap/restore focus and close safely with Escape;
- labels/errors are programmatically associated and announced;
- target WCAG 2.2 AA; no keyboard trap or critical/high accessibility issue;
- no essential horizontal scrolling at 320 CSS px;
- touch targets are generally 44×44 px;
- 200% zoom preserves order and actions;
- reduced motion removes nonessential transforms/loops;
- English and Filipino offer functional parity;
- camera/location denial has a complete alternative;
- dark theme preserves boundaries, statuses, and map information.

## 14. Resident product metrics

Primary:

- report completion rate;
- median time to submit;
- abandonment by step;
- recoverable/unrecoverable error rate;
- successful report-status lookup;
- percentage of residents receiving a durable receipt.

Guardrails:

- duplicate reports caused by uncertain submission;
- support contacts per submitted report;
- manual-review volume and age;
- privacy/accessibility incidents;
- performance regressions;
- reporting suppression associated with eligibility/scoring messages.

Usability release target: ≥85% successful completion of the reporting and tracking tasks, zero unrecovered critical errors, and median Single Ease Question ≥5.5/7 in the validation round.
