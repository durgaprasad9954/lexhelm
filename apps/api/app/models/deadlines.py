from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import OrgScopedMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.matters import Matter
    from app.models.orgs import User


class Deadline(OrgScopedMixin, TimestampMixin, Base):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    matter_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("matter.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String, nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    kind: Mapped[str] = mapped_column(String, default="OTHER", nullable=False)
    status: Mapped[str] = mapped_column(String, default="OPEN", nullable=False)
    assignee: Mapped[Optional[str]] = mapped_column(String, ForeignKey("user.id"))
    reminder_minutes: Mapped[list[int]] = mapped_column(ARRAY(Integer), default=lambda: [1440, 120, 30], nullable=False)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("user.id"), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    matter: Mapped[Optional["Matter"]] = relationship(back_populates="deadlines")
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])
    assignee_user: Mapped[Optional["User"]] = relationship(foreign_keys=[assignee])

    __table_args__ = (
        CheckConstraint("kind IN ('LIMITATION','FILING','INTERNAL','SERVICE','OTHER')", name="ck_deadline_kind"),
        CheckConstraint("status IN ('OPEN','DONE','CANCELLED','OVERDUE')", name="ck_deadline_status"),
    )
