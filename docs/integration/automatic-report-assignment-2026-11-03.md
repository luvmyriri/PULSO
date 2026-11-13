# Automatic report validation assignment — 3 November 2026

**Status:** Implemented in the working tree and verified locally; not deployed. This implements the user's request for an available validation queue alongside existing take/reassign actions. It does not establish an LGU staffing or service deadline policy.

## Behavior and authority

New and waiting intake reports can automatically receive one authorized validation owner. The server requires an active, unsuspended, accepted staff account, the existing `report_review:review` permission, jurisdiction matching the report's recorded district, explicit **Available** status, a fresh authenticated availability lease, and remaining capacity. Custom roles with the appropriate stored grant participate; selecting Available never grants a permission. Admin clerks retain their existing intake-only boundary.

Among eligible employees, routing selects the lowest open-review count, then the longest time since an automatic assignment, then staff ID for a stable tie. Open reviews use the existing intake status set, including `needs_information`; they exclude work that has moved beyond intake. The default capacity is 5, with a validated range of 1–50. These are configurable pilot operating defaults, not measured staffing recommendations.

Available/Away/Offline describes acceptance of **new automatic validation work**. Away, Offline, an expired lease, and a full queue do not remove existing ownership. Manual take, coordinator assignment/reassignment and peer transfer retain their existing permissions, version checks and audit requirements; authorized manual assignment may select an employee who is away or already full. No automatic field deployment, work order, status transition, verification or approval is introduced.

When nobody qualifies, the report remains unassigned with a reason distinguishing unresolved routing location, no available authorized employee in the district, and full available queues. An explicit Available change or heartbeat processes waiting work immediately. The existing approximately two-second worker revisits the backlog in bounded, cursor-based batches; this is not a guaranteed assignment deadline. The My Work view polls while visible every 15 seconds. Global routing pause is respected, and a connected employee sees **Routing paused** rather than a claim that new work is accepted.

## Availability and concurrency

The header control uses authenticated server state. It sends a heartbeat every 30 seconds while the employee's declared state is Available. The server stops accepting new assignments after 120 seconds without a heartbeat or when the authenticating session expires, whichever happens first. Sign-out makes a best-effort offline request; loss of that request still allows the lease to expire. Browser suspension, network loss and disconnection can therefore leave a short grace period before an employee is treated as offline. A browser heartbeat proves connectivity, not attention or physical presence.

An access-version change invalidates the previous lease. A new session must explicitly select Available again. Heartbeats cannot resurrect Away/Offline or an availability lease from a revoked access version. Versioned status saves reject another tab's newer decision with HTTP 409. Background refreshes do not replace the version of an open, unsaved form; explicit refresh or conflict recovery reloads the draft from the server.

Automatic selection and capacity calculation share a transaction-level PostgreSQL advisory lock. Backlog processing takes this lock before report locks, and concurrent intake cannot use the same last automatic slot twice. The automatic path refreshes the locked report before assigning, preserving a concurrent manual owner. Automatic decisions record the policy `available-validation-least-load-v1`, reason and owner; a changed owner receives the existing private notification. Availability changes have staff audit records. Read-only status requests do not seed presence or assign reports.

## API and migration

- `GET /api/gov/report-review/availability/me`: eligibility, declared/effective state, capacity, open-review count, version, lease timing and whether new automatic work can currently be accepted.
- `PATCH /api/gov/report-review/availability/me`: strict `state`, `capacity` and `expected_version`; authenticated self-service only.
- `POST /api/gov/report-review/availability/me/heartbeat`: renew an explicitly Available lease for the current access version.
- `POST /api/gov/report-review/availability/me/offline`: explicitly stop accepting automatic work.
- Existing `GET /api/gov/report-review/{id}/reviewers`: adds effective availability, open-review count and capacity to the authorized manual reviewer list.

Migration `25c9d0e1f2a3` follows the [report intelligence foundation](report-intelligence-foundation-2026-11-01.md) migration `24b8c9d0e1f2`. It adds `report_reviewer_availability` with state/capacity constraints, version, access version, heartbeat/session expiry and last automatic assignment time. There is no inferred Available backfill: existing employees start effectively Offline until they opt in. Existing report owners remain assigned.

Bootstrap scripts, the normalized schema inventory, CI expectations and guarded test runner reference head `25c9d0e1f2a3`. Only the named disposable local PostGIS database was migrated for verification. The configured application and production databases were not migrated. Use the existing reviewed schema workflow before running this increment against an application database; ensure a validator explicitly becomes Available before expecting automatic ownership.

## Verification and limitations

- The initial integration run passed **140 tests** across availability, government workspace, operational settings, intelligence and resident/government integration. After the final routing-state changes, a focused rerun passed **20 tests**, with 87 deselected. These overlapping counts are not additive. Coverage includes concurrent intake competing for one slot, scope/permission restrictions, expired heartbeat and JWT leases, access revocation, paused routing, capacity recovery, fair ties, stale saves, and retained manual ownership actions.
- ESLint and the production frontend build passed. The existing large-bundle advisory remains; no performance benchmark is claimed.
- Browser checks used the explicitly synthetic fixture `frontend/tests/fixtures/reviewer-availability.html`. They covered availability/capacity saves, focus return, Escape, connection failure and recovery, light/dark rendering and a narrow viewport measured at **355 px**. A final conflict check confirmed that a background refresh displaying another tab's Away state still rejects the old Available draft, reloads Away and preserves the conflict alert. The browser clamped the requested 320 px viewport; exact 320 px, 200% zoom, forced colors and screen-reader behavior remain unverified. This is not a live browser/API integration test.
- The new control preserves existing government tokens and native form controls. No Figma write or current Figma structural validation is claimed. The next design handoff is to annotate availability, expiry, capacity, conflict and error states in the shared government header/library and reconcile the responsive control with the reviewer-final templates using the official Figma skills.

This increment does not complete image identity matching, independent infrastructure surveys, validated LightGBM resolution estimates or predictive maintenance. Those remain in the [report intelligence roadmap](report-intelligence-foundation-2026-11-01.md#remaining-development). It also does not guarantee exact object coordinates from a regular phone.
