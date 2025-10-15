from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal

# ===== PERSONS =====
class PersonIn(BaseModel):
    userId: str                     # FK -> users._id
    firstName: str
    secondName: Optional[str] = None
    lastName: str
    secondLastName: Optional[str] = None
    email: EmailStr
    birthDate: str                  # ISO (YYYY-MM-DD) o ISO datetime; si prefieres datetime avísame y lo cambio
    rut: Optional[str] = None
    passportId: Optional[str] = None

class PersonOut(PersonIn):
    id: str