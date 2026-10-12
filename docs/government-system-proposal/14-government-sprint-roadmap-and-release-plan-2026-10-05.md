# Government delivery roadmap and sprint plan

**Status:** Proposed planning artifact; no implementation or LGU policy approval implied. **Version:** 0.1. **Prepared:** 5 October 2026. **Audience:** City Engineering decision owners, product, design, engineering, QA, security/privacy, records, GIS, and release support. **Owner to nominate:** Government product/service owner. **Scope:** Government web experience and the shared case services it needs. Product code, Figma, migrations, deployments, provider setup, and messages are outside this documentation phase.

## 1. What this plan decides

Plan a **limited report-to-work pilot first**, then expand one governed domain at a time. A completed government portal means staff can finish authorized jobs with durable records, truthful resident-facing outcomes, accessible interfaces, and a rehearsed operating and recovery process. A collection of polished pages is not the release criterion.

The sprint sequence below is a **relative plan**, not a delivery promise. Assume two-week sprints, two engineers, shared design/QA/product support, part-time data/GIS support, and weekly LGU decision access, matching the capacity assumption in [delivery plan 07](07-delivery-plan-agent-work-packages-and-acceptance.md). Re-estimate after Sprint 0 using actual availability, data quality, procurement lead times, and defect volume. The older calendar dates in [plan 09](09-reconciled-government-implementation-plan.md) are historical proposal dates and are not adopted here.

Government documentation and contract work can proceed while the approved product priority remains the resident website. Government implementation begins only when separately requested and the relevant policy/design/API gates are Ready.

## 2. Authority and source status

| Source | What it can authorize here |
|---|---|
| [PRODUCT.md](../../PRODUCT.md) and [Civic Aperture](../ui-ux-audit/09-visual-art-direction-v2.md) | Approved product principles, truth, privacy, accessibility, and visual direction. |
| [Figma working handoff](../ui-ux-audit/10-figma-production-handoff.md) and [component inventory](../ui-ux-audit/11-figma-component-inventory.md) | Current visual planning references with documented binding, typography, and sample-data limits; live inspection is required before visual decisions. |
| [Government user stories](../ui-ux-audit/13-government-user-stories-and-sdlc.md), [cross-system contract](../ui-ux-audit/14-end-to-end-system-lifecycle-and-api-contract.md), and [implementation blueprint](../ui-ux-audit/22-government-implementation-blueprint-v1.0.md) | Detailed **proposals** and observed risk register, not approved lifecycle, permission, or release policy. |
| [Government proposal 01–10](README.md), [priority/SLA/spatial plan 11](11-priority-sla-documents-spatial-ml-plan-2026-09-29.md), [referrals/documents/publications plan 12](12-government-referrals-documents-and-publications-2026-09-29.md), and [SMS decision plan 13](13-semaphore-sms-decision-and-release-gates-2026-09-29.md) | Research and proposed implementation inputs. Documents 11–13 and the current README edits are local, uncommitted work at the time of this plan; do not assume they are on the remote branch. |
| Source code and runtime | Observed behavior only. Recheck against the target implementation branch before turning any historical defect into a ticket or claiming it fixed. |

The remote `Latest-pulso-resident` branch was at `4141c289` when this plan began. The local documentation checkout was on `Finals-refractor-92526` at `a69c8271` with unrelated uncommitted changes. These are provenance markers, not release baselines; Sprint 0 must select and record an integrated government baseline.

## 3. Pilot boundary and release layers

**Pilot journey (proposed):** secure staff access → scoped My Work/report queue → engineering docket with true-color evidence and location/list alternative → verify or request information → eligible team assignment → work order → field evidence and blockers → independent inspection/rework or acceptance → case decision → resident-safe projection and actual notification outcome → immutable activity/audit reconciliation.

**Pilot-included foundations:** backend-authoritative capabilities, jurisdiction and field scope; canonical IDs, versions and permitted transitions; secure evidence/document retrieval; audit and transactional outbox; real loading/empty/error/unknown states; privacy-safe telemetry; migration/restore/rollback proof. A role-aware Today view may summarize this pilot work only when its counts reconcile to source records.

**Outside the first pilot:** citywide asset import, predictive risk scores, general AI decisioning, social publishing, bulk SMS, interdepartmental referral automation, generated certificates, full project/procurement/OBO workflows, and emergency access. Their policy and source-data discovery may run earlier. Any existing route that remains enabled during the pilot must still meet its security and truth gates, or be explicitly disabled with an approved user path.

### Release layers

| Layer | Scope | Release decision |
|---|---|---|
| A — Staff pilot | One nominated service/team and bounded geography, real report-to-work journey, manual fallbacks | Operational owner accepts actual end-to-end records and support coverage. |
| B — Controlled communications and records | Versioned documents, email referrals, public notices, channel delivery evidence | Records, privacy, signatory, publisher, and IT owners approve exact document/channel classes. |
| C — Domain expansion | Assets/GIS, projects, technical planning, procurement/OBO, analytics | Each domain has its own state, financial, evidence, authorization, and UAT gate. |
| D — Evaluated assistance | AI drafts/classification and predictive maintenance in shadow mode, then limited assistance | Measured local evaluation, human review, privacy, model monitoring, and kill switch pass. |

## 4. Relative sprint sequence

Each sprint has one integrated outcome. Work can be split into smaller slices or extended after sizing; the exit evidence must not be diluted to protect a date.

| Sprint | Outcome and work | Exit evidence | Blocking decision/dependency |
|---|---|---|---|
| **S0 — Truth and pilot charter** | Nominate owners; inspect latest code/runtime; map 20–30 representative cases; inventory routes, controls, data, P0/P1 defects, and service/field practices; choose pilot cohort and baseline measures. | Signed observed-versus-proposed map, decision register, defect triage, pilot charter, representative accounts/data, source-branch SHA. | LGU process owner and test-data access. |
| **S1 — Contract and design baseline** | Approve pilot report/work-order transitions, capabilities, PII/evidence rules, resident projection, error/idempotency/version/outbox API; reconcile Figma variables/components and annotate queue/docket/work states. | Versioned contract, fixtures, traceability, light/dark and responsive Figma handoff, executable acceptance list. | S0 decisions; live Figma inspection; design and API review. |
| **S2 — Trust foundation** | Future implementation: active-session/revocation checks, scoped capabilities, safe file access, canonical ID/version migration, append-only event and outbox patterns, structured errors. | Anonymous/resident/cross-scope negative tests; clean/upgrade migration and rollback; audit/outbox atomicity and replay tests. | Approved identity, records, retention, data migration and capability rules. |
| **S3 — Intake and triage** | Future implementation: role-aware shell/My Work, scoped report queue and docket, evidence provenance, map/list, duplicate/location review, explicit triage commands, preserved filters/selection. | Staff completes intake, information request, duplicate/outside-scope and location-uncertain paths; failed fetch never appears empty; keyboard and narrow/zoom checks pass. | S2 services; approved report lifecycle, jurisdiction and eligible-action API. |
| **S4 — Physical work and verification** | Future implementation: eligible assignment, one canonical work-order service, field update/blocker/evidence, independent inspection, rework/acceptance, governed case close. | One durable case→work→proof→inspection→decision chain; no executor self-certification or proofless close; offline/conflict/retry scenarios pass. | S3; approved work-order lifecycle, sign-off/evidence and field policy. |
| **S5 — Resident projection and operational view** | Future implementation: resident-safe status/events, next-owner updates, outbox delivery truth, role-aware Today sourced from pilot records, correction/reopen path. | Resident and staff see compatible lifecycle meaning; notification accepted/failed/unknown is honest; Today counts reconcile with source; no private data leak. | S4; approved language, notification, source freshness and disclosure rules. |
| **S6 — Pilot assurance and release rehearsal** | Integrated adversarial, accessibility, low-network, UAT, migration/restore, support, monitoring, rollback and training rehearsal; resolve all in-scope P0/P1. | Signed go/no-go packet and limited rollout plan; full golden journey and rollback evidence; no automatic no-go condition. | S2–S5 complete, representative staff, release/support owner. |
| **S7+ — Records, documents and referrals** | One approved document class at a time; versioned template/packet, authorized signer, accessible export, legal hold, monitored official-email referral and follow-up. | Issued artifact/hash/signature status, correction/withdrawal, secure download; referral send is distinct from recipient acknowledgment. | Records/signatory/DPO/official-directory decisions. Re-estimate as multiple sprints. |
| **S8+ — Publishing and channel delivery** | Canonical public notice, technical/publishing review, bilingual content, schedule/correction, per-channel actual delivery; SMS only after security/provider gates. | No fabricated audience/delivery counts; changed source work blocks stale publication; approved web page remains accessible without image/social. | Publisher, privacy, channel, cost and consent decisions. Re-estimate as multiple sprints. |
| **S9+ — Assets and geography** | One physical asset class, approved boundaries, PostGIS staging/validation, condition as unknown until inspected, maintenance history and staff-confirmed links. | Spatial reconciliation, invalid/near-border review queue, query plans, public location privacy test. | GIS/data steward, source/license, boundary/asset approval. Re-estimate. |
| **S10+ — Projects and technical work** | One canonical project advancement service; design/survey/version gates; link to work, documents, inspections and resident-safe updates. | No skipped phase or arbitrary status edit; approved artifacts and correction paths; role UAT. | Decide ten- versus thirteen-stage project model and technical signatories. Re-estimate. |
| **S11+ — Finance, procurement and OBO** | Separate bounded slices for BoQ/ObR/cash/BAC/NTP, OBO inspection/review/payment/appeal; explicit segregation and thresholds. | Monetary and permit adversarial suite, audit, document and rollback proof for each slice. | Finance/BAC/OBO owners, current policy and legal review. Re-estimate; do not bundle into one sprint. |
| **S12+ — Analytics and evaluated assistance** | Metric catalog with lineage/freshness/table access; AI evaluation and safe fallback; predictive pilot only after asset/inspection outcomes support it. | Counts reconcile; no random/mock operational claims; shadow-mode comparison and human-review evidence. | Data/model/privacy owners, labeled local data, approved target and success criteria. Re-estimate. |
| **Finalization wave** | Cross-domain contract and migration sweep; end-to-end UAT, security/privacy, accessibility, bilingual resident projection, performance, disaster recovery, support and release operations. | Signed release packet per enabled capability, zero P0/P1, restore and rollback rehearsal, monitoring/runbooks/training, known limitations disclosed. | Every enabled domain gate and operational owner. |

S0–S6 are the **candidate pilot train**, not a guarantee of seven sprints. S7 onward are ordered capability waves, not pre-sized sprint commitments. The 12–16 week pilot range in document 07 remains indicative and must be revised after S0.

## 5. Critical path and decision ledger

Record every decision with owner, approvers, status, evidence, affected stories/API/Figma, and date. “TBD” means blocked for implementation, not permission to adopt the proposed default.

| Gate | Required choice | Proposed accountable owner | Required before |
|---|---|---|---|
| GOV-D01 | Government IA, route migration, and 72 px rail versus expanded navigation after staff testing | Government product + design owner | Shell freeze in S1/S3 |
| GOV-D02 | Subject/session/revocation, capabilities, jurisdiction, assignment, field/query/export and delegation | City Engineer delegate + security/privacy | S2 |
| GOV-D03 | Canonical report/work-order/project/procurement/OBO transitions, consequences, exception owners and resident labels | Domain process owners | Each related contract/slice |
| GOV-D04 | Emergency route, staffed duty hours, after-hours response and break-glass policy | City emergency/service owner | Any emergency feature or P0 clock claim |
| GOV-D05 | Internal priority rubric versus approved Citizen's Charter transaction clocks, calendars and pauses | Service/legal owner | SLA display or public service promise |
| GOV-D06 | Evidence, secure storage, PII, retention, legal hold, disclosure and public projections | DPO + records owner | S2 and any release/export |
| GOV-D07 | Official geography, asset class/source and government versus resident coverage | GIS + service owner | S3 map claims and S9 |
| GOV-D08 | Signers, controlled templates, official mailbox/directory, publisher, bilingual notice and Canva/social policy | Records + communications + IT | S7/S8 |
| GOV-D09 | SMS provider, sender/account, OTP security, verified device receipt, budget and consent | IT/security + communications | Any live SMS/OTP release |
| GOV-D10 | Finance/BAC/ObR/NTP, OBO and segregation rules | Finance/procurement/OBO owners | S11 |
| GOV-D11 | Analytics definitions, AI data use, model evaluation and predictive target | Data/model + privacy + operations | S12 |

Conflicts must remain visible: seven-versus-eight-module government navigation, separate case/report/work-order states, ten-versus-thirteen project stages, proposed P0–P5 versus legally approved service clocks, and older Semaphore recommendation versus the locally recorded PhilSMS pilot selection. No sprint silently resolves these.

## 6. Workstream implementation rules

1. **One record chain and one integration owner.** Backend/data lead owns shared schema, transition and permission contract changes. Parallel teams may build fixtures, research and component specs, but may not fork core state machines.
2. **Core before routes.** Reconcile semantic variables and component behavior in Figma, then implement shared access, shell, queue/detail, evidence, Signal Cut, feedback, overlay, map/list and chart/table patterns before route composition. No production template is detached merely to restyle it.
3. **Vertical slices, not page counts.** Every ticket names user/job, authoritative record/version, capability/scope, command, audit/outbox effect, failure recovery, accessible UI states, tests, flag, migration and rollback. Use the [blueprint packet](../ui-ux-audit/22-government-implementation-blueprint-v1.0.md#12-mandatory-vertical-slice-contract).
4. **Truthful automation.** Provider acceptance, handset receipt, office acknowledgment, issued signature, and resident-visible resolution are distinct facts. Workers retry with idempotency and expose unknown/failed results. AI never performs consequential decisions without an approved human gate.
5. **Safe expansion.** Optional channels/models start in sandbox or shadow mode behind owned flags. Existing enabled routes that cannot pass the relevant gate are repaired or disabled before a public pilot.

## 7. Definition of Ready, Done, and finalization

**Ready to implement:** named process and delivery owners; approved in-scope lifecycle and capability/field rules; current baseline and migration path; versioned API schema/fixtures; Figma component/frame version or explicit design blocker; complete loading, empty, partial, stale, denied, conflict, provider/system, offline and success behaviors; privacy/records/evidence classification; keyboard/focus/announcement, responsive/theme acceptance; test, telemetry, flag and rollback plan. A P0 policy or security gap blocks Ready.

**Done for a slice:** the staff job ends in a persisted, authorized outcome with next owner; audit/timeline/outbox/storage/provider effects reconcile; failed and uncertain actions say whether anything committed and preserve safe context; no dead or sample controls; WCAG 2.2 AA target, 3 px visible focus, 320 px reflow and 200% zoom, forced colors, reduced motion, true-color evidence, map list and chart table alternatives, and light/dark meaning parity pass; automated and representative staff UAT evidence is linked. Do not equate a success toast with completion.

**Finalized for release:** all enabled domain slices pass their Done gate; no open P0/P1; authorization and privacy adversarial tests pass; clean and upgrade migrations, backup restore, rollback and outbox reconciliation are rehearsed; support/on-call and incident owners accept runbooks; operational, QA/accessibility, security/privacy, records/legal, finance/model where applicable, and release owners sign a go/no-go record. Deferred domains are hidden or clearly unavailable, never implied by dead controls.

## 8. Planning cadence and measures

- Before each sprint: resolve or explicitly carry decisions; choose slices whose dependencies meet Ready; size against actual team capacity and keep a visible unplanned-defect allowance.
- During each sprint: daily blocker review; one shared contract review for schema/permission changes; staff demonstration against a real workflow before calling work Done.
- At review: show the durable record and a denied/error case, not only a happy-path screen; attach API, accessibility, theme, responsive and recovery evidence.
- At retrospective/replan: compare baseline and actual queue dwell, unowned high-risk work, field verification delay, notification unknown/failure, task completion, source-record completeness, support incidents and accessibility defects. Agree targets with owners before using them as commitments.

No invented velocity, completion percentage, legal deadline, model accuracy, or SMS delivery rate belongs in the plan.

## 9. Next concrete action

Use [the Sprint 0 and pilot backlog](15-government-sprint-0-and-pilot-backlog-2026-10-05.md) to nominate owners, select the integrated branch, and run the baseline/decision work. During S1, inspect the live shared Figma file and its reviewer-final government template, reconcile v0.2 variables and component states, then annotate paired light/dark pilot frames. This document itself makes no Figma or product-code change.
