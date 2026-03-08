"""Schemas for document chat endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.base import APIModel


class DocSessionResponse(APIModel):
    id: str
    file_name: str
    content_type: Optional[str] = None
    byte_size: Optional[int] = None
    status: str
    analysis: Optional[dict] = None
    error: Optional[str] = None
    message_count: int = 0
    created_at: datetime


class DocSessionListResponse(APIModel):
    sessions: list[DocSessionResponse]


class DocMessageResponse(APIModel):
    id: str
    role: str
    content: str
    created_at: datetime


class DocSessionDetailResponse(DocSessionResponse):
    messages: list[DocMessageResponse] = []


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000, description="Your question about the document")


class ChatResponse(APIModel):
    session_id: str
    user_message: str
    assistant_message: str
