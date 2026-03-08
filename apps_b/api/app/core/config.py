"""Unified application settings — merges MattersAPI + LawBot config."""
from __future__ import annotations

from typing import Optional, Union
from urllib.parse import urlsplit, urlunsplit

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic.aliases import AliasChoices


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../../.env.local", "../../.env", ".env"),
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
    frontend_url: str = Field(
        "http://localhost:3000",
        validation_alias=AliasChoices("FRONTEND_URL", "frontend_url"),
        description="Public frontend URL for email links.",
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
        unsupported = {"sslmode", "ssl", "channel_binding", "options", "sslcert", "sslkey", "sslrootcert"}
        query_items = []
        if parts.query:
            for item in parts.query.split("&"):
                if "=" not in item:
                    continue
                key, _ = item.split("=", 1)
                if key.lower() in unsupported:
                    continue
                query_items.append(item)
        new_query = "&".join(query_items) if query_items else ""
        return urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))


settings = Settings()
