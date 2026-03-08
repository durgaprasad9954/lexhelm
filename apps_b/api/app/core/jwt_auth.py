"""JWT authentication for Better Auth integration."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

security = HTTPBearer(auto_error=False)


@dataclass
class JWTPayload:
    user_id: str
    email: str
    name: Optional[str] = None
    org_id: Optional[str] = None
    org_name: Optional[str] = None
    role: Optional[str] = None
    raw_payload: dict = None


async def get_jwt_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> JWTPayload:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        if settings.jwt_algorithm == "HS256":
            if not settings.jwt_secret:
                raise HTTPException(status_code=500, detail="JWT_SECRET not configured")
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
                issuer=settings.better_auth_issuer,
                audience=settings.jwt_audience,
                options={"verify_exp": True, "verify_iss": bool(settings.better_auth_issuer)},
            )
        elif settings.jwt_algorithm == "RS256":
            if not settings.better_auth_jwks_url:
                raise HTTPException(status_code=500, detail="BETTER_AUTH_JWKS_URL not configured for RS256")
            payload = jwt.decode(
                token,
                options={"verify_signature": False},
                algorithms=[settings.jwt_algorithm],
            )
        else:
            raise HTTPException(status_code=500, detail=f"Unsupported JWT algorithm: {settings.jwt_algorithm}")

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing 'sub' claim")

        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Token missing 'email' claim")

        return JWTPayload(
            user_id=user_id,
            email=email,
            name=payload.get("name") or payload.get("full_name"),
            org_id=payload.get("org_id") or payload.get("organization_id"),
            org_name=payload.get("org_name") or payload.get("organization_name"),
            role=payload.get("role"),
            raw_payload=payload,
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired", headers={"WWW-Authenticate": "Bearer"})
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}", headers={"WWW-Authenticate": "Bearer"})


async def get_jwt_payload_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[JWTPayload]:
    if not credentials:
        return None
    try:
        return await get_jwt_payload(credentials)
    except HTTPException:
        return None
