# Shared header, selection and queue scrolling

Status: observed repository implementation, 27 October 2026. This addresses the six browser comments about Reports, Work orders, Predictive maintenance and the missing BI dashboard. The BI dashboard has **not** been coded; its separate [proposal is document 31](31-government-bi-dashboard-proposal-2026-10-27.md).

## Implemented behavior

**Reports header.** Reports now uses the same `GovPageHeader` component as the shared government workspace. It keeps the Reports title, task description, account, theme and notification placement, removing the older Home / Citizen Services breadcrumb header. The mobile navigation breakpoint now matches the shared workspace. Search, scope controls and table/map switching remain available.

**Full-row opening.** Selectable shared tables delegate ordinary cell clicks to the record's existing native button. This covers Work orders, Predictive maintenance, Projects, infrastructure and other queues using `GovTable` with `onSelect`. The row remains a semantic table row. Links, buttons, checkboxes, labels, editable fields and other interactive controls retain their own actions, and copying selected text does not navigate. Before opening through an ordinary cell, the native record button receives focus without scrolling, providing a return target. Read-only tables do not become clickable.

**Independent queue/detail scrolling.** At wide operational viewports (at least 1280 px wide and 600 px high), shared record layouts fill the remaining workspace height. The table body and docket content scroll independently; table headers, pagination, record header and available action footer remain outside those scrolling bodies. The queue position is retained while the employee investigates the record. Nested evidence/reference tables remain within the docket's content region. Narrow and short layouts retain the existing single-pane page flow rather than compressing two independently scrolling columns into an unusable space.

The Reports docket now sizes itself to its available container rather than a hard-coded viewport subtraction, including when the selection toolbar is open. Its queue and record continue to scroll separately on wide screens.

**Report selection.** The unexplained circles are replaced by labeled native checkboxes. Select all applies to filtered reports and exposes a mixed state when only some are selected. Selection is pruned when records leave the filtered results; hidden reports cannot remain silently selected.

The visible selection toolbar offers:

- Review report / Review selected, with previous/next controls through a multi-report selection.
- View on map, preserving the selected in-scope records and active report.
- Clear selection.
- For one selected report, server-permitted Assign reviewer, Assess severity and Create work order shortcuts, when applicable.

Single-report shortcuts reopen the existing docket and its governed form. They load fresh authorization and current record data before opening the requested action. The underlying commands, reasons, version checks, eligible staff, confirmations and audit behavior remain authoritative. Selecting multiple reports does not silently verify, reject, grade or assign them as a batch. Each report's decision remains reviewable in its docket. The same native selectors are available beside the narrow-layout record buttons.

## Verification

- `node test-government-workspace.mjs` passes. The check exercises ordinary-cell opening, focus without scrolling, isolation of nested controls, preserving text selection, read-only rows, semantic table/native button markup, selection link scope, previous/next controls, permission-safe initial rendering and shared header output.
- Targeted ESLint has **0 errors**. Two existing `react-refresh/only-export-components` warnings remain for shared formatting/URL helper exports in `GovWorkspace.jsx`.
- Frontend production build passes with the existing approximately 5 MB main-bundle warning. No backend or database change is included in this UI pass; the earlier 231-case backend run belongs to document 30.
- These checks are component/interaction and build evidence. They are not a browser, layout, screen-reader or visual acceptance test.

The current computer-use tool reports browser access disabled in Work settings, despite the user-provided browser captures. This pass cannot verify live scrolling, mouse hit areas, popup placement, keyboard/focus return, 320 px, 200% zoom or light/dark appearance. No screenshot or Figma result is claimed. Final live acceptance remains outstanding; the user's captures are observed before-state evidence.

The shared Reports implementation and approved visual direction remain the reference. The BI work is documentation-only: no dashboard route, aggregation endpoint, chart, default landing or navigation destination has been implemented for that proposal.

Implementation owner: repository work. Operational approval and final usability acceptance: PULSO/LGU representatives. Version: 1. Changes remain in the shared working tree; no commit or deployment is claimed.
