from pydantic import BaseModel, Field
from typing import Literal, Optional, List

RoleKey = Literal["BIDDER","ADMIN","WORKER"]

class RoleIn(BaseModel):
    key: RoleKey
    name: str = Field(min_length=2, max_length=60)

class RoleOut(RoleIn):
    id: str

# ===== ROLES PERMISSIONS PATCH =====
class RolePermissionsUpdate(BaseModel):
    allDepartments: Optional[bool] = None
    allowedDepartmentIds: Optional[List[str]] = None  # lista de ObjectId (string)