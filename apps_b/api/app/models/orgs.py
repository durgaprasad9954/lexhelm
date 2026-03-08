from __future__ import annotations

from typing import TYPE_CHECKING, List

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import TimestampMixin

RoleEnum = Enum("OWNER", "PARTNER", "ASSOCIATE", "PARALEGAL", "EXTERNAL", name="role")

if TYPE_CHECKING:
    from app.models.matters import Matter


class Org(TimestampMixin, Base):
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    members: Mapped[List["OrgMember"]] = relationship(back_populates="org", cascade="all,delete-orphan")
    matters: Mapped[List["Matter"]] = relationship(back_populates="org", cascade="all,delete")


class User(TimestampMixin, Base):
    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String, nullable=False)

    org_memberships: Mapped[List["OrgMember"]] = relationship(back_populates="user", cascade="all,delete-orphan")


class OrgMember(TimestampMixin, Base):
    org_id: Mapped[str] = mapped_column(String, ForeignKey("org.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(RoleEnum, nullable=False, default="ASSOCIATE")

    org: Mapped["Org"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="org_memberships")
