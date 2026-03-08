"""Legal case search endpoints — wraps IndianKanoon API."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.search import CaseDetail, CaseMeta, CaseResult, CaseSearchResponse
from app.services import search_service

router = APIRouter()


@router.get("/cases", response_model=CaseSearchResponse)
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
