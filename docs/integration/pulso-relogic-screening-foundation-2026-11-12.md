# PULSO RELogic — screening foundation

**Status:** Implemented locally, pending operational/physical-device evaluation.

**Date / owner:** 12 November 2026 / PULSO engineering.

**Increment:** RELogic 0A, within [the proposed RELogic plan](../government-system-proposal/47-pulso-relogic-development-plan-2026-11-12.md). This starts the phase; the entire phase and responsibility-registry work are not complete.

## Resulting behavior

An unclear category, uncertain service scope, a suspected image of a screen, or provider unavailability no longer becomes an automatic invalid-photo finding. Those concerns can reach the existing staff-validation workflow with an explicit advisory assessment. Existing objective input protections and the existing restriction for explicit prohibited visual content remain separate.

The workspace backend remains the baseline. This increment adds no dependency, table, migration, trained model, confirmed responsibility rule, automatic referral or canonical report status. The local application database is not reset or migrated. The existing staff-chat schema mismatch remains separate work.

## Backend contract

[report_screening.py](../../backend/report_screening.py) defines the versioned `pulso-relogic-screening-v1` contract. The following findings stay independent:

- `service_eligibility`: unknown or potentially out of service; neither establishes ownership or an exclusion;
- `authenticity`: not assessed, uncertain, or screen suspected; no proven-authentic or proven-fraud verdict;
- `evidence_quality`: not assessed, usable, or unclear;
- `content_safety`: not assessed, clear, requires review, or prohibited; clear is provider advice, not publication approval;
- location source, resident pin confirmation, actual reported accuracy when applicable, and the existing location-quality state;
- observation keys/categories with unknown responsibility and required human review.

All new eligibility/authenticity findings are advisory. `submit_for_review` allows intake but does not mean government verification. `restricted_upload` retains the explicit prohibited-visual-content restriction, with a neutral replacement message; it is not used for private-property guesses, incidental faces, screenshots, unknown categories or hazard-related words. The deprecated `is_inappropriate` compatibility field now represents that restriction only. Unknown visual infrastructure is nullable rather than a false invalid-photo verdict.

Provider schemas use bounded enum values. Provider-supplied policy outcomes, responsibility claims and arbitrary decision fields are discarded. Malformed outputs and nonfinite/unusable numerical suggestions degrade to review. The Gemini prompt treats resident text/OCR as untrusted evidence, forbids invented coordinates/measurements/ownership and requests independent advisory signals. The outage fallback no longer rejects reports because a description mentions words such as threats or explosive electrical faults.

### Precheck

The existing `POST /api/reports/analyze` endpoint remains the precheck. It bounds description size, image bytes, supported raster formats and decoded pixel dimensions before a vision request. It returns an assessment with a server timestamp and fingerprint of description/image input. It is ephemeral: no report, ticket, uploaded evidence file or persisted screening-session record is created.

Prechecks have a separate in-memory allowance of 20 checks per minute, keyed to the authenticated account or server-resolved peer IP. The allowance does not consume the report-submission quota. This retains the current process-local limiter architecture; it is not a distributed abuse-control system or validated operating-volume limit.

### Submission and traceability

`POST /api/reports` recomputes the assessment server-side from the actual submitted evidence and existing validated location/observation input. No browser screening result, precheck fingerprint, `allowed=true` field or AI category establishes submission authority. The existing full input digest binds the persisted assessment to that operation.

The normalized analysis is retained through the existing `ai_metadata` field. A private `report_screening` audit event is appended in the same transaction as report creation, reviewer routing and observation initialization. It records the contract version, assessment time, full input digest, bounded findings and observation keys/categories; it does not duplicate image bytes or resident contact details. Existing idempotent receipt recovery returns the original report/event rather than creating another assessment on replay.

The existing authorized staff report-intelligence context exposes the recorded assessment, and the government Shared concerns panel shows it as **Intake screening**. Staff see responsibility uncertainty, photo/evidence flags, content-review needs, location limitations and source/time. Another resident cannot access this private context. Public incident projection is not extended with screening/audit fields. No existing record is retroactively assessed from a guess.

## Shared resident and Android behavior

[reportScreening.js](../../frontend/src/utils/reportScreening.js) is the shared interpretation used by the issue camera, quick report, full photo/location step, legacy evidence step and resident capture path. Only the current explicit upload-restriction contract blocks the photo step; legacy category/infra flags remain advisory. The backend remains authoritative at submission.

The shared [ReportScreeningNotice](../../frontend/src/components/report-wizard/ReportScreeningNotice.jsx) provides English/Filipino guidance for review, suspected screen capture, uncertain service scope, provider outage and photo replacement. It uses plain text, an icon and a polite status announcement. Evidence stays true-color and metadata remains outside it. Existing reports/camera primitives and palette are retained; no Figma work was performed, following the user's instruction.

Replacing/removing a photo cancels superseded analysis work. Late results cannot reject or relabel the replacement image. A review warning prevents automatic step advancement so the resident can read it and explicitly continue. New capture provenance stays separate from uploaded-photo provenance, and replacing a capture with an upload clears the old camera fix/request. Existing draft bytes, idempotency keys and fresh submission consent continue to use the shared draft/intake flow. A provider outage leaves manual review available rather than inventing an urgency/category.

The narrow/zoomed photo step and shared coordinate rail wrap address/coordinate content rather than forcing a single line. The new notice has matching theme meaning, functional English/Filipino copy and no mandatory motion. Browser checks cover the real photo step at desktop and 320 px with enlarged text; they are not certification of the full legacy wizard or all camera controls.

The legacy field-report path no longer substitutes a default Caloocan point when device coordinates are absent. It keeps the draft input, explains the missing fix and does not enqueue invented coordinates. Device accuracy also remains unknown when unavailable instead of becoming 5 m. This does not improve or certify physical phone accuracy; account-scoped legacy Field PWA caches remain separate pending work.

## Verification and acceptance

The final bounded runs passed **75 focused backend checks**, **156 government/resident/media/matching regressions**, and **103 frontend checks**. The real-component browser scenarios passed with synthetic inputs; production build and focused lint also passed. A local runtime smoke check returned HTTP 200 for API health/public reports and the frontend, HTTP 401 for anonymous government navigation, and HTTP 422 for a synthetic invalid-raster precheck before any provider call. The Android app-origin CORS preflight returned HTTP 200. No real report was submitted for the runtime smoke check.

- Backend checks exercise uncertain/legacy classification, malformed provider fields, model-injected decisions, screen suspicion, image input bounds, unavailable analysis, separate quotas, per-observation review, authoritative submit recomputation, one committed audit event on retry and private-context access.
- Existing government/resident/media/matching regressions verify that the screening event does not alter queue permissions, ticket identity, reviewer assignment or public evidence boundaries.
- Frontend checks cover shared restrictions, translation parity, unknown field points, draft recovery, immutable intake retries and native media/navigation helpers.
- A real-component browser fixture uses synthetic vision/address responses and images. It checks suspected-screen intake remains available, old responses cannot block a replacement photo, provider outage remains reviewable, bilingual announcements and narrow/enlarged-text behavior. It does not call a live model or submit a resident report.
- Production build and focused lint are required. The existing large-bundle warning remains outside this increment.

Tests use guarded disposable databases. No real phone, live Gemini evaluation, official facility boundary, authenticated APK run, flood/traffic provider activation or production deployment is claimed.

## Deliberate limits and next package

This foundation **does not detect screen replay with validated accuracy**. It provides structured, reviewable signals and the software path for later evaluation. A missing screen flag is never proof of a real scene. Gemini is not a cadastral survey, maintainer registry or public-infrastructure ownership authority.

UCC exclusions, service referrals and automatic eligibility declines remain disabled/unimplemented until reviewed responsibility data and exception rules exist. No prior-report history or missing registered asset can reject a concern. Nearby-concern discovery and reviewed concern association retain their existing separate contracts; this increment does not implement the proposed new pre-intake suggestion interface.

Before expanding automation, complete the legacy private-media consumer migration, entry-point/privacy inventory, and the bounded first-party responsibility-registry pilot. Then collect independently adjudicated real-scene/screen-replay evidence across ordinary phones and evaluate false flags before deciding on stronger capture or learned models. Prechecks are currently ephemeral, so accepted-report audits alone cannot measure all abandoned/declined attempts or population false-rejection rates.

The remaining RELogic work follows stages 0–6 in the plan. This increment does not activate LightGBM maintenance/ETA inference or enable hazard APIs. Any future model, exclusion rule or external source needs its own observed validation, source/permission checks and recovery path.
