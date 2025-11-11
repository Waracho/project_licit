# app/utils/common.py
import hashlib
from bson import ObjectId
from fastapi import HTTPException

def to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid ObjectId: {id_str}")

def serialize(doc: dict) -> dict:
    if not doc:
        return doc
    d = {**doc}
    if "_id" in d:
        d["id"] = str(d.pop("_id"))
    for k, v in list(d.items()):
        if isinstance(v, ObjectId):
            d[k] = str(v)
    return d

def sha256_hash(raw: str) -> str:
    # Para desarrollo. En producción usa bcrypt/argon2.
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
