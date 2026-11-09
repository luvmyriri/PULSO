# Android introduction guide

Status: implemented locally from the user's request to align all five steps with
the APK landing page. Figma reconciliation is pending file access.
Owner: PULSO project owner. Version: 1. Last validated: 9 November 2026.

## Job and scope

Help residents understand reporting, location, safe evidence capture, and tracking
before starting a report. This is the installed Android first-launch experience,
also available for replay at `/tutorial`.
The browser/PWA tutorial and developer simulator retain their current composition.
No API, submission, permission, or lifecycle behavior is introduced by this guide.

## Shared design and composition

`native-resident-theme.css` supplies the same semantic canvas, surface, text,
resident accent, action, focus, and rule values to the landing page and guide.
The existing `NativeAppHeader`, in its minimal landing presentation, supplies
identity, account access, the English/Filipino dropdown, and theme control during
replay. First-launch briefing hides account navigation and uses a small,
noninteractive PULSO identity at the left, with the shared language picker just
before Skip on the right. Its larger
heading and diagram use the extra space without adding new decoration.
The briefing uses the same 40px logo, 16px brand name, and 12px city label as
the landing header. Highlighted heading words use the report button's orange.
The briefing language menu anchors to its trigger's trailing edge and reserves
space while open, keeping the options within the viewport and clear of the heading.
The briefing and landing use the same compact menu, plain language trigger,
left-aligned labels, and small selection check. Touch targets remain 44px high.

`NativeAppGuide` contains one heading, a distinct instructional line diagram,
three open ruled guidance rows, a named progress bar with a small current-position
cut, and a persistent footer. Back remains secondary; Continue is the sole primary
action until Get started (first launch) or Report a Problem (replay). There is no repeated stock image,
dot stepper, large badge container, added gradient, or decorative animation.

| Step | Focus | Diagram |
| --- | --- | --- |
| 1 | Reporting in Caloocan | Phone and civic buildings |
| 2 | Describing one concern | Report sheet and pencil |
| 3 | Marking the location | Folded schematic map and pin |
| 4 | Taking a safe, useful photo | Camera and framing corners |
| 5 | Following a report | Receipt and message |

Diagrams are code-native, decorative, and hidden from assistive technology.
They contain no ticket, status, coordinate, real map, or sample resident record.
The adjacent text supplies the instructions; the map does not claim any location.

## Content, state, and continuity

The guide reuses the existing bilingual reporting tips, with Android-specific
headings and tracking guidance in `nativeGuideContent.js`. English and Filipino
have the same five tasks and actions. Live language/theme changes retain the
current step. The first action is labeled Continue because it advances the guide;
it does not submit or open a report. During first launch the final Get started /
Magsimula action opens home. During replay the final action starts reporting.

Guest tracking copy explains saving the ticket ID and tracking code and using
Track a report on home. It does not imply every user has an account or My Reports.
Signed-in and guest report entry use `/report` and `/report?source=guest` respectively.
The root entry shows briefing until `pulso_tutorial_completed` is `true`.
Finishing or skipping persists this existing marker and opens home without a
refresh. Later launches go straight to the landing page. Interrupted briefings
reappear on the next launch; clearing app data or a clean install resets them.
Receipt tracking links bypass the introduction and preserve their credentials.
Skip and account access preserve the existing tutorial-completion storage marker.
The guide requests no camera, location, identity, notification, or network access.
Existing destination screens own their permissions, loading, errors, and recovery.

Controls define default, hover, pressed, and keyboard focus. There are no fabricated
loading, empty, success, stale, or offline record states because the guide fetches
no records. Diagrams and copy are bundled; they remain available offline.

## Responsive and accessibility behavior

The native shell continues to reserve Android system-bar insets on this route.
The guide fits the remaining viewport. Its footer stays available while the main
content can scroll on short screens or at enlarged text size; content is not cut
off to force a fixed screenshot. Column width is limited to 32rem.

Public controls are at least 44px high with a visible 3px focus ring. Each step
change resets content scroll and moves focus to the new heading. Android Back
returns to the previous step. The header language menu retains its existing
keyboard, outside-dismissal, and Android Back behavior. The progress bar exposes
localized current-step text, bounds, and value; progress is not color-only.
Forced colors use system roles. There is no motion requiring a reduced-motion
alternative. No analytics or outcome claims were added.

## Validation and Figma dependency

Browser checks exercise all five steps at 320/390/430px, in both themes and both
languages, including footer access, large text, Android Back, Skip, live language
switching, final guest report entry, and the unchanged browser tutorial.
The existing tracking checks cover the shared landing/header theme extraction.
These checks simulate the native bridge; physical-device and TalkBack review
remain separate acceptance steps.

The shared Figma file denied edit access again on 9 November 2026. No design-file
write is claimed. Once access is restored, inspect the reviewer-final resident
templates and core library, reconcile the paired guide screens and shared header,
promote the repeated guide pattern, annotate the states above, and validate the
rendered light/dark artifacts before claiming a production Figma handoff.
