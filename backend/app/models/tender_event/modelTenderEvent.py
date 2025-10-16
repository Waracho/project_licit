from pydantic import BaseModel
from typing import Optional, Literal, Dict, Any

TenderEventType = Literal[
    "CREATED",
    "FILE_ATTACHED",
    "FILE_REMOVED",
    "REVIEW_APPROVED",
    "REVIEW_REJECTED",
    "STATUS_CHANGED",
]

class TenderEventOut(BaseModel):
    id: str
    tenderRequestId: str
    type: TenderEventType
    actorUserId: str
    at: str
    level: Optional[int] = None
    comment: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
