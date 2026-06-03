from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class Intent:
    name: str
    args: Dict[str, Any]
    raw_text: str


def _parse_feedback_payload(payload: str) -> Optional[Dict[str, Any]]:
    chunks = [part.strip() for part in payload.split("|")]
    if len(chunks) < 3:
        return None
    try:
        score = int(chunks[0])
    except ValueError:
        return None
    if score < 1 or score > 5:
        return None
    return {"score": score, "wins": chunks[1], "blockers": chunks[2]}


def _parse_task_create_payload(payload: str) -> Optional[Dict[str, Any]]:
    # Format: <lead|deal> <record_id> | <due:YYYY-MM-DD> | <subject> | <description>
    chunks = [part.strip() for part in payload.split("|")]
    if len(chunks) < 4:
        return None
    head = chunks[0].split()
    if len(head) < 2:
        return None
    target_type = head[0].strip().lower()
    if target_type not in {"lead", "deal"}:
        return None
    return {
        "target_type": target_type,
        "record_id": head[1].strip(),
        "due_date": chunks[1],
        "subject": chunks[2],
        "description": chunks[3],
    }


def parse_intent(text: str) -> Intent:
    raw = (text or "").strip()
    lowered = raw.lower()

    if not raw:
        return Intent(name="unknown", args={}, raw_text=raw)

    if raw.startswith("/"):
        body = raw[1:].strip()
        parts = body.split(maxsplit=2)
        if not parts:
            return Intent(name="unknown", args={}, raw_text=raw)
        root = parts[0].lower()

        if root == "help":
            return Intent(name="help", args={}, raw_text=raw)

        if root == "summary":
            if len(parts) >= 2 and parts[1].lower() == "me":
                return Intent(name="summary_me", args={}, raw_text=raw)
            if len(parts) >= 2 and parts[1].lower() == "team":
                return Intent(name="summary_team", args={}, raw_text=raw)
            return Intent(name="unknown", args={}, raw_text=raw)

        if root == "lead" and len(parts) >= 3:
            sub = parts[1].lower()
            payload = parts[2].strip()
            if sub == "find":
                return Intent(name="lead_find", args={"query": payload}, raw_text=raw)
            if sub == "status":
                fields = payload.split(maxsplit=1)
                if len(fields) == 2:
                    return Intent(
                        name="lead_status_update",
                        args={"lead_id": fields[0].strip(), "new_status": fields[1].strip()},
                        raw_text=raw,
                    )
            if sub == "rating":
                fields = payload.split(maxsplit=1)
                if len(fields) == 2:
                    return Intent(
                        name="lead_rating_update",
                        args={"lead_id": fields[0].strip(), "new_rating": fields[1].strip()},
                        raw_text=raw,
                    )

        if root == "deal" and len(parts) >= 3:
            sub = parts[1].lower()
            payload = parts[2].strip()
            if sub == "find":
                return Intent(name="deal_find", args={"query": payload}, raw_text=raw)
            if sub == "stage":
                fields = payload.split(maxsplit=1)
                if len(fields) == 2:
                    return Intent(
                        name="deal_stage_update",
                        args={"deal_id": fields[0].strip(), "new_stage": fields[1].strip()},
                        raw_text=raw,
                    )

        if root == "task" and len(parts) >= 3 and parts[1].lower() == "create":
            task_payload = _parse_task_create_payload(parts[2].strip())
            if task_payload:
                return Intent(name="task_create", args=task_payload, raw_text=raw)

        if root == "confirm" and len(parts) >= 2:
            return Intent(name="confirm_action", args={"action_id": parts[1].strip()}, raw_text=raw)

        if root == "cancel" and len(parts) >= 2:
            return Intent(name="cancel_action", args={"action_id": parts[1].strip()}, raw_text=raw)

        if root == "feedback" and len(parts) >= 2:
            payload = body[len("feedback") :].strip()
            parsed = _parse_feedback_payload(payload)
            if parsed:
                return Intent(name="feedback_submit", args=parsed, raw_text=raw)

        if root == "pick" and len(parts) >= 3:
            try:
                selected_index = int(parts[2].strip())
            except ValueError:
                selected_index = 0
            return Intent(
                name="pick_result",
                args={"token": parts[1].strip(), "index": selected_index},
                raw_text=raw,
            )

        return Intent(name="unknown", args={}, raw_text=raw)

    # Natural-language shortcuts (phase 1)
    if "show my hot leads" in lowered:
        return Intent(name="lead_find", args={"query": "hot"}, raw_text=raw)
    if lowered.startswith("show stale deals"):
        return Intent(name="summary_team", args={}, raw_text=raw)
    if lowered.startswith("deal status for "):
        deal_id = raw[len("deal status for ") :].strip()
        return Intent(name="deal_find", args={"query": deal_id}, raw_text=raw)

    if lowered.startswith("log call done for lead "):
        # Convert to a task-create intent with today's due date left for runtime defaulting.
        remainder = raw[len("log call done for lead ") :].strip()
        lead_id = remainder.split(",", maxsplit=1)[0].strip()
        return Intent(
            name="task_create",
            args={
                "target_type": "lead",
                "record_id": lead_id,
                "due_date": "",
                "subject": "Call completed",
                "description": remainder,
            },
            raw_text=raw,
        )

    return Intent(name="unknown", args={}, raw_text=raw)

