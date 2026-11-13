# Report intelligence foundation — 1 November 2026

**Status:** Implemented in the working tree and tested locally. Not deployed. This is the first development increment of proposals 45 and 46, not completion of their model/inventory roadmap.

## Implemented behavior

- The primary resident wizard, quick report, and alternate resident submission use one request and one server ticket for up to three category labels. The primary category remains a compatibility projection for existing routing consumers.
- Intake accepts explicit distinct observation items, each with category labels. When the UI provides category labels alone, one observation represents the described problem; categories never automatically create additional observations or tickets.
- New observations at the same position remain independent reports. Intake no longer rejects them using the former 15 m proximity rule or overwrites durable identity with recalculated DBSCAN numbers. Hotspot utilities remain separate.
- Each observation starts with its own stable concern. A staff reviewer can compare bounded, authorized spatial/category candidates, confirm same-problem membership, or separate an observation again. Decisions preserve tickets/status, record reason/actor/history, and check source and destination versions and permissions. Grouping does not resolve reports or establish that all defects on one asset are the same incident.
- Device fix and issue pin have separate meaning. Intake retains source, horizontal accuracy, measurement/capture times, resident confirmation and original device fix. A moved pin does not inherit GPS accuracy. Camera provenance is captured at the shutter callback boundary before AI review; uploads do not receive an invented capture timestamp. These remain client assertions, not independently verified sensor truth.
- Invalid/nonfinite coordinates, inconsistent observation/category input and invalid provenance receive validation errors. AI/geocoder failures preserve a manual review path.
- Random client operation keys prevent duplicate creation on retry. A scoped receipt-recovery API checks for an existing committed result before a client retries; pending original fields and photo bytes allow replay of an interrupted original operation. Definitive validation/auth/rate-limit rejections allow a corrected operation. Success requires an actual server ID/ticket. Pending operations are partitioned by reporting account on the device; the server enforces identity scope.
- Report, observations, initial concerns, initial timeline and queued resident receipt intents commit in the same creation transaction. A concurrent replay that loses the unique-key race rolls back its own file/rows and returns the existing ticket.
- The new intelligence projection deliberately returns no numerical resolution estimate. No model has been trained or validated for this target.

## API contract

`POST /api/reports` remains multipart and supports legacy scalar `category`. Additive inputs are JSON-encoded `categories` (1–3 labels), `observation_items` (1–10 items), and `location_metadata`. New web clients send a random UUID in `Idempotency-Key`.

`location_metadata` includes `source`, `device_fix`, `issue_pin_confirmed`, `confirmed_at`, `photo_captured_at`, `photo_source`, and `photo_device_fix`. Fixes carry latitude, longitude, optional positive `accuracy_m`, and optional timezone-aware `measured_at`. Unknown measurement precision is null. Coordinates/times are recorded claims; the system does not certify exact object position.

`GET /api/report-intelligence/intake-receipt` uses the original operation key and reporting identity. The key is a private recovery capability for guest submissions and must not appear in public links/logs. The response uses the existing report response contract and can restore the original tracking receipt.

`GET /api/report-intelligence/reports/{id}` is available to the owning resident or authorized staff. Residents receive their own submitted context; staff receive scoped candidates and decision eligibility. Candidate similarity is not a match probability.

`POST /api/report-intelligence/reports/{id}/association` takes observation ID, optional target observation ID, expected source report/concern versions, expected destination report/concern versions when linking, and a reason. A null target explicitly separates the observation into a new concern. Closed target episodes cannot silently absorb a new incident. Stale versions return a recoverable conflict.

## Database and rollout

Migration `24b8c9d0e1f2` follows `23a7b8c9d0e1`. It adds report categories/provenance/intake keys and the concern, observation and decision tables. Legacy reports retain their IDs and dates; each starts independently for later review. Historical spatial cluster IDs are not converted into confirmed links. Bootstrap scripts, guarded disposable-test revision and normalized schema inventory have been updated.

Apply the migration through the existing reviewed schema workflow before running this code against a configured application database. It has been exercised on the named disposable local PostGIS database; this work did not migrate the configured application or production database. Downgrade removes the new intelligence records, so use a backup and retain them when planning any operational rollback.

## Verification and source reconciliation

- PostGIS integration run: 63 passing checks across report intake/intelligence, resident/government reads, project coordination and notification delivery. A subsequent 16-check rerun passed after receipt recovery was added. Final focused concurrency and legacy-proximity verification: 20 passed, 49 deselected; includes a forced two-request race that commits one report and one evidence file. These runs overlap and are not additive coverage counts.
- Browser-independent JavaScript checks cover one multi-category payload, operation-key reuse and new drafts, interrupted receipt recovery, original versus edited attempts, validation correction, photo handling and location provenance. Existing report-wizard validation checks passed.
- Production frontend build passed. The existing large-bundle advisory remains; no performance benchmark is claimed.
- ESLint passed for the new intake/evidence utilities, concern review component and synthetic fixture.
- UI review used `frontend/tests/fixtures/report-intelligence.html`, with explicitly synthetic data and responses. Candidate selection enabled the correct action, confirmation focused the reason field, and the confirmation dialog reflowed at 320 px. Light/dark surfaces were inspected. This fixture is not a city record or a live end-to-end browser backend test.
- The live shared Figma file was inspected read-only through the browser. The portal page and `Template/Government Citizen reports · Light · Reviewer final` were observed, including the 1440×900 component properties. Current repository Reports UI and shared Gov controls remain the implementation reference per PRODUCT.md. No binding/variant completeness, prototype behavior or Figma write is claimed. Official Figma connector skills remain required for a future library/frame write.
- Impeccable's mechanical detector returned no findings on the changed report/concern component targets. This is not a complete accessibility audit or a field GPS test.

## Remaining development

Follow-up on 6 November: [Object/problem pair reviews](observation-pair-review-2026-11-06.md) adds structured operational positive/negative/uncertain labels, immutable corrections, two-sided uncertainty retrieval and a private Python matching-audit export. It does not train or validate an image model or automatically group nearby reports.

Follow-up on 3 November: [first-party field inventory](first-party-field-inventory-2026-11-03.md) now supplies candidate/revisit collection APIs and a Python collector. It is a partial implementation of the independent-data workflow; it does not provide the survey UI, automatic detection, a trusted training export or predictive estimates.

Image embeddings and object recognition, first-party infrastructure candidate/survey workflows, outcome collection and validated LightGBM ETA/recurrence training remain to implement. The existing predictive module was not replaced or empirically validated by this increment. The mobile intake remains a legacy scalar-category client and needs a separate client migration. Secondary-category routing/filter/analytics consumers need reconciliation with explicit observation/work semantics; this increment preserves their primary-category compatibility.

Before field release: independent accuracy/identity trials on the team's actual phones; same-object versus adjacent-lookalike labeled data; full browser/API integration of the revised form; bilingual recovery-copy audit, 200% zoom/forced-colors/screen-reader checks; inventory and outcome governance; live Figma annotations for the new stateful controls; and the existing production authorization/storage gates. These are outstanding work, not implied capabilities of the current build.
