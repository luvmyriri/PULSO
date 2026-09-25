# PULSO Platform — Atomic Data Flow Diagrams

This document contains the codebase-specific Data Flow Diagrams (DFDs) for the PULSO platform. These diagrams map the explicit business logic loops running inside the backend engines (e.g., `fqa_engine.py`, `predictive_engine.py`, `gov_crud.py`) using classical DFD visual constraints (green entities/processes, open-air data stores).

---

```mermaid
graph LR
    %% 0-LEVEL
    classDef entity fill:#008000,color:#ffffff,stroke:none;
    classDef process fill:#008000,color:#ffffff,stroke:none;
    
    C["Citizen User"]:::entity
    P(("PULSO Regulatory<br/>System")):::process
    A["Field Agent"]:::entity
    O["LGU Officer"]:::entity
    S["PNPKI Gov Service"]:::entity

    C -->|"IncidentReportPacket"| P
    P -->|"Status/Notification"| C

    P -->|"WorkOrder Dispatch"| A
    A -->|"WorkOrder Update"| P

    O -->|"ProcurementRequest"| P
    P -->|"Signed SystemDocument"| S
    S -->|"Signature Validation"| P
    P -->|"Audit Log Feedback"| O

    linkStyle default stroke:#000000,stroke-width:2px,color:#008000;
```
<center><h2 style="color:#008000; font-family:sans-serif;">0-LEVEL DFD</h2></center>

---

<br/><br/>

```mermaid
graph TD
    %% 1-LEVEL
    classDef entity fill:#008000,color:#ffffff,stroke:none;
    classDef process fill:#008000,color:#ffffff,stroke:none;
    classDef store font-weight:bold,color:#008000,stroke:none,fill:none;

    C["Citizen User"]:::entity
    A["Field Agent"]:::entity
    O["LGU Officer"]:::entity

    P1(("Incident Intake<br/>Router")):::process
    P2(("Procurement &<br/>RA 9184 Gate")):::process
    P3(("Engineering<br/>Dispatch Loop")):::process
    P4(("Predictive<br/>Maintenance Engine")):::process

    S1["incident_reports<br/>↑↓"]:::store
    S2["procurement_requests<br/>↑↓"]:::store
    S3["work_orders<br/>↑↓"]:::store
    S4["infrastructure_assets<br/>↑↓"]:::store

    C -->|"Raw JSON Packet"| P1
    P1 -->|"Triage Score"| P2
    
    P1 --> S1
    S1 --> P1
    
    P2 -->|"Active Project"| P3
    P2 --> S2
    S2 --> P2
    
    P2 -->|"Approve Logic"| O
    O -->|"Approval Return"| P2

    P3 -->|"Assign Target"| A
    A -->|"Evidence Media"| P3
    P3 --> S3
    S3 --> P3
    
    P3 -->|"Completed Phase"| P4
    P4 --> S4
    S4 --> P4

    linkStyle default stroke:#000000,stroke-width:2px,color:#008000;
```
<center><h2 style="color:#008000; font-family:sans-serif;">1-LEVEL DFD</h2></center>

---

<br/><br/>

```mermaid
graph TD
    %% 2-LEVEL
    classDef entity fill:#008000,color:#ffffff,stroke:none;
    classDef process fill:#008000,color:#ffffff,stroke:none;
    classDef store font-weight:bold,color:#008000,stroke:none,fill:none;

    P2(("Advance Project<br/>Phase")):::process
    O["LGU Officer"]:::entity
    A["Field Agent"]:::entity
    
    PR1(("Evaluate RA 9184<br/>Bracket")):::process
    PR2(("SystemDocument<br/>Hash Validation")):::process
    PR3(("create_work_order")):::process
    PR4(("Proximity<br/>Auto-Suggest")):::process
    PR5(("update_work_order<br/>_status")):::process

    S1["project_requests<br/>↑↓"]:::store
    S2["system_documents<br/>↑↓"]:::store
    S3["agent_locations<br/>↑↓"]:::store
    S4["work_orders<br/>↑↓"]:::store

    O -->|"Trigger Phase"| P2
    P2 -->|"Init Check"| PR1
    PR1 --> S1
    S1 --> PR1
    
    PR1 -->|"Route Fast-Track"| PR2
    PR2 --> S2
    S2 --> PR2
    
    PR2 -->|"Integrity Passed"| PR3
    PR3 -->|"Locate Field"| PR4
    PR4 --> S3
    S3 --> PR4
    
    PR4 -->|"Dispatch UUID"| A
    A -->|"Return Action"| PR5
    PR5 --> S4
    S4 --> PR5

    linkStyle default stroke:#000000,stroke-width:2px,color:#008000;
```
<center><h2 style="color:#008000; font-family:sans-serif;">2-LEVEL DFD</h2></center>

---

<br/><br/>

```mermaid
graph TD
    %% 3-LEVEL
    classDef process fill:#008000,color:#ffffff,stroke:none;
    classDef store font-weight:bold,color:#008000,stroke:none,fill:none;

    PR3(("execute_fqa")):::process
    PRE(("calculate_ahs_score")):::process
    
    F1(("L1: validate_structural<br/>_integrity")):::process
    F2(("L2: scan_citizen<br/>_disputes")):::process
    F3(("L3: verify_npki<br/>_signatures")):::process
    F4(("migrate_to_<br/>infrastructure_asset")):::process
    
    P1(("calculate_fvf<br/>_score")):::process

    S1["project_requests<br/>(qa_rejection_count)"]:::store
    S2["environmental_context<br/>(flood_risk_level)"]:::store
    S3["infrastructure_assets<br/>↑↓"]:::store
    S4["system_documents<br/>(Audit Evidence)"]:::store

    PR3 -->|"Start Gate"| F1
    F1 -->|"Audit Failure"| S1
    S1 --> F1
    
    F1 -->|"Material Pass"| F2
    F2 -->|"Clear"| F3
    F3 -->|"RA 9470 True"| F4
    F4 -->|"Update Registry"| S3
    
    S3 -->|"Asset Context"| PRE
    S1 -->|"Audit Penalties"| PRE
    S2 -->|"Risk Penalties"| PRE
    
    PRE -->|"AHS Result"| S3
    S4 -->|"UI Linkage"| S3
    
    S3 --> P1
    P1 -->|"FVF Prediction"| S3

    linkStyle default stroke:#000000,stroke-width:2px,color:#008000;
```
<center><h2 style="color:#008000; font-family:sans-serif;">3-LEVEL DFD</h2></center>

---

## Technical Data Dictionary Alignment
This DFD maps directly to the physical Python files implemented in the backend. 
- **Levels 1 and 2** map heavily to `gov_crud.py` and `document_router.py`.
- **Level 3** outlines the exact logical loop executed within the isolated `fqa_engine.py` (Final Quality Audit triple-layer check) and the math models inside `predictive_engine.py` (AHS/FVF scores).
- All **Data Stores** listed are literal SQLAlchemy table configurations inside PostgreSQL.
