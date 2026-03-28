# PULSO Project Suggestions: Workflows, Features, and Processes

PULSO is envisioned as a comprehensive bridge between the citizens (residents) and the Local Government Unit (LGU). Based on the current architecture (Citizen Portal, Government Command Center, ID parsing, AI classification of reports), here are suggestions for workflows, core features, and processes moving forward.

---

## 🌟 1. Core Features (The Minimum Viable Product)

To ensure the platform delivers immediate value, the following core features should be prioritized:

### For Citizens (Resident Portal)
- **Unified Reporting System:** A mobile-friendly interface to report issues (infrastructure, safety, sanitation) using text, photos, and live GPS geolocation.
- **Smart ID Verification:** Automated Philippine government ID parsing (e.g., PhilSys ID) to verify residency and securely onboard users.
- **Issue Tracking:** Status updates on their submitted reports (Pending -> Dispatch -> In Progress -> Resolved).
- **Advisories & Alerts:** Real-time push notifications or SMS alerts for local emergencies, power outages, and road closures.

### For LGU (Government Portal)
- **Centralized Command Center Dashboard:** A map-based GUI showing all active issues categorized by severity and department.
- **AI-Powered Triage & Clustering:** Automated tagging of incoming reports (Category, Urgency, AI Summary, Severity Score) and deduplication (clustering similar reports in the same area).
- **Role-Based Dispatch Matrix:** Department-specific views (e.g., DPWH for roads, Meralco for power, City Health) so that dispatchers only see relevant tasks.

---

## 🚀 2. Suggested Additional Features (V2 & Beyond)

Once the core is stable, these features will significantly improve user engagement and LGU efficiency:

- **Resident Trust Score (Gamification):** Users gain trust points for verified, accurate reports. High-trust users get their reports prioritized, while spam accounts are deprioritized or banned.
- **Offline Reporting via SMS:** Allowing users without data access to text a keyword + location to a dedicated LGU number, which an AI parser translates into a system ticket.
- **Predictive Analytics & Heatmaps:** Historical data modeling to predict where infrastructure failures (e.g., floods, potholes) are most likely to occur next.
- **Public Project Transparency:** A public-facing ledger showing ongoing LGU projects, costs, and current completion stages based on resident feedback.

---

## 🔄 3. Suggested Standard Operating Workflow

A structured process ensures a report actually gets fixed instead of just sitting in a database. 

### Step 1: Submission & Verification
1. User captures a picture of an issue and submits it via PULSO.
2. System extracts GPS coordinates and timestamp.
3. System verifies the user's ID/account status and assigns an initial priority.

### Step 2: AI Triage & Deduplication
1. AI analyzes the image and text description (e.g., identifies "exposed live wire").
2. AI assigns: **Category** (Electrical/Safety), **Urgency** (Critical), and a generated **Summary**.
3. Deduplication engine checks if this issue has already been reported by someone else nearby. If yes, it groups them under one `Cluster ID`.

### Step 3: Dispatch & Allocation
1. The **Manager** portal highlights the new critical ticket.
2. The Manager automatically or manually assigns the ticket to a field **Dispatcher** (e.g., City Engineer / Meralco).
3. Field crew receives an SMS/Notification with the exact map location and AI summary.

### Step 4: Resolution & Verification
1. Field worker arrives, resolves the issue, and uploads a "Proof of Resolution" photo via the app.
2. The ticket status updates to `Resolved`.
3. PULSO automatically sends a notification back to all residents who reported that specific issue cluster, thanking them.

### Step 5: Post-Action Analytics
1. The resolution time is logged to measure department efficiency (KPI tracking).
2. The data point is fed into the predictive analytics engine for future city planning.

---

## 🛠️ 4. Technical Process for Implementation

To implement these suggestions efficiently:

1. **Iterative Development:** Adopt a 2-week sprint cycle. First sprint focuses purely on perfecting the Resident Report -> AI Triage -> Manager Dashboard flow.
2. **Third-Party Integrations:** Integrate Google Maps API for accurate geofencing/routing, and robust OCR APIs for ID parsing accuracy.
3. **Data Security (Data Privacy Act of 2012):** Ensure that all user data (especially ID parsing and GPS locations) is encrypted at rest and in transit. Residents could be given an option to submit "Anonymous Reports" that do not trace back to their profile.
4. **CI/CD Pipeline:** Ensure automated testing is explicitly testing the AI deduplication engine, as this is the most likely point of failure at scale.
