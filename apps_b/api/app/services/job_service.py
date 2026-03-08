"""Job service — create, track, and execute async jobs.

Two modes:
1. Queue mode (AMQP configured): publish to LavinMQ, worker consumes
2. In-process mode (no AMQP): run in background asyncio task
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.models.jobs import Job
from app.services import queue_service

logger = logging.getLogger(__name__)


async def create_job(
    session: AsyncSession,
    job_type: str,
    input_params: dict,
    org_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> Job:
    """Create a new job record and dispatch it."""
    job = Job(
        job_type=job_type,
        input_params=input_params,
        org_id=org_id,
        user_id=user_id,
        status="pending",
        progress=0,
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)

    # Publish to queue — worker container picks it up
    queue_name = _queue_for_type(job_type)
    published = await queue_service.publish(queue_name, {
        "job_id": job.id,
        "job_type": job_type,
        "input_params": input_params,
    })

    if not published:
        # AMQP unavailable — fall back to in-process execution
        logger.warning(f"[Jobs] AMQP unavailable, running job {job.id} in-process")
        asyncio.create_task(_run_in_process(job.id, job_type, input_params))

    return job


async def get_job(session: AsyncSession, job_id: str) -> Optional[Job]:
    result = await session.execute(select(Job).where(Job.id == job_id))
    return result.scalar_one_or_none()


async def list_jobs(
    session: AsyncSession,
    org_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 20,
) -> list[Job]:
    q = select(Job).order_by(Job.created_at.desc()).limit(limit)
    if org_id:
        q = q.where(Job.org_id == org_id)
    if status:
        q = q.where(Job.status == status)
    result = await session.execute(q)
    return list(result.scalars().all())


async def update_job_status(
    job_id: str,
    status: str,
    progress: int = 0,
    result: Optional[dict] = None,
    error: Optional[str] = None,
) -> None:
    """Update job status (used by workers)."""
    async with async_session_factory() as session:
        values: dict[str, Any] = {"status": status, "progress": progress}
        if status == "processing":
            values["started_at"] = datetime.now(timezone.utc)
        if status in ("completed", "failed"):
            values["completed_at"] = datetime.now(timezone.utc)
        if result is not None:
            values["result"] = result
        if error is not None:
            values["error"] = error

        await session.execute(
            update(Job).where(Job.id == job_id).values(**values)
        )
        await session.commit()


def _queue_for_type(job_type: str) -> str:
    if job_type in ("deep_search", "research"):
        return queue_service.RESEARCH_QUEUE
    return queue_service.DOCUMENT_QUEUE


async def _run_in_process(job_id: str, job_type: str, input_params: dict) -> None:
    """Fallback: run the job handler directly when no AMQP is available."""
    from app.services.job_handlers import handle_job
    try:
        await handle_job({"job_id": job_id, "job_type": job_type, "input_params": input_params})
    except Exception:
        logger.exception(f"[Jobs] In-process job {job_id} failed")
