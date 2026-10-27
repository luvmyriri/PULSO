# Government plan implementation verification — 23 October 2026

Status: **Observed implementation review; changes required before acceptance.**

Basis: [document 16](16-government-core-workflow-navigation-and-disclosure-research-2026-10-23.md), including the user's instruction to retain the existing Reports design across government screens. This review does not approve the proposed LGU role/delegation/lifecycle decisions.

Reviewed state: working-tree changes over Git HEAD `2c823d063bc7343e30b05349635be4cbf67c4f7c`. This includes uncommitted implementation, rather than a separately identified Antigravity commit. No product source was edited during this review. File fingerprints accompany the evidence so later changes can be distinguished.

**Verdict:** The work establishes useful navigation and UI foundations, but does not yet achieve the functional plan. The main landing fails against the current local database. Announcement creation/editing/review has multiple frontend/backend mismatches. Release authorization, immutable disclosure revisions, public privacy, durable notifications, and the backend financial boundary remain incomplete. Service Insights largely retains the previous map/KPI structure. Do not mark this as an accepted end-to-end government workflow.

## Verification evidence and limits

| Check | Result and interpretation |
|---|---|
| Frontend production build | Passed. Vite reports large bundles, including an approximately 5.44 MB main chunk before compression. Compilation does not establish workflow correctness. |
| Existing government access regression file | `backend/tests/test_government_access_guards.py`: **30 passed**, 43 warnings. These checks do not cover the new announcement contracts or My work runtime defect. |
| Isolated contract probes | **12 reproduced the asserted defects.** These are characterization checks: “OK” means the problematic behavior was reproduced, not that the feature meets acceptance. All database sessions are fakes. See [probe source](../ui-ux-audit/runtime-plan-verification-2026-10-23/reproduce_contracts.py) and [results](../ui-ux-audit/runtime-plan-verification-2026-10-23/contract-probe-results.txt). |
| Current browser | Existing local City Engineer seed account; Reports, My work, Service Insights, Maintenance, maintenance-to-Reports drill-through, and new Update editor. Screenshots at 1280×720 and a representative Maintenance check at 320×800. These are local development records, not verified city outcomes. |
| Database inspection | Read-only schema inspection: `announcements` and `outbox_events` exist; `announcement_report_associations` and `budget_disclosures` do not exist. Checked again after runtime inspection. |
| Publication/database writes | No valid draft was saved, no announcement published, no work order created, and no funding/cash/NTP command executed against the configured database. The editor's default-category save was rejected before database access. Announcement mutation behavior was tested with fake sessions. |
| Not established | A full report-to-accepted-repair pilot, role-by-role database integration, device push, worker restart/retry, offline/theme/localization parity, complete keyboard/screen-reader testing, 200% zoom, production deployment, or LGU delegation. No Figma updates were made or claimed. |

The full database integration suite was not run: its fixtures truncate tables and require an explicitly designated disposable test database. The configured local database was preserved. The screenshots from the earlier `runtime-insights-2026-10-23` audit are not evidence of this implementation; this review uses a separate capture folder.

## Findings requiring correction

### F01 — P1: My work fails on real Work Orders and presents the failure as an empty inbox

At `backend/gov_crud.py:2971`, the new inbox reads `wo.location_string`. `WorkOrder` has no mapped property with that name. The live `GET /api/gov/operations/today` returned HTTP 500 with `AttributeError: 'WorkOrder' object has no attribute 'location_string'`. The same access occurs at lines 3028, 3080, and 3133, so correcting only the first occurrence leaves other buckets vulnerable.

`frontend/src/pages/GovTodayPage.jsx:157` substitutes zero metrics when no response exists, and lines 559–564 show “No tasks match this filter” / “All items in this view have been handled or filtered out” alongside the error. That contradicts the plan's rule that a failed fetch cannot become operational zero or a legitimate empty state.

**Required outcome:** Resolve location from authoritative linked data; exercise all work-order buckets against actual model instances. On failure show unavailable/last-successful data and recovery, without zero totals or completion claims. [Screenshot](../ui-ux-audit/runtime-plan-verification-2026-10-23/01-my-work-runtime-error.png).

### F02 — P1: The announcement editor and backend disagree on the data contract

`frontend/src/pages/GovAnnouncementEditor.jsx:313` sends `affected_barangays` and `report_associations`, while `backend/gov_schemas.py:961` and 976 expect `target_barangays` and `report_associations_input`. Pydantic silently ignores the unmatched properties. Selected geographic scope and new report links therefore disappear.

The editor also sends `association_state` / `association_reason` at lines 326–327 and 358–359. The backend expects `association_type` / `basis_reason` at `backend/gov_schemas.py:857`. A selected confirmed association becomes the default `candidate` with no reason. The Updates docket repeats the mismatch: `GovAnnouncementsPage.jsx:195` sends `association_state` to an update schema requiring `association_type`, producing validation failure; response displays also read the wrong properties.

Suggestions return a **list** (`backend/announcements_router.py:1066`), but both frontend pages read `data.candidates`. The existing editor also expects `affected_barangays` while responses return `target_barangays`.

The retained default category `roadworks` is rejected by the backend category list (`announcements_router.py:522`). This mismatch existed before this patch, but still blocks the redesigned default flow. Runtime Save Draft reproduced HTTP 400; two other category options are also unsupported. [Screenshot](../ui-ux-audit/runtime-plan-verification-2026-10-23/07-update-draft-rejected.png).

**Required outcome:** One validated request/response contract and representative integration tests for scope, association levels/reasons, suggestions, and every selectable category. Reject unknown mutation properties rather than silently discarding intended work.

### F03 — P1: Existing edits are lost, and the editor's Publish action can silently fail

The existing-record branch at `GovAnnouncementEditor.jsx:338` updates only budget disclosure and associations. It never sends the changed title, body, Filipino text, category, priority, or audience to the announcement update endpoint. Saving an edited notice leaves its content unchanged.

The editor reads only query parameter `id` at line 67, while the registered `/gov/announcements/:announcementId/edit` route and My work link provide a path parameter. That path opens the new-record mode instead of editing the requested record.

The editor's Publish action creates a draft, then sends `draft → published` (`GovAnnouncementEditor.jsx:365`). The backend correctly rejects this transition because approval is required (`announcements_router.py:806`). The editor never checks that response, or existing-record update responses, before navigating to the list. The user can leave with an unpublished draft and no failure message.

The list's correction action additionally posts to `/correct` with `correction_note`/ordinary title/body (`GovAnnouncementsPage.jsx:246`); the backend exposes `/corrections` and requires `correction_summary`, `reason`, and `updated_*` fields (`announcements_router.py:847`, `gov_schemas.py:1011`). It cannot perform the claimed correction flow.

**Required outcome:** Persist normal edits, resolve route identifiers consistently, expose legal review/release transitions, and handle every failed mutation. Correction must use the governed revision contract. Verify the saved result after reload, not only a toast/navigation.

### F04 — P1: New disclosure/link APIs bypass publication authority and approved revisions

The staff-router gate at `backend/announcements_router.py:22` checks only that the account is an Official. The new link creation/review and disclosure endpoints at lines 1070, 1119, and 1157 do not check a delegated capability, geographic/record scope, or the announcement's lifecycle. An ordinary `building_inspector` can update the disclosure of a published notice; the isolated handler probe commits this mutation without a role denial or approval invalidation.

`_upsert_budget_disclosure_and_associations` overwrites the latest disclosure at lines 320–336 without increasing its version or retaining the prior value. Adding/changing a link after approval is similarly allowed. The release branch at lines 806–814 accepts any Official for an already approved notice; only the earlier approve branch has a role check. Existing broad title privileges also remain. This is not the configurable delegation proposed in document 16.

**Required outcome:** Enforce approved capabilities and scope on every command. Bind approval to immutable content, disclosure, audience, and association revisions; material changes require renewed review. Record an audit event and conflict/version checks. Keep platform administration distinct from city publishing authority.

### F05 — P1: The public projection still exposes a report ID and unreleased disclosure

The public feed calls `_format_announcement_response(..., include_staff_associations=False)` at `announcements_router.py:1225`. Although this empties the new association array, the same serializer still returns `source_report_id` at line 235, corrections with `previous_content`, and internal delivery details. It also selects the latest disclosure at lines 197–201 without checking its release state or binding it to the approved publication revision.

An isolated published-notice probe returned source report ID 99 and a disclosure with `review_state='draft'`. This directly contradicts the new public-privacy comment and allows an unapproved disclosure edit to alter public data. The feed query also lacks an explicit public-audience exclusion for staff-targeted records. The owner-context endpoint checks report ownership, which is useful, but does not validate the publication's published/nonexpired state before returning context.

**Required outcome:** A dedicated public response schema exposing only the released revision and public fields; no resident report IDs or private historical content. Revalidate audience, release, expiry/withdrawal, and ownership for contextual access. Test public and private projections separately.

### F06 — P1: The approved disclosure-only boundary is still bypassable through legacy commands

`backend/gov_router.py:634`, 663, 697, and 715 continue to expose funding certification, cash release, BAC scheduling, and NTP issuance with live CRUD paths. The already-blocked approve-with-budget shortcut does not disable these other commands. These are retained gaps, not newly introduced finance features.

The new disclosure copy says PULSO does not process these functions, while the backend continues to do so. Document 16 explicitly identifies these exact routes and says hiding navigation is insufficient.

**Required outcome:** Enforce the product boundary at the backend for all relevant commands and jobs. Preserve historical records as auditable references, and distinguish recording externally issued authority from creating/issuing it. Test direct API access for every previously eligible role. No finance command was executed during this review.

### F07 — P1: Personalized update delivery has no complete durable notification/deep-link path

`_execute_channel_deliveries` at `announcements_router.py:372` filters association labels and `notified_at`, then adds Notifications directly at line 398. There is no publication-revision/purpose idempotency key, durable outbox event, independently tracked device attempt, or ownership/revocation revalidation at worker dispatch. The set `notified_residents` is used for counts but never suppresses duplicate notifications: the probe produced two notifications for the same resident owning two linked reports.

The created record has no announcement URL, publication revision, or association reference; its `outbox_event_id` remains empty. No consumer of `/my-report-context` or the new disclosure fields was found in resident/mobile code. Existing mobile notification fetching does not establish publication deep linking. New resident-facing public detail/context integration was not delivered in these changes.

The editor still offers `mobile`, but the backend channel list is `web/sms/email` and silently drops it. SMS/email are explicitly pending/unconfigured; there is no demonstrated phone push implementation. Web delivery count uses `max(1, recipient_count)` and conflates web publication with recipient delivery.

**Required outcome:** Commit release plus durable event atomically; deduplicate by recipient/revision/purpose, group multiple owned reports, attach a canonical deep link, implement the private resident context, and separately track optional push dispatch. Do not present mobile/SMS selection as working delivery. Verify denied permission, retry, expiry, revocation, withdrawal, and changed ownership.

### F08 — P2: My work is not yet a scoped allocation model

At `gov_crud.py:2953`, an empty personal work-order query falls back to any user's assigned work without checking supervisor scope. Every returned row is nevertheless labeled `assigned_to_me` at line 2975. Intake, verification, publication, blocked-work and recent-completion queries then read global queues and label them as personal review/waiting tasks. Work bundles are returned as metadata, not used to authorize those queries. Bucket counts count limited fetched samples rather than a defined total task population.

`roles_service.py:38` maps several generic aliases but omits actual titles such as `city_engineer` and `project_engineer`, which fall back to engineering/field. At line 95, merely possessing an `announcements` or `projects` key—even view-only—adds the Executive Approvals bundle. The sidebar mostly uses broad role visibility, with only Administration conditionally included. The `role_ref`/legacy alias reconciliation is a useful correction, but not sufficient authorization.

**Required outcome:** Persist or consistently derive tasks from accountable ownership, explicit review responsibility, scope and delegation; enforce these rules server-side and test empty personal queues. Report departmental queues separately from personal assignment. Do not infer authority from a module's presence.

### F09 — P2: Insight and maintenance links do not open the underlying records they claim

`GovAnalyticsPage.jsx:998` and `PredictiveMaintenance.jsx:725` use `/gov/reports?search=...`. `GovReportsDashboard.jsx:61–62` only consumes `reportId`; it ignores `search`. In runtime, Maintenance's **“View 0 reports”** for one asset opened all **13** reports, including different barangays, with a blank search field. Even if a barangay search were implemented, it would not identify an asset's or cluster's exact contributing records.

**Required outcome:** Link by explicit authorized record IDs or a server-backed asset/cluster query with the same period/definition. Preserve the source context and return state. [Screenshot](../ui-ux-audit/runtime-plan-verification-2026-10-23/05-maintenance-drillthrough-unfiltered.png).

### F10 — P2: Service Insights does not yet implement the decision-view redesign or shared period

The new heading/tabs and removal of a budget-exposure card are improvements. `/gov/bi` now redirects away from the routed simulated BI dashboard. However, the main screen still leads with seven colored KPI cards, an AI brief button and a large map. The planned stage-age, blockers, workload, verification wait, intake-versus-accepted-outcome and data-quality investigations are not implemented by these changes. Renaming cluster/forecast tabs does not implement those relationships.

`GovAnalyticsPage.jsx:244–247` reloads summary/forecast/recurrence without the selected period while passing it to the heatmap. `analytics_service.py:936` fixes summary at 90 days; its resolution rate at lines 961–971 is all-time, yet the UI sits under one selected-period control and newly labels it “Verified closures” without a verification-history calculation. This fails the plan's comparable-scope/definition contract.

**Required outcome:** Deliver a small number of genuine decision views with question, meaning/limits, owner, next action and exact source records. Propagate a shared authorized scope/period, define grain and verification, and expose missing data/freshness. [Screenshot](../ui-ux-audit/runtime-plan-verification-2026-10-23/03-service-insights.png).

### F11 — P2: Maintenance has useful structure but still mixes suggestions, commitments and incompatible API values

Positive changes: asset table/docket; explanations of the heuristic's limits; shared health-score resolver; existing-work visibility; manual review reason and conversion without generating AI. These are directionally aligned.

Remaining concrete defects:

- `PredictiveMaintenance.jsx:815` offers `WATCH`, but `predictive_router.py:624` accepts only critical/high/moderate/low. The isolated conversion probe returns HTTP 422 for WATCH.
- The UI reads `wo.work_order_id` at line 272; conversion returns `id` at `predictive_router.py:653`. The successful-created-work deep link does not appear as intended.
- `predictive_router.py:270` derives `planned_inspection` from a score range without an actual scheduled inspection. The schedule endpoint correctly says `is_committed_schedule=False`, but the UI labels the tab “Planned inspections”.
- `predictive_service.py:131` recommends 120 days for scores 56–75, while `predictive_router.py:403` bins every interval over 60 into “Days 61–90”. Runtime displayed 2027-02-20 suggestions on 2026-10-23, beyond that label.
- Last-maintenance display falls back to `asset.date_completed` (`predictive_router.py:284`), which is not proof of maintenance. Preserve “construction completed” separately from unknown maintenance.
- `PredictiveMaintenance.jsx:227` attaches one AI plan to every asset sharing barangay/category, despite sending an exact asset ID. Applying the draft must preserve exact asset identity.

**Required outcome:** Contract tests for each priority and response; separate suggested review windows from assigned/accepted schedules; truthful interval labels and date provenance; asset-specific AI drafts. Existing asset data and heuristic outputs are not validated engineering predictions by virtue of this UI.

### F12 — P2: Disclosure schema and migration are incomplete

Two new mapped tables have no Alembic migration and are absent from the current database. `_ensure_announcement_tables` at `announcements_router.py:60` instead calls `create_all` during requests, including serialization on GET, and suppresses every exception. This makes ordinary reads attempt schema changes, bypasses the migration history, and fails on a normal application role without DDL permission. A fallback creation path is not a release migration.

`BudgetDisclosure.amount` uses `Float` (`gov_models.py:942`); the plan requires exact decimals. Input accepts arbitrary amount types/review states and negative values. Source URL/document/date are optional, and numeric-source validation is only a source label on the dedicated PUT, not consistently enforced on creation. The editor and backend use different amount-type vocabularies. A `version` column exists but current updates overwrite version 1.

**Required outcome:** Versioned migration and rollback/data-preservation plan; exact monetary representation; controlled semantics, finite/nonnegative amount rules as applicable, required authoritative provenance for numeric disclosure; canonical project/source identity and immutable released versions. No schema migration was performed during this review.

### F13 — P2: The Reports design has not been applied consistently or made usable at narrow widths

Reports remains the clearest visual reference. My work and Updates move toward its table/docket pattern; Maintenance also adopts that structure, but its 1280px selected record makes table columns and explanations unusually narrow. Service Insights still has a much taller header, seven differently accented cards and map-led layout. This does not yet satisfy the user's instruction to use the Reports UI government-wide.

At 320 CSS pixels, the expanded 240px sidebar leaves approximately 80px for Maintenance: labels overlap, controls and content clip, and there is no usable full-page docket transition. This is a representative failed acceptance check, not a claim that every screen has been exhaustively assessed. Maintenance table rows at `PredictiveMaintenance.jsx:585` are click-only, without the keyboard activation provided in My work. Focus styling also uses 2px rings in several new controls rather than the repository's required visible 3px treatment.

**Required outcome:** Reuse shared Reports primitives and spacing, then validate paired themes and narrow/zoomed journeys. Use a navigable list/full-record arrangement at small widths, keyboard-operable record actions and focus restoration. Preserve the user's Reports reference; do not replace it with a new aesthetic. [Reports](../ui-ux-audit/runtime-plan-verification-2026-10-23/02-reports-reference.png), [Maintenance desktop](../ui-ux-audit/runtime-plan-verification-2026-10-23/04-maintenance-review.png), [320px](../ui-ux-audit/runtime-plan-verification-2026-10-23/06-maintenance-320px.png).

## Plan achievement by area

| Planned area | Assessment | What is achieved / what remains |
|---|---|---|
| Eight understandable top-level destinations | Substantially present, partial | My work, Reports, Work, Infrastructure, Records, Service insights, Updates, Administration appear. Scope-aware visibility and consistent aliases/context remain. `/gov/advisories` still goes through the older operations updates view rather than the canonical new Updates module. |
| Reports as government visual baseline | Partial | Reports preserved; several table/docket layouts adopted; Insights and narrow layouts remain inconsistent. |
| Functional work bundles and accountable allocation | Partial / incorrect | Metadata and bucket labels exist; scope, action authority, task ownership and real role mappings are incomplete. |
| Reliable My work | Not achieved | Runtime HTTP 500 and false-empty presentation. |
| Complete routine service workflow | Not demonstrated | Existing work/inspection foundations remain, but no complete assignment → field evidence → independent acceptance → resident outcome pilot was established here. |
| Map used in a clear task context | Partial | Standalone sidebar Map removed; Reports retains map/table switch; Insights and Maintenance retain other geography views. Exact scope/selection continuity is broken. Multiple maps can be legitimate only when their distinct job and common scope are clear. |
| Decision-oriented Service Insights | Partial / mostly outstanding | Names improved, simulated BI route replaced, budget card reduced; most proposed decision questions and shared definitions remain. |
| Human-reviewed maintenance assistance | Partial | Manual path and caveat present; contract, provenance, suggested-state and schedule defects remain. |
| One governed publication system | Partial / blocked | Three formats reuse announcements; create/edit/review/correction contracts and authority fail. |
| Reviewed report–publication relationships | Partial / broken | Tables/endpoints exist; frontend mismatches, approval bypass and public leakage prevent acceptance. |
| In-app notification and private resident context | Partial backend foundation | Rows/context endpoint exist; canonical recipient link, resident rendering, revision idempotency and recovery are absent/unverified. |
| Phone push | Not implemented by reviewed changes | No demonstrated registration/permission/provider/device deep-link path. Existing SMS/email pending is not push. |
| Optional sourced budget disclosure | Partial / unsafe to release | Fields and external official links present; exact/provenanced/versioned approved public record is incomplete. |
| No in-system budget/procurement processing | Not achieved | Legacy monetary/procurement commands remain active. |
| Accessibility and failure-state acceptance | Not achieved | Confirmed false-empty, 320px failure and keyboard gaps; remaining matrix is unverified. |

## Document 16 acceptance scenarios

“Unverified” does not mean passed. Original proposal decisions still need the named LGU owners before production authority is configured.

| Scenario | Review result |
|---|---|
| 1. Intake cannot certify/publish outside delegation | Fails release-authority design: staff identity is enough for several publication mutations; title-based privileges persist. |
| 2. Persisted owner/task/history; no eligible staff recovery | Not demonstrated by this patch; My work labels are not proof of an allocation transaction. |
| 3. Independent acceptance/rework | Existing guard regression checks pass, but a complete persisted field-to-verifier workflow was not exercised. |
| 4. Multi-report work resolves only accepted scopes | Not demonstrated; no such mutation was executed. Publication notification helper itself does not resolve reports, which is correct. |
| 5. Queue state restored across navigation | Fails representative source drill-through; broader Back/selection persistence unverified. |
| 6. List/map/insight totals reconcile | Not achieved: lost record filters, mixed periods and source grains. |
| 7. Historical backlog and real recurrence | Outstanding; the current changes do not implement this reconciliation. |
| 8. Candidate match cannot notify; report privacy | Candidate-label filter exists, but labels can be promoted without delegated review and public source report ID remains exposed. |
| 9. Invalid release/revoked link stops dispatch; corrections retained | Not achieved: mutable approved data, missing version/dispatch checks and broken correction UI contract. |
| 10. Retry creates one intended in-app event | Not achieved: duplicate-recipient probe, no revision/purpose idempotency or durable dispatch path. |
| 11. Push denied/offline leaves in-app usable | Device flow unimplemented/unverified; cannot pass this scenario. |
| 12. Missing budget permits work; disclosure cannot authorize funds/NTP | Null amount supported; actual valid publication flow blocked; legacy financial authority still active. |
| 13. Canonical disclosure, no conflated maintenance cost | Not achieved: mutable per-announcement version 1, float amount, old cost-provenance fallback unresolved. |
| 14. Legacy finance commands cannot bypass boundary | Fails static command-path review. |
| 15. Error/partial/offline stays truthful and traceable | Fails live My work and exact-source drill-through. |
| 16. Accessibility, themes, localization and provider failures | Representative 320px fails; complete matrix remains unverified. |

## Recommended correction order

1. Repair My work model access and its error/zero/empty-state distinction. Add a test containing real WorkOrder model objects for every bucket.
2. Align the entire Updates contract: legal categories, targeting, links, suggestions, normal edits, path IDs, status transitions and corrections. Test a saved result after reload through the actual client/API.
3. Before public use, enforce scoped delegated authority, released public projections, immutable revisions, migration and the financial boundary. Cover direct API access rather than relying on hidden buttons.
4. Complete one review → release → recipient-owned in-app notification → canonical public detail/private report-context journey, including failure/retry and correction/withdrawal. Add optional phone push only when its independent delivery path is verified.
5. Fix exact-record drill-through and shared period/grain; implement the highest-value age/blocker/verification decision views before adding more charts.
6. Correct Maintenance contracts and provenance; reconcile its suggest/review/assign language with actual persisted tasks.
7. Consolidate shared Reports UI primitives, inspect/reconcile the shared Figma design before further material visual implementation, and validate narrow/keyboard/theme/localization states.

Acceptance should require recorded passing scenarios and preserved scope/privacy, not another successful build or a screenshot of controls being present.
