"""Auth endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.api.deps import get_current_user, get_current_admin, get_admin_with_pending_password
from app.schemas.auth import (
    LoginRequest, RegisterRequest, AdminLoginRequest, 
    ForgotPasswordRequest, ResetPasswordRequest, PasswordChangeRequest,
    AdminSetPasswordRequest, AdminChangePasswordRequest
)
from app.schemas.common import APIResponse, success_response
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=APIResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    svc = AuthService(db)
    result = svc.register(data)
    return success_response("Registration successful. Awaiting admin approval.", result)


@router.post("/login", response_model=APIResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    svc = AuthService(db)
    result = svc.login(data)
    return success_response("Login successful.", result)


@router.post("/admin/login", response_model=APIResponse)
def admin_login(data: AdminLoginRequest, db: Session = Depends(get_db)):
    svc = AuthService(db)
    result = svc.admin_login(data)
    return success_response("Admin login successful.", result)


@router.get("/me", response_model=APIResponse)
def get_me(current_user=Depends(get_current_user)):
    from app.schemas.user import UserResponse
    return success_response("Current user retrieved.", UserResponse.model_validate(current_user))


@router.post("/forgot-password", response_model=APIResponse)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    svc = AuthService(db)
    svc.forgot_password(data.email)
    return success_response("If that email exists in our system, a password reset link has been sent.")


@router.get("/reset-password/validate", response_model=APIResponse)
def validate_reset_token(token: str, db: Session = Depends(get_db)):
    svc = AuthService(db)
    svc.validate_reset_token(token)
    return success_response("Token is valid.")


@router.post("/reset-password", response_model=APIResponse)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    svc = AuthService(db)
    svc.reset_password(data.token, data.new_password)
    return success_response("Password has been successfully updated.")


@router.get("/application/status", response_model=APIResponse)
def get_application_status(email: str, db: Session = Depends(get_db)):
    svc = AuthService(db)
    result = svc.get_application_status(email)
    return success_response("Application status retrieved.", result)


@router.post("/change-password", response_model=APIResponse)
def change_password(
    data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    svc = AuthService(db)
    svc.change_password(current_user.id, data)
    return success_response("Password changed successfully.")


@router.post("/admin/change-password", response_model=APIResponse)
def change_admin_password(
    data: AdminChangePasswordRequest,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """Admin/Superadmin: change password."""
    svc = AuthService(db)
    svc.change_admin_password(current_admin.id, data.current_password, data.new_password)
    return success_response("Password changed successfully.")


@router.post("/admin/setup-password", response_model=APIResponse)
def setup_admin_password(
    data: AdminSetPasswordRequest,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Verify invitation token and set the first password."""
    from app.core.security import verify_invitation_token, hash_password
    from app.models.vendor_portal import Admin, AuditLog
    from jose import JWTError

    try:
        admin_id = verify_invitation_token(token)
    except JWTError:
        from app.exceptions import ValidationException
        raise ValidationException("Invalid or expired invitation token.")

    admin = db.query(Admin).filter(Admin.id == admin_id, Admin.deleted_at.is_(None)).first()
    if not admin:
        from app.exceptions import NotFoundException
        raise NotFoundException("Admin")

    if admin.status == "active":
        from app.exceptions import ValidationException
        raise ValidationException("Account already set up.")

    # Update password and activate
    admin.password_hash = hash_password(data.new_password)
    admin.status = "active"
    admin.is_active = True
    admin.last_login_at = datetime.utcnow()
    
    db.add(AuditLog(
        entity_type="admin",
        entity_id=admin.id,
        action="password_setup",
        changed_by=admin.id
    ))
    db.commit()

    return success_response("Account set up successfully. You can now log in.")


@router.get("/admin/verify-invite", response_model=APIResponse)
def verify_admin_invite(token: str = Query(...), db: Session = Depends(get_db)):
    """Check if an invitation token is valid without changing anything."""
    from app.core.security import verify_invitation_token
    from app.models.vendor_portal import Admin
    from jose import JWTError

    try:
        admin_id = verify_invitation_token(token)
    except JWTError:
        from app.exceptions import ValidationException
        raise ValidationException("Invalid or expired invitation token.")

    admin = db.query(Admin).filter(Admin.id == admin_id, Admin.deleted_at.is_(None)).first()
    if not admin or admin.status == "active":
        from app.exceptions import ValidationException
        raise ValidationException("Invalid invitation or already set up.")

    return success_response("Token valid.", {"name": admin.name, "email": admin.email})
