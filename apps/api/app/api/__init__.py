"""API router wiring."""
from fastapi import APIRouter

from app.api.routers import artifacts, beta, doc_chat, draft_chat, documents, health, jobs, matters, notes, orgs, reminders, search

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(orgs.router, prefix="/orgs", tags=["orgs"])
api_router.include_router(matters.router, prefix="/matters", tags=["matters"])
api_router.include_router(notes.router, tags=["notes"])
api_router.include_router(artifacts.router, tags=["artifacts"])
api_router.include_router(reminders.router, tags=["reminders"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(doc_chat.router, prefix="/doc-chat", tags=["doc-chat"])
api_router.include_router(draft_chat.router, prefix="/draft-chat", tags=["draft-chat"])
api_router.include_router(beta.router, prefix="/beta", tags=["beta"])

__all__ = ["api_router"]
