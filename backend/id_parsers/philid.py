"""
id_parsers/philid.py — Philippine National ID (PhilSys / Pambansang Pagkakakilanlan)

BILINGUAL LABEL MAP (Tagalog/English as printed on the National ID):
  APELYIDO / LAST NAME          → last name
  MGA PANGALAN / GIVEN NAMES    → given (first) names
  GITNANG APELYIDO / MIDDLE NAME → middle name
  PETSA NG KAPANGANAKAN / DATE OF BIRTH → date of birth
  KASARIAN / SEX                → sex
  TIRAHAN / ADDRESS             → address

The OCR engine reads each label and value on separate lines:
  Line N:   APELYIDO/LAST NAME
  Line N+1: EVANGELISTA
"""

import re
from .base import BaseIDParser, ParsedIDData, MONTH_MAP
from typing import List, Optional


# All Tagalog + English label variants per field (uppercase for matching)
_LN_LABELS  = {'APELYIDO', 'LAST NAME', 'SURNAME', 'FAMILY NAME', 'APELLIDO'}
_FN_LABELS  = {'MGA PANGALAN', 'GIVEN NAMES', 'GIVEN NAME', 'PANGALAN', 'FIRST NAME'}
_MN_LABELS  = {'GITNANG APELYIDO', 'MIDDLE NAME', 'GITNANG PANGALAN', 'MIDDLE INITIAL'}
_DOB_LABELS = {'PETSA NG KAPANGANAKAN', 'DATE OF BIRTH', 'DOB', 'BIRTH DATE'}
_SEX_LABELS = {'KASARIAN', 'SEX', 'GENDER'}
_ADDR_LABELS = {'TIRAHAN', 'ADDRESS', 'HOME ADDRESS', 'RESIDENCE'}
_ALL_LABELS = _LN_LABELS | _FN_LABELS | _MN_LABELS | _DOB_LABELS | _SEX_LABELS | _ADDR_LABELS

# Month names for DOB parsing
_MONTH_RE = '|'.join(MONTH_MAP.keys())


def _normalize_line(line: str) -> str:
    """Strip slash-separated label variants: 'APELYIDO/LAST NAME' → 'APELYIDO'"""
    return re.sub(r'\s*/\s*\S.*', '', line).strip()


def _is_label(line: str) -> bool:
    """Return True if this line is a field label, not a value."""
    u = line.upper().strip()
    return any(lbl in u for lbl in _ALL_LABELS)


def _find_next_value(upper_lines: List[str], label_idx: int) -> str:
    """
    Given the index of a label line, find the next non-empty non-label line.
    Returns the raw uppercase value string, or ''.
    """
    for j in range(label_idx + 1, min(label_idx + 4, len(upper_lines))):
        candidate = upper_lines[j].strip()
        if not candidate:
            continue
        if _is_label(candidate):
            break
        return candidate
    return ''


class PhilIDParser(BaseIDParser):
    ID_TYPE = 'philid'

    def extract(self, text: str, lines: List[str]) -> ParsedIDData:
        upper_lines = [l.strip().upper() for l in text.split('\n') if l.strip()]
        full_upper  = '\n'.join(upper_lines)

        result: ParsedIDData = {
            'first_name': '', 'last_name': '', 'middle_name': '',
            'dob': '', 'sex': '', 'address': '', 'barangay': '', 'pcn': '',
            'block_lot': '', 'subdivision': '', 'street': '', 'postal_code': '',
        }

        # ----------------------------------------------------------------
        # 1. PCN — 16-digit PhilSys Card Number
        # ----------------------------------------------------------------
        pcn_m = re.search(r'\b(?:\d{4}[-\s]){3}\d{4}\b|\b\d{16}\b', full_upper)
        if pcn_m:
            raw_pcn = re.sub(r'\D', '', pcn_m.group(0))
            if len(raw_pcn) == 16:
                formatted_pcn = f"{raw_pcn[0:4]}-{raw_pcn[4:8]}-{raw_pcn[8:12]}-{raw_pcn[12:16]}"
                result['pcn'] = formatted_pcn
                result['id_number'] = formatted_pcn
            
        # Extract postal code (usually 1421, 1420, etc. at end)
        pc_m = re.search(r'\b(14\d{2})\b', full_upper)
        if pc_m:
            result['postal_code'] = pc_m.group(1)

        # ----------------------------------------------------------------
        # 2. Scan every line for bilingual field labels
        #    The label and value are on SEPARATE consecutive lines.
        # ----------------------------------------------------------------
        for i, ul in enumerate(upper_lines):
            # Strip slash-separated English translation from combined labels
            # e.g. "APELYIDO/LAST NAME" → we still match on full line
            line_norm = _normalize_line(ul)

            # --- LAST NAME ---
            if not result['last_name'] and any(lbl in ul for lbl in _LN_LABELS):
                val = self._inline_or_next(ul, upper_lines, i, _LN_LABELS)
                if val:
                    result['last_name'] = val.title()

            # --- GIVEN NAMES (first name) ---
            if not result['first_name'] and any(lbl in ul for lbl in _FN_LABELS):
                val = self._inline_or_next(ul, upper_lines, i, _FN_LABELS)
                if val:
                    result['first_name'] = val.title()

            # --- MIDDLE NAME ---
            if not result['middle_name'] and any(lbl in ul for lbl in _MN_LABELS):
                val = self._inline_or_next(ul, upper_lines, i, _MN_LABELS)
                if val:
                    result['middle_name'] = val.title()

            # --- DATE OF BIRTH ---
            if not result['dob'] and any(lbl in ul for lbl in _DOB_LABELS):
                val = self._inline_or_next(ul, upper_lines, i, _DOB_LABELS, allow_digits=True)
                if val:
                    result['dob'] = self._parse_philid_date(val)

            # --- SEX ---
            if not result['sex'] and any(lbl in ul for lbl in _SEX_LABELS):
                val = self._inline_or_next(ul, upper_lines, i, _SEX_LABELS, allow_digits=False)
                if val:
                    if val in ('M', 'MALE', 'LALAKI'):
                        result['sex'] = 'Male'
                    elif val in ('F', 'FEMALE', 'BABAE'):
                        result['sex'] = 'Female'

            # --- ADDRESS ---
            if not result['address'] and any(lbl in ul for lbl in _ADDR_LABELS):
                addr_data = self._extract_philid_address_structured(upper_lines, i)
                result.update(addr_data)

        # Fallbacks for any still-missing fields
        if not result['dob']:
            result['dob'] = self._extract_dob(full_upper)
        if not result['sex']:
            result['sex'] = self._extract_sex(full_upper)
        if not result['address']:
            addr_data_fb = self._extract_philid_address_fallback_structured(upper_lines, full_upper)
            result.update(addr_data_fb)
        result['barangay'] = self._extract_barangay(full_upper)

        return result

    # ----------------------------------------------------------------
    # Helper: extract value from same line (after label) or next line
    # ----------------------------------------------------------------
    def _inline_or_next(
        self, label_line: str, upper_lines: List[str], idx: int,
        label_set, allow_digits: bool = False
    ) -> str:
        """
        Strip ALL known label text from label_line and check if there's
        a real value remaining on the same line.  If not, look at the next line.
        """
        remainder = label_line
        # Remove each label variant (sorted longest first to avoid partial match)
        for lbl in sorted(label_set, key=len, reverse=True):
            remainder = remainder.replace(lbl, '').strip()
        # Remove slash separator and anything that follows an all-caps label pattern
        remainder = re.sub(r'\s*/\s*[A-Z][\w\s]*', '', remainder).strip()
        # Remove colons and leading junk
        remainder = re.sub(r'^[\s/:,|]+', '', remainder).strip()

        # Reject if remainder has non-name characters (when not expecting digits or date words)
        if remainder and len(remainder) > 1:
            if allow_digits or re.match(r'^[A-Z0-9\s,./\-]+$', remainder):
                # Make sure it's not still a label
                if not _is_label(remainder):
                    return remainder

        # Try next non-empty, non-label line
        return _find_next_value(upper_lines, idx)

    # ----------------------------------------------------------------
    # PhilID-specific date parser (handles "January 05, 2005")
    # ----------------------------------------------------------------
    def _parse_philid_date(self, text: str) -> str:
        u = text.upper().strip()
        # "JANUARY 05, 2005" or "JANUARY 05 2005"
        m = re.search(rf'({_MONTH_RE})\s+(\d{{1,2}})[,\s]+(\d{{4}})', u)
        if m:
            mon_str, d, y = m.group(1), int(m.group(2)), int(m.group(3))
            mo = MONTH_MAP.get(mon_str, 0)
            if mo and 1900 < y < 2030 and 1 <= d <= 31:
                return f'{y:04d}-{mo:02d}-{d:02d}'
        # "05 JANUARY 2005"
        m = re.search(rf'(\d{{1,2}})\s+({_MONTH_RE})\s+(\d{{4}})', u)
        if m:
            d, mon_str, y = int(m.group(1)), m.group(2), int(m.group(3))
            mo = MONTH_MAP.get(mon_str, 0)
            if mo and 1900 < y < 2030 and 1 <= d <= 31:
                return f'{y:04d}-{mo:02d}-{d:02d}'
        # Numeric formats
        return self._extract_dob(u)

    # ----------------------------------------------------------------
    # Address extraction (from the address label line onward)
    # ----------------------------------------------------------------
    def _extract_philid_address_structured(self, upper_lines: List[str], label_idx: int) -> dict:
        STOP = {'BARANGAY', 'BRGY', 'CITY', 'PHILIPPINES', 'NCR', 'THIRD DISTRICT', 'DISTRICT',
                'BLOOD', 'DATE', 'PETSA', 'KASARIAN', 'SIGNATURE', 'DIGITAL ID', 'PCN', '1421'}
        
        raw_parts = []
        for j in range(label_idx + 1, min(label_idx + 6, len(upper_lines))):
            line = upper_lines[j].strip()
            if not line: continue
            if _is_label(line): break
            
            # Stop immediately if we hit a known metadata anchor
            found_stop = False
            for sk in STOP:
                if sk in line:
                    idx = line.find(sk)
                    if idx > 0:
                        raw_parts.append(line[:idx].strip())
                    found_stop = True
                    break
            if found_stop:
                break
            raw_parts.append(line)

        full_addr = ' '.join(raw_parts).replace(',', ' ').strip()
        # Clean up double spaces
        full_addr = re.sub(r'\s+', ' ', full_addr)
        
        data = {'address': full_addr, 'block_lot': '', 'subdivision': '', 'street': ''}
        
        # 1. Block and Lot (e.g. BLK 40 LOT 3)
        blk_m = re.search(r'\b(BLK\s*\d+\s*LOT\s*\d+)\b', full_addr, re.I)
        if blk_m:
            data['block_lot'] = blk_m.group(1).title()
            full_addr = full_addr.replace(blk_m.group(1), '').strip()
        else:
            b_m = re.search(r'\b(BLK\s*\d+)\b', full_addr, re.I)
            l_m = re.search(r'\b(LOT\s*\d+)\b', full_addr, re.I)
            if b_m and l_m:
                data['block_lot'] = f"{b_m.group(1)} {l_m.group(1)}".title()
                full_addr = full_addr.replace(b_m.group(1), '').replace(l_m.group(1), '').strip()

        # 2. Subdivision (Handle Northville 2B Bagumbong as one unit)
        # Search for common subdivision keywords and the specific Bagumbong anchor
        sub_m = re.search(r'\b(NORTHVILLE\s*[A-Z0-9]*\s*(?:BAGUMBONG|TALIPAPA|VILLAGE|HOMES)?|CELINA\s*HOMES\s*\d*|VILLAGE|SUBD|PHASE\s*\d+)\b', full_addr, re.I)
        if sub_m:
            data['subdivision'] = sub_m.group(1).title()
            full_addr = full_addr.replace(sub_m.group(1), '').strip()

        # 3. Street / Remaining
        # Explicit search for St/Street patterns as requested
        st_m = re.search(r'\b(\w+)\s+(ST|STREET|STRT|AVE|AVENUE|RD|ROAD|WAY|DR|DRIVE)\b', full_addr, re.I)
        if st_m:
            data['street'] = st_m.group(0).title()
            full_addr = full_addr.replace(st_m.group(0), '').strip()
        else:
            # If no explicit "Street" keyword, check what's left
            rem = re.sub(r'[,.\s]+$', '', full_addr.strip()).title()
            if not rem or len(rem) < 2:
                data['street'] = 'None'
            else:
                data['street'] = rem
        
        # Re-join for the full 'address' field
        data['address'] = f"{data['block_lot']} {data['subdivision']} {data['street']}".strip().replace('  ', ' ')
        return data

    def _extract_philid_address_fallback_structured(self, upper_lines: List[str], full_upper: str) -> dict:
        """Fallback: find BLK/LOT anchor and collect address from there."""
        for i, ul in enumerate(upper_lines):
            if re.search(r'\bBLK\b.*\bLOT\b|\bBLOCK\b.*\bLOT\b', ul):
                return self._extract_philid_address_structured(upper_lines, i - 1)
        
        # Generic fallback
        raw = self._extract_address([l for l in full_upper.split('\n') if l.strip()], full_upper)
        return {'address': raw, 'block_lot': '', 'subdivision': '', 'street': ''}
