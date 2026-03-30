# Observation and Implementation Plan: PULSO CRUD Synchronization

## 1. Current Observations

### 1.1 Router Mounting Blockers

The `gov_router.py` and `analytics_router.py` files contain the core government-side endpoints (Work Orders, Procurement, Projects, Intelligence). However, they are currently **not mounted** in `main.py` using `app.include_router()`. This prevents the frontend from accessing any /api/gov/* routes, effectively disabling government CRUD functionality.

### 1.2 Fragmented CRUD Implementation

There is a significant split between standard system CRUD (`crud.py`) and specialized government CRUD (`gov_crud.py`).

- **Work Orders**: Both files define `create_work_order`, but they implement different side effects.
- **Reporting Status**: `crud.py` correctly updates the citizen's report status when a work order is issued, but `gov_crud.py` (which the government dashboard actually uses) does not. This results in resident reports remaining stuck in "pending" status despite actions taken by the engineering office.

### 1.3 Disconnected Citizen Feedback Loop

The `ProcessTimeline` and `AuditLog` are correctly defined in the models but are only partially utilized. Key government actions like advancing a project phase or approving procurement do not consistently trigger status updates or notifications back to the original reporter (the citizen).

---

## 2. Proposed Implementation Plan

### Phase 1: Endpoint Restoration & Consolidation

1. **Mount Routers**: Re-insert `app.include_router(gov_router.router)` and `app.include_router(analytics_router.router)` into `main.py` after the CORS middleware.
2. **Consolidate Work Order Logic**: Standardize on a single `create_work_order` function (preferably in `gov_crud.py`) that handles:
    - Creation of the `WorkOrder` record.
    - Automatic status update of the linked `Report` to "dispatched".
    - Generation of a corresponding `ProcessTimeline` entry.
    - Generation of a `Notification` for the resident.

### Phase 2: Lifecycle Status Mapping

1. **Report → Work Order**: Ensure any action in `/api/gov/work-orders` (e.g., completion or cancellation) reflects back on the report's `status` and `updated_at` fields.
2. **Work Order → Project**: If a work order is scaled into a full LGU Project, ensure the report transitions through the 13-stage project phase logic in `gov_crud.py`.
3. **Timeline Visibility**: Update `gov_crud._append_timeline` to ensure `is_public=True` is used for states that citizens should see (e.g., "Survey in Progress", "Procurement Initiated").

### Phase 3: Validation & End-to-End Testing

1. **Test Script Execution**: Create a `verify_crud.py` script that:
    - POSTs a new citizen report.
    - Logs in as a dispatcher to verify the report.
    - Converts that report into a government Work Order.
    - Verifies the report's status changes to "dispatched".
2. **Database Integrity Check**: Use `pgAdmin` to verify that `report_id` and `work_order_id` columns are correctly populated and indexed during these operations.

---

> [!IMPORTANT]
> The missing `app.include_router` calls are the primary reason the system feels "seeded but non-functional". Restoring these is the prerequisite for all other CRUD fixes.
