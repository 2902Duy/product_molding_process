import os
from urllib.parse import quote

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


def _normalize_database_url(url: str) -> str:
    """Return a SQLAlchemy asyncpg URL from common Postgres env var formats."""
    url = url.strip().strip("'\"")
    if url.startswith("postgres://"):
        url = "postgresql://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url.removeprefix("postgresql://")

    at_index = url.find("@")
    hash_index = url.find("#")
    if 0 <= hash_index < at_index:
        url = url[:hash_index] + quote("#") + url[hash_index + 1:]

    return url


DATABASE_URL = _normalize_database_url(
    os.getenv("SUPABASE_DB_URL")
    or os.getenv("DATABASE_POOL_URL")
    or os.getenv("DATABASE_URL")
    or "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
)

DATABASE_ECHO = os.getenv("DATABASE_ECHO", "false").lower() == "true"

engine = create_async_engine(DATABASE_URL, echo=DATABASE_ECHO, pool_pre_ping=True)

async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency that yields an async DB session."""
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Create all tables (if they don't exist) on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS data JSONB"))
        await conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS data JSONB"))


async def close_db():
    """Dispose the engine on shutdown."""
    await engine.dispose()
