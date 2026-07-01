import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

_EMAIL_SERVICE_PATH = Path(__file__).resolve().parents[1] / "app" / "services" / "email_service.py"
_EMAIL_SERVICE_SPEC = importlib.util.spec_from_file_location("email_service_under_test", _EMAIL_SERVICE_PATH)
assert _EMAIL_SERVICE_SPEC and _EMAIL_SERVICE_SPEC.loader

requests_stub = ModuleType("requests")
requests_stub.post = None
resend_stub = ModuleType("resend")
resend_stub.api_key = None
resend_stub.Emails = SimpleNamespace(send=lambda params: None)
app_stub = ModuleType("app")
core_stub = ModuleType("app.core")
core_stub.settings = SimpleNamespace(
    frontend_url="http://localhost:3000",
    gmail_client_id=None,
    gmail_client_secret=None,
    gmail_refresh_token=None,
    gmail_sender_email=None,
    resend_api_key="test-key",
    resend_from_email="send@example.com",
)
app_stub.core = core_stub

sys.modules.setdefault("requests", requests_stub)
sys.modules.setdefault("resend", resend_stub)
sys.modules.setdefault("app", app_stub)
sys.modules.setdefault("app.core", core_stub)

email_service = importlib.util.module_from_spec(_EMAIL_SERVICE_SPEC)
_EMAIL_SERVICE_SPEC.loader.exec_module(email_service)


class EmailServiceFallbackTests(TestCase):
    @patch.object(email_service, "_resend_configured", return_value=True)
    @patch.object(email_service, "_gmail_configured", return_value=True)
    @patch.object(email_service, "_send_via_resend")
    @patch.object(email_service, "_send_via_gmail", side_effect=RuntimeError("gmail blocked"))
    def test_deliver_email_falls_back_to_resend_when_gmail_fails(
        self,
        send_gmail,
        send_resend,
        gmail_configured,
        resend_configured,
    ) -> None:
        email_service._deliver_email(
            to=["client@example.com"],
            cc=None,
            subject="Lease Deed",
            html_content="<p>Test</p>",
            from_header="LexHelm <send@example.com>",
        )

        send_gmail.assert_called_once()
        send_resend.assert_called_once()

    def test_prepare_document_html_for_email_inlines_stamp_assets(self) -> None:
        result, inline_attachments = email_service._prepare_document_html_for_email(
            '<div><img src="/stamps/non-judicial-10.png" alt="stamp" /></div>'
        )

        self.assertIn('src="cid:stamp-1@lexhelm"', result)
        self.assertEqual(len(inline_attachments), 1)
        self.assertEqual(inline_attachments[0]["filename"], "non-judicial-10.png")

    @patch.object(email_service.resend.Emails, "send")
    def test_send_via_resend_sends_inline_stamp_only(self, send_mock) -> None:
        email_service._send_via_resend(
            to=["client@example.com"],
            cc=None,
            subject="Lease Deed",
            html_content="<div>Lease body</div>",
            inline_attachments=[
                {
                    "filename": "non-judicial-10.png",
                    "content": b"stamp-bytes",
                    "content_type": "image/png",
                    "content_id": "stamp-1@lexhelm",
                }
            ],
            from_header="LexHelm <send@example.com>",
        )

        payload = send_mock.call_args.args[0]
        self.assertIn("attachments", payload)
        self.assertEqual(len(payload["attachments"]), 1)
        self.assertEqual(payload["attachments"][0]["content_id"], "stamp-1@lexhelm")
        self.assertEqual(payload["html"], "<div>Lease body</div>")

    def test_prepare_document_html_for_email_converts_data_uri_stamp(self) -> None:
        html = '<img src="data:image/png;base64,c3RhbXA=" alt="Non-judicial stamp paper Rs.50" />'
        result, inline_attachments = email_service._prepare_document_html_for_email(html)

        self.assertIn('src="cid:stamp-1@lexhelm"', result)
        self.assertEqual(inline_attachments[0]["content"], b"stamp")

    @patch.object(email_service, "_deliver_email")
    def test_send_document_email_renders_edit_link(self, deliver_mock) -> None:
        email_service.send_document_email(
            to=["client@example.com"],
            cc=[],
            subject="Review your lease",
            document_html=None,
            document_link="http://localhost:3000/public-doc/abc123",
            document_title="Lease Agreement",
            sender_name="LexHelm User",
            sender_email="user@example.com",
        )

        payload = deliver_mock.call_args.kwargs
        self.assertIn("Hi there,", payload["html_content"])
        self.assertIn("Link or URL", payload["html_content"])
        self.assertIn("Use the link above to open the editable document page.", payload["html_content"])
        self.assertIn("http://localhost:3000/public-doc/abc123", payload["html_content"])
