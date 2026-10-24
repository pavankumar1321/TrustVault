from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class RoleRequestCreate(BaseModel):
    reason: Optional[str] = None

class RoleRequestResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    requested_role: str
    reason: Optional[str] = None
    status: str
    requested_at: datetime
    reviewed_at: Optional[datetime] = None
    admin_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
