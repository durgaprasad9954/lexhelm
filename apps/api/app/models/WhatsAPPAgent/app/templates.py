from __future__ import annotations

from typing import Any, Dict, List

from .identity import UserIdentity


def unauthorized_text(company_key: str) -> str:
    return (
        f"Unauthorized number for company scope '{company_key}'. "
        "Please contact your admin to be mapped in the gateway."
    )


def help_text() -> str:
    return (
        "Commands:\n"
        "/help\n"
        "/summary me\n"
        "/summary team\n"
        "/lead find <text>\n"
        "/deal find <text>\n"
        "/lead status <lead_id> <new_status>\n"
        "/lead rating <lead_id> <new_rating>\n"
        "/deal stage <deal_id> <new_stage>\n"
        "/task create <lead|deal> <record_id> | <due:YYYY-MM-DD> | <subject> | <description>\n"
        "/confirm <action_id>\n"
        "/cancel <action_id>\n"
        "/feedback <1-5> | <wins> | <blockers>"
    )


def confirmation_text(action_id: str, preview: str) -> str:
    return (
        f"Pending action #{action_id}\n"
        f"{preview}\n\n"
        f"Reply: /confirm {action_id}\n"
        f"Or: /cancel {action_id}\n"
        "This request expires in 10 minutes."
    )


def action_success_text(action_id: str, details: str = "") -> str:
    suffix = f"\n{details}" if details else ""
    return f"Action #{action_id} executed successfully.{suffix}"


def action_failure_text(action_id: str, error: str) -> str:
    return f"Action #{action_id} failed: {error}"


def expired_action_text(action_id: str) -> str:
    return f"Action #{action_id} expired. Please resend the command."


def cancelled_action_text(action_id: str) -> str:
    return f"Action #{action_id} cancelled."


def already_executed_action_text(action_id: str) -> str:
    return f"Action #{action_id} was already executed."


def parse_error_text() -> str:
    return "Could not understand the command. Reply /help for supported commands."


def scope_violation_text() -> str:
    return "This operation is outside your allowed scope."


def no_results_text(entity: str, query: str) -> str:
    return f"No {entity} records found for '{query}'."


def search_results_text(
    entity: str,
    query: str,
    records: List[Dict[str, Any]],
    token: str = "",
) -> str:
    lines = [f"{entity.title()} results for '{query}' (top {len(records)}):"]
    for idx, record in enumerate(records, start=1):
        lines.append(
            f"{idx}. {record.get('display_name', 'Unknown')} | id={record.get('id', '')} | "
            f"owner={record.get('owner', 'Unknown')}"
        )
    if token:
        lines.append(f"Reply /pick {token} <number> to view one record.")
    return "\n".join(lines)


def picked_record_text(entity: str, record: Dict[str, Any]) -> str:
    return (
        f"{entity.title()} selected:\n"
        f"id: {record.get('id', '')}\n"
        f"name: {record.get('display_name', 'Unknown')}\n"
        f"owner: {record.get('owner', 'Unknown')}\n"
        f"status: {record.get('status', 'Unknown')}\n"
        f"updated: {record.get('modified_time', '-')}"
    )


def feedback_ack_text(task_id: str = "") -> str:
    if task_id:
        return f"Feedback received and logged (Task ID: {task_id})."
    return "Feedback received and logged."


def start_report_text(
    company_key: str,
    user: UserIdentity,
    summary_line: str,
    top_risks: List[str],
    top_actions: List[str],
) -> str:
    lines = [
        f"Start Report | {company_key}",
        f"User: {user.wa_number} ({user.role})",
        summary_line,
    ]
    if top_risks:
        lines.append("Top risks:")
        lines.extend([f"- {item}" for item in top_risks[:3]])
    if top_actions:
        lines.append("Top actions for today:")
        lines.extend([f"- {item}" for item in top_actions[:3]])
    return "\n".join(lines)


def end_report_text(
    company_key: str,
    user: UserIdentity,
    summary_line: str,
    activity_count: int,
) -> str:
    return (
        f"End Report | {company_key}\n"
        f"User: {user.wa_number} ({user.role})\n"
        f"{summary_line}\n"
        f"Gateway activity count today: {activity_count}\n\n"
        "Reply: /feedback <1-5> | <wins> | <blockers>"
    )


def scheduler_failure_text(job_name: str, error: str) -> str:
    return f"Automation job '{job_name}' failed: {error}"

