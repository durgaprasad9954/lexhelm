"""Worker process — consumes jobs from LavinMQ queues and executes them.

Cloud Run requires an HTTP server on PORT, so we run a tiny health endpoint
alongside the AMQP consumers.
"""
from __future__ import annotations

import asyncio
import logging
import os

from aiohttp import web

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("worker")

_healthy = False


async def health_handler(request):
    if _healthy:
        return web.json_response({"status": "ok", "role": "worker"})
    return web.json_response({"status": "starting"}, status=503)


async def start_health_server():
    """Minimal HTTP server so Cloud Run knows the container is alive."""
    app = web.Application()
    app.router.add_get("/", health_handler)
    app.router.add_get("/healthz", health_handler)

    port = int(os.environ.get("PORT", "8080"))
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    logger.info(f"[Worker] Health server listening on :{port}")


async def main():
    global _healthy

    from app.services import queue_service
    from app.services.job_handlers import handle_job

    # Start health server first (Cloud Run needs it)
    await start_health_server()

    logger.info("[Worker] Starting job consumer...")
    _healthy = True

    # Consume from both queues concurrently
    await asyncio.gather(
        queue_service.consume(queue_service.RESEARCH_QUEUE, handle_job),
        queue_service.consume(queue_service.DOCUMENT_QUEUE, handle_job),
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("[Worker] Shutting down.")
