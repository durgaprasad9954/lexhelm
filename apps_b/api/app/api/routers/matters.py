from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import RequestContext, get_request_context, get_rls_session
from app.models.matters import Matter
from app.schemas.matter import MatterCreate, MatterOut, MatterUpdate, MattersPage

router = APIRouter()


async def _load_matter(session: AsyncSession, context: RequestContext, matter_id: uuid.UUID) -> Matter:
    matter = await session.get(Matter, matter_id)
    if not matter or matter.org_id != context.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matter not found.")
    return matter


@router.post("", response_model=MatterOut, status_code=status.HTTP_201_CREATED)
async def create_matter(
    payload: MatterCreate,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
) -> Matter:
    matter = Matter(**payload.model_dump(exclude_unset=True), org_id=context.org_id, created_by=context.user_id)
    session.add(matter)
    await session.flush()
    await session.refresh(matter)
    await session.commit()
    return matter


@router.get("", response_model=MattersPage)
async def list_matters(
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
    query: Optional[str] = Query(default=None),
    stage: Optional[str] = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    cursor: Optional[str] = Query(default=None),
) -> MattersPage:
    stmt = select(Matter).where(Matter.org_id == context.org_id).order_by(Matter.created_at.desc())
    if query:
        like = f"%{query.lower()}%"
        stmt = stmt.where(func.lower(Matter.title).like(like) | func.lower(Matter.description).like(like))
    if stage:
        stmt = stmt.where(func.lower(Matter.stage) == stage.lower())
    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Cursor must be ISO formatted.") from exc
        stmt = stmt.where(Matter.created_at < cursor_dt)
    stmt = stmt.limit(limit + 1)
    matters = list((await session.scalars(stmt)).all())
    next_cursor = None
    if len(matters) > limit:
        next_cursor = matters[limit - 1].created_at.isoformat()
        matters = matters[:limit]
    return MattersPage(items=matters, next_cursor=next_cursor)


@router.get("/{matter_id}", response_model=MatterOut)
async def get_matter(
    matter_id: uuid.UUID,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
) -> Matter:
    return await _load_matter(session, context, matter_id)


@router.patch("/{matter_id}", response_model=MatterOut)
async def update_matter(
    matter_id: uuid.UUID, payload: MatterUpdate,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
) -> Matter:
    matter = await _load_matter(session, context, matter_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(matter, field, value)
    await session.flush()
    await session.refresh(matter)
    await session.commit()
    return matter


@router.delete("/{matter_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_matter(
    matter_id: uuid.UUID,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
):
    matter = await _load_matter(session, context, matter_id)
    await session.delete(matter)
    await session.commit()
