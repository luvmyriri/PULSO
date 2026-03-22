# PULSO: Full System Walkthrough & Technical Guide

This document provides a comprehensive step-by-step guide to the **PULSO (Public Utility Locator System for Operations)** ecosystem. It covers everything from citizen onboarding to the final resolution of infrastructure issues by the LGU.

---

## 1. Onboarding & Identity Verification
**Goal:** Ensure only verified residents of North Caloocan can submit official reports.

1.  **Account Creation:** Residents download the PULSO Mobile App (Flutter) and register using their email and phone number.
2.  **OCR Residency Check:** 
    *   The user is prompted to take a photo of their Philippine National ID or Barangay ID.
    *   **The Tech:** The system uses the **OCR Service** to extract the address and birthdate.
    *   **Validation:** The backend validates if the extracted address falls within **Barangays 165 to 188 (North Caloocan)**. If verified, the account is upgraded to "Verified Resident" status.

---

## 2. The Citizen Reporting Lifecycle (Incident Origin)
**Goal:** Empower citizens to act as "human sensors" with high data precision.

1.  **Multimodal Submission:** A resident notices a utility hazard (e.g., a burst water pipe or a fallen electric pole). They open the app and:
    *   **Snap a Photo:** Provides visual proof for the AI.
    *   **Add Description:** Adds context (e.g., "Water is flooding the main road").
2.  **Automated Geotagging:** The app silently attaches the precise GPS coordinates (Latitude and Longitude) to the report using the device's hardware.
3.  **The "Surgical" Triage (Gemini AI):**
    *   Once submitted, the **Gemini 2.5 Flash** model analyzes the image and text.
    *   It automatically determines the **Category** (Water, Electricity, Road, etc.).
    *   It assigns a **Severity Score (1-10)**. Example: An exposed live wire gets a 10/10, while a dim streetlight gets a 3/10.

---

## 3. Intelligent Data Processing (Backend)
**Goal:** Prevent administrative "noise" and redundant work orders.

1.  **Geospatial Deduplication (GDM):**
    *   If 50 people report the same fallen tree, the LGU shouldn't receive 50 separate tickets.
    *   **The Tech:** The backend runs the **DBSCAN Clustering** algorithm using the **Haversine Formula**.
    *   **Result:** It groups these 50 reports into a single **"Incident Cluster"** mapped to one Ticket ID.
2.  **Spatial Indexing:** The system uses **BallTree Indexing** to ensure that searching for nearby reports takes milliseconds, even when there are thousands of active points on the map.

---

## 4. LGU Command Center Operations (The Dashboard)
**Goal:** Provide the LGU with a "Data-Driven Command" overview.

1.  **Operational Heat Map:** LGU Dispatchers see a live React-based dashboard. 
    *   **Red Zones:** High-density, high-severity clusters.
    *   **Green Zones:** Areas with resolved or low-priority issues.
2.  **Work Order Management (EAM):**
    *   **Dispatcher View:** The dispatcher reviews the AI-triaged reports.
    *   **Assignment:** With one click, they "Dispatch" the ticket to a field repair crew.
3.  **KPI Tracking:** Managers can view graphs showing the **Mean Time to Resolution (MTTR)** and compare performance across different barangays.

---

## 5. Resolution & The Automated Status Loop
**Goal:** Restore public trust through transparency.

1.  **Real-Time Notifications:** As soon as the Dispatcher clicks "Dispatch," the reporting citizen receives a push notification: *"Your report has been verified. A repair crew is on the way!"*
2.  **Proof of Repair:** Once the work is done, the crew updates the status to **"Resolved."**
3.  **Final Update:** The citizen receives a final alert and can see the "Completed" status on their personal dashboard.

---

## 6. Technical Stack & Infrastructure
| Layer | Technology | Key Function |
| :--- | :--- | : :--- |
| **Mobile Frontend** | Flutter | Cross-platform (iOS/Android) citizen reporting. |
| **Web Frontend** | React / Vite | LGU Command Center & Heat Map visualization. |
| **Backend API** | Python FastAPI | High-concurrency logic and GS-Deduplication. |
| **AI Engine** | Gemini 2.5 Flash | Multimodal triage, categorization, and scoring. |
| **Database** | MySQL / PostgreSQL | Relational storage for users, reports, and clusters. |
| **Cloud Service** | Google Maps API | Heat Map layers and reverse-geocoding. |
| **Security** | JWT & TLS 1.3 | Secure authentication and data encryption. |

---

## 7. Compliance & Standards
*   **Data Privacy:** Fully compliant with **RA 10173 (Data Privacy Act)**. All personal identifiers are sanitized in public-facing heat maps.
*   **Accessibility:** UI designed following **WCAG 2.1** standards to ensure elderly residents can easily navigate the reporting process.
*   **Scalability:** Horizontal scaling architecture designed to support the entire population of North Caloocan dynamically.
