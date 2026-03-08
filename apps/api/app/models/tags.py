from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, List

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import OrgScopedMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.matters import MatterTag


class Tag(OrgScopedMixin, TimestampMixin, Base):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)

    matters: Mapped[List["MatterTag"]] = relationship(back_populates="tag", cascade="all,delete-orphan")

    __table_args__ = (UniqueConstraint("org_id", "name", name="uq_tag_org_name"),)
