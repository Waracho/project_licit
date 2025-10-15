from .user.modelUser import UserIn, UserOut
from .person.modelPerson import PersonIn, PersonOut
from .role.modelRole import RoleIn, RoleOut, RoleKey
# si tu carpeta es "rol", cambia .role. por .rol.

__all__ = [
    "UserIn", "UserOut",
    "PersonIn", "PersonOut",
    "RoleIn", "RoleOut", "RoleKey",
]
