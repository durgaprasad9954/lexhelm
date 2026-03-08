"""Draft chat endpoints — conversational document drafting."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.jwt_auth import JWTPayload, get_jwt_payload_optional
from app.core.rate_limit import RateLimit
from app.db.session import async_session_factory
from app.schemas.document import (
    DraftChatListResponse,
    DraftChatMessageInfo,
    DraftChatMessageRequest,
    DraftChatRefineRequest,
    DraftChatResponse,
    DraftChatSessionDetail,
    DraftChatSessionSummary,
    DraftChatStartRequest,
)
from app.services import draft_chat_service

router = APIRouter()

_start_limit = RateLimit(max_requests=20, window_seconds=3600, key_prefix="draft_start")
_msg_limit = RateLimit(max_requests=40, window_seconds=60, key_prefix="draft_msg")
_confirm_limit = RateLimit(max_requests=15, window_seconds=3600, key_prefix="draft_confirm")
_refine_limit = RateLimit(max_requests=30, window_seconds=60, key_prefix="draft_refine")


@router.post("/start", response_model=DraftChatResponse, status_code=201, dependencies=[Depends(_start_limit)])
async def start_draft_chat(
    req: DraftChatStartRequest,
    jwt: Optional[JWTPayload] = Depends(get_jwt_payload_optional),
):
    """Start a new draft chat session with an initial message."""
    async with async_session_factory() as session:
        draft, reply = await draft_chat_service.create_session(
            session, req.message, req.template_id,
            org_id=jwt.org_id if jwt else None,
            user_id=jwt.user_id if jwt else None,
        )
        return DraftChatResponse(
            session_id=draft.id,
            assistant_message=reply,
            phase=draft.phase,
            template_id=draft.template_id,
            collected_fields=draft.collected_fields or {},
            missing_fields=draft.missing_fields or [],
            generated_content=draft.generated_content,
        )


@router.post("/{session_id}/message", response_model=DraftChatResponse, dependencies=[Depends(_msg_limit)])
async def send_message(session_id: str, req: DraftChatMessageRequest):
    """Send a message in an existing draft chat session."""
    async with async_session_factory() as session:
        draft = await draft_chat_service.get_session(session, session_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Session not found")
        if draft.phase == "done":
            raise HTTPException(status_code=409, detail="Document already generated. Start a new session.")

        reply = await draft_chat_service.process_turn(session, draft, req.message)

        return DraftChatResponse(
            session_id=draft.id,
            assistant_message=reply,
            phase=draft.phase,
            template_id=draft.template_id,
            collected_fields=draft.collected_fields or {},
            missing_fields=draft.missing_fields or [],
            generated_content=draft.generated_content,
        )


@router.post("/{session_id}/confirm", response_model=DraftChatResponse, dependencies=[Depends(_confirm_limit)])
async def confirm_draft(session_id: str):
    """Confirm collected fields and generate the document."""
    async with async_session_factory() as session:
        draft = await draft_chat_service.get_session(session, session_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Session not found")
        if draft.phase == "done":
            raise HTTPException(status_code=409, detail="Document already generated.")
        if not draft.template_id:
            raise HTTPException(status_code=422, detail="No template identified yet.")

        reply = await draft_chat_service.confirm_and_generate(session, draft)

        return DraftChatResponse(
            session_id=draft.id,
            assistant_message=reply,
            phase=draft.phase,
            template_id=draft.template_id,
            collected_fields=draft.collected_fields or {},
            missing_fields=draft.missing_fields or [],
            generated_content=draft.generated_content,
        )


@router.post("/{session_id}/refine", response_model=DraftChatResponse, dependencies=[Depends(_refine_limit)])
async def refine_document(session_id: str, req: DraftChatRefineRequest):
    """Refine a generated document with natural language instructions."""
    async with async_session_factory() as session:
        draft = await draft_chat_service.get_session(session, session_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Session not found")
        if draft.phase not in ("done", "refining"):
            raise HTTPException(status_code=409, detail="Document not yet generated.")

        updated_content = await draft_chat_service.process_refinement_turn(
            session, draft, req.message, req.current_document,
        )

        return DraftChatResponse(
            session_id=draft.id,
            assistant_message="I've updated the document based on your instructions.",
            phase=draft.phase,
            template_id=draft.template_id,
            collected_fields=draft.collected_fields or {},
            missing_fields=[],
            generated_content=updated_content,
        )


@router.get("/{session_id}", response_model=DraftChatSessionDetail)
async def get_draft_session(session_id: str):
    """Get draft chat session with messages."""
    async with async_session_factory() as session:
        draft = await draft_chat_service.get_session(session, session_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Session not found")

        return DraftChatSessionDetail(
            session_id=draft.id,
            phase=draft.phase,
            template_id=draft.template_id,
            collected_fields=draft.collected_fields or {},
            missing_fields=draft.missing_fields or [],
            generated_content=draft.generated_content,
            status=draft.status,
            messages=[
                DraftChatMessageInfo(
                    id=m.id,
                    role=m.role,
                    content=m.content,
                    extracted_fields=m.extracted_fields,
                    created_at=m.created_at.isoformat(),
                )
                for m in draft.messages
            ],
            created_at=draft.created_at.isoformat(),
        )


@router.get("", response_model=DraftChatListResponse)
async def list_draft_sessions(
    limit: int = Query(20, ge=1, le=100),
    jwt: Optional[JWTPayload] = Depends(get_jwt_payload_optional),
):
    """List recent draft chat sessions."""
    async with async_session_factory() as session:
        sessions = await draft_chat_service.list_sessions(
            session, limit=limit,
            org_id=jwt.org_id if jwt else None,
            user_id=jwt.user_id if jwt else None,
        )
        return DraftChatListResponse(
            sessions=[
                DraftChatSessionSummary(
                    session_id=s.id,
                    template_id=s.template_id,
                    phase=s.phase,
                    status=s.status,
                    message_count=len(s.messages) if s.messages else 0,
                    created_at=s.created_at.isoformat(),
                )
                for s in sessions
            ]
        )
