from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional, List
from sqlalchemy.orm import Session
import auth
from dotenv import load_dotenv
import os
load_dotenv()

# Import the OCR, Gemini, and Maps services
import ocr_service
import gemini_service
import deduplication_service
import maps_service

# Database imports
import models, schemas, crud
import gov_models, gov_router           # Government-side modules
from database import engine, get_db

# Create ALL tables — citizen-side + government-side
models.Base.metadata.create_all(bind=engine)
gov_models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PULSO Backend API",
    description="City services platform for North Caloocan citizens.",
    version="2.0.0"
)

# Configure CORS so the Vite frontend and Flutter mobile app can access the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://10.0.2.2:8000",   # Android emulator → host loopback
        "http://localhost:8081",  # Flutter web dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Auth Utilities
# ---------------------------------------------------------------------------

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except auth.JWTError:
        raise credentials_exception
        
    user = crud.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user

def require_role(*roles):
    """Dependency factory: ensures current user has one of the given roles or is an executive/admin."""
    def _check(current_user: schemas.UserResponse = Depends(get_current_user)):
        # Inherently grant system administrators and senior executives access to manager/dispatcher functions
        expanded_roles = list(roles)
        if "manager" in roles or "dispatcher" in roles:
            expanded_roles.extend([
                "system_admin", "city_engineer", "asst_city_engineer", 
                "admin_officer", "division_chief", "admin_clerk"
            ])
            
        if current_user.role not in expanded_roles:
            raise HTTPException(status_code=403, detail=f"Unauthorized. Requires active role clearance.")
        return current_user
    return _check

# ─────────────────────────────────────────────────────────────────────────────
# Register Government-Side Router
# ─────────────────────────────────────────────────────────────────────────────

# gov_router imports get_current_user directly from auth.py
app.include_router(gov_router.router)

# ---------------------------------------------------------------------------
# Health & Root
# ---------------------------------------------------------------------------

class StatusResponse(BaseModel):
    status: str
    message: str

@app.get("/", response_model=StatusResponse)
async def root():
    return {"status": "online", "message": "PULSO Backend API v2 is running."}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "PULSO Core Engine"}

# ---------------------------------------------------------------------------
# OCR / ID Verification
# ---------------------------------------------------------------------------

@app.post("/api/verify-residency")
async def verify_residency(
    idFront: UploadFile = File(...),
    idBack: Optional[UploadFile] = File(None)
):
    """
    Receives front and back ID images, performs OCR,
    and verifies if the address is within North Caloocan (Brgy 165-188).
    """
    front_bytes = await idFront.read()
    back_bytes = await idBack.read() if idBack else None
    
    result = await ocr_service.perform_ocr(front_bytes, back_bytes)
    return result

# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    user.password = auth.get_password_hash(user.password)
    return crud.create_user(db=db, user=user)

@app.post("/api/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    from datetime import timedelta
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "barangay": user.barangay,
            "phone_number": user.phone_number,
            "created_at": user.created_at
        }
    }

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@app.post("/api/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=req.email)
    if not user:
        # For security, don't reveal if user exists. Just return success.
        return {"message": "If this account exists, a recovery link has been sent."}
    
    # Generate a secure token
    import secrets
    from datetime import datetime, timedelta
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)
    
    # Save to DB
    reset_token = models.PasswordResetToken(
        email=req.email,
        token=token,
        expires_at=expires
    )
    db.add(reset_token)
    db.commit()

    reset_link = f"http://localhost:5173/reset-password?token={token}"

    # -------------------------------------------------------------------------
    # PROFESSIONAL HTML EMAIL TEMPLATE (PULSO THEME)
    # -------------------------------------------------------------------------
    email_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #0f172a; }}
            .container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }}
            .header {{ background: linear-gradient(135deg, #ea580c 0%, #4338ca 100%); padding: 40px 20px; text-align: center; color: #ffffff; }}
            .header h1 {{ margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.025em; text-transform: uppercase; }}
            .header p {{ margin-top: 5px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; opacity: 0.8; }}
            .content {{ padding: 40px; text-align: center; }}
            .content h2 {{ font-size: 24px; font-weight: 900; color: #0f172a; margin-bottom: 15px; letter-spacing: -0.025em; }}
            .content p {{ font-size: 16px; line-height: 1.6; color: #64748b; margin-bottom: 30px; }}
            .btn {{ display: inline-block; padding: 18px 36px; background-color: #4338ca; color: #ffffff !important; font-weight: 900; text-decoration: none; border-radius: 14px; text-transform: uppercase; font-size: 13px; letter-spacing: 0.1em; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transition: all 0.2s ease; }}
            .token-box {{ display: inline-block; margin-top: 30px; padding: 12px 20px; background-color: #f1f5f9; border-radius: 12px; font-family: monospace; font-size: 11px; color: #94a3b8; border: 1px solid #e2e8f0; word-break: break-all; width: 80%; }}
            .footer {{ background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #f1f5f9; }}
            .footer p {{ font-size: 11px; color: #94a3b8; margin: 5px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }}
            .security-notice {{ margin-top: 25px; padding: 15px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; color: #b91c1c; font-size: 12px; font-weight: 600; text-align: left; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>PULSO</h1>
                <p>Unified Command Center | LGU Caloocan</p>
            </div>
            <div class="content">
                <h2>Security Credential Update</h2>
                <p>A password recovery protocol has been requested for your official personnel account.</p>
                <a href="{reset_link}" class="btn">Authorize Reset</a>
                <p style="margin-top: 35px; font-size: 13px;">This link will expire in <strong>1 hour</strong> as part of our automated security compliance.</p>
                <div class="security-notice">
                    <div style="font-weight: 900; margin-bottom: 5px;">⚠️ SECURITY ADVISORY</div>
                    If you did not initiate this recovery protocol, please disregard this email. No access has been granted to your account.
                </div>
                <div class="token-box">
                    Protocol ID: {token}
                </div>
            </div>
            <div class="footer">
                <p>CITY ENGINEERING OFFICE</p>
                <p>REPUBLIC OF THE PHILIPPINES | CALOOCAN CITY HALL</p>
                <p>&copy; 2025 PULSO INFRASTRUCTURE OPERATIONS</p>
            </div>
        </div>
    </body>
    </html>
    """

    # -------------------------------------------------------------------------
    # EMULATION OF EMAIL SENDING
    # -------------------------------------------------------------------------
    # reset_link already defined above
    
    # Check if SMTP is configured in .env (Add these to .env if you want real emails)
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASS = os.getenv("SMTP_PASS")
    
    print(f"\n[SECURITY PROTOCOL] Password recovery initiated for: {req.email}")
    print(f"[RECOVERY LINK] {reset_link}\n")
    
    if SMTP_USER and SMTP_PASS:
        try:
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText
            
            # Clean app password (remove spaces)
            clean_pass = SMTP_PASS.replace(" ", "")
            
            # Use Multi-part email for HTML/Text compatibility
            msg = MIMEMultipart('alternative')
            msg['Subject'] = '【PULSO Security】 Official Password Recovery Authorization'
            msg['From'] = f"PULSO Security <{SMTP_USER}>"
            msg['To'] = req.email
            
            # Fallback text
            text = f"PULSO Security Protocol: Recover your password at {reset_link}"
            
            # Attach both versions
            msg.attach(MIMEText(text, 'plain'))
            msg.attach(MIMEText(email_html, 'html'))
            
            # Connect via Gmail's SSL port
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(SMTP_USER, clean_pass)
                server.send_message(msg)
                print(f"[MAIL SYSTEM] SUCCESS: Recovery email dispatched to {req.email}")
        except Exception as e:
            print(f"\n[MAIL ERROR] System failed to dispatch email: {e}")
    else:
        print("[NOTICE] Real email sending skipped (SMTP_USER/PASS not found in .env). Link printed to terminal above.")
        
    return {"message": "Recovery protocol initiated. Check your official inbox."}

@app.get("/api/auth/verify-token/{token}")
async def verify_token(token: str, db: Session = Depends(get_db)):
    import datetime
    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == token,
        models.PasswordResetToken.used == False,
        models.PasswordResetToken.expires_at > datetime.datetime.utcnow()
    ).first()
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Security token invalid or expired.")
    
    return {"message": "Identity Token Verified", "email_hint": f"{reset_token.email[:3]}***@{reset_token.email.split('@')[1]}"}

@app.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    # Find active token
    import datetime
    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == req.token,
        models.PasswordResetToken.used == False,
        models.PasswordResetToken.expires_at > datetime.datetime.utcnow()
    ).first()
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Security token invalid or expired.")
    
    # Find user
    user = db.query(models.User).filter(models.User.email == reset_token.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Internal identity not found.")
    
    # Update password
    user.password_hash = auth.get_password_hash(req.new_password)
    reset_token.used = True
    db.commit()
    
    print(f"[SECURITY UPDATE] Password successfully reset for: {user.email}")
    return {"message": "Protocol complete. Password updated."}
# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@app.get("/api/me", response_model=schemas.UserResponse)
def get_me(current_user: schemas.UserResponse = Depends(get_current_user)):
    """Returns the currently authenticated user's profile."""
    return current_user

@app.get("/api/users", response_model=List[schemas.UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(require_role("manager"))
):
    """List all users. Manager only."""
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@app.get("/api/users/{user_id}", response_model=schemas.UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    if current_user.id != user_id and current_user.role not in ["dispatcher", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this user")
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.patch("/api/users/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this user")
    db_user = crud.update_user(db, user_id=user_id, user_update=user_update)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

class ReportStatusUpdate(BaseModel):
    status: str

def _enrich_report(report, db: Session):
    """Attach reporter_name to a report object for serialization."""
    if report is None:
        return None
    reporter = db.query(models.User).filter(models.User.id == report.user_id).first()
    report.reporter_name = reporter.full_name if reporter else None
    return report

@app.get("/api/reports/stats", response_model=schemas.ReportStats)
def get_report_stats(
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(require_role("manager", "dispatcher"))
):
    """Returns aggregated report counts by status. For management KPI dashboard."""
    return crud.get_report_stats(db)

@app.get("/api/reports", response_model=List[schemas.ReportResponse])
def read_reports(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(require_role("dispatcher", "manager"))
):
    reports = crud.get_reports(db, skip=skip, limit=limit)
    # Optional server-side status filter
    if status:
        reports = [r for r in reports if r.status == status]
    # Enrich with reporter names
    for r in reports:
        reporter = db.query(models.User).filter(models.User.id == r.user_id).first()
        r.reporter_name = reporter.full_name if reporter else None
    return reports

@app.get("/api/reports/user/{user_id}", response_model=List[schemas.ReportResponse])
def read_user_reports(
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    if current_user.id != user_id and current_user.role not in ["dispatcher", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to access these reports")
    return crud.get_reports_by_user(db, user_id=user_id, skip=skip, limit=limit)

@app.get("/api/reports/{report_id}", response_model=schemas.ReportResponse)
def read_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """Get a single report by ID. Residents can only see their own."""
    db_report = crud.get_report(db, report_id=report_id)
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if current_user.role == "resident" and db_report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this report")
    return _enrich_report(db_report, db)

@app.post("/api/reports", response_model=schemas.ReportResponse)
async def create_new_report(
    report: schemas.ReportCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    # 1. AI Triage
    ai_analysis = gemini_service.analyze_report(report.description)

    # 2. Auto-reverse-geocode: replace raw 'Lat: X, Lng: Y' with a real address
    if report.location_lat and report.location_lng:
        if not report.location_string or report.location_string.startswith("Lat:"):
            report.location_string = await maps_service.reverse_geocode(
                report.location_lat, report.location_lng
            )

    # 3. Database Creation
    db_report = crud.create_report(db=db, report=report, user_id=current_user.id, ai_analysis=ai_analysis)

    # 4. Geospatial Deduplication
    recent_reports = db.query(models.Report).filter(
        models.Report.status != "resolved",
        models.Report.location_lat != None,
        models.Report.location_lng != None
    ).all()

    if len(recent_reports) > 1:
        report_list = []
        for r in recent_reports:
            report_list.append({
                'id': r.id,
                'latitude': r.location_lat,
                'longitude': r.location_lng,
                'category': r.category,
                'severity_score': r.severity_score
            })
        clustered = deduplication_service.cluster_reports(report_list, epsilon_meters=10.0)
        for r_data in clustered:
            db_r = db.query(models.Report).filter(models.Report.id == r_data['id']).first()
            if db_r:
                db_r.cluster_id = r_data['cluster_id']
        db.commit()
        db.refresh(db_report)

    return db_report


# ---------------------------------------------------------------------------
# Geocoding Proxy Endpoints  (keeps Google API key server-side)
# ---------------------------------------------------------------------------

@app.get("/api/geocode/reverse")
async def geocode_reverse(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Reverse-geocode GPS coordinates → human-readable address.
    Proxies through the backend so the Maps API key is never exposed to clients.
    """
    address = await maps_service.reverse_geocode(lat, lng)
    return {"address": address, "lat": lat, "lng": lng}


@app.get("/api/geocode/search")
async def geocode_search(
    q: str = Query(..., min_length=2, description="Search query"),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Forward geocode / place search.
    Returns up to 5 matching places within North Caloocan.
    """
    results = await maps_service.forward_geocode(q)
    return {"results": results}

@app.patch("/api/reports/{report_id}/status", response_model=schemas.ReportResponse)
def update_report_status(
    report_id: int,
    status_update: ReportStatusUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(require_role("dispatcher", "manager"))
):
    """Generic status update. Dispatchers/Managers and Admins only."""
    updated_report = crud.update_report_status(db=db, report_id=report_id, status=status_update.status, actor_id=current_user.id)
    if not updated_report:
        raise HTTPException(status_code=404, detail="Report not found")
    return _enrich_report(updated_report, db)

@app.patch("/api/reports/{report_id}/reject", response_model=schemas.ReportResponse)
def reject_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(require_role("dispatcher", "manager"))
):
    """Reject a report (sets status to 'rejected' and notifies user)."""
    updated = crud.reject_report(db, report_id=report_id, actor_id=current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Report not found")
    return _enrich_report(updated, db)

@app.patch("/api/reports/{report_id}/dispatch", response_model=schemas.ReportResponse)
def dispatch_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(require_role("dispatcher", "manager"))
):
    """Dispatch a report (approved_internal → dispatched)."""
    db_report = crud.get_report(db, report_id=report_id)
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
    if db_report.status != "approved_internal":
        raise HTTPException(status_code=400, detail=f"Cannot dispatch report with status '{db_report.status}'. Must be 'approved_internal'.")
    updated = crud.update_report_status(db, report_id=report_id, status="dispatched", actor_id=current_user.id)
    return _enrich_report(updated, db)

@app.patch("/api/reports/{report_id}/resolve", response_model=schemas.ReportResponse)
def resolve_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(require_role("dispatcher", "manager"))
):
    """Mark a dispatched report as resolved."""
    db_report = crud.get_report(db, report_id=report_id)
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
    if db_report.status != "dispatched":
        raise HTTPException(status_code=400, detail=f"Cannot resolve report with status '{db_report.status}'. Must be 'dispatched'.")
    updated = crud.update_report_status(db, report_id=report_id, status="resolved", actor_id=current_user.id)
    return _enrich_report(updated, db)

@app.delete("/api/reports/{report_id}")
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(require_role("dispatcher", "manager"))
):
    """Hard-delete a report. Dispatcher and manager only."""
    success = crud.delete_report(db, report_id=report_id)
    if not success:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": f"Report {report_id} deleted successfully"}

# ---------------------------------------------------------------------------
# Advisories
# ---------------------------------------------------------------------------

@app.get("/api/advisories", response_model=List[schemas.AdvisoryResponse])
def read_advisories(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    return crud.get_advisories(db, skip=skip, limit=limit)

@app.post("/api/advisories", response_model=schemas.AdvisoryResponse)
def create_advisory_route(
    advisory: schemas.AdvisoryCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(require_role("manager", "dispatcher"))
):
    return crud.create_advisory(db=db, advisory=advisory)

@app.delete("/api/advisories/{advisory_id}")
def delete_advisory(
    advisory_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(require_role("manager"))
):
    """Delete an advisory. Manager only."""
    success = crud.delete_advisory(db, advisory_id=advisory_id)
    if not success:
        raise HTTPException(status_code=404, detail="Advisory not found")
    return {"message": f"Advisory {advisory_id} deleted successfully"}

# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

@app.get("/api/notifications/user/{user_id}", response_model=List[schemas.NotificationResponse])
def read_user_notifications(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access these notifications")
    return crud.get_notifications_by_user(db, user_id=user_id, skip=skip, limit=limit)

@app.patch("/api/notifications/user/{user_id}/read")
def mark_user_notifications_read(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """Mark ALL notifications for a user as read."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify these notifications")
    crud.mark_notifications_read(db, user_id=user_id)
    return {"message": "All notifications marked as read"}

@app.patch("/api/notifications/{notification_id}/read")
def mark_single_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """Mark a single notification as read."""
    success = crud.mark_notification_read(db, notification_id=notification_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found or not yours")
    return {"message": "Notification marked as read"}

# ---------------------------------------------------------------------------
# Government Workflows (Work Orders, etc.)
# ---------------------------------------------------------------------------

@app.get("/api/work-orders", response_model=List[schemas.WorkOrderResponse])
def read_work_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(require_role("dispatcher", "manager", "engineer"))
):
    return crud.get_work_orders(db, skip=skip, limit=limit)

@app.post("/api/work-orders", response_model=schemas.WorkOrderResponse)
def create_new_work_order(
    wo: schemas.WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(require_role("dispatcher", "manager"))
):
    """
    Creates a formal government work order.
    If linked to a citizen report, this automatically initiates an AuditLog
    and advances the ProcessTimeline process dynamically.
    """
    return crud.create_work_order(db=db, wo=wo, assigned_by_id=current_user.id)

# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
