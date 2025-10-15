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

# ---- seeding opcional de roles ----
async def seed_roles(db):
    """Crea roles base si no existen (idempotente)."""
    roles = [
        {"key": "ADMIN",  "name": "Administrator"},
        {"key": "BIDDER", "name": "Bidder"},
        {"key": "WORKER", "name": "Worker"},
    ]
    for r in roles:
        await db.roles.update_one(
            {"key": r["key"]},
            {"$setOnInsert": r},
            upsert=True
        )

async def seed_admin_user(db):
    """
    Crea un usuario admin acorde a tu esquema:
      - rolId: ObjectId del rol ADMIN en 'roles'
      - userName, mail, password (sha256)
    Reglas:
      - Si ADMIN_EMAIL/ADMIN_PASSWORD están definidos -> los usa.
      - Si NO hay envs y la colección 'users' está vacía -> crea admin por defecto.
      - Idempotente: si existe el mail, garantiza que su rolId sea ADMIN.
    """
    # Asegura índice único por mail (coincide con tu USUARIOS_INDEXES)
    await db.users.create_index([("mail", ASCENDING)], unique=True)

    # Asegura roles base y busca el rol ADMIN
    await seed_roles(db)
    admin_role = await db.roles.find_one({"key": "ADMIN"})
    if not admin_role:
        # safety net
        raise RuntimeError("No se encontró el rol ADMIN para asignar a rolId")

    admin_role_id: ObjectId = admin_role["_id"]

    # ¿ya hay algún usuario con este rol?
    has_any_admin = await db.users.count_documents({"rolId": admin_role_id}) > 0

    # lee envs si existen
    email = (os.getenv("ADMIN_EMAIL") or "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD")
    username = os.getenv("ADMIN_NAME", "Administrator")

    users_count = await db.users.estimated_document_count()

    # Política: si no hay envs, solo se autoseedea cuando la colección está vacía y no hay admin
    if not email or not password:
        if users_count == 0 and not has_any_admin:
            email = "admin@local"
            password = "admin1234"  # cambia después
            username = "Administrator"
            print(f"[seed_admin_user] Sin envs y 'users' vacía: creando admin por defecto {email}")
        else:
            print("[seed_admin_user] Sin envs y ya existen usuarios/algún admin: no se crea admin por defecto.")
            return

    # ¿existe ya por mail?
    existing = await db.users.find_one({"mail": email})
    if existing:
        # Garantiza que tenga el rol ADMIN (actualiza rolId si fuera distinto)
        if existing.get("rolId") != admin_role_id:
            await db.users.update_one(
                {"_id": existing["_id"]},
                {"$set": {"rolId": admin_role_id}}
            )
            print(f"[seed_admin_user] Usuario {email} actualizado con rol ADMIN.")
        else:
            print(f"[seed_admin_user] Usuario {email} ya es ADMIN, no se modifica.")
        return

    # Crear usuario nuevo (respetando el validador)
    doc = {
        "rolId": admin_role_id,                  # ObjectId válido
        "userName": username,
        "mail": email,
        "password": sha256_hash(password),       # mismo hash que el router
        # Campos extra opcionales (tu validador no los prohíbe):
        "created_at": datetime.now(timezone.utc),
        "is_active": True,
    }

    try:
        await db.users.insert_one(doc)
        print(f"[seed_admin_user] Usuario admin creado: {email}")
    except Exception as e:
        print(f"[seed_admin_user] Error insertando admin {email}: {e}")