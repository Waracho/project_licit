# app/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.db import get_db, close_db
from app.lifecycle.startup import ensure_schema_and_indexes, seed_roles, seed_admin_user
from app.routers.roles import router as roles_router
from app.routers.users import router as users_router
from app.routers.persons import router as persons_router
from app.routers.auth import router as auth_router

app = FastAPI(title="API miapp")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080","http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def _startup():
    db = (await get_db().__anext__())
    await ensure_schema_and_indexes(db)
    await seed_roles(db)
    await seed_admin_user(db)

@app.on_event("shutdown")
async def _shutdown():
    await close_db()

@app.get("/health")
async def health(db = Depends(get_db)):
    await db.command("ping")
    return {"status": "ok"}

# Routers
app.include_router(roles_router)
app.include_router(users_router)
app.include_router(persons_router)
app.include_router(auth_router)