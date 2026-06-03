from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

from app.db import GatewayDB
from app.identity import IdentityResolver
from app.intents import parse_intent
from app.reporting import extract_top_actions, extract_top_risks, user_summary_line
from app.service import GatewayService
from app.settings import Settings


class FakeWhatsAppClient:
    def __init__(self) -> None:
        self.sent: List[Dict[str, str]] = []

    def send_text(self, to: str, body: str) -> Dict[str, Any]:
        self.sent.append({"to": str(to), "body": body})
        return {"messages": [{"id": f"wamid.{len(self.sent)}"}]}


@dataclass
class FakeAdapter:
    report: Dict[str, Any]
    report_path: Path
    refresh_calls: int = 0
    write_calls: List[Tuple[str, str, str]] = None
    feedback_calls: List[Dict[str, Any]] = None
    fail_action: str = ""

    def __post_init__(self) -> None:
        if self.write_calls is None:
            self.write_calls = []
        if self.feedback_calls is None:
            self.feedback_calls = []

    def _within_scope(self, owner: str, owner_id: str, owner_scope: Dict[str, Any]) -> bool:
        if owner_scope.get("is_unrestricted"):
            return True
        names = set(owner_scope.get("owner_names") or [])
        ids = set(owner_scope.get("owner_ids") or [])
        return owner in names or (owner_id and owner_id in ids)

    def _filter_rows(self, rows: List[Dict[str, Any]], query: str, owner_scope: Dict[str, Any]) -> List[Dict[str, Any]]:
        q = query.strip().lower()
        out: List[Dict[str, Any]] = []
        for row in rows:
            if not self._within_scope(row.get("owner", ""), row.get("owner_id", ""), owner_scope):
                continue
            searchable = f"{row.get('id', '')} {row.get('display_name', '')}".lower()
            if q and q not in searchable:
                continue
            out.append(row)
        return out

    def refresh_start_snapshot(self) -> Dict[str, Any]:
        self.refresh_calls += 1
        return {
            "report": self.report,
            "report_path": str(self.report_path),
            "report_hash": "hash-1",
            "report_date": date.today().isoformat(),
        }

    def load_latest_snapshot(self) -> Dict[str, Any]:
        return {
            "report": self.report,
            "report_path": str(self.report_path),
            "report_hash": "hash-1",
            "report_date": date.today().isoformat(),
        }

    def search_leads(self, query: str, owner_scope: Dict[str, Any]) -> List[Dict[str, Any]]:
        rows = [
            {
                "id": "L1",
                "display_name": "Acme Lead",
                "owner": "Alice",
                "owner_id": "101",
                "status": "Open",
                "modified_time": "2026-03-02T10:00:00Z",
            },
            {
                "id": "L2",
                "display_name": "Beta Lead",
                "owner": "Bob",
                "owner_id": "102",
                "status": "Contacted",
                "modified_time": "2026-03-02T10:05:00Z",
            },
        ]
        return self._filter_rows(rows, query, owner_scope)

    def search_deals(self, query: str, owner_scope: Dict[str, Any]) -> List[Dict[str, Any]]:
        rows = [
            {
                "id": "D1",
                "display_name": "Acme Deal",
                "owner": "Alice",
                "owner_id": "101",
                "status": "Qualification",
                "modified_time": "2026-03-02T11:00:00Z",
            },
            {
                "id": "D2",
                "display_name": "Beta Deal",
                "owner": "Bob",
                "owner_id": "102",
                "status": "Proposal",
                "modified_time": "2026-03-02T11:05:00Z",
            },
        ]
        return self._filter_rows(rows, query, owner_scope)

    def _maybe_fail(self, action: str) -> None:
        if self.fail_action == action:
            raise RuntimeError(f"forced-{action}-error")

    def update_lead_status(self, lead_id: str, new_status: str) -> Dict[str, Any]:
        self._maybe_fail("update_lead_status")
        self.write_calls.append(("lead_status", lead_id, new_status))
        return {"data": [{"details": {"id": lead_id}}]}

    def update_lead_rating(self, lead_id: str, new_rating: str) -> Dict[str, Any]:
        self._maybe_fail("update_lead_rating")
        self.write_calls.append(("lead_rating", lead_id, new_rating))
        return {"data": [{"details": {"id": lead_id}}]}

    def update_deal_stage(self, deal_id: str, new_stage: str) -> Dict[str, Any]:
        self._maybe_fail("update_deal_stage")
        self.write_calls.append(("deal_stage", deal_id, new_stage))
        return {"data": [{"details": {"id": deal_id}}]}

    def create_task(
        self,
        subject: str,
        description: str,
        due_date: str,
        owner_id: str,
        what_id: str,
    ) -> Dict[str, Any]:
        self._maybe_fail("create_task")
        self.write_calls.append(("task_create", what_id, subject))
        return {"data": [{"details": {"id": "T1001"}}]}

    def create_feedback_task(
        self,
        user: Any,
        score: int,
        wins: str,
        blockers: str,
        feedback_date: str,
    ) -> Dict[str, Any]:
        self._maybe_fail("create_feedback_task")
        payload = {
            "wa_number": user.wa_number,
            "score": score,
            "wins": wins,
            "blockers": blockers,
            "feedback_date": feedback_date,
        }
        self.feedback_calls.append(payload)
        return {"data": [{"details": {"id": "TFEED1"}}]}


def _report_payload() -> Dict[str, Any]:
    return {
        "summary": {
            "metrics": {
                "total_leads": 12,
                "total_deals": 8,
                "total_pipeline_value": 450000,
            },
            "whats_wrong": [
                {"type": "stale_deals", "message": "3 deals stale >30 days", "count": 3},
                {"type": "quote_followup", "message": "2 quotes need follow-up", "count": 2},
            ],
            "workflow_improvements": [
                {"suggestion": "Call top 3 stale deals"},
                {"suggestion": "Prioritize high-potential untouched leads"},
            ],
        },
        "analyses": {
            "salesperson_performance": {
                "by_owner": [
                    {
                        "owner": "Alice",
                        "total_deals": 5,
                        "won_deals": 2,
                        "won_value": 120000,
                        "win_rate_pct": 40,
                    },
                    {
                        "owner": "Bob",
                        "total_deals": 3,
                        "won_deals": 1,
                        "won_value": 90000,
                        "win_rate_pct": 33.3,
                    },
                ]
            }
        },
    }


def _write_user_map(path: Path) -> None:
    payload = {
        "company_key": "winwin",
        "users": [
            {
                "wa_number": "919800000001",
                "role": "sales",
                "zoho_owner_name": "Alice",
                "zoho_owner_id": "101",
                "active": True,
            },
            {
                "wa_number": "919700000001",
                "role": "coordinator",
                "zoho_owner_name": "",
                "zoho_owner_id": "",
                "team_owner_names": ["Alice", "Bob"],
                "active": True,
            },
            {
                "wa_number": "919600000001",
                "role": "admin",
                "zoho_owner_name": "",
                "zoho_owner_id": "",
                "team_owner_names": [],
                "active": True,
            },
        ],
    }
    path.write_text(json.dumps(payload), encoding="utf-8")


def _build_service(tmp_path: Path, read_only_mode: bool = False) -> Tuple[GatewayService, GatewayDB, FakeAdapter, FakeWhatsAppClient]:
    vectra_root = tmp_path / "vectrabiz"
    vectra_root.mkdir(parents=True, exist_ok=True)
    (vectra_root / "config").mkdir(parents=True, exist_ok=True)
    reports_base = vectra_root / "reports" / "sales_process"
    reports_base.mkdir(parents=True, exist_ok=True)
    report_path = tmp_path / "sales_process_report_20260302.json"
    report_path.write_text(json.dumps(_report_payload()), encoding="utf-8")

    settings = Settings(
        target_company_raw="WINWIN",
        company_key="winwin",
        whatsapp_access_token="token",
        whatsapp_phone_number_id="12345",
        gemini_api_key="",
        gemini_model="",
        vectrabiz_root=vectra_root,
        vectrabiz_clients_config_path=vectra_root / "config" / "sales_report_clients.json",
        vectrabiz_reports_base=reports_base,
        tz="Asia/Kolkata",
        sqlite_path=tmp_path / "gateway.db",
        read_only_mode=read_only_mode,
        internal_job_token="secret",
        whatsapp_verify_token="verify",
        client_config={"client_key": "winwin", "client_id": "id", "client_secret": "secret"},
        clients=[{"client_key": "winwin"}],
    )

    user_map = tmp_path / "user_map.json"
    _write_user_map(user_map)
    identity = IdentityResolver(settings=settings, user_map_path=user_map)
    db = GatewayDB(settings.sqlite_path)
    adapter = FakeAdapter(report=_report_payload(), report_path=report_path)
    whatsapp = FakeWhatsAppClient()
    service = GatewayService(
        settings=settings,
        db=db,
        identity_resolver=identity,
        adapter=adapter,
        whatsapp_client=whatsapp,
    )
    return service, db, adapter, whatsapp


def _send_text(service: GatewayService, wa_number: str, text: str) -> None:
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "from": wa_number,
                                    "type": "text",
                                    "text": {"body": text},
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }
    service.handle_webhook_payload(payload)


def _extract_action_id(text: str) -> str:
    match = re.search(r"#([A-F0-9]+)", text)
    assert match, f"Action id not found in: {text}"
    return match.group(1)


def test_intent_parser_slash_and_nl() -> None:
    assert parse_intent("/summary me").name == "summary_me"
    assert parse_intent("/summary team").name == "summary_team"
    assert parse_intent("/lead find acme").name == "lead_find"
    assert parse_intent("/deal stage 123 Proposal").name == "deal_stage_update"
    assert parse_intent("/feedback 4 | did demos | pricing approvals").name == "feedback_submit"
    assert parse_intent("show my hot leads").name == "lead_find"
    assert parse_intent("log call done for lead L1, called and updated").name == "task_create"


def test_report_helpers_and_summary_formatting(tmp_path: Path) -> None:
    service, _db, _adapter, _wa = _build_service(tmp_path)
    report = _report_payload()
    risks = extract_top_risks(report)
    actions = extract_top_actions(report)
    assert "3 deals stale >30 days" in risks
    assert "Call top 3 stale deals" in actions

    sales = service.identity.resolve("919800000001")
    admin = service.identity.resolve("919600000001")
    assert sales is not None
    assert admin is not None

    sales_summary = user_summary_line(sales, report)
    admin_summary = user_summary_line(admin, report)
    assert "Scope: 1 owner(s)" in sales_summary
    assert "company-wide" in admin_summary


def test_unknown_sender_blocked_from_all_crm_actions(tmp_path: Path) -> None:
    service, _db, adapter, whatsapp = _build_service(tmp_path)
    _send_text(service, "919999000001", "/lead find acme")
    assert len(adapter.write_calls) == 0
    assert "Unauthorized number" in whatsapp.sent[-1]["body"]


def test_role_authorization_matrix_for_summary_team(tmp_path: Path) -> None:
    service, _db, _adapter, whatsapp = _build_service(tmp_path)
    _send_text(service, "919800000001", "/summary team")
    assert "outside your allowed scope" in whatsapp.sent[-1]["body"]

    _send_text(service, "919700000001", "/summary team")
    assert "Top team risks" in whatsapp.sent[-1]["body"]

    _send_text(service, "919600000001", "/summary team")
    assert "Top team risks" in whatsapp.sent[-1]["body"]


def test_sales_scope_blocks_other_owner_lookup(tmp_path: Path) -> None:
    service, _db, _adapter, whatsapp = _build_service(tmp_path)
    _send_text(service, "919800000001", "/lead find L2")
    assert "No lead records found" in whatsapp.sent[-1]["body"]

    _send_text(service, "919700000001", "/lead find L2")
    assert "Lead selected" in whatsapp.sent[-1]["body"] or "Lead results" in whatsapp.sent[-1]["body"]


def test_write_requires_confirm_and_then_executes_once(tmp_path: Path) -> None:
    service, db, adapter, whatsapp = _build_service(tmp_path)
    _send_text(service, "919800000001", "/lead status L1 Qualified")
    assert len(adapter.write_calls) == 0
    action_id = _extract_action_id(whatsapp.sent[-1]["body"])
    pending = db.get_pending_action(action_id)
    assert pending is not None
    assert pending["status"] == "pending"

    _send_text(service, "919800000001", f"/confirm {action_id}")
    assert ("lead_status", "L1", "Qualified") in adapter.write_calls
    assert db.get_pending_action(action_id)["status"] == "executed"
    assert "executed successfully" in whatsapp.sent[-1]["body"]

    _send_text(service, "919800000001", f"/confirm {action_id}")
    assert "already executed" in whatsapp.sent[-1]["body"]


def test_cancel_then_confirm_is_not_executed(tmp_path: Path) -> None:
    service, db, adapter, whatsapp = _build_service(tmp_path)
    _send_text(service, "919800000001", "/deal stage D1 Negotiation")
    action_id = _extract_action_id(whatsapp.sent[-1]["body"])
    _send_text(service, "919800000001", f"/cancel {action_id}")
    assert db.get_pending_action(action_id)["status"] == "cancelled"
    assert len(adapter.write_calls) == 0

    _send_text(service, "919800000001", f"/confirm {action_id}")
    assert len(adapter.write_calls) == 0
    assert "cancelled" in whatsapp.sent[-1]["body"]


def test_confirm_expired_action(tmp_path: Path) -> None:
    service, db, adapter, whatsapp = _build_service(tmp_path)
    action_id = "EXPIRED1"
    expired_at = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    db.create_pending_action(
        action_id=action_id,
        company_key="winwin",
        wa_number="919800000001",
        role="sales",
        action_type="lead_status_update",
        payload={"lead_id": "L1", "new_status": "Qualified"},
        expires_at=expired_at,
    )
    _send_text(service, "919800000001", f"/confirm {action_id}")
    assert db.get_pending_action(action_id)["status"] == "expired"
    assert len(adapter.write_calls) == 0
    assert "expired" in whatsapp.sent[-1]["body"]


def test_cross_company_pending_action_is_blocked(tmp_path: Path) -> None:
    service, db, adapter, whatsapp = _build_service(tmp_path)
    action_id = "DIFFCOMP"
    not_expired = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    db.create_pending_action(
        action_id=action_id,
        company_key="other_company",
        wa_number="919800000001",
        role="sales",
        action_type="lead_status_update",
        payload={"lead_id": "L1", "new_status": "Qualified"},
        expires_at=not_expired,
    )
    _send_text(service, "919800000001", f"/confirm {action_id}")
    assert len(adapter.write_calls) == 0
    assert "outside your allowed scope" in whatsapp.sent[-1]["body"]


def test_read_only_mode_blocks_confirmed_writes(tmp_path: Path) -> None:
    service, db, adapter, whatsapp = _build_service(tmp_path, read_only_mode=True)
    _send_text(service, "919800000001", "/lead rating L1 Hot")
    action_id = _extract_action_id(whatsapp.sent[-1]["body"])
    _send_text(service, "919800000001", f"/confirm {action_id}")
    assert len(adapter.write_calls) == 0
    assert db.get_pending_action(action_id)["status"] == "failed"
    assert "READ_ONLY_MODE" in whatsapp.sent[-1]["body"]


def test_feedback_flow_creates_task_after_confirmation(tmp_path: Path) -> None:
    service, db, adapter, whatsapp = _build_service(tmp_path)
    _send_text(service, "919800000001", "/feedback 5 | closed enterprise deal | waiting legal signoff")
    action_id = _extract_action_id(whatsapp.sent[-1]["body"])
    assert db.get_pending_action(action_id)["status"] == "pending"

    _send_text(service, "919800000001", f"/confirm {action_id}")
    assert db.get_pending_action(action_id)["status"] == "executed"
    assert len(adapter.feedback_calls) == 1
    assert adapter.feedback_calls[0]["score"] == 5
    assert any("Feedback received and logged" in item["body"] for item in whatsapp.sent[-3:])


def test_confirmed_write_failure_is_audited_as_failed(tmp_path: Path) -> None:
    service, db, adapter, whatsapp = _build_service(tmp_path)
    adapter.fail_action = "update_lead_status"
    _send_text(service, "919800000001", "/lead status L1 Qualified")
    action_id = _extract_action_id(whatsapp.sent[-1]["body"])
    _send_text(service, "919800000001", f"/confirm {action_id}")
    assert db.get_pending_action(action_id)["status"] == "failed"
    assert "failed" in whatsapp.sent[-1]["body"]


def test_start_and_end_report_jobs_dispatch_messages(tmp_path: Path) -> None:
    service, db, adapter, whatsapp = _build_service(tmp_path)
    start_result = service.run_start_report_job()
    assert start_result["sent_count"] == 3
    assert adapter.refresh_calls == 1
    today = date.today().isoformat()
    snapshot = db.get_snapshot_by_date(today)
    assert snapshot is not None
    assert "Start Report | winwin" in whatsapp.sent[0]["body"]

    before_end = len(whatsapp.sent)
    end_result = service.run_end_report_job()
    assert end_result["sent_count"] == 3
    assert len(whatsapp.sent) == before_end + 3
    assert "Reply: /feedback <1-5> | <wins> | <blockers>" in whatsapp.sent[-1]["body"]
