"""WhatsApp notification service for consultation alerts."""
from __future__ import annotations

import logging
from typing import Any, Optional

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Simple WhatsApp Business API client for sending notifications."""

    def __init__(self) -> None:
        self.access_token = settings.whatsapp_access_token
        self.phone_number_id = settings.whatsapp_phone_number_id
        self.business_account_id = settings.whatsapp_business_account_id
        self.graph_api_version = settings.whatsapp_graph_api_version
        self.admin_number = settings.whatsapp_admin_number
        self.enabled = bool(self.access_token and self.phone_number_id)
        self.last_error: Optional[str] = None
        
        if self.enabled:
            self.base_url = (
                f"https://graph.facebook.com/{self.graph_api_version}/"
                f"{self.phone_number_id}/messages"
            )
        else:
            self.base_url = ""
            logger.warning("WhatsApp notifications disabled - missing access token or phone number ID")

    def send_text(self, to: str, body: str, preview_url: bool = False) -> Optional[dict]:
        """Send a text message via WhatsApp Business API."""
        if not self.enabled:
            logger.info("[WhatsApp] Would send to %s: %s", to, body[:100])
            self.last_error = "WhatsApp notifications are disabled because access token or phone number ID is missing."
            return None

        payload = {
            "messaging_product": "whatsapp",
            "to": str(to),
            "type": "text",
            "text": {
                "body": body,
                "preview_url": preview_url,
            },
        }
        logger.info(
            "[WhatsApp] Text payload: to=%s body_length=%s preview=%s body=%r",
            to,
            len(body or ""),
            payload["text"]["preview_url"],
            body,
        )
        return self._post_message(to, payload)

    def find_template_language(
        self,
        template_name: str,
        preferred_languages: list[str],
    ) -> Optional[str]:
        """Return an approved template language for the configured WABA."""
        templates = self.list_message_templates(template_name)
        if templates is None:
            return None

        matching_templates = [
            template
            for template in templates
            if template.get("name") == template_name
        ]
        approved_templates = [
            template
            for template in matching_templates
            if str(template.get("status", "")).upper() == "APPROVED"
        ]

        if not matching_templates:
            self.last_error = (
                f"WhatsApp template '{template_name}' was not found in the configured WhatsApp Business Account. "
                "Confirm the template was created under the same WABA as WHATSAPP_PHONE_NUMBER_ID."
            )
            return None

        if not approved_templates:
            statuses = ", ".join(
                f"{template.get('language', 'unknown')}={template.get('status', 'unknown')}"
                for template in matching_templates
            )
            self.last_error = (
                f"WhatsApp template '{template_name}' exists but has no approved translations. "
                f"Current translation statuses: {statuses}."
            )
            return None

        approved_languages = [
            str(template.get("language"))
            for template in approved_templates
            if template.get("language")
        ]
        for language in preferred_languages:
            if language in approved_languages:
                return language

        language = approved_languages[0]
        logger.info(
            "[WhatsApp] Using approved template language %s for template %s; preferred=%s available=%s",
            language,
            template_name,
            preferred_languages,
            approved_languages,
        )
        return language

    def list_message_templates(self, template_name: str) -> Optional[list[dict[str, Any]]]:
        """List WhatsApp templates from the configured WhatsApp Business Account."""
        if not self.enabled:
            self.last_error = "WhatsApp notifications are disabled because access token or phone number ID is missing."
            return None

        if not self.business_account_id:
            self.last_error = (
                "WHATSAPP_BUSINESS_ACCOUNT_ID is not configured, so LexHelm cannot verify "
                f"whether template '{template_name}' exists before sending."
            )
            return None

        url = (
            f"https://graph.facebook.com/{self.graph_api_version}/"
            f"{self.business_account_id}/message_templates"
        )
        headers = {"Authorization": f"Bearer {self.access_token}"}
        params = {
            "name": template_name,
            "fields": "name,status,language,category",
            "limit": 100,
        }

        try:
            response = requests.get(url, headers=headers, params=params, timeout=20)
            response.raise_for_status()
            payload = response.json()
            templates = payload.get("data", [])
            logger.info(
                "[WhatsApp] Template lookup: name=%s found=%s",
                template_name,
                [
                    {
                        "name": template.get("name"),
                        "language": template.get("language"),
                        "status": template.get("status"),
                    }
                    for template in templates
                ],
            )
            return templates
        except requests.exceptions.HTTPError as e:
            error_detail = ""
            try:
                error_detail = response.json()
            except Exception:
                error_detail = response.text
            self.last_error = self._format_error_message(error_detail)
            logger.error("[WhatsApp] Failed to list templates for %s: %s - Response: %s", template_name, e, error_detail)
            return None
        except requests.exceptions.RequestException as e:
            self.last_error = str(e)
            logger.error("[WhatsApp] Failed to list templates for %s: %s", template_name, e)
            return None

    def send_template(
        self,
        to: str,
        template_name: str,
        language_code: str,
        body_parameters: list[str] | None = None,
    ) -> Optional[dict]:
        """Send an approved WhatsApp template message.

        Business-initiated conversations must use approved templates; regular
        text messages are only accepted inside an active customer-service window.
        """
        if not self.enabled:
            logger.info(
                "[WhatsApp] Would send template %s to %s: %s",
                template_name,
                to,
                body_parameters or [],
            )
            self.last_error = "WhatsApp notifications are disabled because access token or phone number ID is missing."
            return None

        components = []
        if body_parameters:
            components.append({
                "type": "body",
                "parameters": [
                    {"type": "text", "text": str(value)}
                    for value in body_parameters
                ],
            })

        payload = {
            "messaging_product": "whatsapp",
            "to": str(to),
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
            },
        }
        if components:
            payload["template"]["components"] = components

        logger.info(
            "[WhatsApp] Template payload: to=%s template=%s language=%s body_parameters=%s",
            to,
            template_name,
            language_code,
            body_parameters or [],
        )
        return self._post_message(to, payload)

    def _post_message(self, to: str, payload: dict) -> Optional[dict]:
        """Post a WhatsApp Cloud API message payload."""
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        try:
            self.last_error = None
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
        except requests.exceptions.HTTPError as e:
            error_detail = ""
            try:
                error_detail = response.json()
            except:
                error_detail = response.text
            self.last_error = self._format_error_message(error_detail)
            logger.error("[WhatsApp] Failed to send message to %s: %s - Response: %s", to, e, error_detail)
            return None
        except requests.exceptions.RequestException as e:
            self.last_error = str(e)
            logger.error("[WhatsApp] Failed to send message to %s: %s", to, e)
            return None

    def _format_error_message(self, error_detail: object) -> str:
        """Build a concise human-readable error message."""
        if isinstance(error_detail, dict):
            error_obj = error_detail.get("error")
            if isinstance(error_obj, dict):
                message = error_obj.get("message")
                code = error_obj.get("code")
                subcode = error_obj.get("error_subcode")
                error_type = error_obj.get("type")
                error_data = error_obj.get("error_data")
                details = None
                if isinstance(error_data, dict):
                    details = error_data.get("details")

                if code == 190:
                    details = [message or "Authentication Error", f"code={code}"]
                    if subcode:
                        details.append(f"subcode={subcode}")
                    details.append(str(error_type or "OAuthException"))
                    return (
                        "WhatsApp API authentication failed: "
                        + " | ".join(details)
                        + ". Replace WHATSAPP_ACCESS_TOKEN with a valid Meta WhatsApp Cloud API token "
                        "for the configured phone number, then recreate/restart the API container."
                    )
                parts = [
                    part
                    for part in [
                        message,
                        f"code={code}" if code else None,
                        f"subcode={subcode}" if subcode else None,
                        error_type,
                        details,
                    ]
                    if part
                ]
                if parts:
                    return "WhatsApp API error: " + " | ".join(parts)
        return f"WhatsApp API error: {error_detail}"

    def send_consultation_notification(
        self,
        name: str,
        email: str,
        phone: Optional[str],
        consultation_type: str,
        urgency: str,
        subject: str,
        description: str,
    ) -> bool:
        """Send consultation request notification to admin."""
        if not self.enabled or not self.admin_number:
            logger.info("[WhatsApp] Consultation notification skipped (not configured)")
            return False

        type_display = self._format_consultation_type(consultation_type)

        if settings.whatsapp_consultation_template_name:
            result = self.send_template(
                to=self.admin_number,
                template_name=settings.whatsapp_consultation_template_name,
                language_code=settings.whatsapp_consultation_template_language,
                body_parameters=[
                    name,
                    email,
                    phone or "Not provided",
                    type_display,
                    urgency.upper(),
                    subject,
                    description[:300],
                ],
            )
            return result is not None

        logger.error(
            "[WhatsApp] WHATSAPP_CONSULTATION_TEMPLATE_NAME is not configured. "
            "Cannot reliably initiate an outbound WhatsApp notification with free-form text."
        )
        return False

    def _format_consultation_type(self, consultation_type: str) -> str:
        """Return display text for consultation type."""
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
        return type_labels.get(consultation_type, consultation_type)

    def send_consultation_text_fallback(
        self,
        name: str,
        email: str,
        phone: Optional[str],
        consultation_type: str,
        urgency: str,
        subject: str,
        description: str,
    ) -> bool:
        """Send consultation details as text inside an active WhatsApp service window."""
        if not self.enabled or not self.admin_number:
            return False

        type_display = self._format_consultation_type(consultation_type)

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

        return self.send_text(self.admin_number, message) is not None


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
) -> bool:
    """Convenience function to send consultation notification."""
    return whatsapp_service.send_consultation_notification(
        name=name,
        email=email,
        phone=phone,
        consultation_type=consultation_type,
        urgency=urgency,
        subject=subject,
        description=description,
    )
