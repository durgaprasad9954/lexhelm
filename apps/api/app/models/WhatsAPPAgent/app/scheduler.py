from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict

try:
    from apscheduler.events import EVENT_JOB_ERROR, JobExecutionEvent
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger

    APSCHEDULER_AVAILABLE = True
except ModuleNotFoundError:
    APSCHEDULER_AVAILABLE = False
    EVENT_JOB_ERROR = 1

    @dataclass
    class JobExecutionEvent:  # type: ignore[override]
        job_id: str
        exception: Exception | None = None
        traceback: str = ""

    @dataclass
    class _SimpleJob:
        id: str
        func: Any
        next_run_time: datetime | None = None

    class CronTrigger:  # type: ignore[override]
        def __init__(self, *_args: Any, **_kwargs: Any) -> None:
            pass

    class BackgroundScheduler:  # type: ignore[override]
        def __init__(self, timezone: str) -> None:
            self.timezone = timezone
            self.running = False
            self._jobs: Dict[str, _SimpleJob] = {}
            self._listeners: list[Any] = []

        def add_listener(self, listener: Any, _event_mask: int) -> None:
            self._listeners.append(listener)

        def add_job(
            self,
            func: Any,
            _trigger: Any,
            id: str,
            replace_existing: bool = True,
            **_kwargs: Any,
        ) -> None:
            if replace_existing or id not in self._jobs:
                self._jobs[id] = _SimpleJob(id=id, func=func, next_run_time=None)

        def get_jobs(self) -> list[_SimpleJob]:
            return list(self._jobs.values())

        def start(self) -> None:
            self.running = True

        def shutdown(self, wait: bool = False) -> None:
            _ = wait
            self.running = False

from .service import GatewayService

logger = logging.getLogger(__name__)


class GatewayScheduler:
    def __init__(self, service: GatewayService, tz: str) -> None:
        self.service = service
        self.tz = tz
        self._scheduler = BackgroundScheduler(timezone=tz)
        self._scheduler.add_listener(self._on_job_error, EVENT_JOB_ERROR)
        self._configure_jobs()

    def _configure_jobs(self) -> None:
        self._scheduler.add_job(
            self._run_start_report_job,
            CronTrigger(day_of_week="mon-fri", hour=9, minute=0, timezone=self.tz),
            id="start_report_weekday_0900_ist",
            replace_existing=True,
            coalesce=True,
            misfire_grace_time=1800,
        )
        self._scheduler.add_job(
            self._run_end_report_job,
            CronTrigger(day_of_week="mon-fri", hour=18, minute=0, timezone=self.tz),
            id="end_report_weekday_1800_ist",
            replace_existing=True,
            coalesce=True,
            misfire_grace_time=1800,
        )

    def start(self) -> None:
        if not self._scheduler.running:
            self._scheduler.start()
            logger.info(
                "Gateway scheduler started with timezone=%s (%s)",
                self.tz,
                "apscheduler" if APSCHEDULER_AVAILABLE else "fallback",
            )

    def shutdown(self) -> None:
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            logger.info("Gateway scheduler stopped")

    def state(self) -> Dict[str, Any]:
        jobs = []
        for job in self._scheduler.get_jobs():
            jobs.append(
                {
                    "id": job.id,
                    "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
                }
            )
        return {
            "running": self._scheduler.running,
            "timezone": self.tz,
            "jobs": jobs,
        }

    def run_start_now(self) -> Dict[str, Any]:
        return self._run_start_report_job()

    def run_end_now(self) -> Dict[str, Any]:
        return self._run_end_report_job()

    def _run_start_report_job(self) -> Dict[str, Any]:
        try:
            return self.service.run_start_report_job()
        except Exception as exc:  # noqa: BLE001
            self.service.send_scheduler_failure_alert("start_report", str(exc))
            raise

    def _run_end_report_job(self) -> Dict[str, Any]:
        try:
            return self.service.run_end_report_job()
        except Exception as exc:  # noqa: BLE001
            self.service.send_scheduler_failure_alert("end_report", str(exc))
            raise

    def _on_job_error(self, event: JobExecutionEvent) -> None:
        if not event.exception:
            return
        logger.error("Scheduled job failed: %s | %s", event.job_id, event.traceback)
