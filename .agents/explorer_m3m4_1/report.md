# Milestone 3 Architectural Blueprint & Implementation Guide
## Frontend Landing Page, Navigation Hierarchy, and Public Routing Architecture

**Target Repository**: `c:\Users\Val\Desktop\PULSO`  
**Milestone**: Milestone 3 (Frontend Landing Page & Navigation Hierarchy)  
**Author**: `explorer_m3m4_1`  
**Date**: September 2, 2026  
**Status**: Architecture & Implementation Specification (Ready for Implementation)

---

## 1. Executive Summary & Problem Context

PULSO is the City Engineering Department Management System for Caloocan City, serving both the public/residents and city engineering personnel across two connected experiences.

### The Problem
Previously, the frontend experience suffered from critical architectural and design mismatches:
1. **Mandatory Pre-Registration Barrier**: Resident issue reporting required logging into or registering an account prior to reporting, blocking guest reports and frustrating citizens reporting immediate street-level hazards.
2. **Conflated Routing**: Routes were mixed without clear public intake separation (`/report`, `/report/success`, `/track`).
3. **Outdated Landing Presentation**: The incumbent landing page contained legacy marketing 3D models (`Hero3D`), aurora borealis blobs, and generic buttons pointing to `/register` and `/login` rather than direct reporting and tracking.
4. **Staff Entry Ambiguity**: The staff gateway was embedded inconsistently without clear demarcation from public resident actions.

### The Solution
Milestone 3 establishes a clean, modern, and accessible public entry and routing hierarchy:
- **Open Public Reporting Intake**: Primary CTA "Report an Issue" with prominent microcopy "No account required", navigating directly to `/report` without any login/register redirect.
- **Dedicated Public Tracking**: Secondary CTA "Track a Report", navigating directly to `/track` for secure lookup using Ticket ID and private tracking code.
- **Discrete Staff Gateway**: Clean, low-weight gateway navigation to `/gov` for municipal staff and engineers.
- **Civic Aperture v0.2 Design System**: Full compliance with Morning Field Sheet (Light) and Night Inspection (Dark) themes, genuine Caloocan photography, and Signal Cut lifecycle styling.
- **Responsive Navigation Hierarchy**: Persistent clean masthead on desktop; stable 5-destination bottom navigation bar on mobile with an elevated thumb-accessible report action.
- **Bilingual English/Tagalog Parity**: 100% localization parity across all hero, CTA, navigation, and microcopy strings.

---

## 2. Routing Architecture & Integration Plan (`App.jsx`)

### 2.1 Route Inventory & Authorization Boundaries

The top-level routing in `frontend/src/App.jsx` defines three distinct security zones:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PULSO ROUTING MAP                                    │
│                                                                                        │
│  [PUBLIC UNRESTRICTED ZONE]                                                            │
│  ├─ /                          Landing Page (ResidentSurface)                          │
│  ├─ /resident-home             Landing Page Alias (ResidentSurface)                    │
│  ├─ /report                    7-Step Reporting Flow (ResidentSurface, Open Intake)    │
│  ├─ /report/success            Authoritative Ticket Receipt (ResidentSurface)          │
│  ├─ /track                     Public Status & Timeline Lookup (ResidentSurface)       │
│  ├─ /gov                       Government Portal Entry / Staff Login Gateway           │
│  ├─ /login                     Resident Sign In                                        │
│  ├─ /register                  Resident Verification & Registration                    │
│  └─ /reset-password            Credential Recovery                                     │
│                                                                                        │
│  [RESIDENT AUTHENTICATED ZONE]                                                         │
│  └─ /dashboard/*               Resident Portal (<ResidentOnly><ResidentSurface>...)    │
│     ├─ /dashboard              Overview & My Reports (All, Active, Needs Info, Done)   │
│     ├─ /dashboard/reports/:id  Detailed Report Docket                                  │
│     ├─ /dashboard/updates      City Engineering Advisories                             │
│     └─ /dashboard/account      Resident Profile, Verification & Preferences            │
│                                                                                        │
│  [GOVERNMENT AUTHENTICATED ZONE]                                                       │
│  └─ /gov/*                     Government Operations Workspace (<GovOnly>...)          │
│     ├─ /gov/my-dashboard       Personal Task Dashboard                                 │
│     ├─ /gov/operations         Triage, Dispatch, Work Orders & Field Inspection        │
│     ├─ /gov/delivery           Capital Projects, Design Requests, BOQ & Procurement    │
│     ├─ /gov/records-workspace  Document Registry, Process Timelines & Audit Logs       │
│     ├─ /gov/insights           Predictive Maintenance, Spatial Heatmaps & Analytics    │
│     └─ /gov/administration     Staff Roles, Residents & System Settings (Admin Only)   │
│                                                                                        │
│  [WILDCARD CATCH-ALL]                                                                  │
│  └─ *                          Redirect to "/"                                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Navigation Lifecycle & State Transitions

1. **Guest Reporting Lifecycle**:
   - `Visitor` on `/` clicks **"Report an Issue"** (`/report`).
   - Completes 7-step wizard (Category → Location Map → Evidence Upload → Details → Optional Contact → Review → Submit).
   - On submission, client calls `POST /api/reports` (guest payload without auth header).
   - Server returns `201 Created` with `ticket_id` (e.g., `RPT-20260902-8F92E1B4`) and `tracking_token` (e.g., `TRK-9F83-A8B2-C4E6-10D7`).
   - Client navigates to `/report/success` with state: `{ ticketId, trackingToken, trackingUrl, report }`.

2. **Public Status Tracking Lifecycle**:
   - `Resident` on `/` clicks **"Track a Report"** (`/track`) or visits `/track?id=...&code=...`.
   - Client submits lookup to `POST /api/reports/track`.
   - On success, displays public-safe timeline, current stage, and location summary.
   - If invalid credentials, displays safe, generic anti-enumeration notice without revealing whether ticket exists.

3. **Contextual Account Claiming Lifecycle**:
   - On `/report/success` or `/track`, user clicks **"Save to My Reports"**.
   - If unauthenticated, opens Auth Modal / redirects to `/login?claim_ticket=...&claim_token=...`.
   - After authentication, app calls `POST /api/reports/{id}/claim` with `{ tracking_token }`.
   - Server links report to resident account (`claimed_by_user_id`), logs immutable audit entry, and redirects resident to `/dashboard` with success toast.

### 2.3 Proposed Changes in `frontend/src/App.jsx`

```jsx
// frontend/src/App.jsx additions

import Landing          from './pages/Landing';
import ReportWizardPage from './pages/ReportWizardPage'; // Milestone 4
import ReportSuccessPage from './pages/ReportSuccessPage'; // Milestone 5
import PublicTrackPage  from './pages/PublicTrackPage';  // Milestone 5

// In <Routes>:
{/* ── PUBLIC RESIDENT ROUTES ─────────────────────────── */}
<Route path="/"               element={<ResidentSurface><Landing /></ResidentSurface>} />
<Route path="/resident-home"  element={<ResidentSurface><Landing /></ResidentSurface>} />
<Route path="/report"         element={<ResidentSurface><ReportWizardPage /></ResidentSurface>} />
<Route path="/report/success" element={<ResidentSurface><ReportSuccessPage /></ResidentSurface>} />
<Route path="/track"          element={<ResidentSurface><PublicTrackPage /></ResidentSurface>} />
<Route path="/login"          element={<ResidentSurface><Login /></ResidentSurface>} />
<Route path="/register"       element={<ResidentSurface><Register /></ResidentSurface>} />
<Route path="/reset-password" element={<ResidentSurface><ResetPassword /></ResidentSurface>} />

{/* ── GOVERNMENT ENTRY & PORTAL ──────────────────────── */}
<Route path="/gov"            element={<GovLanding />} />
<Route path="/gov/my-dashboard" element={<GovOnly><PositionDashboard /></GovOnly>} />
// ... (Preserve existing /gov/* workspace routes)

{/* ── RESIDENT AUTHENTICATED PORTAL ──────────────────── */}
<Route path="/dashboard/*" element={
    <ResidentOnly><ResidentSurface><ResidentDashboard /></ResidentSurface></ResidentOnly>
} />
```

---

## 3. Landing Page & Cinematic Hero Architecture

### 3.1 Visual North Star: Civic Aperture v0.2
The visual identity follows **Civic Aperture**:
- **Design Thesis**: *"A field observation becomes visible, accountable public work."*
- **Field Aperture**: Anchors the hero with real, true-color Caloocan aerial and street-level imagery, framed with quiet corner marks.
- **Signal Cut**: A two-pixel route heartbeat progress line for carousel slides and lifecycle milestones.
- **No Decoration Gimmicks**: Elimination of 3D canvasses, aurora blobs, particle clouds, glassmorphism blur traps, or fake metrics.

### 3.2 `ResidentCinematicHero.jsx` Component Specification

#### Hero Structure & Layout
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [Field Aperture Carousel Image: Morning Aerial / Blue-Hour Inspection Crew]            │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ EYEBROW: Public works reporting · Caloocan City                                    │ │
│ │                                                                                    │ │
│ │ TITLE:   See the problem.                                                          │ │
│ │          Start the response. (Italic Serif Accent)                                 │ │
│ │                                                                                    │ │
│ │ BODY:    Report road, drainage, lighting, and utility issues across                │ │
│ │          Caloocan—and follow every update.                                         │ │
│ │                                                                                    │ │
│ │ ┌────────────────────────┐  ┌─────────────────────┐  ┌───────────────────────────┐ │ │
│ │ │ [!] Report an Issue    │  │ [→] Track a Report  │  │ [Shield] Staff Gateway    │ │ │
│ │ │ (No account required)  │  │                     │  │                           │ │ │
│ │ └────────────────────────┘  └─────────────────────┘  └───────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ [01 Observe ───] [02 Report ───] [03 Follow ───]              [↓ See how PULSO works] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Exact Interaction Requirements for Hero CTAs
1. **Primary Action ("Report an Issue")**:
   - **Target**: Navigates directly to `/report` via `<Link to="/report">`.
   - **Constraint**: Must NEVER redirect to `/login` or `/register`.
   - **Visual Style**: Ember surface (`#B9380B` in Light mode, `#FF8A3D` with dark text in Dark mode), 48px–52px minimum touch height, subtle elevation shadow (`shadow-md hover:shadow-xl hover:-translate-y-0.5`).
   - **Microcopy**: Rendered as a distinct subline or badge: `"No account required"` (`landing.cinematic.noAccountRequired`), font-size 0.72rem, opacity 0.9, tabular spacing.
2. **Secondary Action ("Track a Report")**:
   - **Target**: Navigates to `/track` via `<Link to="/track">`.
   - **Visual Style**: Clean bordered ghost/surface link with chevron icon, subtle hover highlight.
3. **Discrete Staff Gateway**:
   - **Target**: Navigates to `/gov` (or government login).
   - **Visual Style**: Low visual prominence, slate pill with small Shield icon (`lucide-react`), semitransparent surface (`bg-slate-900/40 dark:bg-slate-800/60`), clearly separated from citizen reporting tools.

#### Carousel Data & Slide Specifications
The carousel cycles through 3 authentic field stages:
1. **Observe** (Slide 1):
   - Daylight Aerial: `/resident-hero/caloocan-light-aerial-v1.jpg`
   - Dark Blue Hour: `/resident-hero/caloocan-blue-hour-v1.png`
   - Eyebrow: `Public works reporting · Caloocan City`
   - Title: `See the problem.` / `Start the response.`
   - Body: `Report road, drainage, lighting, and utility issues across Caloocan—and follow every update.`
2. **Report** (Slide 2):
   - Daylight Crew: `/resident-hero/caloocan-light-crew-v1.jpg`
   - Dark Response: `/resident-hero/caloocan-rain-response-v1.png`
   - Eyebrow: `From the street to the right city team`
   - Title: `When the street speaks, the city` / `should listen.`
   - Body: `Show the issue, add the location, and follow the city response from one clear record.`
3. **Follow** (Slide 3):
   - Daylight Morning: `/resident-hero/caloocan-light-morning-v1.jpg`
   - Dark Dawn: `/resident-hero/caloocan-dawn-v1.png`
   - Eyebrow: `One report · One clear public record`
   - Title: `Your report` / `moves` / `the city.`
   - Body: `Share the evidence. Mark the place. See what happens next.`

---

## 4. Landing Page Section Flow (`Landing.jsx`)

The complete `Landing.jsx` page structure is organized into a cohesive civic narrative:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. TOP NAVBAR: Branding, Scope, Process, Services, ThemeToggle, LangToggle, Report CTA │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. RESIDENT CINEMATIC HERO: Field Aperture, Primary Report (No Auth), Track, Staff     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. EMERGENCY BANNER: Life/Safety threat hotline alert (911 / Caloocan Rescue 888-1234)  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. THREE-STEP SUMMARY: [1. Pin Location] ──► [2. Upload Photo] ──► [3. Track Progress] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 5. INFRASTRUCTURE SCOPE: Horizontal (Roads), Vertical (Bldgs), Drainage, Public Spaces  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 6. HOW PULSO WORKS: 5-Step PulseLine Stepper from Incident Logging to Final Resolution  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 7. PUBLIC SERVICES GATEWAY: Senior OSCA, PWD Welfare, Solo Parent, GAD Project Portals  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 8. LGU ENGINEERING OFFICE: Official Jurisdictional Bounds, Direct Lines, Office Hours  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 9. MOBILE APP DOWNLOAD: Resident Android APK direct install & QR Code                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 10. COMPREHENSIVE FOOTER: Legal Modals (Privacy, Terms, Cookies), Staff Portal, & PII  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Responsive Navigation Strategy (Desktop vs Mobile 5-Tab)

### 5.1 Desktop Navigation (Viewport >= 768px)
- **Top Masthead**: Persistent fixed header (`h-16`), backdrop blur (`backdrop-blur-md`), subtle border bottom (`border-slate-200 dark:border-slate-800`).
- **Left**: `ResidentBranding` (Caloocan seal + PULSO pin logo + wordmark).
- **Center**: Smooth anchor links: `#features` (Scope), `#howitworks` (Process), `#cityservices` (Services), `#about` (Office).
- **Right**:
  - `LanguageSwitcher` button / toggle (`EN` / `TL`).
  - `ResidentThemeToggle` (`Light` / `System` / `Dark`).
  - `Staff Gateway` link with Shield icon (`/gov`).
  - Primary CTA: `<Link to="/report">` ("Report an Issue").

### 5.2 Mobile Navigation Hierarchy (Viewport < 768px)
- **Top Bar**: Minimalist and clean (Logo + Language Toggle + Theme Toggle).
- **Mobile Bottom Navigation Bar (5-Destination Standard)**:
  Fixed to the bottom viewport with safe-area padding:

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│   [⌂]           [⌕]             ( + )           [☵]          [👤]      │
│   Home         Track           Report         Updates       Account    │
│   (/)         (/track)        (/report)     (/#updates)    (/login)    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Home** (`/`): Returns to top of landing page.
2. **Track** (`/track`): Opens public tracking search.
3. **Report** (`/report`): **Elevated Center Ember Button** (`w-14 h-14 rounded-full bg-[#b9380b] dark:bg-[#ff8a3d] text-white shadow-lg -mt-5 flex items-center justify-center border-4 border-white dark:border-slate-900`). Provides instant single-thumb report creation.
4. **Updates** (`/#updates` or `/gov/advisories`): Displays official advisories and notices.
5. **Account** (`/login` or `/dashboard` if logged in): Accesses citizen account profile.

---

## 6. Civic Aperture Design Tokens & Theming Contract

### 6.1 Theme Token Mapping

| Token Role | Morning Field Sheet (Light) | Night Inspection (Dark) | Notes & Contrast |
|---|---|---|---|
| **Canvas** | `#F4F7F5` | `#071A2B` | Page background canvas |
| **Work Surface** | `#FFFFFF` | `#0E283E` | Component & card container |
| **Elevated Surface** | `#F8FAF9` | `#15364D` | Modals, active dockets, popovers |
| **Primary Text (Ink)** | `#0C2436` | `#F4F7F2` | Contrast > 14:1 against canvas |
| **Secondary Text** | `#465D6C` | `#B9C7CF` | Supporting labels & metadata |
| **Border / Rule** | `#C9D4D9` | `#335166` | Subtle 1px structural dividers |
| **Resident Action (Ember)**| `#B9380B` | `#FF8A3D` | Primary citizen action (5.8:1 Light, 7.5:1 Dark) |
| **Staff Action (Field Blue)**| `#0B4F6C` | `#82C7D8` | Government selection & dispatch |
| **Resolved Status** | `#0B756B` | `#66D2C8` | Completed repair verification |
| **Warning Status** | `#B45309` | `#FBBF24` | Requires resident attention / delayed |
| **Critical / Emergency** | `#B42318` | `#FDA29B` | Life-safety alerts & error states |
| **Focus Indicator** | `3px solid #2563EB` | `3px solid #93C5FD` | Accessible 3px keyboard outline, offset 4px |

### 6.2 Strict Anti-Patterns & Visual Discipline
- **NO Blue-Orange Gradients**: Primary buttons must use solid ember (`#B9380B` / `#FF8A3D`) or field blue (`#0B4F6C` / `#82C7D8`).
- **NO Photo Filters**: Resident evidence and hero imagery must remain true-color with natural white balance.
- **NO Explanatory Overlay on Images**: Metadata and text must live in opaque rails or structured layout containers beside/below images.
- **NO Floating Canvas 3D**: Replace legacy Three.js canvas on the public landing with responsive Civic Aperture media.

---

## 7. Bilingual English / Tagalog Localization (EN/TL)

### 7.1 Required Key Matrix (`en.json` & `tl.json`)

#### In `frontend/src/locales/en.json`:
```json
{
  "landing": {
    "nav": {
      "home": "Home",
      "scope": "Infrastructure Scope",
      "howitworks": "How It Works",
      "services": "City Services",
      "about": "Engineering Office",
      "report": "Report an Issue",
      "track": "Track Report",
      "login": "Sign In",
      "staff": "Staff Portal"
    },
    "cinematic": {
      "ariaLabel": "PULSO Caloocan Public Works Service",
      "report": "Report an Issue",
      "noAccountRequired": "No account required",
      "track": "Track a Report",
      "staff": "Staff Gateway",
      "explore": "See how PULSO works",
      "slideControls": "Hero slides",
      "previous": "Previous slide",
      "next": "Next slide",
      "showSlide": "Show {{number}}: {{label}}",
      "slides": {
        "observe": {
          "label": "Observe",
          "eyebrow": "Public works reporting · Caloocan City",
          "title1": "See the problem.",
          "title2": "Start the response.",
          "body": "Report road, drainage, lighting, and utility issues across Caloocan—and follow every update.",
          "alt": "Wide aerial view across Caloocan with neighborhoods and roads."
        },
        "report": {
          "label": "Report",
          "eyebrow": "From the street to the right city team",
          "title1": "When the street speaks, the city",
          "title2": "should listen.",
          "body": "Show the issue, add the location, and follow the city response from one clear record.",
          "alt": "A Caloocan public works maintenance crew on a street inspection."
        },
        "follow": {
          "label": "Follow",
          "eyebrow": "One report · One clear public record",
          "title1": "Your report",
          "title2": "moves",
          "title3": "the city.",
          "body": "Share the evidence. Mark the place. See what happens next.",
          "alt": "Caloocan landscape with neighborhoods leading toward the city horizon."
        }
      }
    },
    "emergency": {
      "badge": "Life / Safety Emergency",
      "notice": "For life-threatening emergencies, open flood hazards, or downed live power cables, please call the 24/7 hotline immediately.",
      "call911": "Dial 911",
      "rescueHotline": "Caloocan Rescue: (02) 888-1234"
    },
    "mobileNav": {
      "home": "Home",
      "track": "Track",
      "report": "Report",
      "updates": "Updates",
      "account": "Account"
    }
  }
}
```

#### In `frontend/src/locales/tl.json`:
```json
{
  "landing": {
    "nav": {
      "home": "Home",
      "scope": "Nasasakupang Imprastraktura",
      "howitworks": "Paano Gumagana",
      "services": "Mga Serbisyo ng Lungsod",
      "about": "Tanggapan ng Inhinyero",
      "report": "Mag-ulat ng Problema",
      "track": "Subaybayan ang Ulat",
      "login": "Mag-sign In",
      "staff": "Portal ng Kawani"
    },
    "cinematic": {
      "ariaLabel": "PULSO Serbisyong Pampublikong Gawain ng Caloocan",
      "report": "Mag-ulat ng Problema",
      "noAccountRequired": "Hindi kailangan ng account",
      "track": "Subaybayan ang Ulat",
      "staff": "Portal ng Kawani",
      "explore": "Alamin kung paano gumagana ang PULSO",
      "slideControls": "Mga eksena sa panimula",
      "previous": "Nakaraang eksena",
      "next": "Susunod na eksena",
      "showSlide": "Ipakita ang {{number}}: {{label}}",
      "slides": {
        "observe": {
          "label": "Pansinin",
          "eyebrow": "Pag-uulat ng pampublikong gawain · Lungsod ng Caloocan",
          "title1": "Pansinin ang problema.",
          "title2": "Simulan ang pagtugon.",
          "body": "Iulat ang problema sa kalsada, kanal, ilaw, at utility sa Caloocan—at subaybayan ang bawat update.",
          "alt": "Malawak na tanawin ng Caloocan sa himpapawid na may mga komunidad at kalsada."
        },
        "report": {
          "label": "Iulat",
          "eyebrow": "Mula sa kalsada patungo sa tamang pangkat ng lungsod",
          "title1": "Kapag nagsalita ang kalsada, dapat",
          "title2": "makinig ang lungsod.",
          "body": "Ipakita ang problema, ilagay ang lokasyon, at subaybayan ang tugon ng lungsod sa isang malinaw na tala.",
          "alt": "Pangkat ng pampublikong gawain sa Caloocan na sumusuri ng kalsada."
        },
        "follow": {
          "label": "Subaybayan",
          "eyebrow": "Isang ulat · Isang malinaw na pampublikong tala",
          "title1": "Ang iyong ulat ang",
          "title2": "nagpapakilos",
          "title3": "sa lungsod.",
          "body": "Ibahagi ang ebidensya. Ituro ang lugar. Alamin ang susunod na mangyayari.",
          "alt": "Tanawin ng Caloocan sa bukang-liwayway patungo sa skyline ng lungsod."
        }
      }
    },
    "emergency": {
      "badge": "Emerhensiya sa Buhay at Kaligtasan",
      "notice": "Para sa agarang emerhensiya sa buhay, matinding pagbaha, o naputol na kable ng kuryente, tumawag agad sa 24/7 hotline.",
      "call911": "Tumawag sa 911",
      "rescueHotline": "Caloocan Rescue: (02) 888-1234"
    },
    "mobileNav": {
      "home": "Home",
      "track": "Subaybayan",
      "report": "Mag-ulat",
      "updates": "Balita",
      "account": "Account"
    }
  }
}
```

---

## 8. Step-by-Step Code Implementation Guide

### Step 1: Update `frontend/src/components/ResidentCinematicHero.jsx`
1. Re-target the primary CTA from `/register` to `/report`.
2. Add the microcopy badge `"No account required"` directly within/under the primary CTA.
3. Re-target the secondary CTA from `/login` to `/track`.
4. Ensure the Staff Gateway points to `/gov` and retains calm, discrete styling.
5. Verify slide controls and rotation timings comply with reduced motion preferences.

### Step 2: Update `frontend/src/pages/Landing.jsx`
1. Replace legacy `Hero3D` and `PremiumHeroBackground` with `<ResidentCinematicHero onExplore={scrollToScope} />`.
2. Update the top navigation bar with:
   - `ResidentBranding`
   - Navigation anchors (`#scope`, `#howitworks`, `#cityservices`, `#about`)
   - `ResidentThemeToggle`
   - Direct button to `/report` ("Report an Issue")
   - Staff gateway icon link to `/gov`
3. Add the Emergency Hotline alert banner right below the hero.
4. Add the responsive Mobile Bottom Navigation bar (`ResidentBottomNav`).
5. Wire up the footer with updated links to `/track`, `/report`, `/login`, and `/gov`.

### Step 3: Update `frontend/src/App.jsx`
1. Register public routes `/report`, `/report/success`, and `/track` wrapped in `<ResidentSurface>`.
2. Ensure placeholder or stub components allow clean compilation until M4/M5 deliver the full page internals.
3. Verify that all `/gov/*` and `/dashboard/*` routes remain strictly protected.

### Step 4: Update Localization Dictionaries
1. Merge new translation keys into `frontend/src/locales/en.json`.
2. Merge matching Tagalog translations into `frontend/src/locales/tl.json`.
3. Verify that `LanguageSwitcher.jsx` switches dynamically without layout breaks.

### Step 5: Accessibility & Build Verification
1. Verify keyboard tab order: Masthead -> Hero Primary CTA -> Secondary CTA -> Staff Gateway -> Slide Controls -> Sections.
2. Confirm 3px focus ring is visible on all interactive elements.
3. Run `npm run build` in `frontend/` to confirm 0 compilation or bundling errors.

---

## 9. Verification & Acceptance Criteria Matrix

| # | Acceptance Criterion | Verification Method | Pass Condition |
|---|---|---|---|
| **AC-1** | First viewport shows "Report an Issue" with "No account required" subtext | Inspect `ResidentCinematicHero.jsx` & verify browser rendering | Button text "Report an Issue" + subline "No account required" present |
| **AC-2** | Clicking "Report an Issue" opens `/report` without redirecting to login | Click primary CTA on `/` | Browser URL immediately becomes `/report`; no auth check triggered |
| **AC-3** | Clicking "Track a Report" opens `/track` | Click secondary CTA on `/` | Browser URL becomes `/track` |
| **AC-4** | Staff Gateway navigates to `/gov` with separated styling | Click Staff Gateway badge | Browser URL becomes `/gov`; visually distinct from citizen CTAs |
| **AC-5** | Mobile viewport shows 5-destination bottom navigation bar | Viewport width < 768px in browser/DevTools | Bottom bar renders 5 tabs with prominent center ember button |
| **AC-6** | Light and dark mode render with Civic Aperture token parity | Toggle theme between Light and Dark | Colors match Morning Field Sheet (`#F4F7F5`) & Night Inspection (`#071A2B`) |
| **AC-7** | English and Tagalog parity across all hero and navigation copy | Toggle language between EN and TL | All headings, CTAs, microcopy, and tabs translate cleanly |
| **AC-8** | Frontend compiles with 0 errors | Run `npm run build` in `frontend/` | Vite build completes successfully |
