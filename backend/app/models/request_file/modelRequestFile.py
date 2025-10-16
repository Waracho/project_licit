from pydantic import BaseModel, Field
from typing import Optional

class RequestFileCreate(BaseModel):
    url: str
    fileName: Optional[str] = None
    contentType: Optional[str] = None
    size: Optional[int] = Field(default=None, ge=0)
    uploadedBy: Optional[str] = None  # userId (opcional)

class RequestFileOut(RequestFileCreate):
    id: str
    tenderRequestId: str
    createdAt: str