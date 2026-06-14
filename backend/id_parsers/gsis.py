"""
id_parsers/gsis.py — GSIS eCard / Government Service Insurance System

Card format:
  - "GOVERNMENT SERVICE INSURANCE SYSTEM" header
  - GSIS Policy Number
  - Name: labeled "LAST NAME / FIRST NAME / MIDDLE INITIAL"
  - Date of Birth
  - Sex (M/F or MALE/FEMALE)
  - Address (sometimes printed, sometimes not)
"""

import re
from .base import BaseIDParser, ParsedIDData
from typing import List


class GSISParser(BaseIDParser):
    ID_TYPE = 'gsis'

    def extract(self, text: str, lines: List[str]) -> ParsedIDData:
        upper = text.upper()
        result = {
            'first_name': '', 'last_name': '', 'middle_name': '',
            'dob': '', 'sex': '', 'address': '', 'barangay': '',
            'bpn': '', 'agency': '',
        }

        # 1. Name: LASTNAME, FIRSTNAME MIDDLENAME
        result['first_name'], result['last_name'], result['middle_name'] = \
            self._extract_names(lines, upper)
            
        # 2. 11-digit GSIS Business Partner Number (BPN)
        bpn_match = re.search(r'\b(\d{11})\b', upper)
        if bpn_match:
            result['bpn'] = bpn_match.group(1)

        # 3. Agency / Department
        for line in lines:
            ul = line.upper()
            if any(k in ul for k in ('DEPARTMENT', 'AGENCY', 'BUREAU', 'CITY OF', 'SCHOOL')):
                if not any(noise in ul for noise in ('GOVERNMENT SERVICE', 'INSURANCE SYSTEM')):
                    result['agency'] = ul.title()
                    break

        # 4. DOB: ISO YYYY-MM-DD
        result['dob'] = self._extract_dob(upper)

        result['sex']      = self._extract_sex(upper)
        result['address']  = self._extract_address(lines, upper)
        result['barangay'] = self._extract_barangay(upper)
        return result
