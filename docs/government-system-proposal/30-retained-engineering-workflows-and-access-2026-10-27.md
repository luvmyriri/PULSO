# Retained engineering workflows and access

Status: observed development implementation, 27 October 2026. This continues document 16 and the completion ledger. It does not certify all government functions or establish the City's actual delegation, retention policy or signing authority.

## Outcome

Design, analysis and survey reads now obey the same district boundaries as current work records. Survey pagination no longer repeats one source while skipping the other. Earlier planning bookmarks open a relevant project queue. Historical procurement references have a read-only home in Records. Operational staff locations require a specific work context and current access.

Reports remains the implementation reference. The interface changes reuse its workspace, search, table, record detail, focus treatment and existing theme rules. No replacement visual system, Figma inspection or Figma write is claimed.

## Planning and survey continuity

- `design-requests` and `analysis` require project-view permission, including explicit module denials, and use the configured district filter. Their default lists include current assessment/planning stages as well as retained earlier stages.
- `surveys` checks work-order and project permissions separately. A field employee sees only assigned work in their district scope; project access is not implied by access to field work. An explicitly denied source contributes no rows. If both sources are denied, the endpoint returns 403.
- Survey results carry a `record_type`, merge in stable creation-time/type/ID order, and apply the offset once to the merged result. Each input query fetches at most the requested offset plus page size. The retained list endpoints validate offsets and page sizes.
- Projects now has Site assessment and Engineering planning queues. `/gov/delivery?view=surveys` opens the assessment queue; design and analysis bookmarks open planning. Search and selected-project parameters survive the delivery redirect. Original historical stages are displayed alongside the historical-record label.
- The shared project docket continues to own assignment, review date, evidence, dependencies and independent completion review. These changes do not implement a structural calculation engine or claim that a survey/design has been professionally approved.

## Historical financial references

The retained procurement list/detail, quantities and estimation endpoints now require historical procurement-view access. Explicit module grants override role defaults. A scoped employee can read a record only when every recorded work/project source is inside their district scope. A contradictory dual-source reference cannot expose another district. Unlinked references remain available only to authorized citywide readers; scoped callers receive no inferred district.

`GET /api/gov/financial-history` provides scoped search and 15-row server pagination. `/gov/financial-history` uses the shared table/detail interface, including a historical line-item table. Records displays its link only when the server permits historical procurement access. Earlier procurement, quantities and estimation delivery bookmarks reach this same reference view.

Missing line items or incomplete totals are shown as **Not recorded**, not a zero-value estimate. Historical statuses are identified as recorded values. They are not evidence of a current appropriation, cash release or procurement approval.

There are no new financial mutation controls. The existing budget/procurement processing commands still return 409. Public budget disclosure remains part of the reviewed Updates workflow, with links to official bidding information. Retained reference records are not inputs to an automatic funding decision.

## Staff-location privacy and freshness

Location reads require an operational coordination delegation, work-order view access and the applicable staff-location permission. An explicit denial in any of those modules is respected. Platform administration alone does not supply an operational coordination delegation. The three location/roster aliases use the same access rules.

Only active, unsuspended field employees with a compatible configured jurisdiction enter the roster. Malformed staff scope is excluded for administrator review. A visible coordinate additionally requires an active assigned work order in the viewer's district scope, a non-offline location and an update within the past 15 minutes. Invalid coordinates are omitted. Available employees can remain in the roster without exposing a coordinate.

The projection returns the employee's operational name, position, sharing status, accuracy and recorded timestamp. It omits stored battery level and free-text location name. A coordinate is a last submitted work location, not proof of present attendance or a completed inspection.

Manual proximity suggestions check the report's scope and use the same visible employee set. Filtering happens before distance ranking/limiting in both PostGIS and fallback queries. This does not change automatic report-review routing into GPS-based assignment.

An employee can submit `status=offline` without another latitude/longitude. The command clears coordinate fields, optional location text/battery/accuracy and the earlier optional map geometry, including duplicate stored snapshots. Concurrent account-authority changes are serialized with sharing commands. Normal updates leave only one active snapshot. The generated geography follows the coordinate fields.

The mobile own-work list now rechecks district scope and explicit work-order access, includes blocked/rework tasks, and withholds linked-report location when report access is denied. Mobile user-interface controls for starting/stopping location sharing are not implemented by this web pass.

The location access defaults and 15-minute display rule are development policy. LGU engineering, dispatch and privacy owners still need to confirm the operational delegation and use policy; this document is not a legal authorization for employee tracking.

## Verification and limitations

- Final full guarded PostGIS run: **231 passed**, 0 failures, in 164.61 seconds. The run covers the nine government acceptance files, including **18 retained-operations checks**. Earlier runs passed 229 cases before the final two workspace cases were added. Full-run JUnit evidence is preserved at `backend/.pytest_cache/government-core-6e109a18f848.xml`; focused runs use separate scope-digest filenames. The configured application database was not reset or seeded.
- Checks cover cross-district reads, inconsistent financial source links, explicit denial, resident exclusion, merged pagination, field assignment boundaries, independent source access, stale/suspended/malformed-scope locations, stopping duplicate location snapshots, generated/legacy geometry clearing, report-scope checks and PostGIS proximity filtering.
- Targeted lint of the new/changed government components: **0 errors or warnings**. Production frontend build passes. The existing approximately 5 MB main JavaScript bundle and large-bundle warning remain a performance follow-up.
- The normal local API was restarted on `127.0.0.1:33159`. Authenticated read checks returned 200 for assessment/planning project queues, retained design/analysis/surveys, financial history and Records permissions. The development database contained one assessment reference, no planning rows and two retained procurement records. The platform administrator received 403 for staff location/roster reads because it has no operational coordination delegation. No staff locations, assignments, project stages, financial records, publications or resident preferences were mutated for runtime verification.
- The route inventory now contains **228 selected-family routes**, with no duplicate method/path registrations. This is an inventory, not endpoint certification. Schema head remains `16cbed05a987`; no schema migration was required by this pass.
- Browser access remains disabled in Work settings. There is no new live visual, keyboard, 320 px, 200% zoom, forced-colors or light/dark acceptance claim for the added reference view and queues. Shared components provide existing behavior; build/lint do not replace live verification.

The broader completion objective remains active: phone push/device registration, real configured email-provider acceptance, remaining records-lifecycle governance, the rest of the legacy endpoint/privacy audit, original-file recovery for the missing historical project PDF, and final role/workflow/accessibility acceptance are still open. Planning queues and evidence handoffs do not replace specialist engineering tools or LGU approval of the workflow.

Implementation owner: repository work. Operational approvers: LGU engineering, dispatch, records and privacy owners, still to be named. Version: 1. Last validated: 27 October 2026. Changes remain in the shared working tree; no commit or deployment is claimed.
