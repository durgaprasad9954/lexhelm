"""Document generation service — template-based contract/agreement drafting."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader, TemplateNotFound

from app.core import settings


def _get_genai_client():
    from google import genai
    return genai.Client(api_key=settings.gemini_api_key)


def _strip_json_fences(raw: str) -> str:
    """Remove markdown code fences from JSON responses."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3].strip()
    return raw

# Template metadata — defines required/optional fields per template
TEMPLATE_REGISTRY: dict[str, dict] = {
    "rental_agreement": {
        "name": "Rental / Lease Agreement",
        "description": "Standard residential or commercial rental agreement under Indian law.",
        "required_fields": [
            "landlord_name", "tenant_name", "property_address",
            "monthly_rent", "security_deposit", "lease_start_date", "lease_duration_months",
        ],
        "optional_fields": [
            "landlord_address", "tenant_address", "purpose",
            "maintenance_charges", "notice_period_days", "escalation_percent",
            "furnishing_details", "restrictions",
        ],
    },
    "nda": {
        "name": "Non-Disclosure Agreement",
        "description": "Mutual or one-way NDA for protecting confidential information.",
        "required_fields": [
            "disclosing_party", "receiving_party", "effective_date", "purpose",
        ],
        "optional_fields": [
            "disclosing_party_address", "receiving_party_address",
            "duration_years", "governing_law", "jurisdiction",
            "mutual", "exclusions",
        ],
    },
    "service_agreement": {
        "name": "Service Agreement",
        "description": "Agreement for professional or consulting services.",
        "required_fields": [
            "service_provider", "client_name", "services_description",
            "compensation", "start_date", "end_date",
        ],
        "optional_fields": [
            "provider_address", "client_address", "payment_terms",
            "deliverables", "termination_notice_days", "governing_law",
        ],
    },
    "power_of_attorney": {
        "name": "Power of Attorney",
        "description": "General or special power of attorney under Indian law.",
        "required_fields": [
            "principal_name", "agent_name", "powers_granted", "effective_date",
        ],
        "optional_fields": [
            "principal_address", "agent_address",
            "expiry_date", "revocable", "scope_limitations",
        ],
    },
    "legal_notice": {
        "name": "Legal Notice",
        "description": "Formal legal notice under Section 80 CPC or general demand notice.",
        "required_fields": [
            "sender_name", "sender_address", "recipient_name", "recipient_address",
            "subject", "facts", "demand", "notice_date",
        ],
        "optional_fields": [
            "sender_advocate", "reply_deadline_days", "legal_provisions",
        ],
    },
}


def _get_env() -> Environment:
    templates_dir = settings.document_templates_dir
    if not os.path.isabs(templates_dir):
        templates_dir = str(Path(__file__).resolve().parent.parent / templates_dir.lstrip("app/"))
    return Environment(
        loader=FileSystemLoader(templates_dir),
        trim_blocks=True,
        lstrip_blocks=True,
    )


def list_templates() -> list[dict]:
    return [
        {
            "template_id": tid,
            "name": meta["name"],
            "description": meta["description"],
            "required_fields": meta["required_fields"],
            "optional_fields": meta.get("optional_fields", []),
        }
        for tid, meta in TEMPLATE_REGISTRY.items()
    ]


def generate_draft(template_id: str, params: dict, ai_enhance: bool = False) -> str:
    if template_id not in TEMPLATE_REGISTRY:
        raise ValueError(f"Unknown template: {template_id}")

    meta = TEMPLATE_REGISTRY[template_id]
    missing = [f for f in meta["required_fields"] if f not in params or not params[f]]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    env = _get_env()
    try:
        template = env.get_template(f"{template_id}.md")
    except TemplateNotFound:
        raise ValueError(f"Template file not found: {template_id}.md")

    return template.render(**params)


async def generate_draft_enhanced(template_id: str, params: dict) -> str:
    """Generate from template, then ask Gemini to review and add missing clauses."""
    base = generate_draft(template_id, params)
    if not settings.gemini_api_key:
        return base

    client = _get_genai_client()
    prompt = f"""You are an expert Indian legal drafter. Below is a draft {TEMPLATE_REGISTRY[template_id]['name']}.

Review it and enhance it by:
1. Adding any important clauses that are missing (indemnity, force majeure, limitation of liability, etc. as applicable)
2. Making the language more legally precise
3. Adding relevant Indian legal references where appropriate

Return the COMPLETE enhanced document in markdown format. Keep all existing content, only add/improve.

Draft:
{base}"""

    response = await client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
    )
    return response.text.strip()


async def draft_from_description(description: str) -> dict:
    """Given a natural language description, pick the best template and extract params."""
    if not settings.gemini_api_key:
        raise ValueError("AI features require GEMINI_API_KEY")

    client = _get_genai_client()

    template_summary = json.dumps({
        tid: {"name": m["name"], "required_fields": m["required_fields"], "optional_fields": m.get("optional_fields", [])}
        for tid, m in TEMPLATE_REGISTRY.items()
    }, indent=2)

    prompt = f"""You are a legal assistant. A user described a document they need:

"{description}"

Available templates:
{template_summary}

Your task:
1. Pick the best matching template_id (or "custom" if none fit)
2. Extract all required and optional field values from the description
3. For any required fields not mentioned, use reasonable placeholder values marked with [PLACEHOLDER]

Respond in JSON:
{{
  "template_id": "...",
  "params": {{"field": "value", ...}},
  "suggestions": ["any suggestions for the user about missing info"]
}}

Respond ONLY with valid JSON, no markdown fences."""

    response = await client.aio.models.generate_content(
        model=settings.gemini_lite_model,
        contents=prompt,
    )

    raw = _strip_json_fences(response.text)
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        raise ValueError("AI could not parse your description. Please try again with more detail.")

    tid = result.get("template_id", "custom")
    params = result.get("params", {})
    suggestions = result.get("suggestions", [])

    if tid != "custom" and tid in TEMPLATE_REGISTRY:
        content = generate_draft(tid, params)
    else:
        content = await _generate_custom_agreement(description)
        tid = "custom"

    return {
        "template_id": tid,
        "content": content,
        "params": params,
        "suggestions": suggestions,
    }


async def _generate_custom_agreement(description: str) -> str:
    """Generate a fully custom agreement using AI when no template fits."""
    client = _get_genai_client()
    prompt = f"""You are an expert Indian legal drafter. Draft a complete legal agreement based on this description:

"{description}"

Requirements:
- Use formal legal language appropriate for Indian law
- Include all standard clauses (definitions, term, obligations, indemnity, dispute resolution, governing law, etc.)
- Format in clean markdown with proper headings
- Include signature blocks at the end
- Reference applicable Indian laws where relevant

Generate the COMPLETE agreement."""

    response = await client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
    )
    return response.text.strip()


async def parse_contract(text: str) -> dict:
    """Extract key terms from contract text using Gemini (if configured) or basic extraction."""
    if settings.gemini_api_key:
        return await _parse_with_gemini(text)
    return _parse_basic(text)


async def _parse_with_gemini(text: str) -> dict:
    """Use Gemini to extract structured data from contract text."""
    client = _get_genai_client()

    prompt = f"""Analyze this legal contract and extract the following in JSON format:
- key_terms: list of {{"label", "value", "clause_ref"}} objects
- parties: list of party names
- effective_date: date string or null
- termination_date: date string or null
- obligations: list of key obligations
- risks: list of potential risks or unfavorable clauses

Contract text:
{text[:8000]}

Respond ONLY with valid JSON, no markdown fences."""

    response = await client.aio.models.generate_content(
        model=settings.gemini_lite_model,
        contents=prompt,
    )

    raw = _strip_json_fences(response.text)
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, AttributeError):
        return _parse_basic(text)


def _parse_basic(text: str) -> dict:
    """Fallback: extract basic info using pattern matching."""
    import re

    parties = []
    # Look for common party patterns
    for pattern in [
        r"(?:between|party of the first part)[:\s]+([A-Z][A-Za-z\s.]+?)(?:,|\(|and)",
        r"(?:and|party of the second part)[:\s]+([A-Z][A-Za-z\s.]+?)(?:,|\(|\n)",
    ]:
        matches = re.findall(pattern, text[:2000])
        parties.extend([m.strip() for m in matches])

    # Look for dates
    dates = re.findall(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}", text[:3000])

    return {
        "key_terms": [],
        "parties": list(set(parties))[:10],
        "effective_date": dates[0] if dates else None,
        "termination_date": dates[1] if len(dates) > 1 else None,
        "obligations": [],
        "risks": [],
    }
