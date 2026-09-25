# Milestone 4 Technical Blueprint: Guided 7-Step Reporting Flow & Map Integration

**Document Version**: 1.0.0  
**Target Surface**: `/report` (`ReportWizardPage.jsx`)  
**Visual System**: Civic Aperture v0.2 (Morning Field Sheet / Night Inspection)  
**Target Milestone**: Milestone 4 (Guided 7-Step Reporting Flow & Map Integration)  
**Status**: APPROVED DESIGN BLUEPRINT (Implementation Ready)

---

## 1. Executive Summary & Design System Foundations

The PULSO Guided 7-Step Reporting Wizard provides an open, accessible, high-trust civic reporting experience for Caloocan City residents. It eliminates mandatory account registration while enforcing strict geospatial boundaries (North and South Caloocan), multi-modal evidence handling, non-blocking advisory AI triage, proactive 100-meter duplicate report awareness, contact preference selection, civic consent verification, and atomic backend submission returning private tracking credentials.

### Civic Aperture North Star Principles Applied
1. **Field Aperture**: True-color evidence capture and interactive cartography take visual precedence without synthetic decorative filters or artificial glow.
2. **Signal Cut**: A continuous 2px heartbeat-derived progress indicator guides residents through each stage of the report lifecycle with clear current-step elevation.
3. **Ember Resident Action**: All citizen-facing interactive actions, buttons, active step indicators, and focus rings utilize the Ember palette (`#ea580c` / `#f97316` / `#c2410c`), distinctly separated from internal government Field Blue (`#0b4f6c`).
4. **Accessible Rigor (WCAG 2.2 AA)**:
   - High-contrast 3px focus indicator (`focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2`).
   - Strict 44×44px minimum touch target size across mobile and desktop viewports.
   - 100% bilingual English (`en.json`) and Filipino / Tagalog (`tl.json`) parity.
   - Screen reader `aria-live` announcements on step navigation, boundary validation, and advisory AI completion.

---

## 2. Comprehensive 7-Step Flow Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ReportWizardPage.jsx (State Orchestrator)                       │
│                                                                                        │
│  [Top Masthead]: PULSO Logo + Barangay Badge | Language (EN/TL) | Theme (Light/Dark)   │
│  [Signal Cut Rail]: Step 1 ──► Step 2 ──► Step 3 ──► Step 4 ──► Step 5 ──► Step 6     │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
    ┌───────────────────────────────────────┴───────────────────────────────────────┐
    ▼                                                                               ▼
┌───────────────────────────────┐                               ┌───────────────────────────────┐
│ Step 1: Category & Emergency  │                               │ Step 2: Location & Map        │
│ • 911 / 888-1234 Alert Banner │                               │ • Interactive Caloocan Map    │
│ • 6 Infrastructure Categories │                               │ • GPS / Search / Pin Drag     │
│ • Engineering Pictograms      │                               │ • Boundary Check (In/Out)     │
└───────────────────────────────┘                               │ • Reverse Geocoded Address    │
                │                                               └───────────────────────────────┘
                ▼                                                               │
┌───────────────────────────────┐                                               ▼
│ Step 3: Evidence Upload       │                               ┌───────────────────────────────┐
│ • Camera / File Upload        │                               │ Step 4: Details & Duplicates  │
│ • 10MB Ceiling & Magic Bytes  │                               │ • Description (10-5000 chars) │
│ • Field Aperture True-Color   │                               │ • 100m Proximity Radar        │
│ • Advisory AI Scan (Non-block)│                               │ • Duplicate Awareness Banner  │
└───────────────────────────────┘                               └───────────────────────────────┘
                │                                                               │
                ▼                                                               ▼
┌───────────────────────────────┐                               ┌───────────────────────────────┐
│ Step 5: Contact Preferences   │                               │ Step 6: Review & Civic Consent│
│ • Anonymous Guest (Token only)│                               │ • Comprehensive Summary Docket│
│ • SMS / Email Status Updates  │                               │ • Step [Edit] Jump Links      │
│ • Contextual Sign-In CTA      │                               │ • Civic Truth Declaration     │
└───────────────────────────────┘                               └───────────────────────────────┘
                                                │
                                                ▼
                                ┌───────────────────────────────┐
                                │ Step 7: Atomic API Submission │
                                │ • POST /api/reports (FormData)│
                                │ • Conflict / Error Handling   │
                                │ • Route to /report/success    │
                                └───────────────────────────────┘
```

---

## 3. Detailed Step-by-Step Specification

### Step 1: Category Selection & Emergency Warning Banner
- **File**: `frontend/src/components/report-wizard/Step1CategoryEmergency.jsx`
- **Emergency Alert Banner**:
  - Positioned at the top of Step 1 in a prominent high-contrast amber/red alert container.
  - Alert Heading: *"Is this an immediate life-threatening emergency?"* / *"Agarang banta ba ito sa buhay o kaligtasan?"*
  - Body Copy: *"For active fires, severe medical crises, active crimes, or fallen live electrical wires during flash floods, please contact emergency dispatch directly. PULSO is for municipal infrastructure repair and engineering triage (24–48hr inspection cycle)."*
  - Direct Call Actions:
    - **`[Call 911 (National Emergency Hotline)]`** (`href="tel:911"`)
    - **`[Call 888-1234 (Caloocan CDRRMO Disaster Hotline)]`** (`href="tel:8881234"`)
- **Infrastructure Category Grid**:
  - 6 clearly bounded interactive category cards with engineering pictograms:
    1. **Roads & Bridges** (`Mga Kalsada at Tulay`): Potholes, damaged pavement, broken culverts, collapsed bridge rails, open excavation. Icon: `Route` / `Construction`.
    2. **Water & Drainage** (`Tubig at Kanal`): Clogged storm drains, missing manhole covers, localized street flooding, broken main lines. Icon: `Droplets`.
    3. **Street Lighting & Power** (`Ilaw sa Daan at Kuryente`): Dark lampposts, flickering street fixtures, dangling low-voltage lines, damaged poles. Icon: `Lightbulb`.
    4. **Public Facilities & Buildings** (`Pampublikong Pasilidad`): Damaged health centers, public school structural defects, broken playground facilities, cracked park walls. Icon: `Building2`.
    5. **Public Safety & Hazards** (`Kaligtasan at Sagabal`): Fallen roadside trees, unstable retaining walls, large hazardous debris on carriageways. Icon: `ShieldAlert`.
    6. **Traffic & Road Signs** (`Trapiko at Karatula`): Broken traffic signals, missing regulatory signage, damaged center-island railings. Icon: `Signpost`.
- **Interaction Contract**:
  - Single selection with keyboard arrow navigation (`Tab`, `Space`, `Enter`).
  - Active selection highlighted with 2px Ember border (`border-orange-500 dark:border-orange-400`), soft ember background (`bg-orange-50/60 dark:bg-orange-950/30`), and an active check indicator.
  - "Continue" button is enabled immediately upon category selection.

---

### Step 2: Location Selection & Boundary Verification
- **File**: `frontend/src/components/report-wizard/Step2LocationMap.jsx`
- **Map Container**:
  - Embedded Google Map via `@react-google-maps/api`.
  - Default Center: Caloocan City Hall North (`14.7565, 121.0450`) or South (`14.6500, 120.9800`) at zoom level 15.
  - Dark/Light theme styles (`LIGHT_MAP_STYLE` / `DARK_MAP_STYLE`) synchronized with PULSO `ThemeContext`.
- **Location Acquisition Controls**:
  - **"Use My Current Location"** button (`navigator.geolocation.getCurrentPosition`) with permission state handling (Prompt -> Locating Spinner -> Set Pin).
  - **Search Address / Landmark** input with debounce for forward geocoding.
  - **Draggable Precision Pin (`MarkerF`)**:
    - Custom SVG marker with pin head and coordinate crosshair.
    - Drag-end listener updates coordinates `(lat, lng)` with real-time boundary verification.
- **Geospatial Boundary Verification**:
  - Ray-casting point-in-polygon algorithm (`isPointInCaloocan(lat, lng)`) executed client-side on every pin move against Caloocan City North & South MultiPolygon boundaries.
  - **Inside Boundary State**:
    - Display Green/Ember verified badge: *"✓ Location verified within Caloocan City (Barangay 171, District 3)"*.
    - "Continue" button is enabled.
  - **Outside Boundary State**:
    - Display Red warning alert: *"⚠️ Selected location (Lat: X, Lng: Y) is outside Caloocan City jurisdiction. PULSO can only dispatch work orders within Caloocan City borders. Please reposition the pin within city boundaries."*
    - "Continue" button is **disabled** with descriptive helper text.
- **Address & Landmark Fields**:
  - Reverse-geocoded address string displayed in a read-only verified container.
  - Optional resident input: *"Specific Landmark / Notes (e.g. In front of Caloocan High School, beside Gate 2)"* to guide field engineering crews.

---

### Step 3: Evidence Upload & Advisory AI Scan
- **File**: `frontend/src/components/report-wizard/Step3EvidenceUpload.jsx`
- **Upload Standards**:
  - Supports mobile camera capture (`<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" />`) and desktop drag-and-drop.
  - Max file size ceiling: **10MB (10,485,760 bytes)**.
  - Validates client-side file size and MIME format (`image/jpeg`, `image/png`, `image/webp`).
- **Field Aperture Image Preview**:
  - True-color rendering container (aspect ratio preserved, no artistic color filters).
  - Overlay metadata badge displaying file size, image dimensions, and capture timestamp.
  - Actions: `[Replace Photo]` and `[Remove Photo]`.
- **Non-Blocking Advisory AI Scan**:
  - Upon photo selection, an asynchronous background request is dispatched to `/api/reports/analyze` (or client-side preview scan).
  - Visual Pacing: A 2px animated scanning bar (Signal Cut) traverses the photo with a badge: *"AI Assistant: Analyzing infrastructure damage..."*.
  - AI Result Feedback:
    - **Categorization Match**: *"AI detected Pothole / Road Damage (Confidence: 96%)."*
    - **Category Divergence**: If resident selected "Water & Drainage" but AI suggests "Roads & Bridges", a gentle advisory prompt appears: *"AI suggests 'Roads & Bridges'. Keep current category or update to AI suggestion?"* with buttons `[Keep Selected]` and `[Update to Roads]`.
    - **Inconclusive / Scan Failure / Offline**: The wizard displays: *"AI scan was inconclusive or offline. Your report will proceed to human engineering triage without delay."* (The user is **never blocked**).
    - **Inappropriate Content Safety Trigger**: If AI safety filter flags inappropriate non-civic content, displays: *"Photo flagged by safety filter. Please upload a clear photo of the infrastructure hazard."*

---

### Step 4: Details & Duplicate Report Awareness (100m Proximity Radar)
- **File**: `frontend/src/components/report-wizard/Step4DetailsDuplicate.jsx`
- **Description Field**:
  - Multi-line textarea for incident details.
  - Validation: Minimum **10 characters**, maximum **5000 characters**.
  - Dynamic character count indicator: `"45 / 5000 characters (minimum 10 required)"`.
  - Placeholder & Guidance: *"Describe the hazard (e.g., Deep pothole in southbound lane causing vehicles to swerve into oncoming traffic. Has been worsening over the past 3 days)."*
- **100-Meter Duplicate Report Awareness**:
  - Fetches active public reports in Caloocan (`GET /api/reports/public`).
  - Computes Haversine distance between pinned location `(lat, lng)` and all active uncompleted reports in the same/similar category.
  - If an active report is within **100 meters**:
    - Renders a prominent **Duplicate Awareness Alert Card**:
      - Alert Title: *"⚠️ Similar Active Report Found Nearby (Within {distance}m)"*
      - Active Ticket Summary: `Ticket #RPT-20260830-9A1B` | Status: `Validated / Dispatched to District Road Crew` | Reported: `Yesterday at 2:15 PM`.
      - Proactive Choices:
        - **Choice A: `[Attach Evidence to Existing Ticket]`**: Preserves evidence under the canonical ticket to boost priority and avoid duplicate dispatch.
        - **Choice B: `[Continue Submitting as New Report]`**: Resident can proceed if this is a distinct issue.
  - *Note on Backend Hard Conflict*: Backend will return HTTP 409 if a report in the exact same category is within 15 meters. The frontend 100m alert educates the resident beforehand so they are never blindsided.

---

### Step 5: Contact Preferences & Contextual Authentication
- **File**: `frontend/src/components/report-wizard/Step5ContactPreferences.jsx`
- **Three Identity & Notification Pathways**:
  1. **Option 1: Remain Completely Anonymous (Guest)**:
     - *"Submit as an anonymous guest. No email or phone will be stored. You will receive a private tracking token to check status online."*
     - No input fields required.
  2. **Option 2: Receive Progress Updates (Email / SMS)**:
     - *"Receive automated SMS and email notifications when work crews are assigned and repairs are completed."*
     - Inputs:
       - `Email Address`: `<input type="email" placeholder="juan@example.com" />`
       - `Mobile Phone`: `<input type="tel" placeholder="0917-123-4567" />` (with `+63` prefix mask).
  3. **Option 3: Sign In / Link to Resident Account**:
     - *"Already have a PULSO resident account? Sign in now to automatically link this report to your resident dashboard."*
     - `[Sign In to My Account]` modal trigger.
- **Authenticated State Recognition**:
  - If the resident is already logged in (`localStorage.getItem('token')`), Step 5 displays a verified badge:
    - *"Submitting as Registered Resident: Juan Dela Cruz (Brgy. 171, Caloocan)"*.
    - Contact email/phone auto-filled with option to edit.

---

### Step 6: Comprehensive Review & Civic Consent
- **File**: `frontend/src/components/report-wizard/Step6ReviewConsent.jsx`
- **Summary Review Docket**:
  - High-density structured overview of all entered data:
    1. **Category**: Selected category name and icon with `[Edit Category]` button (navigates to Step 1).
    2. **Location**: Verified barangay, GPS coordinates, human address, and landmark notes with `[Edit Location]` button (navigates to Step 2).
    3. **Evidence**: True-color photo thumbnail with file size and AI confidence pill with `[Edit Photo]` button (navigates to Step 3).
    4. **Details**: Full description text with `[Edit Details]` button (navigates to Step 4).
    5. **Contact**: Anonymous or Email/Phone contact preferences with `[Edit Contact]` button (navigates to Step 5).
- **Civic Truth Declaration & Privacy Consent**:
  - Checkbox requirement:
    - `[x] I declare that the information provided in this report is true and accurate. I understand that submitting false or malicious emergency reports is prohibited under Philippine law.`
  - Privacy Notice:
    - *"Photos and location data will be used solely for municipal engineering triage and repair. Personal contact info is never published on public boards."*
- **Primary Submit Action**:
  - Prominent Ember Button: `[Submit Report to City Engineering]` (`bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 px-8 rounded-lg shadow-md focus-visible:ring-3 focus-visible:ring-orange-500`).
  - Disabled until civic consent checkbox is checked.

---

### Step 7: Atomic API Submission & Success Transition
- **File**: `frontend/src/components/report-wizard/Step7Submission.jsx` (or inline submission handler in `ReportWizardPage.jsx`)
- **API Request Specification**:
  - **URL**: `POST /api/reports`
  - **Headers**:
    - If logged in: `Authorization: Bearer <token>`
    - If guest: No authorization header
  - **Payload (`FormData`)**:
    - `category`: string (e.g. `"Roads & Bridges"`)
    - `description`: string (e.g. `"Deep pothole near corner of Camarin Rd..."`)
    - `lat`: float (e.g. `14.756512`)
    - `lng`: float (e.g. `121.045012`)
    - `location_string`: string (e.g. `"Camarin Rd, Barangay 171, Caloocan"`)
    - `location_barangay`: string (e.g. `"Barangay 171"`)
    - `contact_email`: string (optional)
    - `contact_phone`: string (optional)
    - `submission_source`: `"web_guest"` (or `"web_resident"`)
    - `image`: binary file blob (optional)
- **Response Handling & Success State Transition**:
  - On HTTP `201 Created` / `200 OK`:
    - Response contains: `ticket_id`, `tracking_token`, `tracking_url`, `created_at`, `status`.
    - Purge draft from `localStorage` (`localStorage.removeItem('pulso_report_wizard_draft_v1')`).
    - Navigate to `/report/success` with state payload:
      ```javascript
      navigate('/report/success', {
        state: {
          ticketId: data.ticket_id,
          trackingToken: data.tracking_token,
          trackingUrl: data.tracking_url,
          category: data.category,
          locationString: data.location_string,
          createdAt: data.created_at,
          reporterType: data.reporter_type
        }
      });
      ```
- **Error Recovery Matrix**:
  - `HTTP 400 Bad Request` (Outside Caloocan): Return to Step 2, highlight boundary warning.
  - `HTTP 409 Conflict` (15m Duplicate): Open Duplicate Conflict Modal showing canonical ticket ID and link to track that ticket.
  - `HTTP 422 Unprocessable Entity` (Oversized upload / invalid MIME / short description): Return to relevant step with highlighted field error.
  - `HTTP 429 Too Many Requests` (Rate limit exceeded): Show countdown banner ("Rate limit reached. Please wait 30 seconds before submitting").
  - `Network Failure / 500`: Keep entire form state intact, show retry toast, preserve all entered fields. **Zero data loss**.

---

## 4. State Management & Draft Persistence Architecture

### Draft Schema (`pulso_report_wizard_draft_v1`)
Stored in `localStorage` with JSON serialization:
```typescript
interface ReportDraft {
  version: 1;
  savedAt: number; // Unix timestamp
  currentStep: number; // 1 to 6
  formData: {
    category: string;
    location: {
      lat: number;
      lng: number;
      address: string;
      barangay: string;
      landmark: string;
      isInCaloocan: boolean;
    };
    evidence: {
      fileName: string;
      fileSize: number;
      mimeType: string;
      dataUrl?: string; // Stored only if file < 2MB to prevent quota exhaustion
      aiCategorySuggestion?: string;
      aiConfidence?: number;
    };
    details: {
      description: string;
    };
    contact: {
      type: 'anonymous' | 'notify' | 'authenticated';
      email: string;
      phone: string;
    };
    consentAccepted: boolean;
  };
}
```

### Draft Lifecycle Rules
1. **Auto-Save**: Form state changes are automatically debounced (400ms) and written to `localStorage`.
2. **Reload Recovery**: On page mount, if a draft younger than 24 hours exists, display a recovery banner:
   - *"We found an unsaved report draft from {relativeTime}. [Resume Draft] or [Start Fresh]"*.
3. **Session Cleansing**: When the report is successfully submitted, `localStorage.removeItem('pulso_report_wizard_draft_v1')` is immediately executed.
4. **Unload Protection**: If user attempts to leave `/report` with filled fields, browser triggers `beforeunload` warning.

---

## 5. Map & Geospatial Boundary Implementation Details

### JavaScript Point-in-Polygon Ray Casting (`geospatial.js`)
To ensure rapid, instantaneous boundary validation without server round-trips:
```javascript
// frontend/src/utils/geospatial.js

/**
 * Validates if coordinates are inside Caloocan North or South boundaries
 */
export function isPointInPolygon(lng, lat, polygonRings) {
  if (!polygonRings || polygonRings.length === 0) return false;
  const exterior = polygonRings[0];
  let inside = false;
  const n = exterior.length;

  let p1x = exterior[0][0];
  let p1y = exterior[0][1];

  for (let i = 1; i <= n; i++) {
    const p2x = exterior[i % n][0];
    const p2y = exterior[i % n][1];

    if (lat > Math.min(p1y, p2y)) {
      if (lat <= Math.max(p1y, p2y)) {
        if (lng <= Math.max(p1x, p2x)) {
          let xints = p1x;
          if (p1y !== p2y) {
            xints = ((lat - p1y) * (p2x - p1x)) / (p2y - p1y) + p1x;
          }
          if (p1x === p2x || lng <= xints) {
            inside = !inside;
          }
        }
      }
    }
    p1x = p2x;
    p1y = p2y;
  }

  return inside;
}

/**
 * Haversine formula to compute great-circle distance in meters
 */
export function getHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some(v => v === null || v === undefined || isNaN(v))) {
    return Infinity;
  }
  const R = 6371000; // Radius of Earth in meters
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Caloocan Bounding Box Safe Fallback Check
 */
export function isInCaloocanBounds(lat, lng) {
  if (lat == null || lng == null) return false;
  const inSouth = lat >= 14.63 && lat <= 14.67 && lng >= 120.95 && lng <= 121.00;
  const inNorth = lat >= 14.69 && lat <= 14.81 && lng >= 121.00 && lng <= 121.13;
  return inSouth || inNorth;
}
```

---

## 6. Accessibility (WCAG 2.2 AA) & Interaction Hardening

### Focus Ring Standards
All focusable inputs, radio cards, and buttons must include the 3px focus ring utility:
```css
/* Tailwind utility string */
className="focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-orange-400 dark:focus-visible:ring-offset-slate-900"
```

### Keyboard Flow
- `Tab`: Moves forward through interactive controls in logical DOM order.
- `Shift + Tab`: Moves backward without trapping focus.
- `Arrow Keys`: Navigates across category radio buttons in Step 1.
- `Enter` / `Space`: Activates category cards, checkboxes, and buttons.
- `Escape`: Closes open modals (duplicate warning modal, sign-in modal).

### Screen Reader Live Announcements
```jsx
<div 
  aria-live="polite" 
  aria-atomic="true" 
  className="sr-only"
>
  {announcementText}
</div>
```
Announcements trigger on:
- Step transition: *"Step 2 of 6: Select Location on Caloocan Map"*.
- Boundary validation change: *"Location updated: Inside Caloocan City jurisdiction"*.
- AI Scan finish: *"AI Analysis complete: Detected Pothole / Road Damage"*.
- Duplicate alert: *"Alert: 1 similar active report detected within 45 meters"*.

---

## 7. Complete Frontend Component Code Blueprint

### 7.1 File Structure Inventory
```
frontend/src/
├── pages/
│   └── ReportWizardPage.jsx          # Main 7-Step Wizard Orchestrator
├── components/
│   └── report-wizard/
│       ├── WizardHeader.jsx          # Masthead, Language, Theme, Exit Confirmation
│       ├── WizardSignalCutRail.jsx   # Accessible Step Indicator (1 to 6)
│       ├── Step1CategoryEmergency.jsx# Category Cards & 911/888-1234 Alert
│       ├── Step2LocationMap.jsx      # Google Map, Boundary Check, Geocoding
│       ├── Step3EvidenceUpload.jsx   # Photo Upload, 10MB Check, Advisory AI
│       ├── Step4DetailsDuplicate.jsx # Description & 100m Duplicate Radar
│       ├── Step5ContactPreferences.jsx# Anonymous / SMS-Email / Sign-In
│       ├── Step6ReviewConsent.jsx    # Docket Summary, Edit Links, Civic Consent
│       └── DuplicateWarningModal.jsx # Proximity duplicate interactive modal
└── utils/
    └── geospatial.js                 # Ray-casting, Bounding box, Haversine distance
```

---

### 7.2 Main Wizard Orchestrator (`ReportWizardPage.jsx`) Blueprint

```jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useJsApiLoader } from '@react-google-maps/api';
import { API_BASE_URL } from '../utils/apiBase';
import { isInCaloocanBounds, getHaversineDistanceMeters } from '../utils/geospatial';

import WizardHeader from '../components/report-wizard/WizardHeader';
import WizardSignalCutRail from '../components/report-wizard/WizardSignalCutRail';
import Step1CategoryEmergency from '../components/report-wizard/Step1CategoryEmergency';
import Step2LocationMap from '../components/report-wizard/Step2LocationMap';
import Step3EvidenceUpload from '../components/report-wizard/Step3EvidenceUpload';
import Step4DetailsDuplicate from '../components/report-wizard/Step4DetailsDuplicate';
import Step5ContactPreferences from '../components/report-wizard/Step5ContactPreferences';
import Step6ReviewConsent from '../components/report-wizard/Step6ReviewConsent';

const DRAFT_STORAGE_KEY = 'pulso_report_wizard_draft_v1';
const GOOGLE_MAPS_LIBRARIES = ['places', 'geometry'];

export default function ReportWizardPage() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Load Google Maps API
  const { isLoaded: isMapLoaded } = useJsApiLoader({
    id: 'pulso-google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Wizard Step State (1 - 6)
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [draftBannerVisible, setDraftBannerVisible] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    category: '',
    location: {
      lat: 14.7565, // Caloocan City Hall North default
      lng: 121.0450,
      address: '',
      barangay: '',
      landmark: '',
      isInCaloocan: true,
    },
    evidence: {
      file: null,
      previewUrl: null,
      fileName: '',
      fileSize: 0,
      mimeType: '',
      aiCategorySuggestion: null,
      aiConfidence: null,
      isAiScanning: false,
    },
    details: {
      description: '',
    },
    contact: {
      type: 'anonymous', // 'anonymous' | 'notify' | 'authenticated'
      email: '',
      phone: '',
    },
    consentAccepted: false,
  });

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.savedAt && (Date.now() - parsed.savedAt < 86400000)) {
          setDraftBannerVisible(true);
        }
      }
    } catch (e) {
      console.warn('Failed to inspect saved draft', e);
    }
  }, []);

  // Resume Draft Handler
  const handleResumeDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({
          ...prev,
          ...parsed.formData,
          evidence: {
            ...prev.evidence,
            ...parsed.formData.evidence,
            file: null // Files cannot be serialized; require re-attach if not dataURL
          }
        }));
        setCurrentStep(parsed.currentStep || 1);
        setMaxStepReached(parsed.currentStep || 1);
        setDraftBannerVisible(false);
        setAnnouncement(t('reportWizard.draftResumed', 'Draft successfully restored.'));
      }
    } catch (e) {
      console.error('Error restoring draft', e);
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftBannerVisible(false);
  };

  // Auto-Save Draft to LocalStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const draftPayload = {
          version: 1,
          savedAt: Date.now(),
          currentStep,
          formData: {
            category: formData.category,
            location: formData.location,
            evidence: {
              fileName: formData.evidence.fileName,
              fileSize: formData.evidence.fileSize,
              mimeType: formData.evidence.mimeType,
              aiCategorySuggestion: formData.evidence.aiCategorySuggestion,
              aiConfidence: formData.evidence.aiConfidence,
            },
            details: formData.details,
            contact: formData.contact,
            consentAccepted: formData.consentAccepted,
          }
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
      } catch (e) {
        console.warn('Auto-save error', e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData, currentStep]);

  // Step Navigation Handlers
  const goToNextStep = () => {
    if (currentStep < 6) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setMaxStepReached(prev => Math.max(prev, next));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const jumpToStep = (stepNumber) => {
    if (stepNumber >= 1 && stepNumber <= maxStepReached) {
      setCurrentStep(stepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Final Atomic Submission
  const handleSubmitReport = async () => {
    if (!formData.consentAccepted) return;
    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append('category', formData.category);
      submitData.append('description', formData.details.description);
      submitData.append('lat', formData.location.lat);
      submitData.append('lng', formData.location.lng);
      submitData.append('location_string', formData.location.address || `Lat: ${formData.location.lat}, Lng: ${formData.location.lng}`);
      submitData.append('location_barangay', formData.location.barangay || '');
      
      if (formData.contact.type === 'notify') {
        if (formData.contact.email) submitData.append('contact_email', formData.contact.email);
        if (formData.contact.phone) submitData.append('contact_phone', formData.contact.phone);
      }

      const token = localStorage.getItem('token');
      submitData.append('submission_source', token ? 'web_resident' : 'web_guest');

      if (formData.evidence.file) {
        submitData.append('image', formData.evidence.file, formData.evidence.fileName || 'evidence.jpg');
      }

      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        method: 'POST',
        headers,
        body: submitData,
      });

      if (response.ok) {
        const data = await response.json();
        // Clear draft
        localStorage.removeItem(DRAFT_STORAGE_KEY);

        // Transition to success receipt
        navigate('/report/success', {
          state: {
            ticketId: data.ticket_id,
            trackingToken: data.tracking_token,
            trackingUrl: data.tracking_url,
            category: data.category,
            locationString: data.location_string,
            createdAt: data.created_at,
            reporterType: data.reporter_type,
          }
        });
      } else {
        const errorData = await response.json();
        if (response.status === 400 && errorData.detail?.includes('outside')) {
          setCurrentStep(2);
          alert(errorData.detail);
        } else if (response.status === 409) {
          alert(`Duplicate report alert: ${errorData.detail}`);
        } else {
          alert(errorData.detail || 'Submission failed. Please check your connection.');
        }
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('An unexpected network error occurred. Your draft remains saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* Screen Reader Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Masthead */}
      <WizardHeader currentStep={currentStep} />

      {/* Draft Recovery Banner */}
      {draftBannerVisible && (
        <aside className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <span>You have an unfinished report draft. Would you like to resume?</span>
            <div className="flex gap-2">
              <button 
                onClick={handleResumeDraft}
                className="px-3 py-1 bg-orange-600 text-white font-medium rounded hover:bg-orange-700 text-xs focus-visible:ring-3 focus-visible:ring-orange-500"
              >
                Resume Draft
              </button>
              <button 
                onClick={handleDiscardDraft}
                className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs hover:bg-slate-300"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Form Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 flex flex-col">
        {/* Signal Cut Step Indicator */}
        <WizardSignalCutRail 
          currentStep={currentStep} 
          maxStepReached={maxStepReached} 
          onStepClick={jumpToStep} 
        />

        {/* Step Views */}
        <div className="mt-6 flex-1">
          {currentStep === 1 && (
            <Step1CategoryEmergency 
              selectedCategory={formData.category}
              onSelectCategory={(cat) => setFormData(p => ({ ...p, category: cat }))}
              onContinue={goToNextStep}
            />
          )}

          {currentStep === 2 && (
            <Step2LocationMap 
              isMapLoaded={isMapLoaded}
              locationData={formData.location}
              onLocationChange={(loc) => setFormData(p => ({ ...p, location: loc }))}
              onBack={goToPreviousStep}
              onContinue={goToNextStep}
            />
          )}

          {currentStep === 3 && (
            <Step3EvidenceUpload 
              evidenceData={formData.evidence}
              category={formData.category}
              onEvidenceChange={(ev) => setFormData(p => ({ ...p, evidence: ev }))}
              onBack={goToPreviousStep}
              onContinue={goToNextStep}
            />
          )}

          {currentStep === 4 && (
            <Step4DetailsDuplicate 
              detailsData={formData.details}
              locationData={formData.location}
              category={formData.category}
              onDetailsChange={(det) => setFormData(p => ({ ...p, details: det }))}
              onBack={goToPreviousStep}
              onContinue={goToNextStep}
            />
          )}

          {currentStep === 5 && (
            <Step5ContactPreferences 
              contactData={formData.contact}
              onContactChange={(cnt) => setFormData(p => ({ ...p, contact: cnt }))}
              onBack={goToPreviousStep}
              onContinue={goToNextStep}
            />
          )}

          {currentStep === 6 && (
            <Step6ReviewConsent 
              formData={formData}
              isSubmitting={isSubmitting}
              onJumpToStep={jumpToStep}
              onConsentChange={(val) => setFormData(p => ({ ...p, consentAccepted: val }))}
              onBack={goToPreviousStep}
              onSubmit={handleSubmitReport}
            />
          )}
        </div>
      </div>
    </main>
  );
}
```

---

## 8. Internationalization (i18n) Mappings

### English Additions (`frontend/src/locales/en.json`)
```json
{
  "reportWizard": {
    "title": "Report an Issue",
    "subtitle": "Submit an infrastructure repair request to the Caloocan City Engineering Department.",
    "emergencyBanner": {
      "title": "Is this an immediate life-threatening emergency?",
      "body": "For active fires, severe medical emergencies, active crimes, or live fallen power lines during floods, call emergency hotlines directly.",
      "call911": "Call 911 (National)",
      "callCDRRMO": "Call 888-1234 (Caloocan CDRRMO)"
    },
    "steps": {
      "category": "Category",
      "location": "Location",
      "evidence": "Evidence",
      "details": "Details",
      "contact": "Contact",
      "review": "Review"
    },
    "categories": {
      "roads": "Roads & Bridges",
      "roadsDesc": "Potholes, damaged asphalt, cracked bridge rails, broken sidewalk slabs.",
      "drainage": "Water & Drainage",
      "drainageDesc": "Clogged storm drains, missing manholes, flash flooding, burst pipes.",
      "lighting": "Street Lighting & Power",
      "lightingDesc": "Dark lampposts, flickering lights, dangling low-voltage lines.",
      "facilities": "Public Facilities",
      "facilitiesDesc": "Damaged health centers, public school defects, broken park gear.",
      "safety": "Public Safety & Hazards",
      "safetyDesc": "Fallen roadside trees, hazardous debris, unstable embankments.",
      "traffic": "Traffic & Road Signs",
      "trafficDesc": "Broken traffic signals, missing street signage, bent guardrails."
    },
    "location": {
      "title": "Mark Location in Caloocan",
      "subtitle": "Drag the pin or search to set the exact spot.",
      "useCurrent": "Use My Current Location",
      "insideAlert": "Location verified within Caloocan City.",
      "outsideAlert": "Selected pin is outside Caloocan City jurisdiction.",
      "landmarkPlaceholder": "Landmark notes (e.g. In front of public school Gate 2)"
    },
    "evidence": {
      "title": "Upload Photo Evidence",
      "subtitle": "Clear photos help engineering crews prepare equipment before dispatch.",
      "takePhoto": "Take Photo",
      "browseFiles": "Upload File",
      "maxSizeAlert": "Maximum file size: 10MB (JPEG, PNG, WebP).",
      "aiScanning": "AI Assistant is analyzing photo...",
      "aiMatch": "AI confirmed category matching: {{category}}"
    },
    "details": {
      "title": "Describe the Issue",
      "placeholder": "Provide details on the size, duration, and safety risk...",
      "charCount": "{{current}} / 5000 chars (min 10)",
      "duplicateTitle": "Similar Report Found Nearby",
      "duplicateBody": "A report in this category is already active within {{distance}}m."
    },
    "contact": {
      "title": "Notification Preferences",
      "anonymous": "Submit Anonymously (Guest)",
      "anonymousDesc": "No contact information is stored. You will receive a private tracking token.",
      "notify": "Receive Email & SMS Updates",
      "signInCta": "Sign In to link this report to your resident account."
    },
    "review": {
      "title": "Review & Submit",
      "consentLabel": "I declare that this report is truthful and accurate to the best of my knowledge.",
      "submitBtn": "Submit Report to City Engineering"
    }
  }
}
```

### Tagalog Additions (`frontend/src/locales/tl.json`)
```json
{
  "reportWizard": {
    "title": "Mag-ulat ng Problema",
    "subtitle": "Magpadala ng kahilingan sa pagkumpuni sa City Engineering Department ng Caloocan.",
    "emergencyBanner": {
      "title": "Agarang banta ba ito sa buhay o kaligtasan?",
      "body": "Para sa sunog, malubhang sakuna, krimen, o nakalantad na kuryente sa baha, tumawag agad sa mga emergency hotline.",
      "call911": "Tumawag sa 911",
      "callCDRRMO": "Tumawag sa 888-1234 (CDRRMO)"
    },
    "steps": {
      "category": "Kategorya",
      "location": "Lokasyon",
      "evidence": "Ebidensya",
      "details": "Detalye",
      "contact": "Kontak",
      "review": "Pagsusuri"
    },
    "categories": {
      "roads": "Kalsada at Tulay",
      "roadsDesc": "Lubak, sirang aspalto, sirang tulay, basag na bangketa.",
      "drainage": "Tubig at Kanal",
      "drainageDesc": "Baradong kanal, nawawalang manhole, baha, sirang tubo.",
      "lighting": "Ilaw sa Daan at Kuryente",
      "lightingDesc": "Pundidong poste, nakalaylay na kable, madilim na daan.",
      "facilities": "Pampublikong Pasilidad",
      "facilitiesDesc": "Sirang health center, paaralan, o kagamitan sa parke.",
      "safety": "Kaligtasan at Sagabal",
      "safetyDesc": "Nabuwal na puno sa daan, mapanganib na kalat o bato.",
      "traffic": "Trapiko at Karatula",
      "trafficDesc": "Sirang traffic light, nawawalang signage, sirang harang."
    },
    "location": {
      "title": "Itakda ang Lokasyon sa Caloocan",
      "subtitle": "I-drag ang pin o maghanap upang ituro ang eksaktong lugar.",
      "useCurrent": "Gamitin ang Aking Kasalukuyang Lokasyon",
      "insideAlert": "Kumpirmadong sakop ng Lungsod ng Caloocan.",
      "outsideAlert": "Ang napiling lokasyon ay nasa labas ng Caloocan.",
      "landmarkPlaceholder": "Palatandaan (hal. Sa tapat ng Gate 2 ng paaralan)"
    },
    "evidence": {
      "title": "Mag-upload ng Larawan",
      "subtitle": "Ang malinaw na litrato ay tumutulong sa paghahanda ng tamang gamit.",
      "takePhoto": "Kumuha ng Litrato",
      "browseFiles": "Pumili ng File",
      "maxSizeAlert": "Pinakamataas na sukat: 10MB (JPEG, PNG, WebP).",
      "aiScanning": "Sinusuri ng AI ang litrato...",
      "aiMatch": "Kinumpirma ng AI ang kategorya: {{category}}"
    },
    "details": {
      "title": "Ilarawan ang Problema",
      "placeholder": "Ibigay ang laki, tagal, at panganib ng problema...",
      "charCount": "{{current}} / 5000 titik (min 10)",
      "duplicateTitle": "May Katulad na Ulat sa Malapit",
      "duplicateBody": "May aktibo nang ulat sa kategoryang ito sa loob ng {{distance}}m."
    },
    "contact": {
      "title": "Paraan ng Pag-abiso",
      "anonymous": "Magsumite nang Anonymous (Guest)",
      "anonymousDesc": "Walang personal na impormasyon. Makakatanggap ng tracking token.",
      "notify": "Tumanggap ng Update sa Email at SMS",
      "signInCta": "Mag-sign in upang maiugnay ang ulat sa iyong account."
    },
    "review": {
      "title": "Suriin at Isumite",
      "consentLabel": "Pinapatunayan ko na totoo at tumpak ang aking ulat.",
      "submitBtn": "Isumite ang Ulat sa City Engineering"
    }
  }
}
```

---

## 9. Verification & Acceptance Testing Protocol

To independently verify the implementation when authorized:

1. **Build & Syntax Verification**:
   - `npm run build` in `c:\Users\Val\Desktop\PULSO\frontend` (must produce 0 errors).
   - `npm run lint` (0 ESLint failures).

2. **Step-by-Step Functional Acceptance Matrix**:
   - **Step 1**: Emergency banner displays 911 / 888-1234 links; category selection updates state and enables Next button.
   - **Step 2**: Google Map renders; pin dragging updates coordinates; pins inside Caloocan display green badge and allow progress; pins outside Caloocan (e.g. Quezon City / Manila) block progress with red warning.
   - **Step 3**: Camera/file upload enforces 10MB limit; valid JPEG/PNG renders true-color preview; AI scan initiates and provides advisory pill without freezing navigation.
   - **Step 4**: Textarea enforces 10–5000 chars; 100m proximity radar identifies simulated nearby active reports and presents duplicate awareness options.
   - **Step 5**: Anonymous radio button works; Email/SMS inputs accept valid format; authenticated user info is pre-filled if logged in.
   - **Step 6**: Comprehensive docket reflects all previous step data; individual `[Edit]` buttons jump directly to corresponding step; Submit button requires civic consent check.
   - **Step 7**: `POST /api/reports` sends valid `FormData`; backend responds with 201 Created and tracking token; client navigates seamlessly to `/report/success` with cleared draft.

3. **Resilience & Storage Tests**:
   - Refreshing browser at Step 4 restores draft via `localStorage` banner.
   - Network failure displays inline retry alert without clearing form inputs.
