# Ascending severity, boundary reference and sidebar corrections

Status: implemented and locally verified, 24 October 2026. The user's latest annotated feedback explicitly replaces the earlier proposed severity ordering. This is a product instruction, not a claim that Caloocan has adopted this operational policy. Reports remains the visual reference. Browser automation is disabled in the current Work settings; no live visual or keyboard validation is claimed. No Figma changes were made.

## Severity contract

| Grade | Meaning |
| --- | --- |
| P0 | Monitoring |
| P1 | Preventive work |
| P2 | Standard repair |
| P3 | High priority |
| P4 | Severe hazard |
| P5 | Immediate response |

The shared report docket uses this scale in table, map and full-record views. The assessment dialog uses six native radio choices, impact descriptions, assessment notes, current grade and a review-date field. It stays centered, scrolls when needed, reflows to one column on narrow screens, and uses the existing government theme and focus treatment. P4/P5 have severe badges, P3 a high badge; text always carries meaning. These are implemented responsive rules, pending live visual/accessibility review.

Grades require an authorized staff decision, evidence notes, report version and immutable history. P0 requires a named review owner and a future review date; closed reports cannot enter active monitoring. AI urgency and lifecycle remain separate. P5 sorts first in My work but does not automatically dispatch a team, create work, approve spending or declare an emergency. The work-order form suggests low for P0/P1, normal for P2, high for P3 and critical for P4/P5; staff confirm the separate work-order priority.

Migration `12e7a9b1c543` preserves existing decisions by meaning: old P5→P0, P4→P1, P3→P2, P2→P3, P1→P4. New P5 has no old counterpart. Conversion records an audit event, policy version and report-version change; earlier audit records remain readable as the previous scale. The configured development database had no recorded grades, so no staff assessments were invented or overwritten.

## Boundary reference

The Reports map now draws, highlights and fits areas from `/api/geo/map-reference`. Startup imports the detailed existing north/south GeoJSON and the existing barangay dataset into a versioned PostGIS presentation table. It validates polygon geometry and clips barangay shapes to the city outline. Orange outlines and hover/selection fills use the same returned geometry. The empty-result fallback fits the city rather than forcing a single-report zoom. A failed boundary request exposes an error and retry while preserving report/list access.

The live reference has **190 features: 2 city sectors and 188 barangays**, with **1,245 city vertices**. The older enforcement city geometry has 162 vertices. Presentation does not modify `city_boundaries`, report coordinates, geofencing, service eligibility or existing jurisdiction rules. Source paths and hashes are recorded in `backend/data/map-reference/manifest.json`; output contains provenance and accuracy metadata. These existing repository files are reference datasets, not certified survey geometry. Clipping corrects visible overhangs against that reference; it cannot establish authoritative internal barangay boundaries where source data is inaccurate. GIS-owner validation remains required before claiming official accuracy.

## Sidebar

The bottom Collapse row is replaced by a small top control using familiar panel-collapse/expand icons, explicit accessible names and saved collapse state. Mobile retains its existing navigation drawer and close control.

## Verification

- Full guarded disposable-PostGIS run: **91 passed**. Additional focused run after adding the conversion test: **4 passed**, covering monitoring, immediate-response ordering, map geometry and actual migration SQL in an isolated transaction-local schema.
- Checks confirm valid/nonempty geometry, full city detail, clipped barangays, idempotent imports, unavailable-boundary errors and unchanged jurisdiction/report data. Review ownership, scope, version conflicts, automatic routing and existing publication/maintenance checks continue to pass.
- Frontend production build passed. Targeted lint has **0 errors**, with seven existing mixed-export hot-refresh warnings. Build retains the existing large-bundle warning.
- Migration applied to the configured development database. Restarted API on port 33159; live map and scoped report-docket requests returned 200. Vite on 5173 returned 200. All 13 existing reports remain ungraded, and report 318 retains its assigned review owner.
- No external notices, publication, fabricated assessments or certified-boundary claims were made during verification. Browser visual review remains outstanding because browser control is disabled; Figma reconciliation remains outstanding.
