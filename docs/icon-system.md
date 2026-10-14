# PULSO icon system

**Status:** implemented in the current web and Flutter code; eight reusable reference components added to Figma Core Library. Template-wide Figma sync remains a design follow-up. **Validated:** 2026-10-14.

The universal action and status icon family is [Solar Icons](https://solar-icons.vercel.app/) in its **Linear** style. Use a 2 px stroke and the existing semantic colors. The artwork is decorative when an adjacent label conveys its meaning; otherwise give the control an accessible name. An icon alone never communicates status or authorization.

## Code contracts

- Web: import the existing semantic names from [`frontend/src/icons/index.js`](../frontend/src/icons/index.js). That adapter points each name at an actual `@solar-icons/react/linear/<icon>` export, avoiding application-wide name churn. New icons should use a specific Solar export and an intentional semantic name. The default stroke is set in `frontend/src/index.css`.
- Flutter: use `PulsoIcon` from [`mobile_app/lib/widgets/pulso_icon.dart`](../mobile_app/lib/widgets/pulso_icon.dart). It accepts the existing `IconData`, size, color, and semantic label. Its lookup maps current Material icons to Solar linear artwork; a few meanings missing from Solar fall back to Material.
- Use 20 px for inline actions, 24 px for regular controls, and 32 px only where the existing layout gives an icon more emphasis. Keep the tap target separate from the visible glyph.
- Do not replace city or PULSO marks, the Google identity mark, functional charts, map/boundary geometry, evidence guides, or the Signal Cut with generic icons.

## Semantic choices

| Meaning | Solar drawing |
|---|---|
| Search | Magnifier |
| Back / next | Alt Arrow Left / Alt Arrow Right |
| Close / dismiss | Close |
| Location | Map Point; GPS for current location |
| Warning / error / information | Danger Triangle / Danger Circle / Info Circle |
| Complete / verified | Check Circle / Shield Check, paired with text |
| Upload / download | Cloud Upload / Download |
| Maintenance / delivery | Toolbox / Delivery |
| Staff / group | User / Users Group Rounded |
| Public announcements / broadcasts | Volume Loud (kept distinct from notification bells) |
| Resident services | Suitcase for permits, Health for clinics, User ID for identification, Wallet for tax payment, Square Academic Cap for scholarships |
| Theme | Sun / Moon / Monitor |

Solar currently has no faithful hard-hat, traffic-cone, fingerprint, at-sign, Apple fruit, microphone-off, pin-off, file-clock, or user-settings drawing used by the web UI. The adapter retains those nine Lucide glyphs so they cannot be mistaken for another operation or state. The Flutter app retains eight Material meanings: road add/edit, engineering/construction, park, person search, and `@`. These should become authored PULSO pictograms or be revisited when Solar gains a true match. This is an explicit exception to the common icon family, not a second general-purpose library choice.

The remaining inline SVGs are purposeful geometry: charts, map markers, boundary styling, evidence/ID guides, the Google mark, and the PULSO signal. Inline generic check, error, info, upload, document, delete, and navigation icons were replaced with Solar. A static SVG inside a confirmation dialog uses Solar's Shield Check path because that dialog renders HTML rather than React.

## Licensing and design source

Solar's React package code is MIT. Its underlying icon set is **Solar Icons by 480 Design, CC BY 4.0**. Preserve attribution in the public web footer and the mobile profile's Icon credits entry, including a link to the [original icon set](https://www.figma.com/community/file/1166831539721848736). Keep this attribution when reusing icons elsewhere.

The live [PULSO UI Rework Figma file](https://www.figma.com/design/1qPgPj4o3smElv8B2B1REi) was inspected before implementation. Its `01 Core Library` page contained authored button-icon groups but no named Icon or Pictogram components discoverable in the local library search. Eight `Icon/... · Solar linear · v0.1` components now provide Search, Close, Back, Next, Location, Warning, Complete, and Upload reference artwork; their imported vector structure and Warning screenshot were validated. They use a fixed light-theme foreground because the Starter's light/dark collections remain separate and v0.2 objects are not fully rebound. They are **reference components**, not a fully approved theme-aware production contract. The next design pass should reconcile light/dark semantic color bindings, add the remaining shared glyphs as needed, and replace only universal-action icon slots in the paired reviewer-final templates. Preserve custom engineering pictograms and separate 44 px targets from 20–24 px glyphs.
