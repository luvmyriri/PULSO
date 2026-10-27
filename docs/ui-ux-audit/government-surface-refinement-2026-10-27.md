# Government surface refinement · 27 October 2026

Status: implemented in the local workspace; proposed visual refinement pending LGU review. Owner: PULSO frontend. This is not a deployment or production acceptance claim.

The employee's job is to scan a record queue, compare its fields, and select the next record without uneven alignment or loss of theme contrast. This pass responds to the annotated My work, Reports navigation, Work orders, Infrastructure, and Predictive maintenance screenshots.

## Shared pattern changes

- `GovRecordRow` aligns record titles and metadata to the cell's starting edge. The whole record trigger remains keyboard accessible. Other cell values share a wrapper so their metadata stays beneath the value in narrow layouts.
- `GovSidebar` uses explicit navigation groups: 24 px between groups, 8 px between a heading and its links, and 4 px between links. The collapsed rail uses a smaller group gap.
- The government palette uses the approved Field Blue action role and distinct semantic success/warning/critical roles. Light selection is `#e6f1f5`; dark selection is `#163548`. Dark selection no longer inherits a pale light surface.
- Soft depth is limited to shallow raised controls, inset search/form fields, selected controls, and a restrained work-surface elevation. Text, field boundaries, focus outlines, and selected-state indicators remain explicit.
- Shared action groups have an 8 px gap and wrap on narrow screens. Light and dark use different shadow strengths. Forced colors removes shadows and retains outlines/borders.

## Component and data contract

Affected reusable sources: `GovWorkspace`, `GovRecordRow`, `GovSidebar`, government theme tokens, and the overview's aliases to those tokens. The API fields, server authorization, lifecycle decisions, source timestamps, privacy behavior, and record actions remain governed by their existing contracts. No example record or metric is added to application data.

States retain the existing loading, error, empty, selected, hover, focus, disabled and recovery behavior. Record links have start alignment and visible focus. Selection uses text/record context and a two-pixel edge in addition to color. At 320 px, each secondary cell presents its label and a grouped value/metadata block; queue tabs retain deliberate horizontal scrolling.

## Source reconciliation

The shared Figma file's `Template/Government Citizen reports · Light · Reviewer final` (`8:1067`) was visually inspected. Its start-aligned queue content and Field Blue direction remain the source. The paired dark template (`8:1416`) is hidden and its screenshot returned a one-pixel image, so it was not treated as a valid visual review.

No Figma write is claimed. The attempted `use_figma` inspection returned `Unknown tool`. Next Figma action: reconcile the proposed `Government/Core record · v0.3` light/dark components with these spacing and depth roles, then validate their screenshots and bindings before promoting the refinement.

## Local verification

Headless Chrome used synthetic, explicitly named test records in an isolated profile. It did not access the employee's signed-in browser or change application records.

- My work, Work orders and Infrastructure: every first-column trigger begins at the same measured x-coordinate, with `text-align: start` and a column layout.
- Predictive maintenance dark selection: dark blue surface with pale primary/secondary text; no pale selection background.
- Desktop 1466 × 998, narrow 375 px and 320 px, a 733 px zoom-equivalent viewport, and forced colors: no document horizontal overflow or runtime exceptions in the reviewed scenarios.
- Narrow metadata remains grouped beneath its value. Forced colors suppresses depth effects while preserving control boundaries.

This smoke review covers shared rendering with fixture data. It does not establish production data quality, officer usability acceptance, a screen-reader audit, or measured employee performance.

## Consistent module coverage follow-up

The first pass was limited to `GovWorkspace` controls and tables. The user correctly identified that the custom Reports screen did not share most of that finish. The follow-up adds `styles/government-surfaces.css`, imported once after the application styles. Every authenticated `/gov` route receives a layout-neutral `gov-experience` scope from the existing authorization boundary.

The centralized roles are raised panels, raised controls, inset fields, pressed/selected controls, and floating dialogs. Their light and dark shadow definitions are reused by the shared workspace, Reports table and docket, filters, search, view toggle and pagination, overview charts, account surfaces, and publication controls/editor panels. The mineral canvas gives the relief enough contrast to be visible. Native rows and text actions keep their reading hierarchy.

Reports was explicitly rendered in light and dark. The follow-up fixture review also covers Records, Report analysis, Updates, Create publication, My work, Work orders, Infrastructure, Predictive maintenance, 320 px Reports/Infrastructure, and forced colors. These screens use synthetic test data in an isolated browser profile. The public/resident experience is outside this government refinement scope.

## Predictive maintenance scrolling correction

A long-list review reproduced a desktop scroll trap: the shared queue layout grew to its full content height, while `overscroll-behavior: contain` prevented wheel input from reaching document scrolling. The desktop queue shell is now bounded to the viewport, with shrinkable body/content containers. The asset list and selected record each have actual scrollable overflow; pagination and the record heading remain visible.

Verified with 35 synthetic assets: mouse-wheel input moved the list and detail by 480 px independently; Page Down moved the focused list by 501 px. At 375 px width and at a 540 px viewport height, ordinary document scrolling still moved by 480 px. No runtime exceptions occurred, and the frontend build passed. This check tests scrolling itself, beyond the earlier rendering/overflow smoke review.

## Publication editor and Updates scrolling

The publication editor had a separate unbounded inner scroll region, which also contained wheel input on narrow layouts. It now shares the bounded desktop shell with record queues. Its save/review toolbar stays outside the scrolling fields, while narrow and short viewports use natural document flow. Queue/detail regions no longer suppress scroll chaining unnecessarily.

In isolated fixture checks, the News form moved 480 px with the wheel and 599 px with Page Down. Narrow and short News forms moved the document by 480 px. A 20-item Updates queue moved 453 px, and a long selected publication moved its detail region by 480 px. No runtime exceptions occurred; the frontend build passed. These checks do not submit, save, or publish records.


## Minimal sidebar toggle follow-up

Observed implementation at explicit user request: moved the collapse/expand control outside the brand header into a separate tools row below the logo. The control is an unboxed 17 px icon with a 44 × 44 px target, semantic focus/hover colors, and existing persisted collapse behavior. Collapsed branding no longer reserves space for a toggle above the seal. Mobile drawers omit this desktop control. Browser fixture checks confirmed the target starts below the brand in both expanded/collapsed states and Space activates collapse, without runtime exceptions. Production build passed; targeted lint has no errors (one pre-existing unused variable warning), detector returned no findings. Figma reconciliation remains outstanding.


### Further reduction at user request

Supersedes the dedicated toggle row: the toggle now uses a 14 px directional chevron on the sidebar edge below the brand header, with no reserved row, button box or shadow. A transparent 44 × 44 px target retains the existing focus treatment, accessible name and expanded state. Hover only adds a small selection surface behind the chevron. Fixture browser checks passed expanded/collapsed positioning below the logo and Space activation; build and detector passed. Existing unused-variable lint warning remains unchanged.


## Brand emphasis and chart depth — 27 October 2026

User-approved direction: orange/light-green/white/dark-blue palette, stronger orange/green emphasis, existing text colors retained. The user rejected the interim green-tinted page/card backgrounds and requested white light-mode surfaces plus greater neumorphic chart depth. This correction supersedes earlier Field Blue as the dominant fill mapping; existing blue text/link colors remain unchanged.

Observed shared government implementation: white canvas, cards and controls; orange primary controls (`#BF480B` with existing white text in light mode; `#FF974F` with existing dark-blue text in dark mode); light-green navigation/selection surfaces; orange and light-green chart categories. Selected background is green only for actual selection, not the page/card canvas. Resolved/warning/critical status tokens and focus colors are unchanged. Dark-mode structure remains survey blue.

Bars now use restrained inset top highlights, lower-edge shading and soft offset shadows. Tracks are recessed with paired inset shadows. Both light/dark depth roles are centralized in the BI stylesheet; charts retain labels, exact-value tables and scoped drill-through links. Zero-valued stage marks have no border/shadow so depth cannot suggest a nonzero value. Forced-colors removes decorative shadows.

Validation: live signed-in in-app-browser inspection of Operations overview in both themes and Work orders primary button. Computed light page and all KPI surfaces are white; existing heading colors are retained; no horizontal overflow at the observed desktop viewport. Orange/green bar and track shadow layers were checked via computed styles. Primary button contrast is 5.06:1 in light mode and 7.35:1 in dark mode; existing selected-link foregrounds retain 6.81:1 and 6.61:1 contrast. Targeted detector found no issues; production build passed. No record mutation or AI submission was made. Figma reconciliation remains outstanding because its connector is unavailable; no shared-file update is claimed.


## Unified selection roles — user-approved implementation

The user approved consolidating white-first government styling after observing green navigation, blue selected rows and orange tab markers simultaneously. Orange is reserved for primary action, AI identity and key chart emphasis. Pale green with a darker green marker consistently identifies navigation, tab, filter/view and record selection. Existing text, status and focus colors remain unchanged.

The root cause of the blue record fill was an inherited `--workspace-selection` alias resolved before the government-scoped `--gov-selection` override. The alias is now rebound inside `.gov-experience` for both themes; dark Reports/docket overrides now reference the shared selection rather than a literal blue. Selected table markers consume the same green edge token. Removed the orange tab underline and decorative blue menu strip; quiet selection surfaces have no raised shadow. Shared panel shadows are reduced while controls and chart bars retain tactile depth.

Observed live validation: selected My work case `report:309` retains its selected URL/detail. Navigation, active tab and selected row compute to the identical light fill `rgb(226,241,207)` and dark fill `rgb(37,58,44)`. Green marker colors are `rgb(102,133,69)` / `rgb(188,223,151)`. Text remains `rgb(15,23,42)` / `rgb(248,250,252)` and the primary detail action remains orange. No horizontal overflow in the observed desktop view. Both themes were inspected; the tab was returned to light mode. Source detector and production build validate this CSS consolidation; no record mutation was performed. Shared Figma update is still pending connector availability.


## At-a-glance dashboard and zoom reflow

User request: make the dashboard visible with no or minimal scrolling where feasible, and make cards respond to magnification in either direction. Implemented a content-width container layout instead of scaling the entire page or locking overflow. Desktop uses three compact KPIs, a two-by-two operational grid (report demand, attention queues, intake, current work stages), and a vertical assistant beside the grid. Header, card padding, KPI spacing and fixed chart whitespace were reduced. Supporting demand interpretation moved inside the existing exact-value disclosure; counts, filters, drill-through links and all data tables remain available.

Responsive rules: the dashboard is an inline-size container. At content widths of at least 980 px, the assistant is a fluid 280–340 px right column and stretches with the operational grid. Below that it stacks below the charts; below 640 px the KPIs and charts reflow into one column. Grid children use `minmax(0,1fr)` and minimum-width resets. Typography is bounded with readable minimums rather than using CSS zoom/transforms to force a desktop screen onto a phone. Small/zoomed views intentionally retain vertical document scrolling. Opening detailed tables can increase page height; no data is clipped to enforce a one-screen claim.

The intake SVG now observes its actual panel width with ResizeObserver and recomputes the viewBox and plot coordinates, so axis text does not become a scaled-down desktop SVG. Fixed numeric labels and chart/table alternatives remain unchanged. Embedded chat no longer imposes a 520–640 px viewport-derived height on the overview; its panel stretches alongside charts with a smaller content minimum. Other government routes and floating chat layout are unchanged. Shared GovWorkspace accepts an optional class name to scope compact overview spacing.

Observed live measurements (CSS pixels, with the user's browser magnification accounted for):

| Viewport | Vertical page scroll | Horizontal/card overflow |
| --- | ---: | --- |
| 1466 × 998 | 0 px | None |
| 1858 × 870 | 0 px | None |
| 1281 × 720 | 172 px | None |
| 960 × 640 | 675 px | None |
| 733 × 498 (roughly a 200% desktop-zoom viewport) | 882 px | None |
| 320 × 812 | 1759 px | None |

These measurements describe the current recorded data with disclosures closed; richer datasets or expanded details can require scrolling. Dark 1466 × 998 was also checked: all four operational panels and the assistant fit with no page overflow. Light mode and the original viewport were restored afterward.

An isolated, explicitly labelled sample fixture additionally tested six long-named areas, all seven priorities and a populated 14-point intake curve at 1466, 733 and 320 px widths. No horizontal/card overflow; SVG coordinates remained finite, and at 320 px the actual 270 px plot produced a 270 px viewBox. The exact-value disclosure opened and contained all seven priority rows. No real records were changed. The temporary fixture/tab was removed after inspection. Targeted ESLint had no errors (two existing shared-workspace fast-refresh warnings); detector returned no findings; production build passed. Figma reconciliation remains pending connector availability.


## Softer dashboard panel perimeters

At the user's request, dashboard card and embedded assistant perimeters now use transparent borders with soft offset shadows instead of visible gray outlines. Transparent border geometry is retained so the compact layout does not shift. This applies only to dashboard group surfaces; chart-bar depth, control boundaries, 3 px keyboard focus and semantic selection markers remain. Forced-colors restores CanvasText boundaries and removes shadow. The blue line in the submitted annotated screenshot is the browser comment overlay, not an application style.

Live light/dark inspection confirmed transparent card borders and the appropriate theme shadow; desktop horizontal overflow remained absent. The original light theme was restored. Detector returned no findings and the production build passed. Figma reconciliation remains pending connector availability.


### Demand bar stroke removal

User clarified that the outline on report-demand bars should be removed. Both demand-series links now have no border stroke; the existing soft highlights/shading and recessed tracks remain. Labels, exact values, links and keyboard focus cues are unchanged. Live browser inspection confirmed all four current demand bars compute to `0px` borders while retaining their depth shadow. Detector and production build passed.


## Latest supplied palette reference and minimal greeting

The user rejected the lime-green palette and supplied a resident-portal reference showing orange actions, pale warm-orange selection, white/cool-neutral surfaces and teal secondary accents. This explicitly supersedes the earlier pale-green selection direction. Shared government tokens now use pale orange `#FFF5EB` selection with an orange marker, mint `#86CDB7` secondary chart marks, and readable teal `#047857` links. Dark mode uses matching warm selection and lighter mint/teal. Core text, semantic statuses, focus, borderless bar styling and compact responsive geometry remain.

Primary light buttons use orange `#CF4900` with white text (4.56:1 contrast); the vivid brand-orange artwork and chart emphasis remain. Active sidebar labels/icons use orange as in the supplied reference. Old Reports/docket accent aliases now resolve to shared tokens rather than retaining literal cyan values.

Operations overview no longer passes a breadcrumb parent. Its existing scope/freshness/refresh strip now includes a one-line greeting from the authenticated profile (separate first name when present, otherwise a saved display-name first token after a title); missing/email-only names fall back to Hello. Scope and freshness remain authoritative and visible. An existing true-color Caloocan City Hall asset appears as a small decorative thumbnail beside Refresh, outside the greeting text; it is not a claim to reproduce the separate supplied park-photo exactly. It hides at narrow widths. No large hero or additional dashboard row was added.

Live browser checks: breadcrumb absent, authenticated greeting Hello, Maria., scope/freshness unchanged, pale-orange selection and mint series applied. Both themes inspected; no horizontal/card overflow at effective widths 1521,1858 and320 px. Current dashboard remains zero-scroll at1521×877 and1858×870; narrow views scroll vertically. The original viewport/light theme were restored. Targeted lint/detector passed and production build passed. Figma reconciliation remains pending connector availability; no Figma update is claimed.


### Reports selected-view foreground

At explicit user request, the active Map/Table view label and inherited icon now use an orange selection-ink token instead of teal: `#B64108` in light mode and `#FFAD75` in dark mode, retaining the existing warm selection fill. Scope is the Reports view switch; status colors and normal links are unchanged. Live computed-style checks verified both label and icon in both themes. Detector and build passed.

### Navigation stays open on desktop (2026-10-27)

User clarification: keep the navigation sidebar open by default, with an option to collapse it. This is a navigation visibility change; landing routes remain unchanged. The shared workspace and Reports now use the persistent sidebar from 1024 CSS px upward instead of 1280 px; narrower screens retain the existing navigation menu. An explicit saved collapse preference is preserved. Shared sidebar media queries and its collapse-state breakpoint agree.

Validated in the live government overview at 1200 px: expanded sidebar, keyboard collapse to the 80 px rail, and keyboard expansion. Reports also retains its sidebar at 1200 px. At a 775 CSS px viewport the sidebar yields to the menu, with no page horizontal overflow. Production build passed; targeted lint reported no errors and three existing warnings. No palette, layout composition, lifecycle, authorization, or sign-in landing change is included.

### Theme-aware Caloocan greeting imagery (2026-10-27)

Implemented the user-supplied day/night image pair in the existing overview greeting bar. Original files from Downloads were copied unchanged to public/caloocan-welcome-day.jpg and public/caloocan-welcome-night.jpg. The previous thumbnail is replaced by an aria-hidden, non-interactive decorative image region occupying the right 58% of the bar, with a CSS alpha mask fading toward its middle. Theme selectors choose the appropriate image. Greeting, scope, source time, refresh action and their text tokens remain unchanged; the bar remains about 56 px high at 1200 CSS px. The image is hidden below 640 px and in forced colors. No raster filtering or fabricated evidence is introduced.

Live checks: both image URLs follow the theme, both desktop views have no horizontal overflow, and the 320 CSS px view hides the decoration without horizontal overflow. Viewport and theme were restored after checking. Build, targeted ESLint and the design detector passed. Preview captures: output/welcome-banner/light.png and dark.png.

Figma: inspected the existing shared file via its open browser tab, currently showing Accessibility & handoff contract at node 8-1416. The file is in an unauthenticated view-only state and no Figma write tools are available. No Figma modification is claimed. Next design-system action: reconcile the paired theme imagery with the government greeting component in the shared file when editing access is available; keep provenance, responsive rules and decorative semantics attached.

### Overview header breathing room (2026-10-27)

The user identified the title/greeting region as crowded. Overview-only refinements increase title-row block padding from 8 to 16 px, separate the description by 6 px, give the greeting bar a 72 px minimum height and 12 px block padding, and increase greeting/context gaps. Dashboard content uses the same 24 px horizontal inset as the header, with 20 px top padding and 14 px separation after the development notice. Compact chart/card composition, user data, source time, theme imagery and actions remain intact.

Live validation: at 1200 CSS px the header is about 83 px high and the greeting bar 72 px. At 1561 x 885 CSS px the full overview has about 21 px vertical overflow and no horizontal overflow. At 320 CSS px the greeting wraps, its decoration is hidden, and there is no horizontal overflow. Temporary viewport overrides were reset. Preview: output/overview-spacing/roomier-header.png. Figma reconciliation retains the previously recorded view-only/tool-access limitation; no Figma update is claimed.

### Reports table, navigation access, and publication selection (2026-10-27)

Implemented the four user annotations. Reports now presents its semantic table from 1024 CSS px; narrower screens use a vertical queue with pagination instead of the horizontal card strip. The table has a caption, column scopes, and a keyboard-focusable scroll region. Optional AI urgency/updated columns hide at laptop widths. Selecting a report below 1280 px shows its docket in place of the queue, retaining the existing close/return behavior.

The sidebar hamburger now precedes the city logo in the brand row, including the collapsed rail. Records navigation uses the same backend `records:view` permission as the Records endpoint. Navigation no longer exposes fallback modules before server authorization arrives; a shared module gate prevents direct unauthorized Records entry, and Records requests wait for permission resolution. No permission grants were expanded. Publication-format and content-language selected labels/icons now use orange selection ink (`#B64108` light, `#FFAD75` dark), replacing the local green override.

Validation: production build passed; targeted ESLint had zero errors and one existing unused-variable warning. Guarded disposable-database tests passed (83), including Records permission grant/removal and navigation parity. Live checks covered the 1200 px table, report selection/close, hamburger collapse/expand without logo overlap, 320 px vertical queue and pagination, no page horizontal overflow, direct unauthorized Records redirect, and both publication theme colors. Light mode and the original viewport were restored. Captures are in `output/government-ui-fixes/`. The design detector reported three existing findings in unchanged CSS (two font declarations and a width transition); no new finding was introduced. Figma reconciliation remains pending the previously documented view-only/tool-access limitation; no Figma change is claimed.
