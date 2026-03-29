# PULSO: Individual API Endpoint Catalog
## Complete Backend Route Implementation — Caloocan City Engineering Office

This exhaustive document lists every individual API endpoint integrated into the PULSO system, providing the exact Python code implementation for each.

---

## 1. Core System & General APIs (main.py)

### [GET] /
Root health status check.
```python
@app.get("/", response_model=StatusResponse)
async def root():
    return {"status": "online", "message": "PULSO Backend API v2 is running."}
```

### [GET] /api/health
Deep health check for service monitoring.
```python
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "PULSO Core Engine"}
```

### [POST] /api/ai/assistant
PULSO Omni-Assistant: Domain-aware AI chat.
```python
@app.post("/api/ai/assistant")
async def ai_omni_assistant(req: AIChatRequest, current_user: schemas.UserResponse = Depends(get_current_user)):
    user_ctx = f"User: {current_user.full_name} ({current_user.role}). Context: {req.context or 'General Dashboard'}"
    return gemini_service.get_ai_assistant_response(req.query, context=user_ctx)
```

### [POST] /api/verify-residency
Multi-pass OCR ID verification for North Caloocan residency.
```python
@app.post("/api/verify-residency")
async def verify_residency(idFront: UploadFile = File(...), idBack: Optional[UploadFile] = File(None)):
    front_bytes = await idFront.read()
    back_bytes = await idBack.read() if idBack else None
    result = await ocr_service.perform_ocr(front_bytes, back_bytes)
    return result
```

---

## 2. Authentication & Identity (main.py)

### [POST] /api/auth/register
New citizen or staff registration.
```python
@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user: raise HTTPException(status_code=400, detail="Email already registered")
    user.password = auth.get_password_hash(user.password)
    return crud.create_user(db=db, user=user)
```

### [POST] /api/auth/login
OAuth2 compliant login with JWT generation.
```python
@app.post("/api/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": user}
```

### [POST] /api/auth/forgot-password
Initiates the secure password recovery protocol via SMTP.
```python
@app.post("/api/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=req.email)
    if not user: return {"message": "Recovery protocol initiated if account exists."}
    token = secrets.token_urlsafe(32)
    # ... Token saving & Email dispatch logic ...
    return {"message": "Recovery protocol initiated. Check your official inbox."}
```

### [GET] /api/auth/verify-token/{token}
Verifies the validity of a password reset token.
```python
@app.get("/api/auth/verify-token/{token}")
async def verify_token(token: str, db: Session = Depends(get_db)):
    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == token,
        models.PasswordResetToken.used == False
    ).first()
    if not reset_token: raise HTTPException(status_code=400, detail="Token invalid.")
    return {"message": "Identity Token Verified"}
```

### [POST] /api/auth/reset-password
Finalizes password update using a verified security token.
```python
@app.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_token = db.query(models.PasswordResetToken).filter(models.PasswordResetToken.token == req.token).first()
    user = db.query(models.User).filter(models.User.email == reset_token.email).first()
    user.password_hash = auth.get_password_hash(req.new_password)
    reset_token.used = True
    db.commit()
    return {"message": "Password updated."}
```

---

## 3. Personnel & User Management (main.py & gov_router.py)

### [GET] /api/me
Retrieves the profile of the currently authenticated user.
```python
@app.get("/api/me", response_model=schemas.UserResponse)
def get_me(current_user: schemas.UserResponse = Depends(get_current_user)):
    return current_user
```

### [PATCH] /api/users/{user_id}
Updates user profile settings (Email, phone, etc).
```python
@app.patch("/api/users/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db)):
    db_user = crud.update_user(db, user_id=user_id, user_update=user_update)
    return db_user
```

### [PATCH] /api/gov/users/{user_id}/role
(Admin Only) Change a user's system role and log the audit event.
```python
@router.patch("/users/{user_id}/role")
def update_user_role(user_id: int, payload: RoleUpdatePayload, db: Session = Depends(get_db)):
    _assert_role(current_user, *ADMIN_ONLY)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    user.role = payload.role
    gov_crud._append_audit(db, trigger_type="role_change", action=f"Role changed to {payload.role}")
    db.commit()
    return {"message": "Role updated."}
```

---

## 4. Incident Reporting & Triage (main.py)

### [POST] /api/reports
Creates a new incident report with AI multi-modal scanning.
```python
@app.post("/api/reports", response_model=schemas.ReportResponse)
async def create_new_report(category: str = Form(...), description: str = Form(...), image: Optional[UploadFile] = File(None)):
    image_bytes = await image.read() if image else None
    ai_analysis = gemini_service.analyze_report(description, image_data=image_bytes)
    if ai_analysis.get("is_inappropriate"): raise HTTPException(400, "Rejected by AI Safety.")
    return crud.create_report(db=db, report=report_dto, user_id=current_user.id, ai_analysis=ai_analysis)
```

### [GET] /api/reports/stats
Management KPI statistics aggregated by report status.
```python
@app.get("/api/reports/stats", response_model=schemas.ReportStats)
def get_report_stats(db: Session = Depends(get_db)):
    _assert_role(current_user, "manager", "dispatcher")
    return crud.get_report_stats(db)
```

### [GET] /api/reports
Lists all incident reports with optional status filtering.
```python
@app.get("/api/reports", response_model=List[schemas.ReportResponse])
def read_reports(skip: int = 0, limit: int = 50, status: Optional[str] = None, db: Session = Depends(get_db)):
    _assert_role(current_user, "dispatcher", "manager")
    reports = crud.get_reports(db, skip=skip, limit=limit)
    if status: reports = [r for r in reports if r.status == status]
    return reports
```

### [GET] /api/reports/user/{user_id}
Lists reports submitted by a specific citizen.
```python
@app.get("/api/reports/user/{user_id}", response_model=List[schemas.ReportResponse])
def read_user_reports(user_id: int, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    if current_user.id != user_id and current_user.role not in ["dispatcher", "manager"]:
        raise HTTPException(403, "Not authorized.")
    return crud.get_reports_by_user(db, user_id=user_id, skip=skip, limit=limit)
```

### [GET] /api/reports/{report_id}
Retrieves a single report by unique ID.
```python
@app.get("/api/reports/{report_id}", response_model=schemas.ReportResponse)
def read_report(report_id: int, db: Session = Depends(get_db)):
    db_report = crud.get_report(db, report_id=report_id)
    if not db_report: raise HTTPException(404, "Report not found")
    return _enrich_report(db_report, db)
```

### [PATCH] /api/reports/{report_id}/status
General status update for incident life-cycle.
```python
@app.patch("/api/reports/{report_id}/status", response_model=schemas.ReportResponse)
def update_report_status(report_id: int, status_update: ReportStatusUpdate, db: Session = Depends(get_db)):
    updated_report = crud.update_report_status(db=db, report_id=report_id, status=status_update.status)
    return _enrich_report(updated_report, db)
```

### [PATCH] /api/reports/{report_id}/dispatch
Approves and dispatches a report for field action.
```python
@app.patch("/api/reports/{report_id}/dispatch", response_model=schemas.ReportResponse)
def dispatch_report(report_id: int, db: Session = Depends(get_db)):
    _assert_role(current_user, "dispatcher", "manager")
    updated = crud.update_report_status(db, report_id=report_id, status="dispatched")
    return _enrich_report(updated, db)
```

### [PATCH] /api/reports/{report_id}/reject
Rejects a report flagged as out-of-scope or invalid.
```python
@app.patch("/api/reports/{report_id}/reject", response_model=schemas.ReportResponse)
def reject_report(report_id: int, db: Session = Depends(get_db)):
    updated = crud.reject_report(db, report_id=report_id, actor_id=current_user.id)
    return _enrich_report(updated, db)
```

### [PATCH] /api/reports/{report_id}/resolve
Marks a dispatched report as successfully resolved.
```python
@app.patch("/api/reports/{report_id}/resolve", response_model=schemas.ReportResponse)
def resolve_report(report_id: int, db: Session = Depends(get_db)):
    updated = crud.update_report_status(db, report_id=report_id, status="resolved")
    return _enrich_report(updated, db)
```

### [DELETE] /api/reports/{report_id}
Hard-delete a report record (Admin/Manager only).
```python
@app.delete("/api/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    success = crud.delete_report(db, report_id=report_id)
    return {"message": "Report deleted successfully"}
```

---

## 5. Public Advisories & Notifications (main.py)

### [GET] /api/advisories
Lists all active public advisories for the city.
```python
@app.get("/api/advisories", response_model=List[schemas.AdvisoryResponse])
def read_advisories(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return crud.get_advisories(db, skip=skip, limit=limit)
```

### [POST] /api/advisories
Broadcasts a new public advisory.
```python
@app.post("/api/advisories", response_model=schemas.AdvisoryResponse)
def create_advisory_route(advisory: schemas.AdvisoryCreate, db: Session = Depends(get_db)):
    _assert_role(current_user, "manager", "dispatcher")
    return crud.create_advisory(db=db, advisory=advisory)
```

### [DELETE] /api/advisories/{advisory_id}
Takedown an existing advisory.
```python
@app.delete("/api/advisories/{advisory_id}")
def delete_advisory(advisory_id: int, db: Session = Depends(get_db)):
    _assert_role(current_user, "manager")
    success = crud.delete_advisory(db, advisory_id=advisory_id)
    return {"message": "Advisory deleted successfully"}
```

### [POST] /api/advisories/generate/{report_id}
Uses AI to draft a public advisory from an incident report.
```python
@app.post("/api/advisories/generate/{report_id}")
async def generate_ai_advisory(report_id: int, db: Session = Depends(get_db)):
    db_report = crud.get_report(db, report_id=report_id)
    draft = gemini_service.generate_advisory_content(report_data)
    return draft
```

### [GET] /api/notifications/user/{user_id}
Retrieves personal system notifications for a user.
```python
@app.get("/api/notifications/user/{user_id}", response_model=List[schemas.NotificationResponse])
def read_user_notifications(user_id: int, skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    if current_user.id != user_id: raise HTTPException(403, "Forbidden")
    return crud.get_notifications_by_user(db, user_id=user_id, skip=skip, limit=limit)
```

### [PATCH] /api/notifications/user/{user_id}/read
Marks all notifications for a user as read.
```python
@app.patch("/api/notifications/user/{user_id}/read")
def mark_user_notifications_read(user_id: int, db: Session = Depends(get_db)):
    if current_user.id != user_id: raise HTTPException(403, "Forbidden")
    # ... CRUD logic to set read = True ...
    return {"message": "Notifications read."}
```

---

## 6. Geospatial & Maps Proxy (main.py)

### [GET] /api/geocode/reverse
GPS → Address proxy for server-side key security.
```python
@app.get("/api/geocode/reverse")
async def geocode_reverse(lat: float, lng: float):
    address = await maps_service.reverse_geocode(lat, lng)
    return {"address": address, "lat": lat, "lng": lng}
```

### [GET] /api/geocode/search
Forward geocode/place search proxy.
```python
@app.get("/api/geocode/search")
async def geocode_search(q: str = Query(...)):
    results = await maps_service.forward_geocode(q)
    return {"results": results}
```

### [GET] /api/maps/directions
Routing and polyline calculation for navigation.
```python
@app.get("/api/maps/directions")
async def get_directions_proxy(origin: str, destination: str, mode: str = "driving"):
    route = await maps_service.get_directions(origin, destination, mode)
    return route
```

---

## 7. Government Dashboards & Stats (gov_router.py)

### [GET] /api/gov/dashboard/stats
Master KPI data for all government divisions.
```python
@router.get("/dashboard/stats", response_model=gov_schemas.GovDashboardStats)
def gov_dashboard_stats(db: Session = Depends(get_db)):
    return gov_crud.get_gov_dashboard_stats(db)
```

### [GET] /api/gov/timeline
Global unified timeline across all LGU modules.
```python
@router.get("/timeline", response_model=List[gov_schemas.ProcessTimelineResponse])
def get_all_timelines(db: Session = Depends(get_db)):
    _assert_role(current_user, *GOV_ROLES)
    entries = gov_crud.list_all_timelines(db)
    return gov_crud.enrich_timeline(entries, db)
```

### [GET] /api/gov/timeline/report/{report_id}
Full lifecycle timeline for a specific incident report.
```python
@router.get("/timeline/report/{report_id}", response_model=List[gov_schemas.ProcessTimelineResponse])
def get_report_timeline(report_id: int, public_only: bool = Query(False), db: Session = Depends(get_db)):
    entries = gov_crud.get_timeline_for_report(db, report_id, public_only)
    return gov_crud.enrich_timeline(entries, db)
```

### [GET] /api/gov/records
Registry of all certificates, permits, and procurement awards.
```python
@router.get("/records")
def list_records_registry(db: Session = Depends(get_db)):
    _assert_role(current_user, *GOV_ROLES)
    return gov_crud.list_all_records(db)
```

---

## 8. Civil Works & Projects (gov_router.py)

### [POST] /api/gov/work-orders
Creates a standard or preemptive work order.
```python
@router.post("/work-orders", response_model=gov_schemas.WorkOrderResponse)
def create_work_order(data: gov_schemas.WorkOrderCreate, db: Session = Depends(get_db)):
    _assert_role(current_user, *FIELD_ROLES)
    wo = gov_crud.create_work_order(db, data, actor_id=current_user.id)
    return gov_crud.enrich_work_order(wo, db)
```

### [GET] /api/gov/work-orders
Lists filtered work orders for dispatchers and field staff.
```python
@router.get("/work-orders", response_model=List[gov_schemas.WorkOrderResponse])
def list_work_orders(skip: int = 0, limit: int = 50, status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    _assert_role(current_user, *GOV_ROLES)
    items = gov_crud.list_work_orders(db, skip, limit, status)
    return [gov_crud.enrich_work_order(w, db) for w in items]
```

### [GET] /api/gov/work-orders/{wo_id}
Retrieves detailed technical data for a work order.
```python
@router.get("/work-orders/{wo_id}", response_model=gov_schemas.WorkOrderResponse)
def get_work_order(wo_id: int, db: Session = Depends(get_db)):
    _assert_role(current_user, *GOV_ROLES)
    wo = gov_crud.get_work_order(db, wo_id)
    return gov_crud.enrich_work_order(wo, db)
```

### [PATCH] /api/gov/work-orders/{wo_id}/status
Advanced state transition for field operations.
```python
@router.patch("/work-orders/{wo_id}/status", response_model=gov_schemas.WorkOrderResponse)
def update_work_order_status(wo_id: int, payload: gov_schemas.WorkOrderUpdate, db: Session = Depends(get_db)):
    _assert_role(current_user, *FIELD_ROLES)
    wo = gov_crud.update_work_order_status(db, wo_id, payload.status, actor_id=current_user.id)
    return gov_crud.enrich_work_order(wo, db)
```

### [POST] /api/gov/projects
Initiates a new infrastructure project (Phase 1).
```python
@router.post("/projects", response_model=gov_schemas.ProjectRequestResponse)
def create_project(data: gov_schemas.ProjectRequestCreate, db: Session = Depends(get_db)):
    _assert_role(current_user, "city_engineer", "admin_clerk", "manager")
    proj = gov_crud.create_project_request(db, data, actor_id=current_user.id)
    return gov_crud.enrich_project(proj, db)
```

### [GET] /api/gov/projects
Lists ongoing LGU projects across all 12 Phases.
```python
@router.get("/projects", response_model=List[gov_schemas.ProjectRequestResponse])
def list_projects(skip: int = 0, limit: int = 50, status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    _assert_role(current_user, *GOV_ROLES)
    items = gov_crud.list_project_requests(db, skip, limit, status)
    return [gov_crud.enrich_project(p, db) for p in items]
```

### [PATCH] /api/gov/projects/{proj_id}/advance
Advances infrastructure projects through Lifecycle Phases.
```python
@router.patch("/projects/{proj_id}/advance", response_model=gov_schemas.ProjectRequestResponse)
def advance_project(proj_id: int, payload: gov_schemas.ProjectRequestUpdate, db: Session = Depends(get_db)):
    _assert_role(current_user, *GOV_ROLES)
    proj = gov_crud.advance_project_phase(db, proj_id, payload.status, actor_id=current_user.id)
    return gov_crud.enrich_project(proj, db)
```

### [POST] /api/gov/projects/{proj_id}/certificate
Issues official Certificate of Completion (Phase 6).
```python
@router.post("/projects/{proj_id}/certificate", response_model=gov_schemas.ProjectRequestResponse)
def issue_certificate(proj_id: int, payload: gov_schemas.CertificateOfCompletionIssue, db: Session = Depends(get_db)):
    _assert_role(current_user, "asst_city_engineer", "city_engineer")
    proj = gov_crud.issue_certificate_of_completion(db, proj_id, actor_id=current_user.id)
    return gov_crud.enrich_project(proj, db)
```

---

## 9. Procurement & Registry (gov_router.py)

### [POST] /api/gov/procurement
Initiates a new Procurement Request Letter (draft state).
```python
@router.post("/procurement", response_model=gov_schemas.ProcurementRequestResponse)
def create_procurement_request(data: gov_schemas.ProcurementRequestCreate, db: Session = Depends(get_db)):
    _assert_role(current_user, *PROCUREMENT_ROLES)
    pr = gov_crud.create_procurement_request(db, data, actor_id=current_user.id)
    return gov_crud.enrich_procurement(pr, db)
```

### [GET] /api/gov/procurement
Lists Procurement records filtered by RA 9184 status.
```python
@router.get("/procurement", response_model=List[gov_schemas.ProcurementRequestResponse])
def list_procurement_requests(skip: int = 0, limit: int = 50, status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    _assert_role(current_user, *GOV_ROLES)
    items = gov_crud.list_procurement_requests(db, skip, limit, status)
    return [gov_crud.enrich_procurement(p, db) for p in items]
```

### [PATCH] /api/gov/procurement/{pr_id}/status
RA 9184 Workflow: draft → submitted → validated → sent_to_procurement → procured.
```python
@router.patch("/procurement/{pr_id}/status", response_model=gov_schemas.ProcurementRequestResponse)
def update_procurement_status(pr_id: int, payload: gov_schemas.ProcurementStatusUpdate, db: Session = Depends(get_db)):
    pr = gov_crud.update_procurement_status(db, pr_id, payload.status, actor_id=current_user.id)
    return gov_crud.enrich_procurement(pr, db)
```

### [POST] /api/gov/procurement/{pr_id}/items
Adds a Bill of Quantities (BoQ) item to a request.
```python
@router.post("/procurement/{pr_id}/items", response_model=gov_schemas.BoQItemResponse)
def add_boq_item(pr_id: int, item: gov_schemas.BoQItemCreate, db: Session = Depends(get_db)):
    _assert_role(current_user, *PROCUREMENT_ROLES)
    return gov_crud.add_boq_item(db, pr_id, item)
```

### [GET] /api/gov/boq
Lists all Bill of Quantities items for cost analysis.
```python
@router.get("/boq", response_model=List[dict])
def list_boq(skip: int = 0, limit: int = 100, pr_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    _assert_role(current_user, *GOV_ROLES)
    items = q.offset(skip).limit(limit).all()
    # ... Enrichment logic ...
    return result
```

---

## 10. Regulatory & OBO (gov_router.py)

### [POST] /api/gov/obo
Files a new Building Official (OBO) inspection.
```python
@router.post("/obo", response_model=gov_schemas.OBOInspectionResponse)
def create_obo_inspection(data: gov_schemas.OBOInspectionCreate, db: Session = Depends(get_db)):
    _assert_role(current_user, "admin_clerk", *INSPECTOR_ROLES)
    obo = gov_crud.create_obo_inspection(db, data, actor_id=current_user.id)
    return gov_crud.enrich_obo(obo, db)
```

### [GET] /api/gov/obo
Lists OBO inspections filtered by barangay or status.
```python
@router.get("/obo", response_model=List[gov_schemas.OBOInspectionResponse])
def list_obo_inspections(skip: int = 0, limit: int = 50, status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    _assert_role(current_user, *GOV_ROLES)
    items = gov_crud.list_obo_inspections(db, skip, limit, status)
    return [gov_crud.enrich_obo(o, db) for o in items]
```

### [PATCH] /api/gov/obo/{obo_id}
Logs inspection findings and issues notices/clearance.
```python
@router.patch("/obo/{obo_id}", response_model=gov_schemas.OBOInspectionResponse)
def update_obo_inspection(obo_id: int, data: gov_schemas.OBOInspectionUpdate, db: Session = Depends(get_db)):
    if data.status in ("permit_issued", "cleared"): _assert_role(current_user, *EXECUTIVE_ROLES)
    obo = gov_crud.update_obo_inspection(db, obo_id, data, actor_id=current_user.id)
    return gov_crud.enrich_obo(obo, db)
```

---

## 11. Division-Specific APIs (gov_router.py)

### [GET] /api/gov/analysis
Returns project requests current in the technical analysis phase.
```python
@router.get("/analysis", response_model=List[dict])
def list_structure_analysis(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    _assert_role(current_user, *GOV_ROLES)
    # ... Filtered Query logic ...
    return results
```

### [GET] /api/gov/surveys
Returns assignments for the Field Survey Division.
```python
@router.get("/surveys", response_model=List[dict])
def list_field_surveys(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    _assert_role(current_user, *GOV_ROLES)
    # Aggregated query across WorkOrders and ProjectRequests
    return results
```

### [GET] /api/gov/reports-archive
Access point for resolved/archived citizen reports.
```python
@router.get("/reports-archive", response_model=List[dict])
def list_reports_archive(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    _assert_role(current_user, *SENIOR_ROLES)
    # Returns ticket_ids, category, and resolution details
    return results
```

