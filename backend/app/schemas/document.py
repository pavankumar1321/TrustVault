from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class DocumentMetadataUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)

class DocumentOwnerInfo(BaseModel):
    id: int
    full_name: str
    email: str

    model_config = ConfigDict(from_attributes=True)

class DocumentResponse(BaseModel):
    id: int
    uuid: str
    title: str
    description: Optional[str] = None
    category: str
    original_filename: str
    mime_type: str
    file_size: int
    checksum: str
    owner_id: int
    owner: Optional[DocumentOwnerInfo] = None
    created_at: datetime
    updated_at: datetime
    user_permission: Optional[str] = None  # 'owner', 'read', 'edit'

    model_config = ConfigDict(from_attributes=True)

class DocumentListFilter(BaseModel):
    search: Optional[str] = None
    category: Optional[str] = None
    page: int = 1
    limit: int = 10
