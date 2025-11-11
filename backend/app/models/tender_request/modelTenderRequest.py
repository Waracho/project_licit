# app/models/tender_request/modelTenderRequest.py
from pydantic import BaseModel, Field
from typing import Literal, Optional

# Enums simples; si quieres otros valores, los cambiamos fácil
TenderCategory = Literal["ELECTRICAL", "WATER", "INTERNET"]
TenderStatus = Literal["DRAFT","OPEN","IN_REVIEW","AWARDED","CANCELLED","REJECTED"]

from pydantic import BaseModel, Field
from typing import Optional

# Nota: si más adelante fijas ENUMs, cámbialos aquí para que Pydantic valide.
# Mientras tanto, las dejo como str y dejamos que el validador de Mongo haga el resto.

class TenderRequestIn(BaseModel):
    departmentId: str               # FK -> departments._id
    createdBy: str                  # FK -> users._id
    code: str = Field(min_length=1, max_length=40)
    category: TenderCategory
    status: TenderStatus
    requiredLevels: int = Field(ge=1, le=10)
    currentLevel: int = Field(default=0, ge=0)

class TenderRequestUpdate(BaseModel):
    departmentId: Optional[str] = None
    code: Optional[str] = Field(default=None, min_length=1, max_length=40)
    category: Optional[TenderCategory] = None
    status: Optional[TenderStatus] = None
    requiredLevels: Optional[int] = Field(default=None, ge=1, le=10)
    currentLevel: Optional[int] = Field(default=None, ge=0)

class TenderRequestOut(TenderRequestIn):
    id: str
    createdAt: str                  # ISO string (si quieres datetime, puedo ajustarlo)
    modifiedAt: str

class ReviewAction(BaseModel):
    decision: Literal["APPROVE", "REJECT"]
    actorUserId: str
    comment: Optional[str] = None