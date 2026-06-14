# PULSO: Descriptive Technical Narrative
## A Cohesive Analysis of the Unified City Operations Engine — Caloocan City Engineering Office

The PULSO platform represents a sophisticated orchestration of multi-modal artificial intelligence, high-accuracy identity verification, and strict government workflow enforcement. This narrative provides a deep dive into the core technical pillars that power the system's operational intelligence.

---

### 1. The AI-Driven Incident Intelligence Framework
The primary layer of situational awareness in the PULSO ecosystem is established by the `analyze_report` function, which leverages the Google Gemini 2.5 Flash model as a multi-modal triage agent. This sophisticated digital first-responder is engineered to process both unstructured textual descriptions and high-resolution visual data simultaneously. By analyzing the pixels of a reported hazard alongside its description, the system autonomously establishes a technical category—such as Road Issue, Water/Drainage, or Public Safety—and assigns a precise urgency level from Low to Critical. This process is further hardened by a built-in safety moderation suite that detects inappropriate content or spans, ensuring that city dispatchers are only alerted to valid infrastructure emergencies. In the event of an external service interruption, the backend seamlessly transitions to a local safety fallback, maintaining system availability through a curated keyword-based assessment engine.

---

### 2. The Hybrid Identity & OCR Verification Pipeline
Residency verification is executed through a robust hybrid pipeline that combines Google Cloud Vision’s raw optical character recognition with Gemini-powered heuristic refinement. The process begins with the raw extraction of text from nine distinct Philippine government ID types, which is then routed to specialized modular parsers designed for specific layouts like the PhilSys National ID or the LTO Driver’s License. To overcome the common challenges of "label bleeding" and noisy backgrounds, the system performs a secondary pass using the Gemini model to correct character misinterpretations and ensure the data matches strict schema requirements. This pipeline concludes with a definitive residency check for North Caloocan, where the system cross-references detected barangay numbers against the specific range of 165 to 188, ensuring that only verified residents are granted access to the reporting infrastructure.

---

### 3. Mission-Critical State Machines & RA 9184 Compliance
The core of the city's engineering operations is managed by an advanced project state machine that enforces a non-skippable 12-phase lifecycle. Governed by the principles of the Government Procurement Reform Act (RA 9184), the `advance_project_phase` endpoint provides the logic necessary to move an infrastructure request from its initial survey through design, cost estimation, bidding, and construction. Each transition is locked behind a role-based approval gate where the backend validates the actor's credentials against the required clearance for that specific phase. For instance, the system ensures that only a Division Chief can move a project into the design phase and only the City Engineer can issue a final Certificate of Completion. This rigorous implementation provides a complete, audit-ready timeline that tracks every decision from the first citizen report to the final project award.

---

### 4. Geospatial Intelligence & Resource Optimization
Spatial awareness is managed through a secure backend geoproxy architecture that serves as a protective layer for the city’s Google Maps Platform credentials. By isolating API calls to the server-side, PULSO prevents unauthorized access to sensitive billing keys while providing high-resolution geocoding and live routing services to the dispatcher command center. Beyond simple navigation, the geospatial engine performs autonomous incident deduplication using a DBSCAN-based clustering algorithm. This logic identifies individual GPS pulses within a specific radius and merges them into unified "Hotspots," allowing the engineering office to identify high-volume problem areas and prevent the creation of redundant work orders for the same localized hazard. This layer of spatial intelligence is critical for the efficient allocation of heavy machinery and field personnel across the city's geography.

---

### 5. Reactive UI Architecture & The Command Center Experience
The PULSO frontend utilizes a reactive architecture built on React 18, emphasizing a premium "glassmorphism" aesthetic that provides a state-of-the-art decision-making environment for city staff. This experience is enabled by specialized custom hooks, such as `useIncidentTriage`, which decouple the complexity of API synchronization from the visual presentation layer. These hooks manage the real-time state of the dashboard, ensuring that as new reports are triaged by the AI or as project phases are advanced by different departments, the dispatcher’s view is updated instantly without requiring a page refresh. This is supported by a comprehensive error-handling engine that provides immediate visual feedback through a toast notification system, ensuring that city operations remain stable and transparent even during periods of heavy network load.
