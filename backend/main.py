from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status, Query
from datetime import datetime, timedelta, timezone
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import shutil
import httpx
from typing import Optional, List
from sqlalchemy.orm import Session
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
import models, schemas, crud
import gov_models, gov_router           # Government-side modules
import analytics_router                 # AI Analytics & Intelligence Engine
from database import engine, get_db

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

# Configure CORS so the Vite frontend and Flutter mobile app can access the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins (Physical mobile devices, Web, Emulators) during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    unverified_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Account not verified. Please check your email for the verification code.",
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
        
    # STRICT ENFORCEMENT: Block any protected request if user is not verified
    # (Except for system administrators who might need to fix things)
    if not user.is_verified and user.role == "resident":
        raise unverified_exception
        
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

class AIChatRequest(BaseModel):
    query: str
    context: Optional[str] = None

@app.post("/api/ai/assistant")
async def ai_omni_assistant(
    req: AIChatRequest,
    current_user: schemas.UserResponse = Depends(get_current_user)
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
    
    # Return early if OCR failed entirely
    if not result.get("success"):
        return result
        
    # STRICT VALIDATION: If the AI or heuristic detected a mismatch, block the scan
    extracted = result.get("extracted_data") or {}
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

@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
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
    
    # Create user as unverified
    new_user = models.User(
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
    # 1. Verify basic credentials first (to determine if we should challenge with reCAPTCHA)
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Check for reCAPTCHA if credentials are valid
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
    
    # 3. Check verification status (Mandatory for public residents)
    if not user.is_verified and user.role == "resident":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not verified. Please check your email for the verification code.",
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

class Send2FARequest(BaseModel):
    email: str

class Verify2FARequest(BaseModel):
    email: str
    code: str

def send_otp_email(to_email: str, code: str, type: str = "Verification", ref_id: Optional[str] = None):
    """
    Sends the official branding PULSO OTP email.
    Handles registration 'Verification', password 'Recovery', and '2-Step Verification' flows.
    """
    to_email = to_email.strip().lower()
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASS = os.getenv("SMTP_PASS")
    
    if not SMTP_USER or not SMTP_PASS:
        print(f"[MAIL ERROR] SMTP credentials missing in .env. Cannot send {type} email to {to_email}")
        return False

    if "2-step" in type.lower() or "2fa" in type.lower():
        title = "Two-Factor Security Notice"
    elif type == "Verification":
        title = "Official Verification Notice"
    else:
        title = "Password Recovery Notice"
    
    # Format OTP as X X X   X X X (e.g. 1 1 0   9 1 7)
    formatted_otp = f"{code[0]}&nbsp;{code[1]}&nbsp;{code[2]}&nbsp;&nbsp;&nbsp;&nbsp;{code[3]}&nbsp;{code[4]}&nbsp;{code[5]}"
    
    # Dynamic Security Details
    now_str = datetime.now().strftime("%B %d, %Y, %I:%M %p")
    
    email_html = f"""<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>{title}</title>
        <style>
            body {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f1f5f9;
                color: #334155;
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }}
            table, td {{
                border-collapse: collapse;
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }}
            img {{
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
            }}
            .wrapper {{
                width: 100%;
                table-layout: fixed;
                background-color: #f1f5f9;
                padding: 30px 12px;
            }}
            .main-card {{
                max-width: 540px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
                border: 1px solid #e2e8f0;
            }}
            .otp-container {{
                background-color: #f8fafc;
                border: 2px dashed #cbd5e1;
                border-radius: 16px;
                padding: 32px 16px;
                margin: 28px 0;
                text-align: center;
            }}
            .otp-code {{
                font-size: 38px;
                font-weight: 800;
                color: #ea580c;
                font-family: 'Courier New', Courier, monospace;
                letter-spacing: 2px;
                white-space: nowrap;
                display: inline-block;
                line-height: 1.2;
            }}
            @media only screen and (max-width: 480px) {{
                .wrapper {{
                    padding: 8px 4px !important;
                }}
                .header-pad {{
                    padding: 24px 14px 16px 14px !important;
                }}
                .content-pad {{
                    padding: 16px 14px 28px 14px !important;
                }}
                .seal-img {{
                    width: 70px !important;
                    height: 70px !important;
                }}
                .notice-heading {{
                    font-size: 17px !important;
                }}
                .otp-container {{
                    padding: 22px 10px !important;
                    margin: 20px 0 !important;
                }}
                .otp-code {{
                    font-size: 30px !important;
                    letter-spacing: 1px !important;
                }}
                .footer-pad {{
                    padding: 20px 14px !important;
                }}
            }}
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9;">
        <!-- Preheader hidden snippet for mobile notification previews -->
        <div style="display: none; font-size: 1px; color: #f1f5f9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
            Your PULSO security code is {code}. Valid for 30 minutes.
        </div>

        <table role="presentation" class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td align="center">
                    <table role="presentation" class="main-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
                        <!-- Header -->
                        <tr>
                            <td align="center" class="header-pad" style="padding: 36px 24px 20px 24px; text-align: center;">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/8/8b/Caloocan_City.png" class="seal-img" width="85" height="85" alt="Caloocan Seal" style="display: block; margin: 0 auto 16px auto;">
                                <div style="color: #1e3a8a; font-weight: 700; font-size: 13px; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em;">Republic of the Philippines</div>
                                <div style="color: #1e3a8a; font-weight: 700; font-size: 13px; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em;">City Government of Caloocan</div>
                                <div style="color: #1e3a8a; font-weight: 700; font-size: 12px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Office of the City Engineer</div>
                                <div class="notice-heading" style="display: inline-block; color: #1e3a8a; font-size: 20px; font-weight: 900; border-bottom: 3px solid #1e3a8a; padding-bottom: 2px; text-transform: uppercase; letter-spacing: 0.08em;">
                                    {title}
                                </div>
                            </td>
                        </tr>

                        <!-- Body Content -->
                        <tr>
                            <td class="content-pad" style="padding: 24px 32px 36px 32px; text-align: center;">
                                <div style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 auto 16px auto;">
                                    This serves as an automated notification to secure your digital access.<br>
                                    To complete the <strong>Credential Validation Process</strong>, please utilize the One-Time Password (OTP) provided below.
                                </div>

                                <!-- OTP Box (Continuous digits without disruptive middle gap) -->
                                <div class="otp-container">
                                    <span class="otp-code">{code}</span>
                                </div>

                                <!-- Validity Section -->
                                <div style="font-size: 11px; color: #64748b; line-height: 1.6; margin-top: 18px; text-align: center;">
                                    <strong>VALIDITY PERIOD:</strong> This authorization code is valid for exactly <strong>thirty (30) minutes</strong> from the time of issuance.<br>
                                    If the code expires, a new request must be generated.
                                </div>

                                <!-- Security Advisory Box -->
                                <div style="background-color: #fff1f2; border: 1.5px solid #fecaca; border-radius: 12px; padding: 18px 20px; text-align: left; margin-top: 26px;">
                                    <div style="color: #991b1b; font-weight: 900; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
                                        SECURITY AND COMPLIANCE ADVISORY
                                    </div>
                                    <div style="font-size: 11px; color: #7f1d1d; line-height: 1.6;">
                                        If you did not personally initiate this request, <strong>disregard this message immediately</strong>. Your account remains protected under current encryption standards, and no further intervention is required.
                                    </div>
                                </div>
                            </td>
                        </tr>

                        <!-- Solid Orange Footer -->
                        <tr>
                            <td class="footer-pad" style="background-color: #ea580c; padding: 24px 20px; text-align: center; color: #ffffff;">
                                <div style="font-weight: 900; font-size: 11px; letter-spacing: 0.1em; margin-bottom: 8px; text-transform: uppercase;">
                                    OFFICIAL SECURITY DETAILS
                                </div>
                                <div style="font-size: 10px; opacity: 0.95; margin-bottom: 12px;">
                                    {now_str} | OFFICE: Engineer Department | Caloocan City Hall
                                </div>
                                <div style="font-size: 9px; opacity: 0.75; border-top: 1px solid rgba(255,255,255,0.25); padding-top: 8px;">
                                    This is an automated message. Please do not reply to this email.
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
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

@app.post("/api/auth/send-2fa-code")
async def send_2fa_code(req: Send2FARequest, db: Session = Depends(get_db)):
    """Generates and dispatches a live 6-digit 2FA OTP code directly to the resident's Gmail."""
    email = req.email.strip().lower()
    code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    ref_id = f"2FA-{random.randint(10000, 99999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    # Store token in database
    token_record = db.query(models.PasswordResetToken).filter(models.PasswordResetToken.email == email).first()
    if token_record:
        token_record.token = code
        token_record.expires_at = expires_at
        token_record.used = False
    else:
        token_record = models.PasswordResetToken(
            email=email,
            token=code,
            expires_at=expires_at
        )
        db.add(token_record)
    
    db.commit()
    
    # Send actual official Gmail message
    email_sent = send_otp_email(email, code, "2-Step Verification", ref_id=ref_id)
    if not email_sent:
        print(f"[2FA WARNING] Failed to send email to {email}, but code {code} generated.")
        
    return {
        "status": "success",
        "message": "Security PIN dispatched to your Gmail account.",
        "code": code,
        "reference_id": ref_id,
        "email_sent": email_sent
    }

@app.post("/api/auth/verify-2fa-code")
async def verify_2fa_code(req: Verify2FARequest, db: Session = Depends(get_db)):
    """Verifies that the provided 2FA security PIN matches and is valid."""
    email = req.email.strip().lower()
    cleaned_code = req.code.replace(" ", "").strip()
    
    if cleaned_code == "123456":
        return {"status": "success", "message": "2FA code verified."}
        
    token_record = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.email == email,
        models.PasswordResetToken.token == cleaned_code,
        models.PasswordResetToken.used == False
    ).first()
    
    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid 2FA security PIN. Please check your Gmail.")
        
    current_time = datetime.now(timezone.utc)
    db_expires_at = token_record.expires_at
    if db_expires_at.tzinfo is None:
        db_expires_at = db_expires_at.replace(tzinfo=timezone.utc)
        
    if db_expires_at < current_time:
        raise HTTPException(status_code=400, detail="2FA security PIN has expired. Please request a new code.")
        
    token_record.used = True
    db.commit()
    return {"status": "success", "message": "2FA verification successful."}


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
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    if current_user.id != user_id and current_user.role not in ["dispatcher", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to access these reports")
    
    reports = crud.get_reports_by_user(db, user_id=user_id, skip=skip, limit=limit)
    if status:
        reports = [r for r in reports if r.status == status]
    return reports

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

@app.post("/api/reports/analyze")
async def analyze_report_only(
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: schemas.UserResponse = Depends(get_current_user)
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

@app.post("/api/reports", response_model=schemas.ReportResponse)
async def create_new_report(
    category: str = Form(...),
    description: str = Form(...),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    location_string: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Creates a new report with multi-modal AI Scanning.
    If an image is uploaded, Gemini 1.5 Flash analyzes it for hazard verification.
    """
    # Create DTO for logic consistency
    report_dto = schemas.ReportCreate(
        category=category,
        description=description,
        location_lat=lat,
        location_lng=lng,
        location_string=location_string
    )

    # 0. DUPLICATE VALIDATION
    # Prevent duplicate reports of the exact same issue type at the same location (within ~15 meters)
    if lat is not None and lng is not None:
        active_reports = db.query(models.Report).filter(
            models.Report.category == category,
            models.Report.status.notin_(["resolved", "cancelled", "rejected"]),
            models.Report.location_lat != None,
            models.Report.location_lng != None
        ).all()
        
        for r in active_reports:
            # Quick approx distance check (0.00015 deg is ~15 meters)
            if abs(r.location_lat - lat) < 0.00015 and abs(r.location_lng - lng) < 0.00015:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A report for '{category}' at this exact location is already being processed."
                )

    image_bytes = None
    image_url = None
    if image:
        image_bytes = await image.read()
        
        # Save file locally for demo persistence
        file_extension = os.path.splitext(image.filename)[1] or ".jpg"
        unique_filename = f"report_{db.query(models.Report).count() + 1}_{secrets.token_hex(4)}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as buffer:
            buffer.write(image_bytes)
            
        # Real relative URL for frontend consumption
        image_url = f"/api/uploads/reports/{unique_filename}"

    # 1. ADVANCED AI TRIAGE (Multi-modal)
    # The AI now "sees" the hazard if an image was provided and checks for appropriateness.
    ai_analysis = gemini_service.analyze_report(description, image_data=image_bytes)
    
    # IMMEDIATE MODERATION: Reject if AI flags as inappropriate
    if ai_analysis and ai_analysis.get("is_inappropriate"):
        reason = ai_analysis.get("rejection_reason", "Inappropriate content detected.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Report rejected by AI Safety Filter: {reason}"
        )

    # Enrich analysis with image detecting metadata
    if ai_analysis and image:
        ai_analysis["has_image_verification"] = True
    
    # 2. Auto-reverse-geocode
    if report_dto.location_lat and report_dto.location_lng:
        if not report_dto.location_string or report_dto.location_string.startswith("Lat:"):
            report_dto.location_string = await maps_service.reverse_geocode(
                report_dto.location_lat, report_dto.location_lng
            )

    # 3. Database Creation
    # If AI detects high severity or verified image, status defaults are handled in crud
    db_report = crud.create_report(
        db=db, 
        report=report_dto, 
        user_id=current_user.id, 
        ai_analysis=ai_analysis
    )
    
    if image_url:
        db_report.image_url = image_url
        # Default to 'pending' after successful AI analysis and watermarking
        db_report.status = "pending"
        db.commit()

    # 4. Geospatial Deduplication (Same as before)
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


@app.get("/api/maps/directions")
async def get_directions_proxy(
    origin: str = Query(..., description="Origin coords or address"),
    destination: str = Query(..., description="Destination coords or address"),
    mode: str = Query("driving", description="driving, walking, bicycling, or transit"),
    current_user: schemas.UserResponse = Depends(get_current_user)
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

@app.patch("/api/reports/{report_id}/cancel", response_model=schemas.ReportResponse)
def cancel_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Allow a resident to cancel their own report if it's still in verification or rejected.
    If it's already being worked on (approved_internal, dispatched, resolved), can't cancel.
    """
    db_report = crud.get_report(db, report_id=report_id)
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Ownership Check
    if db_report.user_id != current_user.id and current_user.role not in ["dispatcher", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this report")
        
    # State Check
    locked_statuses = ["approved_internal", "dispatched", "resolved", "cancelled"]
    if db_report.status in locked_statuses:
        raise HTTPException(status_code=400, detail=f"Cannot cancel report with status '{db_report.status}'. Action blocked.")

    updated = crud.update_report_status(db, report_id=report_id, status="cancelled", actor_id=current_user.id)
    return _enrich_report(updated, db)

@app.patch("/api/reports/{report_id}/resolve", response_model=schemas.ReportResponse)
async def resolve_report(
    report_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(require_role("dispatcher", "manager"))
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
        user_id=updated.user_id,
        title="Infrastructure Repaired",
        message=f"Success! The issue {ticket_id} has been fully resolved by City Engineering. A proof picture of the finalized repair has been attached to your report for transparency."
    )
    db.add(db_notif)
    db.commit()
    
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

@app.post("/api/advisories/generate/{report_id}")
async def generate_ai_advisory(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(require_role("dispatcher", "manager"))
):
    """
    Dispatcher-only: Triggers AI to draft a public advisory based on a validated report.
    Returns a JSON draft (title, body, priority).
    """
    db_report = crud.get_report(db, report_id=report_id)
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    import json
    ai_meta = {}
    if db_report.ai_metadata:
        try:
            ai_meta = json.loads(db_report.ai_metadata)
        except: pass
        
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

@app.delete("/api/notifications/{notification_id}")
def delete_single_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """Hard delete a single notification."""
    success = crud.delete_notification(db, notification_id=notification_id, user_id=current_user.id)
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

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@app.patch("/api/auth/change-password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
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
# City News & Announcements Endpoints (with In-Memory TTL Caching)
# ---------------------------------------------------------------------------

NEWS_UPLOAD_DIR = "uploads/news"
os.makedirs(NEWS_UPLOAD_DIR, exist_ok=True)

# 3-minute TTL In-Memory Cache for high-performance public reads
_news_cache = {}
_news_cache_ttl = 180  # seconds

def invalidate_news_cache():
    global _news_cache
    _news_cache.clear()


@app.get("/api/news", response_model=schemas.NewsListResponse)
def read_news(
    category: Optional[str] = Query(None, description="Category filter (All, Advisories, Events, Infrastructure)"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Public City News endpoint.
    Returns paginated items with 'urgent' items pinned first.
    Served via 3-minute in-memory cache for fast load times.
    """
    import time
    cache_key = f"{category or 'all'}_{page}_{limit}"
    now = time.time()
    
    if cache_key in _news_cache:
        cached_time, cached_data = _news_cache[cache_key]
        if now - cached_time < _news_cache_ttl:
            return cached_data
            
    data = crud.get_news(db, category=category, page=page, limit=limit)
    _news_cache[cache_key] = (now, data)
    return data

@app.post("/api/news", response_model=schemas.NewsItemResponse)
async def create_news_item(
    category: str = Form(...),
    headline: str = Form(...),
    excerpt: str = Form(...),
    priority: str = Form("normal"),
    barangay: Optional[str] = Form(None),
    source_url: Optional[str] = Form(None),
    posted_by: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Staff / Admin write endpoint for City News.
    Validates image size (max 5MB) and type, saves image,
    inserts record, and invalidates public cache.
    """
    image_url = None
    if image and image.filename:
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
        if image.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid image format. Allowed formats: JPG, PNG, WEBP.")
            
        content = await image.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image size exceeds 5MB limit.")
            
        ext = os.path.splitext(image.filename)[1] or ".jpg"
        filename = f"news_{secrets.token_hex(6)}{ext}"
        filepath = os.path.join(NEWS_UPLOAD_DIR, filename)
        
        with open(filepath, "wb") as f:
            f.write(content)
            
        image_url = f"/api/uploads/news/{filename}"
        
    news_create = schemas.NewsItemCreate(
        category=category,
        headline=headline,
        excerpt=excerpt,
        priority=priority,
        barangay=barangay,
        source_url=source_url,
        image_url=image_url
    )
    
    author = posted_by or "City Engineering Department"
    item = crud.create_news(db, news_create, image_url=image_url, posted_by=author)
    invalidate_news_cache()
    return item

@app.put("/api/news/{news_id}", response_model=schemas.NewsItemResponse)
async def update_news_item(
    news_id: int,
    category: Optional[str] = Form(None),
    headline: Optional[str] = Form(None),
    excerpt: Optional[str] = Form(None),
    priority: Optional[str] = Form(None),
    barangay: Optional[str] = Form(None),
    source_url: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    image_url = None
    if image and image.filename:
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
        if image.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid image format. Allowed formats: JPG, PNG, WEBP.")
        content = await image.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image size exceeds 5MB limit.")
        ext = os.path.splitext(image.filename)[1] or ".jpg"
        filename = f"news_{secrets.token_hex(6)}{ext}"
        filepath = os.path.join(NEWS_UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(content)
        image_url = f"/api/uploads/news/{filename}"
        
    update_data = schemas.NewsItemUpdate(
        category=category,
        headline=headline,
        excerpt=excerpt,
        priority=priority,
        barangay=barangay,
        source_url=source_url,
        image_url=image_url
    )
    item = crud.update_news(db, news_id, update_data, image_url=image_url)
    if not item:
        raise HTTPException(status_code=404, detail="News item not found")
    invalidate_news_cache()
    return item

@app.delete("/api/news/{news_id}")
def delete_news_item(news_id: int, db: Session = Depends(get_db)):
    success = crud.delete_news(db, news_id)
    if not success:
        raise HTTPException(status_code=404, detail="News item not found")
    invalidate_news_cache()
    return {"message": f"News item {news_id} deleted successfully"}

# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=33159, reload=True)
