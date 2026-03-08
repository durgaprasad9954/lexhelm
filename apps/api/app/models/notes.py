from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import OrgScopedMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.matters import Matter
    from app.models.orgs import User


class Note(OrgScopedMixin, TimestampMixin, Base):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    matter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("matter.id", ondelete="CASCADE"))
    title: Mapped[Optional[str]] = mapped_column(String)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(String, default="GENERAL", nullable=False)
    pinned_citation_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(UUID(as_uuid=True)), default=list, nullable=False)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("user.id"), nullable=False)
    fts: Mapped[Optional[str]] = mapped_column(TSVECTOR)

    matter: Mapped["Matter"] = relationship(back_populates="notes")
    creator: Mapped["User"] = relationship()

    __table_args__ = (
        CheckConstraint("kind IN ('GENERAL','HEARING','RESEARCH','PARAWISE')", name="ck_note_kind"),
    )
