from __future__ import annotations

from typing import Any, Dict

import requests

from .settings import Settings


class WhatsAppClient:
    def __init__(self, settings: Settings, timeout_seconds: int = 20) -> None:
        self.settings = settings
        self.timeout_seconds = timeout_seconds
        self.base_url = (
            f"https://graph.facebook.com/v22.0/{self.settings.whatsapp_phone_number_id}/messages"
        )

    def send_text(self, to: str, body: str) -> Dict[str, Any]:
        payload = {
            "messaging_product": "whatsapp",
            "to": str(to),
            "type": "text",
            "text": {"body": body},
        }
        headers = {
            "Authorization": f"Bearer {self.settings.whatsapp_access_token}",
            "Content-Type": "application/json",
        }
        response = requests.post(
            self.base_url,
            json=payload,
            headers=headers,
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        return response.json()

