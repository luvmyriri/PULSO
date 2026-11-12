from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db

import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
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


def create_account_access_token(user):
    from models import Official

    return create_access_token(
        {
            "sub": user.email,
            "account_type": "staff" if isinstance(user, Official) else "resident",
            "account_id": user.id,
            "sv": user.access_version or 0,
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def _resolve_token_account(db, payload):
    import models

    email = payload.get("sub")
    if not isinstance(email, str) or not email:
        return None

    account_types = {"staff": models.Official, "resident": models.Resident}
    if "account_type" in payload or "account_id" in payload:
        account_type = payload.get("account_type")
        account_id = payload.get("account_id")
        model = account_types.get(account_type) if isinstance(account_type, str) else None
        if model is None or type(account_id) is not int:
            return None
        return db.query(model).filter(model.id == account_id, model.email == email).first()

    # Pre-upgrade tokens carry only an email. Accept them only when it
    # identifies a single account across both account tables.
    official = db.query(models.Official).filter(models.Official.email == email).first()
    resident = db.query(models.Resident).filter(models.Resident.email == email).first()
    if official and resident:
        return None
    return official or resident


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    import models

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"require_exp": True})
    except JWTError as error:
        raise credentials_exception from error

    user = _resolve_token_account(db, payload)
    if user is None:
        raise credentials_exception
    if not user.is_active or user.is_suspended:
        detail = "Account is inactive or suspended." if isinstance(user, models.Official) else "Account is inactive."
        raise HTTPException(status_code=403, detail=detail)
    if payload.get("sv", 0) != (user.access_version or 0):
        raise credentials_exception
    if isinstance(user, models.Resident) and not user.is_verified:
        raise HTTPException(403, "Account not confirmed. Check your email or text messages for the registration code.")
    return user


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
    try:
        return get_current_user(token, db)
    except HTTPException:
        return None
