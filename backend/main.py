from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status, Query, Request
from datetime import datetime, timedelta, timezone
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import shutil
import httpx
import socket
from typing import Optional, List, Union
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import auth
import secrets
from dotenv import load_dotenv
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random
import urllib.request
import xml.etree.ElementTree as ET
import email.utils
from html import unescape
load_dotenv()

RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY", "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe") # Default to test key

# Import the OCR, Gemini, and Maps services
import ocr_service
import gemini_service
import deduplication_service
import maps_service

# Database imports
import gov_models, gov_router, gov_schemas, gov_crud           # Government-side modules
import models, schemas, crud
import analytics_router                 # AI Analytics & Intelligence Engine
import philsys_router                   # PhilSys Check Authentication (PSA)
import predictive_router                # Predictive Maintenance Engine
import document_router                  # System Document & FQA Manager
from database import engine, get_db
from utils.geometry_utils import is_in_caloocan, calculate_haversine_distance
from utils.rate_limiter import report_submission_limiter, tracking_query_limiter, claim_limiter

# Create ALL tables — citizen-side + government-side
models.Base.metadata.create_all(bind=engine)
gov_models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="pulso-backend",
    description="City services platform for North Caloocan citizens.",
    version="2.0.0"
)

# ---------------------------------------------------------------------------
# Static File Serving (for report images & assets)
# ---------------------------------------------------------------------------
UPLOAD_DIR = "uploads/reports"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/api/uploads", StaticFiles(directory="uploads"), name="uploads")

from fastapi.responses import FileResponse
@app.get("/api/download/agent-app")
async def download_agent_app():
    """
    Official APK distribution endpoint. 
    Forces the correct Android MIME type to prevent browsers from renaming it to .zip.
    """
    # Look for the APK in the shared production path
    apk_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "apk", "pulso-agent.apk")
    
    if not os.path.exists(apk_path):
        # Local fallback if sibling directory is not accessible
        apk_path = "pulso-agent.apk"
        
    if not os.path.exists(apk_path):
        raise HTTPException(status_code=404, detail="PULSO Agent APK not found on server.")

    return FileResponse(
        path=apk_path,
        filename="pulso-agent.apk",
        media_type="application/vnd.android.package-archive"
    )

@app.get("/api/geo/caloocan-border")
async def get_caloocan_border(sector: Optional[str] = Query(None)):
    """Returns Caloocan City boundary GeoJSON for map visualization with optional sector filtering."""
    import json
    border_path = os.path.join(os.path.dirname(__file__), "caloocan_border.json")
    if not os.path.exists(border_path):
        return {"type": "FeatureCollection", "features": []}
    
    with open(border_path, 'r') as f:
        data = json.load(f)
        
    if sector:
        # Filter features based on the provided sector (e.g., 'North' or 'South')
        data["features"] = [f for f in data.get("features", []) 
                           if f.get("properties", {}).get("sector") == sector]
    
    return data

@app.get("/api/download/resident-app")
async def download_resident_app():
    """
    Official Resident APK distribution endpoint.
    """
    # Look for the APK in the shared production path
    apk_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "apk", "pulso-resident.apk")
    
    if not os.path.exists(apk_path):
        raise HTTPException(status_code=404, detail="PULSO Resident APK not found on server.")

    return FileResponse(
        path=apk_path,
        filename="pulso-resident.apk",
        media_type="application/vnd.android.package-archive"
    )

# Configure CORS so the Vite frontend and Flutter mobile app can access the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/system/ip")
async def get_system_ip():
    """
    Returns the current local network IP address of the server.
    Used by the frontend to dynamically update download links for mobile devices.
    """
    try:
        # Create a dummy socket to detect the preferred interface/IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0)
        try:
            # doesn't even have to be reachable
            s.connect(('10.254.254.254', 1))
            IP = s.getsockname()[0]
        except Exception:
            IP = '127.0.0.1'
        finally:
            s.close()
        return {"ip": IP}
    except Exception:
        # Fallback to standard hostname resolution
        try:
            hostname = socket.gethostname()
            IP = socket.gethostbyname(hostname)
            return {"ip": IP}
        except:
            return {"ip": "127.0.0.1"}

# ---------------------------------------------------------------------------
# Included Routers — Government-Side & Analytics Engine
# ---------------------------------------------------------------------------
# Routers are included once later to avoid duplication

# ---------------------------------------------------------------------------
# Auth Utilities
# ---------------------------------------------------------------------------

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

class VerificationRequest(BaseModel):
    email: str
    code: Optional[str] = None

# send_otp_email was consolidated below to handle all notification types

# Use centralized auth.get_current_user from auth.py (includes DB session management)
get_current_user = auth.get_current_user

def require_role(*roles):
    """Dependency factory: ensures current user has one of the given roles or is an executive/admin."""
    def _check(current_user: Union[models.Official, models.Resident] = Depends(get_current_user)):
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

# ---------------------------------------------------------------------------
# Email / Verification Utilities
# ---------------------------------------------------------------------------

SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

# Consolidating send_otp_email logic



async def verify_recaptcha(token: str):
    """Verifies reCAPTCHA token with Google."""
    if not token:
        return False
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={
                    "secret": RECAPTCHA_SECRET_KEY,
                    "response": token
                }
            )
            data = response.json()
            return data.get("success", False)
        except Exception as e:
            print(f"reCAPTCHA verification error: {e}")
            return False

# ─────────────────────────────────────────────────────────────────────────────
# Register Government-Side Router
# ─────────────────────────────────────────────────────────────────────────────

# gov_router imports get_current_user directly from auth.py
app.include_router(gov_router.router)
# AI Analytics & Intelligence Engine
app.include_router(analytics_router.router)
# PhilSys Check Authentication (PSA National ID Verification)
app.include_router(philsys_router.router)
# Predictive Maintenance Engine
app.include_router(predictive_router.router)
# System Document tracking & validation (FQA)
app.include_router(document_router.router, prefix="/api/gov/documents", tags=["System Documents"])

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

@app.get("/api/ai/rate-limits")
async def ai_rate_limit_status(
    current_user: Union[models.Official, models.Resident] = Depends(require_role("manager"))
):
    """
    Returns current AI API usage stats for billing monitoring.
    Only accessible by managers/admins to track consumption.
    """
    return gemini_service.get_rate_limit_stats()

class AIChatRequest(BaseModel):
    query: str
    context: Optional[str] = None

@app.post("/api/ai/assistant")
async def ai_omni_assistant(
    req: AIChatRequest,
    current_user: Union[models.Official, models.Resident] = Depends(get_current_user)
):
    """
    PULSO Omni-Assistant: AI integration for all screens and inputs.
    Contextual assistance for citizens and LGU engineers.
    """
    # Auto-inject user identity into context
    user_ctx = f"User: {current_user.full_name} ({current_user.role}). Context: {req.context or 'General Dashboard'}"
    return gemini_service.get_ai_assistant_response(req.query, context=user_ctx)

# ---------------------------------------------------------------------------
# OCR / ID Verification
# ---------------------------------------------------------------------------

@app.post("/api/verify-residency")
async def verify_residency(
    idFront: UploadFile = File(...),
    idBack: UploadFile = File(...)
):
    """
    Receives front and back ID images, performs OCR,
    and verifies if the address is within North Caloocan (Brgy 165-188).
    """
    front_bytes = await idFront.read()
    back_bytes = await idBack.read() if idBack else None
    
    result = await ocr_service.perform_ocr(front_bytes, back_bytes)
    
    # STRICT VALIDATION: If the AI or heuristic detected a mismatch, block the scan
    extracted = result.get("extracted_data", {})
    if extracted.get("is_document_mismatch"):
        reason = extracted.get("mismatch_reason", "ID verification failed: Document mismatch detected.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)
    
    # RESIDENCY ENFORCEMENT: Fail if the ID is not from North Caloocan
    if not extracted.get("is_north_caloocan"):
        reason = extracted.get("verification_message", "Residency check failed: Address is outside North Caloocan (Barangays 165-188).")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

    return result

# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

@app.post("/api/auth/register", response_model=schemas.ResidentResponse)
def register_user(user: schemas.ResidentCreate, db: Session = Depends(get_db)):
    # Enforce lowercase and remove trailing spaces added by mobile keyboards
    user.email = user.email.strip().lower()

    # STRICT EMAIL VALIDATION: Reject place-holders or obvious fake emails
    import re
    email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    if not re.match(email_regex, user.email):
        raise HTTPException(status_code=400, detail="Invalid email format. Please provide a real email.")
    
    # Block obviously fake domains
    blocked_domains = ["example.com", "email.com", "test.com", "fake.com", "mailinator.com", "tempmail.com"]
    if any(domain in user.email for domain in blocked_domains):
        raise HTTPException(status_code=400, detail="Please use a valid, official email account.")

    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate 6-digit code
    code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    user_data = user.model_dump()
    user_data["password"] = auth.get_password_hash(user_data["password"])
    
    # Remove 'barangay' which is a property with no setter to prevent AttributeError
    brgy_str = user_data.pop("barangay", None)
    if brgy_str and str(brgy_str).isdigit() and not user_data.get("barangay_id"):
        user_data["barangay_id"] = int(brgy_str)
    
    # Create user as unverified
    new_user = models.Resident(
        **{k: v for k, v in user_data.items() if k != "password"},
        password_hash=user_data["password"],
        verification_code=code,
        is_verified=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Send email
    if not send_otp_email(new_user.email, code, "Verification"):
        # We created the user, but couldn't send the email.
        # In a real system, you might want to rollback, but let's at least tell the user.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User created but failed to send verification email. Please use 'Resend Code' on the login screen."
        )
    
    return new_user





# Registration logic moved below Login to avoid duplication




@app.post("/api/auth/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    captcha_token: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    import logging
    logging.warning(f"LOGIN DEBUG: username={form_data.username}, password_length={len(form_data.password)}")
    
    # 1. Verify basic credentials first (to determine if we should challenge with reCAPTCHA)
    user = crud.get_user_by_email(db, email=form_data.username)
    logging.warning(f"LOGIN DEBUG: user found = {user is not None}")
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    verify_result = auth.verify_password(form_data.password, user.password_hash)
    logging.warning(f"LOGIN DEBUG: verify_result = {verify_result}")
    
    if not verify_result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Check for reCAPTCHA if credentials are valid
    if user.role == "resident":
        if captcha_token == "mobile_bypass":
            pass # mobile app bypass check
        else:
            if not captcha_token:
                return {
                    "require_captcha": True,
                    "message": "Security synchronization required. Please verify you are not a robot."
                }

            if not await verify_recaptcha(captcha_token):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid reCAPTCHA. Please try again."
                )
    
    # 3. Check verification status (Mandatory for residents)
    if not user.is_verified and user.role == "resident":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not verified. Please check your email for the verification code.",
        )

    # 4. Check suspension status (Officials only)
    if getattr(user, "is_suspended", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended by administration. Please contact your department head.",
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
            "address": getattr(user, "address", ""),
            "display_name": getattr(user, "display_name", user.full_name),
            "created_at": user.created_at,
            "capabilities": user.capabilities,
            "access_level": getattr(getattr(user, "role_ref", None), "access_level", None)
        }
    }

@app.post("/api/auth/verify-registration")
def verify_registration(req: VerificationRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    user = crud.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Clean the code (remove spaces if user copied "552 108")
    cleaned_code = req.code.replace(" ", "") if req.code else ""
    
    # REMOVED 123456 bypass for production-grade security synchronization
    if user.verification_code != cleaned_code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
        
    user.is_verified = True
    user.verification_code = None  # Clear the code after use
    db.commit()
    return {"status": "success", "message": "Account verified"}

@app.post("/api/auth/resend-code")
def resend_code(req: VerificationRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    user = crud.get_user_by_email(db, email=email)
    if not user or user.role != "resident":
        raise HTTPException(status_code=404, detail="Resident account not found")
        
    code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    user.verification_code = code
    db.commit()
    
    if not send_otp_email(user.email, code, "Verification"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification code. Please check server logs."
        )
        
    return {"status": "success", "message": "Official verification code resent."}



class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

class VerifyResetCodeRequest(BaseModel):
    email: str
    code: str

def send_otp_email(to_email: str, code: str, type: str = "Verification", ref_id: Optional[str] = None):
    """
    Sends the official branding PULSO OTP email.
    Handles both registration 'Verification' and password 'Recovery' flows.
    """
    to_email = to_email.strip().lower()
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASS = os.getenv("SMTP_PASS")
    
    if not SMTP_USER or not SMTP_PASS:
        print(f"[MAIL ERROR] SMTP credentials missing in .env. Cannot send {type} email to {to_email}")
        return False

    title = "Official Verification Notice" if type == "Verification" else "Password Recovery Notice"
    
    # Format OTP as X X X   X X X (e.g. 1 1 0   9 1 7)
    formatted_otp = f"{code[0]}&nbsp;{code[1]}&nbsp;{code[2]}&nbsp;&nbsp;&nbsp;&nbsp;{code[3]}&nbsp;{code[4]}&nbsp;{code[5]}"
    
    # Dynamic Security Details
    now_str = datetime.now().strftime("%B %d, %Y, %I:%M %p")
    
    email_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; color: #334155; }}
            .wrapper {{ padding: 40px 20px; }}
            .container {{ max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }}
            .header {{ padding: 40px 20px; text-align: center; }}
            .seal {{ width: 90px; height: 90px; margin-bottom: 20px; }}
            .gov-text {{ color: #1e3a8a; font-weight: 700; font-size: 14px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }}
            .notice-title {{ 
                display: inline-block; 
                margin-top: 24px; 
                color: #1e3a8a; 
                font-size: 20px; 
                font-weight: 900; 
                border-bottom: 3px solid #1e3a8a; 
                padding-bottom: 2px; 
                text-transform: uppercase; 
                letter-spacing: 0.1em; 
            }}
            .content {{ padding: 40px 32px; text-align: center; }}
            .intro {{ font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }}
            .otp-container {{ 
                background-color: #f8fafc; 
                border: 2px dashed #cbd5e1; 
                border-radius: 16px; 
                padding: 40px 20px; 
                margin: 32px 0; 
            }}
            .otp-code {{ 
                font-size: 46px; 
                font-weight: 800; 
                color: #ea580c; 
                white-space: nowrap;
                font-family: 'Courier New', Courier, monospace; 
            }}
            .validity {{ font-size: 12px; color: #64748b; line-height: 1.6; }}
            .validity b {{ color: #475569; }}
            .advisory {{ 
                background-color: #fff1f2; 
                border: 1.5px solid #fecaca; 
                border-radius: 12px; 
                padding: 24px; 
                text-align: left; 
                margin-top: 40px; 
            }}
            .advisory-title {{ color: #991b1b; font-weight: 900; font-size: 12px; margin-bottom: 8px; letter-spacing: 0.05em; }}
            .advisory-text {{ font-size: 11px; color: #7f1d1d; line-height: 1.6; }}
            .footer {{ background-color: #ea580c; padding: 32px 24px; text-align: center; color: #ffffff; }}
            .footer-title {{ font-weight: 900; font-size: 11px; letter-spacing: 0.1em; margin-bottom: 12px; text-transform: uppercase; }}
            .footer-details {{ font-size: 10px; opacity: 0.9; margin-bottom: 20px; }}
            .footer-disclaimer {{ font-size: 9px; opacity: 0.7; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 12px; }}
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="header">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/8/8b/Caloocan_City.png" class="seal" alt="Caloocan Seal">
                    <div class="gov-text">Republic of the Philippines</div>
                    <div class="gov-text">City Government of Caloocan</div>
                    <div class="gov-text">Office of the City Engineer</div>
                    <div class="notice-title">{title}</div>
                </div>
                <div class="content">
                    <div class="intro">
                        This serves as an automated notification to secure your digital access.<br>
                        To complete the <b>Credential Validation Process</b>, please utilize the One-Time Password (OTP) provided below.
                    </div>
                    <div class="otp-container">
                        <div class="otp-code">{formatted_otp}</div>
                    </div>
                    <div class="validity">
                        <b>VALIDITY PERIOD:</b> This authorization code is valid for exactly <b>thirty (30) minutes</b> from the time of issuance.<br>
                        If the code expires, a new request must be generated.
                    </div>
                    <div class="advisory">
                        <div class="advisory-title">SECURITY AND COMPLIANCE ADVISORY</div>
                        <div class="advisory-text">
                            If you did not personally initiate this request, <b>disregard this message immediately</b>. 
                            Your account remains protected under current encryption standards, and no further intervention is required.
                        </div>
                    </div>
                </div>
                <div class="footer">
                    <div class="footer-title">Official Security Details</div>
                    <div class="footer-details">
                        {now_str} | OFFICE: Engineer Department | Caloocan City Hall
                    </div>
                    <div class="footer-disclaimer">
                        This is an automated message. Please do not reply to this email.
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        clean_pass = SMTP_PASS.replace(" ", "")
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'【PULSO Official】 {title}: {code}'
        msg['From'] = f"PULSO Security <{SMTP_USER}>"
        msg['To'] = to_email
        msg['X-Priority'] = '1'
        
        ref_text = f"\nReference: {ref_id}" if ref_id else ""
        msg.attach(MIMEText(f"Your PULSO security code is: {code}{ref_text}\nExpires in 30 minutes.", 'plain'))
        msg.attach(MIMEText(email_html, 'html'))
        
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.set_debuglevel(1) # Added verbose logging for debugging
            server.login(SMTP_USER, clean_pass)
            server.send_message(msg)
            print(f"[MAIL] {type} email sent successfully to {to_email}")
        return True
    except smtplib.SMTPAuthenticationError:
        print(f"[MAIL ERROR] Authentication failed for {SMTP_USER}. Check SMTP_PASS.")
        return False
    except smtplib.SMTPException as e:
        print(f"[MAIL ERROR] SMTP error occurred: {e}")
        return False
    except Exception as e:
        print(f"[MAIL ERROR] Unexpected error: {e}")
        return False

@app.post("/api/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generates a 6-digit reset code and sends the official security email."""
    email = req.email.strip().lower()
    user = crud.get_user_by_email(db, email=email)
    if not user:
        # For security, don't reveal if the email is registered
        return {"message": "If this email is registered, a security code will be sent."}
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not verified"
        )
    
    code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    ref_id = f"PC-{random.randint(10000, 99999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    
    # Store or update the token record
    reset_token = db.query(models.PasswordResetToken).filter(models.PasswordResetToken.email == email).first()
    if reset_token:
        reset_token.token = code
        reset_token.expires_at = expires_at
        reset_token.used = False
    else:
        reset_token = models.PasswordResetToken(
            email=email,
            token=code,
            expires_at=expires_at
        )
        db.add(reset_token)
    
    db.commit()
    
    if not send_otp_email(req.email, code, "Recovery", ref_id=ref_id):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Credential synchronization failed: Unable to dispatch security email."
        )
    
    return {
        "message": "Reset code sent successfully.",
        "reference_id": ref_id
    }

@app.post("/api/auth/verify-reset-code")
async def verify_reset_code(req: VerifyResetCodeRequest, db: Session = Depends(get_db)):
    """Verifies that the provided 6-digit sync code is valid and active."""
    email = req.email.strip().lower()
    cleaned_code = req.code.replace(" ", "")
    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.email == email,
        models.PasswordResetToken.token == cleaned_code,
        models.PasswordResetToken.used == False
    ).first()
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Identity synchronization failed: Invalid code.")

    # Explicitly compare aware UTC datetimes to ensure registry synchronization
    current_time = datetime.now(timezone.utc)
    db_expires_at = reset_token.expires_at
    if db_expires_at.tzinfo is None:
        db_expires_at = db_expires_at.replace(tzinfo=timezone.utc)

    if db_expires_at < current_time:
        raise HTTPException(status_code=400, detail="Security token expired.")
        
    return {"message": "Identity synchronized. Identity verified."}

@app.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Verifies the 6-digit code and updates the user's password."""
    email = req.email.strip().lower()
    # Clean the code (remove spaces if user copied "319 472")
    cleaned_code = req.code.replace(" ", "")

    # Find the token
    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.email == email,
        models.PasswordResetToken.token == cleaned_code,
        models.PasswordResetToken.used == False
    ).first()
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Identity synchronization failed: Invalid code.")

    # Explicitly compare aware UTC datetimes for credential update validation
    current_time = datetime.now(timezone.utc)
    db_expires_at = reset_token.expires_at
    if db_expires_at.tzinfo is None:
        db_expires_at = db_expires_at.replace(tzinfo=timezone.utc)

    if db_expires_at < current_time:
        raise HTTPException(status_code=400, detail="Security token expired.")
    
    # Update user password
    user = crud.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(status_code=404, detail="Subject not found in registry.")
    
    user.password_hash = auth.get_password_hash(req.new_password)
    user.is_verified = True  # Resetting password via email token is proof of ownership
    reset_token.used = True  # Mark as used
    
    db.commit()
    return {"message": "Credentials updated successfully. System synchronized."}


# ---------------------------------------------------------------------------

# Users
# ---------------------------------------------------------------------------

@app.get("/api/me", response_model=schemas.UserResponse)
def get_me(current_user: Union[models.Resident, models.Official] = Depends(get_current_user)):
    """Returns the currently authenticated user's profile."""
    return current_user

@app.get("/api/users", response_model=List[schemas.UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(require_role("manager"))
):
    """List all users. Manager only."""
    # Only managers can list residents (for now, we'll focus on residents)
    users = db.query(models.Resident).offset(skip).limit(limit).all()
    return users

@app.get("/api/users/{user_id}", response_model=schemas.UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(get_current_user)
):
    if current_user.id != user_id and not hasattr(current_user, 'role_id'): # simplistic check, improved legacy
        if getattr(current_user, 'role', None) not in ["dispatcher", "manager", "admin"]:
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
    current_user: Union[models.Official, models.Resident] = Depends(get_current_user)
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
    status: Optional[str] = None
    targetStatus: Optional[str] = None # Frontend sends both for compatibility
    budget: Optional[float] = None
    deployment_date: Optional[datetime] = None


@app.get("/api/reports/stats", response_model=schemas.ReportStats)
def get_report_stats(
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(require_role("manager", "dispatcher"))
):
    """Returns aggregated report counts by status. For management KPI dashboard."""
    return crud.get_report_stats(db)

@app.get("/api/reports", response_model=List[schemas.ReportResponse])
def read_reports(
    skip: int = 0,
    limit: int = 200,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(require_role("dispatcher", "manager"))
):
    """
    Returns a listing of all city reports with status filtering.
    Restricted to city officials for operational dispatching.
    """
    reports = crud.get_reports(db, skip=skip, limit=limit)
    if status:
        reports = [r for r in reports if r.status == status]
    return reports

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

    query = db.query(models.Report).filter(
        or_(
            models.Report.resident_id == current_user.id,
            models.Report.claimed_by_user_id == current_user.id
        )
    )

    if filter == "active":
        query = query.filter(models.Report.status.in_([
            "pending", "received", "under_review", "assigned",
            "approved_internal", "approved_for_action", "dispatched",
            "in_progress", "validated", "pending_approval"
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
def read_user_reports(
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(auth.get_current_user)
):
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

@app.get("/api/reports/public", response_model=List[schemas.ReportResponse])
def read_public_reports(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Optional[Union[models.Official, models.Resident]] = Depends(auth.get_optional_current_user)
):
    """
    Returns public/verified reports that residents should see as 'Nearby Hazards'.
    Excludes pending/unverified reports and anonymizes reporters for privacy.
    """
    reports = crud.get_reports(db, skip=skip, limit=limit)
    
    # Filter for reports that are validated or further in the workflow
    public_statuses = ["validated", "dispatched", "approved_internal", "in_progress", "resolved"]
    public_reports = [r for r in reports if r.status in public_statuses]
    
    # Anonymize reporter names if the requester is not an official or is another resident
    for r in public_reports:
        if not current_user or not isinstance(current_user, models.Official):
            if not current_user or r.resident_id != current_user.id:
                r.reporter_name = "Anonymous Resident"
                
    return public_reports

@app.get("/api/reports/{report_id}", response_model=schemas.ReportResponse)
def read_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(auth.get_current_user)
):
    """Get a single report by ID. Residents can only see their own (authored or claimed)."""
    db_report = crud.get_report(db, report_id=report_id)
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if current_user.role == "resident" and db_report.resident_id != current_user.id and db_report.claimed_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this report")
    return db_report

@app.get("/api/reports/{report_id}/timeline", response_model=List[gov_schemas.ProcessTimelineResponse])
def read_report_timeline(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(auth.get_current_user)
):
    """Get the process timeline for a report. Residents see public entries only."""
    db_report = crud.get_report(db, report_id=report_id)
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    public_only = False
    if current_user.role == "resident":
        if db_report.resident_id != current_user.id and db_report.claimed_by_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this timeline")
        public_only = True
        
    entries = gov_crud.get_timeline_for_report(db, report_id, public_only=public_only)
    return gov_crud.enrich_timeline(entries, db)

@app.post("/api/reports/analyze")
async def analyze_report_only(
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: Union[models.Official, models.Resident] = Depends(auth.get_current_user)
):
    """
    Perform AI analysis on a report description and image without saving to DB.
    Used for real-time frontend categorization.
    """
    image_bytes = None
    if image:
        image_bytes = await image.read()
    
    ai_analysis = gemini_service.analyze_report(description or "", image_data=image_bytes)
    return ai_analysis

@app.post("/api/reports", response_model=schemas.ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_new_report(
    request: Request,
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
    Executes rate limiting, boundary enforcement, spatial duplicate check, magic byte validation,
    multi-modal Gemini AI triage, cryptographic token generation, and DB persistence.
    """
    # 0. Rate limiting check
    report_submission_limiter.check(request)

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
                detail=f"Location (Lat: {lat}, Lng: {lng}) is outside the jurisdiction of Caloocan City. Please move the pin within city borders."
            )

    # 3. Duplicate Detection within 15 meters
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
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Uploaded file must be a valid JPEG, PNG, or WebP image."
            )
        if len(image_bytes) > 10 * 1024 * 1024: # 10MB ceiling (10,485,760 bytes)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Uploaded file exceeds 10MB ceiling."
            )
        
        # Magic byte signature check
        is_jpeg = image_bytes.startswith(b'\xff\xd8\xff')
        is_png = image_bytes.startswith(b'\x89PNG\r\n\x1a\n')
        is_webp = image_bytes.startswith(b'RIFF') and image_bytes[8:12] == b'WEBP'
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
    plaintext_token = auth.generate_tracking_token()
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

    # 9. Geospatial DBSCAN Clustering
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

    # 10. Attach Ephemeral Plaintext Credentials to Response
    db_report.tracking_token = plaintext_token
    db_report.tracking_url = f"https://pulso.caloocan.gov.ph/track?id={db_report.ticket_id}&code={plaintext_token}"
    
    return db_report


DUMMY_SALTED_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

@app.post("/api/reports/track", response_model=schemas.ReportTrackResponse)
def track_report_status(
    req: schemas.ReportTrackRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public tracking endpoint requiring Ticket ID + Private Tracking Token.
    Performs constant-time HMAC verification, uniform anti-enumeration error handling,
    and returns a sanitized public timeline with strict PII and internal note redaction.
    """
    tracking_query_limiter.check(request)

    ticket_id = (req.ticket_id or "").strip().upper()
    try:
        provided_token = req.get_token()
    except ValueError:
        auth.verify_tracking_token("DUMMY_TOKEN", DUMMY_SALTED_HASH)
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
        auth.verify_tracking_token(provided_token, DUMMY_SALTED_HASH)
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
        district_code=district_code,
        location_summary=location_summary,
        location_string=report.location_string,
        image_url=report.image_url,
        resolution_image_url=report.resolution_image_url,
        is_claimed=report.is_claimed,
        public_timeline=public_timeline,
        timeline=public_timeline
    )


@app.post("/api/reports/{report_id}/claim", response_model=schemas.ReportClaimResponse)
def claim_guest_report(
    report_id: int,
    req: schemas.ReportClaimRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(auth.get_current_user)
):
    """
    Authenticated resident endpoint to link a guest report to their account.
    Verifies proof of ownership via tracking token, executes atomic ownership binding,
    emits an immutable audit log and delivers an in-app confirmation notification.
    """
    claim_limiter.check(request)

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
            return schemas.ReportClaimResponse(
                message="Report is already linked to your account.",
                report=schemas.ReportResponse.model_validate(report),
                success=True
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This report has already been claimed by another resident account."
        )

    # 3. Prevent claiming reports authored by another registered user
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
    
    if (report.contact_email and report.contact_email.lower() == current_user.email.lower()) or \
       (report.contact_phone and current_user.phone_number and report.contact_phone == current_user.phone_number):
        report.contact_verified = True

    db.commit()
    db.refresh(report)

    # 6. Immutable Audit Log Entry
    import json
    audit_entry = gov_models.AuditLog(
        trigger_type="report_claimed",
        report_id=report.id,
        actor_id=None,
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

@app.post("/api/reports/{report_id}/confirm", response_model=schemas.ReportResponse)
def confirm_report_resolution(
    report_id: int,
    confirm: schemas.ReportResolutionConfirm,
    db: Session = Depends(get_db),
    current_user: models.Resident = Depends(get_current_user)
):
    """
    Final 'Digital Handshake' — allows a resident to close the loop on a resolved report.
    This increases their trust score and provides public proof of resolution.
    """
    if current_user.role != "resident":
        raise HTTPException(status_code=403, detail="Only residents can confirm resolution.")
        
    report = crud.confirm_report_resolution(
        db=db, 
        report_id=report_id, 
        resident_id=current_user.id,
        rating=confirm.rating,
        note=confirm.note
    )
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or not owned by you.")
        
    return report

@app.get("/api/residents/kyc-status", response_model=schemas.KYCStatusResponse)
def get_kyc_status(
    db: Session = Depends(get_db),
    current_user: models.Resident = Depends(get_current_user)
):
    """
    Get the current KYC and Trust status of the resident.
    Used for showing verification badges and tier progress.
    """
    if not isinstance(current_user, models.Resident):
        raise HTTPException(status_code=403, detail="Resident only endpoint.")
    
    return {
        "is_verified": current_user.is_verified,
        "kyc_level": current_user.kyc_level,
        "trust_score": current_user.trust_score,
        "last_verification": current_user.last_kyc_verification,
        "registration_date": current_user.created_at
    }

@app.post("/api/residents/upgrade-kyc")
async def upgrade_resident_kyc(
    front_image: UploadFile = File(...),
    back_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.Resident = Depends(get_current_user)
):
    """
    Self-service KYC upgrade. Accepts high-res scans of government IDs.
    Uses Multi-modal Gemini Vision + OCR for identity cross-referencing.
    """
    if not isinstance(current_user, models.Resident):
        raise HTTPException(status_code=403, detail="Only residents can upgrade their KYC.")
        
    front_bytes = await front_image.read()
    back_bytes = await back_image.read() if back_image else None
    
    # 1. Process with AI-first Multi-side Pipeline
    results = await ocr_service.perform_ocr(front_bytes, back_bytes)
    
    if not results.get("success"):
        raise HTTPException(status_code=400, detail=results.get("error", "OCR Processing failed. Please use a clearer photo."))
        
    ocr_data = results.get("extracted_data", {})
    
    # Extract ID type and perform integrity check
    id_type = ocr_data.get("id_type", "unknown")
    
    # 2. Update DB using the hardened CRUD logic
    updated_user = crud.upgrade_resident_kyc(db, current_user.id, id_type, ocr_data)
    
    if not updated_user:
        raise HTTPException(status_code=500, detail="Database update failed.")
        
    return {
        "status": "success",
        "message": f"Identity Verified! You are now {updated_user.kyc_level}.",
        "new_tier": updated_user.kyc_level,
        "trust_score": updated_user.trust_score,
        "extracted_name": f"{ocr_data.get('first_name', '')} {ocr_data.get('last_name', '')}".strip()
    }


# ---------------------------------------------------------------------------
# Geocoding Proxy Endpoints  (keeps Google API key server-side)
# ---------------------------------------------------------------------------

@app.get("/api/geocode/reverse")
async def geocode_reverse(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    current_user: Union[models.Official, models.Resident] = Depends(get_current_user)
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
    current_user: Union[models.Official, models.Resident] = Depends(get_current_user)
):
    """
    Forward geocode / place search.
    Returns up to 5 matching places within North Caloocan.
    """
    results = await maps_service.forward_geocode(q)
    return {"results": results}


@app.get("/api/maps/directions")
async def get_directions_proxy(
    origin: str = Query(..., description="Origin coords or address"),
    destination: str = Query(..., description="Destination coords or address"),
    mode: str = Query("driving", description="driving, walking, bicycling, or transit"),
    current_user: Union[models.Official, models.Resident] = Depends(get_current_user)
):
    """
    Get routing directions between two locations.
    Useful for dispatch navigation and travel time estimation.
    """
    route = await maps_service.get_directions(origin, destination, mode)
    if not route:
        raise HTTPException(status_code=400, detail="Could not calculate route due to server error")
    
    # Check if we got an error response from Google (status != OK)
    if route.get("status") and route.get("status") != "OK":
        error_msg = route.get("error_detail") or f"Google Maps Error: {route.get('status')}"
        raise HTTPException(status_code=400, detail=error_msg)
        
    return route

@app.patch("/api/reports/{report_id}/status", response_model=schemas.ReportResponse)
def update_report_status(
    report_id: int,
    status_update: ReportStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(require_role("dispatcher", "manager"))
):
    """Generic status update. Dispatchers/Managers and Admins only."""
    status = status_update.status or status_update.targetStatus
    updated_report = crud.update_report_status(
        db=db, 
        report_id=report_id, 
        status=status, 
        actor_id=current_user.id,
        budget=status_update.budget,
        deployment_date=status_update.deployment_date
    )
    if not updated_report:
        raise HTTPException(status_code=404, detail="Report not found")
    return updated_report

@app.patch("/api/reports/{report_id}/reject", response_model=schemas.ReportResponse)
def reject_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(require_role("dispatcher", "manager"))
):
    """Reject a report (sets status to 'rejected' and notifies user)."""
    updated = crud.reject_report(db, report_id=report_id, actor_id=current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Report not found")
    return updated

@app.patch("/api/reports/{report_id}/dispatch", response_model=schemas.ReportResponse)
def dispatch_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(require_role("dispatcher", "manager"))
):
    """Dispatch a report (approved_internal → dispatched)."""
    db_report = crud.get_report(db, report_id=report_id)
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
    if db_report.status != "approved_internal":
        raise HTTPException(status_code=400, detail=f"Cannot dispatch report with status '{db_report.status}'. Must be 'approved_internal'.")
    updated = crud.update_report_status(db, report_id=report_id, status="dispatched", actor_id=current_user.id)
    return updated

@app.post("/api/reports/{report_id}/cancel", response_model=schemas.ReportResponse)
@app.patch("/api/reports/{report_id}/cancel", response_model=schemas.ReportResponse)
def cancel_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(get_current_user)
):
    """
    Allow a resident to cancel their own report if it's still in verification or rejected.
    If it's already being worked on (approved_internal, dispatched, resolved), can't cancel.
    """
    db_report = crud.get_report(db, report_id=report_id)
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Ownership Check
    if db_report.resident_id != current_user.id and current_user.role not in ["dispatcher", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this report")
        
    # State Check
    locked_statuses = ["approved_internal", "dispatched", "resolved", "cancelled"]
    if db_report.status in locked_statuses:
        raise HTTPException(status_code=400, detail=f"Cannot cancel report with status '{db_report.status}'. Action blocked.")

    updated = crud.update_report_status(db, report_id=report_id, status="cancelled", actor_id=current_user.id)
    return updated

@app.patch("/api/reports/{report_id}/resolve", response_model=schemas.ReportResponse)
async def resolve_report(
    report_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(require_role("dispatcher", "manager"))
):
    """Mark a dispatched report as resolved and require a proof picture."""
    db_report = crud.get_report(db, report_id=report_id)
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
    if db_report.status != "dispatched":
        raise HTTPException(status_code=400, detail=f"Cannot resolve report with status '{db_report.status}'. Must be 'dispatched'.")
    
    # Process Proof Image
    image_bytes = await image.read()
    file_extension = os.path.splitext(image.filename)[1] or ".jpg"
    unique_filename = f"resolution_{report_id}_{secrets.token_hex(4)}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(image_bytes)
        
    image_url = f"/api/uploads/reports/{unique_filename}"
    db_report.resolution_image_url = image_url
    db.commit()

    updated = crud.update_report_status(db, report_id=report_id, status="resolved", actor_id=current_user.id)
    
    # Notify Resident
    ticket_id = updated.ticket_id or f"RPT-{updated.id}"
    db_notif = models.Notification(
        resident_id=updated.resident_id,
        title="Infrastructure Repaired",
        message=f"Success! The issue {ticket_id} has been fully resolved by City Engineering. A proof picture of the finalized repair has been attached to your report for transparency."
    )
    db.add(db_notif)
    db.commit()
    
    return updated

@app.delete("/api/reports/{report_id}")
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(require_role("dispatcher", "manager"))
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
    current_user: Union[models.Official, models.Resident] = Depends(get_current_user)
):
    internal = crud.get_advisories(db, skip=skip, limit=limit)
    
    # User requested to remove the auto-monitor contents from the feed
    # try:
    #     import re
    #     req = urllib.request.urlopen("https://news.google.com/rss/search?q=%22North+Caloocan%22+AND+(water+OR+road+OR+power+OR+typhoon+OR+emergency+OR+suspension+OR+class)&hl=en-PH&gl=PH&ceid=PH:en", timeout=1.5)
    #     tree = ET.parse(req)
    #     items = tree.findall('.//item')
    #     for idx, item in enumerate(items[:2]):
    #         pass # RSS parsing logic hidden
    # except Exception as e:
    #     print("Live Feed Error:", e)
        
    return internal

@app.post("/api/advisories", response_model=schemas.AdvisoryResponse)
def create_advisory_route(
    advisory: schemas.AdvisoryCreate,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(require_role("manager", "dispatcher"))
):
    return crud.create_advisory(db=db, advisory=advisory)

@app.delete("/api/advisories/{advisory_id}")
def delete_advisory(
    advisory_id: int,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(require_role("manager"))
):
    """Delete an advisory. Manager only."""
    success = crud.delete_advisory(db, advisory_id=advisory_id)
    if not success:
        raise HTTPException(status_code=404, detail="Advisory not found")
    return {"message": f"Advisory {advisory_id} deleted successfully"}

@app.post("/api/advisories/generate/{report_id}")
async def generate_ai_advisory(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(require_role("dispatcher", "manager"))
):
    """
    Dispatcher-only: Triggers AI to draft a public advisory based on a validated report.
    Returns a JSON draft (title, body, priority).
    """
    db_report = crud.get_report(db, report_id=report_id)
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    import json
    import logging
    logger = logging.getLogger(__name__)
    ai_meta = {}
    if db_report.ai_metadata:
        try:
            ai_meta = json.loads(db_report.ai_metadata)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse ai_metadata for report {report_id}: {e}")
        
    report_data = {
        "category": db_report.category,
        "ai_summary": ai_meta.get("smart_summary", db_report.description),
        "location_string": db_report.location_string,
        "severity_score": db_report.severity_score
    }
    
    draft = gemini_service.generate_advisory_content(report_data)
    if not draft:
        raise HTTPException(status_code=500, detail="AI generation failed.")
        
    return draft

# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

@app.get("/api/notifications/user/{user_id}", response_model=List[schemas.NotificationResponse])
def read_user_notifications(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access these notifications")
    
    # Segregated: determine if resident or official
    if isinstance(current_user, models.Resident):
        return crud.get_notifications(db, resident_id=user_id, skip=skip, limit=limit)
    else:
        return crud.get_notifications(db, official_id=user_id, skip=skip, limit=limit)

@app.patch("/api/notifications/user/{user_id}/read")
def mark_user_notifications_read(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(get_current_user)
):
    """Mark ALL notifications for a user as read."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify these notifications")
    
    # Segregated: determine if resident or official
    if isinstance(current_user, models.Resident):
        crud.mark_notifications_read(db, resident_id=user_id)
    else:
        crud.mark_notifications_read(db, official_id=user_id)
    return {"message": "All notifications marked as read"}

@app.patch("/api/notifications/{notification_id}/read")
def mark_single_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(get_current_user)
):
    """Mark a single notification as read."""
    # Segregated: determine if resident or official
    if isinstance(current_user, models.Resident):
        success = crud.mark_notification_read(db, notification_id=notification_id, resident_id=current_user.id)
    else:
        success = crud.mark_notification_read(db, notification_id=notification_id, official_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found or not yours")
    return {"message": "Notification marked as read"}

@app.delete("/api/notifications/{notification_id}")
def delete_single_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(get_current_user)
):
    """Hard delete a single notification."""
    # Segregated: determine if resident or official
    if isinstance(current_user, models.Resident):
        success = crud.delete_notification(db, notification_id=notification_id, resident_id=current_user.id)
    else:
        success = crud.delete_notification(db, notification_id=notification_id, official_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found or not yours")
    return {"message": "Notification deleted"}

# ---------------------------------------------------------------------------
# Government Workflows (Work Orders, etc.)
# ---------------------------------------------------------------------------

@app.get("/api/work-orders", response_model=List[schemas.WorkOrderResponse])
def read_work_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(require_role("dispatcher", "manager", "engineer"))
):
    return crud.get_work_orders(db, skip=skip, limit=limit)

@app.post("/api/work-orders", response_model=schemas.WorkOrderResponse)
def create_new_work_order(
    wo: schemas.WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(require_role("dispatcher", "manager"))
):
    """
    Creates a formal government work order.
    If linked to a citizen report, this automatically initiates an AuditLog
    and advances the ProcessTimeline process dynamically.
    """
    return crud.create_work_order(db=db, wo=wo, assigned_by_id=current_user.id)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@app.patch("/api/auth/change-password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: Union[models.Official, models.Resident] = Depends(get_current_user)
):
    """Secure password transition logic."""
    if not auth.verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    if req.current_password == req.new_password:
        raise HTTPException(status_code=400, detail="New password cannot be the same as the current password")
    
    current_user.password_hash = auth.get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=33159, reload=True)
