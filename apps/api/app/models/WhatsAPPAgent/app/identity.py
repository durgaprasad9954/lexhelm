from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

from .settings import Settings, normalize_company_key


def normalize_wa_number(value: str) -> str:
    return re.sub(r"\D", "", value or "")


@dataclass(frozen=True)
class UserIdentity:
    wa_number: str
    role: str
    zoho_owner_name: str
    zoho_owner_id: str
    team_owner_names: List[str] = field(default_factory=list)
    active: bool = True

    def owner_scope(self) -> Dict[str, List[str]]:
        role = self.role.lower().strip()
        names = [n for n in [self.zoho_owner_name, *self.team_owner_names] if n]
        ids = [i for i in [self.zoho_owner_id] if i]

        if role == "admin":
            return {"owner_names": [], "owner_ids": [], "is_unrestricted": True}
        return {"owner_names": names, "owner_ids": ids, "is_unrestricted": False}


class IdentityResolver:
    def __init__(self, settings: Settings, user_map_path: Optional[Path] = None) -> None:
        self.settings = settings
        default_path = Path.cwd() / "config" / "user_map.json"
        self.user_map_path = (user_map_path or default_path).expanduser().resolve()
        self._users_by_number = self._load_users()

    def _load_users(self) -> Dict[str, UserIdentity]:
        if not self.user_map_path.exists():
            raise ValueError(f"User map file not found: {self.user_map_path}")

        with open(self.user_map_path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)

        map_company = normalize_company_key(str(payload.get("company_key", "")))
        if map_company != self.settings.company_key:
            raise ValueError(
                f"user_map company_key '{map_company}' does not match resolved TARGET_COMPANY "
                f"'{self.settings.company_key}'"
            )

        users = payload.get("users") or []
        if not isinstance(users, list):
            raise ValueError(f"Invalid user map format: users must be a list ({self.user_map_path})")

        out: Dict[str, UserIdentity] = {}
        for raw in users:
            wa_number = normalize_wa_number(str(raw.get("wa_number", "")))
            if not wa_number:
                continue
            role = str(raw.get("role", "")).strip().lower()
            if role not in {"sales", "coordinator", "admin"}:
                raise ValueError(
                    f"Invalid role '{raw.get('role')}' in user map; expected sales|coordinator|admin"
                )
            identity = UserIdentity(
                wa_number=wa_number,
                role=role,
                zoho_owner_name=str(raw.get("zoho_owner_name", "")).strip(),
                zoho_owner_id=str(raw.get("zoho_owner_id", "")).strip(),
                team_owner_names=[
                    str(name).strip() for name in (raw.get("team_owner_names") or []) if str(name).strip()
                ],
                active=bool(raw.get("active", True)),
            )
            out[wa_number] = identity
        return out

    def resolve(self, wa_number: str) -> Optional[UserIdentity]:
        normalized = normalize_wa_number(wa_number)
        identity = self._users_by_number.get(normalized)
        if not identity or not identity.active:
            return None
        return identity

    def list_active_users(self) -> List[UserIdentity]:
        return [u for u in self._users_by_number.values() if u.active]

    def get_admin_user(self) -> Optional[UserIdentity]:
        for user in self.list_active_users():
            if user.role == "admin":
                return user
        return None

