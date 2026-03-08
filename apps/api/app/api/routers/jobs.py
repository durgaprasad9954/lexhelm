"""Async job endpoints — submit long-running tasks, poll for results."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.rate_limit import RateLimit
from app.db.session import async_session_factory
from app.schemas.job import JobListResponse, JobResponse, JobSubmitRequest
from app.services import job_service

router = APIRouter()

ALLOWED_JOB_TYPES = {"deep_search", "research"}

_submit_limit = RateLimit(max_requests=10, window_seconds=3600, key_prefix="job_submit")


@router.post("/submit", response_model=JobResponse, status_code=202, dependencies=[Depends(_submit_limit)])
async def submit_job(req: JobSubmitRequest):
    """Submit a long-running job. Returns immediately with a job ID to poll."""
    if req.job_type not in ALLOWED_JOB_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown job type: {req.job_type}. Allowed: {', '.join(sorted(ALLOWED_JOB_TYPES))}",
        )

    # Validate required params per job type
    if req.job_type in ("deep_search", "research") and "query" not in req.params:
        raise HTTPException(status_code=400, detail="Missing required param: query")

    async with async_session_factory() as session:
        job = await job_service.create_job(
            session=session,
            job_type=req.job_type,
            input_params=req.params,
        )
        return JobResponse.model_validate(job)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    """Poll job status and results."""
    async with async_session_factory() as session:
        job = await job_service.get_job(session, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return JobResponse.model_validate(job)


@router.get("", response_model=JobListResponse)
async def list_jobs(
    status: str | None = Query(None, description="Filter by status: pending, processing, completed, failed"),
    limit: int = Query(20, ge=1, le=100),
):
    """List recent jobs."""
    async with async_session_factory() as session:
        jobs = await job_service.list_jobs(session, status=status, limit=limit)
        return JobListResponse(jobs=[JobResponse.model_validate(j) for j in jobs])
