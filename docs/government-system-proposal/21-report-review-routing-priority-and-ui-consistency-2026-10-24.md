# Report review routing, priority and UI consistency

**Historical scale superseded:** The user's later 24 October instruction replaces this document's P1–P5 ordering with **P0 Monitoring → P5 Immediate response**. See [22 — Ascending severity, boundary reference and sidebar corrections](22-ascending-severity-map-reference-and-sidebar-2026-10-24.md) for the current implemented contract and migration. The scale below records the earlier implementation, not current behavior.

Status: implemented development behavior, 24 October 2026. Based on the user's annotated runtime feedback and the existing Reports design. Operational defaults below remain a pilot configuration, not a verified Caloocan delegation or approved statutory response policy. This extends documents 11, 16 and 18–20.

## What staff can do

Open a report in either Table View or Map View. The same report panel now shows its review owner, P1–P5 priority grade, AI urgency, evidence, location, work orders, activity and server-authorized actions. **Assign reviewer/Reassign** changes who owns the report review. **Set grade/Review grade** records a staff assessment. After verification and approval, **Create work order** assigns the field job separately. The standalone report route uses the same component and returns to the originating map/table context.

The shared Map View/Table View toggle preserves selected records and exact report selections. Confirmation dialogs explicitly use fixed viewport centering, automatic margins, a bounded height and scroll recovery. Both record views share the same panel styles and controls. Missing or failed evidence images have an explicit fallback rather than a broken image. Closed reports without historical review ownership say “Not recorded”; they do not appear to need new routing.

## Automatic employee queues

New reports are routed in the report-creation transaction. The API worker also checks older unassigned intake reports in bounded rotating batches, so an old report with missing location does not block later reports. Routing considers:

- active, nonsuspended employees authorized for intake review;
- the report's recorded district and employee jurisdiction;
- the lowest current open-review count, with a stable ID tie-break.

Default general intake reviewers are dispatcher and project engineer. Other staff need an explicit `report_review` delegation. Inspectors' completion-verification responsibilities do not automatically make them general intake reviewers. Leaders/admins coordinate by default rather than being used as a fallback employee pool. Open-review counts are queue counts, not a claim about capacity, staff productivity, availability calendars or specialist competence.

An unambiguous legacy barangay label may be matched to the recorded catalog and saved as its barangay ID with an audit event. Conflicting catalog districts or absent labels are not guessed from an address, resident profile or map viewport. No new coordinates are fabricated. Missing location or eligible staff keeps the report unassigned with a routing reason and a coordinator task.

Review assignment stores employee, time, automatic/manual mode and reason, plus immutable history and a private staff notification. It leaves report status, urgency and grade unchanged. Assignment does not approve a report or deploy a field team. Review owners see their report tasks under **My work → Assigned to me**, and waiting reports move to the appropriate waiting bucket. Coordinators retain visibility of unassigned and unavailable-owner exceptions. The Reports register exposes owner, grade, **My review queue** and **Needs routing** filters.

Assigned reviewers can assess and verify their own reports and request information. Coordinators retain their authorized oversight. Existing separate approval, rejection, dispatch and field-completion permissions remain server controlled. Geography, account eligibility and expected report version are checked on mutations. A stale decision must be refreshed; it does not overwrite someone else's work.

## P1–P5 grading

Document 11 defines a response-priority policy based on reviewed severity; urgency, lifecycle status, AI score and legal service deadlines are separate concepts. The UI therefore labels these **Priority grade**, rather than silently converting AI urgency into a confirmed physical-severity score.

| Grade | Pilot label | Recorded decision |
|---|---|---|
| P1 | Severe hazard | Staff-reviewed severe active concern |
| P2 | High priority | Significant localized risk or deterioration |
| P3 | Standard repair | Routine owned repair/service need |
| P4 | Preventive work | Planned preventive assessment/work |
| P5 | Monitoring | Named owner and future review date required |

All grades require an evidence/reason note and record the reviewer, time and previous decision. New or legacy reports without a staff decision show **Not graded**. P5 cannot be used to put a closed report into an active monitoring queue. No grade creates a statutory deadline, automatic emergency declaration or authority to spend. Immediate life-safety concerns still require the established emergency referral procedure; no unconfirmed P0 policy is introduced.

The field-work dialog separately shows its editable work-order priority. Its initial suggestion maps a reviewed P1/P2 to critical/high, P3 to normal and P4/P5 to low; staff confirm or change this before creating the work order. This is a pilot convenience, not a validated City dispatch policy. Report grade and work-order priority remain distinct records.

## Verification

- Full guarded PostGIS run: **89 passed**. Checks cover balanced/eligible routing, inactive/suspended and district exclusions, no-staff/unknown-location states, backlog starvation, unambiguous legacy catalog matching and conflicting-label refusal, report-creation routing, rollback, retry/version conflicts, assignment history, private operational data, employee My work, grading ownership and P5 requirements. Existing publication, maintenance, privacy and command checks continue to pass.
- The closed-report P5 guard received a focused priority-test recheck after the full run.
- Targeted lint for all changed report components/routes passes without errors or warnings. Production build passes; the existing large bundle warning remains.
- Migration `11d6f8a0b432` was applied to the configured development database without resetting it. Live API checks found **five** intake reports assigned: **three** to the dispatcher and **two** to the project engineer. Both employees' My work endpoints returned the corresponding report-task counts. Report 318's docket returned HTTP 200 with its persisted review owner. **Three** reports with absent locations remain visible for routing review.
- Development records are not verified City data. No fabricated employees, priority grades or field deployments were created. Automatic assignments and staff notifications are actual requested development behavior.
- Browser control remains disabled. These are implementation/API/build checks, not a claim of final visual or WCAG acceptance. Centered-dialog geometry, responsive/zoom behavior, map interaction, keyboard focus and final theme parity still require live browser acceptance. No Figma changes were made; the user's existing Reports UI is the visual reference for this correction.

Owner: current implementation task. LGU role delegation, domain-specific routing rules, duty coverage and priority-policy approval remain the decision dependencies recorded in documents 11 and 16. Unrelated existing schema differences recorded in document 20 were not silently repaired.
