# Observation/category field-assessment UI handoff

**Status:** observed local implementation and synthetic verification; operational workflow remains proposed pending LGU approval. **Version:** 1.0. **Last validated:** 7 November 2026. **Technical owner:** PULSO engineering. LGU workflow, privacy/data stewardship, identity/accuracy and release decision owners must still approve their respective policies. This document records an authorized local extension of Reports; it establishes no production deployment, official condition finding or model accuracy claim.

## Job, authority and scope

An authorized engineering reviewer compares one reported observation with one independently reviewed field visit, records a separate finding for every reported category, and receives an immutable assessment receipt. A category can remain uncertain. The report keeps its ticket, lifecycle and concern membership; an observed absence establishes neither repair cause nor exact repair time, closure, complete repair coverage or an ETA.

- **Approved:** product truth and the current Reports reference in [PRODUCT.md](../../PRODUCT.md), Civic Aperture, evidence fidelity, backend authorization and semantic status meaning.
- **Observed:** the components, server contracts and bounded local browser/test results below. They extend the [backend assessment increment](observation-field-assessments-2026-11-07.md) and [separate coverage export](observation-field-coverage-export-2026-11-07.md); those earlier documents' pending staff-UI statements describe their earlier phase.
- **Proposed:** operational adjudication, assignment of policy owners, production acceptance, future Figma pattern and authentic-data/model release decisions.
- **SAMPLE:** all browser-review photos, pixels, records, accounts, locations, coordinates and outcomes. No live resident or official asset truth was tested.

This is an **Operate** extension within the existing Reports docket, after shared-concern review. It adds a quiet ruled section, evidence comparison, category form, explicit confirmation and ruled history. It introduces no new navigation, global design world, token palette, resident flow or automatic lifecycle action. The latest dated palette corrections in PRODUCT.md supersede older Field Blue mappings in dossier/skill references; this increment inherits shared Reports semantic tokens without attempting a global color reconciliation.

## Component and visual dependencies

| Local artifact | Responsibility / dependency |
| --- | --- |
| [ObservationFieldAssessment.jsx](../../frontend/src/components/government/ObservationFieldAssessment.jsx) | Disclosure, bounded visit selection, evidence context, category findings, same-object/problem confirmation, receipt, recovery and immutable history. Workspace is keyed to account/report/item. |
| [ReportConcernReview.jsx](../../frontend/src/components/government/ReportConcernReview.jsx) | Places the section after shared-concern controls; renders it only when server context returns `can_view_field_assessments`. Concern membership copy distinguishes unreviewed from reviewed state. |
| [RecordedReportEvidence.jsx](../../frontend/src/components/government/RecordedReportEvidence.jsx) | Shared original-report photo, description, address, source and recorded capture time, including missing/failed image states. Its legacy original-photo link opens a new tab; it is **not** the private field-photo mechanism. |
| [observation-field.css](../../frontend/src/components/government/observation-field.css) and [concern-review.css](../../frontend/src/components/government/concern-review.css) | Existing Reports density and ruled composition; paired evidence stacks at 540 px. Uses shared `--gov-rule`, `--gov-action`, `--gov-focus`, `--gov-canvas` roles and shared control typography. No new brand swatches. |
| [GovWorkspace.jsx](../../frontend/src/components/government/GovWorkspace.jsx) | Reuses `GovButton`, `GovState`, `GovConfirm` and date formatting. Native fields, buttons, details/summary and dialogs carry familiar semantics. |
| [observationField.js](../../frontend/src/utils/observationField.js) | Finding labels/blocker copy, decision validation, account/path-scoped original command and idempotent recovery, receipt checks, authenticated photo streaming and SHA-256 verification. Command schema `pulso-field-assessment-command-v1`. |
| Existing draft/evidence storage and government request hooks | Account-scoped draft persistence, concurrent-tab/storage handling, current-session requests and explicit fetch failures. Draft is local device state; a saved draft is not a recorded assessment. |
| [observation_field_assessments.py](../../backend/observation_field_assessments.py), [report_intelligence_router.py](../../backend/report_intelligence_router.py) | Authoritative capability/scope, source eligibility, versions, file integrity, history, transaction and receipt contract. API schema `pulso-observation-field-assessment-v1`. |

Evidence stays true-color with metadata outside the image. Light/dark inherit the same anatomy, information, findings, privacy copy and actions. The private field photo opens inside an authenticated native inspection dialog with fit/full-resolution controls, a labelled focusable scrolling region and object-URL cleanup on replacement/unmount. It is not an external new-tab link. Full resolution changes image presentation, not the stored original.

## Flow and state/failure contract

`Review field findings → choose field visit → inspect report and field evidence → select every category finding → confirm same object/problem and reason → Review field assessment → Record field assessment → persisted ID/revision and history`

| State / trigger | Visible behavior and recovery / commit meaning |
| --- | --- |
| Collapsed/default; hover/focus/pressed | Disclosure uses `aria-expanded`/`aria-controls`; standard interaction states inherit shared Reports controls. No field-visit selection is implied. |
| Loading/history/source/context refresh | Separate loading/error regions. A failed fetch is not an empty list. Recording requires loaded current history and the matching selected context. |
| No visits on a page | Explicit bounded-search message and Assets/review guidance. `More field visits` and first-page controls follow server cursors. No claim that no visits exist anywhere. No filter UI is added. |
| Empty assessment history | Explicitly unassessed; no inferred negative or automatic finding for sibling items. Latest 20 history rows are labelled bounded/non-exhaustive when applicable. |
| Source selected but blocked | Server blocker text covers independent accepted review, visibility, private evidence, same recorded area, another-report source, inconsistent clocks, missing/changed bytes, self-adjudication and recording authority. Finding controls remain disabled. |
| Photo not yet inspected / unsupported, corrupt or failed response | Photo must successfully display for the current checksum/report/concern/revision stamp before the form unlocks. Stream is authenticated, limited to 5 MiB and allowed image types, and SHA-matched. Error/retry preserves draft; remount/reload requires inspection again. Loading an image is not proof that a human performed a sound comparison. |
| Category validation / identity / reason | Every current category has `Defect observed`, `No defect observed` or `Cannot assess this category`. Explicit same-object/problem checkbox and 20–2000-character reason required. Known findings must agree with the accepted source condition; uncertainty is retained. Errors do not record a finding. |
| Confirmation / busy | Confirmation lists findings, reason and consequences; final action is `Record field assessment`. Busy locks competing commands. It records an internal assessment without changing report status or concern membership. |
| Device draft saved / restored | Account/path-scoped draft persists selection, findings, checkbox and reason; copy distinguishes local draft from server recording. Restored draft requires current evidence review. Drafts older than 24 hours are not restored. |
| Storage failure / concurrent draft conflict | Explicit retry or load-saved-version path; command/form stays locked when storage cannot safely establish the original operation. Keep the page open when instructed. |
| Offline, network/system failure or lost acknowledgment | No success claim without validated receipt. Persisted original command/key is recovered before another assessment; original payload is replayed rather than replaced by edited input. Backend idempotency returns the original committed assessment. |
| 409 changed report/concern/field/revision | Draft retained, explicit conflict, reload and inspect context before a fresh decision. Historical judgments remain intact. |
| Permission-limited / session expired / account changed | Server remains authoritative. Read-only users get recording requirements; users without view capability do not receive this section. Expired session is explicit, with draft retained through re-login. Requests reject changed-account execution. |
| Success / device receipt cleanup failure | Persisted assessment ID/revision, unchanged lifecycle/membership, refreshed history, focusable status notice. Storage-cleanup warnings retain a safe recovery path and do not invent another assessment. |
| Historical / superseded / stale physical context | Actor, record time, observation time, findings and reason remain visible. Current-context checks and blockers distinguish changed/superseded source context; unchanged context is explicitly not a guarantee of present physical condition. Corrections append a revision. |

There is no separate optimistic partial-data success: unavailable history/context cannot enable recording. Assignee selection, emergency access, destructive actions, provider inference and model estimates are outside this addition. No new telemetry, KPI, success-rate metric or analytics measurement plan is introduced.

## API, permissions, privacy and evidence

All paths below are relative to `/api/report-intelligence/reports/{report_id}/observations/{observation_id}` unless stated otherwise. Responses use `Cache-Control: no-store` and `Pragma: no-cache`.

| Method / path | Contract |
| --- | --- |
| `GET /api/report-intelligence/reports/{report_id}` | Existing scoped context adds `can_view_field_assessments`; resident context does not receive staff controls. |
| `GET /field-assessments/sources?before_id=…` | Up to 10 accessible post-report visits per page: linked to this report, or unbound visits in the same recorded barangay. Descending lexical UUID cursor, **not observation-time ordering**; `not_exhaustive=true`. Retrieval is not object identity or field eligibility approval. |
| `GET /field-assessments/evidence/{field_id}` | Current problem/categories/versions, source review/observation context, `expected_revision`, `expected_field_sha256`, private photo URL and recording blockers. |
| `GET /field-assessments` | `can_record_review`, bounded immutable history and current-context blockers; original/frozen and current historical scope must remain accessible. No partial hidden-scope history/totals. |
| `POST /field-assessments` with `Idempotency-Key` | `field_observation_id`, expected report/concern versions and revision, expected field checksum, `identity_confirmed=true`, exactly one finding per current category, and reason. Validated receipt includes assessment identity/snapshot/revision and `lifecycle_changed=false`. |
| `GET /api/gov/predictive/inspection-evidence/{evidence_id}` | Existing authenticated private field-photo bytes. UI verifies stored SHA-256 before displaying the blob. |

View requires existing staff field/maintenance access and scoped report, asset and source-report access. Recording additionally requires independent field-review and report-review capability/ownership; field recorder cannot adjudicate their own evidence. Explicit capability restrictions, original historical scope, optimistic versions and file integrity remain authoritative. A location match or checked box does not establish physical identity, jurisdiction accuracy or official ownership. Actor IDs, reasons, reference IDs and timing are private operational information, not anonymous data. Keep personal contact details out of the reason. Existing immutable history/audit/receipt transaction guarantees and 1,000-assessment bound remain in force.

**Concrete release gate — legacy report-photo access:** [backend/main.py](../../backend/main.py), `PublicUploadFiles`, blocks the `docs` subtree but continues to expose legacy report-photo URLs through `/api/uploads` and `/uploads`. During this synthetic browser review, a pending report photo loaded without a bearer token. The new field-photo endpoint is protected; this does **not** make all report evidence private. PULSO engineering must fix and test legacy report-photo authorization/publication behavior against PRODUCT.md before any real-data pilot. This pass documents the gap; it does not repair the static mount or approve access to real photos.

## Responsive, accessibility and content contract

At narrow widths the evidence pair stacks; forms remain full-width with wrapping actions and long identifiers. Page reflow must stay within 320 CSS px. Full-resolution photo scrolling is confined to the deliberately labelled inspection region, with fit-to-view recovery. No new table, map or chart is introduced. Existing Reports navigation and queue/detail contracts continue to apply; this isolated panel verification is not a whole-shell audit.

Use logical keyboard order, native labels/fieldset/legend, text findings and blocker reasons, error alerts and status announcements. Focus moves to actionable errors and the persisted receipt; inspection uses native modal semantics, Escape closure and return to the initiating control. Its scroll region is keyboard focusable and named `Private photo inspection area`; focus uses a visible 3 px treatment. Shared confirm dialogs retain existing focus behavior. Reduced-motion and forced-color rules exist in CSS; their presence is not proof of assistive-technology compatibility.

**Verified limits:** 320 and 1280 CSS px checks found no page horizontal overflow; the actual user viewport capture was 1422 px. Light/dark captures were reviewed. Keyboard full-resolution inspection at 320 px showed a 720 px natural image within a 238 px region (`scrollWidth=720`); Escape returned focus to the inspection trigger. Enlargement was tested with harness CSS `zoom:2` only, **not native browser 200% zoom**. Forced colors, screen readers, native zoom, real-phone/outdoor use and comprehensive contrast/target audits remain unverified. WCAG 2.2 AA is the target, not a certification from this review.

Copy is government English using existing Reports conventions. Resident interfaces and their English/Filipino contracts are untouched; no bilingual completion claim is made for this staff addition. Dates use the existing formatter. Missing source/capture time is stated, never inferred. Review wording must remain conditional on authoritative state.

## Figma and validation evidence

The existing [PULSO shared Figma file](https://www.figma.com/design/1qPgPj4o3smElv8B2B1REi) was inspected in the browser on 7 November; the reviewer-final government light/dark references were present and the live UI selected node `8-1067`. Guest sign-up/editor access prevented editing or authoritative binding inspection. **No Figma writes, new components, bindings or prototype behavior are claimed.** Existing limitations remain: separate light/dark collections, incomplete v0.2 rebinding, provisional typography and sample evidence. Next Figma action: with editor access, create/reconcile a reusable paired `Reports/Observation field assessment` pattern in Core Library and its handoff in the existing file, preserving reviewer-final templates and semantic naming; validate structure and pixels before claiming completion.

The live review harness ([HTML](../../frontend/tests/field-assessment-live-review.html), [fixture](../../frontend/tests/fixtures/field-assessment-live-review.jsx)) used actual HTTP to isolated port `33161`, guarded disposable PostGIS database `pulso_test_intelligence_browser_20261106`, and sample source bytes under `backend/.pytest_cache/intelligence-browser`. No external provider call was involved. Actual synthetic intake, field capture and independent review produced different category findings; deliberately dropping a successful POST acknowledgment and remounting recovered the same receipt. The database retained exactly one report, one reported observation and one assessment at revision 1, with the report still pending. Full-page reload restored the draft and required photo reinspection. Clerk server context hid field actions; explicit session expiry and re-login retained the draft.

**Bounded verification:** 63 backend checks and 14 JavaScript checks passed, including 2 new backend and 8 new JavaScript checks. Targeted lint was clean; builds passed before the final correction, with the final post-correction build to be confirmed in the parent completion record. The mechanical detector ran once on changed component/CSS and returned `[]`. These are local synthetic checks, not field validation.

The independent full finish review returned `fix` for two material issues: unconditional reviewed-state copy and missing full-size inspection. Both were corrected. The final verdict was `ship`, scoring **those two fixes resolved only**; this is not whole-product, operational, privacy or production approval.

Capture set, all SAMPLE: [desktop](../../.impeccable/review/field-assessment/desktop.jpg), [desktop dark](../../.impeccable/review/field-assessment/desktop-dark.jpg), [mobile](../../.impeccable/review/field-assessment/mobile.jpg), [mobile dark](../../.impeccable/review/field-assessment/mobile-dark.jpg), [actual user width](../../.impeccable/review/field-assessment/user-1422.jpg), [CSS enlargement](../../.impeccable/review/field-assessment/review-enlargement-200.jpg), [mobile inspection](../../.impeccable/review/field-assessment/inspection-mobile.jpg). Dark full-page captures contained rasterization blanks and were replaced with valid native viewport captures; this set is not full-page dark proof. The reviewer accepted the corrected captures. Screenshots support the behavior contract; they do not replace it.

## Remaining work and release boundaries

1. **PULSO engineering:** close the legacy report-photo access gap before real data; complete native zoom, assistive-technology/forced-color checks and actual-device acceptance, and confirm the last build result.
2. **Design owner/editor:** carry the reusable paired pattern and full state/permission/accessibility annotations into the shared Figma file after access is available; reconcile remaining bindings and dated token aliases without inventing global changes.
3. **LGU/product and data owners:** approve operational adjudication, evidence/privacy handling, identity/accuracy policy, accountable roles and acceptance criteria. A technical receipt does not grant those approvals.
4. **Field/model owners:** conduct authentic phone/GPS pilots, acquire independent outcomes, review condition-coverage use separately from resolution targets, and satisfy calibrated/versioned model-release gates. Numerical ETA and predictive accuracy remain unreleased.
5. **Delivery owners:** complete mobile parity and broader operational acceptance; follow reviewed migration/deployment procedures before any service release.

This UI increment adds no schema change beyond the existing `31c5d6e7f8a9` assessment head. The configured application database was not migrated and no deployment occurred. The broader PULSO objective remains incomplete.

November 8 follow-up. Public report thumbnails now check the report's publication status on every request, including when a rendered preview is in the process cache. The two static mounts deny direct reads from the old thumbnail cache. Public previews strip embedded metadata and use a new URL version to avoid reusing earlier immutable cache entries. The new original-photo routes use report ownership or staff scope (`GET /api/reports/{report_id}/photo`) and a private tracking token in the request body (`POST /api/reports/track/photo`). The static original-photo URLs are still reachable while existing web and mobile consumers use them. The remaining privacy work is to migrate those consumers and disable direct access, including legacy resolution images and staff map fallbacks.
