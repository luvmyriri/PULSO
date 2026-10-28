"""Build display addresses from Google components, never formatted_address."""
import re

PRIVATE = re.compile(r"\b(?:bl(?:oc)?k|lot|unit|apartment|apt|flat|suite|room|rm|floor|flr|house|building|bldg|door|tower|condominium|condo|purok|sitio)(?:\b|(?=\d))|\bB\s*\d+\s*[-/]?\s*L\s*\d+\b|#|[<>]", re.I)
VILLAGE = re.compile(r"\b(?:village|subdivision|subd\.?|homes|heights|estate|ville|residential community)\b", re.I)
BARANGAY = re.compile(r"^(?:barangay|brgy\.?|bgy\.?)\s+\S", re.I)
FIELDS = ("plusCode", "subdivision", "neighborhood", "street", "barangay", "city", "postalCode", "region")


def safe_value(value):
    if not isinstance(value, str):
        return ""
    if "\n" in value or "\r" in value:
        return ""
    text = " ".join(value.split())
    if not text or re.match(r"^(?:undefined|null|address unavailable|lat(?:itude)?\s*:|lng\s*:|coordinates\s*:)", text, re.I):
        return ""
    if PRIVATE.search(text) or re.search(r"[,;\n\r]|\b\d{1,3}\.\d{3,}\b", text):
        return ""
    if re.match(r"^\d+[A-Za-z]?(?:[-/]\w+)?\s", text) and not re.match(r"^\d+(?:st|nd|rd|th)\s+(?:street|st\.?|avenue|ave\.?|road|rd\.?)\b", text, re.I):
        return ""
    if re.fullmatch(r"\d+[A-Za-z]|\d+[-/]\w+", text):
        return ""
    return re.sub(r"\b[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,7}\b", "", text, flags=re.I).strip()


def precise_plus_code(lat, lng, short=True):
    """Encode the selected point with 11 significant Open Location Code digits."""
    import math
    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        return ""
    if not math.isfinite(lat) or not math.isfinite(lng) or abs(lat) > 90 or abs(lng) > 180:
        return ""
    alphabet = "23456789CFGHJMPQRVWX"
    latitude = min(4499999999, math.floor(round(lat * 25000000, 6)) + 2250000000)
    longitude = (math.floor(round(lng * 8192000, 6)) + 1474560000) % 2949120000
    grid = ""
    for _ in range(5):
        grid = alphabet[(latitude % 5) * 4 + longitude % 4] + grid
        latitude //= 5
        longitude //= 4
    pairs = ""
    for _ in range(5):
        pairs = alphabet[latitude % 20] + alphabet[longitude % 20] + pairs
        latitude //= 20
        longitude //= 20
    full = pairs[:8] + "+" + pairs[8:] + grid[0]
    return full[4:] if short else full


def extract_plus_code(value):
    if not isinstance(value, str):
        return ""
    match = re.search(r"(?:^|\s)([23456789CFGHJMPQRVWX]{4}(?:[23456789CFGHJMPQRVWX]{4})?\+[23456789CFGHJMPQRVWX]{2,7})(?=$|\s|,)", value.upper())
    if not match:
        return ""
    code = match[1]
    return code[4:] if code.index("+") == 8 else code


def parse_google_address(data):
    """Inspect all results. Omit ambiguous barangay/city/premise classifications."""
    if not isinstance(data, dict):
        data = {}
    components = [c for row in data.get("results", []) for c in row.get("address_components", [])]
    entries = [(safe_value(c.get("long_name") or c.get("short_name")), c.get("types", [])) for c in components
               if not set(c.get("types", [])).intersection({"street_number", "subpremise", "floor", "room", "postal_code_suffix"})]

    def first(types, predicate=lambda value: True):
        return next((value for value, labels in entries if value and set(types).intersection(labels) and predicate(value)), "")

    political = ["sublocality", "sublocality_level_1", "sublocality_level_2", "sublocality_level_3", "sublocality_level_4", "sublocality_level_5", "neighborhood", "administrative_area_level_3", "administrative_area_level_4", "locality"]
    barangay = first(political, lambda v: bool(BARANGAY.search(v)))
    subdivision = first(political + ["premise"], lambda v: bool(VILLAGE.search(v)) and not BARANGAY.search(v))
    neighborhood = first(["neighborhood", "sublocality", "sublocality_level_1", "sublocality_level_2"], lambda v: v not in (barangay, subdivision) and not BARANGAY.search(v) and not VILLAGE.search(v))
    city = first(["locality", "postal_town"], lambda v: not BARANGAY.search(v) and not VILLAGE.search(v)) or first(["administrative_area_level_2", "administrative_area_level_3"], lambda v: bool(re.search(r"\b(?:city|municipality)\b", v, re.I)))
    codes = [data.get("plus_code", {}).get("global_code", "")]
    codes += [row.get("plus_code", {}).get("global_code", "") for row in data.get("results", [])]
    codes += [c.get("long_name", "") for c in components if "plus_code" in c.get("types", [])]
    address = {
        "plusCode": next((code for value in codes if (code := extract_plus_code(value))), ""),
        "subdivision": subdivision, "neighborhood": neighborhood, "street": first(["route"]),
        "barangay": barangay, "city": city,
        "region": first(["administrative_area_level_1"]),
        "postalCode": first(["postal_code"]),
    }
    for field in FIELDS:
        if field != "postalCode" and address[field].isdigit():
            address[field] = ""
    address["streetAddress"] = address["street"]
    return address


def address_text(address):
    seen = set()
    parts = []
    for key in FIELDS:
        value = address.get(key, "")
        if value and value.casefold() not in seen:
            seen.add(value.casefold())
            parts.append(value)
    return ", ".join(parts)
