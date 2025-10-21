# app/models_chat.py
from pydantic import BaseModel, Field
from typing import Optional

# app/models_chat.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ChatCreateIn(BaseModel):
    bidderUserId: str
    tenderRequestId: Optional[str] = None
    workerUserId: Optional[str] = None

class ChatOut(BaseModel):
    id: str
    tenderRequestId: Optional[str] = None
    bidderUserId: str
    workerUserId: str
    status: str
    unreadBidder: int
    unreadWorker: int
    lastMessagePreview: Optional[str] = None
    lastMessageAt: Optional[datetime] = None

class MessageIn(BaseModel):
    senderUserId: str
    text: str = Field(min_length=1, max_length=4000)

class MessageOut(BaseModel):
    id: str
    chatId: str
    senderUserId: str
    text: str
    createdAt: datetime
