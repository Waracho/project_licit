from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone

from app.db import get_db
from app.utils.common import to_object_id, serialize

from app import models
from app.models.tender_request.modelTenderRequest import ReviewAction

router = APIRouter(prefix="/tender-requests", tags=["tender-requests"])

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
    
    # tras construir `out`:
    await _append_event(
        db,
        tender_id=out["id"],
        type_="CREATED",
        actor_id=out["createdBy"],  # o el usuario del token
        comment="Tender created"
    )
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

def _now_utc():
    return datetime.now(timezone.utc)

async def _append_event(db, tender_id, type_, actor_id, *, level=None, comment=None, metadata=None):
    doc = {
        "tenderRequestId": to_object_id(tender_id),
        "type": type_,
        "actorUserId": to_object_id(actor_id),
        "level": level,
        "comment": comment,
        "metadata": metadata or {},
        "at": _now_utc(),
    }
    await db.tender_request_events.insert_one(doc)

@router.get("/{id}/events", response_model=List[models.TenderEventOut])
async def list_events(id: str, db = Depends(get_db)):
    cursor = db.tender_request_events.find(
        {"tenderRequestId": to_object_id(id)}
    ).sort("at", -1)
    docs = [serialize(d) async for d in cursor]
    for d in docs:
        if isinstance(d.get("at"), datetime):
            d["at"] = d["at"].isoformat()
    return docs

@router.post("/{id}/files", response_model=models.RequestFileOut, status_code=201)
async def attach_file(id: str, payload: models.RequestFileCreate, db = Depends(get_db)):
    tr = await db.tender_requests.find_one({"_id": to_object_id(id)})
    if not tr: raise HTTPException(404, "TenderRequest not found")

    data = payload.model_dump()
    data["tenderRequestId"] = to_object_id(id)
    if data.get("uploadedBy"):
        data["uploadedBy"] = to_object_id(data["uploadedBy"])
    data["createdAt"] = _now_utc()

    res = await db.request_files.insert_one(data)
    doc = await db.request_files.find_one({"_id": res.inserted_id})

    # evento
    await _append_event(
        db,
        tender_id=id,
        type_="FILE_ATTACHED",
        actor_id=(data.get("uploadedBy") or tr["createdBy"]),
        metadata={"fileId": str(res.inserted_id), "fileName": data.get("fileName")}
    )

    out = serialize(doc)
    out["createdAt"] = out["createdAt"].isoformat()
    out["tenderRequestId"] = str(out["tenderRequestId"])
    if out.get("uploadedBy"): out["uploadedBy"] = str(out["uploadedBy"])
    return out

@router.get("/{id}/files", response_model=List[models.RequestFileOut])
async def list_files(id: str, db = Depends(get_db)):
    cursor = db.request_files.find({"tenderRequestId": to_object_id(id)}).sort("createdAt", -1)
    docs = [serialize(d) async for d in cursor]
    for d in docs:
        d["createdAt"] = d["createdAt"].isoformat()
        d["tenderRequestId"] = str(d["tenderRequestId"])
        if d.get("uploadedBy"): d["uploadedBy"] = str(d["uploadedBy"])
    return docs

from fastapi import APIRouter

files_router = APIRouter(prefix="/request-files", tags=["tender-request-files"])

@files_router.delete("/{fileId}", status_code=204)
async def delete_file(fileId: str, db = Depends(get_db)):
    doc = await db.request_files.find_one({"_id": to_object_id(fileId)})
    if not doc: raise HTTPException(404, "File not found")
    await db.request_files.delete_one({"_id": doc["_id"]})

    # evento
    await _append_event(
        db,
        tender_id=str(doc["tenderRequestId"]),
        type_="FILE_REMOVED",
        actor_id=str(doc.get("uploadedBy") or doc.get("createdBy") or doc["tenderRequestId"]),
        metadata={"fileId": fileId, "fileName": doc.get("fileName")}
    )

@router.post("/{id}/review", response_model=models.TenderRequestOut)
async def review_tender(id: str, body: ReviewAction, db = Depends(get_db)):
    tr = await db.tender_requests.find_one({"_id": to_object_id(id)})
    if not tr: raise HTTPException(404, "TenderRequest not found")

    required = int(tr.get("requiredLevels", 1))
    current  = int(tr.get("currentLevel", 0))
    now = _now_utc()

    if body.decision == "APPROVE":
        new_current = current + 1
        if new_current > required:
            raise HTTPException(400, "currentLevel cannot exceed requiredLevels")

        new_status = "IN_REVIEW"
        if new_current == required:
            new_status = "OPEN"  # o "APPROVED", si prefieres cambiar el enum

        await db.tender_requests.update_one(
            {"_id": tr["_id"]},
            {"$set": {"currentLevel": new_current, "status": new_status, "modifiedAt": now}}
        )

        await _append_event(
            db,
            tender_id=id,
            type_="REVIEW_APPROVED",
            actor_id=body.actorUserId,
            level=new_current,
            comment=body.comment
        )
        if new_status != tr.get("status"):
            await _append_event(
                db,
                tender_id=id,
                type_="STATUS_CHANGED",
                actor_id=body.actorUserId,
                metadata={"oldStatus": tr.get("status"), "newStatus": new_status}
            )

    else:  # REJECT
        new_status = "REJECTED"  # o "CANCELLED"
        await db.tender_requests.update_one(
            {"_id": tr["_id"]},
            {"$set": {"status": new_status, "modifiedAt": now}}
        )
        await _append_event(
            db,
            tender_id=id,
            type_="REVIEW_REJECTED",
            actor_id=body.actorUserId,
            level=current + 1,
            comment=body.comment
        )
        if new_status != tr.get("status"):
            await _append_event(
                db,
                tender_id=id,
                type_="STATUS_CHANGED",
                actor_id=body.actorUserId,
                metadata={"oldStatus": tr.get("status"), "newStatus": new_status}
            )

    # devolver actualizado
    doc = await db.tender_requests.find_one({"_id": to_object_id(id)})
    out = serialize(doc)
    for k in ("createdAt","modifiedAt"):
        if isinstance(out.get(k), datetime):
            out[k] = out[k].isoformat()
    return out
