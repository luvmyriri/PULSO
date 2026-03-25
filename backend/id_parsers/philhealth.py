"""
id_parsers/philhealth.py — PhilHealth / PHIC Member Card

Card format:
  - "PHILIPPINE HEALTH INSURANCE CORPORATION" header
  - PhilHealth Identification Number (PIN): 12-digit
  - Name: labeled "MEMBER NAME" or "NAME"
  - Date of Birth
  - Sex (M/F)
  - Address (not always printed on card)
"""

import re
from .base import BaseIDParser, ParsedIDData
from typing import List, Tuple


class PhilHealthParser(BaseIDParser):
    ID_TYPE = 'philhealth'

    def extract(self, text: str, lines: List[str]) -> ParsedIDData:
        upper = text.upper()
        result = {
            'first_name': '', 'last_name': '', 'middle_name': '',
            'dob': '', 'sex': '', 'address': '', 'barangay': '',
            'pin': '', 'member_type': '',
        }

        # 1. Name: LASTNAME, FIRSTNAME MIDDLENAME
        result['first_name'], result['last_name'], result['middle_name'] = \
            self._extract_philhealth_names(lines, upper)
            
        # 2. 12-digit PIN (##-#########-#)
        pin_match = re.search(r'\b(\d{2}-\d{9}-\d)\b', upper)
        if not pin_match:
             pin_raw = re.search(r'\b(\d{12})\b', upper)
             if pin_raw:
                  p = pin_raw.group(1)
                  result['pin'] = f"{p[:2]}-{p[2:11]}-{p[11:]}"
        else:
            result['pin'] = pin_match.group(1)

        # 3. Member Type
        for line in lines:
            ul = line.upper()
            if any(k in ul for k in ('FORMAL', 'INFORMAL', 'INDIGENT', 'SPONSORED', 'LIFETIME', 'SENIOR')):
                result['member_type'] = ul.title()
                break

        # 4. DOB: MM/DD/YYYY
        dob_iso = self._extract_dob(upper)
        if dob_iso:
             y, m, d = dob_iso.split('-')
             result['dob'] = f"{m}/{d}/{y}"

        result['sex']      = self._extract_sex(upper)
        result['address']  = self._extract_address(lines, upper)
        result['barangay'] = self._extract_barangay(upper)
        return result

    def _extract_philhealth_names(self, lines: List[str], upper: str) -> Tuple[str, str, str]:
        """
        PhilHealth cards print: 
          MEMBER NAME
          DELA CRUZ, JUAN PEDRO C.
        OR inline: "NAME: DELA CRUZ, JUAN PEDRO"
        """
        first_name = last_name = middle_name = ''

        # Look for "MEMBER" label
        for i, line in enumerate(lines):
            ul = line.upper()
            if 'MEMBER' in ul and i + 1 < len(lines):
                candidate = lines[i + 1].strip()
                if ',' in candidate and self._is_name_line(candidate.replace(',', ' ')):
                    parts = candidate.split(',', 1)
                    last_name = parts[0].strip().title()
                    fn_block = parts[1].strip().split()
                    if fn_block:
                        if len(fn_block) > 1 and re.match(r'^[A-Z]\.?$', fn_block[-1]):
                            middle_name = fn_block[-1].rstrip('.').title()
                            first_name = ' '.join(fn_block[:-1]).title()
                        else:
                            first_name = ' '.join(fn_block).title()
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
