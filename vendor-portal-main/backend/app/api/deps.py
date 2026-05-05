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
    Return the current Admin object. Enforces status='active'.
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
    admin = auth_svc.get_admin_by_id(admin_id)
    
    if not admin.is_active:
        raise UnauthorizedException("Admin account deactivated.")
    
    if admin.status == "password_change_required":
        # Special error for frontend to handle redirect
        raise UnauthorizedException("password_change_required")
    
    if admin.status != "active":
        raise UnauthorizedException("Admin account is not active.")
        
    return admin


def get_current_superadmin(
    admin=Depends(get_current_admin),
):
    """
    Enforce superadmin access (access_level == 2).
    """
    if admin.access_level != 2:
        from app.exceptions import ForbiddenException
        raise ForbiddenException("Superadmin access required.")
    return admin


def get_admin_with_pending_password(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Allows admins with status='password_change_required' to access specific endpoints.
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
    admin = auth_svc.get_admin_by_id(admin_id)

    if not admin.is_active:
        raise UnauthorizedException("Admin account deactivated.")
        
    if admin.status != "password_change_required":
         raise UnauthorizedException("Password change not required.")

    return admin
