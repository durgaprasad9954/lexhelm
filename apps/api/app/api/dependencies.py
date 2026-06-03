"""API dependencies for authentication and session management."""
from __future__ import annotations

from dataclasses import dataclass
from typing import AsyncGenerator, Optional

from fastapi import Depends, HTTPException, Header, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import settings
from app.core.jwt_auth import JWTPayload, get_jwt_payload, get_jwt_payload_optional
from app.db import get_db_session
from app.models.orgs import User
from app.services.user_service import UserService
from app.services.org_service import OrgService


@dataclass(frozen=True)
class RequestContext:
    user_id: str
    user: User
    org_id: str
    role: Optional[str] = None
    email: str = ""


async def get_user_service(session: AsyncSession = Depends(get_db_session)) -> UserService:
    return UserService(session)


async def get_org_service(session: AsyncSession = Depends(get_db_session)) -> OrgService:
    return OrgService(session)


async def get_request_context(
    jwt_payload: JWTPayload = Depends(get_jwt_payload),
    session: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service),
    org_service: OrgService = Depends(get_org_service),
) -> RequestContext:
    org_id = jwt_payload.org_id
    if not org_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="JWT token must include org_id claim")

    try:
        await org_service.get_or_create_org(
            org_id=org_id, org_name=jwt_payload.org_name, auto_provision=settings.auto_provision_users,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Organization not found: {e}")

    try:
        user = await user_service.get_or_create_user(
            user_id=jwt_payload.user_id, email=jwt_payload.email,
            full_name=jwt_payload.name or jwt_payload.email, auto_provision=settings.auto_provision_users,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User not found: {e}")

    if settings.auto_provision_users:
        await org_service.ensure_org_membership(
            user_id=user.id, org_id=org_id, role=jwt_payload.role or "ASSOCIATE",
        )
        await session.commit()

    return RequestContext(user_id=user.id, user=user, org_id=org_id, role=jwt_payload.role, email=user.email)


async def get_request_context_optional(
    jwt_payload: Optional[JWTPayload] = Depends(get_jwt_payload_optional),
    session: AsyncSession = Depends(get_db_session),
    user_service: UserService = Depends(get_user_service),
    org_service: OrgService = Depends(get_org_service),
) -> Optional[RequestContext]:
    """Get request context if user is authenticated, otherwise return None."""
    if not jwt_payload:
        return None
    
    org_id = jwt_payload.org_id
    if not org_id:
        return None

    try:
        await org_service.get_or_create_org(
            org_id=org_id, org_name=jwt_payload.org_name or "", auto_provision=settings.auto_provision_users,
        )
    except ValueError:
        return None

    try:
        user = await user_service.get_or_create_user(
            user_id=jwt_payload.user_id, email=jwt_payload.email,
            full_name=jwt_payload.name or jwt_payload.email, auto_provision=settings.auto_provision_users,
        )
    except ValueError:
        return None

    if settings.auto_provision_users:
        await org_service.ensure_org_membership(
            user_id=user.id, org_id=org_id, role=jwt_payload.role or "ASSOCIATE",
        )
        await session.commit()

    return RequestContext(user_id=user.id, user=user, org_id=org_id, role=jwt_payload.role, email=user.email)


async def get_rls_session(
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_db_session),
) -> AsyncGenerator[AsyncSession, None]:
    await session.execute(text("SELECT set_config('app.org_id', :org_id, true)"), {"org_id": str(context.org_id)})
    await session.execute(text("SELECT set_config('app.user_id', :user_id, true)"), {"user_id": context.user_id})
    yield session
