# Government implementation checkpoint

**Status:** observed implementation on `codex/government-finalization`; not a production approval.  
**Updated:** 2026-10-05.  
**Base:** `Latest-pulso-resident` at `4141c289`.

## Working paths

- Active government accounts are required for staff APIs; suspended accounts are denied.
- Report verification, reasoned field-work approval, and assignment to an eligible active official are separate server decisions. Rejection requires a reason and does not penalize the resident's trust score.
- Work orders move through assignment, in-progress work, private completion proof, and independent inspection before report resolution. Field workers can read and act on their own assignments.
- Government report queues no longer substitute sample incidents, evidence, coordinates, timestamps, activity, or successful outcomes for missing server data. Failed refreshes remain visible as failures; cached queue data is marked stale.
- The document registry requires government records permission, an existing linked record, safe filenames, private storage, and authenticated file delivery. Public static uploads reject government document paths.
- Legacy report dispatch, hard deletion, direct resolution, old work-order creation, budget approval, and project certificate shortcuts cannot skip the governed workflow.
- Existing SMS provider changes from the original checkout are preserved in this branch.

## Deliberate blocks and decisions still needed

- **Project lifecycle:** the current database code stores 13 phases; the government design material also carries a 10-phase proposal. The code guards the existing persisted sequence against skips but does not declare it approved. Project resolution and certificates remain blocked until canonical lifecycle, evidence, review, and records rules are approved.
- **Money and emergency:** budget approval and emergency assignment need approved thresholds, sign-off, scope, evidence, and audit rules. A critical work priority does not activate emergency access or alerts.
- **Data scope:** the final jurisdiction and capability matrix is unapproved. Dispatch/report access is narrowed by active official role; assignment scoping is enforced for field work orders. Broader field-level and jurisdiction-level access remains a release gate.
- **Evidence and records:** report-image classification, legacy public image exposure, retention, legal hold, and disposition policy need owner approval and further implementation. Work-order proof and new government documents use private delivery.
- **Reliability:** record version checks, idempotent consequential commands, transactional notification delivery, and an end-to-end deployment exercise remain to be implemented.

## Verification

- Government-focused backend tests: 54 passed on this checkpoint.
- Frontend production build passed after the government queue changes.
- The full backend suite at the first checkpoint: 307 passed, five older resident tests failed for ticket prefix, tracking-token validator, token hash salt, exact anti-enumeration text, and a missing legacy `ProcessTimeline` model. Those failures were present before the latest government changes and remain separate work.

Do not present this branch as a completed government release until the blocked decisions and release gates above are resolved and verified.
