"""
id_parsers/postal.py — Philippine Postal ID (PHLPost)

Card format:
  - "PHLPOST" / "Philippine Postal Corporation" header
  - ID Number
  - Name: labeled "NAME:" (full name on one line, usually Title Case)
  - Date of Birth: labeled "DATE OF BIRTH:"
  - Sex: labeled "SEX:"
  - Address: labeled "ADDRESS:" (multi-line, full street address with city/zip)
  - Issue Date / Expiry Date
"""

import re
from .base import BaseIDParser, ParsedIDData
from typing import List, Tuple


class PostalIDParser(BaseIDParser):
    ID_TYPE = 'postal'

    def extract(self, text: str, lines: List[str]) -> ParsedIDData:
        upper = text.upper()
        result = {
            'first_name': '', 'last_name': '', 'middle_name': '',
            'dob': '', 'sex': '', 'address': '', 'barangay': '',
            'postal_id_no': '', 'house_no': '', 'street': '', 'city': '', 'province': '', 'postal_code': '',
        }

        # 1. Name: Natural Order (First, Middle, Last)
        result['first_name'], result['last_name'], result['middle_name'] = \
            self._extract_postal_names(lines, upper)
            
        # 2. Postal ID Number starting with 'PH-'
        id_match = re.search(r'\b(PH-[A-Z0-9\-]+)\b', upper)
        if id_match:
            result['postal_id_no'] = id_match.group(1)

        # 3. DOB: MM/DD/YYYY
        dob_iso = self._extract_dob(upper)
        if dob_iso:
             y, m, d = dob_iso.split('-')
             result['dob'] = f"{m}/{d}/{y}"

        result['sex']      = self._extract_sex(upper)
        
        # 4. Structured Address
        addr_raw = self._extract_address(lines, upper)
        result['address'] = addr_raw
        
        # Smart split for Postal IDs
        # Format: House No, Street, Barangay, City, Province, Zip
        parts = [p.strip() for p in addr_raw.split(',') if p.strip()]
        if len(parts) >= 4:
             result['house_no'] = parts[0]
             result['street'] = parts[1]
             result['barangay'] = parts[2].replace('Barangay', '').strip()
             result['city'] = parts[3]
             if len(parts) > 4:
                  result['province'] = parts[4]
             
             # Zip code (4 digits at end)
             zip_match = re.search(r'\b(\d{4})\b', addr_raw)
             if zip_match:
                  result['postal_code'] = zip_match.group(1)
        
        if not result['barangay']:
             result['barangay'] = self._extract_barangay(upper)

        return result

    def _extract_postal_names(self, lines: List[str], upper: str) -> Tuple[str, str, str]:
        """
        Postal ID often prints the full name as:
          NAME: DELA CRUZ, JUAN PEDRO C.
        or with the name on the next line.
        """
        first_name = last_name = middle_name = ''

        for i, line in enumerate(lines):
            ul = line.upper()
            if ul.startswith('NAME') or 'NAME:' in ul:
                # Inline
                if ':' in ul:
                    val = ul.split(':', 1)[1].strip()
                    if val:
                        if ',' in val:
                            parts = val.split(',', 1)
                            last_name = parts[0].strip().title()
                            fn_block = parts[1].strip().split()
                            if fn_block:
                                fn, mn = self._split_name_parts(fn_block)
                                first_name, middle_name = fn, mn
                        else:
                            # treat as "First [Middle] Last" with no comma
                            parts = val.split()
                            if parts:
                                last_name = parts[-1].title()
                                first_name = parts[0].title()
                        break
                elif i + 1 < len(lines):
                    nxt = lines[i + 1].strip()
                    if self._is_name_line(nxt):
                        if ',' in nxt:
                            parts = nxt.split(',', 1)
                            last_name = parts[0].strip().title()
                            fn_block = nxt.split(',', 1)[1].strip().split()
                            fn, mn = self._split_name_parts(fn_block)
                            first_name, middle_name = fn, mn
                    break

        if not (first_name and last_name):
            fn, ln, mn = self._extract_names(lines, upper)
            if not last_name:
                last_name = ln
            if not first_name:
                first_name = fn
            if not middle_name:
                middle_name = mn

        return first_name, last_name, middle_name
