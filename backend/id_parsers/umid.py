"""
id_parsers/umid.py — UMID / SSS Card

Card format:
  - "UNIFIED MULTI-PURPOSE IDENTIFICATION" header
  - SSS Number (10-digit: XX-XXXXXXX-X)
  - Name: SURNAME printed above given name block
  - Date of birth
  - Sex (MALE/FEMALE label)
  - Address: printed on a single line (not labeled "Address:")
"""

import re
from .base import BaseIDParser, ParsedIDData
from typing import List, Tuple


class UMIDParser(BaseIDParser):
    ID_TYPE = 'umid'

    def extract(self, text: str, lines: List[str]) -> ParsedIDData:
        upper = text.upper()
        result = {
            'first_name': '', 'last_name': '', 'middle_name': '',
            'dob': '', 'sex': '', 'address': '', 'barangay': '',
            'crn': '', 'sss_no': '', 'gsis_no': '',
        }

        # 1. Name: LASTNAME, FIRSTNAME MI
        result['first_name'], result['last_name'], result['middle_name'] = \
            self._extract_umid_names(lines, upper)
            
        # 2. CRN (12-digit Common Reference Number)
        crn_match = re.search(r'\b(\d{4}-\d{7}-\d)\b', upper)
        if not crn_match:
             crn_raw = re.search(r'\b(\d{12})\b', upper)
             if crn_raw:
                  c = crn_raw.group(1)
                  result['crn'] = f"{c[:4]}-{c[4:11]}-{c[11:]}"
        else:
            result['crn'] = crn_match.group(1)

        # 3. SSS or GSIS Number
        sss_match = re.search(r'\b(\d{2}-\d{7}-\d)\b', upper)
        if sss_match: result['sss_no'] = sss_match.group(1)
        
        # Guard: only match 11-digit GSIS number when no CRN (12-digit) was found
        # Use strict word boundary to avoid matching inside longer digit sequences
        gsis_match = re.search(r'(?<!\d)(\d{11})(?!\d)', upper)
        if gsis_match and not result['crn'] and not result['sss_no']:
             result['gsis_no'] = gsis_match.group(1)

        # 4. DOB: ISO YYYY-MM-DD
        result['dob'] = self._extract_dob(upper)
        
        result['sex']      = self._extract_sex(upper)
        result['address']  = self._extract_address(lines, upper)
        result['barangay'] = self._extract_barangay(upper)
        return result

    def _extract_umid_names(self, lines: List[str], upper: str) -> Tuple[str, str, str]:
        """
        UMID/SSS layout: Surname on its own line, then "FIRST NAME MIDDLE NAME"
        Because there are no labels, we use the first non-keyword all-alpha lines.
        """
        first_name = last_name = middle_name = ''

        # First try generic label-based extraction
        fn, ln, mn = self._extract_names(lines, upper)
        if fn and ln:
            return fn, ln, mn

        def looks_like_surname(line: str) -> bool:
            u = line.upper().strip()
            if not re.match(r'^[A-Z\s\-\.]+$', u):
                return False
            words = u.split()
            if not words or len(words) > 4:
                return False
            from .base import NON_NAME_KEYWORDS
            if any(w in NON_NAME_KEYWORDS for w in words):
                return False
            if all(len(w) <= 2 for w in words):
                return False
            return True

        name_lines = [l for l in lines if looks_like_surname(l)]
        if len(name_lines) >= 1:
            last_name = name_lines[0].strip().title()
        if len(name_lines) >= 2:
            parts = name_lines[1].strip().split()
            fn, mn = self._split_name_parts(parts)
            first_name, middle_name = fn, mn

        return first_name, last_name, middle_name
