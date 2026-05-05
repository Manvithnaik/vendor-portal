from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, computed_field


class UserCreate(BaseModel):
    org_id: int
    role_id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    is_purchasing_authority: bool = False


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    is_purchasing_authority: Optional[bool] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    user_id: int       # canonical user PK — use this instead of bare 'id'
    id: int = 0        # backward-compat alias; prefer user_id
    org_id: int        # canonical B2B org identifier
    role_id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    is_purchasing_authority: bool
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class AdminResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    access_level: int
    status: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    temp_password: Optional[str] = None

    model_config = {"from_attributes": True}
