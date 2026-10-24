from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str
    requested_role: Optional[Literal["viewer", "owner"]] = "viewer"
    role_reason: Optional[str] = None
    agree_terms: bool = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserRoleUpdate(BaseModel):
    role: Literal["admin", "owner", "viewer"]

class UserStatusUpdate(BaseModel):
    is_active: bool

class RoleRequestAction(BaseModel):
    status: Literal["approved", "rejected"]
    admin_notes: Optional[str] = None
