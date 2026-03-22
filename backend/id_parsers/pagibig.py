"""
id_parsers/pagibig.py — Pag-IBIG / HDMF Fund Card

Card format:
  - "HOME DEVELOPMENT MUTUAL FUND / PAG-IBIG" header
  - MID (Pag-IBIG Member ID): 12-digit
  - Name: labeled Last Name / First Name / Middle Name (stacked or single line)
  - Date of Birth
  - Address (labeled "Address:")
"""

import re
from .base import BaseIDParser, ParsedIDData
from typing import List, Tuple


class PagIBIGParser(BaseIDParser):
    ID_TYPE = 'pagibig'

    def extract(self, text: str, lines: List[str]) -> ParsedIDData:
        upper = text.upper()
        result = {
            'first_name': '', 'last_name': '', 'middle_name': '',
            'dob': '', 'sex': '', 'address': '', 'barangay': '',
            'mid_no': '',
        }

        # 1. Name: LASTNAME, FIRSTNAME MIDDLENAME
        result['first_name'], result['last_name'], result['middle_name'] = \
            self._extract_names(lines, upper)
            
        # 2. 12-digit MID Number
        mid_match = re.search(r'\b(\d{4}-\d{4}-\d{4})\b', upper)
        if not mid_match:
             mid_raw = re.search(r'\b(\d{12})\b', upper)
             if mid_raw:
                  m = mid_raw.group(1)
                  result['mid_no'] = f"{m[:4]}-{m[4:8]}-{m[8:]}"
        else:
            result['mid_no'] = mid_match.group(1)

        # 3. DOB: MM/DD/YYYY
        dob_iso = self._extract_dob(upper)
        if dob_iso:
             y, m, d = dob_iso.split('-')
             result['dob'] = f"{m}/{d}/{y}"

        result['sex']      = self._extract_sex(upper)
        
        # 4. Extract address as-is
        result['address']  = self._extract_address(lines, upper)
        result['barangay'] = self._extract_barangay(upper)
        return result
