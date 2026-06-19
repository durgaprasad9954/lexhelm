"""Consultation request endpoints."""
from __future__ import annotations

import uuid
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import RequestContext, get_db_session, get_request_context, get_request_context_optional
from app.core.config import settings

from app.models.consultation import ConsultationRequest
from app.schemas.consultation import (
    ConsultationRequestCreate,
    ConsultationRequestList,
    ConsultationRequestResponse,
    ConsultationStatusUpdate,
)
from app.services.email_service import send_consultation_notification
from app.services.whatsapp_service import send_consultation_whatsapp_notification

router = APIRouter()
logger = logging.getLogger(__name__)

# Admin emails for notifications
ADMIN_EMAILS = ["vikas@navyaai.com", "marketing@navyaai.com"]


@router.post("/submit", response_model=ConsultationRequestResponse)
async def submit_consultation(
    payload: ConsultationRequestCreate,
    db: AsyncSession = Depends(get_db_session),
    context: Optional[RequestContext] = Depends(get_request_context_optional),
) -> ConsultationRequest:
    """Submit a new consultation request.
    
    - Public endpoint (no auth required)
    - If user is logged in, their user_id is captured
    - Sends email notification to admins
    """
    # Create the consultation request
    consultation = ConsultationRequest(
        id=uuid.uuid4(),
        name=payload.name,
        email=payload.email.lower(),
        phone=payload.phone,
        consultation_type=payload.consultation_type,
        urgency=payload.urgency,
        subject=payload.subject,
        description=payload.description,
        status="pending",
        user_id=context.user_id if context and context.user_id else None,
    )

    db.add(consultation)
    await db.commit()
    await db.refresh(consultation)

    # Send notification to admins (in background)
    send_consultation_notification(
        name=consultation.name,
        email=consultation.email,
        phone=consultation.phone,
        consultation_type=consultation.consultation_type,
        urgency=consultation.urgency,
        subject=consultation.subject,
        description=consultation.description,
        user_id=consultation.user_id,
    )

    # Send WhatsApp notification to admin
    whatsapp_sent = send_consultation_whatsapp_notification(
        name=consultation.name,
        email=consultation.email,
        phone=consultation.phone,
        consultation_type=consultation.consultation_type,
        urgency=consultation.urgency,
        subject=consultation.subject,
        description=consultation.description,
    )
    if not whatsapp_sent:
        logger.warning(
            "Consultation %s was saved, but WhatsApp notification was not delivered.",
            consultation.id,
        )

    return consultation


@router.get("/list", response_model=ConsultationRequestList)
async def list_consultations(
    status: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
    context=Depends(get_request_context),
) -> dict:
    """List consultation requests (admin only).
    
    Query params:
    - status: Filter by status (pending, assigned, in_progress, completed, cancelled)
    - urgency: Filter by urgency (low, medium, high, urgent)
    - limit: Number of results to return (default 50, max 100)
    - offset: Number of results to skip (default 0)
    """
    # Check if user is admin
    if context.email.lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Build query
    query = select(ConsultationRequest)
    
    if status:
        query = query.where(ConsultationRequest.status == status)
    if urgency:
        query = query.where(ConsultationRequest.urgency == urgency)
    
    # Get total count
    count_query = select(func.count()).select_from(ConsultationRequest)
    if status:
        count_query = count_query.where(ConsultationRequest.status == status)
    if urgency:
        count_query = count_query.where(ConsultationRequest.urgency == urgency)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get paginated results
    query = query.order_by(desc(ConsultationRequest.created_at))
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    requests = result.scalars().all()
    
    return {
        "requests": [ConsultationRequestResponse.model_validate(r) for r in requests],
        "total": total,
    }


@router.get("/my-requests", response_model=ConsultationRequestList)
async def my_consultations(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
    context=Depends(get_request_context),
) -> dict:
    """List consultation requests for the current logged-in user."""
    if not context.user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Build query
    query = select(ConsultationRequest).where(
        ConsultationRequest.user_id == context.user_id
    )
    
    # Get total count
    count_query = select(func.count()).select_from(ConsultationRequest).where(
        ConsultationRequest.user_id == context.user_id
    )
    
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get paginated results
    query = query.order_by(desc(ConsultationRequest.created_at))
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    requests = result.scalars().all()
    
    return {
        "requests": [ConsultationRequestResponse.model_validate(r) for r in requests],
        "total": total,
    }


@router.get("/{consultation_id}", response_model=ConsultationRequestResponse)
async def get_consultation(
    consultation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    context=Depends(get_request_context),
) -> ConsultationRequest:
    """Get a specific consultation request by ID."""
    result = await db.execute(
        select(ConsultationRequest).where(ConsultationRequest.id == consultation_id)
    )
    consultation = result.scalar_one_or_none()
    
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation request not found")
    
    # Check permissions - admin or owner
    is_admin = context.email.lower() in ADMIN_EMAILS
    is_owner = consultation.user_id == context.user_id
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return consultation


@router.patch("/{consultation_id}/status", response_model=ConsultationRequestResponse)
async def update_consultation_status(
    consultation_id: uuid.UUID,
    update: ConsultationStatusUpdate,
    db: AsyncSession = Depends(get_db_session),
    context=Depends(get_request_context),
) -> ConsultationRequest:
    """Update consultation status (admin only)."""
    # Check if user is admin
    if context.email.lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.execute(
        select(ConsultationRequest).where(ConsultationRequest.id == consultation_id)
    )
    consultation = result.scalar_one_or_none()
    
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation request not found")
    
    # Update fields
    consultation.status = update.status
    if update.notes:
        consultation.notes = update.notes
    if update.assigned_to:
        consultation.assigned_to = update.assigned_to
        consultation.assigned_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(consultation)
    
    return consultation
