"""Email endpoints — send documents to clients."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.core.jwt_auth import JWTPayload, get_jwt_payload_optional
from app.core.rate_limit import RateLimit
from app.services.email_service import send_document_email
from app.services.slack_service import send_slack_notification

router = APIRouter()

_send_limit = RateLimit(max_requests=20, window_seconds=3600, key_prefix="email_send")


class SendDocumentEmailRequest(BaseModel):
    to: list[EmailStr] = Field(..., min_length=1, max_length=10)
    cc: Optional[list[EmailStr]] = Field(None, max_length=10)
    subject: str = Field(..., min_length=1, max_length=200)
    note: Optional[str] = Field(None, max_length=2000)
    document_html: str = Field(..., min_length=1)
    document_title: str = Field("Document", max_length=200)
    gmail_access_token: Optional[str] = Field(None, min_length=1, max_length=4096)
    sender_email: Optional[str] = Field(None, min_length=3, max_length=320)
    sender_name: Optional[str] = Field(None, min_length=1, max_length=200)


async def _notify_document_share_slack(
    *,
    sender_name: str,
    sender_email: str,
    recipients: list[str],
    subject: str,
    note: Optional[str],
) -> None:
    recipient_list = ", ".join(recipients)
    message = (
        f"*{sender_name}* sent a Gmail document share.\n"
        f"From: `{sender_email}`\n"
        f"To: `{recipient_list}`\n"
        f"Subject: {subject}"
    )
    if note:
        message += f"\n> {note}"
    await send_slack_notification(message)


@router.post("/send-document", dependencies=[Depends(_send_limit)])
async def send_document(
    req: SendDocumentEmailRequest,
    jwt: Optional[JWTPayload] = Depends(get_jwt_payload_optional),
):
    """Send a document to client(s) via email, CC'ing the sender."""
    sender_email = jwt.email if jwt else req.sender_email
    sender_name = (jwt.name if jwt else req.sender_name) or sender_email

    if not sender_email:
        raise HTTPException(status_code=400, detail="Your account must have an email to send documents.")

    # Build CC list: always include the sender
    cc_list = list(req.cc or [])
    if sender_email not in cc_list and sender_email not in req.to:
        cc_list.append(sender_email)

    try:
        send_document_email(
            to=list(req.to),
            cc=cc_list,
            subject=req.subject,
            note=req.note,
            document_html=req.document_html,
            document_title=req.document_title,
            sender_name=sender_name,
            sender_email=sender_email,
            gmail_access_token=req.gmail_access_token,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {exc}") from exc

    try:
        await _notify_document_share_slack(
            sender_name=sender_name,
            sender_email=sender_email,
            recipients=list(req.to),
            subject=req.subject,
            note=req.note,
        )
    except Exception:
        pass

    return {"message": f"Document sent to {', '.join(req.to)}"}
