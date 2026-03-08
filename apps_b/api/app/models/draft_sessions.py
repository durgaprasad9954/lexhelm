"""Draft chat sessions — conversational document drafting with intelligent field extraction."""
from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import TimestampMixin


class DraftSession(TimestampMixin, Base):
    __tablename__ = "draftsession"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4()),
    )
    org_id: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    user_id: Mapped[str | None] = mapped_column(String, index=True, nullable=True)

    template_id: Mapped[str | None] = mapped_column(String, nullable=True)
    collected_fields: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)
    missing_fields: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    last_asked_field: Mapped[str | None] = mapped_column(String, nullable=True)

    # identify | collect | confirm | done
    phase: Mapped[str] = mapped_column(String(20), default="identify", index=True)
    generated_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)

    messages: Mapped[list["DraftMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan",
        order_by="DraftMessage.created_at",
    )


class DraftMessage(TimestampMixin, Base):
    __tablename__ = "draftmessage"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4()),
    )
    session_id: Mapped[str] = mapped_column(
        String, ForeignKey("draftsession.id", ondelete="CASCADE"), index=True, nullable=False,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    extracted_fields: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    session: Mapped["DraftSession"] = relationship(back_populates="messages")
