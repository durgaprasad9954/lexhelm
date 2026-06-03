from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone


def generate_action_id() -> str:
    return secrets.token_hex(4).upper()


def generate_pick_token() -> str:
    return secrets.token_hex(3).upper()


def expiry_iso(minutes: int = 10) -> str:
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()


def is_expired(expires_at_iso: str) -> bool:
    expires_at = datetime.fromisoformat(expires_at_iso)
    return datetime.now(timezone.utc) > expires_at

