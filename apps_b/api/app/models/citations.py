from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import OrgScopedMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.matters import Matter
    from app.models.orgs import User


class Citation(OrgScopedMixin, TimestampMixin, Base):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    matter_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("matter.id", ondelete="SET NULL"))
    source: Mapped[str] = mapped_column(String, default="INDIA_KANOON", nullable=False)
    external_id: Mapped[Optional[str]] = mapped_column(String)
    case_name: Mapped[Optional[str]] = mapped_column(String)
    court: Mapped[Optional[str]] = mapped_column(String)
    year: Mapped[Optional[int]] = mapped_column(Integer)
    para_refs: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("user.id"), nullable=False)

    matter: Mapped[Optional["Matter"]] = relationship(back_populates="citations")
    creator: Mapped["User"] = relationship()

    __table_args__ = (
        CheckConstraint("source IN ('INDIA_KANOON','MANUAL')", name="ck_citation_source"),
    )
