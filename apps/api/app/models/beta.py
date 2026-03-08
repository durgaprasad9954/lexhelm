"""Beta access request and metric tracking models."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin


class BetaRequest(TimestampMixin, Base):
    """Captures interest from public landing/blog pages."""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255))
    company: Mapped[Optional[str]] = mapped_column(String(255))
    use_case: Mapped[Optional[str]] = mapped_column(Text)
    referrer: Mapped[Optional[str]] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True,
    )

    # set when admin approves/rejects
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(320))
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected')",
            name="ck_betarequest_status",
        ),
    )


class MetricEvent(Base):
    """Lightweight event log for tracking usage metrics."""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(320))
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True,
    )
