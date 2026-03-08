"""Document chat sessions — upload a doc, analyze it, chat with it."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import TimestampMixin


class DocSession(TimestampMixin, Base):
    __tablename__ = "docsession"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4()),
    )
    # Optional org/user scoping
    org_id: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    user_id: Mapped[str | None] = mapped_column(String, index=True, nullable=True)

    # Uploaded file info
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    content_type: Mapped[str | None] = mapped_column(String, nullable=True)
    byte_size: Mapped[int | None] = mapped_column(nullable=True)
    gcs_object_key: Mapped[str | None] = mapped_column(String, nullable=True)

    # Extracted text from the document
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # AI analysis (key_terms, parties, obligations, risks, etc.)
    analysis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Status: processing, ready, failed
    status: Mapped[str] = mapped_column(String(20), default="processing", index=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    messages: Mapped[list["DocMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan",
        order_by="DocMessage.created_at",
    )


class DocMessage(TimestampMixin, Base):
    __tablename__ = "docmessage"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4()),
    )
    session_id: Mapped[str] = mapped_column(
        String, ForeignKey("docsession.id", ondelete="CASCADE"), index=True, nullable=False,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # "user" or "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)

    session: Mapped["DocSession"] = relationship(back_populates="messages")
