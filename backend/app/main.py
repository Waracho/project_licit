from typing import List
from app.db import get_db, close_db
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException
from datetime import datetime
from app.models import ItemIn, ItemOut
from app.models import TaskIn, TaskOut
from bson import ObjectId

app = FastAPI(title="API miapp")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,   # si no usas cookies/autenticación puedes poner False
    allow_methods=["*"],      # incluye OPTIONS
    allow_headers=["*"],      # ej. Content-Type
)

@app.on_event("shutdown")
async def _shutdown():
    await close_db()

@app.get("/health")
async def health(db = Depends(get_db)):
    await db.command("ping")
    return {"status": "ok"}

@app.post("/items", response_model=ItemOut, status_code=201)
async def create_item(payload: ItemIn, db = Depends(get_db)):
    res = await db.items.insert_one({"name": payload.name})
    return ItemOut(id=str(res.inserted_id), name=payload.name)

@app.get("/items", response_model=List[ItemOut])
async def list_items(db = Depends(get_db)):
    items = []
    async for d in db.items.find({}, {"name": 1}):
        items.append(ItemOut(id=str(d["_id"]), name=d.get("name", "")))
    return items

#Testeo
TASKS_VALIDATOR = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["title", "priority", "done"],
        "properties": {
            "title": {"bsonType": "string", "minLength": 1, "maxLength": 120},
            "priority": {"enum": ["low", "medium", "high"]},
            "due_date": {"bsonType": ["null", "date"]},
            "done": {"bsonType": "bool"}
        }
    }
}

@app.on_event("startup")
async def _startup():
    db = (await get_db().__anext__())  # obtener instancia una vez
    collections = await db.list_collection_names()
    if "tasks" not in collections:
        await db.create_collection("tasks", validator={"$jsonSchema": TASKS_VALIDATOR["$jsonSchema"]})
    else:
        # En caso de que ya exista, forzar/actualizar validador
        await db.command("collMod", "tasks", validator=TASKS_VALIDATOR)

@app.on_event("shutdown")
async def _shutdown():
    await close_db()

# --- Endpoints ---
@app.get("/tasks", response_model=List[TaskOut])
async def list_tasks(db = Depends(get_db)):
    tasks = []
    async for d in db.tasks.find({}, {"title": 1, "priority": 1, "due_date": 1, "done": 1}).sort("_id", -1):
        tasks.append(TaskOut(
            id=str(d["_id"]),
            title=d["title"],
            priority=d["priority"],
            due_date=(d.get("due_date").strftime("%Y-%m-%d") if d.get("due_date") else None),
            done=d["done"],
        ))
    return tasks

@app.post("/tasks", response_model=TaskOut, status_code=201)
async def create_task(payload: TaskIn, db = Depends(get_db)):
    # Validación de entrada ya la hace Pydantic.
    doc = {
        "title": payload.title,
        "priority": payload.priority,
        "due_date": datetime.fromisoformat(payload.due_date) if payload.due_date else None,
        "done": payload.done,
    }
    res = await db.tasks.insert_one(doc)
    return TaskOut(
        id=str(res.inserted_id),
        title=doc["title"],
        priority=doc["priority"],
        due_date=(doc["due_date"].strftime("%Y-%m-%d") if doc["due_date"] else None),
        done=doc["done"],
    )