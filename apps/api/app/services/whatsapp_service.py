"""WhatsApp notification service for consultation alerts."""
from __future__ import annotations

import logging
from typing import Optional

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Simple WhatsApp Business API client for sending notifications."""

    def __init__(self) -> None:
        self.access_token = settings.whatsapp_access_token
        self.phone_number_id = settings.whatsapp_phone_number_id
        self.admin_number = settings.whatsapp_admin_number
        self.enabled = bool(self.access_token and self.phone_number_id)
        
        if self.enabled:
            self.base_url = f"https://graph.facebook.com/v22.0/{self.phone_number_id}/messages"
        else:
            self.base_url = ""
            logger.warning("WhatsApp notifications disabled - missing access token or phone number ID")

    def send_text(self, to: str, body: str) -> Optional[dict]:
        """Send a text message via WhatsApp Business API."""
        if not self.enabled:
            logger.info("[WhatsApp] Would send to %s: %s", to, body[:100])
            return None

        payload = {
            "messaging_product": "whatsapp",
            "to": str(to),
            "type": "text",
            "text": {"body": body},
        }
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(
                self.base_url,
                json=payload,
                headers=headers,
                timeout=20,
            )
            response.raise_for_status()
            result = response.json()
            logger.info("[WhatsApp] Message sent successfully to %s", to)
            return result
        except requests.exceptions.RequestException as e:
            logger.error("[WhatsApp] Failed to send message to %s: %s", to, e)
            return None

    def send_consultation_notification(
        self,
        name: str,
        email: str,
        phone: Optional[str],
        consultation_type: str,
        urgency: str,
        subject: str,
        description: str,
    ) -> None:
        """Send consultation request notification to admin."""
        if not self.enabled or not self.admin_number:
            logger.info("[WhatsApp] Consultation notification skipped (not configured)")
            return

        # Format consultation type
        type_labels = {
            "general": "General Legal Advice",
            "property": "Property & Real Estate",
            "employment": "Employment & Labor",
            "family": "Family Law",
            "business": "Business & Corporate",
            "criminal": "Criminal Law",
            "consumer": "Consumer Protection",
            "civil": "Civil Matters",
        }
        type_display = type_labels.get(consultation_type, consultation_type)

        # Build message
        message = f"""🆕 *New Consultation Request*

*From:* {name}
*Email:* {email}
*Phone:* {phone or "Not provided"}

*Type:* {type_display}
*Urgency:* {urgency.upper()}
*Subject:* {subject}

*Description:*
{description[:300]}{"..." if len(description) > 300 else ""}

Reply to start conversation."""

        self.send_text(self.admin_number, message)


# Global instance
whatsapp_service = WhatsAppService()


def send_consultation_whatsapp_notification(
    name: str,
    email: str,
    phone: Optional[str],
    consultation_type: str,
    urgency: str,
    subject: str,
    description: str,
) -> None:
    """Convenience function to send consultation notification."""
    whatsapp_service.send_consultation_notification(
        name=name,
        email=email,
        phone=phone,
        consultation_type=consultation_type,
        urgency=urgency,
        subject=subject,
        description=description,
    )
