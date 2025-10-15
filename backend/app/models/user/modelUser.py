from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal

# ===== USERS =====
class UserIn(BaseModel):
    rolId: str                      # FK -> roles._id
    userName: str = Field(min_length=2, max_length=120)
    mail: EmailStr
    password: str = Field(min_length=6, max_length=200)  # se guardará hasheado

class UserOut(BaseModel):
    id: str
    rolId: str
    userName: str
    mail: EmailStr