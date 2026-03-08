# Agents Module — Phase 4 Migration

## Status: STUB (not yet implemented)

## Migration Plan

### Source: `LawbotBackend/LawBot/LawAssistant/`

The current multi-agent system uses Google ADK with these agents:
- **law_research_coordinator** — Main orchestrator (Gemini 2.5 Pro)
- **kanoon_search_agent** — IndianKanoon case search
- **live_research_agent** — Google web search
- **law_consultant_agent** — Strategic research planning
- **law_critic_agent** — QA and critique

### Target Architecture

```
User Message → RouterAgent → [SpecialistAgents...] → Synthesizer → Response
```

**Planned agents:**
1. `RouterAgent` — Classify intent, dispatch to specialists
2. `CaseResearchAgent` — Uses search_service (IndianKanoon)
3. `DocumentDrafterAgent` — Uses document_service (templates + AI)
4. `LegalAdvisorAgent` — General legal consultation
5. `CaseManagerAgent` — CRUD operations on matters via API
6. `WebResearchAgent` — Live web search
7. `CriticAgent` — QA/review of combined output

### Key Decisions
- **No Google ADK dependency** — use plain Gemini SDK or multi-provider interface
- **Provider agnostic** — support Gemini, Claude, OpenAI via unified interface
- **Structured output** — agents return `AgentResponse` not just text
- **Parallel execution** — multiple specialists can run concurrently
- **Tool use** — agents can call backend services directly

### When to Implement
After Phases 1-3 are stable. This is the last major piece.
