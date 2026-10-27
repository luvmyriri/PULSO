# Staff administration and account lifecycle

Status: implemented development behavior, 24 October 2026. Continues the full government-side objective and supersedes the staff-account gaps recorded in document 24 where identified below. The full objective remains active; this is not a production or LGU policy sign-off.

## Working staff paths

The staff section now uses the shared Reports-style government workspace: search, account-state filter, paginated table, selected record, district access, explicit actions and centered native dialogs. Account selection and filters remain in the URL. Staff invitations, role/scope changes, deactivation/reactivation and recovery links use server results and retain safe input after rejected saves.

New accounts remain **Invited** and inactive until the employee accepts an invitation. Invitations expire after 48 hours; password recovery links expire after one hour. These durations are implementation defaults, not statutory or LGU-approved deadlines. Renewal cancels older unused links. Acceptance is single-use, including simultaneous requests. The database stores a SHA-256 digest of a high-entropy secret; the raw link is returned only to the authorized administrator and is not copied into audit history.

The acceptance page is `/gov/activate`. The secret is carried in the URL fragment, which is not sent in normal HTTP request URLs. The page saves the new password through `/api/admin/staff-credentials/accept`, clears the fragment after success and provides staff sign-in. Passwords require at least 12 characters and at most 72 UTF-8 bytes, matching the current bcrypt storage limit. No password is stored in browser storage.

Delivery is explicit: the administrator receives a private link to copy and share through an approved channel. **No automatic invitation or recovery email is claimed or sent.** Provider delivery remains a separate unfinished requirement.

## Real access changes

Role assignment now synchronizes the role identifier and linked role record. The previous linked permissions cannot remain attached after choosing a different role. District access uses canonical district IDs; the form requires specific districts or an explicit citywide choice. Unknown lookup IDs and grants outside the acting administrator's district scope are rejected. Existing malformed scope records are labeled for review rather than rewritten or presented as North Caloocan.

Administrative actions distinguish staff viewing/management, resident viewing/management, settings viewing/management and audit viewing. An audit-only grant cannot create staff, change settings or inspect resident verification evidence. Explicit empty grants override role-title defaults. Navigation and route checks use the same action vocabulary, with backend enforcement as authority.

The configured development administrator uses the historical `admin: ["manage"]` spelling. An explicit compatibility mapping preserves that module-wide administrative grant as `*`. Historical `view` grants map to administrative read actions; `audit` remains audit-only. No account grant was changed in the configured database to obtain these results.

Each account access change requires the displayed version and a reason. Stale versions return 409. Account-authority mutations share a transaction lock, revalidate the acting administrator after waiting, and save account state and audit history in one transaction. Self-demotion/self-restriction is refused. Concurrent administrators cannot remove all remaining administrative access. Deactivation and authority changes cancel unused credential links and invalidate old staff sessions.

Dynamic role definition commands now require system-administrator authority, a reason, and—for edits—the expected current capabilities. They audit the before/after definition and invalidate affected sessions. An administrator cannot edit their own linked role definition. Historical role metadata, including boolean flags and specialization strings, remains readable without being converted into wildcard action grants. A full role-definition editor remains future work; the new staff interface assigns existing roles.

## Staff self-service and recovery requests

**My Account** now opens `/gov/account` for ordinary employees rather than sending them to staff administration. The page reads the employee's own server record, shows role/district access as read-only, and allows contact-detail and password updates. Password changes require the current password, cancel unused account links, invalidate prior sessions and lead back to sign-in.

The shared legacy self-profile path no longer probes another identity table using the same numeric ID. A resident and an official with matching IDs cannot overwrite one another through this path. Other-account inspection uses the authorized administration paths. Changing a sign-in email requires a verified recovery/change workflow and is not silently performed by a profile edit.

Staff sign-in recovery now submits `/api/admin/staff-credentials/request`. Eligible requests create an audit entry and private in-app notices for eligible administrators, linked to the staff record. Repeated requests are suppressed for 15 minutes. Registered and unregistered addresses receive the same public response. The request does not prove the requester's identity; the administrator must confirm identity before privately sharing a recovery link. A separate structured recovery-request queue and external delivery remain follow-up work.

Resident OTP recovery routes cannot change staff credentials. The staff acceptance/recovery path and authenticated current-password change remain the implemented staff password paths. Recovering a sole administrator without another eligible administrator or a configured external delivery channel remains an operational recovery dependency; no automatic recovery outcome is fabricated.

## Alternate paths and privacy

Legacy government staff role/status mutations now call the same account service and require the relevant administrative action. Staff status changes through those aliases require the expected account version. Legacy staff lists and account counts respect district scope and viewing capabilities.

Resident administration list/detail/status/verification aliases received corresponding district checks. The duplicate-account comparison remains within the actor's scope. These checks do not complete the resident administration workflow: confirmation delivery, verification decision validation, concurrent changes, audit transaction boundaries and final UI review remain unfinished.

Staff metadata no longer fabricates MFA enrollment or login activity from an account update timestamp. Existing rows are not relabeled as having accepted a real invitation. Missing MFA/activity evidence remains unknown.

## Schema and runtime evidence

Migration `13f8bac2d654` adds `officials.invitation_pending`, `officials.access_version` and the credential-token table. Existing accounts receive false/zero defaults. The migration does not reset passwords, change roles, assign districts or activate/deactivate existing staff.

The guarded disposable database and configured development database were upgraded from `12e7a9b1c543` to this revision. The configured database retained **23 accounts and 23 active staff**, with **zero pending invitations and zero credential links** created by verification. Account/credential mutation checks used only the disposable database.

The local API remains on port 33159 and frontend on 5173. Authenticated read-only runtime checks returned 200 for administration access, staff options, staff list, staff record, own account and navigation. Both staff pages were checked: 15 rows on the first page and 8 on the second. The role list now reads all 20 stored definitions; there are zero stored role templates. A missing template is not replaced with a sample.

The selected-family [endpoint inventory](government-endpoint-inventory-2026-10-24.json) now contains **215 routes** and no duplicate method/path registrations. This still excludes some cross-portal identity routes and is not proof that every government function is complete.

## Verification and remaining work

- Integrated disposable PostGIS run: **136 passed** across government workspaces, access guards, command reliability and staff account checks.
- A subsequent runtime role-list check exposed historical capability values that did not match the previous response schema. The read contract now preserves typed metadata and nullable historical labels without granting additional authority. The final staff regression run passed **24 tests**, including the added historical-metadata check. This overlaps the staff tests in the 136-test integrated run; the counts must not be added together as independent coverage.
- Production frontend build passes. New staff, activation and self-account components have no targeted lint errors. Existing legacy Administration warnings and mixed-export refresh warnings remain; the large-bundle warning also remains.
- Administrative navigation checks cover empty explicit grants, audit-only access, staff-management viewing and the legacy `manage` grant.
- Computer-use inventory again reported that local browser use is disabled in Work settings. New staff/activation/self-account screens still need live visual, keyboard, theme, 320 px, zoom and focus acceptance. Shared Reports primitives were reused; no Figma reconciliation or accessibility certification is claimed.

The immediate next implementation work remains settings behavior/history/audit reliability, the rest of resident administration, project evidence/certificate/external-dependency handoffs, provider-backed notification delivery and remaining endpoint/role coverage. Those requirements were not removed from the objective. Document 24 remains the broader completion ledger, subject to this staff-account update.

Implementation owner: current repository work. Operational approvers: LGU account/security, engineering, records and privacy owners, still to be named. Version: 1. Last validated: 24 October 2026. No commit or deployment is claimed.
