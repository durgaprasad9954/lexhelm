from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import OrgScopedMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.orgs import Org, User
    from app.models.notes import Note
    from app.models.artifacts import Artifact
    from app.models.deadlines import Deadline
    from app.models.hearings import Hearing
    from app.models.citations import Citation
    from app.models.tags import Tag
    from app.models.reminders import Reminder


class Matter(OrgScopedMixin, TimestampMixin, Base):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False)
    number: Mapped[Optional[str]] = mapped_column(String, index=True)
    jurisdiction: Mapped[Optional[str]] = mapped_column(String)
    court: Mapped[Optional[str]] = mapped_column(String)
    stage: Mapped[Optional[str]] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text)
    client_display: Mapped[Optional[str]] = mapped_column(String)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("user.id"), nullable=False)

    org: Mapped["Org"] = relationship(back_populates="matters")
    creator: Mapped["User"] = relationship()
    parties: Mapped[List["MatterParty"]] = relationship(back_populates="matter", cascade="all,delete-orphan")
    notes: Mapped[List["Note"]] = relationship(back_populates="matter", cascade="all,delete-orphan")
    artifacts: Mapped[List["Artifact"]] = relationship(back_populates="matter", cascade="all,delete-orphan")
    deadlines: Mapped[List["Deadline"]] = relationship(back_populates="matter", cascade="all,delete-orphan")
    hearings: Mapped[List["Hearing"]] = relationship(back_populates="matter", cascade="all,delete-orphan")
    citations: Mapped[List["Citation"]] = relationship(back_populates="matter", cascade="all,delete-orphan")
    tags: Mapped[List["MatterTag"]] = relationship(back_populates="matter", cascade="all,delete-orphan")
    reminders: Mapped[List["Reminder"]] = relationship(back_populates="matter", cascade="all,delete-orphan")

    __table_args__ = (Index("idx_matter_org", "org_id"),)


class Party(OrgScopedMixin, TimestampMixin, Base):
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, default="CLIENT", nullable=False)
    contact: Mapped[dict] = mapped_column(JSONB, default=dict)

    matters: Mapped[List["MatterParty"]] = relationship(back_populates="party", cascade="all,delete-orphan")

    __table_args__ = (
        Index("idx_party_org", "org_id"),
        CheckConstraint("type IN ('CLIENT','OPPOSITE','WITNESS','OTHER')", name="ck_party_type"),
    )


class MatterParty(Base):
    matter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("matter.id", ondelete="CASCADE"), primary_key=True)
    party_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("party.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[Optional[str]] = mapped_column(String)

    matter: Mapped["Matter"] = relationship(back_populates="parties")
    party: Mapped["Party"] = relationship(back_populates="matters")


class MatterTag(Base):
    matter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("matter.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tag.id", ondelete="CASCADE"), primary_key=True)

    matter: Mapped["Matter"] = relationship(back_populates="tags")
    tag: Mapped["Tag"] = relationship(back_populates="matters")
