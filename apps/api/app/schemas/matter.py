from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.base import APIModel


class MatterCreate(BaseModel):
    title: str = Field(..., max_length=255)
    number: Optional[str] = Field(None, max_length=128)
    jurisdiction: Optional[str] = None
    court: Optional[str] = None
    stage: Optional[str] = None
    description: Optional[str] = None
    client_display: Optional[str] = None


class MatterUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    number: Optional[str] = Field(None, max_length=128)
    jurisdiction: Optional[str] = None
    court: Optional[str] = None
    stage: Optional[str] = None
    description: Optional[str] = None
    client_display: Optional[str] = None

    @field_validator("*", mode="before")
    @classmethod
    def empty_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @model_validator(mode="after")
    def ensure_not_empty(self) -> "MatterUpdate":
        vals = {
            "title": self.title, "number": self.number, "jurisdiction": self.jurisdiction,
            "court": self.court, "stage": self.stage, "description": self.description,
            "client_display": self.client_display,
        }
        if not any(v is not None for v in vals.values()):
            raise ValueError("At least one field must be provided for update.")
        return self


class MatterOut(APIModel):
    id: uuid.UUID
    org_id: str
    title: str
    number: Optional[str]
    jurisdiction: Optional[str]
    court: Optional[str]
    stage: Optional[str]
    description: Optional[str]
    client_display: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: datetime


class MattersPage(APIModel):
    items: list[MatterOut]
    next_cursor: Optional[str] = None
