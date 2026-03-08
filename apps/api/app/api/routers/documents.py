"""Document generation endpoints — contract/agreement drafting."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.rate_limit import RateLimit
from app.schemas.document import (
    DocumentGenerateRequest, DocumentGenerateResponse, DocumentParseRequest,
    DocumentParseResponse, DraftFromDescriptionRequest, DraftFromDescriptionResponse,
    KeyTerm, TemplateInfo, TemplateListResponse,
)
from app.services import document_service

router = APIRouter()

_gen_limit = RateLimit(max_requests=20, window_seconds=3600, key_prefix="doc_gen")
_parse_limit = RateLimit(max_requests=15, window_seconds=3600, key_prefix="doc_parse")


@router.get("/templates", response_model=TemplateListResponse)
async def list_templates():
    templates = document_service.list_templates()
    return TemplateListResponse(
        templates=[TemplateInfo(**t) for t in templates]
    )


@router.post("/generate", response_model=DocumentGenerateResponse, dependencies=[Depends(_gen_limit)])
async def generate_document(req: DocumentGenerateRequest):
    try:
        if req.ai_enhance:
            content = await document_service.generate_draft_enhanced(req.template_id, req.params)
        else:
            content = document_service.generate_draft(req.template_id, req.params)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return DocumentGenerateResponse(template_id=req.template_id, content=content, format="markdown")


@router.post("/draft", response_model=DraftFromDescriptionResponse, dependencies=[Depends(_gen_limit)])
async def draft_from_description(req: DraftFromDescriptionRequest):
    """Describe what document you need in plain English — AI picks the template and fills it."""
    try:
        result = await document_service.draft_from_description(req.description)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    content = result["content"]
    if req.ai_enhance and result["template_id"] != "custom":
        try:
            content = await document_service.generate_draft_enhanced(
                result["template_id"], result["params"]
            )
        except Exception:
            pass  # Fall back to non-enhanced version

    return DraftFromDescriptionResponse(
        template_id=result["template_id"],
        content=content,
        params=result.get("params", {}),
        suggestions=result.get("suggestions", []),
        format="markdown",
    )


@router.post("/parse", response_model=DocumentParseResponse, dependencies=[Depends(_parse_limit)])
async def parse_document(req: DocumentParseRequest):
    result = await document_service.parse_contract(req.text)
    return DocumentParseResponse(
        key_terms=[KeyTerm(**kt) for kt in result.get("key_terms", [])],
        parties=result.get("parties", []),
        effective_date=result.get("effective_date"),
        termination_date=result.get("termination_date"),
        obligations=result.get("obligations", []),
        risks=result.get("risks", []),
    )
