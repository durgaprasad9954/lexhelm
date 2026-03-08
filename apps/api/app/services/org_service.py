"""Organization service for auto-provisioning and management."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orgs import Org, OrgMember
from app.core.config import settings


class OrgService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_or_create_org(
        self, org_id: str, org_name: str | None = None, auto_provision: bool = True,
    ) -> Org:
        org = await self.get_org_by_id(org_id)
        if org:
            return org
        if not auto_provision:
            raise ValueError(f"Organization not found: {org_id}")
        if settings.auto_provision_users:
            org = await self.create_org(org_id=org_id, name=org_name or f"Organization {org_id}")
            await self.session.commit()
            return org
        raise ValueError(f"Organization not found and auto-provisioning is disabled: {org_id}")

    async def get_org_by_id(self, org_id: str) -> Optional[Org]:
        result = await self.session.execute(select(Org).where(Org.id == org_id))
        return result.scalar_one_or_none()

    async def create_org(self, org_id: str, name: str) -> Org:
        org = Org(id=org_id, name=name)
        self.session.add(org)
        return org

    async def ensure_org_membership(self, user_id: str, org_id: str, role: str = "ASSOCIATE") -> OrgMember:
        result = await self.session.execute(
            select(OrgMember).where(OrgMember.user_id == user_id, OrgMember.org_id == org_id)
        )
        existing = result.scalar_one_or_none()
        if existing:
            if existing.role != role:
                existing.role = role
            return existing
        membership = OrgMember(user_id=user_id, org_id=org_id, role=role)
        self.session.add(membership)
        return membership
