# app/routers/roles.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from app.utils.common import to_object_id, serialize
from app import models

router = APIRouter(prefix="/roles", tags=["roles"])

@router.get("", response_model=List[models.RoleOut])
async def list_roles(db = Depends(get_db)):
    return [serialize(d) async for d in db.roles.find().sort("key", 1)]

@router.get("/{id}", response_model=models.RoleOut)
async def get_role(id: str, db = Depends(get_db)):
    doc = await db.roles.find_one({"_id": to_object_id(id)})
    if not doc: raise HTTPException(404, "Role not found")
    return serialize(doc)

@router.post("", response_model=models.RoleOut, status_code=201)
async def create_role(payload: models.RoleIn, db = Depends(get_db)):
    res = await db.roles.insert_one(payload.model_dump())
    return serialize({**payload.model_dump(), "_id": res.inserted_id})

@router.put("/{id}", response_model=models.RoleOut)
async def update_role(id: str, payload: models.RoleIn, db = Depends(get_db)):
    doc = await db.roles.find_one_and_update(
        {"_id": to_object_id(id)}, {"$set": payload.model_dump()}, return_document=True
    )
    if not doc: raise HTTPException(404, "Role not found")
    return serialize(doc)

@router.delete("/{id}", status_code=204)
async def delete_role(id: str, db = Depends(get_db)):
    res = await db.roles.delete_one({"_id": to_object_id(id)})
    if res.deleted_count == 0: raise HTTPException(404, "Role not found")
