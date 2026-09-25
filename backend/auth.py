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


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Shared FastAPI dependency — decodes JWT and returns the user object.
    Probes both Official and Resident tables to resolve the identity.
    """
    from database import get_db
    import crud
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
        # print(f"DEBUG: Found official {email}")
        return user
        
    # 2. Try Resident table
    user = db.query(models.Resident).filter(models.Resident.email == email).first()
    if user:
        # print(f"DEBUG: Found resident {email}")
        if not user.is_verified:
            raise unverified_exception
        return user
        
    # 3. Import logging for failed lookups
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
