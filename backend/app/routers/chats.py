# app/routers/chats.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.db import get_db
from app.utils.common import to_object_id, serialize
from app.models.chat.modelChat import ChatCreateIn, ChatOut, MessageIn, MessageOut
from datetime import datetime, timezone

router = APIRouter(prefix="/chats", tags=["chats"])

async def _pick_random_worker(db):
    role = await db.roles.find_one({"key": "WORKER"})
    if not role:
        raise HTTPException(409, "No role WORKER")
    pipeline = [
        {"$match": {"rolId": role["_id"]}},
        {"$sample": {"size": 1}},
        {"$project": {"_id": 1}},
    ]
    arr = await db.users.aggregate(pipeline).to_list(1)
    if not arr:
        raise HTTPException(409, "No hay WORKERs disponibles")
    return arr[0]["_id"]

# app/routers/chats.py (solo la función start_chat)
@router.post("/start", response_model=ChatOut, status_code=201)
async def start_chat(payload: ChatCreateIn, db=Depends(get_db)):
    bidder_id = to_object_id(payload.bidderUserId)
    tr_id = to_object_id(payload.tenderRequestId) if payload.tenderRequestId else None

    # 👇 Reusar si ya existe (independiente del worker)
    q = {"bidderUserId": bidder_id, "status": "OPEN"}
    if tr_id is not None:
        q["tenderRequestId"] = tr_id
    existing = await db.chats.find_one(q)
    if existing:
        return serialize(existing)

    # Si se fuerza un worker, valida que sea WORKER; si no, elige al azar
    if payload.workerUserId:
        worker_id = to_object_id(payload.workerUserId)
        role_worker = await db.roles.find_one({"key": "WORKER"})
        if not role_worker:
            raise HTTPException(409, "No role WORKER")
        user_worker = await db.users.find_one({"_id": worker_id})
        if not user_worker or user_worker.get("rolId") != role_worker["_id"]:
            raise HTTPException(400, "workerUserId no corresponde a WORKER")
    else:
        worker_id = await _pick_random_worker(db)

    doc = {
        "tenderRequestId": tr_id,
        "bidderUserId": bidder_id,
        "workerUserId": worker_id,
        "status": "OPEN",
        "unreadBidder": 0,
        "unreadWorker": 0,
        "lastMessagePreview": None,
        "lastMessageAt": None,
    }
    res = await db.chats.insert_one(doc)
    created = await db.chats.find_one({"_id": res.inserted_id})
    return serialize(created)

@router.get("/mine", response_model=List[ChatOut])
async def list_my_chats(userId: str = Query(...), db=Depends(get_db)):
    uid = to_object_id(userId)
    cur = db.chats.find(
        {"$or": [{"bidderUserId": uid}, {"workerUserId": uid}]},
        sort=[("lastMessageAt", -1)]
    )
    return [serialize(d) async for d in cur]

@router.get("/{chatId}/messages", response_model=List[MessageOut])
async def list_messages(chatId: str, db=Depends(get_db),
                        after: Optional[str] = None, limit: int = 50):
    cid = to_object_id(chatId)
    q = {"chatId": cid}
    if after:
        try:
            dt = datetime.fromisoformat(after.replace("Z","+00:00"))
            q["createdAt"] = {"$gt": dt}
        except Exception:
            pass
    cur = db.chat_messages.find(q).sort("createdAt", 1).limit(min(limit, 200))
    return [serialize(d) async for d in cur]

@router.post("/{chatId}/messages", response_model=MessageOut, status_code=201)
async def send_message(chatId: str, payload: MessageIn, db=Depends(get_db)):
    cid = to_object_id(chatId)
    chat = await db.chats.find_one({"_id": cid})
    if not chat: raise HTTPException(404, "Chat not found")
    if chat["status"] != "OPEN": raise HTTPException(409, "Chat cerrado")

    now = datetime.now(timezone.utc)
    msg = {
        "chatId": cid,
        "senderUserId": to_object_id(payload.senderUserId),
        "text": payload.text,
        "createdAt": now,
    }
    res = await db.chat_messages.insert_one(msg)

    # actualizar contadores + preview
    inc = {"unreadWorker": 1} if msg["senderUserId"] == chat["bidderUserId"] else {"unreadBidder": 1}
    await db.chats.update_one(
        {"_id": cid},
        {"$set": {"lastMessagePreview": payload.text[:140], "lastMessageAt": now},
         "$inc": inc}
    )
    created = await db.chat_messages.find_one({"_id": res.inserted_id})
    return serialize(created)

@router.post("/{chatId}/read", response_model=dict)
async def mark_read(chatId: str, userId: str, db=Depends(get_db)):
    cid = to_object_id(chatId)
    uid = to_object_id(userId)
    chat = await db.chats.find_one({"_id": cid})
    if not chat: raise HTTPException(404, "Chat not found")
    if uid == chat["bidderUserId"]:
        await db.chats.update_one({"_id": cid}, {"$set": {"unreadBidder": 0}})
    elif uid == chat["workerUserId"]:
        await db.chats.update_one({"_id": cid}, {"$set": {"unreadWorker": 0}})
    else:
        raise HTTPException(403, "No participante")
    return {"ok": True}

@router.get("/unread_count", response_model=dict)
async def unread_count(userId: str, db=Depends(get_db)):
    uid = to_object_id(userId)
    # suma mis no leídos según si soy bidder o worker en cada chat
    pipeline = [
        {"$match": {"$or": [{"bidderUserId": uid}, {"workerUserId": uid}]}},
        {"$project": {
            "u": {"$cond": [{"$eq": ["$bidderUserId", uid]}, "$unreadBidder", "$unreadWorker"]}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$u"}}}
    ]
    arr = await db.chats.aggregate(pipeline).to_list(1)
    return {"total": (arr[0]["total"] if arr else 0)}
