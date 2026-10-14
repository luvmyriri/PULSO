# DISPATCH: Milestone 1 Challenger 2 — Separation of Duties & Lifecycle State Machine Stress Test

## Assigned Role: Adversarial Verifier (Security & State Machines)
## Working Directory: c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_challenger_m1_2
## Parent: teamwork_preview_orchestrator_2
## Source Documents:
- `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_orchestrator_2\PROJECT.md`
- `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_worker_m1\handoff.md`
- `c:\Users\Val\Desktop\PULSO\backend\gov_router.py`
- `c:\Users\Val\Desktop\PULSO\backend\announcements_router.py`

### Adversarial Verification Objectives
1. Separation of Duties Stress Test:
   - Construct adversarial test cases attempting to bypass `inspector_id != assigned_to_id` in `POST /api/gov/work-orders/{id}/verify`:
     - Field worker verifying own work order as assigned worker
     - Field worker passing fake headers or query params
     - Verify server returns HTTP 403 Forbidden under all bypass attempts.
   - Verify legitimate inspector (`inspector_id != assigned_to_id`) can successfully verify and transition to completed.
2. Announcements State Machine Stress Test:
   - Test invalid state transitions (e.g. `draft` -> `published` directly without review/approval, `published` -> `draft`, etc.). Verify server rejects invalid transitions.
   - Attempt direct PUT update on `published` announcement. Verify HTTP 400 rejection.
   - Submit correction via `POST /corrections` and verify immutable history snapshot.
3. Assets & Blockers Stress Test:
   - Verify blocking a work order with invalid reason code rejects cleanly.
   - Verify unblocking restores work order state.

Report empirical findings and state verdict (**APPROVE** or **REJECT**) in `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_challenger_m1_2\handoff.md`. Communicate back via `send_message`.

## 2026-09-18T15:40:14Z
You are Challenger 2 (Security & State Machines) for Milestone 1.
Your working directory is: c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_challenger_m1_2
Read your instructions in c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_challenger_m1_2\DISPATCH.md.
Adversarially stress-test separation of duties on /api/gov/work-orders/{id}/verify (attempting self-approval bypasses) and announcements lifecycle state transitions (invalid transitions, editing published notices).
State your verdict (APPROVE or REJECT) in handoff.md and notify parent via send_message.

