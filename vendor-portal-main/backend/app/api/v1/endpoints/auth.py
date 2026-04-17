"""Auth endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.common import APIResponse, success_response
from app.schemas.auth import LoginRequest, RegisterRequest, AdminLoginRequest, ForgotPasswordRequest, ResetPasswordRequest
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
