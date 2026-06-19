from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import MagicMock


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


def _settings_stub(**overrides):
    defaults = {
        "whatsapp_access_token": "token",
        "whatsapp_phone_number_id": "12345",
        "whatsapp_business_account_id": None,
        "whatsapp_graph_api_version": "v25.0",
        "whatsapp_admin_number": None,
        "whatsapp_document_template_name": None,
        "whatsapp_document_template_language": "en_US",
        "whatsapp_consultation_template_name": None,
        "whatsapp_consultation_template_language": "en_US",
        "frontend_url": "https://lexhelm.example",
        "public_share_url": None,
    }
    defaults.update(overrides)
    return types.SimpleNamespace(**defaults)


class WhatsAppServiceTests(unittest.TestCase):
    def test_send_text_disables_url_preview_by_default(self) -> None:
        config_module = types.ModuleType("app.core.config")
        config_module.settings = _settings_stub()
        requests_module = types.ModuleType("requests")
        requests_module.post = MagicMock()
        requests_module.exceptions = types.SimpleNamespace(
            HTTPError=Exception,
            RequestException=Exception,
        )

        module = _load_module(
            "testable_whatsapp_service",
            "app/services/whatsapp_service.py",
            {
                "app.core.config": config_module,
                "requests": requests_module,
            },
        )

        service = module.WhatsAppService()
        service._post_message = MagicMock(return_value={"ok": True})

        service.send_text("919999999999", "Open https://example.com/doc")

        payload = service._post_message.call_args.args[1]
        self.assertEqual(payload["type"], "text")
        self.assertFalse(payload["text"]["preview_url"])

    def test_send_text_can_enable_url_preview_when_requested(self) -> None:
        config_module = types.ModuleType("app.core.config")
        config_module.settings = _settings_stub()
        requests_module = types.ModuleType("requests")
        requests_module.post = MagicMock()
        requests_module.exceptions = types.SimpleNamespace(
            HTTPError=Exception,
            RequestException=Exception,
        )

        module = _load_module(
            "testable_whatsapp_service_preview",
            "app/services/whatsapp_service.py",
            {
                "app.core.config": config_module,
                "requests": requests_module,
            },
        )

        service = module.WhatsAppService()
        service._post_message = MagicMock(return_value={"ok": True})

        service.send_text("919999999999", "Open https://example.com/doc", preview_url=True)

        payload = service._post_message.call_args.args[1]
        self.assertTrue(payload["text"]["preview_url"])

    def test_find_template_language_prefers_approved_template_language(self) -> None:
        config_module = types.ModuleType("app.core.config")
        config_module.settings = _settings_stub(whatsapp_business_account_id="waba_123")
        requests_module = types.ModuleType("requests")
        requests_module.exceptions = types.SimpleNamespace(
            HTTPError=Exception,
            RequestException=Exception,
        )

        module = _load_module(
            "testable_whatsapp_service_template_lookup",
            "app/services/whatsapp_service.py",
            {
                "app.core.config": config_module,
                "requests": requests_module,
            },
        )

        service = module.WhatsAppService()
        service.list_message_templates = MagicMock(return_value=[
            {"name": "lexhelm_document_ready", "language": "en_US", "status": "APPROVED"},
        ])

        language = service.find_template_language("lexhelm_document_ready", ["en", "en_US"])

        self.assertEqual(language, "en_US")


class WhatsAppDocumentServiceTests(unittest.TestCase):
    def _load_service_module(self, *, admin_number=None, template_name=None, template_language="en_US"):
        config_module = types.ModuleType("app.core.config")
        config_module.settings = _settings_stub(
            whatsapp_admin_number=admin_number,
            whatsapp_document_template_name=template_name,
            whatsapp_document_template_language=template_language,
        )

        doc_model_module = types.ModuleType("app.models.whatsapp_document_session")
        doc_model_module.WhatsAppDocumentSession = object
        doc_model_module.SessionStatus = types.SimpleNamespace(
            PENDING="pending",
            DOCUMENT_GENERATED="document_generated",
            SENT_TO_WHATSAPP="sent_to_whatsapp",
            WAITING_FOR_FEEDBACK="waiting_for_feedback",
            EDITING="editing",
            COMPLETED="completed",
            CANCELLED="cancelled",
        )

        doc_service_module = types.ModuleType("app.services.document_service")
        doc_service_module.generate_draft = lambda *args, **kwargs: "draft"
        doc_service_module.generate_draft_enhanced = lambda *args, **kwargs: "draft"
        doc_service_module.TEMPLATE_REGISTRY = {}

        whatsapp_service_module = types.ModuleType("app.services.whatsapp_service")
        whatsapp_service_module.whatsapp_service = types.SimpleNamespace(
            business_account_id=None,
            find_template_language=MagicMock(return_value=None),
            send_template=MagicMock(return_value={"messages": [{"id": "wamid.123"}]}),
            send_text=MagicMock(return_value={"messages": [{"id": "wamid.456"}]}),
        )

        db_session_module = types.ModuleType("app.db.session")
        db_session_module.async_session_factory = MagicMock()

        sqlalchemy_module = types.ModuleType("sqlalchemy")
        sqlalchemy_module.select = MagicMock()
        sqlalchemy_module.desc = MagicMock()

        sqlalchemy_asyncio_module = types.ModuleType("sqlalchemy.ext.asyncio")
        sqlalchemy_asyncio_module.AsyncSession = object

        return _load_module(
            "testable_whatsapp_document_service",
            "app/services/whatsapp_document_service.py",
            {
                "app.core.config": config_module,
                "app.models.whatsapp_document_session": doc_model_module,
                "app.services.document_service": doc_service_module,
                "app.services.whatsapp_service": whatsapp_service_module,
                "app.db.session": db_session_module,
                "sqlalchemy": sqlalchemy_module,
                "sqlalchemy.ext.asyncio": sqlalchemy_asyncio_module,
            },
        )

    def test_resolve_recipient_allows_listed_number(self) -> None:
        module = self._load_service_module(admin_number="918888888888")
        service = module.WhatsAppDocumentService()

        recipient = service._resolve_recipient_phone("919014795788")

        self.assertEqual(recipient, "919014795788")

        new_recipient = service._resolve_recipient_phone(service._normalize_phone("+91 8985225201"))

        self.assertEqual(new_recipient, "918985225201")

    def test_resolve_recipient_rejects_unlisted_number(self) -> None:
        module = self._load_service_module(admin_number="918888888888")
        service = module.WhatsAppDocumentService()

        with self.assertRaises(ValueError):
            service._resolve_recipient_phone("917777777777")

    def test_document_notification_sends_document_template_without_follow_up(self) -> None:
        module = self._load_service_module(template_name="doc_ready")
        service = module.WhatsAppDocumentService()

        result = service._send_document_ready_notification(
            to="919999999999",
            customer_name="Admin",
            document_type="Rental Agreement",
            document_link="https://lexhelm.example/public-doc-chat/123",
            session_id="123",
        )

        self.assertIsNotNone(result)
        service.whatsapp.send_template.assert_called_once()
        service.whatsapp.send_text.assert_not_called()
        body_parameters = service.whatsapp.send_template.call_args.kwargs["body_parameters"]
        self.assertEqual(
            body_parameters,
            ["Admin", "Rental Agreement", "https://lexhelm.example/public-doc-chat/123"],
        )

    def test_clickable_link_message_matches_document_ready_template_body(self) -> None:
        module = self._load_service_module()
        service = module.WhatsAppDocumentService()

        message = service._build_clickable_link_message(
            "DurgaPrasad",
            "Rental / Lease Agreement",
            "http://192-168-1-8.sslip.io/public-doc-chat/abc",
        )

        self.assertEqual(
            message,
            "Hi DurgaPrasad,\n\n"
            "Your Rental / Lease Agreement is ready.\n\n"
            "Open your LexHelm document here:\n"
            "http://192-168-1-8.sslip.io/public-doc-chat/abc\n\n"
            "Thanks",
        )

    def test_document_notification_does_not_need_follow_up_when_template_succeeds(self) -> None:
        module = self._load_service_module(template_name="doc_ready")
        service = module.WhatsAppDocumentService()
        service.whatsapp.send_text = MagicMock(return_value=None)
        service.whatsapp.last_error = "Outside customer service window"

        result = service._send_document_ready_notification(
            to="919999999999",
            customer_name="Priya",
            document_type="Rental Agreement",
            document_link="https://lexhelm.example/public-doc-chat/123",
            session_id="123",
        )

        self.assertIsNotNone(result)
        service.whatsapp.send_template.assert_called_once()
        service.whatsapp.send_text.assert_not_called()

    def test_document_notification_uses_direct_text_fallback_when_template_fails(self) -> None:
        module = self._load_service_module(template_name="doc_ready")
        service = module.WhatsAppDocumentService()
        service.whatsapp.send_template = MagicMock(side_effect=[
            None,
            {"messages": [{"id": "wamid.hello"}]},
        ])
        service.whatsapp.send_text = MagicMock(return_value={"messages": [{"id": "wamid.456"}]})
        service.whatsapp.last_error = "Template rejected"

        result = service._send_document_ready_notification(
            to="919999999999",
            customer_name="Priya",
            document_type="Rental Agreement",
            document_link="https://lexhelm.example/public-doc-chat/123",
            session_id="123",
        )

        self.assertIsNotNone(result)
        self.assertEqual(service.whatsapp.send_template.call_count, 2)
        self.assertEqual(
            service.whatsapp.send_template.call_args_list[1].kwargs["template_name"],
            "hello_world",
        )
        service.whatsapp.send_text.assert_called_once()
        self.assertIn(
            "Open your LexHelm document here:",
            service.whatsapp.send_text.call_args.kwargs["body"],
        )

    def test_document_notification_uses_default_template_when_none_is_configured(self) -> None:
        module = self._load_service_module(template_name=None)
        service = module.WhatsAppDocumentService()
        service.whatsapp.send_text = MagicMock(return_value={"messages": [{"id": "wamid.456"}]})
        service.whatsapp.send_template = MagicMock(return_value={"messages": [{"id": "wamid.123"}]})

        result = service._send_document_ready_notification(
            to="919999999999",
            customer_name="Priya",
            document_type="Rental Agreement",
            document_link="https://lexhelm.example/public-doc-chat/123",
            session_id="123",
        )

        self.assertIsNotNone(result)
        service.whatsapp.send_template.assert_called_once()
        service.whatsapp.send_text.assert_not_called()
        self.assertEqual(
            service.whatsapp.send_template.call_args.kwargs["template_name"],
            "lexhelm_document_ready",
        )

    def test_document_notification_uses_configured_template_language_only(self) -> None:
        module = self._load_service_module(template_name="lexhelm_document_ready", template_language="en_US")
        service = module.WhatsAppDocumentService()
        service.whatsapp.send_template = MagicMock(return_value=None)
        service.whatsapp.send_text = MagicMock(return_value={"messages": [{"id": "wamid.456"}]})
        service.whatsapp.last_error = (
            "WhatsApp API error: (#132001) Template name does not exist in the translation"
        )

        result = service._send_document_ready_notification(
            to="919999999999",
            customer_name="Priya",
            document_type="Rental Agreement",
            document_link="https://lexhelm.example/public-doc-chat/123",
            session_id="123",
        )

        self.assertIsNotNone(result)
        self.assertEqual(service.whatsapp.send_template.call_count, 2)
        self.assertEqual(service.whatsapp.send_template.call_args_list[0].kwargs["language_code"], "en_US")
        self.assertEqual(service.whatsapp.send_template.call_args_list[1].kwargs["template_name"], "hello_world")
        service.whatsapp.send_text.assert_called_once()

    def test_document_notification_uses_template_language_discovered_from_waba(self) -> None:
        module = self._load_service_module(template_name=None, template_language="en")
        service = module.WhatsAppDocumentService()
        service.whatsapp.business_account_id = "waba_123"
        service.whatsapp.find_template_language = MagicMock(return_value="en_US")
        service.whatsapp.send_template = MagicMock(return_value={"messages": [{"id": "wamid.123"}]})
        service.whatsapp.send_text = MagicMock(return_value={"messages": [{"id": "wamid.456"}]})

        result = service._send_document_ready_notification(
            to="919999999999",
            customer_name="Priya",
            document_type="Rental Agreement",
            document_link="https://lexhelm.example/public-doc-chat/123",
            session_id="123",
        )

        self.assertIsNotNone(result)
        service.whatsapp.find_template_language.assert_called_once()
        service.whatsapp.send_template.assert_called_once()
        self.assertEqual(service.whatsapp.send_template.call_args.kwargs["language_code"], "en_US")
        service.whatsapp.send_text.assert_not_called()

    def test_document_notification_uses_default_template_when_template_first_is_requested(self) -> None:
        module = self._load_service_module(template_name=None)
        service = module.WhatsAppDocumentService()
        service.whatsapp.send_text = MagicMock(return_value={"messages": [{"id": "wamid.456"}]})
        service.whatsapp.send_template = MagicMock(return_value={"messages": [{"id": "wamid.123"}]})
        service.whatsapp.last_error = "Outside customer service window"

        result = service._send_document_ready_notification(
            to="919999999999",
            customer_name="Priya",
            document_type="Rental Agreement",
            document_link="https://lexhelm.example/public-doc-chat/123",
            session_id="123",
            prefer_template_first=True,
        )

        self.assertIsNotNone(result)
        service.whatsapp.send_template.assert_called_once()
        service.whatsapp.send_text.assert_not_called()
        self.assertEqual(
            service.whatsapp.send_template.call_args.kwargs["template_name"],
            "lexhelm_document_ready",
        )

    def test_document_notification_reports_when_default_template_fails(self) -> None:
        module = self._load_service_module(template_name=None)
        service = module.WhatsAppDocumentService()
        service.whatsapp.send_text = MagicMock(return_value=None)
        service.whatsapp.send_template = MagicMock(return_value=None)
        service.whatsapp.last_error = "Outside customer service window"

        result = service._send_document_ready_notification(
            to="919999999999",
            customer_name="Priya",
            document_type="Rental Agreement",
            document_link="https://lexhelm.example/public-doc-chat/123",
            session_id="123",
        )

        self.assertIsNone(result)
        self.assertEqual(service.whatsapp.send_template.call_count, 2)
        service.whatsapp.send_text.assert_called_once()
        self.assertIn("document template and direct document link both failed", service.last_error)

    def test_hello_world_configured_as_document_template_is_replaced_with_document_template(self) -> None:
        module = self._load_service_module(template_name="hello_world")
        service = module.WhatsAppDocumentService()
        service.whatsapp.send_text = MagicMock(return_value=None)
        service.whatsapp.send_template = MagicMock(return_value={"messages": [{"id": "wamid.123"}]})
        service.whatsapp.last_error = "Outside customer service window"

        result = service._send_document_ready_notification(
            to="919999999999",
            customer_name="Priya",
            document_type="Rental Agreement",
            document_link="https://lexhelm.example/public-doc-chat/123",
            session_id="123",
        )

        self.assertIsNotNone(result)
        service.whatsapp.send_template.assert_called_once()
        service.whatsapp.send_text.assert_not_called()
        self.assertEqual(
            service.whatsapp.send_template.call_args.kwargs["template_name"],
            "lexhelm_document_ready",
        )

    def test_build_document_link_uses_configured_public_share_url(self) -> None:
        config_module = types.ModuleType("app.core.config")
        config_module.settings = _settings_stub(
            public_share_url="http://192.168.29.124",
            frontend_url="http://localhost:3000",
        )

        doc_model_module = types.ModuleType("app.models.whatsapp_document_session")
        doc_model_module.WhatsAppDocumentSession = object
        doc_model_module.SessionStatus = types.SimpleNamespace()

        doc_service_module = types.ModuleType("app.services.document_service")
        doc_service_module.generate_draft = lambda *args, **kwargs: "draft"
        doc_service_module.generate_draft_enhanced = lambda *args, **kwargs: "draft"
        doc_service_module.TEMPLATE_REGISTRY = {}

        whatsapp_service_module = types.ModuleType("app.services.whatsapp_service")
        whatsapp_service_module.whatsapp_service = types.SimpleNamespace(
            send_template=MagicMock(return_value={"messages": [{"id": "wamid.123"}]}),
            send_text=MagicMock(return_value={"messages": [{"id": "wamid.456"}]}),
        )

        db_session_module = types.ModuleType("app.db.session")
        db_session_module.async_session_factory = MagicMock()

        sqlalchemy_module = types.ModuleType("sqlalchemy")
        sqlalchemy_module.select = MagicMock()
        sqlalchemy_module.desc = MagicMock()

        sqlalchemy_asyncio_module = types.ModuleType("sqlalchemy.ext.asyncio")
        sqlalchemy_asyncio_module.AsyncSession = object

        module = _load_module(
            "testable_whatsapp_document_service_ipv4",
            "app/services/whatsapp_document_service.py",
            {
                "app.core.config": config_module,
                "app.models.whatsapp_document_session": doc_model_module,
                "app.services.document_service": doc_service_module,
                "app.services.whatsapp_service": whatsapp_service_module,
                "app.db.session": db_session_module,
                "sqlalchemy": sqlalchemy_module,
                "sqlalchemy.ext.asyncio": sqlalchemy_asyncio_module,
            },
        )

        service = module.WhatsAppDocumentService()
        link = service._build_document_link("123")

        self.assertEqual(link, "http://192.168.29.124/public-doc-chat/123")

    def test_send_approval_updates_notifies_requester_and_admin(self) -> None:
        module = self._load_service_module(admin_number="+919888777666")
        service = module.WhatsAppDocumentService()
        service.whatsapp.send_text.reset_mock()

        doc_session = types.SimpleNamespace(
            id="123",
            template_id="rental_agreement",
            document_type="Rental Agreement",
            name="Priya",
            phone_number="919999000111",
            current_content="<h1>Rental Agreement</h1><p>Monthly rent is 30000 and deposit is 60000.</p>",
            params={
                "requester_phone_number": "919876543210",
                "requester_name": "Sriram",
            },
        )

        service._send_approval_updates(doc_session)

        calls = service.whatsapp.send_text.call_args_list
        self.assertEqual(len(calls), 3)
        self.assertEqual(calls[0].args[0], "919999000111")
        self.assertIn("Thanks for approving the lease agreement for Sriram.", calls[0].args[1])
        self.assertEqual(calls[1].args[0], "919876543210")
        self.assertIn("Priya has approved the final edited Rental Agreement", calls[1].args[1])
        self.assertIn("Final output preview:", calls[1].args[1])
        self.assertEqual(calls[2].args[0], "919888777666")
        self.assertIn("Lease Agreement is for Sriram approved by Priya.", calls[2].args[1])
        self.assertIn("Final edited LexHelm URL:", calls[2].args[1])

    def test_html_content_is_preferred_over_short_text_preview(self) -> None:
        module = self._load_service_module()
        service = module.WhatsAppDocumentService()

        doc_session = types.SimpleNamespace(
            params={
                "content": "short preview",
                "html_content": "<h1>Full Agreement</h1><p>Complete content</p>",
            }
        )

        if "html_content" in doc_session.params:
            chosen = doc_session.params["html_content"]
        elif "content" in doc_session.params:
            chosen = doc_session.params["content"]
        else:
            chosen = None

        self.assertEqual(chosen, "<h1>Full Agreement</h1><p>Complete content</p>")

    def test_agent_document_output_removes_markdown_artifacts(self) -> None:
        module = self._load_service_module()
        service = module.WhatsAppDocumentService()

        cleaned = service._clean_agent_document_output(
            '```markdown\n**Rental Agreement** ["bad"?] (extra) clause\n```'
        )

        self.assertNotIn("*", cleaned)
        self.assertNotIn("[", cleaned)
        self.assertNotIn("]", cleaned)
        self.assertNotIn('"', cleaned)
        self.assertNotIn("?", cleaned)
        self.assertNotIn("(", cleaned)
        self.assertNotIn(")", cleaned)
        self.assertIn("Rental Agreement", cleaned)


if __name__ == "__main__":
    unittest.main()
