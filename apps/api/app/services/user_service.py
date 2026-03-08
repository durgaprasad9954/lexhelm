"""User service for auto-provisioning and management."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orgs import User, OrgMember
from app.core.config import settings


class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_or_create_user(
        self, user_id: str, email: str, full_name: str, auto_provision: bool = True,
    ) -> User:
        user = await self.get_user_by_id(user_id)
        if user:
            return user

        existing_by_email = await self.get_user_by_email(email)
        if existing_by_email:
            return existing_by_email

        if not auto_provision:
            raise ValueError(f"User not found: {user_id}")

        if settings.auto_provision_users:
            try:
                user = await self.create_user(user_id=user_id, email=email, full_name=full_name)
                await self.session.commit()
                return user
            except Exception:
                await self.session.rollback()
                user = await self.get_user_by_id(user_id)
                if user:
                    return user
                user = await self.get_user_by_email(email)
                if user:
                    return user
                raise
        else:
            raise ValueError(f"User not found and auto-provisioning is disabled: {user_id}")

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_user_by_email(self, email: str) -> Optional[User]:
        result = await self.session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create_user(self, user_id: str, email: str, full_name: str) -> User:
        user = User(id=user_id, email=email, full_name=full_name)
        self.session.add(user)
        return user

    async def add_user_to_org(self, user_id: str, org_id: str, role: str = "ASSOCIATE") -> OrgMember:
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

    async def get_user_organizations(self, user_id: str) -> list[str]:
        result = await self.session.execute(select(OrgMember.org_id).where(OrgMember.user_id == user_id))
        return list(result.scalars().all())
