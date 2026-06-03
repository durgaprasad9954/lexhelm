"""Consultation request schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class ConsultationRequestCreate(BaseModel):
    """Schema for creating a consultation request."""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)
    consultation_type: str = Field(..., min_length=1, max_length=50)
    urgency: str = Field(default="medium", pattern=r"^(low|medium|high|urgent)$")
    subject: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=10)


class ConsultationRequestResponse(BaseModel):
    """Schema for consultation request response."""
    id: UUID
    name: str
    email: str
    phone: Optional[str]
    consultation_type: str
    urgency: str
    subject: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConsultationRequestList(BaseModel):
    """Schema for listing consultation requests."""
    requests: list[ConsultationRequestResponse]
    total: int


class ConsultationStatusUpdate(BaseModel):
    """Schema for updating consultation status."""
    status: str = Field(..., pattern=r"^(pending|assigned|in_progress|completed|cancelled)$")
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
