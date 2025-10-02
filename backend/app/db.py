from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import AsyncGenerator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    MONGODB_URI: str = "mongodb://mongo:27017"
    MONGODB_DB: str = "miapp"

settings = Settings()
_client: AsyncIOMotorClient | None = None

async def get_db() -> AsyncGenerator:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = _client[settings.MONGODB_DB]
    try:
        yield db
    finally:
        pass

async def close_db():
    global _client
    if _client is not None:
        _client.close()
        _client = None
