# PULSO Frontend UX Specification, Bilingual Localization Contract, and Accessibility Architecture
**Milestones 3, 4, and 5 Specification Document**  
**Document Target**: `c:\Users\Val\Desktop\PULSO\.agents\spec_miner_frontend\report.md`  
**Status**: Authoritative Frontend Specification  
**Visual & UX North Star**: Civic Aperture v0.2 (`docs/ui-ux-audit/09-visual-art-direction-v2.md`)  
**Standard**: WCAG 2.2 AA Compliant | Bilingual English (EN) & Tagalog/Filipino (TL) Parity  

---

## 1. Executive Summary & Specification Scope

This document specifies the exact UX/UI contracts, bilingual localization key dictionaries, accessibility implementation guidelines, and lifecycle state machines for Milestones 3, 4, and 5 of the PULSO City Engineering Department Management System for Caloocan City.

### Key Functional Objectives
1. **Open Public Reporting & Contextual Authentication**: Enables unauthenticated/guest residents to submit infrastructure reports with rich evidence and geospatial metadata, receiving a cryptographic tracking token and option to seamlessly link the report to a resident account.
2. **Bilingual Parity (English & Tagalog)**: 100% dictionary completeness across all public, reporting, receipt, tracking, and citizen management interfaces with natural, accessible, and respectful Tagalog phrasing.
3. **WCAG 2.2 AA Accessibility**: Full keyboard navigation, 3px high-visibility focus indicators (`focus-visible:ring-3 focus-visible:ring-offset-2`), 44×44px touch targets, ARIA live regions for dynamic alerts, 320px horizontal reflow, and 200% text scaling.
4. **PulseLine 6-Stage Public Lifecycle**: Transparent, public-safe progression tracking (`Received` → `Under Review` → `Validated` → `Assigned` → `In Progress` → `Resolved/Closed`) with strict PII and internal note redaction.

---

## 2. Features Discovered & Probed

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Navigation & Entry | Hero CTAs & Staff Gateway Separation | Dual public action ("Report an issue" with "No account required" subtext + "Track a report") and separated discrete Staff Gateway | User click / keyboard activation | Navigation to `/report`, `/track`, or `/gov` | Fallback route redirect to `/` | `PROJECT.md`, `04-resident-experience-spec.md` |
| 2 | Intake Wizard | Step 1: Category & Emergency Warning Banner | Infrastructure category selector with prominent life-safety hotline banner (911 / 888-1234) | Category selection, hotline click | Selected category state, dismiss banner | Validation error if category empty on next | `PROJECT.md`, `ORIGINAL_REQUEST.md` |
| 3 | Intake Wizard | Step 2: Caloocan Map & Jurisdictional Boundary Check | Interactive map with GPS tagger, reverse geocoding, and Caloocan North/South MultiPolygon boundary validator | Lat/Lng coordinates, address search, manual pin | Formatted address, barangay name, boundary validation state | Out-of-bounds warning banner with referral option | `PROJECT.md`, `12-resident-user-stories-and-sdlc.md` |
| 4 | Intake Wizard | Step 3: Evidence Upload & Advisory AI Scan | Multi-format photo capture with client-side validation, preview, and non-blocking advisory AI category check | File object (JPEG, PNG, WebP ≤10MB) or camera stream | Blob preview URL, advisory AI classification pill | Upload retry prompt on network error; non-blocking fallback on AI failure | `PROJECT.md`, `04-resident-experience-spec.md` |
| 5 | Intake Wizard | Step 4: Details & Duplicate Report Awareness | Detailed issue description input, urgency selector, and 100m proximity duplicate report detection | Text description, urgency level | Duplicate candidate card with "Attach evidence" vs "Submit as new" | Description minimum length error (<10 chars) | `PROJECT.md`, `ORIGINAL_REQUEST.md` |
| 6 | Intake Wizard | Step 5: Contact Preferences (Guest / Auth) | Channel choice: Anonymous guest, Email notifications, SMS notifications, or Sign In | Radio selection, email string, or phone number | Validated contact details or auth redirect | Format validation errors (regex check for PH phone `09xxxxxxxxx` and email) | `PROJECT.md`, `ORIGINAL_REQUEST.md` |
| 7 | Intake Wizard | Step 6: Review Summary & Civic Consent | Summary docket displaying all step inputs with "Edit" step jumps and civic truthfulness consent checkbox | Consent checkbox, submit trigger | Consolidated multipart payload compilation | Disabled submit button until consent is checked | `04-resident-experience-spec.md` |
| 8 | Intake Wizard | Step 7: Atomic API Submission & Progress | Multi-step progress indicator for photo upload, DB record creation, and token hashing | FormData submission payload | Response containing `ticket_id` and `tracking_token` | Retry banner preserving local draft in sessionStorage/localStorage | `PROJECT.md`, `14-end-to-end-system-lifecycle-and-api-contract.md` |
| 9 | Receipt & Proof | High-Trust Receipt Docket (`/report/success`) | Displays authoritative Ticket ID (`PULSO-XXXXXX`), Timestamp, Secret Token (`TRK-XXXX-...`), QR Code, and Copy tools | Route navigation with success state | Rendered ticket receipt, copyable URL, printable/downloadable QR | Safe redirect if accessed without active ticket state | `PROJECT.md`, `04-resident-experience-spec.md` |
| 10 | Contextual Auth | Post-Submission Claim Prompt | Actionable card on receipt page prompting guest to link ticket to existing or new account | "Save to My Reports" button click | Modal or inline redirect to Login/Register with claim payload | Re-prompt if token mismatched | `PROJECT.md`, `ORIGINAL_REQUEST.md` |
| 11 | Public Tracking | Secure Public Lookup Form (`/track`) | Public status inquiry by Ticket ID and Secret Tracking Token | Ticket ID and Tracking Token strings | Sanitized public report state and timeline | Uniform safe 404/403 anti-enumeration error response | `PROJECT.md`, `ORIGINAL_REQUEST.md` |
| 12 | Public Tracking | 6-Stage PulseLine Progress Stepper | Visual route progression stepper indicating current status in the 6-stage lifecycle | Public report state object | Rendered Signal Cut stepper with current stage notch and past/future styling | Fallback to "Received" stage if unknown status | `09-visual-art-direction-v2.md`, `PROJECT.md` |
| 13 | Public Tracking | Public-Safe Chronological Timeline | Historical audit timeline displaying verified civic milestones while redacting internal notes and PII | Public timeline array | List of timestamped progress events with official public notes | Suppresses internal notes, staff identities, and private evidence | `PROJECT.md`, `14-end-to-end-system-lifecycle-and-api-contract.md` |
| 14 | Resident Dashboard | Unified Status Filter Tabs | Status filter bar with tabs: `All`, `Active`, `Needs Information`, `Resolved` | Tab click / keyboard arrow navigation | Filtered report cards / list rows | Empty state placeholder tailored to each filter tab | `PROJECT.md`, `04-resident-experience-spec.md` |
| 15 | Resident Dashboard | Contextual Claim Modal | Modal dialog allowing logged-in citizens to claim guest tickets using their tracking token | Ticket ID and Tracking Token | API call to `POST /api/reports/{id}/claim`, list refresh | 403 Forbidden (Invalid Token), 409 Conflict (Already Claimed) | `PROJECT.md`, `ORIGINAL_REQUEST.md` |
| 16 | Universal Accessibility | 3px Visible Focus Indicator & Keyboard Flow | Distinct 3px focus ring styling with 2px offset across light (`#2563EB`) and dark (`#93C5FD`) modes | Keyboard `Tab`, `Shift+Tab`, `Enter`, `Space`, `Arrow` keys | Visible bounding ring around focused control | Focus trap in modals; skip link for main content | `09-visual-art-direction-v2.md`, `04-resident-experience-spec.md` |
| 17 | Universal Accessibility | Touch Target Geometry | Ensures all actionable controls measure at least 44×44 CSS pixels | Touch or pointer interaction | Immediate hit-testing and action firing | Visual padding prevents accidental mis-taps | `04-resident-experience-spec.md` |
| 18 | Universal Accessibility | ARIA Live Regions for Alerts | Dynamic screen reader announcements for emergencies, duplicate alerts, boundary checks, and upload progress | Asynchronous event triggers | Screen reader audible announcements (`aria-live="polite"` / `"assertive"`) | Graceful silent degradation if assistive tech inactive | `04-resident-experience-spec.md`, `quality-gates.md` |

---

## 3. Edge Cases Matrix

| # | Feature | Input / Condition | Observed & Specified Behavior |
|---|---|---|---|
| 1 | Hero CTAs | User clicks "Report an Issue" while not signed in | Immediately navigates to `/report` without any login wall, auth modal, or registration requirement. |
| 2 | Emergency Banner | User tries to report a gas leak / structural collapse | Prominent banner at top of Step 1 provides direct click-to-call hotlines (911 / 888-1234) and warning that PULSO is not a real-time dispatch service. |
| 3 | Boundary Check | GPS coordinate falls outside Caloocan boundaries (e.g. Quezon City / Valenzuela) | Displays warning: "Location is outside Caloocan City jurisdiction." Allows user to adjust pin or proceed with notification that report will be forwarded to external agency. |
| 4 | Evidence Upload | User uploads a 15MB file or non-image format (e.g. `.exe`, `.pdf`) | Client validation instantly rejects file with clear bilingual message: "File exceeds 10MB limit" or "Unsupported file format. Please upload JPG, PNG, or WebP." |
| 5 | Advisory AI Scan | AI vision service fails or returns low-confidence result | Non-blocking graceful fallback: AI box displays "Suggestion unavailable - select category manually" and user can freely choose category without delay. |
| 6 | Duplicate Check | GPS pin is within 100m of an existing active pothole report | System surfaces "Nearby Report Detected" banner showing matching report summary and provides two clear buttons: "Attach my photo to existing report" or "Submit as separate report". |
| 7 | Contact Preferences | Guest chooses "Anonymous" | All email and phone fields are omitted; payload sends `reporter_type="guest"` with no contact info. User is reminded to store their tracking token carefully. |
| 8 | Contact Preferences | Guest enters malformed mobile number (e.g., "12345") | Real-time inline field validation displays: "Please enter a valid 11-digit Philippine mobile number (e.g., 0917 123 4567)". |
| 9 | Network Drop / Interruption | Internet disconnects during Step 4 | Form state is saved in `localStorage`. Banner indicates "Draft saved offline". On reconnect, draft resumes seamlessly. |
| 10 | Receipt Page Navigation | User navigates directly to `/report/success` without submitting | Page detects missing receipt state and gracefully redirects to `/report` or `/track` with message "No active submission receipt found." |
| 11 | Copy Tracking Token | User clicks "Copy Token" button | Copies text to clipboard, button text changes to "Copied!" with checkmark icon for 3 seconds, and screen reader announces "Tracking code copied to clipboard" via aria-live. |
| 12 | Public Tracking Lookup | User enters nonexistent Ticket ID or wrong token | Returns uniform safe message: "Report not found or tracking token is incorrect." Prevents account enumeration or ticket probing. |
| 13 | Claiming Report | Resident attempts to claim a report already claimed by another user | Modal displays error 409 Conflict: "This report has already been linked to another resident account. Contact support if this is an error." |
| 14 | Claiming Report | Resident enters invalid tracking token for an existing ticket | Modal displays error 403 Forbidden: "Invalid tracking token. Please verify the code on your submission receipt." |
| 15 | 200% Zoom & 320px Reflow | Viewport zoomed to 200% or viewed at 320px width | Stepper transforms from horizontal row to compact vertical list; buttons stack full-width; zero horizontal scrolling. |
| 16 | Reduced Motion | User has `prefers-reduced-motion: reduce` OS setting | Disables hero carousel auto-sliding, removes step transition animations, and replaces spinner with static pulse indicators. |

---

## 4. Complete Bilingual Key Dictionaries

### 4.1 Landing Page & Hero Section

```json
{
  "landing": {
    "nav": {
      "home": "Home",
      "platform": "Features",
      "solutions": "Solutions",
      "about": "About Us",
      "login": "Login",
      "register": "Register",
      "reportIssue": "Report an Issue",
      "trackReport": "Track a Report",
      "staffGateway": "Staff Gateway"
    },
    "hero": {
      "tag": "PUBLIC UTILITY MONITORING FOR CALOOCAN CITY",
      "title1": "PUBLIC WORKS",
      "title2": "MONITORING & REPAIR",
      "title3": "PORTAL",
      "subtitle": "Improving everyday life for Caloocan City residents by helping engineers spot utility hazards early, resolve outages faster, and maintain reliable public services.",
      "reportCta": "Report an Issue",
      "noAccountRequired": "No account required · Takes 2 minutes",
      "trackCta": "Track a Report",
      "trackSubtext": "Lookup via Ticket ID & Token",
      "staffGateway": "Government & Staff Gateway",
      "exploreFeatures": "Explore Features"
    },
    "cinematic": {
      "ariaLabel": "PULSO introduction carousel",
      "report": "Report an Issue",
      "reportSubtext": "No account required",
      "track": "Track a Report",
      "staff": "Staff Gateway",
      "explore": "See how PULSO works",
      "slideControls": "Hero slides",
      "previous": "Previous slide",
      "next": "Next slide",
      "showSlide": "Show slide {{number}}: {{label}}",
      "slides": {
        "observe": {
          "label": "Observe",
          "eyebrow": "Public works reporting · Caloocan City",
          "title1": "See the problem.",
          "title2": "Start the response.",
          "body": "Report road, drainage, lighting, and utility issues across Caloocan—and follow every update.",
          "alt": "Wide blue-hour view across Caloocan, with neighborhoods and a main road illuminated after rain."
        },
        "report": {
          "label": "Report",
          "eyebrow": "From the street to the right city team",
          "title1": "When the street speaks, the city",
          "title2": "should listen.",
          "body": "Show the issue, add the location, and follow the city response from one clear record.",
          "alt": "A Caloocan public works crew inspecting roadside drainage on a rain-wet street at blue hour."
        },
        "follow": {
          "label": "Follow",
          "eyebrow": "One report · One clear public record",
          "title1": "Your report",
          "title2": "moves",
          "title3": "the city.",
          "body": "Share the evidence. Mark the place. See what happens next.",
          "alt": "Caloocan at dawn, with the main road leading through dense neighborhoods toward the city skyline."
        }
      }
    }
  }
}
```

#### Tagalog Equivalent (`tl.json`)

```json
{
  "landing": {
    "nav": {
      "home": "Home",
      "platform": "Mga Tampok",
      "solutions": "Mga Solusyon",
      "about": "Tungkol sa Amin",
      "login": "Mag-login",
      "register": "Mag-rehistro",
      "reportIssue": "Mag-ulat ng Problema",
      "trackReport": "Subaybayan ang Ulat",
      "staffGateway": "Portal ng Kawani"
    },
    "hero": {
      "tag": "PAGSUSUBAYBAY NG MGA PAMPUBLIKONG UTILITY PARA SA CALOOCAN CITY",
      "title1": "PAMPUBLIKONG GAWAIN",
      "title2": "PAGSUSUBAYBAY AT PAGKUKUMPUNI",
      "title3": "PORTAL",
      "subtitle": "Pabubutihin ang pang-araw-araw na buhay ng mga residente ng Caloocan City sa pamamagitan ng pagtulong sa mga inhinyero na agad na matukoy ang mga panganib sa utility, mabilis na maayos ang mga outage, at mapanatili ang maaasahang pampublikong serbisyo.",
      "reportCta": "Mag-ulat ng Problema",
      "noAccountRequired": "Hindi kailangan ng account · 2 minuto lang",
      "trackCta": "Subaybayan ang Ulat",
      "trackSubtext": "Hanapin gamit ang Ticket ID at Token",
      "staffGateway": "Portal ng Pamahalaan at Kawani",
      "exploreFeatures": "Galugarin ang mga Tampok"
    },
    "cinematic": {
      "ariaLabel": "Panimulang carousel ng PULSO",
      "report": "Mag-ulat ng Problema",
      "reportSubtext": "Hindi kailangan ng account",
      "track": "Subaybayan ang Ulat",
      "staff": "Portal ng Kawani",
      "explore": "Alamin kung paano gumagana ang PULSO",
      "slideControls": "Mga eksena sa panimula",
      "previous": "Nakaraang eksena",
      "next": "Susunod na eksena",
      "showSlide": "Ipakita ang eksena {{number}}: {{label}}",
      "slides": {
        "observe": {
          "label": "Pansinin",
          "eyebrow": "Pag-uulat ng pampublikong gawain · Lungsod ng Caloocan",
          "title1": "Pansinin ang problema.",
          "title2": "Simulan ang pagtugon.",
          "body": "Iulat ang problema sa kalsada, kanal, ilaw, at utility sa Caloocan—at subaybayan ang bawat update.",
          "alt": "Malawak na tanawin ng Caloocan sa takipsilim, na may mga komunidad at pangunahing kalsadang naiilawan matapos ang ulan."
        },
        "report": {
          "label": "Iulat",
          "eyebrow": "Mula sa kalsada patungo sa tamang pangkat ng lungsod",
          "title1": "Kapag nagsalita ang kalsada, dapat",
          "title2": "makinig ang lungsod.",
          "body": "Ipakita ang problema, ilagay ang lokasyon, at subaybayan ang tugon ng lungsod sa isang malinaw na tala.",
          "alt": "Pangkat ng pampublikong gawain sa Caloocan na sumusuri ng kanal sa basang kalsada sa takipsilim."
        },
        "follow": {
          "label": "Subaybayan",
          "eyebrow": "Isang ulat · Isang malinaw na pampublikong tala",
          "title1": "Ang iyong ulat ang",
          "title2": "nagpapakilos",
          "title3": "sa lungsod.",
          "body": "Ibahagi ang ebidensya. Ituro ang lugar. Alamin ang susunod na mangyayari.",
          "alt": "Caloocan sa bukang-liwayway, na may pangunahing kalsadang tumatahak sa mga komunidad patungo sa skyline ng lungsod."
        }
      }
    }
  }
}
```

---

### 4.2 7-Step Guided Reporting Flow (`/report`)

```json
{
  "reportWizard": {
    "header": {
      "title": "Public Infrastructure Report",
      "subtitle": "Submit an issue directly to the Caloocan City Engineering Department.",
      "guestBadge": "Open Citizen Intake · No Sign-in Required",
      "stepCounter": "Step {{current}} of {{total}}",
      "saveDraft": "Draft saved automatically"
    },
    "emergencyBanner": {
      "title": "Immediate Danger or Life-Threatening Emergency?",
      "description": "PULSO is an engineering ticketing system and is not monitored for real-time 911 dispatches. For urgent fires, downed live power wires, or medical crises, call directly:",
      "call911": "Call 911 (National Emergency)",
      "callCaloocan": "Call (02) 888-1234 (Caloocan Emergency Desk)",
      "callMaynilad": "Maynilad Water Hotline: 1626",
      "callMeralco": "Meralco Electric Hotline: 16211",
      "dismiss": "I understand, this is a non-emergency utility repair"
    },
    "nav": {
      "back": "Back",
      "next": "Continue",
      "submit": "Submit Official Report",
      "submitting": "Submitting...",
      "cancel": "Cancel",
      "step": "Step"
    },
    "steps": {
      "step1": "Category",
      "step2": "Location",
      "step3": "Evidence",
      "step4": "Details",
      "step5": "Contact",
      "step6": "Review",
      "step7": "Submit"
    },
    "step1Category": {
      "title": "Select Issue Category",
      "subtitle": "What kind of public infrastructure requires repair or inspection?",
      "selectPlaceholder": "Choose category...",
      "categories": {
        "roads_bridges": {
          "label": "Roads & Bridges",
          "desc": "Potholes, broken asphalt, damaged bridges, sidewalk cracks"
        },
        "drainage_flooding": {
          "label": "Drainage & Flooding",
          "desc": "Clogged open canals, overflowing storm drains, missing manhole covers"
        },
        "streetlights_electrical": {
          "label": "Streetlights & Electrical",
          "desc": "Unlit streetlamps, sparking fixtures, damaged lamp posts"
        },
        "waste_sanitation": {
          "label": "Waste & Obstructions",
          "desc": "Illegal dumping on roads, fallen tree branches, blocked pathways"
        },
        "public_facilities": {
          "label": "Public Facilities",
          "desc": "Barangay hall damage, public park benches, health center exterior issues"
        },
        "traffic_signage": {
          "label": "Traffic & Road Signs",
          "desc": "Fallen stop signs, broken traffic lights, damaged pedestrian barriers"
        },
        "water_utilities": {
          "label": "Water Supply & Leaks",
          "desc": "Ruptured pipes, low pressure leaks, exposed water lines"
        },
        "other": {
          "label": "Other Infrastructure",
          "desc": "Other civic engineering hazards not listed above"
        }
      },
      "validationError": "Please select a category to continue."
    },
    "step2Location": {
      "title": "Pin Incident Location",
      "subtitle": "Point to the exact spot in Caloocan City where the issue is located.",
      "searchPlaceholder": "Search street name, landmark, or barangay...",
      "useMyLocation": "Use My Current GPS Location",
      "locating": "Acquiring accurate GPS...",
      "locationSuccess": "GPS location tagged (accuracy: {{accuracy}}m)",
      "locationError": "Unable to acquire GPS. Please search or drag the pin manually.",
      "boundaryChecking": "Verifying Caloocan City boundaries...",
      "insideBoundary": "Within Caloocan City Jurisdiction ({{barangay}})",
      "outsideBoundaryWarning": "Location Appears Outside Caloocan City",
      "outsideBoundaryDesc": "This location seems to fall under {{detectedCity}} jurisdiction. You may still submit, but resolution will involve cross-agency coordination.",
      "landmarkLabel": "Exact Landmark or Street Reference (Optional)",
      "landmarkPlaceholder": "e.g. In front of Caloocan High School, near tricycle terminal",
      "barangayLabel": "Barangay",
      "coordinatesLabel": "Coordinates",
      "listAlternative": "Need text-only mode? Enter address manually",
      "validationError": "Please place a pin or specify an address within Caloocan City."
    },
    "step3Evidence": {
      "title": "Upload Photo Evidence",
      "subtitle": "Clear photos help engineering teams assess materials and dispatch the correct crew.",
      "dropzone": "Drag & drop photos here, or click to browse",
      "openCamera": "Take Photo with Camera",
      "chooseFile": "Select Image from Device",
      "uploadLimits": "PNG, JPG, WebP up to 10MB per image",
      "safetyWarningTitle": "Safety First",
      "safetyWarningDesc": "Never step into moving traffic or approach damaged live electrical cables to take a photo.",
      "removePhoto": "Remove photo",
      "previewAlt": "Uploaded evidence preview",
      "aiScanning": "AI Advisory Assistant analyzing image...",
      "aiCategoryDetected": "AI Suggestion: Detected {{category}} (Confidence: {{confidence}}%)",
      "aiConfidenceLow": "AI suggestion inconclusive. Your manual category selection is active.",
      "aiAcceptSuggestion": "Apply AI Category",
      "uploadProgress": "Uploading evidence: {{percent}}%",
      "validationError": "Photo evidence is recommended. Click continue to proceed without photo, or upload an image."
    },
    "step4Details": {
      "title": "Describe the Problem",
      "subtitle": "Provide clear details to help engineers prepare the work order.",
      "descriptionLabel": "Detailed Description",
      "descriptionPlaceholder": "Describe what is broken, how big the hazard is, and how long it has been present...",
      "descriptionHelp": "Minimum 10 characters. Avoid including personal private information in this box.",
      "urgencyLabel": "Perceived Urgency",
      "urgencyOptions": {
        "low": "Low — Minor cosmetic or non-blocking defect",
        "medium": "Medium — Moderate inconvenience or recurring issue",
        "high": "High — Impeding traffic, pedestrian safety, or water flow",
        "critical": "Critical — Immediate hazard to public safety"
      },
      "duplicateBannerTitle": "Possible Duplicate Report Detected",
      "duplicateBannerDesc": "A similar report was logged within {{distance}}m of this location recently (Ticket: {{ticketId}}).",
      "duplicateViewBtn": "View Existing Ticket",
      "duplicateAttachBtn": "Attach My Evidence to Existing Report",
      "duplicateProceedBtn": "No, Submit as a Separate Issue",
      "validationError": "Please provide a description of at least 10 characters."
    },
    "step5Contact": {
      "title": "Contact & Notification Preferences",
      "subtitle": "Choose how you would like to receive progress updates for this report.",
      "guestOption": {
        "title": "Anonymous / One-Time Guest",
        "desc": "No email or phone required. You will receive a private tracking token on the next screen."
      },
      "emailOption": {
        "title": "Email Notifications",
        "desc": "Receive status change emails when engineers update the ticket."
      },
      "phoneOption": {
        "title": "SMS Text Alerts",
        "desc": "Receive text message notifications on major dispatch and resolution milestones."
      },
      "signInOption": {
        "title": "Sign in to Resident Account",
        "desc": "Save this report automatically to your resident dashboard and earn Trust Score."
      },
      "emailLabel": "Email Address",
      "emailPlaceholder": "name@example.com",
      "phoneLabel": "Mobile Number",
      "phonePlaceholder": "0917 123 4567",
      "privacyNotice": "Your contact information is strictly protected under Republic Act 10173 (Data Privacy Act of 2012) and will never be shared publicly.",
      "signInLink": "Already have an account? Sign in here",
      "validationEmailError": "Please enter a valid email address.",
      "validationPhoneError": "Please enter a valid 11-digit Philippine mobile number."
    },
    "step6Review": {
      "title": "Review & Consent",
      "subtitle": "Please verify your report details before submitting to the engineering queue.",
      "sectionCategory": "Issue Category",
      "sectionLocation": "Location & Barangay",
      "sectionEvidence": "Evidence Attached",
      "sectionDetails": "Description & Urgency",
      "sectionContact": "Reporter Preference",
      "editAction": "Edit",
      "noPhotoProvided": "No photo attached (manual report)",
      "anonymousReporter": "Anonymous Guest (Tracking via Private Token)",
      "consentCheckbox": "I certify that this report is submitted in good faith and the information provided is accurate to the best of my knowledge.",
      "privacyStatement": "By submitting, you agree to the processing of public civic data by the City Government of Caloocan.",
      "validationConsentError": "You must check the certification box to submit your report."
    },
    "step7Submitting": {
      "title": "Submitting Your Report",
      "uploading": "Uploading photo evidence securely...",
      "triaging": "Initiating AI geospatial triage...",
      "generatingToken": "Generating cryptographic tracking credentials...",
      "finalizing": "Finalizing ticket docket...",
      "errorTitle": "Submission Failed",
      "errorDesc": "We encountered an issue transmitting your report. Your draft has been saved.",
      "retryBtn": "Retry Submission"
    }
  }
}
```

#### Tagalog Equivalent (`tl.json`)

```json
{
  "reportWizard": {
    "header": {
      "title": "Pampublikong Ulat sa Imprastraktura",
      "subtitle": "Magsumite ng ulat nang direkta sa Kagawaran ng Inhinyeriya ng Lungsod ng Caloocan.",
      "guestBadge": "Bukas na Pag-uulat · Hindi Kailangan Mag-login",
      "stepCounter": "Hakbang {{current}} ng {{total}}",
      "saveDraft": "Kusang nase-save ang draft"
    },
    "emergencyBanner": {
      "title": "Agad na Panganib o Pang-emerhensyang Sitwasyon?",
      "description": "Ang PULSO ay isang sistema para sa pagsasaayos ng imprastraktura at hindi nakalaan para sa agarang 911 dispatch. Para sa sunog, live na kable ng kuryente, o medikal na sakuna, tumawag agad:",
      "call911": "Tumawag sa 911 (Pambansang Emergency)",
      "callCaloocan": "Tumawag sa (02) 888-1234 (Caloocan Emergency Desk)",
      "callMaynilad": "Maynilad Water Hotline: 1626",
      "callMeralco": "Meralco Electric Hotline: 16211",
      "dismiss": "Nauunawaan ko, ito ay karaniwang pagkukumpuni ng utility"
    },
    "nav": {
      "back": "Bumalik",
      "next": "Magpatuloy",
      "submit": "Isumite ang Opisyal na Ulat",
      "submitting": "Isinusumite...",
      "cancel": "Kanselahin",
      "step": "Hakbang"
    },
    "steps": {
      "step1": "Kategorya",
      "step2": "Lokasyon",
      "step3": "Ebidensya",
      "step4": "Detalye",
      "step5": "Kontak",
      "step6": "Pagsusuri",
      "step7": "Isumite"
    },
    "step1Category": {
      "title": "Pumili ng Kategorya ng Problema",
      "subtitle": "Anong uri ng pampublikong imprastraktura ang nangangailangan ng kumpuni o inspeksyon?",
      "selectPlaceholder": "Pumili ng kategorya...",
      "categories": {
        "roads_bridges": {
          "label": "Kalsada at Tulay",
          "desc": "Mga lubak, sirang aspalto, basag na tulay, bitak sa bangketa"
        },
        "drainage_flooding": {
          "label": "Kanalismo at Pagbaha",
          "desc": "Baradong bukas na kanal, umaapaw na daluyan ng tubig, nawawalang takip ng manhole"
        },
        "streetlights_electrical": {
          "label": "Ilaw sa Kalye at Kuryente",
          "desc": "Patay na poste ng ilaw, kumikislap na kable, sirang poste ng kuryente"
        },
        "waste_sanitation": {
          "label": "Basura at mga Harang",
          "desc": "Ilegal na tambak ng basura sa kalsada, natumbang sanga, nakaharang sa daanan"
        },
        "public_facilities": {
          "label": "Pampublikong Pasilidad",
          "desc": "Sira sa barangay hall, bangko sa pampublikong parke, panlabas na sira sa health center"
        },
        "traffic_signage": {
          "label": "Trapiko at Babala sa Daan",
          "desc": "Natumbang karatula ng stop, sirang traffic light, sirang harang sa pedestrian"
        },
        "water_utilities": {
          "label": "Suplay ng Tubig at Tagas",
          "desc": "Pumutok na tubo, tagas na may mahinang presyon, nakalitaw na linya ng tubig"
        },
        "other": {
          "label": "Iba Pang Imprastraktura",
          "desc": "Iba pang panganib sa inhinyeriya ng lungsod na wala sa listahan"
        }
      },
      "validationError": "Pumili ng kategorya upang magpatuloy."
    },
    "step2Location": {
      "title": "Ituro ang Lokasyon ng Problema",
      "subtitle": "Ituro ang eksaktong lugar sa Caloocan City kung saan naroroon ang problema.",
      "searchPlaceholder": "Maghanap ng kalsada, landmark, o barangay...",
      "useMyLocation": "Gamitin ang Aking Kasalukuyang GPS",
      "locating": "Kinukuha ang eksaktong GPS...",
      "locationSuccess": "Nai-tag ang lokasyon ng GPS (katumpakan: {{accuracy}}m)",
      "locationError": "Hindi makuha ang GPS. Mangyaring maghanap o i-drag ang pin.",
      "boundaryChecking": "Sinusuri ang hangganan ng Lungsod ng Caloocan...",
      "insideBoundary": "Nasa Loob ng Nasasakupan ng Caloocan City ({{barangay}})",
      "outsideBoundaryWarning": "Ang Lokasyon ay Mukhang Nasa Labas ng Caloocan City",
      "outsideBoundaryDesc": "Ang lokasyong ito ay nasa ilalim ng {{detectedCity}}. Maaari mo pa ring isumite, ngunit kakailanganin ang pakikipag-ugnayan sa ibang ahensya.",
      "landmarkLabel": "Eksaktong Landmark o Reperensya sa Kalsada (Opsyonal)",
      "landmarkPlaceholder": "hal. Sa tapat ng Caloocan High School, malapit sa terminal ng traysikel",
      "barangayLabel": "Barangay",
      "coordinatesLabel": "Mga Coordinate",
      "listAlternative": "Kailangan ng text mode? Ilagay ang address nang manu-mano",
      "validationError": "Mangyaring maglagay ng pin o pumili ng address sa loob ng Caloocan City."
    },
    "step3Evidence": {
      "title": "Mag-upload ng Litrato Bilang Ebidensya",
      "subtitle": "Ang malinaw na litrato ay tumutulong sa mga inhinyero na ihanda ang tamang kagamitan at manggagawa.",
      "dropzone": "I-drag at i-drop ang litrato rito, o i-click upang pumili",
      "openCamera": "Kumuha ng Litrato Gamit ang Camera",
      "chooseFile": "Pumili ng Litrato Mula sa Device",
      "uploadLimits": "PNG, JPG, WebP hanggang 10MB bawat litrato",
      "safetyWarningTitle": "Kaligtasan ang Una",
      "safetyWarningDesc": "Huwag tatapak sa gitna ng umaandar na trapiko o lalapit sa sirang kable ng kuryente para lang kumuha ng litrato.",
      "removePhoto": "Alisin ang litrato",
      "previewAlt": "Preview ng na-upload na ebidensya",
      "aiScanning": "Sinusuri ng AI Advisory Assistant ang litrato...",
      "aiCategoryDetected": "Mungkahi ng AI: Natukoy ang {{category}} (Kumpiyansa: {{confidence}}%)",
      "aiConfidenceLow": "Hindi tiyak ang AI. Ang iyong manu-manong kategorya ang gagamitin.",
      "aiAcceptSuggestion": "Gamitin ang Mungkahi ng AI",
      "uploadProgress": "Ina-upload ang ebidensya: {{percent}}%",
      "validationError": "Inirerekomenda ang litrato. I-click ang magpatuloy kung walang litrato, o mag-upload."
    },
    "step4Details": {
      "title": "Ilarawan ang Problema",
      "subtitle": "Magbigay ng malinaw na impormasyon upang maihanda ng mga inhinyero ang work order.",
      "descriptionLabel": "Detalyadong Paglalarawan",
      "descriptionPlaceholder": "Ilarawan ang sira, gaano kalaki ang panganib, at gaano na ito katagal...",
      "descriptionHelp": "Hindi bababa sa 10 titik. Huwag maglagay ng personal na impormasyon dito.",
      "urgencyLabel": "Tinatayang Antas ng Urgency",
      "urgencyOptions": {
        "low": "Mababa — Maliit na sira o hindi nakakaharang na depekto",
        "medium": "Katamtaman — Nakakaabala o paulit-ulit na problema",
        "high": "Mataas — Nakakaharang sa trapiko, kaligtasan, o daloy ng tubig",
        "critical": "Kritikal — Agarang panganib sa kaligtasan ng publiko"
      },
      "duplicateBannerTitle": "Posibleng Katulad na Ulat ang Natukoy",
      "duplicateBannerDesc": "May katulad na ulat na naitala sa loob ng {{distance}}m kamakailan (Ticket: {{ticketId}}).",
      "duplicateViewBtn": "Tingnan ang Naunang Ticket",
      "duplicateAttachBtn": "Isama ang Aking Litrato sa Naunang Ulat",
      "duplicateProceedBtn": "Hindi, Isumite Bilang Hiwalay na Ulat",
      "validationError": "Maglagay ng paglalarawan na may hindi bababa sa 10 titik."
    },
    "step5Contact": {
      "title": "Paraan ng Pakikipag-ugnayan at Notipikasyon",
      "subtitle": "Pumili kung paano mo nais makatanggap ng mga update sa progreso ng ulat.",
      "guestOption": {
        "title": "Hindi Kilalang Bisita (Anonymous Guest)",
        "desc": "Walang kailangang email o telepono. Makakatanggap ka ng pribadong tracking token sa susunod na screen."
      },
      "emailOption": {
        "title": "Notipikasyon sa Email",
        "desc": "Makatanggap ng email kapag binago ng mga inhinyero ang katayuan ng ticket."
      },
      "phoneOption": {
        "title": "Alerto sa SMS Text",
        "desc": "Makatanggap ng mensahe sa cellphone sa bawat mahalagang yugto ng pag-aayos."
      },
      "signInOption": {
        "title": "Mag-sign in sa Resident Account",
        "desc": "Kusang i-save ang ulat na ito sa iyong dashboard at pataasin ang iyong Trust Score."
      },
      "emailLabel": "Email Address",
      "emailPlaceholder": "pangalan@halimbawa.com",
      "phoneLabel": "Numero ng Cellphone",
      "phonePlaceholder": "0917 123 4567",
      "privacyNotice": "Ang iyong impormasyon sa pakikipag-ugnayan ay mahigpit na pinoprotektahan sa ilalim ng Data Privacy Act of 2012 (RA 10173) at hindi kailanman ilalabas sa publiko.",
      "signInLink": "May account na? Mag-sign in dito",
      "validationEmailError": "Maglagay ng wastong email address.",
      "validationPhoneError": "Maglagay ng wastong 11-digit na numero ng mobile sa Pilipinas."
    },
    "step6Review": {
      "title": "Pagsusuri at Pahintulot",
      "subtitle": "Pakisuri ang mga detalye ng iyong ulat bago ito opisyal na isumite sa engineering queue.",
      "sectionCategory": "Kategorya ng Problema",
      "sectionLocation": "Lokasyon at Barangay",
      "sectionEvidence": "Kalakip na Ebidensya",
      "sectionDetails": "Paglalarawan at Urgency",
      "sectionContact": "Paraan ng Notipikasyon",
      "editAction": "I-edit",
      "noPhotoProvided": "Walang kalakip na litrato (manu-manong ulat)",
      "anonymousReporter": "Anonymous Guest (Susubaybayan gamit ang Pribadong Token)",
      "consentCheckbox": "Pinatutunayan ko na ang ulat na ito ay isinumite nang may mabuting hangarin at tumpak sa abot ng aking kaalaman.",
      "privacyStatement": "Sa pagsumite, sumasang-ayon ka sa pagproseso ng pampublikong datos ng Pamahalaang Lungsod ng Caloocan.",
      "validationConsentError": "Kailangan mong lagyan ng tsek ang kahon ng sertipikasyon upang magsumite."
    },
    "step7Submitting": {
      "title": "Isinusumite ang Iyong Ulat",
      "uploading": "Ligtas na ina-upload ang litrato...",
      "triaging": "Sinisimulan ang pagsusuri ng AI...",
      "generatingToken": "Bumubuo ng pribadong tracking credentials...",
      "finalizing": "Tinatapos ang talaan ng ticket...",
      "errorTitle": "Nabigo ang Pagsumite",
      "errorDesc": "Nagkaroon ng problema sa pagpapadala ng iyong ulat. Naka-save ang iyong draft.",
      "retryBtn": "Subukang Isumite Muli"
    }
  }
}
```

---

### 4.3 High-Trust Ticket Receipt (`/report/success`)

```json
{
  "receipt": {
    "title": "Report Successfully Logged",
    "subtitle": "Your report has been received by the Caloocan City Engineering Department.",
    "ticketIdLabel": "Official Ticket ID",
    "timestampLabel": "Submission Timestamp",
    "statusLabel": "Current Status",
    "statusReceived": "Received & Queued for Triage",
    "trackingTokenSection": {
      "title": "Your Private Tracking Code",
      "subtitle": "Save this code! You will need it along with your Ticket ID to check updates publicly or link this report to an account later.",
      "tokenWarning": "Keep this secret. Anyone with this code can view public milestones for this ticket.",
      "copyToken": "Copy Tracking Code",
      "tokenCopied": "Copied to Clipboard!",
      "copyUrl": "Copy Tracking URL",
      "urlCopied": "Link Copied!"
    },
    "qrSection": {
      "title": "Mobile QR Quick Pass",
      "desc": "Scan with your phone camera to quickly open this ticket on mobile.",
      "downloadQr": "Download QR Code"
    },
    "actions": {
      "trackNow": "Track This Report Now",
      "saveToAccount": "Save to My Reports (Link to Account)",
      "saveToAccountDesc": "Create an account or sign in to keep all your tickets in one place and get live notifications.",
      "returnHome": "Return to Home",
      "reportAnother": "Submit Another Report"
    },
    "nextSteps": {
      "title": "What Happens Next?",
      "step1": "1. AI and dispatch engineers verify the location and severity within 2 hours.",
      "step2": "2. An engineering work order is created and assigned to the relevant district field team.",
      "step3": "3. Field crews inspect and complete repairs, uploading photographic proof of resolution.",
      "step4": "4. The ticket is marked resolved and closed on the public registry."
    }
  }
}
```

#### Tagalog Equivalent (`tl.json`)

```json
{
  "receipt": {
    "title": "Matagumpay na Naitatala ang Ulat",
    "subtitle": "Natanggap na ng Kagawaran ng Inhinyeriya ng Lungsod ng Caloocan ang iyong ulat.",
    "ticketIdLabel": "Opisyal na Ticket ID",
    "timestampLabel": "Oras ng Pagsumite",
    "statusLabel": "Kasalukuyang Katayuan",
    "statusReceived": "Natanggap at Nakapila para sa Pagsusuri",
    "trackingTokenSection": {
      "title": "Ang Iyong Pribadong Tracking Code",
      "subtitle": "I-save ang code na ito! Kakailanganin mo ito kasama ang iyong Ticket ID upang masubaybayan ang ulat o maiugnay ito sa iyong account mamaya.",
      "tokenWarning": "Panatilihing lihim ito. Ang sinumang may hawak ng code na ito ay makakakita ng pampublikong progreso ng ticket.",
      "copyToken": "Kopyahin ang Tracking Code",
      "tokenCopied": "Nakopya sa Clipboard!",
      "copyUrl": "Kopyahin ang Link sa Pagsubaybay",
      "urlCopied": "Nakopya ang Link!"
    },
    "qrSection": {
      "title": "QR Quick Pass sa Cellphone",
      "desc": "I-scan gamit ang camera ng cellphone upang mabilis na mabuksan ang ticket na ito.",
      "downloadQr": "I-download ang QR Code"
    },
    "actions": {
      "trackNow": "Subaybayan ang Ulat Ngayon",
      "saveToAccount": "I-save sa Mga Ulat Ko (Iugnay sa Account)",
      "saveToAccountDesc": "Gumawa ng account o mag-sign in upang mapagsama-sama ang iyong mga ticket at makatanggap ng notipikasyon.",
      "returnHome": "Bumalik sa Home",
      "reportAnother": "Magsumite ng Isa Pang Ulat"
    },
    "nextSteps": {
      "title": "Ano ang Susunod na Mangyayari?",
      "step1": "1. Susuriin ng AI at mga inhinyero ang lokasyon at antas ng sira sa loob ng 2 oras.",
      "step2": "2. Gagawa ng work order at itatalaga ito sa nararapat na field team ng distrito.",
      "step3": "3. Pupunta ang mga manggagawa upang siyasatin at kumpunihin ang sira, at mag-a-upload ng litrato bilang patunay.",
      "step4": "4. Mamarkahan ang ticket bilang naresolba at maisasara sa pampublikong talaan."
    }
  }
}
```

---

### 4.4 Public Tracking Page (`/track`)

```json
{
  "track": {
    "header": {
      "title": "Track Public Infrastructure Report",
      "subtitle": "Follow the live engineering progress and milestone timeline for any Caloocan City ticket.",
      "badge": "Civic Aperture · Transparent Public Works"
    },
    "lookup": {
      "title": "Ticket Lookup",
      "subtitle": "Enter your Ticket ID and Secret Tracking Token from your receipt.",
      "ticketLabel": "Ticket ID",
      "ticketPlaceholder": "e.g. RPT-20260902-8F92E1B4 or PULSO-10492",
      "tokenLabel": "Secret Tracking Token",
      "tokenPlaceholder": "TRK-XXXX-XXXX-XXXX-XXXX",
      "submitBtn": "Track Report",
      "searching": "Searching Civic Registry...",
      "errorNotFound": "Report not found or invalid tracking credentials. Please check your Ticket ID and Token."
    },
    "result": {
      "ticketHeader": "Ticket Details",
      "categoryLabel": "Category",
      "barangayLabel": "Barangay / Area",
      "submittedOn": "Reported On",
      "lastUpdated": "Last Updated",
      "currentStageLabel": "Current Operational Stage",
      "publicSummary": "Location Summary",
      "privacyNotice": "Public Privacy Mode Active: Reporter details, private contact info, and internal staff notes are protected and redacted.",
      "pulseLineTitle": "PulseLine 6-Stage Progress",
      "timelineTitle": "Public Milestone Timeline",
      "claimPrompt": "Is this your report? Link it to your account for unified management",
      "claimBtn": "Claim This Report"
    },
    "stages": {
      "received": {
        "label": "Received",
        "description": "Report logged and queued for engineering triage."
      },
      "under_review": {
        "label": "Under Review",
        "description": "Dispatch engineers verifying jurisdiction, severity, and field requirements."
      },
      "validated": {
        "label": "Validated",
        "description": "Issue confirmed and authorized for work order creation."
      },
      "assigned": {
        "label": "Assigned",
        "description": "Work order dispatched to District Maintenance Crew."
      },
      "in_progress": {
        "label": "In Progress",
        "description": "Field team actively conducting on-site repairs and maintenance."
      },
      "resolved": {
        "label": "Resolved",
        "description": "Repairs complete; verified with on-site resolution evidence."
      },
      "closed": {
        "label": "Closed",
        "description": "Final closeout archived in the city engineering registry."
      }
    }
  }
}
```

#### Tagalog Equivalent (`tl.json`)

```json
{
  "track": {
    "header": {
      "title": "Subaybayan ang Pampublikong Ulat sa Imprastraktura",
      "subtitle": "Sundan ang aktwal na progreso at timeline ng pagkukumpuni para sa anumang ticket sa Caloocan City.",
      "badge": "Civic Aperture · Maaasahan at Bukas na Pampublikong Gawain"
    },
    "lookup": {
      "title": "Paghahanap ng Ticket",
      "subtitle": "Ilagay ang iyong Ticket ID at Lihim na Tracking Token mula sa iyong resibo.",
      "ticketLabel": "Ticket ID",
      "ticketPlaceholder": "hal. RPT-20260902-8F92E1B4 o PULSO-10492",
      "tokenLabel": "Lihim na Tracking Token",
      "tokenPlaceholder": "TRK-XXXX-XXXX-XXXX-XXXX",
      "submitBtn": "Subaybayan ang Ulat",
      "searching": "Hinahanap sa Talaan ng Lungsod...",
      "errorNotFound": "Hindi natagpuan ang ulat o mali ang tracking credentials. Pakisuri ang iyong Ticket ID at Token."
    },
    "result": {
      "ticketHeader": "Mga Detalye ng Ticket",
      "categoryLabel": "Kategorya",
      "barangayLabel": "Barangay / Lugar",
      "submittedOn": "Petsa ng Pag-ulat",
      "lastUpdated": "Huling Na-update",
      "currentStageLabel": "Kasalukuyang Yugto ng Pagkilos",
      "publicSummary": "Buod ng Lokasyon",
      "privacyNotice": "Aktibo ang Public Privacy Mode: Ang pagkakakilanlan ng nag-ulat, contact details, at panloob na tala ng kawani ay protektado at nakatago.",
      "pulseLineTitle": "Progreso ng PulseLine sa 6 na Yugto",
      "timelineTitle": "Pampublikong Timeline ng mga Yugto",
      "claimPrompt": "Iyo ba ang ulat na ito? Iugnay ito sa iyong account para sa madaling pamamahala",
      "claimBtn": "I-claim ang Ulat na Ito"
    },
    "stages": {
      "received": {
        "label": "Natanggap",
        "description": "Naitala ang ulat at nakapila para sa pagsusuri ng mga inhinyero."
      },
      "under_review": {
        "label": "Sinusuri",
        "description": "Kino-kumpirma ng mga inhinyero ang nasasakupan, antas ng sira, at kailangan sa kalsada."
      },
      "validated": {
        "label": "Napatunayan",
        "description": "Nakumpirma ang isyu at inaprubahan para sa paggawa ng work order."
      },
      "assigned": {
        "label": "Naitalaga",
        "description": "Naipadala na ang work order sa Maintenance Crew ng Distrito."
      },
      "in_progress": {
        "label": "Isinasagawa",
        "description": "Kasalukuyang kinukumpuni ng field team ang sira sa lokasyon."
      },
      "resolved": {
        "label": "Naresolba",
        "description": "Tapos na ang pagkukumpuni; napatunayan gamit ang litrato ng natapos na gawa."
      },
      "closed": {
        "label": "Isinara",
        "description": "Pinal na naitala at naisara sa talaan ng inhinyeriya ng lungsod."
      }
    }
  }
}
```

---

### 4.5 Resident Dashboard Tabs & Claim Modal (`/dashboard`)

```json
{
  "residentDashboard": {
    "header": {
      "title": "Resident Portal & My Reports",
      "subtitle": "Manage all your authored and claimed public infrastructure tickets.",
      "claimAction": "+ Claim Guest Report"
    },
    "tabs": {
      "all": "All Reports",
      "active": "Active",
      "needs_information": "Needs Information",
      "resolved": "Resolved",
      "ariaLabel": "Report status filter tabs"
    },
    "emptyStates": {
      "all": {
        "title": "No Reports Found",
        "desc": "You haven't submitted or claimed any infrastructure reports yet.",
        "action": "Report an Issue"
      },
      "active": {
        "title": "No Active Reports",
        "desc": "All your reported issues have been processed or resolved.",
        "action": "Report New Hazard"
      },
      "needs_information": {
        "title": "No Actions Required",
        "desc": "None of your reports currently require additional information or photos."
      },
      "resolved": {
        "title": "No Resolved Reports Yet",
        "desc": "Completed repairs with photographic proof of resolution will appear here."
      }
    },
    "claimModal": {
      "triggerBtn": "Claim Guest Ticket",
      "title": "Link Guest Report to Your Account",
      "subtitle": "Enter the Ticket ID and private tracking token from your guest submission receipt to claim ownership.",
      "ticketLabel": "Ticket ID",
      "ticketPlaceholder": "e.g. RPT-20260902-8F92E1B4",
      "tokenLabel": "Private Tracking Token",
      "tokenPlaceholder": "TRK-XXXX-XXXX-XXXX-XXXX",
      "submitBtn": "Claim & Link Report",
      "claiming": "Linking Report...",
      "cancelBtn": "Cancel",
      "successTitle": "Report Linked Successfully!",
      "successDesc": "This ticket has been added to your dashboard. You will now receive in-app notifications on all status changes.",
      "viewReportBtn": "View Report in Dashboard",
      "error403": "Invalid tracking token. Please double-check the token code on your receipt.",
      "error409": "This report has already been claimed by another resident account.",
      "error404": "Ticket ID not found. Please verify the ticket number.",
      "error500": "Unable to claim report due to a server error. Please try again later."
    }
  }
}
```

#### Tagalog Equivalent (`tl.json`)

```json
{
  "residentDashboard": {
    "header": {
      "title": "Portal ng Residente at Mga Ulat Ko",
      "subtitle": "Pamahalaan ang lahat ng iyong ginawa at iniugnay na ticket sa imprastraktura.",
      "claimAction": "+ I-claim ang Ulat ng Bisita"
    },
    "tabs": {
      "all": "Lahat ng Ulat",
      "active": "Aktibo",
      "needs_information": "Kailangan ng Impormasyon",
      "resolved": "Naresolba",
      "ariaLabel": "Mga tab sa pagsasala ng katayuan ng ulat"
    },
    "emptyStates": {
      "all": {
        "title": "Walang Nahanap na Ulat",
        "desc": "Wala ka pang naisusumite o naiuugnay na ulat sa imprastraktura.",
        "action": "Mag-ulat ng Problema"
      },
      "active": {
        "title": "Walang Aktibong Ulat",
        "desc": "Lahat ng iyong iniulat na problema ay naaksyunan o naresolba na.",
        "action": "Mag-ulat ng Bagong Panganib"
      },
      "needs_information": {
        "title": "Walang Kinakailangang Aksyon",
        "desc": "Wala sa iyong mga ulat ang nangangailangan ng karagdagang impormasyon o litrato sa ngayon."
      },
      "resolved": {
        "title": "Wala Pang Naresolbang Ulat",
        "desc": "Ang mga natapos na kumpuni na may kalakip na litrato bilang patunay ay lilitaw rito."
      }
    },
    "claimModal": {
      "triggerBtn": "I-claim ang Ticket ng Bisita",
      "title": "Iugnay ang Ulat ng Bisita sa Iyong Account",
      "subtitle": "Ilagay ang Ticket ID at pribadong tracking token mula sa iyong resibo upang maiugnay ito sa iyong account.",
      "ticketLabel": "Ticket ID",
      "ticketPlaceholder": "hal. RPT-20260902-8F92E1B4",
      "tokenLabel": "Pribadong Tracking Token",
      "tokenPlaceholder": "TRK-XXXX-XXXX-XXXX-XXXX",
      "submitBtn": "I-claim at Iugnay ang Ulat",
      "claiming": "Iniugnay ang Ulat...",
      "cancelBtn": "Kanselahin",
      "successTitle": "Matagumpay na Naiugnay ang Ulat!",
      "successDesc": "Idinagdag na ang ticket na ito sa iyong dashboard. Makakatanggap ka na ngayon ng mga notipikasyon sa tuwing magbabago ang katayuan nito.",
      "viewReportBtn": "Tingnan ang Ulat sa Dashboard",
      "error403": "Maling tracking token. Pakisuring muli ang token code sa iyong resibo.",
      "error409": "Ang ulat na ito ay na-claim na ng ibang resident account.",
      "error404": "Hindi natagpuan ang Ticket ID. Pakisuri ang numero ng ticket.",
      "error500": "Hindi maiugnay ang ulat dahil sa problema sa server. Pakisubukan muli mamaya."
    }
  }
}
```

---

## 5. PulseLine 6-Stage Lifecycle Specification

### 5.1 6-Stage State Machine Mapping

The PULSO public lifecycle translates internal backend operational statuses into a clear, trustworthy 6-stage civic progression:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Stage 1    │ ──► │   Stage 2    │ ──► │   Stage 3    │
│   RECEIVED   │     │ UNDER REVIEW │     │  VALIDATED   │
└──────────────┘     └──────────────┘     └──────────────┘
       ▲                                         │
       │                                         ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Stage 6    │ ◄── │   Stage 5    │ ◄── │   Stage 4    │
│   RESOLVED   │     │ IN PROGRESS  │     │   ASSIGNED   │
│   (CLOSED)   │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

| # | Public Stage | Internal DB Status | Public Display Label (EN) | Public Display Label (TL) | Signal Cut Color Token | Description & Operational Meaning |
|---|---|---|---|---|---|---|
| **1** | **Received** | `pending` / `received` | Received | Natanggap | `#465D6C` (Light) / `#B9C7CF` (Dark) | Report successfully logged in database, assigned unique Ticket ID and tracking token hash, and placed in the triage intake queue. |
| **2** | **Under Review** | `pending_approval` / `triaged` | Under Review | Sinusuri | `#B9380B` (Ember Light) / `#FF8A3D` (Ember Dark) | Dispatch engineers and AI verify photographic evidence, confirm boundary jurisdiction, assess risk severity, and check for duplicates. |
| **3** | **Validated** | `approved_internal` / `validated` | Validated | Napatunayan | `#0B4F6C` (Field Blue) / `#82C7D8` (Cyan Dark) | Report validated as a legitimate civic hazard. Authorized for work order generation or civil works scheduling. |
| **4** | **Assigned** | `dispatched` / `assigned` | Assigned | Naitalaga | `#0B4F6C` (Field Blue) / `#82C7D8` (Cyan Dark) | Work order dispatched to a specific District Engineering crew or maintenance unit with required tools and materials. |
| **5** | **In Progress** | `in_progress` / `active` | In Progress | Isinasagawa | `#B9380B` (Ember Light) / `#FF8A3D` (Ember Dark) | Field crew is actively working on-site to repair the infrastructure, clear obstructions, or replace components. |
| **6** | **Resolved** | `resolved` / `closed_by_citizen` / `closed` | Resolved | Naresolba | `#0B756B` (Resolve Teal Light) / `#66D2C8` (Teal Dark) | Work complete. Verified with photographic completion evidence. Ticket archived and closed in public registry. |

### 5.2 Transition Logic, SLAs & Public Timeline Projections

1. **Intake to Review (Stage 1 → 2)**:
   - Automated AI scan runs within 60 seconds of submission.
   - Dispatcher manual triage queue target: < 2 hours.
   - Public timeline entry: *"Report received and queued for engineering assessment."*
2. **Review to Validation (Stage 2 → 3)**:
   - Requires jurisdiction confirmation (North/South Caloocan).
   - If information is missing, report moves to `needs_information` sub-state.
   - Public timeline entry: *"Issue verified by City Engineering Department."*
3. **Validation to Assignment (Stage 3 → 4)**:
   - Work order generated with district identifier.
   - Public timeline entry: *"Work order dispatched to District Maintenance Crew."*
4. **Assignment to In Progress (Stage 4 → 5)**:
   - Triggered when field team marks arrival or work order active.
   - Public timeline entry: *"Field team actively conducting on-site repairs."*
5. **In Progress to Resolved (Stage 5 → 6)**:
   - Requires resolution photo and inspector sign-off.
   - Public timeline entry: *"Repairs completed and verified. Case resolved."*

### 5.3 Color Tokens & Visual Signatures

- **Signal Cut Notch**: 2px continuous stroke representing the PULSO heartbeat route.
  - Completed stages: Solid Resolve Teal (`#0B756B` / `#66D2C8`) with checkmark badge.
  - Active stage: Highlighted Notch with Ember (`#B9380B` / `#FF8A3D`) or Field Blue (`#0B4F6C` / `#82C7D8`) depending on citizen vs government action.
  - Inactive/Future stages: Rule Neutral (`#C9D4D9` / `#335166`) with outlined numeral.
- **Coordinate Rail**: Real data only (e.g. `BRGY 176 / 14.720712, 120.985134 / UPDATED 08:37`). No fabricated coordinates or decorative blueprint text.

### 5.4 Redaction Rules & Anti-Enumeration Security

1. **Strict PII Redaction**: The public endpoint `POST /api/reports/track` strips:
   - `resident_id`, `contact_email`, `contact_phone`, `full_name`.
   - Internal staff notes, inspector comments, and budget estimations.
   - Private evidence photos marked as containing faces or vehicle license plates.
2. **Anti-Enumeration Protection**:
   - Querying an invalid `ticket_id` or mismatched `tracking_token` returns an identical `404 Not Found` with message: `{"detail": "Report not found or invalid tracking credentials"}`.
   - Constant-time string comparison (`hmac.compare_digest`) prevents timing attacks.

---

## 6. WCAG 2.2 AA Accessibility & Inclusive Design Contract

### 6.1 3px Focus Indicator Design & CSS Classes

To meet WCAG 2.2 Success Criterion 2.4.11 (Focus Appearance - Minimum) and 2.4.13 (Focus Appearance - Enhanced), all interactive elements must feature a high-contrast 3px focus ring with a 2px offset.

#### Standard Focus Classes
- Tailwind CSS:
  ```html
  class="focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900"
  ```
- CSS Custom Property Specification:
  ```css
  :focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-canvas), 0 0 0 5px var(--color-focus-ring);
    transition: box-shadow 0.15s ease-in-out;
  }
  ```
- **Light Mode Focus Token**: `#2563EB` (Contrast ratio > 5:1 against `#F4F7F5` and `#FFFFFF`).
- **Dark Mode Focus Token**: `#93C5FD` (Contrast ratio > 8:1 against `#071A2B` and `#0E283E`).

### 6.2 44×44px Minimum Touch Target Compliance

Every interactive button, icon trigger, input control, and carousel step indicator must provide a clickable/tappable bounding area of at least 44×44 CSS pixels (WCAG 2.5.8 Target Size).

```css
/* Interactive Target Safety Enforcement */
button, 
a, 
input[type="checkbox"], 
input[type="radio"], 
.carousel-step-trigger {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

### 6.3 ARIA Roles, States & Properties Matrix

| UI Component | HTML Element | ARIA Role | Key ARIA Attributes | Keyboard Interactions |
|---|---|---|---|---|
| **Landing Hero Carousel** | `<section>` | `region` / `roledescription="carousel"` | `aria-label="PULSO introduction"`, `aria-roledescription="carousel"` | `ArrowLeft` / `ArrowRight` to change slide |
| **Hero Slide Controls** | `<div>` | `group` | `aria-label="Hero slides"` | `Tab` into controls, `Enter`/`Space` to jump |
| **Slide Indicators** | `<button>` | `button` | `aria-current="true"` (on active), `aria-label="Show slide 1: Observe"` | `Enter` / `Space` to activate |
| **Emergency Banner** | `<div>` | `alert` / `region` | `role="alert"`, `aria-live="assertive"`, `aria-label="Emergency warning"` | `Tab` to hotline links or dismiss button |
| **Wizard Step Bar** | `<nav>` | `navigation` | `aria-label="Report progress"`, `aria-current="step"` (on active step) | Sequential `Tab` flow |
| **Category Grid** | `<div>` | `radiogroup` | `role="radiogroup"`, `aria-labelledby="category-heading"` | `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` to navigate |
| **Category Card** | `<div>` | `radio` | `role="radio"`, `aria-checked="true|false"`, `tabindex="0|-1"` | `Space` to select |
| **Boundary Alert** | `<div>` | `status` | `role="status"`, `aria-live="polite"` | Announced automatically when pin moves |
| **Evidence Dropzone** | `<div>` | `button` | `role="button"`, `tabindex="0"`, `aria-describedby="upload-limits"` | `Enter` / `Space` opens native file picker |
| **AI Suggestion Pill** | `<div>` | `status` | `role="status"`, `aria-live="polite"` | Announced to screen reader upon AI completion |
| **Duplicate Alert** | `<div>` | `alert` | `role="alert"`, `aria-live="polite"` | Announced when nearby duplicate detected |
| **Consent Checkbox** | `<input>` | (native checkbox) | `required`, `aria-invalid="true|false"`, `aria-describedby="consent-desc"` | `Space` toggles check |
| **PulseLine Stepper** | `<ol>` | `list` | `aria-label="Public progress stages"`, `aria-current="step"` | Screen reader announces "Stage 3 of 6: Validated" |
| **Status Tabs** | `<div>` | `tablist` | `role="tablist"`, `aria-label="Report status filter tabs"` | `ArrowLeft`/`ArrowRight` switches tabs |
| **Status Tab** | `<button>` | `tab` | `role="tab"`, `aria-selected="true|false"`, `aria-controls="tabpanel-id"` | `Enter`/`Space` selects tab |
| **Status Tabpanel** | `<div>` | `tabpanel` | `role="tabpanel"`, `tabindex="0"`, `aria-labelledby="tab-id"` | Focus lands on panel content |
| **Claim Modal Dialog**| `<div>` | `dialog` | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="claim-title"` | `Escape` closes modal, focus trapped inside |

### 6.4 Live Regions & Screen Reader Announcements

1. **Emergency & Boundary Alerts**: Configured with `aria-live="assertive"` for emergency warnings and `aria-live="polite"` for boundary alerts, ensuring screen readers deliver safety instructions without interrupting critical user commands.
2. **AI Triage & Upload Progress**: Uses `role="status"` and `aria-live="polite"`. When an image upload completes or AI classification finishes, the text *"AI Suggestion: Detected Roads & Bridges (Confidence: 94%)"* is announced cleanly.
3. **Form Error Validation**: Form errors are linked via `aria-describedby="error-[field-name]"` and fields are tagged with `aria-invalid="true"`.
4. **Copy Feedback**: When user clicks "Copy Token", an off-screen `aria-live="polite"` container announces: *"Tracking code TRK-9F83-A8B2-C4E6-10D7 copied to clipboard."*

### 6.5 Reflow (320px), 200% Zoom & High Contrast

1. **320px Reflow (WCAG 1.4.10)**:
   - Layout switches to a single fluid column (`flex-col w-full`).
   - Reporting stepper compresses into a clean numerical step badge (`Step 2 of 7: Location`).
   - Action buttons expand to `w-full` with 44px min-height.
   - Zero horizontal scrollbar across the entire flow.
2. **200% Zoom (WCAG 1.4.4)**:
   - All font sizes use relative units (`rem` / `em`).
   - Header masthead collapses into accessible menu drawer.
   - Modal dialogs maintain vertical scrolling without clipping content or action buttons.
3. **Forced Colors / High Contrast Mode (WCAG 1.4.1 / 1.4.3 / 1.4.11)**:
   - High-contrast system borders are preserved on buttons and inputs (`border: 1px solid ButtonText` under `@media (forced-colors: active)`).
   - Status indicators do not rely on color alone; every status badge combines a distinct geometric shape, text label, and icon.
4. **Reduced Motion (WCAG 2.3.3)**:
   - `@media (prefers-reduced-motion: reduce)` disables all continuous hero slide transitions, eliminates layout spring animations, and reduces opacity fades to ≤100ms.

---

## 7. Verification & Implementation Blueprint

### File Targets for Implementation (Milestones 3, 4, 5)
- `frontend/src/locales/en.json` — Merge complete English key dictionaries.
- `frontend/src/locales/tl.json` — Merge complete Tagalog key dictionaries.
- `frontend/src/App.jsx` — Ensure routes `/report`, `/report/success`, `/track`, and `/dashboard` are registered.
- `frontend/src/components/ResidentCinematicHero.jsx` — Connect primary CTA to `/report` with subtext "No account required", secondary CTA to `/track`, and staff link to `/gov`.
- `frontend/src/pages/ReportWizardPage.jsx` — Implement 7-step reporting wizard with boundary checking, AI advisory scan, emergency banner, duplicate alert, contact options, and review.
- `frontend/src/pages/ReportSuccessPage.jsx` — Implement ticket receipt with QR code, tracking token copy, and contextual claim prompt.
- `frontend/src/pages/PublicTrackPage.jsx` — Implement public tracking lookup and 6-stage PulseLine progress stepper.
- `frontend/src/components/modals/ClaimReportModal.jsx` — Implement contextual claim modal for authenticated residents.
- `frontend/src/pages/ResidentDashboard.jsx` — Update dashboard tabs (`All`, `Active`, `Needs Information`, `Resolved`) and integrate Claim modal.

---
*Specification compiled by `spec_miner_frontend` for PULSO Core Engineering.*
