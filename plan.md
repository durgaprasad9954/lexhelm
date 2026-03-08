# LexHelm V2 — Simplification & Feature Plan

## Current State

### What Exists
- **lawbot-ui/** — Next.js 15 frontend (chat, search, matters/case management, notes, artifacts)
- **LawbotBackend/MattersAPI/** — FastAPI REST API (matters CRUD, notes, artifacts, reminders, orgs)
- **LawbotBackend/LawBot/** — Google ADK + Gemini 2.5 Pro (4 sub-agents: kanoon search, live research, law consultant, law critic)
- **Auth**: Better Auth (Google OAuth) + JWT/API token
- **DB**: PostgreSQL (NeonDB) — Prisma (auth) + SQLAlchemy (matters)
- **Storage**: Google Cloud Storage for documents

### Pain Points
1. Code split across 3 directories, 2 git repos — hard to maintain
2. Two separate ORM layers (Prisma for auth, SQLAlchemy for matters)
3. AI agent system tightly coupled to Google ADK — limits flexibility
4. No contract drafting or document generation features
5. Search UI exists but is basic — no guided workflows
6. Chat is generic — no structured legal task flows
7. Models exist for deadlines, hearings, citations, tags but UI doesn't use them

---

## Phase 1: Consolidate & Simplify (Week 1-2)

### 1.1 Monorepo Structure
Move everything into `LexHelmV2/` as a clean monorepo:

```
LexHelmV2/
├── apps/
│   ├── web/                    # Next.js frontend (from lawbot-ui)
│   └── api/                    # FastAPI backend (merge MattersAPI + LawBot)
├── packages/
│   └── shared/                 # Shared types, constants, utils
├── infra/                      # Docker, deployment configs
├── plan.md
└── README.md
```

**Tasks:**
- [ ] Init new git repo in LexHelmV2
- [ ] Copy frontend into `apps/web/`, clean up unused deps
- [ ] Merge MattersAPI + LawBot into `apps/api/`
- [ ] Single `docker-compose.yml` at root
- [ ] Unified environment config (`.env` at root, per-app overrides)

### 1.2 Backend Simplification
- [ ] Single FastAPI app with router modules:
  - `/api/v1/matters` — case management (existing)
  - `/api/v1/chat` — AI chat (refactored from LawBot)
  - `/api/v1/search` — legal search (refactored from kanoon agent)
  - `/api/v1/documents` — contract/document generation (NEW)
  - `/api/v1/auth` — auth proxy/validation
- [ ] Keep SQLAlchemy as sole backend ORM
- [ ] Simplify auth: Better Auth stays on frontend, backend validates JWT only
- [ ] Remove redundant API proxy route (`api/[...all]/route.ts`) — call backend directly via env-configured base URL

### 1.3 Frontend Cleanup
- [ ] Remove dead/unused components and hooks
- [ ] Consolidate API client layers (currently: `apiClient.ts`, `mattersApiClient.ts`, `searchApi.ts` → single typed client)
- [ ] Wire up unused DB models to UI: deadlines, hearings, tags on matter detail page
- [ ] Simplify sidebar — group features logically: Chat, Cases, Documents, Search

---

## Phase 2: Simple Legal Features (Week 3-4)

### 2.1 Contract & Agreement Drafting
Simple template-based document generation with AI fill-in.

**Backend:**
- [ ] `POST /api/v1/documents/generate` — takes template type + parameters, returns draft
- [ ] `GET /api/v1/documents/templates` — list available templates
- [ ] Template types (start with these):
  - Rental/Lease Agreement
  - Service Agreement
  - NDA (Non-Disclosure Agreement)
  - Power of Attorney
  - Legal Notice
- [ ] Templates stored as Markdown/Jinja2 with placeholder fields
- [ ] AI fills in details from user inputs (Gemini call for clause suggestions)
- [ ] `POST /api/v1/documents/parse` — upload a contract, extract key terms & clauses

**Frontend:**
- [ ] `/documents` page — list templates, recent drafts
- [ ] `/documents/new` — step-by-step wizard:
  1. Pick template type
  2. Fill party details (names, addresses, roles)
  3. Fill key terms (rent amount, duration, conditions)
  4. AI generates draft with standard clauses
  5. Preview & edit (rich text editor)
  6. Download as PDF / attach to matter
- [ ] `/documents/parse` — upload contract, see extracted key terms, risks, obligations

### 2.2 Easy Case Search
Improve existing search with guided workflows.

**Backend:**
- [ ] Enhance kanoon search: add filters for court, year range, bench size
- [ ] `GET /api/v1/search/suggest` — autocomplete for case names, sections, acts
- [ ] `GET /api/v1/search/related/{case_id}` — find related cases
- [ ] Cache frequent searches (Redis or in-memory)

**Frontend:**
- [ ] Redesign `/search` page:
  - Search bar with autocomplete suggestions
  - Filter sidebar: court, year, jurisdiction, bench, case type
  - Result cards with: case name, citation, date, court, short summary
  - Click to expand full summary + key holdings
  - "Save to Matter" button on each result
- [ ] Quick search from dashboard header (global search bar)
- [ ] Recent searches history

### 2.3 Quick Legal Tools (Low-effort, high-value)
- [ ] **Limitation Calculator** — input case type, compute limitation period under Indian law
- [ ] **Court Fee Calculator** — basic court fee estimation by state/court
- [ ] **Legal Term Glossary** — searchable legal dictionary (static data + AI explanation)
- [ ] Add these as cards on the dashboard home page

---

## Phase 3: Polish Existing Features (Week 5)

### 3.1 Matters/Case Management
- [ ] Dashboard view: upcoming deadlines, pending hearings, recent activity
- [ ] Timeline view for matter history (notes, hearings, filings in chronological order)
- [ ] Deadline & hearing reminders (use existing DB models, add notification UI)
- [ ] Tags/labels for matters with color coding
- [ ] Bulk actions: archive multiple matters, export matter summary

### 3.2 Notes Enhancement
- [ ] Rich text editor (replace plain textarea)
- [ ] Link notes to search results (cite cases inline)
- [ ] Note templates: hearing notes, client meeting notes, research summary
- [ ] Pin/star important notes

### 3.3 General UX
- [ ] Loading states and empty states for all pages
- [ ] Error boundaries with helpful messages
- [ ] Mobile responsive improvements
- [ ] Keyboard shortcuts for power users (Cmd+K search, etc.)
- [ ] Onboarding flow for new users

---

## Phase 4: Multi-Agent Chat Refactor (Week 6-8) — LAST

### 4.1 Agent Architecture Redesign
Decouple from Google ADK. Build a flexible multi-agent system.

**New Architecture:**
```
User Message
    ↓
Router Agent (classifies intent)
    ↓
┌─────────────────────────────────────────┐
│  Specialist Agents (run in parallel)    │
├─────────────────────────────────────────┤
│  Case Research Agent    → IndianKanoon  │
│  Document Drafter Agent → Templates+AI  │
│  Legal Advisor Agent    → Consultation  │
│  Case Manager Agent     → CRUD matters  │
│  Web Research Agent     → Live search   │
│  Critic/QA Agent        → Review output │
└─────────────────────────────────────────┘
    ↓
Synthesizer (combines, formats response)
    ↓
User
```

**Tasks:**
- [ ] Abstract agent interface: `BaseAgent` with `run(context, tools) → AgentResponse`
- [ ] Router agent: classify user intent → dispatch to specialist(s)
- [ ] Each specialist agent:
  - Has own system prompt, tools, and output schema
  - Can call backend APIs (matters CRUD, search, document gen)
  - Returns structured output (not just text)
- [ ] Synthesizer agent: combine specialist outputs into coherent response
- [ ] Support parallel agent execution for multi-part queries
- [ ] Agent memory: per-session context + cross-session user preferences

### 4.2 Chat UX Overhaul
- [ ] Structured responses: show cards for cases, documents, matters (not just text)
- [ ] Action buttons in chat: "Create Matter", "Draft Agreement", "Save Citation"
- [ ] Agent thinking/progress indicator (show which agents are working)
- [ ] Multi-turn tool use: agent can ask clarifying questions before acting
- [ ] Chat → Action: seamlessly transition from conversation to document drafting or case creation
- [ ] Suggested follow-up prompts after each response

### 4.3 Model Flexibility
- [ ] Support multiple LLM providers (Gemini, Claude, OpenAI) via unified interface
- [ ] Model selection per agent (use cheaper models for routing, powerful ones for drafting)
- [ ] Fallback chain: if primary model fails, try secondary
- [ ] Token usage tracking and cost estimation

---

## Priority Order

| Priority | Phase | What | Why |
|----------|-------|------|-----|
| 1 | Phase 1 | Consolidate monorepo + simplify | Foundation for everything else |
| 2 | Phase 2.1 | Contract/agreement drafting | Highest user value, most requested |
| 3 | Phase 2.2 | Easy case search | Core workflow improvement |
| 4 | Phase 3 | Polish matters + UX | Makes existing features usable |
| 5 | Phase 2.3 | Quick legal tools | Low effort, nice additions |
| 6 | Phase 4 | Multi-agent refactor | Complex, do last with stable base |

---

## Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo tool | None (simple dirs) | Not enough packages to justify turborepo/nx overhead |
| Backend ORM | SQLAlchemy only | Already handles all business data; Prisma only for auth |
| Document templates | Jinja2 + Markdown | Simple, version-controllable, AI can manipulate |
| PDF generation | WeasyPrint or reportlab | Server-side PDF from HTML/Markdown templates |
| Search cache | In-memory (lru_cache) | Start simple, add Redis later if needed |
| Agent framework | Custom (no ADK dependency) | Full control, provider-agnostic, simpler debugging |
| Rich text editor | Tiptap | React-native, extensible, good for legal docs |

---

## Non-Goals (Out of Scope for V2)
- E-filing integration
- Payment/billing system
- Client portal (external users)
- Multi-language support
- Mobile native app
- Real-time collaboration (Google Docs style)
