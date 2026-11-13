# Resident reporting automation — 13 November 2026

Status: implemented at the user's request to remove manual validation checkboxes
and reduce effort in the existing report sequence. Existing visual components and
styles are retained; no Figma work or replacement visual direction is introduced.

## Resulting behavior

- Full report: no issue-pin checkbox, contact-use checkbox or final accuracy declaration checkbox.
- Quick Report: no pin-confirmation checkbox or checkbox-dependent submit gate.
- Optional location editor: no low-accuracy confirmation checkbox or separate saved-location confirmation button.
- A genuine GPS estimate or manually selected/search point is usable without another declaration. The map's display-only center, missing coordinates and invalid ranges do not count as an acquired location. Known outside-city coordinates remain ineligible.
- Address lookup completes in the background. A pending/unavailable address or imprecise GPS estimate does not require a resident to certify it. Precision warnings are informational, and the optional location editor remains available.
- Signed-in residents' available name/email prefill on entering the contact step. Existing draft values and subsequent edits remain editable.
- Contact-use information remains visible. One explicit Submit report action sends the report; no checkbox is automatically checked and no separate consent/accuracy attestation is manufactured.
- Automatic photo checks, provider-failure review paths, necessary content checks, account boundaries, draft recovery and idempotent receipt handling remain in place. Staff validation is unchanged.

## Provenance and authorization

Readiness is distinct from verified location. Automatically collected GPS continues
to serialize as a device estimate with its original accuracy and measurement time;
`issue_pin_confirmed` stays false and `confirmed_at` stays null unless a real manual
selection/confirmation previously occurred. Optional corrected pins retain their
own source and the separate device fix. No backend authorization or schema change
is needed. Browser and Android use the same resident React flow.

## Verification

- 82 client helper/regression checks passed, including new tests for unchecked GPS,
  unavailable addresses, invalid/default points, preserved uncertainty, contact checks
  without consent flags, and bot-field rejection.
- Actual full-wizard and Quick Report components submitted synthetic reports in local
  isolated fixtures, with English/light desktop and Filipino/dark 320 px coverage.
  No validation checkbox was present; account prefill, one-click final submission,
  sensor uncertainty and false human-confirmation flags were verified in the payload.
- RELogic photo-screening browser regressions passed for provider outage, suspected
  screen photos, scope uncertainty, superseded requests and 320 px/200% reflow.
- Focused lint has no errors; existing warnings remain. Web and signed Android build
  verification are recorded with the published release below. Screenshots contain
  synthetic fixture data and remain in ignored scratch storage.

Physical-phone acceptance and field GPS accuracy remain separate work. This change
does not claim exact sensor accuracy, automatic infrastructure ownership verification,
or an evaluated predictive-maintenance model.

## Published release

- Site and landing QR: https://srv1857115.hstgr.cloud
- Android package: **2.4.22**, build **23**, using the same persistent signing identity as 2.4.21. Installed copies need this APK update to receive the new bundled resident flow.
- Release: `/opt/pulso/releases/20261113-6a8b5838f8-resident-automation-v1`.
- Source: commit `fff1c41e` plus the resident-automation working-tree overlay; 959 allowlisted source files. Source manifest SHA-256: `6a8b5838f8fd82cb9c30cf0dcc5031640ea6e698f32b0cc2ba64e319aaf3b97c`. Archive SHA-256: `3dd1d1dc7cf6bf9837608c64197b4a7c8f359d435ddc037b0b63b846295372a0`. Native version/assets are build-generated; local version properties were advanced to match publication afterwards.
- APK: **51,018,556 bytes**, SHA-256 `6c7449c391cc893c9d340373b038db2ecc7ba8fae3d72bb2a616d32ec9278746`.
- Signer certificate SHA-256 remains `4f18947582ad1246813567b152d1cd5a2d0591db5c63c5deee45a9c6e665986a`; the signature and bundled HTTPS-only/non-debugging configuration were verified before publication.
- Backup before activation: `/opt/pulso/backups/20261113T045824Z`. Production schema remains `31c5d6e7f8a9`; no migration, account/report import or database reset is required.
- Application rollback images: `pulso-api:rollback-automation`, `pulso-web:rollback-automation`, `pulso-api:rollback-automation-worker`; prior release and owner-only environment copies are retained. Keep the current database and existing APK files on rollback. Shared signing files remain protected outside source control.

Post-activation verification passed: the public package's complete downloaded bytes
matched the published size and SHA-256, both rendered landing/dialog QR codes decoded
to the stable APK endpoint, native-origin CORS passed, and anonymous government data
remained protected (401). A synthetic invalid raster was rejected (422) before analysis.
The actual web/API/database containers are healthy; existing civic record IDs were
preserved and the shared edge/JVD preflight passed. Licensed hazards remain disabled
and predictive scoring logs an informational unavailable state. No real report or
account was submitted for these checks.
