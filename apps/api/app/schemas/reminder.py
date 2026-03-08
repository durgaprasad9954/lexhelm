from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.base import APIModel


class ReminderCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    reminder_type: str = Field(default="CUSTOM")
    remind_at: datetime
    relative_days_before: Optional[int] = None
    deadline_id: Optional[uuid.UUID] = None
    hearing_id: Optional[uuid.UUID] = None
    channels: list[str] = Field(default=["IN_APP"])
    assigned_to: Optional[str] = None


class ReminderUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    reminder_type: Optional[str] = None
    remind_at: Optional[datetime] = None
    relative_days_before: Optional[int] = None
    deadline_id: Optional[uuid.UUID] = None
    hearing_id: Optional[uuid.UUID] = None
    channels: Optional[list[str]] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None


class ReminderOut(APIModel):
    id: uuid.UUID
    org_id: str
    matter_id: uuid.UUID
    title: str
    description: Optional[str]
    reminder_type: str
    remind_at: datetime
    relative_days_before: Optional[int]
    deadline_id: Optional[uuid.UUID]
    hearing_id: Optional[uuid.UUID]
    status: str
    sent_at: Optional[datetime]
    acknowledged_at: Optional[datetime]
    channels: str
    assigned_to: str
    created_by: str
    calendar_event_id: Optional[str]
    ical_uid: Optional[str]
    created_at: datetime
    updated_at: datetime

    @property
    def channels_list(self) -> list[str]:
        return [c.strip() for c in self.channels.split(",") if c.strip()]


class RemindersList(APIModel):
    items: list[ReminderOut]
    total: int
    next_cursor: Optional[str] = None
