# Ordinary-phone location pilot tools — 6 November 2026

**Status:** Offline Python tooling implemented locally. Owner: PULSO engineering; reference adjudication and acceptance thresholds still need the pilot's named decision owners. No phone trial, hardware accuracy result, new location verification state, deployment or automatic matching release is claimed. Follows the [field-survey workspace](field-survey-workspace-2026-11-04.md) and [learning dataset audit](concern-learning-dataset-2026-11-04.md).

## Implemented scope

`backend/scripts/audit_location_pilot.py` can initialize an empty private pilot file, extract the original location/provenance from a saved private PULSO report or field observation, append validated trials into a new file, and produce a versioned audit. It does not fetch records, take photographs, request device permissions, alter coordinates, update PULSO records or fit a model.

The input contract is `pulso-location-pilot-v1`. Files contain a pilot ID, self-declared data origin, optional working policy, reference records and trial records. The initialized plan contains **no sample coordinates, measurements or acceptance thresholds**. Unknown policy and unknown measurements remain null/empty. Inputs are capped at 32 MiB, 2,000 references and 10,000 trials. IDs are bounded pseudonymous keys, timestamps need offsets/timezones, and coordinates/uncertainty must be finite. A saved source record cannot count as two different trials in one file.

Distance uses the pinned `geographiclib==2.1` dependency's WGS84 inverse geodesic, in horizontal meters. This is a mathematical distance between input points; its precision does not improve either point's measurement quality. The input schema is available programmatically through `location_pilot.Pilot.model_json_schema()`.

## Three different checks

| Check | Required comparison | Meaning and limitation |
|---|---|---|
| Original phone position | Original device fix against a separate `device_station` reference, with a documented stationary interval containing the fix time | Describes device position error. The station is where the phone was held, including across the road from the target. |
| Photo-associated phone position | `photo_device_fix` against that station, with the actual camera frame time | Preserves signed fix-minus-capture time. Post-capture, stale, uploaded and missing-time cases stay explicit. |
| Issue/object pin | Submitted issue coordinates against an `issue_target` reference | Describes the issue point, not the camera position. Manual/search pins do not inherit the phone's sensor accuracy. |

The radius is retained as `issue_accuracy_m` only for an explicitly device-sourced issue point that exactly equals the original device fix. Even then, this remains a reported device radius and does not prove the photographed object's position. Otherwise issue accuracy is null. `quality` labels stored by the report API are retained during import but never used as evidence of accuracy; the tool recomputes timing from the recorded timestamps.

Object identity is evaluated **separately** using the intended target's `object_id`, the selected object ID, and an explicit identity reviewer key. A tiny coordinate error cannot establish that two pictures contain the same pole or problem. Missing selection/reference/review produces `unknown`; unknowns remain in the denominator counts and are excluded only from the explicitly named wrong-object rate among reviewed outcomes. These keys and reviews are supplied claims, not a cryptographic or server-authorized adjudication.

## References and conditional error bounds

Each reference has a role, coordinates, method, measured time, independence claim, uncertainty value/basis, evidence key, reviewer key and optional object identity. Its numeric comparison qualifies for audit statistics only when the method is `surveyed_control` or `independent_measurement`, independence and evidence/review are supplied, and a positive `documented_bound` is supplied. Working policy can further exclude references whose uncertainty is too large. `map_pin`, `same_phone`, unknown uncertainty, estimated bounds, missing review and future reference times do not qualify as numeric ground truth.

For measured distance `d` and the supplied reference bound `u`, the tool reports `[max(0, d-u), d+u]`. This is conditional on the reference bound actually being valid. It is not a statistical confidence interval or a software certification of the reference. A working tolerance is `within` only when the upper bound is within tolerance, `outside` when the lower bound exceeds it, and `indeterminate` when the bounds overlap the threshold. Without policy, the result is `policy_unset`. Original distance to an unqualified reference may be inspected, but it is excluded from qualified error summaries.

The phone's reported radius is separately classified as `inside`, `outside`, `indeterminate` or `unavailable` using those same bounds at the phone station. These are descriptive audit counts, not proof of population-level 95% coverage. The [W3C Geolocation specification](https://www.w3.org/TR/2024/REC-geolocation-20240613/#latitude-longitude-and-accuracy-attributes) defines the device coordinate accuracy field; its [position timestamp](https://www.w3.org/TR/2024/REC-geolocation-20240613/#timestamp-attribute) describes acquisition time. Neither establishes the photographed object's coordinates.

The current published W3C URL was also inspected on 6 November 2026 and points to the 30 October 2026 Candidate Recommendation Draft. The fixed Recommendation links above identify the reference version used here. No new browser API or draft-only feature is introduced.

## Recording a trial

Use pseudonymous session/device/reference IDs. Preserve each actual phone model/browser and the relevant environment in the team's controlled measurement log; this v1 file has only the device key and environment. Record repeats in distinct sessions instead of treating repeated correlated readings as independent samples. Include permission-denied, timeout, unsupported and unavailable attempts as well as successful requests, manual fallbacks and uploads. Missing request timing or outcome stays unknown; the importer never substitutes report receipt time or infers successful acquisition from a saved pin.

`observed_at` is the recorded end of the controlled stationary observation interval for the pilot trial. `stationary_since` must describe when the phone actually began remaining at the station. A device fix outside that interval is excluded from device error statistics. Photo fix age is evaluated against capture time, even if the stationary trial ended later. `request_started_at` and `request_finished_at` are actual location-request times, not the duration of composing the report. These fields cannot be recovered retrospectively from timestamps that PULSO did not collect.

When extracting a record, the tool copies its ID, issue coordinates and location metadata only. It drops contacts, descriptions, photo URLs, notes and review narratives. New records with explicit [camera request provenance](camera-location-request-provenance-2026-11-06.md) supply their recorded outcome, request interval and first callback time. Records without that optional object retain unknown acquisition history. Reference/reviewer fields remain unset. Fill the actual trial metadata and independently reviewed references before using error results. Keep the original private response as lineage. The importer accepts the usual report JSON and field observation/capture receipt shapes; it rejects missing or incompatible location fields.

With regular phones alone, a pilot can record operational failures, timing when actually logged, manual corrections and reviewed object selection. When independent reference coordinates or their uncertainty are unavailable, leave numeric ground truth unqualified. A second map pin or a second reading from the same phone does not supply the missing reference.

## Commands

Run from the repository root after installing backend requirements. Choose a controlled private directory outside source control/web roots; existing files are never overwritten. Example initialization:

```powershell
$pilotFolder = Join-Path $env:LOCALAPPDATA 'PULSO\location-pilot'
New-Item -ItemType Directory -Path $pilotFolder -Force | Out-Null
& backend/.venv/Scripts/python.exe backend/scripts/audit_location_pilot.py init `
  --pilot-id pilot-01 --output (Join-Path $pilotFolder 'plan-v1.json')
```

Save an already authorized private API record body as `record.json` in that directory, without bearer tokens or request headers. Extract a trial, replacing the timestamp below with the actual observation time and the IDs/environment with the recorded trial context:

```powershell
& backend/.venv/Scripts/python.exe backend/scripts/audit_location_pilot.py trial `
  --input (Join-Path $pilotFolder 'record.json') --kind field_observation `
  --trial-id visit-01 --session-id session-01 --device-id phone-01 `
  --environment across_road --observed-at 'REPLACE-WITH-ACTUAL-ISO-TIME-WITH-OFFSET' `
  --output (Join-Path $pilotFolder 'trial-01.json')
```

Add the measured stationary/request timing and reviewed reference keys to the trial file; add corresponding reference records to the plan. `policy` may remain null or contain three explicit working values: `horizontal_tolerance_m`, `maximum_reference_uncertainty_m`, `maximum_fix_age_s`. They are pilot analysis settings, not approved product defaults.

```powershell
& backend/.venv/Scripts/python.exe backend/scripts/audit_location_pilot.py append `
  --input (Join-Path $pilotFolder 'plan-v1.json') `
  --trial (Join-Path $pilotFolder 'trial-01.json') `
  --output (Join-Path $pilotFolder 'plan-v2.json')
& backend/.venv/Scripts/python.exe backend/scripts/audit_location_pilot.py audit `
  --input (Join-Path $pilotFolder 'plan-v2.json') `
  --output (Join-Path $pilotFolder 'audit-v2.json')
```

All commands work offline and never connect to an application database. Errors do not echo private input values. Files are created exclusively; a failed run preserves an existing file. The inherited directory permissions still matter on Windows. The output omits coordinates but retains pseudonymous trial/device/session/source keys and derived measurements, so it remains private.

## Output and release discipline

The audit contains input/audit SHA-256 fingerprints, the working policy, row-level reasons, a total summary and summaries by device and environment. It reports median, nearest-rank P95 and maximum for qualified distances and recorded request latencies. Session-median issue summaries give each recorded session one aggregate observation; they do not make sessions statistically independent. Reused timestamped fixes on the same phone are explicitly counted and excluded from repeated device/photo error counts. Issue trials are retained; repeated source record IDs are rejected. Copied photographs, renamed records and spoofed client metadata are not detected.

Future timestamps, unqualified references, absent stationary intervals and stale/missing fixes stay explicit. Empty/no-qualified-data summaries return null statistics. Hashes detect content differences; they do not authenticate field evidence. `data_origin` is self-declared. Every output keeps `automatic_location_verification_allowed: false` and `automatic_matching_release_allowed: false`.

Numeric accuracy improvement, any automatic association threshold and any claim of correct-object performance remain dependent on real trials, reference adjudication and acceptance by the designated owners. Subsequent work can use that evidence to improve the existing camera acquisition and matching flow. A learning dataset export or synthetic test is not a substitute for those measurements.

## Implementation and mathematical references

- [GeographicLib package](https://pypi.org/project/geographiclib/) and [maintainer source](https://github.com/geographiclib/geographiclib-python): ellipsoidal geodesic implementation; v2.1 is pinned for reproducibility.
- [Maintainer inverse-geodesic test vectors](https://github.com/geographiclib/geographiclib-python/blob/main/geographiclib/test/test_geodesic.py): one published vector plus a date-line case are exercised by local tests. This verifies integration/units, not phone accuracy.

No database migration, product API, resident/government screen or Figma artifact changed in this increment. Physical-device camera/GPS tests remain outstanding.

## Local verification — 6 November

**55 checks passed** across the new pilot tests, actual private report/field-record extraction, the existing learning-export CLI and report-intelligence regression tests. The run used the guarded disposable PostGIS database. It covers point/reference separation, wrong-object and unknown-review outcomes, uncertainty overlap, rejected references, stale/post-capture timing, reused readings, manual fallback, empty history, invalid coordinates/chronology, exclusive file creation and a full CLI round trip with a deliberately invalid database URL to confirm offline operation.

The integration check exposed the report API's persisted advisory `quality` field; the importer now retains that recognized field while deriving audit timing from original timestamps. The final regression passed after this correction. Python compilation and whitespace checks passed. Earlier offline tests overlap with the final run and are not additive coverage. All geometry, identities, photographs and records used in tests are synthetic; none measure field accuracy or establish a production outcome.
