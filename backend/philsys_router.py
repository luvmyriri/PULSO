"""
philsys_router.py — PhilSys Check API Endpoints
===============================================
FastAPI router for Philippine National ID verification.

Endpoints:
  POST /api/philsys/verify          — Upload PhilID images → OCR + PhilSys Check
  GET  /api/philsys/status          — Check API health and sandbox/live mode
  POST /api/philsys/verify-manual   — Manual entry verification (no image)
  POST /api/philsys/verify-qr       — Verify PhilID QR code (openverify)
  POST /api/philsys/scan-qr-image    — Upload image containing QR code
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import philsys_service
import os

# Use the shared auth dependency from PULSO
import auth

router = APIRouter(
    prefix="/api/philsys",
    tags=["PhilSys Authentication"],
)

# ---------------------------------------------------------------------------
# Health / Status
# ---------------------------------------------------------------------------

@router.get("/status")
async def philsys_status():
    """Returns PhilSys integration status and current mode."""
    has_credentials = bool(
        os.getenv("PHILSYS_API_ID") and os.getenv("PHILSYS_API_SECRET")
    )
    sandbox = os.getenv("PHILSYS_SANDBOX", "true").lower() == "true"

    return {
        "status":          "online",
        "service":         "PULSO PhilSys Check Integration",
        "mode":            "sandbox" if sandbox else "live",
        "has_credentials": has_credentials,
        "api_endpoint":    os.getenv(
            "PHILSYS_API_ENDPOINT",
            "https://philsyscheck.psa.gov.ph/api/v1/authenticate"
        ),
        "note": (
            "Running in SANDBOX mode — mock verification active. "
            "Configure PHILSYS_API_ID, PHILSYS_API_SECRET, and set PHILSYS_SANDBOX=false "
            "to enable live PSA PhilSys Check verification."
        ) if sandbox else "Live mode — connected to PSA PhilSys Check API.",
    }


# ---------------------------------------------------------------------------
# Image-Based Verification (Primary)
# ---------------------------------------------------------------------------

@router.post("/verify")
async def verify_philid_image(
    idFront: UploadFile = File(..., description="PhilID front side image"),
    idBack:  Optional[UploadFile] = File(None, description="PhilID back side image (optional)"),
    # Optional manual overrides if OCR fails on specific fields
    override_psn:        Optional[str] = Form(None),
    override_last_name:  Optional[str] = Form(None),
    override_first_name: Optional[str] = Form(None),
    override_dob:        Optional[str] = Form(None),
    override_sex:        Optional[str] = Form(None),
):
    """
    Verify a Philippine National ID (PhilID) via:
      1. Gemini Vision OCR — reads front & back of the card
      2. PSA PhilSys Check API — verifies extracted data against the registry

    Accepts multipart/form-data with front image (required) and back image (optional).
    Optional override fields allow correcting OCR failures manually.

    Returns comprehensive verification result with audit trail.
    """
    # Read uploaded images
    try:
        front_bytes = await idFront.read()
        if not front_bytes:
            raise HTTPException(status_code=400, detail="Front ID image is empty or unreadable.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read front image: {e}")

    back_bytes = None
    if idBack:
        try:
            back_bytes = await idBack.read()
            if not back_bytes:
                back_bytes = None  # Treat empty bytes as not provided
        except Exception:
            back_bytes = None

    # Build override map (if any manual corrections provided)
    additional = {}
    if override_psn:        additional["psn"]         = override_psn
    if override_last_name:  additional["last_name"]    = override_last_name
    if override_first_name: additional["first_name"]   = override_first_name
    if override_dob:        additional["date_of_birth"] = override_dob
    if override_sex:        additional["sex"]           = override_sex

    # Run verification pipeline
    try:
        result = await philsys_service.verify_philid(
            front_image_bytes = front_bytes,
            back_image_bytes  = back_bytes  or None,
            additional_data   = additional  or None,
        )
    except Exception as e:
        print(f"[PhilSys Router] Verification pipeline error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PhilSys verification service error: {str(e)}"
        )

    # Return appropriate HTTP status based on verification result
    http_status = 200 if result.get("verified") else 422
    return JSONResponse(content=result, status_code=http_status)


# ---------------------------------------------------------------------------
# Manual Entry Verification (No Image Required)
# ---------------------------------------------------------------------------

class ManualVerifyRequest(BaseModel):
    psn:         str
    last_name:   str
    first_name:  str
    middle_name: Optional[str] = ""
    dob:         str  # YYYY-MM-DD
    sex:         str  # M or F

@router.post("/verify-manual")
async def verify_manual_entry(req: ManualVerifyRequest):
    """
    Verify PhilSys identity using manually-entered data (no image).
    Useful for government counter stations where staff type in ID details.
    
    Calls PhilSys Check API directly without OCR step.
    """
    # Basic input validation
    psn_clean = req.psn.replace("-", "").replace(" ", "")
    if len(psn_clean) != 16 or not psn_clean.isdigit():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid PSN format. Must be 16 digits (e.g., 1234-5678-9012-3456). Got: '{req.psn}'"
        )

    if req.sex.upper() not in ("M", "F"):
        raise HTTPException(
            status_code=400,
            detail="Sex must be 'M' (Male) or 'F' (Female)."
        )

    from datetime import datetime
    try:
        datetime.strptime(req.dob, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Date of birth must be in YYYY-MM-DD format (e.g., 1990-05-15). Got: '{req.dob}'"
        )

    sandbox = os.getenv("PHILSYS_SANDBOX", "true").lower() == "true"

    if sandbox:
        result = philsys_service._mock_philsys_response(
            psn        = req.psn,
            last_name  = req.last_name,
            first_name = req.first_name,
            dob        = req.dob,
            sex        = req.sex.upper(),
        )
    else:
        try:
            result = await philsys_service.call_philsys_check_api(
                psn         = req.psn,
                last_name   = req.last_name,
                first_name  = req.first_name,
                middle_name = req.middle_name or "",
                dob         = req.dob,
                sex         = req.sex.upper(),
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    import random, string
    from datetime import datetime
    http_status = 200 if result.get("verified") else 422
    return JSONResponse(
        content={
            **result,
            "sandbox_mode": sandbox,
            "audit_id":     "PSC-MANUAL-" + "".join(random.choices(string.digits, k=8)),
            "timestamp":    datetime.utcnow().isoformat() + "Z",
            "input_psn_masked": f"****-****-****-{psn_clean[-4:]}",
        },
        status_code=http_status
    )


# ---------------------------------------------------------------------------
# QR Code Verification (openverify Integration)
# ---------------------------------------------------------------------------

@router.post("/verify-qr")
async def verify_qr(qr_string: str = Form(..., description="Raw QR code string from PhilID")):
    """
    Verify a PhilID QR code string via openverify integration.
    
    Supports:
    - PhilID v1 (Legacy) — Ed25519 signature validation
    - PhilID v3 (ePhilID) — CBOR decoding
    - eVerify (Public) — PCN lookup
    
    Send the raw QR string scanned from PhilID.
    """
    try:
        result = await philsys_service.verify_philid_qr(qr_string)
        http_status = 200 if result.get("verified") else 422
        return JSONResponse(content=result, status_code=http_status)
    except Exception as e:
        print(f"[PhilSys QR] Verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan-qr-image")
async def scan_qr_image(file: UploadFile = File(..., description="Image containing PhilID QR code")):
    """
    Upload an image containing PhilID QR code for verification.
    
    The service extracts QR code and verifies against PhilSys.
    """
    import io
    from PIL import Image
    import numpy as np
    
    try:
        image_bytes = await file.read()
        img = Image.open(io.BytesIO(image_bytes))
        
        # Convert to grayscale for QR detection
        img_gray = img.convert('L')
        
        # Simple QR detection placeholder
        # In production, integrate pyzbar or zbar
        # For now, return error with guidance
        return {
            "verified": False,
            "status": "ERROR",
            "error": "QR image scanning requires dedicated scanner app. Use /api/philsys/verify-qr with raw QR string instead.",
            "hint": "Use the PULSO Agent app or any QR scanner to get the raw QR string, then call /api/philsys/verify-qr"
        }
        
    except Exception as e:
        print(f"[PhilSys QR] Scan error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
