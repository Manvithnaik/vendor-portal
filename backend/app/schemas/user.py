from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


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
    id: int
    org_id: int
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

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
