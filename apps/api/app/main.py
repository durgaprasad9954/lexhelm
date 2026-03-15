"""LexHelm V2 — Unified FastAPI entry point."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core import settings
from app.core.security import TokenAuthMiddleware, resolve_admin_token
from app.db import async_engine
from app.db.init_db import init_models

tags_metadata = [
    {"name": "health", "description": "Health probes."},
    {"name": "orgs", "description": "Organisation endpoints."},
    {"name": "matters", "description": "Case management."},
    {"name": "notes", "description": "Matter notes."},
    {"name": "artifacts", "description": "File uploads & signed URLs."},
    {"name": "reminders", "description": "Reminder management."},
    {"name": "search", "description": "Legal case search (IndianKanoon)."},
    {"name": "documents", "description": "Contract & agreement drafting."},
    {"name": "jobs", "description": "Async job queue (long-running research)."},
    {"name": "doc-chat", "description": "Upload documents, analyze, and chat with them."},
]

app = FastAPI(
    title=settings.project_name,
    version="2.0.0",
    openapi_tags=tags_metadata,
)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    from fastapi.openapi.utils import get_openapi

    schema = get_openapi(title=settings.project_name, version="2.0.0", routes=app.routes, tags=tags_metadata)
    schema["components"]["securitySchemes"] = {
        "X-API-TOKEN": {
            "type": "apiKey", "in": "header", "name": "X-API-TOKEN",
            "description": "API token for authentication.",
        }
    }
    exempt = {"/healthz", f"{settings.api_prefix}/healthz"}
    methods = {"get", "post", "put", "delete", "patch", "options", "head", "trace"}
    for path, item in schema.get("paths", {}).items():
        if any(path.startswith(e) or path == e for e in exempt):
            continue
        for method, op in item.items():
            if method.lower() in methods and isinstance(op, dict) and "security" not in op:
                op["security"] = [{"X-API-TOKEN": []}]
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi

public_exempt = (
    "/healthz", "/healthz/",
    f"{settings.api_prefix}/healthz", f"{settings.api_prefix}/healthz/",
    f"{settings.api_prefix}/auth/google", f"{settings.api_prefix}/auth/google/",
)
app.add_middleware(TokenAuthMiddleware, exempt_paths=public_exempt)

# CORSMiddleware must be added AFTER TokenAuthMiddleware so it becomes
# the outermost layer and injects CORS headers on ALL responses (including 401s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    token = resolve_admin_token()
    if token:
        app.state.admin_api_token = token
        print("[Auth] Admin API token configured.")
    else:
        app.state.admin_api_token = None
        print("[Auth] WARNING: Admin API token not available.")

    if settings.run_db_migrations_on_startup:
        await init_models(async_engine)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {"message": "LexHelm V2 API", "version": "2.0.0"}


app.include_router(api_router, prefix=settings.api_prefix)
