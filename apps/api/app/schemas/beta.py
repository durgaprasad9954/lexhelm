"""Pydantic schemas for beta access and metrics."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.base import APIModel


# ---------- Beta Request ----------

class BetaRequestCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = Field(None, max_length=255)
    company: Optional[str] = Field(None, max_length=255)
    use_case: Optional[str] = Field(None, max_length=2000)
    referrer: Optional[str] = Field(None, max_length=512)


class BetaRequestOut(APIModel):
    id: uuid.UUID
    email: str
    name: Optional[str]
    company: Optional[str]
    use_case: Optional[str]
    referrer: Optional[str]
    status: str
    reviewed_by: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class BetaRequestReview(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")


class BetaStatusCheck(APIModel):
    email: str
    status: str  # "pending" | "approved" | "rejected" | "not_found"


# ---------- Metrics ----------

class MetricEventCreate(BaseModel):
    event_type: str = Field(..., max_length=100)
    metadata: Optional[dict] = None


class MetricsSummary(APIModel):
    total_users: int
    total_beta_requests: int
    pending_requests: int
    approved_requests: int
    rejected_requests: int
    total_api_requests: int
    recent_signups: list[BetaRequestOut]
