"""Consultation request models."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin


class ConsultationRequest(TimestampMixin, Base):
    """Stores legal consultation requests from users."""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Consultation details
    consultation_type: Mapped[str] = mapped_column(String(50), nullable=False)
    urgency: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Status tracking
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True,
    )
    
    # Admin handling
    assigned_to: Mapped[Optional[str]] = mapped_column(String(320))
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # User tracking (if logged in)
    user_id: Mapped[Optional[str]] = mapped_column(String(255), index=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')",
            name="ck_consultation_status",
        ),
        CheckConstraint(
            "urgency IN ('low', 'medium', 'high', 'urgent')",
            name="ck_consultation_urgency",
        ),
    )
