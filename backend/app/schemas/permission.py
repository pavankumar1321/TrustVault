from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, ConfigDict

class PermissionGrant(BaseModel):
    user_email: EmailStr
    permission_level: Literal["read", "edit"]

class PermissionUpdate(BaseModel):
    permission_level: Literal["read", "edit"]

class PermissionResponse(BaseModel):
    id: int
    document_id: int
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    permission_level: str
    granted_by_id: Optional[int] = None
    granted_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
