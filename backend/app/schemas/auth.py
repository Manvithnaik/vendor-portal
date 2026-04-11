"""
Pydantic schemas for authentication — login, registration, and token response.
Uses frontend-friendly role names; the service layer performs the mapping.
"""
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, field_validator


# Frontend sends one of these three role strings
FrontendRole = Literal["vendor", "manufacturer", "admin"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: FrontendRole


class RegisterRequest(BaseModel):
    """
    Unified registration payload.
    Frontend may send 'vendor' or 'manufacturer' as the role.
    org_name is required; remaining org fields are optional extras.
    """
    role: FrontendRole
    org_name: str
    email: EmailStr
    password: str
    confirm_password: str

    # Optional org-level details
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    website: Optional[str] = None

    # User-level details
    first_name: str
    last_name: str
    user_phone: Optional[str] = None

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class AdminLoginRequest(BaseModel):
    """Separate login for platform admins (uses admins table)."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    org_id: int
    role: str
    org_type: str
    full_name: str
    email: str


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin_id: int
    role: str
    name: str
    email: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str

    @field_validator("confirm_new_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v
