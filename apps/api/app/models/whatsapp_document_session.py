"""WhatsApp document session model for tracking document generation via WhatsApp."""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin


class SessionStatus(PyEnum):
    PENDING = "pending"
    DOCUMENT_GENERATED = "document_generated"
    SENT_TO_WHATSAPP = "sent_to_whatsapp"
    WAITING_FOR_FEEDBACK = "waiting_for_feedback"
    EDITING = "editing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class WhatsAppDocumentSession(TimestampMixin, Base):
    """Tracks document generation sessions initiated via WhatsApp or web."""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    
    # User information
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(320))
    
    # Document details
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    template_id: Mapped[Optional[str]] = mapped_column(String(50))
    params: Mapped[dict] = mapped_column(JSON, default=dict)
    
    # Document content (versions)
    current_content: Mapped[Optional[str]] = mapped_column(Text)
    previous_content: Mapped[Optional[str]] = mapped_column(Text)
    version: Mapped[int] = mapped_column(default=1)
    
    # Status tracking
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, name="whatsapp_doc_session_status", schema="mattersapi", values_callable=lambda obj: [e.value for e in obj]),
        default=SessionStatus.PENDING,
        nullable=False
    )
    
    # WhatsApp message tracking
    last_message_id: Mapped[Optional[str]] = mapped_column(String(100))
    last_message_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Conversation history
    conversation_history: Mapped[list] = mapped_column(JSON, default=list)
    
    # User feedback/changes requested
    pending_changes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Final document
    final_document_url: Mapped[Optional[str]] = mapped_column(String(500))
    
    # Timestamps
    document_generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    sent_to_whatsapp_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
