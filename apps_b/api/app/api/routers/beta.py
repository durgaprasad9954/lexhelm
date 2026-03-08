"""Beta access request and admin metrics endpoints."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import RequestContext, get_db_session, get_request_context
from app.models.beta import BetaRequest, MetricEvent
from app.models.orgs import User
from app.schemas.beta import (
    BetaRequestCreate,
    BetaRequestOut,
    BetaRequestReview,
    BetaStatusCheck,
    MetricEventCreate,
    MetricsSummary,
)
from app.services.email_service import send_beta_approved_email, send_beta_signup_notification

router = APIRouter()

ADMIN_EMAILS = {
    "vikas@navyaai.com",
    "anand@navyaai.com",
    "marketing@navyaai.com",
}


def _require_admin(context: RequestContext) -> None:
    if context.email.lower() not in ADMIN_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )


# ── Public endpoints ─────────────────────────────────────────

@router.post("/request", response_model=BetaRequestOut, status_code=status.HTTP_201_CREATED)
async def submit_beta_request(
    payload: BetaRequestCreate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db_session),
) -> BetaRequest:
    """Submit a beta access request (public, no auth required)."""
    # Check for existing request with same email
    existing = await session.scalar(
        select(BetaRequest).where(
            func.lower(BetaRequest.email) == payload.email.lower(),
        ),
    )
    if existing:
        # Update existing request instead of creating duplicate
        existing.name = payload.name or existing.name
        existing.company = payload.company or existing.company
        existing.use_case = payload.use_case or existing.use_case
        existing.referrer = payload.referrer or existing.referrer
        await session.flush()
        await session.refresh(existing)
        await session.commit()
        return existing

    req = BetaRequest(
        email=payload.email.lower(),
        name=payload.name,
        company=payload.company,
        use_case=payload.use_case,
        referrer=payload.referrer,
    )
    session.add(req)

    # Also log as metric event
    session.add(MetricEvent(
        event_type="beta_request",
        email=payload.email.lower(),
        metadata_={"referrer": payload.referrer, "company": payload.company},
    ))

    await session.flush()
    await session.refresh(req)
    await session.commit()

    # Send email notification to admins (in background)
    background_tasks.add_task(
        send_beta_signup_notification,
        email=req.email,
        name=payload.name,
        company=payload.company,
        use_case=payload.use_case,
        referrer=payload.referrer,
    )

    return req


@router.get("/status", response_model=BetaStatusCheck)
async def check_beta_status(
    email: str = Query(...),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    """Check beta access status by email (public)."""
    req = await session.scalar(
        select(BetaRequest).where(
            func.lower(BetaRequest.email) == email.lower(),
        ),
    )
    if not req:
        return {"email": email.lower(), "status": "not_found"}
    return {"email": req.email, "status": req.status}


@router.post("/track", status_code=status.HTTP_204_NO_CONTENT)
async def track_event(
    payload: MetricEventCreate,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Track a metric event (public, lightweight)."""
    session.add(MetricEvent(
        event_type=payload.event_type,
        metadata_=payload.metadata,
    ))
    await session.commit()


# ── Admin endpoints ──────────────────────────────────────────

@router.get("/admin/requests", response_model=list[BetaRequestOut])
async def list_beta_requests(
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_db_session),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[BetaRequest]:
    """List all beta requests (admin only)."""
    _require_admin(context)
    stmt = select(BetaRequest).order_by(BetaRequest.created_at.desc())
    if status_filter:
        stmt = stmt.where(BetaRequest.status == status_filter)
    stmt = stmt.offset(offset).limit(limit)
    return list((await session.scalars(stmt)).all())


@router.patch("/admin/requests/{request_id}", response_model=BetaRequestOut)
async def review_beta_request(
    request_id: str,
    payload: BetaRequestReview,
    background_tasks: BackgroundTasks,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_db_session),
) -> BetaRequest:
    """Approve or reject a beta request (admin only)."""
    _require_admin(context)
    req = await session.get(BetaRequest, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    req.status = payload.status
    req.reviewed_by = context.email
    req.reviewed_at = datetime.now(timezone.utc)
    await session.flush()
    await session.refresh(req)
    await session.commit()

    # Log review event
    session.add(MetricEvent(
        event_type=f"beta_{payload.status}",
        email=req.email,
        user_id=context.user_id,
        metadata_={"request_id": str(request_id)},
    ))
    await session.commit()

    # Send approval email to user (in background)
    if payload.status == "approved":
        background_tasks.add_task(
            send_beta_approved_email,
            email=req.email,
            name=req.name,
        )

    return req


@router.get("/admin/metrics", response_model=MetricsSummary)
async def get_metrics(
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    """Get summary metrics (admin only)."""
    _require_admin(context)

    total_users = await session.scalar(select(func.count()).select_from(User)) or 0
    total_beta = await session.scalar(select(func.count()).select_from(BetaRequest)) or 0
    pending = await session.scalar(
        select(func.count()).select_from(BetaRequest).where(BetaRequest.status == "pending"),
    ) or 0
    approved = await session.scalar(
        select(func.count()).select_from(BetaRequest).where(BetaRequest.status == "approved"),
    ) or 0
    rejected = await session.scalar(
        select(func.count()).select_from(BetaRequest).where(BetaRequest.status == "rejected"),
    ) or 0
    total_events = await session.scalar(select(func.count()).select_from(MetricEvent)) or 0

    recent = list(
        (await session.scalars(
            select(BetaRequest).order_by(BetaRequest.created_at.desc()).limit(10),
        )).all(),
    )

    return {
        "total_users": total_users,
        "total_beta_requests": total_beta,
        "pending_requests": pending,
        "approved_requests": approved,
        "rejected_requests": rejected,
        "total_api_requests": total_events,
        "recent_signups": recent,
    }
