"""Synthetic Google fixtures only; no network, database, GPS, or real API keys."""
import unittest
from unittest.mock import AsyncMock, patch

import httpx
import maps_service
from address_privacy import parse_google_address, address_text, precise_plus_code, extract_plus_code, safe_value


def component(value, *types):
    return {"long_name": value, "types": list(types)}


FIXTURE = {
    "status": "OK", "plus_code": {"global_code": "849VCWC8+R9"},
    "results": [{"formatted_address": "PRIVATE Unit 88 Block 99 Lot 77", "address_components": [
        component("88", "street_number"), component("Unit 88", "subpremise"),
        component("Block 99 Lot 77", "premise"), component("Acacia Road", "route"),
        component("Example City", "locality"), component("Philippines", "country"),
        component("Sample Province", "administrative_area_level_2"),
    ]}, {"address_components": [
        component("Sample Village Phase 2", "premise"),
        component("Barangay Sample", "administrative_area_level_3"),
        component("1234", "postal_code"),
    ]}],
}


class AddressPrivacyTests(unittest.TestCase):
    def test_components_are_merged_without_formatted_or_private_data(self):
        address = parse_google_address(FIXTURE)
        self.assertEqual(address["plusCode"], "CWC8+R9")
        self.assertEqual(address["subdivision"], "Sample Village Phase 2")
        self.assertEqual(address["street"], "Acacia Road")
        self.assertEqual(address["barangay"], "Barangay Sample")
        self.assertEqual(address["postalCode"], "1234")
        self.assertNotIn("province", address)
        self.assertNotIn("country", address)
        self.assertNotRegex(address_text({**address, "province": "Sample Province", "country": "Philippines"}), r"Sample Province|Philippines")
        self.assertNotRegex(address_text(address), r"88|99|77|PRIVATE")

    def test_ambiguous_fields_and_missing_data_stay_empty(self):
        self.assertEqual(address_text(parse_google_address({})), "")
        address = parse_google_address({"results": [{"address_components": [
            component("Sample Village", "locality"),
            component("Uncertain area", "administrative_area_level_3"),
            component("Private Residence", "premise"),
        ]}]})
        self.assertEqual(address["subdivision"], "Sample Village")
        for key in ("city", "barangay", "region", "postalCode"):
            self.assertEqual(address[key], "")

    def test_private_labels_are_rejected_even_when_google_misclassifies_them(self):
        for value in ("123 Acacia Road", "Blk4 Lot16", "B4-L16", "Unit7", "Apartment 5", "#8", "12-A", "12A", "<script>x</script>", "14.123456, 121.123456", "Acacia\nUnit 1"):
            self.assertEqual(safe_value(value), "", value)
        self.assertEqual(safe_value("5th Avenue"), "5th Avenue")
        self.assertEqual(safe_value("Road 2"), "Road 2")

    def test_precise_plus_codes_follow_official_encoding_vectors(self):
        for lat, lng, full in [
            (20.3701125, 2.782234375, "7FG49QCJ+2VX"),
            (1, 1, "6FH32222+222"),
            (2.5, -64.23, "67JQGQ2C+222"),
            (-27, -122.3, "545V2P22+222"),
        ]:
            self.assertEqual(precise_plus_code(lat, lng, False), full)
            self.assertEqual(precise_plus_code(lat, lng), full[4:])
        self.assertEqual(extract_plus_code("849VCWC8+R9"), "CWC8+R9")
        self.assertEqual(extract_plus_code("849VCW00+"), "")
        self.assertEqual(precise_plus_code(None, 1), "")
        self.assertEqual(precise_plus_code(91, 1), "")


class ReverseGeocodeTests(unittest.IsolatedAsyncioTestCase):
    async def test_backend_preserves_string_api_and_returns_safe_details(self):
        client = AsyncMock()
        client.get.return_value = httpx.Response(200, json=FIXTURE, request=httpx.Request("GET", "https://example.invalid"))
        with patch.object(maps_service, "_get_api_key", return_value="FAKE_TEST_KEY"), patch.object(maps_service.httpx, "AsyncClient") as factory:
            factory.return_value.__aenter__.return_value = client
            details = await maps_service.reverse_geocode_details(14.5, 121.5)
            self.assertEqual(details["status"], "OK")
            self.assertNotRegex(str(details), r"PRIVATE|Unit|Block|Lot|FAKE_TEST_KEY|R9")
            self.assertEqual(await maps_service.reverse_geocode(14.5, 121.5), details["address"])
            self.assertEqual(client.get.call_args.kwargs["params"]["latlng"], "14.5,121.5")

    async def test_local_plus_code_survives_missing_key_and_provider_failure(self):
        with patch.object(maps_service, "_get_api_key", return_value=""):
            result = await maps_service.reverse_geocode_details(0, 0)
            self.assertEqual(result["status"], "NOT_CONFIGURED")
            self.assertEqual(result["address"], precise_plus_code(0, 0))
        client = AsyncMock()
        client.get.side_effect = httpx.ReadTimeout("FAKE PRIVATE PROVIDER ERROR")
        with patch.object(maps_service, "_get_api_key", return_value="FAKE_TEST_KEY"), patch.object(maps_service.httpx, "AsyncClient") as factory:
            factory.return_value.__aenter__.return_value = client
            result = await maps_service.reverse_geocode_details(0, 0)
            self.assertEqual(result["status"], "UNAVAILABLE")
            self.assertEqual(result["address"], precise_plus_code(0, 0))


if __name__ == "__main__":
    unittest.main()
