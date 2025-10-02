from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional

class ItemIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)

class ItemOut(BaseModel):
    id: str
    name: str


#testeo
class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    priority: Priority = Priority.medium
    due_date: Optional[str] = None  # ISO date (YYYY-MM-DD). Lo parseamos en la API.
    done: bool = False

class TaskOut(BaseModel):
    id: str
    title: str
    priority: Priority
    due_date: Optional[str] = None
    done: bool