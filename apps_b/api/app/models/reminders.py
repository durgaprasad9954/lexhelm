from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import OrgScopedMixin, TimestampMixin

ReminderTypeEnum = Enum("DEADLINE", "HEARING", "TASK", "FOLLOWUP", "CUSTOM", name="reminder_type")
ReminderStatusEnum = Enum("PENDING", "SENT", "ACKNOWLEDGED", "DISMISSED", "COMPLETED", name="reminder_status")
ReminderChannelEnum = Enum("EMAIL", "IN_APP", "CALENDAR", "SMS", name="reminder_channel")

if TYPE_CHECKING:
    from app.models.matters import Matter
    from app.models.deadlines import Deadline
    from app.models.hearings import Hearing


class Reminder(OrgScopedMixin, TimestampMixin, Base):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    matter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("matter.id", ondelete="CASCADE"), index=True)
    deadline_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("deadline.id", ondelete="CASCADE"), nullable=True)
    hearing_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("hearing.id", ondelete="CASCADE"), nullable=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reminder_type: Mapped[str] = mapped_column(ReminderTypeEnum, nullable=False, default="CUSTOM")
    remind_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    relative_days_before: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(ReminderStatusEnum, nullable=False, default="PENDING")
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    channels: Mapped[list[str]] = mapped_column(String, nullable=False, default="IN_APP")
    assigned_to: Mapped[str] = mapped_column(String, ForeignKey("user.id"), nullable=False, index=True)
    created_by: Mapped[str] = mapped_column(String, nullable=False)
    calendar_event_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ical_uid: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True)

    matter: Mapped["Matter"] = relationship(back_populates="reminders")
    deadline: Mapped[Optional["Deadline"]] = relationship()
    hearing: Mapped[Optional["Hearing"]] = relationship()

    @property
    def channels_list(self) -> list[str]:
        return [c.strip() for c in self.channels.split(",") if c.strip()]

    def set_channels(self, channels: list[str]) -> None:
        self.channels = ",".join(channels)
