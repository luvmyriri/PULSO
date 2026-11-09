# Native Android resident landing

Status: implemented locally from the user's reference; Figma reconciliation pending access.
Owner: PULSO project owner. Version: 1. Last validated: 9 November 2026.

## Scope and visual source

This page belongs to the installed Android APK's `NativeResidentLanding`, selected
by the existing `isNativeAndroid()` guard in `App.jsx`. It does not replace the
public website at any browser width or the standalone browser PWA.

The composition follows the supplied mobile reference and uses the user's
Bonifacio Monument photograph as decorative civic context. The photo spans the
header and actions, with the monument positioned to the right of the heading.

The composition includes the shared native header with a text link for account access, the report action,
a persistent tracking entry, a three-step explanation, the Caloocan city seal,
and a community message. The guide describes reviewing and sending a report; it
does not promise one-tap submission or a government outcome.

## Components and behavior

- `NativeResidentLanding` and `native-resident-landing.css`: route composition,
  photo, local semantic colors, responsive behavior, and focus treatment.
- `NativeAppHeader`, `appearance="hero"`: landing-only presentation. The default
  header on tracking and other native pages retains its existing presentation.
- Existing `ThemeProvider`, i18next resources, and router links remain authoritative
  for appearance preferences, language, and navigation.
- The landing and first-launch briefing share `NativeAppBrand` and the compact
  `NativeLanguagePicker` menu: plain EN/TL trigger, left-aligned options, small
  selection check, and 44px touch targets in both themes.

Guest routes: `/report?source=guest`, `/login`, `/track`, `/tutorial`.
Guests can open `/register` from the sign-in form.
Signed-in resident routes: `/report`, `/dashboard`, `/track`, `/tutorial`.
The home tracking action opens a modal bottom sheet without changing the URL.
An Android receipt link to `/track` opens that sheet over home and prefills the
same ticket ID and code. The public web route retains its standalone layout.
Authentication detection and backend permissions are unchanged. The landing does
not request identity, camera, or location access, fetch report data, or fabricate
public status. Destinations retain their existing authentication and recovery rules.

English and Filipino strings are under `nativeAndroid.home`. Language and theme
controls persist through their existing handlers. The landing's `lang` attribute
follows the selected language. Signed-in users see My reports and tracking rather
than registration prompts.

## States, responsiveness, and accessibility

- Guest and signed-in resident variants preserve report and tracking access.
- Both themes preserve content, ordering, controls, image source, and navigation.
  Light and dark both use shared PULSO canvas, text, and resident action colors.
  The report action uses bright PULSO orange with white text. The headline city,
  Works label, community city, and step badges use that same action orange;
  badge numbers remain white, as requested. In English, the community heading
  places Caloocan after the opening phrase and together on the next line at
  standard phone widths, while smaller/enlarged layouts can reflow.
- The landing canvas draws beneath the transparent status and navigation bars.
  Native insets protect the landing controls and footer in both navigation modes.
  Other routes continue to reserve native space for system bars and the keyboard.
- The tracking sheet reuses the public lookup form and results. Its header stays
  visible while the body scrolls. The handle, Close button, outside tap, Escape,
  and Android Back dismiss the sheet. Focus returns to the home control after use.
  Its opaque surface extends behind Android navigation, concealing the landing
  decoration; the button stays 8 px above the system inset. Labeled, outlined
  fields include localized ticket ID and tracking code placeholders.
- The photograph is bundled for offline display. If unavailable, the themed
  backdrop preserves the heading and actions. No data loading/empty state is needed
  because this page does not fetch service records.
- Buttons and links use native semantics, visible 3 px focus, 44 px minimum targets,
  hover and pressed feedback. No loading or disabled state is implied for links.
- Decorative imagery and icons are hidden from assistive technology. Headings and
  the ordered guide provide the text equivalent; the image carries no task data.
- The landing fits the tested portrait phone viewports at standard text size.
  Short screens omit the decorative community panel and, where needed, the step
  descriptions. Header controls wrap at larger text sizes, with vertical reflow
  to keep controls reachable at 200% text expansion.
- The image is static. Forced colors suppress it and use system foreground,
  background, and button colors. There is no ornamental motion.
- No analytics event or outcome metric was added; no measurement plan exists.

## Validation and remaining dependencies

Browser component checks cover twelve combinations of 320/390/430 px, English/
Filipino, and light/dark. They also check account-specific routes, live language and
theme controls, keyboard focus, forced colors, 200% text, photo failure, and the
absence of this page/photo in ordinary mobile and desktop browser entry points.
The native tracking suite checks shared-header behavior and preserved receipt
credentials. These checks do not substitute for Android device accessibility QA.

The shared Figma file denied access on 9 November 2026. No Figma mutation is claimed.
Next Figma action: inspect the current resident template and core library, carry
this APK-specific composition into paired reusable light/dark artifacts, annotate
the behavior above, and validate structure and rendered output. The project owner
must restore file access for that step. Physical-device visual and TalkBack review
remain separate acceptance steps; no device was connected during this work.
