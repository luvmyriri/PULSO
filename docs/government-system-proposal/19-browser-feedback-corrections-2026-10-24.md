# Government workspace: browser feedback corrections

Status: implemented locally, 24 October 2026. Owner: PULSO product team. This follow-up records the user's nine annotated browser comments and supersedes the affected navigation/copy descriptions in implementation note 18. Existing LGU role/delegation approval dependencies remain.

| Comments | Correction |
|---|---|
| 1–2: Service insights is unclear and hides maintenance | Replaced the label with **Report analysis** and exposed **Predictive maintenance** as its own server-authorized sidebar destination. Report analysis explains its purpose: waiting reports, area concerns, blocked jobs and workload. Removed the extra analysis/maintenance tab tier. Existing URLs remain compatible. |
| 3: Investigate asset location and linked/nearby reports | Added the recorded asset map preview and **Investigate on map**. PostGIS proximity uses the actual asset geometry. The investigation includes all explicitly linked reports plus other permitted reports within the selected radius from the past 90 days. The 250 m/500 m/1 km selector is visible. Nearby reports are labelled unconfirmed location matches. Missing geometry never becomes an invented asset point. |
| 4: Technical prediction copy | Replaced model names, numeric model internals and training jargon in the staff flow with an inspection suggestion, plain explanation and human-check limitation. Model provenance remains in developer documentation/API. Maintenance timing is a suggestion based on comparable dated work; absent history is explained briefly. |
| 5: Create update missing | System-admin pilot defaults now allow **draft creation/editing**, with a visible **Create update** action. Approval and publication remain denied without separate operational capability. Explicit capability overrides remain authoritative. Other read-only users receive a visible permission explanation. |
| 6: Duplicate Records tabs/unresponsive controls | Replaced the hard-coded sample documents, sample audit events, simulated uploads and fake verification messages with saved document/activity APIs. One section navigation remains: Documents, Activity timeline, Audit trail. Upload persists a real file; download checks permission and scope. There is no simulated Create record or verification action. |
| 7: Work/My work ambiguity | **Work** is labelled **Work orders**. My work explicitly describes the personal task/review inbox; Work orders is the broader work register. These are distinct task and record views. |
| 8–9: Lost map design/interaction | Preserved the new Reports-style map layout while restoring circular evidence-photo pins, category fallback icons, status borders/pointers, selected-pin emphasis, zoom-dependent report groups and group-member access. Restored North/South Caloocan outlines, barangay boundaries, hover highlighting and click-to-filter. Selected report details sit beside the map on wide screens and below it on narrower screens. Pins, heatmap, details and the equivalent list use the same permitted source records. |

## Authoritative data and access

- Asset investigation: `GET /api/gov/report-map?context_asset_id=...&radius_m=500`. Proximity is measured from the actual stored geometry, rather than an invented barangay center. Linked reports outside the radius remain linked records; proximity alone never creates a work/report relationship. District and record scope are applied first.
- Records: `/api/gov/records-workspace/permissions` and `/api/gov/records-workspace?view=documents|timeline|audit` return permitted saved records and server pagination. Document file access and upload target geography are checked on the backend.
- Draft creation does not grant the system-admin account review, approval, publish, withdrawal or correction authority by title.

## Verification

Production frontend build passed. Targeted lint has no errors; the map component file retains development fast-refresh warnings for helper exports. The government integration/access/command suite passed **70 tests**, including new checks for draft-only admin authority, nearby versus linked reports, district isolation, missing geometry, persisted Records activity, and real file upload/download with scope denial.

Read-only authenticated checks against the configured local API returned 200 for navigation, publication permissions, all three Records views and the annotated asset's map context. The development database contains 1 saved document, 19 timeline rows and 17 audit rows. The annotated asset has a recorded point and currently has no eligible linked/nearby reports within 500 m; this is displayed as a real empty result. No operational records or real resident notifications were created by verification.

The normal frontend/backend remain on ports 5173/33159 using the configured database. Disposable tests remain on the guarded test database. No deployment or remote migration was performed.

The user's attached screenshots supplied the visual baseline. A post-change interactive browser/screenshot pass was unavailable because browser control is disabled in Work settings. The layout includes responsive rules, native keyboard-accessible pin/group buttons, non-color statuses, and map/list alternatives, but this limitation prevents a claim of final visual, screen-reader or full WCAG certification. The existing shared Figma references were not changed during this corrective implementation.
