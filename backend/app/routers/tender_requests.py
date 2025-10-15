from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone

from app.db import get_db
from app.utils.common import to_object_id, serialize

from app import models

router = APIRouter(prefix="/tender-requests", tags=["tender-requests"])

def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

@router.get("", response_model=List[models.TenderRequestOut])
async def list_tender_requests(
    db = Depends(get_db),
    departmentId: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
):
    q: Dict[str, Any] = {}
    if departmentId:
        q["departmentId"] = to_object_id(departmentId)
    if status:
        q["status"] = status
    if category:
        q["category"] = category

    cursor = db.tender_requests.find(q).sort("_id", -1)
    docs = [serialize(d) async for d in cursor]
    # `serialize` ya convierte ObjectId -> str; añadimos fechas a string si son datetime
    for d in docs:
        if isinstance(d.get("createdAt"), datetime):
            d["createdAt"] = d["createdAt"].isoformat()
        if isinstance(d.get("modifiedAt"), datetime):
            d["modifiedAt"] = d["modifiedAt"].isoformat()
    return docs

@router.get("/{id}", response_model=models.TenderRequestOut)
async def get_tender_request(id: str, db = Depends(get_db)):
    doc = await db.tender_requests.find_one({"_id": to_object_id(id)})
    if not doc:
        raise HTTPException(404, "TenderRequest not found")
    out = serialize(doc)
    if isinstance(out.get("createdAt"), datetime):
        out["createdAt"] = out["createdAt"].isoformat()
    if isinstance(out.get("modifiedAt"), datetime):
        out["modifiedAt"] = out["modifiedAt"].isoformat()
    return out

@router.post("", response_model=models.TenderRequestOut, status_code=201)
async def create_tender_request(payload: models.TenderRequestIn, db = Depends(get_db)):
    # Validaciones de FKs
    if not await db.departments.find_one({"_id": to_object_id(payload.departmentId)}):
        raise HTTPException(400, "Invalid departmentId")
    if not await db.users.find_one({"_id": to_object_id(payload.createdBy)}):
        raise HTTPException(400, "Invalid createdBy")

    data = payload.model_dump()

    # Reglas de coherencia
    if data["currentLevel"] > data["requiredLevels"]:
        raise HTTPException(400, "currentLevel cannot be greater than requiredLevels")

    # Normalizar tipos para Mongo
    data["departmentId"] = to_object_id(data["departmentId"])
    data["createdBy"] = to_object_id(data["createdBy"])
    now = datetime.now(timezone.utc)
    data["createdAt"] = now
    data["modifiedAt"] = now

    res = await db.tender_requests.insert_one(data)
    created = await db.tender_requests.find_one({"_id": res.inserted_id})
    out = serialize(created)
    out["createdAt"] = out["createdAt"].isoformat()
    out["modifiedAt"] = out["modifiedAt"].isoformat()
    return out

@router.put("/{id}", response_model=models.TenderRequestOut)
async def update_tender_request(id: str, patch: models.TenderRequestUpdate, db = Depends(get_db)):
    update: Dict[str, Any] = {}

    # Sólo cambiamos lo provisto (patch semántico)
    if patch.departmentId is not None:
        if not await db.departments.find_one({"_id": to_object_id(patch.departmentId)}):
            raise HTTPException(400, "Invalid departmentId")
        update["departmentId"] = to_object_id(patch.departmentId)

    if patch.code is not None:
        update["code"] = patch.code
    if patch.category is not None:
        update["category"] = patch.category
    if patch.status is not None:
        update["status"] = patch.status
    if patch.requiredLevels is not None:
        update["requiredLevels"] = patch.requiredLevels
    if patch.currentLevel is not None:
        update["currentLevel"] = patch.currentLevel

    if not update:
        doc = await db.tender_requests.find_one({"_id": to_object_id(id)})
        if not doc:
            raise HTTPException(404, "TenderRequest not found")
        out = serialize(doc)
        if isinstance(out.get("createdAt"), datetime):
            out["createdAt"] = out["createdAt"].isoformat()
        if isinstance(out.get("modifiedAt"), datetime):
            out["modifiedAt"] = out["modifiedAt"].isoformat()
        return out

    # Reglas de coherencia (si ambas están o si una está y la otra existe en BD)
    base = await db.tender_requests.find_one({"_id": to_object_id(id)}, {"requiredLevels": 1, "currentLevel": 1})
    if not base:
        raise HTTPException(404, "TenderRequest not found")

    required = update.get("requiredLevels", base.get("requiredLevels"))
    current = update.get("currentLevel",  base.get("currentLevel"))
    if current > required:
        raise HTTPException(400, "currentLevel cannot be greater than requiredLevels")

    update["modifiedAt"] = datetime.now(timezone.utc)

    doc = await db.tender_requests.find_one_and_update(
        {"_id": to_object_id(id)},
        {"$set": update},
        return_document=True
    )
    if not doc:
        raise HTTPException(404, "TenderRequest not found")

    out = serialize(doc)
    if isinstance(out.get("createdAt"), datetime):
        out["createdAt"] = out["createdAt"].isoformat()
    if isinstance(out.get("modifiedAt"), datetime):
        out["modifiedAt"] = out["modifiedAt"].isoformat()
    return out

@router.delete("/{id}", status_code=204)
async def delete_tender_request(id: str, db = Depends(get_db)):
    res = await db.tender_requests.delete_one({"_id": to_object_id(id)})
    if res.deleted_count == 0:
        raise HTTPException(404, "TenderRequest not found")
