"""Database initialization."""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.models import Base


async def init_models(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS mattersapi"))
        
        # Create PostgreSQL enum types before creating tables
        await conn.execute(text(
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN "
            "CREATE TYPE role AS ENUM ('OWNER', 'PARTNER', 'ASSOCIATE', 'PARALEGAL', 'EXTERNAL'); "
            "END IF; "
            "END $$;"
        ))
        
        # Create enum for WhatsApp document session status
        await conn.execute(text(
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'whatsapp_doc_session_status') THEN "
            "CREATE TYPE whatsapp_doc_session_status AS ENUM ('pending', 'document_generated', 'sent_to_whatsapp', 'waiting_for_feedback', 'editing', 'completed', 'cancelled'); "
            "END IF; "
            "END $$;"
        ))
        
        await conn.run_sync(Base.metadata.create_all)
