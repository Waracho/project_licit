# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.db import get_db
from app.utils.common import sha256_hash
from bson.objectid import ObjectId

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginPayload(BaseModel):
    identifier: str          # <-- ahora coincide con el front
    password: str

@router.post("/login")
async def login(payload: LoginPayload, db = Depends(get_db)):
    ident = payload.identifier.strip()

    # detectar si es mail o userName (simple)
    if "@" in ident:
        q = {"mail": ident}
    else:
        q = {"userName": ident}

    user = await db.users.find_one(q)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.get("password") != sha256_hash(payload.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # traer rol (opcional)
    role = None
    if user.get("rolId"):
        role = await db.roles.find_one({"_id": user["rolId"]})
    
    # construir respuesta que espera tu front
    user_out = {
        "id": str(user["_id"]),
        "userName": user.get("userName"),
        "mail": user.get("mail"),
        "rolId": str(user["rolId"]) if user.get("rolId") else None,
        "role": {"key": role["key"], "name": role["name"]} if role else None,
    }

    # token “dummy” para desarrollo (luego puedes meter JWT)
    token = f"dev-{user_out['id']}"

    return {
        "token": token,
        "user": user_out,
    }
