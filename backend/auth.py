from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db

import os

# Secret key for JWT — loaded from environment for security
# During development, we use a stable fallback to prevent 401s on server reload
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "PULSO_CORE_ENGINE_DEV_SECURE_TOKEN_2024_LGU_CALOOCAN")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


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
