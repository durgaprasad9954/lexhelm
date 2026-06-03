from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .identity import UserIdentity
from .settings import Settings


class VectraBizAdapter:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client_config = settings.client_config
        self.company_key = settings.company_key
        self._imports_ready = False
        self._run_report_for_client = None
        self._zoho_cli_cls = None
        self.report_config = self._load_report_config()
        self.leads_module = (
            self.report_config.get("modules", {}).get("leads", {}).get("api_name", "Leads")
        )
        self.deals_module = (
            self.report_config.get("modules", {}).get("deals", {}).get("api_name", "Deals")
        )
        self.deal_stage_field = (
            self.report_config.get("field_mapping", {}).get("deal_stage_field", "Stage")
        )
        self.lead_status_field = (
            self.report_config.get("field_mapping", {}).get("lead_status_field", "Lead_Status")
        )
        self.lead_rating_field = (
            self.report_config.get("field_mapping", {}).get("lead_rating_field", "Rating")
        )

    def _load_report_config(self) -> Dict[str, Any]:
        report_config_path = str(self.client_config.get("report_config", "")).strip()
        if not report_config_path:
            return {}
        path = (self.settings.vectrabiz_root / report_config_path).resolve()
        if not path.exists():
            return {}
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)

    def _prepare_imports(self) -> None:
        if self._imports_ready:
            return
        vectrabiz_root = str(self.settings.vectrabiz_root)
        vectrabiz_src = str((self.settings.vectrabiz_root / "src").resolve())
        if vectrabiz_root not in sys.path:
            sys.path.insert(0, vectrabiz_root)
        if vectrabiz_src not in sys.path:
            sys.path.insert(0, vectrabiz_src)

        from sales_process_report import run_report_for_client  # type: ignore
        from zoho_crm_cli import ZohoCRMCLI  # type: ignore

        self._run_report_for_client = run_report_for_client
        self._zoho_cli_cls = ZohoCRMCLI
        self._imports_ready = True

    def _build_cli(self):  # noqa: ANN202
        self._prepare_imports()
        client_id = str(self.client_config.get("client_id", "")).strip()
        client_secret = str(self.client_config.get("client_secret", "")).strip()
        if not client_id or not client_secret:
            raise ValueError("Client config is missing client_id/client_secret")

        api_domain = str(self.client_config.get("api_domain", "")).strip() or None
        refresh_token = str(self.client_config.get("refresh_token", "")).strip() or None
        soid = (
            str(self.client_config.get("soid", "")).strip()
            or str(self.client_config.get("approved_orgs", "")).strip()
            or None
        )

        if refresh_token:
            return self._zoho_cli_cls(
                refresh_token=refresh_token,
                client_id=client_id,
                client_secret=client_secret,
                api_domain=api_domain,
            )
        if soid:
            scope = (
                str(self.client_config.get("client_credentials_scope", "")).strip()
                or "ZohoCRM.modules.ALL,ZohoCRM.settings.ALL"
            )
            return self._zoho_cli_cls(
                client_id=client_id,
                client_secret=client_secret,
                api_domain=api_domain,
                soid=soid,
                scope=scope,
            )

        token_file = str(self.client_config.get("zoho_crm_config_file", "")).strip()
        config_path = Path(token_file).expanduser().resolve() if token_file else None
        return self._zoho_cli_cls(
            client_id=client_id,
            client_secret=client_secret,
            api_domain=api_domain,
            config_file=config_path,
        )

    def _report_dir(self) -> Path:
        return (self.settings.vectrabiz_reports_base / self.company_key).resolve()

    def _report_hash(self, report_path: Path) -> str:
        digest = hashlib.sha256()
        with open(report_path, "rb") as handle:
            while True:
                chunk = handle.read(8192)
                if not chunk:
                    break
                digest.update(chunk)
        return digest.hexdigest()

    def _latest_report_path(self) -> Optional[Path]:
        report_dir = self._report_dir()
        if not report_dir.exists():
            return None
        candidates = sorted(report_dir.glob("sales_process_report_*.json"), reverse=True)
        if not candidates:
            return None
        return candidates[0]

    def _load_json(self, path: Path) -> Dict[str, Any]:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)

    def refresh_start_snapshot(self) -> Dict[str, Any]:
        self._prepare_imports()
        self._run_report_for_client(
            clients_config_path=str(self.settings.vectrabiz_clients_config_path),
            client_key=self.company_key,
            output_base_dir=str(self.settings.vectrabiz_reports_base),
        )
        report_path = self._latest_report_path()
        if not report_path:
            raise RuntimeError("Report refresh completed but no report file was found")
        report = self._load_json(report_path)
        report_date = date.today().isoformat()
        return {
            "report": report,
            "report_path": str(report_path),
            "report_hash": self._report_hash(report_path),
            "report_date": report_date,
        }

    def load_latest_snapshot(self) -> Dict[str, Any]:
        report_path = self._latest_report_path()
        if not report_path:
            raise RuntimeError("No report snapshot found for target company")
        report = self._load_json(report_path)
        report_date = report_path.stem.rsplit("_", 1)[-1]
        return {
            "report": report,
            "report_path": str(report_path),
            "report_hash": self._report_hash(report_path),
            "report_date": report_date,
        }

    def _owner_visible(self, record: Dict[str, Any], owner_scope: Dict[str, Any]) -> bool:
        if owner_scope.get("is_unrestricted"):
            return True

        owner_obj = record.get("Owner")
        owner_name = ""
        owner_id = ""
        if isinstance(owner_obj, dict):
            owner_name = str(owner_obj.get("name", "")).strip()
            owner_id = str(owner_obj.get("id", "")).strip()
        else:
            owner_name = str(owner_obj or "").strip()

        owner_names = set(owner_scope.get("owner_names") or [])
        owner_ids = set(owner_scope.get("owner_ids") or [])
        return (owner_name in owner_names) or (owner_id and owner_id in owner_ids)

    def _search_records(
        self,
        module_name: str,
        query: str,
        fields: str,
        owner_scope: Dict[str, Any],
        display_fields: Tuple[str, ...],
        status_field: str,
    ) -> List[Dict[str, Any]]:
        cli = self._build_cli()
        results: List[Dict[str, Any]] = []
        normalized_query = query.strip().lower()

        page = 1
        while page <= 5:
            payload = cli.api_call(
                "GET",
                f"/crm/v8/{module_name}",
                params={"per_page": 200, "page": page, "fields": fields},
            )
            records = payload.get("data", []) or []
            if not records:
                break

            for record in records:
                if not self._owner_visible(record, owner_scope):
                    continue

                searchable_fields = [
                    str(record.get("id", "")),
                    str(record.get("Email", "")),
                    str(record.get("Phone", "")),
                    str(record.get("Company", "")),
                    str(record.get("Deal_Name", "")),
                    str(record.get("Subject", "")),
                ]
                haystack = " ".join(searchable_fields).lower()
                if normalized_query and normalized_query not in haystack:
                    continue

                owner_obj = record.get("Owner")
                owner_name = ""
                if isinstance(owner_obj, dict):
                    owner_name = str(owner_obj.get("name", "")).strip()
                else:
                    owner_name = str(owner_obj or "").strip()

                display = " ".join(
                    [str(record.get(field, "")).strip() for field in display_fields if str(record.get(field, "")).strip()]
                ).strip()
                if not display:
                    display = str(record.get("Company") or record.get("id") or "Unknown")

                results.append(
                    {
                        "id": str(record.get("id", "")).strip(),
                        "display_name": display,
                        "owner": owner_name or "Unknown",
                        "status": str(record.get(status_field, "")).strip() or "Unknown",
                        "modified_time": str(record.get("Modified_Time", "")).strip(),
                        "raw": record,
                    }
                )

            info = payload.get("info", {}) or {}
            if not info.get("more_records"):
                break
            page += 1

        return results[:50]

    def search_leads(self, query: str, owner_scope: Dict[str, Any]) -> List[Dict[str, Any]]:
        fields = (
            "id,Owner,First_Name,Last_Name,Email,Phone,Company,Lead_Status,Rating,Created_Time,Modified_Time"
        )
        return self._search_records(
            module_name=self.leads_module,
            query=query,
            fields=fields,
            owner_scope=owner_scope,
            display_fields=("First_Name", "Last_Name", "Company"),
            status_field=self.lead_status_field,
        )

    def search_deals(self, query: str, owner_scope: Dict[str, Any]) -> List[Dict[str, Any]]:
        fields = (
            f"id,Owner,Deal_Name,Subject,Account_Name,{self.deal_stage_field},Amount,Closing_Date,Created_Time,Modified_Time"
        )
        return self._search_records(
            module_name=self.deals_module,
            query=query,
            fields=fields,
            owner_scope=owner_scope,
            display_fields=("Deal_Name", "Subject"),
            status_field=self.deal_stage_field,
        )

    def _update_record(self, module_name: str, record_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        cli = self._build_cli()
        payload = {"data": [{"id": record_id, **updates}]}
        return cli.api_call("PUT", f"/crm/v8/{module_name}", data=payload)

    def update_lead_status(self, lead_id: str, new_status: str) -> Dict[str, Any]:
        return self._update_record(self.leads_module, lead_id, {self.lead_status_field: new_status})

    def update_lead_rating(self, lead_id: str, new_rating: str) -> Dict[str, Any]:
        return self._update_record(self.leads_module, lead_id, {self.lead_rating_field: new_rating})

    def update_deal_stage(self, deal_id: str, new_stage: str) -> Dict[str, Any]:
        return self._update_record(self.deals_module, deal_id, {self.deal_stage_field: new_stage})

    def create_task(
        self,
        subject: str,
        description: str,
        due_date: str,
        owner_id: str = "",
        what_id: str = "",
    ) -> Dict[str, Any]:
        cli = self._build_cli()
        task = {
            "Subject": subject,
            "Description": description,
            "Due_Date": due_date,
        }
        if owner_id:
            task["Owner"] = {"id": owner_id}
        if what_id:
            task["What_Id"] = what_id

        payload = {"data": [task]}
        return cli.api_call("POST", "/crm/v8/Tasks", data=payload)

    def create_feedback_task(
        self,
        user: UserIdentity,
        score: int,
        wins: str,
        blockers: str,
        feedback_date: str,
    ) -> Dict[str, Any]:
        subject = f"EOD Feedback - {feedback_date} - {user.wa_number}"
        description = (
            f"score: {score}\n"
            f"wins: {wins}\n"
            f"blockers: {blockers}\n"
            f"wa_number: {user.wa_number}\n"
            f"role: {user.role}\n"
            f"created_at: {datetime.utcnow().isoformat()}Z"
        )
        due_date = feedback_date
        return self.create_task(
            subject=subject,
            description=description,
            due_date=due_date,
            owner_id=user.zoho_owner_id,
            what_id="",
        )

