# app/routers/departments.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from app.utils.common import to_object_id, serialize
from app import models
from pymongo.errors import DuplicateKeyError

router = APIRouter(prefix="/departments", tags=["departments"])

@router.get("", response_model=List[models.DepartmentOut])
async def list_departments(db = Depends(get_db)):
    return [serialize(d) async for d in db.departments.find().sort("name", 1)]

@router.get("/{id}", response_model=models.DepartmentOut)
async def get_department(id: str, db = Depends(get_db)):
    doc = await db.departments.find_one({"_id": to_object_id(id)})
    if not doc:
        raise HTTPException(404, "Department not found")
    return serialize(doc)

@router.post("", response_model=models.DepartmentOut, status_code=201)
async def create_department(payload: models.DepartmentIn, db = Depends(get_db)):
    try:
        res = await db.departments.insert_one(payload.model_dump())
    except DuplicateKeyError:
        raise HTTPException(409, "Department name already exists")
    created = await db.departments.find_one({"_id": res.inserted_id})
    return serialize(created)

@router.put("/{id}", response_model=models.DepartmentOut)
async def update_department(id: str, payload: models.DepartmentIn, db = Depends(get_db)):
    try:
        doc = await db.departments.find_one_and_update(
            {"_id": to_object_id(id)},
            {"$set": payload.model_dump()},
            return_document=True
        )
    except DuplicateKeyError:
        raise HTTPException(409, "Department name already exists")
    if not doc:
        raise HTTPException(404, "Department not found")
    return serialize(doc)

@router.delete("/{id}", status_code=204)
async def delete_department(id: str, db = Depends(get_db)):
    _id = to_object_id(id)
    # Bloquea eliminación si algún rol lo referencia
    in_use = await db.roles.find_one({"allowedDepartmentIds": _id})
    if in_use:
        raise HTTPException(409, "Department in use by one or more roles")
    res = await db.departments.delete_one({"_id": _id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Department not found")
