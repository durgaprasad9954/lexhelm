from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.base import APIModel


class ArtifactInitRequest(BaseModel):
    matter_id: uuid.UUID
    file_name: str = Field(..., min_length=1, max_length=512)
    content_type: Optional[str] = Field(None, max_length=256)
    byte_size: Optional[int] = Field(None, ge=0)


class ArtifactCommitRequest(BaseModel):
    byte_size: Optional[int] = Field(None, ge=0)
    content_type: Optional[str] = Field(None, max_length=256)
    sha256: Optional[str] = Field(None, max_length=128)


class ArtifactOut(APIModel):
    id: uuid.UUID
    org_id: str
    matter_id: Optional[uuid.UUID]
    file_name: str
    content_type: Optional[str]
    byte_size: Optional[int]
    gcs_bucket: str
    gcs_object_key: str
    sha256: Optional[str]
    tags: list[str]
    created_by: str
    created_at: datetime
    updated_at: datetime


class ArtifactUploadInitResponse(APIModel):
    artifact: ArtifactOut
    upload_url: str
    upload_headers: dict[str, str]


class ArtifactDownloadResponse(APIModel):
    artifact_id: uuid.UUID
    download_url: str
    expires_in_seconds: int
