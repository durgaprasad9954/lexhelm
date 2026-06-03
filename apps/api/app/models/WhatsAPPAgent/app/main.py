from __future__ import annotations

from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any, Dict

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse, PlainTextResponse

from .db import GatewayDB
from .identity import IdentityResolver
from .scheduler import GatewayScheduler
from .service import GatewayService
from .settings import Settings, load_settings
from .vectrabiz_adapter import VectraBizAdapter
from .whatsapp_client import WhatsAppClient


@dataclass
class AppContainer:
    settings: Settings
    db: GatewayDB
    identity: IdentityResolver
    adapter: VectraBizAdapter
    whatsapp: WhatsAppClient
    service: GatewayService
    scheduler: GatewayScheduler


def create_app() -> FastAPI:
    @asynccontextmanager
    async def _lifespan(app: FastAPI):  # type: ignore[override]
        settings = load_settings()
        db = GatewayDB(settings.sqlite_path)
        identity = IdentityResolver(settings)
        adapter = VectraBizAdapter(settings)
        whatsapp = WhatsAppClient(settings)
        service = GatewayService(
            settings=settings,
            db=db,
            identity_resolver=identity,
            adapter=adapter,
            whatsapp_client=whatsapp,
        )
        scheduler = GatewayScheduler(service=service, tz=settings.tz)
        scheduler.start()
        app.state.container = AppContainer(
            settings=settings,
            db=db,
            identity=identity,
            adapter=adapter,
            whatsapp=whatsapp,
            service=service,
            scheduler=scheduler,
        )
        try:
            yield
        finally:
            container = getattr(app.state, "container", None)
            if container:
                container.scheduler.shutdown()

    app = FastAPI(title="WhatsApp Zoho Gateway", version="0.1.0", lifespan=_lifespan)

    @app.get("/health")
    def health(request: Request) -> Dict[str, Any]:
        container = _get_container(request)
        return {
            "ready": True,
            "company_key": container.settings.company_key,
            "read_only_mode": container.settings.read_only_mode,
            "scheduler": container.scheduler.state(),
        }

    @app.get("/webhook/whatsapp")
    def whatsapp_verify(
        request: Request,
        hub_mode: str = Query(default="", alias="hub.mode"),
        hub_verify_token: str = Query(default="", alias="hub.verify_token"),
        hub_challenge: str = Query(default="", alias="hub.challenge"),
    ) -> PlainTextResponse:
        container = _get_container(request)
        if hub_mode == "subscribe" and hub_verify_token == container.settings.whatsapp_verify_token:
            return PlainTextResponse(content=hub_challenge, status_code=200)
        raise HTTPException(status_code=403, detail="Webhook verification failed")

    @app.post("/webhook/whatsapp")
    async def whatsapp_webhook(request: Request) -> JSONResponse:
        container = _get_container(request)
        payload = await request.json()
        result = container.service.handle_webhook_payload(payload)
        return JSONResponse({"ok": True, "result": result})

    @app.post("/internal/jobs/start-report")
    def run_start_report(
        request: Request,
        x_internal_job_token: str = Header(default="", alias="X-Internal-Job-Token"),
    ) -> Dict[str, Any]:
        container = _get_container(request)
        _assert_internal_job_token(container.settings, x_internal_job_token)
        result = container.scheduler.run_start_now()
        return {"ok": True, "job": "start-report", "result": result}

    @app.post("/internal/jobs/end-report")
    def run_end_report(
        request: Request,
        x_internal_job_token: str = Header(default="", alias="X-Internal-Job-Token"),
    ) -> Dict[str, Any]:
        container = _get_container(request)
        _assert_internal_job_token(container.settings, x_internal_job_token)
        result = container.scheduler.run_end_now()
        return {"ok": True, "job": "end-report", "result": result}

    return app


def _assert_internal_job_token(settings: Settings, provided_token: str) -> None:
    if not settings.internal_job_token:
        raise HTTPException(status_code=503, detail="Internal job endpoints disabled")
    if provided_token != settings.internal_job_token:
        raise HTTPException(status_code=401, detail="Invalid internal job token")


def _get_container(request: Request) -> AppContainer:
    container = getattr(request.app.state, "container", None)
    if not container:
        raise HTTPException(status_code=503, detail="Service is starting")
    return container


app = create_app()
