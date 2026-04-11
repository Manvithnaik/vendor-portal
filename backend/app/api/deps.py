"""
Shared FastAPI dependencies used by all route handlers.
"""
from typing import Optional
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.services.auth_service import AuthService
from app.exceptions import UnauthorizedException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Decode the JWT and return the current User object.
    Raises UnauthorizedException for invalid/expired tokens.
    """
    try:
        payload = decode_access_token(token)
        user_id: Optional[int] = int(payload.get("sub"))
        token_type: Optional[str] = payload.get("type")
        if not user_id or token_type != "user":
            raise UnauthorizedException("Invalid token payload.")
    except (JWTError, ValueError):
        raise UnauthorizedException("Could not validate credentials.")

    auth_svc = AuthService(db)
    return auth_svc.get_user_by_id(user_id)


def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Decode the JWT and return the current Admin object.
    Used by admin-only endpoints.
    """
    try:
        payload = decode_access_token(token)
        admin_id: Optional[int] = int(payload.get("sub"))
        token_type: Optional[str] = payload.get("type")
        if not admin_id or token_type != "admin":
            raise UnauthorizedException("Admin token required.")
    except (JWTError, ValueError):
        raise UnauthorizedException("Could not validate admin credentials.")

    auth_svc = AuthService(db)
    return auth_svc.get_admin_by_id(admin_id)
