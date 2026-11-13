# Camera location request provenance

Status: local implementation and synthetic verification, November 6, 2026. Technical owner: PULSO engineering; pilot/reference reviewers and acceptance owners remain to be named. This extends the [camera sampler](camera-location-sampling-2026-11-06.md) and [ordinary-phone pilot tooling](location-pilot-tools-2026-11-06.md). It does not approve an accuracy threshold or release a prediction/matching model.

## Implemented behavior

The bounded camera sampler now returns an optional `locationRequest` alongside the original camera capture time and selected photo-device fix. It records the acquisition attempt's wall-clock start, terminal time, first valid position callback's receipt time, outcome and end reason. It records no additional coordinates, device identifier, contact, browser fingerprint or sequence of raw fixes.

The selected image fix and request outcome answer different questions. A seed fix from before opening the camera does not count as a callback from the current request. For example, a denied request can still have an earlier eligible seed fix associated with its photo; the request remains `denied` with no first delivery time. A callback is not evidence of freshness, precision, object identity, or jurisdiction. Fix measurement time remains the provider's original timestamp.

Request history freezes on the first terminal event. Later capture/recovery never replaces its timestamps. Deadline, permission denial, provider failure, unsupported capability, early capture and hidden/stopped camera sessions remain distinguishable. A clock rollback that makes the interval inconsistent leaves the request provenance unknown rather than fabricating an ordered interval. Photo capture and its existing unknown-location fallback still work.

Resident quick/full reporting, account-scoped original-photo drafts, immutable intake retries and field-photo payloads preserve the same original request object. Uploaded images discard camera request metadata. The full wizard passes the camera file's request metadata into its existing evidence object; no layout, new visible control, permission prompt or navigation change was introduced.

## Data contract

Persisted `location_metadata.photo_location_request` uses `camera-location-request-v1`:

| Field | Meaning |
|---|---|
| `started_at` | Client acquisition attempt start, including the capability check. |
| `finished_at` | First terminal event's client wall-clock time. |
| `first_fix_received_at` | First valid position callback delivery time; never copied from a seed or from the fix measurement timestamp. |
| `outcome` | `success`, `denied`, `timeout`, `unavailable`, `unsupported`, `cancelled`, or `not_requested`. `success` means a valid callback arrived, not verified accuracy. |
| `end_reason` | `capture`, `deadline`, `permission_denied`, `provider_error`, `unsupported`, `hidden`, `stopped`, or `not_started`. A request that returned a position can end at the deadline while retaining `success`. |

The request object requires timezone-aware ordered timestamps. Successful acquisition requires a first callback delivery within its interval. `not_requested` has null times and reason `not_started`; unsupported requests cannot claim a delivered fix. The API rejects extra request fields, a non-camera source carrying this object, and timestamps beyond its existing future-time allowance. Client observations remain supplied claims; the API cannot authenticate hardware time or precision.

The object is optional. When absent/null, the location serializer retains the prior metadata shape so pre-extension intake/field command hashes and receipts stay compatible. It is stored in existing JSON metadata; no schema migration or new dependency is required. Deploy the accepting backend before the updated client; older strict backends do not recognize this additional field.

## Pilot extraction and metrics

`trial_from_record` copies the explicit request outcome/times from new report and field-capture records into the pilot trial. Legacy records retain `unknown`; image presence, a saved fix, report receipt time, or an existing quality label never supplies missing acquisition history. Reference and identity-review fields remain unset. The data origin is not automatically promoted to `field_collected`.

`request_first_fix_received_at` is an optional additive trial field. `acquisition_latency_s` remains the recorded whole request-window duration (finish minus start). The new `first_fix_delivery_latency_s` row and summary describe time until the first valid callback (first delivery minus start). These may differ substantially during continuous sampling; the first metric must not be presented as time to first fix. Nested future request timestamps are also included in the audit's clock exclusions.

This covers requests attached to retained camera frames. Abandoned capture sessions, camera permission failures without a frame, and unsubmitted reports are not a complete attempt log. Submitted records cannot establish a population failure rate. Independent reference coordinates/bounds, actual stationary intervals, intended-object adjudication and repeated device/environment trials are still needed for location/object evaluation. No evidence is uploaded or collected by the offline extractor.

## Verification

- A disposable PostGIS run passed **72 checks** across request-contract, pilot, private-record extraction, report intake and atomic field-capture suites. New tests cover successful and denied report metadata, stable intake replay, and field-photo capture/extraction through actual product transactions and authorization.
- After adding nested-clock exclusion and a JavaScript-to-Python producer/consumer check, the focused contract/pilot rerun passed **43 checks**. This overlaps the preceding run and is not an additional 43 independent integration scenarios. The producer check exercises the actual JavaScript sampler, photo pack/unpack and both payload builders against the Python model. It skips explicitly if Node is absent; it ran here.
- **30 client checks passed** for sampling, callbacks, timeout/denial, fixed request history, clock rollback, seed handling, resident draft storage, immutable retry, upload clearing and field payload/recovery.
- Targeted lint completed with zero errors; legacy component warnings remain. The production build passed with its existing large-bundle warning. No physical phone, real permissions, geolocation provider, Gemini service or production deployment was exercised.

Run the backend checks through `backend/.venv/Scripts/python.exe scripts/verify_report_intelligence.py`; the new request/pilot suites are included in its defaults. Client checks use `node --test` for `captureLocation`, `residentReportDraft`, `reportIntake` and `fieldSurvey` under `frontend/src/utils/__tests__`.

Next: collect controlled ordinary-phone camera trials with this explicit request provenance, retain the already authorized private record as lineage, and use independent reference/object reviews in the existing pilot audit. Authentic outcomes and prospective evaluation remain prerequisites for learned ETA/maintenance releases.
