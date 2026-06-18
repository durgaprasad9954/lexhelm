from __future__ import annotations

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


class DraftChatValidationTests(unittest.TestCase):
    def _load_service_module(self):
        core_module = types.ModuleType("app.core")
        core_module.settings = types.SimpleNamespace(gemini_api_key=None)

        draft_models = types.ModuleType("app.models.draft_sessions")
        draft_models.DraftMessage = object
        draft_models.DraftSession = object

        document_service = types.ModuleType("app.services.document_service")
        document_service.TEMPLATE_REGISTRY = {
            "rental_agreement": {
                "name": "Rental / Lease Agreement",
                "required_fields": [
                    "landlord_name",
                    "tenant_name",
                    "property_address",
                    "landlord_address",
                    "tenant_address",
                    "monthly_rent",
                    "security_deposit",
                    "lease_start_date",
                    "lease_duration_months",
                ],
                "optional_fields": ["purpose"],
            }
        }
        document_service._get_genai_client = lambda: None
        document_service._strip_json_fences = lambda raw: raw
        document_service.generate_draft = lambda *args, **kwargs: "draft"

        sqlalchemy_module = types.ModuleType("sqlalchemy")
        sqlalchemy_module.select = lambda *args, **kwargs: None

        sqlalchemy_asyncio_module = types.ModuleType("sqlalchemy.ext.asyncio")
        sqlalchemy_asyncio_module.AsyncSession = object

        sqlalchemy_orm_module = types.ModuleType("sqlalchemy.orm")
        sqlalchemy_orm_module.selectinload = lambda *args, **kwargs: None

        return _load_module(
            "testable_draft_chat_service",
            "app/services/draft_chat_service.py",
            {
                "app.core": core_module,
                "app.models.draft_sessions": draft_models,
                "app.services.document_service": document_service,
                "sqlalchemy": sqlalchemy_module,
                "sqlalchemy.ext.asyncio": sqlalchemy_asyncio_module,
                "sqlalchemy.orm": sqlalchemy_orm_module,
            },
        )

    def test_invalid_calendar_date_is_rejected(self) -> None:
        module = self._load_service_module()

        self.assertFalse(module._validate_field_value("lease_start_date", "13/14/2027"))
        self.assertFalse(module._validate_field_value("lease_start_date", "113/14/2026"))
        self.assertFalse(module._validate_field_value("lease_start_date", "113/14/20278"))

    def test_valid_calendar_date_is_accepted(self) -> None:
        module = self._load_service_module()

        self.assertTrue(module._validate_field_value("lease_start_date", "15/06/2026"))
        self.assertTrue(module._validate_field_value("lease_start_date", "15 June 2026"))

    def test_numeric_landlord_name_is_rejected(self) -> None:
        module = self._load_service_module()

        self.assertFalse(module._validate_field_value("landlord_name", "123456"))
        self.assertFalse(module._validate_field_value("landlord_name", "98765 43210"))
        self.assertEqual(
            module._extract_with_context("123456", "landlord_name", "rental_agreement"),
            {},
        )
        self.assertTrue(module._validate_field_value("landlord_name", "Ramesh Kumar"))

    def test_rental_address_labels_use_aadhaar_wording(self) -> None:
        module = self._load_service_module()

        self.assertEqual(module._field_label("landlord_address"), "Landlord Native Address (Aadhaar Card)")
        self.assertEqual(module._field_label("tenant_address"), "Tenant Native Address (Aadhaar Card)")


if __name__ == "__main__":
    unittest.main()
