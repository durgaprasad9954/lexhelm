"""Schemas for document generation (contract drafting) endpoints."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.base import APIModel


class TemplateInfo(APIModel):
    template_id: str
    name: str
    description: str
    required_fields: list[str]
    optional_fields: list[str] = []


class TemplateListResponse(APIModel):
    templates: list[TemplateInfo]


class DocumentGenerateRequest(BaseModel):
    template_id: str = Field(..., description="Template type: rental_agreement, nda, service_agreement, power_of_attorney, legal_notice")
    params: dict = Field(..., description="Template parameters (party names, dates, amounts, etc.)")
    ai_enhance: bool = Field(False, description="Use AI to suggest missing clauses")


class DocumentGenerateResponse(APIModel):
    template_id: str
    content: str
    format: str = "markdown"


class DocumentParseRequest(BaseModel):
    text: str = Field(..., min_length=10, description="Contract text to parse")


class KeyTerm(APIModel):
    label: str
    value: str
    clause_ref: Optional[str] = None


class DocumentParseResponse(APIModel):
    key_terms: list[KeyTerm]
    parties: list[str] = []
    effective_date: Optional[str] = None
    termination_date: Optional[str] = None
    obligations: list[str] = []
    risks: list[str] = []


class DraftFromDescriptionRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=2000, description="Natural language description of the document needed")
    ai_enhance: bool = Field(False, description="Further enhance with additional clauses after generation")


class DraftFromDescriptionResponse(APIModel):
    template_id: str
    content: str
    params: dict = {}
    suggestions: list[str] = []
    format: str = "markdown"


# ── Draft Chat (conversational drafting) ──────────────────────────


class DraftChatStartRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    template_id: Optional[str] = None


class DraftChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class DraftChatRefineRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    current_document: str = Field(..., min_length=1)


class DraftChatMessageInfo(APIModel):
    id: str
    role: str
    content: str
    extracted_fields: Optional[dict] = None
    created_at: str


class DraftChatResponse(APIModel):
    session_id: str
    assistant_message: str
    phase: str
    template_id: Optional[str] = None
    collected_fields: dict = {}
    missing_fields: list[str] = []
    generated_content: Optional[str] = None


class DraftChatSessionDetail(APIModel):
    session_id: str
    phase: str
    template_id: Optional[str] = None
    collected_fields: dict = {}
    missing_fields: list[str] = []
    generated_content: Optional[str] = None
    status: str
    messages: list[DraftChatMessageInfo] = []
    created_at: str


class DraftChatSessionSummary(APIModel):
    session_id: str
    template_id: Optional[str] = None
    phase: str
    status: str
    message_count: int = 0
    created_at: str


class DraftChatListResponse(APIModel):
    sessions: list[DraftChatSessionSummary] = []
