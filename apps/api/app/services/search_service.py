"""IndianKanoon search service — extracted from LawBot IKTool.py, made async."""
from __future__ import annotations

import asyncio
import base64
import http.client
import json
import re
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, Optional
from urllib.parse import quote_plus

from app.core import settings


class IndianKanoonError(Exception):
    pass


class AuthenticationError(IndianKanoonError):
    pass


class NotFoundError(IndianKanoonError):
    pass


class RateLimitError(IndianKanoonError):
    pass


class APIError(IndianKanoonError):
    pass


@dataclass
class OriginalDocument:
    data: bytes
    content_type: str
    extension: str


def _extension_from_mime(mime_type: Optional[str]) -> str:
    if not mime_type:
        return "bin"
    for pattern, ext in [
        (r"^text/html", "html"), (r"^application/pdf", "pdf"),
        (r"^text/plain", "txt"), (r"^image/png", "png"),
    ]:
        if re.match(pattern, mime_type):
            return ext
    return "bin"


class _SearchCache:
    """Simple TTL cache for search results."""

    def __init__(self, max_size: int = 256, ttl: int = 3600):
        self._cache: Dict[str, tuple[float, Any]] = {}
        self._max_size = max_size
        self._ttl = ttl

    def get(self, key: str) -> Optional[Any]:
        entry = self._cache.get(key)
        if entry is None:
            return None
        ts, val = entry
        if time.time() - ts > self._ttl:
            del self._cache[key]
            return None
        return val

    def set(self, key: str, value: Any) -> None:
        if len(self._cache) >= self._max_size:
            oldest = min(self._cache, key=lambda k: self._cache[k][0])
            del self._cache[oldest]
        self._cache[key] = (time.time(), value)


_cache = _SearchCache(
    max_size=settings.search_cache_max_size,
    ttl=settings.search_cache_ttl,
)


class IndianKanoonClient:
    """Typed wrapper around api.indiankanoon.org endpoints."""

    def __init__(self, token: Optional[str] = None, *, host: str = "api.indiankanoon.org", timeout: Optional[int] = None):
        self.token: str = token or (settings.ik_api_key or "")
        if not self.token:
            raise AuthenticationError("IK_API_KEY not configured.")
        self.host = host
        self.timeout = timeout or settings.ik_request_timeout_seconds

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Token {self.token}", "Accept": "application/json"}

    def _post(self, path: str) -> str:
        try:
            conn = http.client.HTTPSConnection(self.host, timeout=self.timeout)
            conn.request("POST", path, headers=self._headers())
            resp = conn.getresponse()
            body = resp.read().decode("utf-8", errors="replace")
        except Exception as exc:
            raise ConnectionError(str(exc)) from exc
        finally:
            try:
                conn.close()
            except Exception:
                pass

        if resp.status == 401:
            raise AuthenticationError("Unauthorized")
        if resp.status == 404:
            raise NotFoundError("Not found")
        if resp.status == 429:
            raise RateLimitError("Rate limit exceeded")
        if resp.status >= 500:
            raise APIError(f"Server error ({resp.status})")
        if resp.status < 200 or resp.status >= 300:
            raise APIError(f"Unexpected status {resp.status}")
        return body

    def _json(self, path: str) -> Dict[str, Any]:
        text = self._post(path)
        try:
            data = json.loads(text)
        except Exception as exc:
            raise APIError("Invalid JSON response") from exc
        if isinstance(data, dict) and data.get("errmsg"):
            raise APIError(str(data["errmsg"]))
        return data

    def search(
        self, query: str, *, page: int = 0, max_pages: int = 1,
        from_date: Optional[str] = None, to_date: Optional[str] = None,
        sort_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        parts = [query.strip()]
        if from_date:
            parts.append(f"fromdate: {from_date}")
        if to_date:
            parts.append(f"todate: {to_date}")
        if sort_by:
            parts.append(f"sortby: {sort_by}")
        form_input = " ".join(parts)
        q = quote_plus(form_input.encode("utf-8"))
        return self._json(f"/search/?formInput={q}&pagenum={page}&maxpages={max_pages}")

    def get_doc(self, doc_id: int, *, cites_limit: int = 0, cited_by_limit: int = 0) -> Dict[str, Any]:
        args = []
        if cites_limit > 0:
            args.append(f"maxcites={cites_limit}")
        if cited_by_limit > 0:
            args.append(f"maxcitedby={cited_by_limit}")
        qs = ("?" + "&".join(args)) if args else ""
        return self._json(f"/doc/{int(doc_id)}/{qs}")

    def get_doc_meta(self, doc_id: int, *, cites_limit: int = 0, cited_by_limit: int = 0) -> Dict[str, Any]:
        args = []
        if cites_limit:
            args.append(f"maxcites={cites_limit}")
        if cited_by_limit:
            args.append(f"maxcitedby={cited_by_limit}")
        qs = ("?" + "&".join(args)) if args else ""
        return self._json(f"/docmeta/{int(doc_id)}/{qs}")

    def get_doc_fragment(self, doc_id: int, query: str) -> Dict[str, Any]:
        q = quote_plus(query.encode("utf-8"))
        return self._json(f"/docfragment/{int(doc_id)}/?formInput={q}")


# ── Async wrappers ──────────────────────────────────────────────

@lru_cache
def _client() -> IndianKanoonClient:
    return IndianKanoonClient()


async def search_cases(
    query: str, *, page: int = 0, max_pages: int = 1,
    from_date: Optional[str] = None, to_date: Optional[str] = None,
    sort_by: Optional[str] = None,
) -> Dict[str, Any]:
    cache_key = f"search:{query}:{page}:{max_pages}:{from_date}:{to_date}:{sort_by}"
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached
    result = await asyncio.to_thread(
        _client().search, query, page=page, max_pages=max_pages,
        from_date=from_date, to_date=to_date, sort_by=sort_by,
    )
    _cache.set(cache_key, result)
    return result


async def get_case(doc_id: int, *, cites_limit: int = 0, cited_by_limit: int = 0) -> Dict[str, Any]:
    return await asyncio.to_thread(_client().get_doc, doc_id, cites_limit=cites_limit, cited_by_limit=cited_by_limit)


async def get_case_meta(doc_id: int, *, cites_limit: int = 0, cited_by_limit: int = 0) -> Dict[str, Any]:
    return await asyncio.to_thread(_client().get_doc_meta, doc_id, cites_limit=cites_limit, cited_by_limit=cited_by_limit)


async def get_case_fragment(doc_id: int, query: str) -> Dict[str, Any]:
    return await asyncio.to_thread(_client().get_doc_fragment, doc_id, query)
