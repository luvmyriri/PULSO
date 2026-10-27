# Publication workspace and map actions

Status: implemented development behavior, 24 October 2026. This extends documents 16, 18 and 19; it does not approve LGU roles or claim production readiness. The user's Reports UI and annotated runtime captures are the implementation reference. Browser control is disabled, so this change has build, API and integration verification, but no new browser visual-validation claim. No Figma changes were made.

## Publishing news and advisories

The Updates editor now separates the writing canvas from publication settings. Staff choose News, Advisory or Announcement, write a headline and introduction, format headings/bold/lists, and switch between English and Filipino. The resident preview uses the same article component as the public update page and the staff review docket.

Structured details contain issuing office, bilingual introduction, advisory effective period and bilingual resident instructions. Dates are stored with timezone information and shown in the reader's locale. The article keeps office, publication time, affected areas, content and instructions in a readable hierarchy. Optional budget disclosure appears publicly only when supplied. It remains a sourced disclosure, without budget allocation, certification, disbursement or procurement processing.

Audience selection uses a searchable checkbox list and removable selections, replacing the native multiple-selection box. Numeric barangay names and their `Barangay N` aliases are grouped within their recorded district for display. Actual recorded names remain the submitted values. Matching an area does not confirm a report relationship.

## Documents and public release

Staff can attach up to 12 files, each up to 15 MB: PDF, PNG, JPEG, WebP, UTF-8 text, DOCX and XLSX. Content is checked against the extension. Active HTML/SVG uploads and mismatched file types are rejected. The uploader must provide a descriptive title/caption and confirm public clearance. This is a staff review obligation, not automated personal-data detection or malware certification.

PDFs and images display inside the resident article. Text and Office documents have a download link; no conversion to accessible HTML or PDF is claimed. Essential content must also appear in the article. Document controls, loading messages and public headings support English and Filipino. PDF accessibility depends on the supplied source document and browser viewer; the article and full-document link remain alternatives.

Files live outside public upload mounts. Draft previews require authenticated, geographically scoped staff access. File upload/removal locks the record, checks its expected version, returns it to draft and clears approval. The saved attachment metadata is included in the immutable publication revision. Public file access checks the currently released revision, availability, withdrawal and expiry on each request. Removing a document from a correction draft keeps the previous approved document public until the correction is released. Withdrawal blocks future access; downloaded or already opened copies cannot be recalled.

## Automatic private notifications

Resident-visible report timeline changes now enqueue a durable private notice in the same transaction. Claimed ownership takes precedence over the original submitter. Private/internal timeline entries do not enqueue resident notices. Multiple public entries for one report in one transaction share one notice. Retries do not create duplicate notices.

Publication continues to notify owners of reviewed relevant or covered reports. Later report progress can notify other owners connected through the same released, reviewed publication. Suggested/candidate matches are excluded. These notices link to the public city update and reveal no other resident's report number, description or status. Delivery rechecks current ownership, active resident status, released version, expiry and reviewed links. Withdrawn or invalidated publication notices are cancelled.

The API lifespan now processes supported pending in-app events every two seconds; a separate supervised outbox worker remains available. The resident dashboard already refreshes healthy data every 30 seconds. This is polling, not an instantaneous or push-delivery claim. Email, mobile push and SMS broadcasting remain unconfigured. No external messages or actual public updates were sent during verification.

## Map follow-up

City/barangay boundaries, selected-area fill and hover highlights use orange at the user's explicit request. Report status pin colors retain their semantic meanings. The map retains photo pins, clustering, zoom/fit, heatmap, geographic filtering and the address/table alternative.

All reports/Open/Resolved controls replace the repetitive status dropdown. A single Filters panel contains searchable barangays, category and exact status options. Active filters are removable. Count and freshness stay concise; longer explanatory text is in the legend. The development/sample-data note remains visible.

The selected report panel now loads its authoritative docket and supports available verify, approve, request-information, reject and work-order assignment decisions directly. A native confirmation dialog, reasons, latest report version and idempotency key protect each command. Work-order links open the actual selected work order. Read and mutation endpoints enforce recorded district scope. The backend returns available actions from its existing operational role/status rules; the implementation does not grant new City signing authority.

## Verification and limits

- 79 integration checks passed in the guarded disposable PostGIS database, including private/public attachment access, immutable correction behavior, withdrawal, invalid file rejection, editorial dates, owner notices, private-note exclusion, related-report privacy, candidate exclusion, map decision retries and geographic scope.
- Frontend production build passed. Targeted lint passed without errors; existing mixed-export fast-refresh warnings and the existing large bundle warning remain.
- Migration `10c5e7f9a321` was applied to the configured development database. Read-only requests to navigation, publication listing/scope options, report 318's docket and public updates returned HTTP 200. Vite served the map, new stylesheet and map docket module successfully. The missing-stylesheet overlay was corrected.
- The full schema checker reports existing drift outside these publication columns: geographic column definitions, chat ownership constraints/index, document target constraint and work-order priority constraint. The development database was not reset or silently reconciled to the disposable database. This is a separate schema-health follow-up; the migration and checked runtime endpoints work.
- Native PDF rendering, map pointer interaction, 320 px/200% zoom behavior, focus flow, forced colors and final light/dark visual parity still need live browser acceptance. Browser automation is disabled in the current environment. Responsive rules, native dialogs, semantic inputs, table/address alternatives and visible focus styles are implemented, but are not a substitute for those checks.

Technical owner: current implementation task. LGU publication authority, document clearance owner, privacy reviewer and pilot acceptance owners remain unconfirmed as recorded in document 16.
