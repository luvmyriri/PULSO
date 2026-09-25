# Civic Aperture concept-generation record

| Field | Value |
|---|---|
| Date | 23 August 2026 |
| Mode | Built-in ImageGen |
| Intent | Transform the v0.1 resident, government, and component boards into a distinctive minimalist-cinematic light/dark direction |
| References | Corresponding v0.1 concept board plus `frontend/public/pulso-logo.png` |

## Resident light and dark

```text
Use case: ui-mockup
Asset type: PULSO resident portal art-direction board
Primary request: Redesign the referenced resident mobile UI into a distinctive, high-fidelity dual-theme concept board showing two complete 390x844 phone screens side by side: Light and Dark. Preserve the useful information architecture and supplied PULSO logo, but replace the generic card-dashboard look.
Subject: A Philippine civic infrastructure reporting app where residents photograph street issues, pin locations, submit evidence, and track public action.
Art direction: “Civic Aperture” — minimalist civic documentary meets field-survey instrument. Calm, professional, visually creative, slightly cinematic. Ground the visual language in evidence photography, map contours, survey crosshairs, timestamp/coordinate metadata, infrastructure paint markings, and a single continuous Pulseline that connects evidence to status.
Composition: Use one wide cinematic evidence image as the visual anchor in the upper half, cropped like a documentary frame with subtle aperture corner marks. Place essential status and action information around it with disciplined asymmetry and generous negative space. Keep one clear thumb-level action and a quiet five-item bottom navigation.
Light palette: cool mineral concrete #F1F4F2, deep survey ink #101820, signal orange #E6531B, harbor blue #1C5870, muted field yellow #D7A43A.
Dark palette: night asphalt #070B0F, graphite #111920, fog white #E8EFEC, luminous signal orange #FF6A2A, muted cyan #6DB6CD.
Typography: characterful condensed engineering/wayfinding display face used sparingly, highly readable humanist sans for body, monospaced numerals for ticket ID, coordinates, and time.
Text where visible: PULSO; Good morning, Maya; Report an issue; PUL-2026-0822; In progress; Flooded street; 10th Ave · Brgy. 167; Received; Verified; Assigned; On site; Resolved; Light; Dark.
Interaction cues: 48px touch targets, obvious focus state, statuses never rely on color alone.
Constraints: high-fidelity product UI, practical and implementable, both themes are true semantic counterparts, readable at a glance, no loss of civic trust.
Avoid: generic SaaS cards, card soup, pill overload, glassmorphism, neon cyberpunk, huge decorative gradients, excessive rounded corners, floating abstract blobs, fake 3D, illegible microtext, Apple clone, Material clone, dashboard-template aesthetics.
```

## Government light and dark

```text
Use case: ui-mockup
Asset type: PULSO government operations portal art-direction board
Primary request: Redesign the referenced government desktop UI into a distinctive high-fidelity dual-theme concept board showing two coordinated 1440x900 operations workspaces, Light and Dark, in a wide editorial presentation. Preserve the practical queue/detail workflow and supplied PULSO logo but replace the generic admin-dashboard styling.
Subject: A Philippine city engineering command workspace for dispatchers reviewing citizen evidence, verifying location, assigning work, tracking field progress, and maintaining an audit trail.
Art direction: “Civic Aperture” — civic documentary precision with the composed tension of a command-room film frame. Professional and restrained, not sci-fi. Use field evidence, cadastral/map contours, survey grid marks, timestamp metadata, clean hairlines, and the Pulseline as a continuous operational signal.
Composition: compact deep-ink navigation rail; quiet report queue on the left; a larger case workspace on the right where documentary evidence and map form one cinematic split image. Use strong asymmetry, a thin orange live-signal band, and precise white space. Avoid equal-sized card grids. The selected record should feel like a focused scene, not another card.
Light palette: mineral daylight #F1F4F2, paper white #FBFCFB, survey ink #101820, signal orange #E6531B, harbor blue #164F68, steel #77848A.
Dark palette: night asphalt #070B0F, graphite #111920, elevated slate #18242C, fog white #E8EFEC, luminous orange #FF6A2A, muted cyan #70B8CF.
Typography: restrained condensed engineering display for page titles, highly legible sans for operational content, monospaced ticket IDs/time/coordinates.
Text where visible: PULSO; Citizen reports; LIVE QUEUE; PUL-2026-0822; Exposed electrical wire; Critical; Verified; 14 min; Assign work order; Evidence; Location; Activity; Light operations; Night operations.
Interaction cues: visible keyboard focus, selected row state beyond color, clear primary/secondary/destructive action hierarchy, status icons plus labels.
Constraints: dense but calm, highly legible, implementable web UI, light/dark semantic parity, appropriate for local-government operations.
Avoid: generic admin template, endless white cards, pill overload, glowing cyberpunk HUD, glassmorphism everywhere, decorative charts, giant gradients, excessive roundness, fake 3D, illegible tiny type, Apple clone, Material clone.
```

## Civic Aperture shared system

```text
Use case: ui-mockup
Asset type: PULSO Civic Aperture visual-system board
Primary request: Transform the referenced PULSO Core board into a bold but disciplined design-language board for a reusable light/dark UI system called “Civic Aperture.” Preserve the official logo reference and usable component breadth, but create a memorable identity rooted in civic infrastructure evidence and field-survey tools.
Art direction: minimalist, professional, visually creative, slightly cinematic. The signature is an “Aperture Signal”: four subtle corner marks framing evidence plus one continuous Pulseline crossing photo, map, ticket metadata, and lifecycle. Use authentic visual cues from road paint, blueprint/cadastral lines, survey instruments, timestamps, coordinates, and public-record stamps.
Board content: paired Light and Dark semantic color families; typography specimen with condensed display, humanist body, monospaced data; evidence image frame; map tile; buttons in primary/secondary/destructive/focus states; text field; status markers with icons and labels; selected table row; report timeline; bottom navigation; government rail; light/dark toggle; restrained motion storyboard frames.
Light palette: #F1F4F2, #FBFCFB, #101820, #E6531B, #164F68, #D7A43A, #267267.
Dark palette: #070B0F, #111920, #18242C, #E8EFEC, #FF6A2A, #70B8CF, #56A99A.
Typography: a distinctive condensed engineering/wayfinding display face, readable humanist sans, monospaced identifiers.
Text where visible: PULSO CORE; CIVIC APERTURE; Light; Dark; Evidence is the hero; One signal. One public record.; Report an issue; Assign work order; PUL-2026-0822; In progress.
Constraints: practical reusable design system, accessible contrast, focus ring, 44–48px targets, semantic parity across themes, cinematic detail spent only on evidence and transitions.
Avoid: generic SaaS kit, rounded card grid, pill overload, gratuitous glass, neon sci-fi, orange-on-white body text, giant gradients, abstract blobs, excessive shadows, fake 3D, illegible annotations.
```
