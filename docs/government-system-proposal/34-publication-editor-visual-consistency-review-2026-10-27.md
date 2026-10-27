# Publication editor visual consistency review

| Field | Value |
|---|---|
| Status | Observed findings; overlap correction implemented locally; remaining design corrections proposed |
| Surface | `/gov/announcements/new` in the local development environment |
| Audience and job | Authorized government staff write a bilingual city update, define its audience, save a draft, and send it for review |
| Reviewed | 27 October 2026, dark theme at approximately 1466 × 998; compared with `/gov/reports` |
| Owner | PULSO product design for the visual contract; engineering after explicit implementation authorization |
| Version | Review 1 |

## Authority and limits

The approved direction is Civic Aperture in `PRODUCT.md` and `docs/ui-ux-audit/09-visual-art-direction-v2.md`. The current Reports interface is the user-confirmed government implementation reference, as recorded in `PRODUCT.md`. Publication structure and behavior in the local runtime and `frontend/src/pages/GovAnnouncementEditor.jsx` are observed implementation, not an approved route contract. The government IA, lifecycle, and permission proposals still need their named LGU owners' approval.

The shared Figma file was opened read-only. Its `02 Portal Concepts & Handoff` page visibly contains paired `Template/Government Citizen reports · Light/Dark · Reviewer final` entries. This review did not inspect their bindings, variables, or instance relationships, and did not find an editor-specific template by name. A second browser comment on 27 October 2026 supplied the scrolled overlap state, which is included below. No Figma change was made.

## Findings and proposed corrections

| Priority | Observed inconsistency | Effect | Proposed correction |
|---|---|---|---|
| P1 | The save/review row is `sticky top-0 z-20` inside the scrolling `.gov-page-content`. The view/language row and publication format row remain normal scrolling content, so they pass underneath the opaque action row. The user's scrolled capture shows those controls cut off above and below it. | Controls are obscured and appear to overlap. Focused controls can be hidden at scroll positions or higher zoom. | Place the persistent save/review row in a dedicated shell action region outside the content scroller, taking the place of the redundant Back to updates bar. Keep the breadcrumb as the back path. The content scroller then begins below the action row; give focused content sufficient scroll margin. Do not leave a second sticky row inside the form. |
| P1 | Shared government CSS currently sets dark canvas/surface to `#070A12`/`#090E1A`, government action and focus to orange `#FF6B00`, and light secondary text to black in `index.css`; `gov-sidebar.css` repeats much of that palette. The approved Civic Aperture roles call for survey-blue dark surfaces, Field Blue government action, and a separate blue focus role. | The newer editor inherits a legacy near-black/orange shell and cannot achieve approved theme parity by local Tailwind adjustments alone. | Reconcile the shared semantic token aliases once, then bind the shell, Reports, Updates list, editor, and publication controls to the same government action, selection, focus, text, rule, and surface roles. Validate light and dark together. Preserve semantic status colors. |
| P1 | The initial viewport stacks a page title/description, a separate full-width Back to updates bar, a development note, a save/review bar, view/language controls, and format controls before Headline. In the captured desktop viewport, the body editor begins near the bottom edge. | Writing begins too far down the page; controls feel like separate design generations. | Keep the breadcrumb as the back path, remove the redundant full-width back row from this route, place draft state and actions in one compact editor header, and keep view/language controls aligned with the writing surface. Preserve visible draft/review actions while scrolling. |
| P1 | `Headline` and `Short introduction` have no visible default field boundary, unlike the settings inputs. The headline explicitly removes the focus outline and only changes a 1 px bottom border. | Staff may miss the editable area or its keyboard focus; this conflicts with the required visible 3 px focus treatment. | Give the editorial fields a consistent, restrained default affordance and the approved 3 px keyboard focus treatment. Keep the headline typographically prominent without turning it into a different form system. |
| P2 | Selected state is expressed in three styles: a bordered raised `Write` tab, a filled Field Blue language button, and a tinted format button. Repeated rounded borders and pills coexist with the Reports controls and table vocabulary. | Staff cannot infer a stable rule for selected view, language, and format; the surface reads as assembled from separate kits. | Define one segmented-control primitive with explicit selected, hover, focus, disabled, and loading states. Use a quiet surface shift and text/check cue consistently; reserve Field Blue emphasis for the primary staff action and important selection. |
| P2 | The editor is a bordered content card beside a bordered settings card, while the article body is another large framed region. The side column is only 300 px before the 2xl breakpoint and houses dense location, review, and disclosure controls. | The writing canvas is visually boxed in and settings feel compressed, especially at 200% zoom. | Make the article a calm work surface with rules rather than nested card framing. Treat settings as a clear secondary rail on wide screens and a full-width sequence below the editor on narrow or zoomed screens. Show current audience and schedule summary near the actions before review. |
| P2 | The action row says `Unpublished draft`, while the settings header repeats a `Draft` badge. A small gray dot carries state without a useful event or time. | Status appears decorative and redundant; staff cannot tell whether edits are saved. | Show one authoritative save state: `Unsaved changes`, `Saving…`, `Draft saved at [time]`, or a recoverable error. Keep publication lifecycle separate from save freshness and avoid color-only meaning. |

## Screen contract for the next design pass

1. **Hierarchy:** breadcrumb and title; compact editor header with one save state and the two actions; view/language controls; publication format; editorial fields; secondary settings. The first desktop viewport should reveal the headline and start of the body without requiring a scroll.
2. **Primary action:** `Send for review` remains explicit and retains its governed confirmation. `Save draft` remains available. The review confirmation must state that sending does not publish the update.
3. **Content:** English and Filipino authoring and resident preview remain available. The preview must clearly say it is unpublished. Fallback copy must not imply a completed translation.
4. **Authority:** selected district, barangays, related reports, issuing office, priority, effective period, and optional sourced disclosure remain server-scoped and reviewable. Candidate report links must remain distinct from reviewed relationships.
5. **States:** specify default, hover, focus, pressed, selected, disabled, saving, saved, unsaved, validation error, conflict, connection failure, session expiry, pending file, and successful review submission. Every failure must say what remains saved and whether the review transition committed.
6. **Accessibility:** keyboard-complete editor and disclosure flow; 3 px visible focus; logical focus return from confirmation; text and shape cues for save/selected state; 320 px reflow, 200% zoom, forced colors, and reduced motion.
7. **Responsive:** preserve a single column for authoring on narrow screens. The settings rail becomes a full-width section sequence. Sticky actions must not cover fields, errors, or focused controls.
   At desktop, 320 CSS px, and 200% zoom, scroll through the editor with keyboard and pointer. The view/language and format controls must enter and leave the viewport without passing visibly behind the action row; focused fields and error messages must remain wholly visible.
8. **Theme:** Morning Field Sheet and Night Inspection retain identical meaning, hierarchy, content, and actions. Test the shared shell and Reports reference alongside this route after token reconciliation.

## Next design and implementation sequence

1. In the shared Figma file, inspect the live v0.2 foundations, Core Library controls, and paired government reviewer-final templates with the required official Figma workflow. Resolve token aliases and create a reusable publication editor control/state pattern before composing paired light/dark editor frames. Preserve template component relationships and annotate the screen contract above.
2. Have PULSO product design review the paired editor frames and the government role owner confirm review and release language where the proposed lifecycle affects the screen.
3. After separate authorization for the remaining design scope, update shared government tokens and primitives first, then the publication route composition. Validate the editor beside Reports and Updates in both themes at desktop, narrow width, and 200% zoom.

This review does not establish Figma component status, variable bindings, a production-ready publication lifecycle, or live accessibility conformance.

## Overlap implementation follow-up — 27 October 2026

The user explicitly authorized the overlap fix. `GovAnnouncementEditor.jsx` now keeps the draft state and save/review row as a fixed-height form section, while view, language, format, content, and settings scroll within `publication-editor__scroll`. `publication-editor.css` makes the editor's page content a flex column and gives that inner region the only vertical scroll. This is narrower than the proposed shell-action migration above and preserves the current Back to updates control and form submission behavior.

The local in-app browser showed the initial and [scrolled dark-theme state](./publication-editor-overlap-fixed.png) after the change. In the scrolled view, the article body reached the inner scroll boundary below the save/review row without the view or format controls appearing behind the row. Targeted ESLint, the existing government workspace component check, the production frontend build, the Impeccable detector, and `git diff --check` passed. The build retained its existing large-bundle warning. Narrow/zoomed and light-theme browser acceptance remain to be checked with the broader visual work.
