"""Auth endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import LoginRequest, RegisterRequest, AdminLoginRequest
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
