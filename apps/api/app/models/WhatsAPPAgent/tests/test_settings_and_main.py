from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import load_settings


def _write_clients_config(root: Path) -> Path:
    config_dir = root / "config"
    config_dir.mkdir(parents=True, exist_ok=True)
    reports_dir = root / "reports" / "sales_process"
    reports_dir.mkdir(parents=True, exist_ok=True)
    payload = {
        "clients": [
            {
                "client_key": "winwin",
                "client_id": "cid",
                "client_secret": "csecret",
            }
        ]
    }
    config_path = config_dir / "sales_report_clients.json"
    config_path.write_text(json.dumps(payload), encoding="utf-8")
    return config_path


def _set_required_env(monkeypatch: pytest.MonkeyPatch, vectrabiz_root: Path) -> None:
    monkeypatch.setenv("TARGET_COMPANY", "WINWIN")
    monkeypatch.setenv("WHATSAPP_ACCESS_TOKEN", "token")
    monkeypatch.setenv("WHATSAPP_PHONE_NUMBER_ID", "12345")
    monkeypatch.setenv("VECTRABIZ_ROOT", str(vectrabiz_root))
    monkeypatch.setenv("WHATSAPP_VERIFY_TOKEN", "verify-token-1")
    monkeypatch.setenv("INTERNAL_JOB_TOKEN", "internal-token-1")
    monkeypatch.delenv("VECTRABIZ_CLIENTS_CONFIG_PATH", raising=False)
    monkeypatch.delenv("VECTRABIZ_REPORTS_BASE", raising=False)


def test_load_settings_resolves_target_company(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    vectrabiz_root = tmp_path / "vectrabiz"
    _write_clients_config(vectrabiz_root)
    _set_required_env(monkeypatch, vectrabiz_root)
    settings = load_settings()
    assert settings.company_key == "winwin"
    assert settings.client_config["client_key"] == "winwin"
    assert settings.vectrabiz_clients_config_path.exists()


def test_load_settings_fails_on_unknown_company(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    vectrabiz_root = tmp_path / "vectrabiz"
    _write_clients_config(vectrabiz_root)
    _set_required_env(monkeypatch, vectrabiz_root)
    monkeypatch.setenv("TARGET_COMPANY", "UNKNOWN")
    with pytest.raises(ValueError):
        load_settings()


def test_health_and_whatsapp_verify_endpoints(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    vectrabiz_root = tmp_path / "vectrabiz"
    _write_clients_config(vectrabiz_root)
    _set_required_env(monkeypatch, vectrabiz_root)
    monkeypatch.setenv("SQLITE_PATH", str(tmp_path / "gateway.db"))

    app = create_app()
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        payload = health.json()
        assert payload["ready"] is True
        assert payload["company_key"] == "winwin"
        assert payload["scheduler"]["running"] is True

        verify = client.get(
            "/webhook/whatsapp",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": "verify-token-1",
                "hub.challenge": "abc123",
            },
        )
        assert verify.status_code == 200
        assert verify.text == "abc123"

        verify_bad = client.get(
            "/webhook/whatsapp",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": "wrong-token",
                "hub.challenge": "abc123",
            },
        )
        assert verify_bad.status_code == 403
