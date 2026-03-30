"""
ocr_service.py — Philippine ID OCR & Residency Verification
Supports all 9 major Philippine government-issued IDs.

ID Types Handled:
  1. PhilSys / PhilID (National ID)
  2. UMID / SSS Card
  3. LTO Driver's License
  4. PRC Professional ID
  5. PhilHealth / PHIC
  6. Pag-IBIG / HDMF
  7. Postal ID (PHLPost)
  8. COMELEC Voter's ID
  9. Philippine Passport
  10. GSIS ID
"""

import os
import io
import re
import base64
import requests
import json
import asyncio
import time
from PIL import Image, ImageEnhance, ImageFilter
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
from dotenv import load_dotenv
from id_parsers import get_parser
import gemini_service

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

OCR_API_KEY          = os.getenv('OCR_API_KEY', 'helloworld')
GOOGLE_VISION_API_KEY = os.getenv('GOOGLE_VISION_API_KEY')

# Filipino month names (Tagalog + English)
MONTH_MAP = {
    'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3, 'APRIL': 4,
    'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8,
    'SEPTEMBER': 9, 'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12,
    'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'JUN': 6,
    'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
    # Tagalog months (sometimes printed on older IDs)
    'ENERO': 1, 'PEBRERO': 2, 'MARSO': 3, 'ABRIL': 4,
    'MAYO': 5, 'HUNYO': 6, 'HULYO': 7, 'AGOSTO': 8,
    'SETYEMBRE': 9, 'OKTUBRE': 10, 'NOBYEMBRE': 11, 'DISYEMBRE': 12,
}

# Common Filipino surnames — used for heuristic name detection
COMMON_PH_SURNAMES = {
    'SANTOS', 'REYES', 'CRUZ', 'BAUTISTA', 'GARCIA', 'GONZALES', 'MENDOZA',
    'FLORES', 'CASTRO', 'RAMOS', 'AQUINO', 'DELA', 'DE', 'DEL', 'DELOS',
    'DELA CRUZ', 'DE LOS SANTOS', 'SAN', 'LIM', 'TAN', 'CO', 'GO',
    'AGUILAR', 'TORRES', 'VILLANUEVA', 'MORALES', 'BERNARDO', 'RODRIGUEZ',
    'ESPIRITU', 'ENRIQUEZ', 'GUTIERREZ', 'HERNANDEZ', 'MALABANAN',
    'PONCE', 'PASCUAL', 'MARIANO', 'SANTIAGO', 'TOLENTINO', 'SERRANO',
    'DAVID', 'VELASCO', 'SALAZAR', 'GUEVARRA', 'BUENAVENTURA', 'PERALTA',
    'MIRANDA', 'DIZON', 'CORPUZ', 'MACARAEG', 'CORTEZ', 'SORIANO',
    'NAVAL', 'VALDEZ', 'DELA ROSA', 'RIVERA', 'EVANGELISTA', 'AUSTRIA',
    'GUERRERO', 'OCAMPO', 'ABREU', 'IGNACIO', 'ANTONIO', 'FRANCISCO',
    'DELA VEGA', 'NAVARRO', 'MERCADO', 'DOMINGO', 'VEGA', 'JOSE',
    'NICOLAS', 'ARELLANO', 'TRINIDAD', 'ATIENZA', 'MANALO', 'SISON',
    'DIMACULANGAN', 'PADILLA', 'ABAD', 'BACANI', 'CANLAS', 'DATU',
    'ESPEJO', 'FAJARDO', 'GALVEZ', 'HIDALGO', 'IBARRA', 'JIMENEZ',
    'LACSON', 'MACAPAGAL', 'NARCISO', 'ORTEGA', 'PEREZ', 'QUISUMBING',
    'ROMUALDEZ', 'TABIOS', 'UMALI', 'UY', 'YULO', 'ZOBEL',
}

# Non-name keywords to exclude from address/name detection
ADDRESS_KEYWORDS = {
    'STREET', 'ST.', 'ST ', 'AVE', 'AVENUE', 'RD', 'ROAD', 'BLVD',
    'BLK', 'LOT', 'BLOCK', 'PHASE', 'ZONE', 'PUROK', 'SITIO',
    'SUBDIVISION', 'SUBD', 'VILLAGE', 'VLG', 'HOMES', 'HEIGHTS',
    'CALOOCAN', 'QUEZON', 'MANILA', 'METRO', 'CITY', 'BARANGAY', 'BRGY', 'BAGUMBONG',
}

NON_NAME_KEYWORDS = {
    'REPUBLIC', 'PHILIPPINES', 'COMMISSION', 'ELECTIONS', 'PROFESSIONAL',
    'REGULATION', 'TRANSPORTATION', 'INSURANCE', 'HEALTH', 'POSTAL',
    'GOVERNMENT', 'UNIFIED', 'MULTI', 'PURPOSE', 'DEPARTMENT', 'NATIONAL',
    'BLOOD', 'TYPE', 'HEIGHT', 'WEIGHT', 'SEX', 'GENDER', 'CIVIL',
    'STATUS', 'VALIDITY', 'EXPIRY', 'ISSUED', 'VALID', 'UNTIL',
    'SIGNATURE', 'BEARER', "BEARER'S", 'THUMB', 'TIN', 'DATE', 'BIRTH',
    'LICENSE', 'RESTRICTION', 'NUMBER', 'CONTROL', 'CARD', 'ID', 'NO',
    # Organization names that can look like personal names
    'SOCIAL', 'SECURITY', 'SYSTEM', 'UNIFIED', 'COOPERATIVE',
    'MUTUAL', 'DEVELOPMENT', 'HOME', 'FUND', 'HOUSING', 'AGENCY',
    'OFFICE', 'BUREAU', 'DIVISION', 'COMMISSION', 'CENTER', 'SERVICE',
    'ELECTION', 'VOTER', 'WORKERS', 'EMPLOYEES', 'MEMBERS', 'BENEFICIARY',
    'NAME', 'FIRST', 'MIDDLE', 'LAST', 'SURNAME', 'GIVEN', 'INITIAL',
    'RESTRICTION', 'CODE', 'CONDITIONS', 'OTHERS',
}

# ---------------------------------------------------------------------------
# Image Preprocessing
# ---------------------------------------------------------------------------

def preprocess_image(image_bytes: bytes, for_vision_api: bool = False) -> bytes:
    """
    Optimized image preprocessing for speed and accuracy.
    - Uses BILINEAR for faster resizing.
    - Reduces enhancement passes if not strictly necessary.
    """
    try:
        start_time = time.time()
        img = Image.open(io.BytesIO(image_bytes))

        # Convert palette/RGBA to RGB
        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')

        # Fast resize for smaller images
        if img.width < 800:
            scale = 800 / img.width
            img = img.resize(
                (800, int(img.height * scale)), Image.Resampling.BILINEAR
            )

        # Cap large images to avoid Vision API overhead
        if img.width > 2000:
            scale = 2000 / img.width
            img = img.resize(
                (2000, int(img.height * scale)), Image.Resampling.BILINEAR
            )

        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Light contrast enhancement (only if accuracy is a concern)
        img = ImageEnhance.Contrast(img).enhance(1.2)

        if not for_vision_api:
            img = img.convert('L')

        output = io.BytesIO()
        img.save(output, format='JPEG', quality=85) # Lower quality = faster upload
        
        print(f"[OCR] Preprocessing took {time.time() - start_time:.3f}s")
        return output.getvalue()

    except Exception as e:
        print(f"[OCR] Preprocessing error: {e}")
        return image_bytes

# ---------------------------------------------------------------------------
# Address Component Parser  
# ---------------------------------------------------------------------------

def parse_address_components(raw: str, barangay: str = '') -> dict:
    """
    Splits a raw OCR address string into structured sub-fields:
    house_no, block_lot, subdivision, street.
    """
    import re as _re

    if not raw:
        return {'house_no': '', 'block_lot': '', 'subdivision': '', 'street': ''}

    # 1. Normalize
    s = raw.replace('\n', ' ').replace('|', ' ')
    s = _re.sub(r'\s{2,}', ' ', s).strip()

    # 2. CRITICAL: Philippine addresses often have trailing metadata after commas
    #    e.g. "Blk 40 Lot 3 Northville 2b Bagumbong, Barangay 171, City Of Caloocan, NCR..."
    #    Truncate at the first comma that is followed by city/barangay-level noise
    TRAILING_MARKERS = r',\s*(?:Barangay|Brgy|City|Municipality|Province|NCR|Metro\s+Manila|Philippines?|Caloocan|Quezon|Third\s+District)'
    m = _re.search(TRAILING_MARKERS, s, _re.I)
    if m:
        s = s[:m.start()].strip()

    # 3. Strip remaining noise keywords
    NOISE = r'\b(KASARIAN|SEX|MALE|FEMALE|PHILIPPINES?|REPUBLIKA\s+NG|ADDRESS|RESIDENCE|LICENSE|RESTRICTION|ISSUANCE|BLOOD\s+TYPE|EYE\s+COLOR|WEIGHT|HEIGHT|TIN|EXPIRY|NCR|THIRD\s+DISTRICT)\b'
    s = _re.sub(NOISE, '', s, flags=_re.I)
    # Strip 4-digit postal codes
    s = _re.sub(r'\b1[34]\d{2}\b', '', s)
    # Strip any remaining city/district words
    s = _re.sub(r'\b(CALOOCAN|KALOOKAN|CITY|METRO\s+MANILA|MANILA|DISTRICT|ZONE)\b', '', s, flags=_re.I)
    # Strip barangay text by name
    if barangay:
        bn = _re.sub(r'^Barangay\s*', '', barangay, flags=_re.I).strip()
        if bn:
            s = _re.sub(r'\b' + _re.escape(bn) + r'\b', '', s, flags=_re.I)
    s = _re.sub(r'\b(BARANGAY|BRGY\.?|BGY\.?)\s*\d+[A-Z]?\b', '', s, flags=_re.I)
    # Clean up punctuation artifacts
    s = _re.sub(r'[,\/]+', ' ', s)
    s = _re.sub(r'\s{2,}', ' ', s).strip()

    house_no = ''
    block_lot = ''
    street = ''
    subdivision = ''

    # 4. Extract Block & Lot (highest priority)
    blk_lot_re = r'\b((?:BLK|BLOCK|B\.?LK|8LK)\.?\s*\d+[A-Z]?\s*(?:LOT|L0T)\.?\s*\d+[A-Z]?|(?:LOT|L0T)\.?\s*\d+[A-Z]?\s*(?:BLK|BLOCK|B\.?LK)\.?\s*\d+[A-Z]?|(?:BLK|BLOCK|B\.?LK)\.?\s*\d+[A-Z]?|(?:LOT|L0T)\.?\s*\d+[A-Z]?)\b'
    m = _re.search(blk_lot_re, s, _re.I)
    if m:
        block_lot = _re.sub(r'8LK|B\.?LK', 'BLK', m.group(1), flags=_re.I)
        block_lot = _re.sub(r'L0T', 'LOT', block_lot, flags=_re.I)
        block_lot = block_lot.upper().strip()
        s = (s[:m.start()] + ' ' + s[m.end():]).strip()

    # 5. Leading house number (only if no block/lot)
    if not block_lot:
        m = _re.match(r'^(#?\d+[-\u2013\/]?[A-Za-z]?)\s', s)
        if m:
            house_no = m.group(1).lstrip('#')
            s = s[m.end():].strip()

    # 6. Extract Street (by suffix keyword)
    street_re = r'\b((?:[A-Za-z0-9#\.\-]+\s+)*(?:[A-Za-z0-9#\.\-]+)\s+(?:STREET|ST\.?|AVENUE|AVE\.?|ROAD|RD\.?|BOULEVARD|BLVD\.?|DRIVE|DR\.?|LANE|LN\.?|HIGHWAY|HWY\.?|EXTENSION|EXT\.?|LOOP|WALK|WAY|CIRCLE|CIR\.?))\b'
    m = _re.search(street_re, s, _re.I)
    if m:
        street = m.group(1).strip().title()
        s = (s[:m.start()] + ' ' + s[m.end():]).strip()

    # 7. Extract Subdivision / Village (after street extraction)
    subdiv_re = r'\b((?:[A-Za-z0-9#\.\-]+\s+)*(?:[A-Za-z0-9#\.\-]+\s+)?(?:HOMES?(?:\s+\d+[A-Z]?)?|VILLAGE|VILL(?:AGE)?\.?|HEIGHTS?|SUBD(?:\.?|IVISION)?|SUBDIVISION|VILLE|ESTATE|PARK(?:\s+\d+)?|PLACE|COURT(?:\s+\d+)?|NORTHVILLE(?:\s+[A-Z0-9]+[A-Z]?)?|FAIRVIEW|TOWNVILLE|RESIDENCES?|COMPOUND|ROYALE|PALMS?|GARDENS?|GROVE|HILLS?))\b'
    m = _re.search(subdiv_re, s, _re.I)
    if m:
        subdivision = m.group(1).strip().title()
        s = (s[:m.start()] + ' ' + s[m.end():]).strip()
        s = _re.sub(r'\s{2,}', ' ', s)

    # 8. Remainder -> street fallback if still empty
    s = _re.sub(r'[,\/\s]+$', '', s).lstrip(', ').strip()
    if not street and s:
        street = s.title().strip()

    return {
        'house_no':    house_no,
        'block_lot':   block_lot,
        'subdivision': subdivision,
        'street':      street,
    }

# ---------------------------------------------------------------------------
# ID Type Detection
# ---------------------------------------------------------------------------

def detect_id_type(text: str) -> str:
    """
    Identify which Philippine government ID was scanned.
    Returns a string key used to guide field extraction.
    """
    u = text.upper()

    # Order matters — more specific checks first
    if any(k in u for k in (
        'PHILSYS', 'PHILIPPINE IDENTIFICATION SYSTEM', 'PCN', 'PHILID',
        'PAMBANSANG PAGKAKAKILANLAN', 'PHILIPPINE NATIONAL ID',
        'PAMBANSANG ID', 'APELYIDO/LAST NAME', 'MGA PANGALAN', 'GITNANG APELYIDO',
        'PHILIPPINE STATISTICS AUTHORITY', 'PSA',
        'KASARIAN', 'URI NG DUGO', 'KALAGAYANG SIBIL', 'KAPANGANAKAN', 'MABINI'
    )):
        return 'philid'
    if any(k in u for k in ('UNIFIED MULTI-PURPOSE', 'UMID', 'SSS')):
        return 'umid'
    if any(k in u for k in ('LAND TRANSPORTATION OFFICE', 'LTO', "DRIVER'S LICENSE", 'DRIVER LICENSE', 'RESTRICTION CODE')):
        return 'lto'
    if any(k in u for k in ('PROFESSIONAL REGULATION COMMISSION', 'PRC', 'LICENSE NO.', 'LICENSURE')):
        return 'prc'
    if any(k in u for k in ('PHILHEALTH', 'PHIC', 'PHILIPPINE HEALTH INSURANCE')):
        return 'philhealth'
    if any(k in u for k in ('PAG-IBIG', 'HDMF', 'HOME DEVELOPMENT')):
        return 'pagibig'
    if any(k in u for k in ('PHLPOST', 'PHLPost', 'POSTAL ID', 'PHILIPPINE POSTAL')):
        return 'postal'
    if any(k in u for k in ('COMMISSION ON ELECTIONS', 'COMELEC', 'VOTERS IDENTIFICATION', "VOTER'S ID", 'VOTER IDENTIFICATION NUMBER')):
        return 'comelec'
    if 'PASSPORT' in u or re.search(r'^[A-Z]{2}\d{7}', u, re.MULTILINE):
        return 'passport'
    if any(k in u for k in ('GOVERNMENT SERVICE INSURANCE', 'GSIS')):
        return 'gsis'

    return 'unknown'

# ---------------------------------------------------------------------------
# Date Parsing
# ---------------------------------------------------------------------------

def parse_date(text: str) -> str:
    """
    Parses all common date formats found on Philippine IDs.
    Returns ISO 'YYYY-MM-DD' string or '' if no valid date found.
    """
    u = text.upper()

    # --- Format 1: YYYY-MM-DD or YYYY/MM/DD ---
    for m in re.finditer(r'(\d{4})[-/](\d{2})[-/](\d{2})', u):
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1900 < y < 2015 and 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"

    # --- Format 2: MM/DD/YYYY or MM-DD-YYYY ---
    for m in re.finditer(r'(\d{2})[-/](\d{2})[-/](\d{4})', u):
        mo, d, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1900 < y < 2015 and 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"

    # --- Format 3: DD Month YYYY (e.g. "01 JANUARY 1990" or "01 JAN 1990") ---
    for m in re.finditer(
        r'(\d{1,2})\s+(' + '|'.join(MONTH_MAP.keys()) + r')\s+(\d{4})', u
    ):
        d, mon_str, y = int(m.group(1)), m.group(2), int(m.group(3))
        mo = MONTH_MAP.get(mon_str, 0)
        if 1900 < y < 2015 and mo and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"

    # --- Format 4: Month DD, YYYY (e.g. "JANUARY 01, 1990") ---
    for m in re.finditer(
        r'(' + '|'.join(MONTH_MAP.keys()) + r')\s+(\d{1,2})[,\s]+(\d{4})', u
    ):
        mon_str, d, y = m.group(1), int(m.group(2)), int(m.group(3))
        mo = MONTH_MAP.get(mon_str, 0)
        if 1900 < y < 2015 and mo and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"

    # --- Format 5: DD-Mon-YYYY (e.g. "01-JAN-1990") ---
    for m in re.finditer(
        r'(\d{1,2})-(' + '|'.join(MONTH_MAP.keys()) + r')-(\d{4})', u
    ):
        d, mon_str, y = int(m.group(1)), m.group(2), int(m.group(3))
        mo = MONTH_MAP.get(mon_str, 0)
        if 1900 < y < 2015 and mo and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"

    return ''

# ---------------------------------------------------------------------------
# Barangay Extraction
# ---------------------------------------------------------------------------

BARANGAY_PATTERNS = [
    r'BARANGAY\s+(\d{1,3}[A-Z]?)',
    r'BRGY\.?\s*(\d{1,3}[A-Z]?)',
    r'BGY\.?\s*(\d{1,3}[A-Z]?)',
    r'BRY\.?\s*(\d{1,3}[A-Z]?)',
    r'BR\.\s*(\d{1,3}[A-Z]?)',
    r'BRGY\s+NO\.?\s*(\d{1,3}[A-Z]?)',
    r'ZONE\s+\d+[,\s]+BRGY\s*(\d{1,3}[A-Z]?)',
    r'PUROK\s+\d+[,\s]+BRGY\s*(\d{1,3}[A-Z]?)',
]

def extract_barangay(text: str) -> str:
    """Extract barangay number from OCR text using comprehensive patterns."""
    u = text.upper()

    for pattern in BARANGAY_PATTERNS:
        m = re.search(pattern, u)
        if m:
            return m.group(1).strip()

    # Fallback: look for a standalone 3-digit number in the 100–999 range
    # near address context (near CALOOCAN or address keywords)
    caloocan_idx = u.find('CALOOCAN')
    if caloocan_idx == -1:
        caloocan_idx = u.find('KALOOCAN')
    if caloocan_idx != -1:
        # Search ±300 chars around "CALOOCAN" for a bare number 100-999
        window = u[max(0, caloocan_idx - 300): caloocan_idx + 300]
        for m in re.finditer(r'\b(\d{3})\b', window):
            n = int(m.group(1))
            if 100 <= n <= 200:  # Reasonable barangay number range
                return m.group(1)

    return ''

# ---------------------------------------------------------------------------
# North Caloocan Residency Verification
# ---------------------------------------------------------------------------

def verify_north_caloocan_residency(address_text: str, barangay_num: str) -> Tuple[bool, str]:
    """
    Verifies if address is in North Caloocan (Barangays 165–188).
    Also accepts common OCR misspellings: KALOOKAN, KALOOCAN, CALOOCAN.
    """
    u = address_text.upper()
    is_caloocan = any(
        k in u for k in ('CALOOCAN', 'KALOOKAN', 'KALOOCAN', 'CALOOCAN CITY', 'CALOOCAN,')
    )

    if not is_caloocan:
        # Check for Metro Manila (less specific, borderline case)
        if 'METRO MANILA' in u or 'NCR' in u:
            # Can't verify barangay without city name
            if barangay_num:
                try:
                    brgy_int = int(re.sub(r'[^0-9]', '', barangay_num))
                    if 165 <= brgy_int <= 188:
                        return True, "Likely North Caloocan Resident (barangay in range, Metro Manila detected)."
                except ValueError:
                    pass
        return False, "Verification Failed: Address does not appear to be in Caloocan City."

    if barangay_num:
        try:
            # Strip any letter suffix (e.g. "174A" → 174)
            brgy_int = int(re.sub(r'[^0-9]', '', barangay_num))
            if 165 <= brgy_int <= 188:
                return True, f"North Caloocan Resident Verified (Barangay {brgy_int})."
            elif 1 <= brgy_int <= 164:
                return False, f"Verification Failed: Barangay {brgy_int} is in South Caloocan, not North Caloocan (165–188)."
            else:
                return False, f"Verification Failed: Barangay {brgy_int} is not a valid Caloocan barangay."
        except (ValueError, TypeError):
            pass

    # Caloocan found but no clear barangay — partial pass
    return False, "Verification Failed: Caloocan City detected but could not determine barangay number."

# ---------------------------------------------------------------------------
# Name Extraction — 4-Strategy Cascade
# ---------------------------------------------------------------------------

def _is_name_line(line: str) -> bool:
    """Return True if the line looks like it could be a person's name."""
    u = line.upper().strip()
    if not u or len(u) < 2:
        return False
    if re.search(r'\d', u):  # Contains digits → not a name
        return False
    words = u.split()
    if not words:
        return False
    # Reject lines that are all-keywords
    kw_count = sum(1 for w in words if w in NON_NAME_KEYWORDS or w in ADDRESS_KEYWORDS)
    if kw_count >= len(words):
        return False
    # Should contain only letters, spaces, hyphens, periods, parentheses, commas
    if not re.match(r'^[A-Z\s\-\.\,\(\)]+$', u):
        return False
    return True

def extract_names(lines: list, id_type: str, full_text: str) -> Tuple[str, str]:
    """
    Multi-strategy name extraction cascade.
    Returns (first_name, last_name).
    """
    first_name, last_name = '', ''
    u_text = full_text.upper()

    # -------------------------------------------------------------------------
    # STRATEGY A — Label-based extraction (works for Postal, some Voter's IDs)
    # -------------------------------------------------------------------------
    label_keys_ln = ('LAST NAME', 'SURNAME', 'FAMILY NAME', 'APELYIDO', 'APELLIDO')
    label_keys_fn = ('FIRST NAME', 'GIVEN NAME', 'GIVEN NAMES', 'PANGALAN', 'FIRST NAME(S)')

    for i, line in enumerate(lines):
        ul = line.upper()

        # Try inline "LAST NAME: DELA CRUZ"
        for key in label_keys_ln:
            if key in ul and not last_name:
                if ':' in ul:
                    val = ul.split(':', 1)[1].strip()
                    if len(val) > 1:
                        last_name = re.sub(r'[^A-Z\s\-\.]', '', val).strip().title()
                        break
                # Next line is the value
                if not last_name and i + 1 < len(lines):
                    candidate = lines[i + 1].upper().strip()
                    if _is_name_line(candidate):
                        last_name = re.sub(r'[^A-Z\s\-\.]', '', candidate).strip().title()
                break

        for key in label_keys_fn:
            if key in ul and not first_name:
                if ':' in ul:
                    val = ul.split(':', 1)[1].strip()
                    # Strip middle name clues (marked by comma or parenthesis)
                    val = re.split(r'[,\(]', val)[0].strip()
                    if len(val) > 1:
                        first_name = re.sub(r'[^A-Z\s\-\.]', '', val).strip().title()
                        break
                if not first_name and i + 1 < len(lines):
                    candidate = lines[i + 1].upper().strip()
                    if _is_name_line(candidate):
                        first_name = re.sub(r'[^A-Z\s\-\.]', '', candidate).strip().title()
                break

    if first_name and last_name:
        return first_name, last_name

    # -------------------------------------------------------------------------
    # STRATEGY B — ID-type-specific positional parsing
    # -------------------------------------------------------------------------
    if id_type == 'lto':
        # LTO: Full name on single line "DELA CRUZ, JUAN PEDRO SR." or
        #      two lines "DELA CRUZ" / "JUAN PEDRO"
        # Find the LTO header line, name is 1-2 lines below
        for i, line in enumerate(lines):
            if 'LAND TRANSPORTATION' in line.upper() or 'LTO' in line.upper():
                # Next meaningful line should be last name
                for j in range(i + 1, min(i + 5, len(lines))):
                    candidate = lines[j].upper().strip()
                    if _is_name_line(candidate) and not any(k in candidate for k in NON_NAME_KEYWORDS):
                        if ',' in candidate:
                            # "DELA CRUZ, JUAN"
                            parts = candidate.split(',', 1)
                            last_name = parts[0].strip().title()
                            first_name = parts[1].strip().split()[0].title() if parts[1].strip() else ''
                        elif not last_name:
                            last_name = candidate.title()
                            if j + 1 < len(lines) and _is_name_line(lines[j + 1].upper()):
                                first_name = lines[j + 1].upper().strip().title()
                        break
                break

    elif id_type == 'philid':
        # PhilID: name fields are labeled "Last Name / First Name / Middle Name"
        # but sometimes the labels appear above the values in the same line
        # e.g., "Last Name\nDELA CRUZ\nFirst Name\nJUAN"
        # Strategy A should catch this, but add inline "Surname, Given Name" format
        for line in lines:
            if ',' in line:
                parts = line.split(',', 1)
                if _is_name_line(parts[0]) and _is_name_line(parts[1].strip().split()[0] if parts[1].strip() else ''):
                    if not last_name:
                        last_name = parts[0].strip().title()
                    if not first_name:
                        first_name = parts[1].strip().split()[0].title()

    elif id_type in ('umid', 'gsis', 'prc'):
        # UMID/PRC/GSIS: personal name block is at top of card.
        # The surname is usually a single short word (1-3 words, no digits).
        # Strategy: find lines that look ONLY like a surname (1-3 all-alpha words,
        # short, not in NON_NAME_KEYWORDS or ADDRESS_KEYWORDS)
        def looks_like_surname(line):
            u = line.upper().strip()
            if not u or not re.match(r'^[A-Z\s\-\.]+$', u):
                return False
            words = u.split()
            if not words or len(words) > 4:
                return False
            # Reject if any word is a known non-name keyword
            if any(w in NON_NAME_KEYWORDS or w in ADDRESS_KEYWORDS for w in words):
                return False
            # Reject lines that are all uppercase acronyms or all single chars
            if all(len(w) <= 2 for w in words):
                return False
            return True

        name_lines = [l for l in lines if looks_like_surname(l)]
        if not last_name and len(name_lines) >= 1:
            last_name = name_lines[0].strip().title()
        if not first_name and len(name_lines) >= 2:
            # Only take the first word of the second name line (ignore middle name)
            first_name = name_lines[1].strip().split()[0].title()

    if first_name and last_name:
        return first_name, last_name

    # -------------------------------------------------------------------------
    # STRATEGY C — Filipino surname dictionary heuristics
    # -------------------------------------------------------------------------
    for i, line in enumerate(lines):
        u_line = line.upper().strip()
        words = u_line.split()
        for w in words:
            if w in COMMON_PH_SURNAMES and _is_name_line(u_line):
                if not last_name:
                    # Check if particle follows (e.g., "DE LA CRUZ")
                    if w in ('DE', 'DEL', 'DELOS', 'DELA', 'SAN', 'VDA'):
                        last_name = u_line.title()
                    else:
                        last_name = u_line.title()
                    # First name is likely the next line
                    if i + 1 < len(lines) and _is_name_line(lines[i + 1].upper()):
                        candidate = lines[i + 1].upper().strip()
                        if not any(k in candidate for k in COMMON_PH_SURNAMES):
                            first_name = candidate.split()[0].title()
                    break
        if last_name:
            break

    if first_name and last_name:
        return first_name, last_name

    # -------------------------------------------------------------------------
    # STRATEGY D — All-caps lines fallback (last resort)
    # Longest contiguous all-caps lines with no digits and no label keywords
    # -------------------------------------------------------------------------
    candidate_name_lines = []
    for line in lines:
        u_line = line.upper().strip()
        if (
            _is_name_line(u_line)
            and len(u_line) > 3
            and u_line == u_line.upper()  # ensure all-caps
            and not any(k in u_line for k in NON_NAME_KEYWORDS)
            and not any(k in u_line for k in ADDRESS_KEYWORDS)
        ):
            candidate_name_lines.append(u_line)

    # Take the two longest as LN and FN
    candidate_name_lines.sort(key=len, reverse=True)
    if not last_name and len(candidate_name_lines) >= 1:
        last_name = candidate_name_lines[0].title()
    if not first_name and len(candidate_name_lines) >= 2:
        first_name = candidate_name_lines[1].split()[0].title()

    return first_name, last_name

# ---------------------------------------------------------------------------
# Sex / Gender Extraction
# ---------------------------------------------------------------------------

def extract_sex(text: str) -> str:
    """Extract sex/gender field from OCR text."""
    u = text.upper()

    for p in (
        r'(?:SEX|GENDER|KASARIAN|GENDER/SEX)[:\s\|]+([MF])\b',
        r'(?:SEX|GENDER|KASARIAN)[:\s\|]+(MALE|FEMALE)',
        r'\bSEX\b[:\s]+(LALAKI|BABAE)',    # Tagalog
    ):
        m = re.search(p, u)
        if m:
            g = m.group(1)
            if g in ('M', 'MALE', 'LALAKI'):
                return 'Male'
            if g in ('F', 'FEMALE', 'BABAE'):
                return 'Female'

    # Last resort: standalone MALE/FEMALE
    if 'FEMALE' in u:
        return 'Female'
    if 'MALE' in u:
        return 'Male'

    return ''

# ---------------------------------------------------------------------------
# Address Extraction
# ---------------------------------------------------------------------------

def extract_address(lines: list, full_text: str) -> str:
    """
    Collect all lines that look like an address, stop at non-address labels,
    and dynamically strip inline metadata labels that OCR clumps together.
    Returns cleaned address string.
    """
    u_lines = [l.upper().strip() for l in lines]

    # First, try to find a labeled ADDRESS: line
    addr_start = None
    for i, line in enumerate(u_lines):
        if any(kw in line for kw in ('ADDRESS', 'RESIDENCE', 'TIRAHAN', 'HOME ADDRESS')):
            addr_start = i
            break

    if addr_start is None:
        # Try to find the first line containing Caloocan or a street keyword
        for i, line in enumerate(u_lines):
            if any(kw in line for kw in ADDRESS_KEYWORDS):
                addr_start = i
                break

    if addr_start is None:
        return ''

    # Collect up to 4 subsequent lines that look like addresses
    raw_addr_lines = []
    stop_keys = {'BLOOD', 'EYE', 'WEIGHT', 'HEIGHT', 'TIN', 'DATE OF', 
                 'SIGNATURE', 'VALIDITY', 'EXPIRY', 'VALID ', 'ISSUED', 'PHILIPPINE'}

    # Include the address-start line
    for j in range(addr_start, min(addr_start + 4, len(u_lines))):
        candidate = u_lines[j]
        if any(k in candidate for k in stop_keys):
            break
        if candidate:
            raw_addr_lines.append(candidate)

    full_addr = ' '.join(raw_addr_lines)
    
    # -------------------------------------------------------------
    # Robust Inline Cleaning (Inspired by BHCARE Reference)
    # OCR often groups "Address, City KASARIAN/SEX MALE" into one line
    # -------------------------------------------------------------
    
    # Strip label prefix
    full_addr = re.sub(r'^(ADDRESS|RESIDENCE|TIRAHAN|HOME ADDRESS)\s*:?\s*', '', full_addr, flags=re.I)
    
    # Aggressively split off downstream metadata that got joined
    # e.g., "1421 Kasarian/Sex Male" -> split at "KASARIAN" or "SEX"
    split_words = [
        'KASARIAN', 'SEX', 'GENDER', 'BLOOD', 'DATE OF', 'DOB', 
        'PHILIPPINE', 'REPUBLIC', 'DATE ISSUED'
    ]
    
    for word in split_words:
        # If we find this word, chop off everything after and including it
        idx = full_addr.upper().find(word)
        if idx != -1:
            full_addr = full_addr[:idx]

    # Clean up trailing punctuation
    full_addr = re.sub(r'[,.\s]+$', '', full_addr.strip())

    return full_addr.title()

# ---------------------------------------------------------------------------
# Main Extraction Orchestrator
# ---------------------------------------------------------------------------

ID_TYPE_LABELS = {
    'philid':     'Philippine National ID',
    'umid':       'UMID / SSS Card',
    'lto':        'LTO Driver\'s License',
    'prc':        'PRC Professional ID',
    'philhealth': 'PhilHealth ID',
    'pagibig':    'Pag-IBIG ID',
    'postal':     'Postal ID',
    'comelec':    'COMELEC Voter\'s ID',
    'passport':   'Philippine Passport',
    'gsis':       'GSIS ID',
    'unknown':    'Unknown Document',
}

# North Caloocan Postal Mapping provided by USER
# Only the numeric code should be returned to the frontend.
CALOOCAN_POSTAL_MAP = {
    '1420': ['KAYBIGA', 'DEPARO'],
    '1421': ['BAGUMBONG', 'PAG-ASA', 'PAGASA', 'NORTHVILLE 2B'],
    '1422': ['NOVALICHES NORTH', 'BF HOMES'],
    '1423': ['LILLES VILLE'],
    '1424': ['CAPITOL PARKLAND'],
    '1425': ['AMPARO SUBDIVISION', 'AMPARO'],
    '1426': ['BANKERS VILLAGE'],
    '1427': ['TALA LEPROSARIUM', 'VICTORY HEIGHTS', 'TALA'],
    '1428': ['BAGONG SILANG', 'SILANG'],
}

def infer_postal_code(text: str) -> str:
    """Infer the 4-digit zip code if its name equivalent is found in text."""
    u = text.upper()
    for code, keywords in CALOOCAN_POSTAL_MAP.items():
        if any(k in u for k in keywords):
            return code
    return ''

def compare_names(name1: str, name2: str) -> bool:
    """
    Heuristic to compare two name strings from different ID surfaces.
    Returns True if they are likely the same person, False if they are clearly different.
    """
    if not name1 or not name2: return True # One side missing is not a mismatch
    
    n1 = name1.upper().replace('.', '').strip()
    n2 = name2.upper().replace('.', '').strip()
    
    # If they are different but one is a substring of the other (e.g. "JUAN" vs "JUAN DELA CRUZ")
    if n1 in n2 or n2 in n1: return True
    
    # Basic token check (Must share at least one significant name part)
    tokens1 = set(n1.split())
    tokens2 = set(n2.split())
    
    # Ignore common noises
    stop_words = {'THE', 'OF', 'ID', 'MR', 'MS', 'MRS'}
    t1 = tokens1 - stop_words
    t2 = tokens2 - stop_words
    
    # If they share NO tokens, it's a mismatch
    if not (t1 & t2): return False
    
    return True

def extract_id_details(front_text: str, back_text: str = "", front_image: bytes = None, back_image: bytes = None) -> Dict[str, Any]:
    """
    Dispatch OCR text from both sides to the AI parser for multi-side intelligence,
    then enrich with residency verification.
    """
    full_text = f"{front_text}\n{back_text}"
    upper_text = full_text.upper()
    lines = [line.strip() for line in full_text.split('\n') if len(line.strip()) > 1]

    # 1. Detect which Philippine ID this is (Cross-Validation)
    id_type_front = detect_id_type(front_text)
    id_type_back  = detect_id_type(back_text)
    
    # Heuristic Mismatch Check (Warning only, will be refined by AI Intelligence)
    heuristic_mismatch = False
    heuristic_reason = ""
    
    if id_type_front != 'unknown' and id_type_back != 'unknown' and id_type_front != id_type_back:
        heuristic_mismatch = True
        heuristic_reason = f"Heuristic Warning: Document type may mismatch (Front={id_type_front.upper()}, Back={id_type_back.upper()}). Refining with AI..."
        print(f"[OCR] {heuristic_reason}")

    # Starting heuristic, will be refined by AI below
    id_type = id_type_front if id_type_front != 'unknown' else id_type_back
    print(f"[OCR] Heuristic ID types: Front={id_type_front}, Back={id_type_back}")

    # 2. Route to the appropriate modular parser
    parser = get_parser(id_type)
    parsed = parser.extract(full_text, lines)

    mismatch_detected = False
    mismatch_reason = ""

    # 3. ADVANCED: LLM-Assisted Refinement (Side, Type & Visual/Integrity Audit)
    # Pass both front and back text separately to the AI for cross-referencing
    llm_extracted = gemini_service.extract_id_data(
        front_text, 
        back_text, 
        id_type=id_type, 
        front_image=front_image, 
        back_image=back_image
    )
    
    if llm_extracted:
        print(f"[OCR] AI Intelligent Scan Result: {llm_extracted}")
        
        # Override ID Type with AI Intelligence (more authoritative than heuristics)
        ai_type = llm_extracted.get('front_id_type', 'unknown')
        if ai_type != 'unknown':
            id_type = ai_type.lower()
            print(f"[OCR] AI Overrode Type to: {id_type}")

        # START AUTHORITATIVE AI AUDIT (AI Intelligence has the final word)
        # Reset heuristic mismatch if AI confirms the document is valid
        ai_detected_mismatch = llm_extracted.get('is_document_mismatch', False)
        ai_mismatch_reason   = llm_extracted.get('mismatch_reason', "")

        # Only trust the heuristic if AI also finds an issue, otherwise trust the Visual Audit
        if ai_detected_mismatch:
            mismatch_detected = True
            mismatch_reason = ai_mismatch_reason
        else:
            # AI says it's fine! Override the heuristic's false-positive flag
            if heuristic_mismatch:
                print(f"[OCR] AI Intelligence override: Document is VALID despite heuristic warning ({heuristic_reason})")
            mismatch_detected = False
            mismatch_reason = ""

        # Secondary checks (Orientation/Side)
        if not llm_extracted.get('is_front_correct', True):
            mismatch_detected = True
            mismatch_reason = "Front ID scan error: The image uploaded as 'Front' appears to be the back of the document."
        elif not llm_extracted.get('is_back_correct', True):
            mismatch_detected = True
            mismatch_reason = "Back ID scan error: The image uploaded as 'Back' appears to be the front of the document."
        
        # Identity Portrait Check (Face Match)
        if llm_extracted.get('is_visual_face_match') == False:
            mismatch_detected = True
            mismatch_reason = "Identity Mismatch: The portrait photo on the front does not match the individual on the back."

        # Only overwrite if LLM found something useful, else keep parser's result
        for key in ('first_name', 'last_name', 'middle_name', 'suffix', 'dob', 'sex', 'address', 'barangay', 'pcn', 'postal_code', 'license_no'):
            if llm_extracted.get(key) and not parsed.get(key):
                parsed[key] = llm_extracted.get(key)
            elif llm_extracted.get(key) and len(str(llm_extracted.get(key))) > len(str(parsed.get(key, ''))):
                # Trust LLM for better cleaning
                parsed[key] = llm_extracted.get(key)

    first_name  = parsed.get('first_name', '')
    last_name   = parsed.get('last_name', '')
    middle_name = parsed.get('middle_name', '')
    dob         = parsed.get('dob', '')
    sex         = parsed.get('sex', '')
    address     = parsed.get('address', '')
    barangay    = parsed.get('barangay', '')

    # 4. Legacy fallbacks — use the old helpers if the modular parser was incomplete
    if not barangay:
        barangay = extract_barangay(upper_text)
    if not dob:
        dob = parse_date(upper_text)
    if not sex:
        sex = extract_sex(upper_text)
    if not address:
        address = full_text[:400].replace('\n', ' ').strip()

    # 4. Smart Postal Code inference if missing
    postal_code = parsed.get('postal_code', '')
    if not postal_code:
        postal_code = infer_postal_code(upper_text)
    
    # 5. Residency verification
    is_nc, msg = verify_north_caloocan_residency(upper_text, barangay)

    # Priority: AI > Regex Fallback
    # If the AI produces an output (even an empty string), we explicitly respect it.
    if llm_extracted:
        final_house_no  = llm_extracted.get('house_no', '')
        final_block_lot = llm_extracted.get('block_lot', '')
        final_subdiv    = llm_extracted.get('subdivision', '')
        final_street    = llm_extracted.get('street', '')
    else:
        # Fallback to Regex modular parser only if AI crashed or fully yielded
        addr_parts = parse_address_components(address, barangay)
        final_house_no  = addr_parts['house_no']
        final_block_lot = addr_parts['block_lot']
        final_subdiv    = addr_parts['subdivision']
        final_street    = addr_parts['street']

    print(f"[OCR] Address Components: house_no='{final_house_no}' | block_lot='{final_block_lot}' | subdivision='{final_subdiv}' | street='{final_street}'")

    res = {
        'id_type':              id_type,
        'id_type_label':        ID_TYPE_LABELS.get(id_type, 'Unknown Document'),
        'first_name':           first_name,
        'last_name':            last_name,
        'middle_name':          middle_name,
        'dob':                  dob,
        'sex':                  sex,
        'address':              address,
        'house_no':             final_house_no,
        'block_lot':            final_block_lot,
        'subdivision':          final_subdiv,
        'street':               final_street,
        'barangay':             barangay,
        'postal_code':          postal_code,
        'is_north_caloocan':    is_nc,
        'verification_message': msg,
    }
    
    # Add any extra fields from modular parser (e.g. block_lot, street, postal_code)
    for k, v in parsed.items():
        if k not in res:
            res[k] = v

    # 6. Set Mismatch Flags
    res['is_document_mismatch'] = mismatch_detected
    res['mismatch_reason']      = mismatch_reason

    # Single-side verification check
    if mismatch_detected:
        res['verification_message'] = mismatch_reason

    # Log the attempt for future improvement
    log_ocr_attempt(full_text, res)

    return res


def log_ocr_attempt(raw_text: str, parsed_data: Dict[str, Any]):
    """Saves the OCR attempt to a local file for analysis."""
    try:
        log_dir = os.path.join(os.getcwd(), 'logs', 'ocr_scans')
        os.makedirs(log_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        filename = f"scan_{timestamp}.json"
        filepath = os.path.join(log_dir, filename)

        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'raw_text': raw_text,
            'parsed_data': parsed_data
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(log_entry, f, indent=4)
        print(f"[OCR] Attempt logged to {filename}")
    except Exception as e:
        print(f"[OCR] Logging error: {e}")

# ---------------------------------------------------------------------------
# Google Cloud Vision OCR
# ---------------------------------------------------------------------------

async def perform_google_vision_ocr(image_bytes: bytes) -> str:
    """
    Uses Google Cloud Vision API TEXT_DETECTION to extract text.
    Preprocesses image for better accuracy before sending.
    """
    if not GOOGLE_VISION_API_KEY:
        raise Exception("GOOGLE_VISION_API_KEY not configured")

    # Preprocess keeping color (Vision prefers color images)
    processed = preprocess_image(image_bytes, for_vision_api=True)
    b64 = base64.b64encode(processed).decode('utf-8')

    url = f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_VISION_API_KEY}"
    payload = {
        "requests": [{
            "image": {"content": b64},
            "features": [
                {"type": "TEXT_DETECTION", "maxResults": 1},
                {"type": "DOCUMENT_TEXT_DETECTION", "maxResults": 1}
            ],
            "imageContext": {
                "languageHints": ["en", "fil"]  # English + Filipino
            }
        }]
    }

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(None, lambda: requests.post(url, json=payload, timeout=15))
    if response.status_code != 200:
        raise Exception(f"Google Vision API Error {response.status_code}: {response.text[:300]}")

    result = response.json()
    resp_body = result.get('responses', [{}])[0]

    # Prefer DOCUMENT_TEXT_DETECTION (better for structured documents like IDs)
    full_text = resp_body.get('fullTextAnnotation', {}).get('text', '')
    if full_text:
        return full_text
    
    # Fallback to simple TEXT_DETECTION
    texts = resp_body.get('textAnnotations', [])
    if texts:
        return texts[0].get('description', '')

    return ''

# ---------------------------------------------------------------------------
# OCR.space (Fallback Engine)
# ---------------------------------------------------------------------------

async def perform_ocrspace_ocr(image_bytes: bytes, filename: str = 'id.jpg') -> str:
    """OCR.space API — used as fallback when Google Vision is unavailable."""
    processed = preprocess_image(image_bytes, for_vision_api=False)

    url = 'https://api.ocr.space/parse/image'
    payload = {
        'apikey': OCR_API_KEY,
        'language': 'eng',
        'isOverlayRequired': 'false',
        'scale': 'true',
        'OCREngine': '2',        # Engine 2 handles complex layouts better
        'isTable': 'true',       # ID cards have table-like layouts
        'detectOrientation': 'true',
    }

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(None, lambda: requests.post(
        url,
        files={'file': (filename, processed, 'image/jpeg')},
        data=payload,
        timeout=15
    ))

    if response.status_code != 200:
        raise Exception(f"OCR.space returned HTTP {response.status_code}")

    result = response.json()
    error_msg = result.get('ErrorMessage', [])
    if error_msg:
        raise Exception(f"OCR.space error: {error_msg}")

    parsed = result.get('ParsedResults', [])
    if not parsed:
        raise Exception("OCR.space returned no parsed results")

    return parsed[0].get('ParsedText', '')

# ---------------------------------------------------------------------------
# Main Entry Point
# ---------------------------------------------------------------------------

async def perform_ocr(front_bytes: bytes, back_bytes: bytes) -> Dict[str, Any]:
    """
    Main Multi-Side OCR pipeline with concurrent execution.
    Requires both front and back images for maximum AI accuracy.
    """
    start_total = time.time()
    
    # 1. Concurrent extraction of both sides
    tasks = [
        perform_google_vision_ocr(front_bytes),
        perform_google_vision_ocr(back_bytes)
    ]
    
    # Run both sides in parallel
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    front_text = ""
    back_text = ""
    
    if len(results) > 0 and isinstance(results[0], str):
        front_text = results[0]
    
    if len(results) > 1 and isinstance(results[1], str):
        back_text = results[1]

    if not front_text and not back_text:
        return {
            "success": False,
            "error": "OCR failed for both sides. Please ensure images are clear and well-lit.",
            "extracted_data": None
        }

    # 2. Multi-Side Logic Extraction (passed to AI Intelligence layer with original images)
    extracted = extract_id_details(front_text, back_text, front_image=front_bytes, back_image=back_bytes)
    
    print(f"[OCR] Multi-side pipeline took {time.time() - start_total:.3f}s")
    
    return {
        "success": True,
        "engine": "google-vision-gemini-v2",
        "extracted_data": extracted,
    }
