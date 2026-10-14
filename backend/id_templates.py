"""
id_templates.py - Layout templates, format validators, and metadata for Philippine IDs.
Supports manual ID type selection and template-driven extraction.
"""

import re
from typing import Dict, Any, Optional, Tuple

SUPPORTED_ID_TYPES: Dict[str, Dict[str, Any]] = {
    'philsys': {
        'id_type': 'philsys',
        'label': 'Philippine National ID (PhilSys ID / ePhilID)',
        'short_label': 'National ID',
        'id_number_label': 'Card Number (16 Digits)',
        'pattern': r'^(?:\d{4}[-\s]?){3}\d{4}$',
        'format_hint': '16 digits (e.g. 1234-5678-9012-3456)',
        'trust_tier': 'standard_high',
        'requires_manual_review': False,
        'front_copy': 'Upload the FRONT of your Philippine National ID',
        'back_copy': 'Upload the BACK of your Philippine National ID',
        'instructions': 'Make sure your ID number and the QR code on your card are clearly visible.',
        'aliases': ['philid', 'psn', 'philsys', 'national_id', 'ephilid'],
    },
    'lto': {
        'id_type': 'lto',
        'label': "Driver's License (LTO)",
        'short_label': "Driver's License",
        'id_number_label': 'License Number',
        'pattern': r'^[A-Z]\d{2}[-\s]?\d{2}[-\s]?\d{6}$',
        'format_hint': 'Letter + 2 digits + 2 digits + 6 digits (e.g. N02-14-012345)',
        'trust_tier': 'standard_high',
        'requires_manual_review': False,
        'front_copy': "Upload the FRONT of your Driver's License",
        'back_copy': "Upload the BACK of your Driver's License",
        'instructions': 'Make sure your License Number and Expiration Date at the top are clearly readable.',
        'aliases': ['lto', 'driver', 'drivers_license', 'dl'],
    },
    'umid': {
        'id_type': 'umid',
        'label': 'UMID (Unified Multi-Purpose ID)',
        'short_label': 'UMID Card',
        'id_number_label': 'ID / Reference Number (12 Digits)',
        'pattern': r'^\d{4}[-\s]?\d{7}[-\s]?\d{1}$',
        'format_hint': '12 digits (e.g. 0033-1234567-8)',
        'trust_tier': 'standard_high',
        'requires_manual_review': False,
        'front_copy': 'Upload the FRONT of your UMID Card',
        'back_copy': 'Upload the BACK of your UMID Card',
        'instructions': 'Make sure the 12-digit number at the top right is clear and readable.',
        'aliases': ['umid', 'crn'],
    },
    'passport': {
        'id_type': 'passport',
        'label': 'Passport (DFA)',
        'short_label': 'Philippine Passport',
        'id_number_label': 'Passport Number',
        'pattern': r'^[A-Z]\d{7}[A-Z0-9]?$',
        'format_hint': '1 letter + 7-8 alphanumeric characters (e.g. P1234567A)',
        'trust_tier': 'standard_high',
        'requires_manual_review': False,
        'front_copy': 'Upload the PHOTO / DATA page of your Passport',
        'back_copy': 'Upload the SIGNATURE / AMENDMENTS page or Back Cover',
        'instructions': 'Make sure the photo page, your passport number, and the lines at the bottom are fully visible.',
        'aliases': ['passport', 'dfa', 'ph_passport'],
    },
    'comelec': {
        'id_type': 'comelec',
        'label': "Voter's ID / COMELEC Voter's Certification",
        'short_label': "Voter's ID / Cert",
        'id_number_label': 'Voter ID / Control Number',
        'pattern': r'^[A-Z0-9-]{8,25}$',
        'format_hint': 'VOTER ID / VIN (e.g. 7501-0123A-B123ABC)',
        'trust_tier': 'standard_high',
        'requires_manual_review': False,
        'front_copy': "Upload the FRONT of your Voter's ID or Certification",
        'back_copy': "Upload the BACK of your Voter's ID or Certification",
        'instructions': 'Make sure your ID number, precinct number, and barangay address are clearly visible.',
        'aliases': ['comelec', 'voter', 'voters_id', 'voter_cert'],
    },
    'philhealth': {
        'id_type': 'philhealth',
        'label': 'PhilHealth ID',
        'short_label': 'PhilHealth ID',
        'id_number_label': 'PhilHealth Number (12 Digits)',
        'pattern': r'^\d{2}[-\s]?\d{9}[-\s]?\d{1}$',
        'format_hint': '12 digits (e.g. 12-345678901-2)',
        'trust_tier': 'standard_medium',
        'requires_manual_review': False,
        'front_copy': 'Upload the FRONT of your PhilHealth ID',
        'back_copy': 'Upload the BACK of your PhilHealth ID',
        'instructions': 'Make sure your 12-digit PhilHealth number at the top is in clear focus.',
        'aliases': ['philhealth', 'phic', 'pin'],
    },
    'sss_gsis': {
        'id_type': 'sss_gsis',
        'label': 'SSS ID / GSIS ID',
        'short_label': 'SSS / GSIS ID',
        'id_number_label': 'Member ID Number',
        'pattern': r'^(?:\d{2}[-\s]?\d{7}[-\s]?\d{1}|\d{10,11})$',
        'format_hint': '10 digits (e.g. 01-2345678-9 or GSIS BP No.)',
        'trust_tier': 'standard_medium',
        'requires_manual_review': False,
        'front_copy': 'Upload the FRONT of your SSS or GSIS Card',
        'back_copy': 'Upload the BACK of your SSS or GSIS Card',
        'instructions': 'Make sure your member identification number is clearly visible.',
        'aliases': ['sss', 'gsis', 'sss_id', 'gsis_id', 'sss_gsis'],
    },
    'postal': {
        'id_type': 'postal',
        'label': 'Postal ID (PHLPost)',
        'short_label': 'Postal ID',
        'id_number_label': 'Postal ID Number',
        'pattern': r'^(?:PRN[-\s]?)?[A-Z0-9]{12,16}$',
        'format_hint': '16 alphanumeric characters (e.g. PRN123456789012)',
        'trust_tier': 'standard_medium',
        'requires_manual_review': False,
        'front_copy': 'Upload the FRONT of your Postal ID',
        'back_copy': 'Upload the BACK of your Postal ID',
        'instructions': 'Make sure your ID number, photo, and expiration date are clearly visible.',
        'aliases': ['postal', 'phlpost', 'prn'],
    },
    'barangay': {
        'id_type': 'barangay',
        'label': 'Barangay ID / Barangay Certification',
        'short_label': 'Barangay ID / Cert',
        'id_number_label': 'Certificate / Control Number',
        'pattern': r'^[A-Z0-9\/-]{4,25}$',
        'format_hint': 'Control or Certificate No. (e.g. BRGY-171-2026-001)',
        'trust_tier': 'review',
        'requires_manual_review': True,
        'front_copy': 'Upload your Barangay ID or Barangay Certification',
        'back_copy': 'Upload the BACK or Official Seal / Receipt page',
        'instructions': 'Notice: Barangay credentials require manual LGU verification review before full civic access.',
        'aliases': ['barangay', 'brgy', 'brgy_id', 'brgy_cert'],
    }
}


def normalize_id_type(raw_type: Optional[str]) -> str:
    """Map any raw ID type string or alias to a canonical key."""
    if not raw_type:
        return 'unknown'
    cleaned = raw_type.strip().lower().replace('-', '_').replace(' ', '_')
    for key, template in SUPPORTED_ID_TYPES.items():
        if cleaned == key or cleaned in template['aliases']:
            return key
    return 'unknown'


def get_template(id_type: Optional[str]) -> Optional[Dict[str, Any]]:
    """Retrieve template by canonical key or alias."""
    norm = normalize_id_type(id_type)
    return SUPPORTED_ID_TYPES.get(norm)


def validate_and_normalize_id_number(id_type: Optional[str], raw_number: Optional[str]) -> Tuple[str, bool, str]:
    """
    Validates and formats the ID number according to the ID type template.
    Returns (normalized_number, is_valid, format_hint).
    """
    if not raw_number:
        template = get_template(id_type)
        return ('', False, template['format_hint'] if template else 'Required')

    norm_type = normalize_id_type(id_type)
    template = SUPPORTED_ID_TYPES.get(norm_type)
    
    # Strip leading/trailing noise, common label prefixes
    cleaned = str(raw_number).strip().upper()
    cleaned = re.sub(r'^(PCN|CRN|VIN|PIN|PRN|NO\.?|ID\.?|NUMBER|LICENSE NO\.?)\s*[:#-]?\s*', '', cleaned, flags=re.IGNORECASE).strip()

    if not template:
        # Generic alphanumeric fallback
        return (cleaned, bool(len(cleaned) >= 4), 'Alphanumeric ID Number')

    pattern = template['pattern']
    format_hint = template['format_hint']
    
    # Format specific normalizations
    if norm_type == 'philsys':
        # Normalize 16 digits
        digits_only = re.sub(r'\D', '', cleaned)
        if len(digits_only) == 16:
            formatted = f"{digits_only[0:4]}-{digits_only[4:8]}-{digits_only[8:12]}-{digits_only[12:16]}"
            return (formatted, True, format_hint)
        is_match = bool(re.match(pattern, cleaned))
        return (cleaned, is_match, format_hint)

    elif norm_type == 'lto':
        # E.g. N02-14-012345
        digits_and_letters = re.sub(r'[^A-Z0-9]', '', cleaned)
        if len(digits_and_letters) == 11 and digits_and_letters[0].isalpha():
            formatted = f"{digits_and_letters[0:3]}-{digits_and_letters[3:5]}-{digits_and_letters[5:11]}"
            return (formatted, True, format_hint)
        is_match = bool(re.match(pattern, cleaned))
        return (cleaned, is_match, format_hint)

    elif norm_type == 'umid':
        # E.g. 0033-1234567-8
        digits_only = re.sub(r'\D', '', cleaned)
        if len(digits_only) == 12:
            formatted = f"{digits_only[0:4]}-{digits_only[4:11]}-{digits_only[11:12]}"
            return (formatted, True, format_hint)
        is_match = bool(re.match(pattern, cleaned))
        return (cleaned, is_match, format_hint)

    elif norm_type == 'philhealth':
        # E.g. 12-345678901-2
        digits_only = re.sub(r'\D', '', cleaned)
        if len(digits_only) == 12:
            formatted = f"{digits_only[0:2]}-{digits_only[2:11]}-{digits_only[11:12]}"
            return (formatted, True, format_hint)
        is_match = bool(re.match(pattern, cleaned))
        return (cleaned, is_match, format_hint)

    elif norm_type == 'sss_gsis':
        digits_only = re.sub(r'\D', '', cleaned)
        if len(digits_only) == 10:
            formatted = f"{digits_only[0:2]}-{digits_only[2:9]}-{digits_only[9:10]}"
            return (formatted, True, format_hint)
        is_match = bool(re.match(pattern, cleaned))
        return (cleaned, is_match, format_hint)

    is_match = bool(re.match(pattern, cleaned))
    return (cleaned, is_match, format_hint)


def is_id_type_compatible(detected_type: Optional[str], selected_type: Optional[str]) -> bool:
    """
    Checks if the detected document type is compatible with what the resident selected.
    E.g. 'philid' <-> 'philsys', 'sss' <-> 'sss_gsis', etc.
    """
    if not detected_type or not selected_type:
        return True
    
    d_norm = normalize_id_type(detected_type)
    s_norm = normalize_id_type(selected_type)

    if d_norm == 'unknown' or s_norm == 'unknown':
        return True

    return d_norm == s_norm
