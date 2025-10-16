from .user.modelUser import UserIn, UserOut
from .person.modelPerson import PersonIn, PersonOut
from .role.modelRole import RoleIn, RoleOut, RoleKey, RolePermissionsUpdate
from .department.modelDepartment import DepartmentIn, DepartmentOut
from .tender_request.modelTenderRequest import (
    TenderRequestIn, TenderRequestOut, TenderCategory, TenderStatus, TenderRequestUpdate, ReviewAction,
)
from .tender_event.modelTenderEvent import (
    TenderEventOut,        # ✅ nuevo
    TenderEventType,       # ✅ opcional pero útil exportarlo
)
from .request_file.modelRequestFile import (
    RequestFileCreate,     # ✅ nuevo
    RequestFileOut,        # ✅ nuevo
)
# si tu carpeta es "rol", cambia .role. por .rol.

__all__ = [
    # Core
    "UserIn", "UserOut",
    "PersonIn", "PersonOut",
    "RoleIn", "RoleOut", "RoleKey", "RolePermissionsUpdate",
    "DepartmentIn", "DepartmentOut",

    # Tender Requests
    "TenderRequestIn", "TenderRequestOut", "TenderRequestUpdate",
    "TenderCategory", "TenderStatus", "ReviewAction",

    # Files
    "RequestFileCreate", "RequestFileOut",

    # Events / Audit
    "TenderEventOut", "TenderEventType",
]