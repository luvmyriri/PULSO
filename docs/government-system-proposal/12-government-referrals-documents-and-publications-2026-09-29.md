# Government operations: email referrals, official documents, notifications, and public notices

**Status:** Proposed operational and design contract. **Research date:** 29 September 2026. **Applies to:** City Engineering government workspace and public notices. **Authority:** `PRODUCT.md` and approved Civic Aperture principles; actual City Engineering service standards, signatories, inter-office arrangements, and branding require LGU validation. **Scope:** Documentation only; no product code or external communication changed. Figma was not used at the user's request.

## 1. What the Caloocan references actually show

The City's [City Engineering Department page](https://caloocancity.gov.ph/category/ced/) publicly names three services: excavation permits for major utilities, excavation permits for individual house connections, and action on engineering/public-works complaints. It links a [CED Citizen's Charter](https://caloocancity.gov.ph/ced-citizen-charter/) as an embedded Google Drive PDF. The page proves a Charter exists; the embedded PDF could not be text-verified in this research session. **Obtain the current approved PDF from CED before configuring any statutory/Charter service deadline or reusing its wording.** Older web mirrors are not an adequate authority for current time limits.

The [City forms catalog](https://caloocancity.gov.ph/forms/) links permit, checklist, and certificate forms under the **Office of the City Building Official (OCBO)**. City-hosted examples include the [unified building permit application](https://online.caloocancity.gov.ph/ENGINEERING/CSS_JS_IMG/img/Downloadables/1-Unified-Application-for-Bldg-Permit.pdf), [final electrical inspection/completion certificate](https://online.caloocancity.gov.ph/ENGINEERING/CSS_JS_IMG/img/Downloadables/4-Completion-Elect-new.pdf), and [mechanical permit](https://online.caloocancity.gov.ph/ENGINEERING/CSS_JS_IMG/img/Downloadables/MECHANICAL%20FORM.pdf). They provide **field/authority conventions**, not authorization for PULSO to issue OCBO documents or copy prescribed forms. Their visible text uses an issuing-office title, application/permit number, structured applicant/location and scope fields, action/conditions, checklist/assessment sections, and named signature lines. Some forms are dated and contain print-era or extraction defects; reuse only after the responsible office supplies current controlled masters.

The City's [public CLUP hearing notice](https://caloocancity.gov.ph/public-notice/) is a readable page with the subject and separate dates/venues for North and South Caloocan. It is a useful pattern for **canonical text-first public information**. Artistic images can amplify it, but the exact action, place, date, issuer and updates should remain on an accessible official page. The City's [public news area](https://caloocancity.gov.ph/category/news/) demonstrates a separate editorial channel; PULSO should distinguish service notices from general city campaigns.

### Controlled template families to request from the City

| Family | Public evidence today | PULSO proposed use | Authority needed |
|---|---|---|---|
| CED complaint/action | CED service and Charter linked publicly; master not inspected | Acknowledgment, action slip, inspection request/report, endorsement, final response | Current CED Charter, correspondence samples, signatory matrix |
| CED physical work | No current public CED master verified | Work order, assignment, site safety/traffic checklist, daily accomplishment, materials request, independent inspection | CED controlled forms and applicable engineering/procurement policy |
| OCBO regulated permits/certificates | OCBO city-hosted PDFs above | Reference layout/metadata only unless separately in scope | OCBO approval; prescribed form, signing and regulatory review |
| City public notices | Caloocan CLUP public page | Service advisory, roadwork/closure, inspection result, correction | City publisher/PIO delegation, approved brand assets |

**Design direction:** official forms remain restrained and document-like: city/office identity, one clear title, unique number/version/date, location and case/work reference, numbered sections, evidence/conditions, prepared/reviewed/approved fields, and verification instruction. Public posts use Civic Aperture's true-color civic evidence or local cartography as one focal element, with short text on the image and full accessible information on the canonical page. Use the City's actual seal/marks only when supplied and authorized. Never synthesize signatures, certification, or mayoral endorsement.

## 2. Email-only referral to another department

**Operating principle:** email is the transport; PULSO remains the **record and follow-up owner** until a receiving office explicitly acknowledges responsibility. A mail server accepting a message does not prove the department read or accepted the case. Email delivery tracing can show accepted/deferred/rejected states where the City's mail service supports it. [Microsoft message trace documentation](https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/trace-an-email-message).

### Proposed path

1. Triage reviewer records why CED lacks sole jurisdiction and selects a verified department from a maintained routing directory; uncertain cases go to a supervisor. A case involving multiple offices stays open with linked referrals, not copied into unrelated PULSO cases.
2. PULSO creates a **minimum-necessary referral packet**: cover/endorsement letter PDF, reference ID, issue/location and risk summary, requested action, callback contact, response-by date, and an attachment manifest. Include resident identity or original photos only if necessary and authorized for that recipient. Confirm legal basis and safeguards for personal-data sharing under current [NPC Circular 2020-03](https://privacy.gov.ph/wp-content/uploads/2021/01/Circular-Data-Sharing-Agreement-amending-16-02-21-Dec-2020-clean-copy-FINAL-LYA-and-JDN-signed-minor-edit.pdf) and its [2025 clarification](https://privacy.gov.ph/wp-content/uploads/2025/07/SGD-2025-01-DSA-Clarification.pdf). A data-sharing agreement is **not automatically mandatory** under the 2025 clarification, though the DPO may recommend a formal arrangement for recurring exchange.
3. Authorized CED reviewer previews the exact address, subject, body, packet and privacy classification, then approves the specific packet version. The backend records actor, recipient directory version, reason, approval, packet hash, message ID and send attempt before dispatch through a durable job.
4. An approved City mailbox sends the email with a monitored Reply-To address and correlation subject, e.g. `[PULSO REF-2026-000123] Action requested: streetlight hazard, Barangay …`. Use an authorized City mail domain and configured authentication; the IT owner validates domain and SPF/DKIM/DMARC settings. [Google sender guidance](https://support.google.com/mail/answer/81126).
5. Save transport outcomes separately: `queued → provider accepted → delivery confirmed (if available)` or `failed/unknown`. The case then waits for **human acknowledgment**. When the receiving office replies with its own reference/owner and acceptance, the CED coordinator records `accepted by recipient`. A read receipt or automatic out-of-office reply is not acceptance.
6. PULSO schedules follow-ups and escalation if no acknowledgment or substantive response arrives. Shared-mailbox replies may be imported with verified threading and attachment scanning; manual upload/logging is the first reliable version when mailbox API access is unavailable. Every reply and telephone follow-up becomes an auditable case event.
7. CED reviews the external response, updates the resident accurately, and closes CED's coordination task only when the chosen disposition and follow-up obligations are complete. If the recipient declines jurisdiction, route again with a reason and preserve the first attempt.

**State model:** `referral_draft`, `approved`, `send_queued`, `provider_accepted`, `delivery_unknown`, `delivery_failed`, `awaiting_acknowledgment`, `acknowledged`, `declined`, `awaiting_external_action`, `response_received`, `coordinated_closed`, `cancelled`. Transport status, recipient acknowledgment, and the original case status are separate fields. A referral may be superseded without erasing its sent copy.

**Emergency exception:** a P0 safety referral uses the City's established immediate call/dispatch procedure first, followed by the documented email packet. Email-only asynchronous handling must never be represented as emergency response.

### SLA split for referrals

| Clock | Owner and start | Stops only on | Visible breach/recovery |
|---|---|---|---|
| CED acknowledgment/triage | CED; original receipt | Actual CED action | Remains governed by the applicable approved Charter/office policy; referral does not erase elapsed time. |
| CED referral preparation | CED; jurisdiction decision | Approved packet queued | Escalate an unsent high-risk referral to a named coordinator. |
| Transport verification | PULSO/IT; send request | Provider evidence or explicit unresolved state | Failed/unknown sends enter a staff recovery queue; no success toast based on job creation. |
| Recipient acknowledgment | CED coordinator; confirmed send | Named acknowledgment/reference or explicit refusal | Illustrative pilot: follow up after one working day for routine cases; P0/P1 by immediate safety policy. Not a legal deadline imposed on the recipient. |
| External response follow-up | CED coordinator; recipient acknowledgment | Reviewed response | Named reminder/escalation based on agreement or approved routing policy. No silent indefinite pause. |
| Resident update | CED case owner; disposition or promised update time | Actual notification accepted by selected channel | Resident sees `referred to [office]` after confirmed send; `accepted by [office]` only after acknowledgment; never `resolved` because an email was sent. |

Recheck the current CED Charter and City's legal interpretation of the transaction clock; do not assume a referral automatically pauses a statutory service period. RA 11032 requires services and processing times to match the approved Citizen's Charter. [RA 11032 implementing rules](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/96391).

**Security:** classify the packet; restrict recipients to a verified official directory; scan attachments; avoid unrestricted cloud links; encrypt sensitive content in transit and at rest according to City IT/DPO policy; set retention and controlled access for sent/replied copies. Use the current [NPC Circular 2023-06](https://privacy.gov.ph/wp-content/uploads/2024/05/2023-compendium-2.pdf) for security requirements. Older NPC Circulars 16-01 and 16-02 were repealed and should not be treated as the current rule. [NPC notice of 2023-06 repeal](https://privacy.gov.ph/npc-issues-circulars-to-strengthen-personal-data-protection-in-ph/), [NPC 2025 sharing clarification](https://privacy.gov.ph/wp-content/uploads/2025/07/SGD-2025-01-DSA-Clarification.pdf).

## 3. System-generated document production

**One template registry, one packet engine, many approved outputs.** A template is a controlled record with `type`, `issuing_office`, `template_version`, effective dates, language, required fields, signer roles, access class, retention series, and output rules. The engine merges only server-authoritative, permission-filtered case/work data. It flags missing or uncertain facts; it never invents a measurement, inspection outcome, official signature, or external office's consent.

### Proposed first eight documents

| Document | Trigger | Inputs and output | Gate |
|---|---|---|---|
| Complaint acknowledgment | Report accepted into CED intake | Ticket, receipt time, next step, contact; accessible PDF/email | No verified-jurisdiction claim before review |
| CED action slip | Intake review complete | Case, issue, division, reviewer, next action | Named assignment |
| Interdepartmental endorsement | Other remit confirmed | Redacted referral packet, requested response, attachments | CED approver + DPO rules |
| Inspection assignment | Site visit approved | Scope, location confidence, safety notes, due date | Responsible engineer |
| Field inspection report | Inspection submitted | Observation, measurements, true-color proof, finding, limitations | Independent reviewer/signatory |
| Work order | Engineering work authorized | Scope, crew, materials/traffic controls, asset, safety and approval refs | Delegated engineering/financial authority |
| Completion and verification report | Work marked complete | Actual work, dates, before/after, independent inspection | Inspector acceptance |
| Final response or public-safe summary | Outcome verified | Resident-specific reply or redacted public version | Case owner; public publisher for public release |

The document lifecycle is `draft → prepared for review → reviewed → approved for signature → issued → corrected/superseded/withdrawn`. Retain the issued byte-for-byte artifact, its hash, generation inputs, template version and approval chain. A correction issues a new version and links the prior one. A QR/verification page verifies the document ID and current status but does not replace an authorized digital signature. Accessibility requires semantic HTML or tagged PDF, useful text alternatives, readable tables and English/Filipino content where public-facing. JPG/PNG is a **companion visual**, not the official text-only record. [W3C PDF techniques](https://www.w3.org/WAI/WCAG22/Techniques/).

**Administrative screen:** template library → choose linked case/work item → fill only missing controlled fields → preview exact PDF and public/private variants → review/return → approve/sign → issue/send → register and search → correct/withdraw. Show signer and pending reason, not a generic spinner. Preview actual page breaks and attachment order. Audit every disclosure/download.

## 4. Notifications, announcements, and artistic publishing

Keep four concepts separate: a **case notification** to a resident, an **internal task notification** to staff, an **interoffice referral email**, and a **public announcement**. Each has a distinct audience, privacy rule, delivery channel, and state. A published public webpage is a record; email, SMS, social media and JPG are distributions or derivatives of an approved record.

### Recommended public-notice workflow

1. **Start from authoritative work:** case, work order, approved plan, scheduled closure, or City-authorized advisory. Choose a notice class: planned work, access/traffic change, service interruption, progress, completed/verified work, correction, or emergency relay.
2. **Enter service facts:** what/where/when, effect period, resident action, safe alternative only if verified, next update time, issuer/contact, and source record. English and Filipino versions convey the same facts. AI may simplify or translate, with source references and a visible human review.
3. **Compose two outputs from one content record:** (a) canonical accessible PULSO page/email text with full facts and version; (b) short artistic visual for the feed/social channel. Public page shows effective dates, version, update/correction and source; a design image never carries the only copy of critical instructions.
4. **Technical review** confirms engineering facts, location, maps, dates and status. **Communications/publishing review** confirms audience, tone, privacy, brand, accessibility, language parity and channels. Approval binds a specific content version *and* attached art version. Scheduled release rechecks linked work and authority at execution time.
5. **Publish/dispatch** records web publication separately from each email, SMS or social delivery attempt. If automatic social posting is not authorized, staff export an approved PNG/JPG and caption, post manually from the City-owned account, then record URL/time/operator. No pretend success when a channel is unconnected.
6. **Correct, withdraw and archive** with a visible correction note. Distributed messages cannot be recalled; the system generates a correction and shows which channels still need follow-up.

**Art direction for repeatable notices:** use three controlled layouts instead of ad hoc posters: `Service notice` (plain text-first field sheet), `Place and time` (one governed map/location focal area), and `Verified work` (one true-color before/after evidence pair with captions outside images). Use Civic Aperture framing and selective ember/Field Blue according to audience, never invented engineering measurements, filtered evidence or text over evidence. Each output must carry issuer, validity/effective time, short URL/QR to the official page, and a version/updated marker when changed. Avoid celebratory treatment for disruptions or safety risks.

### Where Canva fits

**Use Canva as an optional artwork editor, not the case database or publication authority.** For routine notices, PULSO can render the controlled layouts directly, avoiding manual retyping. For high-visibility campaigns or unusually visual maps, a communications designer can use an approved City Canva Brand Kit/template, export PNG/JPG (or accessible PDF where appropriate), and upload the final asset to the PULSO announcement draft. PULSO still stores the exact approved text, accessible alternative, asset hash/version, channel previews, reviewers and publish action. If someone changes the Canva design after PULSO approval, upload it as a new version and review again. Do not upload private resident evidence or personally identifying case data into Canva without City privacy/vendor approval. Canva supports brand controls and design approvals, but those are workspace features and may depend on the City's plan; they do not establish the LGU's legal publication delegation. [Canva Brand Controls](https://www.canva.com/help/brand-control/), [design approvals](https://www.canva.com/help/review-designs/).

For PDF export from Canva, use its accessibility checker, semantics, alt text and reading-order controls, then inspect the exported PDF with an independent checker and a screen reader. Avoid flattened/image-only PDF for substantive notices. [Canva accessible PDF guidance](https://www.canva.com/help/create-accessible-pdfs/), [flattening explanation](https://www.canva.com/help/download-flattened-pdf-variantb/).

## 5. Current implementation issues that block a truthful launch

| Observed source | Risk | Release requirement |
|---|---|---|
| `backend/announcements_router.py` `_execute_channel_deliveries` | Sets web/SMS/email delivery to `delivered` immediately with fabricated recipient counts; it does not call the mail/SMS provider there. | Replace with actual per-attempt outcome and provider evidence; `unknown` is a valid state. No delivery counts without measured recipients. |
| `backend/notification_service.py` | Logs several notifications to a local text file and prints `Sent`; SMTP is direct and specialized. | Durable outbox/job processing, monitored City mailbox, provider IDs, retries/reconciliation, attachment privacy, and failure queue. |
| Current government routes | No dedicated interdepartmental referral record/response workflow found in inspected backend. | Add referral entity, verified directory, versioned packet, approval, send, receipt/response capture, SLA follow-up and resident-visible status. |
| `backend/document_router.py` | Upload/registry/retention labels exist; controlled auto-generation and public derivative workflow remain incomplete. | Controlled masters, approval/signature and accessibility validation before an issued document claim. |

These are source observations, not a complete production penetration, mail-delivery, or runtime audit. Existing [announcement proposal](02-updates-announcements-and-notifications.md) and [priority/SLA/document plan](11-priority-sla-documents-spatial-ml-plan-2026-09-29.md) remain proposed and should be reconciled with this contract.

## 6. Minimum functional build contract

**Authoritative records:** `department_contact` (approved office, mailbox, verified-by/date, effective dates, backup), `external_referral` (case, reason, target, owner, packet/version/hash, requested action, response due, state), `referral_attempt` (idempotency key, recipient snapshot, provider/message ID, attempt/result/time), `referral_correspondence` (reply, attachment manifest, sender verification, linked referral, reviewed-by), `document_template`, `document_version`, `publication_version`, `channel_delivery`, `sla_clock`, and append-only `audit_event`. Email and document bytes go to protected object storage with references in the database; no raw resident material in routine logs or job payloads.

**Commands, not arbitrary status edits:** `propose_referral`, `approve_referral_packet`, `dispatch_referral`, `record_acknowledgment`, `record_external_reply`, `decline_or_redirect`, `issue_document`, `approve_notice`, `publish_notice`, `correct_notice`, and `withdraw_notice`. Every command checks current record version, actor capability, transition eligibility, required reason, and privacy scope on the server. A database transaction saves the decision, audit and outbox event together; idempotent workers execute delivery. A failed worker never creates a fake case transition.

**Staff screens:** (1) case docket with `Refer to another office` and exact disclosure preview; (2) referrals queue grouped by awaiting approval, failed send, awaiting acknowledgment, due reply and declined; (3) document packet preview and signatory queue; (4) publication calendar with draft/review/scheduled/published/correction tabs; (5) delivery detail showing each attempt and provider evidence. Keep case/filter context across actions. Failure, stale data, permission denial, absent verified recipient, no reply, and partial delivery must be explicit. Critical actions have keyboard focus, a readable confirmation and return focus; maps/images have text alternatives; light/dark and 200% zoom retain all actions.

**Observable measures:** time from jurisdiction decision to approved send; percentage of referrals with verified recipient, confirmed send, human acknowledgment and substantive reply; overdue follow-ups; resident update delay; document generation/review/issue time; correction rate; publication accuracy defects; per-channel true delivery/unknown/failure counts. Display numerator, denominator, date range and missing-data count. Never infer staff or resident performance from an unverified email-open metric.

## 7. Delivery sequence and acceptance journeys

| Stage | Build and decisions | Acceptance journey |
|---|---|---|
| 0. Obtain controlled sources | CED Charter/master forms; actual correspondence and signed work packet; approved seal/brand; verified department email directory; DPO and publisher signatories. | Each template and service clock has version, owner and approval status; inaccessible/outdated samples stay reference-only. |
| 1. Truthful notification core | Event/outbox, channel statuses, City mailbox, monitored replies and failed-job queue. | Failed SMTP and duplicate retry never show `delivered`; staff can recover and prove which packet was sent. |
| 2. Referral pilot | One receiving department, routing reason, redacted packet, approval, email, acknowledgment and follow-up clocks. | CED can trace accepted/declined/no reply, resident sees honest status, no PII leaks, no silent closure. |
| 3. Official document pilot | Complaint acknowledgment, CED action slip, inspection report and endorsement letter before more complex certificates. | Signer validates a real packet; correction preserves the old issued version; PDF is keyboard/screen-reader usable. |
| 4. Public notices | Text-first notice editor, two languages, three visual templates, Canva upload lane, schedule/correction, manual social proof. | Approved work change invalidates stale schedule; bilingual page and art share the same facts; image-only access is unnecessary. |
| 5. Expand | More departments, regulated forms only by their owner, measured service performance. | Volume/latency, response rates, privacy incidents, correction frequency, accessibility and staff task completion are reviewed. |

**Essential test set:** wrong recipient, stale directory address, attachment too large, file malware, approval revoked, sensitive image accidentally selected, SMTP accepted but reply absent, bounce, duplicate send, out-of-office auto-reply, recipient declines, after-hours P0, missed follow-up, correction after public sharing, scheduled notice after work cancellation, Canva artwork changed after approval, English/Filipino mismatch, offline/partial/failed queue, 200% zoom and keyboard-only use.

## 8. LGU decisions still needed

1. Current CED Charter PDF and approved transaction clocks, including whether an email referral affects any clock.
2. Which departments accept referrals by official email, their monitored mailbox and backup contact, acknowledgment convention, and escalation route.
3. Which data may be disclosed per department and under which recurring arrangement; City DPO to confirm the basis, security and vendor use.
4. Who signs each document, who approves a public notice, and whether City PIO must approve all CED notices or only citywide notices.
5. Whether Canva is an approved City tool/account and whether PULSO may store/export City artwork; provide the approved seal, mark, type and color assets.
6. Whether social posting remains manual or uses an approved platform connector. Manual posting is fully workable if its link, time and operator are recorded.
