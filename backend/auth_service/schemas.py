from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from typing import Optional, List
from datetime import datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID
    role: str
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    avatar: Optional[str] = "avatar-1"
    theme: Optional[str] = "cyan"
    display_mode: Optional[str] = "dark"

class UserRegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    role: str = Field(..., pattern="^(admin|cashier|mechanic|manager)$")
    password: str = Field(default="Welcome123!")
    avatar: Optional[str] = "avatar-1"
    theme: Optional[str] = "cyan"
    display_mode: Optional[str] = "dark"
    commission_rate: Optional[float] = None
    base_wage: Optional[float] = None

class UserUpdateRequest(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    role: str = Field(..., pattern="^(admin|cashier|mechanic|manager)$")
    avatar: Optional[str] = None
    theme: Optional[str] = None
    display_mode: Optional[str] = None
    commission_rate: Optional[float] = None
    base_wage: Optional[float] = None

class UserProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar: Optional[str] = None
    theme: Optional[str] = None
    display_mode: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str

class UserResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: EmailStr
    role: str
    avatar: Optional[str] = "avatar-1"
    theme: Optional[str] = "cyan"
    display_mode: Optional[str] = "dark"
    commission_rate: Optional[float] = None
    base_wage: Optional[float] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AuditLogCreate(BaseModel):
    action: str
    resource: str
    details: Optional[dict] = None
    user_id: Optional[str] = None
    user_role: Optional[str] = None

