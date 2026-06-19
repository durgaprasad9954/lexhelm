"""Schemas for legal case search endpoints."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.base import APIModel


class CaseSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    page: int = Field(0, ge=0)
    max_pages: int = Field(1, ge=1, le=5)
    from_date: Optional[str] = Field(None, description="DD-MM-YYYY format")
    to_date: Optional[str] = Field(None, description="DD-MM-YYYY format")
    sort_by: Optional[str] = Field(None, description="mostrecent or leastrecent")


class CaseResult(APIModel):
    doc_id: Optional[int] = None
    title: Optional[str] = None
    headline: Optional[str] = None
    court: Optional[str] = None
    date: Optional[str] = None
    citation: Optional[str] = None
    snippet: Optional[str] = None


class CaseSearchResponse(APIModel):
    query: str
    total: int = 0
    results: list[CaseResult] = []
    page: int = 0


class SearchChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)


class SearchChatSource(APIModel):
    doc_id: Optional[int] = None
    title: Optional[str] = None
    headline: Optional[str] = None
    court: Optional[str] = None
    date: Optional[str] = None
    citation: Optional[str] = None


class SearchChatResponse(APIModel):
    query: str
    answer: str
    sources: list[SearchChatSource] = []


class CaseDetail(APIModel):
    doc_id: int
    title: Optional[str] = None
    doc: Optional[str] = None
    court: Optional[str] = None
    date: Optional[str] = None
    citation: Optional[str] = None
    author: Optional[str] = None


class CaseMeta(APIModel):
    doc_id: int
    title: Optional[str] = None
    court: Optional[str] = None
    date: Optional[str] = None
    citation: Optional[str] = None
    cites: list[dict] = []
    cited_by: list[dict] = []
