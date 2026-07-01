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


class DocumentServiceValidationTests(unittest.TestCase):
    def _load_service_module(self):
        core_module = types.ModuleType("app.core")
        core_module.settings = types.SimpleNamespace(
            gemini_api_key=None,
            gemini_lite_model="gemini-2.5-flash-lite",
            document_templates_dir="app/templates",
        )
        jinja2_module = types.ModuleType("jinja2")
        jinja2_module.Environment = object
        jinja2_module.FileSystemLoader = object
        jinja2_module.TemplateNotFound = Exception

        return _load_module(
            "testable_document_service",
            "app/services/document_service.py",
            {
                "app.core": core_module,
                "jinja2": jinja2_module,
            },
        )

    def test_llm_aadhaar_errors_are_ignored_when_number_is_valid(self) -> None:
        module = self._load_service_module()

        params = {
            "landlord_adhar_no": "112345534455",
            "tenant_adhar_no": "297433886199",
        }
        llm_errors = [
            "Landlord Adhar No is missing a digit. It should be 12 digits long.",
            "Tenant Adhar No is missing a digit. It should be 12 digits long.",
            "Tenant Address looks incomplete.",
        ]

        filtered = module._filter_rental_llm_errors(params, llm_errors)

        self.assertEqual(filtered, ["Tenant Address looks incomplete."])

    def test_basic_validator_accepts_valid_12_digit_aadhaar_values(self) -> None:
        module = self._load_service_module()

        params = {
            "landlord_name": "Balu",
            "tenant_name": "DurgaPrasad",
            "landlord_address": "Ameerpet Hyderabad",
            "tenant_address": "Begumpet Hyderabad",
            "property_address": "Block C Plot 5 Imperial Apartments Begumpet Hyderabad",
            "state": "Telangana",
            "stamp_amount": "10",
            "monthly_rent": "5000",
            "security_deposit": "5000",
            "rent_due_date": "5",
            "number_of_bedrooms": "1",
            "number_of_bathrooms": "1",
            "notice_required_to_terminate": "30",
            "lease_start_date": "13/5/2026",
            "lease_end_date": "12/6/2026",
            "agreement_date": "13/5/2026",
            "landlord_adhar_no": "112345534455",
            "tenant_adhar_no": "297433886199",
            "landlord_signature": "Balu",
            "tenant_signature": "DurgaPrasad",
        }

        self.assertEqual(module._validate_rental_fields_basic(params), [])

    def test_llm_address_and_date_errors_are_ignored_when_basic_checks_pass(self) -> None:
        module = self._load_service_module()

        params = {
            "landlord_address": "Krishna Nagar Greenlands Begumpet Hyderabad (500022)",
            "tenant_address": "Gurudwar Bazar Ameerpet Hyderabad (500016)",
            "property_address": "Block-C Plot No: G-5 Imperial Apartments Begumpet Hyderabad",
            "lease_start_date": "13 / 5 / 2026",
            "lease_end_date": "12 / 6 / 2026",
            "agreement_date": "13 / 5 / 2026",
            "landlord_adhar_no": "112345534455",
            "tenant_adhar_no": "297433886199",
        }
        llm_errors = [
            "Lease End Date must be a real date.",
            "Landlord address 'Krishna Nagar Greenlands Begumpet Hyderabad (500022)' contains a numeric-only pincode that is not clearly separated from the street address. Please ensure the pincode is distinct.",
            "Tenant address 'Gurudwar Bazar Ameerpet Hyderabad (500016)' contains a numeric-only pincode that is not clearly separated from the street address. Please ensure the pincode is distinct.",
            "Property address 'Block-C Plot No: G-5 Imperial Apartments Begumpet Hyderabad' is incomplete. It is missing the state and pincode.",
        ]

        filtered = module._filter_rental_llm_errors(params, llm_errors)

        self.assertEqual(filtered, [])

    def test_stamp_asset_path_does_not_crash_in_shallow_runtime_layout(self) -> None:
        module = self._load_service_module()
        original_file = module.__file__
        try:
            module.__file__ = "/app/app/services/document_service.py"
            stamp_path = module._stamp_asset_path("10")
        finally:
            module.__file__ = original_file

        self.assertEqual(stamp_path.name, "non-judicial-10.png")
        self.assertIsNone(module._build_stamp_data_uri("999"))

    def test_signature_fields_reject_numeric_names(self) -> None:
        module = self._load_service_module()

        params = {
            "landlord_name": "Shiva",
            "tenant_name": "Durga Prasad",
            "landlord_address": "Ameerpet Hyderabad",
            "tenant_address": "Begumpet Hyderabad",
            "property_address": "Block C Plot 5 Imperial Apartments Begumpet Hyderabad",
            "state": "Telangana",
            "stamp_amount": "10",
            "monthly_rent": "5000",
            "security_deposit": "5000",
            "rent_due_date": "5",
            "number_of_bedrooms": "1",
            "number_of_bathrooms": "1",
            "notice_required_to_terminate": "30",
            "lease_start_date": "13/5/2026",
            "lease_end_date": "12/6/2026",
            "agreement_date": "13/5/2026",
            "landlord_adhar_no": "112345534455",
            "tenant_adhar_no": "297433886199",
            "landlord_signature": "12345",
            "tenant_signature": "67890",
            "witness_signature": "99999",
        }

        errors = module._validate_rental_fields_basic(params)

        self.assertTrue(any("Landlord Signature" in error for error in errors))
        self.assertTrue(any("Tenant Signature" in error for error in errors))
        self.assertTrue(any("Witness Signature" in error for error in errors))

    def test_llm_validation_fails_soft_when_gemini_client_errors(self) -> None:
        module = self._load_service_module()
        module.settings.gemini_api_key = "invalid-key"

        class _FailingModels:
            async def generate_content(self, *args, **kwargs):
                raise RuntimeError("API key not valid")

        class _FailingClient:
            aio = types.SimpleNamespace(models=_FailingModels())

        module._get_genai_client = lambda: _FailingClient()

        result = asyncio.run(module._validate_rental_fields_with_llm({"landlord_name": "Asha"}))

        self.assertEqual(result, [])


if __name__ == "__main__":
    unittest.main()
