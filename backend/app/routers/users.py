# app/routers/users.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from app.utils.common import to_object_id, serialize, sha256_hash
from app import models

# Modelo de actualización parcial para no forzar password en PUT
from pydantic import BaseModel, EmailStr, Field

class UserUpdate(BaseModel):
    rolId: Optional[str] = None
    userName: Optional[str] = Field(default=None, min_length=2, max_length=120)
    mail: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=200)

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=List[models.UserOut])
async def list_users(db = Depends(get_db), rolId: str | None = None):
    q = {"rolId": to_object_id(rolId)} if rolId else {}
    return [serialize(d) async for d in db.users.find(q, {"password": 0}).sort("_id", -1)]

@router.get("/{id}", response_model=models.UserOut)
async def get_user(id: str, db = Depends(get_db)):
    doc = await db.users.find_one({"_id": to_object_id(id)}, {"password": 0})
    if not doc: raise HTTPException(404, "User not found")
    return serialize(doc)

@router.post("", response_model=models.UserOut, status_code=201)
async def create_user(payload: models.UserIn, db = Depends(get_db)):
    if not await db.roles.find_one({"_id": to_object_id(payload.rolId)}):
        raise HTTPException(400, "Invalid rolId")
    data = payload.model_dump()
    data["rolId"] = to_object_id(data["rolId"])
    data["password"] = sha256_hash(data["password"])
    res = await db.users.insert_one(data)
    created = await db.users.find_one({"_id": res.inserted_id}, {"password": 0})
    return serialize(created)

@router.put("/{id}", response_model=models.UserOut)
async def update_user(id: str, patch: UserUpdate, db = Depends(get_db)):
    update = {}
    if patch.rolId is not None:
        if not await db.roles.find_one({"_id": to_object_id(patch.rolId)}):
            raise HTTPException(400, "Invalid rolId")
        update["rolId"] = to_object_id(patch.rolId)
    if patch.userName is not None:
        update["userName"] = patch.userName
    if patch.mail is not None:
        update["mail"] = patch.mail
    if patch.password is not None and patch.password != "":
        update["password"] = sha256_hash(patch.password)

    if not update:
        doc = await db.users.find_one({"_id": to_object_id(id)}, {"password": 0})
        if not doc: raise HTTPException(404, "User not found")
        return serialize(doc)

    doc = await db.users.find_one_and_update(
        {"_id": to_object_id(id)},
        {"$set": update},
        projection={"password": 0},
        return_document=True,
    )
    if not doc: raise HTTPException(404, "User not found")
    return serialize(doc)

@router.delete("/{id}", status_code=204)
async def delete_user(id: str, db = Depends(get_db)):
    if await db.persons.find_one({"userId": to_object_id(id)}):
        raise HTTPException(409, "User has a Person profile associated")
    res = await db.users.delete_one({"_id": to_object_id(id)})
    if res.deleted_count == 0: raise HTTPException(404, "User not found")
