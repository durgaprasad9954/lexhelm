"""Schemas for async job endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.base import APIModel


class JobSubmitRequest(BaseModel):
    job_type: str = Field(..., description="Job type: deep_search, research")
    params: dict = Field(..., description="Job parameters (varies by type)")


class JobResponse(APIModel):
    id: str
    job_type: str
    status: str
    progress: int = 0
    input_params: dict = {}
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class JobListResponse(APIModel):
    jobs: list[JobResponse]
