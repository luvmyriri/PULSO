# PULSO Resident Portal & Mobile App: User Stories Specification

| Field | Value |
|---|---|
| Document Title | Resident Experience User Stories Specification |
| System | PULSO Civic Engagement & Infrastructure Intelligence Platform |
| Target Audience | Product Managers, UI/UX Designers, Frontend & Mobile Engineers |
| Version | 1.0 (Focused Specification) |
| Authority | Caloocan City Civic Operations & Resident Experience Group |

---

## 1. Executive Summary & Persona Ecosystem

The PULSO Resident Portal and Mobile Application empower citizens of Caloocan City to act as active civic contributors. The platform bridges the communication gap between communities and the Local Government Unit (LGU) through intuitive incident reporting, automated AI-assisted triage, transparent lifecycle tracking, and localized public advisories.

### Resident Personas

*   **Persona A: Maria Santos (The Daily Commuter)**
    *   *Profile:* 28 years old, commutes daily along Quirino Highway and Camarin Road.
    *   *Goals:* Quickly report hazardous road conditions (potholes, open manholes) on mobile in under 60 seconds with exact GPS tags.
    *   *Key Frustrations:* Filing complaints into black holes without confirmation or resolution timelines.
*   **Persona B: Mang Danilo Reyes (Community Leader / Barangay Tanod)**
    *   *Profile:* 54 years old, active community officer in Barangay 178, North Caloocan.
    *   *Goals:* Submit consolidated reports for streetlights, clogged drainage, and fallen branches; track ongoing LGU infrastructure works in his barangay.
    *   *Key Frustrations:* Language barriers with technical jargon, multiple duplicate complaints causing administrative delays.
*   **Persona C: Aling Elena Cruz (Tech-Cautious Resident)**
    *   *Profile:* 62 years old, prefers Filipino language interface, uses entry-level Android smartphone.
    *   *Goals:* Verify her residency securely using her PhilSys National ID and receive SMS/push alerts when local water or electrical repairs are scheduled.
    *   *Key Frustrations:* Complex multi-step forms, tiny typography, confusing verification procedures.

---

## 2. Epic 1: Onboarding, Identity & Resident Verification

### US-RES-01: PhilSys National ID & Government ID Parsing
*   **As a** prospective resident of Caloocan City,
*   **I want to** scan or upload my government-issued identification (e.g., PhilSys National ID, Driver's License, Voter's ID) during registration,
*   **So that** my identity and residency are automatically verified without requiring manual in-person verification at City Hall.

#### Acceptance Criteria
1. The resident can capture an ID image using their mobile camera or upload an existing image file (JPEG, PNG, WebP up to 10MB).
2. The system executes OCR parsing to extract: Full Name, Date of Birth, Address, and ID Serial Number.
3. The extracted details pre-populate the registration form with clear visual indicators allowing the user to review and correct any OCR discrepancies.
4. If the ID scan fails or is blurry, the user receives actionable guidance (e.g., "Ensure good lighting and all 4 corners of the ID are visible") and can retry or request assisted manual verification.
5. All uploaded ID images are encrypted at rest using AES-256 and never made accessible via public URLs.

#### Scenario: Successful PhilSys ID Scan
*   **Given** a resident is on the registration screen,
*   **When** they snap a clear photo of their PhilSys ID card,
*   **Then** the OCR engine parses their name and Caloocan address within 3 seconds and fills in the corresponding fields for final review.

---

### US-RES-02: Secure OTP Account Activation
*   **As a** newly registered resident,
*   **I want to** receive a one-time verification code via email and SMS,
*   **So that** I can authenticate my account and prevent unauthorized profile creation under my identity.

#### Acceptance Criteria
1. Upon submitting the registration form, a 6-digit numeric OTP is immediately dispatched to the user's verified contact method.
2. The OTP input interface features auto-advance formatting, paste support, and a visible 60-second expiration countdown.
3. A "Resend Code" affordance becomes active only after the 60-second timer elapses to prevent rate-limit abuse.
4. Three consecutive incorrect OTP entries temporarily lock the submission for 5 minutes with clear instructional copy.
5. Successful verification immediately logs the user into their active session and presents an onboarding welcome tour.

---

## 3. Epic 2: Multimodal Civic Incident Reporting

### US-RES-03: Quick-Capture Incident Submission
*   **As a** resident who discovers a public infrastructure defect,
*   **I want to** submit a report containing photos, automatic GPS location, and a concise description,
*   **So that** the City Engineering Office can immediately identify, locate, and assess the problem.

#### Acceptance Criteria
1. The reporting flow requires only three primary steps: Capture/Attach Evidence -> Confirm Geolocation -> Describe Issue.
2. The user can attach up to 4 high-resolution photos or a short 10-second video of the hazard.
3. The application automatically queries the device GPS to pin the exact latitude and longitude with an accuracy radius indicator.
4. The user can adjust the map pin manually if reporting from a nearby safe location or safe distance.
5. An optional voice note or speech-to-text input is available for users who prefer speaking over typing.
6. The submit button displays an explicit upload progress indicator and disables duplicate taps.

#### Scenario: Reporting a Fallen Electrical Cable
*   **Given** a commuter spots a dangling power line,
*   **When** they open PULSO, snap a photo, and tap "Submit Urgent Concern",
*   **Then** the system captures the GPS coordinates, classifies the issue under Emergency/Electrical, and provides an instant tracking ticket ID within 3 seconds.

---

### US-RES-04: AI-Assisted Triage & Category Suggestion
*   **As a** resident submitting a report,
*   **I want the** system's AI engine to analyze my photo and suggest the category and urgency level,
*   **So that** I don't have to navigate complex bureaucratic department lists.

#### Acceptance Criteria
1. When a photo is uploaded, Gemini 2.5 Vision analyzes the image to suggest: Utility Type (Road, Drainage, Electrical, Water, Waste), Incident Summary, and Severity Level.
2. The suggested category is presented as an editable chip; the user can accept the AI suggestion with one tap or choose a different category from a curated dropdown.
3. If the AI detects an emergency (e.g., open fire, active transformer explosion), a prominent warning banner provides the direct Caloocan Emergency Hotline button (911 / LGU Command).

---

### US-RES-05: Real-Time Duplicate Report Awareness
*   **As a** resident reporting an issue,
*   **I want to** see if neighbors have already reported the same incident nearby,
*   **So that** I can upvote/subscribe to the existing ticket instead of creating duplicate administrative noise.

#### Acceptance Criteria
1. When a location and category are selected, the system checks for existing active reports within a 50-meter radius using geospatial clustering.
2. If matching tickets are found, a card appears: *"3 neighbors reported a similar issue near this location. Would you like to subscribe to updates?"*
3. Tapping "Me Too / Subscribe" adds the resident's account to the notification broadcast list for that ticket cluster without creating a redundant database record.
4. If the resident's issue is distinct, they can tap *"This is a different problem"* to proceed with their original submission.

---

## 4. Epic 3: Real-Time Lifecycle Tracking & Notifications

### US-RES-06: Interactive Ticket Process Timeline
*   **As a** resident who submitted a report,
*   **I want to** view an end-to-end visual timeline of my ticket's lifecycle,
*   **So that** I know exactly which department is handling my concern and what actions have been taken.

#### Acceptance Criteria
1. The Ticket Detail screen displays a chronological process stepper with clear status states:
   *   `Submitted` -> `AI Verified` -> `Assigned to Division` -> `Crew Dispatched` -> `In Progress` -> `Resolved` -> `Closed`.
2. Each step shows the timestamp, assigned department (e.g., City Engineering - Maintenance Division), and public-safe field notes.
3. The interface displays estimated completion windows based on historical resolution times for that category and severity.
4. The timeline updates in real time without requiring manual pull-to-refresh when a push event is broadcast.

---

### US-RES-07: Push Notifications & SMS Status Alerts
*   **As a** resident on the go,
*   **I want to** receive immediate push notifications and SMS updates when my report's status changes,
*   **So that** I stay informed without having to constantly check the app.

#### Acceptance Criteria
1. Notifications are triggered on key milestones: (a) Report Verified by Dispatcher, (b) Crew Dispatched to Site, (c) Work Completed / Proof Attached, (d) Scheduled LGU Maintenance Advisories.
2. Tapping a push notification deep-links directly to the relevant ticket detail view.
3. Users can configure notification channels in their profile (Push Only, SMS Only, or Both).

---

## 5. Epic 4: Resolution Review, Proof of Work & Feedback

### US-RES-08: Proof of Resolution Review & Resident Sign-off
*   **As a** reporting citizen,
*   **I want to** inspect "Before and After" photos uploaded by the field crew when a job is marked resolved,
*   **So that** I can verify that the repair was completed satisfactorily.

#### Acceptance Criteria
1. When a ticket enters `Resolved` status, the resident receives a notification: *"Your concern has been resolved. Please review the completed work."*
2. The ticket screen displays a side-by-side comparison of the initial complaint photo vs. the field crew's completion photo.
3. The resident can tap **"Confirm Resolution"** or **"Issue Not Resolved"**.
4. Selecting "Confirm Resolution" transitions the ticket to `Closed` and prompts for a 1-5 star service rating and optional feedback.
5. Selecting "Issue Not Resolved" opens a re-opening modal where the user must upload a new photo showing the persisting problem, reopening the ticket for supervisory review.

---

## 6. Epic 5: Community Advisories, Language & Accessibility

### US-RES-09: Localized Infrastructure Advisories
*   **As a** resident of Caloocan,
*   **I want to** view an interactive map and feed of active public works, road repairs, and scheduled utility interruptions,
*   **So that** I can plan my travel routes and daily activities accordingly.

#### Acceptance Criteria
1. The Home screen features a dedicated "Active Advisories" carousel showing official announcements from the City Engineer and Mayor's Office.
2. Advisories are geotagged and rendered on the map with distinct icons (e.g., Road Closure, Water Interruption, Power Maintenance).
3. Users can filter advisories by their specific Barangay (e.g., Barangay 171 to Barangay 188 in District 3).

---

### US-RES-10: Full Bilingual Support (Filipino & English)
*   **As a** resident who is more comfortable in Tagalog/Filipino,
*   **I want to** toggle the entire application language with one tap,
*   **So that** all instructions, form labels, AI summaries, and notifications are easily understood.

#### Acceptance Criteria
1. A persistent language selector (EN / FIL) is accessible from the top navigation and profile settings.
2. Toggling the language instantaneously translates 100% of static UI labels, error messages, and system notifications without page reload.
3. AI-generated category descriptions and status updates are provided in the user's selected language.
4. Screen readers (TalkBack on Android, VoiceOver on iOS) respect the selected language locale.
