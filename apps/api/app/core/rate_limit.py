"""In-memory per-user rate limiting via sliding window.

Usage in routers:
    from app.core.rate_limit import RateLimit

    @router.post("/upload", dependencies=[Depends(RateLimit(max_requests=10, window_seconds=3600))])
    async def upload(...): ...

Or as a parameter dependency to get the user_id:
    @router.post("/chat")
    async def chat(..., _=Depends(RateLimit(30, 60))): ...

Identifies users by JWT user_id (falls back to IP for unauthenticated requests).
"""
from __future__ import annotations

import time
import threading
from collections import defaultdict, deque
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.jwt_auth import JWTPayload, get_jwt_payload_optional

# Global store: key -> deque of timestamps
_buckets: dict[str, deque[float]] = defaultdict(deque)
_lock = threading.Lock()

# Cleanup old entries every N calls to prevent unbounded growth
_call_counter = 0
_CLEANUP_INTERVAL = 500  # every 500 rate-limit checks
_MAX_WINDOW = 3600  # max window we ever use (1 hour)


def _cleanup() -> None:
    """Remove entries older than _MAX_WINDOW across all buckets."""
    cutoff = time.monotonic() - _MAX_WINDOW
    keys_to_delete = []
    for key, dq in _buckets.items():
        while dq and dq[0] < cutoff:
            dq.popleft()
        if not dq:
            keys_to_delete.append(key)
    for key in keys_to_delete:
        del _buckets[key]


class RateLimit:
    """FastAPI dependency that enforces per-user rate limits.

    Args:
        max_requests: Maximum number of requests allowed in the window.
        window_seconds: Sliding window duration in seconds.
        key_prefix: Optional prefix to namespace the rate limit bucket.
                    Allows the same user to have separate limits for
                    different endpoint groups.
    """

    def __init__(self, max_requests: int, window_seconds: int, key_prefix: str = ""):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.key_prefix = key_prefix

    async def __call__(
        self,
        request: Request,
        jwt: Optional[JWTPayload] = Depends(get_jwt_payload_optional),
    ) -> None:
        global _call_counter

        # Identify user: JWT user_id > client IP
        if jwt and jwt.user_id:
            identity = f"user:{jwt.user_id}"
        else:
            identity = f"ip:{request.client.host}" if request.client else "ip:unknown"

        bucket_key = f"{self.key_prefix}:{identity}" if self.key_prefix else identity
        now = time.monotonic()
        cutoff = now - self.window_seconds

        with _lock:
            _call_counter += 1
            if _call_counter >= _CLEANUP_INTERVAL:
                _cleanup()
                _call_counter = 0

            dq = _buckets[bucket_key]

            # Evict expired entries for this bucket
            while dq and dq[0] < cutoff:
                dq.popleft()

            if len(dq) >= self.max_requests:
                # Calculate retry-after from oldest entry in window
                retry_after = int(dq[0] - cutoff) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {retry_after}s.",
                    headers={"Retry-After": str(retry_after)},
                )

            dq.append(now)
