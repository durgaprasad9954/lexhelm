"""X-API-TOKEN authentication middleware."""
from __future__ import annotations

import os
from typing import Optional, Sequence, Set

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

try:
    from google.cloud import secretmanager  # type: ignore
except Exception:
    secretmanager = None  # type: ignore

ADMIN_TOKEN_ENV_VAR = "X_API_TOKEN"
ADMIN_TOKEN_SECRET_RESOURCE_ENV = "X_API_TOKEN_SECRET_RESOURCE"
DEFAULT_SECRET_RESOURCE = "projects/302103822364/secrets/lawbot-api-token"


def _load_admin_token_from_secret_manager(resource_name: str) -> Optional[str]:
    if secretmanager is None:
        return None
    try:
        client = secretmanager.SecretManagerServiceClient()
        response = client.access_secret_version(name=f"{resource_name}/versions/latest")
        token = response.payload.data.decode("utf-8").strip()
        return token or None
    except Exception as exc:
        print(f"[Auth] Failed to load admin token from Secret Manager: {exc}")
        return None


def resolve_admin_token() -> Optional[str]:
    token = os.environ.get(ADMIN_TOKEN_ENV_VAR, "").strip()
    if token:
        return token
    secret_resource = os.environ.get(ADMIN_TOKEN_SECRET_RESOURCE_ENV, DEFAULT_SECRET_RESOURCE).strip()
    if not secret_resource:
        return None
    return _load_admin_token_from_secret_manager(secret_resource)


class TokenAuthMiddleware(BaseHTTPMiddleware):
    """Protects endpoints behind the X-API-TOKEN header."""

    def __init__(self, app, exempt_paths: Sequence[str] | None = None):
        super().__init__(app)
        self.exempt_paths: Set[str] = set(exempt_paths or ())
        self.exempt_paths.update({
            "/docs", "/docs/", "/openapi.json", "/openapi.yaml",
            "/healthz", "/healthz/",
        })

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path in self.exempt_paths or request.method == "OPTIONS":
            return await call_next(request)

        expected_token = getattr(request.app.state, "admin_api_token", None)
        if not expected_token:
            return JSONResponse(status_code=503, content={"detail": "API token not configured"})

        provided = request.headers.get("X-API-TOKEN") or request.headers.get("X-Api-Token")
        if not provided or provided != expected_token:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or missing API token."},
                headers={"WWW-Authenticate": "Bearer"},
            )

        return await call_next(request)
