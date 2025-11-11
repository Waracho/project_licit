from pydantic import BaseModel, Field
from typing import Optional

class RequestFileCreate(BaseModel):
    s3Key: str                        # <- requerido (antes url)
    fileName: Optional[str] = None
    contentType: Optional[str] = None
    size: Optional[int] = Field(default=None, ge=0)
    uploadedBy: Optional[str] = None  # userId
    bucket: Optional[str] = None      # opcional; si no viene, usarás el de env

class RequestFileOut(RequestFileCreate):
    id: str
    tenderRequestId: str
    createdAt: str