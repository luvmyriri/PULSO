# PULSO Resident Portal & Mobile App: SDLC Specification

| Field | Value |
|---|---|
| Document Title | Resident Experience Software Development Life Cycle (SDLC) |
| System | PULSO Civic Engagement & Infrastructure Intelligence Platform |
| Target Audience | Engineering Leads, Mobile/Web Developers, Product Owners, DevOps |
| Version | 1.0 (Focused Specification) |
| Authority | Caloocan City Digital Transformation & Engineering Operations |

---

## 1. SDLC Methodology & Delivery Paradigm

The PULSO Resident Portal (React Web) and Mobile Client (Flutter Cross-Platform) follow an **Agile Dual-Track Delivery Framework**, balancing continuous resident user discovery with rapid, high-reliability sprint engineering.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DUAL-TRACK RESIDENT SDLC MODEL                     │
├───────────────────────────────────┬─────────────────────────────────────┤
│   TRACK 1: PRODUCT DISCOVERY      │     TRACK 2: SPRINT DELIVERY        │
│   • Barangay Field Interviews     │     • Architecture & Token Binding  │
│   • Usability Testing (390px)     │     • 2-Week Engineering Sprints    │
│   • Accessibility Audits (WCAG)   │     • Automated Build & Test Gates  │
│   • PhilSys & OCR Benchmarking    │     • App Store / TestFlight Deploy │
└───────────────────────────────────┴─────────────────────────────────────┘
```

The resident surface operates under strict citizen-facing SLAs: 99.9% uptime, sub-3-second AI triage response, zero tolerance for unencrypted PII exposure, and complete functional parity between English and Tagalog.

---

## 2. Seven-Phase Lifecycle Workflow

```
[Phase 1: Discovery & Scoping] ──► [Phase 2: UI/UX & Design Tokens] ──► [Phase 3: Sprint Development]
                                                                                │
[Phase 6: Production Launch]  ◄── [Phase 5: Staging & Beta Testing]  ◄── [Phase 4: Verification Gates]
          │
          ▼
[Phase 7: Maintenance & Telemetry]
```

### Phase 1: Resident Discovery & Requirement Formulation
*   **Objective:** Validate real-world civic interaction patterns, mobile device constraints (low-end Android devices, intermittent 3G/4G connectivity), and accessibility requirements.
*   **Key Activities:**
    *   Conduct field sessions with Barangay leaders and residents across District 1, 2, and 3 of Caloocan City.
    *   Formulate testable user stories with explicit Given/When/Then scenarios.
    *   Establish data privacy boundaries adhering to RA 10173 (Data Privacy Act of 2012).
*   **Deliverables:** Approved User Story Catalog, Data Minimization Register, Wireframes.

---

### Phase 2: Design System & Token Integration
*   **Objective:** Construct accessible, responsive, and aesthetically commanding UI interfaces using the **Civic Aperture** design language.
*   **Key Activities:**
    *   Establish unified Figma tokens (Color, Typography, Spacing, Elevation) synchronized with the Flutter and React codebases.
    *   Enforce contrast ratios (>4.5:1 for standard text, >3:1 for graphical controls) in both Light and Dark themes.
    *   Design responsive layouts optimized for small screens (320px, 390px) and desktop viewports.
*   **Deliverables:** Figma UI Kit, Shared CSS/Theme Tokens, Component Storybook.

---

### Phase 3: Sprint Execution & Iterative Development
*   **Objective:** Develop modular, clean-architecture features in structured two-week sprint cycles.
*   **Sprint Cadence:**
    *   *Day 1:* Sprint Planning & Story Point Estimation.
    *   *Days 2–8:* Feature Development & Pair Programming.
    *   *Day 9:* Code Freeze, Sprint Review & Stakeholder Demo.
    *   *Day 10:* Sprint Retrospective & Release Candidate Tagging.
*   **Core Architectural Standards:**
    *   *Mobile App:* Flutter Clean Architecture with Riverpod state management.
    *   *Web App:* React with modular components, Zustand state store, and standard CSS modules.

---

### Phase 4: Multi-Tier Verification Gates
*   **Objective:** Ensure all features satisfy stringent quality, security, and performance standards before entering release pipelines.
*   **Mandatory Verification Gates:**
    1.  **Static Analysis:** Lint zero-warning enforcement on all modified PR files.
    2.  **Unit & Widget Testing:** Minimum 85% branch coverage for business logic and data providers.
    3.  **End-to-End Flow Validation:** Automated tests validating registration, ID OCR parsing, GPS tagging, and report submission.
    4.  **Network Resilience Simulation:** Verifying offline drafting and automatic sync under simulated 2G/3G network conditions.
    5.  **Accessibility Compliance:** Automated axe-core audits and screen reader validation (TalkBack / VoiceOver).

---

### Phase 5: Staging & Resident Closed Beta
*   **Objective:** Deploy release candidates to a controlled pilot environment for real-world validation.
*   **Key Activities:**
    *   Deploy web builds to isolated Staging environment (`staging.pulso.caloocan.gov.ph`).
    *   Distribute mobile builds via Google Play Internal App Sharing and Apple TestFlight.
    *   Execute a 14-day closed beta test with 100 verified residents from pilot barangays.
*   **Sign-off Criteria:** Zero P0/P1 open issues, 95% task completion rate on ID onboarding and issue reporting.

---

### Phase 6: Production Deployment & Staged Rollout
*   **Objective:** Seamless, zero-downtime production deployment across web and mobile platforms.
*   **Deployment Architecture:**
    *   *Web Deployment:* Blue/Green deployment on containerized cloud infrastructure with instantaneous rollback capability.
    *   *Mobile App Store Deployment:* Phased staged rollout on Google Play (10% -> 25% -> 50% -> 100%) and App Store phased release over 7 days.
*   **Production Smoke Test:** Immediate verification of critical paths (User Login, Map Pinning, Push Notifications, Photo Upload).

---

### Phase 7: Post-Launch Telemetry & Continuous Maintenance
*   **Objective:** Proactively monitor application performance, crash rates, and citizen satisfaction.
*   **Operational Metrics:**
    *   *Crash-Free Session Rate:* >99.5% across all active mobile installations.
    *   *API P95 Latency:* <250ms for report feeds, <4.0s for Gemini AI vision triage.
    *   *Resident CSAT Rating:* Target >4.2 / 5.0 stars on post-resolution surveys.
    *   *Patch Management:* Weekly scheduled patch releases for minor fixes; 4-hour SLA for critical security hotfixes.

---

## 3. Branching Strategy & Release Governance

The repository follows an optimized **GitFlow Workflow** tailored for multi-client deployment:

```
[main] ──────────────────────────● (Production v1.0.0) ──● (v1.0.1)
  │                                ▲                       ▲
  │                                │                       │
[release/v1.0] ────────────────────┴───────────────────────┘
  │                                ▲
  │                                │
[develop] ──────●────────●─────────┴─ (Sprint Integration)
  │             ▲        ▲
  ├──[feature/id-ocr]    │
  └──[feature/offline-sync]
```

### Branch Taxonomy

*   `main`: Always represents production-ready, signed release code. Direct commits are strictly prohibited.
*   `develop`: The primary integration branch for ongoing sprint deliverables. Nightly staging builds trigger automatically from `develop`.
*   `feature/RES-<ID>-<name>`: Isolated feature branches created from `develop`. Must pass all CI checks before merge via Pull Request.
*   `release/vX.Y.Z`: Staging candidate branches for final regression testing, metadata compilation, and store submission.
*   `hotfix/RES-<ID>-<name>`: Emergency branches branched directly from `main` to address critical production defects.

---

## 4. Governance: Definition of Ready (DoR) & Definition of Done (DoD)

### Definition of Ready (DoR)
A user story can only be brought into an active sprint when:
1. The story is written in standard user narrative format with clear business rationale.
2. Complete functional and UI acceptance criteria are defined and signed off by the Product Owner.
3. Figma designs exist for both Mobile (390px) and Desktop (1440px) in Light and Dark themes.
4. All required backend API schemas and contracts are documented and agreed upon.
5. All sensitive data fields are mapped to security and privacy policies.

### Definition of Done (DoD)
A story is considered complete and deployable only when:
1. Code compiles without errors or lint warnings on Flutter, Web, and Backend pipelines.
2. 100% of acceptance criteria have been verified through automated or manual tests.
3. Unit and integration tests pass with required coverage.
4. Filipino and English localization strings are complete with zero hardcoded text strings.
5. Code review has been approved by at least two senior peer engineers.
6. The feature has been demonstrated and formally accepted in the Sprint Review.
