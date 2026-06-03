from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv


def normalize_company_key(value: str) -> str:
    normalized = re.sub(r"[\s\-]+", "_", (value or "").strip().lower())
    normalized = re.sub(r"_+", "_", normalized)
    return normalized.strip("_")


def _require_env(name: str) -> str:
    value = (os.getenv(name) or "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def _parse_bool(value: str, default: bool = False) -> bool:
    raw = (value or "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "y", "on"}


@dataclass(frozen=True)
class Settings:
    target_company_raw: str
    company_key: str
    whatsapp_access_token: str
    whatsapp_phone_number_id: str
    gemini_api_key: str
    gemini_model: str
    vectrabiz_root: Path
    vectrabiz_clients_config_path: Path
    vectrabiz_reports_base: Path
    tz: str
    sqlite_path: Path
    read_only_mode: bool
    internal_job_token: str
    whatsapp_verify_token: str
    client_config: Dict[str, Any]
    clients: List[Dict[str, Any]]


def load_settings(env_path: Path | None = None) -> Settings:
    if env_path:
        load_dotenv(env_path, override=False)
    else:
        load_dotenv(override=False)

    target_company_raw = _require_env("TARGET_COMPANY")
    company_key = normalize_company_key(target_company_raw)

    whatsapp_access_token = _require_env("WHATSAPP_ACCESS_TOKEN")
    whatsapp_phone_number_id = _require_env("WHATSAPP_PHONE_NUMBER_ID")
    gemini_api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    gemini_model = (os.getenv("GEMINI_MODEL") or "").strip()

    vectrabiz_root = Path(_require_env("VECTRABIZ_ROOT")).expanduser().resolve()
    if not vectrabiz_root.exists():
        raise ValueError(f"VECTRABIZ_ROOT does not exist: {vectrabiz_root}")

    default_clients_path = vectrabiz_root / "config" / "sales_report_clients.json"
    clients_config_raw = (os.getenv("VECTRABIZ_CLIENTS_CONFIG_PATH") or "").strip()
    vectrabiz_clients_config_path = (
        Path(clients_config_raw).expanduser().resolve() if clients_config_raw else default_clients_path
    )
    if not vectrabiz_clients_config_path.exists():
        raise ValueError(f"Clients config not found: {vectrabiz_clients_config_path}")

    default_reports_base = vectrabiz_root / "reports" / "sales_process"
    reports_base_raw = (os.getenv("VECTRABIZ_REPORTS_BASE") or "").strip()
    vectrabiz_reports_base = (
        Path(reports_base_raw).expanduser().resolve() if reports_base_raw else default_reports_base
    )

    tz = (os.getenv("TZ") or "Asia/Kolkata").strip()
    sqlite_path = Path((os.getenv("SQLITE_PATH") or "./data/gateway.db").strip()).expanduser().resolve()
    sqlite_path.parent.mkdir(parents=True, exist_ok=True)

    read_only_mode = _parse_bool(os.getenv("READ_ONLY_MODE") or "", default=False)
    internal_job_token = (os.getenv("INTERNAL_JOB_TOKEN") or "").strip()
    whatsapp_verify_token = (os.getenv("WHATSAPP_VERIFY_TOKEN") or internal_job_token).strip()

    with open(vectrabiz_clients_config_path, "r", encoding="utf-8") as handle:
        clients_data = json.load(handle)
    clients = clients_data.get("clients") or []
    if not isinstance(clients, list):
        raise ValueError(f"Invalid clients config format in {vectrabiz_clients_config_path}")

    matched_client: Dict[str, Any] | None = None
    for client in clients:
        client_key = normalize_company_key(str(client.get("client_key", "")))
        if client_key == company_key:
            matched_client = client
            break
    if not matched_client:
        available = [normalize_company_key(str(c.get("client_key", ""))) for c in clients]
        raise ValueError(
            f"TARGET_COMPANY='{target_company_raw}' normalized to '{company_key}' not found in clients config. "
            f"Available: {available}"
        )

    return Settings(
        target_company_raw=target_company_raw,
        company_key=company_key,
        whatsapp_access_token=whatsapp_access_token,
        whatsapp_phone_number_id=whatsapp_phone_number_id,
        gemini_api_key=gemini_api_key,
        gemini_model=gemini_model,
        vectrabiz_root=vectrabiz_root,
        vectrabiz_clients_config_path=vectrabiz_clients_config_path,
        vectrabiz_reports_base=vectrabiz_reports_base,
        tz=tz,
        sqlite_path=sqlite_path,
        read_only_mode=read_only_mode,
        internal_job_token=internal_job_token,
        whatsapp_verify_token=whatsapp_verify_token,
        client_config=matched_client,
        clients=clients,
    )

