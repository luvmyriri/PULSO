"""
id_parsers/prc.py — PRC Professional ID

Card format:
  - "PROFESSIONAL REGULATION COMMISSION" header
  - Registration No.
  - Name: labeled "LAST NAME / FIRST NAME / MIDDLE NAME"
  - Date of Birth
  - Validity Date (must NOT be mistaken for DOB)
  - Professional title / license type
  - Address NOT printed on card
"""

import re
from .base import BaseIDParser, ParsedIDData
from typing import List


class PRCParser(BaseIDParser):
    ID_TYPE = 'prc'

    def extract(self, text: str, lines: List[str]) -> ParsedIDData:
        upper = text.upper()
        result = {
            'first_name': '', 'last_name': '', 'middle_name': '',
            'dob': '', 'sex': '', 'address': '', 'barangay': '',
            'reg_no': '', 'profession': '', 'reg_date': '', 'expiry_date': '',
        }

        # 1. Name: Natural Order (First, Middle, Last)
        # Strategy: find name labels
        fn, ln, mn = self._extract_names(lines, upper)
        result['first_name'] = fn
        result['last_name'] = ln
        result['middle_name'] = mn

        # 2. 7-digit PRC Registration Number
        # Usually labeled "REGISTRATION NO" or "REG NO"
        reg_match = re.search(r'\b(?:REG|REGISTRATION)\s+(?:NO\.?\s*|NUMBER\s*)?(\d{7})\b', upper)
        if reg_match:
            result['reg_no'] = reg_match.group(1)
        elif not result['reg_no']:
             reg_raw = re.search(r'\b(\d{7})\b', upper)
             if reg_raw: result['reg_no'] = reg_raw.group(1)

        # 3. Profession / Title
        # Often after registration number or near top
        for line in lines:
            ul = line.upper()
            if any(p in ul for p in ('NURSE', 'ENGINEER', 'TEACHER', 'COORDINATOR', 'ACCOUNTANT', 'PHYSICIAN')):
                if not any(noise in ul for noise in ('REGISTRATION', 'COMMISSION', 'REGULATION')):
                    result['profession'] = ul.title()
                    break

        # 4. Dates: MM/DD/YYYY
        # Strategy: Use labels specifically
        dob_raw = self._label_value(lines, 'BIRTH', 'KAPANGANAKAN')
        dob_iso = self._extract_dob(dob_raw if dob_raw else upper)
        if dob_iso:
             y, m, d = dob_iso.split('-')
             result['dob'] = f"{m}/{d}/{y}"

        # Reg Date & Expiry candidates
        # We look for MM/DD/YYYY strictly for these
        all_matches = re.findall(r'\b(\d{2}/\d{2}/\d{4})\b', upper)
        # Exclude the DOB from these candidates if found
        if result['dob'] in all_matches:
             all_matches.remove(result['dob'])
        
        if len(all_matches) >= 2:
             result['reg_date'] = all_matches[0]
             result['expiry_date'] = all_matches[1]
        elif len(all_matches) == 1:
             result['expiry_date'] = all_matches[0]

        
        # Use regex directly for MM/DD/YYYY candidates
        candidates = re.findall(r'\b(\d{2}/\d{2}/\d{4})\b', upper)
        if len(candidates) >= 2:
             result['reg_date'] = candidates[0]
             result['expiry_date'] = candidates[1]

        result['sex']      = self._extract_sex(upper)
        result['address']  = ''   # PRC IDs do not have printed address
        result['barangay'] = ''
        return result
