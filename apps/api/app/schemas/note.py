from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.schemas.base import APIModel


class NoteCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    body: str = Field(..., min_length=1)
    kind: Optional[str] = Field("GENERAL")


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    body: Optional[str] = Field(None, min_length=1)
    kind: Optional[str] = Field(None)

    @model_validator(mode="after")
    def ensure_not_empty(self) -> "NoteUpdate":
        if not any(v is not None for v in (self.title, self.body, self.kind)):
            raise ValueError("At least one field must be provided for update.")
        return self


class NoteOut(APIModel):
    id: uuid.UUID
    org_id: str
    matter_id: uuid.UUID
    title: Optional[str]
    body: str
    kind: str
    pinned_citation_ids: list[uuid.UUID]
    created_by: str
    created_at: datetime
    updated_at: datetime
