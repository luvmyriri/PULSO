# PULSO brand and visual system

## Status and authority

**Civic Aperture v0.2 is approved.** Its visual principles apply to public, resident, government, shared components, and both themes. Detailed route structures and lifecycles remain proposals unless separately approved.

Use these sources when a question needs deeper evidence:

- [`PRODUCT.md`](../../../../PRODUCT.md)
- [`09-visual-art-direction-v2.md`](../../../../docs/ui-ux-audit/09-visual-art-direction-v2.md)
- [`03-figma-design-system-spec.md`](../../../../docs/ui-ux-audit/03-figma-design-system-spec.md)
- [`10-figma-production-handoff.md`](../../../../docs/ui-ux-audit/10-figma-production-handoff.md)

## Design thesis

> A field observation becomes visible, accountable public work.

The system should feel minimalist, vibrant, professional, and locally specific. Its character comes from civic evidence, engineering records, North Caloocan place, road and hazard markings, survey data, and the heartbeat-route shape in the PULSO identity.

Minimalism means strong hierarchy and disciplined reduction, not neutral sameness. Vibrancy is concentrated in action, evidence, location, and lifecycle—not spread across decoration. Professionalism means honest state, stable patterns, legibility, and traceable decisions.

Use one authored PULSO signature in a meaningful place rather than adding many generic flourishes.

## Signature mechanisms

### Field Aperture

Use one dominant evidence or map region on an important viewport.

- Keep evidence true-color and unfiltered.
- Use four quiet framing corners; do not imitate a recording HUD.
- Put source, time, location, confidence, and review metadata on an opaque rail outside the image.
- Do not place explanatory copy over evidence.
- Provide meaningful alt text; maps also need an address/list alternative.
- Use no more than one dominant aperture per viewport.

### Signal Cut

Use a two-pixel heartbeat-derived route for lifecycle, selected record, active map segment, approval chain, or audit history.

- Show current, completed, future, failed, and unavailable states with label and icon/shape, not color alone.
- Use one sharp notch for the current point.
- Attach a meaningful time or event where the workflow provides one.
- Do not substitute a generic evenly spaced dot stepper.

### Coordinate Rail

Use compact mono data for real record context, for example ticket, barangay, coordinate, source, or update time. Never invent coordinate-like decoration or technical language.

### Local cartography and pictograms

- Keep road labels, barangay boundaries, selected jurisdiction, and water context legible in both themes.
- Use low-opacity local linework only in contextual headers or apertures, never as a global graph-paper texture.
- Use custom two-pixel engineering pictograms for PULSO categories.
- Use familiar accessible icons for search, back, close, download, settings, and other universal actions.

## Color contract

**Latest user-supplied reference, 27 October 2026:** supersedes the earlier lime/pale-green selection mapping below. Follow the supplied resident-portal palette: orange primary emphasis, pale warm-orange selection, white/cool-neutral surfaces and restrained teal/mint secondary accents. Keep semantic status/focus colors distinct and retain dark-blue operational text. The screenshot is visual direction; its resident sample names/data are not government content.

**Application correction, 27 October 2026:** emphasize orange/light-green accents and chart marks while light-mode page/card backgrounds remain white. Keep existing text colors. Subtle raised bar highlights/shadows and recessed tracks are explicitly requested. This supersedes the earlier proposed color dosage/role mapping where it conflicts; status and focus roles remain distinct.

**User correction, 27 October 2026:** PULSO's brand palette is orange, light green, white, and dark blue. This is the current approved palette direction; exact swatches remain unspecified. The role table below records the earlier Civic Aperture working mapping and requires reconciliation with this correction. Do not present cyan/Field Blue and teal as the complete brand palette. A working application is orange for primary emphasis, light green for supporting accents, white for work surfaces, and dark blue for structure/dark mode; the white-first action/selection mapping was subsequently approved by the user on 27 October 2026: orange for actions and AI/chart emphasis, the same pale green for navigation/tab/record selection, white work surfaces and existing text colors. Preserve distinct semantic warning, critical, resolved and focus meanings.

| Semantic role | Light | Dark | Use |
|---|---:|---:|---|
| Canvas | `#F4F7F5` | `#071A2B` | Page environment |
| Surface | `#FFFFFF` | `#0E283E` | Main work surface |
| Subtle/elevated surface | `#F8FAF9` | `#15364D` | Focused docket, secondary region, overlay |
| Primary text | `#0C2436` | `#F4F7F2` | Main content |
| Secondary text | `#465D6C` | `#B9C7CF` | Supporting content |
| Border/rule | `#C9D4D9` | `#335166` | Boundaries, dividers, future lifecycle |
| Resident action / pulse | `#B9380B` | `#FF8A3D` | Resident primary action and restrained signal |
| Government action | `#0B4F6C` | `#82C7D8` | Staff primary action and selection |
| Resolved | `#0B756B` | `#66D2C8` | Resolved/completed only |
| Warning | `#B45309` | `#FBBF24` | Needs attention or delayed |
| Critical | `#B42318` | `#FDA29B` | Error, critical, destructive |
| Focus | `#2563EB` | `#93C5FD` | Three-pixel keyboard focus |

Portal accent does not change status meaning. Do not use orange as resident action, warning, selection, navigation, and brand decoration at the same time.

The dossier currently uses conflicting aliases such as `bg/subtle` versus `surface/elevated`, `border/default` versus `rule/default`, and `state/success` versus `state/resolved`. Preserve semantic meaning and resolve the alias map explicitly before binding or implementation; do not create both as accidental duplicates.

Routine screens should remain roughly 75–80% canvas/surface, 12–15% ink/structure, and 3–5% portal accent, with remaining color reserved for real state.

## Theme contract

### Morning Field Sheet

- cool mineral canvas and white operational surfaces;
- crisp rules and restrained shadows;
- natural evidence;
- ember reads like inspection or road paint.

### Night Inspection

- deep survey blue rather than pure black;
- tonal surfaces and rules rather than glowing outlines;
- pale operational Field Blue and reflective ember without bloom;
- true-color evidence and unchanged information boundaries.

Both themes contain the same content, hierarchy, labels, actions, targets, privacy statements, evidence crop/provenance, and recovery paths. Theme defaults to system preference, supports an explicit override, persists, and avoids a flash of the wrong mode.

## Typography

Intended roles are:

- **Archivo Variable:** public thesis, page titles, civic headings;
- **Source Sans 3:** UI, forms, long-form copy, tables;
- **IBM Plex Mono:** real tickets, coordinates, times, measurements, and hashes.

Typography is provisional. Figma currently uses Inter as a safe placeholder. Do not call the intended type stack production-approved until licensing, Filipino glyph coverage, variable-width behavior, Windows rendering, 200% zoom, and fallback behavior pass review.

Use sentence case. Reserve short uppercase labels for genuine record fields. Never use mono for explanatory text or shrink utility text below 12/16.

## Composition

### Resident

- spacious, human, and action-led;
- one evidence/current-report focus;
- one thumb-visible report action;
- selective containment for persistent task objects;
- open ruled lists for updates and nearby context;
- stable five-destination bottom navigation on mobile.

### Government

- cooler, denser, and record-led;
- queue/detail continuity and a focused engineering docket;
- evidence and location as the primary focal material;
- quiet rows, Signal Cut selection, explicit sticky decisions;
- Field Blue for primary action and ember for escalation or urgent attention.

### Public and authentication

- use an asymmetric composition with one real civic aperture;
- keep forms on opaque surfaces with visible labels and recovery;
- use a restrained 40–44 px brand lockup rather than a giant logo.

## Motion

- Signal Cut advance: one draw over 320–450 ms, then settle.
- Government selection: crossfade with at most 8 px movement over 160–180 ms.
- Drawer: about 220 ms translation, no scale or background blur.
- Map selection: one pulse, never infinite.
- Reduced motion: immediate change or a short opacity fade.

Avoid card lift, logo scale, parallax, marquee, floating particles, background breathing, repeated shimmer, and ornamental loading.

## Anti-patterns

- generic card grid or a card around every section;
- navy-sidebar/blue-row as the whole government identity;
- Netflix/Facebook/Notion/ChatGPT trade-dress imitation;
- blue–orange gradients, glass, neon, aurora, full-screen 3D, or pure-black glow;
- giant logos, stock resident portraits, decorative KPI grids;
- pills for ordinary navigation and every label;
- fake technical data, blueprint language, coordinates, claims, or metrics;
- filtered evidence or text placed over evidence;
- equal emphasis for every status color;
- generic straight-dot steppers.
