"""
id_parsers/barangay.py — Barangay ID & Barangay Certificate Parser
Extracts resident name, control number, barangay, and issue date.
"""

import re
from typing import List, Tuple
from .base import BaseIDParser, ParsedIDData


class BarangayIDParser(BaseIDParser):
    ID_TYPE = 'barangay'

    def extract(self, text: str, lines: List[str]) -> ParsedIDData:
        upper = text.upper()
        result: ParsedIDData = {
            'first_name': '',
            'last_name': '',
            'middle_name': '',
            'dob': '',
            'sex': '',
            'address': '',
            'barangay': '',
            'control_no': '',
            'id_number': '',
        }

        # 1. Names
        result['first_name'], result['last_name'], result['middle_name'] = \
            self._extract_names(lines, upper)

        # 2. DOB & Sex
        result['dob'] = self._extract_dob(upper)
        result['sex'] = self._extract_sex(upper)

        # 3. Address & Barangay
        result['address'] = self._extract_address(lines, upper)
        result['barangay'] = self._extract_barangay(upper)

        # 4. Control Number / Certificate Number
        ctrl_match = re.search(r'(?:CONTROL|CERTIFICATE|BARANGAY\s+ID|NO\.?|NUMBER)\s*[:#-]?\s*([A-Z0-9\/-]{4,25})', upper)
        if ctrl_match:
            ctrl_val = ctrl_match.group(1).strip()
            result['control_no'] = ctrl_val
            result['id_number'] = ctrl_val

        return result
