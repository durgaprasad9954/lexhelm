from __future__ import annotations

import asyncio
import importlib.util
import sys
import types
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _load_module(module_name: str, relative_path: str, extra_modules: dict[str, object]):
    for name, module in extra_modules.items():
        sys.modules[name] = module

    spec = importlib.util.spec_from_file_location(module_name, ROOT / relative_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


class SearchRouterFallbackTests(unittest.TestCase):
    def _load_router_module(self):
        fastapi_module = types.ModuleType("fastapi")
        fastapi_module.APIRouter = lambda *args, **kwargs: types.SimpleNamespace(
            get=lambda *a, **k: (lambda fn: fn),
            post=lambda *a, **k: (lambda fn: fn),
        )
        fastapi_module.Depends = lambda dependency=None: dependency
        fastapi_module.HTTPException = Exception
        fastapi_module.Query = lambda default=None, **kwargs: default

        genai_types = types.ModuleType("google.genai.types")
        genai_types.GenerateContentConfig = lambda **kwargs: kwargs
        google_genai_module = types.ModuleType("google.genai")
        google_genai_module.types = genai_types

        core_module = types.ModuleType("app.core")
        core_module.settings = types.SimpleNamespace(
            gemini_api_key=None,
            gemini_lite_model="gemini-2.5-flash-lite",
            search_chat_llm_timeout_seconds=4,
        )

        rate_limit_module = types.ModuleType("app.core.rate_limit")
        rate_limit_module.RateLimit = lambda *args, **kwargs: object()

        schemas_module = types.ModuleType("app.schemas.search")

        class _Base:
            def __init__(self, **kwargs):
                for key, value in kwargs.items():
                    setattr(self, key, value)

            def model_dump(self):
                return self.__dict__

        for name in (
            "CaseDetail",
            "CaseMeta",
            "CaseResult",
            "CaseSearchResponse",
            "SearchChatRequest",
            "SearchChatResponse",
            "SearchChatSource",
        ):
            setattr(schemas_module, name, type(name, (_Base,), {}))

        search_service_module = types.ModuleType("app.services.search_service")
        search_service_module.AuthenticationError = type("AuthenticationError", (Exception,), {})
        search_service_module.RateLimitError = type("RateLimitError", (Exception,), {})
        search_service_module.IndianKanoonError = type("IndianKanoonError", (Exception,), {})
        search_service_module.search_cases = None

        document_service_module = types.ModuleType("app.services.document_service")
        document_service_module._get_genai_client = lambda: None

        app_services_module = types.ModuleType("app.services")
        app_services_module.search_service = search_service_module

        return _load_module(
            "testable_search_router",
            "app/api/routers/search.py",
            {
                "fastapi": fastapi_module,
                "google.genai": google_genai_module,
                "google.genai.types": genai_types,
                "app.core": core_module,
                "app.core.rate_limit": rate_limit_module,
                "app.schemas.search": schemas_module,
                "app.services": app_services_module,
                "app.services.search_service": search_service_module,
                "app.services.document_service": document_service_module,
            },
        )

    def test_greeting_short_circuits_without_search(self) -> None:
        module = self._load_router_module()

        response = asyncio.run(module.ask_legal_search(types.SimpleNamespace(query="hii")))

        self.assertIn("Hi!", response.answer)
        self.assertEqual(response.sources, [])

    def test_connection_error_uses_direct_fallback(self) -> None:
        module = self._load_router_module()
        module.search_service.search_cases = lambda *args, **kwargs: (_ for _ in ()).throw(ConnectionError("offline"))
        module._build_direct_ai_fallback_answer = lambda query: asyncio.sleep(0, result="General fallback answer")

        response = asyncio.run(module.ask_legal_search(types.SimpleNamespace(query="criminal laws")))

        self.assertEqual(response.answer, "General fallback answer")
        self.assertEqual(response.sources, [])

    def test_compact_sources_for_prompt_limits_and_trims(self) -> None:
        module = self._load_router_module()
        sources = [
            types.SimpleNamespace(
                title=f"Case {idx}",
                headline="x" * 400,
                court="Court",
                date="2026-01-01",
                citation="Citation",
            )
            for idx in range(5)
        ]

        compact = module._compact_sources_for_prompt(sources)

        self.assertEqual(len(compact), 3)
        self.assertEqual(len(compact[0]["headline"]), 280)

    def test_clean_text_strips_html_tags_and_entities(self) -> None:
        module = self._load_router_module()

        cleaned = module._clean_text("request to <b>search</b> &amp; review <i>case-law</i>")

        self.assertEqual(cleaned, "request to search & review case-law")


if __name__ == "__main__":
    unittest.main()
