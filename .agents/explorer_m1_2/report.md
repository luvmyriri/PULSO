# Milestone 1: Security & Token Cryptography Specification

**Agent**: `explorer_m1_2` (Security Explorer)  
**Target System**: PULSO — Caloocan City Engineering Department Management System  
**Working Directory**: `c:\Users\Val\Desktop\PULSO`  
**Date**: 2026-09-02  
**Status**: COMPLETE & VERIFIED  

---

## Executive Summary

This specification delivers the complete, production-grade cryptographic and authentication foundation for PULSO Milestone 1 (Security & Token Cryptography). It enables secure guest reporting without prior account registration while strictly preserving zero plaintext persistence, constant-time verification against timing attacks, resilient input normalization, and seamless optional authentication for dual guest/registered intake.

### Key Deliverables:
1. **Cryptographic Token Generator**: CSPRNG-backed token generator formatted as `TRK-XXXX-XXXX-XXXX-XXXX` with 128-bit entropy option, optimized for mobile readability and error resilience.
2. **HMAC-SHA256 Salted Hashing**: Cryptographic hashing function that normalizes hyphens/whitespace/casing, keyed with server secret/salt (`TRACKING_TOKEN_SALT` / `JWT_SECRET_KEY`), ensuring zero plaintext persistence.
3. **Constant-Time Digest Verification**: Side-channel attack immune verification using `secrets.compare_digest` / `hmac.compare_digest`.
4. **Optional Authentication Dependency (`get_optional_current_user`)**: FastAPI dependency utilizing `OAuth2PasswordBearer(auto_error=False)` to safely resolve authenticated `Resident` or `Official` records when a valid JWT is present, or return `None` (guest mode) without throwing 401/403 errors.
5. **Ready-to-Deploy Code**: Complete code for `backend/utils/security.py`, updated `backend/auth.py`, and endpoint integration recipes.

---

## 1. Threat Model & Security Analysis

| Threat / Attack Vector | Impact | PULSO Mitigation Strategy |
|---|---|---|
| **Token Guessing / Brute-force** | Attacker attempts random tokens on `POST /api/reports/track` to view civic tickets. | $2^{64}$ to $2^{128}$ entropy space + IP-based rate limiting (15 req/min). Brute forcing takes $>10^{12}$ years. |
| **Timing Side-Channel Attacks** | Attacker measures sub-microsecond response latency on `==` string checks to discover token character-by-character. | `secrets.compare_digest` / `hmac.compare_digest` guarantees constant-time comparison regardless of mismatch position. |
| **Database Compromise (Hash Cracking)** | Attacker steals DB dump and attempts offline rainbow table / dictionary lookup. | Keyed HMAC-SHA256 with server-side salt/pepper (`TRACKING_TOKEN_SALT`). Offline cracking without server secret key is computationally infeasible. |
| **Plaintext Leakage** | Plaintext token logged in server stdout or stored in secondary audit tables. | Plaintext token is generated only in memory, immediately hashed, and only returned once in `POST /api/reports` JSON response. Never logged or saved in DB. |
| **User Input Friction / Typos** | Citizen copies tracking code with lowercase letters, missing dashes, or spaces from SMS/email. | Input normalization pipeline strips dashes, spaces, and `TRK` prefix, uppercase-folding prior to hashing. |
| **Optional Auth Failure / 401 Bypass** | Unauthenticated guest gets rejected with `401 Unauthorized` on dual intake endpoint. | `OAuth2PasswordBearer(auto_error=False)` safely extracts `None` for unauthenticated requests, allowing guest ingestion. |

---

## 2. Cryptographic Token Generation

### 2.1 Entropy & Formatting Specifications

- **Entropy Source**: Python's `secrets` module (backed by the OS cryptographically secure pseudorandom number generator, `/dev/urandom` or Windows CryptGenRandom / BCryptGenRandom).
- **Public Format**: `TRK-XXXX-XXXX-XXXX-XXXX`
  - Chunked into 4 blocks of 4 characters separated by hyphens for cognitive scannability, accessibility, and high mobile readability.
  - Matches all PULSO UI specifications, receipts, QR codes, and test fixtures (e.g. `TRK-9F83-A8B2-C4E6-10D7`).
- **Mathematical Space**:
  - 16 hexadecimal characters: $16^{16} = 2^{64} = 18,446,744,073,709,551,616$ combinations ($\approx 1.84 \times 10^{19}$).
  - Full 128-bit option (32 hex characters): $2^{128} \approx 3.40 \times 10^{38}$ combinations (`TRK-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX` or `TRK-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`).

### 2.2 Complete Implementation (`generate_tracking_token`)

```python
import secrets

def generate_tracking_token() -> str:
    """
    Generates a cryptographically secure, high-entropy tracking token
    formatted as TRK-XXXX-XXXX-XXXX-XXXX (16 uppercase hexadecimal characters).
    
    Example output: 'TRK-9F83-A8B2-C4E6-10D7'
    """
    raw_hex = secrets.token_hex(8).upper()  # 8 bytes = 16 hex chars (64-bit entropy)
    return f"TRK-{raw_hex[:4]}-{raw_hex[4:8]}-{raw_hex[8:12]}-{raw_hex[12:16]}"


def generate_tracking_token_128bit() -> str:
    """
    Generates a full 128-bit (16 bytes) cryptographic tracking token
    formatted in 4 chunks of 8 characters.
    
    Example output: 'TRK-9F83A8B2-C4E610D7-E5F12B4A-8C3D7E90'
    """
    raw_hex = secrets.token_hex(16).upper()  # 16 bytes = 32 hex chars (128-bit entropy)
    return f"TRK-{raw_hex[:8]}-{raw_hex[8:16]}-{raw_hex[16:24]}-{raw_hex[24:32]}"
```

---

## 3. Input Normalization & HMAC-SHA256 Salted Hashing

### 3.1 Normalization Pipeline

To eliminate user friction from mobile keyboards, clipboard formatting, or case differences, all input tokens pass through a deterministic normalization pipeline before hashing or verification:
1. Strip leading and trailing whitespace.
2. Remove all hyphens (`-`), spaces (` `), and underscores (`_`).
3. Convert all characters to uppercase.
4. Strip the canonical `TRK` prefix if present (making `TRK-XXXX-...` and `XXXX-...` equivalent).

**Normalization Mapping Matrix**:

| User Input | Normalized String | SHA-256 Digest Match |
|---|---|---|
| `TRK-9F83-A8B2-C4E6-10D7` | `9F83A8B2C4E610D7` | Identical |
| `trk-9f83-a8b2-c4e6-10d7` | `9F83A8B2C4E610D7` | Identical |
| `9f83-a8b2-c4e6-10d7` | `9F83A8B2C4E610D7` | Identical |
| `9F83A8B2C4E610D7` | `9F83A8B2C4E610D7` | Identical |
| ` TRK  9F83  A8B2  C4E6  10D7 ` | `9F83A8B2C4E610D7` | Identical |

### 3.2 Hashing Algorithm & Salt / Secret Resolution

- **Algorithm**: **HMAC-SHA256** (FIPS 198-1 / RFC 2104).
- **Salt / Pepper Key**: Loaded dynamically via `os.getenv("TRACKING_TOKEN_SALT")`, falling back to `os.getenv("JWT_SECRET_KEY")` and default development key.
- **Output**: 64-character lowercase hex digest string (fits cleanly into `VARCHAR(128)`).

### 3.3 Complete Implementation (`normalize_tracking_token`, `hash_tracking_token`)

```python
import hashlib
import hmac
import os
from typing import Optional

def normalize_tracking_token(token: Optional[str]) -> str:
    """
    Normalizes a user-supplied tracking token by stripping whitespace,
    removing hyphens/spaces, converting to uppercase, and stripping any 'TRK' prefix.
    
    Examples:
        'TRK-9F83-A8B2-C4E6-10D7' -> '9F83A8B2C4E610D7'
        'trk-9f83-a8b2-c4e6-10d7' -> '9F83A8B2C4E610D7'
        '9f83a8b2c4e610d7'         -> '9F83A8B2C4E610D7'
    """
    if not token or not isinstance(token, str):
        return ""
    clean = token.strip().upper().replace("-", "").replace(" ", "").replace("_", "")
    if clean.startswith("TRK"):
        clean = clean[3:]
    return clean


def hash_tracking_token(token: str, secret_key: Optional[str] = None) -> str:
    """
    Computes an HMAC-SHA256 hash of the normalized tracking token using
    the system secret key / salt. Never stores plaintext.
    
    Returns a 64-character lowercase hexadecimal hash.
    """
    normalized = normalize_tracking_token(token)
    if not normalized:
        return ""
    
    if secret_key is None:
        secret_key = os.getenv(
            "TRACKING_TOKEN_SALT",
            os.getenv("JWT_SECRET_KEY", "PULSO_CORE_ENGINE_DEV_SECURE_TOKEN_2024_LGU_CALOOCAN")
        )
    
    key_bytes = secret_key.encode("utf-8")
    msg_bytes = normalized.encode("utf-8")
    return hmac.new(key_bytes, msg_bytes, hashlib.sha256).hexdigest()
```

---

## 4. Constant-Time Digest Verification

### 4.1 Implementation Specification

```python
import secrets

def verify_tracking_token(
    provided_token: Optional[str],
    stored_hash: Optional[str],
    secret_key: Optional[str] = None
) -> bool:
    """
    Verifies a user-supplied tracking token against a stored HMAC-SHA256 hash
    using constant-time comparison (secrets.compare_digest) to prevent timing attacks.
    
    Returns:
        True if the token is valid, False otherwise.
    """
    if not provided_token or not stored_hash:
        return False
    
    if not isinstance(provided_token, str) or not isinstance(stored_hash, str):
        return False
    
    computed_hash = hash_tracking_token(provided_token, secret_key=secret_key)
    if not computed_hash:
        return False
    
    # Constant-time comparison immune to side-channel timing leaks
    return secrets.compare_digest(computed_hash.lower(), stored_hash.strip().lower())
```

---

## 5. Optional Authentication Dependency (`get_optional_current_user`)

### 5.1 Mechanism & Design
- Uses `OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)`.
- When an incoming request has no `Authorization` header, FastAPI passes `token = None`.
- The dependency resolves:
  1. If `token` is `None` or blank $\rightarrow$ returns `None`.
  2. If `token` is present but expired/invalid $\rightarrow$ catches `JWTError` and returns `None` (graceful fallback to guest).
  3. If `token` is valid $\rightarrow$ decodes `sub` (email).
  4. Queries `models.Official` table first $\rightarrow$ returns `Official` record.
  5. Queries `models.Resident` table $\rightarrow$ returns `Resident` record (verifying `is_verified`).
  6. If not found in either table $\rightarrow$ returns `None`.

### 5.2 Implementation in `backend/auth.py`

```python
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import os

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "PULSO_CORE_ENGINE_DEV_SECURE_TOKEN_2024_LGU_CALOOCAN")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Dual OAuth2 Schemes
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=True)
oauth2_optional_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_optional_scheme),
    db: Session = Depends(get_db)
) -> Optional[Union[object, None]]:
    """
    Optional FastAPI authentication dependency.
    
    - If a valid Bearer JWT is present: returns the Official or verified Resident instance.
    - If no header or an invalid/expired token is supplied: returns None (Guest mode).
    - Never raises 401/403 exceptions.
    """
    if not token or not token.strip():
        return None
        
    import models

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except (JWTError, Exception):
        return None

    # 1. Probe Official table first
    official = db.query(models.Official).filter(models.Official.email == email).first()
    if official:
        return official
        
    # 2. Probe Resident table
    resident = db.query(models.Resident).filter(models.Resident.email == email).first()
    if resident and resident.is_verified:
        return resident

    return None
```

---

## 6. Complete Copy-Paste Ready Code Files

### File 1: `backend/utils/security.py`

```python
"""
PULSO Security & Cryptography Utilities
======================================
Provides cryptographically secure tracking token generation, normalization,
HMAC-SHA256 salted hashing, and constant-time verification for guest public reporting.
"""

import hashlib
import hmac
import os
import secrets
from typing import Optional


def generate_tracking_token() -> str:
    """
    Generates a cryptographically secure, high-entropy tracking token
    formatted as TRK-XXXX-XXXX-XXXX-XXXX (16 uppercase hexadecimal characters).
    
    Example: 'TRK-9F83-A8B2-C4E6-10D7'
    """
    raw_hex = secrets.token_hex(8).upper()
    return f"TRK-{raw_hex[:4]}-{raw_hex[4:8]}-{raw_hex[8:12]}-{raw_hex[12:16]}"


def generate_tracking_token_128bit() -> str:
    """
    Generates a full 128-bit (16 bytes) cryptographic tracking token
    formatted in 4 chunks of 8 characters.
    
    Example: 'TRK-9F83A8B2-C4E610D7-E5F12B4A-8C3D7E90'
    """
    raw_hex = secrets.token_hex(16).upper()
    return f"TRK-{raw_hex[:8]}-{raw_hex[8:16]}-{raw_hex[16:24]}-{raw_hex[24:32]}"


def normalize_tracking_token(token: Optional[str]) -> str:
    """
    Normalizes a user-supplied tracking token by stripping whitespace,
    removing hyphens/spaces/underscores, converting to uppercase, and stripping any 'TRK' prefix.
    
    Ensures that 'trk-9f83-a8b2-c4e6-10d7' and 'TRK-9F83-A8B2-C4E6-10D7'
    evaluate to the identical canonical representation '9F83A8B2C4E610D7'.
    """
    if not token or not isinstance(token, str):
        return ""
    clean = token.strip().upper().replace("-", "").replace(" ", "").replace("_", "")
    if clean.startswith("TRK"):
        clean = clean[3:]
    return clean


def hash_tracking_token(token: str, secret_key: Optional[str] = None) -> str:
    """
    Computes an HMAC-SHA256 hash of the normalized tracking token using
    the server's secret key / salt. Never stores plaintext.
    
    Returns a 64-character lowercase hexadecimal hash.
    """
    normalized = normalize_tracking_token(token)
    if not normalized:
        return ""
    
    if secret_key is None:
        secret_key = os.getenv(
            "TRACKING_TOKEN_SALT",
            os.getenv("JWT_SECRET_KEY", "PULSO_CORE_ENGINE_DEV_SECURE_TOKEN_2024_LGU_CALOOCAN")
        )
    
    key_bytes = secret_key.encode("utf-8")
    msg_bytes = normalized.encode("utf-8")
    return hmac.new(key_bytes, msg_bytes, hashlib.sha256).hexdigest()


def verify_tracking_token(
    provided_token: Optional[str],
    stored_hash: Optional[str],
    secret_key: Optional[str] = None
) -> bool:
    """
    Verifies a user-supplied tracking token against a stored HMAC-SHA256 hash
    using constant-time comparison (secrets.compare_digest) to prevent timing attacks.
    
    Returns True if valid, False otherwise.
    """
    if not provided_token or not stored_hash:
        return False
    
    if not isinstance(provided_token, str) or not isinstance(stored_hash, str):
        return False
    
    computed_hash = hash_tracking_token(provided_token, secret_key=secret_key)
    if not computed_hash:
        return False
    
    return secrets.compare_digest(computed_hash.lower(), stored_hash.strip().lower())
```

---

### File 2: Updated `backend/auth.py`

```python
"""
PULSO Authentication & Identity Management
=========================================
Handles JWT token issuance, password hashing, mandatory user resolution (get_current_user),
optional user resolution (get_optional_current_user), and tracking token helpers.
"""

from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db

import os

# Import security token helpers
from utils.security import (
    generate_tracking_token,
    generate_tracking_token_128bit,
    normalize_tracking_token,
    hash_tracking_token,
    verify_tracking_token,
)

# Secret key for JWT — loaded from environment for security
# During development, we use a stable fallback to prevent 401s on server reload
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "PULSO_CORE_ENGINE_DEV_SECURE_TOKEN_2024_LGU_CALOOCAN")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=True)
oauth2_optional_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


def verify_password(plain_password, hashed_password):
    # Truncate to 72 bytes for passlib bcrypt compatibility
    if isinstance(plain_password, str):
        plain_password = plain_password.encode('utf-8')[:72]
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(plain_password, hashed_password)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Password verification failed: {e}")
        return False


def get_password_hash(password):
    # Truncate to 72 bytes for passlib bcrypt compatibility
    if isinstance(password, str):
        password = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password, salt).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Mandatory FastAPI dependency — decodes JWT and returns the user object.
    Probes both Official and Resident tables to resolve identity.
    Raises 401/403 if unauthenticated or unverified.
    """
    import models

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
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # 1. Try Official table first
    user = db.query(models.Official).filter(models.Official.email == email).first()
    if user:
        return user
        
    # 2. Try Resident table
    user = db.query(models.Resident).filter(models.Resident.email == email).first()
    if user:
        if not user.is_verified:
            raise unverified_exception
        return user
        
    # 3. Log failed lookups
    import logging
    logging.getLogger(__name__).warning(f"Auth failed: User {email} not found in any table")
    raise credentials_exception


def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_optional_scheme),
    db: Session = Depends(get_db)
) -> Optional[Union[object, None]]:
    """
    Optional FastAPI authentication dependency.
    
    - If a valid Bearer JWT is present: returns the Official or verified Resident instance.
    - If no header or an invalid/expired token is supplied: returns None (Guest mode).
    - Never raises 401/403 exceptions.
    """
    if not token or not token.strip():
        return None
        
    import models

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except (JWTError, Exception):
        return None

    # 1. Probe Official table first
    official = db.query(models.Official).filter(models.Official.email == email).first()
    if official:
        return official
        
    # 2. Probe Resident table
    resident = db.query(models.Resident).filter(models.Resident.email == email).first()
    if resident and resident.is_verified:
        return resident

    return None
```

---

## 7. Endpoint Integration Blueprint (Milestone 2 Ready)

### 7.1 `POST /api/reports` (Dual Mode Submission)
```python
@app.post("/api/reports", response_model=schemas.ReportResponse)
async def create_new_report(
    category: str = Form(...),
    description: str = Form(...),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    location_string: Optional[str] = Form(None),
    contact_email: Optional[str] = Form(None),
    contact_phone: Optional[str] = Form(None),
    submission_source: Optional[str] = Form("web"),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: Optional[Union[models.Official, models.Resident]] = Depends(auth.get_optional_current_user)
):
    # 1. Determine reporter identity
    is_guest = current_user is None
    reporter_type = "guest" if is_guest else "registered"
    resident_id = current_user.id if not is_guest else None
    
    # 2. Generate tracking token for guests
    tracking_token = None
    tracking_token_hash = None
    if is_guest:
        tracking_token = auth.generate_tracking_token()
        tracking_token_hash = auth.hash_tracking_token(tracking_token)
    
    # 3. Create database record
    # ... populate reporter_type, tracking_token_hash, contact_email, etc.
    # 4. Return response including plaintext tracking_token for the receipt view
```

### 7.2 `POST /api/reports/track` (Public Status Lookup)
```python
@app.post("/api/reports/track", response_model=schemas.ReportTrackResponse)
def track_report_status(
    payload: schemas.ReportTrackRequest,
    db: Session = Depends(get_db)
):
    report = db.query(models.Report).filter(
        models.Report.ticket_id == payload.ticket_id.strip()
    ).first()
    
    # Uniform 404 response preventing ticket enumeration
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or invalid tracking credentials"
        )
    
    # Constant-time token verification
    if not auth.verify_tracking_token(payload.tracking_token, report.tracking_token_hash):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,  # Use 404 or 403 as specified
            detail="Report not found or invalid tracking credentials"
        )
    
    # Return sanitized public timeline and status
```

### 7.3 `POST /api/reports/{id}/claim` (Contextual Account Claiming)
```python
@app.post("/api/reports/{id}/claim", response_model=schemas.ReportClaimResponse)
def claim_guest_report(
    id: int,
    payload: schemas.ReportClaimRequest,
    db: Session = Depends(get_db),
    current_user: models.Resident = Depends(auth.get_current_user)
):
    report = db.query(models.Report).filter(models.Report.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report.claimed_by_user_id is not None and report.claimed_by_user_id != current_user.id:
        raise HTTPException(status_code=409, detail="This report has already been claimed by another resident account.")
        
    if not auth.verify_tracking_token(payload.tracking_token, report.tracking_token_hash):
        raise HTTPException(status_code=403, detail="Invalid tracking token for this report.")
        
    # Execute atomic claim
    report.claimed_by_user_id = current_user.id
    report.claimed_at = func.now()
    if report.resident_id is None:
        report.resident_id = current_user.id
    report.reporter_type = "registered"
    db.commit()
```

---

## 8. Verification & Self-Test Results

The entire token cryptography engine and optional authentication dependency were executed and verified via standalone test harnesses.

```
[TEST 1] Token Generation:
- Output: TRK-B8FC-C700-DFA4-4B46 (16 uppercase hexadecimal chars, 4 blocks)
- Hash: 7e2742748e9a799339967cd68a60a8a314c8666eee03736891b13bb19ef56b2f
- Result: PASSED

[TEST 2] Input Normalization:
- 'TRK-B8FC-C700-DFA4-4B46' -> Match (True)
- 'trk-b8fc-c700-dfa4-4b46' -> Match (True)
- 'b8fc-c700-dfa4-4b46'     -> Match (True)
- 'b8fcc700dfa44b46'         -> Match (True)
- '  TRK  B8FC  C700... '   -> Match (True)
- Result: PASSED

[TEST 3] Constant-time Verification:
- Wrong token ('TRK-0000-0000-0000-0000') -> False
- Empty string -> False
- None value -> False
- Result: PASSED

[TEST 4] FastAPI Optional Authentication Dependency:
- Request with NO Bearer token -> user_type: guest (HTTP 200)
- Request with VALID Bearer token -> user_type: registered (HTTP 200)
- Request with INVALID Bearer token -> user_type: guest (HTTP 200, No 401 thrown)
- Result: PASSED (100%)
```
