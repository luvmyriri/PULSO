# First-party field inventory — 3 November 2026

**Status:** Backend collection APIs and a Python collector implemented locally; not deployed. No survey UI, automatic object detector, field accuracy trial or trained model is claimed. This is a data-collection increment of [proposal 45](../government-system-proposal/45-report-concerns-location-and-independent-data-2026-11-01.md), following [automatic validation assignment](automatic-report-assignment-2026-11-03.md).

## What can now be collected

Authorized staff can create a stable PULSO infrastructure candidate in the **existing** asset registry and append repeat field observations without a government asset document, ownership record or completion date. New candidates retain unknown maintenance authority, design life, material, completion date and numerical condition score. Registry status is `candidate`; asset condition status is `unassessed`. These internal collection values do not change the resident report lifecycle. The existing official registry approval path is separate.

Each observation records observer/server receipt time, claimed observation time, proposed issue point, original device/camera metadata, uncertainty, visibility, condition claim, notes, optional source report and private evidence reference. The point represents a proposed observation anchor: a point does not establish a road segment's full geometry or a unique physical object's identity.

Visibility is `visible`, `not_visible`, `unsafe` or `missing`. Condition is `defect_observed`, `no_defect_observed` or `not_assessed`. Unobserved/unsafe/missing sites must be `not_assessed`. An absence of reports, an unsafe visit or a missing object never becomes a no-defect training example. A visible site can remain `not_assessed` when condition cannot be determined.

No material, age, design life, severity, ownership or score is inferred from category or coordinates. Source reports are private context with existing report authorization and matching recorded barangay; they are not proof of a later revisit.

## Location and identity

The collector accepts an explicitly recorded barangay/district for authorization. Where a barangay polygon exists, proposed points outside it receive a recoverable validation error. Where no polygon is available, `boundary_unavailable` is retained; lookup selection is not spatial verification. A point within a polygon only establishes that geometric test, not independently verified jurisdiction or asset ownership.

Original sensor accuracy remains an estimate. A moved/manual issue pin does not inherit it. Fix timestamps within 120 seconds of the claimed observation time receive `near_observation_time`; missing or mismatched times remain explicit. This is a collection rule, not a measured accuracy threshold. Independent review yields `reviewed_proposal`, never a guarantee of exact object position.

The nearby endpoint uses PostGIS meter-based geography distance, includes scoped candidate/verified records with geometry, and returns at most 50 suggestions within a requested 10–500 m radius. Truncation is explicit. It never merges candidates or declares two poles identical. Separate new-operation keys intentionally create separate candidates, even at identical coordinates. Choose an existing stable asset ID for repeat observations; use independent review and future identity adjudication for suspected duplicates.

## Evidence, review and learning boundary

Use the existing private inspection-evidence upload and authorized download endpoints. Evidence must belong to the same asset. A field photo cannot be reused for a second field observation. The evidence row is locked while attaching it; the existing cleanup worker now retains photos attached to field observations as well as inspections.

A separate authorized engineering reviewer can accept or reject a pending observation once. A reviewer cannot review their own record. Accepted visible findings require stored private field evidence; a source report photo does not substitute for revisit evidence. Identity confirmation and location review are separate recorded decisions and may remain false. Rejection cannot verify either. Repeated reviews conflict; corrections are new observations, preserving the original record and audit history. Structured supersession/identity adjudication remains future work.

Acceptance does **not** change canonical asset geometry, numerical condition, ownership, official registry status, report status, work orders or model outputs. These observations do not enter the existing `AssetInspectionOutcome` training pipeline. A future independent field-data target must define rubric, identity groups, observation policy, corrections and prospective validation before exporting trusted labels. Unknown physical maintenance authority must not be fabricated to satisfy an older model's eligibility checks.

## Private API contract

All routes use `/api/gov/field-inventory`. Existing server permissions and district scope apply. Read access requires active staff maintenance view access. Recording additionally requires verification access. Review additionally requires the existing maintenance engineering decision capability. Suspended, pending-invitation, inactive and resident accounts cannot self-grant access through this API. Explicit stored module denials take precedence.

| Method | Route | Purpose |
|---|---|---|
| POST | `/assets` | Create one candidate and its first pending observation atomically. |
| GET | `/assets` | Paginated authorized registry records; optional barangay/registry-status filters. |
| GET | `/assets/nearby` | Bounded geographic suggestions; identity remains unestablished. |
| GET | `/assets/{asset_id}/observations` | Paginated immutable field history. |
| POST | `/assets/{asset_id}/observations` | Append a visit to an existing stable record. |
| POST | `/observations/{id}/review` | One independent accept/reject decision with reason and identity/location flags. |
| GET | `/coverage` | Counts and observation dates within accessible recorded sites. |

Creation inputs are `asset_name`, category (`Road`, `Bridge`, `Drainage`, `Building`, `Light`), `barangay_id` and observation fields. Observation fields are timezone-aware `observed_at`, latitude/longitude, `location_metadata` using the report-intelligence provenance schema, visibility, condition, notes and optional evidence/source-report references. Extra fields, nonfinite coordinates, contradictory observation states and future/naive timestamps fail validation. Validation responses omit raw private input values.

Creation and append require `Idempotency-Key`. Operation identity includes actor, operation and target asset. A transaction lock serializes concurrent replays; one unchanged operation returns the same resource, while changed input with the same key conflicts. Validation failures roll back partial candidate rows. Retired records require a reviewed correction before new visits.

Coverage counts are observation claims, including pending/rejected claims, with explicit separate review counts. Surveyed record count is **not** a physical asset census: duplicate records may still exist. There is no citywide coverage percentage, prevalence estimate or model-performance claim.

## Python collector

The runnable entry point is `backend/scripts/collect_field_inventory.py`. Prepare a private JSON file matching the API schema using real field measurements. Run from the repository root:

```powershell
# Local validation only; no network request and no database write.
& backend/.venv/Scripts/python.exe backend/scripts/collect_field_inventory.py --input field-observation.json

# Explicit submission after setting PULSO_FIELD_TOKEN in the local environment.
# Persist one random UUID for this operation and reuse it with unchanged input.
& backend/.venv/Scripts/python.exe backend/scripts/collect_field_inventory.py --input field-observation.json --submit --idempotency-key <saved-operation-uuid> --base-url <configured-api-origin> --receipt private-receipt.json

# For a repeat visit, use an observation-only JSON file plus the existing ID.
& backend/.venv/Scripts/python.exe backend/scripts/collect_field_inventory.py --input revisit.json --asset-id <existing-asset-id>
```

Angle-bracket values above are placeholders, not executable measurements or credentials. The collector reads the staff token from an environment variable, does not print it, requires HTTPS for remote APIs, and refuses HTTP redirects so a bearer token cannot be forwarded to another destination. It sends no external model requests. The dry-run validates input structure only, not district permission, object identity or GPS truth. The server performs authoritative checks during submission.

If no receipt is confirmed, preserve the original JSON and operation key. A network error may occur after a successful commit. Retry unchanged to recover the existing result rather than generating a new operation key. Optional receipts contain private field context and must be stored accordingly. No live CLI submission was made during development; submission tests use mocked transport.

## Schema and validation

Migration `26d0e1f2a3b4` follows `25c9d0e1f2a3` and adds `asset_field_observations` with constrained visibility/condition/review states, immutable command identity and private lineage. There is no fabricated/backfilled survey history. Bootstrap/CI tooling and the schema inventory reference head 26. Only the named disposable local test database was migrated; configured application and production databases were not changed.

The integration checks cover concurrent replay, operation/actor isolation, authorization and district restrictions, private evidence ownership/retention, independent review, immutable history, provenance/accuracy handling, missing boundaries, malformed/nonfinite input, honest unknown conditions, pagination and coverage. The CLI checks offline defaults, required credentials/operation identity, receipt handling, uncertain-response wording and credential-safe transport.

- Final focused run: **37 passed** across `test_field_inventory.py` and `test_field_inventory_cli.py`.
- Earlier integration run: **59 passed** across collection, asset inspections, predictive, report intelligence and reviewer availability. The subsequent expanded run had **158 passing checks and one test-fixture naming failure**; the fixture was corrected and its permission test passed in the final focused run. Counts overlap and are not additive.
- Python compilation and Git whitespace checks passed. CLI help was exercised locally. API tests use the real FastAPI routes against the guarded disposable PostGIS database; CLI transport tests are mocked. No frontend files changed in this increment, and no new browser/Figma or physical-device verification is claimed.

## Remaining work

Follow-up: [Concern resolution learning history](report-resolution-learning-2026-11-03.md) now adds frozen intake features, sourced staff-verification events and separate reviewed observed-change intervals. These are collection/read APIs; they do not complete the survey UI or train a prediction model.

Implement the field-survey UI against these APIs using the required Impeccable/PULSO/Figma workflow; define a bounded pilot, safe survey sites and a reviewed condition rubric; field-test ordinary phones against an independent reference; add identity adjudication, reviewed correction/supersession and consent/retention controls; then establish target-specific datasets and validation. Automatic Gemini extraction and image embeddings are still pending. Verified concern completion histories, descriptive service-duration baselines and evaluated ETA/recurrence models remain separate development work.
