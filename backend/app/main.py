# app/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.db import get_db, close_db
from app.lifecycle.startup import (
    ensure_schema_and_indexes,
    seed_roles,
    seed_admin_user,
    seed_departments,
    seed_admin_person,
    seed_bidder_and_worker
)
from app.routers.roles import router as roles_router
from app.routers.users import router as users_router
from app.routers.persons import router as persons_router
from app.routers.auth import router as auth_router
from app.routers.tender_requests import router as tender_requests_router

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

    # 1) Crea deptos base y obtén su mapa
    dept_map = await seed_departments(db)

    # 2) Crea/actualiza roles con permisos (usa dept_map)
    await seed_roles(db, dept_map)

    # 3) Admin user + person
    admin_user_id = await seed_admin_user(db)
    if admin_user_id:
        await seed_admin_person(db, admin_user_id)

    await seed_roles(db, dept_map)
    admin_id = await seed_admin_user(db)
    await seed_bidder_and_worker(db)
    if admin_id:
        await seed_admin_person(db, admin_id)

@app.on_event("shutdown")
async def _shutdown():
    await close_db()

@app.get("/health")
async def health(db = Depends(get_db)):
    await db.command("ping")
    return {"status": "ok"}

app.include_router(roles_router)
app.include_router(users_router)
app.include_router(persons_router)
app.include_router(auth_router)
app.include_router(tender_requests_router)
