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


def send_document_email(
    to: list[str],
    cc: list[str],
    subject: str,
    document_html: str,
    document_title: str,
    sender_name: str,
    sender_email: str,
    note: Optional[str] = None,
) -> None:
    """Send a legal document to client(s) with the sender CC'd."""
    if not _ensure_client():
        return

    note_html = ""
    if note:
        # Escape HTML in user note
        import html as html_module
        escaped_note = html_module.escape(note).replace("\n", "<br>")
        note_html = f"""
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #374151; white-space: pre-wrap;">{escaped_note}</p>
        </div>
        """

    html = f"""
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 700px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: linear-gradient(135deg, #8b5cf6, #a855f7); padding: 24px 28px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 18px;">{document_title}</h2>
        <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">
          Sent by {sender_name}
        </p>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px 28px; border-radius: 0 0 12px 12px;">
        {note_html}
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; background: white;">
          <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 13px; line-height: 1.7; color: #1a1a1a;">
            {document_html}
          </div>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
          Sent via <a href="{FRONTEND_URL}" style="color: #8b5cf6; text-decoration: none;">LexHelm</a>
          &middot; AI-powered legal intelligence
        </p>
      </div>
    </div>
    """

    try:
        params: dict = {
            "from": f"{sender_name} via LexHelm <{settings.resend_from_email}>",
            "to": to,
            "subject": subject,
            "html": html,
            "reply_to": sender_email,
        }
        if cc:
            params["cc"] = cc

        resend.Emails.send(params)
        logger.info("Document email sent to %s (cc: %s) by %s", to, cc, sender_email)
    except Exception:
        logger.exception("Failed to send document email to %s", to)
