from __future__ import annotations

from pydantic import EmailStr

from app.schemas.base import APIModel


class UserOut(APIModel):
    id: str
    email: EmailStr
    full_name: str


class OrgOut(APIModel):
    id: str
    name: str


class OrgMemberOut(APIModel):
    org_id: str
    user: UserOut
    role: str


class OrgWithMembers(OrgOut):
    members: list[OrgMemberOut]
