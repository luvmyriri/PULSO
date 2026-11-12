# Resident and Android update integration — 12 November 2026

**Status:** Integrated locally; no push, deployment, APK publication or physical-device validation performed. This is a source-integration record, not implementation of the proposed PULSO RELogic phase.

## Source and recovery

- Fetched `origin/FinalIntegratedMarcPulso-deployment` at `d351f442` (10 November 2026), bringing in 26 commits not present in the previous local `e789baca` history.
- Active integration branch: `codex/integrate-resident-android-2026-11-12`.
- Merge commit: `e16da27e`. The five existing local-history commits are retained in its ancestry.
- Local working changes were checkpointed before integration in stash `3956771dba969c31e8f690eacd104f5f59b608df`, also pinned at `refs/pulso-backups/resident-android-sync-20261112`. The checkpoint was applied without dropping it. Existing local government/report-intelligence changes remain working changes rather than being silently committed or pushed.
- The ignored `scratch/resident-android-sync-2026-11-12/before-manifest.json` records the original 260 changed/new file hashes. Recovery verification found no missing original files; 184 previously untracked files were restored, and local-only files matched their checkpoint content after line-ending normalization. RELogic documentation and dashboard assets were preserved.

## Imported capabilities

The resident React application now also contains the Capacitor Android wrapper in [frontend/android](../../frontend/android/README.md). Upstream removed the Flutter application; local generated Flutter/SDK remnants are retained and ignored rather than deleted. Android uses the shared resident reporting, capture, tracking, settings and draft code.

Imported changes include native landing/onboarding, system bars and Back handling, resident search and navigation, loading screens, camera presentation, captured-point address handling, native report-photo transport and map previews, notification preferences, APK update endpoints, and authentication/recovery corrections. Their presence in source does not prove every feature on a physical device.

Upstream also contained a `PULSO-android` gitlink pointing into the same repository without a `.gitmodules` mapping. Commit `469d2c5f` removes that orphan index entry; the actual Android project under `frontend/android` is retained.

## Conflict reconciliation

Thirteen files conflicted when restoring the local checkpoint. Resolutions combine the following behaviors:

- Retain local multi-observation report intake, capture/location provenance, concern matching, reviewer availability, government authorization, and database head `31c5d6e7f8a9`.
- Preserve reviewed public-thumbnail authorization and metadata-free previews instead of reverting to upstream's unrestricted file thumbnail handler. Retain Android-compatible image response headers.
- Combine native camera/Back/safe-area behavior with the local dialog, focus, cancellation and bounded location-sampling behavior.
- Keep the original-photo, account-scoped draft and idempotent receipt paths, rather than reinstating the older JSON-only draft mechanism. Native and web report-header navigation awaits the existing draft flush and preserves the current page on save failure.
- Combine upstream address lookup at the actual selected point with the local original acquisition timestamp and explicit incident-pin confirmation. Address lookup does not establish location precision.
- Keep both sets of English/Filipino translation keys and local AI usage counters.
- Preserve the new resident bell-only mobile badge convention while retaining separate civic-update counting elsewhere.
- Retain upstream's connected-database guard and bootstrap head verification alongside the current local schema inventory and CI checks.

No new report lifecycle, responsibility exclusion rule, model threshold or automatic rejection policy was introduced. See [PULSO RELogic](../government-system-proposal/47-pulso-relogic-development-plan-2026-11-12.md) for that proposed work.

## Verification

- Production web build passed; Android-mode web assets also built successfully with a synthetic API origin for isolated browser tests. The final web output is restored to the normal production configuration after those tests.
- **98 frontend tests passed**, covering native media/update helpers, resident navigation and report rendering, capture provenance, drafts, intake and government permission helpers.
- **87 focused backend tests passed** in the dedicated disposable intelligence PostGIS database, covering intake, matching, reviewer availability, capture metadata, protected media/public projections, Android update endpoints, authentication recovery, address handling and receipts.
- The broader workflow run passed **132 government/resident checks** and initially exposed one inconsistent expectation in a separate 64-case standalone reporting harness. That harness still implemented the obsolete 15 m proximity rejection even though its local assertion already required independent tickets. Removing that test-only gate produced **64/64 passing standalone checks** on rerun. The product intake's independent-ticket behavior was retained. The standalone harness uses its own in-memory app and is not proof of the real API by itself.
- Focused merged-file lint completed without errors. Python syntax and translation JSON parsed successfully. No unresolved merge entries or conflict markers remained.
- Browser checks passed for web/native-byte map photo pins, slow rerenders, correct fallback evidence and source refresh.
- Compiled Android-mode browser checks passed in light English and dark Filipino at mobile widths for native report photos, localized unavailable evidence, bell-only badges, compact map details, enlarged-text behavior, transparent guest headers and draft-safe header navigation to sign-in. API/native responses were synthetic; no real report or account was changed. An initial run against the ordinary web build used the wrong API configuration for this native-specific fixture; the Android-mode rerun passed.
- Local API health, root and government overview URLs returned HTTP 200 after restarting only this workspace's frontend/API processes. HTTP checks establish availability, not full end-to-end user acceptance.

## Runtime and limits

The frontend runs at `http://127.0.0.1:5173`; the configured backend runs at `http://127.0.0.1:33159`. The temporary compiled preview on port 5176 is stopped after browser checks. The application database is not reset or migrated by this integration; regression data resets are restricted to the existing named disposable test databases.

**Existing application schema drift remains open.** The configured application database reports revision `31c5d6e7f8a9`, but read-only normalized comparison differs from its expected inventory: three column definitions (`agent_locations.location_geog`, `reports.location_geog`, `chat_conversations.owner_type`), chat ownership constraints/index, and checks on document targets/work-order priority. Running the original checkpoint's pre-integration checker against the unchanged inventory reproduced the same differences. These differences therefore were not introduced by the imported checker/source merge. Test databases match the checked-in inventory; passing their tests does not certify the drifted application database. Reconciliation needs a separate data-preserving migration review, not an automatic reset or downgrade during this pull.

An APK was not built. This machine exposes Android SDK platforms 34 and 36, while the imported project requires compile SDK 37, and no configured Java command or standard Android Studio bundled JDK was found. Use the [Android setup instructions](../../frontend/android/README.md) before native compilation. No signing, installation, device camera/GPS trial or published app-update artifact is claimed.

The build retains its existing large-bundle warning. Private-media consumer migration and measured phone accuracy remain open work; merging upstream image handling does not close those product gaps. The backup checkpoint and original branch remain available locally.
