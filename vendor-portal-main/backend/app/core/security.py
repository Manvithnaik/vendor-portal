from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt as _bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# ---------------------------------------------------------------------------
# Password hashing — using bcrypt directly (passlib 1.7.4 breaks with bcrypt>=4)
# ---------------------------------------------------------------------------

def hash_password(plain_password: str) -> str:
    """Return bcrypt hash of the plain-text password."""
    password_bytes = plain_password.encode("utf-8")[:72]   # bcrypt max = 72 bytes
    salt = _bcrypt.gensalt(rounds=12)
    return _bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if plain_password matches the stored bcrypt hash."""
    try:
        password_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return _bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------
def create_access_token(
    subject: Any,
    extra_claims: Optional[dict] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT.

    Args:
        subject: typically the user id (stored in 'sub' claim).
        extra_claims: additional payload fields (e.g. org_id, role).
        expires_delta: override the default expiry window.

    Returns:
        Encoded JWT string.
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload: dict = {"sub": str(subject), "exp": expire}
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT.

    Returns:
        Decoded payload dict.

    Raises:
        JWTError: if the token is invalid or expired.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
