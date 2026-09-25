# Milestone 2: Backend Endpoints & Routing Architecture Report

| Document Metadata | Value |
|---|---|
| System | PULSO — City Engineering Department Management System (Caloocan City) |
| Milestone | M2 — Backend Endpoints & Routing (Open Public Reporting & Contextual Authentication) |
| Author | API Explorer (`explorer_m2_1`) |
| Authority | `ORIGINAL_REQUEST.md`, `PROJECT.md`, `spec.md`, `AGENTS.md` |
| Target Files | `backend/main.py`, `backend/crud.py`, `backend/schemas.py` |
| Date | 2026-09-02 |
| Status | Complete / Ready for Implementation |

---

## 1. Executive Summary

Milestone 2 establishes the core API tier for PULSO's open public reporting architecture. By decoupling report ingestion from mandatory resident authentication, Caloocan residents and visitors can submit infrastructure reports instantly as guests while maintaining:
1. **Equal Operational Prioritization:** Guest reports enter the identical multi-modal Gemini 1.5 Flash AI Triage and GIS spatial dispatch queues as registered reports.
2. **High-Entropy Cryptographic Tracking:** 128-bit format tracking tokens (`TRK-XXXX-XXXX-XXXX-XXXX`) are hashed with HMAC-SHA256 upon ingestion. Plaintext tokens are returned strictly once in the creation response and never stored in plaintext.
3. **Public Status Tracking:** Unauthenticated status tracking with constant-time HMAC verification (`secrets.compare_digest`), anti-enumeration uniform error handling, and strict PII/operational redaction.
4. **Contextual Account Claiming:** Seamless post-submission account linking via authenticated claim requests that atomically bind `claimed_by_user_id` and emit immutable audit logs and in-app notifications.
5. **Unified Resident Management:** Consolidated portfolio querying (`GET /api/me/reports`) across both authored (`resident_id`) and claimed (`claimed_by_user_id`) reports with 4-way status filtering.

---

## 2. API Endpoint Implementations & Code Blueprints

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       PULSO M2 ROUTING MAP                                       │
├─────────────────────────┬──────────────┬──────────────────┬──────────────────────────────────────┤
│ Endpoint                │ HTTP Method  │ Auth Tier        │ Primary Responsibility               │
├─────────────────────────┼──────────────┼──────────────────┼──────────────────────────────────────┤
│ /api/reports            │ POST         │ Optional Bearer  │ Dual Guest & Registered Intake       │
│ /api/reports/track      │ POST         │ Public (None)    │ Sanitized Status Lookup & Timeline   │
│ /api/reports/{id}/claim │ POST         │ Required Bearer  │ Contextual Guest Report Claiming     │
│ /api/me/reports         │ GET          │ Required Bearer  │ Unified Authored & Claimed Portfolio │
│ /api/reports/user/{id}  │ GET          │ Required Bearer  │ Legacy-Compatible Unified Query      │
└─────────────────────────┴──────────────┴──────────────────┴──────────────────────────────────────┘
```

---

### 2.1 Endpoint 1: `POST /api/reports` (Refactored Dual Intake)

#### Specification & Behavior:
- **Route:** `POST /api/reports`
- **Status Code:** `201 Created`
- **Content-Type:** `multipart/form-data`
- **Authentication:** Optional (`auth.get_optional_current_user`). If valid Bearer token provided, associates `resident_id = current_user.id` and `reporter_type = 'registered'`. Otherwise `resident_id = None` and `reporter_type = 'guest'`.
- **Form Parameters:**
  - `category` (`str`, required): Issue category (e.g. "Roads & Bridges", "Water & Drainage", "Street Lighting", "Public Facilities").
  - `description` (`str`, required): Issue details (validated: min 10 chars, max 5000 chars).
  - `lat` (`float`, optional/form): Latitude in WGS84 decimal degrees.
  - `lng` (`float`, optional/form): Longitude in WGS84 decimal degrees.
  - `location_string` (`str`, optional): Human-readable street address or landmark.
  - `location_barangay` (`str`, optional): Specific Caloocan Barangay name.
  - `contact_email` (`str`, optional): Guest notification email.
  - `contact_phone` (`str`, optional): Guest notification mobile number.
  - `submission_source` (`str`, optional, default: `"web_guest"`): Origin client.
  - `image` (`UploadFile`, optional): Photographic evidence (validated: max 10MB, MIME + magic byte inspection for JPEG, PNG, WebP).
- **Processing Pipeline:**
  1. **Payload & Length Validation:** Rejects descriptions < 10 characters or > 5000 characters with `422 Unprocessable Entity`.
  2. **Caloocan Jurisdictional Boundary Check:** Point-in-polygon ray casting via `is_in_caloocan(lat, lng)`. Returns `400 Bad Request` if coordinates are outside Caloocan City borders.
  3. **Spatial Duplicate Prevention:** Queries active reports (`status not in ['resolved', 'cancelled', 'rejected']`) of identical category. If within 15 meters (`calculate_haversine_distance <= 0.015 km`), returns `409 Conflict` with `X-Canonical-Ticket-ID` header.
  4. **Upload Security & Magic Byte Inspection:** Inspects leading binary bytes:
     - JPEG: `b'\xff\xd8\xff'`
     - PNG: `b'\x89PNG\r\n\x1a\n'`
     - WebP: `b'RIFF' ... b'WEBP'`
     Saves upload to `uploads/reports/report_{id}_{hex}{ext}` and generates `/api/uploads/reports/...` URL.
  5. **Multi-Modal AI Triage (Gemini 1.5 Flash):** Executes `gemini_service.analyze_report(description, image_data=image_bytes)`. If AI flags `is_inappropriate=True`, immediately aborts and returns `400 Bad Request` with `rejection_reason`.
  6. **Token Generation & HMAC-SHA256 Hashing:** Generates 128-bit tracking token via `auth.generate_tracking_token()` (e.g. `TRK-9F83-A8B2-C4E6-10D7`). Hashes via `auth.hash_tracking_token(token)` and stores only the 64-character hex digest in `tracking_token_hash`.
  7. **Geocoding & 3NF Barangay Normalization:** Auto-detects `barangay_id` from master `barangays` table and reverse geocodes coordinates if address string is missing.
  8. **Initial Lifecycle Timeline:** Inserts an initial entry into `process_timelines` with `stage="received"`, `status="pending"`, `label="Report Received"`, `is_public=True`.
  9. **DBSCAN Geospatial Clustering:** Re-runs clustering on active reports to assign `cluster_id`.
  10. **Response Construction:** Injects plaintext `tracking_token` and `tracking_url` into the returned `ReportResponse` (available only once in this creation response).

#### Code Blueprint (`backend/main.py`):
```python
@app.post("/api/reports", response_model=schemas.ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_open_report(
    category: str = Form(...),
    description: str = Form(...),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    location_string: Optional[str] = Form(None),
    location_barangay: Optional[str] = Form(None),
    contact_email: Optional[str] = Form(None),
    contact_phone: Optional[str] = Form(None),
    submission_source: Optional[str] = Form("web_guest"),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: Optional[Union[models.Official, models.Resident]] = Depends(auth.get_optional_current_user)
):
    """
    Open report intake endpoint supporting both anonymous/guest and authenticated submissions.
    Executes boundary enforcement, spatial duplicate check, magic byte validation,
    multi-modal Gemini AI triage, cryptographic token generation, and DB persistence.
    """
    # 1. Payload validation
    clean_desc = (description or "").strip()
    if len(clean_desc) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Description must be at least 10 characters."
        )
    if len(clean_desc) > 5000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Description exceeds maximum allowable length of 5000 characters."
        )

    # 2. Jurisdictional Boundary Check
    if lat is not None and lng is not None:
        if not is_in_caloocan(lat, lng):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Location (Lat: {lat}, Lng: {lng}) is outside the jurisdiction of Caloocan City. Please move the pin within the city borders."
            )

    # 3. Spatial Duplicate Check (15-meter proximity threshold)
    if lat is not None and lng is not None:
        active_reports = db.query(models.Report).filter(
            models.Report.category == category,
            models.Report.status.notin_(["resolved", "cancelled", "rejected"]),
            models.Report.location_lat.isnot(None),
            models.Report.location_lng.isnot(None)
        ).all()
        for r in active_reports:
            dist_km = calculate_haversine_distance(lat, lng, r.location_lat, r.location_lng)
            if dist_km * 1000.0 <= 15.0: # 15 meters
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A report for '{category}' at this exact location is already being processed.",
                    headers={"X-Canonical-Ticket-ID": r.ticket_id or ""}
                )

    # 4. Upload Security & Magic Byte Inspection
    image_bytes = None
    image_url = None
    if image:
        image_bytes = await image.read()
        if len(image_bytes) > 10 * 1024 * 1024: # 10MB ceiling
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Uploaded file exceeds 10MB ceiling."
            )
        
        # Magic byte signature check
        is_jpeg = image_bytes.startswith(b'\xff\xd8\xff')
        is_png = image_bytes.startswith(b'\x89PNG\r\n\x1a\n')
        is_webp = image_bytes.startswith(b'RIFF') and b'WEBP' in image_bytes[:16]
        if not (is_jpeg or is_png or is_webp):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Uploaded file must be a valid JPEG, PNG, or WebP image."
            )

        file_extension = os.path.splitext(image.filename)[1].lower() if image.filename else ".jpg"
        if file_extension not in [".jpg", ".jpeg", ".png", ".webp"]:
            file_extension = ".jpg" if is_jpeg else (".png" if is_png else ".webp")
            
        unique_filename = f"report_{secrets.token_hex(8)}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        with open(file_path, "wb") as buffer:
            buffer.write(image_bytes)
        image_url = f"/api/uploads/reports/{unique_filename}"

    # 5. Advanced Multi-Modal AI Triage (Gemini 1.5 Flash)
    ai_analysis = gemini_service.analyze_report(clean_desc, image_data=image_bytes)
    if ai_analysis and ai_analysis.get("is_inappropriate"):
        reason = ai_analysis.get("rejection_reason", "Inappropriate content detected.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Report rejected by AI Safety Filter: {reason}"
        )

    # 6. Auto-reverse-geocode address if missing
    final_location_string = location_string
    if lat is not None and lng is not None:
        if not final_location_string or final_location_string.startswith("Lat:"):
            final_location_string = await maps_service.reverse_geocode(lat, lng)

    # 7. Cryptographic Token Generation & Hashing
    plaintext_token = auth.generate_tracking_token() # e.g. TRK-XXXX-XXXX-XXXX-XXXX
    token_hash = auth.hash_tracking_token(plaintext_token)

    # Determine Reporter Identity
    is_registered_resident = isinstance(current_user, models.Resident)
    resident_id = current_user.id if is_registered_resident else None
    reporter_type = "registered" if is_registered_resident else "guest"
    submission_src = submission_source or ("web_resident" if is_registered_resident else "web_guest")

    # 8. Report DTO & Database Persistence
    report_dto = schemas.ReportCreate(
        category=category,
        description=clean_desc,
        location_lat=lat,
        location_lng=lng,
        location_string=final_location_string,
        location_barangay=location_barangay,
        contact_email=contact_email,
        contact_phone=contact_phone,
        submission_source=submission_src,
        image_url=image_url,
        reporter_type=reporter_type
    )

    db_report = crud.create_report(
        db=db,
        report=report_dto,
        resident_id=resident_id,
        ai_analysis=ai_analysis,
        tracking_token_hash=token_hash
    )

    # 9. Initial Lifecycle Process Timeline Entry
    crud._append_timeline(
        db=db,
        report_id=db_report.id,
        status="pending",
        note="Report logged and queued for engineering assessment.",
        is_public=True
    )
    db.commit()
    db.refresh(db_report)

    # 10. Geospatial DBSCAN Clustering
    recent_reports = db.query(models.Report).filter(
        models.Report.status != "resolved",
        models.Report.location_lat.isnot(None),
        models.Report.location_lng.isnot(None)
    ).all()
    if len(recent_reports) > 1:
        report_list = [
            {
                'id': r.id,
                'latitude': r.location_lat,
                'longitude': r.location_lng,
                'category': r.category,
                'severity_score': r.severity_score or 0.0
            }
            for r in recent_reports
        ]
        clustered = deduplication_service.cluster_reports(report_list, epsilon_meters=10.0)
        for r_data in clustered:
            db_r = db.query(models.Report).filter(models.Report.id == r_data['id']).first()
            if db_r:
                db_r.cluster_id = r_data['cluster_id']
        db.commit()
        db.refresh(db_report)

    # 11. Attach Ephemeral Plaintext Credentials to Response
    db_report.tracking_token = plaintext_token
    db_report.tracking_url = f"https://pulso.caloocan.gov.ph/track?id={db_report.ticket_id}&code={plaintext_token}"
    
    return db_report
```

---

### 2.2 Endpoint 2: `POST /api/reports/track` (Public Status & Sanitized Timeline)

#### Specification & Behavior:
- **Route:** `POST /api/reports/track`
- **Status Code:** `200 OK`
- **Content-Type:** `application/json`
- **Authentication:** Public / Unauthenticated
- **Request Body (`schemas.ReportTrackRequest`):**
  - `ticket_id` (`str`, required): Ticket ID (e.g. `RPT-20260902-8F92E1B4`).
  - `tracking_token` (`str`, optional): Private tracking token.
  - `tracking_code` (`str`, optional): Alias for tracking token.
- **Verification & Anti-Enumeration:**
  - Queries `models.Report` by `ticket_id.strip().upper()`.
  - If report does not exist OR `tracking_token_hash` is NULL: returns uniform `404 Not Found` with `"Report not found or invalid tracking credentials."`
  - Validates token using constant-time `auth.verify_tracking_token(req.get_token(), report.tracking_token_hash)`.
  - If token fails: returns identical `404 Not Found` with `"Report not found or invalid tracking credentials."` (prevents ticket enumeration).
- **Public Data Projection & Redaction:**
  - **PII Redaction:** `contact_email`, `contact_phone`, `resident_id`, `reporter_name`, `citizen_trust_score`, `kyc_tier_at_report` are strictly omitted.
  - **Internal Data Redaction:** Internal `ai_reasoning`, prompt tokens, dispatcher operational notes, and contractor quotes are strictly omitted.
  - **Timeline Filtering:** Only entries from `process_timelines` where `is_public == True` are included.
  - **Location Representation:** Generalizes district code (`D3` for North Caloocan / lat >= 14.69; `D1` for South Caloocan) and provides public `location_summary`.

#### Code Blueprint (`backend/main.py`):
```python
@app.post("/api/reports/track", response_model=schemas.ReportTrackResponse)
def track_report_status(
    req: schemas.ReportTrackRequest,
    db: Session = Depends(get_db)
):
    """
    Public tracking endpoint requiring Ticket ID + Private Tracking Token.
    Performs constant-time HMAC verification, uniform anti-enumeration error handling,
    and returns a sanitized public timeline with strict PII and internal note redaction.
    """
    ticket_id = (req.ticket_id or "").strip().upper()
    try:
        provided_token = req.get_token()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or invalid tracking credentials."
        )

    # 1. Lookup report by Ticket ID
    report = db.query(models.Report).filter(
        func.upper(models.Report.ticket_id) == ticket_id
    ).first()

    # 2. Anti-enumeration verification: identical 404 for missing report or invalid token
    if not report or not report.tracking_token_hash:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or invalid tracking credentials."
        )

    if not auth.verify_tracking_token(provided_token, report.tracking_token_hash):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or invalid tracking credentials."
        )

    # 3. Retrieve Public Timeline Events (is_public=True only)
    timeline_events = db.query(gov_models.ProcessTimeline).filter(
        gov_models.ProcessTimeline.report_id == report.id,
        gov_models.ProcessTimeline.is_public == True
    ).order_by(gov_models.ProcessTimeline.created_at.asc()).all()

    public_timeline = [
        schemas.PublicTimelineItem(
            stage=getattr(e, 'stage', None) or e.status,
            status=e.status,
            label=getattr(e, 'label', None) or e.status.replace("_", " ").title(),
            note=e.note,
            timestamp=e.created_at,
            created_at=e.created_at
        )
        for e in timeline_events
    ]

    # 4. Synthesize Public Projections
    district_code = "D3" if (report.location_lat and report.location_lat >= 14.69) else ("D1" if report.location_lat else None)
    public_status_label = report.status.replace("_", " ").title()
    
    location_summary = None
    if report.location_string and report.location_barangay:
        location_summary = f"{report.location_string}, {report.location_barangay}"
    elif report.location_barangay:
        location_summary = f"{report.location_barangay}, Caloocan City"
    elif report.location_string:
        location_summary = report.location_string

    return schemas.ReportTrackResponse(
        ticket_id=report.ticket_id,
        category=report.category,
        description=report.description,
        status=report.status,
        public_status_label=public_status_label,
        created_at=report.created_at,
        updated_at=report.updated_at or report.created_at,
        location_barangay=report.location_barangay,
        location_summary=location_summary,
        location_string=report.location_string,
        image_url=report.image_url,
        resolution_image_url=report.resolution_image_url,
        is_claimed=report.is_claimed,
        public_timeline=public_timeline,
        timeline=public_timeline
    )
```

---

### 2.3 Endpoint 3: `POST /api/reports/{id}/claim` (Contextual Claiming)

#### Specification & Behavior:
- **Route:** `POST /api/reports/{report_id}/claim`
- **Status Code:** `200 OK`
- **Content-Type:** `application/json`
- **Authentication:** `Bearer <resident_jwt>` (`auth.get_current_user`). Requires a verified Resident account.
- **Request Body (`schemas.ReportClaimRequest`):**
  - `tracking_token` (`str`, optional): Private tracking token.
  - `tracking_code` (`str`, optional): Alias for tracking token.
- **Verification & State Invariants:**
  1. **Existence Check:** If `report_id` does not match any record, returns `404 Not Found`.
  2. **Idempotency & Same-User Ownership:** If `report.claimed_by_user_id == current_user.id`, returns `200 OK` with `"Report is already linked to your account."`
  3. **Third-Party Claim Conflict:** If `report.claimed_by_user_id` is set to another resident, returns `409 Conflict` with `"This report has already been claimed by another resident account."`
  4. **Registered Author Protection:** If `report.resident_id is not None and report.resident_id != current_user.id and report.reporter_type == "registered"`, returns `409 Conflict` with `"This report was authored by a registered account and cannot be claimed."`
  5. **Token Verification:** Validates `req.get_token()` against `report.tracking_token_hash`. Returns `403 Forbidden` with `"Invalid tracking token for this report."` on mismatch.
- **State Mutations:**
  - `report.claimed_by_user_id = current_user.id`
  - `report.claimed_at = datetime.now(timezone.utc)`
  - If `report.resident_id is None`: `report.resident_id = current_user.id`
  - `report.reporter_type = "registered"`
  - If user email or phone matches `report.contact_email` / `report.contact_phone`: sets `report.contact_verified = True`.
- **Immutable Audit & Notification:**
  - Inserts `gov_models.AuditLog(trigger_type="report_claimed", report_id=report.id, actor_role="resident", action=f"Guest report {report.ticket_id} claimed by resident {current_user.id}", details=json.dumps({"ticket_id": report.ticket_id, "user_id": current_user.id, "email": current_user.email}))`.
  - Creates `models.Notification(resident_id=current_user.id, title="Report Linked", message=f"Report #{report.ticket_id} ({report.category}) has been successfully linked to your account.")`.

#### Code Blueprint (`backend/main.py`):
```python
@app.post("/api/reports/{report_id}/claim", response_model=schemas.ReportClaimResponse)
def claim_guest_report(
    report_id: int,
    req: schemas.ReportClaimRequest,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(auth.get_current_user)
):
    """
    Authenticated resident endpoint to link a guest report to their account.
    Verifies proof of ownership via tracking token, executes atomic ownership binding,
    emits an immutable audit log and delivers an in-app confirmation notification.
    """
    # Restrict claiming to resident accounts
    if not isinstance(current_user, models.Resident):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only resident accounts can claim reports."
        )

    try:
        provided_token = req.get_token()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # 1. Lookup target report
    report = crud.get_report(db, report_id=report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found."
        )

    # 2. Check if already claimed
    if report.claimed_by_user_id is not None:
        if report.claimed_by_user_id == current_user.id:
            # Idempotent response for same resident
            return schemas.ReportClaimResponse(
                message="Report is already linked to your account.",
                report=schemas.ReportResponse.model_validate(report),
                success=True
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This report has already been claimed by another resident account."
        )

    # 3. Prevent claiming reports created by another registered user
    if report.resident_id is not None and report.resident_id != current_user.id and report.reporter_type == "registered":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This report was authored by a registered account and cannot be claimed."
        )

    # 4. Verify tracking token
    if not report.tracking_token_hash or not auth.verify_tracking_token(provided_token, report.tracking_token_hash):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid tracking token for this report."
        )

    # 5. Atomic Claim State Mutation
    now = datetime.now(timezone.utc)
    report.claimed_by_user_id = current_user.id
    report.claimed_at = now
    if report.resident_id is None:
        report.resident_id = current_user.id
    report.reporter_type = "registered"
    
    # Check for contact verification match
    if (report.contact_email and report.contact_email.lower() == current_user.email.lower()) or \
       (report.contact_phone and current_user.phone_number and report.contact_phone == current_user.phone_number):
        report.contact_verified = True

    db.commit()
    db.refresh(report)

    # 6. Immutable Audit Log Entry
    audit_entry = gov_models.AuditLog(
        trigger_type="report_claimed",
        report_id=report.id,
        actor_id=None, # Avoid FK violation on officials.id for resident actors
        actor_role="resident",
        action=f"Guest report {report.ticket_id} claimed by resident {current_user.id}",
        details=json.dumps({
            "ticket_id": report.ticket_id,
            "user_id": current_user.id,
            "email": current_user.email
        }),
        created_at=now
    )
    db.add(audit_entry)

    # 7. In-App Notification
    crud._create_notification(
        db=db,
        resident_id=current_user.id,
        title="Report Linked",
        message=f"Report #{report.ticket_id} ({report.category}) has been successfully linked to your account."
    )
    db.commit()

    return schemas.ReportClaimResponse(
        message="Report successfully linked to your account.",
        report=schemas.ReportResponse.model_validate(report),
        success=True
    )
```

---

### 2.4 Endpoint 4: `GET /api/me/reports` (Unified Resident Portfolio)

#### Specification & Behavior:
- **Route:** `GET /api/me/reports`
- **Status Code:** `200 OK`
- **Authentication:** `Bearer <resident_jwt>` (`auth.get_current_user`).
- **Query Parameters:**
  - `filter` (`str`, default: `"all"`): Filter key (`all`, `active`, `resolved`, `needs_information`).
  - `page` (`int`, default: `1`, minimum: `1`): Page number.
  - `limit` (`int`, default: `20`, range: `1..100`): Page size.
  - `skip` (`int`, optional): Offset override. If provided, overrides `(page - 1) * limit`.
- **Query Logic:**
  - Selects reports where `resident_id == current_user.id` OR `claimed_by_user_id == current_user.id`.
  - Applies status filtering:
    - `"all"`: All statuses.
    - `"active"`: `['pending', 'received', 'under_review', 'pending_approval', 'approved_internal', 'approved_for_action', 'dispatched', 'in_progress', 'validated']`.
    - `"resolved"`: `['resolved', 'closed', 'closed_by_citizen']`.
    - `"needs_information"`: `['needs_information', 'unverified']`.
  - Orders results by `created_at.desc()`.
  - Returns total count, applied filter, pagination metadata, and list of `ReportResponse`.

#### Legacy Route Alignment (`GET /api/reports/user/{user_id}`):
- Updates `GET /api/reports/user/{user_id}` to use the same unified ownership criteria `(resident_id == user_id) | (claimed_by_user_id == user_id)` to ensure backward compatibility for mobile and external API consumers.

#### Code Blueprint (`backend/main.py`):
```python
@app.get("/api/me/reports", response_model=schemas.UserReportsResponse)
def get_my_reports(
    filter: str = Query("all", pattern="^(all|active|resolved|needs_information)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    skip: Optional[int] = Query(None, ge=0),
    db: Session = Depends(get_db),
    current_user: Union[models.Resident, models.Official] = Depends(auth.get_current_user)
):
    """
    Unified resident portfolio query returning both authored (resident_id) and claimed (claimed_by_user_id) reports.
    Supports tab filtering: all, active, resolved, needs_information.
    """
    offset = skip if skip is not None else (page - 1) * limit

    # Base query for authored OR claimed reports
    query = db.query(models.Report).filter(
        or_(
            models.Report.resident_id == current_user.id,
            models.Report.claimed_by_user_id == current_user.id
        )
    )

    # Status filter tabs
    if filter == "active":
        query = query.filter(models.Report.status.in_([
            "pending", "received", "under_review", "pending_approval",
            "approved_internal", "approved_for_action", "dispatched",
            "in_progress", "validated"
        ]))
    elif filter == "resolved":
        query = query.filter(models.Report.status.in_([
            "resolved", "closed", "closed_by_citizen"
        ]))
    elif filter == "needs_information":
        query = query.filter(models.Report.status.in_([
            "needs_information", "unverified"
        ]))

    total = query.count()
    reports = query.order_by(models.Report.created_at.desc()).offset(offset).limit(limit).all()

    return schemas.UserReportsResponse(
        total=total,
        filter=filter,
        reports=[schemas.ReportResponse.model_validate(r) for r in reports],
        skip=offset,
        limit=limit
    )


@app.get("/api/reports/user/{user_id}", response_model=List[schemas.ReportResponse])
def read_user_reports_legacy(
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(auth.get_current_user)
):
    """
    Legacy user reports endpoint updated to return both authored and claimed reports.
    """
    if current_user.id != user_id and getattr(current_user, 'role', None) not in ["dispatcher", "manager", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to access these reports")
    
    query = db.query(models.Report).filter(
        or_(
            models.Report.resident_id == user_id,
            models.Report.claimed_by_user_id == user_id
        )
    )
    if status:
        query = query.filter(models.Report.status == status)
        
    return query.order_by(models.Report.created_at.desc()).offset(skip).limit(limit).all()
```

---

## 3. Supporting CRUD Refactoring (`backend/crud.py`)

To cleanly support `tracking_token_hash` and guest submissions (`resident_id=None`), `create_report` in `backend/crud.py` requires an optional `tracking_token_hash` parameter:

```python
def create_report(
    db: Session,
    report: schemas.ReportCreate,
    resident_id: Optional[int] = None,
    ai_analysis: Optional[dict] = None,
    tracking_token_hash: Optional[str] = None
) -> models.Report:
    """
    Creates a report row supporting both registered residents and unauthenticated guests.
    Properly populates tracking_token_hash, reporter_type, and location barangay resolution.
    """
    attempts = 0
    max_attempts = 5
    
    while attempts < max_attempts:
        try:
            report_data = report.model_dump()
            if tracking_token_hash:
                report_data["tracking_token_hash"] = tracking_token_hash
                
            if ai_analysis:
                report_data["ai_category"] = ai_analysis.get("category")
                report_data["ai_urgency"] = ai_analysis.get("urgency")
                report_data["ai_summary"] = ai_analysis.get("smart_summary")
                report_data["ai_reasoning"] = ai_analysis.get("reasoning")
                report_data["severity_score"] = ai_analysis.get("severity_score", 0.0)
                report_data["ai_metadata"] = json.dumps(ai_analysis) if ai_analysis else None
                
            # Location barangay normalization
            if not report_data.get("location_barangay"):
                loc_str = report_data.get("location_string", "")
                if loc_str and "Barangay" in loc_str:
                    match = re.search(r"(Barangay\s+[^|,]+)", loc_str, re.IGNORECASE)
                    if match:
                        report_data["location_barangay"] = match.group(1).strip()
                        
                # Fallback to reporter home barangay if resident is registered
                if not report_data.get("location_barangay") and resident_id:
                    res = db.query(models.Resident).filter(models.Resident.id == resident_id).first()
                    if res:
                        if res.barangay_ref:
                            report_data["location_barangay"] = res.barangay_ref.name
                        report_data["kyc_tier_at_report"] = res.kyc_level
                        report_data["citizen_trust_score"] = res.trust_score

            # Auto-detect barangay_id from master table
            if report_data.get("location_barangay"):
                brgy_name = report_data["location_barangay"].lower().replace("barangay", "").strip()
                brgy = db.query(models.Barangay).filter(
                    (func.lower(models.Barangay.name) == brgy_name) | 
                    (models.Barangay.name == report_data["location_barangay"])
                ).first()
                if brgy:
                    report_data["barangay_id"] = brgy.id

            new_ticket_id = models.generate_ticket_id()
            db_report = models.Report(
                **report_data,
                resident_id=resident_id,
                ticket_id=new_ticket_id
            )
            db.add(db_report)
            db.commit()
            db.refresh(db_report)
            return db_report

        except IntegrityError as e:
            db.rollback()
            error_msg = str(e).lower()
            if "ix_reports_ticket_id" in error_msg or "reports_ticket_id_key" in error_msg:
                attempts += 1
                continue
            raise e

    raise Exception("Critical: Failed to generate a unique ticket_id after 5 attempts.")
```

---

## 4. Edge Cases & Handling Matrix

| # | Scenario / Edge Case | Test / Request Condition | Handled Behavior & HTTP Status |
|---|---|---|---|
| 1 | Unauthenticated Guest Report | `POST /api/reports` without `Authorization` header | Creates report with `resident_id=NULL`, `reporter_type='guest'`, stores salted HMAC hash, returns plaintext token in response (`201 Created`). |
| 2 | Authenticated Resident Report | `POST /api/reports` with `Bearer <resident_jwt>` | Creates report with `resident_id=user.id`, `reporter_type='registered'`, stores HMAC hash, populates resident trust score (`201 Created`). |
| 3 | Out of Jurisdiction Location | Pin placed outside Caloocan bounds (e.g. Lat 14.59, Lng 120.98) | Ray-casting detects boundary violation -> Returns `400 Bad Request` citing Caloocan City jurisdiction. |
| 4 | Spatial Duplicate Proximity | Proximity <= 15m to active report with identical category | Haversine delta check trips -> Returns `409 Conflict` with `X-Canonical-Ticket-ID`. |
| 5 | Malicious / Oversized Image | File size > 10MB or executable masquerading as `.jpg` | Magic byte check fails -> Returns `422 Unprocessable Entity` ("Uploaded file must be a valid JPEG, PNG, or WebP image."). |
| 6 | Inappropriate Image Content | Selfie or non-infrastructure image | Gemini multi-modal moderation flags `is_inappropriate=True` -> Returns `400 Bad Request` with rejection reason. |
| 7 | Tracking with Valid Token | Correct `ticket_id` + `tracking_token` | Returns `200 OK` with sanitized public timeline; all PII (`contact_email`, `contact_phone`, `resident_id`, `reporter_name`) and internal notes redacted. |
| 8 | Tracking with Invalid Token or Nonexistent Ticket | Wrong token or missing ticket ID | Returns uniform `404 Not Found` ("Report not found or invalid tracking credentials.") with zero enumeration leakage. |
| 9 | Claiming Unclaimed Guest Report | Valid `tracking_token` by logged-in resident | Binds `claimed_by_user_id = user.id`, creates `audit_logs` record, delivers `notifications` entry, returns `200 OK`. |
| 10 | Idempotent Re-Claim | Same user claiming already claimed report | Returns `200 OK` ("Report is already linked to your account."). |
| 11 | Claiming Third-Party Claimed Report | User B claiming report already claimed by User A | Returns `409 Conflict` ("This report has already been claimed by another resident account."). |
| 12 | Claiming Registered Report | User attempting to claim report authored by another registered user | Returns `409 Conflict` ("This report was authored by a registered account and cannot be claimed."). |
| 13 | Claiming with Invalid Token | Valid report ID but wrong tracking token | Returns `403 Forbidden` ("Invalid tracking token for this report."). |
| 14 | Unified Portfolio Tabs | `GET /api/me/reports?filter=active` | Returns reports where `(resident_id == user.id OR claimed_by_user_id == user.id)` filtered by active status states. |

---

## 5. Acceptance Criteria Traceability

| AC ID | Requirement | Endpoint Tested | Expected Outcome | Status in Blueprint |
|---|---|---|---|---|
| AC-API-01 | Open Guest Intake | `POST /api/reports` | `201 Created`, `reporter_type='guest'`, plaintext token returned | ✅ Fully Blueprint Specified |
| AC-API-02 | Registered Intake | `POST /api/reports` | `201 Created`, `resident_id=user.id`, `reporter_type='registered'` | ✅ Fully Blueprint Specified |
| AC-API-03 | Boundary Enforcement | `POST /api/reports` | `400 Bad Request` on coordinates outside Caloocan | ✅ Fully Blueprint Specified |
| AC-API-04 | Public Tracking Lookup | `POST /api/reports/track` | `200 OK`, sanitized timeline, strict PII redaction | ✅ Fully Blueprint Specified |
| AC-API-05 | Anti-Enumeration Security | `POST /api/reports/track` | `404 Not Found` uniform error for invalid ticket or token | ✅ Fully Blueprint Specified |
| AC-API-06 | Secure Report Claiming | `POST /api/reports/{id}/claim` | `200 OK`, `claimed_by_user_id` set, audit logged | ✅ Fully Blueprint Specified |
| AC-API-07 | Claim Conflict Handling | `POST /api/reports/{id}/claim` | `409 Conflict` on already claimed reports | ✅ Fully Blueprint Specified |
| AC-API-08 | Unified "My Reports" | `GET /api/me/reports` | `200 OK`, returns authored and claimed reports with filter tabs | ✅ Fully Blueprint Specified |
