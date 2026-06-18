from __future__ import annotations

import json
import sys

import requests

from app.core.config import settings


def graph_get(path: str) -> tuple[int, dict]:
    response = requests.get(
        f"https://graph.facebook.com/{settings.whatsapp_graph_api_version}/{path}",
        params={"access_token": settings.whatsapp_access_token},
        timeout=20,
    )
    try:
        payload = response.json()
    except ValueError:
        payload = {"raw": response.text}
    return response.status_code, payload


def print_result(label: str, status: int, payload: dict) -> bool:
    print(f"\n{label}: HTTP {status}")
    print(json.dumps(payload, indent=2)[:2000])
    return 200 <= status < 300


def main() -> int:
    if not settings.whatsapp_access_token or not settings.whatsapp_phone_number_id:
        print("Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID.")
        return 1

    ok = True
    status, payload = graph_get("me")
    ok = print_result("Token identity", status, payload) and ok

    status, payload = graph_get(settings.whatsapp_phone_number_id)
    ok = print_result("WhatsApp phone number", status, payload) and ok

    if ok:
        print("\nWhatsApp token looks valid for Graph API.")
        return 0

    print("\nWhatsApp token check failed. Replace WHATSAPP_ACCESS_TOKEN and recreate the API container.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
