# 37 — Government role and process baseline

**Status:** User-directed implementation baseline for the current PULSO pilot; municipal signing and delegation authority still requires confirmation by the City Engineer and the LGU's designated operations, records, privacy, and security owners. **Validated:** 28 October 2026. **Scope:** Government web and API. This document records implemented defaults and their decision dependencies; it does not certify statutory authority.

## Priority order

1. **Protect decisions:** Separate staff intake, engineering verification, field-work approval, independent completion review, publication, and platform administration.
2. **Make ownership real:** Every assignment has one current owner, eligibility and district checks, a reason, an actor, a timestamp, a version check, and an audit event. My Work follows the recorded owner.
3. **Keep modules distinct:** Reports owns intake and report decisions; My Work projects each employee's tasks; Work Orders owns field execution; Projects coordinates larger work; Records retains evidence and decisions; Updates owns public communication; Administration controls accounts and settings.
4. **Reconcile every remaining legacy route:** UI visibility, server actions, exports, documents, PII, and jurisdiction must use the same capability and record scope.

## Implemented role defaults

Explicit `SystemRole.capabilities` entries override the listed module defaults where that module supports them. An explicit technical delegation must name the consequential action; a generic platform role is insufficient. An inactive or suspended account cannot make a report-review decision. Record scope and current state further limit each action.

| Staff role | Report intake and decisions | Other primary processes | Boundary |
| --- | --- | --- | --- |
| Administrative Clerk | Assigned intake, resident information request, peer-clerk transfer, handoff to a City Engineer or Assistant City Engineer | OBO intake, announcement drafting, project view | No severity grade, report verification, field-work approval, or project management by default |
| Administrative Officer | Manual report-review assignment and reassignment | Administrative records, project coordination, announcement drafting, referrals | No engineering assessment or verification by default |
| Dispatcher | Automatic review pool, manual review assignment, triage, priority, rejection, engineering handoff, field-work approval and dispatch | Work-order coordination and project coordination | Cannot publish report verification by default; field work remains a separate assignment |
| Project Engineer | Automatic review pool, assigned preliminary assessment, priority, engineering handoff | Project ownership/coordination, work-order dispatch and progress | Cannot publish report verification by default without an explicit `verify` grant |
| City Engineer / Assistant City Engineer | Engineering assessment and report verification, manual ownership, field-work approval | Project decisions, independent inspection, certificate recording, publication review under the relevant module policy | Verification checks public incident content and is recorded before field work |
| Operations Manager | Manual ownership, triage, priority, rejection, field-work approval | Dispatch, project coordination and management review | Management does not substitute for engineering public verification by default |
| Division Chief and named architectural, structural, electrical variants | Manual review ownership and preliminary review | Project coordination, technical work and specialty permit authority | Specialty variants inherit the division-chief family without losing their stored specialty role; report verification still needs explicit delegation |
| Building, Electrical, Mechanical Inspector | Report view; assigned report review only by explicit delegation | OBO/technical inspections and independent work completion review | The executor cannot accept their own completion; ordinary inspection permission does not verify a resident report for publication |
| Design Engineer / CAD Operator / Estimator | Report view within scope | Design evidence, drawings, estimates and project records according to their respective module grants | No report assignment or engineering release by default |
| Construction Foreman / Field Worker | Linked report context for own work | Assigned work orders, progress, blockers and completion evidence | Cannot assign, independently approve, or close unrelated work |
| Records Officer | Report context for records work | Document registry, retention and certificate recording where specifically granted | Records access does not imply report, project or publication decisions |
| System Administrator | Report and project read access for support | Staff accounts, configuration, audit, and preparing public-update drafts for authorized review | No report assignment, technical verification, field dispatch, project management, inspection acceptance, publication approval or publishing, analytics export, report-detail analytics or procurement management by default; explicit domain delegation is required where supported |

Residents retain their separate reporting, tracking, consent, and response permissions. No staff role changes a resident's ownership of the source report.

## Report process and two assignment methods

1. A resident submits a report. AI category and urgency are **advisory**; they do not verify the report or assign field work.
2. If automatic routing is enabled, the system selects an active eligible reviewer in the recorded district with the fewest open intake reviews; staff ID is the deterministic tie-breaker. The current default pool is Dispatchers and Project Engineers, plus explicitly delegated reviewers. This is **not random**. If location or eligibility is insufficient, the report remains unassigned for a coordinator. A citywide coordinator can confirm a missing routing barangay from the recorded address, pin and evidence, with a reason and audit event; a district-scoped employee cannot view an unlocated report until its scope is established. This routing decision does not verify the public incident location.
3. A permitted coordinator can manually assign or reassign to an eligible active clerk or reviewer with a mandatory reason after a routing barangay is known. The previous owner, new owner, actor, time, reason and assignment mode are retained.
   A coordinator with report assignment permission can also choose **Take it** on an intake or approval report to become its review owner. Taking a report from another employee requires a reason and transfers the current My Work item; taking an unassigned report records a standard self-assignment reason. The same district, version, and audit rules apply. This does not grant technical verification permission to a coordinator whose role lacks it.
4. A clerk works their own intake in My Work, requests missing information when needed, transfers only to another eligible clerk, or submits findings to an eligible City Engineer or Assistant City Engineer. A preliminary reviewer without default verification authority has the same engineering handoff path.
5. An authorized engineer assesses severity and verifies report details for public release. Verification moves the report to field-work approval. A separate authorized actor approves it and creates/assigns a work order where needed.
6. Assigned field employees document progress and completion. Independent verification accepts or returns the work. Report resolution is an explicit decision; completing a work order or project does not silently close the report.
7. A project may link several reports without replacing their source records. Records, external referrals, public updates and audit events retain their distinct ownership and disclosure rules.

`My Work` shows current assigned review or field work, waiting decisions, and recent closed reports for the recorded review owner. It opens the same report docket used in Reports, with the same server-authorized actions, directly in the employee's queue. Unassigned and unavailable-owner report routing remains in Reports rather than appearing as personal work. A closed report with no recorded review owner cannot be presented as somebody's assigned task. Reassignment transfers the active review owner; it does not erase previous work or history.

## Current implementation limits requiring named decisions

- **LGU authority:** Confirm which exact positions may verify a resident report, reject it, approve field work, accept independent completion, sign a certificate, publish an update, and approve an external referral. The defaults above are a pilot policy, not a legal delegation.
- **Geography:** The current local staff accounts have no configured district scope. The helper treats this as unrestricted; the operations owner must assign real districts or explicitly approve citywide accounts before production.
- **Legacy capabilities:** Some older APIs still use static role groups or a records/admin support bypass. Analytics export, report-detail analytics and procurement management no longer inherit that bypass. Finish a route-by-route reconciliation before claiming one universal permission authority, especially for document mutation, PII, OBO and procurement reference actions.
- **Routing:** Automatic review uses district and open-count only. Availability, specialization, working hours and workload limits are not yet recorded policy inputs. Do not describe the current algorithm as covering them.
- **Records:** Stored `records:archive` flags and the current Records workspace `records:manage` check are not synonymous. The records owner must confirm the archival action contract and legal-hold requirements.
- **Sample accounts:** The local database contains active test-named staff accounts. Review and remove or disable them in the appropriate environment before a production access certification.

## Acceptance evidence

- Role-family tests must show specialty division chiefs can access their inherited report/project functions while retaining specialty identity in audit records.
- Clerk and platform-admin tests must show read access where needed and server denial for unowned or unauthorized decisions.
- A report assigned to a clerk or preliminary reviewer must appear in that account's My Work, move to the engineer on handoff, and preserve assignment history.
- Invalid district, inactive assignee, stale version, duplicate action, closed report, absent engineer, and self-verification cases must fail without a partial mutation.
- Navigation and action menus must reflect the same server permissions; denied deep links must explain the permission state.

No visual direction or Figma artifact changed in this operational pass. The next design action is to reconcile role-aware action states in the existing government Reports, My Work, and Projects templates after the LGU confirms signing and delegation policy.
