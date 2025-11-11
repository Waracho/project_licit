# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import os, jwt

from app.db import get_db
from app.utils.common import sha256_hash
from bson.objectid import ObjectId

router = APIRouter(prefix="/auth", tags=["auth"])

# =======================
# Config
# =======================
JWT_SECRET = os.getenv("JWT_SECRET", "devsecret")
JWT_ALG    = os.getenv("JWT_ALG", "HS256")

# TTLs (segundos)
ACCESS_TTL  = int(os.getenv("ACCESS_TTL",  900))        # 15 minutos
REFRESH_TTL = int(os.getenv("REFRESH_TTL", 60*60*24*7)) # 7 días

# Cookie del refresh
REFRESH_COOKIE_NAME  = os.getenv("REFRESH_COOKIE_NAME", "refresh_token")
REFRESH_COOKIE_PATH  = os.getenv("REFRESH_COOKIE_PATH", "/auth")
REFRESH_COOKIE_DOMAIN = os.getenv("REFRESH_COOKIE_DOMAIN") or None
REFRESH_COOKIE_SECURE = (os.getenv("REFRESH_COOKIE_SECURE", "false").lower() == "true")
REFRESH_COOKIE_SAMESITE = os.getenv("REFRESH_COOKIE_SAMESITE", "lax").lower()  # "lax" | "none" | "strict"

# =======================
# Helpers
# =======================
def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _ts(dt: datetime) -> int:
    return int(dt.timestamp())

def make_jwt(sub: str, ttl_seconds: int, typ: str = "access", extra: Optional[Dict[str, Any]] = None) -> str:
    now = _now_utc()
    payload: Dict[str, Any] = {
        "sub": sub,
        "type": typ,
        "iat": _ts(now),
        "exp": _ts(now + timedelta(seconds=ttl_seconds)),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def build_user_out(db, user_doc) -> Dict[str, Any]:
    # rol (si existe)
    role_doc = None
    if user_doc.get("rolId"):
        role_doc = await db.roles.find_one({"_id": user_doc["rolId"]})
    user_out = {
        "id": str(user_doc["_id"]),
        "userName": user_doc.get("userName"),
        "mail": user_doc.get("mail"),
        "rolId": str(user_doc["rolId"]) if user_doc.get("rolId") else None,
        # Mantiene tu forma actual: role = { key, name }
        "role": {"key": role_doc["key"], "name": role_doc["name"]} if role_doc else None,
    }
    return user_out

def set_refresh_cookie(resp: JSONResponse, token: str) -> None:
    resp.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=REFRESH_COOKIE_SECURE,        # True en prod (HTTPS) — en dev puede ser False
        samesite=REFRESH_COOKIE_SAMESITE,    # "lax" por defecto; si usas cross-site, usa "none" + secure=True
        max_age=REFRESH_TTL,
        path=REFRESH_COOKIE_PATH,
        domain=REFRESH_COOKIE_DOMAIN,        # None en dev
    )

def clear_refresh_cookie(resp: JSONResponse) -> None:
    resp.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        domain=REFRESH_COOKIE_DOMAIN,
    )

def decode_jwt(token: str) -> Dict[str, Any]:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])

# =======================
# Schemas
# =======================
class LoginPayload(BaseModel):
    identifier: str
    password: str

# =======================
# Endpoints
# =======================
@router.post("/login")
async def login(payload: LoginPayload, db = Depends(get_db)):
    ident = payload.identifier.strip()

    # detectar si es correo o username
    q = {"mail": ident} if "@" in ident else {"userName": ident}
    user = await db.users.find_one(q)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.get("password") != sha256_hash(payload.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_out = await build_user_out(db, user)

    # tokens
    access  = make_jwt(sub=user_out["id"], ttl_seconds=ACCESS_TTL,  typ="access")
    refresh = make_jwt(sub=user_out["id"], ttl_seconds=REFRESH_TTL, typ="refresh")

    resp = JSONResponse({"access": access, "user": user_out})
    set_refresh_cookie(resp, refresh)
    return resp

@router.post("/refresh")
async def refresh(req: Request, db = Depends(get_db)):
    tok = req.cookies.get(REFRESH_COOKIE_NAME)
    if not tok:
        raise HTTPException(status_code=401, detail="No refresh cookie")

    try:
        payload = decode_jwt(tok)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Bad token type")
        user_id = payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh")

    # Re-hidrata usuario (si lo borraron, invalida)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    user_out = await build_user_out(db, user)

    # Re-emitir access (y opcionalmente rotar refresh)
    access  = make_jwt(sub=user_out["id"], ttl_seconds=ACCESS_TTL,  typ="access")
    # Rotación simple: nuevo refresh con misma ventana
    refresh = make_jwt(sub=user_out["id"], ttl_seconds=REFRESH_TTL, typ="refresh")

    resp = JSONResponse({"access": access, "user": user_out})
    set_refresh_cookie(resp, refresh)
    return resp

@router.post("/logout")
async def logout():
    resp = JSONResponse({"ok": True})
    clear_refresh_cookie(resp)
    return resp
