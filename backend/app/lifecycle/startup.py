# app/lifecycle/startup.py
from typing import Any, Iterable, List, Tuple
from pymongo import ASCENDING, DESCENDING
from app.validators import COLLECTIONS, INDEXES
import os
from datetime import datetime, timezone
import bcrypt  # pip install bcrypt
from app.utils.common import sha256_hash  # usa el mismo helper del router
from bson import ObjectId

def _normalize_index_spec(spec) -> tuple[list[tuple[str, int]], dict]:
    if isinstance(spec, dict) and "keys" in spec:
        keys = spec["keys"]
        opts = {k: v for k, v in spec.items() if k != "keys"}
    else:
        parts = list(spec) if isinstance(spec, (list, tuple)) else []
        opts = parts[-1] if parts and isinstance(parts[-1], dict) else {}
        if parts and isinstance(parts[-1], dict):
            parts = parts[:-1]
        if len(parts) == 1 and isinstance(parts[0], (list, tuple)) and len(parts[0]) == 2:
            keys = [tuple(parts[0])]
        else:
            keys = [tuple(p) for p in parts]

    norm_keys: list[tuple[str, int]] = []
    for item in keys:
        if not isinstance(item, (list, tuple)) or len(item) != 2:
            raise ValueError(f"Índice inválido: {item!r}")
        field, direction = item
        if isinstance(direction, str):
            d = direction.lower()
            if d in ("asc", "ascending", "1", "true"):
                direction = ASCENDING
            elif d in ("desc", "descending", "-1", "false"):
                direction = DESCENDING
            else:
                raise ValueError(f"Dirección inválida: {direction!r}")
        elif direction in (1, True):
            direction = ASCENDING
        elif direction in (-1, False):
            direction = DESCENDING
        elif direction not in (ASCENDING, DESCENDING):
            raise ValueError(f"Dirección inválida: {direction!r}")
        norm_keys.append((field, direction))

    return norm_keys, opts

async def ensure_schema_and_indexes(db):
    existing = await db.list_collection_names()
    for cname, validator in COLLECTIONS.items():
        if cname not in existing:
            await db.create_collection(cname, validator=validator)
        else:
            await db.command("collMod", cname, validator=validator)

    for cname, idxs in INDEXES.items():
        for spec in idxs:
            keys, opts = _normalize_index_spec(spec)
            await db[cname].create_index(keys, **opts)

# imports arriba: elimina 'import bcrypt'
async def seed_admin_user(db) -> ObjectId | None:
    await db.users.create_index([("mail", ASCENDING)], unique=True)

    admin_role = await db.roles.find_one({"key": "ADMIN"})
    if not admin_role:
        raise RuntimeError("No se encontró el rol ADMIN")

    admin_role_id: ObjectId = admin_role["_id"]

    email = (os.getenv("ADMIN_EMAIL") or "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD")
    username = os.getenv("ADMIN_NAME", "Administrator")

    users_count = await db.users.estimated_document_count()
    has_any_admin = await db.users.count_documents({"rolId": admin_role_id}) > 0

    if not email or not password:
        if users_count == 0 and not has_any_admin:
            email, password, username = "admin@local", "admin1234", "Administrator"
            print(f"[seed_admin_user] creando admin por defecto {email}")
        else:
            print("[seed_admin_user] no se crea admin por defecto.")
            return None

    existing = await db.users.find_one({"mail": email})
    if existing:
        if existing.get("rolId") != admin_role_id:
            await db.users.update_one({"_id": existing["_id"]}, {"$set": {"rolId": admin_role_id}})
            print(f"[seed_admin_user] {email} actualizado con rol ADMIN.")
        else:
            print(f"[seed_admin_user] {email} ya es ADMIN.")
        return existing["_id"]

    doc = {
        "rolId": admin_role_id,
        "userName": username,
        "mail": email,
        "password": sha256_hash(password),
        "created_at": datetime.now(timezone.utc),
        "is_active": True,
    }
    res = await db.users.insert_one(doc)
    print(f"[seed_admin_user] Usuario admin creado: {email}")
    return res.inserted_id


async def seed_departments(db):
    """
    Crea departamentos base si no existen.
    Devuelve un dict {name: _id}.
    """
    base = ["Eléctrico", "Agua", "Internet"]
    name_to_id = {}
    for name in base:
        doc = await db.departments.find_one({"name": name})
        if not doc:
            res = await db.departments.insert_one({"name": name})
            _id = res.inserted_id
        else:
            _id = doc["_id"]
        name_to_id[name] = _id
    return name_to_id

async def seed_roles(db, dept_map: dict[str, ObjectId] | None = None):
    await db.roles.create_index([("key", 1)], unique=True)

    all_dept_ids = list(dept_map.values()) if dept_map else []

    roles = [
        {
            "key": "ADMIN",
            "name": "Administrator",
            "allDepartments": True,
            "allowedDepartmentIds": all_dept_ids,  # opcional si usas el flag
        },
        {
            "key": "BIDDER",
            "name": "Bidder",
            "allDepartments": False,
            "allowedDepartmentIds": [],
        },
        {
            "key": "WORKER",
            "name": "Worker",
            "allDepartments": False,
            "allowedDepartmentIds": [],
        },
        {
            "key": "ConductorElectric",
            "name": "Conductor Electricista",
            "allDepartments": False,
            "allowedDepartmentIds": [dept_map["Eléctrico"]] if dept_map else [],
        },
    ]

    for r in roles:
        await db.roles.update_one(
            {"key": r["key"]},
            {"$set": r},           # <- importante: así se actualizan roles existentes
            upsert=True
        )


async def seed_admin_person(db, user_id: ObjectId) -> None:
    await db.persons.create_index([("userId", 1)], unique=True)

    exists = await db.persons.find_one({"userId": user_id})
    if exists:
        return

    admin_user = await db.users.find_one({"_id": user_id}, {"mail": 1, "userName": 1})
    if not admin_user:
        print("[seed_admin_person] user admin no encontrado, skip.")
        return

    first_name = os.getenv("ADMIN_FIRST_NAME", "Admin")
    last_name  = os.getenv("ADMIN_LAST_NAME", "User")
    # Tu validador requiere birthDate (string). Usa una por defecto razonable:
    birth_date = os.getenv("ADMIN_BIRTH_DATE", "1970-01-01")

    person_doc = {
        "userId": user_id,
        "firstName": first_name,
        "secondName": None,
        "lastName": last_name,
        "secondLastName": None,
        "email": admin_user.get("mail"),     # <- OJO: ahora "email", no "mail"
        "birthDate": birth_date,              # <- requerido por tu schema
        "rut": None,
        "passportId": None,
    }

    try:
        await db.persons.insert_one(person_doc)
        print("[seed_admin_person] Persona del admin creada")
    except Exception as e:
        print(f"[seed_admin_person] Error insertando person: {e}  Doc={person_doc}")
