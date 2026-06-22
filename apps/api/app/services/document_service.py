"""Document generation service — template-based contract/agreement drafting."""
from __future__ import annotations

import base64
import json
import os
import re
from datetime import datetime
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


INDIAN_STATES_AND_UTS = {
    "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa",
    "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka", "kerala",
    "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland",
    "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana", "tripura",
    "uttar pradesh", "uttarakhand", "west bengal", "andaman and nicobar islands",
    "chandigarh", "dadra and nagar haveli and daman and diu", "delhi", "jammu and kashmir",
    "ladakh", "lakshadweep", "puducherry",
}

AADHAAR_RE = re.compile(r"^\d{12}$")
NAME_RE = re.compile(r"^[A-Za-z][A-Za-z .'-]{1,79}$")


def _normalize_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _normalize_aadhaar(value: object) -> str:
    return re.sub(r"\D+", "", str(value or ""))


def _looks_like_gibberish(value: str) -> bool:
    compact = re.sub(r"[^A-Za-z]", "", value).lower()
    if len(compact) < 7:
        return False
    vowels = sum(1 for char in compact if char in "aeiou")
    vowel_ratio = vowels / max(len(compact), 1)
    return vowel_ratio < 0.18


def _parse_supported_date(value: str) -> bool:
    text = _normalize_text(value)
    text = re.sub(r"\s*([/-])\s*", r"\1", text)
    text = re.sub(r"\s*,\s*", ", ", text)
    text = text.replace(".", "/")
    for fmt in (
        "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y",
        "%d %B %Y", "%d %b %Y", "%B %d, %Y", "%b %d, %Y",
        "%B %d %Y", "%b %d %Y", "%Y-%m-%d",
    ):
        try:
            datetime.strptime(text, fmt)
            return True
        except ValueError:
            continue
    return False


def _ordinal(value: str) -> str:
    digits = re.sub(r"\D+", "", str(value or ""))
    if not digits:
        return str(value or "")
    number = int(digits)
    if 10 <= number % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(number % 10, "th")
    return f"{number}{suffix}"


def _build_government_deposit_return_policy(jurisdiction: str) -> str:
    normalized_jurisdiction = _normalize_text(jurisdiction) or "the stated jurisdiction"
    return (
        f"Under the rental-law framework commonly followed in India, including the Model Tenancy Act principles "
        f"reported as requiring return of the security deposit within one month after vacant possession and final reconciliation, "
        f"the landlord shall return the refundable security deposit within 30 days from the date the tenant hands over vacant and peaceful possession of the premises in {normalized_jurisdiction}. "
        f"The landlord may deduct only clearly itemised and supportable amounts for unpaid rent, unpaid utility charges contractually payable by the tenant, "
        f"and documented physical damage beyond ordinary wear and tear. Any deduction shall be shared with the tenant in writing together with available bills, estimates, or computation details, "
        f"and the undisputed balance shall be released without delay. Normal ageing, minor scuffs, ordinary fading, and routine wear from reasonable residential use shall not be treated as deductible damage. "
        f"This clause should operate subject to any stricter rule that applies under the governing state or local tenancy law."
    )


def _stamp_asset_path(stamp_amount: str) -> Path:
    filename = f"non-judicial-{stamp_amount}.png"
    configured_dir = os.getenv("DOCUMENT_STAMP_ASSETS_DIR") or getattr(settings, "document_stamp_assets_dir", None)
    search_roots: list[Path] = []

    if configured_dir:
        search_roots.append(Path(configured_dir))

    current_file = Path(__file__).resolve()
    for parent in current_file.parents:
        search_roots.extend(
            [
                parent / "public" / "stamps",
                parent / "app" / "public" / "stamps",
                parent / "apps" / "web" / "public" / "stamps",
            ]
        )

    seen: set[Path] = set()
    for directory in search_roots:
        if directory in seen:
            continue
        seen.add(directory)
        candidate = directory / filename
        if candidate.exists():
            return candidate

    return search_roots[0] / filename if search_roots else Path(filename)


def _build_stamp_data_uri(stamp_amount: str) -> str | None:
    stamp_path = _stamp_asset_path(stamp_amount)
    if not stamp_path.exists():
        return None
    try:
        encoded = base64.b64encode(stamp_path.read_bytes()).decode("ascii")
    except OSError:
        return None
    return f"data:image/png;base64,{encoded}"


def _validate_rental_fields_basic(params: dict) -> list[str]:
    errors: list[str] = []

    required_name_fields = ("landlord_name", "tenant_name")
    for field in required_name_fields:
        value = _normalize_text(params.get(field))
        if not NAME_RE.fullmatch(value) or value.isdigit():
            errors.append(f"{field.replace('_', ' ').title()} must look like a real person name.")

    signature_name_fields = (
        ("landlord_signature", True),
        ("tenant_signature", True),
        ("witness_signature", False),
    )
    for field, required in signature_name_fields:
        value = _normalize_text(params.get(field))
        if not value:
            if required:
                errors.append(f"{field.replace('_', ' ').title()} must look like a real person name.")
            continue
        if not NAME_RE.fullmatch(value) or value.isdigit():
            errors.append(f"{field.replace('_', ' ').title()} must look like a real person name.")

    for field in ("landlord_adhar_no", "tenant_adhar_no"):
        value = _normalize_aadhaar(params.get(field, ""))
        if not AADHAAR_RE.fullmatch(value):
            errors.append(f"{field.replace('_', ' ').title()} must be a 12-digit Aadhaar number.")

    for field in ("landlord_address", "tenant_address", "property_address"):
        value = _normalize_text(params.get(field))
        if len(value) < 8:
            errors.append(f"{field.replace('_', ' ').title()} is too short for a legal agreement.")
        elif _looks_like_gibberish(value):
            errors.append(f"{field.replace('_', ' ').title()} does not look like a usable address.")

    state = _normalize_text(params.get("state")).lower()
    if state and state not in INDIAN_STATES_AND_UTS:
        errors.append("State must be a valid Indian state or union territory.")

    if str(params.get("stamp_amount", "")).strip() not in {"10", "20", "50", "100"}:
        errors.append("Stamp Amount must be one of Rs.10, Rs.20, Rs.50, or Rs.100.")

    for field in ("monthly_rent", "security_deposit", "rent_due_date", "number_of_bedrooms", "number_of_bathrooms", "notice_required_to_terminate"):
        value = _normalize_text(params.get(field))
        if value and not value.isdigit():
            errors.append(f"{field.replace('_', ' ').title()} must be numeric.")

    if _normalize_text(params.get("tenant_name")).isdigit():
        errors.append("Tenant Full Name cannot be only numbers.")

    for field in ("lease_start_date", "lease_end_date", "agreement_date"):
        value = _normalize_text(params.get(field))
        if value and not _parse_supported_date(value):
            errors.append(f"{field.replace('_', ' ').title()} must be a real date.")

    return errors


async def _validate_rental_fields_with_llm(params: dict) -> list[str]:
    if not settings.gemini_api_key:
        return []

    client = _get_genai_client()
    review_fields = {
        key: params.get(key)
        for key in (
            "landlord_name", "landlord_address",
            "tenant_name", "tenant_address",
            "property_address", "state", "jurisdiction",
        )
    }
    prompt = f"""You are validating a rental-agreement intake form for India.
Review these fields and detect user inputs that are fake, incomplete, numeric-only where a name is expected, or unsuitable for a legal agreement.

Return valid JSON:
{{
  "errors": ["..."]
}}

Only report concrete validation problems. If a field is acceptable, do not mention it.
Fields:
{json.dumps(review_fields, ensure_ascii=True)}"""

    response = await client.aio.models.generate_content(
        model=settings.gemini_lite_model,
        contents=prompt,
    )
    raw = _strip_json_fences(response.text)
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return []

    llm_errors = parsed.get("errors", [])
    if not isinstance(llm_errors, list):
        return []
    return [_normalize_text(item) for item in llm_errors if _normalize_text(item)]


def _filter_rental_llm_errors(params: dict, llm_errors: list[str]) -> list[str]:
    filtered: list[str] = []
    valid_aadhaar_fields = {
        "landlord adhar no": AADHAAR_RE.fullmatch(_normalize_aadhaar(params.get("landlord_adhar_no", ""))) is not None,
        "tenant adhar no": AADHAAR_RE.fullmatch(_normalize_aadhaar(params.get("tenant_adhar_no", ""))) is not None,
        "landlord aadhaar no": AADHAAR_RE.fullmatch(_normalize_aadhaar(params.get("landlord_adhar_no", ""))) is not None,
        "tenant aadhaar no": AADHAAR_RE.fullmatch(_normalize_aadhaar(params.get("tenant_adhar_no", ""))) is not None,
    }
    valid_date_fields = {
        "lease start date": _parse_supported_date(params.get("lease_start_date", "")),
        "lease end date": _parse_supported_date(params.get("lease_end_date", "")),
        "agreement date": _parse_supported_date(params.get("agreement_date", "")),
    }
    valid_address_fields = {
        "landlord address": not any(msg.startswith("Landlord Address ") for msg in _validate_rental_fields_basic({
            "landlord_name": "Placeholder Name",
            "tenant_name": "Placeholder Tenant",
            "landlord_adhar_no": "123456789012",
            "tenant_adhar_no": "123456789012",
            "landlord_address": params.get("landlord_address", ""),
            "tenant_address": "Placeholder Tenant Address",
            "property_address": "Placeholder Property Address",
            "state": "Telangana",
            "stamp_amount": "10",
            "monthly_rent": "1",
            "security_deposit": "1",
            "rent_due_date": "1",
            "number_of_bedrooms": "1",
            "number_of_bathrooms": "1",
            "notice_required_to_terminate": "1",
            "lease_start_date": "01/01/2026",
            "lease_end_date": "",
            "agreement_date": "01/01/2026",
        })),
        "tenant address": not any(msg.startswith("Tenant Address ") for msg in _validate_rental_fields_basic({
            "landlord_name": "Placeholder Name",
            "tenant_name": "Placeholder Tenant",
            "landlord_adhar_no": "123456789012",
            "tenant_adhar_no": "123456789012",
            "landlord_address": "Placeholder Landlord Address",
            "tenant_address": params.get("tenant_address", ""),
            "property_address": "Placeholder Property Address",
            "state": "Telangana",
            "stamp_amount": "10",
            "monthly_rent": "1",
            "security_deposit": "1",
            "rent_due_date": "1",
            "number_of_bedrooms": "1",
            "number_of_bathrooms": "1",
            "notice_required_to_terminate": "1",
            "lease_start_date": "01/01/2026",
            "lease_end_date": "",
            "agreement_date": "01/01/2026",
        })),
        "property address": not any(msg.startswith("Property Address ") for msg in _validate_rental_fields_basic({
            "landlord_name": "Placeholder Name",
            "tenant_name": "Placeholder Tenant",
            "landlord_adhar_no": "123456789012",
            "tenant_adhar_no": "123456789012",
            "landlord_address": "Placeholder Landlord Address",
            "tenant_address": "Placeholder Tenant Address",
            "property_address": params.get("property_address", ""),
            "state": "Telangana",
            "stamp_amount": "10",
            "monthly_rent": "1",
            "security_deposit": "1",
            "rent_due_date": "1",
            "number_of_bedrooms": "1",
            "number_of_bathrooms": "1",
            "notice_required_to_terminate": "1",
            "lease_start_date": "01/01/2026",
            "lease_end_date": "",
            "agreement_date": "01/01/2026",
        })),
    }

    for error in llm_errors:
        normalized = _normalize_text(error).lower()
        if any(label in normalized and is_valid for label, is_valid in valid_aadhaar_fields.items()):
            continue
        if any(label in normalized and is_valid for label, is_valid in valid_date_fields.items()):
            continue
        if any(label in normalized and is_valid for label, is_valid in valid_address_fields.items()):
            continue
        filtered.append(error)
    return filtered


async def validate_document_params(template_id: str, params: dict) -> dict:
    cleaned = {key: _normalize_text(value) for key, value in params.items()}

    if template_id != "rental_agreement":
        return cleaned

    for field in ("landlord_adhar_no", "tenant_adhar_no"):
        if field in cleaned:
            cleaned[field] = _normalize_aadhaar(cleaned[field])

    errors = _validate_rental_fields_basic(cleaned)
    llm_errors = _filter_rental_llm_errors(
        cleaned,
        await _validate_rental_fields_with_llm(cleaned),
    )
    for error in llm_errors:
        if error not in errors:
            errors.append(error)

    if errors:
        raise ValueError("Please correct the rental-agreement form before generating:\n- " + "\n- ".join(errors))

    cleaned["government_deposit_return_policy"] = _build_government_deposit_return_policy(
        cleaned.get("jurisdiction") or cleaned.get("state") or "the stated jurisdiction",
    )
    stamp_amount = cleaned.get("stamp_amount", "")
    cleaned["stamp_image_data_uri"] = _build_stamp_data_uri(stamp_amount)
    cleaned["stamp_image_src"] = cleaned["stamp_image_data_uri"] or f"/stamps/non-judicial-{stamp_amount or '10'}.png"
    cleaned["rent_due_day_label"] = _ordinal(cleaned.get("rent_due_date", ""))
    return cleaned

# Template metadata — defines required/optional fields per template
TEMPLATE_REGISTRY: dict[str, dict] = {
    "rental_agreement": {
        "name": "Rental / Lease Agreement",
        "description": "Guided Indian rental agreement with stamp-paper style layout, party details, and lease clauses.",
        "required_fields": [
            "state",
            "stamp_amount",
            "landlord_name",
            "landlord_address",
            "landlord_adhar_no",
            "tenant_name",
            "tenant_address",
            "tenant_adhar_no",
            "property_address",
            "property_type",
            "number_of_bedrooms",
            "number_of_bathrooms",
            "lease_type",
            "lease_start_date",
            "monthly_rent",
            "rent_due_date",
            "security_deposit",
            "electricity_paid_by",
            "water_paid_by",
            "renewal_option_allowed",
            "notice_required_to_terminate",
            "agreement_date",
            "jurisdiction",
            "agreement_language",
            "landlord_signature",
            "tenant_signature",
        ],
        "optional_fields": [
            "document_format",
            "reference_doc_label",
            "lease_end_date",
            "lease_duration_months",
            "minimum_number_of_occupants",
            "subletting_allowed",
            "subletting_terms",
            "guest_policy_description",
            "alterations_allowed",
            "alteration_approval_process",
            "painting_allowed",
            "nails_and_holes_policy",
            "smoking_allowed",
            "drug_policy_description",
            "criminal_activity_policy",
            "legal_use_of_premises_policy",
            "assignment_transfer_policy",
            "move_out_condition_requirements",
            "cleaning_deposit_required",
            "cleaning_deposit_amount",
            "document_version_number",
            "witness_signature",
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

    if template_id == "rental_agreement":
        params = {
            **params,
            "government_deposit_return_policy": params.get("government_deposit_return_policy")
            or _build_government_deposit_return_policy(params.get("jurisdiction") or params.get("state") or ""),
        }

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
IMPORTANT: DO NOT use markdown tables. Present any structured data or signature blocks using plain rich text structuring (like headings, lists, or line breaks).

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
- IMPORTANT: DO NOT use markdown tables for anything (including signature blocks). Present everything as structured rich text using lists, indents, or paragraphs.

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
