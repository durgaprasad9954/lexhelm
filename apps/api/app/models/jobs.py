"""Async job model — tracks long-running tasks (research, document generation)."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin


class Job(TimestampMixin, Base):
    __tablename__ = "job"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4()),
    )
    org_id: Mapped[str] = mapped_column(String, index=True, nullable=True)
    user_id: Mapped[str] = mapped_column(String, index=True, nullable=True)

    # Job type: "research", "deep_search", "document_generate", etc.
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # Status: pending → processing → completed | failed
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", index=True,
    )

    # Input params (JSON) — what the job was asked to do
    input_params: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Result (JSON) — output when completed
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Error message if failed
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Progress tracking (0-100)
    progress: Mapped[int] = mapped_column(default=0)

    # When processing started/finished
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
