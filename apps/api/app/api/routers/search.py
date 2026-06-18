"""Legal case search endpoints — wraps IndianKanoon API."""
from __future__ import annotations

import json
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from google.genai import types

from app.core import settings
from app.core.rate_limit import RateLimit
from app.schemas.search import (
    CaseDetail,
    CaseMeta,
    CaseResult,
    CaseSearchResponse,
    SearchChatRequest,
    SearchChatResponse,
    SearchChatSource,
)
from app.services import search_service
from app.services.document_service import _get_genai_client

router = APIRouter()

_search_limit = RateLimit(max_requests=60, window_seconds=60, key_prefix="search")


def _clean_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _extract_sources(raw: dict, limit: int = 5) -> list[SearchChatSource]:
    docs = raw.get("docs", [])
    sources: list[SearchChatSource] = []
    for doc in docs[:limit]:
        if not isinstance(doc, dict):
            continue
        sources.append(SearchChatSource(
            doc_id=doc.get("tid"),
            title=_clean_text(doc.get("title", "").replace("<b>", "").replace("</b>", "")),
            headline=_clean_text(doc.get("headline", "")),
            court=_clean_text(doc.get("docsource", "")) or None,
            date=_clean_text(doc.get("publishdate", "")) or None,
            citation=_clean_text(doc.get("citation", "")) or None,
        ))
    return sources


async def _build_search_chat_answer(query: str, sources: list[SearchChatSource]) -> str:
    if not sources:
        return (
            "I could not find matching case-law search results for that question yet. "
            "Try using more specific parties, sections, statutes, or a shorter legal issue."
        )

    if not settings.gemini_api_key:
        bullet_lines = []
        for source in sources[:3]:
            snippet = source.headline or "Relevant Indian case-law search result."
            bullet_lines.append(
                f"- {source.title}: {snippet}"
            )
        return (
            "Here is a quick legal-search summary based on the matching results I found:\n\n"
            + "\n".join(bullet_lines)
            + "\n\nThis is a search-based summary, so please open the cited results for the exact holding and context."
        )

    client = _get_genai_client()
    prompt = f"""You are LexHelm's Indian legal research assistant.
Answer the user's legal question using only the supplied search results.
Do not invent authorities or conclusions not supported by the results.
If the results are incomplete, say that clearly.
Keep the answer concise but helpful, in plain English.

User question:
{query}

Search results:
{json.dumps([source.model_dump() for source in sources], ensure_ascii=True)}
"""
    response = await client.aio.models.generate_content(
        model=settings.gemini_lite_model,
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.2),
    )
    return _clean_text(response.text)


@router.get("/cases", response_model=CaseSearchResponse, dependencies=[Depends(_search_limit)])
async def search_cases(
    query: str = Query(..., min_length=1, max_length=500),
    page: int = Query(0, ge=0),
    max_pages: int = Query(1, ge=1, le=5),
    from_date: Optional[str] = Query(None, description="DD-MM-YYYY"),
    to_date: Optional[str] = Query(None, description="DD-MM-YYYY"),
    sort_by: Optional[str] = Query(None, description="mostrecent or leastrecent"),
):
    try:
        raw = await search_service.search_cases(
            query, page=page, max_pages=max_pages,
            from_date=from_date, to_date=to_date, sort_by=sort_by,
        )
    except search_service.AuthenticationError:
        raise HTTPException(status_code=503, detail="Search service not configured (missing IK_API_KEY)")
    except search_service.RateLimitError:
        raise HTTPException(status_code=429, detail="Search rate limit exceeded")
    except search_service.IndianKanoonError as e:
        raise HTTPException(status_code=502, detail=f"Search service error: {e}")

    docs = raw.get("docs", [])
    results = []
    for doc in docs:
        if isinstance(doc, dict):
            results.append(CaseResult(
                doc_id=doc.get("tid"),
                title=doc.get("title", "").replace("<b>", "").replace("</b>", ""),
                headline=doc.get("headline", ""),
                court=doc.get("docsource"),
                date=doc.get("publishdate"),
                citation=doc.get("citation"),
                snippet=doc.get("headline", "")[:300],
            ))

    # "found" can be a string like "1 - 10 of 13616" — extract the total count
    found_raw = raw.get("found", len(results))
    if isinstance(found_raw, str):
        import re
        m = re.search(r"of\s+([\d,]+)", found_raw)
        total = int(m.group(1).replace(",", "")) if m else len(results)
    else:
        total = int(found_raw)

    return CaseSearchResponse(
        query=query, total=total,
        results=results, page=page,
    )


@router.get("/cases/{doc_id}", response_model=CaseDetail)
async def get_case(doc_id: int):
    try:
        raw = await search_service.get_case(doc_id, cites_limit=5, cited_by_limit=5)
    except search_service.NotFoundError:
        raise HTTPException(status_code=404, detail="Case not found")
    except search_service.IndianKanoonError as e:
        raise HTTPException(status_code=502, detail=f"Search service error: {e}")

    return CaseDetail(
        doc_id=doc_id,
        title=raw.get("title"),
        doc=raw.get("doc"),
        court=raw.get("docsource"),
        date=raw.get("publishdate"),
        citation=raw.get("citation"),
        author=raw.get("author"),
    )


@router.get("/cases/{doc_id}/meta", response_model=CaseMeta)
async def get_case_meta(doc_id: int):
    try:
        raw = await search_service.get_case_meta(doc_id, cites_limit=10, cited_by_limit=10)
    except search_service.NotFoundError:
        raise HTTPException(status_code=404, detail="Case not found")
    except search_service.IndianKanoonError as e:
        raise HTTPException(status_code=502, detail=f"Search service error: {e}")

    return CaseMeta(
        doc_id=doc_id,
        title=raw.get("title"),
        court=raw.get("docsource"),
        date=raw.get("publishdate"),
        citation=raw.get("citation"),
        cites=raw.get("cites", []),
        cited_by=raw.get("citedby", []),
    )


@router.post("/ask", response_model=SearchChatResponse, dependencies=[Depends(_search_limit)])
async def ask_legal_search(payload: SearchChatRequest):
    query = _clean_text(payload.query)
    try:
        raw = await search_service.search_cases(query, page=0, max_pages=1)
    except search_service.AuthenticationError:
        raise HTTPException(status_code=503, detail="Search service not configured (missing IK_API_KEY)")
    except search_service.RateLimitError:
        raise HTTPException(status_code=429, detail="Search rate limit exceeded")
    except search_service.IndianKanoonError as e:
        raise HTTPException(status_code=502, detail=f"Search service error: {e}")

    sources = _extract_sources(raw)
    answer = await _build_search_chat_answer(query, sources)
    return SearchChatResponse(query=query, answer=answer, sources=sources)
