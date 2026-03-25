"""
id_parsers/base.py
Abstract base class for all Philippine ID parsers.

Every ID-specific parser must inherit from BaseIDParser and implement:
  - DETECTED_BY: list of keyword strings used to recognize this ID type
  - extract(text, lines): returns a ParsedIDData dict

Shared helper utilities are centralized here so each subparser stays lean.
"""

import re
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Shared Filipino month dictionary
# ---------------------------------------------------------------------------
MONTH_MAP = {
    'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3, 'APRIL': 4,
    'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8,
    'SEPTEMBER': 9, 'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12,
    'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'JUN': 6,
    'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
    # Tagalog months
    'ENERO': 1, 'PEBRERO': 2, 'MARSO': 3, 'ABRIL': 4,
    'MAYO': 5, 'HUNYO': 6, 'HULYO': 7, 'AGOSTO': 8,
    'SETYEMBRE': 9, 'OKTUBRE': 10, 'NOBYEMBRE': 11, 'DISYEMBRE': 12,
}

# ---------------------------------------------------------------------------
# Shared keyword lists
# ---------------------------------------------------------------------------
NON_NAME_KEYWORDS = {
    'REPUBLIC', 'PHILIPPINES', 'COMMISSION', 'ELECTIONS', 'PROFESSIONAL',
    'REGULATION', 'TRANSPORTATION', 'INSURANCE', 'HEALTH', 'POSTAL',
    'GOVERNMENT', 'UNIFIED', 'MULTI', 'PURPOSE', 'DEPARTMENT', 'NATIONAL',
    'BLOOD', 'TYPE', 'HEIGHT', 'WEIGHT', 'SEX', 'GENDER', 'CIVIL',
    'STATUS', 'VALIDITY', 'EXPIRY', 'ISSUED', 'VALID', 'UNTIL',
    'SIGNATURE', 'BEARER', 'THUMB', 'TIN', 'DATE', 'BIRTH',
    'LICENSE', 'RESTRICTION', 'NUMBER', 'CONTROL', 'CARD', 'ID', 'NO',
    'SOCIAL', 'SECURITY', 'SYSTEM', 'COOPERATIVE', 'MUTUAL', 'DEVELOPMENT',
    'HOME', 'FUND', 'HOUSING', 'AGENCY', 'OFFICE', 'BUREAU', 'DIVISION',
    'CENTER', 'SERVICE', 'ELECTION', 'VOTER', 'WORKERS', 'EMPLOYEES',
    'MEMBERS', 'BENEFICIARY', 'ADDRESS', 'RESIDENCE', 'NAME', 'FIRST',
    'MIDDLE', 'LAST', 'SURNAME', 'GIVEN', 'INITIAL', 'RESTRICTION', 'CODE',
    'CONDITIONS', 'OTHERS',
}

ADDRESS_NOISE_KEYWORDS = {
    'KASARIAN', 'GENDER', 'SEX', 'BLOOD', 'DATE OF', 'DOB',
    'PHILIPPINE', 'REPUBLIC', 'DATE ISSUED', 'VALID', 'LAND', 'TRANSPORTATION', 'OFFICE', 'DRIVER', 'LICENSE', 'DEPARTMENT',
}

# ---------------------------------------------------------------------------
# ParsedIDData type alias
# ---------------------------------------------------------------------------
ParsedIDData = Dict[str, Any]


# ---------------------------------------------------------------------------
# Base Parser
# ---------------------------------------------------------------------------
class BaseIDParser:
    """
    Default parser used for unknown ID types or as a base class.
    Uses general heuristics that work across most Philippine IDs.
    """
    ID_TYPE: str = 'unknown'

    # -----------------------------------------------------------------------
    # Public interface
    # -----------------------------------------------------------------------
    def extract(self, text: str, lines: List[str]) -> ParsedIDData:
        """
        Main entry point. Subclasses override this or individual _extract_*
        methods. Returns a dict of extracted fields.
        """
        upper = text.upper()
        result: ParsedIDData = {
            'first_name': '',
            'last_name': '',
            'middle_name': '',
            'dob': '',
            'sex': '',
            'address': '',
            'barangay': '',
        }

        result['first_name'], result['last_name'], result['middle_name'] = \
            self._extract_names(lines, upper)
        result['dob']     = self._extract_dob(upper)
        result['sex']     = self._extract_sex(upper)
        result['address'] = self._extract_address(lines, upper)
        result['barangay'] = self._extract_barangay(upper)

        return result

    # -----------------------------------------------------------------------
    # Shared helpers — available to all subclasses
    # -----------------------------------------------------------------------
    def _is_name_line(self, line: str) -> bool:
        u = line.upper().strip()
        if not u or len(u) < 2:
            return False
        if re.search(r'\d', u):
            return False
        words = u.split()
        if not words or len(words) > 8: # Names aren't that long
            return False
        
        # Count keywords
        kw_count = sum(1 for w in words if w in NON_NAME_KEYWORDS)
        
        # If the line is JUST labels like "FIRST NAME MIDDLE NAME", reject it.
        # Use a more strict check: if more than 50% are keywords, it's likely a label line.
        if kw_count / len(words) > 0.5:
            return False
            
        if not re.match(r'^[A-Z\s\-\.,\(\)]+$', u):
            return False
        return True

    def _split_name_parts(self, parts: List[str]) -> Tuple[str, str]:
        """
        Specialized splitter for Philippine names where the first name
        is often multi-worded and the middle name is at the end.
        Returns (first_name, middle_name).
        """
        if not parts:
            return '', ''
        if len(parts) == 1:
            return parts[0].title(), ''
        
        if re.match(r'^[A-Z]\.?$', parts[-1].upper()):
            middle_name = parts[-1].rstrip('.').upper()
            first_name = ' '.join(parts[:-1]).title()
            return first_name, middle_name
            
        # If we have 3 words: "Juan Pedro Malabanan" -> First: Juan Pedro, Middle: Malabanan
        # If we have 2 words: "Juan Malabanan" -> First: Juan, Middle: Malabanan
        # If we have 4+ words: "Maria Clara De Los Santos" -> First: Maria Clara, Middle: De Los Santos
        if len(parts) >= 2:
            # We assume the last word is the middle name for 2 or 3 words
            if len(parts) <= 3:
                middle_name = parts[-1].title()
                first_name = ' '.join(parts[:-1]).title()
                return first_name, middle_name
            else:
                # For longer names, we still assume the last word is the middle name
                # but this is more of a guess.
                middle_name = parts[-1].title()
                first_name = ' '.join(parts[:-1]).title()
                return first_name, middle_name
        
        return parts[0].title(), ''

    def _label_value(self, lines: List[str], *keys) -> str:
        """
        Scan lines for a label keyword and return the value that follows
        (same line after ':', or next non-empty line).
        """
        for i, line in enumerate(lines):
            ul = line.upper()
            if any(k in ul for k in keys):
                # Same line after colon
                if ':' in ul:
                    val = ul.split(':', 1)[1].strip()
                    if len(val) > 1:
                        return val
                # Next line
                if i + 1 < len(lines):
                    candidate = lines[i + 1].strip()
                    if len(candidate) > 1:
                        return candidate.upper()
        return ''

    def _extract_dob(self, upper: str) -> str:
        """Parse the first valid birth-date string."""
        # Remove expiry / validity clues first
        cleaned = re.sub(r'(VALID|EXPIR|ISSU)\w*[\s\S]{0,40}', '', upper)

        patterns = [
            # YYYY-MM-DD or YYYY/MM/DD
            r'(\d{4})[-/](\d{2})[-/](\d{2})',
            # MM/DD/YYYY or MM-DD-YYYY
            r'(\d{2})[-/](\d{2})[-/](\d{4})',
        ]

        for pat in patterns:
            for m in re.finditer(pat, cleaned):
                try:
                    if '-' in pat and pat.startswith(r'(\d{4})'):
                        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
                    else:
                        mo, d, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
                    if 1900 < y < 2015 and 1 <= mo <= 12 and 1 <= d <= 31:
                        return f"{y:04d}-{mo:02d}-{d:02d}"
                except Exception:
                    continue

        # Text-based date "01 JANUARY 1990", "JANUARY 01, 1990", "01-JAN-1990"
        month_re = '|'.join(MONTH_MAP.keys())
        text_patterns = [
            rf'(\d{{1,2}})\s+({month_re})\s+(\d{{4}})',
            rf'({month_re})\s+(\d{{1,2}})[,\s]+(\d{{4}})',
            rf'(\d{{1,2}})-({month_re})-(\d{{4}})',
        ]
        for pat in text_patterns:
            m = re.search(pat, upper)
            if m:
                try:
                    g = m.groups()
                    if g[0].isdigit():
                        d, mon_str, y = int(g[0]), g[1], int(g[2])
                    else:
                        mon_str, d, y = g[0], int(g[1]), int(g[2])
                    mo = MONTH_MAP.get(mon_str, 0)
                    if 1900 < y < 2015 and mo and 1 <= d <= 31:
                        return f"{y:04d}-{mo:02d}-{d:02d}"
                except Exception:
                    continue
        return ''

    def _extract_sex(self, upper: str) -> str:
        for p in (
            r'(?:SEX|GENDER|KASARIAN|GENDER/SEX)[:\s\|]+([MF])\b',
            r'(?:SEX|GENDER|KASARIAN)[:\s\|]+(MALE|FEMALE)',
            r'\bSEX\s+([MF])\b', # No colon
            r'\bSEX\s+(MALE|FEMALE)\b',
            r'\bSEX\b[:\s]+(LALAKI|BABAE)',
        ):
            m = re.search(p, upper)
            if m:
                g = m.group(1)
                if g in ('M', 'MALE', 'LALAKI'):
                    return 'Male'
                if g in ('F', 'FEMALE', 'BABAE'):
                    return 'Female'
        
        # Heuristic for LTO: Look for M or F near "RESTRICTION" or "CONDITIONS"
        # Often looks like "RESTRICTION CODE 1 2 SEX M"
        m = re.search(r'(?:RESTRICTION|CONDITIONS|CODE).*?\b([MF])\b', upper)
        if m:
            g = m.group(1)
            return 'Male' if g == 'M' else 'Female'

        if 'FEMALE' in upper:
            return 'Female'
        if 'MALE' in upper:
            return 'Male'
        return ''

    def _extract_barangay(self, upper: str) -> str:
        patterns = [
            r'BARANGAY\s+(\d{1,3}[A-Z]?)',
            r'BRGY\.?\s*(\d{1,3}[A-Z]?)',
            r'BGY\.?\s*(\d{1,3}[A-Z]?)',
            r'BRY\.?\s*(\d{1,3}[A-Z]?)',
            r'BR\.\s*(\d{1,3}[A-Z]?)',
            r'BRGY\s+NO\.?\s*(\d{1,3}[A-Z]?)',
            r'ZONE\s+\d+[,\s]+BRGY\s*(\d{1,3}[A-Z]?)',
            r'PUROK\s+\d+[,\s]+BRGY\s*(\d{1,3}[A-Z]?)',
        ]
        for pat in patterns:
            m = re.search(pat, upper)
            if m:
                return m.group(1).strip()

        # Fallback: bare 3-digit number near CALOOCAN
        for city_kw in ('CALOOCAN', 'KALOOCAN', 'KALOOKAN'):
            idx = upper.find(city_kw)
            if idx != -1:
                window = upper[max(0, idx - 300): idx + 300]
                for m in re.finditer(r'\b(\d{3})\b', window):
                    n = int(m.group(1))
                    if 100 <= n <= 200:
                        return m.group(1)
        return ''

    def _extract_address(self, lines: List[str], upper: str) -> str:
        """
        Generic labeled-address extraction with inline noise stripping.
        Subclasses can override for ID-specific address formats.
        """
        u_lines = [l.upper().strip() for l in lines]

        addr_start = None
        for i, line in enumerate(u_lines):
            if any(kw in line for kw in ('ADDRESS', 'RESIDENCE', 'TIRAHAN', 'HOME ADDRESS')):
                addr_start = i
                break

        if addr_start is None:
            addr_kws = {'STREET', 'ST.', 'AVE', 'BLVD', 'BLK', 'LOT', 'CALOOCAN', 'BRGY'}
            for i, line in enumerate(u_lines):
                if any(kw in line for kw in addr_kws):
                    # Ensure it's not a header line
                    if not any(header in line for header in ('REPUBLIC', 'PHILIPPINES', 'TRANSPORTATION', 'OFFICE')):
                        addr_start = i
                        break

        if addr_start is None:
            return ''

        stop_keys = {'BLOOD', 'EYE', 'WEIGHT', 'HEIGHT', 'TIN', 'DATE OF', 
                     'SIGNATURE', 'VALIDITY', 'EXPIRY', 'VALID ', 'ISSUED', 'PHILIPPINE',
                     'LICENSE', 'RESTRICTION', 'AGENCY', 'CODE', 'SERIAL', 'PLACE', 'ISSUANCE'}

        raw_parts = []
        for j in range(addr_start, min(addr_start + 4, len(u_lines))):
            candidate = u_lines[j]
            if any(k in candidate for k in stop_keys):
                break
            if candidate:
                raw_parts.append(candidate)

        full = ' '.join(raw_parts)
        full = re.sub(r'^(ADDRESS|RESIDENCE|TIRAHAN|HOME ADDRESS)\s*:?\s*', '', full, flags=re.I)

        # Inline metadata noise: truncate at first occurrence of OCR bleed words
        for noise_word in ('KASARIAN', 'SEX', 'GENDER', 'BLOOD', 'DATE OF', 'DOB',
                           'PHILIPPINE', 'REPUBLIC', 'DATE ISSUED', 'LICENSE', 'RESTRICTION', 
                           'AGENCY', 'EXPIRATION', 'SERIAL', 'PLACE', 'OFFICE'):
            idx = full.upper().find(noise_word)
            if idx != -1:
                full = full[:idx]

        return re.sub(r'[,.\s]+$', '', full.strip()).title()

    def _extract_names(self, lines: List[str], upper: str) -> Tuple[str, str, str]:
        """
        Generic label-based name extraction.
        Handles labels in same line or subsequent lines.
        Returns (first_name, last_name, middle_name).
        """
        first_name = last_name = middle_name = ''

        # Normalized mapping of all labels to their category
        labels = {
            'LAST NAME': 'ln', 'SURNAME': 'ln', 'FAMILY NAME': 'ln', 'APELYIDO': 'ln', 'APELLIDO': 'ln',
            'FIRST NAME': 'fn', 'GIVEN NAME': 'fn', 'GIVEN NAMES': 'fn', 'PANGALAN': 'fn', 'FIRST NAME(S)': 'fn',
            'MIDDLE NAME': 'mn', 'MIDDLE INITIAL': 'mn', 'GITNANG PANGALAN': 'mn', 'M.I.': 'mn',
        }

        # Strategy 1: Multi-label line splitting
        # "LAST NAME: DELA CRUZ FIRST NAME: JUAN"
        for line in lines:
            ul = line.upper()
            found_labels = []
            for label, cat in labels.items():
                idx = ul.find(label)
                if idx != -1:
                    found_labels.append((idx, label, cat))
            
            if len(found_labels) > 1:
                # Sort by position
                found_labels.sort()
                for i in range(len(found_labels)):
                    start_idx, label, cat = found_labels[i]
                    # The value is between this label and the next label (or end of line)
                    end_idx = found_labels[i+1][0] if i+1 < len(found_labels) else len(ul)
                    
                    # Extract the chunk between start of this label and start of next
                    chunk = ul[start_idx:end_idx].replace(label, '').replace(':', '').strip()
                    if chunk:
                        val = chunk.title()
                        if cat == 'ln' and not last_name: last_name = val
                        elif cat == 'fn' and not first_name: first_name = val
                        elif cat == 'mn' and not middle_name: middle_name = val

        # Strategy 2: Standard single-label per line or label-above-value
        if not (last_name and first_name):
            for i, line in enumerate(lines):
                ul = line.upper()
                for label, cat in labels.items():
                    if label in ul:
                        # Value on SAME line after colon
                        if ':' in ul:
                            val = ul.split(label, 1)[1].replace(':', '').strip()
                            # If there's another label in this string, this strategy is weak (Strategy 1 should have caught it)
                            # But if Strategy 1 missed it, we snip at the next known label
                            for other_label in labels.keys():
                                if other_label in val.upper():
                                    val = val.upper().split(other_label)[0].strip()
                            
                            val = val.title()
                            
                            # CRITICAL: If the extracted value contains a comma, 
                            # it's likely a LN, FN MN record matched to a single label
                            if ',' in val:
                                record_ln = val.split(',', 1)[0].strip()
                                record_fn_mn = val.split(',', 1)[1].strip().split()
                                if not last_name: last_name = record_ln
                                r_fn, r_mn = self._split_name_parts(record_fn_mn)
                                if not first_name: first_name = r_fn
                                if not middle_name: middle_name = r_mn
                            else:
                                if cat == 'ln' and not last_name: last_name = val
                                elif cat == 'fn' and not first_name: first_name = val
                                elif cat == 'mn' and not middle_name: middle_name = val
                        
                        # Value on NEXT line
                        if i + 1 < len(lines):
                            nxt = lines[i+1].strip()
                            if self._is_name_line(nxt) and not any(l in nxt.upper() for l in labels.keys()):
                                val = nxt.title()
                                if ',' in val:
                                    record_ln = val.split(',', 1)[0].strip()
                                    record_fn_mn = val.split(',', 1)[1].strip().split()
                                    if not last_name: last_name = record_ln
                                    r_fn, r_mn = self._split_name_parts(record_fn_mn)
                                    if not first_name: first_name = r_fn
                                    if not middle_name: middle_name = r_mn
                                else:
                                    if cat == 'ln' and not last_name: last_name = val
                                    elif cat == 'fn' and not first_name: first_name = val
                                    elif cat == 'mn' and not middle_name: middle_name = val
                        break

        # Strategy 3: Comma-based fallback (if no labels found)
        # "DELA CRUZ, JUAN PEDRO M."
        if not (last_name and first_name):
            for line in lines:
                if ',' in line and self._is_name_line(line.replace(',', ' ')):
                    parts = line.split(',', 1)
                    ln = parts[0].strip().title()
                    fn_mn_raw = parts[1].strip().split()
                    if fn_mn_raw:
                        if not last_name: last_name = ln
                        fn, mn = self._split_name_parts(fn_mn_raw)
                        if not first_name: first_name = fn
                        if not middle_name: middle_name = mn
                    break

        return first_name, last_name, middle_name
