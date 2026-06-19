"""Slack notification service."""
import logging
import os
import httpx

logger = logging.getLogger(__name__)

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")


async def send_slack_notification(message: str, blocks: list = None) -> bool:
    """Send a notification message to Slack via Webhook."""
    if not SLACK_WEBHOOK_URL:
        logger.warning("SLACK_WEBHOOK_URL not set — skipping Slack notification")
        return False
        
    payload = {"text": message}
    if blocks:
        payload["blocks"] = blocks
        
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                SLACK_WEBHOOK_URL,
                json=payload,
                timeout=10.0,
            )
            response.raise_for_status()
            logger.info("Sent notification to Slack successfully.")
            return True
    except Exception as e:
        logger.exception("Failed to send Slack notification: %s", e)
        return False
