"""
id_parsers/passport.py — Philippine Passport

MRZ (Machine Readable Zone) format:
  Line 1: P<PHLDELA CRUZ<<JUAN<PEDRO<<<<<<<<<<<<<<<
  Line 2: XX1234567PHL0001011M2501011<<<<<<<<<<<<<<<4

Fields:
  - Surname from MRZ (after "P<PHL")
  - Given names (double-chevron "<<" delimiter)
  - Passport Number: AA1234567
  - DOB from MRZ field positions (YYMMDD)
  - Sex: M/F from MRZ
  - Expiry date from MRZ
  - Address NOT printed in passport — skip
"""

import re
from .base import BaseIDParser, ParsedIDData
from typing import List, Tuple


class PassportParser(BaseIDParser):
    ID_TYPE = 'passport'

    # MRZ line patterns — tolerant of OCR noise where '<' is read as space, dash, or underscore
    _FILL = r'[<\s\-_]'  # filler character variants OCR commonly produces
    _MRZ1 = re.compile(r'P[<\s]PHL([A-Z<\s]+?)[<\s]{2}([A-Z<\s]+)', re.IGNORECASE)
    _MRZ2 = re.compile(r'([A-Z0-9<\s\-]{9})[0-9]PHL(\d{6})[0-9]([MF<])(\d{6})', re.IGNORECASE)

    def extract(self, text: str, lines: List[str]) -> ParsedIDData:
        upper = text.upper()
        result = {
            'first_name': '', 'last_name': '', 'middle_name': '',
            'dob': '', 'sex': '', 'address': '', 'barangay': '',
            'passport_no': '', 'expiry_date': '', 'nationality': 'PHL',
        }

        # MRZ Name Parsing: LASTNAME<<FIRSTNAME<MIDDLENAME
        fn, ln, mn = self._extract_mrz_names(lines, upper)
        result['first_name'] = fn
        result['last_name']  = ln
        result['middle_name'] = mn

        # Passport Number: P followed by 7-8 digits or chars (MRZ Line 2, Pos 1-9)
        # We prioritize Line 2 directly
        for line in lines:
            line_u = line.strip().upper().replace(' ', '')
            m = self._MRZ2.search(line_u)
            if m:
                # Group 1 is the 9-char document number
                result['passport_no'] = m.group(1).replace('<', '')
                break

        if not result['passport_no']:
            # Fallback regex for visual zone
            id_match = re.search(r'\b(P\d{7,8}[A-Z\d]?)\b', upper)
            if id_match:
                result['passport_no'] = id_match.group(1)

        result['dob'] = self._extract_mrz_dob(lines, upper)
        result['sex'] = self._extract_mrz_sex(lines, upper)
        
        # Expiry Date from MRZ (YYMMDD at positions 22-27 of Line 2)
        result['expiry_date'] = self._extract_mrz_expiry(lines)
        
        # Passports don't carry a local address
        result['address']  = ''
        result['barangay'] = ''
        result['id_number'] = result['passport_no']
        return result

    def _extract_mrz_names(self, lines: List[str], upper: str) -> Tuple[str, str, str]:
        """Parse name from MRZ line 1: LASTNAME<<FIRSTNAME<MIDDLENAME"""
        for line in lines:
            line_u = line.strip().upper().replace(' ', '')
            if 'P<PHL' in line_u:
                # Split everything after P<PHL
                name_block = line_u.split('P<PHL')[-1].strip('<')
                if '<<' in name_block:
                    parts = name_block.split('<<', 1)
                    last_name = parts[0].replace('<', ' ').strip().title()
                    given_block = parts[1].strip('<')
                    given_parts = given_block.split('<')
                    first_name = given_parts[0].title() if given_parts else ''
                    middle_name = ' '.join(given_parts[1:]).strip().title() if len(given_parts) > 1 else ''
                    return first_name, last_name, middle_name

        # Fallback: use standard label extraction
        return self._extract_names(lines, upper)

    def _extract_mrz_dob(self, lines: List[str], upper: str) -> str:
        """Parse DOB from MRZ (YYMMDD). Return as YYYY-MM-DD."""
        for line in lines:
            line_u = line.strip().upper().replace(' ', '')
            m = self._MRZ2.search(line_u)
            if m:
                dob_raw = m.group(2)
                try:
                    yy = int(dob_raw[:2])
                    mo = int(dob_raw[2:4])
                    dd = int(dob_raw[4:6])
                    year = 1900 + yy if yy > 25 else 2000 + yy
                    return f"{year:04d}-{mo:02d}-{dd:02d}"
                except Exception: continue
        return self._extract_dob(upper)

    def _extract_mrz_expiry(self, lines: List[str]) -> str:
        """Parse expiry from MRZ line 2 (positions 22-27: YYMMDD). Return as MM/DD/YYYY."""
        for line in lines:
            line_u = line.strip().upper().replace(' ', '')
            m = self._MRZ2.search(line_u)
            if m:
                expiry_raw = m.group(4)
                try:
                    yy = int(expiry_raw[:2])
                    mo = int(expiry_raw[2:4])
                    dd = int(expiry_raw[4:6])
                    year = 2000 + yy # Passports expire in future
                    return f"{mo:02d}/{dd:02d}/{year:04d}"
                except Exception: continue
        return ''

    def _extract_mrz_sex(self, lines: List[str], upper: str) -> str:
        """Parse sex from MRZ Line 2 (pos 21). M/F."""
        for line in lines:
            line_u = line.strip().upper().replace(' ', '')
            m = self._MRZ2.search(line_u)
            if m:
                return m.group(3) # M or F
        return self._extract_sex(upper)
