"""Email notifications via Resend."""
from __future__ import annotations

import logging
from typing import Optional

import resend

from app.core import settings

logger = logging.getLogger(__name__)

ADMIN_NOTIFY_EMAILS = ["vikas@navyaai.com", "marketing@navyaai.com"]
FRONTEND_URL = settings.frontend_url.rstrip("/")


def _ensure_client() -> bool:
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — skipping email")
        return False
    resend.api_key = settings.resend_api_key
    return True


def send_beta_signup_notification(
    email: str,
    name: Optional[str] = None,
    company: Optional[str] = None,
    use_case: Optional[str] = None,
    referrer: Optional[str] = None,
) -> None:
    """Notify admins about a new beta signup."""
    if not _ensure_client():
        return

    applicant_name = name or email.split("@")[0]
    company_line = f"<p><strong>Company:</strong> {company}</p>" if company else ""
    use_case_line = f"<p><strong>Use case:</strong> {use_case}</p>" if use_case else ""
    referrer_line = f"<p><strong>Referrer:</strong> {referrer}</p>" if referrer else ""

    html = f"""
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #8b5cf6, #a855f7); padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 20px;">New Beta Signup</h2>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="margin-top: 0;"><strong>{applicant_name}</strong> just requested beta access to LexHelm.</p>
        <p><strong>Email:</strong> {email}</p>
        {company_line}
        {use_case_line}
        {referrer_line}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <p style="color: #6b7280; font-size: 13px;">
          Review and approve at <a href="{FRONTEND_URL}/admin" style="color: #8b5cf6;">{FRONTEND_URL}/admin</a>
        </p>
      </div>
    </div>
    """

    try:
        resend.Emails.send({
            "from": f"LexHelm <{settings.resend_from_email}>",
            "to": ADMIN_NOTIFY_EMAILS,
            "subject": f"[LexHelm Beta] New signup: {applicant_name} ({email})",
            "html": html,
        })
        logger.info("Beta signup notification sent for %s", email)
    except Exception:
        logger.exception("Failed to send beta signup email for %s", email)


def send_beta_approved_email(email: str, name: Optional[str] = None) -> None:
    """Notify user that their beta access has been approved."""
    if not _ensure_client():
        return

    user_name = name or "there"

    html = f"""
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #8b5cf6, #a855f7); padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 20px;">You're In!</h2>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="margin-top: 0;">Hi {user_name},</p>
        <p>Great news — your LexHelm beta access has been <strong style="color: #10b981;">approved</strong>!</p>
        <p>You can now sign in and start using all features:</p>
        <ul>
          <li>Create legal documents (NDAs, rental agreements, legal notices, and more)</li>
          <li>Search Indian case law with AI</li>
          <li>Upload and analyze contracts</li>
        </ul>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{FRONTEND_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #a855f7); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Sign In to LexHelm
          </a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">
          Questions? Reply to this email — we'd love to hear from you.
        </p>
      </div>
    </div>
    """

    try:
        resend.Emails.send({
            "from": f"LexHelm <{settings.resend_from_email}>",
            "to": [email],
            "subject": "Your LexHelm beta access is approved!",
            "html": html,
        })
        logger.info("Beta approved email sent to %s", email)
    except Exception:
        logger.exception("Failed to send approval email to %s", email)
