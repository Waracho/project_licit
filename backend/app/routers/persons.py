# app/routers/persons.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from app.utils.common import to_object_id, serialize
from app import models

router = APIRouter(prefix="/persons", tags=["persons"])

@router.get("", response_model=List[models.PersonOut])
async def list_persons(db = Depends(get_db), userId: str | None = None):
    q = {"userId": to_object_id(userId)} if userId else {}
    return [serialize(d) async for d in db.persons.find(q).sort("_id", -1)]

@router.get("/{id}", response_model=models.PersonOut)
async def get_person(id: str, db = Depends(get_db)):
    doc = await db.persons.find_one({"_id": to_object_id(id)})
    if not doc: raise HTTPException(404, "Person not found")
    return serialize(doc)

@router.post("", response_model=models.PersonOut, status_code=201)
async def create_person(payload: models.PersonIn, db = Depends(get_db)):
    if not await db.users.find_one({"_id": to_object_id(payload.userId)}):
        raise HTTPException(400, "Invalid userId")
    data = payload.model_dump()
    data["userId"] = to_object_id(data["userId"])
    res = await db.persons.insert_one(data)
    created = await db.persons.find_one({"_id": res.inserted_id})
    return serialize(created)

@router.put("/{id}", response_model=models.PersonOut)
async def update_person(id: str, payload: models.PersonIn, db = Depends(get_db)):
    if not await db.users.find_one({"_id": to_object_id(payload.userId)}):
        raise HTTPException(400, "Invalid userId")
    data = payload.model_dump()
    data["userId"] = to_object_id(data["userId"])
    doc = await db.persons.find_one_and_update(
        {"_id": to_object_id(id)}, {"$set": data}, return_document=True
    )
    if not doc: raise HTTPException(404, "Person not found")
    return serialize(doc)

@router.delete("/{id}", status_code=204)
async def delete_person(id: str, db = Depends(get_db)):
    res = await db.persons.delete_one({"_id": to_object_id(id)})
    if res.deleted_count == 0: raise HTTPException(404, "Person not found")
