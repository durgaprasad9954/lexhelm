from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core import settings

async_engine: AsyncEngine = create_async_engine(
    settings.neondb_sql_url,
    echo=settings.enable_db_echo,
    pool_pre_ping=True,
    connect_args={
        "ssl": "require",
        "server_settings": {"application_name": "lexhelm-api"},
        "statement_cache_size": 0,
    },
)


@event.listens_for(async_engine.sync_engine, "connect")
def set_search_path(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("SET search_path TO mattersapi, public")
    cursor.close()


async_session_factory = async_sessionmaker(async_engine, expire_on_commit=False)


@asynccontextmanager
async def session_scope() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
