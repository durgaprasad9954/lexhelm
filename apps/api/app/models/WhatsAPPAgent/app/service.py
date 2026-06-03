from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from .confirmation import expiry_iso, generate_action_id, generate_pick_token, is_expired
from .db import GatewayDB, utc_now_iso
from .identity import IdentityResolver, UserIdentity, normalize_wa_number
from .intents import Intent, parse_intent
from .reporting import extract_top_actions, extract_top_risks, user_summary_line
from .settings import Settings
from .templates import (
    action_failure_text,
    action_success_text,
    already_executed_action_text,
    cancelled_action_text,
    confirmation_text,
    end_report_text,
    expired_action_text,
    feedback_ack_text,
    help_text,
    no_results_text,
    parse_error_text,
    picked_record_text,
    scheduler_failure_text,
    scope_violation_text,
    search_results_text,
    start_report_text,
    unauthorized_text,
)
from .vectrabiz_adapter import VectraBizAdapter
from .whatsapp_client import WhatsAppClient


class GatewayService:
    def __init__(
        self,
        settings: Settings,
        db: GatewayDB,
        identity_resolver: IdentityResolver,
        adapter: VectraBizAdapter,
        whatsapp_client: WhatsAppClient,
    ) -> None:
        self.settings = settings
        self.db = db
        self.identity = identity_resolver
        self.adapter = adapter
        self.whatsapp = whatsapp_client

    def scheduler_state(self) -> Dict[str, Any]:
        return {
            "read_only_mode": self.settings.read_only_mode,
            "company_key": self.settings.company_key,
        }

    def handle_webhook_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        messages_handled = 0
        statuses_handled = 0
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {}) or {}
                messages = value.get("messages") or []
                statuses = value.get("statuses") or []

                for status in statuses:
                    statuses_handled += 1
                    self.db.log_event(
                        company_key=self.settings.company_key,
                        event_type="whatsapp_status",
                        wa_number=str(status.get("recipient_id", "")),
                        payload=status,
                    )

                for message in messages:
                    messages_handled += 1
                    self._handle_message(value, message)
        return {"messages_handled": messages_handled, "statuses_handled": statuses_handled}

    def _handle_message(self, envelope: Dict[str, Any], message: Dict[str, Any]) -> None:
        from_number = normalize_wa_number(str(message.get("from", "")))
        msg_type = str(message.get("type", "")).strip()

        if msg_type != "text":
            self.db.log_event(
                company_key=self.settings.company_key,
                event_type="message_ignored_non_text",
                wa_number=from_number,
                payload={"type": msg_type, "message": message},
            )
            return

        text_body = str((message.get("text") or {}).get("body", "")).strip()
        if not text_body:
            self._safe_send(from_number, parse_error_text())
            return

        self.db.log_event(
            company_key=self.settings.company_key,
            event_type="command_received",
            wa_number=from_number,
            payload={"text": text_body},
        )

        identity = self.identity.resolve(from_number)
        if not identity:
            self.db.log_event(
                company_key=self.settings.company_key,
                event_type="unauthorized_number",
                wa_number=from_number,
                payload={"text": text_body},
            )
            self._safe_send(from_number, unauthorized_text(self.settings.company_key))
            return

        intent = parse_intent(text_body)
        self._dispatch_intent(identity, intent)

    def _dispatch_intent(self, user: UserIdentity, intent: Intent) -> None:
        if intent.name == "help":
            self._safe_send(user.wa_number, help_text())
            return

        if intent.name == "summary_me":
            report = self._load_report_for_summary()
            summary = user_summary_line(user, report)
            self._safe_send(user.wa_number, summary)
            return

        if intent.name == "summary_team":
            if user.role not in {"coordinator", "admin"}:
                self._safe_send(user.wa_number, scope_violation_text())
                self.db.log_event(
                    company_key=self.settings.company_key,
                    event_type="scope_violation_blocked",
                    wa_number=user.wa_number,
                    payload={"intent": intent.name},
                )
                return
            report = self._load_report_for_summary()
            summary = user_summary_line(user, report)
            top_risks = extract_top_risks(report, limit=5)
            message = summary
            if top_risks:
                message += "\nTop team risks:\n" + "\n".join([f"- {r}" for r in top_risks[:3]])
            self._safe_send(user.wa_number, message)
            return

        if intent.name == "lead_find":
            self._handle_search(user, entity="lead", query=str(intent.args.get("query", "")))
            return

        if intent.name == "deal_find":
            self._handle_search(user, entity="deal", query=str(intent.args.get("query", "")))
            return

        if intent.name == "pick_result":
            self._handle_pick(user, token=str(intent.args.get("token", "")), index=int(intent.args.get("index", 0)))
            return

        if intent.name in {"lead_status_update", "lead_rating_update", "deal_stage_update", "task_create", "feedback_submit"}:
            self._create_pending_action(user, intent)
            return

        if intent.name == "confirm_action":
            self._confirm_pending_action(user, str(intent.args.get("action_id", "")))
            return

        if intent.name == "cancel_action":
            self._cancel_pending_action(user, str(intent.args.get("action_id", "")))
            return

        self._safe_send(user.wa_number, parse_error_text())

    def _owner_scope(self, user: UserIdentity) -> Dict[str, Any]:
        return user.owner_scope()

    def _handle_search(self, user: UserIdentity, entity: str, query: str) -> None:
        owner_scope = self._owner_scope(user)
        if entity == "lead":
            rows = self.adapter.search_leads(query=query, owner_scope=owner_scope)
        else:
            rows = self.adapter.search_deals(query=query, owner_scope=owner_scope)

        if not rows:
            self._safe_send(user.wa_number, no_results_text(entity, query))
            return
        if len(rows) == 1:
            self._safe_send(user.wa_number, picked_record_text(entity, rows[0]))
            return

        token = generate_pick_token()
        expires_at = expiry_iso(minutes=10)
        self.db.create_conversation_state(
            token=token,
            company_key=self.settings.company_key,
            wa_number=user.wa_number,
            state_type=f"{entity}_search",
            payload={"records": rows[:5]},
            expires_at=expires_at,
        )
        self._safe_send(user.wa_number, search_results_text(entity, query, rows[:5], token=token))

    def _handle_pick(self, user: UserIdentity, token: str, index: int) -> None:
        state = self.db.get_conversation_state(token)
        if not state:
            self._safe_send(user.wa_number, "Selection token not found or expired.")
            return
        if state.get("company_key") != self.settings.company_key or state.get("wa_number") != user.wa_number:
            self._safe_send(user.wa_number, scope_violation_text())
            self.db.log_event(
                company_key=self.settings.company_key,
                event_type="scope_violation_blocked",
                wa_number=user.wa_number,
                payload={"token": token, "state_owner": state.get("wa_number")},
            )
            return
        if is_expired(state.get("expires_at", "")):
            self.db.delete_conversation_state(token)
            self._safe_send(user.wa_number, "Selection token expired. Run search again.")
            return

        records = (state.get("payload") or {}).get("records") or []
        if index < 1 or index > len(records):
            self._safe_send(user.wa_number, f"Invalid selection index. Use 1..{len(records)}.")
            return
        record = records[index - 1]
        entity = "deal" if state.get("state_type", "").startswith("deal") else "lead"
        self._safe_send(user.wa_number, picked_record_text(entity, record))
        self.db.delete_conversation_state(token)

    def _create_pending_action(self, user: UserIdentity, intent: Intent) -> None:
        action_id = generate_action_id()
        expires_at = expiry_iso(minutes=10)
        payload = dict(intent.args)
        payload["intent_name"] = intent.name

        preview = self._preview_for_intent(intent)
        self.db.create_pending_action(
            action_id=action_id,
            company_key=self.settings.company_key,
            wa_number=user.wa_number,
            role=user.role,
            action_type=intent.name,
            payload=payload,
            expires_at=expires_at,
        )
        self.db.log_event(
            company_key=self.settings.company_key,
            event_type="pending_action_created",
            wa_number=user.wa_number,
            payload={"action_id": action_id, "intent": intent.name, "payload": payload},
        )
        self._safe_send(user.wa_number, confirmation_text(action_id, preview))

    def _preview_for_intent(self, intent: Intent) -> str:
        if intent.name == "lead_status_update":
            return f"Update lead {intent.args.get('lead_id')} status => {intent.args.get('new_status')}"
        if intent.name == "lead_rating_update":
            return f"Update lead {intent.args.get('lead_id')} rating => {intent.args.get('new_rating')}"
        if intent.name == "deal_stage_update":
            return f"Update deal {intent.args.get('deal_id')} stage => {intent.args.get('new_stage')}"
        if intent.name == "task_create":
            return (
                f"Create task for {intent.args.get('target_type')} {intent.args.get('record_id')} | "
                f"due={intent.args.get('due_date') or '(today)'} | subject={intent.args.get('subject')}"
            )
        if intent.name == "feedback_submit":
            return (
                f"Create feedback task | score={intent.args.get('score')} | "
                f"wins={intent.args.get('wins')} | blockers={intent.args.get('blockers')}"
            )
        return f"Execute action: {intent.name}"

    def _confirm_pending_action(self, user: UserIdentity, action_id: str) -> None:
        pending = self.db.get_pending_action(action_id)
        if not pending:
            self._safe_send(user.wa_number, "Action not found.")
            return

        if pending.get("company_key") != self.settings.company_key or pending.get("wa_number") != user.wa_number:
            self._safe_send(user.wa_number, scope_violation_text())
            self.db.log_event(
                company_key=self.settings.company_key,
                event_type="scope_violation_blocked",
                wa_number=user.wa_number,
                payload={"action_id": action_id},
            )
            return

        status = pending.get("status", "")
        if status == "executed":
            self._safe_send(user.wa_number, already_executed_action_text(action_id))
            return
        if status == "cancelled":
            self._safe_send(user.wa_number, cancelled_action_text(action_id))
            return

        if is_expired(str(pending.get("expires_at", ""))):
            self.db.update_pending_action_status(action_id, status="expired")
            self._safe_send(user.wa_number, expired_action_text(action_id))
            return

        if self.settings.read_only_mode:
            self.db.update_pending_action_status(
                action_id,
                status="failed",
                result={"error": "READ_ONLY_MODE is enabled"},
            )
            self._safe_send(user.wa_number, action_failure_text(action_id, "READ_ONLY_MODE is enabled"))
            return

        try:
            result = self._execute_action(user, pending)
            self.db.update_pending_action_status(
                action_id,
                status="executed",
                result={"result": result},
                executed_at=utc_now_iso(),
            )
            self.db.log_event(
                company_key=self.settings.company_key,
                event_type="action_executed",
                wa_number=user.wa_number,
                payload={"action_id": action_id, "action_type": pending.get("action_type")},
            )
            self._safe_send(user.wa_number, action_success_text(action_id))
        except Exception as exc:  # noqa: BLE001
            self.db.update_pending_action_status(
                action_id,
                status="failed",
                result={"error": str(exc)},
            )
            self.db.log_event(
                company_key=self.settings.company_key,
                event_type="action_failed",
                wa_number=user.wa_number,
                payload={"action_id": action_id, "error": str(exc)},
            )
            self._safe_send(user.wa_number, action_failure_text(action_id, str(exc)))

    def _cancel_pending_action(self, user: UserIdentity, action_id: str) -> None:
        pending = self.db.get_pending_action(action_id)
        if not pending:
            self._safe_send(user.wa_number, "Action not found.")
            return
        if pending.get("company_key") != self.settings.company_key or pending.get("wa_number") != user.wa_number:
            self._safe_send(user.wa_number, scope_violation_text())
            return
        self.db.update_pending_action_status(action_id, status="cancelled")
        self._safe_send(user.wa_number, cancelled_action_text(action_id))

    def _assert_record_scope(self, user: UserIdentity, entity: str, record_id: str) -> None:
        owner_scope = self._owner_scope(user)
        if entity == "lead":
            rows = self.adapter.search_leads(query=record_id, owner_scope=owner_scope)
        else:
            rows = self.adapter.search_deals(query=record_id, owner_scope=owner_scope)
        if not any(str(row.get("id")) == str(record_id) for row in rows):
            self.db.log_event(
                company_key=self.settings.company_key,
                event_type="scope_violation_blocked",
                wa_number=user.wa_number,
                payload={"entity": entity, "record_id": record_id},
            )
            raise PermissionError("Record is outside your scope or not found.")

    def _execute_action(self, user: UserIdentity, pending: Dict[str, Any]) -> Dict[str, Any]:
        action_type = str(pending.get("action_type", "")).strip()
        payload = pending.get("payload", {}) or {}

        if action_type == "lead_status_update":
            lead_id = str(payload.get("lead_id", "")).strip()
            self._assert_record_scope(user, entity="lead", record_id=lead_id)
            return self.adapter.update_lead_status(lead_id=lead_id, new_status=str(payload.get("new_status", "")).strip())

        if action_type == "lead_rating_update":
            lead_id = str(payload.get("lead_id", "")).strip()
            self._assert_record_scope(user, entity="lead", record_id=lead_id)
            return self.adapter.update_lead_rating(lead_id=lead_id, new_rating=str(payload.get("new_rating", "")).strip())

        if action_type == "deal_stage_update":
            deal_id = str(payload.get("deal_id", "")).strip()
            self._assert_record_scope(user, entity="deal", record_id=deal_id)
            return self.adapter.update_deal_stage(deal_id=deal_id, new_stage=str(payload.get("new_stage", "")).strip())

        if action_type == "task_create":
            target_type = str(payload.get("target_type", "")).strip().lower()
            record_id = str(payload.get("record_id", "")).strip()
            due_date = str(payload.get("due_date", "")).strip() or date.today().isoformat()
            subject = str(payload.get("subject", "")).strip()
            description = str(payload.get("description", "")).strip()
            if target_type not in {"lead", "deal"}:
                raise ValueError("Invalid task target type")
            self._assert_record_scope(user, entity=target_type, record_id=record_id)
            return self.adapter.create_task(
                subject=subject,
                description=description,
                due_date=due_date,
                owner_id=user.zoho_owner_id,
                what_id=record_id,
            )

        if action_type == "feedback_submit":
            score = int(payload.get("score", 0))
            wins = str(payload.get("wins", "")).strip()
            blockers = str(payload.get("blockers", "")).strip()
            result = self.adapter.create_feedback_task(
                user=user,
                score=score,
                wins=wins,
                blockers=blockers,
                feedback_date=date.today().isoformat(),
            )
            task_id = _extract_created_task_id(result)
            self._safe_send(user.wa_number, feedback_ack_text(task_id=task_id))
            return result

        raise ValueError(f"Unsupported action type: {action_type}")

    def _load_report_for_summary(self) -> Dict[str, Any]:
        today = date.today().isoformat()
        row = self.db.get_snapshot_by_date(today)
        if row:
            report_path = str(row.get("report_path", "")).strip()
            if report_path:
                try:
                    with open(report_path, "r", encoding="utf-8") as handle:
                        return json.load(handle)
                except Exception:  # noqa: BLE001
                    pass
        snapshot = self.adapter.load_latest_snapshot()
        return snapshot["report"]

    def run_start_report_job(self) -> Dict[str, Any]:
        snapshot = self.adapter.refresh_start_snapshot()
        self.db.upsert_snapshot(
            report_date=date.today().isoformat(),
            company_key=self.settings.company_key,
            report_path=snapshot["report_path"],
            report_hash=snapshot["report_hash"],
            status="success",
            metadata={"source": "scheduled_start_job"},
        )
        report = snapshot["report"]

        sent_count = 0
        for user in self.identity.list_active_users():
            summary = user_summary_line(user, report)
            top_risks = extract_top_risks(report)
            top_actions = extract_top_actions(report)
            message = start_report_text(
                company_key=self.settings.company_key,
                user=user,
                summary_line=summary,
                top_risks=top_risks,
                top_actions=top_actions,
            )
            self._safe_send(user.wa_number, message)
            sent_count += 1

        self.db.log_event(
            company_key=self.settings.company_key,
            event_type="start_report_sent",
            payload={"sent_count": sent_count, "report_path": snapshot["report_path"]},
        )
        return {"sent_count": sent_count, "report_path": snapshot["report_path"]}

    def run_end_report_job(self) -> Dict[str, Any]:
        report = self._load_report_for_summary()
        day_prefix = date.today().isoformat()
        sent_count = 0
        for user in self.identity.list_active_users():
            summary = user_summary_line(user, report)
            activity_count = self.db.count_user_events_for_day(
                company_key=self.settings.company_key,
                wa_number=user.wa_number,
                day_prefix=day_prefix,
            )
            message = end_report_text(
                company_key=self.settings.company_key,
                user=user,
                summary_line=summary,
                activity_count=activity_count,
            )
            self._safe_send(user.wa_number, message)
            sent_count += 1

        self.db.log_event(
            company_key=self.settings.company_key,
            event_type="end_report_sent",
            payload={"sent_count": sent_count},
        )
        return {"sent_count": sent_count}

    def send_scheduler_failure_alert(self, job_name: str, error: str) -> None:
        admin = self.identity.get_admin_user()
        if not admin:
            return
        self._safe_send(admin.wa_number, scheduler_failure_text(job_name, error))

    def _safe_send(self, wa_number: str, body: str) -> None:
        try:
            result = self.whatsapp.send_text(wa_number, body)
            self.db.log_event(
                company_key=self.settings.company_key,
                event_type="message_sent",
                wa_number=wa_number,
                payload={"body": body, "result": result},
            )
        except Exception as exc:  # noqa: BLE001
            self.db.log_event(
                company_key=self.settings.company_key,
                event_type="message_send_failed",
                wa_number=wa_number,
                payload={"body": body, "error": str(exc)},
            )


def _extract_created_task_id(result: Dict[str, Any]) -> str:
    rows = result.get("data") or []
    if not rows:
        return ""
    details = rows[0].get("details") or {}
    return str(details.get("id", "")).strip()
