"""Document chat endpoints — upload, analyze, and chat with legal documents."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from app.core.jwt_auth import JWTPayload, get_jwt_payload_optional
from app.db.session import async_session_factory
from app.schemas.doc_chat import (
    ChatRequest, ChatResponse, DocMessageResponse,
    DocSessionDetailResponse, DocSessionListResponse, DocSessionResponse,
)
from app.services import doc_chat_service

router = APIRouter()

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload", response_model=DocSessionResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(..., description="PDF, DOCX, or TXT document"),
    jwt: Optional[JWTPayload] = Depends(get_jwt_payload_optional),
):
    """Upload a document for analysis and chat. Returns a session ID."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_UPLOAD_SIZE // (1024*1024)} MB")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    async with async_session_factory() as session:
        doc_session = await doc_chat_service.create_session(
            session=session,
            file_name=file.filename,
            content=content,
            content_type=file.content_type or "application/octet-stream",
            org_id=jwt.org_id if jwt else None,
            user_id=jwt.user_id if jwt else None,
        )
        return DocSessionResponse(
            id=doc_session.id,
            file_name=doc_session.file_name,
            content_type=doc_session.content_type,
            byte_size=doc_session.byte_size,
            status=doc_session.status,
            analysis=doc_session.analysis,
            error=doc_session.error,
            message_count=0,
            created_at=doc_session.created_at,
        )


@router.get("/{session_id}", response_model=DocSessionDetailResponse)
async def get_session(session_id: str):
    """Get document session with analysis and chat history."""
    async with async_session_factory() as session:
        doc_session = await doc_chat_service.get_session(session, session_id)
        if not doc_session:
            raise HTTPException(status_code=404, detail="Session not found")

        return DocSessionDetailResponse(
            id=doc_session.id,
            file_name=doc_session.file_name,
            content_type=doc_session.content_type,
            byte_size=doc_session.byte_size,
            status=doc_session.status,
            analysis=doc_session.analysis,
            error=doc_session.error,
            message_count=len(doc_session.messages),
            created_at=doc_session.created_at,
            messages=[
                DocMessageResponse(
                    id=m.id, role=m.role, content=m.content, created_at=m.created_at,
                )
                for m in doc_session.messages
            ],
        )


@router.post("/{session_id}/chat", response_model=ChatResponse)
async def chat_with_document(session_id: str, req: ChatRequest):
    """Ask a question about the uploaded document."""
    async with async_session_factory() as session:
        doc_session = await doc_chat_service.get_session(session, session_id)
        if not doc_session:
            raise HTTPException(status_code=404, detail="Session not found")
        if doc_session.status == "processing":
            raise HTTPException(status_code=409, detail="Document is still being analyzed. Try again shortly.")
        if doc_session.status == "failed":
            raise HTTPException(status_code=422, detail=f"Document processing failed: {doc_session.error}")

        reply = await doc_chat_service.chat(session, doc_session, req.message)

        return ChatResponse(
            session_id=session_id,
            user_message=req.message,
            assistant_message=reply,
        )


@router.get("", response_model=DocSessionListResponse)
async def list_sessions(
    limit: int = Query(20, ge=1, le=100),
    jwt: Optional[JWTPayload] = Depends(get_jwt_payload_optional),
):
    """List recent document chat sessions."""
    async with async_session_factory() as session:
        sessions = await doc_chat_service.list_sessions(
            session, limit=limit,
            org_id=jwt.org_id if jwt else None,
            user_id=jwt.user_id if jwt else None,
        )
        return DocSessionListResponse(
            sessions=[
                DocSessionResponse(
                    id=s.id,
                    file_name=s.file_name,
                    content_type=s.content_type,
                    byte_size=s.byte_size,
                    status=s.status,
                    analysis=None,
                    error=s.error,
                    message_count=0,
                    created_at=s.created_at,
                )
                for s in sessions
            ]
        )
