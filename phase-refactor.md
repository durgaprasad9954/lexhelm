# Phase Refactor — Backend Consolidation

## Goal
Merge `LawbotBackend/MattersAPI` and `LawbotBackend/LawBot` into a single FastAPI backend at `LexHelmV2/apps/api/`. Add new modules for search and document generation. Extract multi-agent chat as a separate module — reintegrate last.

---

## New Directory Layout

```
LexHelmV2/
├── apps/
│   └── api/
│       ├── app/
│       │   ├── __init__.py
│       │   ├── main.py                    # Unified FastAPI entry
│       │   ├── core/
│       │   │   ├── __init__.py
│       │   │   ├── config.py              # Merged settings (MattersAPI + LawBot env)
│       │   │   ├── security.py            # Token auth middleware
│       │   │   └── jwt_auth.py            # JWT validation (HS256/RS256)
│       │   ├── db/
│       │   │   ├── __init__.py
│       │   │   ├── session.py             # Async SQLAlchemy engine + session
│       │   │   └── init_db.py             # Schema bootstrap
│       │   ├── models/
│       │   │   ├── __init__.py
│       │   │   ├── base.py                # DeclarativeBase
│       │   │   ├── mixins.py              # Timestamp, OrgScoped
│       │   │   ├── orgs.py                # Org, User, OrgMember
│       │   │   ├── matters.py             # Matter, Party, MatterParty
│       │   │   ├── notes.py               # Note
│       │   │   ├── artifacts.py           # Artifact
│       │   │   ├── deadlines.py           # Deadline
│       │   │   ├── hearings.py            # Hearing
│       │   │   ├── citations.py           # Citation
│       │   │   ├── tags.py                # Tag, MatterTag
│       │   │   ├── reminders.py           # Reminder
│       │   │   └── audit.py               # AuditLog
│       │   ├── schemas/
│       │   │   ├── __init__.py
│       │   │   ├── base.py                # APIModel
│       │   │   ├── matter.py
│       │   │   ├── note.py
│       │   │   ├── artifact.py
│       │   │   ├── reminder.py
│       │   │   ├── org.py
│       │   │   ├── search.py              # NEW — search request/response
│       │   │   └── document.py            # NEW — document gen request/response
│       │   ├── api/
│       │   │   ├── __init__.py            # api_router aggregation
│       │   │   ├── dependencies.py        # RequestContext, RLS session
│       │   │   └── routers/
│       │   │       ├── __init__.py
│       │   │       ├── health.py
│       │   │       ├── orgs.py
│       │   │       ├── matters.py
│       │   │       ├── notes.py
│       │   │       ├── artifacts.py
│       │   │       ├── reminders.py
│       │   │       ├── search.py          # NEW — legal case search
│       │   │       └── documents.py       # NEW — contract/agreement drafting
│       │   ├── services/
│       │   │   ├── __init__.py
│       │   │   ├── user_service.py
│       │   │   ├── org_service.py
│       │   │   ├── gcs.py                 # GCS signed URLs
│       │   │   ├── search_service.py      # NEW — IndianKanoon + web search
│       │   │   └── document_service.py    # NEW — template rendering + AI fill
│       │   ├── templates/                 # NEW — Jinja2 document templates
│       │   │   ├── rental_agreement.md
│       │   │   ├── nda.md
│       │   │   ├── service_agreement.md
│       │   │   ├── power_of_attorney.md
│       │   │   └── legal_notice.md
│       │   └── agents/                    # LAST — multi-agent chat (stub for now)
│       │       ├── __init__.py
│       │       ├── base.py               # BaseAgent interface
│       │       └── README.md             # Migration notes
│       ├── requirements.txt
│       ├── Dockerfile
│       └── .env.example
├── phase-refactor.md
└── plan.md
```

---

## Module Migration Map

| Source (old) | Destination (new) | Changes |
|---|---|---|
| `MattersAPI/app/core/config.py` | `api/app/core/config.py` | Add LawBot env vars (GEMINI_API_KEY, IK_API_KEY, DATABASE_URL) |
| `MattersAPI/app/core/security.py` | `api/app/core/security.py` | Keep as-is |
| `MattersAPI/app/core/jwt_auth.py` | `api/app/core/jwt_auth.py` | Keep as-is |
| `MattersAPI/app/db/*` | `api/app/db/*` | Keep as-is |
| `MattersAPI/app/models/*` | `api/app/models/*` | Keep all 11 model files |
| `MattersAPI/app/schemas/*` | `api/app/schemas/*` | Keep + add search.py, document.py |
| `MattersAPI/app/api/*` | `api/app/api/*` | Keep + add search, documents routers |
| `MattersAPI/app/services/*` | `api/app/services/*` | Keep + add search_service, document_service |
| `LawBot/LawAssistant/sub_agents/kanoon_search_agent/IKTool.py` | `api/app/services/search_service.py` | Extract IndianKanoonClient, wrap as service |
| `LawBot/LawAssistant/agent.py` | `api/app/agents/` (STUB) | Placeholder — rewrite in Phase 4 |
| `LawBot/LawAssistant/sub_agents/*` | `api/app/agents/` (STUB) | Placeholder — rewrite in Phase 4 |

---

## New Modules Detail

### 1. Search Service (`services/search_service.py`)
- Port `IndianKanoonClient` from `IKTool.py` (aiohttp-based)
- Add methods: `search_cases()`, `get_case()`, `get_case_meta()`, `suggest()`
- Add result caching (in-memory LRU, configurable TTL)
- No Google ADK dependency — plain async HTTP

### 2. Search Router (`api/routers/search.py`)
- `GET /search/cases` — search with query, court, year_from, year_to, page
- `GET /search/cases/{doc_id}` — get full case
- `GET /search/cases/{doc_id}/meta` — get case metadata
- `GET /search/suggest` — autocomplete suggestions
- Returns structured JSON (not raw IndianKanoon HTML)

### 3. Document Service (`services/document_service.py`)
- Load Jinja2 templates from `templates/` directory
- `list_templates()` — available template types
- `generate_draft()` — render template with user params
- `parse_contract()` — extract key terms from uploaded text (Gemini call)
- PDF generation via WeasyPrint (optional, can start with Markdown)

### 4. Documents Router (`api/routers/documents.py`)
- `GET /documents/templates` — list available templates with required fields
- `POST /documents/generate` — generate draft from template + params
- `POST /documents/parse` — upload contract text, extract key terms
- `GET /documents/drafts/{draft_id}` — retrieve saved draft (future)

### 5. Agents Module (`agents/`) — STUB ONLY
- `base.py`: Abstract `BaseAgent` class with `async run(context) -> AgentResponse`
- `README.md`: Migration notes for Phase 4
- No actual agent logic — that's the last phase

---

## Config Merge

New `config.py` combines both backends' env vars:

```python
# From MattersAPI
neondb_sql_url: str          # PostgreSQL connection
gcs_artifacts_bucket: str    # GCS bucket
cors_origins: list[str]      # CORS
jwt_secret: str              # JWT validation

# From LawBot (NEW)
gemini_api_key: str          # Gemini API access
ik_api_key: str              # IndianKanoon API token
database_url: str            # Session DB (can reuse neondb)

# New
document_templates_dir: str  # Path to Jinja2 templates
search_cache_ttl: int        # Search cache TTL in seconds
search_cache_max_size: int   # Max cached entries
```

---

## What Gets Dropped
- Google ADK dependency (`google.adk.cli.fast_api.get_fast_api_app`) — replaced by our own FastAPI app
- `LawBot/app.py` entry point — merged into unified `main.py`
- AMQP/LavinMQ config — not used in current flow
- MongoDB config — not used in current flow
- `yfinance`, `pandas`, `pyarrow` — finance deps, not needed
- Legacy `__init__.py` classes (Transaction, Asset, Loan) — leftover from old project

## What Gets Deferred (Phase 4)
- All agent logic (coordinator, kanoon_search_agent, live_research, law_consultant, law_critic)
- Agent prompts and orchestration
- Chat session management (ADK sessions)
- Multi-turn conversation state
- Streaming responses from agents
