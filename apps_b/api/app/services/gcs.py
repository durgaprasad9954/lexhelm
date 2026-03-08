"""Google Cloud Storage service for artifact uploads/downloads."""
from __future__ import annotations

import asyncio
import json
import re
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Optional
from urllib.parse import quote

from google.api_core.exceptions import NotFound
from google.cloud import storage
from google.oauth2 import service_account

from app.core import settings


def _sanitize_filename(file_name: str) -> str:
    cleaned = file_name.rsplit("/", maxsplit=1)[-1].rsplit("\\", maxsplit=1)[-1].strip()
    if not cleaned:
        cleaned = "artifact"
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", cleaned)[:512]


def build_artifact_object_key(org_id: str, matter_id: str | None, artifact_id: str, file_name: str) -> str:
    safe_name = _sanitize_filename(file_name)
    matter_segment = matter_id or "unassigned"
    return f"org/{org_id}/matter/{matter_segment}/artifacts/{artifact_id}/{safe_name}"


@lru_cache
def _credentials() -> Optional[service_account.Credentials]:
    if not settings.gcs_service_account_info:
        return None
    info = json.loads(settings.gcs_service_account_info)
    return service_account.Credentials.from_service_account_info(info)


@lru_cache
def _storage_client() -> storage.Client:
    creds = _credentials()
    if creds:
        return storage.Client(credentials=creds, project=creds.project_id)
    return storage.Client()


def _bucket() -> storage.Bucket:
    return _storage_client().bucket(settings.gcs_artifacts_bucket)


async def generate_signed_upload_url(object_name: str, content_type: Optional[str]) -> str:
    def _inner() -> str:
        creds = _credentials()
        if creds is None:
            from google.auth import compute_engine
            import google.auth
            import hashlib
            import binascii
            import requests as req

            credentials, project = google.auth.default()
            if isinstance(credentials, compute_engine.Credentials):
                metadata_url = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email"
                service_account_email = req.get(metadata_url, headers={"Metadata-Flavor": "Google"}).text.strip()

                now = datetime.now(timezone.utc)
                date_stamp = now.strftime("%Y%m%d")
                credential_scope = f"{date_stamp}/auto/storage/goog4_request"
                credential = f"{service_account_email}/{credential_scope}"
                canonical_uri = f"/{settings.gcs_artifacts_bucket}/{object_name}"
                canonical_query_string = (
                    f"X-Goog-Algorithm=GOOG4-RSA-SHA256&"
                    f"X-Goog-Credential={quote(credential, safe='')}&"
                    f"X-Goog-Date={now.strftime('%Y%m%dT%H%M%SZ')}&"
                    f"X-Goog-Expires={settings.gcs_signed_url_ttl_seconds}&"
                    f"X-Goog-SignedHeaders=content-type%3Bhost"
                )
                canonical_headers = (
                    f"content-type:{content_type or 'application/octet-stream'}\n"
                    f"host:storage.googleapis.com\n"
                )
                canonical_request = f"PUT\n{canonical_uri}\n{canonical_query_string}\n{canonical_headers}\ncontent-type;host\nUNSIGNED-PAYLOAD"
                canonical_request_hash = hashlib.sha256(canonical_request.encode()).hexdigest()
                string_to_sign = f"GOOG4-RSA-SHA256\n{now.strftime('%Y%m%dT%H%M%SZ')}\n{credential_scope}\n{canonical_request_hash}"

                from google.cloud import iam_credentials_v1
                iam_client = iam_credentials_v1.IAMCredentialsClient(credentials=credentials)
                response = iam_client.sign_blob(
                    name=f"projects/-/serviceAccounts/{service_account_email}",
                    payload=string_to_sign.encode("utf-8"),
                )
                signature = binascii.hexlify(response.signed_blob).decode()
                return f"https://storage.googleapis.com{canonical_uri}?{canonical_query_string}&X-Goog-Signature={signature}"

        blob = _bucket().blob(object_name)
        return blob.generate_signed_url(
            version="v4",
            expiration=timedelta(seconds=settings.gcs_signed_url_ttl_seconds),
            method="PUT",
            content_type=content_type or "application/octet-stream",
        )

    return await asyncio.to_thread(_inner)


async def generate_signed_download_url(object_name: str) -> str:
    def _inner() -> str:
        creds = _credentials()
        if creds is None:
            from google.auth import compute_engine
            import google.auth
            import hashlib
            import binascii
            import requests as req

            credentials, project = google.auth.default()
            if isinstance(credentials, compute_engine.Credentials):
                metadata_url = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email"
                service_account_email = req.get(metadata_url, headers={"Metadata-Flavor": "Google"}).text.strip()

                now = datetime.now(timezone.utc)
                date_stamp = now.strftime("%Y%m%d")
                credential_scope = f"{date_stamp}/auto/storage/goog4_request"
                credential = f"{service_account_email}/{credential_scope}"
                canonical_uri = f"/{settings.gcs_artifacts_bucket}/{object_name}"
                canonical_query_string = (
                    f"X-Goog-Algorithm=GOOG4-RSA-SHA256&"
                    f"X-Goog-Credential={quote(credential, safe='')}&"
                    f"X-Goog-Date={now.strftime('%Y%m%dT%H%M%SZ')}&"
                    f"X-Goog-Expires={settings.gcs_signed_url_ttl_seconds}&"
                    f"X-Goog-SignedHeaders=host"
                )
                canonical_headers = "host:storage.googleapis.com\n"
                canonical_request = f"GET\n{canonical_uri}\n{canonical_query_string}\n{canonical_headers}\nhost\nUNSIGNED-PAYLOAD"
                canonical_request_hash = hashlib.sha256(canonical_request.encode()).hexdigest()
                string_to_sign = f"GOOG4-RSA-SHA256\n{now.strftime('%Y%m%dT%H%M%SZ')}\n{credential_scope}\n{canonical_request_hash}"

                from google.cloud import iam_credentials_v1
                iam_client = iam_credentials_v1.IAMCredentialsClient(credentials=credentials)
                response = iam_client.sign_blob(
                    name=f"projects/-/serviceAccounts/{service_account_email}",
                    payload=string_to_sign.encode("utf-8"),
                )
                signature = binascii.hexlify(response.signed_blob).decode()
                return f"https://storage.googleapis.com{canonical_uri}?{canonical_query_string}&X-Goog-Signature={signature}"

        blob = _bucket().blob(object_name)
        return blob.generate_signed_url(
            version="v4",
            expiration=timedelta(seconds=settings.gcs_signed_url_ttl_seconds),
            method="GET",
        )

    return await asyncio.to_thread(_inner)


class BlobMetadata:
    def __init__(self, size: Optional[int], content_type: Optional[str], updated):
        self.size = size
        self.content_type = content_type
        self.updated = updated


async def fetch_blob_metadata(object_name: str) -> BlobMetadata:
    def _inner() -> BlobMetadata:
        blob = _bucket().blob(object_name)
        blob.reload()
        return BlobMetadata(size=blob.size, content_type=blob.content_type, updated=blob.updated)

    try:
        return await asyncio.to_thread(_inner)
    except NotFound as exc:
        raise FileNotFoundError(object_name) from exc


async def delete_object(object_name: str) -> None:
    def _inner() -> None:
        blob = _bucket().blob(object_name)
        try:
            blob.delete()
        except NotFound:
            return

    await asyncio.to_thread(_inner)
