"""AMQP queue service — publish/consume via LavinMQ (CloudAMQP).

Uses aio-pika for async AMQP. Falls back to in-process execution if AMQP is
not configured (dev mode).
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Callable, Coroutine, Optional

from app.core import settings

logger = logging.getLogger(__name__)

# Queue names
RESEARCH_QUEUE = "lexhelm.jobs.research"
DOCUMENT_QUEUE = "lexhelm.jobs.document"

# Connection pool (singleton)
_connection = None
_channel = None


async def _get_channel():
    """Get or create a persistent AMQP channel."""
    global _connection, _channel

    if _channel and not _channel.is_closed:
        return _channel

    import aio_pika

    url = settings.amqp_url
    if not url:
        return None

    try:
        _connection = await aio_pika.connect_robust(url)
        _channel = await _connection.channel()
        await _channel.set_qos(prefetch_count=5)

        # Declare queues (idempotent)
        for queue_name in [RESEARCH_QUEUE, DOCUMENT_QUEUE]:
            await _channel.declare_queue(queue_name, durable=True)

        logger.info("[Queue] Connected to AMQP broker")
        return _channel
    except Exception as e:
        logger.warning(f"[Queue] AMQP connection failed: {e}. Jobs will run in-process.")
        _connection = None
        _channel = None
        return None


async def publish(queue_name: str, payload: dict) -> bool:
    """Publish a message to the given queue. Returns True if published, False if fallback."""
    channel = await _get_channel()
    if channel is None:
        return False

    import aio_pika

    message = aio_pika.Message(
        body=json.dumps(payload).encode(),
        content_type="application/json",
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
    )
    await channel.default_exchange.publish(message, routing_key=queue_name)
    logger.info(f"[Queue] Published to {queue_name}: job_id={payload.get('job_id')}")
    return True


async def consume(
    queue_name: str,
    handler: Callable[[dict], Coroutine[Any, Any, None]],
) -> None:
    """Start consuming from a queue. Blocks forever (run in worker process)."""
    channel = await _get_channel()
    if channel is None:
        raise RuntimeError("AMQP not configured — cannot start consumer")

    import aio_pika

    queue = await channel.declare_queue(queue_name, durable=True)
    logger.info(f"[Queue] Consuming from {queue_name}")

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                try:
                    payload = json.loads(message.body.decode())
                    await handler(payload)
                except Exception:
                    logger.exception(f"[Queue] Error processing message from {queue_name}")


async def close():
    """Close AMQP connection."""
    global _connection, _channel
    if _connection and not _connection.is_closed:
        await _connection.close()
    _connection = None
    _channel = None
