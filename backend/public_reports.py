"""Allowlisted fields for reports shared with residents and public map viewers."""

import re
from urllib.parse import quote


PUBLIC_CATEGORIES = frozenset({
    "Water Supply & Distribution",
    "Water Pipeline",
    "Water pipeline",
    "Drainage & Flooding",
    "Roads & Bridges",
    "Traffic & Road Signs",
    "Power & Street Lighting",
    "Public Safety & Hazards",
    "Public Buildings & Facilities",
    "Waste Management",
    "Water & Drainage",
    "Street Lighting",
    "Electrical Wiring",
    "Traffic & Signage",
    "Public Facilities",
    "Public Buildings",
    "Roads",
    "Drainage",
    "Bridges",
    "Facilities",
    "Electrical",
    "Safety",
    "Traffic",
    "Waste",
    "Infrastructure",
})


def safe_public_category(value: str | None) -> str:
    """Never echo a free-text category into a public response."""
    parts = [part.strip() for part in (value or "").split(",")]
    if parts and all(part in PUBLIC_CATEGORIES for part in parts):
        return ", ".join(parts)
    return "Infrastructure"


def safe_public_area(value: str | None) -> str:
    """Publish only a barangay number, never a resident-entered address."""
    match = re.fullmatch(
        r"\s*(?:(?:Barangay|Brgy\.?)\s*)?(\d{1,3})(?:\s*\(\s*Brgy\.\s*\1\s*\))?\s*",
        value or "",
        re.IGNORECASE,
    )
    if match:
        number = int(match.group(1))
        if 1 <= number <= 188:
            return f"Barangay {number}, Caloocan City"
    return "Caloocan City"


def public_incident_description(value: str | None, private_values=()) -> str:
    """Remove common contact details from verified incident text before publication."""
    description = (value or "").strip()
    description = re.sub(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b", "[contact removed]", description)
    description = re.sub(r"(?<!\d)(?:\+?63|0)9\d{9}(?!\d)", "[contact removed]", description)
    for private_value in private_values:
        if private_value and str(private_value).strip():
            description = re.sub(re.escape(str(private_value).strip()), "[personal information removed]", description, flags=re.IGNORECASE)
    return description


def public_report_photo(value: str | None) -> str | None:
    """Serve a metadata-free copy of a local report photo, never an arbitrary URL."""
    if not value or not re.fullmatch(r"/api/uploads/reports/report_[a-f0-9]{16}\.(?:jpe?g|png|webp)", value, re.IGNORECASE):
        return None
    return f"/api/thumbnails?src={quote(value, safe='')}&size=512"
