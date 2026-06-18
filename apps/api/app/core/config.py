"""Unified application settings — merges MattersAPI + LawBot config."""
from __future__ import annotations

from typing import Optional, Union
from urllib.parse import urlsplit, urlunsplit

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic.aliases import AliasChoices


def _normalize_gemini_model_name(value: str) -> str:
    model = (value or "").strip()
    if not model:
        return model
    if model.startswith("models/") or model.startswith("tunedModels/"):
        return model
    return f"models/{model}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../../.env.local", "../../.env", ".env.local"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────
    project_name: str = Field(
        "LexHelm API",
        validation_alias=AliasChoices("PROJECT_NAME", "project_name"),
    )
    api_prefix: str = Field(
        "/api",
        validation_alias=AliasChoices("API_PREFIX", "api_prefix"),
    )
    run_db_migrations_on_startup: bool = Field(
        False,
        validation_alias=AliasChoices("RUN_DB_MIGRATIONS_ON_STARTUP", "run_db_migrations_on_startup"),
    )

    # ── Database (PostgreSQL / Neon) ─────────────────────────────
    neondb_sql_url: str = Field(
        ...,
        validation_alias=AliasChoices("DATABASE_URL", "NEON_POSTGRES_SQL", "neondb_sql_url"),
        description="Neon Postgres connection string. Converted to asyncpg scheme.",
    )
    enable_db_echo: bool = Field(
        False,
        validation_alias=AliasChoices("ENABLE_DB_ECHO", "enable_db_echo"),
    )

    # ── GCS (artifact storage) ───────────────────────────────────
    gcs_artifacts_bucket: str = Field(
        "lexhelm-artifacts",
        validation_alias=AliasChoices("GCS_ARTIFACTS_BUCKET", "gcs_artifacts_bucket"),
    )
    gcs_service_account_info: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("GCS_SERVICE_ACCOUNT_INFO", "gcs_service_account_info"),
    )
    gcs_signed_url_ttl_seconds: int = Field(
        3600,
        validation_alias=AliasChoices("GCS_SIGNED_URL_TTL_SECONDS", "gcs_signed_url_ttl_seconds"),
    )

    # ── CORS ─────────────────────────────────────────────────────
    cors_origins: Union[str, list[str]] = Field(
        default="*",
        validation_alias=AliasChoices("CORS_ORIGINS", "cors_origins"),
    )
    cors_allow_credentials: bool = Field(
        False,
        validation_alias=AliasChoices("CORS_ALLOW_CREDENTIALS", "cors_allow_credentials"),
    )
    cors_origin_regex: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("CORS_ORIGIN_REGEX", "cors_origin_regex"),
        description="Optional regex for allowed CORS origins, useful for local dev ports.",
    )

    # ── JWT / Better Auth ────────────────────────────────────────
    jwt_secret: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("JWT_SECRET", "jwt_secret"),
    )
    jwt_algorithm: str = Field(
        "HS256",
        validation_alias=AliasChoices("JWT_ALGORITHM", "jwt_algorithm"),
    )
    better_auth_issuer: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("BETTER_AUTH_ISSUER", "better_auth_issuer"),
    )
    better_auth_jwks_url: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("BETTER_AUTH_JWKS_URL", "better_auth_jwks_url"),
    )
    jwt_audience: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("JWT_AUDIENCE", "jwt_audience"),
    )
    auto_provision_users: bool = Field(
        True,
        validation_alias=AliasChoices("AUTO_PROVISION_USERS", "auto_provision_users"),
    )

    # ── IndianKanoon Search ──────────────────────────────────────
    ik_api_key: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("IK_API_KEY", "ik_api_key"),
        description="Indian Kanoon API token for legal case search.",
    )

    # ── Gemini (AI features) ─────────────────────────────────────
    gemini_api_key: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("GEMINI_API_KEY", "gemini_api_key"),
        description="Google Gemini API key for AI-powered features.",
    )
    gemini_model: str = Field(
        "gemini-2.5-flash",
        validation_alias=AliasChoices("GEMINI_MODEL", "gemini_model"),
        description="Default Gemini model for AI tasks.",
    )
    gemini_lite_model: str = Field(
        "gemini-2.5-flash-lite",
        validation_alias=AliasChoices("GEMINI_LITE_MODEL", "gemini_lite_model"),
        description="Lighter Gemini model for simple/fast tasks.",
    )

    # ── AMQP (message queue — for future use) ────────────────────
    amqp_url: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("AMQP_LAVINMQ_URL", "amqp_url"),
        description="CloudAMQP/LavinMQ connection URL.",
    )

    # ── Document Service ─────────────────────────────────────────
    document_templates_dir: str = Field(
        "app/templates",
        validation_alias=AliasChoices("DOCUMENT_TEMPLATES_DIR", "document_templates_dir"),
        description="Path to Jinja2 document templates directory.",
    )

    # ── Resend (email notifications) ──────────────────────────────
    resend_api_key: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("RESEND_API_KEY", "resend_api_key"),
        description="Resend API key for transactional email.",
    )
    resend_from_email: str = Field(
        "send@updates.navyaai.com",
        validation_alias=AliasChoices("RESEND_FROM_EMAIL", "resend_from_email"),
    )
    gmail_client_id: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("GMAIL_CLIENT_ID", "gmail_client_id"),
        description="Google OAuth client ID used for Gmail API delivery.",
    )
    gmail_client_secret: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("GMAIL_CLIENT_SECRET", "gmail_client_secret"),
        description="Google OAuth client secret used for Gmail API delivery.",
    )
    gmail_refresh_token: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("GMAIL_REFRESH_TOKEN", "gmail_refresh_token"),
        description="Refresh token for the Gmail sender account.",
    )
    gmail_sender_email: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("GMAIL_SENDER_EMAIL", "gmail_sender_email"),
        description="Sender address to use for Gmail API delivery.",
    )
    frontend_url: str = Field(
        "http://localhost:3000",
        validation_alias=AliasChoices("FRONTEND_URL", "frontend_url"),
        description="Public frontend URL for email links.",
    )
    public_share_url: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("PUBLIC_SHARE_URL", "public_share_url"),
        description="Publicly reachable frontend URL for WhatsApp/shared document links.",
    )

    # ── WhatsApp (consultation notifications) ────────────────────
    whatsapp_access_token: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("WHATSAPP_ACCESS_TOKEN", "whatsapp_access_token"),
        description="WhatsApp Business API access token.",
    )
    whatsapp_phone_number_id: Optional[str] = Field(
        None,
        validation_alias=AliasChoices("WHATSAPP_PHONE_NUMBER_ID", "whatsapp_phone_number_id"),
        description="WhatsApp Business phone number ID.",
    )
    whatsapp_business_account_id: Optional[str] = Field(
        None,
        validation_alias=AliasChoices(
            "WHATSAPP_BUSINESS_ACCOUNT_ID",
            "WHATSAPP_WABA_ID",
            "whatsapp_business_account_id",
        ),
        description="WhatsApp Business Account ID used to validate approved message templates.",
    )
    whatsapp_graph_api_version: str = Field(
        "v25.0",
        validation_alias=AliasChoices(
            "WHATSAPP_GRAPH_API_VERSION",
            "whatsapp_graph_api_version",
        ),
        description="Meta Graph API version used for WhatsApp Cloud API requests.",
    )
    whatsapp_admin_number: Optional[str] = Field(
        "917993176634",
        validation_alias=AliasChoices("WHATSAPP_ADMIN_NUMBER", "whatsapp_admin_number"),
        description="Admin WhatsApp number to receive consultation notifications (with country code, e.g., 919876543210).",
    )
    whatsapp_consultation_template_name: Optional[str] = Field(
        None,
        validation_alias=AliasChoices(
            "WHATSAPP_CONSULTATION_TEMPLATE_NAME",
            "whatsapp_consultation_template_name",
        ),
        description="Approved WhatsApp template name used for outbound consultation notifications.",
    )
    whatsapp_consultation_template_language: str = Field(
        "en_US",
        validation_alias=AliasChoices(
            "WHATSAPP_CONSULTATION_TEMPLATE_LANGUAGE",
            "whatsapp_consultation_template_language",
        ),
        description="Language code for the WhatsApp consultation notification template.",
    )
    whatsapp_document_template_name: Optional[str] = Field(
        None,
        validation_alias=AliasChoices(
            "WHATSAPP_DOCUMENT_TEMPLATE_NAME",
            "whatsapp_document_template_name",
        ),
        description="Approved WhatsApp template name used for outbound document-ready notifications.",
    )
    whatsapp_document_template_language: str = Field(
        "en_US",
        validation_alias=AliasChoices(
            "WHATSAPP_DOCUMENT_TEMPLATE_LANGUAGE",
            "whatsapp_document_template_language",
        ),
        description="Language code for the WhatsApp document-ready template.",
    )
    whatsapp_verify_token: str = Field(
        "lexhelm_webhook",
        validation_alias=AliasChoices(
            "WHATSAPP_VERIFY_TOKEN",
            "whatsapp_verify_token",
        ),
        description="Verification token for Meta WhatsApp webhook setup.",
    )

    # ── Search Cache ─────────────────────────────────────────────
    search_cache_ttl: int = Field(
        3600,
        validation_alias=AliasChoices("SEARCH_CACHE_TTL", "search_cache_ttl"),
        description="Search cache TTL in seconds.",
    )
    search_cache_max_size: int = Field(
        256,
        validation_alias=AliasChoices("SEARCH_CACHE_MAX_SIZE", "search_cache_max_size"),
        description="Max cached search entries.",
    )

    # ── Validators ───────────────────────────────────────────────

    @field_validator("cors_origins", mode="after")
    @classmethod
    def parse_cors_origins(cls, v) -> list[str]:
        if v is None or v == "":
            return ["*"]
        if isinstance(v, str):
            if not v.strip():
                return ["*"]
            origins = [o.strip() for o in v.split(",") if o.strip()]
            return origins or ["*"]
        if isinstance(v, list):
            return v or ["*"]
        return ["*"]

    @field_validator("neondb_sql_url", mode="after")
    @classmethod
    def ensure_asyncpg_scheme(cls, v: str) -> str:
        original = v
        if v.startswith("postgresql://"):
            v = "postgresql+asyncpg://" + v[len("postgresql://"):]
        elif v.startswith("postgres://"):
            v = "postgresql+asyncpg://" + v[len("postgres://"):]
        elif not v.startswith("postgresql+asyncpg://"):
            raise ValueError(
                f"Unsupported Postgres DSN scheme (received: {original})"
            )
        return cls._sanitize_asyncpg_query(v)

    @staticmethod
    def _sanitize_asyncpg_query(url: str) -> str:
        parts = urlsplit(url)
        # Strip all SSL-related params - SSL is handled in session.py via connect_args
        unsupported = {"sslmode", "ssl", "channel_binding", "options", "sslcert", "sslkey", "sslrootcert"}
        query_items = []
        if parts.query:
            for item in parts.query.split("&"):
                if "=" not in item:
                    continue
                key, _ = item.split("=", 1)
                if key.lower() not in unsupported:
                    query_items.append(item)
        new_query = "&".join(query_items) if query_items else ""
        return urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))

    @field_validator("gemini_model", "gemini_lite_model", mode="after")
    @classmethod
    def normalize_gemini_model_names(cls, v: str) -> str:
        return _normalize_gemini_model_name(v)


settings = Settings()
