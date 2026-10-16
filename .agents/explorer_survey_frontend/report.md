# PULSO Frontend Architecture & Open Reporting Investigation Report

**Document Status**: Final Investigation & Architectural Specification  
**Investigator**: Frontend Explorer  
**Date**: 2026-09-02  
**Target Repository**: `frontend/` (PULSO Web Application)  
**Governing Documents**: `c:\Users\Val\Desktop\PULSO\.agents\ORIGINAL_REQUEST.md`, `c:\Users\Val\Desktop\PULSO\AGENTS.md`, `docs/ui-ux-audit/`

---

## 1. Executive Summary

A comprehensive architectural inspection was conducted across the PULSO frontend codebase (`frontend/`). The investigation evaluated the frontend framework, styling and design systems, Caloocan City GIS mapping, navigation and landing page structure, report creation flows, receipt and tracking mechanisms, authenticated resident dashboard views, and build/test pipelines.

### Core Assessment Summary
1. **Frontend Architecture & Tooling**: PULSO utilizes **React 19.2.0** with **Vite 7.3.1**, **Tailwind CSS v4 (`@tailwindcss/vite` 4.2.1)**, **React Router DOM 7.13.1**, and **Lucide React 0.575.0**. The build pipeline is fully operational (`npm run build` compiles with 0 errors).
2. **Design System & Art Direction**: The codebase defines the approved **Civic Aperture** design tokens in `frontend/src/index.css` (featuring *Morning Field Sheet* light theme and *Night Inspection* dark theme) and `frontend/src/resident/evangelista.css`.
3. **Current Entry Point Gap**: The current landing page (`Landing.jsx`) directs reporting exclusively to account registration (`/register`). The existing `ResidentCinematicHero.jsx` component implements Civic Aperture slide transitions but currently routes "Report an issue" to `/register` and "Track a report" to `/login`.
4. **Current Report Creation Gap**: Report filing is currently implemented as a monolithic modal (`activeModal === 'file-report'`) buried exclusively within the authenticated `ResidentDashboard.jsx`. It requires a resident JWT bearer token and enforces blocking AI image validation, preventing guest/anonymous reporting.
5. **Missing Public Routes**: Top-level routes for `/report` (guided 7-step reporting wizard), `/report/success` (public ticket receipt with private tracking token), and `/track` (public tracking view with stage stepper) are currently absent from `App.jsx`.
6. **Authenticated Dashboard & Claim Workflow Gap**: `ResidentDashboard.jsx` currently displays legacy status tabs (`['all', 'pending', 'in_progress', 'resolved', 'rejected', 'cancelled']`) and lacks a dedicated **"Needs Information"** tab as well as the **Report Claiming Workflow** (`POST /api/reports/{id}/claim`) needed to link guest reports to authenticated user accounts.

---

## 2. Dimension 1: Framework, UI Libraries, Styling & Caloocan Map Integration

### 2.1 Dependencies & Libraries (`frontend/package.json`)
- **Core Framework**: React `^19.2.0`, React DOM `^19.2.0`, React Router DOM `^7.13.1`.
- **Bundler & Build Tooling**: Vite `^7.3.1`, `@vitejs/plugin-react` `^5.1.1`.
- **Styling**: Tailwind CSS `^4.2.1` via `@tailwindcss/vite` `^4.2.1`, PostCSS `^8.5.6`.
- **Icons & UI Primitives**: `lucide-react` `^0.575.0`, `framer-motion` `^12.34.3`, `sweetalert2` `^11.26.24`.
- **Map & GIS**: `@react-google-maps/api` `^2.20.8`.
- **Internationalization**: `i18next` `^25.8.13`, `react-i18next` `^16.5.4`, `i18next-browser-languagedetector` `^8.2.1`.
- **Utilities**: `date-fns` `^4.1.0`, `qrcode` `^1.5.4`, `react-datepicker` `^9.1.0`, `react-google-recaptcha` `^3.1.0`, `axios` `^1.13.5`.
- **3D Graphics (Hero Visuals)**: `three` `^0.183.1`, `@react-three/fiber` `^9.5.0`, `@react-three/drei` `^10.7.7`, `@splinetool/react-spline` `^4.1.0`.

### 2.2 Design System Tokens & Theming (`src/index.css`)
The application defines design tokens adhering to the Civic Aperture art direction:
- **Theme Variables**:
  - `--color-canvas`: Light `#f7f8fa` (*Morning Field Sheet*), Dark `#071a2b` (*Night Inspection*).
  - `--color-ink`: `#132238` (Light), `#f4f7f2` (Dark).
  - `--color-resident-action`: `#c2410c` / `#ff8a3d` (Ember).
  - `--color-field-blue`: `#0b4f6c` / `#82c7d8` (Government Action).
  - `--color-resolved`: `#0f766e` / `#66d2c8` (Teal).
  - `--color-warning`: `#b45309` / `#fdb022` (Amber).
  - `--color-danger` / `--gov-critical`: `#b42318` / `#fda29b` (Crimson).
  - `--color-focus`: `#2563eb` / `#93c5fd` (3px accessible focus ring).
- **Typography Tokens**:
  - Sans: `Inter`, sans-serif.
  - Display: `Archivo` / `Oswald`, sans-serif.
  - Mono: `IBM Plex Mono`, `SF Mono`, `Cascadia Code`, monospace.

### 2.3 Caloocan City Map Integration
Map implementation patterns observed in `ResidentDashboard.jsx:2562-2645`:
- **Google Maps API Loader**: Configured with `libraries: ['places', 'geometry']` and `googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.
- **Caloocan Locality Identifier**: `CALOOCAN_CITY_PLACE_ID = 'ChIJXxuEGbWxlzMRGi0EJeJw5wU'`.
- **Data-Driven Styling (DDS)**: Styled via `featureLayer = mapInstance.getFeatureLayer('LOCALITY')` with stroke `#6366f1` and fill `#6366f1` at 15% opacity.
- **Map Styling**: Custom `DARK_MAP_STYLE` (slate/indigo dark theme) and `LIGHT_MAP_STYLE` (minimal slate/gray canvas).
- **Geocoding & Reverse Geocoding**: Utilizes backend service at `${API_BASE_URL}/api/geocode/reverse?lat=${lat}&lng=${lng}` returning standardized human address, barangay, and Plus Code coordinates.
- **Street View & Camera Lens**: Integrates `StreetViewService` and custom `IDCameraModal.jsx` for GPS-stamped photo capture (`metadata.lat`, `metadata.lng`, `metadata.address`).

---

## 3. Dimension 2: Landing Page & Navigation Redesign (Open Entry & Staff Gateway Separation)

### 3.1 Observed Structure (`Landing.jsx` & `ResidentCinematicHero.jsx`)
- **Observed Navigation (`Landing.jsx:109-165`)**:
  - Contains branding logo, section anchor links (`#home`, `#features`, `#solutions`, `#about`), theme switcher, and a single `<Link to="/login">` button.
  - The internal staff gateway link (`/gov`) is hidden only within the mobile hamburger menu drawer (`Landing.jsx:160`).
- **Observed Hero (`Landing.jsx:168-214`)**:
  - Employs `Hero3D` canvas inside `PremiumHeroBackground` with marketing copy.
  - Primary CTA is `<Link to="/register">` ("Register"), requiring account creation before reporting.
- **Unconnected Component (`ResidentCinematicHero.jsx:1-231`)**:
  - A dedicated Civic Aperture component already exists with three editorial slides: *Observe*, *Report*, *Follow*.
  - It features accessible slide navigation, ARIA live regions, and action links (`Report an issue`, `Track a report`, `Staff Gateway`), but points `Report an issue` to `/register` and `Track a report` to `/login`.

### 3.2 Target Redesign Architecture
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [PULSO Brand] · Caloocan City      [Features] [About]    [EN/FIL] [Theme]  [Track] [Sign In]  [🛡️ Staff Gateway] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   PUBLIC WORKS REPORTING · CALOOCAN CITY                                               │
│   See the problem. Start the response.                                                 │
│                                                                                        │
│   Report road, drainage, lighting, and utility hazards across Caloocan                 │
│   and track verified city repairs in real time.                                        │
│                                                                                        │
│   ┌────────────────────────────────┐   ┌───────────────────────────┐                   │
│   │  ⚡ Report an Issue            │   │  🔍 Track a Report        │                   │
│   │  No account required           │   │                           │                   │
│   └────────────────────────────────┘   └───────────────────────────┘                   │
│                                                                                        │
│   [Caloocan Evidence & Field Cartography Focal Area]                                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Navigation & Hero Contract Requirements
1. **Primary Action**: "Report an Issue" button must navigate directly to `/report` (or open the open-reporting wizard) **without requiring authentication or account creation**. Microcopy explicitly states: `"No account required"`.
2. **Secondary Action**: "Track a Report" button navigates to `/track`.
3. **Staff Gateway Separation**: A distinct, subtle gateway link (`/gov`) styled with a Shield icon and muted tone, separating government operations from citizen services.
4. **Bilingual Parity**: Header includes the `LanguageSwitcher` (EN / Tagalog) with immediate localized translation rendering across all hero labels and buttons.

---

## 4. Dimension 3: Guided 7-Step Reporting Wizard (`/report`)

### 4.1 Current Implementation Limitations
In the existing codebase (`ResidentDashboard.jsx:3240-3385`):
- Report submission is embedded inside `ResidentDashboard.jsx`, accessible only after user login (`/login`).
- `fetch(`${API_BASE_URL}/api/reports/analyze`)` and `fetch(`${API_BASE_URL}/api/reports`)` enforce `headers: { 'Authorization': `Bearer ${token}` }`.
- AI analysis is blocking and halts report submission if the classification is undetermined or fails.

### 4.2 Target 7-Step Reporting Architecture (`/report`)
The dedicated reporting wizard route (`/report` or `/report/new`) operates in both **Guest Mode** (unauthenticated) and **Authenticated Resident Mode**, maintaining URL-aware step history and local state preservation.

```
Step 1: Category & Emergency Warning
  │
Step 2: Caloocan Location & Boundary Pin
  │
Step 3: Evidence Capture & Advisory AI Scan
  │
Step 4: Details & Duplicate Awareness Check
  │
Step 5: Contact Preferences (Guest / SMS / Account)
  │
Step 6: Review & Civic Consent
  │
Step 7: Atomic API Submission ──► /report/success
```

#### Step-by-Step Specification:

1. **Step 1: Issue Type & Emergency Warning Banner**
   - **Emergency Safety Banner (Top)**: High-visibility banner stating:
     > *"⚠️ For immediate life-threatening emergencies (active fires, major building collapse, sparking high-voltage lines, open gas leaks), call 911 or Caloocan Emergency Hotline (888-1234) immediately."*
   - **Category Selection**: Grid of 6 engineering categories with custom pictograms:
     - Roads & Bridges (lubak, sirang tulay, bangketa)
     - Water & Drainage (baha, baradong kanal, sirang tubo)
     - Street Lighting & Electrical (pundidong ilaw, nakalawit na kable)
     - Public Safety & Regulatory (hazard structures, illegal obstruction)
     - Public Facilities & Parks (parke, health center, public buildings)
     - Traffic & Road Signage (sirang signage, traffic light)

2. **Step 2: Location (Caloocan Map & Jurisdiction)**
   - Interactive Google Map initialized at Caloocan City coordinates (`lat: 14.7566, lng: 121.0450`).
   - Geolocation button: "Use Current Location" (with graceful fallback if permission is denied).
   - Search box with Google Places autocomplete restricted to Caloocan City.
   - Dynamic boundary verification: Checks against Caloocan City polygon boundary; displays jurisdiction tag (`"✓ Inside Caloocan City Jurisdiction"` vs `"⚠️ Location appears outside Caloocan City"`).
   - Reverse geocoding via `/api/geocode/reverse` returning extracted Barangay and human-readable landmark address.

3. **Step 3: Evidence Capture & Advisory AI Triage**
   - Direct camera capture (`IDCameraModal` / device camera) and drag-and-drop file upload.
   - File validation: JPG, PNG, WebP format, max 10MB file size.
   - Non-blocking AI analysis call: Dispatches image to `/api/reports/analyze`. If AI returns high-confidence category or hazards, it pre-populates category/tags as **Advisory Suggestions**.
   - *Resilience Rule*: AI failure, timeout, or inconclusive result NEVER blocks submission; resident can proceed with manual category selection.

4. **Step 4: Details & Duplicate Report Awareness**
   - Textarea for detailed description, landmarks, and severity observations.
   - **Duplicate Report Awareness Module**:
     - Automatically queries nearby open reports within 100-meter radius of the pinned location.
     - If active duplicate candidate detected: displays non-intrusive alert:
       > *"💡 Similar issue reported nearby: 'Deep pothole near corner' (Report #PULSO-10822, Status: Dispatched).*
       > *Would you like to attach your evidence to this existing issue or submit as a new report?"*
     - Actions: `[Attach to Existing Issue]` or `[Continue Submitting New Report]`.

5. **Step 5: Contact Preferences (Guest vs Authenticated)**
   - Unauthenticated guest is presented with three clear choices:
     - **Choice A: Anonymous / Guest Report**: No personal contact details saved. System generates a private tracking code on submission.
     - **Choice B: Status Notifications (Optional)**: Provide Mobile Number (SMS) or Email for automated status change alerts and magic tracking links.
     - **Choice C: Sign In / Register**: Option to authenticate on the spot to link the report directly to user's profile.

6. **Step 6: Review & Informed Consent**
   - Comprehensive summary card displaying: Selected Category, Location Address & Barangay, Evidence Thumbnail, Description, and Contact Preference.
   - 1-click `[Edit]` buttons for each section allowing effortless return to any step without data loss.
   - Civic consent checkbox: *"I confirm that this report describes a genuine public infrastructure issue in Caloocan City."*

7. **Step 7: Atomic API Submission**
   - Dispatches multipart `POST /api/reports` payload containing:
     - `category`, `description`, `lat`, `lng`, `location_string`, `barangay`, `image` (binary).
     - Guest fields (when unauthenticated): `reporter_type: 'guest'`, `contact_email`, `contact_phone`.
     - Authenticated fields (when logged in): includes `Authorization: Bearer <token>`.
   - On HTTP 200/201 response, stores return payload and transitions immediately to `/report/success`.

---

## 5. Dimension 4: Receipt (`/report/success`) & Public Tracking (`/track`)

### 5.1 Receipt View Architecture (`/report/success`)
The receipt view acts as the authoritative proof of submission and provides credentials for guest tracking.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REPORT SUBMITTED SUCCESSFULLY                   │
│                                                                        │
│   Ticket ID:         PULSO-2026-09412                                  │
│   Submitted:         September 2, 2026 · 5:30 PM (PST)                 │
│   Initial Status:    Received · Queued for Engineering Triage          │
│   Category:          Water & Drainage · Barangay 171                   │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │  🔒 PRIVATE TRACKING CODE                                      │   │
│   │  TRK-9X82-KL41-2026                                            │   │
│   │  [ 📋 Copy Code ]   [ 🔗 Copy Tracking URL ]                   │   │
│   │                                                                │   │
│   │  ⚠️ Save this code. You will need it to track status updates    │   │
│   │  or link this report to an account later.                      │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   [ 🔍 Track This Report Now ]     [ 💾 Save to My Reports / Login ]   │
│                                                                        │
│   [ Submit Another Report ]        [ Return to Home ]                  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Key Technical Capabilities:
- **Copy Actions**: 1-click clipboard copy for Tracking Code and Full Tracking URL (`https://.../track?id=PULSO-2026-09412&token=TRK-9X82-KL41-2026`).
- **QR Code Generation**: Uses `qrcode` library to render a dynamic QR code for mobile scanning.
- **Contextual Account Creation**: "Save to My Reports" button initiates the inline registration/claim workflow, passing the ticket ID and tracking token.

---

### 5.2 Public Tracking View Architecture (`/track`)
The `/track` route allows any citizen to verify the progress of a report without logging in.

#### URL Parameters & Direct Lookup:
- Supports query string loading: `/track?id=PULSO-XXXXX&token=TRK-XXXX`.
- If parameters are missing, displays a clean lookup form with **Report / Ticket ID** and **Private Tracking Code** inputs.

#### 6-Stage Public Lifecycle Stepper (PulseLine):
```
 [1. Received] ──► [2. Under Review] ──► [3. Assigned] ──► [4. In Progress] ──► [5. Resolved] ──► [6. Closed]
  Sep 2, 5:30 PM    Sep 2, 5:45 PM       Sep 2, 6:15 PM     Pending             Pending            Pending
  Auto-Logged       Triage Verified      Assigned to Crew A
```

#### Privacy & Security Isolation Contract:
- **Public-Safe Metadata Only**: Displays public status, category, general barangay locality, stage timeline, and official city resolution photos.
- **Strict PII Redaction**: Reporter name, phone, email, internal dispatcher notes, private contractor billing details, and raw AI prompt reasoning are strictly filtered out by the backend and sanitized on the frontend.

---

## 6. Dimension 5: Authenticated Resident Dashboard & Contextual Claim Workflow

### 6.1 Current Resident Dashboard State (`ResidentDashboard.jsx`)
- **Current Tab Implementation (`ResidentDashboard.jsx:434-441`)**:
  - Filter list: `['all', 'pending', 'in_progress', 'resolved', 'rejected', 'cancelled']`.
  - Data retrieval: Calls `GET /api/reports/user/${userId}` with bearer token.
- **Identified Deficiencies**:
  - No tab for **"Needs Information"** (when government dispatch requests additional photo or landmark details via `RequestInfoModal`).
  - No mechanism to input a tracking token to claim previously filed guest reports.

### 6.2 Target Filter Tabs & Model
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [ All Reports (12) ]  [ Active (4) ]  [ Needs Info (1) ⚠️ ]  [ Resolved (7) ] │
└──────────────────────────────────────────────────────────────────────────────┘
```

1. **All**: Full list of user's submitted and claimed reports.
2. **Active**: Reports currently in `['unvalidated', 'unverified', 'pending', 'pending_approval', 'dispatched', 'in_progress']`.
3. **Needs Information**: Reports with status `needs_info` or active dispatcher inquiries, displaying a prominent alert badge and a direct action: `[Provide Details / Upload Photo]`.
4. **Resolved**: Reports marked `['resolved', 'completed', 'inspected']` with after-repair photos.

### 6.3 Contextual Report Claim Workflow
```
Resident visits Dashboard / Receives claim prompt
  │
Clicks "Link a Guest Report" (or arrives via /report/success claim link)
  │
Modal prompts: Ticket ID + Private Tracking Code (or SMS OTP)
  │
Frontend sends POST /api/reports/{id}/claim with Bearer token + { tracking_token }
  │
Backend verifies hash match ──► Sets claimed_by_user_id = currentUser.id
  │
Frontend refreshes report list ──► Toast: "Report PULSO-XXXX linked successfully!"
```

---

## 7. Dimension 6: Build Setup, Testing & Quality Gates

### 7.1 Build Verification
- Build command: `npm run build` (executes `vite build`).
- **Observed Result**: Build compiled successfully in 21.68 seconds, producing optimized client bundles in `frontend/dist/` with 0 errors.

### 7.2 Accessibility & Quality Contract (WCAG 2.2 AA)
- **Contrast**: All text surfaces in Morning Field Sheet (light) and Night Inspection (dark) meet 4.5:1 minimum contrast.
- **Focus Rings**: Mandatory 3px visible focus indicator (`--color-focus: #2563eb` / `#93c5fd`) across all interactive elements.
- **Touch Targets**: Minimum 44×44px interactive tap area on mobile viewports.
- **Screen Reader Semantics**: ARIA labels on all modal dialogs, map controls, status badges, and carousel slides.
- **Bilingual i18n**: Full functional translation parity between English (`locales/en.json`) and Tagalog (`locales/tl.json`).

---

## 8. Concrete Implementation Plan & Target File Map

| Target File | Action | Purpose & Scope |
|---|---|---|
| `frontend/src/App.jsx` | Update | Add top-level routes for `/report`, `/report/success`, `/track`. |
| `frontend/src/pages/Landing.jsx` | Update | Redesign hero section with primary "Report an Issue (No account required)", secondary "Track a Report", and separated Staff Gateway. |
| `frontend/src/components/ResidentCinematicHero.jsx` | Update | Connect primary CTA to `/report` and secondary CTA to `/track`. |
| `frontend/src/pages/ReportWizardPage.jsx` | **Create** | Implement the 7-step guided reporting wizard with emergency warning and duplicate check. |
| `frontend/src/pages/ReportSuccessPage.jsx` | **Create** | Implement the ticket receipt page with copyable tracking token, QR code, and claim CTA. |
| `frontend/src/pages/PublicTrackPage.jsx` | **Create** | Implement the public tracking page with 6-stage PulseLine lifecycle stepper. |
| `frontend/src/components/modals/ClaimReportModal.jsx` | **Create** | Modal allowing authenticated residents to link guest reports via tracking token. |
| `frontend/src/pages/ResidentDashboard.jsx` | Update | Integrate `ClaimReportModal` and update `MyReports` tabs (`All`, `Active`, `Needs Information`, `Resolved`). |
| `frontend/src/locales/en.json` & `tl.json` | Update | Add translation keys for reporting wizard steps, emergency banners, receipt, and tracking views. |

---

## 9. Conclusion
The frontend codebase provides a robust, modern foundation (React 19, Tailwind v4, Vite 7) with well-crafted Civic Aperture design tokens. Implementing open guest reporting, guided 7-step triage, ticket receipts, and public tracking will fully align the user experience with Caloocan City's open civic participation requirements while maintaining enterprise-grade security and operational rigor.
