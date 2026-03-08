"""Job handlers — actual work executed by workers or in-process.

Each handler receives a message dict with job_id, job_type, input_params.
Updates job status in DB as it progresses.
"""
from __future__ import annotations

import logging
from typing import Any

from app.services import job_service

logger = logging.getLogger(__name__)

# Registry of handler functions
_HANDLERS: dict[str, Any] = {}


def handler(job_type: str):
    """Decorator to register a job handler."""
    def decorator(fn):
        _HANDLERS[job_type] = fn
        return fn
    return decorator


async def handle_job(message: dict) -> None:
    """Dispatch a job message to the appropriate handler."""
    job_id = message["job_id"]
    job_type = message["job_type"]
    input_params = message.get("input_params", {})

    fn = _HANDLERS.get(job_type)
    if not fn:
        await job_service.update_job_status(job_id, "failed", error=f"Unknown job type: {job_type}")
        return

    await job_service.update_job_status(job_id, "processing", progress=0)

    try:
        result = await fn(job_id, input_params)
        await job_service.update_job_status(job_id, "completed", progress=100, result=result)
    except Exception as e:
        logger.exception(f"[Handler] Job {job_id} ({job_type}) failed")
        await job_service.update_job_status(job_id, "failed", error=str(e))


# ── Deep Search Handler ───────────────────────────────────────────


@handler("deep_search")
async def handle_deep_search(job_id: str, params: dict) -> dict:
    """
    Multi-page search across IndianKanoon with AI summarization.

    Input params:
      query: str — search query
      max_pages: int — how many pages to fetch (default 5)
      summarize: bool — whether to AI-summarize results (default True)
    """
    from app.services import search_service

    query = params["query"]
    max_pages = params.get("max_pages", 5)
    summarize = params.get("summarize", True)

    all_results = []

    for page in range(max_pages):
        progress = int((page / max_pages) * 70)  # 0-70% for fetching
        await job_service.update_job_status(job_id, "processing", progress=progress)

        try:
            raw = await search_service.search_cases(query, page=page, max_pages=1)
        except search_service.RateLimitError:
            # Back off and stop
            break
        except search_service.IndianKanoonError:
            continue

        docs = raw.get("docs", [])
        for doc in docs:
            if isinstance(doc, dict):
                all_results.append({
                    "doc_id": doc.get("tid"),
                    "title": (doc.get("title") or "").replace("<b>", "").replace("</b>", ""),
                    "court": doc.get("docsource"),
                    "date": doc.get("publishdate"),
                    "citation": doc.get("citation"),
                    "snippet": (doc.get("headline") or "")[:500],
                })

        if not docs:
            break

    await job_service.update_job_status(job_id, "processing", progress=75)

    # Parse total from first page
    total_str = raw.get("found", len(all_results)) if raw else len(all_results)
    if isinstance(total_str, str):
        import re
        m = re.search(r"of\s+([\d,]+)", total_str)
        total = int(m.group(1).replace(",", "")) if m else len(all_results)
    else:
        total = int(total_str)

    result = {
        "query": query,
        "total_available": total,
        "results_fetched": len(all_results),
        "results": all_results,
    }

    # AI summarization
    if summarize and all_results:
        await job_service.update_job_status(job_id, "processing", progress=80)
        summary = await _summarize_search_results(query, all_results)
        result["summary"] = summary

    return result


async def _summarize_search_results(query: str, results: list[dict]) -> dict:
    """Use Gemini to create an analytical summary of search results."""
    from app.core import settings

    if not settings.gemini_api_key:
        return {"text": "AI summarization not available (no GEMINI_API_KEY)"}

    from app.services.document_service import _get_genai_client, _strip_json_fences
    import json

    client = _get_genai_client()

    # Build a compact representation of results
    cases_text = "\n".join(
        f"- {r['title']} ({r.get('court', 'Unknown')}, {r.get('date', 'N/A')}): {r.get('snippet', '')[:200]}"
        for r in results[:30]  # Cap at 30 to stay within context limits
    )

    prompt = f"""You are an expert Indian legal researcher. Analyze these search results for the query: "{query}"

Cases found ({len(results)} results):
{cases_text}

Provide a JSON response with:
{{
  "summary": "2-3 paragraph analytical summary of the legal landscape based on these cases",
  "key_principles": ["list of key legal principles established"],
  "landmark_cases": ["list of most important/landmark cases from results with brief significance"],
  "trends": "brief note on how the law has evolved based on case dates",
  "recommended_reading": ["top 5 case titles that are most relevant to the query"]
}}

Respond ONLY with valid JSON, no markdown fences."""

    try:
        response = await client.aio.models.generate_content(
            model=settings.gemini_lite_model,
            contents=prompt,
        )
        raw = _strip_json_fences(response.text)
        return json.loads(raw)
    except Exception as e:
        logger.warning(f"[Handler] AI summarization failed: {e}")
        return {"text": f"AI summarization failed: {e}"}


# ── Research Handler ──────────────────────────────────────────────


@handler("research")
async def handle_research(job_id: str, params: dict) -> dict:
    """
    Full research job: search + fetch full text of top cases + AI analysis.

    Input params:
      query: str — research question
      max_cases: int — how many full cases to fetch (default 5)
      search_pages: int — search pages to scan (default 3)
    """
    from app.services import search_service

    query = params["query"]
    max_cases = min(params.get("max_cases", 5), 10)
    search_pages = min(params.get("search_pages", 3), 5)

    # Step 1: Search
    await job_service.update_job_status(job_id, "processing", progress=10)
    all_docs = []
    for page in range(search_pages):
        try:
            raw = await search_service.search_cases(query, page=page, max_pages=1)
            docs = raw.get("docs", [])
            for doc in docs:
                if isinstance(doc, dict) and doc.get("tid"):
                    all_docs.append(doc)
        except search_service.IndianKanoonError:
            continue
        if not raw.get("docs"):
            break

    await job_service.update_job_status(job_id, "processing", progress=30)

    # Step 2: Fetch full text of top cases
    case_texts = []
    for i, doc in enumerate(all_docs[:max_cases]):
        progress = 30 + int((i / max_cases) * 40)
        await job_service.update_job_status(job_id, "processing", progress=progress)

        doc_id = doc.get("tid")
        try:
            full = await search_service.get_case(doc_id, cites_limit=3, cited_by_limit=3)
            case_texts.append({
                "doc_id": doc_id,
                "title": (full.get("title") or "").replace("<b>", "").replace("</b>", ""),
                "court": full.get("docsource"),
                "date": full.get("publishdate"),
                "citation": full.get("citation"),
                "text": (full.get("doc") or "")[:5000],  # First 5000 chars
                "cites": full.get("cites", [])[:5],
                "cited_by": full.get("citedby", [])[:5],
            })
        except search_service.IndianKanoonError:
            continue

    await job_service.update_job_status(job_id, "processing", progress=75)

    # Step 3: AI analysis
    analysis = await _analyze_research(query, case_texts)

    return {
        "query": query,
        "cases_analyzed": len(case_texts),
        "cases": case_texts,
        "analysis": analysis,
    }


async def _analyze_research(query: str, cases: list[dict]) -> dict:
    """Deep AI analysis of fetched case texts."""
    from app.core import settings

    if not settings.gemini_api_key:
        return {"memo": "AI analysis not available (no GEMINI_API_KEY)"}

    from app.services.document_service import _get_genai_client, _strip_json_fences
    import json

    client = _get_genai_client()

    cases_text = ""
    for c in cases[:5]:
        cases_text += f"\n\n### {c['title']} ({c.get('court', '')}, {c.get('date', '')})\n"
        cases_text += f"Citation: {c.get('citation', 'N/A')}\n"
        cases_text += c.get("text", "")[:3000]

    prompt = f"""You are a senior Indian legal researcher. Based on the following cases, prepare a research analysis for the query: "{query}"

{cases_text}

Provide a JSON response:
{{
  "memo": "A detailed legal research memo (3-5 paragraphs) analyzing the legal position, citing the cases",
  "key_holdings": ["list of key holdings from the cases"],
  "applicable_statutes": ["list of relevant Indian statutes/sections referenced"],
  "conclusion": "Brief conclusion on the current legal position",
  "strength_assessment": "How strong is the legal position based on available precedents (strong/moderate/weak/unclear)"
}}

Respond ONLY with valid JSON, no markdown fences."""

    try:
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
        )
        raw = _strip_json_fences(response.text)
        return json.loads(raw)
    except Exception as e:
        logger.warning(f"[Handler] Research analysis failed: {e}")
        return {"memo": f"AI analysis failed: {e}"}
