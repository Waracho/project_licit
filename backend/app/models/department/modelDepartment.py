from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List

# ===== DEPARTMENTS =====
class DepartmentIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)

class DepartmentOut(DepartmentIn):
    id: str