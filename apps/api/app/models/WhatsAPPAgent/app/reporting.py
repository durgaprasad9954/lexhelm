from __future__ import annotations

from typing import Any, Dict, List

from .identity import UserIdentity


def _summary_block(report: Dict[str, Any]) -> Dict[str, Any]:
    if isinstance(report.get("summary"), dict):
        return report.get("summary", {})
    return {}


def _analyses_block(report: Dict[str, Any]) -> Dict[str, Any]:
    return report.get("analyses", {}) or {}


def extract_top_risks(report: Dict[str, Any], limit: int = 3) -> List[str]:
    summary = _summary_block(report)
    risks = summary.get("whats_wrong") or []
    out: List[str] = []
    for risk in risks[:limit]:
        message = str(risk.get("message", "")).strip()
        if message:
            out.append(message)
    return out


def extract_top_actions(report: Dict[str, Any], limit: int = 3) -> List[str]:
    summary = _summary_block(report)
    actions = summary.get("workflow_improvements") or []
    out: List[str] = []
    for action in actions[:limit]:
        message = str(action.get("suggestion", "")).strip() or str(action.get("message", "")).strip()
        if message:
            out.append(message)
    return out


def _owner_names_for_user(user: UserIdentity) -> List[str]:
    names: List[str] = []
    if user.zoho_owner_name:
        names.append(user.zoho_owner_name)
    names.extend(user.team_owner_names)
    return list(dict.fromkeys([n for n in names if n]))


def _salesperson_rows(report: Dict[str, Any]) -> List[Dict[str, Any]]:
    analyses = _analyses_block(report)
    perf = analyses.get("salesperson_performance", {}) or {}
    rows = perf.get("by_owner") or []
    return rows if isinstance(rows, list) else []


def user_summary_line(user: UserIdentity, report: Dict[str, Any]) -> str:
    metrics = _summary_block(report).get("metrics", {}) or {}
    rows = _salesperson_rows(report)
    owner_names = _owner_names_for_user(user)

    if user.role == "admin" or not owner_names:
        leads = metrics.get("total_leads", 0)
        deals = metrics.get("total_deals", 0)
        pipeline = metrics.get("total_pipeline_value", 0)
        return f"Scope: company-wide | leads={leads} | deals={deals} | open_pipeline={pipeline}"

    selected = [row for row in rows if str(row.get("owner", "")).strip() in set(owner_names)]
    if not selected:
        return f"Scope: mapped owners={', '.join(owner_names)} | No owner stats available in current snapshot."

    total_deals = sum(int(row.get("total_deals", 0) or 0) for row in selected)
    won_deals = sum(int(row.get("won_deals", 0) or 0) for row in selected)
    won_value = sum(float(row.get("won_value", 0) or 0) for row in selected)
    avg_win_rate = (
        round(sum(float(row.get("win_rate_pct", 0) or 0) for row in selected) / len(selected), 1)
        if selected
        else 0.0
    )
    return (
        f"Scope: {len(selected)} owner(s) | deals={total_deals} | won={won_deals} | "
        f"won_value={round(won_value, 2)} | avg_win_rate={avg_win_rate}%"
    )

