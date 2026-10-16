# PULSO Digitized Ticket Lifecycle

The following matrix describes the end-to-end lifecycle states of a report or project ticket, as it is processed by the PULSO ecosystem.

| System Status | Trigger & Action Actionable Event |
| :--- | :--- |
| **Submitted** | A resident uploads a report with GPS coordinates and photos via the mobile app. |
| **AI Processing** | The Gemini 2.5 Flash model analyzes the report image for classification and severity. |
| **AI Verified** | AI triage is complete; the system tags the department and assigns a priority score. |
| **Awaiting Dispatch** | The ticket is queued in the LGU Command Center for a manual review by a dispatcher. |
| **Dispatched** | A work order is formally assigned to a field crew or project engineer in the system. |
| **Preemptive Dispatch** | A proactive assignment is triggered based on high-risk clustering or historical data. |
| **Request Letter Raised** | An engineer creates a digital Procurement Request for materials needed for resolution. |
| **Validated** | The Administrative Officer confirmed budget availability and approved the request. |
| **In Procurement** | The material request is forwarded to the Bids and Awards Committee (BAC) or procurement office. |
| **In-Progress** | Field crews actively perform repairs and log their daily status with site photos. |
| **Milestone Inspections** | A Building Inspector performs scheduled site visits and logs pass/fail flags for resolution. |
| **Resolved** | The Project Engineer marks the physical task as complete and uploads final proof. |
| **Closed (Certified)** | The Assistant City Engineer issues a Certificate of Completion, archiving the ticket records. |
| **Escalated** | An SLA breach is detected (e.g., 48h delay for high-severity reports) triggering alert notifications. |
| **Outside Jurisdiction** | The geospatial engine determines the report is on private property and out of LGU scope. |

---
**PULSO** | *Bridging the Gap Between Citizens and Governance through Digital Excellence.*
