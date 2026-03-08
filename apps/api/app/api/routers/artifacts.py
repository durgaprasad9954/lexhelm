from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import RequestContext, get_request_context, get_rls_session
from app.core import settings
from app.models.artifacts import Artifact
from app.models.matters import Matter
from app.schemas.artifact import (
    ArtifactCommitRequest, ArtifactDownloadResponse, ArtifactInitRequest,
    ArtifactOut, ArtifactUploadInitResponse,
)
from app.services import (
    build_artifact_object_key, delete_object, fetch_blob_metadata,
    generate_signed_download_url, generate_signed_upload_url,
)

router = APIRouter()


async def _ensure_matter(session: AsyncSession, context: RequestContext, matter_id: uuid.UUID) -> None:
    if not await session.scalar(select(Matter.id).where(Matter.id == matter_id, Matter.org_id == context.org_id)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matter not found.")


async def _load_artifact(session: AsyncSession, context: RequestContext, artifact_id: uuid.UUID) -> Artifact:
    artifact = await session.scalar(select(Artifact).where(Artifact.id == artifact_id, Artifact.org_id == context.org_id))
    if not artifact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found.")
    return artifact


@router.post("/artifacts/init-upload", response_model=ArtifactUploadInitResponse, status_code=status.HTTP_201_CREATED)
async def init_upload(
    payload: ArtifactInitRequest,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
) -> ArtifactUploadInitResponse:
    await _ensure_matter(session, context, payload.matter_id)
    artifact_id = uuid.uuid4()
    object_key = build_artifact_object_key(
        org_id=str(context.org_id), matter_id=str(payload.matter_id),
        artifact_id=str(artifact_id), file_name=payload.file_name,
    )
    artifact = Artifact(
        id=artifact_id, org_id=context.org_id, matter_id=payload.matter_id,
        file_name=payload.file_name, content_type=payload.content_type, byte_size=payload.byte_size,
        gcs_bucket=settings.gcs_artifacts_bucket, gcs_object_key=object_key,
        created_by=context.user_id, tags=[],
    )
    session.add(artifact)
    await session.flush()
    upload_url = await generate_signed_upload_url(object_key, payload.content_type)
    await session.commit()
    await session.refresh(artifact)
    return ArtifactUploadInitResponse(
        artifact=artifact, upload_url=upload_url,
        upload_headers={"Content-Type": payload.content_type or "application/octet-stream"},
    )


@router.post("/artifacts/{artifact_id}/commit", response_model=ArtifactOut)
async def commit_upload(
    artifact_id: uuid.UUID, payload: ArtifactCommitRequest,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
) -> Artifact:
    artifact = await _load_artifact(session, context, artifact_id)
    try:
        metadata = await fetch_blob_metadata(artifact.gcs_object_key)
    except FileNotFoundError:
        raise HTTPException(status_code=400, detail="Artifact object not found in storage.")
    expected_size = payload.byte_size or artifact.byte_size
    if expected_size is not None and metadata.size is not None and metadata.size != expected_size:
        raise HTTPException(status_code=400, detail="Uploaded object size mismatch.")
    artifact.byte_size = metadata.size or payload.byte_size or artifact.byte_size
    artifact.content_type = payload.content_type or artifact.content_type or metadata.content_type
    artifact.sha256 = payload.sha256 or artifact.sha256
    await session.commit()
    await session.refresh(artifact)
    return artifact


@router.get("/matters/{matter_id}/artifacts", response_model=list[ArtifactOut])
async def list_matter_artifacts(
    matter_id: uuid.UUID,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
) -> list[Artifact]:
    await _ensure_matter(session, context, matter_id)
    stmt = select(Artifact).where(Artifact.matter_id == matter_id, Artifact.org_id == context.org_id).order_by(Artifact.created_at.desc())
    return list((await session.scalars(stmt)).all())


@router.get("/artifacts/{artifact_id}", response_model=ArtifactOut)
async def get_artifact(
    artifact_id: uuid.UUID,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
) -> Artifact:
    return await _load_artifact(session, context, artifact_id)


@router.get("/artifacts/{artifact_id}/download", response_model=ArtifactDownloadResponse)
async def get_download_url(
    artifact_id: uuid.UUID,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
) -> ArtifactDownloadResponse:
    artifact = await _load_artifact(session, context, artifact_id)
    download_url = await generate_signed_download_url(artifact.gcs_object_key)
    return ArtifactDownloadResponse(artifact_id=artifact.id, download_url=download_url, expires_in_seconds=settings.gcs_signed_url_ttl_seconds)


@router.delete("/artifacts/{artifact_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_artifact(
    artifact_id: uuid.UUID,
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
) -> Response:
    artifact = await _load_artifact(session, context, artifact_id)
    await delete_object(artifact.gcs_object_key)
    await session.delete(artifact)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
