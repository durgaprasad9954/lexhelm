"""Email notifications via Gmail API with Resend fallback."""
from __future__ import annotations

import base64
import html
import logging
import re
from email.message import EmailMessage
from typing import Optional

import requests
import resend

from app.core import settings

logger = logging.getLogger(__name__)

ADMIN_NOTIFY_EMAILS = ["durgaprasd165@gmail.com"]
FRONTEND_URL = settings.frontend_url.rstrip("/")
GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token"

def _gmail_configured() -> bool:
    return bool(
        settings.gmail_client_id
        and settings.gmail_client_secret
        and settings.gmail_refresh_token
        and settings.gmail_sender_email
    )


def _resend_configured() -> bool:
    return bool(settings.resend_api_key)


def _html_to_text(content: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", content, flags=re.IGNORECASE)
    text = re.sub(r"</p\s*>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def _get_gmail_access_token() -> str:
    response = requests.post(
        GMAIL_TOKEN_URL,
        data={
            "client_id": settings.gmail_client_id,
            "client_secret": settings.gmail_client_secret,
            "refresh_token": settings.gmail_refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()
    access_token = payload.get("access_token")
    if not access_token:
        raise RuntimeError("Gmail token response did not include an access token.")
    return access_token


def _send_via_gmail(
    *,
    to: list[str],
    cc: list[str] | None,
    subject: str,
    html_content: str,
    from_header: str,
    reply_to: str | None = None,
) -> None:
    access_token = _get_gmail_access_token()

    message = EmailMessage()
    message["To"] = ", ".join(to)
    if cc:
        message["Cc"] = ", ".join(cc)
    message["Subject"] = subject
    message["From"] = from_header
    if reply_to:
        message["Reply-To"] = reply_to

    message.set_content(_html_to_text(html_content))
    message.add_alternative(html_content, subtype="html")

    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    gmail_user = settings.gmail_sender_email or "me"
    response = requests.post(
        f"https://gmail.googleapis.com/gmail/v1/users/{gmail_user}/messages/send",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"raw": raw_message},
        timeout=20,
    )
    response.raise_for_status()


def _send_via_resend(
    *,
    to: list[str],
    cc: list[str] | None,
    subject: str,
    html_content: str,
    from_header: str,
    reply_to: str | None = None,
) -> None:
    resend.api_key = settings.resend_api_key
    params: dict = {
        "from": from_header,
        "to": to,
        "subject": subject,
        "html": html_content,
    }
    if cc:
        params["cc"] = cc
    if reply_to:
        params["reply_to"] = reply_to
    resend.Emails.send(params)


def _deliver_email(
    *,
    to: list[str],
    cc: list[str] | None,
    subject: str,
    html_content: str,
    from_header: str,
    reply_to: str | None = None,
) -> None:
    gmail_error: Exception | None = None

    if _gmail_configured():
        try:
            _send_via_gmail(
                to=to,
                cc=cc,
                subject=subject,
                html_content=html_content,
                from_header=from_header,
                reply_to=reply_to,
            )
            logger.info("Email delivered via Gmail API to %s", to)
            return
        except Exception as exc:
            gmail_error = exc
            logger.exception("Gmail delivery failed for %s", to)

    if _resend_configured():
        try:
            _send_via_resend(
                to=to,
                cc=cc,
                subject=subject,
                html_content=html_content,
                from_header=from_header,
                reply_to=reply_to,
            )
            logger.info("Email delivered via Resend to %s", to)
            return
        except Exception:
            logger.exception("Resend delivery failed for %s", to)
            raise

    if gmail_error:
        raise RuntimeError(
            "Gmail delivery failed and no Resend fallback is configured."
        ) from gmail_error
    raise RuntimeError(
        "No email provider configured. Set Gmail API credentials or RESEND_API_KEY."
    )


def send_beta_signup_notification(
    email: str,
    name: Optional[str] = None,
    company: Optional[str] = None,
    use_case: Optional[str] = None,
    referrer: Optional[str] = None,
) -> None:
    """Notify admins about a new beta signup."""
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
        _deliver_email(
            to=ADMIN_NOTIFY_EMAILS,
            cc=None,
            subject=f"[LexHelm Beta] New signup: {applicant_name} ({email})",
            html_content=html,
            from_header=f"LexHelm <{settings.gmail_sender_email or settings.resend_from_email}>",
        )
        logger.info("Beta signup notification sent for %s", email)
    except Exception:
        logger.exception("Failed to send beta signup email for %s", email)


def send_beta_approved_email(email: str, name: Optional[str] = None) -> None:
    """Notify user that their beta access has been approved."""
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
        _deliver_email(
            to=[email],
            cc=None,
            subject="Your LexHelm beta access is approved!",
            html_content=html,
            from_header=f"LexHelm <{settings.gmail_sender_email or settings.resend_from_email}>",
        )
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
    """Send a legal document to client(s) with Gmail delivery when configured."""

    note_html = ""
    if note:
        escaped_note = html.escape(note).replace("\n", "<br>")
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
        _deliver_email(
            to=to,
            cc=cc,
            subject=subject,
            html_content=html,
            from_header=f"{sender_name} via LexHelm <{settings.gmail_sender_email or settings.resend_from_email}>",
            reply_to=sender_email,
        )
        logger.info("Document email sent to %s (cc: %s) by %s", to, cc, sender_email)
    except Exception:
        logger.exception("Failed to send document email to %s", to)


def send_consultation_notification(
    name: str,
    email: str,
    phone: Optional[str],
    consultation_type: str,
    urgency: str,
    subject: str,
    description: str,
    user_id: Optional[str] = None,
) -> None:
    """Notify admins about a new consultation request."""
    # Format consultation type for display
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

    # Format urgency with color
    urgency_colors = {
        "low": "#10b981",      # green
        "medium": "#f59e0b",   # amber
        "high": "#f43f5e",     # rose
        "urgent": "#dc2626",   # red
    }
    urgency_color = urgency_colors.get(urgency, "#6b7280")
    urgency_display = urgency.upper()

    phone_line = f'<p><strong>Phone:</strong> {phone}</p>' if phone else ''
    user_line = f'<p><strong>User ID:</strong> {user_id}</p>' if user_id else '<p><em>Submitted by guest (not logged in)</em></p>'

    html = f"""
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 20px;">New Consultation Request</h2>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">
          From {name} ({email})
        </p>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <div style="margin-bottom: 16px;">
          <span style="display: inline-block; background: {urgency_color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
            {urgency_display} PRIORITY
          </span>
        </div>
        
        <p><strong>Consultation Type:</strong> {type_display}</p>
        <p><strong>Subject:</strong> {subject}</p>
        {phone_line}
        {user_line}
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        
        <p style="margin-top: 0;"><strong>Description:</strong></p>
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
          {description}
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        
        <p style="color: #6b7280; font-size: 13px; margin: 0;">
          <strong>Action Required:</strong> Review and assign this consultation request in the admin panel.<br>
          <a href="{FRONTEND_URL}/admin/consultations" style="color: #6366f1; text-decoration: none;">
            View in Admin Panel →
          </a>
        </p>
      </div>
    </div>
    """

    try:
        _deliver_email(
            to=ADMIN_NOTIFY_EMAILS,
            cc=None,
            subject=f"[Consultation] {urgency_display}: {subject} — {name}",
            html_content=html,
            from_header=f"LexHelm Consultations <{settings.gmail_sender_email or settings.resend_from_email}>",
            reply_to=email,
        )
        logger.info("Consultation notification sent for %s (%s)", name, email)
    except Exception:
        logger.exception("Failed to send consultation notification for %s", email)
