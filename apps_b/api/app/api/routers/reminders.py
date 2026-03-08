from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import RequestContext, get_request_context, get_rls_session
from app.models.reminders import Reminder
from app.schemas.reminder import ReminderCreate, ReminderOut, RemindersList, ReminderUpdate

router = APIRouter()


async def _load_reminder(session: AsyncSession, context: RequestContext, reminder_id: uuid.UUID) -> Reminder:
    result = await session.execute(select(Reminder).where(Reminder.id == reminder_id, Reminder.org_id == context.org_id))
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reminder {reminder_id} not found")
    return reminder


@router.post("/matters/{matter_id}/reminders", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    matter_id: uuid.UUID, data: ReminderCreate,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
):
    reminder = Reminder(
        matter_id=matter_id, org_id=context.org_id,
        title=data.title, description=data.description, reminder_type=data.reminder_type,
        remind_at=data.remind_at, relative_days_before=data.relative_days_before,
        deadline_id=data.deadline_id, hearing_id=data.hearing_id,
        channels=",".join(data.channels) if data.channels else "IN_APP",
        assigned_to=data.assigned_to or context.user_id, created_by=context.user_id, status="PENDING",
    )
    session.add(reminder)
    await session.commit()
    await session.refresh(reminder)
    return reminder


@router.get("/matters/{matter_id}/reminders", response_model=RemindersList)
async def list_matter_reminders(
    matter_id: uuid.UUID, limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
    status_filter: Optional[str] = Query(None, alias="status"),
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
):
    base = select(Reminder).where(Reminder.matter_id == matter_id, Reminder.org_id == context.org_id)
    if status_filter:
        base = base.where(Reminder.status == status_filter)
    total = len((await session.execute(base)).scalars().all())
    query = base.order_by(Reminder.remind_at.asc()).limit(limit).offset(offset)
    reminders = (await session.execute(query)).scalars().all()
    return RemindersList(items=reminders, total=total, next_cursor=str(offset + limit) if offset + limit < total else None)


@router.get("/reminders/{reminder_id}", response_model=ReminderOut)
async def get_reminder(
    reminder_id: uuid.UUID,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
):
    return await _load_reminder(session, context, reminder_id)


@router.patch("/reminders/{reminder_id}", response_model=ReminderOut)
async def update_reminder(
    reminder_id: uuid.UUID, data: ReminderUpdate,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
):
    reminder = await _load_reminder(session, context, reminder_id)
    update_data = data.model_dump(exclude_unset=True)
    if "channels" in update_data and isinstance(update_data["channels"], list):
        update_data["channels"] = ",".join(update_data["channels"])
    for field, value in update_data.items():
        setattr(reminder, field, value)
    await session.commit()
    await session.refresh(reminder)
    return reminder


@router.delete("/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(
    reminder_id: uuid.UUID,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
):
    reminder = await _load_reminder(session, context, reminder_id)
    await session.delete(reminder)
    await session.commit()


@router.post("/reminders/{reminder_id}/acknowledge", response_model=ReminderOut)
async def acknowledge_reminder(
    reminder_id: uuid.UUID,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
):
    reminder = await _load_reminder(session, context, reminder_id)
    reminder.status = "ACKNOWLEDGED"
    reminder.acknowledged_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(reminder)
    return reminder


@router.post("/reminders/{reminder_id}/complete", response_model=ReminderOut)
async def complete_reminder(
    reminder_id: uuid.UUID,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
):
    reminder = await _load_reminder(session, context, reminder_id)
    reminder.status = "COMPLETED"
    await session.commit()
    await session.refresh(reminder)
    return reminder


@router.get("/reminders", response_model=RemindersList)
async def list_all_reminders(
    limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
    status_filter: Optional[str] = Query(None, alias="status"),
    assigned_to: Optional[str] = Query(None),
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
):
    base = select(Reminder).where(Reminder.org_id == context.org_id)
    if status_filter:
        base = base.where(Reminder.status == status_filter)
    if assigned_to:
        base = base.where(Reminder.assigned_to == assigned_to)
    total = len((await session.execute(base)).scalars().all())
    query = base.order_by(Reminder.remind_at.asc()).limit(limit).offset(offset)
    reminders = (await session.execute(query)).scalars().all()
    return RemindersList(items=reminders, total=total, next_cursor=str(offset + limit) if offset + limit < total else None)
