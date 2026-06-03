from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class GatewayDB:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(str(path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    @contextmanager
    def _cursor(self) -> Generator[sqlite3.Cursor, None, None]:
        with self._lock:
            cur = self._conn.cursor()
            try:
                yield cur
                self._conn.commit()
            finally:
                cur.close()

    def _init_schema(self) -> None:
        with self._cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS audit_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ts TEXT NOT NULL,
                    company_key TEXT NOT NULL,
                    wa_number TEXT,
                    event_type TEXT NOT NULL,
                    payload_json TEXT
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS pending_actions (
                    action_id TEXT PRIMARY KEY,
                    company_key TEXT NOT NULL,
                    wa_number TEXT NOT NULL,
                    role TEXT NOT NULL,
                    action_type TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    status TEXT NOT NULL,
                    executed_at TEXT,
                    result_json TEXT
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS snapshots (
                    report_date TEXT PRIMARY KEY,
                    company_key TEXT NOT NULL,
                    report_path TEXT NOT NULL,
                    report_hash TEXT NOT NULL,
                    generated_at TEXT NOT NULL,
                    status TEXT NOT NULL,
                    metadata_json TEXT
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS conversation_states (
                    token TEXT PRIMARY KEY,
                    company_key TEXT NOT NULL,
                    wa_number TEXT NOT NULL,
                    state_type TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                )
                """
            )

    def log_event(
        self,
        company_key: str,
        event_type: str,
        wa_number: str = "",
        payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO audit_events (ts, company_key, wa_number, event_type, payload_json)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    utc_now_iso(),
                    company_key,
                    wa_number,
                    event_type,
                    json.dumps(payload or {}, ensure_ascii=False),
                ),
            )

    def count_user_events_for_day(self, company_key: str, wa_number: str, day_prefix: str) -> int:
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) AS c
                FROM audit_events
                WHERE company_key = ?
                  AND wa_number = ?
                  AND ts LIKE ?
                """,
                (company_key, wa_number, f"{day_prefix}%"),
            )
            row = cur.fetchone()
            return int(row["c"]) if row else 0

    def create_pending_action(
        self,
        action_id: str,
        company_key: str,
        wa_number: str,
        role: str,
        action_type: str,
        payload: Dict[str, Any],
        expires_at: str,
    ) -> None:
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO pending_actions
                (action_id, company_key, wa_number, role, action_type, payload_json, created_at, expires_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
                """,
                (
                    action_id,
                    company_key,
                    wa_number,
                    role,
                    action_type,
                    json.dumps(payload, ensure_ascii=False),
                    utc_now_iso(),
                    expires_at,
                ),
            )

    def get_pending_action(self, action_id: str) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute(
                "SELECT * FROM pending_actions WHERE action_id = ?",
                (action_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            out = dict(row)
            out["payload"] = json.loads(out.pop("payload_json") or "{}")
            out["result"] = json.loads(out.pop("result_json") or "{}")
            return out

    def update_pending_action_status(
        self,
        action_id: str,
        status: str,
        result: Optional[Dict[str, Any]] = None,
        executed_at: str = "",
    ) -> None:
        with self._cursor() as cur:
            cur.execute(
                """
                UPDATE pending_actions
                SET status = ?, result_json = ?, executed_at = COALESCE(NULLIF(?, ''), executed_at)
                WHERE action_id = ?
                """,
                (
                    status,
                    json.dumps(result or {}, ensure_ascii=False),
                    executed_at,
                    action_id,
                ),
            )

    def upsert_snapshot(
        self,
        report_date: str,
        company_key: str,
        report_path: str,
        report_hash: str,
        status: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO snapshots
                (report_date, company_key, report_path, report_hash, generated_at, status, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(report_date) DO UPDATE SET
                  report_path = excluded.report_path,
                  report_hash = excluded.report_hash,
                  generated_at = excluded.generated_at,
                  status = excluded.status,
                  metadata_json = excluded.metadata_json
                """,
                (
                    report_date,
                    company_key,
                    report_path,
                    report_hash,
                    utc_now_iso(),
                    status,
                    json.dumps(metadata or {}, ensure_ascii=False),
                ),
            )

    def get_snapshot_by_date(self, report_date: str) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute("SELECT * FROM snapshots WHERE report_date = ?", (report_date,))
            row = cur.fetchone()
            if not row:
                return None
            out = dict(row)
            out["metadata"] = json.loads(out.pop("metadata_json") or "{}")
            return out

    def get_latest_snapshot(self, company_key: str) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM snapshots
                WHERE company_key = ?
                ORDER BY report_date DESC
                LIMIT 1
                """,
                (company_key,),
            )
            row = cur.fetchone()
            if not row:
                return None
            out = dict(row)
            out["metadata"] = json.loads(out.pop("metadata_json") or "{}")
            return out

    def create_conversation_state(
        self,
        token: str,
        company_key: str,
        wa_number: str,
        state_type: str,
        payload: Dict[str, Any],
        expires_at: str,
    ) -> None:
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO conversation_states
                (token, company_key, wa_number, state_type, payload_json, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    token,
                    company_key,
                    wa_number,
                    state_type,
                    json.dumps(payload, ensure_ascii=False),
                    utc_now_iso(),
                    expires_at,
                ),
            )

    def get_conversation_state(self, token: str) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute("SELECT * FROM conversation_states WHERE token = ?", (token,))
            row = cur.fetchone()
            if not row:
                return None
            out = dict(row)
            out["payload"] = json.loads(out.pop("payload_json") or "{}")
            return out

    def delete_conversation_state(self, token: str) -> None:
        with self._cursor() as cur:
            cur.execute("DELETE FROM conversation_states WHERE token = ?", (token,))

    def list_expired_pending_actions(self, now_iso: str) -> List[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM pending_actions
                WHERE status = 'pending' AND expires_at < ?
                """,
                (now_iso,),
            )
            rows = cur.fetchall()
            out: List[Dict[str, Any]] = []
            for row in rows:
                entry = dict(row)
                entry["payload"] = json.loads(entry.pop("payload_json") or "{}")
                entry["result"] = json.loads(entry.pop("result_json") or "{}")
                out.append(entry)
            return out

