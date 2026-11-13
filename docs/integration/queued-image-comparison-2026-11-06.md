# Queued image-assisted observation comparison

**Status:** observed backend/API and worker implementation, local only and disabled by default; not deployed. **Version:** 1. **Owner:** PULSO development. **Last validated:** 6 November 2026. Provider-disclosure governance, actual model/account availability, representative matching evaluation and automatic-association release remain pending. No real photo, account or provider request was used during development verification.

## Job and boundary

An authorized report reviewer can request visual hints for a pair of recorded observations without making resident intake wait for Gemini. The request creates a durable database job. A separately operated Python worker checks the job, prepares local photo derivatives and calls the configured Google Gemini client. Completion stores schema-checked advisory hints, provider/model provenance and the original evidence checksums.

The output separates **asset appearance** (`possibly_same`, `visibly_different`, `uncertain`) from **visible defects** (`visually_consistent`, `different_visible_defects`, `uncertain`). It carries short visible matches/differences and explicit limitations. It never establishes an incident episode, exact location, ownership, verified identity or completed repair. There is no calibrated confidence percentage. An unusable image must produce uncertainty; decisive hints require supporting visible details. Invalid, contradictory or extra model fields fail instead of becoming advice.

AI jobs do not change tickets, statuses, categories, reviewer ownership, concern membership or the first-party human pair-review labels. They are not exported as training labels. Every projected result carries `review_required=true`, `membership_changed=false` and `training_release_eligible=false`. A human judgment and a concern association remain separately authorized actions. This is not yet an embedding search, evaluated identity model or automatic deduplication release.

## Authorized API

`POST /api/report-intelligence/reports/{report_id}/observations/{observation_id}/pairs/{target_id}/analysis` requires `Idempotency-Key` and:

```json
{
  "expected_version": 2,
  "expected_target_version": 2,
  "expected_concern_version": 1,
  "expected_target_concern_version": 1,
  "photos_reviewed_for_provider": true
}
```

These version numbers are SAMPLE syntax, not operational values; fetch the current comparison first. The source/target versions retain path orientation. Canonical image A/B order follows the smaller/larger observation ID, explicitly returned as `image_a_observation_id` and `image_b_observation_id`.

The caller must be active staff with report-review capability, access to both reports, and ownership of both review decisions or assignment authority. Both photos must be reviewed for the proposed provider disclosure. This acknowledgment is a recorded staff assertion, not proof of automatic face/contact redaction or an independent privacy approval. The server validates source and target report/concern versions and locally reads/validates both recorded photos before committing a job. Residents and clerks cannot request or inspect these jobs through this API.

The 202 response is a queued-job receipt, not completed analysis. Identical operation-key retries return the same job, including after it becomes terminal; changed input with the same key receives 409. Ordered report locks serialize concurrent enqueues. A second active job for the same canonical pair is refused with an authorized reference to the existing job. The shared pending queue is capped at 200; overflow is refused. There is no slow provider call in this enqueue transaction. Report intake does not invoke this comparison worker; the older synchronous intake category-analysis path is unchanged by this increment.

`GET` on the same `/analysis` path reads at most 10 latest jobs after rechecking review capability and access to both reports, in a read-only repeatable-read snapshot. It returns the feature flag, job status, evidence-context currency, checksum/model/prompt/derivative versions, safe failure codes and results. `enabled` is the deployment flag, not a provider-health claim. `context_current` compares current record metadata/versions/digests; original photo bytes are rechecked at dispatch and return, not on every history poll. A completed result can remain visible as historical advice with `context_current=false`.

## Photo handling and provider inputs

The service reads only a single validated filename under the configured local report-upload root. Remote URLs, traversal, query strings, unsupported formats and symlink/out-of-root references are refused. It does not fetch arbitrary URLs or accept new client-supplied image bytes for this command. Each source is bounded to 10 MiB, 16 million decoded pixels and one static JPEG/PNG/WebP frame. Missing, corrupt, animated or larger images leave manual comparison available rather than losing the report.

The original file remains unchanged. The derivative applies recorded EXIF orientation, composites onto an RGB image and encodes a metadata-free JPEG of at most 1600×1600 pixels at quality 85. Full original and derivative SHA-256 checksums are retained. This is an analysis derivative, not a filtered replacement for resident evidence. The recipe is versioned; a changed library/recipe that produces different bytes cannot silently reuse the queued evidence fingerprint.

Only the two derivatives and allow-listed infrastructure category focuses are supplied to Gemini. The service does not add report descriptions, contact fields, addresses, coordinates, photo metadata, human labels, incident IDs or database tools to the prompt. **Visible personal information inside the pixels is not automatically removed.** Staff/provider disclosure governance remains necessary before enabling actual use. If several objects or defects make the category focus ambiguous, the prompt instructs the model to abstain; that behavior still needs real-world evaluation.

The fixed system instruction treats images and any depicted instructions as untrusted evidence. No model tools or action executor are offered. JSON is semantically validated with Pydantic after schema-constrained generation. Unsupported contact/link/verified-coordinate prose patterns are rejected, but this is not a comprehensive personal-data detector. Raw provider output and exception details are not stored or returned on failure. Typed output still does not guarantee factual visual claims.

## Worker and recovery behavior

`backend/scripts/process_pair_analysis.py` processes a bounded batch (`--limit` 1–20, default 1). It uses the application's existing DB session configuration and requires an explicit absolute `--upload-root` matching the API runtime. It refuses missing/relative/nonexistent directories instead of guessing from the shell working directory. It is an operator tool, not an automatically installed daemon or scheduled task. This development did not run it against the configured application database.

```powershell
# After the reviewed migration/configuration workflow, in the intended runtime.
# Replace the SAMPLE directory below with the API's actual absolute upload root:
backend/.venv/Scripts/python.exe backend/scripts/process_pair_analysis.py --limit 1 --upload-root C:/PulsoRuntime/backend/uploads/reports
```

Configuration is documented in `backend/.env.example`. `PULSO_PAIR_ANALYSIS_ENABLED` defaults to false. `PULSO_PAIR_ANALYSIS_MODEL` optionally overrides the existing configured Gemini model; its value is frozen in the queued job. The current global `AI_DISABLED` switch remains authoritative. Credentials, serving region and actual model availability remain deployment responsibilities, not proven by this feature flag.

Workers claim queued jobs using PostgreSQL row locks with `SKIP LOCKED`, commit a 120-second lease, and release transactions before provider work. Access, versions, observation-text digests, original/derivative hashes and recipe/prompt compatibility are checked again before dispatch. They are rechecked after generation; changed evidence or revoked access prevents the response becoming current advice. Source scope and authorization are enforced at dispatch and history reads; a permission change during a call cannot retract already transmitted pixels.

A separate PostgreSQL advisory lock serializes daily call reservations across workers. `PULSO_PAIR_ANALYSIS_DAILY_CAP` defaults to 20 and accepts 0–200; the accounting day is UTC. Failed/uncertain reserved calls consume capacity conservatively. This is a hard reservation cap for this comparison pipeline, not a claimed global cross-process budget for every legacy AI feature. Existing Gemini rate/budget checks also apply. Missing configuration and disabled providers fail before a call reservation.

The adapter requests a 30-second SDK HTTP timeout, one total attempt and bounded output. This timeout is not an end-to-end latency guarantee. The 120-second lease is independent. An expired lease is exposed on reads; when a worker next claims work it marks expired runs `worker_interrupted_outcome_unknown`, without automatically resending them. Late completion cannot overwrite a terminal/lost/expired lease. Jobs permit at most one dispatch attempt. Any operator/user request for another job after a terminal failure is an explicit new command that can incur a new charge; there is no automatic retry chain.

## State contract

| State | Meaning and available recovery |
| --- | --- |
| Disabled/unconfigured | No completed comparison claim; keep manual review. |
| Queued | Durable request received; provider not yet called. Requires an operated worker. |
| Running | Worker lease held; call may have started only after a recorded reservation. |
| Lease expired | Worker progress is uncertain; never assume the images were not transmitted. A later worker pass terminates the run without resend. |
| Completed | Schema-checked visual hints with context/model provenance; human review remains required. |
| Failed | Safe failure code; no generated fallback match, ETA or location. |
| Cancelled | Access changed before/after work; no current advice produced. |
| Stale completed context | Preserve historical output and mark the record context changed; do not use it as current identity evidence. |

The current comparison web UI is unchanged by this backend increment. Its next implementation needs an explicit provider-disclosure request, queued/running/interrupted/failed/stale states and separately labeled visual hints. It must retain manual review and cannot convert AI output directly into a human label or membership change. No new Figma artifact, frontend screen or provider acceptance result is claimed here.

## Dependencies and source verification

`google-genai` is pinned to the locally installed/tested **2.32.0** rather than the previous open-ended minimum. No SDK installation/upgrade was performed. This is not a complete transitive dependency lock or a claim that this SDK/model is optimal for PULSO.

Google's [SDK documentation](https://googleapis.github.io/python-genai/#pydantic-model-schema-support) documents Pydantic response schemas and inline image bytes. Installed SDK field documentation confirms that HTTP timeout is in milliseconds and one total attempt means no retry. Offline tests exercise the real SDK request serializer and mocked HTTP responses, including 429. They verify wire construction and retry settings, not actual Google account/model compatibility or visual accuracy.

## Migration and validation

Migration `29a3b4c5d6e7` follows `28f2a3b4c5d6`, adding durable pair image jobs, restrictive provenance foreign keys, canonical pair ordering, valid job states and a maximum-one-attempt constraint. There is no image/label backfill. Schema/bootstrap/CI/disposable-test references follow this head. Downgrade drops the new jobs; operational rollback needs retained records/backup review.

Verification: the broader selected backend regression run passed **88 checks**, covering image/job behavior plus pair reviews, intake/intelligence, AI boundaries, concern-learning export and field capture. The adapter's subsequent offline suite passed **20 checks**, including two additional real-SDK/mock-HTTP serializer tests; these runs overlap and are not additive counts. Python compilation and scoped whitespace checks passed. The worker's help path was checked without processing any application job. Existing dependency/deprecation warnings remain.

On the named disposable local PostGIS database only, downgrade to `28f2a3b4c5d6` and re-upgrade to `29a3b4c5d6e7` each matched the respective normalized schema inventory. The configured application/production database was unchanged. The final focused image/job rerun passed **34 checks**, including expired-lease projection and both real-SDK/mock-HTTP checks (overlaps the above runs). Four additional CLI checks cover explicit-root forwarding and refusal of missing/relative roots or invalid bounds using a mocked worker. No live Google call, billed request, physical phone trial, matching benchmark, frontend browser integration or deployment is claimed.

The subsequent [staff image-assistance UI](image-assistance-ui-2026-11-06.md) connects request/disclosure, job status, original-command recovery and advisory results to this API. Genuine same-object/different-angle versus adjacent-lookalike trials and evaluated retrieval/association behavior remain pending. Exact positioning, independently reviewed inventory identity, authentic completion/recurrence outcomes, LightGBM ETA/maintenance validation and mobile parity remain part of the active PULSO objective.
