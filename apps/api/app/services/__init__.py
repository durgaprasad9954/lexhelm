"""Lightweight service exports.

Avoid importing optional integrations at package import time so individual
services remain usable in local tests and minimal environments.
"""
from __future__ import annotations

from app.services.org_service import OrgService
from app.services.user_service import UserService

__all__ = [
    "UserService",
    "OrgService",
    "build_artifact_object_key",
    "delete_object",
    "fetch_blob_metadata",
    "generate_signed_download_url",
    "generate_signed_upload_url",
]


def build_artifact_object_key(*args, **kwargs):
    from app.services.gcs import build_artifact_object_key as _impl

    return _impl(*args, **kwargs)


def delete_object(*args, **kwargs):
    from app.services.gcs import delete_object as _impl

    return _impl(*args, **kwargs)


def fetch_blob_metadata(*args, **kwargs):
    from app.services.gcs import fetch_blob_metadata as _impl

    return _impl(*args, **kwargs)


def generate_signed_download_url(*args, **kwargs):
    from app.services.gcs import generate_signed_download_url as _impl

    return _impl(*args, **kwargs)


def generate_signed_upload_url(*args, **kwargs):
    from app.services.gcs import generate_signed_upload_url as _impl

    return _impl(*args, **kwargs)
