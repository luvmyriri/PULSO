# Handoff Report: Governed Announcements Architecture Blueprint

**Module:** Milestone 1 — Governed Announcements Lifecycle & Router (Req R6)  
**Agent:** Announcements Architecture Explorer  
**Working Directory:** `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_announcements`  
**Parent:** `teamwork_preview_orchestrator_2` (`fc4a17ac-bb06-478e-85a3-04b65dcbe650`)  
**Primary Deliverable:** `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_announcements\announcements_plan.md`  

---

## 1. Observation

1. **Current Router Mounting in `main.py` (lines 280–290)**:
   ```python
   # Lines 280–290 in main.py
   app.include_router(gov_router.router)
   app.include_router(analytics_router.router)
   app.include_router(philsys_router.router)
   app.include_router(predictive_router.router)
   app.include_router(document_router.router, prefix="/api/gov/documents", tags=["System Documents"])
   ```
   `announcements_router.py` does not exist in `backend/` and is not included in `main.py`.
2. **Current Models in `backend/models.py` & `backend/gov_models.py`**:
   Public announcements are currently split between legacy `NewsItem` (`backend/models.py:230`) and `Advisory` (`backend/models.py:214`). Both models are unversioned single-author CRUD tables with no approval gates, no bilingual support, no delivery logs, and no correction audit records.
3. **Specification Mandate in `docs/government-system-proposal/02-updates-announcements-and-notifications.md` §2**:
   > "Proposed content lifecycle: **Draft → In review → Approved → Scheduled → Published → Expired or Archived.**
   > - Review can return **Changes requested**; author creates the next version and resubmits.
   > - An authorized immediate release moves Approved to Published through the same checks as scheduled release.
   > - Approval applies to a specific immutable version, audience, language variants, channels and release plan. Material edits invalidate approval.
   > - Published content is corrected through a new approved revision with a visible correction note, not silently overwritten.
   > - Withdrawal stops future distribution, records who authorized it and why...
   > - Delivery status is separate: queued, attempted, provider accepted, delivered where supported, failed, or unknown."
4. **Automated Schema Provisioning in `main.py` (lines 51–52)**:
   ```python
   models.Base.metadata.create_all(bind=engine)
   gov_models.Base.metadata.create_all(bind=engine)
   ```
   Adding new declarative classes inheriting from `database.Base` in `gov_models.py` automatically provisions the corresponding tables on server startup in both production (PostgreSQL) and testing (SQLite in-memory).
5. **Testing Architecture in `backend/tests/`**:
   Existing tests use `StaticPool` in-memory SQLite with `setup_test_db` autouse fixture recreating all tables via `Base.metadata.create_all` and `gov_models.Base.metadata.create_all`. A clean execution of `pytest` runs in ~30 seconds.

---

## 2. Logic Chain

1. **Model Placement & Schema Normalization**:
   - Because `gov_models.py` already houses administrative entities (`WorkOrder`, `AuditLog`, `ProcessTimeline`, `SystemDocument`), the government announcements entities belong in `gov_models.py`.
   - Creating `Announcement`, `AnnouncementCorrection`, and `AnnouncementDelivery` cleanly separates:
     - The canonical civic statement (`Announcement`),
     - Historical revisions and errata (`AnnouncementCorrection`), and
     - Multi-channel transport outcomes (`AnnouncementDelivery`).
   - Using 3NF foreign keys to `officials.id`, `districts.id`, `barangays.id`, `reports.id`, and `work_orders.id` ensures full data provenance back to field work.
2. **State Machine Integrity**:
   - Enforcing strict state machine rules in `PATCH /api/gov/announcements/{id}/status` ensures no notice can be released without executive sign-off (`APPROVER_ROLES`).
   - Preventing direct `PUT` on `published` announcements closes the silent-overwrite vulnerability. Staff must use `POST /corrections`, which captures a prior JSON snapshot into `previous_content` before applying text edits.
3. **Decoupling Delivery from Publishing**:
   - Marking an announcement as `published` creates or updates delivery records for `web`, `sms`, and `email`. If an SMS provider fails, the notice remains published on the web while the SMS delivery record records `status = "failed"` with the provider error message, enabling auditability and retries without corrupting the civic record.
4. **Bilingual Parity**:
   - Storing `title_en`, `title_fil`, `content_en`, and `content_fil` in first-class columns ensures both languages are verified, indexed, and available for public and staff portals.

---

## 3. Caveats

- **Scope Boundary**: This blueprint provides the complete architectural design and code specifications. In accordance with the Explorer role and the project's **No-code boundary**, changes have NOT been directly written to `backend/gov_models.py`, `backend/gov_schemas.py`, or `backend/announcements_router.py`. Implementation should proceed during the Milestone 1 execution phase.
- **Provider Gateways**: For SMS, the architecture leverages `backend/sms_utils.py` (Semaphore GSM API). For email, it hooks into `backend/notification_service.py` (`send_gov_email`). In test environments or when provider keys are absent, deliveries log cleanly as simulated/delivered.
- **Frontend Coordination**: Milestone 5 will construct `GovAnnouncementsPage.jsx` and `GovAnnouncementEditor.jsx` based on the API contracts documented in §7 of `announcements_plan.md`.

---

## 4. Conclusion

The Governed Announcements architecture is fully designed, specified, and ready for immediate implementation in Milestone 1. 

The complete blueprint in `c:\Users\Val\Desktop\PULSO\.agents\teamwork_preview_explorer_m1_announcements\announcements_plan.md` contains:
1. Production-ready SQLAlchemy models for `Announcement`, `AnnouncementCorrection`, and `AnnouncementDelivery` with full indexes, relationships, and cascading rules.
2. Pydantic v2 schemas covering creation, updates, status transitions, correction snapshots, and delivery summaries.
3. Complete `announcements_router.py` implementation supporting all 7 government endpoints and 1 public citizen feed endpoint.
4. Router mounting instructions for `backend/main.py`.
5. A 10-case Pytest test suite (`tests/test_gov_announcements_lifecycle.py`) verifying the 6-stage lifecycle, rejection of invalid transitions, authorization checks, immutable corrections, and per-channel telemetry.

---

## 5. Verification Method

To independently verify this design once implemented:

1. **Verify Database Models & Column Attributes**:
   ```bash
   python -c "import gov_models; print([c.name for c in gov_models.Announcement.__table__.columns])"
   python -c "import gov_models; print([c.name for c in gov_models.AnnouncementCorrection.__table__.columns])"
   python -c "import gov_models; print([c.name for c in gov_models.AnnouncementDelivery.__table__.columns])"
   ```
2. **Verify Pydantic Schemas**:
   ```bash
   python -c "import gov_schemas; print(gov_schemas.AnnouncementCreate.model_fields.keys())"
   ```
3. **Execute the Announcements Pytest Suite**:
   ```bash
   python -m pytest tests/test_gov_announcements_lifecycle.py -v
   ```
   **Expected Result**: 10 passed tests verifying:
   - Creation of draft announcements with bilingual fields and channel initialization.
   - Allowed updates on `draft` and `in_review`.
   - Full 6-stage lifecycle progression (`draft` → `in_review` → `approved` → `scheduled` → `published` → `expired`).
   - Rejection of invalid lifecycle jumps (e.g. `draft` directly to `published` returns HTTP 400).
   - Rejection of unauthorized approvals (non-executive roles return HTTP 403).
   - Rejection of direct `PUT` on published announcements (returns HTTP 400).
   - Snapshotting of prior text and creation of immutable correction notices.
   - Mandatory justification check for withdrawal.
   - Per-channel delivery statistics reporting.
   - Public feed sanitization (hiding drafts and unapproved notices).
4. **Invalidation Conditions**:
   - Any mechanism permitting direct mutation of a published notice's text without creating an `AnnouncementCorrection` record.
   - Any execution path allowing non-executive roles to approve or publish notices.
   - Any loss of delivery failure details when an external channel transport error occurs.
