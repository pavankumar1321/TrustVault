from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel

T = TypeVar("T")

class ResponseBase(BaseModel):
    success: bool = True
    message: Optional[str] = None

class DataResponse(ResponseBase, Generic[T]):
    data: T

class PaginatedMeta(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int

class PaginatedResponse(ResponseBase, Generic[T]):
    data: List[T]
    meta: PaginatedMeta
