from pydantic import BaseModel, Field
from typing import Literal, Optional, List

RoleKey = Literal["BIDDER","ADMIN","WORKER"]

class RoleIn(BaseModel):
    key: str  # <- antes: Literal["BIDDER","ADMIN","WORKER"]
    name: str = Field(min_length=2, max_length=60)

class RoleOut(BaseModel):
    id: str
    key: str
    name: str

class RolePermissionsUpdate(BaseModel):
    allDepartments: Optional[bool] = None
    allowedDepartmentIds: Optional[List[str]] = None