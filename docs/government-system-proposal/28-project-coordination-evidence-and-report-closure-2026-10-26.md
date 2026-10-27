# Project coordination, evidence and report closure

Status: observed development implementation, 26 October 2026. Continues document 16 and the completion ledger. The overall government-side objective remains active. The implemented coordination states and default role delegations are pilot behavior requiring LGU operational acceptance; this document does not establish official signing authority.

## Replaced behavior

The retained project screen had six display groups over thirteen persisted stages, budget-clearance actions, decorative pipeline metrics, certificate shortcuts, and a fallback that created a local project after an API failure. The current `/gov/projects` route uses the shared Reports workspace, real server pagination, queues, selected record, activity, native confirmations and actual errors. It does not manufacture a project or decision after a failed request.

Work orders and Projects have shared, server-authorized sibling navigation. Historical links remain accessible. The one existing local project and its original stage were preserved; the additive migration does not advance, reopen or certify it. Staff can explicitly begin a new coordination review on an eligible historical record, with the former stage retained as history. Historical completed records are not silently reopened.

## Operational flow

```text
Intake → Site assessment → Engineering planning → Ready for work
       → Work in progress → For completion review → Completed
```

| Decision | Saved requirements and result |
|---|---|
| Open coordination | Actual requesting party, scope, canonical barangay, description and reason; optional eligible engineering owner with a future review date |
| Assign owner | Active engineering employee covering the district, next review and reason; private staff notice and My work entry |
| Record external dependency | What is needed, responsible external office, named follow-up owner, next review, optional existing reference and reason |
| Record external response | Pending dependency on this project, response reference, reason and recorded resolution time |
| Advance | Named eligible owner, no pending dependencies, future next review; linked planning record before Ready for work, work authorization before Work in progress, completion report before submission |
| Review completion | Independent eligible reviewer, linked completion report and inspection report, no pending dependencies or open linked work orders; accept or return for work with findings |
| Record official certificate | Completed, independently reviewed project; actual uploaded certificate, reference, issuing office and reason. PULSO records an external certificate and does not issue one |
| Verify report resolution | Completed project, independent verifier, reviewed source report and current report version, explicit confirmation that the reported issue was addressed, no other open linked work/projects, and a decision reason |

All project commands lock the project, recheck administrative session authority, validate the expected coordination version, and save state, activity and audit in one transaction. A stale command returns conflict. Assignment and relevant resident notices commit with the record. Failure does not leave a locally successful state.

Project completion and certificate recording do not automatically resolve the source report. The separate final verification action resolves it explicitly and uses the normal private report-notification path. Final decisions remain visible in My work after project completion. Reports displays authorized related-project links through the shared docket used by table, map and full record views.

## Work referrals

The work-order action creates a linked project with a reason and current work timestamp. It locks the work row, is safe to retry without creating another project, and commits the referral and link together. It retains the work status rather than cancelling the job as a side effect. The source report and asset relationship are preserved.

Verified field work does not resolve a report while related project coordination remains open. The old automatic project-stage advancement was removed; project evidence and independent review govern completion. Existing budget/procurement mutation paths stay outside PULSO. New project records have no invented cost, bidding modality or construction category. Historical financial information is retained under its existing access rules.

## Evidence and authority

Project evidence uses the existing private document store with actual upload, file retrieval and fingerprints. PDF/image preview is available through authenticated file bytes; other supported types retain original-file download. Files are tied to the exact project and required evidence type. Missing original files block evidence-dependent commands. Uploading a document does not approve it.

Scoped `projects:evidence_view` and `projects:evidence_upload` permissions support engineering work without granting access to the whole records registry. Explicit project capability lists override role defaults. Confidential files retain the existing records authorization requirements. Residents and staff outside the permitted project scope cannot retrieve these private bytes. Global Records permissions remain separate. New coordination document types use **retention review required**, without inventing a disposal deadline or automatically imposing legal hold.

Project role defaults distinguish coordination, inspection and certificate-recording authority. Platform administration alone does not supply independent engineering completion or certificate-recording delegation. Actual LGU delegations must be confirmed and configured by the responsible administrator. Assignment does not claim employee capacity or availability beyond active status and recorded district coverage.

Barangay options normalize numeric/“Barangay” aliases within the same recorded district and sort naturally. Existing report foreign keys are not rewritten. Linking a source report checks the same normalized barangay and district; conflicting/unknown locations are rejected. This is lookup normalization, not a certified change to jurisdiction.

## Compatibility and API coverage

The six new project-workspace endpoints cover options, paginated listing, creation, record detail, activity history and commands. Retained project edit/advance/certificate aliases delegate to the governed metadata/command path with version, evidence and permission checks. The retained work-order promotion route uses the atomic referral path. Legacy public-budget or automatic certificate behavior is not restored.

The reproducible selected-family inventory now contains **224 registered routes**, with no duplicate method/path registrations. This number is an inspection aid, not endpoint-completion certification.

Migration `15badcf4f876` adds coordination versions, provenance, completion references and the external-dependency table. It was applied successfully to the disposable database and configured local development database. Bootstrap and schema guards now expect this head.

## Verification and limits

- Combined guarded disposable PostGIS suite: **189 passed**. This includes 19 project cases covering the complete flow, independent review, references, missing/cross-project files, explicit denial, scope, concurrency, rollback, source-report notifications, canonical area aliases, referrals and legacy commands.
- After adding final My work/docket links, a focused run passed **20 checks**: all project cases and the existing authoritative map/table docket regression. Two old unit tests using incomplete database stubs were replaced with actual transactional API checks for the same resident-status and certificate-boundary requirements.
- Targeted frontend lint: no errors. Production build passes with the existing large-bundle warning. All-route performance work remains open.
- Live project table/detail in light and dark, historical-state preservation, normalized area options, creation-form keyboard focus, Escape focus return, and 320 px reflow checked. At 320 × 720 px, the page width was 320 px and dialog width 288 px; its long form scrolls inside a 688 px dialog. Three-pixel keyboard focus was visible.
- The configured application still has one historical project, zero active coordination records, zero dependencies, one historical project-document row and zero project-coordination audit events after browser checks. No project, referral, document, certificate or report-resolution mutation was submitted in that database. Persisted mutation tests used the disposable database.
- The existing `pulso_use_case_diagram_1.pdf` document row points to a missing original file. No matching local filename was found in the repository. The endpoint returns 404; the preview distinguishes missing-file recovery from authorization/network failure. The record was retained. Recovery needs the original or an approved backup; no replacement was fabricated. Successful private-file retrieval is covered by integration tests, but this historical PDF cannot provide a positive live PDF-render validation.
- Screenshots: [dark project record](../ui-ux-audit/government-completion-2026-10-26/projects-desktop-dark.png), [light project record](../ui-ux-audit/government-completion-2026-10-26/projects-desktop-light.png), [320 px creation form](../ui-ux-audit/government-completion-2026-10-26/project-create-mobile.png). These use existing local development records and are not verified City data.
- The observed [missing-document recovery state](../ui-ux-audit/government-completion-2026-10-26/project-document-unavailable.png) preserves the saved metadata and reports the unavailable original explicitly.

No new Figma inspection or write is claimed; the composition reuses the user's chosen Reports implementation. True 200% zoom, forced colors, screen-reader review, a positive live PDF preview with available source bytes and all-route accessibility acceptance remain outstanding.

## Remaining government completion work

The project API supports a source-report relationship; a direct report-to-project creation shortcut and the retained planning/design/survey interfaces still need reconciliation. Public-update/report email and phone delivery, notification preferences/retries, remaining legacy financial-read/PII/scope paths, records lifecycle and the final full role/workflow acceptance audit remain open. The missing historical PDF is a data-recovery dependency. None of these gaps are counted as completed by this pass.

Implementation owner: repository implementation work. Operational approvers: nominated LGU engineering, communications, administration, records and privacy owners, still to be confirmed. Version: 1. Last validated: 26 October 2026. Changes remain in the working tree; no commit or deployment is claimed.
