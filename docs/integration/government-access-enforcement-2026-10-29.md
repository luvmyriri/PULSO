# Government access enforcement — 29 October 2026

Status: implemented, tested, and deployed for the 29 October demonstration. This records observed enforcement and the user's System Admin decision, not LGU approval of every job's signing authority.

## Access contract

- `/api/gov/navigation` supplies permitted sections. Navigation, workspace tabs, and direct government bookmarks use that response. Access-check failures show an error and retry instead of rendering protected content.
- An explicit module grant overrides role defaults, including for privileged roles. An empty array denies that module; a nonempty array permits only its named actions or `*`. Modules omitted from a stored role retain existing role defaults for compatibility. **A partial capability map is not a section whitelist.**
- My Work and personal account access remain available to authenticated staff. Assigned report and work-order details can open inside My Work without granting access to the wider queues. Independent work reviews require work-order visibility and verification permission.
- Reports queue, maps, legacy resident-report lookup, individual records, and timeline reads enforce section or recorded assignment access and jurisdiction. Resident portfolios require a resident account, preventing numeric staff/resident ID collisions.
- Report review permissions remain separate from section visibility. Assignment, taking ownership, grading, verification, and other decisions also require the applicable action, record ownership, and lifecycle state. Closed reports do not advertise reassignment or grading.
- The selected-report action bar now shows `Take it` when the docket advertises that action. For reports without a confirmed routing barangay it states the prerequisite and offers the location confirmation action. The active Administration workspace has a stored-role capability editor; role definition changes invalidate affected staff sessions.
- Stored custom staff roles can enter government routes and the reports queue when the server grants those sections. Explicit `report_review` grants can make those employees eligible for review routing; assignment and takeover still require the live docket and server checks.
- Work-order commands enforce explicit operation grants across retained endpoint aliases. View-only access does not expose create, assign, reassign, start, completion, or verification actions. Existing role, ownership, evidence, concurrency, and independent-verification rules still apply.
- Analytics, records, OBO, and financial-history access respect explicit restrictions. OBO options also suppress commands denied by the stored role.
- The initial access enforcement pass did not edit staff accounts or migrate data. The subsequent local demonstration policy is recorded below.

## System Admin report handling for the local demonstration

The user authorized System Admin to make technical report decisions for the demonstration. Active System Admin accounts now receive the default `report_review` actions `assign`, `review`, `verify`, `approve`, and `reject`. They may dispatch approved reports to field work and perform independent completion inspection. A stored role with explicit `report_review` or `work_orders` capabilities overrides these defaults, including an empty denial. Report status, jurisdiction, privacy review, decision reasons, current version, field evidence, and separation of duties remain enforced. Resolution follows a passed independent work-order inspection; a pending report does not receive a direct Resolve action. This is an application policy for the local demonstration, not a statement of LGU production delegation.

## Configuring a Dashboard and My Work profile

Configure `overview: ["view"]` and deny other section capabilities explicitly: `reports`, `work_orders`, `field`, `maintenance`, `analytics`, `insights`, `records`, `projects`, `announcements`, `admin`, `obo`, and `procurement` should be empty arrays. Deny decision capabilities such as `report_review`, `verification`, and `referrals` unless those responsibilities are deliberately delegated.

Assigned responsibilities remain visible in My Work. If an employee must execute assigned work, add only the required work-order actions, such as `start`, `remark`, or `submit_completion`; adding these does not require granting the queue's `view` action. Report intake work similarly uses the separate `report_review` grant. Administrative assignment and engineering verification are separate responsibilities.

Capability keys use underscores, while navigation identifiers such as `work-orders` use hyphens. Use the stored capability keys when configuring a role.

## Implementation and validation

Backend access adapters: `government_access.py`, `roles_service.py`, `legacy_operations.py`, `analytics_router.py`, `gov_router.py`, `report_review_router.py`, `operations_workspace.py`, `work_order_workspace.py`, and retained report routes in `main.py`.

Frontend: the shared protected-route gate and government route-to-section mapping; server-filtered workspace tabs; explicit capability precedence; and the shared work-order record reused in My Work.

Acceptance cases cover a Dashboard/My Work profile, view-only report/work-order commands, assigned report access with its queue denied, independent-review exclusion, cross-account ID collisions, and report jurisdiction checks. Database mutations are confined to disposable PostGIS databases. No synthetic civic records or test roles are written to local operational data or production.

Results: 151 backend tests passed (23 integration/predictive checks and 128 government workspace/access checks); targeted Node frontend tests, targeted frontend lint, the design detector, and the production build passed. The local API was restarted; its OpenAPI endpoint returned HTTP 200 and the frontend API proxy returned the expected HTTP 401 for an unauthenticated government request. The production API and web images built and passed health checks; the public root, API health, and government route returned HTTP 200, while anonymous government navigation returned HTTP 401. Existing deprecation and build-size warnings remain.

Remaining boundary: role defaults and final LGU delegations still need to match the organization's operating policy. These checks verify application enforcement and selected regression cases; they do not certify every combination of custom role, record state, and upstream service.
