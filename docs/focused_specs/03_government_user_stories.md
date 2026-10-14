# PULSO Government Command Center: User Stories Specification

| Field | Value |
|---|---|
| Document Title | Government Operations User Stories Specification |
| System | PULSO Civic Engagement & Infrastructure Intelligence Platform |
| Target Audience | LGU Department Heads, City Engineers, Dispatchers, Inspectors, Enterprise Developers |
| Version | 1.0 (Focused Specification) |
| Authority | City Engineering Office & Office of the Mayor, Caloocan City |

---

## 1. Executive Summary & LGU Stakeholder Matrix

The PULSO Government Command Center is a mission-critical enterprise operating system built for the City Government of Caloocan. It centralizes civic incident response, coordinates field engineering crews, automates public procurement workflows adhering to the Government Procurement Reform Act (RA 9184), monitors private construction permits via the Office of the Building Official (OBO), and delivers predictive infrastructure maintenance intelligence.

### Confirmed Plantilla Roles & System Capabilities

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      CITY ENGINEERING OFFICE — CALOOCAN CITY                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  City Engineer (Dept. Head II) & Assistant City Engineer (Asst. Dept. Head II)  │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
┌──────────────┐       ┌───────────────────────────────┐       ┌────────────────┐
│    ADMIN     │       │   PLANNING, DESIGN & PROG.    │       │ CONSTRUCTION & │
│   DIVISION   │       │           DIVISION            │       │  MAINTENANCE   │
├──────────────┤       ├───────────────────────────────┤       ├────────────────┤
│ Admin Off. V │       │ Division Chief (Engr IV)      │       │ Engr III (Lead)│
│ Admin Clerk  │       │ Architect I/II/III            │       │ Foreman        │
│ Records Off. │       │ Civil Engineer I/II/III       │       │ Skilled Crew   │
│              │       │ Estimator (Engr II) / CAD     │       │                │
└──────────────┘       └───────────────┬───────────────┘       └────────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │  OFFICE OF BUILDING OFFICIAL  │
                       ├───────────────────────────────┤
                       │ Building Inspector            │
                       │ Electrical Inspector (PEE)    │
                       │ Mechanical Inspector          │
                       └───────────────────────────────┘
```

---

## 2. Epic 1: Command Center Triage & Incident Dispatch

### US-GOV-01: Real-Time Incident Map & Density Heatmap
*   **As an** LGU Command Center Dispatcher,
*   **I want to** view all incoming citizen reports plotted on an interactive geospatial map of Caloocan City with severity color-coding,
*   **So that** I can immediately assess high-risk incident clusters and prioritize emergency interventions.

#### Acceptance Criteria
1. The Command Center displays a full-screen dynamic map supporting Satellite, Street, and Dark operational layers.
2. Incidents are clustered using geospatial algorithms (Haversine/DBSCAN) to group reports within a 50-meter radius into a single master ticket.
3. Incidents are color-coded by urgency: **Red (Critical/Emergency)**, **Amber (High Priority)**, **Blue (Moderate)**, and **Green (Scheduled/Low)**.
4. Clicking any cluster opens a split-pane drawer showing the master ticket, resident-submitted photos, AI triage assessment, and verified citizen count.
5. The dispatcher can filter the map view by Barangay, Department Division (Roads, Drainage, Electrical), Severity Score, and Date Range.

---

### US-GOV-02: AI-Assisted Incident Triage & Division Routing
*   **As an** Operations Intake Clerk,
*   **I want to** review AI-classified incident details and route them to the appropriate engineering division with one click,
*   **So that** actionable reports reach responsible field teams without bureaucratic delay.

#### Acceptance Criteria
1. The triage interface displays the incoming report alongside Gemini 2.5 Flash analysis: Confidence Score, Damage Classification, and Recommended Division.
2. The clerk can accept the recommended routing or re-assign to another division via a single dropdown.
3. The clerk can flag reports that fall outside public jurisdiction with status `Outside LGU Jurisdiction`, triggering an automated polite notification to the citizen citing property boundary policies.
4. Actions update the ticket state to `AI Verified` -> `Assigned to Division` and log the clerk's ID into the immutable audit trail.

---

## 3. Epic 2: Work Order Generation & Field Crew Execution

### US-GOV-03: Work Order Assignment & Mobile Field Dispatch
*   **As a** Maintenance Division Chief,
*   **I want to** generate a formal Work Order from a verified ticket and assign it to a Project Engineer and Construction Foreman,
*   **So that** field crews receive exact job specifications, GPS navigation, and required equipment lists.

#### Acceptance Criteria
1. Generating a Work Order creates a unique WO tracking number linked to the originating citizen report(s).
2. The dispatcher selects the lead Project Engineer, Foreman, and assigned vehicle/equipment from an active personnel registry.
3. The assigned field crew receives an immediate push notification and mobile app task entry containing: GPS navigation pin, hazard photos, and safety notes.
4. The ticket state automatically advances to `Dispatched`.

---

### US-GOV-04: Mobile Punch List & Field Evidence Logging
*   **As a** Senior Project Engineer or Construction Foreman on site,
*   **I want to** check in at the repair site via mobile GPS and log before/after repair photos and milestone check-offs,
*   **So that** the LGU has verified proof of work execution before closing the ticket.

#### Acceptance Criteria
1. The mobile field app requires the crew to be within 100 meters of the ticket GPS coordinates to tap **"Start Work"** (geofenced check-in).
2. The crew completes digital punch list milestones (e.g., Excavation Done, Cable Replaced, Asphalt Poured, Site Cleaned).
3. The engineer must capture and upload mandatory **"Proof of Resolution"** photos directly through the app camera (gallery uploads disabled to prevent spoofing).
4. Submitting completion advances the ticket state to `Resolved` and notifies the citizen for resolution review.

---

## 4. Epic 3: 13-Stage Infrastructure Project Lifecycle

### US-GOV-05: Capital Project Workflow Tracking
*   **As the** City Engineer or Planning Division Chief,
*   **I want to** track large-scale municipal infrastructure projects through the official 13-stage engineering lifecycle,
*   **So that** all engineering, design, estimation, approval, and execution phases are systematically governed.

#### Lifecycle Stages Governed:
`1. Project Request` ──► `2. Site Survey` ──► `3. Architectural/CAD Design` ──► `4. Bill of Quantities (BoQ)` ──► `5. Budget Review` ──► `6. City Engineer Sign-off` ──► `7. BAC Procurement` ──► `8. Notice to Proceed (NTP)` ──► `9. Construction Kickoff` ──► `10. Milestone Inspections` ──► `11. Punch List Resolution` ──► `12. Certificate of Completion` ──► `13. Final Archiving`

#### Acceptance Criteria
1. Project dashboards display a visual Gantt chart and milestone progress tracker corresponding to the 13 defined phases.
2. Advancing between major milestone gates requires mandatory document attachments (e.g., AutoCAD drawings for Design phase, signed BoQ for Budget phase).
3. Role-based signatures are strictly enforced: only the Administrative Officer V can confirm budget availability; only the City Engineer can issue final technical sign-off.
4. The system automatically computes stage durations, highlighting schedule slippage or pending approval bottlenecks.

---

## 5. Epic 4: Bill of Quantities (BoQ) & RA 9184 Procurement

### US-GOV-06: Bill of Quantities (BoQ) Digital Estimation
*   **As an** Estimator (Engineer II),
*   **I want to** compile an itemized Bill of Quantities with standard item codes, unit quantities, and current market unit rates,
*   **So that** project costing is standardized, accurate, and ready for budget appropriation.

#### Acceptance Criteria
1. The estimator creates a BoQ record linked to a project ticket, utilizing a standardized LGU materials catalog (e.g., Concrete Class A, Reinforced Steel Bars, 4-inch PVC Conduits).
2. The interface automatically calculates Subtotals, Contingency Margins, Labor Rates, and Total Estimated Project Cost.
3. Exporting produces an official, printable BoQ summary sheet in PDF and Excel formats conforming to Philippine DPWH/COA standards.
4. Once finalized, the BoQ is locked and submitted to the Administrative Division for budget certification.

---

### US-GOV-07: RA 9184 Procurement Request Letter Generation
*   **As an** Administrative Officer V,
*   **I want to** generate formal procurement request letters and track items through the Bids and Awards Committee (BAC) queue,
*   **So that** material acquisition strictly follows the Government Procurement Reform Act (RA 9184).

#### Acceptance Criteria
1. Approved BoQ items automatically populate a **Procurement Requisition Package**.
2. The system generates an official **Procurement Request Letter** pre-populated with Project Title, Account Codes, Itemized Quantities, and Approving Signatures.
3. The procurement lifecycle is tracked across transparent states: `Requisition Drafted` -> `Budget Certified` -> `Forwarded to BAC` -> `Bidding/Canvass` -> `Purchase Order Issued` -> `Delivered on Site`.
4. Material receipt confirmations automatically trigger notification to the project field engineer to commence construction.

---

## 6. Epic 6: Office of the Building Official (OBO) Permitting & Inspections

### US-GOV-08: Building, Electrical & Mechanical Inspection Logging
*   **As a** Building, Electrical (PEE), or Mechanical Inspector,
*   **I want to** log on-site inspection findings against private building permits or citizen construction complaints,
*   **So that** structural and fire safety code compliance is rigorously enforced across the city.

#### Acceptance Criteria
1. The inspector accesses scheduled inspections on their mobile/tablet with attached architectural blueprints and permit files.
2. The inspector records checklist items (e.g., Setback compliance, Fire exit clearance, Load capacity wiring).
3. If violations are detected, the inspector can issue a digital **Notice of Violation** with attached photographic evidence, automatically scheduling a mandatory re-inspection within 15 days.
4. If all checks pass, the inspector submits a **Recommendation for Certificate of Occupancy**, which routes directly to the City Engineer for digital clearance.

---

## 7. Epic 7: Citywide Analytics, Predictive Maintenance & Heatmaps

### US-GOV-09: Predictive Infrastructure Failure Intelligence
*   **As the** City Engineer and Urban Planning Chiefs,
*   **I want to** analyze historical failure heatmaps and AI predictive models,
*   **So that** we can allocate infrastructure rehabilitation budgets proactively before major seasonal disruptions (e.g., monsoon flooding).

#### Acceptance Criteria
1. The analytics suite models historical incident recurrence, drainage slope data, and asset age to highlight high-risk failure zones.
2. The City Engineer can simulate maintenance interventions and generate "Preventive Work Orders" directly from predictive risk alerts.
3. Executive KPI cards display: Average Resolution Time, Department Efficiency Index, Citizen CSAT Rating, and Total Capital Budget Deployed.
4. All reports are exportable to publication-grade executive PDF summaries for presentation to the City Council and Mayor.
