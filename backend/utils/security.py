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
