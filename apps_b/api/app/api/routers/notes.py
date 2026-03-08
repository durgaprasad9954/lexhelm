from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import RequestContext, get_request_context, get_rls_session
from app.models.matters import Matter
from app.models.notes import Note
from app.schemas.note import NoteCreate, NoteOut, NoteUpdate

router = APIRouter()


async def _ensure_matter(session: AsyncSession, context: RequestContext, matter_id: uuid.UUID) -> None:
    if not await session.scalar(select(Matter.id).where(Matter.id == matter_id, Matter.org_id == context.org_id)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matter not found.")


async def _load_note(session: AsyncSession, context: RequestContext, note_id: uuid.UUID) -> Note:
    note = await session.scalar(select(Note).where(Note.id == note_id, Note.org_id == context.org_id))
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    return note


@router.post("/matters/{matter_id}/notes", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    matter_id: uuid.UUID, payload: NoteCreate,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
) -> Note:
    await _ensure_matter(session, context, matter_id)
    note = Note(
        org_id=context.org_id, matter_id=matter_id, created_by=context.user_id,
        pinned_citation_ids=[], **payload.model_dump(exclude_unset=True),
    )
    session.add(note)
    await session.flush()
    await session.refresh(note)
    await session.commit()
    return note


@router.get("/matters/{matter_id}/notes", response_model=list[NoteOut])
async def list_notes(
    matter_id: uuid.UUID,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
    query: Optional[str] = Query(default=None),
) -> list[Note]:
    await _ensure_matter(session, context, matter_id)
    stmt = select(Note).where(Note.matter_id == matter_id, Note.org_id == context.org_id).order_by(Note.created_at.desc())
    if query:
        like = f"%{query}%"
        stmt = stmt.where(Note.body.ilike(like) | func.coalesce(Note.title, "").ilike(like))
    return list((await session.scalars(stmt)).all())


@router.get("/notes/{note_id}", response_model=NoteOut)
async def get_note(
    note_id: uuid.UUID,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
) -> Note:
    return await _load_note(session, context, note_id)


@router.patch("/notes/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: uuid.UUID, payload: NoteUpdate,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
) -> Note:
    note = await _load_note(session, context, note_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    await session.flush()
    await session.refresh(note)
    await session.commit()
    return note
