from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY, BIGINT, TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import OrgScopedMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.matters import Matter
    from app.models.orgs import User


class Artifact(OrgScopedMixin, TimestampMixin, Base):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    matter_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("matter.id", ondelete="CASCADE"))
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    content_type: Mapped[Optional[str]] = mapped_column(String)
    byte_size: Mapped[Optional[int]] = mapped_column(BIGINT)
    gcs_bucket: Mapped[str] = mapped_column(String, nullable=False)
    gcs_object_key: Mapped[str] = mapped_column(String, nullable=False)
    sha256: Mapped[Optional[str]] = mapped_column(String)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    ocr_text: Mapped[Optional[str]] = mapped_column(TSVECTOR)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("user.id"), nullable=False)

    matter: Mapped[Optional["Matter"]] = relationship(back_populates="artifacts")
    creator: Mapped["User"] = relationship()
