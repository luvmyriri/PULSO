# Developer synchronization — 13 November 2026

This handoff identifies the finalized source snapshot prepared for the team on
`codex/integrate-resident-android-2026-11-12`. It retains both local government/backend
history and resident/Android updates imported from `FinalIntegratedMarcPulso-deployment`
at `d351f442`. The existing shared branches are not rewritten.

## Included work

- Government overview, jurisdiction map, role-aware navigation and server-side access checks.
- Independent report tickets with multiple categories and separately reviewed concern associations.
- Reviewer availability, bounded automatic assignment, manual reassignment and report ownership.
- First-party field observations, private evidence, provenance, comparison assistance and immutable assessments.
- Capture/location metadata, resident draft recovery, safe photo handling and bilingual screening guidance.
- Frozen learning/checkpoint exports and offline baseline/LightGBM experiments, with synthetic results explicitly marked. No evaluated live ETA or approved predictive model is supplied.
- RELogic 0A advisory photo screening with provider-failure fallback and staff-review audit records. It does not certify public ownership, exact GPS accuracy or screen-photo authenticity.
- Signed public Android test build 2.4.21 (code 22), landing QR downloads, APK distribution and deployment safeguards.
- Migrations 24–31, schema manifests, regression checks, fixtures and implementation/deployment records.

The working-tree backend remains the integration baseline. Do not replace it with
an older branch or copy a local database over the deployed database.

## Get this snapshot

Preserve any uncommitted work first, then run:

```bash
git fetch origin
git switch codex/integrate-resident-android-2026-11-12
git pull --ff-only
```

If the branch is new locally, Git can create its tracking branch from the matching
remote branch. Developers continuing work on another branch can merge this integration
branch through their normal review workflow; do not force-push over teammates' commits.

Run `npm ci` in `frontend` and install `backend/requirements.txt` into the backend's
own virtual environment. Configure machine-specific database/provider settings locally;
no production credentials or Android signing files are distributed through Git.
For an existing database, back it up and run `python -m alembic upgrade head` from
`backend` using the intended connection. Expected schema head is `31c5d6e7f8a9`.
Use the repository's schema bootstrap for a fresh development database. Do not reset
an existing database or use ORM table creation to bypass migrations. The integration
record documents the pre-existing local chat-schema drift; it was not copied to production.

The runtime `.ai_usage.json` counter is no longer tracked. Existing local files remain
in place and ignored. APKs, signing keys, environment secrets, uploads, caches, local
databases and scratch outputs remain outside the commit.

## Deployed version and verification limits

The public [site](https://srv1857115.hstgr.cloud) and
[Android installer](https://srv1857115.hstgr.cloud/api/mobile/app-updates/download)
are documented in [the production release record](production-relogic-android-release-2026-11-12.md).
The release record identifies the exact source manifest, configuration overlay, backup,
APK digest, signer and rollback path; later Git bookkeeping is not a second deployment.

Verification evidence includes 75 focused RELogic/backend checks, 156 government
regressions, client checks, production web/native builds and actual public QR/APK
verification. The synchronization pass adds focused Android/update tests, frontend
helper tests, a source build and staged secret/whitespace checks. Test results establish
only the tested contracts. Physical-phone installation, camera/GPS, native CAPTCHA/
Google authentication and field accuracy remain pending. Predictive scoring remains
unavailable until an approved trained artifact is installed; licensed hazard ingestion
is disabled. No production report/account submissions were made for release verification.
