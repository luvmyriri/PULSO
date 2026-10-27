# Operational settings and live UI verification

Status: observed development implementation, 26 October 2026. Continues documents 16 and 25. This is a tested subset of the government workspace; the overall completion objective remains active.

## Working controls

Settings now uses the shared Reports workspace, table, record panel and native confirmation dialog. Automation and AI is a separate administration section. Configuration changes require the relevant server permission, citywide jurisdiction for global controls, an explicit reason and the expected saved version. Setting, version history and audit event commit together. Concurrent saves reject a stale version. Identical saves do not manufacture another revision.

| Control | Implemented behavior |
|---|---|
| Automatic report review assignment | Pauses or resumes actual initial-review routing. Manual assignment remains available. The existing periodic worker processes waiting reports in bounded batches after resumption. |
| Initial report review targets | Optional P4–P5 and other-report hour targets measured from submission while initial review is pending. Requires an authorizing reference. My work displays the resulting date and overdue state. These are internal targets, not statutory deadlines or emergency dispatch approval. |
| Report category suggestions | Disables actual provider calls, or permits category suggestions with optional advisory urgency. Human severity grades remain separate. Provider failure leaves manual classification available without an invented category, urgency or confidence score. |
| Maintenance review support | Information about the existing asset/history workflow; no fake activation switch. |
| Flood and drainage forecasting | Not connected. No weather or sensor provider was added. |
| Document retention | Managed per document under the existing records controls. No default seven-year disposal policy is invented. |
| Activity history | History is recorded. Historical cryptographic integrity verification remains unconfigured. |

GET requests no longer insert policy defaults. Existing routing/AI behavior is identified as an application default; unsupported or invalid saved values require review and fail closed. Legacy seeded response targets do not become deadlines until explicitly reconfirmed with a reference. Runtime checks after live navigation still found **zero settings and zero setting-history rows** in the configured development database.

## Shared UI corrections and evidence

The live browser check found an existing global input rule suppressing the focus outline. The shared government styles now restore a visible three-pixel outline, including inside dialogs. Dialog cleanup closes the native modal and returns focus to the originating control or available record heading. Table headings wrap within their available space.

Observed checks: desktop light/dark settings, a centered dialog, 320 × 720 px dialog reflow without horizontal page overflow, keyboard Tab focus, and Escape dismissal returning to Configure. Evidence:

- [Light settings](../ui-ux-audit/government-completion-2026-10-26/settings-desktop-light.png)
- [Dark settings](../ui-ux-audit/government-completion-2026-10-26/settings-desktop-dark.png)
- [Desktop dialog with visible focus](../ui-ux-audit/government-completion-2026-10-26/settings-dialog-desktop.png)
- [320 px dialog](../ui-ux-audit/government-completion-2026-10-26/settings-dialog-mobile.png)

No operational configuration was saved through the live browser. No Figma write or new Figma validation is claimed: this pass implements the user's chosen Reports primitives. True 200% browser zoom, forced colors, screen-reader review and all-route accessibility certification remain outstanding.

## Verification and dependencies

The guarded disposable PostGIS suite passed **155 checks** before the resident-administration follow-up. This includes 18 operational-settings cases covering validation, global scope, transaction rollback, stale/concurrent saves, routing, seeded-target handling, provider fallback and the actual My work response schema. The later combined run is recorded in document 27. Targeted frontend lint has no errors; shared component exports retain two Fast Refresh warnings. Production build passes with the existing large-bundle warning.

LGU authorization references, service commitments, records schedules, model evaluation and publishing authority still require their responsible owners. External notification delivery and the project coordination workflow remain separate outstanding work.

Implementation owner: repository implementation work. Version: 1. Last validated: 26 October 2026. Changes remain in the shared working tree; no deployment is claimed.
