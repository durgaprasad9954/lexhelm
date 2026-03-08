"""Draft chat service — conversational document drafting with 3-layer field extraction."""
from __future__ import annotations

import json
import logging
import re
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


# ── Layer 1: Context-Aware Extraction (zero latency) ────────────


def _looks_like_multi_answer(message: str) -> bool:
    """Detect if a message contains multiple answers (e.g., 'tomorrow and software consultation')."""
    lower = message.lower().strip()
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
    if _looks_like_multi_answer(message):
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
        relative_dates = {
            "today", "tomorrow", "next week", "next month",
            "immediately", "asap", "right away",
        }
        if lower in relative_dates:
            return {last_asked_field: message.strip()}

        # Structured date formats
        date_patterns = [
            r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})",
            r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s+\d{4})",
            r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})",
        ]
        for pat in date_patterns:
            m = re.search(pat, lower, re.IGNORECASE)
            if m:
                return {last_asked_field: m.group(1).strip()}

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

    # Text fields: only for genuinely short single-value answers
    text = message.strip()
    text_len = len(text)
    if (
        text_len > 1
        and text_len <= 100
        and not text.endswith("?")
        and text.count(" ") <= 6  # short phrases only
    ):
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


def _is_real_name(name: str) -> bool:
    """Check if a name is a real proper name, not a generic placeholder."""
    return name.lower().strip() not in _GENERIC_NAMES and len(name.strip()) > 1


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
        date_pat = r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{4})"
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
        return result
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
    return field_key.replace("_", " ").title()


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
    if not missing_required and draft.template_id:
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

Apply the user's requested changes to the document. Return the FULL updated document in markdown format.
Keep all existing content that wasn't asked to change. Maintain proper legal document formatting.
Return ONLY the updated document text, no explanations or preamble."""

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
