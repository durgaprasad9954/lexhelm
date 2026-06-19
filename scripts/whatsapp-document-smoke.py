#!/usr/bin/env python3
"""Quick WhatsApp Cloud API smoke tests for LexHelm document delivery.

Examples:
  python3 scripts/whatsapp-document-smoke.py --recipient durga --mode all
  python3 scripts/whatsapp-document-smoke.py --to 918985225201 --name "Recipient 8985225201" --mode text
  python3 scripts/whatsapp-document-smoke.py --recipient durga --mode template --language en_US
  python3 scripts/whatsapp-document-smoke.py --list-templates
"""
from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import sys
import uuid
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env.local"

RECIPIENTS = {
    "sriram": ("919014795788", "Sriram"),
    "balu": ("917801024988", "Balu"),
    "durga": ("917013858977", "DurgaPrasad"),
    "anjaneyulu": ("919676212234", "Anjaneyulu"),
    "new": ("918985225201", "Recipient 8985225201"),
}


def load_env_file(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env

    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def env_value(file_env: dict[str, str], key: str, default: str | None = None) -> str | None:
    return os.environ.get(key) or file_env.get(key) or default


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D+", "", phone)
    if len(digits) == 10 and not digits.startswith("91"):
        return f"91{digits}"
    return digits


def build_document_link(file_env: dict[str, str], session_id: str | None) -> str:
    if session_id:
        return f"{base_share_url(file_env)}/public-doc-chat/{session_id}"
    return f"{base_share_url(file_env)}/public-doc-chat/{uuid.uuid4()}"


def base_share_url(file_env: dict[str, str]) -> str:
    base = env_value(file_env, "PUBLIC_SHARE_URL") or env_value(file_env, "FRONTEND_URL") or "http://192-168-1-8.sslip.io"
    return base.rstrip("/")


def request_json(method: str, url: str, token: str, payload: dict | None = None) -> tuple[int, dict | str]:
    data = None
    headers = {
        "Authorization": f"Bearer {token}",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = Request(url, data=data, headers=headers, method=method)
    try:
        context = ssl._create_unverified_context()
        with urlopen(request, timeout=30, context=context) as response:
            body = response.read().decode("utf-8")
            return response.status, json.loads(body)
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed: dict | str = json.loads(body)
        except json.JSONDecodeError:
            parsed = body
        return exc.code, parsed
    except URLError as exc:
        return 0, f"Network error: {exc}"


def send_text(base_url: str, token: str, to: str, body: str) -> tuple[int, dict | str]:
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {
            "body": body,
            "preview_url": False,
        },
    }
    print_payload_summary("direct_text", payload)
    return request_json("POST", base_url, token, payload)


def send_template(
    base_url: str,
    token: str,
    to: str,
    template_name: str,
    language: str,
    body_parameters: list[str] | None = None,
) -> tuple[int, dict | str]:
    payload: dict = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language},
        },
    }
    if body_parameters:
        payload["template"]["components"] = [
            {
                "type": "body",
                "parameters": [
                    {"type": "text", "text": value}
                    for value in body_parameters
                ],
            }
        ]

    print_payload_summary(f"template:{template_name}:{language}", payload)
    return request_json("POST", base_url, token, payload)


def list_templates(file_env: dict[str, str], graph_version: str, token: str, template_name: str) -> None:
    waba_id = env_value(file_env, "WHATSAPP_BUSINESS_ACCOUNT_ID") or env_value(file_env, "WHATSAPP_WABA_ID")
    if not waba_id:
        print("WHATSAPP_BUSINESS_ACCOUNT_ID is not set, so template listing cannot run.")
        print("Add it to .env.local from WhatsApp Manager, then retry --list-templates.")
        return

    query = urlencode({
        "name": template_name,
        "fields": "name,status,language,category",
        "limit": "100",
    })
    url = f"https://graph.facebook.com/{graph_version}/{waba_id}/message_templates?{query}"
    status, body = request_json("GET", url, token)
    print_response("list_templates", status, body)


def document_message(name: str, document_type: str, document_link: str) -> str:
    return (
        f"Hi {name},\n\n"
        f"Your {document_type} is ready.\n\n"
        "Open your LexHelm document here:\n"
        f"{document_link}\n\n"
        "Thanks"
    )


def print_payload_summary(label: str, payload: dict) -> None:
    print(f"\n--- sending {label} ---")
    print(json.dumps(payload, indent=2, ensure_ascii=False))


def print_response(label: str, status: int, body: dict | str) -> None:
    print(f"\n--- response {label}: HTTP {status} ---")
    if isinstance(body, str):
        print(body)
    else:
        print(json.dumps(body, indent=2, ensure_ascii=False))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Send quick LexHelm WhatsApp test messages.")
    parser.add_argument("--recipient", choices=sorted(RECIPIENTS), default="durga")
    parser.add_argument("--to", help="Override recipient phone number, with or without +91.")
    parser.add_argument("--name", help="Override recipient display name.")
    parser.add_argument("--mode", choices=["template", "text", "hello", "all"], default="all")
    parser.add_argument("--template-name", default="lexhelm_document_ready")
    parser.add_argument("--language", default=None, help="Template language code. Use 'both' to try en_US and en.")
    parser.add_argument("--document-type", default="Rental / Lease Agreement")
    parser.add_argument("--session-id", help="Use a specific public-doc-chat session id.")
    parser.add_argument("--link", help="Use a specific document link.")
    parser.add_argument("--list-templates", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    file_env = load_env_file(ENV_FILE)

    token = env_value(file_env, "WHATSAPP_ACCESS_TOKEN")
    phone_number_id = env_value(file_env, "WHATSAPP_PHONE_NUMBER_ID")
    graph_version = env_value(file_env, "WHATSAPP_GRAPH_API_VERSION", "v25.0")

    if not token or not phone_number_id:
        print("Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID in .env.local/environment.")
        return 2

    default_phone, default_name = RECIPIENTS[args.recipient]
    to = normalize_phone(args.to or default_phone)
    name = args.name or default_name
    link = args.link or build_document_link(file_env, args.session_id)
    base_url = f"https://graph.facebook.com/{graph_version}/{phone_number_id}/messages"
    languages = ["en_US", "en"] if args.language == "both" else [args.language or "en_US"]

    print("LexHelm WhatsApp smoke test")
    print(f"Graph version: {graph_version}")
    print(f"Phone number ID: {phone_number_id}")
    print(f"To: +{to} ({name})")
    print(f"Document link: {link}")
    print(f"Template: {args.template_name}")
    print("Token: present (hidden)")

    if args.list_templates:
        list_templates(file_env, graph_version, token, args.template_name)
        return 0

    if args.mode in ("hello", "all"):
        status, body = send_template(base_url, token, to, "hello_world", "en_US")
        print_response("hello_world", status, body)

    if args.mode in ("template", "all"):
        for language in languages:
            status, body = send_template(
                base_url,
                token,
                to,
                args.template_name,
                language,
                [name, args.document_type, link],
            )
            print_response(f"{args.template_name}:{language}", status, body)

    if args.mode in ("text", "all"):
        status, body = send_text(base_url, token, to, document_message(name, args.document_type, link))
        print_response("direct_text", status, body)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
