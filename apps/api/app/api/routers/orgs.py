from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import RequestContext, get_request_context, get_rls_session
from app.models.orgs import Org, OrgMember
from app.schemas.org import OrgMemberOut, OrgOut

router = APIRouter()


@router.get("/current", response_model=OrgOut)
async def get_current_org(
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
) -> Org:
    org = await session.get(Org, context.org_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organisation not found.")
    return org


@router.get("/current/members", response_model=list[OrgMemberOut])
async def list_org_members(
    context: RequestContext = Depends(get_request_context),
    session: AsyncSession = Depends(get_rls_session),
) -> list[OrgMember]:
    stmt = (
        select(OrgMember)
        .options(joinedload(OrgMember.user))
        .where(OrgMember.org_id == context.org_id)
        .order_by(OrgMember.user_id)
    )
    return list((await session.scalars(stmt)).all())
