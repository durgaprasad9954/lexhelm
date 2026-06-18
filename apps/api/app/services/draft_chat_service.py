"""Draft chat service — conversational document drafting with 3-layer field extraction."""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import settings
from app.models.draft_sessions import DraftMessage, DraftSession
from app.services.document_service import (
    TEMPLATE_REGISTRY,
    _get_genai_client,
    _strip_json_fences,
    generate_draft,
)

logger = logging.getLogger(__name__)

_RELATIVE_DATE_VALUES = {
    "today", "tomorrow", "next week", "next month",
    "immediately", "asap", "right away",
}


def _parse_supported_date(value: str) -> Optional[datetime]:
    text = value.strip()
    for fmt in (
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d/%m/%y",
        "%d-%m-%y",
        "%d %B %Y",
        "%d %b %Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%B %d %Y",
        "%b %d %Y",
        "%B %Y",
        "%b %Y",
    ):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


# ── Layer 1: Context-Aware Extraction (zero latency) ────────────


def _looks_like_multi_answer(message: str, field_name: str | None = None) -> bool:
    """Detect if a message contains multiple answers (e.g., 'tomorrow and software consultation')."""
    lower = message.lower().strip()
    # Some fields naturally contain commas or multiple words.
    if field_name in _ADDRESS_FIELDS | _DATE_FIELDS | _LONG_TEXT_FIELDS:
        return False
    # Comma-separated or "and"-joined parts with distinct concepts
    if re.search(r"\band\b", lower) and len(lower.split()) > 3:
        return True
    # Multiple comma-separated parts
    parts = [p.strip() for p in lower.split(",") if p.strip()]
    if len(parts) >= 2:
        return True
    return False


def _extract_with_context(
    message: str, last_asked_field: str | None, template_id: str | None,
) -> dict:
    """Direct answer mapping when we know what field was just asked.
    Only handles clear single-value answers. Multi-value answers are deferred to AI.
    """
    if not last_asked_field or not template_id:
        return {}

    # If message looks like multiple answers, skip context extraction
    # and let the AI layer handle splitting them properly
    if _looks_like_multi_answer(message, last_asked_field):
        return {}

    lower = message.lower().strip()
    result: dict = {}

    # Date fields — match structured dates AND relative dates
    date_fields = {
        "lease_start_date", "effective_date", "start_date", "end_date",
        "notice_date", "expiry_date",
    }
    if last_asked_field in date_fields:
        # Relative dates
        if lower in _RELATIVE_DATE_VALUES:
            return {last_asked_field: message.strip()}

        # Structured date formats
        date_patterns = [
            r"(\d+[/-]\d+[/-]\d+)",
            r"(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})",
            r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s+\d{4})",
            r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})",
        ]
        for pat in date_patterns:
            m = re.search(pat, lower, re.IGNORECASE)
            if m:
                candidate = m.group(1).strip()
                if _validate_field_value(last_asked_field, candidate):
                    return {last_asked_field: candidate}

    # Numeric fields
    numeric_fields = {
        "monthly_rent", "security_deposit", "maintenance_charges",
        "notice_period_days", "escalation_percent", "lease_duration_months",
        "compensation", "duration_years", "reply_deadline_days",
        "termination_notice_days",
    }
    if last_asked_field in numeric_fields:
        m = re.search(r"[\₹$]?\s*(\d[\d,]*\.?\d*)\s*([kKmMlL](?:akh)?)?", lower)
        if m:
            num = float(m[1].replace(",", ""))
            suffix = (m[2] or "").lower()
            if suffix.startswith("k"):
                num *= 1_000
            elif suffix.startswith("l"):
                num *= 100_000
            elif suffix.startswith("m"):
                num *= 1_000_000
            return {last_asked_field: str(int(num)) if num == int(num) else str(num)}

    text = message.strip()
    text_len = len(text)
    if last_asked_field in _NAME_FIELDS:
        if (
            text_len >= 2
            and text_len <= 80
            and not text.endswith("?")
            and _is_real_name(text)
        ):
            normalized_name = " ".join(part.capitalize() for part in text.split())
            return {last_asked_field: normalized_name}

    if last_asked_field in _ADDRESS_FIELDS:
        normalized_address = re.sub(r"\s+", " ", text).strip(" ,")
        if _validate_field_value(last_asked_field, normalized_address):
            return {last_asked_field: normalized_address}

    # Long free-text fields can accept a sentence or short phrase.
    if last_asked_field in _LONG_TEXT_FIELDS and text_len >= 4 and not text.endswith("?"):
        if _validate_field_value(last_asked_field, text):
            return {last_asked_field: text}

    # Generic short-text fallback only for fields that are not strongly typed.
    is_untyped_field = (
        last_asked_field not in _NAME_FIELDS
        and last_asked_field not in _ADDRESS_FIELDS
        and last_asked_field not in _DATE_FIELDS
        and last_asked_field not in _NUMERIC_FIELDS
    )
    if (
        is_untyped_field
        and text_len > 1
        and text_len <= 100
        and not text.endswith("?")
        and text.count(" ") <= 6
    ):
        if _validate_field_value(last_asked_field, text):
            return {last_asked_field: text}

    return result


# ── Layer 2: Rule-Based Extraction (regex, no AI call) ───────────

# Generic / placeholder terms that should NOT be accepted as real party names
_GENERIC_NAMES = {
    "my company", "our company", "the company", "a company", "company",
    "my firm", "our firm", "the firm", "a firm", "firm",
    "a vendor", "the vendor", "vendor", "my vendor", "our vendor",
    "a client", "the client", "client", "my client", "our client",
    "a party", "the party", "party", "first party", "second party",
    "a contractor", "the contractor", "contractor",
    "a consultant", "the consultant", "consultant",
    "a freelancer", "the freelancer", "freelancer",
    "a tenant", "the tenant", "tenant", "a landlord", "the landlord", "landlord",
    "a person", "the person", "someone", "anybody",
    "me", "myself", "i", "us", "we", "them", "they", "him", "her",
}


def _is_real_name(name: str):
    """Check if a name is a real proper name, not a generic placeholder."""
    normalized = re.sub(r"\s+", " ", name).strip()
    if len(normalized) <= 1 or normalized.lower() in _GENERIC_NAMES:
        return False
    if not re.search(r"[A-Za-z]", normalized):
        return False
    if re.fullmatch(r"[\d\s.,+-]+", normalized):
        return False
    return True


_NAME_FIELDS = {
    "landlord_name", "tenant_name", "disclosing_party", "receiving_party",
    "service_provider", "client_name", "principal_name", "agent_name",
    "sender_name", "recipient_name",
}
_ADDRESS_FIELDS = {
    "property_address", "landlord_address", "tenant_address",
    "disclosing_party_address", "receiving_party_address",
    "provider_address", "client_address", "principal_address", "agent_address",
    "sender_address", "recipient_address",
}
_NUMERIC_FIELDS = {
    "monthly_rent", "security_deposit", "maintenance_charges",
    "notice_period_days", "escalation_percent", "lease_duration_months",
    "compensation", "duration_years", "reply_deadline_days",
    "termination_notice_days",
}
_DATE_FIELDS = {
    "lease_start_date", "effective_date", "start_date", "end_date",
    "notice_date", "expiry_date",
}
_LONG_TEXT_FIELDS = {
    "purpose", "furnishing_details", "restrictions", "services_description",
    "deliverables", "powers_granted", "scope_limitations", "subject",
    "facts", "demand", "legal_provisions", "exclusions",
}


def _validate_field_value(field_name: str, value: object):
    """Check whether an extracted value is plausible for the target field."""
    if value is None:
        return False

    text = str(value).strip()
    if not text:
        return False

    if field_name in _NAME_FIELDS:
        return _is_real_name(text) and len(text.split()) <= 8

    if field_name in _ADDRESS_FIELDS:
        words = text.split()
        return len(text) >= 8 and len(words) >= 2

    if field_name in _NUMERIC_FIELDS:
        if not re.fullmatch(r"\d+(?:\.\d+)?", text):
            return False
        number = float(text)
        if field_name.endswith("_days"):
            return 1 <= number <= 365
        if field_name == "lease_duration_months":
            return 1 <= number <= 600
        if field_name == "duration_years":
            return 1 <= number <= 100
        if field_name == "escalation_percent":
            return 0 <= number <= 100
        return number >= 0

    if field_name in _DATE_FIELDS:
        lower = text.lower()
        if lower in _RELATIVE_DATE_VALUES:
            return True
        return _parse_supported_date(text) is not None

    if field_name in _LONG_TEXT_FIELDS:
        return len(text) >= 4

    return len(text) >= 2


def _filter_extracted_fields(extracted: dict) -> dict:
    """Drop extracted values that do not match the expected field shape."""
    return {
        key: value
        for key, value in extracted.items()
        if _validate_field_value(key, value)
    }


def _build_retry_prompt(field_name: str | None) -> str:
    """Ask the user to answer the current missing field more directly."""
    if not field_name:
        return "I still need a bit more detail before I can continue. Could you answer the last question more directly?"

    prompts = {
        "landlord_name": "I need the landlord's full name. Please reply with just the landlord name.",
        "tenant_name": "I need the tenant's full name. Please reply with just the tenant name.",
        "property_address": "I need the full rental property address. Please share the complete address.",
        "landlord_address": "I need the landlord's native address as per Aadhaar card. Please share the complete address.",
        "tenant_address": "I need the tenant's native address as per Aadhaar card. Please share the complete address.",
        "monthly_rent": "I need the monthly rent amount. Please reply with only the amount, for example 25000.",
        "security_deposit": "I need the security deposit amount. Please reply with only the amount.",
        "lease_start_date": "I need the lease start date. Please reply with a real calendar date like 15/06/2026 or 15 June 2026.",
        "lease_duration_months": "I need the lease duration. Please reply with the number of months, for example 11.",
    }
    return prompts.get(field_name, f"I still need the {_field_label(field_name)}. Please reply with just that answer.")


def _extract_with_rules(message: str, template_id: str | None) -> dict:
    """Pattern-match common phrases regardless of conversation context."""
    result: dict = {}
    if not template_id:
        return result

    meta = TEMPLATE_REGISTRY.get(template_id)
    if not meta:
        return result

    all_fields = set(meta["required_fields"]) | set(meta.get("optional_fields", []))

    # Party name patterns — only accept proper names
    _name_rx = r"([A-Z][A-Za-z\s.]+?)(?:,|\.|$|\band\b|\bas\b)"
    if "landlord_name" in all_fields:
        m = re.search(r"(?:landlord|owner)\s+(?:is|named?|:)\s*" + _name_rx, message, re.I)
        if m and _is_real_name(m.group(1)):
            result["landlord_name"] = m.group(1).strip()
    if "tenant_name" in all_fields:
        m = re.search(r"(?:tenant|lessee|renter)\s+(?:is|named?|:)\s*" + _name_rx, message, re.I)
        if m and _is_real_name(m.group(1)):
            result["tenant_name"] = m.group(1).strip()

    # "between X and Y" pattern for party pairs — only if both are real names
    m = re.search(r"between\s+(.+?)\s+and\s+(.+?)(?:\.|,|$)", message, re.I)
    if m:
        p1, p2 = m.group(1).strip(), m.group(2).strip()
        p1_real, p2_real = _is_real_name(p1), _is_real_name(p2)
        if template_id == "rental_agreement":
            if p1_real and "landlord_name" not in result:
                result["landlord_name"] = p1
            if p2_real and "tenant_name" not in result:
                result["tenant_name"] = p2
        elif template_id == "nda":
            if p1_real:
                result.setdefault("disclosing_party", p1)
            if p2_real:
                result.setdefault("receiving_party", p2)
        elif template_id == "service_agreement":
            if p1_real:
                result.setdefault("service_provider", p1)
            if p2_real:
                result.setdefault("client_name", p2)
        elif template_id == "power_of_attorney":
            if p1_real:
                result.setdefault("principal_name", p1)
            if p2_real:
                result.setdefault("agent_name", p2)

    # Rent / compensation amounts
    money_rx = r"(?:₹|rs\.?|inr)\s*(\d[\d,]*\.?\d*)\s*([kKlLmM](?:akh)?)?"
    if "monthly_rent" in all_fields:
        m = re.search(money_rx + r"\s*(?:per\s+month|/\s*month|monthly|p\.?m\.?)?", message, re.I)
        if m:
            num = float(m.group(1).replace(",", ""))
            suffix = (m.group(2) or "").lower()
            if suffix.startswith("k"):
                num *= 1_000
            elif suffix.startswith("l"):
                num *= 100_000
            result["monthly_rent"] = str(int(num))

    if "security_deposit" in all_fields:
        m = re.search(r"(?:deposit|security)\s+(?:of\s+)?" + money_rx, message, re.I)
        if m:
            num = float(m.group(1).replace(",", ""))
            suffix = (m.group(2) or "").lower()
            if suffix.startswith("k"):
                num *= 1_000
            elif suffix.startswith("l"):
                num *= 100_000
            result["security_deposit"] = str(int(num))

    # Address patterns
    address_fields = {"property_address", "landlord_address", "tenant_address",
                      "sender_address", "recipient_address"}
    for af in address_fields & all_fields:
        keyword = af.replace("_address", "").replace("property", "")
        pattern = r"(?:address|located?\s+at|at|in)\s+(.+?)(?:\.|$)"
        if keyword:
            pattern = rf"(?:{keyword}\s+)?{pattern}"
        m = re.search(pattern, message, re.I)
        if m and len(m.group(1).strip()) > 5:
            result.setdefault(af, m.group(1).strip())

    # Duration patterns
    if "lease_duration_months" in all_fields:
        m = re.search(r"(\d+)\s*months?", message, re.I)
        if m:
            result["lease_duration_months"] = m.group(1)
        m = re.search(r"(\d+)\s*years?", message, re.I)
        if m:
            result["lease_duration_months"] = str(int(m.group(1)) * 12)

    if "duration_years" in all_fields:
        m = re.search(r"(\d+)\s*years?", message, re.I)
        if m:
            result["duration_years"] = m.group(1)

    # Date patterns (generic)
    date_fields_in_scope = {"lease_start_date", "effective_date", "start_date",
                            "end_date", "notice_date"} & all_fields
    for df in date_fields_in_scope:
        keyword = df.replace("_date", "").replace("_", " ")
        kw_alts = {
            "lease start": r"(?:start(?:ing)?|from|commenc)",
            "effective": r"(?:effective|start)",
            "start": r"(?:start(?:ing)?|from|begin)",
            "end": r"(?:end(?:ing)?|until|till|to)",
            "notice": r"(?:dated?|on)",
        }
        kw = kw_alts.get(keyword, keyword)
        date_pat = r"(\d+[/-]\d+[/-]\d+|\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{4})"
        m = re.search(kw + r"\s+" + date_pat, message, re.I)
        if m:
            result.setdefault(df, m.group(1).strip())

    return result


# ── Layer 3: AI Extraction (Gemini) ──────────────────────────────


async def _extract_with_ai(
    message: str,
    template_id: str,
    already_collected: dict,
    history_text: str,
) -> dict:
    """Use Gemini to extract fields from the user message."""
    if not settings.gemini_api_key:
        return {}

    meta = TEMPLATE_REGISTRY.get(template_id)
    if not meta:
        return {}

    all_fields = meta["required_fields"] + meta.get("optional_fields", [])
    missing = [f for f in all_fields if f not in already_collected]
    if not missing:
        return {}

    client = _get_genai_client()
    prompt = f"""Extract document field values from this conversation message.

Template: {meta['name']}
Fields still needed: {json.dumps(missing)}
Already collected: {json.dumps(already_collected)}

Recent conversation:
{history_text[-2000:]}

Latest user message: "{message}"

Rules:
- Only extract fields that are explicitly stated or clearly implied in the latest message.
- Return null for any field that is absent or ambiguous.
- IMPORTANT: Do NOT accept generic/placeholder names as real values. "my company", "a vendor", "the client", "a contractor", "our firm" etc. are NOT real names — return null for those.
- Only accept actual proper names (e.g., "Acme Corp", "Rajesh Kumar", "TechVentures Pvt Ltd").
- For amounts: normalize to plain numbers (no currency symbols). "25k" → 25000, "2 lakh" → 200000.
- For dates: keep as stated by user.
- For addresses: capture the full address text.

Respond ONLY with a JSON object mapping field names to extracted values. No markdown fences.
Example: {{"field_name": "value", "other_field": null}}"""

    try:
        response = await client.aio.models.generate_content(
            model=settings.gemini_lite_model,
            contents=prompt,
        )
        raw = _strip_json_fences(response.text)
        extracted = json.loads(raw)
        # Filter out nulls, empty strings, and generic placeholder names
        name_fields = {
            "landlord_name", "tenant_name", "disclosing_party",
            "receiving_party", "service_provider", "client_name",
            "principal_name", "agent_name", "sender_name", "recipient_name",
        }
        result = {}
        for k, v in extracted.items():
            if not v or k not in all_fields:
                continue
            if k in name_fields and not _is_real_name(str(v)):
                continue
            result[k] = v
        return _filter_extracted_fields(result)
    except Exception as e:
        logger.warning(f"[DraftChat] AI extraction failed: {e}")
        return {}


# ── Template Identification ──────────────────────────────────────


async def _identify_template(message: str) -> str | None:
    """Use Gemini to match user description to a template."""
    if not settings.gemini_api_key:
        return None

    # Try rule-based first
    lower = message.lower()
    keyword_map = {
        "rental_agreement": ["rental", "rent", "lease", "tenant", "landlord", "flat", "apartment", "house"],
        "nda": ["nda", "non-disclosure", "confidential", "secrecy"],
        "service_agreement": ["service agreement", "consulting", "freelance", "service contract"],
        "power_of_attorney": ["power of attorney", "poa", "authorize", "authorise"],
        "legal_notice": ["legal notice", "demand notice", "notice under", "section 80"],
    }
    for tid, keywords in keyword_map.items():
        if any(kw in lower for kw in keywords):
            return tid

    # Fallback to AI
    client = _get_genai_client()
    template_list = "\n".join(
        f"- {tid}: {m['name']} — {m['description']}"
        for tid, m in TEMPLATE_REGISTRY.items()
    )
    prompt = f"""Match the user's document request to the best template.

Available templates:
{template_list}

User request: "{message}"

Respond with ONLY the template_id (e.g., "rental_agreement") or "custom" if none fit.
No explanation, no quotes around the answer."""

    try:
        response = await client.aio.models.generate_content(
            model=settings.gemini_lite_model,
            contents=prompt,
        )
        tid = response.text.strip().strip('"').strip("'")
        return tid if tid in TEMPLATE_REGISTRY else None
    except Exception:
        return None


# ── Conversation Response Generation ─────────────────────────────


def _field_label(field_key: str) -> str:
    """Convert field key to human-readable label."""
    custom_labels = {
        "landlord_address": "Landlord Native Address (Aadhaar Card)",
        "tenant_address": "Tenant Native Address (Aadhaar Card)",
        "lease_start_date": "Lease Start Date",
    }
    return custom_labels.get(field_key, field_key.replace("_", " ").title())


async def _generate_collection_response(
    template_id: str,
    collected: dict,
    missing: list[str],
    history_text: str,
) -> tuple[str, str | None]:
    """Generate a natural conversational question for missing fields.
    Returns (response_text, next_field_being_asked).
    """
    if not missing:
        return "I have all the information needed. Let me show you a summary.", None

    meta = TEMPLATE_REGISTRY.get(template_id, {})
    required = set(meta.get("required_fields", []))
    # Prioritize required fields
    required_missing = [f for f in missing if f in required]
    optional_missing = [f for f in missing if f not in required]
    ordered_missing = required_missing + optional_missing

    next_field = ordered_missing[0]

    if not settings.gemini_api_key:
        return f"Could you tell me the {_field_label(next_field)}?", next_field

    client = _get_genai_client()
    prompt = f"""You are a legal document drafting assistant. You are helping create a {meta.get('name', 'document')}.

Already collected: {json.dumps(collected, indent=2)}
Still needed (required marked with *):
{chr(10).join(f"  {'*' if f in required else '-'} {_field_label(f)}" for f in ordered_missing[:5])}

Recent conversation:
{history_text[-1500:]}

Ask for the next 1-2 missing fields naturally in 1-2 short sentences.
Be warm and direct. No filler words like "Great!" or "Perfect!".
No bullet points. No formal labels or colons.
If the user provided some info already, acknowledge briefly and move on."""

    try:
        response = await client.aio.models.generate_content(
            model=settings.gemini_lite_model,
            contents=prompt,
        )
        return response.text.strip(), next_field
    except Exception:
        return f"Could you tell me the {_field_label(next_field)}?", next_field


def _build_confirmation_summary(template_id: str, collected: dict) -> str:
    """Build a summary of collected fields for user confirmation."""
    meta = TEMPLATE_REGISTRY.get(template_id, {})
    required = set(meta.get("required_fields", []))

    lines = [f"Here's what I have for your **{meta.get('name', 'document')}**:\n"]
    for key, value in collected.items():
        marker = "(required)" if key in required else "(optional)"
        lines.append(f"- **{_field_label(key)}**: {value}")

    missing_optional = [
        f for f in meta.get("optional_fields", [])
        if f not in collected
    ]
    if missing_optional:
        lines.append(f"\nOptional fields not provided: {', '.join(_field_label(f) for f in missing_optional[:5])}")

    lines.append("\nWould you like me to **generate the document**, or do you want to change anything?")
    return "\n".join(lines)


# ── Session Management ───────────────────────────────────────────


async def create_session(
    session: AsyncSession,
    message: str,
    template_id: str | None = None,
    org_id: str | None = None,
    user_id: str | None = None,
) -> tuple[DraftSession, str]:
    """Create a new draft session and process the first message."""
    initial_missing = []
    if template_id and template_id in TEMPLATE_REGISTRY:
        initial_missing = list(TEMPLATE_REGISTRY[template_id]["required_fields"])

    draft = DraftSession(
        template_id=template_id if template_id and template_id in TEMPLATE_REGISTRY else None,
        phase="identify" if not (template_id and template_id in TEMPLATE_REGISTRY) else "collect",
        collected_fields={},
        missing_fields=initial_missing,
        org_id=org_id,
        user_id=user_id,
    )
    session.add(draft)
    await session.commit()
    await session.refresh(draft)

    # Re-fetch with messages eagerly loaded so process_turn can access them
    result = await session.execute(
        select(DraftSession)
        .options(selectinload(DraftSession.messages))
        .where(DraftSession.id == draft.id)
    )
    draft = result.scalar_one()

    # Process the first turn
    reply = await process_turn(session, draft, message)
    return draft, reply


async def create_generated_session(
    session: AsyncSession,
    template_id: str,
    collected_fields: dict,
    generated_content: str,
    org_id: str | None = None,
    user_id: str | None = None,
) -> DraftSession:
    draft = DraftSession(
        template_id=template_id,
        phase="done",
        collected_fields=collected_fields or {},
        missing_fields=[],
        generated_content=generated_content,
        status="completed",
        org_id=org_id,
        user_id=user_id,
    )
    session.add(draft)

    assistant_msg = DraftMessage(
        session=draft,
        role="assistant",
        content="Your document has been generated and saved.",
    )
    session.add(assistant_msg)
    await session.commit()
    await session.refresh(draft)
    return draft


async def get_session(db: AsyncSession, session_id: str) -> DraftSession | None:
    result = await db.execute(
        select(DraftSession)
        .options(selectinload(DraftSession.messages))
        .where(DraftSession.id == session_id)
    )
    return result.scalar_one_or_none()


async def list_sessions(
    db: AsyncSession,
    limit: int = 20,
    org_id: str | None = None,
    user_id: str | None = None,
) -> list[DraftSession]:
    stmt = select(DraftSession).options(selectinload(DraftSession.messages))
    if org_id:
        stmt = stmt.where(DraftSession.org_id == org_id)
    if user_id:
        stmt = stmt.where(DraftSession.user_id == user_id)
    result = await db.execute(
        stmt.order_by(DraftSession.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def save_generated_content(
    db: AsyncSession,
    draft: DraftSession,
    content: str,
) -> DraftSession:
    draft.generated_content = content
    draft.phase = "done"
    draft.status = "completed"
    await db.commit()
    await db.refresh(draft)
    return draft


# ── Core Turn Processing ─────────────────────────────────────────


async def process_turn(
    db: AsyncSession,
    draft: DraftSession,
    user_message: str,
) -> str:
    """Process a single conversation turn. Returns assistant response."""
    # Save user message
    user_msg = DraftMessage(
        session_id=draft.id,
        role="user",
        content=user_message,
    )
    db.add(user_msg)

    collected = dict(draft.collected_fields or {})

    # Build conversation history
    history = draft.messages[-10:] if draft.messages else []
    history_text = "\n".join(
        f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}"
        for m in history
    )
    history_text += f"\nUser: {user_message}"

    # ── Phase: Identify template ──
    if draft.phase == "identify" and not draft.template_id:
        tid = await _identify_template(user_message)
        if tid:
            draft.template_id = tid
            draft.phase = "collect"
            meta = TEMPLATE_REGISTRY[tid]
            draft.missing_fields = list(meta["required_fields"])
        else:
            # Can't identify template — ask for clarification
            reply = (
                "I can help you draft a legal document. What type do you need? "
                "I support rental agreements, NDAs, service agreements, "
                "power of attorney, and legal notices."
            )
            assistant_msg = DraftMessage(
                session_id=draft.id, role="assistant", content=reply,
            )
            db.add(assistant_msg)
            await db.commit()
            return reply

    # ── Phase: Handle confirmation response ──
    if draft.phase == "confirm":
        lower = user_message.lower().strip()
        affirmatives = {"yes", "yeah", "yep", "sure", "ok", "okay", "generate",
                        "go ahead", "looks good", "confirm", "proceed", "do it", "perfect"}
        if any(aff in lower for aff in affirmatives):
            return await _generate_and_respond(db, draft)
        else:
            # User wants to change something — go back to collect
            draft.phase = "collect"
            # Fall through to extraction below

    # ── 3-Layer Extraction ──
    extracted: dict = {}

    # Layer 1: Context-aware (fastest)
    ctx_extracted = _extract_with_context(
        user_message, draft.last_asked_field, draft.template_id,
    )
    extracted.update(ctx_extracted)

    # Layer 2: Rule-based regex
    rules_extracted = _extract_with_rules(user_message, draft.template_id)
    # Don't overwrite context extractions
    for k, v in rules_extracted.items():
        if k not in extracted:
            extracted[k] = v

    # Layer 3: AI extraction (runs when there are still missing fields)
    if draft.template_id:
        meta_check = TEMPLATE_REGISTRY.get(draft.template_id, {})
        still_missing = [
            f for f in meta_check.get("required_fields", [])
            if f not in collected and f not in extracted
        ]
        if still_missing:
            ai_extracted = await _extract_with_ai(
                user_message, draft.template_id,
                {**collected, **extracted}, history_text,
            )
            # Don't overwrite existing extractions
            for k, v in ai_extracted.items():
                if k not in extracted:
                    extracted[k] = v

    extracted = _filter_extracted_fields(extracted)

    # Merge into collected
    if extracted:
        collected.update(extracted)
        draft.collected_fields = collected

    # Save extraction on the user message
    user_msg.extracted_fields = extracted if extracted else None

    # Recalculate missing required fields
    meta = TEMPLATE_REGISTRY.get(draft.template_id or "", {})
    required = meta.get("required_fields", [])
    missing_required = [f for f in required if f not in collected]
    draft.missing_fields = missing_required

    # ── Decide next phase ──
    if (
        draft.last_asked_field
        and draft.last_asked_field not in extracted
        and draft.last_asked_field not in collected
    ):
        draft.phase = "collect"
        reply = _build_retry_prompt(draft.last_asked_field)
    elif not missing_required and draft.template_id:
        # All required fields collected — move to confirm
        draft.phase = "confirm"
        reply = _build_confirmation_summary(draft.template_id, collected)
        draft.last_asked_field = None
    else:
        # Still collecting
        draft.phase = "collect"
        reply, next_field = await _generate_collection_response(
            draft.template_id or "", collected, missing_required, history_text,
        )
        draft.last_asked_field = next_field

    # Save assistant response
    assistant_msg = DraftMessage(
        session_id=draft.id, role="assistant", content=reply,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(draft)

    return reply


async def _generate_and_respond(db: AsyncSession, draft: DraftSession) -> str:
    """Generate the document and return it."""
    try:
        content = generate_draft(draft.template_id, draft.collected_fields)
    except ValueError as e:
        reply = f"There was an issue generating: {e}. Could you check the details?"
        assistant_msg = DraftMessage(
            session_id=draft.id, role="assistant", content=reply,
        )
        db.add(assistant_msg)
        draft.phase = "collect"
        await db.commit()
        return reply

    draft.generated_content = content
    draft.phase = "done"
    draft.status = "completed"

    reply = "Your document has been generated. You can copy or download it below."
    assistant_msg = DraftMessage(
        session_id=draft.id, role="assistant", content=reply,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(draft)

    return reply


async def confirm_and_generate(db: AsyncSession, draft: DraftSession) -> str:
    """Directly confirm and generate (called from the confirm endpoint)."""
    return await _generate_and_respond(db, draft)


async def process_refinement_turn(
    db: AsyncSession,
    draft: DraftSession,
    user_message: str,
    current_document: str,
) -> str:
    """Process a refinement request on a generated document. Returns the updated document."""
    if not settings.gemini_api_key:
        return current_document

    # Save user message
    user_msg = DraftMessage(
        session_id=draft.id,
        role="user",
        content=user_message,
    )
    db.add(user_msg)

    meta = TEMPLATE_REGISTRY.get(draft.template_id or "", {})
    doc_name = meta.get("name", "legal document")

    client = _get_genai_client()
    prompt = f"""You are a legal document editor. The user has a {doc_name} and wants changes.

Current document:
{current_document[:15000]}

User instruction: "{user_message}"

Instructions:
1. Apply the requested changes logically to the document.
2. If the user's request is ambiguous, make a reasonable legal interpretation.
3. Keep the document formal, professional, and compliant with Indian law.
4. Return ONLY the COMPLETE updated document content in markdown format. No explanations.
5. IMPORTANT: DO NOT use markdown tables for anything. Use plain rich text structuring (lists, headings, paragraphs) for signature blocks or structured data."""

    try:
        response = await client.aio.models.generate_content(
            model=settings.gemini_lite_model,
            contents=prompt,
        )
        updated_content = response.text.strip()

        # Update session
        draft.generated_content = updated_content
        draft.phase = "refining"

        reply_summary = "I've updated the document based on your instructions."
        assistant_msg = DraftMessage(
            session_id=draft.id, role="assistant", content=reply_summary,
        )
        db.add(assistant_msg)
        await db.commit()
        await db.refresh(draft)

        return updated_content
    except Exception as e:
        logger.warning(f"[DraftChat] Refinement failed: {e}")
        reply = "Sorry, I couldn't process that refinement. Please try again."
        assistant_msg = DraftMessage(
            session_id=draft.id, role="assistant", content=reply,
        )
        db.add(assistant_msg)
        await db.commit()
        return current_document


async def delete_session(db: AsyncSession, session_id: str) -> bool:
    """Delete a draft chat session and its messages."""
    draft = await get_session(db, session_id)
    if not draft:
        return False
        
    await db.delete(draft)
    await db.commit()
    return True
