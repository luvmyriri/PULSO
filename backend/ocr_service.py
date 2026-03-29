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
        'PAMBANSANG ID', 'APELYIDO/LAST NAME', 'MGA PANGALAN', 'GITNANG APELYIDO'
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
    if any(k in u for k in ('COMMISSION ON ELECTIONS', 'COMELEC', 'VOTERS IDENTIFICATION', "VOTER'S ID", 'VIN')):
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

def extract_id_details(text: str) -> Dict[str, Any]:
    """
    Dispatch OCR text to the appropriate per-ID-type parser module,
    then enrich with residency verification.

    Returns dict with:
      id_type, first_name, last_name, middle_name, dob, sex,
      address, barangay, is_north_caloocan, verification_message
    """
    upper_text = text.upper()
    lines = [line.strip() for line in text.split('\n') if len(line.strip()) > 1]

    # 1. Detect which Philippine ID this is
    id_type = detect_id_type(upper_text)
    print(f"[OCR] Detected ID type: {id_type}")

    # 2. Route to the appropriate modular parser
    parser = get_parser(id_type)
    parsed = parser.extract(text, lines)
    print(f"[OCR] Parser ({id_type}) returned: {parsed}")

    # 3. ADVANCED: LLM-Assisted Refinement (Vertex AI)
    # The LLM cleans up noisy OCR and handles "label bleed" better than rules.
    llm_extracted = gemini_service.extract_id_data(text, id_type=id_type)
    if llm_extracted:
        print(f"[OCR] Vertex AI Refinement: {llm_extracted}")
        # Only overwrite if LLM found something useful, else keep parser's result
        for key in ('first_name', 'last_name', 'middle_name', 'dob', 'sex', 'address', 'barangay', 'pcn', 'postal_code'):
            if llm_extracted.get(key) and not parsed.get(key):
                parsed[key] = llm_extracted.get(key)
            elif llm_extracted.get(key) and len(str(llm_extracted.get(key))) > len(str(parsed.get(key, ''))):
                # Trust LLM for better cleaning of structured strings
                parsed[key] = llm_extracted.get(key)

    first_name  = parsed.get('first_name', '')
    last_name   = parsed.get('last_name', '')
    middle_name = parsed.get('middle_name', '')
    dob         = parsed.get('dob', '')
    sex         = parsed.get('sex', '')
    address     = parsed.get('address', '')
    barangay    = parsed.get('barangay', '')

    # 3. Legacy fallbacks — use the old helpers if the modular parser was incomplete
    if not barangay:
        barangay = extract_barangay(upper_text)
    if not dob:
        dob = parse_date(upper_text)
    if not sex:
        sex = extract_sex(upper_text)
    if not address:
        address = text[:200].replace('\n', ' ').strip()

    # 4. Smart Postal Code inference if missing
    postal_code = parsed.get('postal_code', '')
    if not postal_code:
        postal_code = infer_postal_code(upper_text)
    
    # 5. Residency verification
    is_nc, msg = verify_north_caloocan_residency(upper_text, barangay)

    res = {
        'id_type':              id_type,
        'id_type_label':        ID_TYPE_LABELS.get(id_type, 'Unknown Document'),
        'first_name':           first_name,
        'last_name':            last_name,
        'middle_name':          middle_name,
        'dob':                  dob,
        'sex':                  sex,
        'address':              address,
        'barangay':             barangay,
        'postal_code':          postal_code,
        'is_north_caloocan':    is_nc,
        'verification_message': msg,
    }
    
    # Add any extra fields from modular parser (e.g. block_lot, street, postal_code)
    for k, v in parsed.items():
        if k not in res:
            res[k] = v

    # Log the attempt for future improvement
    log_ocr_attempt(text, res)

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

    # Fall back to TEXT_DETECTION
    annotations = resp_body.get('textAnnotations', [])
    return annotations[0].get('description', '') if annotations else ''

# ---------------------------------------------------------------------------
# OCR.space Fallback
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
async def perform_ocr(front_bytes: bytes, back_bytes: bytes = None) -> Dict[str, Any]:
    """
    Main OCR pipeline with concurrent engine execution for maximum speed.
    """
    start_total = time.time()
    from dotenv import load_dotenv
    import os as _os
    load_dotenv(override=True)
    # Explicitly remove stale simulation var from memory — handles the case
    # where the var was set before .env was edited (no restart needed).
    _os.environ.pop('SIMULATED_OCR_TEXT', None)
    
    # open the .env file and check if it explicitly has SIMULATED_OCR_TEXT
    _env_path = _os.path.join(_os.path.dirname(__file__), '.env')
    sim_text = ''
    try:
        with open(_env_path) as _f:
            for _line in _f:
                _stripped = _line.strip()
                if _stripped.startswith('SIMULATED_OCR_TEXT='):
                    sim_text = _stripped.split('=', 1)[1].strip().strip('"')
                    break
    except Exception:
        pass
    
    if sim_text:
        return {
            "success": True,
            "engine": "simulation",
            "extracted_data": extract_id_details(sim_text),
        }

    # Parallelize engine calls
    tasks = []
    
    if GOOGLE_VISION_API_KEY:
        tasks.append(perform_google_vision_ocr(front_bytes))
    
    # Optional: Only run OCR.space if explicitly enabled OR if Google key is missing
    # To keep speed high, we might want to NOT run both unless one fails, 
    # but concurrent execution is faster than sequential fallback.
    if OCR_API_KEY and OCR_API_KEY != 'helloworld':
        tasks.append(perform_ocrspace_ocr(front_bytes))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    front_text = ""
    engine_used = "none"
    
    for i, res in enumerate(results):
        if isinstance(res, str) and res.strip():
            front_text = res
            engine_used = "google_vision" if i == 0 and GOOGLE_VISION_API_KEY else "ocr_space"
            break # Success with the first available engine
    
    if not front_text:
        # Final fallback logic
        allow_mock = os.getenv('ALLOW_MOCK_OCR', 'false').lower() == 'true'
        if allow_mock:
            print("[OCR] [DEV ONLY] Both engines failed. Returning mock data.")
            mock_data = {
                'id_type': 'lto',
                'first_name': 'JUAN PEDRO',
                'last_name': 'DELA CRUZ',
                'middle_name': 'MALABANAN',
                'dob': '1995-06-12',
                'sex': 'Male',
                'address': 'BLK 40 LOT 3 Ruby St Colina Homes 3',
                'barangay': '171',
                'is_north_caloocan': True,
                'verification_message': 'Resident Verified (Optimized MOCK).',
            }
            return {"success": True, "engine": "mock", "extracted_data": mock_data}

        return {
            "success": False,
            "error": "OCR failed. Please retry with clearer focus.",
            "extracted_data": None
        }

    # Process back image if exists (sequential for now as back is secondary)
    back_text = ""
    if back_bytes:
        try:
            back_text = await perform_google_vision_ocr(back_bytes)
        except: pass

    # Combine and extract
    extracted = extract_id_details(front_text + "\n" + back_text)
    
    print(f"[OCR] Total pipeline took {time.time() - start_total:.3f}s using {engine_used}")
    
    return {
        "success": True,
        "engine": engine_used,
        "extracted_data": extracted,
    }
