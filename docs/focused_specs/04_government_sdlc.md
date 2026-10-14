# PULSO Government Command Center: SDLC Specification

| Field | Value |
|---|---|
| Document Title | Government Operations Software Development Life Cycle (SDLC) |
| System | PULSO Civic Engagement & Infrastructure Intelligence Platform |
| Target Audience | Enterprise Solution Architects, Backend/DevOps Leads, LGU Project Managers |
| Version | 1.0 (Focused Specification) |
| Authority | City Engineering Office & Information Technology Department, Caloocan City |

---

## 1. Enterprise SDLC Governance Paradigm

The PULSO Government Command Center and Operations Suite follow a **Stage-Gate Agile Engineering Framework**. This model couples iterative sprint cycles with rigorous formal stage-gate approvals required for public sector compliance, statutory auditability (COA rules), and data privacy (RA 10173).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   ENTERPRISE STAGE-GATE SDLC GOVERNANCE                 │
├───────────────────────────────────┬─────────────────────────────────────┤
│   STAGE-GATE AUDIT MILESTONES     │     AGILE INCREMENTAL CYCLES        │
│   • Gate 1: Statutory Compliance  │     • 2-Week Backend/FE Sprints     │
│   • Gate 2: RBAC & Security Audit │     • Continuous Integration (CI)   │
│   • Gate 3: Dept. Head UAT Signoff│     • Weekly Staging Demos          │
│   • Gate 4: Production Commission │     • Automated Migration Scripts   │
└───────────────────────────────────┴─────────────────────────────────────┘
```

The government platform operates under high-assurance reliability standards: 99.95% command center availability, zero data loss, strict role-based access control (RBAC), and tamper-evident audit logging for every administrative and financial transaction.

---

## 2. Seven-Phase Lifecycle Workflow

```
[Phase 1: Statutory Alignment] ──► [Phase 2: Domain & State Machines] ──► [Phase 3: Core Sprint Build]
                                                                                   │
[Phase 6: Gov-Cloud Commission] ◄── [Phase 5: Departmental UAT] ◄── [Phase 4: Security & RBAC Gates]
          │
          ▼
[Phase 7: SLA & Archival Governance]
```

### Phase 1: Statutory Alignment & Regulatory Mapping
*   **Objective:** Align system logic with Philippine statutory standards governing local government operations.
*   **Key Statutory Mandates Enforced:**
    *   *RA 9184 (Government Procurement Reform Act):* Governing requisition letters, BAC bidding stages, and purchase authorizations.
    *   *RA 10173 (Data Privacy Act of 2012):* Segregating resident PII from public-facing government analytics.
    *   *COA (Commission on Audit) Guidelines:* Immutable logging of financial approvals and asset lifecycle events.
*   **Deliverables:** Statutory Compliance Matrix, Functional Architecture Specification.

---

### Phase 2: Domain Modeling & Canonical State Machines
*   **Objective:** Define unambiguous, backend-authoritative state machines and data models for all municipal entities.
*   **Key State Machines Formalized:**
    1.  **Incident Ticket Lifecycle:** `Submitted` -> `AI Verified` -> `Assigned` -> `Dispatched` -> `In Progress` -> `Resolved` -> `Closed`.
    2.  **13-Phase Infrastructure Project Engine:** Linear progression from `Project Request` to `Certificate of Completion` with strict milestone transition guards.
    3.  **Procurement Lifecycle:** `Requisition Drafted` -> `Budget Certified` -> `BAC Processing` -> `Delivered`.
*   **Deliverables:** Database Entity-Relationship Diagrams (ERD), OpenAPI 3.1 Swagger Contracts.

---

### Phase 3: Enterprise Sprint Engineering & Modular Services
*   **Objective:** Implement decoupled backend services and responsive desktop dashboards in structured 2-week iterations.
*   **Architecture Stack:**
    *   *Backend:* Python FastAPI with async route execution, SQLAlchemy ORM, and Pydantic schema validation.
    *   *Frontend:* React with role-aware routed shells, Vite build tooling, and Tailwind/Vanilla CSS styling.
    *   *Geospatial Engine:* PostGIS / BallTree spatial indexing with DBSCAN clustering for density analysis.
    *   *AI Service:* Google Gemini 2.5 Flash API for automated multimodal incident triage.

---

### Phase 4: Security, Access Control & Quality Gates
*   **Objective:** Validate that every endpoint, UI affordance, and database operation strictly adheres to the enterprise authorization model.
*   **Mandatory Quality Gates:**
    1.  **Role-Based Access Control (RBAC) Verification:** Enforcing capability checks on all 154 API operations; zero UI exposure of unauthorized actions.
    2.  **SQL Transaction Integrity:** Ensuring atomic database writes for procurement, work order assignments, and milestone sign-offs.
    3.  **Tamper-Proof Audit Logging:** Verifying that all status modifications record the actor ID, timestamp, prior state, and justification.
    4.  **Static & Dynamic Vulnerability Scanning:** Zero high or critical vulnerabilities on OWASP Top 10 security audits.

---

### Phase 5: Departmental UAT & Operational Simulation
*   **Objective:** Execute realistic operational simulation exercises with the City Engineering Office staff.
*   **Key Activities:**
    *   Deploy candidate build to isolated LGU Staging Environment (`lgu-staging.pulso.caloocan.gov.ph`).
    *   Conduct end-to-end simulations involving: Intake Clerk triage -> Dispatcher work order creation -> Field Engineer mobile check-in -> Estimator BoQ creation -> City Engineer sign-off.
    *   Validate printed executive PDF outputs (Certificates of Completion, BoQ sheets, Procurement Letters).
*   **Sign-off Gate:** Formal UAT sign-off document executed by the City Engineer and Administrative Officer V.

---

### Phase 6: Production Commissioning & Gov-Cloud Deployment
*   **Objective:** Commission the platform onto secure government-grade cloud or municipal on-premises infrastructure.
*   **Infrastructure Configuration:**
    *   *Compute:* Containerized Docker/Kubernetes cluster with automatic horizontal pod autoscaling.
    *   *Database:* Managed MySQL Enterprise cluster with master-replica replication and point-in-time recovery.
    *   *Security:* Cloudflare WAF, TLS 1.3 encryption in transit, AES-256 encryption at rest.
    *   *Deployment Protocol:* Zero-downtime rolling deployment with automated health check probes.

---

### Phase 7: SLA Governance & Continuous Archival Operations
*   **Objective:** Ensure uninterrupted operational readiness, adherence to incident SLAs, and long-term document retention.
*   **Operational Governance:**
    *   *Automated SLA Escalation:* Auto-escalating tickets exceeding 48 hours without assignment to the Division Chief.
    *   *Disaster Recovery & Backup:* Daily automated full database snapshots; hourly WAL backups replicated to an offsite secure storage bucket.
    *   *Document Archiving:* Automated archiving of closed project records, CAD drawings, and inspection permits in compliance with the National Archives Act.

---

## 3. Branching, Promotion & Release Governance

```
[main] ──────────────────────────● (Production v1.0.0) ──● (v1.0.1)
  │                                ▲
  │                                │ (Gate 4: Production Commission)
[release/gov-v1.0] ────────────────┴─────────────────────
  │                                ▲
  │                                │ (Gate 3: Department UAT)
[develop] ──────●────────●─────────┴─────────────────────
  │             ▲        ▲
  ├──[feature/boq-module]│
  └──[feature/obo-permit]
```

### Promotion Governance

1.  **PR to `develop`:** Requires passing automated CI suite (linting, 100% unit tests) and 2 Senior Engineer approvals.
2.  **Promotion to `release/*`:** Requires deployment to Staging, completed security scan, and successful internal integration testing.
3.  **Promotion to `main`:** Requires formal signed UAT approval from the City Engineering Office leadership and completed production smoke test.

---

## 4. Definition of Ready (DoR) & Definition of Done (DoD)

### Definition of Ready (DoR)
1. User story maps directly to an approved LGU Plantilla Role and organizational capability.
2. Complete input/output schemas and statutory requirements (e.g., RA 9184 requirements) are documented.
3. Desktop UI mockups (1440px) and tablet responsive designs exist with verified accessibility.
4. Database migration scripts and audit trail impacts are fully mapped out.

### Definition of Done (DoD)
1. Complete implementation of backend API and frontend views matching the approved capability contract.
2. Zero unauthorized access vulnerability paths across any system role.
3. All state transitions trigger corresponding immutable audit records.
4. Automated integration tests pass with 100% success rate on CI pipelines.
5. Formal demo and acceptance sign-off by the relevant Division Chief or City Engineer.
