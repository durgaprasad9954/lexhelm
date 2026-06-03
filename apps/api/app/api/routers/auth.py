"""Google OAuth authentication — verifies Google ID tokens and issues app JWTs."""
from __future__ import annotations

import jwt as pyjwt
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from google.oauth2 import id_token  # type: ignore
from google.auth.transport import requests as google_requests  # type: ignore

from app.core.config import settings

router = APIRouter()

GOOGLE_CLIENT_ID = "302103822364-tl7jqkch8ocome6ojtin9hcapglfoq5d.apps.googleusercontent.com"


class GoogleLoginRequest(BaseModel):
    credential: str  # Google ID token from frontend


class AuthResponse(BaseModel):
    token: str
    user: dict
    org: dict


def _sign_app_jwt(user: dict, org: dict) -> str:
    """Sign a JWT with the backend secret — never exposed to the browser."""
    if not settings.jwt_secret:
        raise HTTPException(status_code=500, detail="JWT_SECRET not configured on server")

    now = datetime.now(timezone.utc)
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "name": user.get("name", user["email"]),
        "picture": user.get("picture"),
        "org_id": org["id"],
        "org_name": org["name"],
        "role": "OWNER",
        "iat": now,
        "exp": now + timedelta(hours=24),
    }
    return pyjwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


@router.post("/auth/google", response_model=AuthResponse, tags=["auth"])
async def login_with_google(body: GoogleLoginRequest):
    """Verify a Google ID token, then return a signed app JWT."""
    print(f"[Auth] Received Google login request, credential length: {len(body.credential)}")
    try:
        idinfo = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
        print(f"[Auth] Google token verified for: {idinfo.get('email')}")
    except ValueError as e:
        print(f"[Auth] Google token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {e}",
        )

    # Extract user info from verified Google claims
    google_sub = idinfo.get("sub")
    email = idinfo.get("email")
    if not google_sub or not email:
        raise HTTPException(status_code=401, detail="Google token missing required claims")

    user = {
        "id": f"google-{google_sub}",
        "email": email,
        "name": idinfo.get("name", email),
        "picture": idinfo.get("picture"),
    }

    # Derive org from email domain
    domain = email.split("@")[1] if "@" in email else "personal"
    given_name = idinfo.get("given_name", idinfo.get("name", "User"))
    org = {
        "id": f"org-{domain.replace('.', '-')}",
        "name": f"{given_name}'s Workspace" if domain == "gmail.com" else domain,
    }

    token = _sign_app_jwt(user, org)

    return AuthResponse(token=token, user=user, org=org)
